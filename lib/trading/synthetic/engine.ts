// ─── Synthetic Index Engine ───
//
// Server-authoritative generator loop. Runs 24/7 inside the Node server process,
// advancing every enabled index at its configured cadence and publishing ticks
// onto the same marketBus + tick store that the real bridges use. The client is
// agnostic: synthetic ticks look identical to binance/finnhub/velora ticks.

import { Candle } from '../types';
import { CandleBuilder } from '../candle-builder';
import { pushTick } from '../server-ws';
import { emitTick, emitStatus } from '../server/bus';
import {
    getEnabledSyntheticConfigs,
    getSyntheticConfig,
} from './config';
import {
    SyntheticIndexConfig,
    SyntheticRuntimeState,
    initialRuntimeState,
} from './types';
import { nextState, RNG } from './generators';
import { ensureSchema, persistCandle, loadLatestClose, pruneOld } from './store';

const LOOP_MS = 250; // master scheduler granularity
const SEED_TICKS = 600; // ~10 minutes of 1s history per index (covers larger chart windows)
const MAX_CANDLES = 1200; // ~20 minutes of 1s candles retained
const MINUTE_MS = 60000;
const PRUNE_MS = 60 * 60 * 1000; // prune old DB candles hourly

interface MinuteAgg {
    bucket: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

interface EngineState {
    states: Record<string, SyntheticRuntimeState>;
    builders: Record<string, CandleBuilder>;
    candles: Record<string, Candle[]>;
    nextTickAt: Record<string, number>;
    seeded: Record<string, boolean>;
    minuteAgg: Record<string, MinuteAgg | undefined>;
    interval: ReturnType<typeof setInterval> | null;
    pruneTimer: ReturnType<typeof setInterval> | null;
    started: boolean;
}

interface GlobalWithEngine {
    _synEngine?: EngineState;
}

const g = global as unknown as GlobalWithEngine;

function engine(): EngineState {
    if (!g._synEngine) {
        g._synEngine = {
            states: {},
            builders: {},
            candles: {},
            nextTickAt: {},
            seeded: {},
            minuteAgg: {},
            interval: null,
            pruneTimer: null,
            started: false,
        };
    }
    return g._synEngine;
}

const rng: RNG = Math.random;

function pushCandle(e: EngineState, id: string, candle: Candle) {
    if (!e.candles[id]) e.candles[id] = [];
    e.candles[id].push(candle);
    if (e.candles[id].length > MAX_CANDLES) {
        e.candles[id] = e.candles[id].slice(-MAX_CANDLES);
    }
}

/**
 * Generate backdated history so the chart isn't empty on first load.
 * `startPrice` (from the DB, when resuming) makes the fresh 1s seed walk from
 * the last persisted close so live ticks continue without a visible seam.
 */
function seedIndex(e: EngineState, cfg: SyntheticIndexConfig, startPrice?: number) {
    if (e.seeded[cfg.id]) return;

    let state = initialRuntimeState(cfg);
    if (startPrice && startPrice > 0) {
        state.price = startPrice;
        state.rangeCenter = startPrice;
    }
    const builder = new CandleBuilder(1000);
    const candles: Candle[] = [];
    const now = Date.now();

    for (let i = SEED_TICKS; i > 0; i--) {
        const t = now - i * 1000;
        state = nextState(cfg, state, rng);
        pushTick(cfg.id, state.price, t);
        const completed = builder.processTick({ symbol: cfg.id, price: state.price, timestamp: t });
        if (completed) candles.push(completed);
    }

    e.states[cfg.id] = state;
    e.builders[cfg.id] = builder;
    e.candles[cfg.id] = candles.slice(-MAX_CANDLES);
    e.nextTickAt[cfg.id] = now;
    e.seeded[cfg.id] = true;
}

function tick() {
    const e = engine();
    const now = Date.now();

    for (const cfg of getEnabledSyntheticConfigs()) {
        // Lazily seed indices added at runtime via the admin panel.
        if (!e.seeded[cfg.id]) seedIndex(e, cfg);

        if (now < (e.nextTickAt[cfg.id] ?? 0)) continue;

        const prev = e.states[cfg.id] ?? initialRuntimeState(cfg);
        const state = nextState(cfg, prev, rng);
        e.states[cfg.id] = state;

        pushTick(cfg.id, state.price, now);
        emitTick({ symbol: cfg.id, price: state.price, timestamp: now });

        const builder = e.builders[cfg.id] ?? (e.builders[cfg.id] = new CandleBuilder(1000));
        const completed = builder.processTick({ symbol: cfg.id, price: state.price, timestamp: now });
        if (completed) pushCandle(e, cfg.id, completed);

        // Minute-bucket aggregation for DB persistence. When the bucket rolls
        // over, the just-completed minute candle is written to Postgres.
        const bucket = Math.floor(now / MINUTE_MS) * MINUTE_MS;
        const m = e.minuteAgg[cfg.id];
        if (!m || m.bucket !== bucket) {
            if (m) {
                void persistCandle(cfg.id, { time: m.bucket, open: m.open, high: m.high, low: m.low, close: m.close });
            }
            e.minuteAgg[cfg.id] = { bucket, open: state.price, high: state.price, low: state.price, close: state.price };
        } else {
            m.high = Math.max(m.high, state.price);
            m.low = Math.min(m.low, state.price);
            m.close = state.price;
        }

        e.nextTickAt[cfg.id] = now + cfg.tickMs;
    }
}

/** Resume price from DB, seed, and start the loop. Best-effort on DB errors. */
async function initEngine(e: EngineState): Promise<void> {
    await ensureSchema();

    for (const cfg of getEnabledSyntheticConfigs()) {
        // Seed the cosmetic recent 1s history (fresh), then snap the live price
        // to the last persisted close so ticks continue from real history. (The
        // seed is a random walk, so it can't itself "end" exactly on resume.)
        if (!e.seeded[cfg.id]) seedIndex(e, cfg);
        const last = await loadLatestClose(cfg.id);
        if (last && e.states[cfg.id]) {
            e.states[cfg.id].price = last.close;
            e.states[cfg.id].rangeCenter = last.close;
        }
    }

    emitStatus({ bridge: 'synthetic', status: 'connected' });
    if (!e.interval) e.interval = setInterval(tick, LOOP_MS);
    if (!e.pruneTimer) {
        e.pruneTimer = setInterval(() => void pruneOld(), PRUNE_MS);
    }
    console.log('[Synthetic Engine] ✓ Running', getEnabledSyntheticConfigs().length, 'indices (DB-backed)');
}

/** Idempotent boot — safe to call on every route hit. */
export function ensureSyntheticRunning(): void {
    if (typeof window !== 'undefined') return;
    const e = engine();
    if (e.started) return;
    e.started = true;
    void initEngine(e).catch((err) => {
        console.error('[Synthetic Engine] init failed:', (err as Error).message);
    });
}

/** Candles + recent ticks for the history route. */
export function getSyntheticHistory(id: string): { candles: Candle[]; ticks: { price: number; time: number }[] } | null {
    if (!getSyntheticConfig(id)) return null;
    const e = engine();
    // Ensure the index is seeded even if the loop hasn't booted yet.
    if (!e.seeded[id]) {
        const cfg = getSyntheticConfig(id);
        if (cfg) seedIndex(e, cfg);
    }
    return { candles: e.candles[id] ?? [], ticks: [] };
}

export function isSyntheticId(id: string): boolean {
    return !!getSyntheticConfig(id);
}
