'use client';

import { useEffect, useState, useCallback } from 'react';
import { SyntheticIndexConfig, SyntheticType } from '@/lib/trading/synthetic/types';

const TYPES: SyntheticType[] = ['volatility', 'boom', 'crash', 'step', 'jump', 'rangebreak'];

const BLANK: SyntheticIndexConfig = {
    id: '',
    label: '',
    type: 'volatility',
    enabled: true,
    color: '#22D3EE',
    decimals: 3,
    startPrice: 1000,
    tickMs: 1000,
    volatility: 0.005,
    drift: 0,
};

const input =
    'w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm';
const label = 'block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1';

export default function SyntheticManager() {
    const [configs, setConfigs] = useState<SyntheticIndexConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<SyntheticIndexConfig | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/synthetic', { credentials: 'include' });
            const data = await res.json();
            setConfigs(data.configs || []);
        } catch {
            setError('Failed to load indices');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const save = async (cfg: SyntheticIndexConfig) => {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/synthetic', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cfg),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Save failed');
            setEditing(null);
            setIsNew(false);
            await load();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const toggle = async (cfg: SyntheticIndexConfig) => {
        await save({ ...cfg, enabled: !cfg.enabled });
    };

    const remove = async (id: string) => {
        if (!confirm(`Delete index ${id}?`)) return;
        await fetch(`/api/admin/synthetic?id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        await load();
    };

    const set = (patch: Partial<SyntheticIndexConfig>) =>
        setEditing((e) => (e ? { ...e, ...patch } : e));

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {configs.length} indices · {configs.filter((c) => c.enabled).length} live.
                    Changes apply within ~1s; edits reset on server restart.
                </p>
                <button
                    onClick={() => {
                        setEditing({ ...BLANK });
                        setIsNew(true);
                        setError(null);
                    }}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
                >
                    + Add Index
                </button>
            </div>

            {/* Editor */}
            {editing && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-indigo-300 dark:border-indigo-700 p-4 space-y-3">
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                        {isNew ? 'New synthetic index' : `Edit ${editing.id}`}
                    </h3>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                            <label className={label}>ID</label>
                            <input
                                className={input}
                                value={editing.id}
                                disabled={!isNew}
                                onChange={(e) => set({ id: e.target.value.toUpperCase() })}
                                placeholder="VOL75"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className={label}>Label</label>
                            <input className={input} value={editing.label} onChange={(e) => set({ label: e.target.value })} placeholder="Volatility 75 Index" />
                        </div>
                        <div>
                            <label className={label}>Type</label>
                            <select className={input} value={editing.type} onChange={(e) => set({ type: e.target.value as SyntheticType })}>
                                {TYPES.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={label}>Start price</label>
                            <input type="number" className={input} value={editing.startPrice} onChange={(e) => set({ startPrice: +e.target.value })} />
                        </div>
                        <div>
                            <label className={label}>Tick (ms)</label>
                            <input type="number" className={input} value={editing.tickMs} onChange={(e) => set({ tickMs: +e.target.value })} />
                        </div>
                        <div>
                            <label className={label}>Volatility</label>
                            <input type="number" step="0.0001" className={input} value={editing.volatility} onChange={(e) => set({ volatility: +e.target.value })} />
                        </div>
                        <div>
                            <label className={label}>Drift</label>
                            <input type="number" step="0.0001" className={input} value={editing.drift} onChange={(e) => set({ drift: +e.target.value })} />
                        </div>
                        <div>
                            <label className={label}>Decimals</label>
                            <input type="number" className={input} value={editing.decimals} onChange={(e) => set({ decimals: +e.target.value })} />
                        </div>
                        <div>
                            <label className={label}>Color</label>
                            <input type="color" className={`${input} h-9 p-1`} value={editing.color} onChange={(e) => set({ color: e.target.value })} />
                        </div>

                        {/* Type-specific params */}
                        {(editing.type === 'boom' || editing.type === 'crash') && (
                            <>
                                <div>
                                    <label className={label}>Spike prob.</label>
                                    <input type="number" step="0.0001" className={input} value={editing.spikeProbability ?? 0.001} onChange={(e) => set({ spikeProbability: +e.target.value })} />
                                </div>
                                <div>
                                    <label className={label}>Spike ×</label>
                                    <input type="number" className={input} value={editing.spikeMultiplier ?? 50} onChange={(e) => set({ spikeMultiplier: +e.target.value })} />
                                </div>
                            </>
                        )}
                        {editing.type === 'step' && (
                            <div>
                                <label className={label}>Step size</label>
                                <input type="number" step="0.01" className={input} value={editing.stepSize ?? 0.1} onChange={(e) => set({ stepSize: +e.target.value })} />
                            </div>
                        )}
                        {editing.type === 'jump' && (
                            <>
                                <div>
                                    <label className={label}>Jump prob.</label>
                                    <input type="number" step="0.0001" className={input} value={editing.jumpProbability ?? 0.01} onChange={(e) => set({ jumpProbability: +e.target.value })} />
                                </div>
                                <div>
                                    <label className={label}>Jump ×</label>
                                    <input type="number" className={input} value={editing.jumpMultiplier ?? 12} onChange={(e) => set({ jumpMultiplier: +e.target.value })} />
                                </div>
                            </>
                        )}
                        {editing.type === 'rangebreak' && (
                            <>
                                <div>
                                    <label className={label}>Range width</label>
                                    <input type="number" className={input} value={editing.rangeWidth ?? 80} onChange={(e) => set({ rangeWidth: +e.target.value })} />
                                </div>
                                <div>
                                    <label className={label}>Break touches</label>
                                    <input type="number" className={input} value={editing.breakTouches ?? 100} onChange={(e) => set({ breakTouches: +e.target.value })} />
                                </div>
                            </>
                        )}
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => { setEditing(null); setIsNew(false); setError(null); }} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium">
                            Cancel
                        </button>
                        <button onClick={() => editing && save(editing)} disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium">
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">Index</th>
                                <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">Type</th>
                                <th className="text-right p-3 font-semibold text-slate-700 dark:text-slate-300">Vol</th>
                                <th className="text-right p-3 font-semibold text-slate-700 dark:text-slate-300">Tick</th>
                                <th className="text-center p-3 font-semibold text-slate-700 dark:text-slate-300">Live</th>
                                <th className="text-right p-3 font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {configs.map((c) => (
                                <tr key={c.id} className="border-b border-slate-100 dark:border-slate-700/50">
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                                            <span className="font-medium text-slate-900 dark:text-white">{c.label}</span>
                                            <span className="text-xs text-slate-400">{c.id}</span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-slate-600 dark:text-slate-300 capitalize">{c.type}</td>
                                    <td className="p-3 text-right tabular-nums text-slate-600 dark:text-slate-300">{c.volatility}</td>
                                    <td className="p-3 text-right tabular-nums text-slate-600 dark:text-slate-300">{c.tickMs}ms</td>
                                    <td className="p-3 text-center">
                                        <button
                                            onClick={() => toggle(c)}
                                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}
                                        >
                                            {c.enabled ? '● Live' : '○ Off'}
                                        </button>
                                    </td>
                                    <td className="p-3 text-right">
                                        <button onClick={() => { setEditing({ ...c }); setIsNew(false); setError(null); }} className="text-indigo-600 dark:text-indigo-400 hover:underline mr-3">Edit</button>
                                        <button onClick={() => remove(c.id)} className="text-red-600 dark:text-red-400 hover:underline">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
