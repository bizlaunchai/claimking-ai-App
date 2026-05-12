'use client'
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import "./policy-analysis.css"
import "../measurement/measurement-hero.css"  // reuse hero + stat-chip styles

import dynamic from "next/dynamic";
import axiosInstance from "@/lib/axiosInstance";
import {
    LEGAL_DISCLAIMER_HEADLINE,
    LEGAL_DISCLAIMER_BODY,
    LEGAL_DISCLAIMER_SHORT,
} from "./disclaimer";
import { openAnalysisReport } from "./report-builder";
// Local-only uploader: holds the file in memory and hands it to the analyze
// API directly. We deliberately avoid `@/utiles/FileUploader` here because it
// auto-uploads to /s3/upload on selection, which would (a) double-upload
// alongside our own backend's S3 write, and (b) leak the file to storage
// before the credit pre-flight has even run.
const FileUploader = dynamic(
    () => import("@/utiles/LocalFileUploader"),
    { ssr: false }
);

// Disclaimer copy lives in ./disclaimer.js so the PDF report (Step 22),
// share page (Step 24), and portal renderer (Step 27) all import the same
// string. The on-page banner below renders the long-form headline + body.
const LegalDisclaimerBanner = () => (
    <div
        role="note"
        aria-label="Legal disclaimer"
        className="px-6 pt-4"
    >
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
);

// ─────────────────────────────────────────────────────────────────────────────
// Results rendering
//
// `result` is the policy_analyses row returned by POST /policy-analyses.
// Every JSONB column conforms to the SHARED_RESPONSE_CONTRACT shape (see
// policy-prompts.ts), but we still defend against missing/legacy values so
// older rows opened from history never break the page.
// ─────────────────────────────────────────────────────────────────────────────

const items = (group) => (Array.isArray(group?.items) ? group.items : []);

// Color the score badge by health bucket. The cutoffs come from the prompt
// hints (denials land 0-30, partial denials 30-60, healthy 60+).
const scoreTone = (score) => {
    if (score >= 70) return { bg: 'bg-green-50', text: 'text-green-700', label: 'Strong position' };
    if (score >= 40) return { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Mixed — work to do' };
    return { bg: 'bg-red-50', text: 'text-red-700', label: 'Weak — escalation likely' };
};

const SeverityBadge = ({ value }) => {
    const tone =
        value === 'high' ? 'bg-red-100 text-red-700' :
        value === 'medium' ? 'bg-yellow-100 text-yellow-700' :
        'bg-gray-100 text-gray-700';
    return (
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${tone}`}>
            {value || 'low'}
        </span>
    );
};

const AudienceBadge = ({ value }) => {
    const tone =
        value === 'contractor' ? 'bg-blue-100 text-blue-700' :
        value === 'homeowner' ? 'bg-purple-100 text-purple-700' :
        'bg-gray-100 text-gray-700';
    return (
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${tone}`}>
            {value || 'both'}
        </span>
    );
};

/**
 * Re-used accordion shell. The legacy CSS (.accordion-header / .accordion-content)
 * lives in policy-analysis.css so we keep using those class names for visual
 * parity with the rest of the dashboard.
 */
const FindingAccordion = ({ id, title, count, accent, open, onToggle, children }) => (
    <div className={`border ${accent.border} rounded-lg mb-3`}>
        <div
            className={`accordion-header ${accent.bg} p-4 flex justify-between items-center`}
            onClick={onToggle}
        >
            <h3 className={`font-semibold ${accent.text}`}>
                {title}
                {typeof count === 'number' && (
                    <span className="ml-2 text-xs font-normal text-gray-600">({count})</span>
                )}
            </h3>
            <span>{open ? '▲' : '▼'}</span>
        </div>
        <div className={`accordion-content ${open ? 'open' : ''}`}>
            <div className="p-4 text-sm">{children}</div>
        </div>
    </div>
);

const EmptyHint = ({ text }) => (
    <p className="text-sm text-gray-500 italic">{text}</p>
);

