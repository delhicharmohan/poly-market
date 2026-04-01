import { NextResponse } from 'next/server';
import axios from 'axios';
import { WebSocket, getBinanceWS, setBinanceWS, getLastBinanceAttempt, setLastBinanceAttempt, getFinnhubWS, setFinnhubWS, getLastFinnhubAttempt, setLastFinnhubAttempt } from '@/lib/trading/server-ws';

/**
 * Historical Data & Tick Buffer
 * Ensures all users see the exact same 5-minute historical graph baseline.
 */
interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

interface TickPoint {
    price: number;
    time: number;
}

// ─── Global Tick Store (In-Memory) ───
// Maps assetId -> array of points for the last 5 minutes
const tickStore: Record<string, TickPoint[]> = {};
const MAX_TICK_AGE = 5 * 60 * 1000; // 5 minutes

// Cache of the absolute latest price for each symbol
export const latestPrices: Record<string, { price: number; timestamp: number }> = {};

export function pushTick(assetId: string, price: number, time: number = Date.now()) {
    // Update latest cache
    latestPrices[assetId] = { price, timestamp: time };

    if (!tickStore[assetId]) tickStore[assetId] = [];
    const points = tickStore[assetId];
    
    // Deduplicate/throttle: only one point per second for the buffer
    const last = points[points.length - 1];
    if (last && time - last.time < 1000) return;

    points.push({ price, time });
    
    // Evict old points
    const cutoff = time - MAX_TICK_AGE;
    while (points.length > 0 && points[0].time < cutoff) {
        points.shift();
    }
}

// ─── Binance Client-Side Sync ───
function startBinanceSync() {
    const currentWS = getBinanceWS();
    if (currentWS && (currentWS.readyState === WebSocket.OPEN || currentWS.readyState === WebSocket.CONNECTING)) {
        return;
    }

    const now = Date.now();
    if (now - getLastBinanceAttempt() < 5000) return;
    setLastBinanceAttempt(now);
    
    console.log('[History API] Starting server-side Binance sync...');
    const symbols = ['btcusdt', 'ethusdt', 'paxgusdt'];
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbols.map(s => `${s}@ticker`).join('/')}`);
    
    ws.on('message', (data: any) => {
        try {
            const msg = JSON.parse(data.toString());
            const id = msg.s === 'BTCUSDT' ? 'BTC/USD' : msg.s === 'ETHUSDT' ? 'ETH/USD' : 'GOLD';
            pushTick(id, parseFloat(msg.c), Date.now());
        } catch {}
    });
    
    ws.on('close', () => {
        setBinanceWS(null);
    });

    ws.on('error', () => {
        setBinanceWS(null);
    });

    setBinanceWS(ws);
}

// ─── Finnhub Server-Side Sync ───
function startFinnhubSync() {
    const currentWS = getFinnhubWS();
    if (currentWS && (currentWS.readyState === WebSocket.OPEN || currentWS.readyState === WebSocket.CONNECTING)) {
        return;
    }

    const now = Date.now();
    if (now - getLastFinnhubAttempt() < 5000) return;
    setLastFinnhubAttempt(now);
    
    const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
    if (!apiKey) {
        console.error('[History API] Finnhub Sync ERR: NEXT_PUBLIC_FINNHUB_API_KEY is missing');
        return;
    }

    console.log('[History API] Finnhub Sync: Attempting connection...');
    try {
        const ws = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);

        ws.on('open', () => {
            console.log('[History API] Finnhub Sync: SUCCESS - Connected');
            const symbols = ['AAPL', 'BINANCE:BTCUSDT', 'BINANCE:ETHUSDT', 'OANDA:EUR_USD'];
            symbols.forEach(symbol => {
                ws.send(JSON.stringify({ type: 'subscribe', symbol }));
            });
        });

        ws.on('message', (data: any) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'trade' && Array.isArray(msg.data)) {
                    const symbolMap: Record<string, string> = {
                        'AAPL': 'AAPL',
                        'BINANCE:BTCUSDT': 'BTC-FH',
                        'BINANCE:ETHUSDT': 'ETH-FH',
                        'OANDA:EUR_USD': 'EURUSD-FH'
                    };

                    msg.data.forEach((trade: any) => {
                        const internalId = symbolMap[trade.s] || trade.s;
                        pushTick(internalId, trade.p, trade.t || Date.now());
                    });
                }
            } catch (e) {
                console.warn('[History API] Finnhub Sync: Parse error', e);
            }
        });

        ws.on('close', (code: number, reason: string) => {
            console.warn(`[History API] Finnhub Sync: Closed (Code: ${code}, Reason: ${reason})`);
            setFinnhubWS(null);
        });

        ws.on('error', (err: any) => {
            console.error('[History API] Finnhub Sync: WebSocket Error:', err);
            setFinnhubWS(null);
        });

        setFinnhubWS(ws);
    } catch (e) {
        console.error('[History API] Finnhub Sync: Setup Error:', e);
    }
}

// ─── Historical Candles Cache ───
const candleCache: Record<string, { candles: Candle[]; timestamp: number }> = {};
const CACHE_DURATION = 5 * 60 * 1000; 

const BINANCE_SYMBOL_MAP: Record<string, string> = {
    'BTC/USD': 'BTCUSDT',
    'ETH/USD': 'ETHUSDT',
    'GOLD': 'PAXGUSDT',
};

const TWELVE_DATA_SYMBOL_MAP: Record<string, string> = {
    'EUR/USD': 'EUR/USD',
    'GBP/USD': 'GBP/USD',
    'USD/JPY': 'USD/JPY',
    'AUD/USD': 'AUD/USD',
    'SILVER': 'XAG/USD',
};

/**
 * Fetches 1-minute historical candles from Binance (Crypto) or Twelve Data (Forex)
 */
async function fetchHistoricalData(assetId: string): Promise<Candle[]> {
    if (BINANCE_SYMBOL_MAP[assetId]) {
        return fetchBinanceHistory(assetId);
    } else {
        return fetchTwelveDataHistory(assetId);
    }
}

async function fetchBinanceHistory(assetId: string): Promise<Candle[]> {
    const symbol = BINANCE_SYMBOL_MAP[assetId];
    try {
        const response = await axios.get(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1m&limit=10`);
        return response.data.map((c: any) => ({
            time: c[0],
            open: parseFloat(c[1]),
            high: parseFloat(c[2]),
            low: parseFloat(c[3]),
            close: parseFloat(c[4]),
        }));
    } catch (e) {
        return [];
    }
}

