import { WebSocket, pushTick } from '@/lib/trading/server-ws';
import { emitStatus, emitTick } from './bus';

const TOKEN_MAP: Record<number, string> = {
    3045: 'EUR/USD',
    3046: 'GBP/USD',
    3047: 'USD/JPY',
    3048: 'AUD/USD',
    3049: 'SILVER',
};

const INSTRUMENT_TOKENS = Object.keys(TOKEN_MAP).map(Number);

export interface VeloraPrice {
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

interface GlobalState {
    _veloraBridgeWS?: any;
    _veloraBridgeLastAttempt?: number;
    _veloraBridgeReconnects?: number;
    _veloraBridgeCache?: Map<number, VeloraPrice>;
    _veloraBridgeStatus?: 'disconnected' | 'connecting' | 'connected';
}

const g = global as unknown as GlobalState;

if (!g._veloraBridgeCache) g._veloraBridgeCache = new Map();
if (!g._veloraBridgeStatus) g._veloraBridgeStatus = 'disconnected';

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

function setStatus(status: 'disconnected' | 'connecting' | 'connected') {
    g._veloraBridgeStatus = status;
    emitStatus({ bridge: 'velora', status });
}

function isOpenOrConnecting(ws: any): boolean {
    return ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING);
}

export function ensureVeloraConnected(): void {
    if (isOpenOrConnecting(g._veloraBridgeWS)) return;

    const apiKey = process.env.VELORA_API_KEY;
    const wsUrl = process.env.VELORA_WS_URL || 'wss://internal.velora.plus/ws/v1/vendor';

    if (!apiKey) {
        console.error('[Velora Bridge] VELORA_API_KEY not set');
        return;
    }

    const now = Date.now();
    if (now - (g._veloraBridgeLastAttempt || 0) < 5000) return;
    g._veloraBridgeLastAttempt = now;

    setStatus('connecting');
    console.log('[Velora Bridge] Connecting to', wsUrl);

    try {
        const ws = new WebSocket(wsUrl, {
            headers: {
                Authorization: apiKey,
                'User-Agent':
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                Origin: 'https://velora.plus',
            },
        });

        ws.binaryType = 'arraybuffer';
        g._veloraBridgeWS = ws;

        ws.on('open', () => {
            g._veloraBridgeReconnects = 0;
            setStatus('connected');
            console.log('[Velora Bridge] ✓ Connected');
            // Protocol requires the instrument token as a STRING, e.g.
            // { "a": "subscribe", "v": [[1, "3045"]], "m": "compact_marketdata" }.
            // Sending it as a number gets the subscription rejected and the
            // server closes the socket (code 1006) → no ticks for velora assets.
            ws.send(
                JSON.stringify({
                    a: 'subscribe',
                    v: INSTRUMENT_TOKENS.map((t) => [1, String(t)]),
                    m: 'compact_marketdata',
                })
            );
        });

        ws.on('message', (data: Buffer | string) => {
            if (typeof data === 'string') {
                try {
                    JSON.parse(data);
                } catch {}
                return;
            }
            const buffer = Buffer.from(data as any);
            const parsed = parseBinaryMessage(buffer);
            if (!parsed) return;
            g._veloraBridgeCache!.set(parsed.token, parsed);
            if (parsed.symbol.includes('/') || parsed.symbol === 'SILVER') {
                pushTick(parsed.symbol, parsed.price, parsed.timestamp);
                emitTick({ symbol: parsed.symbol, price: parsed.price, timestamp: parsed.timestamp });
            }
        });

        ws.on('close', (code: number, reason: Buffer) => {
            console.log(`[Velora Bridge] Disconnected. Code: ${code}, Reason: ${reason?.toString()}`);
            g._veloraBridgeWS = null;
            setStatus('disconnected');
            const attempts = (g._veloraBridgeReconnects || 0) + 1;
            g._veloraBridgeReconnects = attempts;
            const delay = Math.min(5000 * Math.pow(2, attempts - 1), 60000);
            setTimeout(ensureVeloraConnected, delay);
        });

        ws.on('error', (err: any) => {
            console.error('[Velora Bridge] error:', err?.message || err);
        });
    } catch (e) {
        console.error('[Velora Bridge] failed to connect:', e);
        setStatus('disconnected');
    }
}

export function getVeloraStatus(): 'disconnected' | 'connecting' | 'connected' {
    return g._veloraBridgeStatus || 'disconnected';
}

export function getVeloraPriceCache(): Record<string, VeloraPrice> {
    const out: Record<string, VeloraPrice> = {};
    g._veloraBridgeCache?.forEach((value, key) => {
        out[String(key)] = value;
    });
    return out;
}

export const VELORA_INSTRUMENT_TOKENS = INSTRUMENT_TOKENS;
