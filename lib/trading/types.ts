// ─── Trading Platform Types ───

export type TradeDirection = 'up' | 'down';
export type TradeStatus = 'active' | 'won' | 'lost';
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'simulated';

export interface Tick {
    symbol: string;
    price: number;
    timestamp: number;
}

export interface Candle {
    open: number;
    high: number;
    low: number;
    close: number;
    time: number;
}

export interface Asset {
    id: string;
    label: string;
    provider: 'binance' | 'twelvedata' | 'finnhub';
    /** WebSocket symbol identifier for the provider */
    wsSymbol: string;
    /** Seed price for simulation fallback */
    seedPrice: number;
    /** Display color */
    color: string;
    /** Simulation volatility */
    volatility: number;
    /** Decimal precision for display */
    decimals: number;
}

export interface Trade {
    id: number;
    asset: string;
    direction: TradeDirection;
    amount: number;
    entryPrice: number;
    exitPrice?: number;
    expiryTime: number;
    remaining?: number;
    status: TradeStatus;
    payout: number;
    profit?: number;
}

export interface Timeframe {
    label: string;
    seconds: number;
}

export interface AssetState {
    currentPrice: number;
    previousPrice: number;
    candles: Candle[];
    connectionStatus: ConnectionStatus;
    lastTickTime: number;
}

// ─── Constants ───

export const ASSETS: Asset[] = [
    {
        id: 'BTC/USD',
        label: 'BTC/USD',
        provider: 'binance',
        wsSymbol: 'btcusdt',
        seedPrice: 70000,
        color: '#F59E0B',
        volatility: 0.004,
        decimals: 2,
    },
    {
        id: 'ETH/USD',
        label: 'ETH/USD',
        provider: 'binance',
        wsSymbol: 'ethusdt',
        seedPrice: 2040,
        color: '#6366F1',
        volatility: 0.005,
        decimals: 2,
    },
    {
        id: 'GOLD',
        label: 'GOLD',
        provider: 'binance',
        wsSymbol: 'paxgusdt',
        seedPrice: 5200,
        color: '#EAB308',
        volatility: 0.001,
        decimals: 2,
    },
    {
        id: 'EUR/USD',
        label: 'EUR/USD',
        provider: 'twelvedata',
        wsSymbol: 'EUR/USD',
        seedPrice: 1.0845,
        color: '#EC4899', // Pink
        volatility: 0.0005,
        decimals: 5,
    },
    {
        id: 'GBP/USD',
        label: 'GBP/USD',
        provider: 'twelvedata',
        wsSymbol: 'GBP/USD',
        seedPrice: 1.2643,
        color: '#8B5CF6', // Purple
        volatility: 0.0005,
        decimals: 5,
    },
];

export const TIMEFRAMES: Timeframe[] = [
    { label: '30s', seconds: 30 },
    { label: '1m', seconds: 60 },
    { label: '3m', seconds: 180 },
    { label: '5m', seconds: 300 },
];
