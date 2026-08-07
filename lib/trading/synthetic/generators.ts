// ─── Synthetic Index Generators ───
//
// Each generator is a PURE function: (config, previous state, rng) → next state.
// `rng` returns a float in [0, 1). Injecting it keeps generators deterministic
// and unit-testable (pass a seeded rng in tests; pass Math.random in the engine).

import { SyntheticIndexConfig, SyntheticRuntimeState } from './types';

export type RNG = () => number;

/** Standard-normal sample via Box-Muller. */
export function gaussian(rng: RNG): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Mulberry32 — small, fast, seedable PRNG for deterministic tests. */
export function seededRng(seed: number): RNG {
    let a = seed >>> 0;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const MIN_PRICE = 1e-6;

function clampPrice(p: number): number {
    return p > MIN_PRICE ? p : MIN_PRICE;
}

/** Geometric random walk with constant volatility (Volatility indices). */
function volatility(
    cfg: SyntheticIndexConfig,
    s: SyntheticRuntimeState,
    rng: RNG
): SyntheticRuntimeState {
    const z = gaussian(rng);
    const price = clampPrice(s.price * (1 + cfg.drift + cfg.volatility * z));
    return { ...s, price };
}

/**
 * Boom / Crash: frequent small moves drifting gently against the spike
 * direction, punctuated by rare large spikes in the spike direction.
 *   dir = +1 → Boom (spikes up),  dir = -1 → Crash (spikes down).
 *
 * Moves are ADDITIVE (in price points) so the index stays bounded — a
 * multiplicative counter-drift compounds the price to zero/infinity. The
 * counter-drift is sized to exactly offset the spikes in expectation
 * (E[move] = 0), so there is no long-term trend, matching real synthetics.
 */
function boomCrash(
    cfg: SyntheticIndexConfig,
    s: SyntheticRuntimeState,
    rng: RNG,
    dir: number
): SyntheticRuntimeState {
    const spikeP = cfg.spikeProbability ?? 0.001;
    const spikeMult = cfg.spikeMultiplier ?? 50;
    const base = cfg.volatility * s.price; // typical tick size in price points

    let move: number;
    if (rng() < spikeP) {
        // Large spike in the index's direction.
        move = dir * spikeMult * base;
    } else {
        // Counter-drift balanced against the spikes, plus small noise.
        const counter = ((spikeP * spikeMult) / (1 - spikeP)) * base;
        move = -dir * counter + base * 0.25 * gaussian(rng);
    }
    return { ...s, price: clampPrice(s.price + move) };
}

/** Step index: fixed-size up/down moves. */
function step(
    cfg: SyntheticIndexConfig,
    s: SyntheticRuntimeState,
    rng: RNG
): SyntheticRuntimeState {
    const size = cfg.stepSize ?? cfg.startPrice * cfg.volatility;
    const price = clampPrice(s.price + (rng() < 0.5 ? -size : size));
    return { ...s, price };
}

/** Jump index: geometric walk with occasional amplified moves. */
function jump(
    cfg: SyntheticIndexConfig,
    s: SyntheticRuntimeState,
    rng: RNG
): SyntheticRuntimeState {
    const jumpP = cfg.jumpProbability ?? 0.01;
    const jumpMult = cfg.jumpMultiplier ?? 15;
    const z = gaussian(rng);
    const mult = rng() < jumpP ? jumpMult : 1;
    const price = clampPrice(s.price * (1 + cfg.drift + cfg.volatility * mult * z));
    return { ...s, price };
}

/**
 * Range Break: oscillates within +/- rangeWidth of a center, reflecting at the
 * edges. After `breakTouches` edge touches it breaks out and re-centers.
 */
function rangeBreak(
    cfg: SyntheticIndexConfig,
    s: SyntheticRuntimeState,
    rng: RNG
): SyntheticRuntimeState {
    const width = cfg.rangeWidth ?? cfg.startPrice * 0.02;
    const maxTouches = cfg.breakTouches ?? 3;
    const z = Math.abs(gaussian(rng));

    let { price, rangeCenter, touches, direction } = s;
    price = price + direction * cfg.volatility * cfg.startPrice * (0.4 + 0.3 * z);

    const upper = rangeCenter + width;
    const lower = rangeCenter - width;

    if (price >= upper) {
        price = upper;
        touches += 1;
        direction = -1;
    } else if (price <= lower) {
        price = lower;
        touches += 1;
        direction = 1;
    }

    if (touches >= maxTouches) {
        // Breakout: pick a side, shove price out, and re-center there.
        const breakDir = rng() < 0.5 ? -1 : 1;
        price = clampPrice(rangeCenter + breakDir * width * 2);
        rangeCenter = price;
        touches = 0;
        direction = breakDir;
    }

    return { price: clampPrice(price), rangeCenter, touches, direction };
}

/** Advance one tick for any index family. */
export function nextState(
    cfg: SyntheticIndexConfig,
    s: SyntheticRuntimeState,
    rng: RNG
): SyntheticRuntimeState {
    switch (cfg.type) {
        case 'volatility':
            return volatility(cfg, s, rng);
        case 'boom':
            return boomCrash(cfg, s, rng, +1);
        case 'crash':
            return boomCrash(cfg, s, rng, -1);
        case 'step':
            return step(cfg, s, rng);
        case 'jump':
            return jump(cfg, s, rng);
        case 'rangebreak':
            return rangeBreak(cfg, s, rng);
        default:
            return volatility(cfg, s, rng);
    }
}
