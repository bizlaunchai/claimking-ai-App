'use client';
import React, { useEffect, useState } from 'react';
import {
    Phone, Globe, CheckCircle2, AlertCircle, Loader2, XCircle, CircleDot, History,
} from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance';
import AgentMappingSection from './AgentMappingSection';

/**
 * IntegrationSettingsModal — RingCentral + Call Tracking Metrics setup.
 *
 * Used to live at `/dashboard/api-settings` (now removed). Surfaced from the
 * AI Call Center page via a "Settings" button, since these credentials feed
 * exactly that page's data.
 */

const styles = `
  .ics-root * { box-sizing: border-box; }
  .ics-root .mono { font-family: 'JetBrains Mono', monospace; }
  .ics-input { width: 100%; background: #f9fafb; border: 1.5px solid #e5e7eb; border-radius: 8px;
    padding: 10px 12px; font-size: 14px; color: #111827; outline: none; transition: all 0.15s; }
  .ics-input:focus { border-color: #6366f1; background: #fff; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
  .ics-input.mono { font-family: 'JetBrains Mono', monospace; font-size: 13px; }
  .ics-lbl { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #6b7280; display: block; margin-bottom: 5px; }
  .ics-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 10px 18px; border-radius: 8px; font-size: 14px; font-weight: 600;
    cursor: pointer; border: none; transition: all 0.15s; white-space: nowrap;
    background: #ea580c; color: #fff; }
  .ics-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .ics-ok, .ics-err { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-top: 12px; }
  .ics-ok { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
  .ics-err { background: #fff1f2; border: 1px solid #fecdd3; color: #be123c; }
  .ics-grid { display: grid; grid-template-columns: 1fr 1px 1fr; gap: 32px; }
  @media (max-width: 768px) { .ics-grid { grid-template-columns: 1fr; } .ics-divider { display: none; } }
  .ics-divider { width: 1px; background: #f3f4f6; align-self: stretch; }
  .ics-provider { font-size: 14px; font-weight: 600; color: #1f2937;
    display: flex; align-items: center; gap: 8px;
    border-bottom: 1px solid #f3f4f6; padding-bottom: 10px; }
  .ics-pill { display: inline-flex; align-items: center; gap: 5px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
    padding: 4px 10px; border-radius: 999px; border: 1px solid transparent; }
  .ics-pill.connected { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
  .ics-pill.pending { background: #f3f4f6; color: #6b7280; border-color: #e5e7eb; }
  @keyframes ics-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
`;

const DEFAULTS = {
    awsS3:       { configured: false },
    ringcentral: { configured: false, connectionStatus: null },
    ctm:         { configured: false, connectionStatus: null },
};

const SI = ({ status, size = 14 }) => {
    if (status === 'loading') return <Loader2 size={size} style={{ animation: 'ics-spin 1s linear infinite' }} />;
    if (status === 'success') return <CheckCircle2 size={size} />;
    if (status === 'error')   return <XCircle size={size} />;
    return null;
};

const extractError = (e) => e?.userMessage || e?.response?.data?.message || e?.message || 'Something went wrong';

const Banner = ({ status, error }) => {
    if (!status || status === 'loading') return null;
    if (status === 'success') return <div className="ics-ok"><CheckCircle2 size={14} />Connected successfully</div>;
    return <div className="ics-err"><XCircle size={14} />{error || 'Connection failed'}</div>;
};

