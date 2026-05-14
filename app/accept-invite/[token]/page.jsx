'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import axiosInstance from '@/lib/axiosInstance';

/**
 * Accept-invitation landing page.
 *
 * Flow:
 *   1. Mount → GET /accept-invite/:token (no auth required) — returns
 *      { company.name, inviter.full_name, role, email, ... }
 *   2. If the user is NOT logged in → render inline tabs: Sign In | Sign Up
 *      (both pre-filled with the invite's email).
 *   3. After successful auth (and email verification if enabled), the page
 *      auto-runs `acceptInvite()`.
 *   4. If the user IS already logged in → big "Accept invitation" button.
 *   5. acceptInvite() → POST /accept-invite/:token (auth required) →
 *      backend calls accept_team_invitation() RPC which atomically:
 *        - sets profiles.company_id, role, status='active', invited_by
 *        - marks invitation accepted_at + accepted_by_user_id
 *        - writes team_audit_log row
 *   6. On success → redirect to /dashboard.
 *
 * Middleware (lib/supabase/middleware.js) has `/accept-invite/*` on its
 * public allowlist, so unauthenticated users can land here without being
 * bounced to /auth/login.
 */
export default function AcceptInvitePage() {
    const params = useParams();
    const router = useRouter();
    const token = params?.token;

    const [invite, setInvite] = useState(null);
    const [loadingInvite, setLoadingInvite] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);

    const [user, setUser] = useState(null);            // logged-in user (if any)
    const [authChecking, setAuthChecking] = useState(true);

    const [mode, setMode] = useState('signup');         // 'signup' | 'signin'
    const [submitting, setSubmitting] = useState(false);

    // ── 1. Load invite preview + check current auth state ──────────────────
    useEffect(() => {
        if (!token) return;
        (async () => {
            try {
                const { data } = await axiosInstance.get(`/accept-invite/${token}`, {
                    suppressErrorToast: true,
                });
                setInvite(data);
            } catch (e) {
                setErrorMsg(
                    e?.userMessage ||
                    e?.response?.data?.message ||
                    'This invitation is invalid, expired, or has already been accepted.',
                );
            } finally {
                setLoadingInvite(false);
            }
        })();

        (async () => {
            const supabase = createClient();
            const { data: { user: u } } = await supabase.auth.getUser();
            setUser(u || null);
            setAuthChecking(false);
        })();
    }, [token]);

    // ── 2. acceptInvite — POST to backend ──────────────────────────────────
    const acceptInvite = async () => {
        setSubmitting(true);
        setErrorMsg(null);
        try {
            await axiosInstance.post(`/accept-invite/${token}`, {}, {
                suppressErrorToast: true,
            });
            // Land on dashboard — middleware will see the user now has a
            // company_id and unblock the route.
            window.location.href = '/dashboard?welcome=team';
        } catch (e) {
            setSubmitting(false);
            setErrorMsg(
                e?.userMessage ||
                e?.response?.data?.message ||
                'Failed to accept invitation. Please try again.',
            );
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────
    if (!token) {
        return (
            <Layout>
                <div style={styles.errorBox}>Missing invitation token in URL.</div>
            </Layout>
        );
    }

    if (loadingInvite || authChecking) {
        return (
            <Layout>
                <div style={styles.loading}>Loading invitation…</div>
            </Layout>
        );
    }

    if (errorMsg && !invite) {
        return (
            <Layout>
                <h1 style={styles.title}>Invitation unavailable</h1>
                <div style={styles.errorBox}>{errorMsg}</div>
                <p style={styles.muted}>
                    Ask the person who invited you to send a fresh invitation.
                </p>
                <button onClick={() => router.push('/')} style={styles.btnSecondary}>
                    Back to homepage
                </button>
            </Layout>
        );
    }

    const companyName = invite?.company?.name || 'their team';
    const inviterName = invite?.inviter?.full_name || invite?.inviter?.email || 'A teammate';
    const role = invite?.role || '';
    const inviteEmail = invite?.email || '';
    const isEmailMatchingLoggedInUser =
        user && user.email && user.email.toLowerCase() === inviteEmail.toLowerCase();

    return (
        <Layout>
            <header style={styles.headerBlock}>
                <h1 style={styles.title}>You've been invited!</h1>
                <p style={styles.subtitle}>
                    <strong>{inviterName}</strong> invited you to join{' '}
                    <strong>{companyName}</strong> as a{' '}
                    <span style={styles.rolePill}>{role}</span>
                </p>
            </header>

            {invite?.personal_message && (
                <blockquote style={styles.message}>"{invite.personal_message}"</blockquote>
            )}

            {errorMsg && <div style={styles.errorBox}>{errorMsg}</div>}

            {user ? (
                /* Logged in — let them accept directly */
                isEmailMatchingLoggedInUser ? (
                    <div style={styles.actions}>
                        <button
                            onClick={acceptInvite}
                            disabled={submitting}
                            style={styles.btnPrimary}
                        >
                            {submitting ? 'Joining…' : `Accept and join ${companyName}`}
                        </button>
                    </div>
                ) : (
                    /* Logged in BUT with a different account — block + offer logout */
                    <div>
                        <div style={styles.warningBox}>
                            This invite was sent to <strong>{inviteEmail}</strong> but
                            you're signed in as <strong>{user.email}</strong>. Sign out
                            and sign back in with the invited email to accept.
                        </div>
                        <div style={styles.actions}>
                            <button onClick={signOutAndReload} style={styles.btnSecondary}>
                                Sign out
                            </button>
                        </div>
                    </div>
                )
            ) : (
                /* Not logged in — show signup / signin */
                <AuthPanel
                    mode={mode}
                    setMode={setMode}
                    presetEmail={inviteEmail}
                    onAuthenticated={acceptInvite}
                />
            )}
        </Layout>
    );
}

const signOutAndReload = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
};

