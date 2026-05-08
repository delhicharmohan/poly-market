import { NextResponse } from 'next/server';
import { getFinnhubWS } from '@/lib/trading/server-ws';

/**
 * Finnhub Stream Bridge — Server-Side
 * 
 * Provides the latest captured prices from the server-side Finnhub sync.
 */

// We store the latest price for each symbol in-memory
const priceCache: Record<string, { price: number; timestamp: number }> = {};

import { getLatestPrices } from '@/lib/trading/server-ws';

export async function GET() {
    const ws = getFinnhubWS();
    const status = ws ? (ws.readyState === 1 ? 'connected' : 'connecting') : 'disconnected';

    return NextResponse.json({
        status,
        prices: getLatestPrices()
    });
}
