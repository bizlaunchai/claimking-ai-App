'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import axiosInstance from '@/lib/axiosInstance';

/**
 * Mandatory plan selection page.
 *
 * Middleware (lib/supabase/middleware.js) redirects any authenticated user
 * with `profiles.company_id = NULL` and role != 'superadmin' here. They
 * cannot reach any dashboard / AI tool until they pick a plan.
 *
 * Flow:
 *   1. Page mounts → fetch active plans (GET /plans).
 *   2. User picks a plan → POST /subscriptions/checkout { planId } → Stripe URL.
 *   3. User completes Stripe checkout → webhook fires → company auto-created
 *      (create_company_for_user RPC) → user redirected to success_url.
 *   4. On return, middleware sees company_id is set and unblocks the dashboard.
 */
export default function SelectPlanPage() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionPlanId, setActionPlanId] = useState(null);
    const [userEmail, setUserEmail] = useState(null);
    const router = useRouter();

    useEffect(() => {
        (async () => {
            try {
                // Pull authed user — show email for context. If no user, bounce.
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.replace('/auth/login');
                    return;
                }
                setUserEmail(user.email ?? null);

                const { data } = await axiosInstance.get('/plans');
                const active = (data?.plans ?? data ?? []).filter(
                    (p) => p.status === 'active',
                );
                active.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
                setPlans(active);
            } catch (e) {
                setError(e?.response?.data?.message || e.message || 'Failed to load plans');
            } finally {
                setLoading(false);
            }
        })();
    }, [router]);

    const subscribe = async (planId) => {
        setActionPlanId(planId);
        setError(null);
        try {
            const { data } = await axiosInstance.post('/subscriptions/checkout', {
                planId,
                // Stripe success_url returns here; webhook will have created the
                // company by then so the redirect to /dashboard succeeds.
                successUrl: `${window.location.origin}/dashboard?welcome=1`,
                cancelUrl: `${window.location.origin}/onboarding/select-plan`,
            });
            window.location.href = data.url;
        } catch (e) {
            setError(e?.response?.data?.message || 'Could not start checkout');
            setActionPlanId(null);
        }
    };

    const signOut = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.replace('/');
    };

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <header style={styles.header}>
                    <div style={styles.logo}>
                        <span style={styles.logoLetter}>C</span>
                    </div>
                    <h1 style={styles.title}>Choose your plan</h1>
                    <p style={styles.subtitle}>
                        Welcome to ClaimKing.AI{userEmail ? `, ${userEmail}` : ''} —
                        pick a plan to unlock the dashboard, AI tools, and team
                        features.
                    </p>
                </header>

                {error && <div style={styles.errorBox}>{error}</div>}

                {loading ? (
                    <div style={styles.loading}>Loading plans…</div>
                ) : plans.length === 0 ? (
                    <div style={styles.empty}>
                        No active plans available. Contact support.
                    </div>
                ) : (
                    <div style={styles.grid}>
                        {plans.map((p) => (
                            <PlanCard
                                key={p.id}
                                plan={p}
                                onSubscribe={() => subscribe(p.id)}
                                loading={actionPlanId === p.id}
                            />
                        ))}
                    </div>
                )}

                <footer style={styles.footer}>
                    <button onClick={signOut} style={styles.signOutBtn}>
                        Sign out
                    </button>
                    <p style={styles.footerNote}>
                        All plans are billed monthly. Cancel anytime from the billing
                        portal once you're set up.
                    </p>
                </footer>
            </div>
        </div>
    );
}

const PlanCard = ({ plan, onSubscribe, loading }) => {
    const price = (plan.price_cents / 100).toLocaleString(undefined, {
        style: 'currency',
        currency: 'USD',
    });
    const features = Array.isArray(plan.features) ? plan.features : [];

    return (
        <div style={{
            ...styles.card,
            ...(plan.is_popular ? styles.cardPopular : {}),
        }}>
            {plan.is_popular && <div style={styles.badge}>MOST POPULAR</div>}
            <h2 style={styles.planName}>{plan.name}</h2>
            <p style={styles.planDesc}>{plan.description}</p>
            <div style={styles.priceRow}>
                <span style={styles.price}>{price}</span>
                <span style={styles.priceUnit}>/month</span>
            </div>
            <div style={styles.creditsRow}>
                {plan.monthly_credits.toLocaleString()} credits / month
            </div>
            {plan.seat_limit && (
                <div style={styles.seats}>Up to {plan.seat_limit} team members</div>
            )}
            <ul style={styles.featureList}>
                {features.map((f, i) => (
                    <li key={i} style={styles.featureItem}>✓ {f}</li>
                ))}
            </ul>
            <button
                style={{
                    ...styles.subscribeBtn,
                    ...(plan.is_popular ? styles.subscribeBtnPopular : {}),
                }}
                onClick={onSubscribe}
                disabled={loading}
            >
                {loading ? 'Starting checkout…' : `Subscribe to ${plan.name}`}
            </button>
        </div>
    );
};

