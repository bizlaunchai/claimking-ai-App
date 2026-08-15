'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import axiosInstance from '@/lib/axiosInstance';
import PortalEstimates from './PortalEstimates.jsx';
import PortalPolicyAnalyses from './PortalPolicyAnalyses.jsx';
import PortalTimeline from './PortalTimeline.jsx';
import PortalMessages from './PortalMessages.jsx';
import PortalMockups from './PortalMockups.jsx';
import PortalDocuments from './PortalDocuments.jsx';
import PortalInsuranceComm from './PortalInsuranceComm.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Public homeowner-facing portal — single entry point.
//
// Redesigned UI:
//   * Cinematic gradient hero with animated aurora blobs + subtle grain.
//   * Floating glassmorphism stat cards that overlap the hero edge.
//   * Milestone-style progress with 12 dots, animated fill, and glow.
//   * Section cards with gradient icon chips, hover lift, and soft shadows.
//   * Mobile-first responsive — homeowners typically open the link on phones.
//   * Loading and error states are fully designed, not afterthoughts.
//
// Data flow unchanged: GET /portal-public/<token> → render.
// ─────────────────────────────────────────────────────────────────────────────

const STAGE_LABEL = {
    1:  'Need Claim Number',
    2:  'Awaiting Initial Inspection',
    3:  'Scheduled Inspection',
    4:  'In Progress',
    5:  'ITEL Sample Required',
    6:  'Reinspection Requested',
    7:  'Partial Approval',
    8:  'Supplementing',
    9:  'Final Check Processing',
    10: 'Completed',
    11: 'Declined',
    12: 'Cold / Lost',
};

const stageStyle = (s) => {
    if (s === 10) return { bg: 'rgba(220,252,231,0.95)', fg: '#065f46', label: 'On track' };
    if (s === 11) return { bg: 'rgba(254,226,226,0.95)', fg: '#991b1b', label: 'Closed' };
    if (s === 12) return { bg: 'rgba(243,244,246,0.95)', fg: '#4b5563', label: 'Closed' };
    if (s === 1)  return { bg: 'rgba(254,243,199,0.95)', fg: '#92400e', label: 'Action needed' };
    if (s >= 7 && s <= 9) return { bg: 'rgba(254,243,199,0.95)', fg: '#92400e', label: 'In negotiation' };
    return { bg: 'rgba(219,234,254,0.95)', fg: '#1e40af', label: 'In progress' };
};

// ─── Small inline SVG icon set (no external deps) ──────────────────────────
const Icon = {
    ClaimNumber: (p) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" {...p}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="8" y1="13" x2="16" y2="13"/>
            <line x1="8" y1="17" x2="13" y2="17"/>
        </svg>
    ),
    Money: (p) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" {...p}>
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
    ),
    Clock: (p) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" {...p}>
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
        </svg>
    ),
    Timeline: (p) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" {...p}>
            <circle cx="6" cy="6" r="2"/>
            <circle cx="6" cy="18" r="2"/>
            <line x1="6" y1="8" x2="6" y2="16"/>
            <line x1="11" y1="6" x2="20" y2="6"/>
            <line x1="11" y1="12" x2="20" y2="12"/>
            <line x1="11" y1="18" x2="20" y2="18"/>
        </svg>
    ),
    Estimate: (p) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" {...p}>
            <rect x="3" y="4" width="18" height="16" rx="2"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
            <line x1="9" y1="14" x2="15" y2="14"/>
            <line x1="9" y1="17" x2="13" y2="17"/>
        </svg>
    ),
    Policy: (p) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" {...p}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <polyline points="9 12 11 14 15 10"/>
        </svg>
    ),
    Message: (p) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" {...p}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
    ),
    Lock: (p) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" {...p}>
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
    ),
    Spark: (p) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" {...p}>
            <polygon points="12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9 12 2"/>
        </svg>
    ),
    Insurance: (p) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" {...p}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="M8 11h8"/>
            <path d="M8 8h5"/>
        </svg>
    ),
    Folder: (p) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" {...p}>
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
    ),
    Home: (p) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" {...p}>
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
    ),
};

// QA Q2.9 — homeowner-facing project schedule: the actual date once the crew
// sets it, plus the availability windows they'll work within and the deadline.
function PortalJobSchedule({ schedule }) {
    const fmtDay = (d) => d
        ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
        : null;
    const windows = Array.isArray(schedule.availability_windows) ? schedule.availability_windows : [];
    const scheduled = fmtDay(schedule.scheduled_start);
    return (
        <div className="pv-schedule">
            {scheduled ? (
                <div className="pv-sched-set">
                    <div className="pv-sched-label">Scheduled date</div>
                    <div className="pv-sched-date">📅 {scheduled}</div>
                </div>
            ) : (
                <div className="pv-sched-pending">Your crew will confirm the exact date soon.</div>
            )}
            {windows.length > 0 && (
                <div className="pv-sched-windows">
                    <div className="pv-sched-label">Planned work windows</div>
                    {windows.map((w, i) => (
                        <div className="pv-sched-window" key={i}>
                            {fmtDay(w.start)}{w.end && w.end !== w.start ? ` – ${fmtDay(w.end)}` : ''}
                            {w.note ? <span className="pv-sched-note"> · {w.note}</span> : null}
                        </div>
                    ))}
                </div>
            )}
            {schedule.complete_by && (
                <div className="pv-sched-deadline">Target completion by <strong>{fmtDay(schedule.complete_by)}</strong></div>
            )}
            <style jsx>{`
                .pv-schedule { display: flex; flex-direction: column; gap: 0.85rem; }
                .pv-sched-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #6b7280; margin-bottom: 0.25rem; }
                .pv-sched-date { font-size: 1.15rem; font-weight: 700; color: #047857; }
                .pv-sched-pending { font-size: 0.9rem; color: #6b7280; }
                .pv-sched-window { font-size: 0.9rem; color: #1a1f3a; padding: 0.15rem 0; }
                .pv-sched-note { color: #b45309; }
                .pv-sched-deadline { font-size: 0.88rem; color: #b45309; }
            `}</style>
        </div>
    );
}

