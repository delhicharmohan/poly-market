import { Tick, ConnectionStatus } from './types';

type TickCallback = (tick: Tick) => void;
type StatusCallback = (status: ConnectionStatus) => void;

/**
 * Twelve Data WebSocket Manager
 * Endpoint: wss://ws.twelvedata.com/v1/quotes/price?apikey={apikey}
 */
export class TwelveDataWSManager {
    private socket: WebSocket | null = null;
    private tickCallbacks: TickCallback[] = [];
    private statusCallbacks: StatusCallback[] = [];
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    private status: ConnectionStatus = 'disconnected';
    private symbol: string;
    private shouldReconnect = true;
    private apiKey: string;

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
        this.shouldReconnect = true;
        this.setStatus('connecting');

        if (!this.apiKey) {
            console.error('[TwelveData] API Key missing');
            this.setStatus('disconnected');
            return;
        }

        if (this.socket) {
            this.clearHeartbeat();
            this.socket.close();
            this.socket = null;
        }

        try {
            const ws = new WebSocket(`wss://ws.twelvedata.com/v1/quotes/price?apikey=${this.apiKey}`);

            ws.onopen = () => {
                console.log(`[TwelveData] Connected — subscribing to: ${this.symbol}`);
                // Subscribe to symbol
                ws.send(JSON.stringify({
                    action: 'subscribe',
                    params: {
                        symbols: this.symbol
                    }
                }));
                this.setStatus('connected');
                
                // Start heartbeat loop (every 10 seconds per docs)
                this.heartbeatTimer = setInterval(() => {
                    if (this.socket?.readyState === WebSocket.OPEN) {
                        this.socket.send(JSON.stringify({ action: "heartbeat" }));
                    }
                }, 10000);
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.event === 'price' && msg.symbol && msg.price) {
                        const tdSymbol = msg.symbol;
                        const assetId = TwelveDataWSManager.SYMBOL_MAP[tdSymbol] || tdSymbol;
                        
                        const tick: Tick = {
                            symbol: assetId,
                            price: parseFloat(msg.price),
                            timestamp: msg.timestamp ? msg.timestamp * 1000 : Date.now(),
                        };
                        this.tickCallbacks.forEach((cb) => cb(tick));
                    }
                } catch (e) {
                    // Ignore malformed
                }
            };

            ws.onerror = (error) => {
                console.error('[TwelveData] WebSocket error:', error);
            };

            ws.onclose = (event) => {
                console.log('[TwelveData] Disconnected. Code:', event.code, 'Reason:', event.reason);
                this.clearHeartbeat();
                this.socket = null;
                this.setStatus('disconnected');

                if (this.shouldReconnect) {
                    this.reconnectTimer = setTimeout(() => {
                        console.log('[TwelveData] Reconnecting...');
                        this.connect();
                    }, 5000 + Math.random() * 2000); // 5-7s backoff
                }
            };

            this.socket = ws;
        } catch (e) {
            console.error('[TwelveData] Failed to connect:', e);
            this.setStatus('disconnected');
        }
    }

    disconnect(): void {
        this.shouldReconnect = false;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.clearHeartbeat();
        
        if (this.socket) {
            this.socket.onerror = null;
            this.socket.onclose = null;
            try {
                this.socket.close();
            } catch {}
            this.socket = null;
        }
        this.setStatus('disconnected');
    }

    getStatus(): ConnectionStatus {
        return this.status;
    }

    private clearHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
}
