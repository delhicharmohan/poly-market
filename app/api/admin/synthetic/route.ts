import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import {
    getSyntheticConfigs,
    upsertSyntheticConfig,
    deleteSyntheticConfig,
} from '@/lib/trading/synthetic/config';
import { SyntheticIndexConfig, SyntheticType } from '@/lib/trading/synthetic/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TYPES: SyntheticType[] = ['volatility', 'boom', 'crash', 'step', 'jump', 'rangebreak'];

async function guard(request: NextRequest): Promise<NextResponse | null> {
    if (!(await isAdmin(request))) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return null;
}

function num(v: unknown, fallback: number): number {
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : fallback;
}

/** Validate + coerce an incoming body into a SyntheticIndexConfig. */
function parseConfig(body: any): { cfg?: SyntheticIndexConfig; error?: string } {
    const id = String(body?.id ?? '').trim().toUpperCase().replace(/\s+/g, '');
    if (!id) return { error: 'id is required' };
    if (!/^[A-Z0-9_./-]+$/.test(id)) return { error: 'id may contain only A-Z, 0-9, _ . / -' };

    const type = body?.type as SyntheticType;
    if (!TYPES.includes(type)) return { error: `type must be one of ${TYPES.join(', ')}` };

    const startPrice = num(body?.startPrice, 1000);
    if (startPrice <= 0) return { error: 'startPrice must be positive' };

    const tickMs = Math.max(100, Math.round(num(body?.tickMs, 1000)));

    const cfg: SyntheticIndexConfig = {
        id,
        label: String(body?.label ?? id).trim() || id,
        type,
        enabled: body?.enabled !== false,
        color: String(body?.color ?? '#22D3EE'),
        decimals: Math.max(0, Math.min(8, Math.round(num(body?.decimals, 3)))),
        startPrice,
        tickMs,
        volatility: Math.max(0, num(body?.volatility, 0.005)),
        drift: num(body?.drift, 0),
        spikeProbability: body?.spikeProbability != null ? num(body.spikeProbability, 0) : undefined,
        spikeMultiplier: body?.spikeMultiplier != null ? num(body.spikeMultiplier, 0) : undefined,
        stepSize: body?.stepSize != null ? num(body.stepSize, 0) : undefined,
        jumpProbability: body?.jumpProbability != null ? num(body.jumpProbability, 0) : undefined,
        jumpMultiplier: body?.jumpMultiplier != null ? num(body.jumpMultiplier, 0) : undefined,
        rangeWidth: body?.rangeWidth != null ? num(body.rangeWidth, 0) : undefined,
        breakTouches: body?.breakTouches != null ? Math.round(num(body.breakTouches, 0)) : undefined,
    };
    return { cfg };
}

export async function GET(request: NextRequest) {
    const denied = await guard(request);
    if (denied) return denied;
    return NextResponse.json({ configs: getSyntheticConfigs() });
}

export async function POST(request: NextRequest) {
    const denied = await guard(request);
    if (denied) return denied;
    try {
        const body = await request.json();
        const { cfg, error } = parseConfig(body);
        if (error || !cfg) return NextResponse.json({ message: error }, { status: 400 });
        const saved = upsertSyntheticConfig(cfg);
        return NextResponse.json({ config: saved });
    } catch (e: any) {
        return NextResponse.json({ message: e?.message || 'Bad request' }, { status: 400 });
    }
}

export async function DELETE(request: NextRequest) {
    const denied = await guard(request);
    if (denied) return denied;
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'id required' }, { status: 400 });
    const ok = deleteSyntheticConfig(id);
    return NextResponse.json({ ok });
}
