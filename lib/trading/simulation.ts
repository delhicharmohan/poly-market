import { Candle, Tick } from './types';

/**
 * Generate a simulated candle from the previous candle.
 * Used as fallback when WebSocket is disconnected.
 */
export function generateSimulatedCandle(prev: Candle, volatility: number = 0.002): Candle {
    const change = (Math.random() - 0.495) * volatility * prev.close;
    const open = prev.close;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * Math.abs(change) * 0.5;
    const low = Math.min(open, close) - Math.random() * Math.abs(change) * 0.5;
    return { open, high, low, close, time: Date.now() };
}

/**
 * Generate a simulated tick from the last known price.
 * Used to produce continuous price updates when WS disconnects.
 */
export function generateSimulatedTick(
    symbol: string,
    lastPrice: number,
    volatility: number = 0.002
): Tick {
    const change = (Math.random() - 0.495) * volatility * lastPrice;
    return {
        symbol,
        price: lastPrice + change,
        timestamp: Date.now(),
    };
}

/**
 * Generate initial seed candles for chart history.
 * Creates `count` candles from a starting price.
 */
export function generateSeedCandles(
    startPrice: number,
    volatility: number,
    count: number = 100
): Candle[] {
    const candles: Candle[] = [];
    let prev: Candle = {
        open: startPrice,
        high: startPrice,
        low: startPrice,
        close: startPrice,
        time: Date.now() - count * 1000,
    };

    for (let i = 0; i < count; i++) {
        prev = generateSimulatedCandle(prev, volatility);
        prev.time = Date.now() - (count - i) * 1000;
        candles.push(prev);
    }

    return candles;
}
