import { NextResponse } from 'next/server';
import { ASSETS, Asset } from '@/lib/trading/types';
import { ensureSyntheticRunning } from '@/lib/trading/synthetic/engine';
import { getEnabledSyntheticConfigs } from '@/lib/trading/synthetic/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Runtime instrument list = static real-feed assets + admin-configured synthetic
 * indices. The client fetches this instead of importing the static ASSETS const,
 * so indices created/toggled in the admin panel appear without a redeploy.
 */
export async function GET() {
    ensureSyntheticRunning();

    const synthetic: Asset[] = getEnabledSyntheticConfigs().map((cfg) => ({
        id: cfg.id,
        label: cfg.label,
        provider: 'synthetic',
        wsSymbol: cfg.id,
        seedPrice: cfg.startPrice,
        color: cfg.color,
        volatility: cfg.volatility,
        decimals: cfg.decimals,
    }));

    return NextResponse.json({ assets: [...ASSETS, ...synthetic] });
}