const F = ({ label, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {label && <span className="ics-lbl">{label}</span>}
        {children}
    </div>
);

const StatusBadge = ({ configured, loading }) => {
    if (loading) return <span className="ics-pill pending"><Loader2 size={10} style={{ animation: 'ics-spin 1s linear infinite' }} /> Checking</span>;
    if (configured) return <span className="ics-pill connected"><CheckCircle2 size={10} /> Connected</span>;
    return <span className="ics-pill pending"><CircleDot size={10} /> Not configured</span>;
};

const secretPlaceholder = (configured, fallback) =>
    configured ? '•••••••• Saved — enter new value to replace' : fallback;

export default function IntegrationSettingsModal({ open, onClose }) {
    const [summary, setSummary] = useState(DEFAULTS);
    const [summaryLoading, setSummaryLoading] = useState(true);

    // RingCentral
    const [rcId, setRcId] = useState('');
    const [rcSecret, setRcSecret] = useState('');
    const [rcJwt, setRcJwt] = useState('');
    const [rcSt, setRcSt] = useState(null);
    const [rcErr, setRcErr] = useState('');
    const [rcSubWarn, setRcSubWarn] = useState(null);
    const [rcTestSt, setRcTestSt] = useState(null); // null | 'loading' | 'ok' | 'fail'
    const [rcTest, setRcTest] = useState(null);      // result payload

    // CTM
    const [ctmKey, setCtmKey] = useState('');
    const [ctmSecret, setCtmSecret] = useState('');
    const [ctmAccount, setCtmAccount] = useState('');
    const [ctmSt, setCtmSt] = useState(null);
    const [ctmErr, setCtmErr] = useState('');
    const [ctmCount, setCtmCount] = useState(null);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setSummaryLoading(true);
        (async () => {
            try {
                const { data } = await axiosInstance.get('/integrations');
                if (cancelled) return;
                setSummary({ ...DEFAULTS, ...data });
            } catch {
                /* silent — page still works for save */
            } finally {
                if (!cancelled) setSummaryLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [open]);

    const markConfigured = (key) =>
        setSummary((prev) => ({ ...prev, [key]: { ...prev[key], configured: true } }));

    const saveRc = async () => {
        if (!rcId || !rcSecret || !rcJwt) { toast.error('Fill all fields'); return; }
        setRcSt('loading'); setRcErr(''); setRcSubWarn(null);
        try {
            const res = await axiosInstance.post('/ringcentral-save', {
                clientId: rcId, clientSecret: rcSecret, jwtToken: rcJwt,
            });
            setRcSt('success');
            markConfigured('ringcentral');
            if (res.data?.subscription === false) {
                setRcSubWarn(res.data?.subscriptionError || 'Webhook subscription failed.');
                toast.warning('Credentials saved, but webhook not active');
            } else {
                toast.success('RingCentral connected');
            }
        } catch (e) {
            const msg = extractError(e);
            setRcSt('error'); setRcErr(msg); toast.error(msg);
        }
    };

    const testRc = async () => {
        setRcTestSt('loading'); setRcTest(null);
        try {
            const { data } = await axiosInstance.post('/ringcentral-test', {});
            if (data?.ok) { setRcTestSt('ok'); setRcTest(data); }
            else { setRcTestSt('fail'); setRcTest(data); }
        } catch (e) {
            setRcTestSt('fail'); setRcTest({ error: extractError(e) });
        }
    };

    const saveCtm = async () => {
        if (!ctmKey || !ctmSecret || !ctmAccount) { toast.error('Fill all fields'); return; }
        setCtmSt('loading'); setCtmErr('');
        try {
            const res = await axiosInstance.post('/ctm-save', {
                apiKey: ctmKey, apiSecret: ctmSecret, accountId: ctmAccount,
            });
            setCtmSt('success');
            setCtmCount(res.data?.importedCount ?? 0);
            markConfigured('ctm');
            toast.success('Call Tracking Metrics connected');
        } catch (e) {
            setCtmSt('error'); setCtmErr(extractError(e));
        }
    };

    if (!open) return null;
    const s3Ready = summary.awsS3?.configured;
    const bothConnected = summary.ringcentral.configured && summary.ctm.configured;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <style>{styles}</style>
            <div
                className="ics-root bg-white rounded-xl w-full max-w-[860px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center px-6 py-5 border-b border-gray-200">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fff7ed',
                            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Phone size={16} color="#ea580c" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800" style={{ margin: 0 }}>
                                Communications &amp; Call Tracking
                            </h2>
                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                                Connect RingCentral and CTM to log calls in this dashboard.
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <StatusBadge loading={summaryLoading} configured={bothConnected} />
                        <button
                            className="w-8 h-8 border-0 bg-transparent cursor-pointer text-2xl text-gray-500 flex items-center justify-center hover:bg-gray-100 rounded-md"
                            onClick={onClose}
                        >×</button>
                    </div>
                </div>

                <div className="p-6">
                    {!summaryLoading && !s3Ready && (
                        <div className="ics-err" style={{ background: '#fffbeb', borderColor: '#fcd34d', color: '#92400e', marginTop: 0, marginBottom: 16 }}>
                            <AlertCircle size={14} />
                            Your administrator hasn't configured shared AWS S3 storage yet — once they do, you can connect RingCentral / CTM here.
                        </div>
                    )}
                    <div className="ics-grid" style={{
                        opacity: !summaryLoading && !s3Ready ? 0.55 : 1,
                        pointerEvents: !summaryLoading && !s3Ready ? 'none' : 'auto',
                    }}>
                        {/* RingCentral */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div className="ics-provider">
                                <Phone size={16} color="#ea580c" /> RingCentral
                            </div>
                            {summary.ringcentral.configured && summary.ringcentral.connectionStatus && summary.ringcentral.connectionStatus !== 'connected' && (
                                <div className="ics-err" style={{ background: '#fffbeb', borderColor: '#fcd34d', color: '#92400e', marginTop: 0 }}>
                                    <AlertCircle size={14} />
                                    {summary.ringcentral.connectionStatus === 'subscription_error'
                                        ? 'Webhook subscription expired or failed to renew. Reconnect to restore real-time call events.'
                                        : `Connection status: ${summary.ringcentral.connectionStatus}. Reconnect recommended.`}
                                </div>
                            )}
                            <F label="Client ID">
                                <input className="ics-input" placeholder={secretPlaceholder(summary.ringcentral.configured, 'Enter ID')}
                                    value={rcId} onChange={(e) => setRcId(e.target.value)} />
                            </F>
                            <F label="Client Secret">
                                <input className="ics-input mono" type="password"
                                    placeholder={secretPlaceholder(summary.ringcentral.configured, 'Enter Secret')}
                                    value={rcSecret} onChange={(e) => setRcSecret(e.target.value)} />
                            </F>
                            <F label="JWT Token">
                                <textarea className="ics-input mono"
                                    placeholder={secretPlaceholder(summary.ringcentral.configured, 'Paste JWT...')}
                                    value={rcJwt} onChange={(e) => setRcJwt(e.target.value)}
                                    style={{ minHeight: 80, resize: 'none' }} />
                            </F>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button className="ics-btn" onClick={saveRc} disabled={rcSt === 'loading'}>
                                    {summary.ringcentral.configured ? 'Reconnect Phone' : 'Connect Phone'} <SI status={rcSt} />
                                </button>
                                {summary.ringcentral.configured && (
                                    <button className="ics-btn" onClick={testRc} disabled={rcTestSt === 'loading'}
                                        style={{ background: '#fff', color: '#ea580c', border: '1.5px solid #fed7aa' }}>
                                        {rcTestSt === 'loading' ? <Loader2 size={14} className="ics-spin" /> : <CheckCircle2 size={14} />} Test Connection
                                    </button>
                                )}
                            </div>
                            <Banner status={rcSt} error={rcErr} />
                            {rcTestSt === 'ok' && rcTest && (
                                <div className="ics-ok" style={{ display: 'block' }}>
                                    ✓ Connected to <strong>{rcTest.account_name}</strong>
                                    {rcTest.main_number ? ` (${rcTest.main_number})` : ''}
                                    {typeof rcTest.extension_count === 'number' ? ` · ${rcTest.extension_count} extensions` : ''}
                                    <div style={{ fontSize: 11, marginTop: 4, opacity: 0.85 }}>
                                        {rcTest.subscription_active
                                            ? 'Real-time call events are active — new calls will appear with who answered.'
                                            : '⚠️ Webhook subscription is not active yet — Reconnect to enable live call events.'}
                                    </div>
                                </div>
                            )}
                            {rcTestSt === 'fail' && (
                                <div className="ics-err">
                                    <AlertCircle size={14} /> {rcTest?.error || 'Connection test failed.'}
                                </div>
                            )}
                            {rcSubWarn && (
                                <div className="ics-err" style={{ background: '#fffbeb', borderColor: '#fcd34d', color: '#92400e' }}>
                                    ⚠️ {rcSubWarn}
                                </div>
                            )}
                            <a href="/RINGCENTRAL-SETUP-GUIDE.html" target="_blank" rel="noreferrer"
                                style={{ fontSize: 12, color: '#ea580c', fontWeight: 600, textDecoration: 'none' }}>
                                📄 RingCentral setup guide — step by step
                            </a>
                        </div>

                        <div className="ics-divider" />

                        {/* CTM */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div className="ics-provider">
                                <Globe size={16} color="#ea580c" /> Call Tracking Metrics
                            </div>
                            {summary.ctm.configured && summary.ctm.connectionStatus && summary.ctm.connectionStatus !== 'connected' && (
                                <div className="ics-err" style={{ background: '#fffbeb', borderColor: '#fcd34d', color: '#92400e', marginTop: 0 }}>
                                    <AlertCircle size={14} />
                                    Connection status: {summary.ctm.connectionStatus}. Reconnect recommended.
                                </div>
                            )}
                            <F label="Account ID">
                                <input className="ics-input" placeholder={secretPlaceholder(summary.ctm.configured, 'ID')}
                                    value={ctmAccount} onChange={(e) => setCtmAccount(e.target.value)} />
                            </F>
                            <F label="API Key">
                                <input className="ics-input" placeholder={secretPlaceholder(summary.ctm.configured, 'Key')}
                                    value={ctmKey} onChange={(e) => setCtmKey(e.target.value)} />
                            </F>
                            <F label="API Secret">
                                <input className="ics-input mono" type="password"
                                    placeholder={secretPlaceholder(summary.ctm.configured, 'Secret')}
                                    value={ctmSecret} onChange={(e) => setCtmSecret(e.target.value)} />
                            </F>
                            <button className="ics-btn" onClick={saveCtm} disabled={ctmSt === 'loading'}>
                                {summary.ctm.configured ? 'Reconnect & sync recent' : 'Connect & sync recent'} <SI status={ctmSt} />
                            </button>
                            {ctmSt === 'success' && <div className="ics-ok">{ctmCount} recent calls synced</div>}
                            {ctmSt === 'error' && <Banner status="error" error={ctmErr} />}

                            {/* Q5.1 — resumable historical import (runs in the background) */}
                            {summary.ctm.configured && <CtmHistoricalSync />}
                            {/* §5.3 — sync health + calls-per-month spot-check */}
                            {summary.ctm.configured && <SyncHealthPanel />}
                        </div>
                    </div>

                    {/* Answered By — extension → employee mapping (task 4.3) */}
                    <AgentMappingSection open={open} />
                </div>
            </div>
        </div>
    );
}

/**
 * §5.3 — Sync health panel + calls-per-month spot-check. Read-only; helps Nate
 * confirm the CTM import is healthy and eyeball totals vs CTM's own dashboard.
 */
function SyncHealthPanel() {
    const [health, setHealth] = useState(null);
    const [monthly, setMonthly] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = React.useCallback(async () => {
        try {
            const [h, m] = await Promise.all([
                axiosInstance.get('/ctm-sync/health', { suppressErrorToast: true }),
                axiosInstance.get('/ctm-sync/monthly', { suppressErrorToast: true }),
            ]);
            setHealth(h.data?.data || null);
            setMonthly(m.data?.data || []);
        } catch { /* leave nulls */ }
    }, []);
    useEffect(() => { load(); }, [load]);

    const retry = async () => {
        setBusy(true);
        try { await axiosInstance.post('/ctm-sync/start', { range: 'all' }); await load(); }
        catch { /* interceptor toasts */ } finally { setBusy(false); }
    };

    const job = health?.last_job;
    const maxCount = Math.max(1, ...(monthly || []).map((r) => r.count));
    const fmt = (d) => (d ? new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');

    return (
        <div className="ics-health">
            <div className="ics-health-head">Sync health</div>
            <div className="ics-health-grid">
                <div><span className="ics-hl">Last import</span><span className="ics-hv">{job ? fmt(job.finished_at || job.created_at) : '—'}</span></div>
                <div><span className="ics-hl">Imported today</span><span className="ics-hv">{health?.imported_today ?? 0}</span></div>
                <div><span className="ics-hl">Total imported</span><span className="ics-hv">{health?.total_imported ?? 0}</span></div>
                <div><span className="ics-hl">Last job</span><span className={`ics-hv ics-st-${job?.status || 'none'}`}>{job?.status || 'none'}</span></div>
            </div>
            {job?.status === 'failed' && (
                <div className="ics-health-fail">
                    <span>⚠ Last import failed{job.last_error ? `: ${job.last_error}` : ''}</span>
                    <button className="ics-btn sm" onClick={retry} disabled={busy}>{busy ? <><span className="ck-spinner sm ck-btn-spin" />Retrying…</> : 'Retry'}</button>
                </div>
            )}
            <div className="ics-health-head" style={{ marginTop: 14 }}>Calls per month <span className="ics-hl">(CTM — vs CTM dashboard)</span></div>
            {monthly === null ? <div className="ics-hl ck-load-inline"><span className="ck-spinner sm" />Loading…</div>
                : !monthly.length ? <div className="ics-hl">No CTM calls in the last 12 months.</div>
                    : (
                        <div className="ics-months">
                            {monthly.map((r) => (
                                <div key={r.month} className="ics-mrow">
                                    <span className="ics-mlabel">{r.month}</span>
                                    <span className="ics-mbar"><span style={{ width: `${(r.count / maxCount) * 100}%` }} /></span>
                                    <span className="ics-mcount">{r.count}</span>
                                </div>
                            ))}
                        </div>
                    )}
            <style jsx>{`
                .ics-health { margin-top: 14px; border-top: 1px solid #eef0f4; padding-top: 12px; }
                .ics-health-head { font-size: .8rem; font-weight: 800; color: #1a1f3a; margin-bottom: 8px; }
                .ics-health-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
                .ics-health-grid > div { background: #f8fafc; border: 1px solid #eef0f4; border-radius: 8px; padding: 7px 10px; display: flex; flex-direction: column; gap: 2px; }
                .ics-hl { font-size: .68rem; color: #6b7280; font-weight: 600; }
                .ics-hv { font-size: .9rem; font-weight: 800; color: #1a1f3a; }
                .ics-st-failed { color: #dc2626; } .ics-st-done { color: #16a34a; } .ics-st-running { color: #d97706; }
                .ics-health-fail { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 8px; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; border-radius: 8px; padding: 7px 10px; font-size: .78rem; }
                .ics-months { display: flex; flex-direction: column; gap: 4px; max-height: 210px; overflow: auto; }
                .ics-mrow { display: grid; grid-template-columns: 58px 1fr 46px; align-items: center; gap: 8px; }
                .ics-mlabel { font-size: .72rem; color: #6b7280; font-variant-numeric: tabular-nums; }
                .ics-mbar { background: #eef0f4; border-radius: 999px; height: 10px; overflow: hidden; }
                .ics-mbar > span { display: block; height: 100%; background: linear-gradient(90deg, #FDB813, #d4a000); border-radius: 999px; }
                .ics-mcount { font-size: .74rem; font-weight: 700; color: #1a1f3a; text-align: right; font-variant-numeric: tabular-nums; }
                .ics-btn.sm { padding: 4px 10px; font-size: .74rem; }
            `}</style>
        </div>
    );
}

/**
 * Q5.1 — Historical CTM import. Runs as a background job the user can leave and
 * come back to. Polls /ctm-sync/status; shows live progress, imported/skipped
 * counts, and resumes automatically after a hiccup (the backend cron continues
 * the same job — re-running never duplicates calls).
 */
const RANGES = [
    { key: '30', label: 'Last 30 days' },
    { key: '90', label: 'Last 90 days' },
    { key: '365', label: 'Last year' },
    { key: 'all', label: 'All history' },
];

function CtmHistoricalSync() {
    const [job, setJob] = useState(null);
    const [range, setRange] = useState('all');
    const [starting, setStarting] = useState(false);
    const running = job?.status === 'running';

    const fetchStatus = React.useCallback(async () => {
        try {
            const { data } = await axiosInstance.get('/ctm-sync/status', { suppressErrorToast: true });
            setJob(data?.data ?? null);
            return data?.data ?? null;
        } catch { return null; }
    }, []);

    // Initial load + poll while running (so leaving and returning shows state).
    useEffect(() => { fetchStatus(); }, [fetchStatus]);
    useEffect(() => {
        if (!running) return;
        const t = setInterval(fetchStatus, 2500);
        return () => clearInterval(t);
    }, [running, fetchStatus]);

    const start = async () => {
        setStarting(true);
        try {
            const { data } = await axiosInstance.post('/ctm-sync/start', { range });
            setJob(data?.data ?? null);
            toast.success(data?.already_running ? 'Import already running' : 'Import started — you can leave this page');
            fetchStatus();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Could not start import');
        } finally { setStarting(false); }
    };

    const cancel = async () => {
        if (!job?.id) return;
        try {
            await axiosInstance.post(`/ctm-sync/${job.id}/cancel`);
            toast('Import canceled');
            fetchStatus();
        } catch { /* */ }
    };

    const pct = job?.percent;
    const done = job?.status === 'done';
    const failed = job?.status === 'failed';

    return (
        <div style={{ marginTop: 14, padding: 14, borderRadius: 10, border: '1.5px solid #fed7aa', background: '#fff7ed' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#9a3412' }}>
                <History size={15} /> Historical import
            </div>
            <div style={{ fontSize: 12, color: '#9a3412', opacity: 0.85, margin: '4px 0 12px' }}>
                Import older calls in the background. You can close this and come back — a hiccup resumes where it left off, and re-running never duplicates calls.
            </div>

            {!running && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <select className="ics-input" style={{ maxWidth: 200 }} value={range} onChange={(e) => setRange(e.target.value)} disabled={starting}>
                        {RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                    </select>
                    <button className="ics-btn" onClick={start} disabled={starting}>
                        {starting ? <Loader2 size={14} className="ics-spin" /> : <History size={14} />}
                        {failed ? 'Retry import' : 'Start import'}
                    </button>
                </div>
            )}

            {running && (
                <div>
                    <div style={{ height: 10, borderRadius: 999, background: '#fde4cd', overflow: 'hidden', position: 'relative' }}>
                        <div style={{
                            height: '100%', borderRadius: 999, background: '#ea580c',
                            width: pct != null ? `${pct}%` : '35%',
                            transition: 'width 0.5s ease',
                            animation: pct == null ? 'ics-indet 1.2s ease-in-out infinite' : 'none',
                        }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 12, color: '#9a3412' }}>
                        <span>
                            Imported <strong>{job.imported}</strong>
                            {job.total_estimate ? ` of ~${job.total_estimate}` : ''}
                            {job.skipped ? ` · ${job.skipped} already had` : ''}
                        </span>
                        <button onClick={cancel} style={{ background: 'none', border: 'none', color: '#b91c1c', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                    </div>
                    {job.last_error && <div style={{ fontSize: 11, color: '#b45309', marginTop: 4 }}>Reconnecting… ({job.last_error})</div>}
                </div>
            )}

            {done && (
                <div className="ics-ok" style={{ marginTop: 4 }}>
                    ✓ Import complete — {job.imported} imported{job.skipped ? `, ${job.skipped} already on file` : ''}
                    {job.recordings_missing ? ` · ${job.recordings_missing} calls had no recording in CTM` : ''}
                </div>
            )}
            {failed && (
                <div className="ics-err" style={{ marginTop: 8 }}>
                    <AlertCircle size={14} /> Import stopped: {job.last_error || 'unknown error'}. {job.imported > 0 ? `${job.imported} calls were imported before it stopped — ` : ''}Retry to continue.
                </div>
            )}

            <style>{`@keyframes ics-indet { 0%{transform:translateX(-30%)} 50%{transform:translateX(180%)} 100%{transform:translateX(280%)} } .ics-spin{animation:spin 1s linear infinite}`}</style>
        </div>
    );
}