// Lightweight loading shell. The real backend call usually returns in 10-30s
// (Gemini analyze + DB write), so a clear "what's happening" indicator beats
// an empty page or a spinner-only state. Mirrors the eventual grid layout so
// the result swap doesn't feel jarring.
const AnalyzingSkeleton = () => {
    const labels = [
        'Coverage issues',
        'Exclusions',
        'Deductibles',
        'Matching issues',
        'Code upgrade potential',
        'O&P potential',
        'RCV vs ACV',
        'Claim arguments',
        'Next steps',
    ];
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-4 mb-5">
                <svg className="animate-spin h-7 w-7 text-yellow-500 shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <div>
                    <p className="font-semibold text-gray-900">Analyzing document…</p>
                    <p className="text-sm text-gray-600">Usually completes in 30–60 seconds. You can stay on this page.</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {labels.map((l, i) => (
                    <div
                        key={l}
                        className="border border-gray-200 rounded-lg p-3 bg-gray-50 flex items-center gap-2"
                        style={{ animationDelay: `${i * 120}ms` }}
                    >
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-60"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
                        </span>
                        <span className="text-sm text-gray-700">{l}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ResultsView = ({ result, client, openAccordions, toggleAccordion, onGenerateReport, onCreateEstimate, onShareWithClient, onReanalyze }) => {
    const score = typeof result.coverage_score === 'number' ? result.coverage_score : 0;
    const tone = scoreTone(score);

    const ded = result.deductible_info || {};
    const codeUp = result.code_upgrade_potential || {};
    const op = result.op_potential || {};
    const rcv = result.rcv_vs_acv || {};

    const cov = items(result.coverage_issues);
    const exc = items(result.exclusions);
    const matching = items(result.matching_issues);
    const args = items(result.claim_arguments);
    const next = items(result.next_steps);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
                {/* Header: summary + status pill */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex justify-between items-start gap-4 mb-3">
                        <h2 className="text-lg font-semibold text-gray-900">Policy Analysis Results</h2>
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                            result.status === 'completed' ? 'bg-green-100 text-green-700' :
                            result.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                        }`}>
                            {result.status}
                        </span>
                    </div>
                    {result.summary && (
                        <p className="text-sm text-gray-700">{result.summary}</p>
                    )}
                    {result.status === 'failed' && result.error_message && (
                        <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                            {result.error_message}
                        </p>
                    )}
                </div>

                {/* Four small "snapshot" cards for the single-value findings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Deductibles */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="font-semibold text-gray-800 mb-2 text-sm">Deductibles</h3>
                        <ul className="text-sm text-gray-700 space-y-1">
                            {ded.standard && <li><span className="text-gray-500">Standard:</span> <strong>{ded.standard}</strong></li>}
                            {ded.wind_hail && <li><span className="text-gray-500">Wind/Hail:</span> <strong className="text-red-600">{ded.wind_hail}</strong></li>}
                            {ded.hurricane && <li><span className="text-gray-500">Hurricane:</span> <strong>{ded.hurricane}</strong></li>}
                            {(ded.other || []).map((o, i) => (
                                <li key={i}><span className="text-gray-500">{o.name}:</span> <strong>{o.value}</strong></li>
                            ))}
                            {!ded.standard && !ded.wind_hail && !ded.hurricane && !(ded.other || []).length && (
                                <EmptyHint text="No deductibles detected." />
                            )}
                        </ul>
                    </div>

                    {/* RCV vs ACV */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="font-semibold text-gray-800 mb-2 text-sm">RCV vs ACV</h3>
                        <p className="text-2xl font-bold text-gray-900 mb-1">{rcv.type || 'unknown'}</p>
                        <p className="text-sm text-gray-600">{rcv.detail || '—'}</p>
                        {rcv.depreciation_amount && (
                            <p className="text-xs text-red-600 mt-1">Depreciation: {rcv.depreciation_amount}</p>
                        )}
                    </div>

                    {/* Code Upgrade */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="font-semibold text-gray-800 mb-2 text-sm">Code Upgrade Potential</h3>
                        <p className={`text-2xl font-bold mb-1 ${codeUp.available ? 'text-green-700' : 'text-gray-400'}`}>
                            {codeUp.available ? 'Available' : 'Not detected'}
                        </p>
                        {codeUp.percent_or_amount && (
                            <p className="text-sm text-gray-700 mb-1"><strong>{codeUp.percent_or_amount}</strong></p>
                        )}
                        <p className="text-sm text-gray-600">{codeUp.detail || '—'}</p>
                    </div>

                    {/* O&P */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="font-semibold text-gray-800 mb-2 text-sm">O&P Potential</h3>
                        <p className={`text-2xl font-bold mb-1 ${op.applicable ? 'text-green-700' : 'text-gray-400'}`}>
                            {op.applicable ? 'Applicable' : 'Not applicable'}
                        </p>
                        {typeof op.trades_count === 'number' && (
                            <p className="text-sm text-gray-700 mb-1">Trades: <strong>{op.trades_count}</strong></p>
                        )}
                        <p className="text-sm text-gray-600">{op.detail || '—'}</p>
                    </div>
                </div>

                {/* Five list-style findings as accordions */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <FindingAccordion
                        id="coverage_issues"
                        title="⚠ Coverage Issues"
                        count={cov.length}
                        accent={{ border: 'border-red-200', bg: 'bg-red-50', text: 'text-red-800' }}
                        open={!!openAccordions.coverage_issues}
                        onToggle={() => toggleAccordion('coverage_issues')}
                    >
                        {cov.length === 0 ? <EmptyHint text="No coverage issues identified." /> : (
                            <ul className="space-y-3">
                                {cov.map((it, i) => (
                                    <li key={i} className="flex gap-3">
                                        <div className="pt-0.5"><SeverityBadge value={it.severity} /></div>
                                        <div>
                                            <p className="font-medium text-gray-900">{it.title}</p>
                                            <p className="text-gray-700">{it.detail}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </FindingAccordion>

                    <FindingAccordion
                        title="✗ Exclusions"
                        count={exc.length}
                        accent={{ border: 'border-gray-200', bg: 'bg-gray-50', text: 'text-gray-800' }}
                        open={!!openAccordions.exclusions}
                        onToggle={() => toggleAccordion('exclusions')}
                    >
                        {exc.length === 0 ? <EmptyHint text="No exclusions identified." /> : (
                            <ul className="space-y-3">
                                {exc.map((it, i) => (
                                    <li key={i}>
                                        <p className="font-medium text-gray-900">{it.title}</p>
                                        <p className="text-gray-700">{it.detail}</p>
                                        {it.source_quote && (
                                            <blockquote className="mt-1 text-xs italic text-gray-500 border-l-2 border-gray-300 pl-2">
                                                “{it.source_quote}”
                                            </blockquote>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </FindingAccordion>

                    <FindingAccordion
                        title="⤢ Matching Issues"
                        count={matching.length}
                        accent={{ border: 'border-orange-200', bg: 'bg-orange-50', text: 'text-orange-800' }}
                        open={!!openAccordions.matching_issues}
                        onToggle={() => toggleAccordion('matching_issues')}
                    >
                        {matching.length === 0 ? <EmptyHint text="No matching issues identified." /> : (
                            <ul className="space-y-3">
                                {matching.map((it, i) => (
                                    <li key={i}>
                                        <p className="font-medium text-gray-900">{it.title}</p>
                                        <p className="text-gray-700">{it.detail}</p>
                                        {it.line_of_argument && (
                                            <p className="text-xs text-gray-500 mt-1">Argument: {it.line_of_argument}</p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </FindingAccordion>

                    <FindingAccordion
                        title="⚖ Potential Claim Arguments"
                        count={args.length}
                        accent={{ border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-800' }}
                        open={!!openAccordions.claim_arguments}
                        onToggle={() => toggleAccordion('claim_arguments')}
                    >
                        {args.length === 0 ? <EmptyHint text="No claim arguments identified." /> : (
                            <ul className="space-y-3">
                                {args.map((it, i) => (
                                    <li key={i}>
                                        <p className="font-medium text-gray-900">{it.title}</p>
                                        <p className="text-gray-700">{it.argument}</p>
                                        {it.supporting_clause && (
                                            <blockquote className="mt-1 text-xs italic text-gray-500 border-l-2 border-blue-300 pl-2">
                                                “{it.supporting_clause}”
                                            </blockquote>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </FindingAccordion>

                    <FindingAccordion
                        title="➜ Next Steps"
                        count={next.length}
                        accent={{ border: 'border-yellow-300', bg: 'bg-yellow-50', text: 'text-yellow-800' }}
                        open={!!openAccordions.next_steps}
                        onToggle={() => toggleAccordion('next_steps')}
                    >
                        {next.length === 0 ? <EmptyHint text="No next steps identified." /> : (
                            <ul className="space-y-3">
                                {next.map((it, i) => (
                                    <li key={i} className="flex gap-3">
                                        <div className="pt-0.5"><AudienceBadge value={it.audience} /></div>
                                        <div>
                                            <p className="font-medium text-gray-900">{it.title}</p>
                                            <p className="text-gray-700">{it.detail}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </FindingAccordion>
                </div>
            </div>

            {/* Side panel: real coverage score + Quick Actions (handlers wired in Steps 22-24) */}
            <div>
                <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-4">
                    <div className={`p-4 rounded-lg ${tone.bg} mb-4`}>
                        <h4 className={`text-sm font-semibold mb-1 ${tone.text}`}>Coverage Score</h4>
                        <div className={`text-3xl font-bold ${tone.text}`}>{score}/100</div>
                        <p className={`text-xs mt-1 ${tone.text}`}>{tone.label}</p>
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={onGenerateReport}
                            disabled={result.status !== 'completed'}
                            className={`w-full py-2 rounded-lg font-medium transition ${
                                result.status === 'completed'
                                    ? 'bg-yellow-400 text-gray-900 hover:bg-yellow-500'
                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            }`}
                            title={result.status !== 'completed' ? 'Available after a successful analysis' : ''}
                        >
                            Generate Report
                        </button>
                        <button
                            type="button"
                            onClick={onCreateEstimate}
                            disabled={result.status !== 'completed' || !client?.id}
                            className={`w-full py-2 rounded-lg font-medium transition ${
                                result.status === 'completed' && client?.id
                                    ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                    : 'bg-white border border-gray-300 text-gray-400 cursor-not-allowed'
                            }`}
                            title={result.status !== 'completed' ? 'Available after a successful analysis' : 'Open the estimate builder with this analysis as supplement source'}
                        >
                            Build Supplement Estimate →
                        </button>
                        <button
                            type="button"
                            onClick={onShareWithClient}
                            disabled={result.status !== 'completed' || !client?.id}
                            className={`w-full py-2 rounded-lg font-medium transition ${
                                result.status === 'completed' && client?.id
                                    ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                    : 'bg-white border border-gray-300 text-gray-400 cursor-not-allowed'
                            }`}
                            title={result.status !== 'completed' ? 'Available after a successful analysis' : 'Copy a client-facing portal link'}
                        >
                            Share with Client
                        </button>
                        {/* Re-analyze: re-runs the AI on the stored file. Always
                            available — most useful when status==='failed' but
                            also handy if the user wants a fresh take. */}
                        <button
                            type="button"
                            onClick={onReanalyze}
                            className="w-full py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                            title="Re-run the AI on the same uploaded document (uses credits)"
                        >
                            Re-analyze
                        </button>
                    </div>

                    {result.ai_model && (
                        <p className="text-xs text-gray-400 mt-4">
                            {result.ai_provider} · {result.ai_model}
                        </p>
                    )}

                    {/* Per-output disclaimer — required on every generated
                        analysis output (compliance). Kept terse here since the
                        full banner is already at the top of the page; the
                        downstream PDF / share renderers use the full body. */}
                    <p className="text-[11px] leading-tight text-gray-500 mt-4 border-t border-gray-200 pt-3">
                        <strong>Disclaimer:</strong> {LEGAL_DISCLAIMER_SHORT}
                    </p>
                </div>
            </div>
        </div>
    );
};

const PolicyAnalysis = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedClient, setSelectedClient] = useState(null);
    const [activeTab, setActiveTab] = useState('existing');
    const [newClientForm, setNewClientForm] = useState({
        first_name: '', last_name: '', email: '', phone: '',
        address: '', city: '', state: '', zip_code: '',
        insurance_carrier: '', policy_number: '',
    });
    const [creatingClient, setCreatingClient] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showResults, setShowResults] = useState(false);
    // Full row returned by POST /policy-analyses — contains all nine AI findings
    // plus status, score, and metadata. Step 18 reads from this for rendering.
    const [analysisResult, setAnalysisResult] = useState(null);
    const [analyzeError, setAnalyzeError] = useState(null);

    // Header stat-chip data — mirrors the 3D-Mockup / Estimation pattern so the
    // user can see AI readiness, credit balance, and feature cost at a glance.
    const [featureCost, setFeatureCost] = useState(null);
    const [creditBalance, setCreditBalance] = useState(null);
    const [historyCount, setHistoryCount] = useState(0);

    useEffect(() => {
        (async () => {
            try {
                const [costRes, balanceRes] = await Promise.all([
                    axiosInstance.get('/credits/feature-costs/policy_analysis', { suppressErrorToast: true }),
                    axiosInstance.get('/credits/me', { suppressErrorToast: true }),
                ]);
                setFeatureCost(costRes.data ?? null);
                setCreditBalance(balanceRes.data ?? null);
            } catch {
                /* Pre-credit-system installs return 404 — leave both null. */
            }
            try {
                const histRes = await axiosInstance.get('/policy-analyses', {
                    params: { limit: 1 }, suppressErrorToast: true,
                });
                setHistoryCount(histRes.data?.meta?.total ?? 0);
            } catch { /* ignore */ }
        })();
    }, []);

    // Derived for header stat-chips. Mirrors Estimation.jsx logic.
    const totalCredits = (creditBalance?.monthly_credits ?? 0) + (creditBalance?.bonus_credits ?? 0);
    const requiredCredits = featureCost?.credits_cost ?? 0;
    const featureDisabledByAdmin = featureCost && featureCost.is_active === false;
    const insufficientCredits = featureCost && !featureDisabledByAdmin && totalCredits < requiredCredits;
    const creditsKnown = featureCost !== null && creditBalance !== null;
    const aiReady = !featureDisabledByAdmin && !insufficientCredits;
    const [openAccordions, setOpenAccordions] = useState({
        claim_arguments: true,
        next_steps: true,
    });
    const [clientSearch, setClientSearch] = useState('');
    const [documentType, setDocumentType] = useState('policy');
    
    const [files, setFiles] = useState([])

    // The six accepted document shapes. Keys must match the backend DTO's
    // `document_type` enum (see CreatePolicyAnalysisDto). The label is what
    // the contractor sees; the hint is rendered under the active chip so it
    // is clear why each type matters.
    // `checklist` items render in the "What to include" panel so the
    // contractor knows what makes each doc type yield a good analysis.
    // The first item per type is marked required (red asterisk in UI).
    const DOCUMENT_TYPES = [
        {
            key: 'policy',
            label: 'Insurance Policy',
            hint: 'Declarations page, policy booklet, endorsements.',
            checklist: [
                { label: 'Declarations Page', required: true },
                { label: 'Policy Booklet' },
                { label: 'Endorsements / Riders' },
            ],
        },
        {
            key: 'claim_document',
            label: 'Claim Document',
            hint: 'Claim filings, summaries, or correspondence about the loss.',
            checklist: [
                { label: 'Claim summary or filing form', required: true },
                { label: 'Date of loss + cause' },
                { label: 'Carrier acknowledgements' },
            ],
        },
        {
            key: 'denial_letter',
            label: 'Denial Letter',
            hint: 'Carrier letter denying or partially denying the claim.',
            checklist: [
                { label: 'Full denial letter (all pages)', required: true },
                { label: 'Cited policy clauses' },
                { label: 'Appeal / reconsideration deadline' },
            ],
        },
        {
            key: 'estimate',
            label: 'Adjuster Estimate',
            hint: 'Carrier or third-party adjuster estimate / scope sheet.',
            checklist: [
                { label: 'Adjuster estimate PDF', required: true },
                { label: 'Line-item pricing (Xactimate/Symbility)' },
                { label: 'Trade breakdown (for O&P)' },
            ],
        },
        {
            key: 'scope',
            label: 'Scope of Work',
            hint: 'Written scope from the carrier or another contractor.',
            checklist: [
                { label: 'Full scope document', required: true },
                { label: 'Affected slopes / elevations' },
                { label: 'Code-upgrade line items (if any)' },
            ],
        },
        {
            key: 'carrier_email',
            label: 'Carrier Email',
            hint: 'Email or message thread from the insurance carrier.',
            checklist: [
                { label: 'Full email or thread (screenshot or .eml)', required: true },
                { label: 'Sender / carrier identification' },
                { label: 'Any deadlines mentioned' },
            ],
        },
    ];

    const activeDocType = DOCUMENT_TYPES.find((t) => t.key === documentType) ?? DOCUMENT_TYPES[0];

    // When opened via /dashboard/policy-analysis?analysis=<id> (from the
    // history page "View" link), fetch the row + its client and render the
    // ResultsView immediately without forcing the user back through Steps 1-3.
    useEffect(() => {
        const analysisId = searchParams?.get('analysis');
        if (!analysisId) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await axiosInstance.get(`/policy-analyses/${analysisId}`);
                if (cancelled) return;
                const row = res.data?.data;
                if (!row) return;
                setAnalysisResult(row);
                setShowResults(true);
                updateProgress(4);
                if (row.client_id) {
                    try {
                        const cRes = await axiosInstance.get(`/client-portal/${row.client_id}`);
                        if (!cancelled && cRes.data?.data) setSelectedClient(cRes.data.data);
                    } catch {
                        /* non-fatal — ResultsView renders without client */
                    }
                }
            } catch {
                /* axiosInstance toasts; user can just go back */
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Real client list (fetched from /client-portal). Search is debounced so we
    // don't spam the API on every keystroke. The server already filters by
    // `search`, so we render `clients` directly — no client-side filter pass.
    const [clients, setClients] = useState([]);
    const [clientsLoading, setClientsLoading] = useState(false);

    useEffect(() => {
        if (activeTab !== 'existing') return;
        let cancelled = false;
        setClientsLoading(true);
        const timer = setTimeout(async () => {
            try {
                const params = {};
                if (clientSearch.trim()) params.search = clientSearch.trim();
                const res = await axiosInstance.get('/client-portal', { params });
                if (cancelled) return;
                setClients(res.data?.data ?? []);
            } catch {
                /* axiosInstance toasts the error */
            } finally {
                if (!cancelled) setClientsLoading(false);
            }
        }, 250);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [activeTab, clientSearch]);

    const updateProgress = (step) => {
        setCurrentStep(step);
    };

    const handleSelectClient = (client) => {
        // Store the full client object so the analyze API has client.id and the
        // UI can render full_name / address / carrier without a re-fetch.
        setSelectedClient(client);
        updateProgress(2);
        setTimeout(() => {
            const uploadSection = document.getElementById('upload-section');
            if (uploadSection) {
                uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    };

    const handleNewClientField = (field, value) => {
        setNewClientForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleCreateClient = async () => {
        // The backend enforces the required fields, but we mirror the same
        // mandatory set as the rest of the dashboard for a consistent UX.
        const required = ['first_name', 'last_name', 'address', 'city', 'state', 'zip_code'];
        const missing = required.filter((k) => !newClientForm[k]?.trim());
        if (missing.length) {
            alert(`Please fill in: ${missing.join(', ')}`);
            return;
        }
        setCreatingClient(true);
        try {
            const res = await axiosInstance.post('/client-portal', {
                ...newClientForm,
                full_name: `${newClientForm.first_name} ${newClientForm.last_name}`.trim(),
            });
            const created = res.data?.data;
            if (created) {
                handleSelectClient(created);
                setNewClientForm({
                    first_name: '', last_name: '', email: '', phone: '',
                    address: '', city: '', state: '', zip_code: '',
                    insurance_carrier: '', policy_number: '',
                });
            }
        } catch {
            /* axiosInstance toasts the error */
        } finally {
            setCreatingClient(false);
        }
    };

    const handleChangeClient = () => {
        setSelectedClient(null);
        setFiles([]);
        setShowResults(false);
        setAnalysisResult(null);
        setAnalyzeError(null);
        updateProgress(1);
    };

    const handleAnalyze = async () => {
        // Guard rails: backend will also reject these, but a friendly client-
        // side message avoids a wasted round-trip + 400 from the validator.
        if (!selectedClient?.id) {
            setAnalyzeError('Please select or create a client first.');
            return;
        }
        if (!files.length) {
            setAnalyzeError('Please attach at least one document.');
            return;
        }

        // FileUploader wraps the native File inside its own object (matches
        // the 3d-mockup pattern at threeDMockup.jsx:474). We MUST send the
        // raw .file — passing the wrapper makes the browser serialise it as
        // a string, which lands in @Body and trips forbidNonWhitelisted.
        const localFile = files[0]?.file ?? null;
        if (!localFile) {
            setAnalyzeError('Please wait for the upload to finish, then click Analyze.');
            return;
        }

        setAnalyzeError(null);
        setIsAnalyzing(true);
        setAnalysisResult(null);

        // Scroll the skeleton into view immediately so the user can see
        // progress instead of staring at the unchanged upload section.
        setTimeout(() => {
            const resultsSection = document.getElementById('results-section');
            if (resultsSection) {
                resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 50);

        try {
            // FormData lets the file ride alongside the JSON fields in one
            // multipart request — matches the controller's FileInterceptor.
            const form = new FormData();
            form.append('file', localFile);
            form.append('client_id', selectedClient.id);
            form.append('document_type', documentType);

            const res = await axiosInstance.post('/policy-analyses', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
                // The backend runs the AI synchronously; allow a generous
                // timeout so slow Gemini responses don't get cut off.
                timeout: 120_000,
            });

            const row = res.data?.data;
            if (!row) {
                setAnalyzeError('Unexpected response from the analyzer.');
                return;
            }
            setAnalysisResult(row);

            // `completed` is the only success status; `failed` means the AI
            // ran but couldn't produce findings. Either way we show results.
            if (row.status === 'failed') {
                setAnalyzeError(row.error_message || 'Analysis failed. Please try again.');
            }
            setShowResults(true);
            updateProgress(4);

            setTimeout(() => {
                const resultsSection = document.getElementById('results-section');
                if (resultsSection) {
                    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        } catch (err) {
            // axiosInstance already toasts the error; we mirror the message
            // inline so it stays visible while the user fixes the input.
            const msg =
                err?.response?.data?.message ||
                err?.message ||
                'Failed to analyze the document.';
            setAnalyzeError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setIsAnalyzing(false);
        }
    };

    const toggleAccordion = (section) => {
        setOpenAccordions(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const progressWidth = ((currentStep - 1) / 3) * 100;

    return (
        <div className="policy-analysis bg-gray-50 min-h-screen">
            {/* HEADER (mr-hero pattern — matches Estimation + Measurement pages) */}
            <div className="mr-hero">
                <div className="mr-hero-inner">
                    <div className="mr-hero-left">
                        <div className="mr-hero-eyebrow">
                            <span className="mr-hero-dot" />
                            Policy Analysis
                        </div>
                        <h1 className="mr-hero-title">
                            Decode policies <span className="mr-hero-title-accent">in one read</span>
                        </h1>
                        <p className="mr-hero-subtitle">
                            Upload a policy, denial, estimate, scope, or carrier email — AI extracts coverage issues, exclusions, deductibles, matching arguments, code upgrades, O&amp;P, RCV vs ACV, and supplement-ready arguments with full reasoning.
                        </p>

                        <div className="mr-hero-stats">
                            <div className={`mr-stat ${aiReady ? "mr-stat-ok" : "mr-stat-warn"}`}>
                                <div className="mr-stat-icon">{aiReady ? "✓" : "!"}</div>
                                <div>
                                    <div className="mr-stat-label">AI Status</div>
                                    <div className="mr-stat-value">
                                        {featureDisabledByAdmin ? "Disabled" : insufficientCredits ? "Low credits" : "Ready"}
                                    </div>
                                </div>
                            </div>

                            {creditsKnown && (
                                <div className={`mr-stat ${insufficientCredits ? "mr-stat-warn" : "mr-stat-ok"}`}>
                                    <div className="mr-stat-icon">⚡</div>
                                    <div>
                                        <div className="mr-stat-label">Credits</div>
                                        <div className="mr-stat-value">
                                            {totalCredits.toLocaleString()}
                                            {requiredCredits > 0 && (
                                                <span className="mr-stat-sub"> · {requiredCredits}/run</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <Link
                                href="/dashboard/policy-analysis/history"
                                className="mr-stat mr-stat-link"
                                title="View past analyses"
                            >
                                <div className="mr-stat-icon">📋</div>
                                <div style={{ textAlign: "left" }}>
                                    <div className="mr-stat-label">History</div>
                                    <div className="mr-stat-value">
                                        {historyCount}
                                        <span className="mr-stat-sub"> analyses</span>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Legal disclaimer — mandatory, non-dismissible, sits above every
                interaction so users see it before uploading or analyzing. */}
            <LegalDisclaimerBanner />

            {/* Progress Steps */}
            <div className="px-6 py-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="progress-steps">
                        <div id="progress-line" className="progress-line" style={{ width: `${progressWidth}%` }}></div>
                        <div id="step-1" className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
                            <div className="step-circle">1</div>
                            <div className="step-label">Select Client</div>
                        </div>
                        <div id="step-2" className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
                            <div className="step-circle">2</div>
                            <div className="step-label">Upload Documents</div>
                        </div>
                        <div id="step-3" className={`step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
                            <div className="step-circle">3</div>
                            <div className="step-label">Analyze Policy</div>
                        </div>
                        <div id="step-4" className={`step ${currentStep >= 4 ? 'active' : ''}`}>
                            <div className="step-circle">4</div>
                            <div className="step-label">View Results</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="px-6 pb-6">
                {/* Step 1: Client Selection */}
                <div id="client-section" className={`bg-white rounded-lg border border-gray-200 p-6 mb-6 ${selectedClient ? 'hidden' : ''}`}>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Select or Create Client</h2>
                        
                        <div className="flex gap-4 mb-4">
                            <button 
                                className={`tab-button ${activeTab === 'existing' ? 'active' : ''}`}
                                onClick={() => setActiveTab('existing')}
                            >
                                Existing Client
                            </button>
                            <button 
                                className={`tab-button ${activeTab === 'new' ? 'active' : ''}`}
                                onClick={() => setActiveTab('new')}
                            >
                                New Client
                            </button>
                        </div>

                        {/* Existing Client Tab */}
                        {activeTab === 'existing' && (
                            <div>
                                <div className="relative mb-4">
                                    <input
                                        type="text"
                                        placeholder="Search client name, address, email or phone..."
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                        value={clientSearch}
                                        onChange={(e) => setClientSearch(e.target.value)}
                                    />
                                </div>
                                {clientsLoading && (
                                    <p className="text-sm text-gray-500 mb-2">Loading clients…</p>
                                )}
                                {!clientsLoading && clients.length === 0 && (
                                    <p className="text-sm text-gray-500 mb-2">
                                        No clients found. Switch to “New Client” to add one.
                                    </p>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {clients.map((client) => (
                                        <div key={client.id} className="border border-gray-200 rounded-lg p-4 hover:border-yellow-400 cursor-pointer transition">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">
                                                        {client.full_name ||
                                                            `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() ||
                                                            'Unnamed client'}
                                                    </h3>
                                                    <p className="text-sm text-gray-600">
                                                        {client.insurance_carrier || '—'}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {[client.address, client.city, client.state].filter(Boolean).join(', ')}
                                                    </p>
                                                    {client.policy_number && (
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Policy: {client.policy_number}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleSelectClient(client)}
                                                    className="px-3 py-1 bg-yellow-400 text-gray-900 rounded text-sm font-medium hover:bg-yellow-500 transition"
                                                >
                                                    Select
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* New Client Tab */}
                        {activeTab === 'new' && (
                            <div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { key: 'first_name', label: 'First Name*' },
                                        { key: 'last_name', label: 'Last Name*' },
                                        { key: 'email', label: 'Email' },
                                        { key: 'phone', label: 'Phone' },
                                        { key: 'address', label: 'Address*' },
                                        { key: 'city', label: 'City*' },
                                        { key: 'state', label: 'State*' },
                                        { key: 'zip_code', label: 'ZIP*' },
                                        { key: 'insurance_carrier', label: 'Insurance Carrier' },
                                        { key: 'policy_number', label: 'Policy #' },
                                    ].map((f) => (
                                        <div key={f.key}>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                                value={newClientForm[f.key]}
                                                onChange={(e) => handleNewClientField(f.key, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={handleCreateClient}
                                    disabled={creatingClient}
                                    className={`mt-4 px-6 py-3 rounded-lg font-medium transition ${
                                        creatingClient
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            : 'bg-yellow-400 text-gray-900 hover:bg-yellow-500'
                                    }`}
                                >
                                    {creatingClient ? 'Creating…' : 'Create Client & Continue'}
                                </button>
                            </div>
                        )}
                    </div>

                {/* Selected Client Bar */}
                <div id="selected-client-bar" className={`bg-green-50 border border-green-200 rounded-lg p-4 mb-6 ${selectedClient ? '' : 'hidden'}`}>
                    <div className="flex justify-between items-center">
                        <div>
                            <span className="text-sm text-green-800">✓ Client Selected: </span>
                            <span className="font-semibold text-green-900" id="selected-client-name">
                                {selectedClient?.full_name ||
                                    `${selectedClient?.first_name ?? ''} ${selectedClient?.last_name ?? ''}`.trim() ||
                                    'Unnamed client'}
                            </span>
                        </div>
                        <button 
                            onClick={handleChangeClient}
                            className="text-sm text-blue-600 hover:underline"
                        >
                            Change Client
                        </button>
                    </div>
                </div>

                {/* Step 2: Document Upload */}
                <div id="upload-section" className={`bg-white rounded-lg border border-gray-200 p-6 mb-6 ${selectedClient ? '' : 'disabled-section'}`}>
                    {!selectedClient && (
                        <div className="disabled-overlay">
                            <div className="disabled-message">
                                <p className="text-gray-700 font-medium">Please select a client first</p>
                            </div>
                        </div>
                    )}
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 2: Upload Document</h2>

                        {/* Document Type Selector — drives the AI prompt the backend
                            picks. The chip layout keeps all six options visible so the
                            contractor never has to open a dropdown to compare them. */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                What kind of document is this? <span className="text-red-500">*</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {DOCUMENT_TYPES.map((t) => {
                                    const isActive = t.key === documentType;
                                    return (
                                        <button
                                            key={t.key}
                                            type="button"
                                            onClick={() => setDocumentType(t.key)}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                                                isActive
                                                    ? 'bg-yellow-400 border-yellow-500 text-gray-900'
                                                    : 'bg-white border-gray-300 text-gray-700 hover:border-yellow-400'
                                            }`}
                                        >
                                            {t.label}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">{activeDocType.hint}</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Upload Zone */}

                         <div>
                             <FileUploader label='Drag & drop policy documents here' files={files} setFiles={setFiles} allowedExtensions={['.pdf', '.jpg', '.doc', '.docx']} maxSizeMB={50} />
                         </div>

                            {/* Document Checklist */}
                            <div>
                                {/* Doc-type-aware checklist. Items come from
                                    activeDocType.checklist so they match whatever
                                    the contractor picked in Step 15. Checkbox state
                                    is informational only — backend doesn't enforce
                                    which items are present. */}
                                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                        For best results, include:
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        {activeDocType.checklist.map((item, idx) => (
                                            <label key={idx} className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    className="rounded text-yellow-400"
                                                    checked={item.required ? files.length > 0 : undefined}
                                                    readOnly={!!item.required}
                                                />
                                                <span className="text-gray-700">
                                                    {item.label}
                                                    {item.required && <span className="text-red-500"> *</span>}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Analyze Button — clean inline spinner during analysis.
                            We avoid the legacy `.spinner` CSS class because it
                            rotates the whole content (text included) on top of
                            the dots' own bounce animation, which read as ugly. */}
                        <div className="mt-6 text-center">
                            <button
                                id="analyze-button"
                                onClick={handleAnalyze}
                                disabled={files.length === 0 || isAnalyzing}
                                className={`px-8 py-3 rounded-lg font-medium text-lg transition inline-flex items-center justify-center gap-3 ${
                                    files.length === 0 || isAnalyzing
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-yellow-400 text-gray-900 hover:bg-yellow-500'
                                }`}
                            >
                                {isAnalyzing ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                                            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                        </svg>
                                        <span>Analyzing…</span>
                                    </>
                                ) : (
                                    <span>
                                        {files.length === 0
                                            ? 'Select a file to enable analysis'
                                            : showResults
                                                ? 'Re-analyze Policy'
                                                : 'Analyze Policy'}
                                    </span>
                                )}
                            </button>
                            <p className="text-xs text-gray-500 mt-2">Analysis typically takes 30-60 seconds</p>
                            {analyzeError && (
                                <div className="mt-3 mx-auto max-w-xl px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
                                    {analyzeError}
                                </div>
                            )}
                        </div>
                    </div>

                {/* Step 3 & 4: Analysis Results.

                    Three exclusive states render here:
                      1. `isAnalyzing` — in-flight skeleton with the nine target
                         findings, so the user sees what is being produced.
                      2. `analysisResult` — the real ResultsView.
                      3. neither      — the "nothing analyzed yet" hint overlay.
                */}
                <div id="results-section" className={(showResults || isAnalyzing) ? '' : 'disabled-section'}>
                    {!showResults && !isAnalyzing && (
                        <div className="disabled-overlay">
                            <div className="disabled-message">
                                <p className="text-gray-700 font-medium mb-2">📄 No Policy Analyzed Yet</p>
                                <p className="text-sm text-gray-600">
                                    Pick a document type, attach a file, and click “Analyze Policy” to see results here.
                                </p>
                            </div>
                        </div>
                    )}

                    {isAnalyzing && <AnalyzingSkeleton />}

                    {!isAnalyzing && analysisResult && (
                        <ResultsView
                            result={analysisResult}
                            client={selectedClient}
                            openAccordions={openAccordions}
                            toggleAccordion={toggleAccordion}
                            onGenerateReport={() =>
                                openAnalysisReport({
                                    analysis: analysisResult,
                                    client: selectedClient,
                                    onPopupBlocked: () =>
                                        alert('Pop-up blocked. Allow pop-ups for this site to print as PDF.'),
                                })
                            }
                            onReanalyze={async () => {
                                // Re-running uses the file already in S3, so we
                                // don't need to re-upload. Backend re-checks
                                // credits and updates the row in place; we
                                // replace local state with the response so the
                                // findings refresh without a page reload.
                                if (!analysisResult?.id) return;
                                if (!confirm('Re-analyze this document? This will use credits again.')) return;
                                setIsAnalyzing(true);
                                setAnalyzeError(null);
                                try {
                                    const res = await axiosInstance.post(
                                        `/policy-analyses/${analysisResult.id}/reanalyze`,
                                        null,
                                        { timeout: 120_000 },
                                    );
                                    const row = res.data?.data;
                                    if (row) {
                                        setAnalysisResult(row);
                                        if (row.status === 'failed') {
                                            setAnalyzeError(row.error_message || 'Re-analysis failed.');
                                        }
                                    }
                                } catch (err) {
                                    const msg =
                                        err?.response?.data?.message ||
                                        err?.message ||
                                        'Failed to re-analyze.';
                                    setAnalyzeError(typeof msg === 'string' ? msg : JSON.stringify(msg));
                                } finally {
                                    setIsAnalyzing(false);
                                }
                            }}
                            onShareWithClient={async () => {
                                // Mirror the existing client-portal share pattern
                                // (ClientPortal.jsx:181). We deep-link to the
                                // specific analysis via ?analysis=<id> so the
                                // portal page can scroll/open straight to it once
                                // Step 27 lands. Falls back to the bare portal URL
                                // if anything goes wrong.
                                if (!selectedClient?.id) return;
                                const url = `https://claimking.ai/portal/${selectedClient.id}?analysis=${analysisResult.id}`;
                                try {
                                    await navigator.clipboard.writeText(url);
                                    toast.success('Portal link copied to clipboard', {
                                        description: 'Share this with the client so they can view the analysis.',
                                    });
                                } catch {
                                    toast.error('Clipboard unavailable', {
                                        description: url,
                                    });
                                }
                            }}
                            onCreateEstimate={() => {
                                // Hand off to the existing estimation builder. It
                                // already consumes ?client_id=… (see Estimation.jsx)
                                // and pre-selects the client. We also pass the
                                // policy_analysis_id so a future iteration can pull
                                // the AI's claim_arguments / matching_issues into
                                // the scope-hint chips automatically.
                                if (!selectedClient?.id) return;
                                const qs = new URLSearchParams({
                                    client_id: selectedClient.id,
                                    policy_analysis_id: analysisResult.id,
                                });
                                router.push(`/dashboard/estimation?${qs.toString()}`);
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default PolicyAnalysis;

