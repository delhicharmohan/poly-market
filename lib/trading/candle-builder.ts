import { Candle, Tick } from './types';

/**
 * CandleBuilder accumulates ticks and builds OHLC candles
 * at a configurable interval (default: 1 second).
 */
export class CandleBuilder {
    private currentCandle: Candle | null = null;
    private intervalMs: number;

    constructor(intervalMs: number = 1000) {
        this.intervalMs = intervalMs;
    }

    /**
     * Process an incoming tick. Returns a completed candle if the
     * interval has elapsed, otherwise returns null.
     */
    processTick(tick: Tick): Candle | null {
        const now = tick.timestamp;
        const price = tick.price;

        if (!this.currentCandle) {
            // Start a new candle
            this.currentCandle = {
                open: price,
                high: price,
                low: price,
                close: price,
                time: now,
            };
            return null;
        }

        const elapsed = now - this.currentCandle.time;

        if (elapsed >= this.intervalMs) {
            // Complete the current candle and start a new one
            const completed = { ...this.currentCandle, close: price };
            this.currentCandle = {
                open: price,
                high: price,
                low: price,
                close: price,
                time: now,
            };
            return completed;
        }

        // Update current candle with new tick
        this.currentCandle.high = Math.max(this.currentCandle.high, price);
        this.currentCandle.low = Math.min(this.currentCandle.low, price);
        this.currentCandle.close = price;
        return null;
    }

    /**
     * Force-close the current candle (used when switching assets or cleanup).
     */
    flush(): Candle | null {
        if (this.currentCandle) {
            const completed = { ...this.currentCandle };
            this.currentCandle = null;
            return completed;
        }
        return null;
    }

    /**
     * Reset the builder state.
     */
    reset(): void {
        this.currentCandle = null;
    }
}
