'use client'
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import "./policy-analysis.css"
import "./eta-redesign.css"  // ETA visual redesign (Claude Design import) — presentation only

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
import { createClient } from "@/lib/supabase/client";

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
    <div role="note" aria-label="Legal disclaimer" className="eta-disclaimer">
        <span className="eta-disclaimer-ic">⚠️</span>
        <div>
            <div className="eta-disclaimer-title">{LEGAL_DISCLAIMER_HEADLINE}</div>
            <div className="eta-disclaimer-body">{LEGAL_DISCLAIMER_BODY}</div>
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

// Urgency-based colours for a deadline card (redesign palette). Keeps the same
// day-threshold logic the old Tailwind tone helper used.
const etaDeadlineTone = (days) => {
    if (days == null) return { bg: '#f7f9fb', border: '#e6e9ee', text: '#3a424f', badgeBg: '#eef1f6', badgeText: '#5b6472' };
    if (days < 0) return { bg: '#fdecec', border: '#f6d0d0', text: '#2a3340', badgeBg: '#f6d0d0', badgeText: '#c0392b' };
    if (days <= 30) return { bg: '#fdf2ec', border: '#f6ddc9', text: '#2a3340', badgeBg: '#f6ddc9', badgeText: '#c0651f' };
    if (days <= 90) return { bg: '#fdf7e6', border: '#f3e5b8', text: '#2a3340', badgeBg: '#f3e5b8', badgeText: '#b7791f' };
    return { bg: '#eef8f1', border: '#dcefe2', text: '#2a3340', badgeBg: '#dcefe2', badgeText: '#177a49' };
};

