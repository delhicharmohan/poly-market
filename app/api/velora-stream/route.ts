import { NextResponse } from 'next/server';
import { WebSocket, getVeloraWS, setVeloraWS, getLastVeloraAttempt, setLastVeloraAttempt } from '@/lib/trading/server-ws';
import { pushTick } from '../trading/history/route';

/**
 * Velora WebSocket Bridge — Server-Side
 */

// Mapping of instrument tokens to our internal asset IDs
const TOKEN_MAP: Record<number, string> = {
    3045: 'EUR/USD',
    3046: 'GBP/USD',
    3047: 'USD/JPY',
    3048: 'AUD/USD',
    3049: 'SILVER',
};

const INSTRUMENT_TOKENS = Object.keys(TOKEN_MAP).map(Number);

// Binary price cache
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
let connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
let reconnectAttempts = 0;

function parseBinaryMessage(buffer: Buffer): VeloraPrice | null {
    if (buffer.length < 50) return null;
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const msgType = view.getInt8(0);
    if (msgType !== 2) return null;

    const token = view.getInt32(2, false); 
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
        symbol: TOKEN_MAP[token] || `TOKEN_${token}`,
        token,
        price: ltpRaw / divisor,
        bid: bidRaw / divisor,
        ask: askRaw / divisor,
        change: changeRaw / divisor,
        low: lowRaw / divisor,
        high: highRaw / divisor,
        timestamp: lttRaw * 1000, 
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

    const currentWS = getVeloraWS();
    if (currentWS && (currentWS.readyState === WebSocket.OPEN || currentWS.readyState === WebSocket.CONNECTING)) {
        return;
    }

    const now = Date.now();
    if (now - getLastVeloraAttempt() < 5000) return;
    setLastVeloraAttempt(now);

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
        setVeloraWS(ws);

        ws.on('open', () => {
            console.log('[Velora Bridge] ✓ Connected');
            connectionStatus = 'connected';
            reconnectAttempts = 0; 

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
                
                // Push to global tick store for 5-minute history
                if (parsed.symbol.includes('/')) {
                    pushTick(parsed.symbol, parsed.price, parsed.timestamp);
                }

                // Log first few updates for debugging
                if (priceCache.size <= 5) {
                    console.log(`[Velora Bridge] Price update — Token ${parsed.token}: ${parsed.price} (precision: ${parsed.precision})`);
                }
            }
        });

        ws.on('error', (error: any) => {
            console.error('[Velora Bridge] WebSocket error:', error.message);
        });

        ws.on('close', (code: number, reason: Buffer) => {
            console.log(`[Velora Bridge] Disconnected. Code: ${code}, Reason: ${reason?.toString()}`);
            connectionStatus = 'disconnected';
            setVeloraWS(null);

            // Exponential backoff
            reconnectAttempts++;
            const delay = Math.min(5000 * Math.pow(2, reconnectAttempts - 1), 60000);
            console.log(`[Velora Bridge] Will reconnect in ${delay / 1000}s (attempt ${reconnectAttempts})`);
            setTimeout(() => {
                connectVelora();
            }, delay);
        });

        setVeloraWS(ws);
    } catch (e) {
        console.error('[Velora Bridge] Failed to connect:', e);
        connectionStatus = 'disconnected';
    }
}

// ─── API Route Handler ───

export async function GET() {
    // Ensure connection is alive
    const currentWS = getVeloraWS();
    if (!currentWS || currentWS.readyState !== WebSocket.OPEN) {
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
