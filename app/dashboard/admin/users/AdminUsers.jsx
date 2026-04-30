'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    Search, Loader2, Coins, Plus, Minus, X, Users as UsersIcon, ShieldCheck,
} from 'lucide-react';
import axiosInstance from '../../../../lib/axiosInstance.js';

const STATUS_BG = {
    active: { bg: '#ecfdf5', color: '#047857' },
    trialing: { bg: '#eff6ff', color: '#1d4ed8' },
    past_due: { bg: '#fffbeb', color: '#b45309' },
    canceled: { bg: '#f3f4f6', color: '#6b7280' },
    incomplete: { bg: '#f3f4f6', color: '#6b7280' },
};

export default function AdminUsers() {
    const [search, setSearch] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adjustTarget, setAdjustTarget] = useState(null);

    const refresh = async (q = search) => {
        setLoading(true);
        try {
            const { data } = await axiosInstance.get('/credits/admin/users', {
                params: q ? { search: q, limit: 100 } : { limit: 100 },
            });
            setUsers(data?.users || []);
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refresh(); }, []);

    const onSearchSubmit = (e) => {
        e.preventDefault();
        refresh(search);
    };

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <UsersIcon size={22} color="#0d9488" />
                <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#111827' }}>Users & Credits</h1>
            </div>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6b7280' }}>
                Search users, view their plan & credits, and grant or remove credits manually.
            </p>

            <form onSubmit={onSearchSubmit} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by email or name…"
                        style={{
                            width: '100%', padding: '10px 12px 10px 32px',
                            background: '#fff', border: '1.5px solid #e5e7eb',
                            borderRadius: 8, fontSize: 14, outline: 'none',
                        }}
                    />
                </div>
                <button type="submit" style={{ padding: '10px 16px', background: '#1f2937', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                    Search
                </button>
            </form>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                    <Loader2 size={28} style={{ color: '#4f46e5', animation: 'spin 1s linear infinite' }} />
                </div>
            ) : users.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, color: '#6b7280' }}>
                    No users found.
                </div>
            ) : (
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                <th style={th}>User</th>
                                <th style={th}>Role</th>
                                <th style={th}>Plan</th>
                                <th style={th}>Status</th>
                                <th style={th}>Monthly</th>
                                <th style={th}>Bonus</th>
                                <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => {
                                const bal = Array.isArray(u.balance) ? u.balance[0] : u.balance;
                                const sub = Array.isArray(u.subscription) ? u.subscription[0] : u.subscription;
                                const plan = sub?.plan;
                                const subStatus = sub?.status;
                                const subStyle = subStatus ? STATUS_BG[subStatus] : null;

                                return (
                                    <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={td}>
                                            <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{u.full_name || '—'}</div>
                                            <div style={{ fontSize: 12, color: '#6b7280' }}>{u.email}</div>
                                        </td>
                                        <td style={td}>
                                            {u.role === 'admin' ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#4f46e5' }}>
                                                    <ShieldCheck size={12} /> Admin
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: 12, color: '#6b7280' }}>User</span>
                                            )}
                                        </td>
                                        <td style={td}>
                                            {plan ? (
                                                <div style={{ fontSize: 13 }}>
                                                    <div style={{ fontWeight: 500, color: '#111827' }}>{plan.name}</div>
                                                    <div style={{ fontSize: 11, color: '#6b7280' }}>{plan.monthly_credits.toLocaleString()} cr/mo</div>
                                                </div>
                                            ) : <span style={{ fontSize: 12, color: '#9ca3af' }}>—</span>}
                                        </td>
                                        <td style={td}>
                                            {subStatus ? (
                                                <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.04, background: subStyle.bg, color: subStyle.color }}>
                                                    {subStatus}
                                                </span>
                                            ) : <span style={{ fontSize: 12, color: '#9ca3af' }}>—</span>}
                                        </td>
                                        <td style={td}>{(bal?.monthly_credits ?? 0).toLocaleString()}</td>
                                        <td style={td}>{(bal?.bonus_credits ?? 0).toLocaleString()}</td>
                                        <td style={{ ...td, textAlign: 'right' }}>
                                            <button
                                                onClick={() => setAdjustTarget({ user: u, balance: bal })}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                                            >
                                                <Coins size={12} /> Adjust
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {adjustTarget && (
                <AdjustModal
                    target={adjustTarget}
                    onClose={() => setAdjustTarget(null)}
                    onDone={() => { setAdjustTarget(null); refresh(); }}
                />
            )}
        </div>
    );
}

