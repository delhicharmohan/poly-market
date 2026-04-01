'use client';

import React, { createContext, useContext, useEffect, useRef, useCallback, useReducer } from 'react';
import { AssetState, Candle, ConnectionStatus, Tick, ASSETS, TickPoint } from './types';
import { BinanceWSManager } from './ws-binance';
import { VeloraWSManager } from './ws-velora';
import { FinnhubWSManager } from './ws-finnhub';
import { CandleBuilder } from './candle-builder';

// ─── State ───

interface MarketState {
    assets: Record<string, AssetState>;
}

type MarketAction =
    | { type: 'TICK'; symbol: string; price: number; timestamp: number }
    | { type: 'ADD_CANDLE'; symbol: string; candle: Candle }
    | { type: 'SET_STATUS'; symbol: string; status: ConnectionStatus }
    | { type: 'INIT_ASSET'; symbol: string; price: number; candles: Candle[]; ticks: TickPoint[] };

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
                        ticks: action.ticks,
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
                        ticks: [...prev.ticks.slice(-600), { price: action.price, time: action.timestamp }],
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
    const finnhubRef = useRef<FinnhubWSManager | null>(null);

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

        const initializeData = async () => {
            // Step 1: Fetch historical data for ALL assets from our centralized API
            // This ensures all users see the same consistent baseline
            await Promise.allSettled(
                ASSETS.map(async (asset) => {
                    try {
                        const res = await fetch(`/api/trading/history?asset=${encodeURIComponent(asset.id)}`);
                        const data = res.ok ? await res.json() : { candles: [], ticks: [] };
                        const candles = data.candles || [];
                        const ticks = data.ticks || [];
                        
                        const lastPrice = ticks.length > 0 
                            ? ticks[ticks.length - 1].price 
                            : (candles.length > 0 ? candles[candles.length - 1].close : asset.seedPrice);

                        dispatch({
                            type: 'INIT_ASSET',
                            symbol: asset.id,
                            price: lastPrice,
                            candles,
                            ticks,
                        });
                    } catch (e) {
                        console.warn(`[MarketData] Failed to fetch history for ${asset.id}:`, e);
                        // Fallback to seed price if API fails
                        dispatch({
                            type: 'INIT_ASSET',
                            symbol: asset.id,
                            price: asset.seedPrice,
                            candles: [],
                            ticks: [],
                        });
                    }
                })
            );

            console.log('[MarketData] Centralized historical data loaded');

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
            const veloraAssets = ASSETS.filter(a => a.provider === 'velora');
            if (veloraAssets.length > 0) {
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
                
                setTimeout(() => velora.connect(), 2000);
                veloraRef.current = velora;
            }

            // Step 4: Connect Finnhub WebSocket for Stocks
            const finnhubAssets = ASSETS.filter(a => a.provider === 'finnhub');
            if (finnhubAssets.length > 0) {
                const finnhubApiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
                if (!finnhubApiKey) {
                    console.warn('[MarketData] Finnhub API Key missing, skipping stock symbols');
                } else {
                    const symbols = finnhubAssets.map(a => a.wsSymbol);
                    const finnhub = new FinnhubWSManager(symbols, finnhubApiKey);
                    finnhub.onTick(handleTick);
                    finnhub.onStatusChange((status) => {
                        finnhubAssets.forEach(asset => {
                            dispatch({ type: 'SET_STATUS', symbol: asset.id, status });
                        });
                    });
                    finnhub.connect();
                    finnhubRef.current = finnhub;
                }
            }
        };

        initializeData();

        return () => {
            mountedRef.current = false;
            binanceRef.current?.disconnect();
            binanceRef.current = null;
            veloraRef.current?.disconnect();
            veloraRef.current = null;
            finnhubRef.current?.disconnect();
            finnhubRef.current = null;
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
