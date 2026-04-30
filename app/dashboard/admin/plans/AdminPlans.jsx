'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    Plus, X, Loader2, Edit3, Archive, Trash2, CheckCircle2,
    Coins, DollarSign, Star, FileText, AlertCircle, Sparkles,
} from 'lucide-react';
import axiosInstance from '../../../../lib/axiosInstance.js';

const STATUS_STYLE = {
    draft:    { label: 'Draft',    bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' },
    active:   { label: 'Active',   bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
    archived: { label: 'Archived', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
};

const fmtMoney = (cents) =>
    `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const blank = {
    name: '', description: '', priceDollars: '', monthlyCredits: '',
    features: [''], isPopular: false, sortOrder: 0,
};

export default function AdminPlans() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editor, setEditor] = useState(null); // null | { mode: 'create' | 'edit', plan?: any, form: {} }
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState(null); // string-id-action

    const refresh = async () => {
        try {
            const { data } = await axiosInstance.get('/plans/admin/all');
            setPlans(data || []);
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to load plans');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refresh(); }, []);

    const openCreate = () => setEditor({ mode: 'create', form: { ...blank } });

    const openEdit = (p) => setEditor({
        mode: 'edit',
        plan: p,
        form: {
            name: p.name || '',
            description: p.description || '',
            priceDollars: (p.price_cents / 100).toFixed(2),
            monthlyCredits: String(p.monthly_credits ?? ''),
            features: Array.isArray(p.features) && p.features.length ? p.features : [''],
            isPopular: !!p.is_popular,
            sortOrder: p.sort_order ?? 0,
        },
    });

    const closeEditor = () => { if (!saving) setEditor(null); };

    const updateForm = (patch) => setEditor((prev) => prev && { ...prev, form: { ...prev.form, ...patch } });

    const updateFeature = (i, v) => {
        const f = [...editor.form.features];
        f[i] = v;
        updateForm({ features: f });
    };
    const addFeature = () => updateForm({ features: [...editor.form.features, ''] });
    const removeFeature = (i) => updateForm({ features: editor.form.features.filter((_, idx) => idx !== i) });

    const validate = (f) => {
        if (!f.name?.trim()) return 'Name is required';
        const price = Number(f.priceDollars);
        if (!Number.isFinite(price) || price < 0) return 'Price must be ≥ 0';
        const credits = Number(f.monthlyCredits);
        if (!Number.isInteger(credits) || credits < 0) return 'Monthly credits must be a non-negative integer';
        return null;
    };

    const save = async () => {
        const f = editor.form;
        const err = validate(f);
        if (err) { toast.error(err); return; }

        const payload = {
            name: f.name.trim(),
            description: f.description?.trim() || undefined,
            priceCents: Math.round(Number(f.priceDollars) * 100),
            monthlyCredits: Number(f.monthlyCredits),
            features: f.features.map((x) => x.trim()).filter(Boolean),
            isPopular: !!f.isPopular,
            sortOrder: Number(f.sortOrder) || 0,
        };

        setSaving(true);
        try {
            if (editor.mode === 'create') {
                await axiosInstance.post('/plans', payload);
                toast.success('Draft plan created');
            } else {
                await axiosInstance.patch(`/plans/${editor.plan.id}`, payload);
                toast.success('Plan updated');
            }
            setEditor(null);
            await refresh();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const activate = async (p) => {
        if (!confirm(`Activate "${p.name}"?\nThis will create the Stripe Product/Price and make the plan visible to users.`)) return;
        setBusyId(`activate-${p.id}`);
        try {
            await axiosInstance.post(`/plans/${p.id}/activate`);
            toast.success('Plan activated');
            await refresh();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Activation failed');
        } finally {
            setBusyId(null);
        }
    };

    const archive = async (p) => {
        if (!confirm(`Archive "${p.name}"?\nUsers cannot subscribe to archived plans, but existing subscribers keep their plan.`)) return;
        setBusyId(`archive-${p.id}`);
        try {
            await axiosInstance.post(`/plans/${p.id}/archive`);
            toast.success('Plan archived');
            await refresh();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Archive failed');
        } finally {
            setBusyId(null);
        }
    };

    const remove = async (p) => {
        if (!confirm(`Permanently delete draft plan "${p.name}"? This cannot be undone.`)) return;
        setBusyId(`delete-${p.id}`);
        try {
            await axiosInstance.delete(`/plans/${p.id}`);
            toast.success('Draft deleted');
            await refresh();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Delete failed');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#111827' }}>Plans</h1>
                    <p style={{ margin: '6px 0 0', fontSize: 14, color: '#6b7280' }}>
                        Drafts can be edited freely. Once activated, the plan is published in Stripe and shown to users.
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                >
                    <Plus size={16} /> New Plan
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                    <Loader2 size={28} style={{ color: '#4f46e5', animation: 'spin 1s linear infinite' }} />
                </div>
            ) : plans.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14 }}>
                    <Sparkles size={32} style={{ color: '#9ca3af', marginBottom: 10 }} />
                    <div style={{ fontWeight: 600, color: '#111827', fontSize: 15, marginBottom: 4 }}>No plans yet</div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>Create your first plan to get started.</div>
                </div>
            ) : (
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                <th style={th}>Plan</th>
                                <th style={th}>Price</th>
                                <th style={th}>Credits / mo</th>
                                <th style={th}>Status</th>
                                <th style={th}>Stripe</th>
                                <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {plans.map((p) => {
                                const sty = STATUS_STYLE[p.status] || STATUS_STYLE.draft;
                                return (
                                    <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={td}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontWeight: 600, color: '#111827' }}>{p.name}</span>
                                                {p.is_popular && (
                                                    <span title="Popular" style={{ display: 'inline-flex', alignItems: 'center', color: '#f59e0b' }}>
                                                        <Star size={14} fill="#f59e0b" />
                                                    </span>
                                                )}
                                            </div>
                                            {p.description && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{p.description}</div>}
                                        </td>
                                        <td style={td}>{fmtMoney(p.price_cents)}</td>
                                        <td style={td}>{p.monthly_credits.toLocaleString()}</td>
                                        <td style={td}>
                                            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.04, background: sty.bg, color: sty.color, border: `1px solid ${sty.border}` }}>
                                                {sty.label}
                                            </span>
                                        </td>
                                        <td style={td}>
                                            {p.stripe_price_id ? (
                                                <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }} title={p.stripe_price_id}>
                                                    {p.stripe_price_id.slice(0, 12)}…
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: 12, color: '#9ca3af' }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ ...td, textAlign: 'right' }}>
                                            <div style={{ display: 'inline-flex', gap: 6 }}>
                                                {p.status === 'draft' && (
                                                    <>
                                                        <button style={btnIcon('#4f46e5')} title="Edit" onClick={() => openEdit(p)}>
                                                            <Edit3 size={14} />
                                                        </button>
                                                        <button
                                                            style={btnIcon('#047857')}
                                                            title="Activate"
                                                            disabled={busyId === `activate-${p.id}`}
                                                            onClick={() => activate(p)}
                                                        >
                                                            {busyId === `activate-${p.id}` ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={14} />}
                                                        </button>
                                                        <button
                                                            style={btnIcon('#dc2626')}
                                                            title="Delete"
                                                            disabled={busyId === `delete-${p.id}`}
                                                            onClick={() => remove(p)}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </>
                                                )}
                                                {p.status === 'active' && (
                                                    <>
                                                        <button style={btnIcon('#4f46e5')} title="Edit name/features" onClick={() => openEdit(p)}>
                                                            <Edit3 size={14} />
                                                        </button>
                                                        <button
                                                            style={btnIcon('#b91c1c')}
                                                            title="Archive"
                                                            disabled={busyId === `archive-${p.id}`}
                                                            onClick={() => archive(p)}
                                                        >
                                                            {busyId === `archive-${p.id}` ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Archive size={14} />}
                                                        </button>
                                                    </>
                                                )}
                                                {p.status === 'archived' && (
                                                    <span style={{ fontSize: 11, color: '#9ca3af' }}>—</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {editor && (
                <PlanEditor
                    editor={editor}
                    saving={saving}
                    onClose={closeEditor}
                    onSave={save}
                    onChange={updateForm}
                    onFeatureChange={updateFeature}
                    onFeatureAdd={addFeature}
                    onFeatureRemove={removeFeature}
                />
            )}
        </div>
    );
}

const th = { padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.04 };
const td = { padding: '14px 16px', fontSize: 14, color: '#1f2937', verticalAlign: 'top' };
const btnIcon = (color) => ({
    width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 6, background: `${color}10`, color, border: `1px solid ${color}30`, cursor: 'pointer',
});

function PlanEditor({ editor, saving, onClose, onSave, onChange, onFeatureChange, onFeatureAdd, onFeatureRemove }) {
    const f = editor.form;
    const isActive = editor.mode === 'edit' && editor.plan?.status === 'active';

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(17, 24, 39, 0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20,
            }}
        >
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, maxWidth: 560, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FileText size={18} color="#4f46e5" />
                    <span style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>
                        {editor.mode === 'create' ? 'New Plan (Draft)' : `Edit Plan: ${editor.plan.name}`}
                    </span>
                    <button onClick={onClose} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {isActive && (
                        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '10px 12px', borderRadius: 8, fontSize: 13, display: 'flex', gap: 8 }}>
                            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                            <span>This plan is active. Price cannot be changed — archive it and create a new plan if you need a different price.</span>
                        </div>
                    )}

                    <Field label="Plan name *">
                        <input style={input} value={f.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="e.g. Pro" />
                    </Field>

                    <Field label="Description">
                        <textarea
                            style={{ ...input, minHeight: 60, resize: 'vertical' }}
                            value={f.description}
                            onChange={(e) => onChange({ description: e.target.value })}
                            placeholder="Short tagline shown on the plan card"
                        />
                    </Field>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Field label="Price (USD / month) *">
                            <div style={{ position: 'relative' }}>
                                <DollarSign size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                <input
                                    style={{ ...input, paddingLeft: 28 }}
                                    type="number" min="0" step="0.01"
                                    value={f.priceDollars}
                                    onChange={(e) => onChange({ priceDollars: e.target.value })}
                                    disabled={isActive}
                                    placeholder="49.00"
                                />
                            </div>
                        </Field>
                        <Field label="Monthly credits *">
                            <div style={{ position: 'relative' }}>
                                <Coins size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                <input
                                    style={{ ...input, paddingLeft: 28 }}
                                    type="number" min="0" step="1"
                                    value={f.monthlyCredits}
                                    onChange={(e) => onChange({ monthlyCredits: e.target.value })}
                                    placeholder="500"
                                />
                            </div>
                        </Field>
                    </div>

                    <Field label="Features (one per row)">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {f.features.map((feat, i) => (
                                <div key={i} style={{ display: 'flex', gap: 6 }}>
                                    <input
                                        style={input}
                                        value={feat}
                                        onChange={(e) => onFeatureChange(i, e.target.value)}
                                        placeholder="e.g. Unlimited mockups"
                                    />
                                    <button onClick={() => onFeatureRemove(i)} style={btnSmall('#dc2626')}>
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                            <button onClick={onFeatureAdd} style={{ ...btnSmall('#6b7280'), alignSelf: 'flex-start' }}>
                                <Plus size={14} /> Add feature
                            </button>
                        </div>
                    </Field>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Field label="Sort order">
                            <input
                                style={input}
                                type="number"
                                value={f.sortOrder}
                                onChange={(e) => onChange({ sortOrder: e.target.value })}
                            />
                        </Field>
                        <Field label="Highlight as popular">
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38 }}>
                                <input
                                    type="checkbox"
                                    checked={f.isPopular}
                                    onChange={(e) => onChange({ isPopular: e.target.checked })}
                                />
                                <span style={{ fontSize: 13, color: '#4b5563' }}>Show "Popular" badge</span>
                            </label>
                        </Field>
                    </div>
                </div>

                <div style={{ padding: '14px 22px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={onClose} disabled={saving} style={{ padding: '10px 16px', background: '#fff', color: '#1f2937', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                        Cancel
                    </button>
                    <button
                        onClick={onSave}
                        disabled={saving}
                        style={{ padding: '10px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                        {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                        {editor.mode === 'create' ? 'Create Draft' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.05, marginBottom: 5 }}>{label}</div>
            {children}
        </div>
    );
}

const input = {
    width: '100%', padding: '10px 12px', background: '#f9fafb', border: '1.5px solid #e5e7eb',
    borderRadius: 8, fontSize: 14, color: '#111827', outline: 'none',
};
const btnSmall = (color) => ({
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px',
    background: '#fff', color, border: `1px solid ${color}30`, borderRadius: 6, fontSize: 12, cursor: 'pointer',
});
