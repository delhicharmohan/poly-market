import { NextResponse } from 'next/server';
import {
    ensureVeloraConnected,
    getVeloraStatus,
    getVeloraPriceCache,
    VELORA_INSTRUMENT_TOKENS,
} from '@/lib/trading/server/velora-bridge';

/**
 * Velora bridge status endpoint.
 *
 * Kept as a thin debug endpoint after the SSE revamp. Live ticks flow via
 * /api/market-stream now; this route just lets you inspect the in-process
 * cache and (re)trigger the upstream connection.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
    ensureVeloraConnected();

    const prices = getVeloraPriceCache();
    return NextResponse.json({
        status: getVeloraStatus(),
        prices,
        tokens: VELORA_INSTRUMENT_TOKENS,
        cacheSize: Object.keys(prices).length,
    });
}
