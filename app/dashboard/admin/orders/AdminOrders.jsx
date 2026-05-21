'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    Search, Loader2, ShoppingCart, TrendingUp, AlertCircle,
    CheckCircle2, XCircle, DollarSign, Users,
} from 'lucide-react';
import axiosInstance from '../../../../lib/axiosInstance.js';

// ── AuthedLogo ─────────────────────────────────────────────────────────────
// `companies.logo_url` stores an S3 key, not a public URL — plain <img> would
// 401. We hit the auth-gated /s3/file proxy via axiosInstance (Bearer header)
// and turn the blob into an object URL. Module-level cache so the same logo
// only loads once per session no matter how many rows reference it.
const _logoCache = new Map();
const _logoInflight = new Map();
function AuthedLogo({ logoKey, initials, fallbackBg = '#eef2ff', fallbackFg = '#4f46e5' }) {
    const isLocal = typeof logoKey === 'string' && (logoKey.startsWith('http://') || logoKey.startsWith('https://') || logoKey.startsWith('blob:') || logoKey.startsWith('data:'));
    const [url, setUrl] = useState(() => {
        if (!logoKey) return null;
        if (isLocal) return logoKey;
        return _logoCache.get(logoKey) ?? null;
    });
    const [errored, setErrored] = useState(false);

    useEffect(() => {
        if (!logoKey || isLocal) { setUrl(logoKey || null); return; }
        const cached = _logoCache.get(logoKey);
        if (cached) { setUrl(cached); setErrored(false); return; }
        let active = true;
        setErrored(false);
        let p = _logoInflight.get(logoKey);
        if (!p) {
            p = axiosInstance
                .get(`/s3/file?key=${encodeURIComponent(logoKey)}`, { responseType: 'blob', suppressErrorToast: true })
                .then((res) => {
                    const blobUrl = URL.createObjectURL(res.data);
                    _logoCache.set(logoKey, blobUrl);
                    _logoInflight.delete(logoKey);
                    return blobUrl;
                })
                .catch((e) => { _logoInflight.delete(logoKey); throw e; });
            _logoInflight.set(logoKey, p);
        }
        p.then((b) => { if (active) setUrl(b); }).catch(() => { if (active) setErrored(true); });
        return () => { active = false; };
    }, [logoKey, isLocal]);

    const dim = { width: 44, height: 44, borderRadius: '50%', flexShrink: 0, border: '1px solid #e5e7eb' };
    if (logoKey && !errored && url) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={url} alt="" style={{ ...dim, objectFit: 'cover', background: '#fff' }} />;
    }
    return (
        <div style={{ ...dim, background: fallbackBg, color: fallbackFg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
            {initials || '—'}
        </div>
    );
}

const STATUS_FILTERS = [
    { value: '',           label: 'All' },
    { value: 'active',     label: 'Active' },
    { value: 'trialing',   label: 'Trialing' },
    { value: 'past_due',   label: 'Past Due' },
    { value: 'canceled',   label: 'Canceled' },
    { value: 'incomplete', label: 'Incomplete' },
    { value: 'unpaid',     label: 'Unpaid' },
];

const STATUS_BG = {
    active:     { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
    trialing:   { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    past_due:   { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
    canceled:   { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' },
    incomplete: { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' },
    unpaid:     { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
    paused:     { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' },
};

const fmtMoney = (cents) =>
    `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (iso) =>
    iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function AdminOrders() {
    const [rows, setRows] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('');
    const [search, setSearch] = useState('');

    const refresh = async (opts = {}) => {
        setLoading(true);
        const filterStatus = opts.status !== undefined ? opts.status : status;
        const filterSearch = opts.search !== undefined ? opts.search : search;
        try {
            const params = { limit: 200 };
            if (filterStatus) params.status = filterStatus;
            if (filterSearch) params.search = filterSearch;
            const [{ data }, mRes] = await Promise.all([
                axiosInstance.get('/subscriptions/admin/all', { params }),
                axiosInstance.get('/subscriptions/admin/metrics').catch(() => ({ data: null })),
            ]);
            setRows(data?.subscriptions || []);
            setMetrics(mRes?.data || null);
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refresh(); }, []);

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <ShoppingCart size={22} color="#4f46e5" />
                <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#111827' }}>Orders & Subscriptions</h1>
            </div>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6b7280' }}>
                Every customer subscription, with current plan, status, and revenue.
            </p>

            {/* Metrics */}
            {metrics && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
                    <Metric icon={TrendingUp} color="#4f46e5" label="MRR" value={fmtMoney(metrics.mrr_cents)} />
                    <Metric icon={CheckCircle2} color="#047857" label="Active" value={metrics.active_count.toLocaleString()} />
                    <Metric icon={AlertCircle}  color="#b45309" label="Past Due" value={metrics.past_due_count.toLocaleString()} />
                    <Metric icon={XCircle}      color="#6b7280" label="Canceled" value={metrics.canceled_count.toLocaleString()} />
                    <Metric icon={Users}        color="#0d9488" label="Total" value={metrics.total_subscriptions.toLocaleString()} />
                </div>
            )}

            {/* Filters */}
            <form
                onSubmit={(e) => { e.preventDefault(); refresh({ search }); }}
                style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}
            >
                <div style={{ position: 'relative', flex: 1, minWidth: 240, maxWidth: 380 }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by user email, name, or plan…"
                        style={{ width: '100%', padding: '10px 12px 10px 32px', background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14 }}
                    />
                </div>
                <select
                    value={status}
                    onChange={(e) => { setStatus(e.target.value); refresh({ status: e.target.value }); }}
                    style={{ padding: '10px 12px', background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}
                >
                    {STATUS_FILTERS.map((f) => (
                        <option key={f.value || 'all'} value={f.value}>{f.label}</option>
                    ))}
                </select>
                <button type="submit" style={{ padding: '10px 16px', background: '#1f2937', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                    Search
                </button>
            </form>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                    <Loader2 size={28} style={{ color: '#4f46e5', animation: 'spin 1s linear infinite' }} />
                </div>
            ) : rows.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, color: '#6b7280' }}>
                    No subscriptions match your filters.
                </div>
            ) : (
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                        <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                <th style={th}>User</th>
                                <th style={th}>Plan</th>
                                <th style={th}>Price</th>
                                <th style={th}>Status</th>
                                <th style={th}>Period</th>
                                <th style={th}>Started</th>
                                <th style={th}>Stripe</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((s) => {
                                const u = Array.isArray(s.owner) ? s.owner[0] : (s.owner ?? (Array.isArray(s.user) ? s.user[0] : s.user));
                                const c = Array.isArray(s.company) ? s.company[0] : s.company;
                                const p = Array.isArray(s.plan) ? s.plan[0] : s.plan;
                                const sty = STATUS_BG[s.status] || STATUS_BG.canceled;
                                const displayName =
                                    u?.full_name ||
                                    [u?.first_name, u?.last_name].filter(Boolean).join(' ').trim() ||
                                    '—';
                                const initials = (displayName !== '—' ? displayName : (u?.email ?? '?'))
                                    .split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
                                const logo = c?.logo_url || null;
                                return (
                                    <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={td}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                                <AuthedLogo logoKey={logo} initials={initials} />
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontWeight: 600, color: '#111827', fontSize: 15 }}>{displayName}</div>
                                                    <div style={{ fontSize: 13, color: '#6b7280' }}>{u?.email || '—'}</div>
                                                    {c?.name && (
                                                        <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>{c.name}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={td}>
                                            {p ? (
                                                <div>
                                                    <div style={{ fontWeight: 500, color: '#111827', fontSize: 15 }}>{p.name}</div>
                                                    <div style={{ fontSize: 13, color: '#6b7280' }}>{p.monthly_credits.toLocaleString()} cr/mo</div>
                                                </div>
                                            ) : <span style={{ color: '#9ca3af', fontSize: 14 }}>—</span>}
                                        </td>
                                        <td style={td}>{p ? fmtMoney(p.price_cents) : '—'}</td>
                                        <td style={td}>
                                            <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.04, background: sty.bg, color: sty.color, border: `1px solid ${sty.border}` }}>
                                                {s.status}
                                            </span>
                                            {s.cancel_at_period_end && (
                                                <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 4 }}>
                                                    cancels at period end
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ ...td, fontSize: 14 }}>
                                            {s.current_period_start && s.current_period_end ? (
                                                <>
                                                    <div>{fmtDate(s.current_period_start)}</div>
                                                    <div style={{ color: '#6b7280' }}>→ {fmtDate(s.current_period_end)}</div>
                                                </>
                                            ) : '—'}
                                        </td>
                                        <td style={{ ...td, fontSize: 14, color: '#6b7280' }}>{fmtDate(s.created_at)}</td>
                                        <td style={td}>
                                            {s.stripe_subscription_id ? (
                                                <a
                                                    href={`https://dashboard.stripe.com/${process.env.NODE_ENV === 'production' ? '' : 'test/'}subscriptions/${s.stripe_subscription_id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title={s.stripe_subscription_id}
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                                        padding: '6px 12px',
                                                        background: '#4f46e5', color: '#fff',
                                                        borderRadius: 6, fontSize: 13, fontWeight: 600,
                                                        textDecoration: 'none', whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    View
                                                </a>
                                            ) : <span style={{ fontSize: 13, color: '#9ca3af' }}>—</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function Metric({ icon: Icon, label, value, color }) {
    return (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 36, height: 36, background: `${color}15`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color={color} />
            </div>
            <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.05 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{value}</div>
            </div>
        </div>
    );
}

const th = { padding: '14px 18px', textAlign: 'left', fontSize: 13, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.04 };
const td = { padding: '16px 18px', fontSize: 15, color: '#1f2937', verticalAlign: 'top' };
