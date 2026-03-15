import { Tick, ConnectionStatus } from './types';

type TickCallback = (tick: Tick) => void;
type StatusCallback = (status: ConnectionStatus) => void;

/**
 * Twelve Data REST Polling Manager
 * Uses the /price endpoint to poll for real-time forex prices.
 * This is the reliable approach for the Basic (free) plan where
 * WebSocket access is limited to trial symbols only.
 *
 * Endpoint: https://api.twelvedata.com/price?symbol={symbol}&apikey={apikey}
 */
export class TwelveDataWSManager {
    private tickCallbacks: TickCallback[] = [];
    private statusCallbacks: StatusCallback[] = [];
    private pollInterval: ReturnType<typeof setInterval> | null = null;
    private status: ConnectionStatus = 'disconnected';
    private symbol: string;
    private apiKey: string;
    private shouldPoll = true;

    // Maps TwelveData symbols to our asset IDs
    private static SYMBOL_MAP: Record<string, string> = {
        'EUR/USD': 'EUR/USD',
        'GBP/USD': 'GBP/USD',
    };

    constructor(symbol: string, apiKey: string) {
        this.symbol = symbol;
        this.apiKey = apiKey;
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

        if (!this.apiKey) {
            console.error('[TwelveData] API Key missing');
            this.setStatus('disconnected');
            return;
        }

        console.log(`[TwelveData] Starting REST polling for: ${this.symbol}`);

        // Do an initial fetch immediately
        this.fetchPrice();

        // Poll every 15 seconds — conservative to stay inside the 8 req/min Basic limit
        // With 2 symbols polling every 15s = 8 requests/min (exactly the limit)
        this.pollInterval = setInterval(() => {
            if (this.shouldPoll) {
                this.fetchPrice();
            }
        }, 15000);
    }

    private async fetchPrice(): Promise<void> {
        try {
            const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(this.symbol)}&apikey=${this.apiKey}`;
            const res = await fetch(url);

            if (!res.ok) {
                console.warn(`[TwelveData] HTTP ${res.status} for ${this.symbol}`);
                return;
            }

            const data = await res.json();

            if (data.price) {
                const price = parseFloat(data.price);
                const assetId = TwelveDataWSManager.SYMBOL_MAP[this.symbol] || this.symbol;

                const tick: Tick = {
                    symbol: assetId,
                    price,
                    timestamp: Date.now(),
                };
                this.tickCallbacks.forEach((cb) => cb(tick));

                // Mark connected on first successful fetch
                if (this.status !== 'connected') {
                    this.setStatus('connected');
                    console.log(`[TwelveData] ✓ Receiving data for ${this.symbol}: ${price}`);
                }
            } else if (data.code) {
                // API error (rate limit, invalid symbol, etc.)
                console.warn(`[TwelveData] API error for ${this.symbol}:`, data.message || data.code);
            }
        } catch (e) {
            console.warn(`[TwelveData] Fetch failed for ${this.symbol}:`, e);
        }
    }

    disconnect(): void {
        this.shouldPoll = false;
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        this.setStatus('disconnected');
        console.log(`[TwelveData] Stopped polling for ${this.symbol}`);
    }

    getStatus(): ConnectionStatus {
        return this.status;
    }
}
