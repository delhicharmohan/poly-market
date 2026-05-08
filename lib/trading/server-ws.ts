// WebSocket Singleton Store for Server-Side Capturers
// This file ensures only one connection exists even during Next.js hot-reloads.

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// FORCE pure-JS implementation to avoid bufferUtil.mask error
process.env.WS_NO_BUFFER_UTIL = 'true';
const WebSocket = require('ws');

interface TickPoint {
    price: number;
    time: number;
}

interface GlobalWithWS {
    _veloraWS?: any;
    _binanceWS?: any;
    _finnhubWS?: any;
    _lastVeloraAttempt?: number;
    _lastBinanceAttempt?: number;
    _lastFinnhubAttempt?: number;
    _tickStore?: Record<string, TickPoint[]>;
    _latestPrices?: Record<string, { price: number; timestamp: number }>;
}

const g = global as unknown as GlobalWithWS;

if (!g._tickStore) g._tickStore = {};
if (!g._latestPrices) g._latestPrices = {};

export { WebSocket };

export function getVeloraWS() { return g._veloraWS; }
export function setVeloraWS(ws: any) { g._veloraWS = ws; }

export function getBinanceWS() { return g._binanceWS; }
export function setBinanceWS(ws: any) { g._binanceWS = ws; }

export function getFinnhubWS() { return g._finnhubWS; }
export function setFinnhubWS(ws: any) { g._finnhubWS = ws; }

export function getLastVeloraAttempt() { return g._lastVeloraAttempt || 0; }
export function setLastVeloraAttempt(t: number) { g._lastVeloraAttempt = t; }

export function getLastBinanceAttempt() { return g._lastBinanceAttempt || 0; }
export function setLastBinanceAttempt(t: number) { g._lastBinanceAttempt = t; }

export function getLastFinnhubAttempt() { return g._lastFinnhubAttempt || 0; }
export function setLastFinnhubAttempt(t: number) { g._lastFinnhubAttempt = t; }

const MAX_TICK_AGE = 5 * 60 * 1000; // 5 minutes

export function pushTick(assetId: string, price: number, time: number = Date.now()) {
    // Update latest cache
    if (!g._latestPrices) g._latestPrices = {};
    if (!g._tickStore) g._tickStore = {};
    
    g._latestPrices[assetId] = { price, timestamp: time };

    if (!g._tickStore[assetId]) g._tickStore[assetId] = [];
    const points = g._tickStore[assetId];
    
    // Deduplicate/throttle: only one point per second for the buffer
    const last = points[points.length - 1];
    if (last && time - last.time < 1000) return;

    points.push({ price, time });
    
    // Evict old points
    const cutoff = time - MAX_TICK_AGE;
    while (points.length > 0 && points[0].time < cutoff) {
        points.shift();
    }
}

export function getTickStore() {
    return g._tickStore || {};
}

export function getLatestPrices() {
    return g._latestPrices || {};
}
