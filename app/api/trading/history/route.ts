import { NextResponse } from 'next/server';
import axios from 'axios';
import { getTickStore } from '@/lib/trading/server-ws';
import { ensureBinanceConnected } from '@/lib/trading/server/binance-bridge';
import { ensureFinnhubConnected } from '@/lib/trading/server/finnhub-bridge';
import { ensureSyntheticRunning, getSyntheticHistory } from '@/lib/trading/synthetic/engine';
import { loadRecentCandles } from '@/lib/trading/synthetic/store';

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

const candleCache: Record<string, { candles: Candle[]; timestamp: number }> = {};
const CACHE_DURATION = 5 * 60 * 1000;

const BINANCE_SYMBOL_MAP: Record<string, string> = {
    'BTC/USD': 'BTCUSDT',
    'ETH/USD': 'ETHUSDT',
    GOLD: 'PAXGUSDT',
};

const TWELVE_DATA_SYMBOL_MAP: Record<string, string> = {
    'EUR/USD': 'EUR/USD',
    'GBP/USD': 'GBP/USD',
    'USD/JPY': 'USD/JPY',
    'AUD/USD': 'AUD/USD',
    SILVER: 'XAG/USD',
};

async function fetchBinanceHistory(assetId: string): Promise<Candle[]> {
    const symbol = BINANCE_SYMBOL_MAP[assetId];
    try {
        const response = await axios.get(
            `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1m&limit=10`
        );
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
    const apiKey = process.env.TWELVEDATA_API_KEY || process.env.NEXT_PUBLIC_TWELVEDATA_API_KEY;
    if (!apiKey) return [];

    try {
        const response = await axios.get(
            `https://api.twelvedata.com/time_series?symbol=${assetId}&interval=1min&outputsize=10&apikey=${apiKey}`
        );
        if (!response.data.values) return [];

        return response.data.values
            .map((v: any) => ({
                time: new Date(v.datetime).getTime(),
                open: parseFloat(v.open),
                high: parseFloat(v.high),
                low: parseFloat(v.low),
                close: parseFloat(v.close),
            }))
            .reverse();
    } catch (e) {
        return [];
    }
}

export async function GET(request: Request) {
    // Boot bridges lazily; the SSE stream also boots them.
    ensureBinanceConnected();
    ensureFinnhubConnected();

    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('asset');
    if (!assetId) return NextResponse.json({ error: 'Missing asset parameter' }, { status: 400 });

    // Synthetic indices are generated in-process; serve their recent 1s candles
    // from memory plus the persisted 1-minute history from the DB (for long windows).
    ensureSyntheticRunning();
    const synthetic = getSyntheticHistory(assetId);
    if (synthetic) {
        const candles1m = await loadRecentCandles(assetId, 1500);
        return NextResponse.json({
            candles: synthetic.candles,
            candles1m,
            ticks: getTickStore()[assetId] || [],
        });
    }

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
        ticks: getTickStore()[assetId] || [],
    });
}
