import { Trade, TradeDirection, TradeStatus, Timeframe } from './types';

/**
 * Trading Engine — Binary Options (Deriv/IQ Option style)
 *
 * State management for: balance, active trades, trade history, P&L.
 * Designed to be used with React useReducer.
 */

export interface TradingState {
    balance: number;
    trades: Trade[];
    history: Trade[];
    pnl: number;
}

export type TradingAction =
    | { type: 'PLACE_TRADE'; asset: string; direction: TradeDirection; amount: number; entryPrice: number; timeframe: Timeframe }
    | { type: 'UPDATE_TRADES'; currentPrices: Record<string, number> }
    | { type: 'RESET_BALANCE'; amount?: number };

export const INITIAL_BALANCE = 10000;
export const PAYOUT_PERCENT = 85;

export const initialTradingState: TradingState = {
    balance: INITIAL_BALANCE,
    trades: [],
    history: [],
    pnl: 0,
};

export function tradingReducer(state: TradingState, action: TradingAction): TradingState {
    switch (action.type) {
        case 'PLACE_TRADE': {
            const { asset, direction, amount, entryPrice, timeframe } = action;
            if (amount > state.balance || amount <= 0) return state;

            const trade: Trade = {
                id: Date.now() + Math.random(),
                asset,
                direction,
                amount,
                entryPrice,
                expiryTime: Date.now() + timeframe.seconds * 1000,
                remaining: timeframe.seconds,
                status: 'active',
                payout: PAYOUT_PERCENT,
            };

            return {
                ...state,
                balance: state.balance - amount,
                trades: [...state.trades, trade],
            };
        }

        case 'UPDATE_TRADES': {
            const now = Date.now();
            let newBalance = state.balance;
            let newPnl = state.pnl;
            const newHistory = [...state.history];

            const updatedTrades = state.trades.map(trade => {
                if (trade.status !== 'active') return trade;

                const remaining = trade.expiryTime - now;
                const currentPrice = action.currentPrices[trade.asset];

                if (remaining <= 0 && currentPrice !== undefined) {
                    // Trade expired — resolve it
                    const won =
                        trade.direction === 'up'
                            ? currentPrice > trade.entryPrice
                            : currentPrice < trade.entryPrice;

                    const profit = won
                        ? trade.amount * (PAYOUT_PERCENT / 100)
                        : -trade.amount;

                    // Credit balance on win (return stake + profit)
                    if (won) {
                        newBalance += trade.amount + trade.amount * (PAYOUT_PERCENT / 100);
                    }

                    newPnl += profit;

                    const resolved: Trade = {
                        ...trade,
                        status: won ? 'won' : 'lost',
                        exitPrice: currentPrice,
                        profit,
                        remaining: 0,
                    };

                    newHistory.unshift(resolved);
                    return resolved;
                }

                // Still active — update remaining
                return {
                    ...trade,
                    remaining: Math.ceil(remaining / 1000),
                };
            });

            return {
                ...state,
                balance: newBalance,
                pnl: newPnl,
                trades: updatedTrades.filter(t => t.status === 'active'),
                history: newHistory.slice(0, 50),
            };
        }

        case 'RESET_BALANCE':
            return {
                ...initialTradingState,
                balance: action.amount !== undefined ? action.amount : INITIAL_BALANCE,
                trades: state.trades, // Preserve active trades on balance reset
                history: state.history, // Preserve history on balance reset
                pnl: state.pnl, // Preserve P&L
            };

        default:
            return state;
    }
}
