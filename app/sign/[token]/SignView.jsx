'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axiosInstance from '@/lib/axiosInstance';
import SignaturePad from '@/components/signature/SignaturePad';
import './sign.css';

const SignView = () => {
    const { token } = useParams();
    const router = useRouter();

    // ── Data flow ───────────────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    const [signerName, setSignerName] = useState('');
    const [agreedTerms, setAgreedTerms] = useState(false);
    const [hasInk, setHasInk] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const padRef = useRef(null);

    // Resolve the token on mount
    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await axiosInstance.get(`/sign-public/${token}`, {
                    suppressErrorToast: true,
                });
                if (cancelled) return;
                setData(res.data?.data ?? null);
                setSignerName(res.data?.data?.signer_name ?? '');
            } catch (err) {
                if (cancelled) return;
                const status = err?.response?.status;
                const msg =
                    err?.userMessage ||
                    err?.response?.data?.message ||
                    err?.message ||
                    'Could not load this signing link.';
                setError({ status: status ?? 0, message: msg });
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [token]);

    // ── Submit ─────────────────────────────────────────────────────────
    const submit = async () => {
        if (!padRef.current || padRef.current.isEmpty()) {
            alert('Please sign in the box above before submitting.');
            return;
        }
        if (!signerName.trim()) {
            alert('Please type your full name.');
            return;
        }
        if (!agreedTerms) {
            alert('Please tick the box to confirm you agree to the estimate terms.');
            return;
        }
        setSubmitting(true);
        try {
            const signatureDataUrl = padRef.current.toDataURL('image/png');
            await axiosInstance.post(`/sign-public/${token}`, {
                signer_name: signerName.trim(),
                signature_image: signatureDataUrl,
            });
            setSubmitted(true);
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.userMessage ||
                'Could not submit your signature. Please try again.';
            alert(msg);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Totals (computed from items so we don't trust the row's snapshot) ──
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

    // ─────────────────────────────────────────────────────────────────
    //   Render
    // ─────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="sv-shell">
                <div className="sv-card sv-status">
                    <div className="sv-spinner" />
                    <p>Loading your estimate…</p>
                </div>
            </div>
        );
    }

    if (error) {
        const headline =
            error.status === 410 ? 'This link is no longer valid'
            : error.status === 404 ? 'Link not found'
            : 'Could not load this link';
        return (
            <div className="sv-shell">
                <div className="sv-card sv-status">
                    <h2>{headline}</h2>
                    <p>{error.message}</p>
                    <p className="sv-sub">
                        If you believe this is wrong, contact your contractor for a fresh link.
                    </p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="sv-shell">
                <div className="sv-card sv-status sv-success">
                    <div className="sv-check">✓</div>
                    <h2>Thank you!</h2>
                    <p>Your signed estimate has been recorded.</p>
                    <p className="sv-sub">
                        {data?.company?.name ?? 'Your contractor'} will be in touch with next steps.
                    </p>
                </div>
            </div>
        );
    }

    const e = data.estimate;
    const company = data.company ?? {};

    return (
        <div className="sv-shell">
            {/* ─── Header ──────────────────────────────────────────── */}
            <div className="sv-header">
                <div className="sv-brand">
                    {company.logo_url ? (
                        <img src={company.logo_url} alt={company.name ?? ''} className="sv-logo" />
                    ) : (
                        <div className="sv-logo sv-logo-fallback">
                            {(company.name ?? 'C').split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase()).join('')}
                        </div>
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

            {/* ─── Estimate body (read-only) ───────────────────────── */}
            <div className="sv-card">
                <h1 className="sv-h1">Please review &amp; sign</h1>
                <p className="sv-help">
                    Scroll through the line items below. When you're ready, sign and submit at the bottom of the page.
                </p>

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
                                        <td>
                                            {it.name}
                                            {it.reason && <div className="sv-item-reason">{it.reason}</div>}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>{Number(it.qty).toLocaleString()}</td>
                                        <td>{it.unit}</td>
                                        <td style={{ textAlign: 'right' }}>${Number(it.price).toFixed(2)}</td>
                                        <td style={{ textAlign: 'right' }}>${(Number(it.qty) * Number(it.price)).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}

                {/* Totals */}
                {totals && (
                    <div className="sv-totals">
                        <div className="sv-tot-row"><span>Subtotal</span><span>${totals.subtotal.toFixed(2)}</span></div>
                        {e.overhead_on && (
                            <div className="sv-tot-row"><span>O&amp;P ({Number(e.overhead_pct).toFixed(0)}%)</span><span>${totals.overhead.toFixed(2)}</span></div>
                        )}
                        {e.tax_on && (
                            <div className="sv-tot-row"><span>{e.tax_name ?? 'Tax'} ({Number(e.tax_pct).toFixed(2)}%)</span><span>${totals.tax.toFixed(2)}</span></div>
                        )}
                        <div className="sv-tot-row sv-tot-grand"><span>Total</span><span>${totals.total.toFixed(2)}</span></div>
                    </div>
                )}

                {/* Terms */}
                {e.terms_html && (
                    <div className="sv-terms">
                        <h3>Terms &amp; conditions</h3>
                        <div className="sv-terms-body" dangerouslySetInnerHTML={{ __html: e.terms_html }} />
                    </div>
                )}
            </div>

            {/* ─── Sign block ─────────────────────────────────────── */}
            <div className="sv-card">
                <h2 className="sv-h2">Sign here</h2>

                <label className="sv-label">
                    Full legal name
                    <input
                        type="text"
                        className="sv-input"
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        placeholder="As it would appear on a contract"
                        autoComplete="name"
                    />
                </label>

                <div className="sv-pad-wrap">
                    <SignaturePad
                        ref={padRef}
                        height={200}
                        onChange={({ isEmpty }) => setHasInk(!isEmpty)}
                    />
                    <div className="sv-pad-tools">
                        <button
                            type="button"
                            className="sv-link"
                            onClick={() => { padRef.current?.clear(); setHasInk(false); }}
                            disabled={submitting}
                        >Clear</button>
                        {hasInk && <span className="sv-pad-ink">Signature captured</span>}
                    </div>
                </div>

                <label className="sv-checkbox">
                    <input
                        type="checkbox"
                        checked={agreedTerms}
                        onChange={(e) => setAgreedTerms(e.target.checked)}
                    />
                    <span>
                        I, <strong>{signerName || '(your name)'}</strong>, have reviewed the estimate above and
                        authorise the work described at the amounts shown. I understand my signature
                        creates a legally binding agreement.
                    </span>
                </label>

                <button
                    className="sv-submit"
                    onClick={submit}
                    disabled={submitting}
                >
                    {submitting ? 'Submitting…' : '✓ Sign & submit'}
                </button>

                <p className="sv-fineprint">
                    By submitting, your name, signature image, IP address and timestamp will be
                    recorded by {company.name ?? 'your contractor'} for legal verification.
                </p>
            </div>
        </div>
    );
};

export default SignView;
