import { NextResponse } from 'next/server';
import WebSocket from 'ws';

/**
 * Velora WebSocket Bridge — Server-Side
 *
 * This API route connects to the Velora WebSocket server-side (where we can set
 * the Authorization header), parses the binary compact market data, and caches
 * the latest prices. The frontend polls this route to get live Forex prices.
 *
 * Velora binary packet layout (compact_marketdata, mode=2):
 *   Byte 0      : msgType (int8)   — 2 = compact market data
 *   Byte 1      : exchange (int8)
 *   Bytes 2-5   : instrumentToken (int32)
 *   Bytes 6-9   : ltp (int32)      — last traded price (raw)
 *   Bytes 10-13 : change (int32)
 *   Bytes 14-17 : ltt (int32)      — last trade timestamp (epoch)
 *   Bytes 18-21 : lowDpr (int32)
 *   Bytes 22-25 : highDpr (int32)
 *   Bytes 34-37 : bidPrice (int32)
 *   Bytes 38-41 : askPrice (int32)
 *   Bytes 46-49 : precision (int32)
 */

// ─── Instrument token → Asset ID mapping ───
// We'll discover tokens dynamically and log them.
// For now, we subscribe to a few known tokens and map by what we receive.
const TOKEN_TO_ASSET: Record<number, string> = {};

// We'll also store reverse mapping for subscription
const INSTRUMENT_TOKENS = ['3045']; // Start with the example from docs, will add more

// ─── In-memory price cache ───
interface VeloraPrice {
    symbol: string;
    token: number;
    price: number;
    bid: number;
    ask: number;
    change: number;
    low: number;
    high: number;
    timestamp: number;
    precision: number;
}

const priceCache: Map<number, VeloraPrice> = new Map();
let wsConnection: WebSocket | null = null;
let connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;

function parseBinaryMessage(buffer: Buffer): VeloraPrice | null {
    if (buffer.length < 50) return null;

    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const msgType = view.getInt8(0);

    // Only handle compact market data (mode = 2)
    if (msgType !== 2) return null;

    const token = view.getInt32(2, false); // big-endian by default
    const ltpRaw = view.getInt32(6, false);
    const changeRaw = view.getInt32(10, false);
    const lttRaw = view.getInt32(14, false);
    const lowRaw = view.getInt32(18, false);
    const highRaw = view.getInt32(22, false);
    const bidRaw = view.getInt32(34, false);
    const askRaw = view.getInt32(38, false);
    const precision = view.getInt32(46, false);

    const divisor = Math.pow(10, precision);

    return {
        symbol: TOKEN_TO_ASSET[token] || `TOKEN_${token}`,
        token,
        price: ltpRaw / divisor,
        bid: bidRaw / divisor,
        ask: askRaw / divisor,
        change: changeRaw / divisor,
        low: lowRaw / divisor,
        high: highRaw / divisor,
        timestamp: lttRaw * 1000, // epoch seconds → ms
        precision,
    };
}

function connectVelora() {
    const apiKey = process.env.VELORA_API_KEY;
    const wsUrl = process.env.VELORA_WS_URL || 'wss://internal.velora.plus/ws/v1/vendor';

    if (!apiKey) {
        console.error('[Velora Bridge] VELORA_API_KEY not set');
        return;
    }

    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        return; // Already connected
    }

    connectionStatus = 'connecting';
    console.log('[Velora Bridge] Connecting to', wsUrl);

    try {
        const ws = new WebSocket(wsUrl, {
            headers: {
                Authorization: apiKey,
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Origin': 'https://velora.plus',
            },
        });

        ws.binaryType = 'arraybuffer';

        ws.on('open', () => {
            console.log('[Velora Bridge] ✓ Connected');
            connectionStatus = 'connected';
            reconnectAttempts = 0; // Reset backoff on success

            // Subscribe to compact market data for our instrument tokens
            const subscribeMsg = JSON.stringify({
                a: 'subscribe',
                v: INSTRUMENT_TOKENS.map(t => [1, t]),
                m: 'compact_marketdata',
            });
            console.log('[Velora Bridge] Subscribing:', subscribeMsg);
            ws.send(subscribeMsg);
        });

        ws.on('message', (data: Buffer | string) => {
            // Text messages — likely status/ack from server
            if (typeof data === 'string') {
                console.log('[Velora Bridge] Text message:', data);
                try {
                    const msg = JSON.parse(data);
                    // If server sends instrument info, capture it
                    if (msg.instruments) {
                        console.log('[Velora Bridge] Available instruments:', JSON.stringify(msg.instruments));
                    }
                } catch {}
                return;
            }

            // Binary messages — compact market data
            const buffer = Buffer.from(data);
            const parsed = parseBinaryMessage(buffer);
            if (parsed) {
                priceCache.set(parsed.token, parsed);
                // Log first few updates for debugging
                if (priceCache.size <= 5) {
                    console.log(`[Velora Bridge] Price update — Token ${parsed.token}: ${parsed.price} (precision: ${parsed.precision})`);
                }
            }
        });

        ws.on('error', (error) => {
            console.error('[Velora Bridge] WebSocket error:', error.message);
        });

        ws.on('close', (code, reason) => {
            console.log(`[Velora Bridge] Disconnected. Code: ${code}, Reason: ${reason?.toString()}`);
            connectionStatus = 'disconnected';
            wsConnection = null;

            // Exponential backoff: 5s, 10s, 20s, 40s, 60s max
            reconnectAttempts++;
            const delay = Math.min(5000 * Math.pow(2, reconnectAttempts - 1), 60000);
            console.log(`[Velora Bridge] Will reconnect in ${delay / 1000}s (attempt ${reconnectAttempts})`);
            reconnectTimer = setTimeout(() => {
                connectVelora();
            }, delay);
        });

        wsConnection = ws;
    } catch (e) {
        console.error('[Velora Bridge] Failed to connect:', e);
        connectionStatus = 'disconnected';
    }
}

// ─── API Route Handler ───

export async function GET() {
    // Ensure connection is alive
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
        connectVelora();
    }

    // Return all cached prices
    const prices: Record<string, VeloraPrice> = {};
    priceCache.forEach((value, key) => {
        prices[String(key)] = value;
    });

    return NextResponse.json({
        status: connectionStatus,
        prices,
        tokens: INSTRUMENT_TOKENS,
        cacheSize: priceCache.size,
    });
}
