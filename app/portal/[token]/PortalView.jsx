'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import axiosInstance from '@/lib/axiosInstance';
import PortalEstimates from './PortalEstimates.jsx';
import PortalPolicyAnalyses from './PortalPolicyAnalyses.jsx';
import PortalTimeline from './PortalTimeline.jsx';
import PortalMessages from './PortalMessages.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Homeowner-facing portal — entry point.
//
// Flow:
//   1. Pull `token` from /portal/[token] URL via useParams().
//   2. POST-equivalent GET to /portal-public/<token> on the backend, which:
//        - validates UUID v4 format
//        - looks up the token row (active + not expired)
//        - enforces rate limit (200 views/day/token)
//        - logs the view (ip + user-agent)
//        - returns { token: {...}, client: {...} } or 404
//   3. On 404 → render a friendly "link invalid" message (no leaking which
//      failure mode it was).
//   4. On success → render contractor branding header + sections. Inner
//      sections (PortalEstimates, PortalPolicyAnalyses) still consume
//      clientId — once we know the client_portal_id from the resolved
//      payload, we pass it down unchanged.
// ─────────────────────────────────────────────────────────────────────────────
export default function PortalView() {
    const params = useParams();
    const search = useSearchParams();
    const token = params?.token;

    // `?analysis=<id>` and `?estimate=<id>` deep-link to a single artefact.
    const analysisId = search?.get('analysis') || undefined;
    const estimateId = search?.get('estimate') || undefined;

    const [state, setState] = useState({ loading: true, client: null, error: null });

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        (async () => {
            try {
                const { data } = await axiosInstance.get(
                    `/portal-public/${token}`,
                    { suppressErrorToast: true },
                );
                if (!cancelled) {
                    setState({ loading: false, client: data.client, error: null });
                }
            } catch (e) {
                if (cancelled) return;
                const status = e?.response?.status;
                setState({
                    loading: false,
                    client: null,
                    error: status === 404
                        ? 'This portal link is invalid or has expired. Please contact your contractor for a new link.'
                        : 'Unable to load this portal right now. Please try again in a moment.',
                });
            }
        })();
        return () => { cancelled = true; };
    }, [token]);

    if (state.loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-500 text-sm">Loading your portal…</div>
            </div>
        );
    }

    if (state.error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                    <div className="text-3xl mb-2">🔒</div>
                    <h1 className="text-lg font-semibold text-gray-900 mb-2">
                        Portal unavailable
                    </h1>
                    <p className="text-sm text-gray-600">{state.error}</p>
                </div>
            </div>
        );
    }

    const c = state.client;

    // White-label header. Contractor's logo (if uploaded) + company name go
    // here; ClaimKing branding stays out per spec. Fallback when no logo:
    // a navy/gold tile with the company's initials so the layout doesn't
    // collapse and the contractor still looks branded.
    const branding = c?.branding ?? {};
    const contractorName = branding.name || 'Your Contractor';
    const logoUrl = branding.logo_url;
    const initials = (contractorName || '')
        .split(/\s+/).filter(Boolean).slice(0, 2)
        .map((s) => s[0].toUpperCase()).join('') || 'C';

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Responsive polish: padding shrinks on small screens, header
                logo + text stack tighter, sections get less side-padding.
                Done via a small inline <style> instead of touching the
                shared globals.css so the rules are scoped to this page. */}
            <style>{`
                .pt-shell { padding-left: 1.5rem; padding-right: 1.5rem; }
                @media (max-width: 640px) {
                    .pt-shell { padding-left: 1rem; padding-right: 1rem; }
                    .pt-header { padding: 1rem !important; }
                    .pt-header h1 { font-size: 1.25rem !important; }
                    .pt-h2 { font-size: 1.05rem !important; }
                    .pt-section { padding-top: 1rem !important; }
                }
            `}</style>
            <header className="bg-white border-b border-gray-200 pt-header" style={{ padding: '1.25rem 1.5rem' }}>
                <div className="max-w-3xl mx-auto" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    {logoUrl ? (
                        // Use a regular <img> rather than next/image because the
                        // URL is arbitrary (any contractor's upload) and we
                        // don't want to maintain a remotePatterns allowlist.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={logoUrl}
                            alt={contractorName}
                            style={{
                                width: 48, height: 48, borderRadius: 10,
                                objectFit: 'cover', flexShrink: 0,
                                border: '1px solid #e5e7eb',
                            }}
                        />
                    ) : (
                        <div style={{
                            width: 48, height: 48, borderRadius: 10,
                            background: 'linear-gradient(135deg, #1a1f3a, #2d3561)',
                            color: '#FDB813', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: 16, flexShrink: 0,
                        }}>
                            {initials}
                        </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                            {contractorName}
                        </div>
                        <h1 className="text-2xl font-semibold text-gray-900" style={{ marginTop: 2 }}>
                            {c?.full_name ? `Hi ${c.full_name.split(' ')[0]} —` : 'Your Claim Portal'}
                        </h1>
                        <p className="text-sm text-gray-600" style={{ marginTop: 2 }}>
                            {c?.claim_number
                                ? `Claim #${c.claim_number} · ${c.status_label}`
                                : 'Track your claim progress below.'}
                        </p>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto pt-shell py-6 space-y-8">
                {/* Unified activity timeline — everything the contractor has
                    done on this claim, newest first. Filter tabs let the
                    homeowner narrow to estimates / mockups / status changes. */}
                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3 pt-h2">
                        Activity Timeline
                    </h2>
                    <PortalTimeline />
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3 pt-h2">
                        Your Estimates
                    </h2>
                    <PortalEstimates clientId={c.id} estimateId={estimateId} />
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3 pt-h2">
                        Your Policy Analyses
                    </h2>
                    <PortalPolicyAnalyses
                        clientId={c.id}
                        analysisId={analysisId}
                        embedded
                    />
                </section>

                {/* Two-way message thread. Homeowner posts → contractor
                    gets an email notification. Polled every 30s while
                    the tab is visible so replies appear without refresh. */}
                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3 pt-h2">
                        Message {contractorName}
                    </h2>
                    <PortalMessages contractorName={contractorName} />
                </section>
            </main>
        </div>
    );
}