// =========================================================================
// AuthPanel — inline sign-in / sign-up tabs
// =========================================================================
const AuthPanel = ({ mode, setMode, presetEmail, onAuthenticated }) => {
    const [email, setEmail] = useState(presetEmail || '');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState(false);

    const [needsEmailVerify, setNeedsEmailVerify] = useState(false);

    const handle = async (e) => {
        e.preventDefault();
        setErr('');
        setBusy(true);
        const supabase = createClient();
        try {
            if (mode === 'signin') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                // Session is set immediately on sign-in — accept now.
                setTimeout(onAuthenticated, 250);
            } else {
                // Build a callback URL that exchanges the code AND honors
                // `next=/accept-invite/<token>` so the invitee returns here
                // after clicking the email verification link.
                const here = typeof window !== 'undefined' ? window.location.pathname : '';
                const origin = typeof window !== 'undefined' ? window.location.origin : '';
                const callback = `${origin}/auth/callback?next=${encodeURIComponent(here)}`;

                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: callback,
                        data: { first_name: firstName, last_name: lastName },
                    },
                });
                if (error) throw error;

                // If Supabase email confirmation is enabled, `data.session` is null
                // and the user must click a verification link before we can accept.
                if (!data.session) {
                    setNeedsEmailVerify(true);
                    setBusy(false);
                    return;
                }

                // Email confirmation disabled — session ready, accept now.
                setTimeout(onAuthenticated, 250);
            }
        } catch (e) {
            setErr(e?.message || 'Authentication failed');
            setBusy(false);
        }
    };

    if (needsEmailVerify) {
        return (
            <div style={styles.authPanel}>
                <div style={styles.successBox}>
                    <strong>Almost there!</strong>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', lineHeight: 1.5 }}>
                        We sent a verification email to <strong>{email}</strong>. Click
                        the link in that email, and you'll be brought back here to
                        finish accepting the invitation. The invitation stays valid
                        for 7 days.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handle} style={styles.authPanel}>
            <div style={styles.tabs}>
                <button
                    type="button"
                    onClick={() => setMode('signup')}
                    style={{ ...styles.tab, ...(mode === 'signup' ? styles.tabActive : {}) }}
                >Create account</button>
                <button
                    type="button"
                    onClick={() => setMode('signin')}
                    style={{ ...styles.tab, ...(mode === 'signin' ? styles.tabActive : {}) }}
                >I already have an account</button>
            </div>

            <div style={styles.field}>
                <label style={styles.label}>Email</label>
                <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={styles.input}
                    autoComplete="email"
                />
                {presetEmail && presetEmail.toLowerCase() !== email.toLowerCase() && (
                    <div style={styles.hint}>
                        Your invitation was sent to <strong>{presetEmail}</strong>. Sign up
                        with that address to accept it.
                    </div>
                )}
            </div>

            {mode === 'signup' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={styles.field}>
                        <label style={styles.label}>First name</label>
                        <input
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            style={styles.input}
                            autoComplete="given-name"
                        />
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label}>Last name</label>
                        <input
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            style={styles.input}
                            autoComplete="family-name"
                        />
                    </div>
                </div>
            )}

            <div style={styles.field}>
                <label style={styles.label}>Password</label>
                <input
                    type="password"
                    required
                    minLength={mode === 'signup' ? 8 : 1}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={styles.input}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />
                {mode === 'signup' && (
                    <div style={styles.hint}>At least 8 characters.</div>
                )}
            </div>

            {err && <div style={styles.errorBox}>{err}</div>}

            <button type="submit" disabled={busy} style={styles.btnPrimary}>
                {busy
                    ? 'Working…'
                    : mode === 'signup'
                        ? 'Create account & join team'
                        : 'Sign in & join team'}
            </button>
        </form>
    );
};

