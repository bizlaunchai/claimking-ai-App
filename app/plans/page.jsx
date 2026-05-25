'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import axiosInstance from '@/lib/axiosInstance';

/**
 * Public pricing page — the header "Start Free Trial" target.
 *
 * Anyone (logged out OR logged in) can browse plans here. Picking a plan:
 *   - Guest          → /auth/sign-up (create an account, then onboarding
 *                      funnels them to /onboarding/select-plan to check out).
 *   - Logged in user → /onboarding/select-plan (the authenticated checkout
 *                      flow, which talks to Stripe).
 */
export default function PlansPage() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAuthed, setIsAuthed] = useState(false);
    const router = useRouter();

    useEffect(() => {
        (async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                setIsAuthed(!!user);

                const { data } = await axiosInstance.get('/plans/public');
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
    }, []);

    const choosePlan = () => {
        // Guests sign up first; authenticated users go straight to the
        // checkout flow on the onboarding plan picker.
        router.push(isAuthed ? '/onboarding/select-plan' : '/auth/login');
    };

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <header style={styles.header}>
                    <div style={styles.eyebrow}>PRICING</div>
                    <h1 style={styles.title}>Start your free trial</h1>
                    <p style={styles.subtitle}>
                        Pick the plan that fits your team. No credit card required to
                        get started — upgrade, downgrade, or cancel anytime.
                    </p>
                </header>

                {error && <div style={styles.errorBox}>{error}</div>}

                {loading ? (
                    <div style={styles.loading}>Loading plans…</div>
                ) : plans.length === 0 ? (
                    <div style={styles.empty}>
                        No active plans available right now. Please check back soon.
                    </div>
                ) : (
                    <div style={styles.grid}>
                        {plans.map((p) => (
                            <PlanCard key={p.id} plan={p} onChoose={choosePlan} />
                        ))}
                    </div>
                )}

                <footer style={styles.footer}>
                    {!isAuthed && (
                        <button onClick={() => router.push('/auth/login')} style={styles.linkBtn}>
                            Already have an account? Log in
                        </button>
                    )}
                    <p style={styles.footerNote}>
                        All plans are billed monthly. Cancel anytime from the billing
                        portal once you're set up.
                    </p>
                </footer>
            </div>
        </div>
    );
}

const PlanCard = ({ plan, onChoose }) => {
    const price = (plan.price_cents / 100).toLocaleString(undefined, {
        style: 'currency',
        currency: 'USD',
    });
    const features = Array.isArray(plan.features) ? plan.features : [];
    const trialDays = plan.trial_days ?? 0;
    const hasTrial = trialDays > 0;

    return (
        <div style={{
            ...styles.card,
            ...(plan.is_popular ? styles.cardPopular : {}),
        }}>
            {plan.is_popular && <div style={styles.badge}>MOST POPULAR</div>}
            <h2 style={styles.planName}>{plan.name}</h2>
            <p style={styles.planDesc}>{plan.description}</p>
            {hasTrial && (
                <div style={styles.trialPill}>
                    🎁 {trialDays}-day free trial
                </div>
            )}
            <div style={styles.priceRow}>
                <span style={styles.price}>{price}</span>
                <span style={styles.priceUnit}>/month</span>
            </div>
            {hasTrial && (
                <div style={styles.trialNote}>
                    Free for {trialDays} days, then {price}/month
                </div>
            )}
            {plan.monthly_credits != null && (
                <div style={styles.creditsRow}>
                    {plan.monthly_credits.toLocaleString()} credits / month
                </div>
            )}
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
                onClick={onChoose}
            >
                {hasTrial ? `Start ${trialDays}-day free trial` : `Choose ${plan.name}`}
            </button>
        </div>
    );
};

// ─── styles (inline so the page works with or without Tailwind setup) ──
const styles = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f9fafb 0%, #fef9e6 100%)',
        padding: '8rem 1rem 3rem',
        fontFamily:
            '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
    },
    container: { maxWidth: '1100px', margin: '0 auto' },
    header: { textAlign: 'center', marginBottom: '2.5rem' },
    eyebrow: {
        display: 'inline-block',
        color: '#d4a000',
        fontWeight: 800,
        letterSpacing: '1.5px',
        fontSize: '0.75rem',
        marginBottom: '0.5rem',
    },
    title: { fontSize: '2.5rem', fontWeight: 800, color: '#1a1f3a', margin: 0 },
    subtitle: {
        color: '#6b7280',
        marginTop: '0.75rem',
        fontSize: '1rem',
        maxWidth: '560px',
        marginLeft: 'auto',
        marginRight: 'auto',
    },
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
    trialPill: {
        display: 'inline-block',
        margin: '0 0 0.75rem',
        padding: '0.3rem 0.7rem',
        background: '#ecfdf5',
        color: '#047857',
        border: '1px solid #a7f3d0',
        borderRadius: '999px',
        fontSize: '0.78rem',
        fontWeight: 700,
    },
    trialNote: {
        marginTop: '0.35rem',
        color: '#047857',
        fontSize: '0.8rem',
        fontWeight: 600,
    },
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
    linkBtn: {
        background: 'transparent',
        border: 'none',
        color: '#d4a000',
        fontWeight: 700,
        textDecoration: 'underline',
        cursor: 'pointer',
        fontSize: '0.9rem',
    },
    footerNote: {
        marginTop: '0.5rem',
        color: '#9ca3af',
        fontSize: '0.8rem',
    },
};
