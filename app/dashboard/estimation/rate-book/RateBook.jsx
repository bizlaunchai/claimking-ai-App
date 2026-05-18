'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance';
import './rate-book.css';

// Keep in sync with backend dto/rate-book.dto.ts
const CATEGORIES = [
    'shingles', 'underlayment', 'flashing', 'ventilation',
    'gutters', 'siding', 'windows', 'doors', 'labor',
    'tear_off', 'cleanup', 'permits', 'other',
];
const UNITS = ['EA', 'LF', 'SF', 'SQ', 'Bundle', 'Roll', 'HR', 'LS', 'CY'];

// Helper — keep new (unsaved) rows easy to recognise without an id collision
const newRowId = () => `new_${Math.random().toString(36).slice(2, 10)}`;

const blankRow = () => ({
    id: newRowId(),
    _new: true,
    _dirty: true,
    category: 'shingles',
    description: '',
    unit: 'SQ',
    unit_price: 0,
    labor_portion: 0,
    material_portion: 0,
    confidence_score: 1,
    is_active: true,
    notes: '',
});

const SOURCE_LABEL = {
    manual: 'Manual',
    ai_extracted: 'AI extract',
    uploaded_estimate: 'Upload',
    imported: 'Imported',
};

const RateBook = () => {
    // ── Data ─────────────────────────────────────────────────────────────
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [activeOnly, setActiveOnly] = useState(false);

    // ── Upload-to-extract modal state ───────────────────────────────────
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [extracting, setExtracting] = useState(false);
    const [preview, setPreview] = useState(null);     // { upload_id, proposed_rates, ... }
    const [selectedPreview, setSelectedPreview] = useState(new Set());
    const [acceptingPreview, setAcceptingPreview] = useState(false);

    // ────────────────────────────────────────────────────────────────────
    //   Load
    // ────────────────────────────────────────────────────────────────────
    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (categoryFilter !== 'all') params.category = categoryFilter;
            if (activeOnly) params.active_only = 'true';
            if (search.trim()) params.search = search.trim();

            const [listRes, sumRes] = await Promise.all([
                axiosInstance.get('/rate-book', { params }),
                axiosInstance.get('/rate-book/summary', { suppressErrorToast: true }),
            ]);
            setRows((listRes.data?.data ?? []).map(r => ({ ...r, _dirty: false })));
            setSummary(sumRes.data?.data ?? null);
        } catch {
            /* axiosInstance toasts */
        } finally {
            setLoading(false);
        }
    }, [search, categoryFilter, activeOnly]);

    // Debounce search so we don't hit the backend on every keystroke.
    useEffect(() => {
        const t = setTimeout(reload, 250);
        return () => clearTimeout(t);
    }, [reload]);

    // ────────────────────────────────────────────────────────────────────
    //   Row editing
    // ────────────────────────────────────────────────────────────────────
    const updateRow = (id, field, value) => {
        setRows(prev =>
            prev.map(r =>
                r.id === id ? { ...r, [field]: value, _dirty: true } : r,
            ),
        );
    };

    const addRow = () => {
        setRows(prev => [blankRow(), ...prev]);
    };

    const removeRow = async (row) => {
        if (row._new) {
            setRows(prev => prev.filter(r => r.id !== row.id));
            return;
        }
        if (!window.confirm(`Delete "${row.description}"?`)) return;
        try {
            await axiosInstance.delete(`/rate-book/${row.id}`);
            setRows(prev => prev.filter(r => r.id !== row.id));
            toast.success('Rate deleted');
        } catch {
            /* toasted */
        }
    };

    const dirtyRows = useMemo(() => rows.filter(r => r._dirty), [rows]);
    const hasDirty = dirtyRows.length > 0;

    const saveAll = async () => {
        if (!hasDirty) return;
        // Client-side validate first so we don't ping the server with junk.
        const invalid = dirtyRows.find(r =>
            !r.description?.trim() || Number(r.unit_price) < 0,
        );
        if (invalid) {
            toast.error('Every row needs a description and a non-negative price.');
            return;
        }

        setSaving(true);
        const toastId = toast.loading(`Saving ${dirtyRows.length} change${dirtyRows.length === 1 ? '' : 's'}…`);
        try {
            const payload = {
                rates: dirtyRows.map(r => ({
                    id: r._new ? undefined : r.id,
                    category: r.category,
                    description: r.description.trim(),
                    unit: r.unit,
                    unit_price: Number(r.unit_price),
                    labor_portion: Number(r.labor_portion) || 0,
                    material_portion: Number(r.material_portion) || 0,
                    is_active: !!r.is_active,
                    notes: r.notes || undefined,
                })),
            };
            const res = await axiosInstance.post('/rate-book/bulk', payload);
            const { created, updated, errors } = res.data?.data ?? {};
            if (errors?.length) {
                toast.error(`Saved with ${errors.length} errors`, { id: toastId });
            } else {
                toast.success(`Saved · ${created} new, ${updated} updated`, { id: toastId });
            }
            await reload();
        } catch {
            toast.error('Save failed', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────
    //   Upload → extract preview flow
    // ────────────────────────────────────────────────────────────────────
    const openUpload = () => {
        setUploadFile(null);
        setPreview(null);
        setSelectedPreview(new Set());
        setUploadOpen(true);
    };

    const runExtraction = async () => {
        if (!uploadFile) { toast.error('Choose a file first'); return; }
        setExtracting(true);
        const toastId = toast.loading('Reading document with AI…');
        try {
            const fd = new FormData();
            fd.append('file', uploadFile);
            fd.append('apply', 'false');
            const res = await axiosInstance.post('/rate-book/extract', fd);
            const data = res.data?.data;
            setPreview(data);
            // Default — every proposed row checked
            setSelectedPreview(new Set((data?.proposed_rates ?? []).map((_, i) => i)));
            toast.success(`Found ${data?.proposed_rates?.length ?? 0} line items`, { id: toastId });
        } catch (err) {
            const msg = err?.userMessage || err?.message || 'Extraction failed';
            toast.error(msg, { id: toastId });
        } finally {
            setExtracting(false);
        }
    };

    const togglePreviewRow = (idx) => {
        setSelectedPreview(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    const acceptPreview = async () => {
        if (!preview?.proposed_rates?.length) return;
        const selected = preview.proposed_rates.filter((_, i) => selectedPreview.has(i));
        if (!selected.length) { toast.error('Select at least one row'); return; }

        setAcceptingPreview(true);
        const toastId = toast.loading(`Adding ${selected.length} rates…`);
        try {
            await axiosInstance.post('/rate-book/bulk', {
                rates: selected.map(r => ({
                    category: r.category,
                    description: r.description,
                    unit: r.unit,
                    unit_price: r.unit_price,
                    labor_portion: r.labor_portion ?? 0,
                    material_portion: r.material_portion ?? 0,
                    notes: `From upload (extracted by AI)`,
                })),
            });
            toast.success(`Added ${selected.length} rates`, { id: toastId });
            setUploadOpen(false);
            setUploadFile(null);
            setPreview(null);
            setSelectedPreview(new Set());
            await reload();
        } catch {
            toast.error('Could not save selected rates', { id: toastId });
        } finally {
            setAcceptingPreview(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────
    //   Render helpers
    // ────────────────────────────────────────────────────────────────────
    const confidenceBadge = (score) => {
        const v = Number(score ?? 1);
        if (v >= 0.85) return { label: 'High', color: '#16a34a', bg: '#dcfce7' };
        if (v >= 0.6) return { label: 'Med',  color: '#b45309', bg: '#fef3c7' };
        return { label: 'Low', color: '#b91c1c', bg: '#fee2e2' };
    };

    const totalSummary = summary?.total ?? 0;
    const activeSummary = summary?.active ?? 0;
    const avgConf = summary?.avg_confidence;

    return (
        <div className="rate-book-page">
            {/* ─────────────── Header ─────────────── */}
            <div className="rb-header">
                <div>
                    <h1>Rate Book</h1>
                    <p className="rb-sub">
                        These are <strong>your</strong> prices — AI uses them to build estimates that match what you actually charge.
                        Upload prior estimates so AI can fill this in for you, or type rates manually.
                    </p>
                </div>
                <div className="rb-header-actions">
                    <a href="/dashboard/estimation" className="btn btn-outline">← Back to Estimates</a>
                    <button className="btn btn-outline" onClick={openUpload}>📤 Upload Prior Estimate</button>
                    <button className="btn btn-primary" onClick={addRow}>+ Add Rate</button>
                </div>
            </div>

            {/* ─────────────── Summary ─────────────── */}
            <div className="rb-summary">
                <div className="rb-stat">
                    <div className="rb-stat-num">{totalSummary}</div>
                    <div className="rb-stat-label">Total rates</div>
                </div>
                <div className="rb-stat">
                    <div className="rb-stat-num">{activeSummary}</div>
                    <div className="rb-stat-label">Active</div>
                </div>
                <div className="rb-stat">
                    <div className="rb-stat-num">{avgConf != null ? `${(avgConf * 100).toFixed(0)}%` : '—'}</div>
                    <div className="rb-stat-label">Avg confidence</div>
                </div>
                <div className="rb-stat rb-stat-cats">
                    <div className="rb-stat-label" style={{ marginBottom: 6 }}>By category</div>
                    <div className="rb-cat-chips">
                        {summary?.by_category && Object.entries(summary.by_category).map(([cat, c]) => (
                            <span key={cat} className="rb-cat-chip">
                                {cat} · {c.active}/{c.total}
                            </span>
                        ))}
                        {!summary?.by_category && <span className="rb-cat-chip empty">No categories yet</span>}
                    </div>
                </div>
            </div>

            {/* ─────────────── Toolbar ─────────────── */}
            <div className="rb-toolbar">
                <input
                    className="rb-input"
                    type="text"
                    placeholder="Search description…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select
                    className="rb-input"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                >
                    <option value="all">All categories</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <label className="rb-active-toggle">
                    <input
                        type="checkbox"
                        checked={activeOnly}
                        onChange={(e) => setActiveOnly(e.target.checked)}
                    />
                    Active only
                </label>
                <div style={{ flex: 1 }} />
                {hasDirty && (
                    <>
                        <span className="rb-dirty-count">{dirtyRows.length} unsaved</span>
                        <button
                            className="btn btn-primary"
                            onClick={saveAll}
                            disabled={saving}
                        >
                            {saving ? 'Saving…' : 'Save all'}
                        </button>
                    </>
                )}
            </div>

            {/* ─────────────── Table ─────────────── */}
            <div className="rb-table-wrap">
                {loading && rows.length === 0 ? (
                    <div className="rb-loader">Loading rates…</div>
                ) : rows.length === 0 ? (
                    <div className="rb-empty">
                        <h3>No rates yet</h3>
                        <p>Click <strong>Upload Prior Estimate</strong> to seed your book with AI, or <strong>+ Add Rate</strong> to type one in.</p>
                    </div>
                ) : (
                    <table className="rb-table">
                        <thead>
                            <tr>
                                <th style={{ width: 130 }}>Category</th>
                                <th>Description</th>
                                <th style={{ width: 80 }}>Unit</th>
                                <th style={{ width: 110 }}>Unit price</th>
                                <th style={{ width: 100 }}>Labor</th>
                                <th style={{ width: 100 }}>Material</th>
                                <th style={{ width: 90 }}>Confidence</th>
                                <th style={{ width: 90 }}>Source</th>
                                <th style={{ width: 70 }}>Active</th>
                                <th style={{ width: 60 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(row => {
                                const conf = confidenceBadge(row.confidence_score);
                                return (
                                    <tr key={row.id} className={row._dirty ? 'dirty' : ''}>
                                        <td>
                                            <select
                                                value={row.category}
                                                onChange={(e) => updateRow(row.id, 'category', e.target.value)}
                                            >
                                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={row.description}
                                                onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                                                placeholder="e.g. GAF Timberline HDZ — Charcoal"
                                            />
                                        </td>
                                        <td>
                                            <select
                                                value={row.unit}
                                                onChange={(e) => updateRow(row.id, 'unit', e.target.value)}
                                            >
                                                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                            </select>
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={row.unit_price}
                                                onChange={(e) => updateRow(row.id, 'unit_price', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={row.labor_portion ?? 0}
                                                onChange={(e) => updateRow(row.id, 'labor_portion', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={row.material_portion ?? 0}
                                                onChange={(e) => updateRow(row.id, 'material_portion', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            {row._new ? (
                                                <span className="rb-conf-chip" style={{ color: '#9ca3af' }}>New</span>
                                            ) : (
                                                <span
                                                    className="rb-conf-chip"
                                                    style={{ color: conf.color, background: conf.bg }}
                                                    title={`${(Number(row.confidence_score ?? 1) * 100).toFixed(0)}% · used ${row.times_used ?? 0}×`}
                                                >
                                                    {conf.label} · {(Number(row.confidence_score ?? 1) * 100).toFixed(0)}%
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <span className="rb-source">{SOURCE_LABEL[row.source] ?? row.source ?? '—'}</span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={!!row.is_active}
                                                onChange={(e) => updateRow(row.id, 'is_active', e.target.checked)}
                                            />
                                        </td>
                                        <td>
                                            <button
                                                className="rb-del-btn"
                                                onClick={() => removeRow(row)}
                                                title="Delete"
                                            >×</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ─────────────── Upload modal ─────────────── */}
            {uploadOpen && (
                <div className="rb-modal-overlay" onClick={() => !extracting && !acceptingPreview && setUploadOpen(false)}>
                    <div className="rb-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="rb-modal-header">
                            <h2>Upload Prior Estimate</h2>
                            <button className="rb-modal-close" onClick={() => setUploadOpen(false)} disabled={extracting || acceptingPreview}>×</button>
                        </div>
                        <div className="rb-modal-body">
                            {!preview && (
                                <>
                                    <p className="rb-modal-help">
                                        Upload an old estimate (PDF or photo). AI reads it and extracts your line-item prices into rate-book rows you can review before saving.
                                    </p>
                                    <input
                                        type="file"
                                        accept=".pdf,image/png,image/jpeg,image/heif,application/pdf"
                                        onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                                        disabled={extracting}
                                    />
                                    {uploadFile && (
                                        <div className="rb-file-info">
                                            <strong>{uploadFile.name}</strong> · {(uploadFile.size / 1024).toFixed(0)} KB
                                        </div>
                                    )}
                                    <div className="rb-modal-actions">
                                        <button className="btn btn-outline" onClick={() => setUploadOpen(false)} disabled={extracting}>Cancel</button>
                                        <button
                                            className="btn btn-primary"
                                            onClick={runExtraction}
                                            disabled={!uploadFile || extracting}
                                        >
                                            {extracting ? 'Extracting…' : '✨ Extract with AI'}
                                        </button>
                                    </div>
                                </>
                            )}

                            {preview && (
                                <>
                                    <div className="rb-preview-header">
                                        <strong>{preview.proposed_rates?.length ?? 0} line items</strong> extracted
                                        {preview.document_type && <span> · detected as <em>{preview.document_type}</em></span>}
                                        <span style={{ color: '#9ca3af' }}> · {preview.model_used} · {(preview.elapsed_ms / 1000).toFixed(1)}s</span>
                                    </div>
                                    <div className="rb-preview-actions">
                                        <button
                                            className="rb-select-all"
                                            onClick={() => {
                                                if (selectedPreview.size === preview.proposed_rates.length) {
                                                    setSelectedPreview(new Set());
                                                } else {
                                                    setSelectedPreview(new Set(preview.proposed_rates.map((_, i) => i)));
                                                }
                                            }}
                                        >
                                            {selectedPreview.size === preview.proposed_rates.length ? 'Unselect all' : 'Select all'}
                                        </button>
                                        <span style={{ color: '#6b7280', fontSize: 13 }}>
                                            {selectedPreview.size} of {preview.proposed_rates.length} selected
                                        </span>
                                    </div>
                                    <div className="rb-preview-table-wrap">
                                        <table className="rb-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: 40 }}></th>
                                                    <th style={{ width: 110 }}>Category</th>
                                                    <th>Description</th>
                                                    <th style={{ width: 60 }}>Unit</th>
                                                    <th style={{ width: 90 }}>Price</th>
                                                    <th style={{ width: 80 }}>Confidence</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {preview.proposed_rates.map((r, i) => (
                                                    <tr key={i} className={selectedPreview.has(i) ? 'selected' : ''}>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedPreview.has(i)}
                                                                onChange={() => togglePreviewRow(i)}
                                                            />
                                                        </td>
                                                        <td>{r.category}</td>
                                                        <td title={r.source_line || ''}>
                                                            {r.description}
                                                            {r.source_line && (
                                                                <div className="rb-source-line">{r.source_line}</div>
                                                            )}
                                                        </td>
                                                        <td>{r.unit}</td>
                                                        <td>${Number(r.unit_price).toFixed(2)}</td>
                                                        <td>{(Number(r.confidence ?? 1) * 100).toFixed(0)}%</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="rb-modal-actions">
                                        <button
                                            className="btn btn-outline"
                                            onClick={() => { setPreview(null); setUploadFile(null); }}
                                            disabled={acceptingPreview}
                                        >
                                            ← Upload different file
                                        </button>
                                        <button
                                            className="btn btn-primary"
                                            onClick={acceptPreview}
                                            disabled={acceptingPreview || selectedPreview.size === 0}
                                        >
                                            {acceptingPreview ? 'Saving…' : `Add ${selectedPreview.size} to rate book`}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RateBook;
