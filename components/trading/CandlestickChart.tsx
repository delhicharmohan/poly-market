'use client';

import { useRef, useEffect, useCallback, useState, type ReactNode } from 'react';
import { Candle, Asset, Trade } from '@/lib/trading/types';

type ChartMode = 'candles' | 'line';

const INTERVALS: { label: string; ms: number }[] = [
    { label: '1s', ms: 1000 },
    { label: '5s', ms: 5000 },
    { label: '15s', ms: 15000 },
    { label: '1m', ms: 60000 },
];

const WINDOWS: { label: string; ms: number }[] = [
    { label: '1m', ms: 60000 },
    { label: '5m', ms: 300000 },
    { label: '15m', ms: 900000 },
    { label: 'All', ms: Infinity },
];

/** Aggregate 1s base candles into larger interval candles (OHLC per bucket). */
function aggregateCandles(candles: Candle[], intervalMs: number): Candle[] {
    if (intervalMs <= 1000) return candles;
    const buckets = new Map<number, Candle>();
    const order: number[] = [];
    for (const c of candles) {
        const key = Math.floor(c.time / intervalMs) * intervalMs;
        const b = buckets.get(key);
        if (!b) {
            buckets.set(key, { open: c.open, high: c.high, low: c.low, close: c.close, time: key });
            order.push(key);
        } else {
            b.high = Math.max(b.high, c.high);
            b.low = Math.min(b.low, c.low);
            b.close = c.close;
        }
    }
    return order.map((k) => buckets.get(k)!);
}

/** Merge two candle series by bucket time; entries in `b` win on collision. */
function mergeByTime(a: Candle[], b: Candle[]): Candle[] {
    const map = new Map<number, Candle>();
    for (const c of a) map.set(c.time, c);
    for (const c of b) map.set(c.time, c);
    return [...map.keys()].sort((x, y) => x - y).map((k) => map.get(k)!);
}

interface SmoothChartProps {
    candles: Candle[];
    /** Persisted 1-minute candles from the DB (long history for 1m+ intervals). */
    candles1m?: Candle[];
    ticks: { price: number; time: number }[];
    currentPrice: number;
    trades: Trade[];
    asset: Asset;
}

