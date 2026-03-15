import { Tick, ConnectionStatus } from './types';

type TickCallback = (tick: Tick) => void;
type StatusCallback = (status: ConnectionStatus) => void;

/**
 * Velora Client-Side Manager
 *
 * Polls the server-side bridge at /api/velora-stream to get
 * real-time Forex prices from the Velora WebSocket feed.
 * The server-side bridge handles the actual WebSocket connection
 * with the Authorization header.
 */
export class VeloraWSManager {
    private tickCallbacks: TickCallback[] = [];
    private statusCallbacks: StatusCallback[] = [];
    private pollInterval: ReturnType<typeof setInterval> | null = null;
    private status: ConnectionStatus = 'disconnected';
    private shouldPoll = true;

    // Maps Velora instrument tokens to our asset IDs
    // Will be dynamically populated as we discover which tokens map to which pairs
    private tokenToAsset: Record<string, string> = {};

    constructor(tokenToAsset: Record<string, string>) {
        this.tokenToAsset = tokenToAsset;
    }

    onTick(callback: TickCallback): void {
        this.tickCallbacks.push(callback);
    }

    onStatusChange(callback: StatusCallback): void {
        this.statusCallbacks.push(callback);
    }

    private setStatus(status: ConnectionStatus): void {
        this.status = status;
        this.statusCallbacks.forEach((cb) => cb(status));
    }

    connect(): void {
        this.shouldPoll = true;
        this.setStatus('connecting');

        console.log('[Velora] Starting polling of server-side bridge');

        // Do an initial fetch immediately
        this.fetchPrices();

        // Poll every 2 seconds for near real-time updates
        this.pollInterval = setInterval(() => {
            if (this.shouldPoll) {
                this.fetchPrices();
            }
        }, 2000);
    }

    private async fetchPrices(): Promise<void> {
        try {
            const res = await fetch('/api/velora-stream');

            if (!res.ok) {
                console.warn(`[Velora] HTTP ${res.status} from bridge`);
                return;
            }

            const data = await res.json();

            if (data.status === 'connected' && data.prices) {
                // Mark connected on first successful response with data
                if (this.status !== 'connected' && Object.keys(data.prices).length > 0) {
                    this.setStatus('connected');
                    console.log(`[Velora] ✓ Receiving data — ${Object.keys(data.prices).length} instruments`);
                }

                // Emit ticks for each price in the cache
                for (const [tokenStr, priceData] of Object.entries(data.prices)) {
                    const pd = priceData as any;
                    const assetId = this.tokenToAsset[tokenStr] || pd.symbol;

                    // Only emit if we have a mapping for this token
                    if (this.tokenToAsset[tokenStr]) {
                        const tick: Tick = {
                            symbol: assetId,
                            price: pd.price,
                            timestamp: pd.timestamp || Date.now(),
                        };
                        this.tickCallbacks.forEach((cb) => cb(tick));
                    }
                }
            } else if (data.status === 'connecting') {
                // Server is still connecting, wait
                if (this.status !== 'connecting') {
                    this.setStatus('connecting');
                }
            }
        } catch (e) {
            console.warn('[Velora] Bridge fetch failed:', e);
        }
    }

    disconnect(): void {
        this.shouldPoll = false;
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        this.setStatus('disconnected');
        console.log('[Velora] Stopped polling');
    }

    getStatus(): ConnectionStatus {
        return this.status;
    }
}
