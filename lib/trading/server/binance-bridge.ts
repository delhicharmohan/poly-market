import { WebSocket, pushTick } from '@/lib/trading/server-ws';
import { emitStatus, emitTick } from './bus';

const STREAM_URL = 'wss://stream.binance.com:9443/stream';

const SYMBOL_MAP: Record<string, string> = {
    BTCUSDT: 'BTC/USD',
    ETHUSDT: 'ETH/USD',
    PAXGUSDT: 'GOLD',
};

const STREAM_SYMBOLS = ['btcusdt', 'ethusdt', 'paxgusdt'];

interface GlobalState {
    _binanceBridgeWS?: any;
    _binanceBridgeLastAttempt?: number;
    _binanceBridgeReconnects?: number;
}

const g = global as unknown as GlobalState;

function isOpenOrConnecting(ws: any): boolean {
    return ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING);
}

export function ensureBinanceConnected(): void {
    if (isOpenOrConnecting(g._binanceBridgeWS)) return;

    const now = Date.now();
    if (now - (g._binanceBridgeLastAttempt || 0) < 5000) return;
    g._binanceBridgeLastAttempt = now;

    emitStatus({ bridge: 'binance', status: 'connecting' });

    const streams = STREAM_SYMBOLS.map((s) => `${s}@trade`).join('/');
    const ws = new WebSocket(`${STREAM_URL}?streams=${streams}`);
    g._binanceBridgeWS = ws;

    ws.on('open', () => {
        g._binanceBridgeReconnects = 0;
        emitStatus({ bridge: 'binance', status: 'connected' });
        console.log('[Binance Bridge] ✓ Connected');
    });

    ws.on('message', (raw: any) => {
        try {
            const wrapper = JSON.parse(raw.toString());
            const data = wrapper.data;
            if (!data || !data.p) return;
            const binanceSymbol = String(data.s || '').toUpperCase();
            const symbol = SYMBOL_MAP[binanceSymbol] || binanceSymbol;
            const price = parseFloat(data.p);
            const timestamp = data.T || Date.now();
            pushTick(symbol, price, timestamp);
            emitTick({ symbol, price, timestamp });
        } catch {
            // Malformed message — ignore
        }
    });

    ws.on('close', () => {
        g._binanceBridgeWS = null;
        emitStatus({ bridge: 'binance', status: 'disconnected' });
        const attempts = (g._binanceBridgeReconnects || 0) + 1;
        g._binanceBridgeReconnects = attempts;
        const delay = Math.min(3000 * Math.pow(2, attempts - 1), 60000);
        setTimeout(ensureBinanceConnected, delay);
    });

    ws.on('error', (err: any) => {
        console.error('[Binance Bridge] error:', err?.message || err);
    });
}
