// ─── Synthetic Index Configuration Store ───
//
// Holds the active index definitions. Defaults live in code; the admin panel
// edits them at runtime via this module. State is kept on `global` so it
// survives Next.js route re-evaluation within a single server process.
//
// NOTE: not persisted — runtime edits reset on restart/redeploy. Swap the
// `g._syntheticConfigs` source for a DB read/write to make it durable.

import { SyntheticIndexConfig } from './types';

export const DEFAULT_SYNTHETIC_CONFIGS: SyntheticIndexConfig[] = [
    // ── Volatility indices (constant-vol geometric walk) ──
    { id: 'VOL10', label: 'Volatility 10 Index', type: 'volatility', enabled: true, color: '#22D3EE', decimals: 3, startPrice: 1000, tickMs: 1000, volatility: 0.001, drift: 0 },
    { id: 'VOL25', label: 'Volatility 25 Index', type: 'volatility', enabled: true, color: '#34D399', decimals: 3, startPrice: 2000, tickMs: 1000, volatility: 0.0025, drift: 0 },
    { id: 'VOL50', label: 'Volatility 50 Index', type: 'volatility', enabled: true, color: '#A3E635', decimals: 3, startPrice: 3000, tickMs: 1000, volatility: 0.005, drift: 0 },
    { id: 'VOL75', label: 'Volatility 75 Index', type: 'volatility', enabled: true, color: '#F59E0B', decimals: 3, startPrice: 5000, tickMs: 1000, volatility: 0.0075, drift: 0 },
    { id: 'VOL100', label: 'Volatility 100 Index', type: 'volatility', enabled: true, color: '#EF4444', decimals: 3, startPrice: 8000, tickMs: 1000, volatility: 0.01, drift: 0 },

    // ── Boom / Crash ──
    { id: 'BOOM1000', label: 'Boom 1000 Index', type: 'boom', enabled: true, color: '#10B981', decimals: 4, startPrice: 9000, tickMs: 1000, volatility: 0.0008, drift: 0, spikeProbability: 0.001, spikeMultiplier: 60 },
    { id: 'BOOM500', label: 'Boom 500 Index', type: 'boom', enabled: true, color: '#059669', decimals: 4, startPrice: 9500, tickMs: 1000, volatility: 0.0012, drift: 0, spikeProbability: 0.002, spikeMultiplier: 45 },
    { id: 'CRASH1000', label: 'Crash 1000 Index', type: 'crash', enabled: true, color: '#F43F5E', decimals: 4, startPrice: 6000, tickMs: 1000, volatility: 0.0008, drift: 0, spikeProbability: 0.001, spikeMultiplier: 60 },
    { id: 'CRASH500', label: 'Crash 500 Index', type: 'crash', enabled: true, color: '#E11D48', decimals: 4, startPrice: 6500, tickMs: 1000, volatility: 0.0012, drift: 0, spikeProbability: 0.002, spikeMultiplier: 45 },

    // ── Step ──
    { id: 'STEP', label: 'Step Index', type: 'step', enabled: true, color: '#818CF8', decimals: 1, startPrice: 9000, tickMs: 1000, volatility: 0.0001, drift: 0, stepSize: 0.1 },

    // ── Jump ──
    { id: 'JUMP25', label: 'Jump 25 Index', type: 'jump', enabled: true, color: '#C084FC', decimals: 3, startPrice: 2000, tickMs: 1000, volatility: 0.0025, drift: 0, jumpProbability: 0.008, jumpMultiplier: 12 },
    { id: 'JUMP100', label: 'Jump 100 Index', type: 'jump', enabled: true, color: '#A855F7', decimals: 3, startPrice: 8000, tickMs: 1000, volatility: 0.01, drift: 0, jumpProbability: 0.008, jumpMultiplier: 12 },

    // ── Range Break ──
    { id: 'RB100', label: 'Range Break 100 Index', type: 'rangebreak', enabled: true, color: '#FB923C', decimals: 3, startPrice: 4000, tickMs: 1000, volatility: 0.0015, drift: 0, rangeWidth: 80, breakTouches: 100 },
    { id: 'RB200', label: 'Range Break 200 Index', type: 'rangebreak', enabled: true, color: '#FBBF24', decimals: 3, startPrice: 4500, tickMs: 1000, volatility: 0.0015, drift: 0, rangeWidth: 90, breakTouches: 200 },
];

interface GlobalWithConfig {
    _syntheticConfigs?: SyntheticIndexConfig[];
}

const g = global as unknown as GlobalWithConfig;

function store(): SyntheticIndexConfig[] {
    if (!g._syntheticConfigs) {
        // Deep clone defaults so runtime edits don't mutate the constant.
        g._syntheticConfigs = DEFAULT_SYNTHETIC_CONFIGS.map((c) => ({ ...c }));
    }
    return g._syntheticConfigs;
}

export function getSyntheticConfigs(): SyntheticIndexConfig[] {
    return store().map((c) => ({ ...c }));
}

export function getEnabledSyntheticConfigs(): SyntheticIndexConfig[] {
    return store().filter((c) => c.enabled).map((c) => ({ ...c }));
}

export function getSyntheticConfig(id: string): SyntheticIndexConfig | undefined {
    const found = store().find((c) => c.id === id);
    return found ? { ...found } : undefined;
}

/** Insert or update an index by id. Returns the stored config. */
export function upsertSyntheticConfig(cfg: SyntheticIndexConfig): SyntheticIndexConfig {
    const s = store();
    const idx = s.findIndex((c) => c.id === cfg.id);
    if (idx >= 0) {
        s[idx] = { ...s[idx], ...cfg };
        return { ...s[idx] };
    }
    s.push({ ...cfg });
    return { ...cfg };
}

export function deleteSyntheticConfig(id: string): boolean {
    const s = store();
    const idx = s.findIndex((c) => c.id === id);
    if (idx < 0) return false;
    s.splice(idx, 1);
    return true;
}
