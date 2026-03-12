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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Amount control */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'rgba(10, 14, 23, 0.8)',
                        borderRadius: 8,
                        border: '1px solid #1e293b',
                        overflow: 'hidden',
                    }}
                >
                    <button
                        onClick={() => onAmountChange(Math.max(10, amount - 10))}
                        style={{
                            width: 28,
                            height: 36,
                            border: 'none',
                            background: 'transparent',
                            color: '#64748b',
                            fontSize: 14,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        −
                    </button>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => onAmountChange(Math.max(1, parseInt(e.target.value) || 0))}
                        style={{
                            width: 45,
                            textAlign: 'center',
                            background: 'transparent',
                            border: 'none',
                            color: '#e2e8f0',
                            fontSize: 13,
                            fontWeight: 700,
                            fontFamily: 'inherit',
                            outline: 'none',
                        }}
                    />
                    <button
                        onClick={() => onAmountChange(Math.min(balance, amount + 10))}
                        style={{
                            width: 28,
                            height: 36,
                            border: 'none',
                            background: 'transparent',
                            color: '#64748b',
                            fontSize: 14,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        +
                    </button>
                </div>

                {/* CALL/PUT Buttons — always visible and prominent */}
                <button
                    onClick={() => onTrade('up')}
                    disabled={amount > balance}
                    style={{
                        flex: 1,
                        padding: '12px 0',
                        fontSize: 13,
                        fontWeight: 800,
                        border: 'none',
                        borderRadius: 10,
                        cursor: amount > balance ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                        background: 'linear-gradient(135deg, #00C853, #00E676)',
                        color: '#062e16',
                        letterSpacing: 0.8,
                        boxShadow: '0 4px 20px rgba(0,230,118,0.3)',
                        opacity: amount > balance ? 0.4 : 1,
                        transition: 'all .2s ease',
                    }}
                >
                    ▲ CALL
                </button>
                <button
                    onClick={() => onTrade('down')}
                    disabled={amount > balance}
                    style={{
                        flex: 1,
                        padding: '12px 0',
                        fontSize: 13,
                        fontWeight: 800,
                        border: 'none',
                        borderRadius: 10,
                        cursor: amount > balance ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                        background: 'linear-gradient(135deg, #D50000, #FF1744)',
                        color: '#fff',
                        letterSpacing: 0.8,
                        boxShadow: '0 4px 20px rgba(255,23,68,0.3)',
                        opacity: amount > balance ? 0.4 : 1,
                        transition: 'all .2s ease',
                    }}
                >
                    ▼ PUT
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
                width: 280, // Fixed width for sidebar
                background: 'rgba(12, 17, 32, 0.95)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderLeft: '1px solid rgba(59, 130, 246, 0.15)',
                padding: '24px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 24, // Spacing between sections
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
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid #1e293b',
                        borderRadius: 8,
                        padding: '12px',
                    }}
                >
                    <span style={{ fontSize: 10, color: '#64748b', letterSpacing: 1.2, fontWeight: 500 }}>BALANCE</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>
                        ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                </div>

                {/* PnL */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: pnl >= 0 ? 'rgba(0, 230, 118, 0.06)' : 'rgba(255, 23, 68, 0.06)',
                        border: `1px solid ${pnl >= 0 ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 23, 68, 0.15)'}`,
                        borderRadius: 8,
                        padding: '12px',
                    }}
                >
                    <span style={{ fontSize: 10, color: '#64748b', letterSpacing: 1.2, fontWeight: 500 }}>PROFIT/LOSS</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: pnl >= 0 ? '#00E676' : '#FF1744' }}>
                        {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                    </span>
                </div>
            </div>

            {/* Timeframe Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Timeframe</span>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 6,
                        background: 'rgba(10, 14, 23, 0.8)',
                        borderRadius: 8,
                        padding: 6,
                        border: '1px solid #1e293b',
                    }}
                >
                    {TIMEFRAMES.map((tf) => (
                        <button
                            key={tf.label}
                            onClick={() => onTimeframeChange(tf)}
                            style={{
                                padding: '8px 0',
                                fontSize: 11,
                                fontWeight: 700,
                                border: 'none',
                                borderRadius: 6,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                background: timeframe.label === tf.label ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                color: timeframe.label === tf.label ? '#3B82F6' : '#64748b',
                                transition: 'all .15s ease',
                                textAlign: 'center',
                            }}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Investment Amount Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Amount</span>
                
                {/* Preset Amounts */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                    {[25, 50, 100, 500].map((v) => (
                        <button
                            key={v}
                            onClick={() => onAmountChange(Math.min(balance, v))}
                            style={{
                                padding: '8px 0',
                                fontSize: 11,
                                fontWeight: 600,
                                border: amount === v ? '1px solid #3B82F6' : '1px solid #1e293b',
                                borderRadius: 6,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                background: amount === v ? 'rgba(59, 130, 246, 0.12)' : 'rgba(10, 14, 23, 0.8)',
                                color: amount === v ? '#3B82F6' : '#94a3b8',
                                transition: 'all .15s ease',
                            }}
                        >
                            ${v}
                        </button>
                    ))}
                </div>

                {/* Manual Amount Input */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'rgba(10, 14, 23, 0.8)',
                        borderRadius: 8,
                        border: '1px solid #1e293b',
                        overflow: 'hidden',
                        height: 48,
                        marginTop: 4,
                    }}
                >
                    <button
                        onClick={() => onAmountChange(Math.max(10, amount - 10))}
                        style={{
                            width: 48,
                            height: '100%',
                            border: 'none',
                            background: 'transparent',
                            color: '#64748b',
                            fontSize: 18,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
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
                            color: '#e2e8f0',
                            fontSize: 16,
                            fontWeight: 700,
                            fontFamily: 'inherit',
                            outline: 'none',
                            width: '100%',
                        }}
                    />
                    <button
                        onClick={() => onAmountChange(Math.min(balance, amount + 10))}
                        style={{
                            width: 48,
                            height: '100%',
                            border: 'none',
                            background: 'transparent',
                            color: '#64748b',
                            fontSize: 18,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Payout Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
                <span>
                    Profit: <span style={{ color: '#00E676', fontWeight: 700 }}>+${(amount * 0.85).toFixed(2)}</span>
                </span>
                <span>
                    Loss: <span style={{ color: '#FF1744', fontWeight: 700 }}>-${amount.toFixed(2)}</span>
                </span>
            </div>

            {/* Trade Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 'auto' }}>
                <button
                    onClick={() => onTrade('up')}
                    disabled={amount > balance}
                    style={{
                        width: '100%',
                        padding: '16px 0',
                        fontSize: 16,
                        fontWeight: 800,
                        border: 'none',
                        borderRadius: 10,
                        cursor: amount > balance ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                        background: 'linear-gradient(135deg, #00C853, #00E676)',
                        color: '#062e16',
                        letterSpacing: 0.8,
                        boxShadow: '0 4px 24px rgba(0,230,118,0.3)',
                        opacity: amount > balance ? 0.4 : 1,
                        transition: 'all .2s ease',
                    }}
                >
                    ▲ CALL
                </button>
                <button
                    onClick={() => onTrade('down')}
                    disabled={amount > balance}
                    style={{
                        width: '100%',
                        padding: '16px 0',
                        fontSize: 16,
                        fontWeight: 800,
                        border: 'none',
                        borderRadius: 10,
                        cursor: amount > balance ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                        background: 'linear-gradient(135deg, #D50000, #FF1744)',
                        color: '#fff',
                        letterSpacing: 0.8,
                        boxShadow: '0 4px 24px rgba(255,23,68,0.3)',
                        opacity: amount > balance ? 0.4 : 1,
                        transition: 'all .2s ease',
                    }}
                >
                    ▼ PUT
                </button>
            </div>
            
            {/* Demo badge container */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                <span
                    style={{
                        background: '#0f1a2e',
                        border: '1px solid #1e3a5f',
                        borderRadius: 6,
                        padding: '4px 12px',
                        fontSize: 10,
                        color: '#00E676',
                        letterSpacing: 1,
                        fontWeight: 600,
                    }}
                >
                    ● DEMO MODE
                </span>
            </div>
        </div>
    );
}