export default function PortalView() {
    const params = useParams();
    const search = useSearchParams();
    const token = params?.token;

    // Deep-link params (QA Q0.2). Every client notification links to the exact
    // spot: a specific record (estimate/analysis/mockup/document) or, failing
    // a record, a section via `?focus=<tab>`. The backend builds these from one
    // shared helper (portal-deep-link.ts) so every notify path stays consistent.
    const analysisId = search?.get('analysis') || undefined;
    const estimateId = search?.get('estimate') || undefined;
    const mockupId = search?.get('mockup') || undefined;
    const documentId = search?.get('document') || undefined;
    const focusTab = search?.get('focus') || undefined;

    const [state, setState] = useState({ loading: true, client: null, error: null });
    // Which section group is on screen. Tabs keep the page short and scannable
    // instead of a single very long scroll — homeowners open this on phones.
    const [activeTab, setActiveTab] = useState('overview');

    // Open straight to the tab the notification was about, so the client lands
    // on the item instead of Overview. A specific-record param wins; otherwise
    // the explicit `?focus=<tab>` decides. Done in an effect (not the initial
    // useState) so the server-rendered 'overview' and the client's first render
    // agree — flipping the tab post-mount avoids a hydration mismatch.
    useEffect(() => {
        const valid = ['overview', 'estimate', 'insurance', 'documents', 'mockups', 'messages'];
        if (estimateId || analysisId) setActiveTab('estimate');
        else if (mockupId) setActiveTab('mockups');
        else if (documentId) setActiveTab('documents');
        else if (focusTab && valid.includes(focusTab)) setActiveTab(focusTab);
    }, [estimateId, analysisId, mockupId, documentId, focusTab]);

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
                    loading: false, client: null,
                    error: status === 404
                        ? 'This portal link is invalid or has expired. Please contact your contractor for a new link.'
                        : 'Unable to load this portal right now. Please try again in a moment.',
                });
            }
        })();
        return () => { cancelled = true; };
    }, [token]);

    // ── Loading ───────────────────────────────────────────────────────────
    if (state.loading) {
        return (
            <PageShell>
                <div className="pv-loader">
                    <div className="pv-loader-ring">
                        <div className="pv-loader-inner" />
                    </div>
                    <div className="pv-loader-text">Loading your claim portal…</div>
                    <div className="pv-loader-sub">Just a moment while we fetch your details</div>
                </div>
                <PortalStyles />
            </PageShell>
        );
    }

    // ── Error / invalid token ─────────────────────────────────────────────
    if (state.error) {
        return (
            <PageShell>
                <div className="pv-error-wrap">
                    <div className="pv-error-card">
                        <div className="pv-error-icon">
                            <Icon.Lock width="28" height="28" />
                        </div>
                        <h1 className="pv-error-title">Portal unavailable</h1>
                        <p className="pv-error-msg">{state.error}</p>
                        <div className="pv-error-divider" />
                        <div className="pv-error-help">
                            Need help? Reach out to your contractor for a fresh link.
                        </div>
                    </div>
                </div>
                <PortalStyles />
            </PageShell>
        );
    }

    // ── Main portal ────────────────────────────────────────────────────────
    const c = state.client;
    const branding = c?.branding ?? {};
    const contractorName = branding.name || 'Your Contractor';
    // `branding.logo_url` is an S3 key, not a loadable URL — the homeowner has
    // no auth to fetch it directly. Route it through the token-scoped proxy
    // (GET /portal-public/:token/logo), same as the mockup images.
    const logoSrc = branding.logo_url
        ? `${apiOrigin()}/portal-public/${token}/logo`
        : null;
    const initials = (contractorName || '')
        .split(/\s+/).filter(Boolean).slice(0, 2)
        .map((s) => s[0].toUpperCase()).join('') || 'C';

    const stage = c.claim_status ?? 1;
    const stageLabel = STAGE_LABEL[stage] || `Stage ${stage}`;

    /**
     * Switch to the Messages tab and drop the cursor in the box, so one tap
     * gets the homeowner from "I have a question" to typing — no matter which
     * tab they were on. The tab has to render first, so the scroll + focus
     * wait a tick. On `prefers-reduced-motion` the jump is instant.
     */
    const goToMessages = () => {
        const reduceMotion =
            typeof window !== 'undefined' &&
            window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

        setActiveTab('messages');

        const run = () => {
            const section = document.getElementById('pv-messages');
            if (!section) return;
            section.scrollIntoView({
                behavior: reduceMotion ? 'auto' : 'smooth',
                block: 'start',
            });
            const focusInput = () => section.querySelector('textarea')?.focus();
            if (reduceMotion) focusInput();
            else setTimeout(focusInput, 500);
        };
        // Let React paint the newly-active tab before we scroll to it.
        setTimeout(run, reduceMotion ? 0 : 60);
    };
    const stageStyleObj = stageStyle(stage);
    const progressPct = Math.max(0, Math.min(100, c.progress ?? 0));
    const firstName = c?.first_name || c?.full_name?.split(' ')[0] || 'there';

    // Tab groups. Each bundles the related sections so the page reads as a few
    // clean views rather than one endless scroll. Order mirrors how a homeowner
    // thinks about their claim: where it stands → the money → the carrier back-
    // and-forth → their files → talk to us.
    const TABS = [
        { key: 'overview',  label: 'Overview',  icon: <Icon.Home width="16" height="16" /> },
        { key: 'estimate',  label: 'My Estimate',  icon: <Icon.Estimate width="16" height="16" /> },
        { key: 'insurance', label: 'Insurance Communication', icon: <Icon.Insurance width="16" height="16" /> },
        { key: 'documents', label: 'Documents', icon: <Icon.Folder width="16" height="16" /> },
        { key: 'mockups',   label: '3D Mockups', icon: <Icon.Spark width="16" height="16" /> },
        { key: 'messages',  label: 'Messages',  icon: <Icon.Message width="16" height="16" /> },
    ];

    return (
        <PageShell>
            {/* ── Hero — clean light header with a single gold accent strip.
                 The previous dark aurora-gradient design felt heavy on a
                 utility page; this is simpler, easier to read, and lets
                 the contractor's branding speak rather than competing
                 with multicolour blob effects. ─────────────────────────── */}
            <section className="pv-hero">
                <div className="pv-hero-accent" />
                <div className="pv-container pv-hero-inner">
                    <div className="pv-brand-row">
                        <BrandLogo
                            src={logoSrc}
                            alt={contractorName}
                            initials={initials}
                            className="pv-logo"
                            fallbackClassName="pv-logo-fallback"
                        />
                        <div className="pv-brand-meta">
                            <div className="pv-brand-name">{contractorName}</div>
                            <div className="pv-brand-tag">
                                <span className="pv-brand-dot" />
                                Your private claim portal
                            </div>
                        </div>
                    </div>

                    <div className="pv-hero-body">
                        <h1 className="pv-greeting">
                            Hi {firstName}<span className="pv-wave">👋</span>
                        </h1>
                        <p className="pv-sub">
                            Here's exactly where your insurance claim stands today.
                            {' '}{contractorName} will keep this page updated as work progresses —
                            no logins, no hassle.
                        </p>

                        <div className="pv-chip-row">
                            <span className="pv-stage-chip" style={{ background: stageStyleObj.bg, color: stageStyleObj.fg }}>
                                <span className="pv-stage-dot" style={{ background: stageStyleObj.fg }} />
                                Stage {stage} of 12 · {stageLabel}
                            </span>
                            <span className="pv-stage-chip pv-stage-chip-ghost">
                                <Icon.Spark width="12" height="12" />
                                {stageStyleObj.label}
                            </span>
                        </div>

                        {/* The message box lives at the bottom of a long page —
                            without this, a homeowner with a question has to
                            scroll past everything to find it. */}
                    </div>
                </div>
            </section>

            {/* ── Floating stat cards ──────────────────────────────────────── */}
            <section className="pv-container pv-stats-wrap">
                <div className="pv-stats">
                    <StatCard
                        icon={<Icon.ClaimNumber width="18" height="18" />}
                        accent="blue"
                        label="Claim Number"
                        value={c.claim_number || 'Pending'}
                        sub={c.insurance_company ? prettyCarrier(c.insurance_company) : 'Insurance carrier'}
                    />
                    <StatCard
                        icon={<Icon.Money width="18" height="18" />}
                        accent="green"
                        label="Estimated Value"
                        value={c.claim_value ? formatMoney(c.claim_value) : '—'}
                        sub="Subject to carrier approval"
                    />
                    <StatCard
                        icon={<Icon.Clock width="18" height="18" />}
                        accent="amber"
                        label="Last Updated"
                        value={c.updated_at ? formatRelative(c.updated_at) : '—'}
                        sub={c.updated_at ? new Date(c.updated_at).toLocaleDateString() : 'No updates yet'}
                    />
                </div>
            </section>

            {/* ── Progress ─────────────────────────────────────────────────── */}
            <section className="pv-container">
                <div className="pv-card pv-progress-card">
                    <div className="pv-card-head">
                        <div>
                            <div className="pv-card-eyebrow">Claim Progress</div>
                            <h2 className="pv-h2">You're on stage {stage} of 12</h2>
                        </div>
                        <div className="pv-progress-pct">
                            {progressPct}<span className="pv-progress-pct-pct">%</span>
                        </div>
                    </div>

                    <div className="pv-progress-track">
                        <div className="pv-progress-fill" style={{ width: `${progressPct}%` }}>
                            <div className="pv-progress-shimmer" />
                        </div>
                    </div>

                    {/* 12 milestone dots */}
                    <div className="pv-milestones">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
                            const reached = n <= stage;
                            const current = n === stage;
                            return (
                                <div
                                    key={n}
                                    className={`pv-milestone ${reached ? 'reached' : ''} ${current ? 'current' : ''}`}
                                    title={STAGE_LABEL[n]}
                                >
                                    <span className="pv-milestone-dot" />
                                </div>
                            );
                        })}
                    </div>

                    <div className="pv-progress-stage">
                        <span className="pv-progress-stage-label">Current stage:</span>
                        <strong>{stageLabel}</strong>
                    </div>
                </div>
            </section>

            {/* ── Sticky tab navigation ────────────────────────────────────
                 Breaks the page into a few scannable views. Sticks to the top
                 on scroll so the homeowner can always jump between sections.
                 Horizontally scrollable on narrow phones. */}
            <div className="pv-tabnav-outer" role="navigation" aria-label="Portal sections">
                <div className="pv-container">
                    <div className="pv-tabnav" role="tablist">
                        {TABS.map((t) => (
                            <button
                                key={t.key}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === t.key}
                                className={`pv-tab${activeTab === t.key ? ' active' : ''}`}
                                onClick={() => setActiveTab(t.key)}
                            >
                                <span className="pv-tab-ico">{t.icon}</span>
                                <span className="pv-tab-label">{t.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Tab panels. `key={activeTab}` replays the fade-in on switch. */}
            <div className="pv-tabpanel" key={activeTab}>
                {activeTab === 'overview' && c.job_schedule && (
                    <SectionCard
                        icon={<Icon.Home width="18" height="18" />}
                        accent="green"
                        title="Project Schedule"
                        subtitle="When your crew is set to work"
                    >
                        <PortalJobSchedule schedule={c.job_schedule} />
                    </SectionCard>
                )}

                {activeTab === 'overview' && (
                    <SectionCard
                        icon={<Icon.Timeline width="18" height="18" />}
                        accent="indigo"
                        title="Activity Timeline"
                        subtitle="Every update from your contractor, in one place"
                    >
                        <PortalTimeline />
                    </SectionCard>
                )}

                {activeTab === 'estimate' && (
                    <>
                        <SectionCard
                            icon={<Icon.Estimate width="18" height="18" />}
                            accent="green"
                            title="Estimates"
                            subtitle="Your roofing estimates with full breakdowns"
                        >
                            <PortalEstimates clientId={c.id} estimateId={estimateId} />
                        </SectionCard>
                        <SectionCard
                            icon={<Icon.Policy width="18" height="18" />}
                            accent="purple"
                            title="Policy Analyses"
                            subtitle="What your policy covers — explained in plain English"
                        >
                            <PortalPolicyAnalyses clientId={c.id} analysisId={analysisId} embedded />
                        </SectionCard>
                    </>
                )}

                {activeTab === 'insurance' && (
                    <SectionCard
                        icon={<Icon.Insurance width="18" height="18" />}
                        accent="purple"
                        title="Insurance Communication"
                        subtitle={`Updates on what's happening with your claim and ${contractorName}'s carrier contact`}
                    >
                        <PortalInsuranceComm />
                    </SectionCard>
                )}

                {activeTab === 'documents' && (
                    <SectionCard
                        icon={<Icon.Folder width="18" height="18" />}
                        accent="indigo"
                        title="Other Documents"
                        subtitle="Contracts, reports and paperwork your contractor has shared"
                    >
                        <PortalDocuments />
                    </SectionCard>
                )}

                {activeTab === 'mockups' && (
                    <SectionCard
                        icon={<Icon.Spark width="18" height="18" />}
                        accent="amber"
                        title="3D Mockups"
                        subtitle="Color and material previews of your finished roof"
                    >
                        <PortalMockups highlightId={mockupId} />
                    </SectionCard>
                )}

                {activeTab === 'messages' && (
                    <SectionCard
                        id="pv-messages"
                        icon={<Icon.Message width="18" height="18" />}
                        accent="amber"
                        title={`Message ${contractorName}`}
                        subtitle="Replies go straight to your contractor's inbox"
                    >
                        <PortalMessages contractorName={contractorName} />
                    </SectionCard>
                )}
            </div>

            {activeTab !== 'messages' && (
                <MessagesFab onClick={goToMessages} label="Message us" />
            )}

            {/* ── Footer ──────────────────────────────────────────────────
                 Three-tier layout:
                   1. Brand row — small contractor logo + name (centered)
                   2. Privacy note — lock icon + private-link reminder
                   3. Bottom bar — © year + "Powered by ClaimKing.AI"
                 Quiet visual treatment so it never competes with the page
                 content, but feels structured rather than orphaned. */}
            <footer className="pv-footer">
                <div className="pv-container pv-footer-inner">
                    <div className="pv-footer-brand-row">
                        <BrandLogo
                            src={logoSrc}
                            alt={contractorName}
                            initials={initials}
                            className="pv-footer-logo"
                            fallbackClassName="pv-footer-logo-fallback"
                        />
                        <div className="pv-footer-brand">{contractorName}</div>
                    </div>

                    <p className="pv-footer-note">
                        <Icon.Lock width="12" height="12" style={{ verticalAlign: '-2px', marginRight: 6 }} />
                        This portal link is private to you. Please don't forward or share it — anyone with the URL can see your claim details.
                    </p>

                    <div className="pv-footer-divider" />

                    <div className="pv-footer-bar">
                        <span className="pv-footer-copy">
                            © {new Date().getFullYear()} {contractorName}
                        </span>
                        <span className="pv-footer-credit">
                            Powered by <span className="pv-footer-brand-name">ClaimKing<span className="pv-footer-dot">.</span>AI</span>
                        </span>
                    </div>
                </div>
            </footer>

            <PortalStyles />
        </PageShell>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small presentational helpers
// ─────────────────────────────────────────────────────────────────────────────
function PageShell({ children }) {
    return (
        <div className="pv-shell">
            {children}
        </div>
    );
}

// Absolute API origin for <img src> proxies (same base axiosInstance uses),
// so token-scoped image URLs resolve across dev / staging / prod.
function apiOrigin() {
    return (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
}

/**
 * Contractor logo with a graceful fallback to their initials.
 *
 * `src` is the token-scoped proxy URL (or null when the company has no logo).
 * If the image fails to load — no logo on file, S3 miss, expired link — we drop
 * to the initials chip instead of leaving a broken-image icon in the header.
 */
function BrandLogo({ src, alt, initials, className, fallbackClassName }) {
    const [broken, setBroken] = useState(!src);
    useEffect(() => { setBroken(!src); }, [src]);

    if (broken || !src) {
        return <div className={`${className} ${fallbackClassName}`}>{initials}</div>;
    }
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className={className} onError={() => setBroken(true)} />
    );
}

function StatCard({ icon, label, value, sub, accent = 'blue' }) {
    return (
        <div className={`pv-stat pv-stat-${accent}`}>
            <div className="pv-stat-top">
                <div className={`pv-stat-icon pv-stat-icon-${accent}`}>{icon}</div>
                <div className="pv-stat-label">{label}</div>
            </div>
            <div className="pv-stat-value">{value}</div>
            {sub && <div className="pv-stat-sub">{sub}</div>}
        </div>
    );
}

/**
 * Floating "message us" shortcut.
 *
 * The parent only mounts it when the Messages tab is NOT active — a shortcut to
 * a view you're already on is just clutter. A short mount delay lets the
 * entrance transition play instead of the button popping in.
 */
function MessagesFab({ onClick, label }) {
    const [show, setShow] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setShow(true), 50);
        return () => clearTimeout(t);
    }, []);

    return (
        <button
            type="button"
            className={`pv-msg-fab${show ? ' is-visible' : ''}`}
            onClick={onClick}
        >
            <Icon.Message width="18" height="18" />
            <span className="pv-msg-fab-label">{label}</span>
        </button>
    );
}