// =========================================================================
// Layout wrapper
// =========================================================================
const Layout = ({ children }) => (
    <div style={styles.page}>
        <div style={styles.card}>
            <div style={styles.logo}>
                <span style={styles.logoLetter}>C</span>
            </div>
            {children}
        </div>
    </div>
);

// =========================================================================
const styles = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f9fafb 0%, #fef9e6 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        fontFamily:
            '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
    },
    card: {
        width: '100%',
        maxWidth: '480px',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
        padding: '2.25rem 2rem',
    },
    logo: {
        width: '56px',
        height: '56px',
        margin: '0 auto 1.25rem',
        borderRadius: '14px',
        background: 'linear-gradient(135deg, #FDB813, #d4a000)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(253, 184, 19, 0.3)',
    },
    logoLetter: { fontSize: '1.5rem', fontWeight: 900, color: '#1a1f3a' },
    headerBlock: { textAlign: 'center', marginBottom: '1.25rem' },
    title: {
        fontSize: '1.5rem',
        fontWeight: 800,
        color: '#1a1f3a',
        margin: '0 0 0.5rem',
    },
    subtitle: {
        color: '#4b5563',
        fontSize: '0.95rem',
        lineHeight: 1.5,
        margin: 0,
    },
    rolePill: {
        display: 'inline-block',
        padding: '0.15rem 0.55rem',
        background: '#fef9e6',
        color: '#92400e',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginLeft: '0.25rem',
    },
    message: {
        background: '#fef9e6',
        borderLeft: '3px solid #FDB813',
        padding: '0.75rem 1rem',
        borderRadius: '0 6px 6px 0',
        fontSize: '0.875rem',
        color: '#92400e',
        margin: '0 0 1.25rem',
        fontStyle: 'italic',
    },
    actions: { marginTop: '1.25rem' },
    btnPrimary: {
        display: 'block',
        width: '100%',
        padding: '0.875rem 1rem',
        background: 'linear-gradient(135deg, #FDB813, #d4a000)',
        color: '#1a1f3a',
        border: 'none',
        borderRadius: '8px',
        fontWeight: 800,
        fontSize: '1rem',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(253, 184, 19, 0.3)',
    },
    btnSecondary: {
        display: 'inline-block',
        padding: '0.625rem 1rem',
        background: 'white',
        color: '#1a1f3a',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        fontWeight: 600,
        fontSize: '0.875rem',
        cursor: 'pointer',
    },
    errorBox: {
        background: '#fef2f2',
        color: '#b91c1c',
        border: '1px solid #fecaca',
        padding: '0.75rem 0.875rem',
        borderRadius: '8px',
        margin: '0.75rem 0',
        fontSize: '0.85rem',
    },
    successBox: {
        background: '#ecfdf5',
        color: '#065f46',
        border: '1px solid #a7f3d0',
        padding: '1rem 1.125rem',
        borderRadius: '8px',
        margin: '0.5rem 0',
        fontSize: '0.9rem',
    },
    warningBox: {
        background: '#fffbeb',
        color: '#92400e',
        border: '1px solid #fde68a',
        padding: '0.75rem 0.875rem',
        borderRadius: '8px',
        margin: '0.75rem 0',
        fontSize: '0.85rem',
        lineHeight: 1.5,
    },
    loading: { textAlign: 'center', color: '#6b7280', padding: '2rem' },
    muted: { color: '#6b7280', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.5rem' },
    authPanel: { marginTop: '1.25rem' },
    tabs: {
        display: 'flex',
        background: '#f3f4f6',
        borderRadius: '8px',
        padding: '4px',
        marginBottom: '1.25rem',
    },
    tab: {
        flex: 1,
        padding: '0.55rem 0.75rem',
        background: 'transparent',
        border: 'none',
        borderRadius: '6px',
        fontSize: '0.825rem',
        fontWeight: 600,
        color: '#6b7280',
        cursor: 'pointer',
    },
    tabActive: {
        background: 'white',
        color: '#1a1f3a',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    },
    field: { marginBottom: '0.875rem' },
    label: {
        display: 'block',
        fontSize: '0.8rem',
        fontWeight: 600,
        color: '#1a1f3a',
        marginBottom: '0.35rem',
    },
    input: {
        width: '100%',
        padding: '0.625rem 0.75rem',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        fontSize: '0.9rem',
        color: '#1a1f3a',
        backgroundColor: 'white',
        boxSizing: 'border-box',
    },
    hint: {
        fontSize: '0.75rem',
        color: '#6b7280',
        marginTop: '0.35rem',
    },
};