export default function CandlestickChart({
    candles,
    candles1m = [],
    ticks,
    currentPrice,
    trades,
    asset,
}: SmoothChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const priceHistoryRef = useRef<Map<string, { price: number; time: number }[]>>(new Map());
    const lastPriceRef = useRef(0);
    const lastAssetRef = useRef('');

    const [mode, setMode] = useState<ChartMode>('candles');
    const [intervalMs, setIntervalMs] = useState(1000);
    const [windowMs, setWindowMs] = useState(300000); // 5m default

    // Clear tick history when asset changes or initialize from ticks prop
    useEffect(() => {
        if (lastAssetRef.current !== asset.id) {
            lastAssetRef.current = asset.id;
            lastPriceRef.current = 0;

            // Initialize history with buffered ticks from server
            if (ticks && ticks.length > 0) {
                priceHistoryRef.current.set(asset.id, [...ticks]);
            } else {
                priceHistoryRef.current.set(asset.id, []);
            }
        }
    }, [asset.id, ticks]);

    // Accumulate tick prices into a per-asset price history.
    // Skip the asset's seed price: before the first real tick lands, the consumer
    // falls back to asset.seedPrice, which would otherwise be recorded as a fake
    // data point and render as a spike in the middle of the chart.
    useEffect(() => {
        if (currentPrice > 0 && currentPrice !== asset.seedPrice && currentPrice !== lastPriceRef.current) {
            lastPriceRef.current = currentPrice;
            if (!priceHistoryRef.current.has(asset.id)) {
                priceHistoryRef.current.set(asset.id, []);
            }
            const history = priceHistoryRef.current.get(asset.id)!;
            history.push({ price: currentPrice, time: Date.now() });
            // Keep enough ticks to cover the largest line-mode window (~20 min at 1/s)
            if (history.length > 1200) {
                priceHistoryRef.current.set(asset.id, history.slice(-1200));
            }
        }
    }, [currentPrice, asset.id]);

    const fmt = useCallback(
        (p: number) => (p < 10 ? p.toFixed(asset.decimals) : p.toFixed(2)),
        [asset.decimals]
    );

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const rect = container.getBoundingClientRect();
        const W = rect.width;
        const H = rect.height;
        if (W === 0 || H === 0) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.scale(dpr, dpr);

        const PADDING = { top: 20, right: 70, bottom: 24, left: 10 };
        const chartW = W - PADDING.left - PADDING.right;
        const chartH = H - PADDING.top - PADDING.bottom;

        // Background
        ctx.fillStyle = '#0a0e17';
        ctx.fillRect(0, 0, W, H);

        const showLoading = () => {
            ctx.fillStyle = '#4a5568';
            ctx.font = "14px 'JetBrains Mono', monospace";
            ctx.textAlign = 'center';
            ctx.fillText('Connecting to live feed...', W / 2, H / 2 - 10);
            const dotAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 300);
            ctx.fillStyle = `rgba(59, 130, 246, ${dotAlpha})`;
            ctx.beginPath();
            ctx.arc(W / 2, H / 2 + 15, 4, 0, Math.PI * 2);
            ctx.fill();
        };

        // Live line points = candle closes + accumulated ticks.
        const pricePoints: { price: number; time: number }[] = [];
        candles.forEach((c) => pricePoints.push({ price: c.close, time: c.time }));
        (priceHistoryRef.current.get(asset.id) || []).forEach((p) => pricePoints.push(p));

        // ── Resolve the visible series + price range per mode ──
        let count = 0;
        let rawMin = 0;
        let rawMax = 0;
        let timeAt: (i: number) => number = () => Date.now();
        let visibleLine: { price: number; time: number }[] = [];
        let visibleCandles: Candle[] = [];

        const cutoff = windowMs === Infinity ? -Infinity : Date.now() - windowMs;

        if (mode === 'candles') {
            // For 1m+ intervals, build from the persisted DB history merged with
            // the live tail (1s candles aggregated to 1m). Sub-minute intervals
            // use the recent in-memory 1s candles only.
            const base =
                intervalMs >= 60000 && candles1m.length > 0
                    ? mergeByTime(candles1m, aggregateCandles(candles, 60000))
                    : candles;
            const agg = aggregateCandles(base, intervalMs);
            let windowed = agg.filter((c) => c.time >= cutoff);
            // Cap drawn candles for perf/legibility.
            if (windowed.length > 400) windowed = windowed.slice(-400);
            // Live "forming" candle: fold the current price into the last bucket.
            if (windowed.length > 0 && currentPrice > 0 && currentPrice !== asset.seedPrice) {
                const last = { ...windowed[windowed.length - 1] };
                last.close = currentPrice;
                last.high = Math.max(last.high, currentPrice);
                last.low = Math.min(last.low, currentPrice);
                windowed = [...windowed.slice(0, -1), last];
            }
            if (windowed.length < 2) {
                showLoading();
                return;
            }
            visibleCandles = windowed;
            rawMin = Math.min(...visibleCandles.map((c) => c.low));
            rawMax = Math.max(...visibleCandles.map((c) => c.high));
            count = visibleCandles.length;
            timeAt = (i) => visibleCandles[i].time;
        } else {
            let windowed = pricePoints.filter((p) => p.time >= cutoff);
            if (windowed.length > 600) windowed = windowed.slice(-600);
            if (windowed.length < 2) {
                showLoading();
                return;
            }
            visibleLine = windowed;
            rawMin = Math.min(...visibleLine.map((p) => p.price));
            rawMax = Math.max(...visibleLine.map((p) => p.price));
            count = visibleLine.length;
            timeAt = (i) => visibleLine[i].time;
        }

        const rawRange = rawMax - rawMin || 1;
        const minP = rawMin - rawRange * 0.15;
        const maxP = rawMax + rawRange * 0.15;
        const range = maxP - minP || 1;

        const slotW = chartW / count;
        const toX =
            mode === 'candles'
                ? (i: number) => PADDING.left + (i + 0.5) * slotW
                : (i: number) => PADDING.left + (count > 1 ? i / (count - 1) : 0) * chartW;
        const toY = (p: number) => PADDING.top + (1 - (p - minP) / range) * chartH;

        // ── Grid + price axis ──
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 5; i++) {
            const y = PADDING.top + (i / 5) * chartH;
            ctx.beginPath();
            ctx.moveTo(PADDING.left, y);
            ctx.lineTo(W - PADDING.right, y);
            ctx.stroke();

            const price = maxP - (i / 5) * range;
            ctx.fillStyle = '#384152';
            ctx.font = "10px 'JetBrains Mono', monospace";
            ctx.textAlign = 'left';
            ctx.fillText(fmt(price), W - PADDING.right + 6, y + 3);
        }

        // ── Time axis ──
        ctx.fillStyle = '#64748b';
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.textAlign = 'center';
        for (let i = 0; i <= 4; i++) {
            const idx = Math.floor((i / 4) * (count - 1));
            const x = toX(idx);
            ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
            ctx.beginPath();
            ctx.moveTo(x, PADDING.top);
            ctx.lineTo(x, PADDING.top + chartH);
            ctx.stroke();

            const date = new Date(timeAt(idx));
            const timeStr = date.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });
            ctx.fillText(timeStr, x, H - 6);
        }

        const GREEN = '#00E676';
        const RED = '#FF1744';

        if (mode === 'candles') {
            // ── Candlesticks ──
            const bodyW = Math.max(1, Math.min(slotW * 0.6, 14));
            for (let i = 0; i < visibleCandles.length; i++) {
                const c = visibleCandles[i];
                const up = c.close >= c.open;
                const color = up ? GREEN : RED;
                const x = toX(i);

                // Wick
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, toY(c.high));
                ctx.lineTo(x, toY(c.low));
                ctx.stroke();

                // Body
                const yOpen = toY(c.open);
                const yClose = toY(c.close);
                const top = Math.min(yOpen, yClose);
                const h = Math.max(1, Math.abs(yClose - yOpen));
                ctx.fillStyle = color;
                ctx.fillRect(x - bodyW / 2, top, bodyW, h);
            }
        } else {
            // ── Smooth line + area ──
            const isUp = visibleLine[count - 1].price >= visibleLine[0].price;
            const lineColor = isUp ? GREEN : RED;
            const gradient = ctx.createLinearGradient(0, PADDING.top, 0, PADDING.top + chartH);
            gradient.addColorStop(0, isUp ? 'rgba(0, 230, 118, 0.25)' : 'rgba(255, 23, 68, 0.25)');
            gradient.addColorStop(1, isUp ? 'rgba(0, 230, 118, 0.0)' : 'rgba(255, 23, 68, 0.0)');

            const areaPath = new Path2D();
            areaPath.moveTo(toX(0), toY(visibleLine[0].price));
            for (let i = 1; i < count; i++) {
                const prevX = toX(i - 1);
                const currX = toX(i);
                const cpx = (prevX + currX) / 2;
                areaPath.bezierCurveTo(cpx, toY(visibleLine[i - 1].price), cpx, toY(visibleLine[i].price), currX, toY(visibleLine[i].price));
            }
            areaPath.lineTo(toX(count - 1), PADDING.top + chartH);
            areaPath.lineTo(toX(0), PADDING.top + chartH);
            areaPath.closePath();
            ctx.fillStyle = gradient;
            ctx.fill(areaPath);

            ctx.beginPath();
            ctx.moveTo(toX(0), toY(visibleLine[0].price));
            for (let i = 1; i < count; i++) {
                const prevX = toX(i - 1);
                const currX = toX(i);
                const cpx = (prevX + currX) / 2;
                ctx.bezierCurveTo(cpx, toY(visibleLine[i - 1].price), cpx, toY(visibleLine[i].price), currX, toY(visibleLine[i].price));
            }
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Pulsing dot at the leading edge
            const lastX = toX(count - 1);
            const lastY = toY(visibleLine[count - 1].price);
            const pulseScale = 1 + 0.3 * Math.sin(Date.now() / 200);
            const pulseAlpha = 0.3 + 0.2 * Math.sin(Date.now() / 200);
            ctx.beginPath();
            ctx.arc(lastX, lastY, 8 * pulseScale, 0, Math.PI * 2);
            ctx.fillStyle = isUp ? `rgba(0, 230, 118, ${pulseAlpha})` : `rgba(255, 23, 68, ${pulseAlpha})`;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = lineColor;
            ctx.fill();
            ctx.strokeStyle = '#0a0e17';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // ── Current price dashed line + badge (both modes) ──
        const curY = toY(currentPrice);
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PADDING.left, curY);
        ctx.lineTo(W - PADDING.right, curY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#3B82F6';
        const badgeW = 68;
        const badgeH = 20;
        const bx = W - PADDING.right;
        const by = curY - badgeH / 2;
        ctx.beginPath();
        ctx.roundRect(bx, by, badgeW, badgeH, 4);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.textAlign = 'center';
        ctx.fillText(fmt(currentPrice), bx + badgeW / 2, curY + 4);

        // ── Active trade markers (both modes) ──
        trades
            .filter((t) => t.status === 'active' && t.asset === asset.id)
            .forEach((trade) => {
                const tradeY = toY(trade.entryPrice);
                const tradeColor = trade.direction === 'up' ? GREEN : RED;
                ctx.setLineDash([3, 3]);
                ctx.strokeStyle = tradeColor;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(PADDING.left, tradeY);
                ctx.lineTo(W - PADDING.right, tradeY);
                ctx.stroke();
                ctx.setLineDash([]);

                const label = `${trade.direction === 'up' ? '▲ CALL' : '▼ PUT'} $${trade.amount}`;
                ctx.fillStyle = trade.direction === 'up' ? 'rgba(0,230,118,0.12)' : 'rgba(255,23,68,0.12)';
                ctx.beginPath();
                ctx.roundRect(PADDING.left, tradeY - 10, 90, 20, 4);
                ctx.fill();
                ctx.fillStyle = tradeColor;
                ctx.font = "bold 9px 'JetBrains Mono', monospace";
                ctx.textAlign = 'left';
                ctx.fillText(label, PADDING.left + 6, tradeY + 3);
            });
    }, [candles, candles1m, currentPrice, trades, asset, mode, intervalMs, windowMs, fmt]);

    // Keep a ref to the latest draw closure so the single rAF loop below always
    // paints with fresh data without ever re-subscribing the loop.
    const drawRef = useRef(draw);
    useEffect(() => {
        drawRef.current = draw;
    }, [draw]);

    // Exactly one animation loop for the component's lifetime.
    useEffect(() => {
        let raf = 0;
        const loop = () => {
            drawRef.current();
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, []);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
            <canvas ref={canvasRef} />

            {/* Chart controls: mode · interval · window */}
            <div
                style={{
                    position: 'absolute',
                    top: 8,
                    left: 10,
                    right: 10,
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                    zIndex: 5,
                }}
            >
                <ButtonGroup>
                    {(['candles', 'line'] as ChartMode[]).map((m) => (
                        <GroupButton key={m} active={mode === m} onClick={() => setMode(m)}>
                            {m === 'candles' ? '▦ Candles' : '∿ Line'}
                        </GroupButton>
                    ))}
                </ButtonGroup>

                {mode === 'candles' && (
                    <ButtonGroup>
                        {INTERVALS.map((iv) => (
                            <GroupButton key={iv.label} active={intervalMs === iv.ms} onClick={() => setIntervalMs(iv.ms)}>
                                {iv.label}
                            </GroupButton>
                        ))}
                    </ButtonGroup>
                )}

                <ButtonGroup>
                    {WINDOWS.map((w) => (
                        <GroupButton key={w.label} active={windowMs === w.ms} onClick={() => setWindowMs(w.ms)}>
                            {w.label}
                        </GroupButton>
                    ))}
                </ButtonGroup>
            </div>
        </div>
    );
}

function ButtonGroup({ children }: { children: ReactNode }) {
    return (
        <div
            style={{
                display: 'flex',
                gap: 2,
                background: 'rgba(12,17,32,0.85)',
                border: '1px solid #1e293b',
                borderRadius: 7,
                padding: 2,
            }}
        >
            {children}
        </div>
    );
}

function GroupButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '3px 9px',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.3,
                border: 'none',
                borderRadius: 5,
                cursor: 'pointer',
                fontFamily: 'inherit',
                background: active ? '#1e293b' : 'transparent',
                color: active ? '#e2e8f0' : '#64748b',
            }}
        >
            {children}
        </button>
    );
}