function SectionCard({ id, icon, title, subtitle, children, accent = 'blue' }) {
    return (
        <section className="pv-container" id={id}>
            <div className="pv-section">
                <div className="pv-section-title-row">
                    <div className={`pv-section-icon pv-section-icon-${accent}`}>{icon}</div>
                    <div>
                        <div className="pv-section-title">{title}</div>
                        {subtitle && <div className="pv-section-sub">{subtitle}</div>}
                    </div>
                </div>
                <div className="pv-card">
                    {children}
                </div>
            </div>
        </section>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatting utilities
// ─────────────────────────────────────────────────────────────────────────────
function formatMoney(value) {
    const n = Number(value) || 0;
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toLocaleString()}`;
}

function formatRelative(iso) {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - then) / 1000));
    if (diffSec < 60)              return 'Just now';
    if (diffSec < 3600)            return `${Math.floor(diffSec / 60)} min ago`;
    if (diffSec < 86_400)          return `${Math.floor(diffSec / 3600)} hours ago`;
    if (diffSec < 86_400 * 7)      return `${Math.floor(diffSec / 86_400)} days ago`;
    if (diffSec < 86_400 * 30)     return `${Math.floor(diffSec / (86_400 * 7))} weeks ago`;
    return new Date(iso).toLocaleDateString();
}

function prettyCarrier(slug) {
    const map = {
        'state-farm': 'State Farm',
        'allstate':   'Allstate',
        'farmers':    'Farmers',
        'liberty':    'Liberty Mutual',
        'usaa':       'USAA',
        'other':      'Other',
    };
    return map[slug] || slug;
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles — single <style> block kept at the bottom so the JSX stays readable.
// ─────────────────────────────────────────────────────────────────────────────
function PortalStyles() {
    return (
        <style>{`
            /* ── Animations ─────────────────────────────────────────────── */
            @keyframes pv-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes pv-fade-up {
                from { opacity: 0; transform: translateY(12px); }
                to   { opacity: 1; transform: translateY(0);    }
            }
            @keyframes pv-fade-in {
                from { opacity: 0; }
                to   { opacity: 1; }
            }
            @keyframes pv-float-1 {
                0%, 100% { transform: translate(0, 0)     scale(1);   }
                50%      { transform: translate(40px, -30px) scale(1.1); }
            }
            @keyframes pv-float-2 {
                0%, 100% { transform: translate(0, 0)     scale(1);   }
                50%      { transform: translate(-50px, 30px) scale(1.15); }
            }
            @keyframes pv-float-3 {
                0%, 100% { transform: translate(0, 0)     scale(1);   }
                50%      { transform: translate(20px, 40px) scale(0.95); }
            }
            @keyframes pv-shimmer {
                0%   { transform: translateX(-100%); }
                100% { transform: translateX(200%);  }
            }
            @keyframes pv-wave {
                0%, 60%, 100% { transform: rotate(0deg);  }
                10%, 30%      { transform: rotate(14deg); }
                20%           { transform: rotate(-8deg); }
                40%           { transform: rotate(10deg); }
            }
            @keyframes pv-pulse {
                0%, 100% { transform: scale(1);   opacity: 1;   }
                50%      { transform: scale(1.3); opacity: 0.6; }
            }

            /* ── Shell ──────────────────────────────────────────────────── */
            .pv-shell {
                min-height: 100vh;
                background:
                    radial-gradient(ellipse at top, rgba(253,184,19,0.04), transparent 60%),
                    linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
                font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
                color: #1f2937;
                padding-bottom: 2rem;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }

            .pv-container {
                max-width: 920px;
                margin: 0 auto;
                padding: 0 1.5rem;
            }

            /* ── Loading state ──────────────────────────────────────────── */
            .pv-loader {
                min-height: 80vh;
                display: flex; flex-direction: column;
                align-items: center; justify-content: center;
                gap: 16px;
                animation: pv-fade-in 0.4s ease;
            }
            .pv-loader-ring {
                width: 56px; height: 56px;
                border-radius: 50%;
                background: conic-gradient(from 0deg, transparent 0%, #FDB813 80%, transparent 100%);
                animation: pv-spin 1s linear infinite;
                position: relative;
                padding: 4px;
            }
            .pv-loader-inner {
                width: 100%; height: 100%;
                border-radius: 50%;
                background: #f8fafc;
            }
            .pv-loader-text {
                color: #1a1f3a;
                font-size: 16px;
                font-weight: 700;
                letter-spacing: -0.01em;
            }
            .pv-loader-sub {
                color: #6b7280;
                font-size: 13px;
            }

            /* ── Error state ────────────────────────────────────────────── */
            .pv-error-wrap {
                min-height: 80vh;
                display: flex; align-items: center; justify-content: center;
                padding: 1rem;
            }
            .pv-error-card {
                max-width: 460px; width: 100%;
                background: #fff;
                border-radius: 20px;
                padding: 2.5rem 2rem 2rem;
                text-align: center;
                box-shadow:
                    0 1px 2px rgba(15,23,42,0.04),
                    0 12px 40px rgba(15,23,42,0.08);
                border: 1px solid #eef0f4;
                animation: pv-fade-up 0.5s ease;
            }
            .pv-error-icon {
                width: 64px; height: 64px;
                border-radius: 16px;
                margin: 0 auto 1.25rem;
                background: linear-gradient(135deg, #fef2f2, #fee2e2);
                color: #dc2626;
                display: flex; align-items: center; justify-content: center;
                box-shadow: 0 4px 12px rgba(220,38,38,0.15);
            }
            .pv-error-title {
                font-size: 22px;
                font-weight: 800;
                color: #1a1f3a;
                margin: 0 0 8px;
                letter-spacing: -0.02em;
            }
            .pv-error-msg {
                font-size: 14px;
                color: #6b7280;
                line-height: 1.65;
                margin: 0;
            }
            .pv-error-divider {
                height: 1px;
                background: #eef0f4;
                margin: 1.5rem 0 1rem;
            }
            .pv-error-help {
                font-size: 12px;
                color: #9ca3af;
            }

            /* ── Hero ───────────────────────────────────────────────────── */
            /* ── Hero ────────────────────────────────────────────────────
               Clean white card. Top is bordered by a thin gold accent strip
               (the only "brand colour" on the hero) — everything else stays
               neutral so the contractor's logo + the homeowner's name are
               the actual focal points. No dark gradient, no blobs, no grain. */
            .pv-hero {
                position: relative;
                background: #ffffff;
                color: #1a1f3a;
                padding: 2.75rem 0 2.25rem;
                border-bottom: 1px solid #eef0f4;
            }
            .pv-hero-accent {
                position: absolute;
                left: 0; right: 0; top: 0;
                height: 3px;
                background: linear-gradient(90deg, #FDB813 0%, #d4a000 50%, #FDB813 100%);
            }
            .pv-hero-inner { position: relative; }

            .pv-brand-row {
                display: flex; align-items: center; gap: 0.875rem;
                margin-bottom: 1.75rem;
                animation: pv-fade-up 0.4s ease;
            }
            .pv-logo {
                width: 44px; height: 44px;
                border-radius: 10px;
                object-fit: cover;
                flex-shrink: 0;
                border: 1px solid #eef0f4;
                background: #fff;
                box-shadow: 0 2px 6px rgba(15,23,42,0.05);
            }
            .pv-logo-fallback {
                background: #1a1f3a;
                color: #FDB813;
                display: flex; align-items: center; justify-content: center;
                font-weight: 800;
                font-size: 15px;
                border: none;
            }
            .pv-brand-meta { line-height: 1.35; }
            .pv-brand-name {
                font-weight: 700;
                font-size: 0.95rem;
                color: #1a1f3a;
            }
            .pv-brand-tag {
                display: flex; align-items: center; gap: 0.4rem;
                font-size: 0.65rem;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                font-weight: 600;
                margin-top: 3px;
            }
            .pv-brand-dot {
                width: 5px; height: 5px;
                border-radius: 50%;
                background: #16a34a;
                box-shadow: 0 0 0 0 rgba(22,163,74,0.5);
                animation: pv-pulse 2s ease-in-out infinite;
            }

            .pv-hero-body { animation: pv-fade-up 0.5s ease; }
            .pv-greeting {
                font-size: 2rem;
                font-weight: 800;
                margin: 0;
                letter-spacing: -0.025em;
                line-height: 1.15;
                color: #1a1f3a;
            }
            .pv-wave {
                display: inline-block;
                margin-left: 6px;
                transform-origin: 70% 70%;
                animation: pv-wave 2.5s ease-in-out infinite;
            }
            .pv-sub {
                margin: 0.625rem 0 1.25rem;
                color: #6b7280;
                font-size: 0.95rem;
                line-height: 1.6;
                max-width: 560px;
            }
            .pv-chip-row {
                display: flex; gap: 0.5rem; flex-wrap: wrap;
            }
            .pv-stage-chip {
                display: inline-flex; align-items: center; gap: 0.45rem;
                padding: 0.4rem 0.8rem;
                border-radius: 999px;
                font-size: 0.75rem;
                font-weight: 700;
                line-height: 1;
            }
            /* "Ghost" chip on the light hero — subtle gray pill, not the
               translucent white from the old dark-mode design. */
            .pv-stage-chip-ghost {
                background: #f3f4f6;
                color: #4b5563;
                border: 1px solid #e5e7eb;
            }
            .pv-stage-dot {
                width: 6px; height: 6px;
                border-radius: 50%;
            }

            /* ── Jump-to-messages ─────────────────────────────────────────
               The message box sits at the bottom of a long page. Two ways in:
                 1. a hero button, seen the moment the page opens
                 2. a floating pill that appears once you scroll past the hero
                    and hides again when the message box is on screen. */
            .pv-hero-msg-btn {
                display: inline-flex; align-items: center; gap: 0.5rem;
                margin-top: 1.25rem;
                padding: 0.7rem 1.25rem;
                border: none;
                border-radius: 10px;
                background: linear-gradient(135deg, #FDB813, #d4a000);
                color: #1a1f3a;
                font-family: inherit;
                font-size: 0.875rem;
                font-weight: 700;
                cursor: pointer;
                box-shadow: 0 4px 14px rgba(253, 184, 19, 0.35);
                transition: transform 0.15s ease, box-shadow 0.15s ease;
            }
            .pv-hero-msg-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(253, 184, 19, 0.45);
            }

            .pv-msg-fab {
                position: fixed;
                right: 20px;
                bottom: 20px;
                z-index: 40;
                display: inline-flex; align-items: center; gap: 0.5rem;
                padding: 0.8rem 1.15rem;
                border: none;
                border-radius: 999px;
                background: linear-gradient(135deg, #FDB813, #d4a000);
                color: #1a1f3a;
                font-family: inherit;
                font-size: 0.875rem;
                font-weight: 700;
                cursor: pointer;
                box-shadow: 0 8px 24px rgba(26, 31, 58, 0.28);
                /* Parked out of reach until needed — visibility (not display)
                   so the fade can actually run. */
                opacity: 0;
                visibility: hidden;
                transform: translateY(14px);
                transition: opacity 0.25s ease, transform 0.25s ease, visibility 0.25s;
            }
            .pv-msg-fab.is-visible {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }
            .pv-msg-fab:hover { filter: brightness(1.05); }

            /* A brief gold wash so it's obvious where the jump landed. */
            #pv-messages { scroll-margin-top: 16px; }
            .pv-flash .pv-card {
                animation: pv-flash-highlight 1.4s ease-out;
            }
            @keyframes pv-flash-highlight {
                0%   { box-shadow: 0 0 0 3px rgba(253, 184, 19, 0.55); }
                100% { box-shadow: 0 0 0 0 rgba(253, 184, 19, 0); }
            }

            @media (max-width: 520px) {
                /* Icon-only on small screens so the pill never covers content. */
                .pv-msg-fab { padding: 0.85rem; }
                .pv-msg-fab-label { display: none; }
            }

            @media (prefers-reduced-motion: reduce) {
                .pv-msg-fab { transition: none; }
                .pv-flash .pv-card { animation: none; }
            }

            /* ── Stat cards ───────────────────────────────────────────────
               No longer overlapping the hero — hero is light now so the
               floating-card trick lost its visual purpose. Standard gap. */
            .pv-stats-wrap {
                margin-top: 1.5rem;
                position: relative;
                animation: pv-fade-up 0.55s ease;
            }
            .pv-stats {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 0.875rem;
            }
            .pv-stat {
                background: #fff;
                border-radius: 16px;
                padding: 1.25rem 1.25rem;
                border: 1px solid #eef0f4;
                box-shadow:
                    0 1px 2px rgba(15,23,42,0.04),
                    0 8px 24px rgba(15,23,42,0.05);
                transition: transform 0.25s ease, box-shadow 0.25s ease;
                position: relative;
                overflow: hidden;
            }
            .pv-stat::before {
                content: '';
                position: absolute;
                top: 0; left: 0; right: 0;
                height: 3px;
                background: var(--accent, #FDB813);
                opacity: 0.9;
            }
            .pv-stat-blue   { --accent: linear-gradient(90deg, #3b82f6, #6366f1); }
            .pv-stat-green  { --accent: linear-gradient(90deg, #10b981, #059669); }
            .pv-stat-amber  { --accent: linear-gradient(90deg, #FDB813, #f59e0b); }
            .pv-stat-purple { --accent: linear-gradient(90deg, #a855f7, #7c3aed); }
            .pv-stat-indigo { --accent: linear-gradient(90deg, #6366f1, #4f46e5); }

            .pv-stat:hover {
                transform: translateY(-3px);
                box-shadow:
                    0 1px 2px rgba(15,23,42,0.04),
                    0 16px 32px rgba(15,23,42,0.09);
            }
            .pv-stat-top {
                display: flex; align-items: center; gap: 0.5rem;
                margin-bottom: 0.625rem;
            }
            .pv-stat-icon {
                width: 32px; height: 32px;
                border-radius: 10px;
                display: flex; align-items: center; justify-content: center;
                flex-shrink: 0;
            }
            .pv-stat-icon-blue   { background: linear-gradient(135deg, #dbeafe, #e0e7ff); color: #2563eb; }
            .pv-stat-icon-green  { background: linear-gradient(135deg, #dcfce7, #d1fae5); color: #059669; }
            .pv-stat-icon-amber  { background: linear-gradient(135deg, #fef3c7, #fef9e6); color: #b45309; }
            .pv-stat-icon-purple { background: linear-gradient(135deg, #f3e8ff, #ede9fe); color: #7c3aed; }
            .pv-stat-icon-indigo { background: linear-gradient(135deg, #e0e7ff, #ede9fe); color: #4f46e5; }

            .pv-stat-label {
                font-size: 0.68rem;
                color: #6b7280;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.06em;
            }
            .pv-stat-value {
                font-size: 1.25rem;
                font-weight: 800;
                color: #1a1f3a;
                line-height: 1.2;
                overflow-wrap: anywhere;
                letter-spacing: -0.02em;
            }
            .pv-stat-sub {
                font-size: 0.72rem;
                color: #9ca3af;
                margin-top: 4px;
            }

            /* ── Cards & sections ───────────────────────────────────────── */
            .pv-card {
                background: #fff;
                border-radius: 18px;
                padding: 1.5rem;
                border: 1px solid #eef0f4;
                box-shadow:
                    0 1px 2px rgba(15,23,42,0.03),
                    0 6px 20px rgba(15,23,42,0.04);
            }
            .pv-card-head {
                display: flex; align-items: flex-start; justify-content: space-between;
                gap: 1rem;
                margin-bottom: 1rem;
            }
            .pv-card-eyebrow {
                font-size: 0.7rem;
                color: #6b7280;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                margin-bottom: 4px;
            }
            .pv-h2 {
                font-size: 1.1rem;
                font-weight: 800;
                color: #1a1f3a;
                margin: 0;
                letter-spacing: -0.02em;
            }
            /* ── Sticky tab navigation ──────────────────────────────────── */
            .pv-tabnav-outer {
                position: sticky;
                top: 0;
                z-index: 30;
                margin-top: 1.75rem;
                background: rgba(248,250,252,0.85);
                backdrop-filter: saturate(180%) blur(12px);
                -webkit-backdrop-filter: saturate(180%) blur(12px);
                border-bottom: 1px solid #eef0f4;
            }
            .pv-tabnav {
                display: flex;
                gap: 0.35rem;
                padding: 0.6rem 0 0.35rem;
                overflow-x: auto;
                scrollbar-width: thin;
                scrollbar-color: #cbd2dc transparent;
                scroll-snap-type: x proximity;
            }
            .pv-tabnav::-webkit-scrollbar { height: 6px; }
            .pv-tabnav::-webkit-scrollbar-track { background: transparent; }
            .pv-tabnav::-webkit-scrollbar-thumb {
                background: #cbd2dc;
                border-radius: 999px;
            }
            .pv-tabnav::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            .pv-tab {
                flex: 0 0 auto;
                display: inline-flex;
                align-items: center;
                gap: 0.45rem;
                padding: 0.6rem 1rem;
                border: 1px solid transparent;
                border-radius: 11px;
                background: transparent;
                color: #64748b;
                font-family: inherit;
                font-size: 0.85rem;
                font-weight: 700;
                letter-spacing: -0.01em;
                cursor: pointer;
                white-space: nowrap;
                scroll-snap-align: start;
                transition: background 0.18s ease, color 0.18s ease,
                            border-color 0.18s ease, transform 0.12s ease,
                            box-shadow 0.18s ease;
            }
            .pv-tab:hover {
                color: #1a1f3a;
                background: #ffffff;
                border-color: #eef0f4;
            }
            .pv-tab:active { transform: translateY(1px); }
            .pv-tab .pv-tab-ico {
                display: inline-flex;
                color: #94a3b8;
                transition: color 0.18s ease;
            }
            .pv-tab:hover .pv-tab-ico { color: #64748b; }
            .pv-tab.active {
                background: #1a1f3a;
                color: #ffffff;
                border-color: #1a1f3a;
                box-shadow: 0 6px 16px rgba(26,31,58,0.22);
            }
            .pv-tab.active .pv-tab-ico { color: #FDB813; }

            .pv-tabpanel { animation: pv-fade-up 0.4s ease both; }

            .pv-section {
                margin-top: 1.75rem;
                animation: pv-fade-up 0.5s ease both;
            }
            /* First section inside a tab panel sits closer to the tab bar. */
            .pv-tabpanel .pv-section:first-child { margin-top: 1.5rem; }
            .pv-section-title-row {
                display: flex; align-items: center; gap: 0.75rem;
                margin-bottom: 0.875rem;
            }
            .pv-section-icon {
                width: 40px; height: 40px;
                border-radius: 12px;
                display: flex; align-items: center; justify-content: center;
                flex-shrink: 0;
                box-shadow: 0 2px 8px rgba(15,23,42,0.05);
            }
            .pv-section-icon-blue   { background: linear-gradient(135deg, #dbeafe, #eff6ff); color: #2563eb; border: 1px solid #dbeafe; }
            .pv-section-icon-green  { background: linear-gradient(135deg, #dcfce7, #f0fdf4); color: #059669; border: 1px solid #dcfce7; }
            .pv-section-icon-amber  { background: linear-gradient(135deg, #fef3c7, #fffbeb); color: #b45309; border: 1px solid #fef3c7; }
            .pv-section-icon-purple { background: linear-gradient(135deg, #f3e8ff, #faf5ff); color: #7c3aed; border: 1px solid #f3e8ff; }
            .pv-section-icon-indigo { background: linear-gradient(135deg, #e0e7ff, #eef2ff); color: #4f46e5; border: 1px solid #e0e7ff; }

            .pv-section-title {
                font-size: 1.1rem;
                font-weight: 800;
                color: #1a1f3a;
                letter-spacing: -0.02em;
            }
            .pv-section-sub {
                font-size: 0.8rem;
                color: #6b7280;
                margin-top: 2px;
            }

            /* ── Progress ───────────────────────────────────────────────── */
            .pv-progress-card {
                padding: 1.5rem 1.75rem;
                margin-top: 1.5rem;
                background: linear-gradient(135deg, #ffffff 0%, #fefbf2 100%);
                border: 1px solid #fef3c7;
            }
            .pv-progress-pct {
                font-size: 2rem;
                font-weight: 800;
                color: #1a1f3a;
                font-feature-settings: 'tnum';
                line-height: 1;
                letter-spacing: -0.04em;
                background: linear-gradient(135deg, #FDB813, #d4a000);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            .pv-progress-pct-pct {
                font-size: 1rem;
                margin-left: 2px;
                color: #FDB813;
                -webkit-text-fill-color: #FDB813;
            }
            .pv-progress-track {
                position: relative;
                height: 12px;
                background: #f3f4f6;
                border-radius: 999px;
                overflow: hidden;
                margin: 0.75rem 0 1rem;
                box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
            }
            .pv-progress-fill {
                position: relative;
                height: 100%;
                background: linear-gradient(90deg, #FDB813, #f59e0b, #d4a000);
                border-radius: 999px;
                transition: width 0.8s cubic-bezier(.22,1,.36,1);
                box-shadow:
                    0 0 0 1px rgba(212,160,0,0.18),
                    0 0 12px rgba(253,184,19,0.4);
                overflow: hidden;
            }
            .pv-progress-shimmer {
                position: absolute;
                top: 0; left: 0; bottom: 0;
                width: 40%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
                animation: pv-shimmer 2.4s ease-in-out infinite;
            }

            .pv-milestones {
                display: grid;
                grid-template-columns: repeat(12, 1fr);
                gap: 4px;
                margin: 0.75rem 0 1rem;
            }
            .pv-milestone {
                display: flex; justify-content: center;
            }
            .pv-milestone-dot {
                width: 8px; height: 8px;
                border-radius: 50%;
                background: #e5e7eb;
                transition: all 0.3s ease;
            }
            .pv-milestone.reached .pv-milestone-dot {
                background: #FDB813;
                box-shadow: 0 0 0 2px rgba(253,184,19,0.2);
            }
            .pv-milestone.current .pv-milestone-dot {
                background: #FDB813;
                width: 10px; height: 10px;
                box-shadow:
                    0 0 0 3px rgba(253,184,19,0.25),
                    0 0 12px rgba(253,184,19,0.6);
                animation: pv-pulse 2s ease-in-out infinite;
            }

            .pv-progress-stage {
                font-size: 0.875rem;
                color: #374151;
                padding: 0.625rem 0.875rem;
                background: rgba(253,184,19,0.08);
                border-radius: 10px;
                border: 1px dashed rgba(253,184,19,0.35);
            }
            .pv-progress-stage-label {
                color: #6b7280;
                margin-right: 6px;
            }
            .pv-progress-stage strong {
                color: #1a1f3a;
                font-weight: 800;
            }

            /* ── Footer ───────────────────────────────────────────────────
               Quiet, centred, three-tier. Slightly off-white background +
               a top border for separation; no gradients. */
            .pv-footer {
                margin-top: 3.5rem;
                padding: 2.5rem 0 2rem;
                border-top: 1px solid #eef0f4;
                background: #fcfcfd;
            }
            .pv-footer-inner {
                display: flex; flex-direction: column; align-items: center;
                text-align: center;
                gap: 1rem;
            }

            /* Brand row — small logo + contractor name */
            .pv-footer-brand-row {
                display: flex; align-items: center; gap: 0.625rem;
            }
            .pv-footer-logo {
                width: 28px; height: 28px;
                border-radius: 7px;
                object-fit: cover;
                border: 1px solid #eef0f4;
                background: #fff;
            }
            .pv-footer-logo-fallback {
                background: #1a1f3a;
                color: #FDB813;
                display: flex; align-items: center; justify-content: center;
                font-weight: 800;
                font-size: 11px;
                border: none;
            }
            .pv-footer-brand {
                font-weight: 700;
                color: #1a1f3a;
                font-size: 0.95rem;
                letter-spacing: -0.01em;
            }

            /* Privacy note — soft gray, single line on desktop, max-width
               so it stays readable when it wraps on small screens. */
            .pv-footer-note {
                margin: 0;
                font-size: 0.78rem;
                color: #6b7280;
                line-height: 1.55;
                max-width: 440px;
            }

            /* Hairline divider before the copyright bar */
            .pv-footer-divider {
                width: 40px;
                height: 1px;
                background: #e5e7eb;
                margin: 0.25rem 0;
            }

            /* Bottom bar — copyright on left, credit on right (stacked on mobile) */
            .pv-footer-bar {
                display: flex; align-items: center; gap: 0.875rem;
                font-size: 0.72rem;
                color: #9ca3af;
                flex-wrap: wrap;
                justify-content: center;
            }
            .pv-footer-copy { font-weight: 500; }
            .pv-footer-credit { font-weight: 500; }
            .pv-footer-brand-name {
                color: #6b7280;
                font-weight: 700;
                letter-spacing: -0.01em;
            }
            .pv-footer-dot { color: #FDB813; }

            /* ── Mobile tuning ──────────────────────────────────────────── */
            @media (max-width: 720px) {
                .pv-container { padding: 0 1rem; }
                .pv-hero { padding: 2rem 0 3.5rem; }
                .pv-greeting { font-size: 1.65rem; }
                .pv-sub { font-size: 0.875rem; }
                .pv-stats { grid-template-columns: 1fr; gap: 0.625rem; }
                .pv-stats-wrap { margin-top: -2rem; }
                .pv-stat { padding: 1rem 1.125rem; }
                .pv-card { padding: 1.25rem; border-radius: 16px; }
                .pv-progress-card { padding: 1.25rem 1.25rem; }
                .pv-progress-pct { font-size: 1.65rem; }
                .pv-section-icon { width: 36px; height: 36px; }
                .pv-section-title { font-size: 1.025rem; }
                .pv-footer { padding: 2rem 0 1.5rem; }
                .pv-footer-note { font-size: 0.75rem; }
                .pv-milestone-dot { width: 6px; height: 6px; }
                .pv-milestone.current .pv-milestone-dot { width: 8px; height: 8px; }
            }

            @media (max-width: 420px) {
                .pv-greeting { font-size: 1.45rem; }
                .pv-brand-row { gap: 0.625rem; margin-bottom: 1.5rem; }
                .pv-logo { width: 44px; height: 44px; }
                .pv-stat-value { font-size: 1.1rem; }
            }

            /* ── Reduced motion ─────────────────────────────────────────── */
            @media (prefers-reduced-motion: reduce) {
                .pv-aurora, .pv-wave, .pv-progress-shimmer,
                .pv-brand-dot, .pv-milestone.current .pv-milestone-dot {
                    animation: none !important;
                }
            }
        `}</style>
    );
}
