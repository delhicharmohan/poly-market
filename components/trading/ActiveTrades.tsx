'use client';

import { Trade } from '@/lib/trading/types';

interface ActiveTradesProps {
    trades: Trade[];
}

export default function ActiveTrades({ trades }: ActiveTradesProps) {
    const activeTrades = trades.filter((t) => t.status === 'active');

    if (activeTrades.length === 0) return null;

    return (
        <div
            style={{
                display: 'flex',
                gap: 8,
                padding: '6px 16px',
                background: 'rgba(12, 17, 32, 0.9)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderTop: '1px solid rgba(26, 35, 64, 0.6)',
                overflowX: 'auto',
                flexShrink: 0,
            }}
        >
            {activeTrades.map((t) => (
                <div
                    key={t.id}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '6px 12px',
                        borderRadius: 8,
                        fontSize: 11,
                        background:
                            t.direction === 'up'
                                ? 'rgba(0,230,118,0.08)'
                                : 'rgba(255,23,68,0.08)',
                        border: `1px solid ${t.direction === 'up'
                                ? 'rgba(0,230,118,0.2)'
                                : 'rgba(255,23,68,0.2)'
                            }`,
                        whiteSpace: 'nowrap',
                    }}
                >
                    <span
                        style={{
                            color: t.direction === 'up' ? '#00E676' : '#FF1744',
                            fontWeight: 700,
                        }}
                    >
                        {t.direction === 'up' ? '▲' : '▼'} {t.asset}
                    </span>
                    <span style={{ color: '#94a3b8' }}>${t.amount}</span>
                    <span
                        style={{
                            color: '#facc15',
                            fontWeight: 700,
                            fontVariantNumeric: 'tabular-nums',
                            minWidth: 28,
                            textAlign: 'right',
                        }}
                    >
                        {t.remaining || 0}s
                    </span>
                </div>
            ))}
        </div>
    );
}
