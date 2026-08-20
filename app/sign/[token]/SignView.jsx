'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import axiosInstance from '@/lib/axiosInstance';
import SignaturePad from '@/components/signature/SignaturePad';
import { loadSignWellEmbed } from '@/lib/signwellEmbed';
import './sign.css';

const money = (n, cur = 'usd') =>
    `${(cur || 'usd').toUpperCase() === 'USD' ? '$' : ''}${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// `companies.logo_url` is stored as an S3 KEY, not a fetchable URL. Homeowners
// are unauthenticated, so we load the logo through the token-less public endpoint
// keyed by company_id (same one the portal + branded emails use).
const apiOrigin = () => (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

// Full structured Terms & Conditions on the homeowner sign page — mirrors the
// contractor PDF so the client signs the EXACT same terms: the short_terms list,
// the industry pricing note, the payment / card-authorization box, and the full
// legal body. Fed from the estimate's persisted `terms_json` (sql/95).
const SignTerms = ({ terms, website }) => {
    if (!terms || typeof terms !== 'object') return null;
    const shortTerms = Array.isArray(terms.short_terms) ? terms.short_terms.filter(Boolean) : [];
    const pay = terms.payment_terms ?? {};
    const hasPay = pay.card_processing_fee || pay.card_on_file || pay.payment_due;
    const fullTerms = typeof terms.full_terms === 'string' ? terms.full_terms.trim() : '';
    if (!shortTerms.length && !terms.industry_pricing_note && !hasPay && !fullTerms) return null;
    return (
        <>
            {shortTerms.length > 0 && (
                <ul className="sv-terms-list">
                    {shortTerms.map((t, i) => (
                        <li key={i} dangerouslySetInnerHTML={{ __html: t }} />
                    ))}
                </ul>
            )}
            {website && (
                <p className="sv-terms-fineprint">Full Terms &amp; Conditions at {website}/terms-and-conditions</p>
            )}
            {terms.industry_pricing_note && (
                <div className="sv-terms-note">
                    <strong>Industry Pricing Note:</strong> {terms.industry_pricing_note}
                </div>
            )}
            {hasPay && (
                <div className="sv-terms-pay">
                    <h4>Payment Terms &amp; Card Authorization</h4>
                    {pay.card_processing_fee && <p><strong>Card Processing Fee:</strong> {pay.card_processing_fee}</p>}
                    {pay.card_on_file && <p><strong>Card on File &amp; Auto-Charge Authorization:</strong> {pay.card_on_file}</p>}
                    {pay.payment_due && <p><strong>Payment Due:</strong> {pay.payment_due}</p>}
                </div>
            )}
            {/* Reuses .sv-terms-body (white-space: pre-wrap, CK-13) so the \n\n
                paragraph breaks + <strong> headers in full_terms render cleanly. */}
            {fullTerms && (
                <div className="sv-terms-body" dangerouslySetInnerHTML={{ __html: fullTerms }} />
            )}
        </>
    );
};

const SignView = () => {
    const { token } = useParams();

    // ── Data flow ───────────────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    const [signerName, setSignerName] = useState('');
    const [agreedTerms, setAgreedTerms] = useState(false);
    const [hasInk, setHasInk] = useState(false);
    const [logoBroken, setLogoBroken] = useState(false);
    // The signature pad is only mounted on step 2. Once the homeowner advances to
    // the Confirm step the pad unmounts and `padRef.current` becomes null, so we
    // snapshot the drawn PNG here when leaving step 2 and submit from this snapshot.
    const [signatureData, setSignatureData] = useState(null);

    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    // True while we finalize a SignWell signature after the redirect-back, so we
    // show a "completing your signature" screen instead of the sign flow again.
    // Set in the effect below (NOT the initializer) so SSR and the first client
    // render agree — reading the URL during render would break hydration.
    const [finalizing, setFinalizing] = useState(false);
    // Inline submit error (replaces native alert() on the Confirm step).
    const [submitError, setSubmitError] = useState('');

    // DocuSign-style guided flow: 0 Review · 1 Name · 2 Signature · 3 Confirm
    const [step, setStep] = useState(0);
    const STEPS = ['Review', 'Your name', 'Signature', 'Confirm'];

    // SignWell e-sign (real vendor). When the estimate resolve says esign is
    // available we drive an embedded SignWell flow; on any failure we set
    // `esignFallback` and the existing drawn-signature flow takes over.
    const [esignUrl, setEsignUrl] = useState(null);
    const [esignBusy, setEsignBusy] = useState(false);
    const [esignFallback, setEsignFallback] = useState(false);

    // CK-13 — legal-defensibility: the homeowner must scroll to the bottom of the
    // CURRENT step (terms included) before the Next / Sign control unlocks. Tracked
    // per step; short steps that fit the viewport auto-satisfy it.
    const [atBottom, setAtBottom] = useState(false);

    const padRef = useRef(null);
    const embedRef = useRef(null); // SignWell embed instance
    // Invisible marker at the very end of the current step's scrollable content.
    // The reached-the-bottom gate below watches it (CK-13).
    const bottomRef = useRef(null);

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await axiosInstance.get(`/sign-public/${token}`, { suppressErrorToast: true });
                if (cancelled) return;
                setData(res.data?.data ?? null);
                setSignerName(res.data?.data?.signer_name ?? '');
            } catch (err) {
                if (cancelled) return;
                const status = err?.response?.status;
                const msg =
                    err?.userMessage || err?.response?.data?.message || err?.message ||
                    'Could not load this signing link.';
                setError({ status: status ?? 0, message: msg });
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [token]);

    // After SignWell signing, the vendor redirects the WHOLE page back here with
    // ?document_status=completed — tearing down the in-page poll before it can
    // finalize. So on that redirect we hit the status endpoint (which pulls the
    // signed PDF + finalizes), retrying since the completed PDF can take a moment,
    // then show the confirmation (or head to deposit checkout) and clean the URL.
    useEffect(() => {
        if (typeof window === 'undefined' || !token) return;
        const params = new URLSearchParams(window.location.search);
        if (params.get('document_status') !== 'completed') return;
        let alive = true;
        setFinalizing(true);
        (async () => {
            for (let i = 0; i < 5 && alive; i++) {
                try {
                    const res = await axiosInstance.get(`/sign-public/${token}/status`, { suppressErrorToast: true });
                    const s = res.data?.data || {};
                    if (s.esign_status === 'completed') {
                        if (s.deposit_checkout_url) { window.location.href = s.deposit_checkout_url; return; }
                        if (alive) setSubmitted(true);
                        break;
                    }
                } catch { /* ignore, retry */ }
                await new Promise((r) => setTimeout(r, 2000));
            }
            if (alive) window.history.replaceState({}, '', window.location.pathname);
            if (alive) setFinalizing(false);
        })();
        return () => { alive = false; };
    }, [token]);

    // ── CK-13 · reached-the-bottom gate (IntersectionObserver) ──────────
    // Legal-defensibility: the Next / Sign control stays locked until the bottom
    // of the CURRENT step's content scrolls into view. We watch an invisible
    // sentinel at the end of the content instead of doing scrollHeight math.
    // The old math broke on iOS Safari: `.sv-shell { min-height: 100vh }` sizes
    // to the LARGE viewport (URL bar hidden) while `window.innerHeight` is the
    // SMALL one, leaving a phantom ~40–90px of "unscrolled" height so a page
    // that already fit the screen never unlocked. A sentinel that's already on
    // screen (short page) fires `isIntersecting` immediately → unlocks at once.
    // Once reached, the gate stays open even if the client scrolls back up; it
    // only re-arms on a step change.
    useEffect(() => {
        if (loading || error || submitted) return;
        const el = bottomRef.current;
        if (!el) return;
        // New step starts at the top with the gate re-armed.
        setAtBottom(false);
        window.scrollTo(0, 0);
        const io = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setAtBottom(true); },
            // Pull the trigger line up past the sticky CTA bar (CK-12) so the
            // sentinel must clear it, not merely touch the nav-covered edge.
            { root: null, threshold: 0, rootMargin: '0px 0px -64px 0px' },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [step, loading, submitted, error, data]);

    // CK-12 — the sticky CTA doubles as an anchor: until they've reached the
    // bottom, tapping it carries them to what's left instead of advancing.
    const scrollToNext = () => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    };

    // When the homeowner returns to the signature step, redraw their captured
    // signature onto the freshly-mounted (blank) pad so it isn't lost visually.
    // A rAF lets the pad's own mount/resize (which wipes the canvas) settle first.
    useEffect(() => {
        if (step !== 2 || !signatureData) return;
        const id = requestAnimationFrame(() => padRef.current?.fromDataURL(signatureData));
        return () => cancelAnimationFrame(id);
    }, [step, signatureData]);

    const totals = useMemo(() => {
        if (!data?.estimate) return null;
        const e = data.estimate;
        return {
            subtotal: Number(e.subtotal ?? 0),
            overhead: Number(e.overhead_amt ?? 0),
            tax: Number(e.tax_amt ?? 0),
            total: Number(e.total_rcv ?? 0),
        };
    }, [data]);

    const deposit = data?.deposit ?? null;
    // hasDeposit → a deposit is ATTACHED (spec §3: the action must read "Sign &
    // Pay" whenever a payment is attached, regardless of how it's collected).
    // payAtSign → we can charge it now (Stripe connected) so we redirect to
    // Stripe after signing; otherwise the contractor collects it separately.
    const hasDeposit = !!(deposit && Number(deposit.amount) > 0);
    const payAtSign = !!(hasDeposit && deposit.chargeable);
    const depositNote = hasDeposit && !deposit.chargeable;

    // ── Step nav ────────────────────────────────────────────────────────
    // Reactive validity of the current step drives the Next button's disabled
    // state, so we never fall back to a native alert() prompt. A signature counts
    // as present via live ink OR the snapshot taken when advancing past step 2
    // (the homeowner may have drawn it, gone to Confirm, then stepped back).
    const signatureCaptured = hasInk || !!signatureData;
    const currentStepValid =
        step === 1 ? !!signerName.trim()
            : step === 2 ? signatureCaptured
                : true;
    // Inline hint shown in the sticky bar explaining WHY Next is disabled.
    const stepHint =
        step === 1 && !signerName.trim() ? 'Enter your full legal name to continue.'
            : step === 2 && !signatureCaptured ? 'Please sign in the box to continue.'
                : '';
    const next = () => {
        if (!currentStepValid) return; // defensive — the button is disabled anyway
        // Snapshot the signature before the pad unmounts on the next step.
        if (step === 2 && padRef.current && !padRef.current.isEmpty()) {
            setSignatureData(padRef.current.toDataURL('image/png'));
        }
        setStep((s) => Math.min(STEPS.length - 1, s + 1));
    };
    const back = () => setStep((s) => Math.max(0, s - 1));

    // ── Submit (+ pay) ──────────────────────────────────────────────────
    const submit = async () => {
        // Prefer the live pad if it's still mounted (step 2); otherwise use the
        // snapshot taken when the homeowner advanced past the signature step.
        const signatureDataUrl =
            (padRef.current && !padRef.current.isEmpty())
                ? padRef.current.toDataURL('image/png')
                : signatureData;
        setSubmitError('');
        // These send the homeowner back to the step that still needs input, where
        // the disabled Next + inline hint guide them (no native prompt).
        if (!signatureDataUrl) { setStep(2); return; }
        if (!signerName.trim()) { setStep(1); return; }
        if (!agreedTerms) { setSubmitError('Please tick the box to confirm you agree to the estimate terms.'); return; }

        setSubmitting(true);
        try {
            const res = await axiosInstance.post(`/sign-public/${token}`, {
                signer_name: signerName.trim(),
                signature_image: signatureDataUrl,
            });
            // Sign & Pay: the sign response carries the deposit checkout URL when a
            // deposit is due + the contractor's Stripe is connected. Redirect to pay.
            const payUrl = res.data?.data?.deposit_checkout_url;
            if (payUrl) { window.location.href = payUrl; return; }
            setSubmitted(true);
        } catch (err) {
            const msg = err?.response?.data?.message || err?.userMessage || 'Could not submit your signature. Please try again.';
            setSubmitError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    // ── SignWell embedded signing ───────────────────────────────────────
    const startSignwell = async () => {
        setEsignBusy(true);
        setSubmitError('');
        try {
            const res = await axiosInstance.post(`/sign-public/${token}/signwell/start`, {
                signer_name: (signerName || data?.signer_name || '').trim() || undefined,
            });
            const d = res.data?.data || {};
            if (d.completed) { setSubmitted(true); return; }
            if (d.mode === 'signwell' && d.embedded_url) { setEsignUrl(d.embedded_url); return; }
            // mode 'inapp' or anything unexpected → fall back to the drawn flow.
            setEsignFallback(true);
        } catch {
            setEsignFallback(true);
        } finally {
            setEsignBusy(false);
        }
    };

    // Poll for completion while the SignWell frame is open.
    useEffect(() => {
        if (!esignUrl || !token) return;
        const id = setInterval(async () => {
            try {
                const res = await axiosInstance.get(`/sign-public/${token}/status`, { suppressErrorToast: true });
                const s = res.data?.data || {};
                if (s.esign_status === 'completed') {
                    clearInterval(id);
                    if (s.deposit_checkout_url) { window.location.href = s.deposit_checkout_url; return; }
                    setSubmitted(true);
                } else if (s.esign_status === 'declined') {
                    clearInterval(id);
                    setEsignUrl(null);
                    setSubmitError('Signing was declined. You can try again.');
                }
            } catch { /* keep polling */ }
        }, 3500);
        return () => clearInterval(id);
    }, [esignUrl, token]);

    // Mount the SignWell embed via their SDK. A raw <iframe src> is blocked by
    // SignWell's X-Frame-Options ("refused to connect"); the SDK mounts the
    // signing iframe into our container. Completion is finalized by the poll above.
    useEffect(() => {
        if (!esignUrl) return;
        let alive = true;
        loadSignWellEmbed()
            .then((SignWellEmbed) => {
                if (!alive || !SignWellEmbed) return;
                const embed = new SignWellEmbed({
                    url: esignUrl,
                    containerId: 'sv-signwell-embed-container',
                    events: {
                        declined: () => { if (alive) { setEsignUrl(null); setSubmitError('Signing was declined. You can try again.'); } },
                        error: () => { if (alive) setSubmitError('The e-signature failed to load.'); },
                    },
                });
                embed.open();
                embedRef.current = embed;
            })
            .catch(() => { if (alive) setSubmitError('Could not load the e-signature.'); });
        return () => {
            alive = false;
            try { embedRef.current?.close?.(); } catch { /* noop */ }
            embedRef.current = null;
        };
    }, [esignUrl]);

    // ─────────────────────────── Render ────────────────────────────────
    // After the SignWell redirect we finalize in the background — show progress
    // (takes priority over the initial estimate load) until it resolves.
    if (finalizing) {
        return (
            <div className="sv-shell sv-shell--center">
                <div className="sv-card sv-status">
                    <div className="sv-loader" aria-label="Completing"><span className="sv-loader-ring" /></div>
                    <h2>Completing your signature…</h2>
                    <p className="sv-sub">Saving your signed estimate. This only takes a moment.</p>
                </div>
            </div>
        );
    }
    if (loading) {
        return (
            <div className="sv-shell sv-shell--center">
                <div className="sv-card sv-status">
                    <div className="sv-loader" aria-label="Loading"><span className="sv-loader-ring" /></div>
                    <h2>Loading your estimate…</h2>
                    <p className="sv-sub">Just a moment while we securely fetch your document.</p>
                </div>
            </div>
        );
    }
    if (error) {
        const headline = error.status === 410 ? 'This link is no longer valid'
            : error.status === 404 ? 'Link not found' : 'Could not load this link';
        return (
            <div className="sv-shell sv-shell--center">
                <div className="sv-card sv-status">
                    <div className="sv-status-badge sv-status-badge--warn">!</div>
                    <h2>{headline}</h2>
                    <p>{error.message}</p>
                    <p className="sv-sub">If you believe this is wrong, contact your contractor for a fresh link.</p>
                </div>
            </div>
        );
    }
    if (submitted) {
        return (
            <div className="sv-shell sv-shell--center">
                <div className="sv-card sv-status sv-success">
                    <div className="sv-status-badge sv-status-badge--success">✓</div>
                    <h2>Thank you!</h2>
                    <p>Your signed estimate has been recorded.</p>
                    <p className="sv-sub">{data?.company?.name ?? 'Your contractor'} will be in touch with next steps.</p>
                </div>
            </div>
        );
    }

    const e = data.estimate;
    const company = data.company ?? {};
    // Load the logo via the public company-logo endpoint (logo_url is an S3 key,
    // not directly fetchable). Falls back to the initials tile if it fails.
    const companyId = company.company_id ?? e?.company_id ?? null;
    const logoSrc = (company.logo_url && companyId && !logoBroken)
        ? `${apiOrigin()}/portal-public/company/${encodeURIComponent(companyId)}/logo`
        : null;
    // Button is HONEST about what the click does: "Sign & Pay" only when we can
    // actually charge now (Stripe connected). When a deposit is attached but not
    // chargeable, we sign only and the pay box tells the homeowner the deposit is
    // collected separately — so the button stays "Sign & submit".
    const finalLabel = submitting
        ? (payAtSign ? 'Redirecting to payment…' : 'Submitting…')
        : (payAtSign ? `✓ Sign & Pay ${money(deposit.amount, deposit.currency)}` : '✓ Sign & submit');

    // ── SignWell e-sign screen (real vendor) — replaces the drawn flow when the
    // contractor has SignWell configured; on any failure we fall back below. ──
    const esignAvailable = !!data?.esign_available && !esignFallback;
    if (esignAvailable) {
        return (
            <div className="sv-shell">
                <div className="sv-header">
                    <div className="sv-brand">
                        {logoSrc && <img src={logoSrc} alt={company.name ?? ''} className="sv-logo" onError={() => setLogoBroken(true)} />}
                        <div>
                            <div className="sv-brand-name">{company.name ?? 'Your Contractor'}</div>
                            {company.website && <div className="sv-brand-sub">{company.website}</div>}
                        </div>
                    </div>
                    <div className="sv-est-meta">
                        <div className="sv-est-num">{e.estimate_number ?? 'Estimate'}</div>
                        <div className="sv-est-title">{e.estimate_title ?? e.title ?? 'Insurance Estimate'}</div>
                    </div>
                </div>

                {esignUrl ? (
                    <div className="sv-card">
                        <h1 className="sv-h1">Review &amp; sign your estimate</h1>
                        <p className="sv-help">Sign securely below. This page updates automatically once you finish.</p>
                        <div className="sv-esign-frame-wrap">
                            <div id="sv-signwell-embed-container" className="sv-esign-frame" />
                        </div>
                        <div className="sv-esign-foot">
                            <span className="sv-esign-secure">🔒 Secure e-signature by SignWell</span>
                            <a className="sv-btn sv-btn--ghost" href={esignUrl} target="_blank" rel="noopener noreferrer">Open in new tab ↗</a>
                        </div>
                    </div>
                ) : (
                    <div className="sv-card">
                        <h1 className="sv-h1">Review &amp; sign your estimate</h1>
                        <p className="sv-help">Here’s your estimate summary. Tap <strong>Sign securely</strong> to review the full document and sign.</p>
                        <div className="sv-esign-summary">
                            {(e.sections ?? []).map((s) => {
                                const items = s.items ?? [];
                                if (!items.length) return null;
                                return (
                                    <div key={s.id} className="sv-esum-sec">
                                        <div className="sv-esum-sec-name">{s.name}</div>
                                        {items.map((it) => (
                                            <div key={it.id} className="sv-esum-row">
                                                <span>{it.name}</span>
                                                <span>{money((Number(it.qty) || 0) * (Number(it.price) || 0), e.deposit_currency)}</span>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                            <div className="sv-esum-total"><span>Total</span><span>{money(e.total_rcv, e.deposit_currency)}</span></div>
                        </div>
                        {submitError && <div className="sv-inline-error">{submitError}</div>}
                        <button className="sv-btn sv-btn--primary sv-esign-cta" onClick={startSignwell} disabled={esignBusy}>
                            {esignBusy ? 'Preparing your document…' : '✍ Sign securely'}
                        </button>
                        <button className="sv-esign-alt" onClick={() => setEsignFallback(true)} disabled={esignBusy}>
                            Prefer to draw your signature instead?
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="sv-shell">
            {/* Contractor branding only — no ClaimKing header, no exit links */}
            <div className="sv-header">
                <div className="sv-brand">
                    {/* No logo on file → just show the company name (no initials tile). */}
                    {logoSrc && (
                        <img
                            src={logoSrc}
                            alt={company.name ?? ''}
                            className="sv-logo"
                            onError={() => setLogoBroken(true)}
                        />
                    )}
                    <div>
                        <div className="sv-brand-name">{company.name ?? 'Your Contractor'}</div>
                        {company.website && <div className="sv-brand-sub">{company.website}</div>}
                    </div>
                </div>
                <div className="sv-est-meta">
                    <div className="sv-est-num">{e.estimate_number ?? 'Estimate'}</div>
                    <div className="sv-est-title">{e.estimate_title ?? e.title ?? 'Insurance Estimate'}</div>
                </div>
            </div>

            {/* Progress */}
            <div className="sv-steps">
                {STEPS.map((label, i) => (
                    <div key={label} className={`sv-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
                        <span className="sv-step-dot">{i < step ? '✓' : i + 1}</span>
                        <span className="sv-step-label">{label}</span>
                    </div>
                ))}
            </div>

            {/* STEP 0 — Review */}
            {step === 0 && (
                <div className="sv-card">
                    <h1 className="sv-h1">Please review your estimate</h1>
                    <p className="sv-help">Scroll through the line items. When you’re ready, tap <strong>Next</strong> to sign.</p>

                    {(e.sections ?? []).map(section => (
                        <div key={section.id} className="sv-section">
                            <div className="sv-section-head">{section.name}</div>
                            <table className="sv-table">
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th style={{ width: 80, textAlign: 'right' }}>Qty</th>
                                        <th style={{ width: 60 }}>Unit</th>
                                        <th style={{ width: 100, textAlign: 'right' }}>Price</th>
                                        <th style={{ width: 110, textAlign: 'right' }}>Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(section.items ?? []).map(it => (
                                        <tr key={it.id}>
                                            {/* CK-14: the AI `reason` is internal working context and is
                                                never sent to this public page — nothing to render here.
                                                sql/97: `notes` reach this page ONLY when the contractor marked
                                                them client-visible; the server strips internal ones. */}
                                            <td data-label="Description">
                                                <span className="sv-item-name">{it.name}</span>
                                                {it.notes && <span className="sv-item-note">{it.notes}</span>}
                                            </td>
                                            <td data-label="Qty" style={{ textAlign: 'right' }}>{Number(it.qty).toLocaleString()}</td>
                                            <td data-label="Unit">{it.unit}</td>
                                            <td data-label="Price" style={{ textAlign: 'right' }}>${Number(it.price).toFixed(2)}</td>
                                            <td data-label="Subtotal" style={{ textAlign: 'right' }}>${(Number(it.qty) * Number(it.price)).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}

                    {totals && (
                        <div className="sv-totals">
                            <div className="sv-tot-row"><span>Subtotal</span><span>${totals.subtotal.toFixed(2)}</span></div>
                            {e.overhead_on && <div className="sv-tot-row"><span>O&amp;P ({Number(e.overhead_pct).toFixed(0)}%)</span><span>${totals.overhead.toFixed(2)}</span></div>}
                            {e.tax_on && <div className="sv-tot-row"><span>{e.tax_name ?? 'Tax'} ({Number(e.tax_pct).toFixed(2)}%)</span><span>${totals.tax.toFixed(2)}</span></div>}
                            <div className="sv-tot-row sv-tot-grand"><span>Total</span><span>${totals.total.toFixed(2)}</span></div>
                            {Number(deposit?.amount) > 0 && (
                                <div className="sv-tot-row" style={{ color: '#1e40af', fontWeight: 700 }}>
                                    <span>Deposit due at signing</span><span>{money(deposit.amount, deposit.currency)}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {(e.terms_json || e.terms_html) && (
                        <div className="sv-terms">
                            <h3>Terms &amp; conditions</h3>
                            {/* Prefer the full structured terms (parity with the
                                contractor PDF); fall back to the legacy terms_html
                                blob for estimates saved before terms_json existed. */}
                            {e.terms_json && typeof e.terms_json === 'object' ? (
                                <SignTerms terms={e.terms_json} website={company.website} />
                            ) : (
                                <div className="sv-terms-body" dangerouslySetInnerHTML={{ __html: e.terms_html }} />
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* STEP 1 — Name */}
            {step === 1 && (
                <div className="sv-card">
                    <h2 className="sv-h2">What’s your full legal name?</h2>
                    <p className="sv-help">Enter your name exactly as it should appear on the agreement.</p>
                    <label className="sv-label">
                        Full legal name
                        <input type="text" className="sv-input" value={signerName}
                            onChange={(ev) => setSignerName(ev.target.value)}
                            placeholder="As it would appear on a contract" autoComplete="name" autoFocus />
                    </label>
                </div>
            )}

            {/* STEP 2 — Signature */}
            {step === 2 && (
                <div className="sv-card">
                    <h2 className="sv-h2">Draw your signature</h2>
                    <p className="sv-help">Sign in the box below using your mouse or finger.</p>
                    <div className="sv-pad-wrap">
                        <SignaturePad ref={padRef} height={200} onChange={({ isEmpty }) => setHasInk(!isEmpty)} />
                        <div className="sv-pad-tools">
                            <button type="button" className="sv-link" onClick={() => { padRef.current?.clear(); setHasInk(false); setSignatureData(null); }} disabled={submitting}>Clear</button>
                            {hasInk && <span className="sv-pad-ink">Signature captured</span>}
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 3 — Confirm */}
            {step === 3 && (
                <div className="sv-card">
                    <h2 className="sv-h2">Confirm &amp; {payAtSign ? 'pay' : 'submit'}</h2>
                    {hasDeposit && (
                        <div className={`sv-pay-box ${payAtSign ? '' : 'muted'}`}>
                            <div className="sv-pay-caption">Deposit due at signing</div>
                            <div className="sv-pay-amount">{money(deposit.amount, deposit.currency)}</div>
                            <div className="sv-pay-label">
                                {payAtSign
                                    ? 'You’ll be taken to a secure Stripe checkout right after signing.'
                                    : 'Your contractor will send payment details separately.'}
                            </div>
                        </div>
                    )}
                    <label className="sv-checkbox">
                        <input type="checkbox" checked={agreedTerms} onChange={(ev) => setAgreedTerms(ev.target.checked)} />
                        <span>
                            I, <strong>{signerName || '(your name)'}</strong>, have reviewed the estimate above and authorise the
                            work described at the amounts shown. I understand my signature creates a legally binding agreement
                            {payAtSign
                                ? ' and authorise the deposit payment shown above.'
                                : (hasDeposit ? ' and agree to the deposit shown above.' : '.')}
                        </span>
                    </label>
                    <button className="sv-submit" onClick={submit} disabled={submitting || !agreedTerms || !atBottom}>
                        {finalLabel}
                    </button>
                    {submitError && <p className="sv-submit-error">{submitError}</p>}
                    {!atBottom && <p className="sv-scroll-hint">Please scroll to the bottom to continue.</p>}
                    <p className="sv-fineprint">
                        By submitting, your name, signature image, IP address and timestamp will be recorded by {company.name ?? 'your contractor'} for legal verification.
                    </p>
                </div>
            )}

            {/* CK-13 — reached-the-bottom sentinel. Sits at the end of the
                scrollable content, just above the sticky CTA; the gate unlocks
                when it enters the viewport (works on short and long pages). */}
            <div ref={bottomRef} className="sv-bottom-sentinel" aria-hidden="true" />

            {/* Nav buttons — sticky CTA (CK-12). Until the homeowner has scrolled
                to the bottom of this step (CK-13), Next becomes an anchor that
                carries them to what's left rather than advancing. */}
            <div className="sv-nav">
                {atBottom && stepHint && step < STEPS.length - 1 && (
                    <div className="sv-nav-hint">{stepHint}</div>
                )}
                <div className="sv-nav-row">
                    <button className="sv-nav-back" onClick={back} disabled={step === 0 || submitting}>‹ Back</button>
                    {step < STEPS.length - 1 && (
                        atBottom
                            ? <button className="sv-nav-next" onClick={next} disabled={!currentStepValid}>Next ›</button>
                            : <button className="sv-nav-next sv-nav-scroll" onClick={scrollToNext}>
                                {step === 0 ? 'Read the full estimate & terms ↓' : 'Scroll to continue ↓'}
                              </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SignView;
