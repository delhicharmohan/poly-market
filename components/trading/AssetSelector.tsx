'use client';

import { Asset, ConnectionStatus, ASSETS } from '@/lib/trading/types';

interface AssetSelectorProps {
    selectedAsset: Asset;
    onSelectAsset: (asset: Asset) => void;
    currentPrice: number;
    priceChange: number;
    connectionStatus: ConnectionStatus;
}

export default function AssetSelector({
    selectedAsset,
    onSelectAsset,
    currentPrice,
    priceChange,
    connectionStatus,
}: AssetSelectorProps) {
    const priceUp = priceChange >= 0;
    const isLive = connectionStatus === 'connected';

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 16px',
                background: '#0c1120',
                borderBottom: '1px solid #1a2340',
                minHeight: 48,
                flexShrink: 0,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* Logo */}
                <div
                    style={{
                        fontSize: 18,
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #00E676, #00B0FF)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: -0.5,
                    }}
                >
                    TRADEFLOW
                </div>

                {/* Asset tabs */}
                <div
                    style={{
                        display: 'flex',
                        gap: 4,
                        background: '#0a0e17',
                        borderRadius: 8,
                        padding: 3,
                    }}
                >
                    {ASSETS.map((a) => (
                        <button
                            key={a.id}
                            onClick={() => onSelectAsset(a)}
                            style={{
                                padding: '5px 10px',
                                fontSize: 10,
                                fontWeight: 600,
                                border:
                                    selectedAsset.id === a.id
                                        ? `1px solid ${a.color}44`
                                        : '1px solid transparent',
                                borderRadius: 6,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                transition: 'all .15s',
                                background:
                                    selectedAsset.id === a.id
                                        ? `linear-gradient(135deg, ${a.color}22, ${a.color}44)`
                                        : 'transparent',
                                color: selectedAsset.id === a.id ? a.color : '#64748b',
                            }}
                        >
                            {a.id}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Connection Status */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        background: isLive ? 'rgba(0,230,118,0.08)' : 'rgba(250,204,21,0.08)',
                        border: `1px solid ${isLive ? 'rgba(0,230,118,0.2)' : 'rgba(250,204,21,0.2)'}`,
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: 9,
                        color: isLive ? '#00E676' : '#facc15',
                        letterSpacing: 1,
                        fontWeight: 600,
                    }}
                >
                    <span
                        style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: isLive ? '#00E676' : '#facc15',
                            animation: 'pulse 2s infinite',
                            display: 'inline-block',
                        }}
                    />
                    {isLive ? 'LIVE' : 'SIM'}
                </div>

                {/* Price display (compact in header for mobile) */}
                <div style={{ textAlign: 'right' }}>
                    <span
                        style={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: priceUp ? '#00E676' : '#FF1744',
                            letterSpacing: -0.5,
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        {currentPrice < 10
                            ? currentPrice.toFixed(selectedAsset.decimals)
                            : currentPrice.toFixed(2)}
                    </span>
                    <span
                        style={{
                            fontSize: 10,
                            color: priceUp ? '#00E676' : '#FF1744',
                            fontWeight: 600,
                            marginLeft: 6,
                        }}
                    >
                        {priceUp ? '▲' : '▼'}{' '}
                        {Math.abs(priceChange) < 0.01
                            ? priceChange.toFixed(5)
                            : priceChange.toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    );
}
