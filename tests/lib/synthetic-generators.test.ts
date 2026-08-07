import { describe, it, expect } from 'vitest';
import { nextState, seededRng, gaussian } from '@/lib/trading/synthetic/generators';
import { initialRuntimeState, SyntheticIndexConfig } from '@/lib/trading/synthetic/types';

function cfg(overrides: Partial<SyntheticIndexConfig>): SyntheticIndexConfig {
    return {
        id: 'TEST',
        label: 'Test',
        type: 'volatility',
        enabled: true,
        color: '#fff',
        decimals: 3,
        startPrice: 1000,
        tickMs: 1000,
        volatility: 0.01,
        drift: 0,
        ...overrides,
    };
}

describe('synthetic generators', () => {
    it('seededRng is deterministic and in [0,1)', () => {
        const a = seededRng(42);
        const b = seededRng(42);
        for (let i = 0; i < 100; i++) {
            const v = a();
            expect(v).toBe(b());
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThan(1);
        }
    });

    it('gaussian produces a roughly zero-mean distribution', () => {
        const rng = seededRng(7);
        let sum = 0;
        const N = 5000;
        for (let i = 0; i < N; i++) sum += gaussian(rng);
        expect(Math.abs(sum / N)).toBeLessThan(0.1);
    });

    it('all index types keep price positive over many ticks', () => {
        const types: SyntheticIndexConfig['type'][] = [
            'volatility', 'boom', 'crash', 'step', 'jump', 'rangebreak',
        ];
        for (const type of types) {
            const c = cfg({ type, stepSize: 0.1, rangeWidth: 20, breakTouches: 5 });
            let s = initialRuntimeState(c);
            const rng = seededRng(123);
            for (let i = 0; i < 2000; i++) {
                s = nextState(c, s, rng);
                expect(s.price).toBeGreaterThan(0);
                expect(Number.isFinite(s.price)).toBe(true);
            }
        }
    });

    it('volatility index is deterministic given a seeded rng', () => {
        const c = cfg({ type: 'volatility' });
        const run = () => {
            let s = initialRuntimeState(c);
            const rng = seededRng(99);
            for (let i = 0; i < 50; i++) s = nextState(c, s, rng);
            return s.price;
        };
        expect(run()).toBe(run());
    });

    it('boom index spikes upward (max move is positive and large)', () => {
        const c = cfg({ type: 'boom', volatility: 0.001, spikeProbability: 0.05, spikeMultiplier: 50 });
        let s = initialRuntimeState(c);
        const rng = seededRng(5);
        let maxUp = 0;
        let maxDown = 0;
        for (let i = 0; i < 3000; i++) {
            const prev = s.price;
            s = nextState(c, s, rng);
            const rel = (s.price - prev) / prev;
            maxUp = Math.max(maxUp, rel);
            maxDown = Math.min(maxDown, rel);
        }
        // Biggest up-move (a spike) should dwarf the biggest down-move.
        expect(maxUp).toBeGreaterThan(Math.abs(maxDown));
    });

    it('boom/crash stay bounded (no collapse to zero or explosion)', () => {
        for (const type of ['boom', 'crash'] as const) {
            const c = cfg({ type, startPrice: 9000, volatility: 0.0008, spikeProbability: 0.001, spikeMultiplier: 50 });
            let s = initialRuntimeState(c);
            const rng = seededRng(17);
            let sum = 0;
            const N = 100000;
            for (let i = 0; i < N; i++) {
                s = nextState(c, s, rng);
                sum += s.price;
                // Never collapses near zero or runs away to absurd levels.
                expect(s.price).toBeGreaterThan(c.startPrice * 0.1);
                expect(s.price).toBeLessThan(c.startPrice * 10);
            }
            // Mean stays in the same ballpark as the start (no systematic trend).
            const mean = sum / N;
            expect(mean).toBeGreaterThan(c.startPrice * 0.4);
            expect(mean).toBeLessThan(c.startPrice * 1.6);
        }
    });

    it('crash index spikes downward', () => {
        const c = cfg({ type: 'crash', volatility: 0.001, spikeProbability: 0.05, spikeMultiplier: 50 });
        let s = initialRuntimeState(c);
        const rng = seededRng(5);
        let maxUp = 0;
        let maxDown = 0;
        for (let i = 0; i < 3000; i++) {
            const prev = s.price;
            s = nextState(c, s, rng);
            const rel = (s.price - prev) / prev;
            maxUp = Math.max(maxUp, rel);
            maxDown = Math.min(maxDown, rel);
        }
        expect(Math.abs(maxDown)).toBeGreaterThan(maxUp);
    });

    it('step index moves by exactly stepSize each tick', () => {
        const c = cfg({ type: 'step', stepSize: 0.5 });
        let s = initialRuntimeState(c);
        const rng = seededRng(11);
        for (let i = 0; i < 100; i++) {
            const prev = s.price;
            s = nextState(c, s, rng);
            expect(Math.abs(Math.abs(s.price - prev) - 0.5)).toBeLessThan(1e-9);
        }
    });

    it('rangebreak stays bounded until it breaks out', () => {
        const c = cfg({ type: 'rangebreak', volatility: 0.002, rangeWidth: 50, breakTouches: 1000 });
        let s = initialRuntimeState(c);
        const rng = seededRng(3);
        // With a huge breakTouches it should never break out → stay within range.
        for (let i = 0; i < 500; i++) {
            s = nextState(c, s, rng);
            expect(s.price).toBeLessThanOrEqual(s.rangeCenter + 50 + 1e-6);
            expect(s.price).toBeGreaterThanOrEqual(s.rangeCenter - 50 - 1e-6);
        }
    });
});
