'use client';

import React, { createContext, useContext, useEffect, useRef, useCallback, useReducer, useState } from 'react';
import { Asset, AssetState, Candle, ConnectionStatus, Tick, ASSETS, TickPoint } from './types';
import { CandleBuilder } from './candle-builder';

// ─── State ───

interface MarketState {
    assets: Record<string, AssetState>;
}

type MarketAction =
    | { type: 'TICK'; symbol: string; price: number; timestamp: number }
    | { type: 'ADD_CANDLE'; symbol: string; candle: Candle }
    | { type: 'SET_STATUS'; symbol: string; status: ConnectionStatus }
    | { type: 'SET_ALL_STATUS'; status: ConnectionStatus }
    | { type: 'INIT_ASSET'; symbol: string; price: number; candles: Candle[]; candles1m: Candle[]; ticks: TickPoint[] };

function marketReducer(state: MarketState, action: MarketAction): MarketState {
    switch (action.type) {
        case 'INIT_ASSET': {
            // History can land AFTER live ticks have already started flowing
            // (the stream now opens immediately). Don't clobber accumulated live
            // ticks or the live price — only seed the historical candle baseline.
            const prev = state.assets[action.symbol];
            return {
                ...state,
                assets: {
                    ...state.assets,
                    [action.symbol]: {
                        currentPrice: prev?.currentPrice ?? action.price,
                        previousPrice: prev?.previousPrice ?? action.price,
                        candles: action.candles,
                        candles1m: action.candles1m,
                        ticks: prev && prev.ticks.length > 0 ? prev.ticks : action.ticks,
                        connectionStatus: prev?.connectionStatus ?? 'connecting',
                        lastTickTime: prev?.lastTickTime ?? Date.now(),
                    },
                },
            };
        }

        case 'TICK': {
            const prev = state.assets[action.symbol];
            // First tick may arrive before history has initialized this asset —
            // initialize on the fly instead of dropping it.
            if (!prev) {
                return {
                    ...state,
                    assets: {
                        ...state.assets,
                        [action.symbol]: {
                            currentPrice: action.price,
                            previousPrice: action.price,
                            candles: [],
                            ticks: [{ price: action.price, time: action.timestamp }],
                            connectionStatus: 'connected',
                            lastTickTime: action.timestamp,
                        },
                    },
                };
            }
            return {
                ...state,
                assets: {
                    ...state.assets,
                    [action.symbol]: {
                        ...prev,
                        previousPrice: prev.currentPrice,
                        currentPrice: action.price,
                        lastTickTime: action.timestamp,
                        ticks: [...prev.ticks.slice(-1200), { price: action.price, time: action.timestamp }],
                        connectionStatus: 'connected',
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
                        candles: [...prev.candles.slice(-1200), action.candle],
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

        case 'SET_ALL_STATUS': {
            const next: Record<string, AssetState> = {};
            for (const [symbol, s] of Object.entries(state.assets)) {
                next[symbol] = { ...s, connectionStatus: action.status };
            }
            return { ...state, assets: next };
        }

        default:
            return state;
    }
}

// ─── Context ───

interface MarketDataContextValue {
    state: MarketState;
    getAssetState: (assetId: string) => AssetState | undefined;
    /** Runtime instrument list (real feeds + enabled synthetic indices). */
    instruments: Asset[];
}

const MarketDataContext = createContext<MarketDataContextValue | null>(null);

export function useMarketData(): MarketDataContextValue {
    const ctx = useContext(MarketDataContext);
    if (!ctx) throw new Error('useMarketData must be inside MarketDataProvider');
    return ctx;
}

// ─── Provider ───
//
// The per-asset connectionStatus is derived from which bridge feeds the asset.
// An asset's `provider` field IS its bridge name, so a 'status' event for a
// given bridge updates every instrument whose provider matches.

export function MarketDataProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(marketReducer, { assets: {} });
    const [instruments, setInstruments] = useState<Asset[]>(ASSETS);

    const candleBuildersRef = useRef<Map<string, CandleBuilder>>(new Map());
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Read by handleStatus (which must stay referentially stable) to map a
    // bridge → its assets without re-subscribing the SSE listeners.
    const instrumentsRef = useRef<Asset[]>(ASSETS);

    // Guard against React Strict Mode double-mount
    const mountedRef = useRef(false);

    const handleTick = useCallback((tick: Tick) => {
        dispatch({ type: 'TICK', symbol: tick.symbol, price: tick.price, timestamp: tick.timestamp });

        let builder = candleBuildersRef.current.get(tick.symbol);
        if (!builder) {
            builder = new CandleBuilder(1000);
            candleBuildersRef.current.set(tick.symbol, builder);
        }
        const candle = builder.processTick(tick);
        if (candle) {
            dispatch({ type: 'ADD_CANDLE', symbol: tick.symbol, candle });
        }
    }, []);

    const handleStatus = useCallback((bridge: string, status: ConnectionStatus) => {
        for (const asset of instrumentsRef.current) {
            if (asset.provider === bridge) {
                dispatch({ type: 'SET_STATUS', symbol: asset.id, status });
            }
        }
    }, []);

    const openStream = useCallback(() => {
        if (typeof window === 'undefined') return;
        if (eventSourceRef.current) return;

        const es = new EventSource('/api/market-stream');
        eventSourceRef.current = es;

        es.addEventListener('hello', () => {
            // Stream open; per-asset status will land via 'status' events as
            // each upstream bridge connects.
        });

        es.addEventListener('tick', (ev) => {
            try {
                const data = JSON.parse((ev as MessageEvent).data);
                handleTick({
                    symbol: data.symbol,
                    price: data.price,
                    timestamp: data.timestamp,
                });
            } catch (e) {
                console.warn('[MarketStream] bad tick payload', e);
            }
        });

        es.addEventListener('status', (ev) => {
            try {
                const data = JSON.parse((ev as MessageEvent).data);
                handleStatus(data.bridge, data.status);
            } catch (e) {
                console.warn('[MarketStream] bad status payload', e);
            }
        });

        es.onerror = () => {
            // EventSource auto-reconnects, but we close + reopen with a backoff
            // so transient route failures don't fast-loop.
            es.close();
            eventSourceRef.current = null;
            dispatch({ type: 'SET_ALL_STATUS', status: 'disconnected' });
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = setTimeout(openStream, 3000);
        };
    }, [handleTick, handleStatus]);

    useEffect(() => {
        if (mountedRef.current) return;
        mountedRef.current = true;

        // Open the live stream immediately so ticks start flowing right away,
        // rather than waiting on every asset's historical fetch to settle. The
        // stream and the per-asset bridges are idempotent.
        openStream();

        const initializeData = async () => {
            // Resolve the runtime instrument list (real feeds + synthetic indices).
            let assets: Asset[] = ASSETS;
            try {
                const res = await fetch('/api/trading/instruments');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data.assets) && data.assets.length > 0) {
                        assets = data.assets;
                    }
                }
            } catch (e) {
                console.warn('[MarketData] instruments fetch failed, using static list', e);
            }
            instrumentsRef.current = assets;
            setInstruments(assets);

            await Promise.allSettled(
                assets.map(async (asset) => {
                    try {
                        const res = await fetch(`/api/trading/history?asset=${encodeURIComponent(asset.id)}`);
                        const data = res.ok ? await res.json() : { candles: [], ticks: [] };
                        const candles = data.candles || [];
                        const candles1m = data.candles1m || [];
                        const ticks = data.ticks || [];

                        const lastPrice =
                            ticks.length > 0
                                ? ticks[ticks.length - 1].price
                                : candles.length > 0
                                    ? candles[candles.length - 1].close
                                    : asset.seedPrice;

                        dispatch({
                            type: 'INIT_ASSET',
                            symbol: asset.id,
                            price: lastPrice,
                            candles,
                            candles1m,
                            ticks,
                        });
                    } catch (e) {
                        console.warn(`[MarketData] Failed to fetch history for ${asset.id}:`, e);
                        dispatch({
                            type: 'INIT_ASSET',
                            symbol: asset.id,
                            price: asset.seedPrice,
                            candles: [],
                            candles1m: [],
                            ticks: [],
                        });
                    }
                })
            );

            console.log('[MarketData] Centralized historical data loaded');
        };

        initializeData();

        return () => {
            mountedRef.current = false;
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            eventSourceRef.current?.close();
            eventSourceRef.current = null;
            candleBuildersRef.current.forEach((builder) => builder.reset());
            candleBuildersRef.current.clear();
        };
    }, [openStream]);

    const getAssetState = useCallback(
        (assetId: string) => state.assets[assetId],
        [state.assets]
    );

    return (
        <MarketDataContext.Provider value={{ state, getAssetState, instruments }}>
            {children}
        </MarketDataContext.Provider>
    );
}
