'use client'
import React, { useState, useEffect } from 'react';
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
import ClientSelector from "@/components/clients/ClientSelector";
import { toClientShape } from "@/lib/clients/newClientForm";

const FileUploader = dynamic(
    () => import("@/utiles/LocalFileUploader"),
    { ssr: false }
);

const DOCUMENT_TYPE_LABELS = {
    policy: 'Insurance Policy',
    claim_ack: 'Claim Acknowledgment',
    denial: 'Denial Letter',
    adjuster_estimate: 'Adjuster Estimate',
    scope_of_work: 'Scope of Work',
    email_thread: 'Carrier Email',
    unknown: 'Unknown Document',
};

const docTypeLabel = (t) => DOCUMENT_TYPE_LABELS[t] || t || 'Document';

const LegalDisclaimerBanner = () => (
    <div role="note" aria-label="Legal disclaimer" className="px-6 pt-4">
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex gap-3">
            <div className="text-amber-600 text-xl leading-none">⚠</div>
            <div>
                <p className="font-semibold text-amber-900 text-sm">{LEGAL_DISCLAIMER_HEADLINE}</p>
                <p className="text-amber-900 text-xs mt-1">{LEGAL_DISCLAIMER_BODY}</p>
            </div>
        </div>
    </div>
);

// Authed inline preview of the original document (S3 needs a bearer token, so
// we fetch it as a blob and point an <iframe>/<img> at the object URL).
const AuthedDocPreview = ({ fileKey, fileMime }) => {
    const [url, setUrl] = useState(null);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        if (!fileKey) return;
        let revoke = null;
        let cancelled = false;
        (async () => {
            try {
                const res = await axiosInstance.get(
                    `/s3/file?key=${encodeURIComponent(fileKey)}`,
                    { responseType: 'blob', suppressErrorToast: true },
                );
                if (cancelled) return;
                const objUrl = URL.createObjectURL(res.data);
                revoke = objUrl;
                setUrl(objUrl);
            } catch {
                if (!cancelled) setFailed(true);
            }
        })();
        return () => { cancelled = true; if (revoke) URL.revokeObjectURL(revoke); };
    }, [fileKey]);

    if (failed) return <div className="doc-preview-empty">Preview unavailable.</div>;
    if (!url) return <div className="doc-preview-empty">Loading document…</div>;
    if (fileMime && fileMime.startsWith('image/')) {
        return <img src={url} alt="Original document" className="doc-preview-img" />;
    }
    return <iframe src={url} title="Original document" className="doc-preview-frame" />;
};

const DOC_TYPE_ICONS = {
    policy: '📋',
    claim_ack: '📨',
    denial: '🚫',
    adjuster_estimate: '🧾',
    scope_of_work: '🔨',
    email_thread: '✉️',
    unknown: '📄',
};

