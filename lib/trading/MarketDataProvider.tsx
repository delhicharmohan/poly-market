'use client';

import React, { createContext, useContext, useEffect, useRef, useCallback, useReducer } from 'react';
import { AssetState, Candle, ConnectionStatus, Tick, ASSETS } from './types';
import { BinanceWSManager } from './ws-binance';
import { VeloraWSManager } from './ws-velora';
import { CandleBuilder } from './candle-builder';

// ─── Binance REST API — fetch historical klines ───

const BINANCE_SYMBOL_MAP: Record<string, string> = {
    'BTC/USD': 'BTCUSDT',
    'ETH/USD': 'ETHUSDT',
    'GOLD': 'PAXGUSDT',
};

async function fetchHistoricalKlines(assetId: string, limit = 100): Promise<Candle[]> {
    const binanceSymbol = BINANCE_SYMBOL_MAP[assetId];
    if (!binanceSymbol) return [];

    try {
        const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=1m&limit=${limit}`;
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();

        // Binance kline format: [openTime, open, high, low, close, volume, closeTime, ...]
        return data.map((k: any[]) => ({
            time: k[0],
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
        }));
    } catch (e) {
        console.warn(`[MarketData] Failed to fetch klines for ${assetId}:`, e);
        return [];
    }
}

// ─── State ───

interface MarketState {
    assets: Record<string, AssetState>;
}

type MarketAction =
    | { type: 'TICK'; symbol: string; price: number; timestamp: number }
    | { type: 'ADD_CANDLE'; symbol: string; candle: Candle }
    | { type: 'SET_STATUS'; symbol: string; status: ConnectionStatus }
    | { type: 'INIT_ASSET'; symbol: string; price: number; candles: Candle[] };

function marketReducer(state: MarketState, action: MarketAction): MarketState {
    switch (action.type) {
        case 'INIT_ASSET':
            return {
                ...state,
                assets: {
                    ...state.assets,
                    [action.symbol]: {
                        currentPrice: action.price,
                        previousPrice: action.price,
                        candles: action.candles,
                        connectionStatus: 'connecting',
                        lastTickTime: Date.now(),
                    },
                },
            };

        case 'TICK': {
            const prev = state.assets[action.symbol];
            if (!prev) return state;
            return {
                ...state,
                assets: {
                    ...state.assets,
                    [action.symbol]: {
                        ...prev,
                        previousPrice: prev.currentPrice,
                        currentPrice: action.price,
                        lastTickTime: action.timestamp,
                    },
                },
            };
        }

        case 'ADD_CANDLE': {
            const prev = state.assets[action.symbol];
            if (!prev) return state;
            return {
                ...state,
                assets: {
                    ...state.assets,
                    [action.symbol]: {
                        ...prev,
                        candles: [...prev.candles.slice(-200), action.candle],
                    },
                },
            };
        }

        case 'SET_STATUS': {
            const prev = state.assets[action.symbol];
            if (!prev) return state;
            return {
                ...state,
                assets: {
                    ...state.assets,
                    [action.symbol]: {
                        ...prev,
                        connectionStatus: action.status,
                    },
                },
            };
        }

        default:
            return state;
    }
}

// ─── Context ───

interface MarketDataContextValue {
    state: MarketState;
    getAssetState: (assetId: string) => AssetState | undefined;
}

const MarketDataContext = createContext<MarketDataContextValue | null>(null);

export function useMarketData(): MarketDataContextValue {
    const ctx = useContext(MarketDataContext);
    if (!ctx) throw new Error('useMarketData must be inside MarketDataProvider');
    return ctx;
}

// ─── Provider ───

export function MarketDataProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(marketReducer, { assets: {} });

    const candleBuildersRef = useRef<Map<string, CandleBuilder>>(new Map());
    const binanceRef = useRef<BinanceWSManager | null>(null);
    const veloraRef = useRef<VeloraWSManager | null>(null);

    // Guard against React Strict Mode double-mount
    const mountedRef = useRef(false);

    // Process a tick and build candles
    const handleTick = useCallback((tick: Tick) => {
        dispatch({ type: 'TICK', symbol: tick.symbol, price: tick.price, timestamp: tick.timestamp });

        // Build candle from tick
        let builder = candleBuildersRef.current.get(tick.symbol);
        if (!builder) {
            builder = new CandleBuilder(1000); // 1-second candles
            candleBuildersRef.current.set(tick.symbol, builder);
        }
        const candle = builder.processTick(tick);
        if (candle) {
            dispatch({ type: 'ADD_CANDLE', symbol: tick.symbol, candle });
        }
    }, []);

    useEffect(() => {
        // React Strict Mode guard
        if (mountedRef.current) return;
        mountedRef.current = true;

        // Step 1: Fetch historical klines for all assets, then connect WebSocket
        const initializeData = async () => {
            // Fetch historical data in parallel for all assets
            const results = await Promise.allSettled(
                ASSETS.map(async (asset) => {
                    const candles = await fetchHistoricalKlines(asset.id, 100);
                    const lastPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
                    dispatch({
                        type: 'INIT_ASSET',
                        symbol: asset.id,
                        price: lastPrice,
                        candles,
                    });
                })
            );
            // Initialize Velora (Forex) assets with seed prices (no historical klines from Binance)
            const veloraAssets = ASSETS.filter(a => a.provider === 'velora');
            veloraAssets.forEach(asset => {
                dispatch({
                    type: 'INIT_ASSET',
                    symbol: asset.id,
                    price: asset.seedPrice,
                    candles: [],
                });
            });

            console.log('[MarketData] Historical klines loaded for all assets');

            // Step 2: Connect Binance WebSocket for live ticks
            const binanceAssets = ASSETS.filter(a => a.provider === 'binance');
            if (binanceAssets.length > 0) {
                const binanceSymbols = binanceAssets.map(a => a.wsSymbol);
                const binance = new BinanceWSManager(binanceSymbols);
                binance.onTick(handleTick);
                binance.onStatusChange((status) => {
                    binanceAssets.forEach(asset => {
                        dispatch({ type: 'SET_STATUS', symbol: asset.id, status });
                    });
                });
                binance.connect();
                binanceRef.current = binance;
            }

            // Step 3: Connect Velora bridge for Forex
            if (veloraAssets.length > 0) {
                // Build token → assetId mapping
                const tokenToAsset: Record<string, string> = {};
                veloraAssets.forEach(asset => {
                    if (asset.instrumentToken) {
                        tokenToAsset[asset.instrumentToken] = asset.id;
                    }
                });

                const velora = new VeloraWSManager(tokenToAsset);
                velora.onTick(handleTick);
                velora.onStatusChange((status) => {
                    veloraAssets.forEach(asset => {
                        dispatch({ type: 'SET_STATUS', symbol: asset.id, status });
                    });
                });
                
                // Small delay to let Binance connect first
                setTimeout(() => velora.connect(), 2000);
                veloraRef.current = velora;
            }
        };

        initializeData();

        // Cleanup
        return () => {
            mountedRef.current = false;
            binanceRef.current?.disconnect();
            binanceRef.current = null;
            
            veloraRef.current?.disconnect();
            veloraRef.current = null;
            
            candleBuildersRef.current.forEach(builder => builder.reset());
            candleBuildersRef.current.clear();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const getAssetState = useCallback(
        (assetId: string) => state.assets[assetId],
        [state.assets]
    );

    return (
        <MarketDataContext.Provider value={{ state, getAssetState }}>
            {children}
        </MarketDataContext.Provider>
    );
}
