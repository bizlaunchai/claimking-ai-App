'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
    Sparkles, CheckCircle2, XCircle, Loader2, Zap, CreditCard,
    Coins, Calendar, AlertCircle, ArrowUpCircle, Receipt, ShieldCheck,
    Download, ExternalLink, ArrowDownCircle, RefreshCw, Plus, Minus,
    History, Ticket, Gift,
} from 'lucide-react';
import axiosInstance from '../../../lib/axiosInstance.js';

const fmtMoney = (cents) =>
    `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const STATUS_LABEL = {
    active: { label: 'Active', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' },
    trialing: { label: 'Trial', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
    past_due: { label: 'Past Due', color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
    canceled: { label: 'Canceled', color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb' },
    incomplete: { label: 'Incomplete', color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb' },
    unpaid: { label: 'Unpaid', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
    paused: { label: 'Paused', color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb' },
};

const INVOICE_STATUS = {
    paid:    { label: 'Paid',    color: '#047857', bg: '#ecfdf5' },
    open:    { label: 'Open',    color: '#b45309', bg: '#fffbeb' },
    void:    { label: 'Void',    color: '#6b7280', bg: '#f3f4f6' },
    uncollectible: { label: 'Uncollectible', color: '#b91c1c', bg: '#fef2f2' },
    draft:   { label: 'Draft',   color: '#6b7280', bg: '#f3f4f6' },
};

const TX_TYPE_META = {
    subscription_grant: { label: 'Subscription started', Icon: Zap,            color: '#4f46e5' },
    upgrade_grant:      { label: 'Plan upgraded',         Icon: ArrowUpCircle,  color: '#4f46e5' },
    renewal_reset:      { label: 'Monthly renewal',       Icon: RefreshCw,      color: '#0891b2' },
    admin_adjust:       { label: 'Admin adjustment',      Icon: ShieldCheck,    color: '#7c3aed' },
    consume:            { label: 'Used',                  Icon: Minus,          color: '#b91c1c' },
    refund:             { label: 'Refund',                Icon: Plus,           color: '#047857' },
};

const fmtAmount = (cents, currency = 'usd') =>
    `${currency.toUpperCase() === 'USD' ? '$' : ''}${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDateTime = (val) => {
    if (!val) return '—';
    const d = typeof val === 'number' ? new Date(val * 1000) : new Date(val);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  .billing-root * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
  .fade-up { animation: fadeUp 0.3s ease both; }

  .card {
    background: #fff; border: 1px solid #e5e7eb; border-radius: 14px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }
  .card-head {
    padding: 16px 22px; border-bottom: 1px solid #f3f4f6;
    display: flex; align-items: center; gap: 10px;
  }

  .pill {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px;
    text-transform: uppercase; letter-spacing: 0.04em;
    border: 1px solid transparent;
  }

  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 10px 16px; border-radius: 8px; font-size: 14px; font-weight: 600;
    cursor: pointer; border: none; transition: all 0.15s; white-space: nowrap;
  }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-primary { background: #4f46e5; color: #fff; }
  .btn-primary:hover:not(:disabled) { background: #4338ca; }
  .btn-outline { background: #fff; color: #1f2937; border: 1px solid #e5e7eb; }
  .btn-outline:hover:not(:disabled) { background: #f9fafb; }
  .btn-danger { background: #fff; color: #b91c1c; border: 1px solid #fecaca; }
  .btn-danger:hover:not(:disabled) { background: #fef2f2; }

  .credit-tile {
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    color: #fff; border-radius: 14px; padding: 28px;
    box-shadow: 0 8px 24px rgba(79, 70, 229, 0.18);
  }

  .plan-card {
    border: 2px solid #e5e7eb; border-radius: 14px; padding: 24px; background: #fff;
    transition: border-color 0.15s, transform 0.15s;
    display: flex; flex-direction: column; gap: 12px; position: relative;
  }
  .plan-card.popular { border-color: #4f46e5; }
  .plan-card.current { border-color: #047857; background: #f0fdf4; }
  .plan-card .badge {
    position: absolute; top: -10px; right: 16px; background: #4f46e5; color: #fff;
    font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 999px;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .plan-card.current .badge { background: #047857; }

  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }

  @media (max-width: 900px) {
    .grid-3, .grid-2 { grid-template-columns: 1fr; }
  }

  .feature-row { display: flex; gap: 8px; align-items: flex-start; font-size: 14px; color: #4b5563; }
  .feature-row svg { color: #047857; flex-shrink: 0; margin-top: 2px; }

  .metric { font-size: 36px; font-weight: 700; line-height: 1; }
  .label { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #6b7280; }
`;

export default function Billing() {
    const params = useSearchParams();
    const [me, setMe] = useState(null);
    const [plans, setPlans] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [creditHistory, setCreditHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null); // string key
    const [couponDialog, setCouponDialog] = useState(null); // { plan }
    const [couponCode, setCouponCode] = useState('');
    const [couponPreview, setCouponPreview] = useState(null); // validation result
    const [couponBusy, setCouponBusy] = useState(false);

    const refresh = async () => {
        try {
            const [{ data: subData }, { data: planList }, invoicesRes, historyRes] = await Promise.all([
                axiosInstance.get('/subscriptions/me'),
                axiosInstance.get('/plans'),
                axiosInstance.get('/subscriptions/me/invoices').catch(() => ({ data: { invoices: [] } })),
                axiosInstance.get('/credits/me/history?limit=20').catch(() => ({ data: [] })),
            ]);
            setMe(subData);
            setPlans(planList || []);
            setInvoices(invoicesRes?.data?.invoices || []);
            setCreditHistory(Array.isArray(historyRes?.data) ? historyRes.data : []);
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to load billing info');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
        const checkout = params.get('checkout');
        if (checkout === 'success') toast.success('Subscription activated 🎉');
        else if (checkout === 'canceled') toast.info('Checkout canceled');
    }, []);

    const sub = me?.subscription;
    const balance = me?.balance;
    const isActive = sub?.status === 'active' || sub?.status === 'trialing';
    // Only treat the plan as "current" when the subscription is actually active
    // or trialing. An incomplete / past_due / canceled record may carry a stale
    // plan_id from an abandoned checkout — those should not show as Current.
    const currentPlanId = isActive ? sub?.plan_id : null;
    // Whether to render the "Current Subscription" card at all. We hide the card
    // for users who never finished checkout (incomplete) or whose sub is fully
    // canceled — in both cases the user has no live plan and should see the
    // picker, not stale plan data.
    const hasLiveSub = !!sub?.plan && !['incomplete', 'incomplete_expired', 'canceled'].includes(sub?.status);

    const openSubscribeDialog = (plan) => {
        setCouponDialog({ plan });
        setCouponCode('');
        setCouponPreview(null);
    };

    const closeCouponDialog = () => {
        if (couponBusy) return;
        setCouponDialog(null);
        setCouponCode('');
        setCouponPreview(null);
    };

    const validateCoupon = async () => {
        if (!couponCode.trim() || !couponDialog?.plan) return;
        setCouponBusy(true);
        try {
            const { data } = await axiosInstance.post('/coupons/validate', {
                code: couponCode.trim().toUpperCase(),
                planId: couponDialog.plan.id,
            });
            setCouponPreview(data);
            if (!data.valid) toast.error(data.reason || 'Coupon not valid');
            else toast.success('Coupon applied');
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to validate coupon');
        } finally {
            setCouponBusy(false);
        }
    };

    const subscribe = async (planId, code = null) => {
        setActionLoading(`sub-${planId}`);
        try {
            const { data } = await axiosInstance.post('/subscriptions/checkout', {
                planId,
                couponCode: code || undefined,
            });
            window.location.href = data.url;
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to start checkout');
            setActionLoading(null);
        }
    };

    const confirmSubscribe = () => {
        if (!couponDialog?.plan) return;
        subscribe(
            couponDialog.plan.id,
            couponPreview?.valid ? couponCode.trim().toUpperCase() : null,
        );
    };

    const changePlan = async (planId) => {
        setActionLoading(`change-${planId}`);
        try {
            const { data } = await axiosInstance.post('/subscriptions/change-plan', { planId });
            toast.success(data.message || 'Plan updated');
            await refresh();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to change plan');
        } finally {
            setActionLoading(null);
        }
    };

    const openPortal = async () => {
        setActionLoading('portal');
        try {
            const { data } = await axiosInstance.post('/subscriptions/portal', {});
            window.location.href = data.url;
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to open billing portal');
            setActionLoading(null);
        }
    };

    const cancelSub = async () => {
        if (!confirm('Cancel subscription at the end of the current billing period?')) return;
        setActionLoading('cancel');
        try {
            await axiosInstance.post('/subscriptions/cancel');
            toast.success('Will cancel at period end');
            await refresh();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to cancel');
        } finally {
            setActionLoading(null);
        }
    };

    const resumeSub = async () => {
        setActionLoading('resume');
        try {
            await axiosInstance.post('/subscriptions/resume');
            toast.success('Subscription resumed');
            await refresh();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to resume');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="billing-root" style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
                <style>{styles}</style>
                <Loader2 size={28} className="animate-spin" style={{ color: '#4f46e5', animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    const totalCredits = (balance?.monthly_credits ?? 0) + (balance?.bonus_credits ?? 0);
    const statusInfo = sub?.status ? STATUS_LABEL[sub.status] : null;

    return (
        <div className="billing-root" style={{ minHeight: '100vh', background: '#f3f4f6', padding: '40px 20px' }}>
            <style>{styles}</style>
            <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Header */}
                <div className="fade-up">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                        <div style={{ width: 40, height: 40, background: '#1f2937', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CreditCard size={20} color="#fbbf24" />
                        </div>
                        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#111827' }}>Billing & Plans</h1>
                    </div>
                    <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
                        Manage your monthly subscription, view credits, and access invoices.
                    </p>
                </div>

                {/* Top row — Credits + Subscription summary */}
                <div className="grid-2 fade-up">
                    {/* Credits tile */}
                    <div className="credit-tile">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.85 }}>
                            <Coins size={16} /><span className="label" style={{ color: '#fff', opacity: 0.85 }}>Available Credits</span>
                        </div>
                        <div className="metric" style={{ marginTop: 12 }}>{totalCredits.toLocaleString()}</div>
                        <div style={{ display: 'flex', gap: 24, marginTop: 18, fontSize: 13, opacity: 0.92 }}>
                            <div>
                                <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.05 }}>Monthly</div>
                                <div style={{ fontWeight: 600, fontSize: 16 }}>{(balance?.monthly_credits ?? 0).toLocaleString()}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.05 }}>Bonus</div>
                                <div style={{ fontWeight: 600, fontSize: 16 }}>{(balance?.bonus_credits ?? 0).toLocaleString()}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.05 }}>Used this period</div>
                                <div style={{ fontWeight: 600, fontSize: 16 }}>{(balance?.total_used_period ?? 0).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    {/* Subscription summary */}
                    <div className="card">
                        <div className="card-head">
                            <ShieldCheck size={18} color="#4f46e5" />
                            <span style={{ fontWeight: 600, fontSize: 15, color: '#111827', flex: 1 }}>Current Subscription</span>
                            {hasLiveSub && statusInfo && (
                                <span className="pill" style={{ background: statusInfo.bg, color: statusInfo.color, borderColor: statusInfo.border }}>
                                    {statusInfo.label}
                                </span>
                            )}
                        </div>
                        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {hasLiveSub ? (
                                <>
                                    <div>
                                        <div className="label">Plan</div>
                                        <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{sub.plan.name}</div>
                                        <div style={{ fontSize: 14, color: '#6b7280' }}>{fmtMoney(sub.plan.price_cents)} / month</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 18, fontSize: 13 }}>
                                        <div>
                                            <div className="label" style={{ marginBottom: 2 }}>Renews</div>
                                            <div style={{ color: '#111827', fontWeight: 500 }}>
                                                <Calendar size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: '-2px' }} />
                                                {fmtDate(sub.current_period_end)}
                                            </div>
                                        </div>
                                        {sub.cancel_at_period_end && (
                                            <div style={{ color: '#b91c1c' }}>
                                                <div className="label" style={{ color: '#b91c1c', marginBottom: 2 }}>Status</div>
                                                <div style={{ fontWeight: 500 }}>Will cancel at period end</div>
                                            </div>
                                        )}
                                        {sub.pending_plan && (
                                            <div style={{ color: '#b45309' }}>
                                                <div className="label" style={{ color: '#b45309', marginBottom: 2 }}>Scheduled change</div>
                                                <div style={{ fontWeight: 500 }}>→ {sub.pending_plan.name} on {fmtDate(sub.current_period_end)}</div>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                                        <button className="btn btn-outline" onClick={openPortal} disabled={actionLoading === 'portal'}>
                                            <Receipt size={14} /> Invoices & Cards
                                            {actionLoading === 'portal' && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                                        </button>
                                        {sub.cancel_at_period_end ? (
                                            <button className="btn btn-primary" onClick={resumeSub} disabled={actionLoading === 'resume'}>
                                                Resume Subscription
                                                {actionLoading === 'resume' && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                                            </button>
                                        ) : (
                                            <button className="btn btn-danger" onClick={cancelSub} disabled={actionLoading === 'cancel'}>
                                                Cancel Subscription
                                                {actionLoading === 'cancel' && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                                            </button>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#92400e' }}>
                                        <AlertCircle size={16} />
                                        <span style={{ fontSize: 14, fontWeight: 500 }}>No active subscription</span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Pick a plan below to get started.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Plans grid */}
                <div className="fade-up">
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>
                            {isActive ? 'Change Plan' : 'Choose a Plan'}
                        </h2>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>Monthly billing · Cancel anytime</span>
                    </div>

                    {plans.length === 0 ? (
                        <div className="card" style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
                            <Sparkles size={28} style={{ color: '#9ca3af', marginBottom: 10 }} />
                            <div style={{ fontWeight: 600, color: '#111827', marginBottom: 4 }}>No plans available yet</div>
                            <div style={{ fontSize: 13 }}>Plans will appear here once an admin publishes them.</div>
                        </div>
                    ) : (
                        <div className="grid-3">
                            {plans.map((p) => {
                                const isCurrent = currentPlanId === p.id;
                                const isLoadingPlan = actionLoading === `sub-${p.id}` || actionLoading === `change-${p.id}`;
                                const hasPlanDiscount = (p.discount_percent ?? 0) > 0 || (p.discount_amount_cents ?? 0) > 0;
                                const discountedPriceCents = hasPlanDiscount
                                    ? (p.discount_percent > 0
                                        ? Math.max(0, p.price_cents - Math.floor(p.price_cents * p.discount_percent / 100))
                                        : Math.max(0, p.price_cents - p.discount_amount_cents))
                                    : p.price_cents;
                                return (
                                    <div key={p.id} className={`plan-card ${p.is_popular ? 'popular' : ''} ${isCurrent ? 'current' : ''}`}>
                                        {isCurrent && <span className="badge"><CheckCircle2 size={10} style={{ verticalAlign: -1, marginRight: 4 }} />Current</span>}
                                        {!isCurrent && p.is_popular && <span className="badge">Popular</span>}

                                        <div>
                                            <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{p.name}</div>
                                            {p.description && <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{p.description}</div>}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 32, fontWeight: 700, color: '#111827' }}>{fmtMoney(discountedPriceCents)}</span>
                                            <span style={{ color: '#6b7280', fontSize: 14 }}>/ month</span>
                                            {hasPlanDiscount && (
                                                <span style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: 14 }}>
                                                    {fmtMoney(p.price_cents)}
                                                </span>
                                            )}
                                        </div>

                                        {hasPlanDiscount && (
                                            <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 4, padding: '3px 10px', background: '#ecfdf5', color: '#047857', borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.04 }}>
                                                <Gift size={11} /> {p.discount_percent > 0 ? `${p.discount_percent}% off` : `${fmtMoney(p.discount_amount_cents)} off`}
                                            </div>
                                        )}

                                        {p.trial_days > 0 && (
                                            <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 4, padding: '3px 10px', background: '#eff6ff', color: '#1d4ed8', borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.04 }}>
                                                <Sparkles size={11} /> {p.trial_days}-day free trial
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4f46e5', fontSize: 13, fontWeight: 600 }}>
                                            <Coins size={14} /> {p.monthly_credits.toLocaleString()} credits / month
                                        </div>

                                        {Array.isArray(p.features) && p.features.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                                                {p.features.map((f, i) => (
                                                    <div key={i} className="feature-row">
                                                        <CheckCircle2 size={14} /><span>{f}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div style={{ marginTop: 'auto', paddingTop: 12 }}>
                                            {isCurrent ? (
                                                <button className="btn btn-outline" disabled style={{ width: '100%' }}>
                                                    Current Plan
                                                </button>
                                            ) : isActive ? (
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ width: '100%' }}
                                                    onClick={() => changePlan(p.id)}
                                                    disabled={isLoadingPlan}
                                                >
                                                    <ArrowUpCircle size={14} /> Switch to {p.name}
                                                    {isLoadingPlan && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                                                </button>
                                            ) : (
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ width: '100%' }}
                                                    onClick={() => openSubscribeDialog(p)}
                                                    disabled={isLoadingPlan}
                                                >
                                                    <Zap size={14} /> {p.trial_days > 0 ? 'Start Trial' : 'Subscribe'}
                                                    {isLoadingPlan && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Invoices */}
                <div className="fade-up">
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>
                            <Receipt size={18} style={{ verticalAlign: -3, marginRight: 6, color: '#4f46e5' }} />
                            Invoices
                        </h2>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>Receipts from Stripe — download anytime</span>
                    </div>
                    <div className="card">
                        {invoices.length === 0 ? (
                            <div style={{ padding: 30, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
                                No invoices yet — they will appear here after your first payment.
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                            <th style={th}>Date</th>
                                            <th style={th}>Number</th>
                                            <th style={th}>Period</th>
                                            <th style={th}>Next Billing</th>
                                            <th style={th}>Amount</th>
                                            <th style={th}>Status</th>
                                            <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoices.map((inv) => {
                                            const sty = INVOICE_STATUS[inv.status] || INVOICE_STATUS.draft;
                                            return (
                                                <tr key={inv.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                    <td style={td}>{fmtDateTime(inv.created)}</td>
                                                    <td style={{ ...td, fontFamily: 'monospace', fontSize: 12 }}>{inv.number || '—'}</td>
                                                    <td style={td}>
                                                        {inv.period_start && inv.period_end ? (
                                                            <span style={{ fontSize: 12, color: '#6b7280' }}>
                                                                {fmtDate(new Date(inv.period_start * 1000))} – {fmtDate(new Date(inv.period_end * 1000))}
                                                            </span>
                                                        ) : '—'}
                                                    </td>
                                                    <td style={td}>
                                                        {inv.period_end && inv.status === 'paid' ? (
                                                            <span style={{ fontSize: 12, color: '#047857', fontWeight: 600 }}>
                                                                <Calendar size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
                                                                {fmtDate(new Date(inv.period_end * 1000))}
                                                            </span>
                                                        ) : (
                                                            <span style={{ fontSize: 12, color: '#9ca3af' }}>—</span>
                                                        )}
                                                    </td>
                                                    <td style={{ ...td, fontWeight: 600 }}>{fmtAmount(inv.amount_paid || inv.amount_due, inv.currency)}</td>
                                                    <td style={td}>
                                                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.04, background: sty.bg, color: sty.color }}>
                                                            {sty.label}
                                                        </span>
                                                    </td>
                                                    <td style={{ ...td, textAlign: 'right' }}>
                                                        <div style={{ display: 'inline-flex', gap: 6 }}>
                                                            {inv.hosted_invoice_url && (
                                                                <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer"
                                                                    style={iconLink('#4f46e5')} title="View receipt">
                                                                    <ExternalLink size={14} />
                                                                </a>
                                                            )}
                                                            {inv.invoice_pdf && (
                                                                <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer"
                                                                    style={iconLink('#0d9488')} title="Download PDF">
                                                                    <Download size={14} />
                                                                </a>
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
                    </div>
                </div>

                {/* Credit history */}
                <div className="fade-up">
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>
                            <History size={18} style={{ verticalAlign: -3, marginRight: 6, color: '#4f46e5' }} />
                            Credit Activity
                        </h2>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>Last 20 events</span>
                    </div>
                    <div className="card">
                        {creditHistory.length === 0 ? (
                            <div style={{ padding: 30, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
                                No credit activity yet.
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                            <th style={th}>When</th>
                                            <th style={th}>Event</th>
                                            <th style={th}>Description</th>
                                            <th style={{ ...th, textAlign: 'right' }}>Credit</th>
                                            <th style={{ ...th, textAlign: 'right' }}>Credit after</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {creditHistory.map((tx) => {
                                            const meta = TX_TYPE_META[tx.type] || { label: tx.type, Icon: Coins, color: '#6b7280' };
                                            const Ico = meta.Icon;
                                            const positive = tx.amount > 0;
                                            return (
                                                <tr key={tx.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                    <td style={{ ...td, fontSize: 12, color: '#6b7280' }}>{fmtDateTime(tx.created_at)}</td>
                                                    <td style={td}>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: meta.color, fontWeight: 600, fontSize: 13 }}>
                                                            <Ico size={14} /> {meta.label}
                                                        </span>
                                                    </td>
                                                    <td style={{ ...td, fontSize: 13, color: '#4b5563' }}>{tx.description || '—'}</td>
                                                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: positive ? '#047857' : '#b91c1c' }}>
                                                        {positive ? '+' : ''}{tx.amount.toLocaleString()}
                                                    </td>
                                                    <td style={{ ...td, textAlign: 'right', fontSize: 13, color: '#1f2937' }}>
                                                        <div>{(tx.monthly_after + tx.bonus_after).toLocaleString()}</div>
                                                        <div style={{ fontSize: 11, color: '#9ca3af' }}>
                                                            {tx.monthly_after}m + {tx.bonus_after}b
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ height: 40 }} />
            </div>

            {couponDialog && (
                <CouponDialog
                    plan={couponDialog.plan}
                    code={couponCode}
                    setCode={setCouponCode}
                    preview={couponPreview}
                    busy={couponBusy}
                    submitting={actionLoading === `sub-${couponDialog.plan.id}`}
                    onClose={closeCouponDialog}
                    onValidate={validateCoupon}
                    onConfirm={confirmSubscribe}
                />
            )}
        </div>
    );
}

function CouponDialog({ plan, code, setCode, preview, busy, submitting, onClose, onValidate, onConfirm }) {
    const trialDays = plan.trial_days || 0;
    const planDiscount = preview?.valid
        ? preview.originalPriceCents
        : ((plan.discount_percent ?? 0) > 0
            ? Math.max(0, plan.price_cents - Math.floor(plan.price_cents * plan.discount_percent / 100))
            : (plan.discount_amount_cents ?? 0) > 0
                ? Math.max(0, plan.price_cents - plan.discount_amount_cents)
                : plan.price_cents);
    const finalCents = preview?.valid ? preview.finalPriceCents : planDiscount;

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(17, 24, 39, 0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 20,
            }}
        >
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, maxWidth: 460, width: '100%' }}>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Ticket size={18} color="#4f46e5" />
                    <span style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>
                        {trialDays > 0 ? 'Start Trial' : 'Subscribe'} — {plan.name}
                    </span>
                    <button onClick={onClose} disabled={submitting} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                        <XCircle size={18} />
                    </button>
                </div>

                <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {trialDays > 0 && (
                        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '10px 12px', borderRadius: 8, fontSize: 13, display: 'flex', gap: 8 }}>
                            <Sparkles size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                            <span>You'll get a {trialDays}-day free trial. Your card won't be charged until the trial ends. Each user can take a trial only once.</span>
                        </div>
                    )}

                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.05, marginBottom: 5 }}>
                            Have a coupon code?
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                style={{ flex: 1, padding: '10px 12px', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, color: '#111827', outline: 'none', textTransform: 'uppercase', fontFamily: 'monospace' }}
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                placeholder="WELCOME20"
                                disabled={submitting}
                            />
                            <button
                                onClick={onValidate}
                                disabled={busy || submitting || !code.trim()}
                                style={{ padding: '10px 14px', background: '#fff', color: '#1f2937', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                            >
                                {busy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Apply'}
                            </button>
                        </div>
                        {preview && (
                            <div style={{ marginTop: 8, fontSize: 13, color: preview.valid ? '#047857' : '#b91c1c', display: 'flex', alignItems: 'center', gap: 6 }}>
                                {preview.valid ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                {preview.valid
                                    ? `Saving ${fmtMoney(preview.discountCents)} — total ${fmtMoney(preview.finalPriceCents)}`
                                    : preview.reason}
                            </div>
                        )}
                    </div>

                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, fontSize: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#6b7280' }}>
                            <span>Plan price</span>
                            <span>{fmtMoney(plan.price_cents)} / mo</span>
                        </div>
                        {planDiscount !== plan.price_cents && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#047857' }}>
                                <span>Plan discount</span>
                                <span>−{fmtMoney(plan.price_cents - planDiscount)}</span>
                            </div>
                        )}
                        {preview?.valid && preview.discountCents > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#047857' }}>
                                <span>Coupon ({code.trim().toUpperCase()})</span>
                                <span>−{fmtMoney(preview.discountCents)}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid #e5e7eb', fontWeight: 700, color: '#111827' }}>
                            <span>{trialDays > 0 ? 'After trial' : 'Today'}</span>
                            <span>{fmtMoney(finalCents)} / mo</span>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '14px 22px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={onClose} disabled={submitting} style={{ padding: '10px 16px', background: '#fff', color: '#1f2937', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={submitting}
                        style={{ padding: '10px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                        {submitting && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                        Continue to checkout
                    </button>
                </div>
            </div>
        </div>
    );
}

const th = { padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.04 };
const td = { padding: '12px 16px', fontSize: 13, color: '#1f2937', verticalAlign: 'middle' };
const iconLink = (color) => ({
    width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 6, background: `${color}10`, color, border: `1px solid ${color}30`, textDecoration: 'none',
});
