// ─── Synthetic Index Types ───
//
// Server-authoritative, algorithmically generated price feeds (Deriv-style).
// A generator is a pure function of (config, previous state, rng) → next state,
// which makes every index family deterministic and unit-testable.

export type SyntheticType =
    | 'volatility'
    | 'boom'
    | 'crash'
    | 'step'
    | 'jump'
    | 'rangebreak';

export interface SyntheticIndexConfig {
    /** Stable id used as the asset symbol, e.g. 'VOL75'. */
    id: string;
    /** Display label, e.g. 'Volatility 75 Index'. */
    label: string;
    type: SyntheticType;
    enabled: boolean;
    /** Hex color for the chart/selector. */
    color: string;
    /** Decimal places for display. */
    decimals: number;
    /** Starting price when the engine first boots. */
    startPrice: number;
    /** Milliseconds between generated ticks. */
    tickMs: number;

    // ── Generic motion ──
    /** Per-tick relative standard deviation (e.g. 0.01 = 1%). */
    volatility: number;
    /** Per-tick relative drift (e.g. 0.0001). */
    drift: number;

    // ── Boom / Crash ──
    /** Probability per tick of a spike. */
    spikeProbability?: number;
    /** Spike size as a multiple of the normal move. */
    spikeMultiplier?: number;

    // ── Step ──
    /** Absolute price step per tick. */
    stepSize?: number;

    // ── Jump ──
    /** Probability per tick of a jump. */
    jumpProbability?: number;
    /** Jump size as a multiple of the normal move. */
    jumpMultiplier?: number;

    // ── Range Break ──
    /** Half-width of the oscillation range, in price units. */
    rangeWidth?: number;
    /** Number of edge touches before a breakout. */
    breakTouches?: number;
}

/** Mutable per-index runtime state advanced on every tick. */
export interface SyntheticRuntimeState {
    price: number;
    // Range Break bookkeeping
    rangeCenter: number;
    touches: number;
    /** Current oscillation direction (+1 / -1). */
    direction: number;
}

export function initialRuntimeState(cfg: SyntheticIndexConfig): SyntheticRuntimeState {
    return {
        price: cfg.startPrice,
        rangeCenter: cfg.startPrice,
        touches: 0,
        direction: 1,
    };
}
