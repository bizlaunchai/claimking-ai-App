'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance';
import './templates.css';

// Keep in sync with backend DTO
const MODES = ['insurance', 'retail'];
const UNITS = ['EA', 'LF', 'SF', 'SQ', 'Bundle', 'Roll', 'HR', 'LS', 'CY'];

const blankItem = () => ({ name: '', qty: 1, unit: 'EA', price: 0 });
const blankSection = () => ({ section_key: '', name: '', items: [blankItem()] });

const Templates = () => {
    const [tab, setTab] = useState('templates');
    const [search, setSearch] = useState('');

    const [templates, setTemplates] = useState([]);
    const [bundles, setBundles] = useState([]);
    const [loading, setLoading] = useState(true);

    const [editingTpl, setEditingTpl] = useState(null);
    const [editingBundle, setEditingBundle] = useState(null);
    const [saving, setSaving] = useState(false);

    // ── Load ────────────────────────────────────────────────────────────
    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const params = search.trim() ? { search: search.trim() } : {};
            const [tRes, bRes] = await Promise.all([
                axiosInstance.get('/estimate-templates', { params, suppressErrorToast: true }),
                axiosInstance.get('/estimate-bundles', { params, suppressErrorToast: true }),
            ]);
            setTemplates(tRes.data?.data ?? []);
            setBundles(bRes.data?.data ?? []);
        } catch {
            /* swallowed — toasts elsewhere */
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        const t = setTimeout(reload, 250);
        return () => clearTimeout(t);
    }, [reload]);

    // ── Template editor handlers ────────────────────────────────────────
    const openNewTemplate = () => setEditingTpl({
        name: '',
        description: '',
        mode: null,
        sections: [blankSection()],
    });

    const openEditTemplate = (t) => setEditingTpl({
        id: t.id,
        name: t.name ?? '',
        description: t.description ?? '',
        mode: t.mode ?? null,
        sections: Array.isArray(t.sections) && t.sections.length
            ? t.sections.map((s) => ({
                section_key: s.section_key ?? '',
                name: s.name ?? '',
                items: Array.isArray(s.items) && s.items.length
                    ? s.items.map((i) => ({
                        name: i.name ?? '',
                        qty: Number(i.qty) || 0,
                        unit: i.unit ?? 'EA',
                        price: Number(i.price) || 0,
                    }))
                    : [blankItem()],
            }))
            : [blankSection()],
    });

    const saveTemplate = async () => {
        if (!editingTpl?.name?.trim()) {
            toast.error('Template name is required');
            return;
        }
        const cleaned = {
            ...editingTpl,
            name: editingTpl.name.trim(),
            description: editingTpl.description?.trim() || null,
            mode: editingTpl.mode || null,
            sections: editingTpl.sections
                .map((s) => ({
                    section_key: (s.section_key || s.name || '').trim().toLowerCase().replace(/\s+/g, '-'),
                    name: (s.name || s.section_key || '').trim(),
                    items: (s.items || []).filter((i) => i.name?.trim()),
                }))
                .filter((s) => s.section_key && s.items.length),
        };
        if (!cleaned.sections.length) {
            toast.error('Add at least one section with items');
            return;
        }
        setSaving(true);
        try {
            await axiosInstance.post('/estimate-templates', cleaned);
            toast.success('Template saved');
            setEditingTpl(null);
            await reload();
        } catch (err) {
            const msg = err?.userMessage ?? err?.response?.data?.message ?? 'Save failed';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const removeTemplate = async (t) => {
        if (!window.confirm(`Delete template "${t.name}"?`)) return;
        try {
            await axiosInstance.delete(`/estimate-templates/${t.id}`);
            toast.success('Template deleted');
            await reload();
        } catch { /* toasted */ }
    };

    // ── Bundle editor handlers ──────────────────────────────────────────
    const openNewBundle = () => setEditingBundle({
        name: '',
        description: '',
        items: [blankItem()],
    });

    const openEditBundle = (b) => setEditingBundle({
        id: b.id,
        name: b.name ?? '',
        description: b.description ?? '',
        items: Array.isArray(b.items) && b.items.length
            ? b.items.map((i) => ({
                name: i.name ?? '',
                qty: Number(i.qty) || 0,
                unit: i.unit ?? 'EA',
                price: Number(i.price) || 0,
            }))
            : [blankItem()],
    });

    const saveBundle = async () => {
        if (!editingBundle?.name?.trim()) {
            toast.error('Bundle name is required');
            return;
        }
        const cleaned = {
            ...editingBundle,
            name: editingBundle.name.trim(),
            description: editingBundle.description?.trim() || null,
            items: (editingBundle.items || []).filter((i) => i.name?.trim()),
        };
        if (!cleaned.items.length) {
            toast.error('Add at least one item');
            return;
        }
        setSaving(true);
        try {
            await axiosInstance.post('/estimate-bundles', cleaned);
            toast.success('Bundle saved');
            setEditingBundle(null);
            await reload();
        } catch (err) {
            const msg = err?.userMessage ?? err?.response?.data?.message ?? 'Save failed';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const removeBundle = async (b) => {
        if (!window.confirm(`Delete bundle "${b.name}"?`)) return;
        try {
            await axiosInstance.delete(`/estimate-bundles/${b.id}`);
            toast.success('Bundle deleted');
            await reload();
        } catch { /* toasted */ }
    };

    // ── Render ──────────────────────────────────────────────────────────
    const list = tab === 'templates' ? templates : bundles;

    return (
        <div className="tpl-page">
            <div className="tpl-header">
                <div>
                    <h1>Templates &amp; Bundles</h1>
                    <div className="sub">
                        Save common scopes (templates) or item groups (bundles) and apply
                        them to any estimate in one click.
                    </div>
                </div>
                <a href="/dashboard/estimation" className="tpl-btn ghost" style={{ textDecoration: 'none' }}>
                    ← Back to Estimation
                </a>
            </div>

            <div className="tpl-tabs">
                <button
                    className={`tpl-tab ${tab === 'templates' ? 'active' : ''}`}
                    onClick={() => setTab('templates')}
                >Templates ({templates.length})</button>
                <button
                    className={`tpl-tab ${tab === 'bundles' ? 'active' : ''}`}
                    onClick={() => setTab('bundles')}
                >Bundles ({bundles.length})</button>
            </div>

            <div className="tpl-toolbar">
                <input
                    className="tpl-search"
                    placeholder={`Search ${tab}…`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <button
                    className="tpl-btn"
                    onClick={tab === 'templates' ? openNewTemplate : openNewBundle}
                >+ New {tab === 'templates' ? 'template' : 'bundle'}</button>
            </div>

            {loading ? (
                <div className="tpl-empty">Loading…</div>
            ) : list.length === 0 ? (
                <div className="tpl-empty">
                    <strong>No {tab} yet</strong>
                    {tab === 'templates'
                        ? 'Save a common scope from an existing estimate, or create one from scratch.'
                        : 'Bundles are groups of items frequently sold together (e.g. "Drip edge package").'}
                </div>
            ) : (
                <div className="tpl-grid">
                    {list.map((row) => (
                        <div key={row.id} className="tpl-card">
                            <h3>{row.name}</h3>
                            <div className="desc">{row.description || '—'}</div>
                            <div className="meta">
                                {tab === 'templates' && row.mode && (
                                    <span className="tpl-chip gold">{row.mode}</span>
                                )}
                                {tab === 'templates' && (
                                    <span className="tpl-chip">
                                        {Array.isArray(row.sections) ? row.sections.length : 0} sections
                                    </span>
                                )}
                                {tab === 'bundles' && (
                                    <span className="tpl-chip">
                                        {Array.isArray(row.items) ? row.items.length : 0} items
                                    </span>
                                )}
                                <span className="tpl-chip">used {row.times_used ?? 0}×</span>
                            </div>
                            <div className="actions">
                                <button
                                    onClick={() => tab === 'templates' ? openEditTemplate(row) : openEditBundle(row)}
                                >Edit</button>
                                <button
                                    className="danger"
                                    onClick={() => tab === 'templates' ? removeTemplate(row) : removeBundle(row)}
                                >Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Template editor modal ──────────────────────────────── */}
            {editingTpl && (
                <div className="tpl-modal-backdrop" onClick={() => !saving && setEditingTpl(null)}>
                    <div className="tpl-modal" onClick={(e) => e.stopPropagation()}>
                        <header>
                            <span>{editingTpl.id ? 'Edit template' : 'New template'}</span>
                            <button onClick={() => setEditingTpl(null)}>×</button>
                        </header>
                        <div className="body">
                            <label>Name</label>
                            <input
                                value={editingTpl.name}
                                onChange={(e) => setEditingTpl({ ...editingTpl, name: e.target.value })}
                                placeholder="Standard Hail Roof Replacement"
                            />
                            <label>Description (optional)</label>
                            <textarea
                                value={editingTpl.description ?? ''}
                                onChange={(e) => setEditingTpl({ ...editingTpl, description: e.target.value })}
                                placeholder="What this template covers"
                            />
                            <label>Mode</label>
                            <select
                                value={editingTpl.mode ?? ''}
                                onChange={(e) => setEditingTpl({ ...editingTpl, mode: e.target.value || null })}
                            >
                                <option value="">Any</option>
                                {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>

                            <label style={{ marginTop: 8 }}>Sections &amp; items</label>
                            {editingTpl.sections.map((sec, sIdx) => (
                                <div key={sIdx} className="tpl-section-block">
                                    <div className="head">
                                        <input
                                            placeholder="Section name (e.g. Dwelling Roof)"
                                            value={sec.name}
                                            onChange={(e) => setEditingTpl({
                                                ...editingTpl,
                                                sections: editingTpl.sections.map((s, i) =>
                                                    i === sIdx ? { ...s, name: e.target.value } : s),
                                            })}
                                        />
                                        <input
                                            placeholder="section_key (e.g. dwelling-roof)"
                                            value={sec.section_key}
                                            onChange={(e) => setEditingTpl({
                                                ...editingTpl,
                                                sections: editingTpl.sections.map((s, i) =>
                                                    i === sIdx ? { ...s, section_key: e.target.value } : s),
                                            })}
                                        />
                                        <button
                                            className="danger-btn"
                                            onClick={() => setEditingTpl({
                                                ...editingTpl,
                                                sections: editingTpl.sections.filter((_, i) => i !== sIdx),
                                            })}
                                            title="Remove section"
                                        >×</button>
                                    </div>
                                    <table className="tpl-items-table">
                                        <thead>
                                            <tr>
                                                <th>Item</th>
                                                <th className="narrow">Qty</th>
                                                <th className="narrow">Unit</th>
                                                <th className="narrow">Price</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sec.items.map((it, iIdx) => (
                                                <tr key={iIdx}>
                                                    <td>
                                                        <input
                                                            value={it.name}
                                                            placeholder="Architectural Shingles"
                                                            onChange={(e) => setEditingTpl({
                                                                ...editingTpl,
                                                                sections: editingTpl.sections.map((s, i) =>
                                                                    i === sIdx
                                                                        ? { ...s, items: s.items.map((x, j) => j === iIdx ? { ...x, name: e.target.value } : x) }
                                                                        : s),
                                                            })}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={it.qty}
                                                            onChange={(e) => setEditingTpl({
                                                                ...editingTpl,
                                                                sections: editingTpl.sections.map((s, i) =>
                                                                    i === sIdx
                                                                        ? { ...s, items: s.items.map((x, j) => j === iIdx ? { ...x, qty: e.target.value } : x) }
                                                                        : s),
                                                            })}
                                                        />
                                                    </td>
                                                    <td>
                                                        <select
                                                            value={it.unit}
                                                            onChange={(e) => setEditingTpl({
                                                                ...editingTpl,
                                                                sections: editingTpl.sections.map((s, i) =>
                                                                    i === sIdx
                                                                        ? { ...s, items: s.items.map((x, j) => j === iIdx ? { ...x, unit: e.target.value } : x) }
                                                                        : s),
                                                            })}
                                                        >
                                                            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={it.price}
                                                            onChange={(e) => setEditingTpl({
                                                                ...editingTpl,
                                                                sections: editingTpl.sections.map((s, i) =>
                                                                    i === sIdx
                                                                        ? { ...s, items: s.items.map((x, j) => j === iIdx ? { ...x, price: e.target.value } : x) }
                                                                        : s),
                                                            })}
                                                        />
                                                    </td>
                                                    <td>
                                                        <button
                                                            className="danger-btn"
                                                            onClick={() => setEditingTpl({
                                                                ...editingTpl,
                                                                sections: editingTpl.sections.map((s, i) =>
                                                                    i === sIdx
                                                                        ? { ...s, items: s.items.filter((_, j) => j !== iIdx) }
                                                                        : s),
                                                            })}
                                                        >×</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <button
                                        className="tpl-btn ghost"
                                        style={{ marginTop: 8, fontSize: 11, padding: '5px 10px' }}
                                        onClick={() => setEditingTpl({
                                            ...editingTpl,
                                            sections: editingTpl.sections.map((s, i) =>
                                                i === sIdx ? { ...s, items: [...s.items, blankItem()] } : s),
                                        })}
                                    >+ Add item</button>
                                </div>
                            ))}
                            <button
                                className="tpl-btn ghost"
                                onClick={() => setEditingTpl({
                                    ...editingTpl,
                                    sections: [...editingTpl.sections, blankSection()],
                                })}
                            >+ Add section</button>
                        </div>
                        <footer>
                            <button className="tpl-btn ghost" onClick={() => setEditingTpl(null)} disabled={saving}>Cancel</button>
                            <button className="tpl-btn" onClick={saveTemplate} disabled={saving}>
                                {saving ? 'Saving…' : 'Save template'}
                            </button>
                        </footer>
                    </div>
                </div>
            )}

            {/* ── Bundle editor modal ────────────────────────────────── */}
            {editingBundle && (
                <div className="tpl-modal-backdrop" onClick={() => !saving && setEditingBundle(null)}>
                    <div className="tpl-modal" onClick={(e) => e.stopPropagation()}>
                        <header>
                            <span>{editingBundle.id ? 'Edit bundle' : 'New bundle'}</span>
                            <button onClick={() => setEditingBundle(null)}>×</button>
                        </header>
                        <div className="body">
                            <label>Name</label>
                            <input
                                value={editingBundle.name}
                                onChange={(e) => setEditingBundle({ ...editingBundle, name: e.target.value })}
                                placeholder="Drip Edge Package"
                            />
                            <label>Description (optional)</label>
                            <textarea
                                value={editingBundle.description ?? ''}
                                onChange={(e) => setEditingBundle({ ...editingBundle, description: e.target.value })}
                            />
                            <label>Items</label>
                            <table className="tpl-items-table">
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th className="narrow">Qty</th>
                                        <th className="narrow">Unit</th>
                                        <th className="narrow">Price</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {editingBundle.items.map((it, iIdx) => (
                                        <tr key={iIdx}>
                                            <td>
                                                <input
                                                    value={it.name}
                                                    onChange={(e) => setEditingBundle({
                                                        ...editingBundle,
                                                        items: editingBundle.items.map((x, j) => j === iIdx ? { ...x, name: e.target.value } : x),
                                                    })}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={it.qty}
                                                    onChange={(e) => setEditingBundle({
                                                        ...editingBundle,
                                                        items: editingBundle.items.map((x, j) => j === iIdx ? { ...x, qty: e.target.value } : x),
                                                    })}
                                                />
                                            </td>
                                            <td>
                                                <select
                                                    value={it.unit}
                                                    onChange={(e) => setEditingBundle({
                                                        ...editingBundle,
                                                        items: editingBundle.items.map((x, j) => j === iIdx ? { ...x, unit: e.target.value } : x),
                                                    })}
                                                >
                                                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                                                </select>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={it.price}
                                                    onChange={(e) => setEditingBundle({
                                                        ...editingBundle,
                                                        items: editingBundle.items.map((x, j) => j === iIdx ? { ...x, price: e.target.value } : x),
                                                    })}
                                                />
                                            </td>
                                            <td>
                                                <button
                                                    className="danger-btn"
                                                    onClick={() => setEditingBundle({
                                                        ...editingBundle,
                                                        items: editingBundle.items.filter((_, j) => j !== iIdx),
                                                    })}
                                                >×</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button
                                className="tpl-btn ghost"
                                style={{ marginTop: 8, fontSize: 11, padding: '5px 10px' }}
                                onClick={() => setEditingBundle({
                                    ...editingBundle,
                                    items: [...editingBundle.items, blankItem()],
                                })}
                            >+ Add item</button>
                        </div>
                        <footer>
                            <button className="tpl-btn ghost" onClick={() => setEditingBundle(null)} disabled={saving}>Cancel</button>
                            <button className="tpl-btn" onClick={saveBundle} disabled={saving}>
                                {saving ? 'Saving…' : 'Save bundle'}
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Templates;
