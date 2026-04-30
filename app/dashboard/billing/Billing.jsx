'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
    Sparkles, CheckCircle2, XCircle, Loader2, Zap, CreditCard,
    Coins, Calendar, AlertCircle, ArrowUpCircle, Receipt, ShieldCheck,
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
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null); // string key

    const refresh = async () => {
        try {
            const [{ data: subData }, { data: planList }] = await Promise.all([
                axiosInstance.get('/subscriptions/me'),
                axiosInstance.get('/plans'),
            ]);
            setMe(subData);
            setPlans(planList || []);
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
    const currentPlanId = sub?.plan_id;
    const isActive = sub?.status === 'active' || sub?.status === 'trialing';

    const subscribe = async (planId) => {
        setActionLoading(`sub-${planId}`);
        try {
            const { data } = await axiosInstance.post('/subscriptions/checkout', { planId });
            window.location.href = data.url;
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to start checkout');
            setActionLoading(null);
        }
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
                            {statusInfo && (
                                <span className="pill" style={{ background: statusInfo.bg, color: statusInfo.color, borderColor: statusInfo.border }}>
                                    {statusInfo.label}
                                </span>
                            )}
                        </div>
                        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {sub?.plan ? (
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
                                return (
                                    <div key={p.id} className={`plan-card ${p.is_popular ? 'popular' : ''} ${isCurrent ? 'current' : ''}`}>
                                        {isCurrent && <span className="badge"><CheckCircle2 size={10} style={{ verticalAlign: -1, marginRight: 4 }} />Current</span>}
                                        {!isCurrent && p.is_popular && <span className="badge">Popular</span>}

                                        <div>
                                            <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{p.name}</div>
                                            {p.description && <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{p.description}</div>}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                            <span style={{ fontSize: 32, fontWeight: 700, color: '#111827' }}>{fmtMoney(p.price_cents)}</span>
                                            <span style={{ color: '#6b7280', fontSize: 14 }}>/ month</span>
                                        </div>

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
                                                    onClick={() => subscribe(p.id)}
                                                    disabled={isLoadingPlan}
                                                >
                                                    <Zap size={14} /> Subscribe
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

                <div style={{ height: 40 }} />
            </div>
        </div>
    );
}
