'use client';

import { useState, useEffect, useReducer, useCallback, useRef } from 'react';
import { MarketDataProvider, useMarketData } from '@/lib/trading/MarketDataProvider';
import {
    tradingReducer,
    initialTradingState,
} from '@/lib/trading/trading-engine';
import { Asset, Timeframe, ASSETS, TIMEFRAMES } from '@/lib/trading/types';
import CandlestickChart from '@/components/trading/CandlestickChart';
import AssetSelector from '@/components/trading/AssetSelector';
import TradingPanel from '@/components/trading/TradingPanel';
import ActiveTrades from '@/components/trading/ActiveTrades';
import TradeHistory from '@/components/trading/TradeHistory';
import { wallet } from '@/lib/wallet';
import { useAuth } from '@/lib/auth';

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);
    return isMobile;
}

// ─── Inner component that uses MarketData context ───
function TradingDashboard() {
    const { user, loading: authLoading } = useAuth();
    const { state: marketState, getAssetState } = useMarketData();
    const [tradingState, tradingDispatch] = useReducer(
        tradingReducer,
        initialTradingState
    );

    const isMobile = useIsMobile();

    const [selectedAsset, setSelectedAsset] = useState<Asset>(ASSETS[0]);
    const [amount, setAmount] = useState(100);
    const [timeframe, setTimeframe] = useState<Timeframe>(TIMEFRAMES[1]);
    const [showHistory, setShowHistory] = useState(false);

    const assetState = getAssetState(selectedAsset.id);
    const currentPrice = assetState?.currentPrice ?? selectedAsset.seedPrice;
    const previousPrice = assetState?.previousPrice ?? selectedAsset.seedPrice;
    const candles = assetState?.candles ?? [];
    const connectionStatus = assetState?.connectionStatus ?? 'connecting';

    // Trade expiry checker — runs every 250ms
    useEffect(() => {
        const interval = setInterval(() => {
            // Build current prices map from all assets
            const currentPrices: Record<string, number> = {};
            ASSETS.forEach((a) => {
                const state = marketState.assets[a.id];
                if (state) {
                    currentPrices[a.id] = state.currentPrice;
                }
            });

            tradingDispatch({ type: 'UPDATE_TRADES', currentPrices });
        }, 250);

        return () => clearInterval(interval);
    }, [marketState.assets]);

    // Initial balance sync from real wallet after auth loads
    useEffect(() => {
        if (!authLoading && user) {
            wallet.getBalance().then((bal) => {
                tradingDispatch({ type: 'RESET_BALANCE', amount: bal });
            });
        }
    }, [authLoading, user]);

    // Sync payouts for won trades to the real wallet
    const previousHistoryLengthRef = useRef(0);
    useEffect(() => {
        const newLength = tradingState.history.length;
        const oldLength = previousHistoryLengthRef.current;
        if (newLength > oldLength) {
            const added = tradingState.history.slice(0, newLength - oldLength);
            added.forEach(trade => {
                 if (trade.status === 'won') {
                      const payout = trade.amount + (trade.amount * (trade.payout / 100));
                      wallet.deposit(payout).catch(e => console.error("Win payout failed", e));
                 }
            });
            // Re-sync balance after payouts to avoid local divergence
            wallet.getBalance(true).then((bal) => {
                tradingDispatch({ type: 'RESET_BALANCE', amount: bal });
            });
        }
        previousHistoryLengthRef.current = newLength;
    }, [tradingState.history]);

    const handleTrade = useCallback(
        async (direction: 'up' | 'down') => {
            if (amount > tradingState.balance) return; // double check

            // Withdraw from real wallet first
            try {
                const success = await wallet.withdraw(amount);
                if (!success) return; // Insufficient real funds
            } catch (e) {
                console.error("Trade withdrawal failed:", e);
                return;
            }

            tradingDispatch({
                type: 'PLACE_TRADE',
                asset: selectedAsset.id,
                direction,
                amount,
                entryPrice: currentPrice,
                timeframe,
            });
        },
        [selectedAsset.id, amount, currentPrice, timeframe, tradingState.balance]
    );

    const priceChange = currentPrice - previousPrice;

    // Merge active trades from engine + remaining timers for display
    const allTrades = tradingState.trades;

    if (authLoading) {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0a0e17', color: '#fff' }}>
                <span style={{ fontSize: 16 }}>Loading profile...</span>
            </div>
        );
    }

    if (!user) {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0a0e17', color: '#fff' }}>
                <span style={{ fontSize: 16 }}>Please log in to trade.</span>
            </div>
        );
    }

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                overflow: 'hidden',
                userSelect: 'none',
            }}
        >
            {/* Top Bar */}
            <AssetSelector
                selectedAsset={selectedAsset}
                onSelectAsset={setSelectedAsset}
                currentPrice={currentPrice}
                priceChange={priceChange}
                connectionStatus={connectionStatus}
            />

            {/* Main Content: Chart Area + Right Panel */}
            <div
                style={{
                    display: 'flex',
                    flex: 1,
                    minHeight: 0,
                    flexDirection: isMobile ? 'column' : 'row',
                }}
            >
                {/* Chart & Active Trades Area (Left on desktop) */}
                <div
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        minWidth: 0, // Prevent flex overflow
                        padding: isMobile ? '8px' : '16px',
                    }}
                >
                    {/* Chart Container (Box) */}
                    <div
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            minHeight: 0,
                            border: '1px solid #1e293b',
                            borderRadius: '12px',
                            background: '#0a0e17',
                            overflow: 'hidden',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        }}
                    >
                        {/* Price header */}
                        <div
                            style={{
                                padding: '16px 20px 8px 20px',
                                zIndex: 10,
                                background: '#0a0e17', // Match the box background to ensure no bleed-through
                                flexShrink: 0,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                                <span
                                    style={{
                                        fontSize: 28,
                                        fontWeight: 800,
                                        color: priceChange >= 0 ? '#00E676' : '#FF1744',
                                        letterSpacing: -1,
                                    }}
                                >
                                    {currentPrice < 10
                                        ? currentPrice.toFixed(selectedAsset.decimals)
                                        : currentPrice.toFixed(2)}
                                </span>
                                <span
                                    style={{
                                        fontSize: 12,
                                        color: priceChange >= 0 ? '#00E676' : '#FF1744',
                                        fontWeight: 600,
                                    }}
                                >
                                    {priceChange >= 0 ? '▲' : '▼'}{' '}
                                    {Math.abs(priceChange) < 0.01
                                        ? priceChange.toFixed(5)
                                        : priceChange.toFixed(2)}
                                </span>
                            </div>
                            <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>
                                {selectedAsset.id} • Payout: 85% •{' '}
                                <span
                                    style={{
                                        color:
                                            connectionStatus === 'connected'
                                                ? '#00E676'
                                                : connectionStatus === 'simulated'
                                                    ? '#facc15'
                                                    : '#64748b',
                                    }}
                                >
                                    {connectionStatus === 'connected'
                                        ? '● LIVE'
                                        : connectionStatus === 'simulated'
                                            ? '● SIM'
                                            : connectionStatus === 'connecting'
                                                ? '○ CONNECTING...'
                                                : '○ OFFLINE'}
                                </span>
                            </div>
                        </div>

                        {/* Candlestick Chart */}
                        <div style={{ flex: 1, minHeight: 0 }}>
                            <CandlestickChart
                                candles={candles}
                                currentPrice={currentPrice}
                                trades={allTrades}
                                asset={selectedAsset}
                            />
                        </div>
                    </div>

                    {/* Active Trades Strip */}
                    <div style={{ marginTop: '16px' }}>
                        <ActiveTrades trades={allTrades} />
                    </div>
                </div>

                {/* Right Trading Panel */}
                <TradingPanel
                    balance={tradingState.balance}
                    pnl={tradingState.pnl}
                    amount={amount}
                    timeframe={timeframe}
                    currentPrice={currentPrice}
                    onAmountChange={setAmount}
                    onTimeframeChange={setTimeframe}
                    onTrade={handleTrade}
                />
            </div>

            {/* Trade History Toggle */}
            <TradeHistory
                history={tradingState.history}
                isOpen={showHistory}
                onToggle={() => setShowHistory(!showHistory)}
            />
        </div>
    );
}

// ─── Page wrapper with MarketDataProvider ───
export default function TradePage() {
    return (
        <MarketDataProvider>
            <TradingDashboard />
        </MarketDataProvider>
    );
}
