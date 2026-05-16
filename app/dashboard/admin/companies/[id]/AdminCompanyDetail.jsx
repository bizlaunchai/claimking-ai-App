'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
    ArrowLeft, Loader2, Building2, Ban, PlayCircle, Coins, CreditCard,
    Users as UsersIcon, ShieldCheck, X, Mail, Phone, Globe, MapPin,
} from 'lucide-react';
import axiosInstance from '../../../../../lib/axiosInstance.js';

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

const TX_LABEL = {
    subscription_grant: 'Subscription started',
    renewal_reset:      'Monthly renewal',
    upgrade_grant:      'Plan upgrade',
    admin_adjust:       'Admin adjustment',
    consume:            'Used',
    refund:             'Refund',
    coupon_redeem:      'Coupon redeem',
    purchase:           'Credit purchase',
};

const fmtDate = (val) =>
    val ? new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtDateTime = (val) =>
    val ? new Date(val).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function AdminCompanyDetail() {
    // Next 16: server-component `params` is a Promise. In a client component the
    // ergonomic equivalent is useParams(), which always returns a plain object.
    const params = useParams();
    const companyId = params?.id;

    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionTarget, setActionTarget] = useState(null); // 'suspend' | 'unsuspend'

    const refresh = async () => {
        if (!companyId) return;
        setLoading(true);
        try {
            const { data } = await axiosInstance.get(`/admin/companies/${companyId}`);
            setCompany(data);
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to load company');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refresh(); }, [companyId]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
                <Loader2 size={28} style={{ color: '#4f46e5', animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    if (!company) {
        return (
            <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
                Company not found.
                <div style={{ marginTop: 12 }}>
                    <Link href="/dashboard/admin/companies" style={{ color: '#4f46e5', fontWeight: 600 }}>
                        ← Back to companies
                    </Link>
                </div>
            </div>
        );
    }

    const compStyle  = STATUS_BG[company.status] || STATUS_BG.active;
    const subStatus  = company.subscription?.status;
    const subStyle   = subStatus ? SUB_STATUS_BG[subStatus] : null;
    const bal        = company.credit_balance;
    const totalCr    = (bal?.monthly_credits ?? 0) + (bal?.bonus_credits ?? 0);
    const isSuspended = company.status === 'suspended';

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px 60px' }}>
            {/* ── Header ─────────────────────────────────────────────────── */}
            <Link
                href="/dashboard/admin/companies"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#4f46e5', fontWeight: 600, textDecoration: 'none', marginBottom: 12 }}
            >
                <ArrowLeft size={14} /> Back to companies
            </Link>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <Building2 size={22} color="#0d9488" />
                        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#111827' }}>{company.name}</h1>
                        <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.04, background: compStyle.bg, color: compStyle.color }}>
                            {compStyle.label}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: '#6b7280' }}>
                        {company.slug    && <span>{company.slug}</span>}
                        {company.website && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Globe size={11} />{company.website}</span>}
                        {company.phone   && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Phone size={11} />{company.phone}</span>}
                        {company.address && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={11} />{company.address}</span>}
                        <span>Created {fmtDate(company.created_at)}</span>
                    </div>
                </div>

                {isSuspended ? (
                    <button
                        onClick={() => setActionTarget('unsuspend')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#047857', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                        <PlayCircle size={14} /> Unsuspend company
                    </button>
                ) : (
                    <button
                        onClick={() => setActionTarget('suspend')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                        <Ban size={14} /> Suspend company
                    </button>
                )}
            </div>

            {/* ── 3-up summary cards: Owner / Subscription / Credits ───── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 28 }}>
                {/* Owner */}
                <Card icon={<ShieldCheck size={16} color="#4f46e5" />} title="Owner">
                    {company.owner ? (
                        <>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{company.owner.full_name || '—'}</div>
                            <div style={{ fontSize: 12, color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                <Mail size={11} />{company.owner.email}
                            </div>
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>Role: <strong>{company.owner.role}</strong></div>
                        </>
                    ) : <span style={{ fontSize: 13, color: '#9ca3af' }}>No owner profile</span>}
                </Card>

                {/* Subscription */}
                <Card icon={<CreditCard size={16} color="#4f46e5" />} title="Subscription">
                    {company.subscription ? (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                                    {company.subscription.plan?.name ?? '—'}
                                </div>
                                {subStatus && (
                                    <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: subStyle.bg, color: subStyle.color }}>
                                        {subStatus}
                                    </span>
                                )}
                            </div>
                            {company.subscription.plan?.monthly_credits != null && (
                                <div style={{ fontSize: 11, color: '#6b7280' }}>
                                    {company.subscription.plan.monthly_credits.toLocaleString()} credits/mo
                                </div>
                            )}
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>
                                Renews: <strong>{fmtDate(company.subscription.current_period_end)}</strong>
                                {company.subscription.cancel_at_period_end && (
                                    <span style={{ color: '#b91c1c', marginLeft: 6 }}>(cancelling)</span>
                                )}
                            </div>
                        </>
                    ) : <span style={{ fontSize: 13, color: '#9ca3af' }}>No active subscription</span>}
                </Card>

                {/* Credits */}
                <Card icon={<Coins size={16} color="#4f46e5" />} title="Credit balance">
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>{totalCr.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                        {(bal?.monthly_credits ?? 0).toLocaleString()} monthly · {(bal?.bonus_credits ?? 0).toLocaleString()} bonus
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>
                        Used this period: <strong>{(bal?.total_used_period ?? 0).toLocaleString()}</strong>
                    </div>
                </Card>
            </div>

            {/* ── Team table ─────────────────────────────────────────────── */}
            <SectionTitle icon={<UsersIcon size={18} color="#0d9488" />}>
                Team members ({company.team?.length ?? 0})
            </SectionTitle>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', marginBottom: 28 }}>
                {company.team?.length ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                <th style={th}>Member</th>
                                <th style={th}>Role</th>
                                <th style={th}>Status</th>
                                <th style={th}>Joined</th>
                                <th style={th}>Last login</th>
                            </tr>
                        </thead>
                        <tbody>
                            {company.team.map((m) => (
                                <tr key={m.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={td}>
                                        <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{m.full_name || '—'}</div>
                                        <div style={{ fontSize: 11, color: '#6b7280' }}>{m.email}</div>
                                    </td>
                                    <td style={td}>
                                        <span style={{ fontSize: 12, color: '#1f2937', textTransform: 'capitalize', fontWeight: 500 }}>{m.role}</span>
                                        {m.id === company.owner_user_id && (
                                            <span style={{ marginLeft: 6, padding: '2px 6px', borderRadius: 4, background: '#eef2ff', color: '#4338ca', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                                                Owner
                                            </span>
                                        )}
                                    </td>
                                    <td style={td}>
                                        <span style={{ fontSize: 12, color: '#4b5563', textTransform: 'capitalize' }}>{m.status ?? '—'}</span>
                                    </td>
                                    <td style={{ ...td, fontSize: 12, color: '#6b7280' }}>{fmtDate(m.created_at)}</td>
                                    <td style={{ ...td, fontSize: 12, color: '#6b7280' }}>{fmtDateTime(m.last_login_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div style={{ padding: 30, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                        No team members yet.
                    </div>
                )}
            </div>

            {/* ── Recent credit transactions ────────────────────────────── */}
            <SectionTitle icon={<Coins size={18} color="#0d9488" />}>
                Recent credit activity (latest 25)
            </SectionTitle>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
                {company.recent_credit_tx?.length ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                <th style={th}>When</th>
                                <th style={th}>Type</th>
                                <th style={th}>Description</th>
                                <th style={{ ...th, textAlign: 'right' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {company.recent_credit_tx.map((tx) => {
                                const positive = tx.amount > 0;
                                return (
                                    <tr key={tx.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ ...td, fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtDateTime(tx.created_at)}</td>
                                        <td style={{ ...td, fontSize: 12, fontWeight: 600, color: '#374151' }}>
                                            {TX_LABEL[tx.type] || tx.type}
                                            {tx.feature_key && <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 400 }}>{tx.feature_key}</div>}
                                        </td>
                                        <td style={{ ...td, fontSize: 12, color: '#4b5563' }}>{tx.description || '—'}</td>
                                        <td style={{ ...td, textAlign: 'right', fontSize: 13, fontWeight: 700, color: positive ? '#047857' : '#b91c1c' }}>
                                            {positive ? '+' : ''}{tx.amount.toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div style={{ padding: 30, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                        No credit activity yet.
                    </div>
                )}
            </div>

            {actionTarget && (
                <SuspendModal
                    company={company}
                    mode={actionTarget}
                    onClose={() => setActionTarget(null)}
                    onDone={() => { setActionTarget(null); refresh(); }}
                />
            )}
        </div>
    );
}

// ── Small presentational helpers ────────────────────────────────────────────
function Card({ icon, title, children }) {
    return (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                {icon}
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.05 }}>
                    {title}
                </span>
            </div>
            {children}
        </div>
    );
}

function SectionTitle({ icon, children }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            {icon}
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>{children}</h2>
        </div>
    );
}

const th = { padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.04 };
const td = { padding: '14px 16px', fontSize: 13, color: '#1f2937', verticalAlign: 'middle' };

// Detail-page suspend modal — same backend call as the list-page one.
function SuspendModal({ company, mode, onClose, onDone }) {
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
            style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}
        >
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, maxWidth: 460, width: '100%' }}>
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
                    <div style={{
                        background: isSuspend ? '#fef2f2' : '#ecfdf5',
                        border: `1px solid ${isSuspend ? '#fecaca' : '#a7f3d0'}`,
                        padding: 12, borderRadius: 8,
                        fontSize: 13, color: isSuspend ? '#991b1b' : '#065f46',
                    }}>
                        {isSuspend
                            ? <>Suspending <strong>{company.name}</strong> immediately blocks login for {company.team?.length ?? 0} team member(s).</>
                            : <>Reactivating <strong>{company.name}</strong> restores access for {company.team?.length ?? 0} team member(s).</>}
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

                <div style={{ padding: '14px 22px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
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
