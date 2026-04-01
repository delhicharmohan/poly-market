// WebSocket Singleton Store for Server-Side Capturers
// This file ensures only one connection exists even during Next.js hot-reloads.

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// FORCE pure-JS implementation to avoid bufferUtil.mask error
process.env.WS_NO_BUFFER_UTIL = 'true';
const WebSocket = require('ws');

interface GlobalWithWS {
    _veloraWS?: any;
    _binanceWS?: any;
    _finnhubWS?: any;
    _lastVeloraAttempt?: number;
    _lastBinanceAttempt?: number;
    _lastFinnhubAttempt?: number;
}

const g = global as unknown as GlobalWithWS;

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
