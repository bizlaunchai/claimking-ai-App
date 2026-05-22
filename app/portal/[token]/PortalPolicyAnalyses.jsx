'use client'
import React, { useEffect, useState } from 'react';
import axiosInstance from '@/lib/axiosInstance';
import {
    LEGAL_DISCLAIMER_HEADLINE,
    LEGAL_DISCLAIMER_BODY,
    LEGAL_DISCLAIMER_SHORT,
} from '../../dashboard/policy-analysis/disclaimer';

// ─────────────────────────────────────────────────────────────────────────────
// Public client-facing portal page.
//
// URL: /portal/<clientId>?analysis=<analysisId>
//
// - Unauthenticated; backend gates by client_id UUID acting as a bearer.
// - Read-only: no Re-analyze / Delete / Share controls — the client cannot
//   mutate the contractor's data.
// - Disclaimer rendered prominently at the top AND at the bottom of every
//   analysis card (compliance requirement: every output displays it).
// - If ?analysis=<id> is provided, only that analysis is shown; otherwise we
//   list every completed analysis for the client.
// ─────────────────────────────────────────────────────────────────────────────

const DOCUMENT_TYPE_LABELS = {
    policy: 'Insurance Policy',
    claim_ack: 'Claim Acknowledgment',
    denial: 'Denial Letter',
    adjuster_estimate: 'Adjuster Estimate',
    scope_of_work: 'Scope of Work',
    email_thread: 'Carrier Email',
    unknown: 'Document',
};

const fmtDate = (iso) => {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
};

// Generic recursive renderer for the type-specific extracted_data object.
const ExtractedValue = ({ value }) => {
    if (value == null || value === '') return null;
    if (Array.isArray(value)) {
        if (!value.length) return null;
        return (
            <ul className="list-disc ml-5 space-y-1">
                {value.map((v, i) => <li key={i}><ExtractedValue value={v} /></li>)}
            </ul>
        );
    }
    if (typeof value === 'object') {
        const entries = Object.entries(value).filter(
            ([, v]) => v != null && v !== '' && !(Array.isArray(v) && !v.length),
        );
        if (!entries.length) return null;
        return (
            <div className="text-sm">
                {entries.map(([k, v]) => {
                    const label = k.replace(/_/g, ' ');
                    if (typeof v === 'object') {
                        return (
                            <div key={k} className="my-1 pl-2 border-l-2 border-gray-200">
                                <div className="font-semibold text-gray-700 capitalize">{label}</div>
                                <ExtractedValue value={v} />
                            </div>
                        );
                    }
                    return (
                        <div key={k} className="py-0.5 text-gray-700">
                            <span className="text-gray-500 capitalize">{label}:</span> {String(v)}
                        </div>
                    );
                })}
            </div>
        );
    }
    return <span>{String(value)}</span>;
};

const deadlineTone = (days) => {
    if (days == null) return 'border-gray-200 bg-gray-50 text-gray-700';
    if (days < 0) return 'border-red-300 bg-red-100 text-red-800';
    if (days <= 30) return 'border-red-200 bg-red-50 text-red-700';
    if (days <= 90) return 'border-yellow-200 bg-yellow-50 text-yellow-700';
    return 'border-green-200 bg-green-50 text-green-700';
};