// "policy_form" -> "Policy Form", "rcv" -> "RCV"
const ACRONYMS = new Set(['rcv', 'acv', 'op', 'id', 'po']);
const humanize = (key) =>
    String(key)
        .replace(/_/g, ' ')
        .split(' ')
        .map((w) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
        .join(' ');

const isEmptyVal = (v) =>
    v == null || v === '' || (Array.isArray(v) && !v.length) ||
    (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);

const isScalar = (v) => v == null || typeof v !== 'object';
const PRIMARY_KEYS = ['name', 'title', 'item', 'description', 'marker', 'code', 'label', 'participant'];

// Pick the best "headline" field of an object to use as a card title.
const pickTitle = (obj) => {
    for (const k of PRIMARY_KEYS) {
        if (typeof obj[k] === 'string' && obj[k].trim()) return k;
    }
    const firstStr = Object.entries(obj).find(([, v]) => typeof v === 'string' && v.trim());
    return firstStr ? firstStr[0] : null;
};

// A flat label:value definition grid for scalar fields.
const SpecGrid = ({ entries }) => (
    <dl className="pa-spec-grid">
        {entries.map(([k, v]) => (
            <div key={k} className="pa-spec">
                <dt className="pa-spec-label">{humanize(k)}</dt>
                <dd className="pa-spec-val">{String(v)}</dd>
            </div>
        ))}
    </dl>
);

// Render the remaining (non-title) fields of an item compactly.
const ItemMeta = ({ obj, skipKey }) => {
    const rows = Object.entries(obj).filter(([k, v]) => k !== skipKey && !isEmptyVal(v));
    if (!rows.length) return null;
    return (
        <div className="pa-item-meta">
            {rows.map(([k, v]) => {
                if (isScalar(v)) {
                    return (
                        <div key={k} className="pa-meta-row">
                            <span className="pa-meta-key">{humanize(k)}</span>
                            <span className="pa-meta-val">{String(v)}</span>
                        </div>
                    );
                }
                // nested object/array → recurse compactly
                return (
                    <div key={k} className="pa-meta-block">
                        <span className="pa-meta-key">{humanize(k)}</span>
                        <ExtractedGroup label={null} value={v} />
                    </div>
                );
            })}
        </div>
    );
};

// Render a single group value (array or object) below a heading.
const ExtractedGroup = ({ value }) => {
    if (Array.isArray(value)) {
        const allObjects = value.every((v) => v && typeof v === 'object' && !Array.isArray(v));
        if (allObjects) {
            return (
                <div className="pa-item-stack">
                    {value.map((obj, i) => {
                        const titleKey = pickTitle(obj);
                        return (
                            <div key={i} className="pa-item">
                                {titleKey && <p className="pa-item-title">{String(obj[titleKey])}</p>}
                                <ItemMeta obj={obj} skipKey={titleKey} />
                            </div>
                        );
                    })}
                </div>
            );
        }
        // array of primitives → chips
        return (
            <div className="pa-chips">
                {value.map((v, i) => <span key={i} className="pa-chip">{String(v)}</span>)}
            </div>
        );
    }
    if (value && typeof value === 'object') {
        const entries = Object.entries(value).filter(([, v]) => !isEmptyVal(v));
        const scalars = entries.filter(([, v]) => isScalar(v));
        const nested = entries.filter(([, v]) => !isScalar(v));
        return (
            <div className="pa-subgroup">
                {scalars.length > 0 && <SpecGrid entries={scalars} />}
                {nested.map(([k, v]) => (
                    <div key={k} className="pa-subsection">
                        <h5 className="pa-group-subtitle">{humanize(k)}</h5>
                        <ExtractedGroup value={v} />
                    </div>
                ))}
            </div>
        );
    }
    return <span>{String(value)}</span>;
};

// Top-level renderer: scalar fields first in one spec grid, then each
// object/array field as its own titled section.
const ExtractedDetails = ({ data }) => {
    const entries = Object.entries(data || {}).filter(([, v]) => !isEmptyVal(v));
    if (!entries.length) return <p className="text-sm text-gray-500 italic">No structured data extracted.</p>;
    const scalars = entries.filter(([, v]) => isScalar(v));
    const groups = entries.filter(([, v]) => !isScalar(v));
    return (
        <div className="pa-details">
            {scalars.length > 0 && <SpecGrid entries={scalars} />}
            {groups.map(([k, v]) => (
                <section key={k} className="pa-group">
                    <h4 className="pa-group-title">{humanize(k)}</h4>
                    <ExtractedGroup value={v} />
                </section>
            ))}
        </div>
    );
};

const deadlineTone = (days) => {
    if (days == null) return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
    if (days < 0) return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' };
    if (days <= 30) return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
    if (days <= 90) return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' };
    return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
};

// Collapsible section matching the spec mockup's accordion design.
const Accordion = ({ title, count, accent, open, onToggle, children }) => (
    <div className={`border ${accent.border} rounded-lg mb-4`}>
        <div className={`accordion-header ${accent.bg} p-4 flex justify-between items-center`} onClick={onToggle}>
            <h3 className={`font-semibold ${accent.text}`}>
                {title}
                {typeof count === 'number' && <span className="ml-2 text-xs font-normal opacity-70">({count})</span>}
            </h3>
            <span className={accent.text}>{open ? '▲' : '▼'}</span>
        </div>
        <div className={`accordion-content ${open ? 'open' : ''}`}>
            <div className="p-4">{children}</div>
        </div>
    </div>
);

const AnalyzingSkeleton = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-5">
            <svg className="animate-spin h-7 w-7 text-yellow-500 shrink-0" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <div>
                <p className="font-semibold text-gray-900">Classifying & analyzing document…</p>
                <p className="text-sm text-gray-600">Claude detects the document type, then extracts the details. Usually 30–60 seconds.</p>
            </div>
        </div>
    </div>
);

