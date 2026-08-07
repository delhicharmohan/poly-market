import { WebSocket, pushTick } from '@/lib/trading/server-ws';
import { emitStatus, emitTick } from './bus';

const SUBSCRIBE_SYMBOLS = ['AAPL', 'BINANCE:BTCUSDT', 'BINANCE:ETHUSDT', 'OANDA:EUR_USD'];

const SYMBOL_MAP: Record<string, string> = {
    AAPL: 'AAPL',
    'BINANCE:BTCUSDT': 'BTC-FH',
    'BINANCE:ETHUSDT': 'ETH-FH',
    'OANDA:EUR_USD': 'EURUSD-FH',
};

interface GlobalState {
    _finnhubBridgeWS?: any;
    _finnhubBridgeLastAttempt?: number;
    _finnhubBridgeReconnects?: number;
}

const g = global as unknown as GlobalState;

function readApiKey(): string | undefined {
    return process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
}

function isOpenOrConnecting(ws: any): boolean {
    return ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING);
}

export function ensureFinnhubConnected(): void {
    if (isOpenOrConnecting(g._finnhubBridgeWS)) return;

    const apiKey = readApiKey();
    if (!apiKey) {
        console.error('[Finnhub Bridge] FINNHUB_API_KEY not set');
        return;
    }

    const now = Date.now();
    if (now - (g._finnhubBridgeLastAttempt || 0) < 5000) return;
    g._finnhubBridgeLastAttempt = now;

    emitStatus({ bridge: 'finnhub', status: 'connecting' });

    const ws = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);
    g._finnhubBridgeWS = ws;

    ws.on('open', () => {
        g._finnhubBridgeReconnects = 0;
        emitStatus({ bridge: 'finnhub', status: 'connected' });
        console.log('[Finnhub Bridge] ✓ Connected');
        for (const symbol of SUBSCRIBE_SYMBOLS) {
            ws.send(JSON.stringify({ type: 'subscribe', symbol }));
        }
    });

    ws.on('message', (raw: any) => {
        try {
            const msg = JSON.parse(raw.toString());
            if (msg.type !== 'trade' || !Array.isArray(msg.data)) return;
            for (const trade of msg.data) {
                const symbol = SYMBOL_MAP[trade.s] || trade.s;
                const price = trade.p;
                const timestamp = trade.t || Date.now();
                pushTick(symbol, price, timestamp);
                emitTick({ symbol, price, timestamp });
            }
        } catch (e) {
            console.warn('[Finnhub Bridge] parse error', e);
        }
    });

    ws.on('close', (code: number) => {
        g._finnhubBridgeWS = null;
        emitStatus({ bridge: 'finnhub', status: 'disconnected' });
        const attempts = (g._finnhubBridgeReconnects || 0) + 1;
        g._finnhubBridgeReconnects = attempts;
        const delay = Math.min(3000 * Math.pow(2, attempts - 1), 60000);
        console.warn(`[Finnhub Bridge] closed (${code}) — retry in ${delay}ms`);
        setTimeout(ensureFinnhubConnected, delay);
    });

    ws.on('error', (err: any) => {
        console.error('[Finnhub Bridge] error:', err?.message || err);
    });
}
