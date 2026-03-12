'use client';

import { useState, useEffect, useReducer, useCallback } from 'react';
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

// ─── Inner component that uses MarketData context ───
function TradingDashboard() {
    const { state: marketState, getAssetState } = useMarketData();
    const [tradingState, tradingDispatch] = useReducer(
        tradingReducer,
        initialTradingState
    );

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

    const handleTrade = useCallback(
        (direction: 'up' | 'down') => {
            tradingDispatch({
                type: 'PLACE_TRADE',
                asset: selectedAsset.id,
                direction,
                amount,
                entryPrice: currentPrice,
                timeframe,
            });
        },
        [selectedAsset.id, amount, currentPrice, timeframe]
    );

    const priceChange = currentPrice - previousPrice;

    // Merge active trades from engine + remaining timers for display
    const allTrades = tradingState.trades;

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

            {/* Chart Area — takes all remaining space */}
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    minHeight: 0,
                }}
            >
                {/* Price overlay */}
                <div
                    style={{
                        position: 'absolute',
                        top: 12,
                        left: 16,
                        zIndex: 10,
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

                {/* Candlestick Chart — fills remaining space */}
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
            <ActiveTrades trades={allTrades} />

            {/* Bottom Trading Panel — always visible */}
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