const AnalysisCard = ({ a }) => {
    const ed = a.extracted_data || {};
    const deadlines = Array.isArray(a.critical_deadlines) ? a.critical_deadlines : [];
    const actions = Array.isArray(a.suggested_actions) ? a.suggested_actions : [];

    return (
        <article className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <header className="mb-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                    {DOCUMENT_TYPE_LABELS[a.document_type] ?? a.document_type}
                    {a.detected_carrier ? ` · ${a.detected_carrier}` : ''}
                </p>
                <h2 className="text-lg font-semibold text-gray-900 mt-1">
                    {a.summary || 'Policy analysis'}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                    {a.document_date ? `Document date: ${a.document_date} · ` : ''}{fmtDate(a.created_at)}
                </p>
            </header>

            {deadlines.length > 0 && (
                <section className="mb-4">
                    <h3 className="font-semibold mb-2 text-red-700">Critical Deadlines</h3>
                    <div className="space-y-2">
                        {deadlines.map((d, i) => (
                            <div key={i} className={`rounded border p-3 ${deadlineTone(d.days_remaining)}`}>
                                <div className="flex justify-between items-center gap-3">
                                    <p className="text-sm font-medium">{d.description}</p>
                                    {typeof d.days_remaining === 'number' && (
                                        <span className="text-xs font-bold whitespace-nowrap">
                                            {d.days_remaining < 0 ? `${Math.abs(d.days_remaining)}d overdue` : `${d.days_remaining}d left`}
                                        </span>
                                    )}
                                </div>
                                {d.date && <p className="text-xs mt-0.5">Due {d.date}</p>}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {actions.length > 0 && (
                <section className="mb-4">
                    <h3 className="font-semibold mb-2" style={{ color: '#92400e' }}>Suggested Next Steps</h3>
                    <ul className="space-y-2">
                        {actions.map((s, i) => (
                            <li key={i} className="flex gap-2 items-start">
                                <span className="text-gray-400 mt-0.5">{s.done ? '☑' : '☐'}</span>
                                <div>
                                    <p className="font-medium text-gray-900 text-sm">{s.title}</p>
                                    {s.detail && <p className="text-sm text-gray-700">{s.detail}</p>}
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {Object.keys(ed).length > 0 && (
                <section className="mb-4">
                    <h3 className="font-semibold mb-2" style={{ color: '#1d4ed8' }}>Details</h3>
                    <ExtractedValue value={ed} />
                </section>
            )}

            {/* Per-output disclaimer (compliance: every generated analysis
                output shown to a client must carry the disclaimer). */}
            <p className="text-[11px] leading-tight text-gray-500 mt-4 pt-3 border-t border-gray-200">
                <strong>Disclaimer:</strong> {LEGAL_DISCLAIMER_SHORT}
            </p>
        </article>
    );
};

const PortalPolicyAnalyses = ({ clientId, analysisId, embedded = false }) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                let res;
                if (analysisId) {
                    res = await axiosInstance.get(
                        `/public/policy-analyses/${analysisId}`,
                        { params: { client_id: clientId }, suppressErrorToast: true },
                    );
                    if (!cancelled) setRows(res.data?.data ? [res.data.data] : []);
                } else {
                    res = await axiosInstance.get(
                        '/public/policy-analyses',
                        { params: { client_id: clientId }, suppressErrorToast: true },
                    );
                    if (!cancelled) setRows(res.data?.data ?? []);
                }
            } catch (e) {
                if (!cancelled) setError(e?.response?.status === 404 ? 'Not found' : 'Unable to load analyses.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [clientId, analysisId]);

    const body = (
        <>
            {loading && <p className="text-gray-500 text-sm">Loading analyses…</p>}
            {!loading && error && (
                <p className="text-gray-700 bg-white border border-gray-200 rounded p-6 text-center">
                    {error === 'Not found'
                        ? 'This analysis is not available.'
                        : error}
                </p>
            )}
            {!loading && !error && rows.length === 0 && (
                <p className="text-gray-700 bg-white border border-gray-200 rounded p-6 text-center text-sm">
                    Your contractor hasn’t shared any analyses yet.
                </p>
            )}
            {!loading && !error && rows.map((a) => (
                <AnalysisCard key={a.id} a={a} />
            ))}
        </>
    );

    if (embedded) {
        return (
            <>
                {/* Disclaimer travels with the analyses block when embedded. */}
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex gap-3 mb-4">
                    <div className="text-amber-600 text-xl leading-none">⚠</div>
                    <div>
                        <p className="font-semibold text-amber-900 text-sm">
                            {LEGAL_DISCLAIMER_HEADLINE}
                        </p>
                        <p className="text-amber-900 text-xs mt-1">
                            {LEGAL_DISCLAIMER_BODY}
                        </p>
                    </div>
                </div>
                {body}
            </>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-5">
                <div className="max-w-3xl mx-auto">
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Your Policy Analyses
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Shared by your contractor on ClaimKing.
                    </p>
                </div>
            </header>

            <div className="max-w-3xl mx-auto px-6 pt-4">
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex gap-3">
                    <div className="text-amber-600 text-xl leading-none">⚠</div>
                    <div>
                        <p className="font-semibold text-amber-900 text-sm">
                            {LEGAL_DISCLAIMER_HEADLINE}
                        </p>
                        <p className="text-amber-900 text-xs mt-1">
                            {LEGAL_DISCLAIMER_BODY}
                        </p>
                    </div>
                </div>
            </div>

            <main className="max-w-3xl mx-auto px-6 py-6">{body}</main>
        </div>
    );
};

export default PortalPolicyAnalyses;
