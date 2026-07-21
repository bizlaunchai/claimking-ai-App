'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
    Search, Loader2, Building2, ExternalLink, Ban, PlayCircle,
    Users as UsersIcon, X,
} from 'lucide-react';
import axiosInstance from '../../../../lib/axiosInstance.js';
import Pagination from '../../../../components/ui/Pagination.jsx';
import '../../../../components/ui/responsive-table.css';
import './adminCompanies.css';

// Status pill colors — must match values in companies.status CHECK constraint.
const STATUS_BG = {
    active:    { bg: '#ecfdf5', color: '#047857', label: 'Active' },
    past_due:  { bg: '#fffbeb', color: '#b45309', label: 'Past due' },
    suspended: { bg: '#fef2f2', color: '#b91c1c', label: 'Suspended' },
    cancelled: { bg: '#f3f4f6', color: '#6b7280', label: 'Cancelled' },
};

const SUB_STATUS_BG = {
    active:     { bg: '#ecfdf5', color: '#047857' },
    trialing:   { bg: '#eff6ff', color: '#1d4ed8' },
    past_due:   { bg: '#fffbeb', color: '#b45309' },
    canceled:   { bg: '#f3f4f6', color: '#6b7280' },
    incomplete: { bg: '#f3f4f6', color: '#6b7280' },
    paused:     { bg: '#f3f4f6', color: '#6b7280' },
};

