import { Tick, ConnectionStatus } from './types';

type TickCallback = (tick: Tick) => void;
type StatusCallback = (status: ConnectionStatus) => void;

/**
 * Binance WebSocket Manager — SINGLE Combined Stream
 * Uses Binance's combined stream endpoint to subscribe to all symbols
 * over a single WebSocket connection.
 *
 * Endpoint: wss://stream.binance.com:9443/stream?streams={s1}@trade/{s2}@trade/...
 */
export class BinanceWSManager {
    private socket: WebSocket | null = null;
    private tickCallbacks: TickCallback[] = [];
    private statusCallbacks: StatusCallback[] = [];
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private status: ConnectionStatus = 'disconnected';
    private symbols: string[];
    private shouldReconnect = true;

    // Maps binance symbols to our asset IDs
    private static SYMBOL_MAP: Record<string, string> = {
        BTCUSDT: 'BTC/USD',
        ETHUSDT: 'ETH/USD',
        PAXGUSDT: 'GOLD',
    };

    constructor(symbols: string[] = ['btcusdt', 'ethusdt', 'paxgusdt']) {
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
        this.shouldReconnect = true;
        this.setStatus('connecting');

        // Clean up any existing connection
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }

        try {
            // Build combined stream URL: streams=btcusdt@trade/ethusdt@trade/paxgusdt@trade
            const streams = this.symbols.map((s) => `${s}@trade`).join('/');
            const ws = new WebSocket(
                `wss://stream.binance.com:9443/stream?streams=${streams}`
            );

            ws.onopen = () => {
                console.log(`[Binance] Connected — single stream for: ${this.symbols.join(', ')}`);
                this.setStatus('connected');
            };

            ws.onmessage = (event) => {
                try {
                    const wrapper = JSON.parse(event.data);
                    // Combined stream wraps data in { stream: "btcusdt@trade", data: {...} }
                    const data = wrapper.data;
                    if (data && data.p) {
                        const binanceSymbol = (data.s || '').toUpperCase();
                        const assetId =
                            BinanceWSManager.SYMBOL_MAP[binanceSymbol] || binanceSymbol;
                        const tick: Tick = {
                            symbol: assetId,
                            price: parseFloat(data.p),
                            timestamp: data.T || Date.now(),
                        };
                        this.tickCallbacks.forEach((cb) => cb(tick));
                    }
                } catch (e) {
                    // Ignore malformed messages
                }
            };

            ws.onerror = (error) => {
                console.error('[Binance] WebSocket error:', error);
            };

            ws.onclose = () => {
                console.log('[Binance] Disconnected');
                this.socket = null;
                this.setStatus('disconnected');

                // Auto-reconnect with backoff
                if (this.shouldReconnect) {
                    this.reconnectTimer = setTimeout(() => {
                        console.log('[Binance] Reconnecting...');
                        this.connect();
                    }, 3000 + Math.random() * 2000);
                }
            };

            this.socket = ws;
        } catch (e) {
            console.error('[Binance] Failed to connect:', e);
            this.setStatus('disconnected');
        }
    }

    disconnect(): void {
        this.shouldReconnect = false;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.socket) {
            // Remove event handlers to suppress errors during cleanup
            this.socket.onerror = null;
            this.socket.onclose = null;
            try {
                this.socket.close();
            } catch {
                // Ignore close errors during cleanup
            }
            this.socket = null;
        }
        this.setStatus('disconnected');
    }

    getStatus(): ConnectionStatus {
        return this.status;
    }
}
