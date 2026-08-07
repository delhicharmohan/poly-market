import { ensureBinanceConnected } from '@/lib/trading/server/binance-bridge';
import { ensureFinnhubConnected } from '@/lib/trading/server/finnhub-bridge';
import { ensureVeloraConnected, getVeloraStatus } from '@/lib/trading/server/velora-bridge';
import { ensureSyntheticRunning } from '@/lib/trading/synthetic/engine';
import { marketBus, type StatusEvent, type TickEvent } from '@/lib/trading/server/bus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function bootBridges() {
    ensureBinanceConnected();
    ensureFinnhubConnected();
    ensureVeloraConnected();
    ensureSyntheticRunning();
}

export async function GET() {
    bootBridges();

    const encoder = new TextEncoder();
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let onTick: ((ev: TickEvent) => void) | null = null;
    let onStatus: ((ev: StatusEvent) => void) | null = null;

    const stream = new ReadableStream({
        start(controller) {
            const send = (event: string, payload: unknown) => {
                try {
                    controller.enqueue(
                        encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`)
                    );
                } catch {
                    // Client disconnected
                }
            };

            // Initial hello so the client flips out of 'connecting' once the
            // socket is up, even before the first upstream tick arrives.
            send('hello', {
                velora: getVeloraStatus(),
                ts: Date.now(),
            });

            onTick = (ev) => send('tick', ev);
            onStatus = (ev) => send('status', ev);
            marketBus.on('tick', onTick);
            marketBus.on('status', onStatus);

            // Keep-alive every 25 s — beats most proxy idle timeouts
            heartbeat = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(`: ping\n\n`));
                } catch {
                    // Stream closed
                }
            }, 25000);
        },
        cancel() {
            if (heartbeat) clearInterval(heartbeat);
            if (onTick) marketBus.off('tick', onTick);
            if (onStatus) marketBus.off('status', onStatus);
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
