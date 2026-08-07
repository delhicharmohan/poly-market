import { EventEmitter } from 'events';

export interface TickEvent {
    symbol: string;
    price: number;
    timestamp: number;
}

export type BridgeName = 'binance' | 'finnhub' | 'velora' | 'synthetic';
export type BridgeStatus = 'connecting' | 'connected' | 'disconnected';

export interface StatusEvent {
    bridge: BridgeName;
    status: BridgeStatus;
}

interface GlobalWithBus {
    _marketBus?: EventEmitter;
}

const g = global as unknown as GlobalWithBus;

if (!g._marketBus) {
    const bus = new EventEmitter();
    bus.setMaxListeners(0);
    g._marketBus = bus;
}

export const marketBus = g._marketBus!;

export function emitTick(ev: TickEvent): void {
    marketBus.emit('tick', ev);
}

export function emitStatus(ev: StatusEvent): void {
    marketBus.emit('status', ev);
}
