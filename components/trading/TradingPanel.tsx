'use client';

import { useState, useEffect } from 'react';
import { Timeframe, TIMEFRAMES } from '@/lib/trading/types';

interface TradingPanelProps {
    balance: number;
    pnl: number;
    amount: number;
    timeframe: Timeframe;
    currentPrice: number;
    onAmountChange: (amount: number) => void;
    onTimeframeChange: (tf: Timeframe) => void;
    onTrade: (direction: 'up' | 'down') => void;
}

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

export default function TradingPanel({
    balance,
    pnl,
    amount,
    timeframe,
    currentPrice,
    onAmountChange,
    onTimeframeChange,
    onTrade,
}: TradingPanelProps) {
    const isMobile = useIsMobile();

    if (isMobile) {
        return <MobileTradingPanel
            balance={balance} pnl={pnl} amount={amount} timeframe={timeframe}
            currentPrice={currentPrice} onAmountChange={onAmountChange}
            onTimeframeChange={onTimeframeChange} onTrade={onTrade}
        />;
    }

    return <DesktopTradingPanel
        balance={balance} pnl={pnl} amount={amount} timeframe={timeframe}
        currentPrice={currentPrice} onAmountChange={onAmountChange}
        onTimeframeChange={onTimeframeChange} onTrade={onTrade}
    />;
}

// ─── Mobile Layout ───

function MobileTradingPanel({
    balance, pnl, amount, timeframe, currentPrice,
    onAmountChange, onTimeframeChange, onTrade,
}: TradingPanelProps) {
    return (
        <div
            style={{
                background: 'rgba(12, 17, 32, 0.98)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderTop: '1px solid rgba(59, 130, 246, 0.15)',
                padding: '8px 10px',
                paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
                flexShrink: 0,
            }}
        >
            {/* Row 1: Balance + Timeframe selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid #1e293b',
                        borderRadius: 6,
                        padding: '4px 8px',
                    }}
                >
                    <span style={{ fontSize: 8, color: '#64748b', letterSpacing: 1, fontWeight: 500 }}>BAL</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>
                        ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        background: pnl >= 0 ? 'rgba(0, 230, 118, 0.06)' : 'rgba(255, 23, 68, 0.06)',
                        border: `1px solid ${pnl >= 0 ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 23, 68, 0.15)'}`,
                        borderRadius: 6,
                        padding: '4px 8px',
                    }}
                >
                    <span style={{ fontSize: 8, color: '#64748b', letterSpacing: 1, fontWeight: 500 }}>P&L</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: pnl >= 0 ? '#00E676' : '#FF1744' }}>
                        {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                    </span>
                </div>

                {/* Compact timeframe selector */}
                <div
                    style={{
                        display: 'flex',
                        gap: 2,
                        marginLeft: 'auto',
                        background: 'rgba(10, 14, 23, 0.8)',
                        borderRadius: 6,
                        padding: 2,
                        border: '1px solid #1e293b',
                    }}
                >
                    {TIMEFRAMES.map((tf) => (
                        <button
                            key={tf.label}
                            onClick={() => onTimeframeChange(tf)}
                            style={{
                                padding: '4px 8px',
                                fontSize: 9,
                                fontWeight: 700,
                                border: timeframe.label === tf.label ? '1px solid #3B82F6' : '1px solid transparent',
                                borderRadius: 4,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                background: timeframe.label === tf.label ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                color: timeframe.label === tf.label ? '#3B82F6' : '#64748b',
                                transition: 'all .15s ease',
                            }}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Row 2: Amount + CALL/PUT buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Amount control */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'rgba(10, 14, 23, 0.8)',
                        borderRadius: 10,
                        border: '1px solid #1e293b',
                        overflow: 'hidden',
                        height: 48,
                    }}
                >
                    <button
                        onClick={() => onAmountChange(Math.max(10, amount - 10))}
                        style={{
                            width: 32,
                            height: '100%',
                            border: 'none',
                            background: 'transparent',
                            color: '#94a3b8',
                            fontSize: 18,
                            cursor: 'pointer',
                        }}
                    >
                        −
                    </button>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => onAmountChange(Math.max(1, parseInt(e.target.value) || 0))}
                        style={{
                            width: 50,
                            textAlign: 'center',
                            background: 'transparent',
                            border: 'none',
                            color: '#f8fafc',
                            fontSize: 15,
                            fontWeight: 800,
                            fontFamily: 'inherit',
                            outline: 'none',
                        }}
                    />
                    <button
                        onClick={() => onAmountChange(Math.min(balance, amount + 10))}
                        style={{
                            width: 32,
                            height: '100%',
                            border: 'none',
                            background: 'transparent',
                            color: '#94a3b8',
                            fontSize: 18,
                            cursor: 'pointer',
                        }}
                    >
                        +
                    </button>
                </div>

                {/* CALL/PUT Buttons */}
                <button
                    onClick={() => onTrade('up')}
                    disabled={amount > balance}
                    style={{
                        flex: 1,
                        padding: '12px 0',
                        fontSize: 14,
                        fontWeight: 900,
                        border: 'none',
                        borderRadius: 12,
                        cursor: amount > balance ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                        background: 'linear-gradient(135deg, #00E676, #00C853)',
                        color: '#042f1a',
                        letterSpacing: 0.5,
                        boxShadow: '0 4px 15px rgba(0, 230, 118, 0.25)',
                        opacity: amount > balance ? 0.4 : 1,
                        transition: 'all .2s ease',
                        textTransform: 'uppercase',
                    }}
                >
                    Buy
                </button>
                <button
                    onClick={() => onTrade('down')}
                    disabled={amount > balance}
                    style={{
                        flex: 1,
                        padding: '12px 0',
                        fontSize: 14,
                        fontWeight: 900,
                        border: 'none',
                        borderRadius: 12,
                        cursor: amount > balance ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                        background: 'linear-gradient(135deg, #FF1744, #D50000)',
                        color: '#ffffff',
                        letterSpacing: 0.5,
                        boxShadow: '0 4px 15px rgba(255, 23, 68, 0.25)',
                        opacity: amount > balance ? 0.4 : 1,
                        transition: 'all .2s ease',
                        textTransform: 'uppercase',
                    }}
                >
                    Sell
                </button>
            </div>
        </div>
    );
}