async function fetchTwelveDataHistory(assetId: string): Promise<Candle[]> {
    const apiKey = process.env.NEXT_PUBLIC_TWELVEDATA_API_KEY;
    if (!apiKey) return [];

    try {
        const response = await axios.get(`https://api.twelvedata.com/time_series?symbol=${assetId}&interval=1min&outputsize=10&apikey=${apiKey}`);
        if (!response.data.values) return [];
        
        return response.data.values.map((v: any) => ({
            time: new Date(v.datetime).getTime(),
            open: parseFloat(v.open),
            high: parseFloat(v.high),
            low: parseFloat(v.low),
            close: parseFloat(v.close),
        })).reverse();
    } catch (e) {
        return [];
    }
}

export async function GET(request: Request) {
    if (!getBinanceWS()) startBinanceSync();
    if (!getFinnhubWS()) startFinnhubSync();

    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('asset');
    if (!assetId) return NextResponse.json({ error: 'Missing asset parameter' }, { status: 400 });

    const now = Date.now();
    let candles: Candle[] = [];
    const cached = candleCache[assetId];

    if (cached && now - cached.timestamp < CACHE_DURATION) {
        candles = cached.candles;
    } else {
        if (BINANCE_SYMBOL_MAP[assetId]) {
            candles = await fetchBinanceHistory(assetId);
        } else if (TWELVE_DATA_SYMBOL_MAP[assetId]) {
            candles = await fetchTwelveDataHistory(assetId);
        }
        if (candles.length > 0) {
            candleCache[assetId] = { candles, timestamp: now };
        }
    }

    return NextResponse.json({
        candles,
        ticks: tickStore[assetId] || []
    });
}
