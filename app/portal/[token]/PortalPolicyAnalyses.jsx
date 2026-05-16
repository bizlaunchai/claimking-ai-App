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
    claim_document: 'Claim Document',
    denial_letter: 'Denial Letter',
    estimate: 'Adjuster Estimate',
    scope: 'Scope of Work',
    carrier_email: 'Carrier Email',
};

const fmtDate = (iso) => {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
};

const items = (group) => (Array.isArray(group?.items) ? group.items : []);

const Section = ({ title, accent, list, renderItem, emptyText }) => (
    <section className="mb-4">
        <h3 className="font-semibold mb-2" style={{ color: accent }}>{title}</h3>
        {list.length === 0
            ? <p className="text-sm text-gray-500 italic">{emptyText}</p>
            : <ul className="space-y-3">{list.map(renderItem)}</ul>}
    </section>
);

const AnalysisCard = ({ a }) => {
    const ded = a.deductible_info || {};
    const codeUp = a.code_upgrade_potential || {};
    const op = a.op_potential || {};
    const rcv = a.rcv_vs_acv || {};
    const score = typeof a.coverage_score === 'number' ? a.coverage_score : 0;

    return (
        <article className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <header className="flex justify-between items-start mb-3 gap-4">
                <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                        {DOCUMENT_TYPE_LABELS[a.document_type] ?? a.document_type}
                    </p>
                    <h2 className="text-lg font-semibold text-gray-900 mt-1">
                        {a.summary || 'Policy analysis'}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">{fmtDate(a.created_at)}</p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{score}/100</div>
                    <p className="text-xs text-blue-600">Coverage score</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-sm">
                <div className="border border-gray-200 rounded p-3">
                    <p className="text-xs uppercase text-gray-500 mb-1">Deductibles</p>
                    {ded.standard && <p>Standard: <strong>{ded.standard}</strong></p>}
                    {ded.wind_hail && <p>Wind/Hail: <strong className="text-red-600">{ded.wind_hail}</strong></p>}
                    {ded.hurricane && <p>Hurricane: <strong>{ded.hurricane}</strong></p>}
                    {(ded.other || []).map((o, i) => (
                        <p key={i}>{o.name}: <strong>{o.value}</strong></p>
                    ))}
                    {!ded.standard && !ded.wind_hail && !ded.hurricane && !(ded.other || []).length && (
                        <p className="text-gray-500 italic">No deductibles detected.</p>
                    )}
                </div>
                <div className="border border-gray-200 rounded p-3">
                    <p className="text-xs uppercase text-gray-500 mb-1">RCV vs ACV</p>
                    <p className="font-semibold">{rcv.type || 'unknown'}</p>
                    <p className="text-gray-600">{rcv.detail || '—'}</p>
                </div>
                <div className="border border-gray-200 rounded p-3">
                    <p className="text-xs uppercase text-gray-500 mb-1">Code Upgrade</p>
                    <p className="font-semibold">{codeUp.available ? 'Available' : 'Not detected'}</p>
                    <p className="text-gray-600">{codeUp.detail || '—'}</p>
                </div>
                <div className="border border-gray-200 rounded p-3">
                    <p className="text-xs uppercase text-gray-500 mb-1">O&amp;P</p>
                    <p className="font-semibold">{op.applicable ? 'Applicable' : 'Not applicable'}</p>
                    <p className="text-gray-600">{op.detail || '—'}</p>
                </div>
            </div>

            <Section
                title="Coverage Issues"
                accent="#b91c1c"
                list={items(a.coverage_issues)}
                emptyText="No coverage issues identified."
                renderItem={(it, i) => (
                    <li key={i}>
                        <p className="font-medium text-gray-900">{it.title}</p>
                        <p className="text-sm text-gray-700">{it.detail}</p>
                    </li>
                )}
            />
            <Section
                title="Exclusions"
                accent="#374151"
                list={items(a.exclusions)}
                emptyText="No exclusions identified."
                renderItem={(it, i) => (
                    <li key={i}>
                        <p className="font-medium text-gray-900">{it.title}</p>
                        <p className="text-sm text-gray-700">{it.detail}</p>
                    </li>
                )}
            />
            <Section
                title="Matching Issues"
                accent="#c2410c"
                list={items(a.matching_issues)}
                emptyText="No matching issues identified."
                renderItem={(it, i) => (
                    <li key={i}>
                        <p className="font-medium text-gray-900">{it.title}</p>
                        <p className="text-sm text-gray-700">{it.detail}</p>
                    </li>
                )}
            />
            <Section
                title="Potential Claim Arguments"
                accent="#1d4ed8"
                list={items(a.claim_arguments)}
                emptyText="No claim arguments identified."
                renderItem={(it, i) => (
                    <li key={i}>
                        <p className="font-medium text-gray-900">{it.title}</p>
                        <p className="text-sm text-gray-700">{it.argument}</p>
                    </li>
                )}
            />
            <Section
                title="Next Steps"
                accent="#92400e"
                list={items(a.next_steps)}
                emptyText="No next steps identified."
                renderItem={(it, i) => (
                    <li key={i}>
                        <p className="font-medium text-gray-900">{it.title}</p>
                        <p className="text-sm text-gray-700">{it.detail}</p>
                    </li>
                )}
            />

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