// Collapsible section — mockup style (coloured header bar + caret).
const EtaSection = ({ tone, title, count, open, onToggle, children }) => (
    <div className={`eta-sec ${tone}`}>
        <div className="eta-sec-head" onClick={onToggle}>
            <span className="eta-sec-title">
                {title}
                {typeof count === 'number' && <span className="eta-sec-count">({count})</span>}
            </span>
            <span className="eta-sec-caret">{open ? '▲' : '▼'}</span>
        </div>
        {open && children}
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

    const statusClass = ['completed', 'failed', 'processing', 'pending'].includes(result.status) ? result.status : '';

    return (
        <>
            <div className="eta-results-head">
                <h2 className="eta-results-title">Policy Analysis Results</h2>
                <span className={`eta-badge-status ${statusClass}`}>{result.status}</span>
            </div>

            <div className="eta-results-grid" style={{ marginTop: 16 }}>
                {/* Main column */}
                <div className="eta-results-main">

                    {/* Document summary */}
                    <div className="eta-summary">
                        <div className="eta-summary-head">
                            <span className="eta-summary-type">
                                <span>{docIcon}</span> {docTypeLabel(result.document_type)}
                                {confidencePct != null && (
                                    <span className="eta-conf-pill">{confidencePct}% confidence</span>
                                )}
                            </span>
                            {result.file_key && (
                                <button type="button" onClick={() => setDocOpen(true)} className="eta-view-btn">
                                    ⧉ View original
                                </button>
                            )}
                        </div>
                        <div className="eta-summary-grid">
                            <div><div className="eta-sg-k">Carrier</div><div className="eta-sg-v">{result.detected_carrier || '—'}</div></div>
                            <div><div className="eta-sg-k">Claim / Policy #</div><div className="eta-sg-v">{claimNo || '—'}</div></div>
                            <div><div className="eta-sg-k">Document date</div><div className="eta-sg-v">{result.document_date || '—'}</div></div>
                            <div><div className="eta-sg-k">Critical deadlines</div><div className={`eta-sg-v ${deadlines.length ? 'danger' : ''}`}>{deadlines.length || '—'}</div></div>
                        </div>
                        {result.summary && <p className="eta-summary-text">{result.summary}</p>}
                        {result.status === 'failed' && result.error_message && (
                            <p className="eta-summary-fail">{result.error_message}</p>
                        )}
                    </div>

                    {/* Extracted Details (green) */}
                    <EtaSection tone="green" title={<><span>🧾</span> Extracted Details</>} open={open.details} onToggle={() => toggle('details')}>
                        <div className="eta-sec-body">
                            {hasDetails
                                ? <ExtractedDetails data={ed} />
                                : <p className="text-sm text-gray-500 italic">No structured data extracted.</p>}
                        </div>
                    </EtaSection>

                    {/* Critical Deadlines (red) */}
                    {deadlines.length > 0 && (
                        <EtaSection tone="red" title={<><span>⏰</span> Critical Deadlines</>} count={deadlines.length} open={open.deadlines} onToggle={() => toggle('deadlines')}>
                            <div className="eta-dl-list">
                                {deadlines.map((d, i) => {
                                    const tone = etaDeadlineTone(d.days_remaining);
                                    return (
                                        <div key={i} className="eta-dl" style={{ background: tone.bg, borderColor: tone.border }}>
                                            <div>
                                                <div className="eta-dl-title" style={{ color: tone.text }}>{d.description}</div>
                                                {d.date && <div className="eta-dl-due">Due {d.date}</div>}
                                            </div>
                                            {typeof d.days_remaining === 'number' && (
                                                <span className="eta-dl-badge" style={{ background: tone.badgeBg, color: tone.badgeText }}>
                                                    {d.days_remaining < 0 ? `${Math.abs(d.days_remaining)}d overdue` : `${d.days_remaining}d left`}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </EtaSection>
                    )}

                    {/* Suggested Actions (amber) */}
                    <EtaSection tone="amber" title={<><span>⚡</span> Suggested Actions</>} count={actionList.length || undefined} open={open.actions} onToggle={() => toggle('actions')}>
                        <div className="eta-actions-body">
                            {actionList.length === 0 ? (
                                <p className="text-sm text-gray-500 italic">No suggested actions.</p>
                            ) : (
                                <>
                                    <span className="eta-actions-done">{doneCount}/{actionList.length} done</span>
                                    <div className="eta-actions-bar">
                                        <div className="eta-actions-fill" style={{ width: `${actionPct}%` }} />
                                    </div>
                                    <div className="eta-action-list">
                                        {actionList.map((a, i) => (
                                            <div key={i} className={`eta-action ${a.done ? 'done' : ''}`} onClick={() => onToggleAction(i)}>
                                                <span className="eta-action-box">{a.done ? '✓' : ''}</span>
                                                <div>
                                                    <div className="eta-action-title">{a.title}</div>
                                                    {a.detail && <div className="eta-action-desc">{a.detail}</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </EtaSection>
                </div>

                {/* Sidebar */}
                <div className="eta-sidebar">
                    <div className="eta-qa">
                        <div className="eta-qa-title">Quick Actions</div>
                        <div className="eta-qa-list">
                            <button type="button" onClick={onGenerateReport} disabled={!completed} className="eta-qa-btn primary">
                                Generate Report
                            </button>
                            <button type="button" onClick={onCreateEstimate} disabled={!completed || !client?.id} className="eta-qa-btn">
                                Create Estimate
                            </button>
                            {isReplyType && (
                                <button type="button" onClick={onGenerateReply} disabled={!completed} className="eta-qa-btn">
                                    Generate Reply →
                                </button>
                            )}
                            <button type="button" onClick={onPushToClaim} disabled={!completed || !client?.id} className="eta-qa-btn">
                                Push to Claim
                            </button>
                            <button type="button" onClick={onNotifyClient} disabled={!completed || !client?.id} className="eta-qa-btn">
                                Share with Client
                            </button>

                            <label className="eta-qa-toggle">
                                Visible in client portal
                                <input type="checkbox" checked={!!result.is_visible_in_portal} onChange={(e) => onToggleVisibility(e.target.checked)} />
                            </label>

                            <button type="button" onClick={onReanalyze} className="eta-qa-btn">
                                Re-analyze
                            </button>
                            <button type="button" onClick={onFlag} className={`eta-qa-btn ${result.flagged_for_review ? 'flagged' : ''}`}>
                                {result.flagged_for_review ? '🚩 Flagged for review' : 'Looks wrong? Flag for review'}
                            </button>
                        </div>
                    </div>

                    {confidencePct != null && (
                        <div className="eta-conf">
                            <div className="eta-conf-k">AI Confidence</div>
                            <div className="eta-conf-v">{confidencePct}%</div>
                            <div className="eta-conf-note">How sure Claude is about this extraction</div>
                        </div>
                    )}

                    <div className="eta-foot">
                        {result.ai_model && <div className="eta-foot-model">{result.ai_provider} · {result.ai_model}</div>}
                        <strong>Disclaimer:</strong> {LEGAL_DISCLAIMER_SHORT}
                    </div>
                </div>
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
        </>
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

    // Contractor company branding for the printable report header (name + logo).
    // logo is stored as an S3 key; we fetch it as a blob and inline it as a
    // data: URI so it survives into the print popup window.
    const [company, setCompany] = useState({ name: '', logo: null });

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user || cancelled) return;
                const res = await axiosInstance.get(`/profile/${user.id}`, { suppressErrorToast: true });
                if (cancelled) return;
                const p = res.data ?? {};
                let logo = null;
                if (p.business_logo) {
                    try {
                        const imgRes = await axiosInstance.get(
                            `/s3/file?key=${encodeURIComponent(p.business_logo)}`,
                            { responseType: 'blob', suppressErrorToast: true },
                        );
                        logo = await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.onerror = reject;
                            reader.readAsDataURL(imgRes.data);
                        });
                    } catch { /* missing logo — fall back to name only */ }
                }
                if (!cancelled) setCompany({ name: p.business_name || '', logo });
            } catch { /* non-fatal — report falls back to ClaimKing.AI branding */ }
        })();
        return () => { cancelled = true; };
    }, []);

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
        <div className="policy-analysis">
            <div className="eta-shell">

                {/* Hero */}
                <div className="eta-card eta-hero">
                    <span className="eta-badge">⚡ Policy Analysis</span>
                    <h1 className="eta-hero-title">Decode any insurance doc <span className="accent">in one read</span></h1>
                    <p className="eta-hero-sub">
                        Upload a policy, denial, claim acknowledgment, adjuster estimate, scope, or carrier email — Claude detects the document type automatically, extracts the key data, flags critical deadlines, and suggests next steps.
                    </p>
                    <div className="eta-stats">
                        <div className="eta-stat">
                            <span className={`eta-stat-ic ${aiReady ? 'ok' : 'warn'}`}>{aiReady ? '✓' : '!'}</span>
                            <div className="eta-stat-txt">
                                <div className="eta-stat-k">AI Status</div>
                                <div className="eta-stat-v">{featureDisabledByAdmin ? 'Disabled' : insufficientCredits ? 'Low credits' : 'Ready'}</div>
                            </div>
                        </div>
                        {creditsKnown && (
                            <div className="eta-stat">
                                <span className={`eta-stat-ic ${insufficientCredits ? 'warn' : 'gold'}`}>◈</span>
                                <div className="eta-stat-txt">
                                    <div className="eta-stat-k">Credits</div>
                                    <div className="eta-stat-v">{totalCredits.toLocaleString()}{requiredCredits > 0 && <span className="eta-stat-sub"> · {requiredCredits}/run</span>}</div>
                                </div>
                            </div>
                        )}
                        <Link href="/dashboard/policy-analysis/history" className="eta-stat" title="View past analyses">
                            <span className="eta-stat-ic neutral">🕘</span>
                            <div className="eta-stat-txt">
                                <div className="eta-stat-k">History</div>
                                <div className="eta-stat-v">{historyCount}<span className="eta-stat-sub"> analyses</span></div>
                            </div>
                        </Link>
                    </div>
                </div>

                <LegalDisclaimerBanner />

                {/* Stepper */}
                <div className="eta-card eta-stepper">
                    <div className="eta-stepper-track">
                        <div className="eta-stepper-line" />
                        <div className="eta-stepper-fill" style={{ width: `${progressWidth * 0.84}%` }} />
                        {[
                            { n: 1, label: 'Select Client' },
                            { n: 2, label: 'Upload Document' },
                            { n: 3, label: 'Auto-Analyze' },
                            { n: 4, label: 'View Results' },
                        ].map((s) => (
                            <div key={s.n} className={`eta-step ${currentStep > s.n ? 'done' : ''} ${currentStep === s.n ? 'current' : ''}`}>
                                <span className="eta-step-dot">{s.n}</span>
                                <span className="eta-step-label">{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div id="client-section-anchor">
                    <ClientSelector client={selectedClient} onChange={handleClientChange} scrollId="client-section" />
                </div>

                {/* Upload */}
                <div id="upload-section" className={`eta-card eta-upload ${selectedClient ? '' : 'disabled-section'}`}>
                    {!selectedClient && (
                        <div className="disabled-overlay"><div className="disabled-message">
                            <p className="text-gray-700 font-medium">Please select a client first</p>
                        </div></div>
                    )}
                    <h2 className="eta-h2">Step 2: Upload Document</h2>
                    <p className="eta-sub">Drop any insurance document — Claude figures out what it is. No need to pick a type.</p>

                    <div className="eta-upload-grid">
                        <div>
                            <FileUploader label='Drag & drop an insurance document here' files={files} setFiles={setFiles} allowedExtensions={['.pdf', '.jpg', '.png', '.doc', '.docx']} maxSizeMB={50} />
                        </div>
                        <div className="eta-detect">
                            <div className="eta-detect-title">Auto-detects:</div>
                            <ul>
                                <li>Homeowner's Policy (HO-3)</li>
                                <li>Claim Acknowledgment</li>
                                <li>Denial Letter</li>
                                <li>Adjuster's Estimate (Xactimate)</li>
                                <li>Scope of Work</li>
                                <li>Carrier Email Thread</li>
                            </ul>
                        </div>
                    </div>

                    <div className="eta-analyze-wrap">
                        <button id="analyze-button" onClick={handleAnalyze} disabled={files.length === 0 || isAnalyzing} className="eta-btn-primary">
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
                        <p className="eta-analyze-hint">Analysis typically takes 30–60 seconds</p>
                        {analyzeError && <div className="eta-error">{analyzeError}</div>}
                    </div>
                </div>

                {(showResults || isAnalyzing) && (
                <div id="results-section">
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
                                company,
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
                )}
            </div>
        </div>
    );
};

export default PolicyAnalysis;
