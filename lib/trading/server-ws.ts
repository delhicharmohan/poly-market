// Server-side tick buffer used by /api/trading/history and the SSE stream.
// The previous per-provider WS singletons live in lib/trading/server/*.

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// FORCE pure-JS implementation to avoid bufferUtil.mask error
process.env.WS_NO_BUFFER_UTIL = 'true';
const WebSocket = require('ws');

interface TickPoint {
    price: number;
    time: number;
}

interface GlobalWithStore {
    _tickStore?: Record<string, TickPoint[]>;
    _latestPrices?: Record<string, { price: number; timestamp: number }>;
}

const g = global as unknown as GlobalWithStore;

if (!g._tickStore) g._tickStore = {};
if (!g._latestPrices) g._latestPrices = {};

export { WebSocket };

const MAX_TICK_AGE = 5 * 60 * 1000; // 5 minutes

export function pushTick(assetId: string, price: number, time: number = Date.now()) {
    if (!g._latestPrices) g._latestPrices = {};
    if (!g._tickStore) g._tickStore = {};

    g._latestPrices[assetId] = { price, timestamp: time };

    if (!g._tickStore[assetId]) g._tickStore[assetId] = [];
    const points = g._tickStore[assetId];

    // One point per second per asset for the buffer.
    const last = points[points.length - 1];
    if (last && time - last.time < 1000) return;

    points.push({ price, time });

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
