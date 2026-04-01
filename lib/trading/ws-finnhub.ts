import { Tick, ConnectionStatus } from './types';

type TickCallback = (tick: Tick) => void;
type StatusCallback = (status: ConnectionStatus) => void;

/**
 * Finnhub Bridge Polling Manager
 * 
 * Instead of connecting directly from the browser (which often fails with Code 1006 
 * due to security restrictions), we poll the server-side bridge at /api/finnhub-stream.
 */
export class FinnhubWSManager {
    private tickCallbacks: TickCallback[] = [];
    private statusCallbacks: StatusCallback[] = [];
    private pollInterval: ReturnType<typeof setInterval> | null = null;
    private status: ConnectionStatus = 'disconnected';
    private symbols: string[];
    private shouldPoll = true;

    constructor(symbols: string[], _apiKey: string) {
        // API Key is handled by the server-side bridge
        this.symbols = symbols;
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

        console.log(`[Finnhub] Starting polling of server-side bridge for: ${this.symbols.join(', ')}`);

        // Initial fetch
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
            const res = await fetch('/api/finnhub-stream');
            if (!res.ok) return;

            const data = await res.json();

            if (data.status === 'connected' && data.prices) {
                if (this.status !== 'connected') {
                    this.setStatus('connected');
                }

                this.symbols.forEach(symbol => {
                    const priceData = data.prices[symbol];
                    if (priceData) {
                        const tick: Tick = {
                            symbol: symbol,
                            price: priceData.price,
                            timestamp: priceData.timestamp || Date.now()
                        };
                        this.tickCallbacks.forEach(cb => cb(tick));
                    }
                });
            } else if (data.status === 'connecting' && this.status !== 'connecting') {
                this.setStatus('connecting');
            }
        } catch (e) {
            console.warn('[Finnhub] Bridge fetch failed:', e);
        }
    }

    disconnect(): void {
        this.shouldPoll = false;
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        this.setStatus('disconnected');
    }

    getStatus(): ConnectionStatus {
        return this.status;
    }
}
