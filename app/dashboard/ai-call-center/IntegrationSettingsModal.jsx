'use client';
import React, { useEffect, useState } from 'react';
import {
    Phone, Globe, CheckCircle2, AlertCircle, Loader2, XCircle, CircleDot,
} from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance';

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
                            <button className="ics-btn" onClick={saveRc} disabled={rcSt === 'loading'}>
                                {summary.ringcentral.configured ? 'Reconnect Phone' : 'Connect Phone'} <SI status={rcSt} />
                            </button>
                            <Banner status={rcSt} error={rcErr} />
                            {rcSubWarn && (
                                <div className="ics-err" style={{ background: '#fffbeb', borderColor: '#fcd34d', color: '#92400e' }}>
                                    ⚠️ {rcSubWarn}
                                </div>
                            )}
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
                                {summary.ctm.configured ? 'Re-sync 30-Day Data' : 'Sync 30-Day Data'} <SI status={ctmSt} />
                            </button>
                            {ctmSt === 'success' && <div className="ics-ok">{ctmCount} calls synced successfully</div>}
                            {ctmSt === 'error' && <Banner status="error" error={ctmErr} />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