// ─── Desktop Layout ───

function DesktopTradingPanel({
    balance, pnl, amount, timeframe, currentPrice,
    onAmountChange, onTimeframeChange, onTrade,
}: TradingPanelProps) {
    return (
        <div
            style={{
                width: 300, 
                background: '#0c1120',
                borderLeft: '1px solid #1a2340',
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 28,
                flexShrink: 0,
                overflowY: 'auto',
            }}
        >
            {/* Top Stats Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Balance */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        background: 'rgba(15, 23, 42, 0.4)',
                        border: '1px solid #1e293b',
                        borderRadius: 12,
                        padding: '16px',
                    }}
                >
                    <span style={{ fontSize: 10, color: '#64748b', letterSpacing: 1.5, fontWeight: 700 }}>AVAILABLE BALANCE</span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', letterSpacing: -0.5 }}>
                        ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                </div>

                {/* PnL */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: pnl >= 0 ? 'rgba(0, 230, 118, 0.04)' : 'rgba(255, 23, 68, 0.04)',
                        border: `1px solid ${pnl >= 0 ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 23, 68, 0.1)'}`,
                        borderRadius: 12,
                        padding: '12px 16px',
                    }}
                >
                    <span style={{ fontSize: 10, color: '#94a3b8', letterSpacing: 1, fontWeight: 700 }}>PROFIT/LOSS</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: pnl >= 0 ? '#00E676' : '#FF1744' }}>
                        {pnl >= 0 ? '+' : ''}${pnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                </div>
            </div>

            {/* Timeframe Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Expiration</span>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 8,
                        background: 'rgba(10, 14, 23, 0.6)',
                        borderRadius: 12,
                        padding: 6,
                        border: '1px solid #1e293b',
                    }}
                >
                    {TIMEFRAMES.map((tf) => (
                        <button
                            key={tf.label}
                            onClick={() => onTimeframeChange(tf)}
                            style={{
                                padding: '10px 0',
                                fontSize: 12,
                                fontWeight: 800,
                                border: 'none',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                background: timeframe.label === tf.label ? '#3B82F6' : 'transparent',
                                color: timeframe.label === tf.label ? '#ffffff' : '#64748b',
                                transition: 'all .2s cubic-bezier(0.4, 0, 0.2, 1)',
                                textAlign: 'center',
                                boxShadow: timeframe.label === tf.label ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
                            }}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Investment Amount Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Investment</span>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {[25, 50, 100, 500].map((v) => (
                        <button
                            key={v}
                            onClick={() => onAmountChange(Math.min(balance, v))}
                            style={{
                                padding: '10px 0',
                                fontSize: 12,
                                fontWeight: 700,
                                border: amount === v ? '1px solid #3B82F6' : '1px solid #1e293b',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                background: amount === v ? 'rgba(59, 130, 246, 0.1)' : 'rgba(15, 23, 42, 0.4)',
                                color: amount === v ? '#3B82F6' : '#94a3b8',
                                transition: 'all .2s ease',
                            }}
                        >
                            ${v}
                        </button>
                    ))}
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'rgba(10, 14, 23, 0.6)',
                        borderRadius: 12,
                        border: '1px solid #1e293b',
                        overflow: 'hidden',
                        height: 54,
                        marginTop: 4,
                    }}
                >
                    <button
                        onClick={() => onAmountChange(Math.max(10, amount - 10))}
                        style={{
                            width: 54,
                            height: '100%',
                            border: 'none',
                            background: 'transparent',
                            color: '#64748b',
                            fontSize: 20,
                            cursor: 'pointer',
                        }}
                    >
                        −
                    </button>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => onAmountChange(Math.max(1, parseInt(e.target.value) || 0))}
                        style={{
                            flex: 1,
                            textAlign: 'center',
                            background: 'transparent',
                            border: 'none',
                            color: '#f8fafc',
                            fontSize: 20,
                            fontWeight: 800,
                            fontFamily: 'inherit',
                            outline: 'none',
                            width: '100%',
                        }}
                    />
                    <button
                        onClick={() => onAmountChange(Math.min(balance, amount + 10))}
                        style={{
                            width: 54,
                            height: '100%',
                            border: 'none',
                            background: 'transparent',
                            color: '#64748b',
                            fontSize: 20,
                            cursor: 'pointer',
                        }}
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Payout Info */}
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: 8,
                padding: '16px',
                background: 'rgba(15, 23, 42, 0.3)',
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.05)',
                fontSize: 13 
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Pot. Profit</span>
                    <span style={{ color: '#00E676', fontWeight: 800 }}>+${(amount * 0.85).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Pot. Loss</span>
                    <span style={{ color: '#FF1744', fontWeight: 800 }}>-${amount.toFixed(2)}</span>
                </div>
            </div>

            {/* Trade Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 'auto' }}>
                <button
                    onClick={() => onTrade('up')}
                    disabled={amount > balance}
                    style={{
                        width: '100%',
                        padding: '18px 0',
                        fontSize: 16,
                        fontWeight: 900,
                        border: 'none',
                        borderRadius: 14,
                        cursor: amount > balance ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                        background: 'linear-gradient(135deg, #00E676, #00C854)',
                        color: '#042f1a',
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                        boxShadow: '0 8px 24px rgba(0,230,118,0.25)',
                        opacity: amount > balance ? 0.4 : 1,
                        transition: 'all .2s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                >
                    Buy (Up)
                </button>
                <button
                    onClick={() => onTrade('down')}
                    disabled={amount > balance}
                    style={{
                        width: '100%',
                        padding: '18px 0',
                        fontSize: 16,
                        fontWeight: 900,
                        border: 'none',
                        borderRadius: 14,
                        cursor: amount > balance ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                        background: 'linear-gradient(135deg, #FF1744, #D50000)',
                        color: '#ffffff',
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                        boxShadow: '0 8px 24px rgba(255,23,68,0.25)',
                        opacity: amount > balance ? 0.4 : 1,
                        transition: 'all .2s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                >
                    Sell (Down)
                </button>
            </div>
            
            {/* Live trading badge */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                <div
                    style={{
                        background: 'rgba(0, 230, 118, 0.05)',
                        border: '1px solid rgba(0, 230, 118, 0.15)',
                        borderRadius: 20,
                        padding: '6px 16px',
                        fontSize: 10,
                        color: '#00E676',
                        letterSpacing: 1,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}
                >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E676', boxShadow: '0 0 8px #00E676' }} />
                    LIVE TRADING ACTIVE
                </div>
            </div>
        </div>
    );
}
