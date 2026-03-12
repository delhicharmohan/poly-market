'use client';

import { Trade } from '@/lib/trading/types';

interface TradeHistoryProps {
    history: Trade[];
    isOpen: boolean;
    onToggle: () => void;
}

export default function TradeHistory({ history, isOpen, onToggle }: TradeHistoryProps) {
    const wonCount = history.filter((t) => t.status === 'won').length;
    const lostCount = history.filter((t) => t.status === 'lost').length;
    const winRate =
        history.length > 0
            ? ((wonCount / history.length) * 100).toFixed(0) + '%'
            : '—';

    return (
        <>
            {/* Toggle tab — always visible at the bottom */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 16,
                    padding: '6px 16px',
                    background: 'rgba(12, 17, 32, 0.95)',
                    backdropFilter: 'blur(20px)',
                    borderTop: '1px solid rgba(30, 41, 59, 0.5)',
                    cursor: 'pointer',
                    flexShrink: 0,
                }}
                onClick={onToggle}
            >
                {/* Quick stats inline */}
                <div style={{ display: 'flex', gap: 14, fontSize: 10, alignItems: 'center' }}>
                    {[
                        { label: 'Trades', value: history.length, color: '#94a3b8' },
                        { label: 'Won', value: wonCount, color: '#00E676' },
                        { label: 'Lost', value: lostCount, color: '#FF1744' },
                        { label: 'Win Rate', value: winRate, color: '#3B82F6' },
                    ].map((s) => (
                        <span key={s.label} style={{ color: '#475569' }}>
                            {s.label}{' '}
                            <span style={{ color: s.color, fontWeight: 700 }}>
                                {s.value}
                            </span>
                        </span>
                    ))}
                </div>

                <span
                    style={{
                        fontSize: 9,
                        color: '#64748b',
                        letterSpacing: 1,
                        fontWeight: 600,
                    }}
                >
                    {isOpen ? '▼ HIDE' : '▲ HISTORY'}
                </span>
            </div>

            {/* Slide-up drawer */}
            <div
                style={{
                    maxHeight: isOpen ? 240 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.3s ease',
                    background: 'rgba(10, 14, 23, 0.98)',
                    borderTop: isOpen ? '1px solid #1a2340' : 'none',
                }}
            >
                <div
                    style={{
                        padding: '10px 16px',
                        overflowY: 'auto',
                        maxHeight: 230,
                    }}
                >
                    {history.length === 0 ? (
                        <div
                            style={{
                                textAlign: 'center',
                                color: '#475569',
                                fontSize: 11,
                                padding: 20,
                            }}
                        >
                            No trades yet — place your first trade!
                        </div>
                    ) : (
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                gap: 6,
                            }}
                        >
                            {history.map((t) => (
                                <div
                                    key={t.id}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '7px 10px',
                                        borderRadius: 6,
                                        fontSize: 10,
                                        background:
                                            t.status === 'won'
                                                ? 'rgba(0,230,118,0.06)'
                                                : 'rgba(255,23,68,0.06)',
                                        border: `1px solid ${
                                            t.status === 'won'
                                                ? 'rgba(0,230,118,0.12)'
                                                : 'rgba(255,23,68,0.12)'
                                        }`,
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 600 }}>
                                            {t.direction === 'up' ? '▲' : '▼'} {t.asset}
                                        </div>
                                        <div style={{ color: '#475569', fontSize: 9 }}>
                                            ${t.amount}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            fontWeight: 700,
                                            color:
                                                t.status === 'won'
                                                    ? '#00E676'
                                                    : '#FF1744',
                                        }}
                                    >
                                        {t.status === 'won' ? '+' : ''}
                                        {t.profit?.toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
