'use client';

import { useRef, useEffect, useCallback } from 'react';
import { Candle, Asset, Trade } from '@/lib/trading/types';

interface SmoothChartProps {
    candles: Candle[];
    currentPrice: number;
    trades: Trade[];
    asset: Asset;
}

export default function CandlestickChart({
    candles,
    currentPrice,
    trades,
    asset,
}: SmoothChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animFrameRef = useRef<number>(0);
    const priceHistoryRef = useRef<Map<string, { price: number; time: number }[]>>(new Map());
    const lastPriceRef = useRef(0);
    const lastAssetRef = useRef('');

    // Clear tick history when asset changes
    useEffect(() => {
        if (lastAssetRef.current !== asset.id) {
            lastAssetRef.current = asset.id;
            lastPriceRef.current = 0;
        }
    }, [asset.id]);

    // Accumulate tick prices into a per-asset price history
    useEffect(() => {
        if (currentPrice > 0 && currentPrice !== lastPriceRef.current) {
            lastPriceRef.current = currentPrice;
            if (!priceHistoryRef.current.has(asset.id)) {
                priceHistoryRef.current.set(asset.id, []);
            }
            const history = priceHistoryRef.current.get(asset.id)!;
            history.push({ price: currentPrice, time: Date.now() });
            // Keep last 600 ticks
            if (history.length > 600) {
                priceHistoryRef.current.set(asset.id, history.slice(-600));
            }
        }
    }, [currentPrice, asset.id]);

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

        const PADDING = { top: 20, right: 70, bottom: 20, left: 10 };
        const chartW = W - PADDING.left - PADDING.right;
        const chartH = H - PADDING.top - PADDING.bottom;

        // Background
        ctx.fillStyle = '#0a0e17';
        ctx.fillRect(0, 0, W, H);

        // Build price points from historical candles + live ticks
        const pricePoints: { price: number; time: number }[] = [];

        // Add candle close prices as historical points
        if (candles.length > 0) {
            candles.forEach(c => {
                pricePoints.push({ price: c.close, time: c.time });
            });
        }

        // Add live tick prices for this asset
        const assetHistory = priceHistoryRef.current.get(asset.id) || [];
        assetHistory.forEach(p => {
            pricePoints.push(p);
        });

        if (pricePoints.length < 2) {
            // Loading state
            ctx.fillStyle = '#4a5568';
            ctx.font = "14px 'JetBrains Mono', monospace";
            ctx.textAlign = 'center';
            ctx.fillText('Connecting to live feed...', W / 2, H / 2 - 10);
            const dotAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 300);
            ctx.fillStyle = `rgba(59, 130, 246, ${dotAlpha})`;
            ctx.beginPath();
            ctx.arc(W / 2, H / 2 + 15, 4, 0, Math.PI * 2);
            ctx.fill();
            animFrameRef.current = requestAnimationFrame(draw);
            return;
        }

        // Use last N points for display
        const maxPoints = Math.min(pricePoints.length, 200);
        const visible = pricePoints.slice(-maxPoints);

        const prices = visible.map(p => p.price);
        const minP = Math.min(...prices) * 0.99995;
        const maxP = Math.max(...prices) * 1.00005;
        const range = maxP - minP || 1;

        const toX = (i: number) => PADDING.left + (i / (visible.length - 1)) * chartW;
        const toY = (p: number) => PADDING.top + (1 - (p - minP) / range) * chartH;

        // Grid lines
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
            ctx.fillText(
                price < 10 ? price.toFixed(4) : price.toFixed(2),
                W - PADDING.right + 6,
                y + 3
            );
        }

        // Determine trend color (comparing last price to first visible price)
        const isUp = visible[visible.length - 1].price >= visible[0].price;
        const lineColor = isUp ? '#00E676' : '#FF1744';
        const gradientTop = isUp ? 'rgba(0, 230, 118, 0.25)' : 'rgba(255, 23, 68, 0.25)';
        const gradientBot = isUp ? 'rgba(0, 230, 118, 0.0)' : 'rgba(255, 23, 68, 0.0)';

        // Draw smooth bezier area fill
        const gradient = ctx.createLinearGradient(0, PADDING.top, 0, PADDING.top + chartH);
        gradient.addColorStop(0, gradientTop);
        gradient.addColorStop(1, gradientBot);

        ctx.beginPath();
        ctx.moveTo(toX(0), toY(visible[0].price));

        // Smooth bezier curve through points
        for (let i = 1; i < visible.length; i++) {
            const prev = { x: toX(i - 1), y: toY(visible[i - 1].price) };
            const curr = { x: toX(i), y: toY(visible[i].price) };
            const cpx = (prev.x + curr.x) / 2;
            ctx.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
        }

        // Complete area path
        const areaPath = new Path2D();
        areaPath.moveTo(toX(0), toY(visible[0].price));
        for (let i = 1; i < visible.length; i++) {
            const prev = { x: toX(i - 1), y: toY(visible[i - 1].price) };
            const curr = { x: toX(i), y: toY(visible[i].price) };
            const cpx = (prev.x + curr.x) / 2;
            areaPath.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
        }
        areaPath.lineTo(toX(visible.length - 1), PADDING.top + chartH);
        areaPath.lineTo(toX(0), PADDING.top + chartH);
        areaPath.closePath();

        ctx.fillStyle = gradient;
        ctx.fill(areaPath);

        // Draw the line itself
        ctx.beginPath();
        ctx.moveTo(toX(0), toY(visible[0].price));
        for (let i = 1; i < visible.length; i++) {
            const prev = { x: toX(i - 1), y: toY(visible[i - 1].price) };
            const curr = { x: toX(i), y: toY(visible[i].price) };
            const cpx = (prev.x + curr.x) / 2;
            ctx.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
        }
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Current price horizontal dashed line
        const curY = toY(currentPrice);
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PADDING.left, curY);
        ctx.lineTo(W - PADDING.right, curY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Current price badge
        ctx.fillStyle = '#3B82F6';
        const badgeW = 68;
        const badgeH = 20;
        const badgeR = 4;
        const bx = W - PADDING.right;
        const by = curY - badgeH / 2;
        ctx.beginPath();
        ctx.roundRect(bx, by, badgeW, badgeH, badgeR);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.textAlign = 'center';
        ctx.fillText(
            currentPrice < 10 ? currentPrice.toFixed(asset.decimals) : currentPrice.toFixed(2),
            bx + badgeW / 2,
            curY + 4
        );

        // Pulsing dot at the end of the line
        const lastX = toX(visible.length - 1);
        const lastY = toY(visible[visible.length - 1].price);
        const pulseScale = 1 + 0.3 * Math.sin(Date.now() / 200);
        const pulseAlpha = 0.3 + 0.2 * Math.sin(Date.now() / 200);

        // Outer glow
        ctx.beginPath();
        ctx.arc(lastX, lastY, 8 * pulseScale, 0, Math.PI * 2);
        ctx.fillStyle = isUp
            ? `rgba(0, 230, 118, ${pulseAlpha})`
            : `rgba(255, 23, 68, ${pulseAlpha})`;
        ctx.fill();

        // Inner dot
        ctx.beginPath();
        ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = lineColor;
        ctx.fill();
        ctx.strokeStyle = '#0a0e17';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Active trade markers
        trades
            .filter((t) => t.status === 'active' && t.asset === asset.id)
            .forEach((trade) => {
                const tradeY = toY(trade.entryPrice);
                const tradeColor = trade.direction === 'up' ? '#00E676' : '#FF1744';

                ctx.setLineDash([3, 3]);
                ctx.strokeStyle = tradeColor;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(PADDING.left, tradeY);
                ctx.lineTo(W - PADDING.right, tradeY);
                ctx.stroke();
                ctx.setLineDash([]);

                // Entry label
                const label = `${trade.direction === 'up' ? '▲ CALL' : '▼ PUT'} $${trade.amount}`;
                ctx.fillStyle =
                    trade.direction === 'up'
                        ? 'rgba(0,230,118,0.12)'
                        : 'rgba(255,23,68,0.12)';
                ctx.beginPath();
                ctx.roundRect(PADDING.left, tradeY - 10, 90, 20, 4);
                ctx.fill();
                ctx.fillStyle = tradeColor;
                ctx.font = "bold 9px 'JetBrains Mono', monospace";
                ctx.textAlign = 'left';
                ctx.fillText(label, PADDING.left + 6, tradeY + 3);
            });

        // Continue animation loop
        animFrameRef.current = requestAnimationFrame(draw);
    }, [candles, currentPrice, trades, asset]);

    // Start/stop animation loop
    useEffect(() => {
        animFrameRef.current = requestAnimationFrame(draw);
        return () => {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
        };
    }, [draw]);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
            <canvas ref={canvasRef} />
        </div>
    );
}
