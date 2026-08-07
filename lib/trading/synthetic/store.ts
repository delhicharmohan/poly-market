// ─── Synthetic Candle Persistence ───
//
// Persists 1-minute synthetic candles to Postgres so price history survives
// restarts and the chart can show hours of data. All calls are best-effort:
// if the DB is unavailable the engine keeps running purely in-memory.

import { getPool } from '@/lib/db';
import { Candle } from '../types';

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // keep 7 days of minute candles

interface GlobalWithSchema {
    _synSchemaReady?: Promise<void>;
}
const g = global as unknown as GlobalWithSchema;

/** Create the table once per process (idempotent). */
export function ensureSchema(): Promise<void> {
    if (!g._synSchemaReady) {
        g._synSchemaReady = (async () => {
            const pool = getPool();
            await pool.query(`
                CREATE TABLE IF NOT EXISTS synthetic_candles (
                    symbol TEXT NOT NULL,
                    ts     BIGINT NOT NULL,
                    open   DOUBLE PRECISION NOT NULL,
                    high   DOUBLE PRECISION NOT NULL,
                    low    DOUBLE PRECISION NOT NULL,
                    close  DOUBLE PRECISION NOT NULL,
                    PRIMARY KEY (symbol, ts)
                );
            `);
            await pool.query(
                `CREATE INDEX IF NOT EXISTS idx_synth_candles_symbol_ts ON synthetic_candles(symbol, ts DESC);`
            );
        })().catch((e) => {
            console.error('[Synthetic Store] schema init failed:', (e as Error).message);
            // Reset so a later call can retry.
            g._synSchemaReady = undefined;
        });
    }
    return g._synSchemaReady ?? Promise.resolve();
}

/** Upsert one minute candle (bucket-aligned ts in epoch ms). */
export async function persistCandle(symbol: string, candle: Candle): Promise<void> {
    try {
        await ensureSchema();
        const pool = getPool();
        await pool.query(
            `INSERT INTO synthetic_candles (symbol, ts, open, high, low, close)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (symbol, ts) DO UPDATE
               SET high = GREATEST(synthetic_candles.high, EXCLUDED.high),
                   low  = LEAST(synthetic_candles.low, EXCLUDED.low),
                   close = EXCLUDED.close;`,
            [symbol, candle.time, candle.open, candle.high, candle.low, candle.close]
        );
    } catch (e) {
        console.error('[Synthetic Store] persist failed:', (e as Error).message);
    }
}

/** Most recent `limit` minute candles, returned oldest → newest. */
export async function loadRecentCandles(symbol: string, limit = 1000): Promise<Candle[]> {
    try {
        await ensureSchema();
        const pool = getPool();
        const res = await pool.query(
            `SELECT ts, open, high, low, close FROM synthetic_candles
             WHERE symbol = $1 ORDER BY ts DESC LIMIT $2;`,
            [symbol, limit]
        );
        return res.rows
            .map((r: any) => ({
                time: Number(r.ts),
                open: Number(r.open),
                high: Number(r.high),
                low: Number(r.low),
                close: Number(r.close),
            }))
            .reverse();
    } catch (e) {
        console.error('[Synthetic Store] load failed:', (e as Error).message);
        return [];
    }
}

/** Latest close + its bucket ts, for resuming price continuity on boot. */
export async function loadLatestClose(symbol: string): Promise<{ close: number; ts: number } | null> {
    try {
        await ensureSchema();
        const pool = getPool();
        const res = await pool.query(
            `SELECT ts, close FROM synthetic_candles WHERE symbol = $1 ORDER BY ts DESC LIMIT 1;`,
            [symbol]
        );
        if (!res.rows.length) return null;
        return { close: Number(res.rows[0].close), ts: Number(res.rows[0].ts) };
    } catch (e) {
        console.error('[Synthetic Store] latest-close failed:', (e as Error).message);
        return null;
    }
}

/** Delete candles older than the retention window. */
export async function pruneOld(): Promise<void> {
    try {
        await ensureSchema();
        const pool = getPool();
        await pool.query(`DELETE FROM synthetic_candles WHERE ts < $1;`, [Date.now() - RETENTION_MS]);
    } catch (e) {
        console.error('[Synthetic Store] prune failed:', (e as Error).message);
    }
}
