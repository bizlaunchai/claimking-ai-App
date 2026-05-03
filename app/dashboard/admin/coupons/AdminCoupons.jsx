'use client';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
    Plus, X, Loader2, Edit3, Trash2, Ticket, Percent, DollarSign,
    Calendar, Users as UsersIcon, Hash, ToggleRight, Search, Sparkles, Power,
} from 'lucide-react';
import axiosInstance from '../../../../lib/axiosInstance.js';

const fmtMoney = (cents) =>
    `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const blank = {
    code: '',
    description: '',
    discountType: 'percent',
    discountValue: 10,
    maxRedemptions: '',
    validFrom: '',
    validUntil: '',
    planId: '',
    isUserRestricted: false,
    perUserLimit: 1,
    isActive: true,
    userIds: [],
};

export default function AdminCoupons() {
    const [coupons, setCoupons] = useState([]);
    const [plans, setPlans] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editor, setEditor] = useState(null);
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState(null);

    const refresh = async () => {
        // Run in parallel but handle each independently so one failure
        // doesn't blank out the others (e.g. plans should still load even
        // if the users endpoint is slow or the SQL migration isn't applied).
        const results = await Promise.allSettled([
            axiosInstance.get('/coupons/admin/all'),
            axiosInstance.get('/plans/admin/all'),
            axiosInstance.get('/credits/admin/users', { params: { limit: 200 } }),
        ]);

        const [coupRes, planRes, userRes] = results;

        if (coupRes.status === 'fulfilled') {
            setCoupons(coupRes.value.data || []);
        } else {
            toast.error(coupRes.reason?.response?.data?.message || 'Failed to load coupons (run the SQL migration?)');
        }

        if (planRes.status === 'fulfilled') {
            setPlans(planRes.value.data || []);
        } else {
            toast.error(planRes.reason?.response?.data?.message || 'Failed to load plans');
        }

        if (userRes.status === 'fulfilled') {
            setUsers(userRes.value?.data?.users || []);
        } else {
            toast.error(userRes.reason?.response?.data?.message || 'Failed to load users');
        }

        setLoading(false);
    };

    useEffect(() => { refresh(); }, []);

    const openCreate = () => setEditor({ mode: 'create', form: { ...blank } });
    const openEdit = (c) => setEditor({
        mode: 'edit',
        coupon: c,
        form: {
            code: c.code,
            description: c.description || '',
            discountType: c.discount_type,
            discountValue: c.discount_type === 'amount' ? (c.discount_value / 100).toFixed(2) : c.discount_value,
            maxRedemptions: c.max_redemptions ?? '',
            validFrom: c.valid_from ? c.valid_from.slice(0, 10) : '',
            validUntil: c.valid_until ? c.valid_until.slice(0, 10) : '',
            planId: c.plan_id || '',
            isUserRestricted: !!c.is_user_restricted,
            perUserLimit: c.per_user_limit ?? 1,
            isActive: !!c.is_active,
            userIds: (c.allowed_users || []).map((u) => u.user_id),
        },
    });

    const closeEditor = () => { if (!saving) setEditor(null); };
    const updateForm = (patch) => setEditor((p) => p && { ...p, form: { ...p.form, ...patch } });

    const validateForm = (f) => {
        if (!f.code?.trim()) return 'Code is required';
        const code = f.code.trim().toUpperCase();
        if (code.length < 3) return 'Code must be at least 3 characters';
        if (code.length > 64) return 'Code must be at most 64 characters';
        if (!/^[A-Z0-9_-]+$/.test(code)) return 'Code can only contain A–Z, 0–9, dash and underscore';

        if (!f.discountType) return 'Pick a discount type';
        const valueNum = Number(f.discountValue);
        if (!Number.isFinite(valueNum) || valueNum < 0) return 'Discount value must be ≥ 0';
        if (f.discountType === 'percent') {
            if (!Number.isInteger(valueNum)) return 'Percent must be a whole number';
            if (valueNum > 100) return 'Percent cannot exceed 100';
            if (valueNum === 0) return 'Percent must be > 0 (or pick fixed amount)';
        }
        if (f.discountType === 'amount' && valueNum === 0) return 'Amount must be > 0';

        if (f.maxRedemptions !== '' && f.maxRedemptions != null) {
            const n = Number(f.maxRedemptions);
            if (!Number.isInteger(n) || n < 1) return 'Lifetime limit must be a positive whole number (or empty for unlimited)';
        }

        const perUser = Number(f.perUserLimit);
        if (!Number.isInteger(perUser) || perUser < 1) return 'Per-user limit must be ≥ 1';

        if (f.validFrom && f.validUntil) {
            if (new Date(f.validFrom) >= new Date(f.validUntil)) {
                return 'Valid-from date must be before valid-until date';
            }
        }
        if (f.validUntil) {
            const end = new Date(f.validUntil);
            // tolerate today as end-of-day; only block clearly past dates
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            if (end < todayStart && editor.mode === 'create') {
                return 'Valid-until cannot be in the past';
            }
        }

        if (f.isUserRestricted && (!f.userIds || f.userIds.length === 0)) {
            return 'Pick at least one user, or untick "Restrict to specific users"';
        }
        return null;
    };

    const save = async () => {
        const f = editor.form;
        const err = validateForm(f);
        if (err) { toast.error(err); return; }

        const code = f.code.trim().toUpperCase();
        const valueNum = Number(f.discountValue);

        const payload = {
            code,
            description: f.description?.trim() || undefined,
            discountType: f.discountType,
            discountValue: f.discountType === 'amount'
                ? Math.round(valueNum * 100)
                : Math.floor(valueNum),
            maxRedemptions: f.maxRedemptions !== '' && f.maxRedemptions != null
                ? Number(f.maxRedemptions)
                : null,
            validFrom: f.validFrom ? new Date(f.validFrom).toISOString() : null,
            validUntil: f.validUntil ? new Date(f.validUntil).toISOString() : null,
            planId: f.planId || null,
            isUserRestricted: !!f.isUserRestricted,
            perUserLimit: Number(f.perUserLimit) || 1,
            isActive: !!f.isActive,
            userIds: f.isUserRestricted ? f.userIds : [],
        };

        setSaving(true);
        try {
            if (editor.mode === 'create') {
                // The create DTO rejects nullable values for some optional
                // fields, so strip nulls before sending.
                const createPayload = Object.fromEntries(
                    Object.entries(payload).filter(([, v]) => v !== null),
                );
                await axiosInstance.post('/coupons/admin', createPayload);
                toast.success('Coupon created');
            } else {
                await axiosInstance.patch(`/coupons/admin/${editor.coupon.id}`, payload);
                toast.success('Coupon updated');
            }
            setEditor(null);
            await refresh();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (c) => {
        setBusyId(`toggle-${c.id}`);
        try {
            await axiosInstance.patch(`/coupons/admin/${c.id}`, { isActive: !c.is_active });
            toast.success(c.is_active ? 'Coupon disabled' : 'Coupon enabled');
            await refresh();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to toggle');
        } finally {
            setBusyId(null);
        }
    };

    const remove = async (c) => {
        if (!confirm(`Delete coupon "${c.code}"? Past redemptions will remain in the audit log.`)) return;
        setBusyId(`del-${c.id}`);
        try {
            await axiosInstance.delete(`/coupons/admin/${c.id}`);
            toast.success('Coupon deleted');
            await refresh();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Delete failed');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#111827' }}>Coupons</h1>
                    <p style={{ margin: '6px 0 0', fontSize: 14, color: '#6b7280' }}>
                        Create discount codes — percent or fixed amount, with redemption limits, date validity, plan scope and per-user assignment.
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#0891b2', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                >
                    <Plus size={16} /> New Coupon
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                    <Loader2 size={28} style={{ color: '#0891b2', animation: 'spin 1s linear infinite' }} />
                </div>
            ) : coupons.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14 }}>
                    <Sparkles size={32} style={{ color: '#9ca3af', marginBottom: 10 }} />
                    <div style={{ fontWeight: 600, color: '#111827', fontSize: 15, marginBottom: 4 }}>No coupons yet</div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>Create your first coupon to offer discounts.</div>
                </div>
            ) : (
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                <th style={th}>Code</th>
                                <th style={th}>Discount</th>
                                <th style={th}>Plan scope</th>
                                <th style={th}>Validity</th>
                                <th style={th}>Usage</th>
                                <th style={th}>Users</th>
                                <th style={th}>Status</th>
                                <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {coupons.map((c) => {
                                const expired = c.valid_until && new Date(c.valid_until) < new Date();
                                const exhausted = c.max_redemptions != null && c.times_redeemed >= c.max_redemptions;
                                const status = !c.is_active
                                    ? { label: 'Disabled', color: '#6b7280', bg: '#f3f4f6' }
                                    : expired
                                    ? { label: 'Expired', color: '#b91c1c', bg: '#fef2f2' }
                                    : exhausted
                                    ? { label: 'Exhausted', color: '#b91c1c', bg: '#fef2f2' }
                                    : { label: 'Active', color: '#047857', bg: '#ecfdf5' };
                                return (
                                    <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={td}>
                                            <div style={{ fontWeight: 700, color: '#111827', fontFamily: 'monospace' }}>{c.code}</div>
                                            {c.description && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{c.description}</div>}
                                        </td>
                                        <td style={td}>
                                            {c.discount_type === 'percent' ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#0891b2', fontWeight: 600 }}>
                                                    <Percent size={12} /> {c.discount_value}%
                                                </span>
                                            ) : (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#0891b2', fontWeight: 600 }}>
                                                    <DollarSign size={12} /> {fmtMoney(c.discount_value)}
                                                </span>
                                            )}
                                        </td>
                                        <td style={td}>
                                            {c.plan ? (
                                                <span style={{ fontSize: 13 }}>{c.plan.name}</span>
                                            ) : (
                                                <span style={{ fontSize: 12, color: '#6b7280' }}>Any plan</span>
                                            )}
                                        </td>
                                        <td style={td}>
                                            <div style={{ fontSize: 12, color: '#4b5563' }}>
                                                {c.valid_from || c.valid_until ? (
                                                    <>
                                                        {fmtDate(c.valid_from)} → {fmtDate(c.valid_until)}
                                                    </>
                                                ) : (
                                                    <span style={{ color: '#9ca3af' }}>No limit</span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={td}>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>
                                                {c.times_redeemed}
                                                <span style={{ color: '#9ca3af', fontWeight: 400 }}> / {c.max_redemptions ?? '∞'}</span>
                                            </div>
                                            <div style={{ fontSize: 11, color: '#6b7280' }}>
                                                Per user: {c.per_user_limit}
                                            </div>
                                        </td>
                                        <td style={td}>
                                            {c.is_user_restricted ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>
                                                    <UsersIcon size={12} /> {(c.allowed_users || []).length} assigned
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: 12, color: '#6b7280' }}>Open to all</span>
                                            )}
                                        </td>
                                        <td style={td}>
                                            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.04, background: status.bg, color: status.color }}>
                                                {status.label}
                                            </span>
                                        </td>
                                        <td style={{ ...td, textAlign: 'right' }}>
                                            <div style={{ display: 'inline-flex', gap: 6 }}>
                                                <button style={btnIcon('#0891b2')} title="Edit" onClick={() => openEdit(c)}>
                                                    <Edit3 size={14} />
                                                </button>
                                                <button
                                                    style={btnIcon(c.is_active ? '#b45309' : '#047857')}
                                                    title={c.is_active ? 'Disable' : 'Enable'}
                                                    disabled={busyId === `toggle-${c.id}`}
                                                    onClick={() => toggleActive(c)}
                                                >
                                                    {busyId === `toggle-${c.id}` ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Power size={14} />}
                                                </button>
                                                <button
                                                    style={btnIcon('#dc2626')}
                                                    title="Delete"
                                                    disabled={busyId === `del-${c.id}`}
                                                    onClick={() => remove(c)}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
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
                <CouponEditor
                    editor={editor}
                    saving={saving}
                    plans={plans}
                    users={users}
                    onClose={closeEditor}
                    onSave={save}
                    onChange={updateForm}
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

function CouponEditor({ editor, saving, plans, users, onClose, onSave, onChange }) {
    const f = editor.form;
    const [userQuery, setUserQuery] = useState('');

    const filteredUsers = useMemo(() => {
        const q = userQuery.trim().toLowerCase();
        if (!q) return users.slice(0, 50);
        return users.filter((u) =>
            (u.email || '').toLowerCase().includes(q) ||
            (u.full_name || '').toLowerCase().includes(q)
        ).slice(0, 50);
    }, [users, userQuery]);

    const toggleUser = (uid) => {
        const has = f.userIds.includes(uid);
        onChange({ userIds: has ? f.userIds.filter((x) => x !== uid) : [...f.userIds, uid] });
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(17, 24, 39, 0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20,
            }}
        >
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, maxWidth: 640, width: '100%', maxHeight: '92vh', overflow: 'auto' }}>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Ticket size={18} color="#0891b2" />
                    <span style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>
                        {editor.mode === 'create' ? 'New Coupon' : `Edit Coupon: ${editor.coupon.code}`}
                    </span>
                    <button onClick={onClose} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <Field label="Code *">
                        <input
                            style={{ ...input, fontFamily: 'monospace', textTransform: 'uppercase' }}
                            value={f.code}
                            disabled={editor.mode === 'edit'}
                            onChange={(e) => onChange({ code: e.target.value.toUpperCase() })}
                            placeholder="WELCOME20"
                        />
                    </Field>

                    <Field label="Description">
                        <input
                            style={input}
                            value={f.description}
                            onChange={(e) => onChange({ description: e.target.value })}
                            placeholder="Internal note shown on the admin list"
                        />
                    </Field>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Field label="Discount type *">
                            <select
                                style={input}
                                value={f.discountType}
                                onChange={(e) => onChange({ discountType: e.target.value })}
                            >
                                <option value="percent">Percent (%)</option>
                                <option value="amount">Fixed amount (USD)</option>
                            </select>
                        </Field>
                        <Field label={f.discountType === 'percent' ? 'Percent off (0–100) *' : 'Amount off (USD) *'}>
                            <div style={{ position: 'relative' }}>
                                {f.discountType === 'percent'
                                    ? <Percent size={14} style={iconAbs} />
                                    : <DollarSign size={14} style={iconAbs} />}
                                <input
                                    style={{ ...input, paddingLeft: 28 }}
                                    type="number"
                                    min="0"
                                    max={f.discountType === 'percent' ? 100 : undefined}
                                    step={f.discountType === 'percent' ? 1 : 0.01}
                                    value={f.discountValue}
                                    onChange={(e) => onChange({ discountValue: e.target.value })}
                                />
                            </div>
                        </Field>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Field label="Lifetime redemption limit">
                            <div style={{ position: 'relative' }}>
                                <Hash size={14} style={iconAbs} />
                                <input
                                    style={{ ...input, paddingLeft: 28 }}
                                    type="number" min="1" step="1"
                                    value={f.maxRedemptions}
                                    onChange={(e) => onChange({ maxRedemptions: e.target.value })}
                                    placeholder="Leave blank = unlimited"
                                />
                            </div>
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                                Total times this coupon can be used across <em>all</em> users. Empty = unlimited (∞).
                            </div>
                        </Field>
                        <Field label="Per-user limit *">
                            <input
                                style={input}
                                type="number" min="1" step="1"
                                value={f.perUserLimit}
                                onChange={(e) => onChange({ perUserLimit: e.target.value })}
                            />
                        </Field>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Field label="Valid from">
                            <div style={{ position: 'relative' }}>
                                <Calendar size={14} style={iconAbs} />
                                <input
                                    style={{ ...input, paddingLeft: 28 }}
                                    type="date"
                                    value={f.validFrom}
                                    onChange={(e) => onChange({ validFrom: e.target.value })}
                                />
                            </div>
                        </Field>
                        <Field label="Valid until">
                            <div style={{ position: 'relative' }}>
                                <Calendar size={14} style={iconAbs} />
                                <input
                                    style={{ ...input, paddingLeft: 28 }}
                                    type="date"
                                    value={f.validUntil}
                                    onChange={(e) => onChange({ validUntil: e.target.value })}
                                />
                            </div>
                        </Field>
                    </div>

                    <Field label="Restrict to a specific plan">
                        <select
                            style={input}
                            value={f.planId}
                            onChange={(e) => onChange({ planId: e.target.value })}
                        >
                            <option value="">Any plan</option>
                            {plans.filter((p) => p.status !== 'archived').map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} — {fmtMoney(p.price_cents)} ({p.status})
                                </option>
                            ))}
                        </select>
                        {plans.length === 0 && (
                            <div style={{ fontSize: 11, color: '#b45309', marginTop: 4 }}>
                                No plans loaded. Create plans in <strong>Admin → Plans</strong> first.
                            </div>
                        )}
                    </Field>

                    <Field label="Active">
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38 }}>
                            <input
                                type="checkbox"
                                checked={f.isActive}
                                onChange={(e) => onChange({ isActive: e.target.checked })}
                            />
                            <span style={{ fontSize: 13, color: '#4b5563' }}>Coupon can be redeemed</span>
                        </label>
                    </Field>

                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <input
                                type="checkbox"
                                checked={f.isUserRestricted}
                                onChange={(e) => onChange({ isUserRestricted: e.target.checked })}
                            />
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                                Restrict to specific users
                            </span>
                        </label>
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
                            Tick this and pick users below — only listed users can redeem the coupon. Untick to allow any signed-in user.
                        </div>

                        {f.isUserRestricted && (
                            <>
                                <div style={{ position: 'relative', marginBottom: 8 }}>
                                    <Search size={14} style={iconAbs} />
                                    <input
                                        style={{ ...input, paddingLeft: 28 }}
                                        placeholder="Search users by email or name…"
                                        value={userQuery}
                                        onChange={(e) => setUserQuery(e.target.value)}
                                    />
                                </div>
                                <div style={{ fontSize: 12, color: '#374151', marginBottom: 6 }}>
                                    {f.userIds.length} selected
                                </div>
                                <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff' }}>
                                    {users.length === 0 ? (
                                        <div style={{ padding: 14, fontSize: 13, color: '#b45309', textAlign: 'center' }}>
                                            No users loaded. Make sure you're logged in as admin and the backend is reachable.
                                        </div>
                                    ) : filteredUsers.length === 0 ? (
                                        <div style={{ padding: 14, fontSize: 13, color: '#6b7280', textAlign: 'center' }}>No users match your search.</div>
                                    ) : (
                                        filteredUsers.map((u) => {
                                            const checked = f.userIds.includes(u.id);
                                            return (
                                                <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: checked ? '#ecfdf5' : '#fff' }}>
                                                    <input type="checkbox" checked={checked} onChange={() => toggleUser(u.id)} />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{u.full_name || u.email}</div>
                                                        {u.full_name && <div style={{ fontSize: 11, color: '#6b7280' }}>{u.email}</div>}
                                                    </div>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div style={{ padding: '14px 22px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={onClose} disabled={saving} style={{ padding: '10px 16px', background: '#fff', color: '#1f2937', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                        Cancel
                    </button>
                    <button
                        onClick={onSave}
                        disabled={saving}
                        style={{ padding: '10px 18px', background: '#0891b2', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                        {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                        {editor.mode === 'create' ? 'Create Coupon' : 'Save Changes'}
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
const iconAbs = { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' };
