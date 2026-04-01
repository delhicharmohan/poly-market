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
    provider: 'binance' | 'twelvedata' | 'finnhub' | 'velora';
    /** WebSocket symbol identifier for the provider */
    wsSymbol: string;
    /** Velora instrument token (only for velora provider) */
    instrumentToken?: string;
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

export interface TickPoint {
    price: number;
    time: number;
}

export interface AssetState {
    currentPrice: number;
    previousPrice: number;
    candles: Candle[];
    ticks: TickPoint[];
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
        provider: 'velora',
        wsSymbol: 'EUR/USD',
        instrumentToken: '3045',
        seedPrice: 1.0845,
        color: '#EC4899', // Pink
        volatility: 0.0005,
        decimals: 5,
    },
    {
        id: 'GBP/USD',
        label: 'GBP/USD',
        provider: 'velora',
        wsSymbol: 'GBP/USD',
        instrumentToken: '3046',
        seedPrice: 1.2643,
        color: '#8B5CF6', // Purple
        volatility: 0.0005,
        decimals: 5,
    },
    {
        id: 'SILVER',
        label: 'SILVER',
        provider: 'velora',
        wsSymbol: 'XAG/USD',
        instrumentToken: '3049',
        seedPrice: 24.50,
        color: '#94a3b8', // Silver/Slate
        volatility: 0.002,
        decimals: 3,
    },
    {
        id: 'AAPL',
        label: 'AAPL',
        provider: 'finnhub',
        wsSymbol: 'AAPL',
        seedPrice: 190.50,
        color: '#A2AAAD', // Apple Silver
        volatility: 0.002,
        decimals: 2,
    },
    {
        id: 'BTC-FH',
        label: 'BTC (FH)',
        provider: 'finnhub',
        wsSymbol: 'BINANCE:BTCUSDT',
        seedPrice: 70000,
        color: '#F59E0B',
        volatility: 0.004,
        decimals: 2,
    },
    {
        id: 'ETH-FH',
        label: 'ETH (FH)',
        provider: 'finnhub',
        wsSymbol: 'BINANCE:ETHUSDT',
        seedPrice: 3500,
        color: '#6366F1',
        volatility: 0.005,
        decimals: 2,
    },
    {
        id: 'EURUSD-FH',
        label: 'EUR/USD (FH)',
        provider: 'finnhub',
        wsSymbol: 'OANDA:EUR_USD',
        seedPrice: 1.08,
        color: '#10B981',
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