const fmtDate = (val) =>
    val ? new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function AdminCompanies() {
    const [search, setSearch]   = useState('');
    const [status, setStatus]   = useState('');
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionTarget, setActionTarget] = useState(null); // { company, mode: 'suspend' | 'unsuspend' }
    // Mirrors the backend envelope from src/common/pagination.ts
    const [meta, setMeta] = useState({ page: 1, limit: 25, total: 0, total_pages: 1 });

    const refresh = async ({ q = search, st = status, page = meta.page, limit = meta.limit } = {}) => {
        setLoading(true);
        try {
            const params = { page, limit };
            if (q?.trim())  params.search = q.trim();
            if (st)         params.status = st;
            const { data } = await axiosInstance.get('/admin/companies', { params });
            const rows = Array.isArray(data?.data) ? data.data : [];

            // The current page can fall off the end (e.g. the last row on it was
            // filtered away). Snap back to page 1 rather than showing a blank list.
            if (rows.length === 0 && page > 1 && (data?.total ?? 0) > 0) {
                return refresh({ q, st, page: 1, limit });
            }

            setCompanies(rows);
            setMeta({
                page: data?.page ?? page,
                limit: data?.limit ?? limit,
                total: data?.total ?? 0,
                total_pages: data?.total_pages ?? 1,
            });
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to load companies');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refresh(); }, []);

    // Search / filter changes must reset to page 1 — otherwise a narrower
    // result set can leave you stranded on a page that no longer exists.
    const onSearchSubmit = (e) => {
        e.preventDefault();
        refresh({ q: search, page: 1 });
    };

    const onStatusChange = (e) => {
        const v = e.target.value;
        setStatus(v);
        refresh({ st: v, page: 1 });
    };

    return (
        <div className="ac-page">
            <div className="ac-title-row">
                <Building2 size={22} color="#0d9488" />
                <h1 className="ac-title">Companies</h1>
                {!loading && (
                    <span className="ac-count">
                        {meta.total.toLocaleString()} total
                    </span>
                )}
            </div>
            <p className="ac-subtitle">
                All companies on the platform. Inspect team, billing, and credits — or suspend an account.
            </p>

            <form onSubmit={onSearchSubmit} className="ac-filters">
                <div className="ac-search">
                    <Search size={14} className="ac-search-icon" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by company name or slug…"
                    />
                </div>
                <select value={status} onChange={onStatusChange} className="ac-select">
                    <option value="">All statuses</option>
                    <option value="active">Active</option>
                    <option value="past_due">Past due</option>
                    <option value="suspended">Suspended</option>
                    <option value="cancelled">Cancelled</option>
                </select>
                <button type="submit" className="ac-search-btn">
                    Search
                </button>
            </form>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                    <Loader2 size={28} style={{ color: '#4f46e5', animation: 'spin 1s linear infinite' }} />
                </div>
            ) : companies.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, color: '#6b7280' }}>
                    No companies found.
                </div>
            ) : (
                <div className="rt-wrap">
                    <table className="rt-table">
                        <thead>
                            <tr>
                                <th>Company</th>
                                <th>Owner</th>
                                <th>Status</th>
                                <th>Plan</th>
                                <th>Sub</th>
                                <th>Team</th>
                                <th>Credits</th>
                                <th>Created</th>
                                <th className="rt-actions">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {companies.map((c) => {
                                const subStatus = c.subscription?.status;
                                const subStyle = subStatus ? SUB_STATUS_BG[subStatus] : null;
                                const compStyle = STATUS_BG[c.status] || STATUS_BG.active;
                                const bal = c.credit_balance;
                                const total = (bal?.monthly_credits ?? 0) + (bal?.bonus_credits ?? 0);
                                const isSuspended = c.status === 'suspended';

                                return (
                                    <tr key={c.id}>
                                        <td data-label="Company" className="rt-heading">
                                            <div style={{ fontWeight: 600, color: '#111827', fontSize: 16 }}>
                                                {c.name}
                                            </div>
                                            {c.slug && (
                                                <div style={{ fontSize: 13, color: '#6b7280' }}>{c.slug}</div>
                                            )}
                                        </td>
                                        <td data-label="Owner">
                                            {c.owner ? (
                                                <div>
                                                    <div style={{ fontSize: 15, color: '#1f2937' }}>{c.owner.full_name || '—'}</div>
                                                    <div style={{ fontSize: 13, color: '#6b7280', wordBreak: 'break-word' }}>{c.owner.email}</div>
                                                </div>
                                            ) : <span style={{ fontSize: 14, color: '#9ca3af' }}>—</span>}
                                        </td>
                                        <td data-label="Status">
                                            <span style={{ padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.04, background: compStyle.bg, color: compStyle.color }}>
                                                {compStyle.label}
                                            </span>
                                        </td>
                                        <td data-label="Plan">
                                            {c.subscription?.plan ? (
                                                <div>
                                                    <div style={{ fontSize: 15, fontWeight: 500, color: '#111827' }}>{c.subscription.plan.name}</div>
                                                    <div style={{ fontSize: 13, color: '#6b7280' }}>
                                                        {c.subscription.plan.monthly_credits?.toLocaleString()} cr/mo
                                                    </div>
                                                </div>
                                            ) : <span style={{ fontSize: 14, color: '#9ca3af' }}>—</span>}
                                        </td>
                                        <td data-label="Sub">
                                            {subStatus ? (
                                                <span style={{ padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.04, background: subStyle.bg, color: subStyle.color }}>
                                                    {subStatus}
                                                </span>
                                            ) : <span style={{ fontSize: 14, color: '#9ca3af' }}>—</span>}
                                        </td>
                                        <td data-label="Team">
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 15, color: '#1f2937' }}>
                                                <UsersIcon size={14} color="#6b7280" /> {c.member_count ?? 0}
                                            </span>
                                        </td>
                                        <td data-label="Credits">
                                            <div>
                                                <div style={{ fontSize: 15, color: '#1f2937' }}>{total.toLocaleString()}</div>
                                                <div style={{ fontSize: 12, color: '#9ca3af' }}>
                                                    {(bal?.monthly_credits ?? 0)}m + {(bal?.bonus_credits ?? 0)}b
                                                </div>
                                            </div>
                                        </td>
                                        <td data-label="Created" className="rt-nowrap" style={{ fontSize: 14, color: '#6b7280' }}>{fmtDate(c.created_at)}</td>
                                        <td className="rt-actions">
                                            <div className="rt-actions-inner">
                                                <Link
                                                    href={`/dashboard/admin/companies/${c.id}`}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 12px', background: '#fff', color: '#4b5563', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
                                                >
                                                    <ExternalLink size={14} /> View
                                                </Link>
                                                {isSuspended ? (
                                                    <button
                                                        onClick={() => setActionTarget({ company: c, mode: 'unsuspend' })}
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: '#047857', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                                                    >
                                                        <PlayCircle size={14} /> Unsuspend
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setActionTarget({ company: c, mode: 'suspend' })}
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                                                    >
                                                        <Ban size={14} /> Suspend
                                                    </button>
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

            {!loading && companies.length > 0 && (
                <Pagination
                    page={meta.page}
                    totalPages={meta.total_pages}
                    total={meta.total}
                    limit={meta.limit}
                    itemLabel="companies"
                    onPageChange={(p) => refresh({ page: p })}
                    onLimitChange={(l) => refresh({ page: 1, limit: l })}
                />
            )}

            {actionTarget && (
                <SuspendModal
                    target={actionTarget}
                    onClose={() => setActionTarget(null)}
                    onDone={() => { setActionTarget(null); refresh(); }}
                />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Confirm modal — suspend OR unsuspend a company. Captures an optional
// reason that ends up in admin_audit_logs.changes.reason so future admins
// can see WHY an account was suspended/restored.
// ─────────────────────────────────────────────────────────────────────────────
function SuspendModal({ target, onClose, onDone }) {
    const { company, mode } = target;
    const isSuspend = mode === 'suspend';
    const [reason, setReason] = useState('');
    const [busy, setBusy]     = useState(false);

    const submit = async () => {
        setBusy(true);
        try {
            await axiosInstance.post(
                `/admin/companies/${company.id}/${isSuspend ? 'suspend' : 'unsuspend'}`,
                { reason: reason?.trim() || undefined },
            );
            toast.success(isSuspend ? `${company.name} suspended` : `${company.name} reactivated`);
            onDone();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Action failed');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div
            onClick={() => !busy && onClose()}
            className="ac-modal-overlay"
        >
            <div onClick={(e) => e.stopPropagation()} className="ac-modal">
                <div style={{ padding: '18px 22px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 10 }}>
                    {isSuspend
                        ? <Ban size={18} color="#dc2626" />
                        : <PlayCircle size={18} color="#047857" />}
                    <span style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>
                        {isSuspend ? 'Suspend company' : 'Unsuspend company'}
                    </span>
                    <button onClick={onClose} disabled={busy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ background: '#f9fafb', padding: 12, borderRadius: 8 }}>
                        <div style={{ fontSize: 14, color: '#1f2937', fontWeight: 600 }}>{company.name}</div>
                        {company.owner?.email && (
                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                                Owner: {company.owner.email}
                            </div>
                        )}
                    </div>

                    <div style={{
                        background: isSuspend ? '#fef2f2' : '#ecfdf5',
                        border: `1px solid ${isSuspend ? '#fecaca' : '#a7f3d0'}`,
                        padding: 12, borderRadius: 8,
                        fontSize: 13, color: isSuspend ? '#991b1b' : '#065f46',
                    }}>
                        {isSuspend
                            ? <>This will set the company status to <strong>suspended</strong>. All team members will lose access until you unsuspend.</>
                            : <>This will set the company status back to <strong>active</strong>. Team members will regain access immediately.</>}
                    </div>

                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.05, marginBottom: 5 }}>
                            Reason (audit log)
                        </div>
                        <input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={isSuspend ? 'e.g. Repeated payment failure' : 'e.g. Customer paid outstanding invoice'}
                            style={{ width: '100%', padding: '10px 12px', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14 }}
                        />
                    </div>
                </div>

                <div className="ac-modal-footer">
                    <button onClick={onClose} disabled={busy} style={{ padding: '10px 16px', background: '#fff', color: '#1f2937', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                        Cancel
                    </button>
                    <button
                        onClick={submit}
                        disabled={busy}
                        style={{
                            padding: '10px 18px',
                            background: isSuspend ? '#dc2626' : '#047857',
                            color: '#fff', border: 'none', borderRadius: 8,
                            fontWeight: 600, cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}
                    >
                        {busy && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                        {isSuspend ? 'Confirm suspend' : 'Confirm unsuspend'}
                    </button>
                </div>
            </div>
        </div>
    );
}