// ─── styles (inline so the page works with or without Tailwind setup) ──
const styles = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f9fafb 0%, #fef9e6 100%)',
        padding: '2.5rem 1rem',
        fontFamily:
            '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
    },
    container: { maxWidth: '1100px', margin: '0 auto' },
    header: { textAlign: 'center', marginBottom: '2rem' },
    logo: {
        width: '64px',
        height: '64px',
        margin: '0 auto 1rem',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #FDB813, #d4a000)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(253, 184, 19, 0.3)',
    },
    logoLetter: { fontSize: '2rem', fontWeight: 900, color: '#1a1f3a' },
    title: { fontSize: '2rem', fontWeight: 800, color: '#1a1f3a', margin: 0 },
    subtitle: { color: '#6b7280', marginTop: '0.5rem', fontSize: '0.95rem' },
    errorBox: {
        background: '#fef2f2',
        color: '#b91c1c',
        border: '1px solid #fecaca',
        padding: '0.875rem 1rem',
        borderRadius: '8px',
        marginBottom: '1.5rem',
        fontSize: '0.875rem',
    },
    loading: { textAlign: 'center', padding: '3rem', color: '#6b7280' },
    empty: {
        textAlign: 'center',
        padding: '3rem',
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        color: '#6b7280',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem',
    },
    card: {
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '16px',
        padding: '1.75rem 1.5rem',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
    },
    cardPopular: {
        border: '2px solid #FDB813',
        boxShadow: '0 8px 24px rgba(253, 184, 19, 0.2)',
        transform: 'translateY(-4px)',
    },
    badge: {
        position: 'absolute',
        top: '-12px',
        right: '20px',
        background: 'linear-gradient(135deg, #FDB813, #d4a000)',
        color: '#1a1f3a',
        padding: '0.25rem 0.75rem',
        borderRadius: '4px',
        fontSize: '0.7rem',
        fontWeight: 800,
        letterSpacing: '0.5px',
    },
    planName: { fontSize: '1.25rem', fontWeight: 700, color: '#1a1f3a', margin: 0 },
    planDesc: { fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 1rem' },
    priceRow: { display: 'flex', alignItems: 'baseline', gap: '0.25rem' },
    price: { fontSize: '2.25rem', fontWeight: 800, color: '#1a1f3a' },
    priceUnit: { color: '#6b7280', fontSize: '0.875rem' },
    creditsRow: {
        marginTop: '0.5rem',
        padding: '0.5rem 0.75rem',
        background: '#fef9e6',
        color: '#92400e',
        borderRadius: '6px',
        fontSize: '0.85rem',
        fontWeight: 600,
        display: 'inline-block',
    },
    seats: { fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem' },
    featureList: { listStyle: 'none', padding: 0, margin: '1rem 0', flex: 1 },
    featureItem: {
        fontSize: '0.85rem',
        color: '#374151',
        padding: '0.25rem 0',
        borderBottom: '1px dashed #f3f4f6',
    },
    subscribeBtn: {
        marginTop: '1rem',
        padding: '0.75rem 1rem',
        background: 'white',
        color: '#1a1f3a',
        border: '1.5px solid #1a1f3a',
        borderRadius: '8px',
        fontWeight: 700,
        cursor: 'pointer',
        fontSize: '0.9rem',
        transition: 'all 0.15s ease',
    },
    subscribeBtnPopular: {
        background: 'linear-gradient(135deg, #FDB813, #d4a000)',
        color: '#1a1f3a',
        border: 'none',
    },
    footer: { marginTop: '2.5rem', textAlign: 'center' },
    signOutBtn: {
        background: 'transparent',
        border: 'none',
        color: '#6b7280',
        textDecoration: 'underline',
        cursor: 'pointer',
        fontSize: '0.85rem',
    },
    footerNote: {
        marginTop: '0.5rem',
        color: '#9ca3af',
        fontSize: '0.8rem',
    },
};
