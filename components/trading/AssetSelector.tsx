'use client';

import { Asset, ConnectionStatus } from '@/lib/trading/types';

interface AssetSelectorProps {
    assets: Asset[];
    selectedAsset: Asset;
    onSelectAsset: (asset: Asset) => void;
    currentPrice: number;
    priceChange: number;
    connectionStatus: ConnectionStatus;
}

export default function AssetSelector({
    assets,
    selectedAsset,
    onSelectAsset,
    currentPrice,
    priceChange,
    connectionStatus,
}: AssetSelectorProps) {
    const priceUp = priceChange >= 0;

    const statusColor =
        connectionStatus === 'connected'
            ? '#00E676'
            : connectionStatus === 'simulated'
            ? '#facc15'
            : '#64748b';

    const statusLabel =
        connectionStatus === 'connected'
            ? '● LIVE'
            : connectionStatus === 'simulated'
            ? '● SIM'
            : connectionStatus === 'connecting'
            ? '○ …'
            : '○ OFF';

    const priceStr =
        currentPrice < 10
            ? currentPrice.toFixed(selectedAsset.decimals)
            : currentPrice.toFixed(2);

    const changeStr =
        Math.abs(priceChange) < 0.01
            ? priceChange.toFixed(5)
            : priceChange.toFixed(2);

    return (
        <div
            style={{
                background: '#0c1120',
                borderBottom: '1px solid #1a2340',
                flexShrink: 0,
                userSelect: 'none',
            }}
        >
            {/* ── Row 1: brand + live price + status ── */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px 6px',
                    gap: 12,
                }}
            >
                {/* Brand */}
                <div
                    style={{
                        fontSize: 15,
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #00E676, #00B0FF)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: -0.5,
                        flexShrink: 0,
                        lineHeight: 1,
                    }}
                >
                    TRADEFLOW
                </div>

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Live price + change */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 6,
                        flexShrink: 0,
                    }}
                >
                    <span
                        style={{
                            fontSize: 17,
                            fontWeight: 700,
                            color: priceUp ? '#00E676' : '#FF1744',
                            letterSpacing: -0.5,
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        {priceStr}
                    </span>
                    <span
                        style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: priceUp ? '#00E676' : '#FF1744',
                        }}
                    >
                        {priceUp ? '▲' : '▼'} {changeStr}
                    </span>
                </div>

                {/* Status badge */}
                <div
                    style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: statusColor,
                        letterSpacing: 0.5,
                        flexShrink: 0,
                        background: `${statusColor}18`,
                        border: `1px solid ${statusColor}33`,
                        borderRadius: 6,
                        padding: '3px 7px',
                        lineHeight: 1.4,
                    }}
                >
                    {statusLabel}
                </div>
            </div>

            {/* ── Row 2: scrollable asset tabs ── */}
            <div
                style={{
                    display: 'flex',
                    gap: 4,
                    padding: '0 12px 10px',
                    overflowX: 'auto',
                    msOverflowStyle: 'none',
                    scrollbarWidth: 'none',
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                {assets.map((a) => {
                    const isActive = selectedAsset.id === a.id;
                    return (
                        <button
                            key={a.id}
                            onClick={() => onSelectAsset(a)}
                            style={{
                                padding: '5px 12px',
                                fontSize: 11,
                                fontWeight: 600,
                                border: isActive
                                    ? `1px solid ${a.color}66`
                                    : '1px solid transparent',
                                borderRadius: 7,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                transition: 'all .18s cubic-bezier(0.4,0,0.2,1)',
                                background: isActive
                                    ? `linear-gradient(135deg, ${a.color}22, ${a.color}44)`
                                    : 'rgba(255,255,255,0.04)',
                                color: isActive ? a.color : '#64748b',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                boxShadow: isActive
                                    ? `0 0 0 1px ${a.color}22`
                                    : 'none',
                                letterSpacing: 0.2,
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background =
                                        'rgba(255,255,255,0.08)';
                                    e.currentTarget.style.color = '#94a3b8';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background =
                                        'rgba(255,255,255,0.04)';
                                    e.currentTarget.style.color = '#64748b';
                                }
                            }}
                        >
                            {a.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
