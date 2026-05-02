'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Coins, Plus, Save, Trash2, AlertTriangle, ToggleLeft, ToggleRight, Search } from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance.js';

/**
 * Admin page: edit how many credits each AI-heavy feature costs per run.
 *
 * Endpoints:
 *   GET    /credits/feature-catalog                    → code-defined catalog (dropdown source)
 *   GET    /credits/feature-costs                      → DB rows (each tagged with `in_catalog`)
 *   POST   /credits/admin/feature-costs                → admin create new (key MUST be in catalog)
 *   PUT    /credits/admin/feature-costs/:key           → admin update
 *   DELETE /credits/admin/feature-costs/:key           → admin remove
 *
 * The "Add feature" form uses a dropdown sourced from `/credits/feature-catalog`,
 * so admins can only register keys the backend code actually understands.
 * Already-configured keys are disabled in the dropdown.
 *
 * Rows in the table whose key is NOT in the catalog are flagged as orphans
 * (a dev removed the feature from code but the DB row lingers).
 */
export default function FeatureCostsAdmin() {
    const [items, setItems] = useState([]);            // server snapshot of feature_credit_costs
    const [catalog, setCatalog] = useState([]);        // code-defined feature catalog
    const [drafts, setDrafts] = useState({});          // feature_key -> { credits_cost, is_active, label, description }
    const [loading, setLoading] = useState(true);
    const [savingKey, setSavingKey] = useState(null);
    const [search, setSearch] = useState('');

    // New-row form
    const [newOpen, setNewOpen] = useState(false);
    const [newRow, setNewRow] = useState({
        feature_key: '', label: '', description: '', credits_cost: 1, is_active: true,
    });
    const [creating, setCreating] = useState(false);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [costsRes, catalogRes] = await Promise.all([
                axiosInstance.get('/credits/feature-costs'),
                axiosInstance.get('/credits/feature-catalog'),
            ]);
            setItems(costsRes.data ?? []);
            setCatalog(catalogRes.data ?? []);
            setDrafts({}); // reset edits on refetch
        } catch {
            /* toasted globally */
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    /** Catalog entries that don't yet have a DB row — these are what the dropdown offers. */
    const availableForDropdown = useMemo(() => {
        const configuredKeys = new Set(items.map(i => i.feature_key));
        return catalog.filter(entry => !configuredKeys.has(entry.key));
    }, [items, catalog]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter(i =>
            i.feature_key.toLowerCase().includes(q)
            || (i.label ?? '').toLowerCase().includes(q)
            || (i.description ?? '').toLowerCase().includes(q),
        );
    }, [items, search]);

    // ────────────────────────────────────────────────────────────────────────
    //   Drafts
    // ────────────────────────────────────────────────────────────────────────
    const getDraft = (item) => drafts[item.feature_key] ?? {
        credits_cost: item.credits_cost,
        is_active: item.is_active,
        label: item.label,
        description: item.description ?? '',
    };

    const setDraftField = (key, field, value) => {
        setDrafts(prev => ({
            ...prev,
            [key]: { ...(prev[key] ?? {}), [field]: value },
        }));
    };

    const isDirty = (item) => {
        const d = drafts[item.feature_key];
        if (!d) return false;
        return (
            d.credits_cost !== item.credits_cost
            || d.is_active !== item.is_active
            || d.label !== item.label
            || (d.description ?? '') !== (item.description ?? '')
        );
    };

    // ────────────────────────────────────────────────────────────────────────
    //   Actions
    // ────────────────────────────────────────────────────────────────────────
    const saveOne = async (item) => {
        const draft = drafts[item.feature_key];
        if (!draft || !isDirty(item)) return;

        const cost = Number(draft.credits_cost);
        if (!Number.isFinite(cost) || cost < 0) {
            toast.error('Credits cost must be a number ≥ 0');
            return;
        }
        if (!String(draft.label ?? '').trim()) {
            toast.error('Label cannot be empty');
            return;
        }

        setSavingKey(item.feature_key);
        try {
            const res = await axiosInstance.put(
                `/credits/admin/feature-costs/${encodeURIComponent(item.feature_key)}`,
                {
                    credits_cost: cost,
                    is_active: !!draft.is_active,
                    label: draft.label,
                    description: draft.description ?? '',
                },
            );
            const fresh = res.data ?? {};
            setItems(prev => prev.map(p => p.feature_key === item.feature_key ? { ...p, ...fresh } : p));
            setDrafts(prev => {
                const next = { ...prev };
                delete next[item.feature_key];
                return next;
            });
            toast.success(`"${fresh.label || item.label}" saved`);
        } catch {
            /* toasted globally */
        } finally {
            setSavingKey(null);
        }
    };

    const toggleActive = async (item) => {
        // Quick toggle — no draft needed.
        try {
            const res = await axiosInstance.put(
                `/credits/admin/feature-costs/${encodeURIComponent(item.feature_key)}`,
                { is_active: !item.is_active },
            );
            const fresh = res.data ?? {};
            setItems(prev => prev.map(p => p.feature_key === item.feature_key ? { ...p, ...fresh } : p));
            toast.success(`"${item.label}" ${fresh.is_active ? 'enabled' : 'disabled'}`);
        } catch { /* toasted */ }
    };

    const removeOne = async (item) => {
        if (!confirm(`Delete "${item.label}" feature cost? Users will be blocked from using this feature until you recreate it.`)) return;
        try {
            await axiosInstance.delete(`/credits/admin/feature-costs/${encodeURIComponent(item.feature_key)}`);
            setItems(prev => prev.filter(p => p.feature_key !== item.feature_key));
            toast.success(`"${item.label}" removed`);
        } catch { /* toasted */ }
    };

    /** When admin picks a key from the dropdown, prefill label/description/cost from catalog. */
    const onCatalogPick = (key) => {
        const entry = catalog.find(e => e.key === key);
        if (!entry) {
            setNewRow(r => ({ ...r, feature_key: key }));
            return;
        }
        setNewRow({
            feature_key: entry.key,
            label: entry.label,
            description: entry.description ?? '',
            credits_cost: entry.defaultCost,
            is_active: true,
        });
    };

    const openAddForm = () => {
        // Reset to clean state so the dropdown shows "Select feature…"
        setNewRow({ feature_key: '', label: '', description: '', credits_cost: 1, is_active: true });
        setNewOpen(true);
    };

    const createNew = async () => {
        const k = newRow.feature_key.trim();
        if (!k) {
            toast.error('Pick a feature from the dropdown');
            return;
        }
        if (!catalog.some(e => e.key === k)) {
            toast.error(`"${k}" is not a registered feature in the backend code.`);
            return;
        }
        const cost = Number(newRow.credits_cost);
        if (!Number.isFinite(cost) || cost < 0) {
            toast.error('Credits cost must be ≥ 0');
            return;
        }

        setCreating(true);
        try {
            const res = await axiosInstance.post('/credits/admin/feature-costs', {
                feature_key: k,
                // label/description are optional — backend falls back to catalog defaults
                label: newRow.label || undefined,
                description: newRow.description || undefined,
                credits_cost: cost,
                is_active: !!newRow.is_active,
            });
            setItems(prev => [...prev, { ...res.data, in_catalog: true }]);
            setNewRow({ feature_key: '', label: '', description: '', credits_cost: 1, is_active: true });
            setNewOpen(false);
            toast.success(`"${res.data.label}" added`);
        } catch { /* toasted */ } finally {
            setCreating(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────
    //   Render
    // ────────────────────────────────────────────────────────────────────────
    return (
        <div style={{ padding: '32px 24px', minHeight: '100vh', background: '#f9fafb', fontFamily: '-apple-system, BlinkMacSystemFont, Inter, Segoe UI, sans-serif' }}>
            <style>{`
                .fc-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
                .fc-input { width: 100%; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; outline: none; }
                .fc-input:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
                .fc-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all 0.15s; }
                .fc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .fc-btn-primary { background: #4f46e5; color: #fff; }
                .fc-btn-primary:hover:not(:disabled) { background: #4338ca; }
                .fc-btn-ghost { background: #fff; color: #374151; border-color: #d1d5db; }
                .fc-btn-ghost:hover:not(:disabled) { background: #f9fafb; }
                .fc-btn-danger { background: #fff; color: #dc2626; border-color: #fecaca; }
                .fc-btn-danger:hover:not(:disabled) { background: #fef2f2; }
                .fc-row { display: grid; grid-template-columns: 220px 1fr 110px 110px 200px; gap: 12px; align-items: center; padding: 14px 16px; border-bottom: 1px solid #f3f4f6; }
                .fc-row:last-child { border-bottom: none; }
                .fc-row-head { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #6b7280; background: #f9fafb; }
                .fc-mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #6b7280; }
                .fc-pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
                .fc-pill-on { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
                .fc-pill-off { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
                @media (max-width: 900px) {
                    .fc-row { grid-template-columns: 1fr; }
                    .fc-row-head { display: none; }
                }
            `}</style>

            <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <div style={{ width: 36, height: 36, background: '#1f2937', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Coins size={18} color="#fbbf24" />
                            </div>
                            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>Feature Credit Costs</h1>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: '#6b7280', maxWidth: 640 }}>
                            Set how many credits each AI-heavy feature consumes per use. Toggle a feature off to block its endpoint without changing pricing.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="fc-btn fc-btn-ghost" onClick={fetchAll} disabled={loading}>
                            Refresh
                        </button>
                        <button
                            className="fc-btn fc-btn-primary"
                            onClick={() => (newOpen ? setNewOpen(false) : openAddForm())}
                            disabled={!newOpen && availableForDropdown.length === 0}
                            title={
                                !newOpen && availableForDropdown.length === 0
                                    ? 'Every catalog feature already has a cost configured'
                                    : ''
                            }
                        >
                            <Plus size={14} /> Add feature
                        </button>
                    </div>
                </div>

                {/* New-row form */}
                {newOpen && (
                    <div className="fc-card" style={{ padding: 18 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12 }}>
                            Register a new feature cost
                        </div>

                        {availableForDropdown.length === 0 ? (
                            <div
                                role="alert"
                                style={{
                                    background: '#fffbeb', border: '1px solid #fcd34d',
                                    borderLeft: '4px solid #d97706', color: '#78350f',
                                    padding: '12px 14px', borderRadius: 8, fontSize: 13,
                                }}
                            >
                                Every feature in the application catalog already has a cost configured. To add a new one, a developer needs to register it in <span className="fc-mono">backend/src/billing/credits/feature-catalog.ts</span> first.
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>
                                        Feature
                                    </label>
                                    <select
                                        className="fc-input"
                                        value={newRow.feature_key}
                                        onChange={(e) => onCatalogPick(e.target.value)}
                                    >
                                        <option value="">— Select a feature —</option>
                                        {availableForDropdown.map(entry => (
                                            <option key={entry.key} value={entry.key}>
                                                {entry.label}  ({entry.key})
                                            </option>
                                        ))}
                                    </select>
                                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                                        Only features registered by the backend appear here. Already-configured ones are hidden.
                                    </div>
                                </div>

                                {newRow.feature_key && (
                                    <>
                                        <div>
                                            <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Label (optional override)</label>
                                            <input
                                                className="fc-input"
                                                placeholder="Default: catalog label"
                                                value={newRow.label}
                                                onChange={(e) => setNewRow(r => ({ ...r, label: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Cost (credits)</label>
                                            <input
                                                type="number" min={0} className="fc-input"
                                                value={newRow.credits_cost}
                                                onChange={(e) => setNewRow(r => ({ ...r, credits_cost: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Active</label>
                                            <select
                                                className="fc-input"
                                                value={newRow.is_active ? 'on' : 'off'}
                                                onChange={(e) => setNewRow(r => ({ ...r, is_active: e.target.value === 'on' }))}
                                            >
                                                <option value="on">Enabled</option>
                                                <option value="off">Disabled</option>
                                            </select>
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Description (optional override)</label>
                                            <input
                                                className="fc-input"
                                                placeholder="Default: catalog description"
                                                value={newRow.description}
                                                onChange={(e) => setNewRow(r => ({ ...r, description: e.target.value }))}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {availableForDropdown.length > 0 && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
                                <button className="fc-btn fc-btn-ghost" onClick={() => setNewOpen(false)}>Cancel</button>
                                <button
                                    className="fc-btn fc-btn-primary"
                                    onClick={createNew}
                                    disabled={creating || !newRow.feature_key}
                                >
                                    <Plus size={14} /> {creating ? 'Creating…' : 'Create'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Search */}
                <div className="fc-card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Search size={16} color="#9ca3af" />
                    <input
                        className="fc-input"
                        placeholder="Search by key, label, or description…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ border: 'none', padding: '4px 0', flex: 1 }}
                    />
                </div>

                {/* Table */}
                <div className="fc-card">
                    <div className="fc-row fc-row-head">
                        <div>Feature key</div>
                        <div>Label / description</div>
                        <div>Credits</div>
                        <div>Status</div>
                        <div style={{ textAlign: 'right' }}>Actions</div>
                    </div>

                    {loading && (
                        <div style={{ padding: 20, color: '#6b7280', fontSize: 13 }}>Loading…</div>
                    )}

                    {!loading && filtered.length === 0 && (
                        <div style={{ padding: 30, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                            <AlertTriangle size={18} style={{ marginBottom: 6, color: '#f59e0b' }} /><br />
                            No feature costs configured.<br />
                            Click <strong>Add feature</strong> to create one — or run the seed SQL.
                        </div>
                    )}

                    {!loading && filtered.map(item => {
                        const draft = getDraft(item);
                        const dirty = isDirty(item);
                        const saving = savingKey === item.feature_key;
                        const isOrphan = item.in_catalog === false;

                        return (
                            <div
                                key={item.feature_key}
                                className="fc-row"
                                style={isOrphan ? { background: '#fffbeb' } : undefined}
                            >
                                <div className="fc-mono" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span>{item.feature_key}</span>
                                    {isOrphan && (
                                        <span
                                            title="This key has no matching feature in the backend code. Either restore it in feature-catalog.ts or delete this row."
                                            style={{
                                                fontSize: 10, fontWeight: 700, letterSpacing: 0.04,
                                                textTransform: 'uppercase', color: '#92400e',
                                                background: '#fef3c7', border: '1px solid #fcd34d',
                                                padding: '2px 6px', borderRadius: 4,
                                                display: 'inline-flex', alignItems: 'center', gap: 4, width: 'fit-content',
                                            }}
                                        >
                                            <AlertTriangle size={10} /> Orphan — not in code
                                        </span>
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <input
                                        className="fc-input"
                                        value={draft.label}
                                        onChange={(e) => setDraftField(item.feature_key, 'label', e.target.value)}
                                    />
                                    <input
                                        className="fc-input"
                                        placeholder="Description (optional)"
                                        value={draft.description ?? ''}
                                        onChange={(e) => setDraftField(item.feature_key, 'description', e.target.value)}
                                        style={{ fontSize: 12, color: '#6b7280' }}
                                    />
                                </div>

                                <input
                                    type="number" min={0}
                                    className="fc-input"
                                    value={draft.credits_cost}
                                    onChange={(e) => setDraftField(item.feature_key, 'credits_cost', e.target.value)}
                                />

                                <button
                                    onClick={() => toggleActive(item)}
                                    title="Click to toggle"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                                >
                                    {item.is_active
                                        ? <span className="fc-pill fc-pill-on"><ToggleRight size={12} /> Active</span>
                                        : <span className="fc-pill fc-pill-off"><ToggleLeft size={12} /> Disabled</span>}
                                </button>

                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                    <button
                                        className="fc-btn fc-btn-primary"
                                        onClick={() => saveOne(item)}
                                        disabled={!dirty || saving}
                                    >
                                        <Save size={14} /> {saving ? 'Saving…' : (dirty ? 'Save' : 'Saved')}
                                    </button>
                                    <button
                                        className="fc-btn fc-btn-danger"
                                        onClick={() => removeOne(item)}
                                        title="Remove this feature cost"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '8px 0 24px' }}>
                    Edits take effect immediately — there is no separate publish step.
                </div>
            </div>
        </div>
    );
}