const ResultsView = ({
    result, client, actions, onToggleAction,
    onGenerateReport, onCreateEstimate, onGenerateReply, onPushToClaim, onNotifyClient, onToggleVisibility,
    onReanalyze, onFlag,
}) => {
    const [docOpen, setDocOpen] = useState(false);
    const [open, setOpen] = useState({ details: true, deadlines: true, actions: true });
    const toggle = (k) => setOpen((p) => ({ ...p, [k]: !p[k] }));

    const ed = result.extracted_data || {};
    const deadlines = (Array.isArray(result.critical_deadlines) ? [...result.critical_deadlines] : [])
        .sort((a, b) => {
            const av = typeof a.days_remaining === 'number' ? a.days_remaining : Infinity;
            const bv = typeof b.days_remaining === 'number' ? b.days_remaining : Infinity;
            return av - bv;
        });
    const completed = result.status === 'completed';
    const isReplyType = result.document_type === 'denial' || result.document_type === 'email_thread';
    const claimNo = ed.claim_number || ed.policy_number || null;
    const confidencePct = typeof result.ai_confidence === 'number'
        ? Math.round(result.ai_confidence * 100) : null;
    const docIcon = DOC_TYPE_ICONS[result.document_type] || '📄';
    const actionList = actions || [];
    const doneCount = actionList.filter((a) => a.done).length;
    const actionPct = actionList.length ? Math.round((doneCount / actionList.length) * 100) : 0;
    const hasDetails = Object.keys(ed).length > 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Results */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Policy Analysis Results</h2>
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                            result.status === 'completed' ? 'bg-green-100 text-green-700' :
                            result.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                        }`}>{result.status}</span>
                    </div>

                    {/* Document Summary (mockup "Coverage Summary" blue box) */}
                    <div className="bg-blue-50 rounded-lg p-4 mb-4">
                        <div className="flex justify-between items-start gap-3 mb-3">
                            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                <span>{docIcon}</span> {docTypeLabel(result.document_type)}
                                {confidencePct != null && (
                                    <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{confidencePct}% confidence</span>
                                )}
                            </h3>
                            {result.file_key && (
                                <button type="button" onClick={() => setDocOpen(true)} className="pa-view-btn shrink-0">
                                    <span>📄</span> View original
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><span className="text-gray-600">Carrier:</span><strong className="block">{result.detected_carrier || '—'}</strong></div>
                            <div><span className="text-gray-600">Claim / Policy #:</span><strong className="block">{claimNo || '—'}</strong></div>
                            <div><span className="text-gray-600">Document date:</span><strong className="block">{result.document_date || '—'}</strong></div>
                            <div><span className="text-gray-600">Critical deadlines:</span><strong className={`block ${deadlines.length ? 'text-red-600' : ''}`}>{deadlines.length || '—'}</strong></div>
                        </div>
                        {result.summary && <p className="text-sm text-gray-700 mt-3 pt-3 border-t border-blue-100">{result.summary}</p>}
                        {result.status === 'failed' && result.error_message && (
                            <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{result.error_message}</p>
                        )}
                    </div>

                    {/* Extracted Details accordion (green) — kept at top */}
                    <Accordion
                        title="📋 Extracted Details"
                        accent={{ border: 'border-green-200', bg: 'bg-green-50', text: 'text-green-800' }}
                        open={open.details}
                        onToggle={() => toggle('details')}
                    >
                        {hasDetails
                            ? <ExtractedDetails data={ed} />
                            : <p className="text-sm text-gray-500 italic">No structured data extracted.</p>}
                    </Accordion>

                    {/* Critical Deadlines accordion (red) */}
                    {deadlines.length > 0 && (
                        <Accordion
                            title="⏱ Critical Deadlines"
                            count={deadlines.length}
                            accent={{ border: 'border-red-200', bg: 'bg-red-50', text: 'text-red-800' }}
                            open={open.deadlines}
                            onToggle={() => toggle('deadlines')}
                        >
                            <div className="space-y-2">
                                {deadlines.map((d, i) => {
                                    const tone = deadlineTone(d.days_remaining);
                                    return (
                                        <div key={i} className={`rounded-lg border p-3 ${tone.bg} ${tone.border}`}>
                                            <div className="flex justify-between items-center gap-3">
                                                <p className={`text-sm font-medium ${tone.text}`}>{d.description}</p>
                                                {typeof d.days_remaining === 'number' && (
                                                    <span className={`text-xs font-bold whitespace-nowrap ${tone.text}`}>
                                                        {d.days_remaining < 0 ? `${Math.abs(d.days_remaining)}d overdue` : `${d.days_remaining}d left`}
                                                    </span>
                                                )}
                                            </div>
                                            {d.date && <p className={`text-xs mt-0.5 ${tone.text}`}>Due {d.date}</p>}
                                        </div>
                                    );
                                })}
                            </div>
                        </Accordion>
                    )}

                    {/* Suggested Actions accordion (yellow) */}
                    <Accordion
                        title="⚡ Suggested Actions"
                        count={actionList.length || undefined}
                        accent={{ border: 'border-yellow-400', bg: 'bg-yellow-50', text: 'text-yellow-800' }}
                        open={open.actions}
                        onToggle={() => toggle('actions')}
                    >
                        {actionList.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No suggested actions.</p>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-gray-600">{doneCount}/{actionList.length} done</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
                                    <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${actionPct}%` }} />
                                </div>
                                <ul className="pa-action-list">
                                    {actionList.map((a, i) => (
                                        <li key={i} className={`pa-action ${a.done ? 'pa-action-done' : ''}`} onClick={() => onToggleAction(i)}>
                                            <input
                                                type="checkbox"
                                                checked={!!a.done}
                                                onChange={() => onToggleAction(i)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="mt-0.5 rounded text-yellow-500 shrink-0"
                                            />
                                            <div>
                                                <p className="pa-action-title">{a.title}</p>
                                                {a.detail && <p className="pa-action-detail">{a.detail}</p>}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </Accordion>

                </div>

                {/* Original-document modal */}
                {docOpen && (
                    <div className="pa-doc-modal" onClick={() => setDocOpen(false)}>
                        <div className="pa-doc-modal-inner" onClick={(e) => e.stopPropagation()}>
                            <div className="pa-doc-modal-head">
                                <span className="text-sm font-semibold text-gray-800 truncate">{result.file_name || 'Original document'}</span>
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => window.open(`/s3/file?key=${encodeURIComponent(result.file_key)}`, '_blank')} className="pa-view-btn">
                                        Open in new tab ↗
                                    </button>
                                    <button type="button" onClick={() => setDocOpen(false)} className="pa-doc-modal-close" aria-label="Close">×</button>
                                </div>
                            </div>
                            <div className="pa-doc-modal-body">
                                <AuthedDocPreview fileKey={result.file_key} fileMime={result.file_mime} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Side Panel */}
            <div>
                <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-4">
                    <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <button type="button" onClick={onGenerateReport} disabled={!completed}
                            className={`w-full py-2 rounded-lg font-medium transition ${completed ? 'bg-yellow-400 text-gray-900 hover:bg-yellow-500' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>
                            Generate Report
                        </button>
                        <button type="button" onClick={onCreateEstimate} disabled={!completed || !client?.id}
                            className={`w-full py-2 rounded-lg font-medium transition ${completed && client?.id ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-white border border-gray-300 text-gray-400 cursor-not-allowed'}`}>
                            Create Estimate
                        </button>
                        {isReplyType && (
                            <button type="button" onClick={onGenerateReply} disabled={!completed}
                                className={`w-full py-2 rounded-lg font-medium transition ${completed ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-white border border-gray-300 text-gray-400 cursor-not-allowed'}`}>
                                Generate Reply →
                            </button>
                        )}
                        <button type="button" onClick={onPushToClaim} disabled={!completed || !client?.id}
                            className={`w-full py-2 rounded-lg font-medium transition ${completed && client?.id ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-white border border-gray-300 text-gray-400 cursor-not-allowed'}`}>
                            Push to Claim
                        </button>
                        <button type="button" onClick={onNotifyClient} disabled={!completed || !client?.id}
                            className={`w-full py-2 rounded-lg font-medium transition ${completed && client?.id ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-white border border-gray-300 text-gray-400 cursor-not-allowed'}`}>
                            Share with Client
                        </button>

                        <label className="flex items-center justify-between gap-2 py-2 px-3 border border-gray-200 rounded-lg">
                            <span className="text-sm text-gray-700">Visible in client portal</span>
                            <input type="checkbox" checked={!!result.is_visible_in_portal} onChange={(e) => onToggleVisibility(e.target.checked)} className="rounded text-yellow-500" />
                        </label>

                        <button type="button" onClick={onReanalyze}
                            className="w-full py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                            Re-analyze
                        </button>
                        <button type="button" onClick={onFlag}
                            className={`w-full py-2 rounded-lg font-medium transition border ${result.flagged_for_review ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                            {result.flagged_for_review ? '🚩 Flagged for review' : 'Looks wrong? Flag for review'}
                        </button>
                    </div>

                    {confidencePct != null && (
                        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                            <h4 className="text-sm font-semibold text-blue-900 mb-2">AI Confidence</h4>
                            <div className="text-3xl font-bold text-blue-600">{confidencePct}%</div>
                            <p className="text-xs text-blue-700 mt-1">How sure Claude is about this extraction</p>
                        </div>
                    )}

                    {result.ai_model && (
                        <p className="text-xs text-gray-400 mt-4">{result.ai_provider} · {result.ai_model}</p>
                    )}
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
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [actions, setActions] = useState([]);
    const [analyzeError, setAnalyzeError] = useState(null);

    const [featureCost, setFeatureCost] = useState(null);
    const [creditBalance, setCreditBalance] = useState(null);
    const [historyCount, setHistoryCount] = useState(0);

    const [files, setFiles] = useState([]);

    // Keep the editable suggested-actions checklist synced with the loaded row.
    useEffect(() => {
        setActions(Array.isArray(analysisResult?.suggested_actions) ? analysisResult.suggested_actions : []);
    }, [analysisResult?.id, analysisResult?.suggested_actions]);

    useEffect(() => {
        (async () => {
            try {
                const [costRes, balanceRes] = await Promise.all([
                    axiosInstance.get('/credits/feature-costs/policy_analysis', { suppressErrorToast: true }),
                    axiosInstance.get('/credits/me', { suppressErrorToast: true }),
                ]);
                setFeatureCost(costRes.data ?? null);
                setCreditBalance(balanceRes.data ?? null);
            } catch { /* pre-credit installs 404 */ }
            try {
                const histRes = await axiosInstance.get('/policy-analyses', { params: { limit: 1 }, suppressErrorToast: true });
                setHistoryCount(histRes.data?.meta?.total ?? 0);
            } catch { /* ignore */ }
        })();
    }, []);

    const totalCredits = (creditBalance?.monthly_credits ?? 0) + (creditBalance?.bonus_credits ?? 0);
    const requiredCredits = featureCost?.credits_cost ?? 0;
    const featureDisabledByAdmin = featureCost && featureCost.is_active === false;
    const insufficientCredits = featureCost && !featureDisabledByAdmin && totalCredits < requiredCredits;
    const creditsKnown = featureCost !== null && creditBalance !== null;
    const aiReady = !featureDisabledByAdmin && !insufficientCredits;

    // Open via ?analysis=<id> (from history "View")
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
                setCurrentStep(4);
                if (row.client_id) {
                    try {
                        const cRes = await axiosInstance.get(`/client-portal/${row.client_id}`);
                        if (!cancelled && cRes.data?.data) setSelectedClient(toClientShape(cRes.data.data));
                    } catch { /* non-fatal */ }
                }
            } catch { /* toasted */ }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleClientChange = (shaped) => {
        if (shaped) {
            setSelectedClient(shaped);
            setCurrentStep(2);
            setTimeout(() => {
                document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } else {
            setSelectedClient(null);
            setFiles([]);
            setShowResults(false);
            setAnalysisResult(null);
            setAnalyzeError(null);
            setCurrentStep(1);
        }
    };

    const handleAnalyze = async () => {
        if (!selectedClient?.id) { setAnalyzeError('Please select or create a client first.'); return; }
        if (!files.length) { setAnalyzeError('Please attach a document.'); return; }
        const localFile = files[0]?.file ?? null;
        if (!localFile) { setAnalyzeError('Please wait for the upload to finish, then click Analyze.'); return; }

        setAnalyzeError(null);
        setIsAnalyzing(true);
        setAnalysisResult(null);
        setTimeout(() => document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);

        try {
            const form = new FormData();
            form.append('file', localFile);
            form.append('client_id', selectedClient.id);

            const res = await axiosInstance.post('/policy-analyses', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 240_000,
            });
            const row = res.data?.data;
            if (!row) { setAnalyzeError('Unexpected response from the analyzer.'); return; }
            setAnalysisResult(row);
            if (row.status === 'failed') setAnalyzeError(row.error_message || 'Analysis failed. Please try again.');
            setShowResults(true);
            setCurrentStep(4);
            setTimeout(() => document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to analyze the document.';
            setAnalyzeError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setIsAnalyzing(false);
        }
    };

    // ---- result-level actions ----
    const persistActions = async (next) => {
        setActions(next);
        if (!analysisResult?.id) return;
        try {
            await axiosInstance.patch(`/policy-analyses/${analysisResult.id}/actions`, { actions: next }, { suppressErrorToast: true });
        } catch { toast.error('Could not save action state'); }
    };
    const handleToggleAction = (idx) => {
        const next = actions.map((a, i) => i === idx ? { ...a, done: !a.done } : a);
        persistActions(next);
    };

    const handleToggleVisibility = async (visible) => {
        if (!analysisResult?.id) return;
        try {
            const res = await axiosInstance.patch(`/policy-analyses/${analysisResult.id}/visibility`, { visible });
            if (res.data?.data) setAnalysisResult(res.data.data);
            toast.success(visible ? 'Visible in client portal' : 'Hidden from client portal');
        } catch { /* toasted */ }
    };

    const handlePushToClaim = async () => {
        if (!analysisResult?.id) return;
        try {
            const res = await axiosInstance.post(`/policy-analyses/${analysisResult.id}/push-to-claim`, {});
            if (res.data?.data) setAnalysisResult(res.data.data);
            toast.success('Pushed to claim', { description: 'Analysis is attached to the claim and visible in the portal.' });
        } catch { /* toasted */ }
    };

    const handleNotifyClient = async () => {
        if (!analysisResult?.id) return;
        if (!confirm('Share this analysis with the client? They will get an email with a portal link, and it will be made visible in their portal.')) return;
        try {
            const res = await axiosInstance.post(`/policy-analyses/${analysisResult.id}/notify-client`, {});
            toast.success('Shared with client', {
                description: res.data?.sent_to ? `Sent to ${res.data.sent_to}` : undefined,
            });
            // notify flips is_visible_in_portal=true — refresh to reflect it
            const r = await axiosInstance.get(`/policy-analyses/${analysisResult.id}`, { suppressErrorToast: true });
            if (r.data?.data) setAnalysisResult(r.data.data);
        } catch { /* toasted */ }
    };

    const handleFlag = async () => {
        if (!analysisResult?.id) return;
        const next = !analysisResult.flagged_for_review;
        try {
            const res = await axiosInstance.post(`/policy-analyses/${analysisResult.id}/flag`, { flagged: next });
            if (res.data?.data) setAnalysisResult(res.data.data);
            toast.success(next ? 'Flagged for review' : 'Flag cleared');
        } catch { /* toasted */ }
    };

    const handleGenerateReply = () => {
        if (!analysisResult?.id) return;
        const qs = new URLSearchParams({ draft_analysis: analysisResult.id });
        if (selectedClient?.id) qs.set('client_id', selectedClient.id);
        router.push(`/dashboard/emails?${qs.toString()}`);
    };

    const handleCreateEstimate = () => {
        if (!selectedClient?.id) return;
        const qs = new URLSearchParams({
            client_id: selectedClient.id,
            policy_analysis_id: analysisResult.id,
        });
        router.push(`/dashboard/estimation?${qs.toString()}`);
    };

    const handleReanalyze = async () => {
        if (!analysisResult?.id) return;
        if (!confirm('Re-analyze this document? This will use credits again.')) return;
        setIsAnalyzing(true);
        setAnalyzeError(null);
        try {
            const res = await axiosInstance.post(`/policy-analyses/${analysisResult.id}/reanalyze`, null, { timeout: 240_000 });
            const row = res.data?.data;
            if (row) {
                setAnalysisResult(row);
                if (row.status === 'failed') setAnalyzeError(row.error_message || 'Re-analysis failed.');
            }
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to re-analyze.';
            setAnalyzeError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setIsAnalyzing(false);
        }
    };

    const progressWidth = ((currentStep - 1) / 3) * 100;

    return (
        <div className="policy-analysis bg-gray-50 min-h-screen">
            <div className="mr-hero">
                <div className="mr-hero-inner">
                    <div className="mr-hero-left">
                        <div className="mr-hero-eyebrow"><span className="mr-hero-dot" />Policy Analysis</div>
                        <h1 className="mr-hero-title">Decode any insurance doc <span className="mr-hero-title-accent">in one read</span></h1>
                        <p className="mr-hero-subtitle">
                            Upload a policy, denial, claim acknowledgment, adjuster estimate, scope, or carrier email — Claude detects the document type automatically, extracts the key data, flags critical deadlines, and suggests next steps.
                        </p>
                        <div className="mr-hero-stats">
                            <div className={`mr-stat ${aiReady ? "mr-stat-ok" : "mr-stat-warn"}`}>
                                <div className="mr-stat-icon">{aiReady ? "✓" : "!"}</div>
                                <div>
                                    <div className="mr-stat-label">AI Status</div>
                                    <div className="mr-stat-value">{featureDisabledByAdmin ? "Disabled" : insufficientCredits ? "Low credits" : "Ready"}</div>
                                </div>
                            </div>
                            {creditsKnown && (
                                <div className={`mr-stat ${insufficientCredits ? "mr-stat-warn" : "mr-stat-ok"}`}>
                                    <div className="mr-stat-icon">⚡</div>
                                    <div>
                                        <div className="mr-stat-label">Credits</div>
                                        <div className="mr-stat-value">{totalCredits.toLocaleString()}{requiredCredits > 0 && <span className="mr-stat-sub"> · {requiredCredits}/run</span>}</div>
                                    </div>
                                </div>
                            )}
                            <Link href="/dashboard/policy-analysis/history" className="mr-stat mr-stat-link" title="View past analyses">
                                <div className="mr-stat-icon">📋</div>
                                <div style={{ textAlign: "left" }}>
                                    <div className="mr-stat-label">History</div>
                                    <div className="mr-stat-value">{historyCount}<span className="mr-stat-sub"> analyses</span></div>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <LegalDisclaimerBanner />

            <div className="px-6 py-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="progress-steps">
                        <div id="progress-line" className="progress-line" style={{ width: `${progressWidth}%` }}></div>
                        <div className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
                            <div className="step-circle">1</div><div className="step-label">Select Client</div>
                        </div>
                        <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
                            <div className="step-circle">2</div><div className="step-label">Upload Document</div>
                        </div>
                        <div className={`step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
                            <div className="step-circle">3</div><div className="step-label">Auto-Analyze</div>
                        </div>
                        <div className={`step ${currentStep >= 4 ? 'active' : ''}`}>
                            <div className="step-circle">4</div><div className="step-label">View Results</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-6 pb-6">
                <ClientSelector client={selectedClient} onChange={handleClientChange} scrollId="client-section" />

                <div id="upload-section" className={`bg-white rounded-lg border border-gray-200 p-6 mb-6 ${selectedClient ? '' : 'disabled-section'}`}>
                    {!selectedClient && (
                        <div className="disabled-overlay"><div className="disabled-message">
                            <p className="text-gray-700 font-medium">Please select a client first</p>
                        </div></div>
                    )}
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Step 2: Upload Document</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Drop any insurance document — Claude figures out what it is. No need to pick a type.
                    </p>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <FileUploader label='Drag & drop an insurance document here' files={files} setFiles={setFiles} allowedExtensions={['.pdf', '.jpg', '.png', '.doc', '.docx']} maxSizeMB={50} />
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Auto-detects:</h3>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• Homeowner's Policy (HO-3)</li>
                                <li>• Claim Acknowledgment</li>
                                <li>• Denial Letter</li>
                                <li>• Adjuster's Estimate (Xactimate)</li>
                                <li>• Scope of Work</li>
                                <li>• Carrier Email Thread</li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-6 text-center">
                        <button id="analyze-button" onClick={handleAnalyze} disabled={files.length === 0 || isAnalyzing}
                            className={`px-8 py-3 rounded-lg font-medium text-lg transition inline-flex items-center justify-center gap-3 ${files.length === 0 || isAnalyzing ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-yellow-400 text-gray-900 hover:bg-yellow-500'}`}>
                            {isAnalyzing ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                                        <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                    </svg>
                                    <span>Analyzing…</span>
                                </>
                            ) : (
                                <span>{files.length === 0 ? 'Select a file to enable analysis' : showResults ? 'Re-analyze Document' : 'Analyze Document'}</span>
                            )}
                        </button>
                        <p className="text-xs text-gray-500 mt-2">Analysis typically takes 30-60 seconds</p>
                        {analyzeError && (
                            <div className="mt-3 mx-auto max-w-xl px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{analyzeError}</div>
                        )}
                    </div>
                </div>

                <div id="results-section" className={(showResults || isAnalyzing) ? '' : 'disabled-section'}>
                    {!showResults && !isAnalyzing && (
                        <div className="disabled-overlay"><div className="disabled-message">
                            <p className="text-gray-700 font-medium mb-2">📄 No Document Analyzed Yet</p>
                            <p className="text-sm text-gray-600">Attach a file and click “Analyze Document” to see results here.</p>
                        </div></div>
                    )}

                    {isAnalyzing && <AnalyzingSkeleton />}

                    {!isAnalyzing && analysisResult && (
                        <ResultsView
                            result={analysisResult}
                            client={selectedClient}
                            actions={actions}
                            onToggleAction={handleToggleAction}
                            onGenerateReport={() => openAnalysisReport({
                                analysis: { ...analysisResult, suggested_actions: actions },
                                client: selectedClient,
                                onPopupBlocked: () => alert('Pop-up blocked. Allow pop-ups for this site to print as PDF.'),
                            })}
                            onCreateEstimate={handleCreateEstimate}
                            onGenerateReply={handleGenerateReply}
                            onPushToClaim={handlePushToClaim}
                            onNotifyClient={handleNotifyClient}
                            onToggleVisibility={handleToggleVisibility}
                            onReanalyze={handleReanalyze}
                            onFlag={handleFlag}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default PolicyAnalysis;