const th = { padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.04 };
const td = { padding: '14px 16px', fontSize: 13, color: '#1f2937', verticalAlign: 'middle' };

function AdjustModal({ target, onClose, onDone }) {
    const [direction, setDirection] = useState('add'); // 'add' | 'subtract'
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        const num = Number(amount);
        if (!Number.isInteger(num) || num <= 0) {
            toast.error('Amount must be a positive integer');
            return;
        }
        const signed = direction === 'add' ? num : -num;
        setBusy(true);
        try {
            await axiosInstance.post('/credits/admin/adjust', {
                userId: target.user.id,
                amount: signed,
                description: reason?.trim() || undefined,
            });
            toast.success(`Credits ${direction === 'add' ? 'added' : 'subtracted'}`);
            onDone();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Adjustment failed');
        } finally {
            setBusy(false);
        }
    };

    const bal = target.balance;
    const monthly = bal?.monthly_credits ?? 0;
    const bonus = bal?.bonus_credits ?? 0;
    const total = monthly + bonus;
    const num = Number(amount) || 0;
    const projected = direction === 'add' ? total + num : total - num;

    return (
        <div onClick={() => !busy && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, maxWidth: 460, width: '100%' }}>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Coins size={18} color="#4f46e5" />
                    <span style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>Adjust Credits</span>
                    <button onClick={onClose} disabled={busy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ background: '#f9fafb', padding: 12, borderRadius: 8 }}>
                        <div style={{ fontSize: 13, color: '#1f2937', fontWeight: 600 }}>{target.user.full_name || '—'}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>{target.user.email}</div>
                        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#4b5563' }}>
                            <div>Monthly: <strong>{monthly.toLocaleString()}</strong></div>
                            <div>Bonus: <strong>{bonus.toLocaleString()}</strong></div>
                            <div>Total: <strong>{total.toLocaleString()}</strong></div>
                        </div>
                    </div>

                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.05, marginBottom: 8 }}>Action</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                onClick={() => setDirection('add')}
                                style={radioBtn(direction === 'add', '#047857')}
                            >
                                <Plus size={14} /> Add (Bonus)
                            </button>
                            <button
                                onClick={() => setDirection('subtract')}
                                style={radioBtn(direction === 'subtract', '#dc2626')}
                            >
                                <Minus size={14} /> Subtract
                            </button>
                        </div>
                    </div>

                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.05, marginBottom: 5 }}>Amount</div>
                        <input
                            type="number" min="1" step="1"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="50"
                            style={{ width: '100%', padding: '10px 12px', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14 }}
                        />
                    </div>

                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.05, marginBottom: 5 }}>Reason (audit log)</div>
                        <input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Goodwill credit for billing issue"
                            style={{ width: '100%', padding: '10px 12px', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14 }}
                        />
                    </div>

                    {amount && (
                        <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', padding: 10, borderRadius: 8, fontSize: 13, color: '#3730a3' }}>
                            New total balance: <strong>{Math.max(0, projected).toLocaleString()}</strong> credits
                            {direction === 'add' && <span style={{ color: '#6b7280', marginLeft: 8 }}>(added to bonus bucket — never resets)</span>}
                        </div>
                    )}
                </div>

                <div style={{ padding: '14px 22px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={onClose} disabled={busy} style={{ padding: '10px 16px', background: '#fff', color: '#1f2937', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                        Cancel
                    </button>
                    <button onClick={submit} disabled={busy} style={{ padding: '10px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {busy && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
}

const radioBtn = (active, color) => ({
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '10px 12px',
    background: active ? `${color}15` : '#fff',
    color: active ? color : '#6b7280',
    border: `1.5px solid ${active ? color : '#e5e7eb'}`,
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.15s',
});
