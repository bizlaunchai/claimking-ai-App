'use client';
import React, { useEffect, useState } from 'react';
import {
    Phone, Mail, CloudRain, Globe,
    CheckCircle2, AlertCircle, Loader2, XCircle, CircleDot, Zap, Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '../../../lib/axiosInstance.js';

/**
 * User API Settings — per-user integrations only.
 *
 * Shared AI credentials (OpenAI / Gemini / Claude / Replicate / AWS S3) are
 * now configured by an admin under /dashboard/admin/api-settings and are
 * not visible to regular users.
 */

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  .int-root * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }
  .int-root .mono { font-family: 'JetBrains Mono', monospace; }
  .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03); }
  .card-head { display: flex; align-items: center; gap: 12px; padding: 14px 22px;
    border-bottom: 1px solid #f3f4f6; background: #fafafa; }
  .accent { width: 3px; height: 28px; border-radius: 2px; flex-shrink: 0; }
  .icon-wrap { width: 32px; height: 32px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .input { width: 100%; background: #f9fafb; border: 1.5px solid #e5e7eb; border-radius: 8px;
    padding: 10px 12px; font-size: 14px; color: #111827; outline: none; transition: all 0.15s; }
  .input:focus { border-color: #6366f1; background: #fff; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
  .input.mono { font-family: 'JetBrains Mono', monospace; font-size: 13px; }
  .lbl { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #6b7280; display: block; margin-bottom: 5px; }
  .hint { font-size: 12px; color: #9ca3af; margin-bottom: 7px; line-height: 1.5; }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 10px 18px; border-radius: 8px; font-size: 14px; font-weight: 600;
    cursor: pointer; border: none; transition: all 0.15s; white-space: nowrap; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-orange { background: #ea580c; color: #fff; }
  .btn-teal { background: #0d9488; color: #fff; }
  .ok, .err { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-top: 12px; }
  .ok { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
  .err { background: #fff1f2; border: 1px solid #fecdd3; color: #be123c; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1px 1fr; gap: 32px; }
  .grid-simple { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 768px) { .grid-2, .grid-simple { grid-template-columns: 1fr; } .divider-v { display: none; } }
  .divider-v { width: 1px; background: #f3f4f6; align-self: stretch; }
  .provider-name { font-size: 14px; font-weight: 600; color: #1f2937; }
  .status-pill { display: inline-flex; align-items: center; gap: 5px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
    padding: 4px 10px; border-radius: 999px; border: 1px solid transparent; }
  .status-pill.connected { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
  .status-pill.pending { background: #f3f4f6; color: #6b7280; border-color: #e5e7eb; }
`;

const DEFAULTS = {
    awsS3:       { configured: false },
    ringcentral: { configured: false, connectionStatus: null },
    ctm:         { configured: false, connectionStatus: null },
    weather:     { configured: false, serviceAreaZips: null, alertRadiusMiles: null },
    gmail:       { configured: false, emailAddress: null },
    outlook:     { configured: false, emailAddress: null },
};

const SI = ({ status, size = 14 }) => {
    if (status === 'loading') return <Loader2 size={size} style={{ animation: 'spin 1s linear infinite' }} />;
    if (status === 'success') return <CheckCircle2 size={size} />;
    if (status === 'error')   return <XCircle size={size} />;
    return null;
};

const extractError = (e) => e?.userMessage || e?.response?.data?.message || e?.message || 'Something went wrong';

const Banner = ({ status, error }) => {
    if (!status || status === 'loading') return null;
    if (status === 'success') return <div className="ok"><CheckCircle2 size={14} />Connected successfully</div>;
    return <div className="err"><XCircle size={14} />{error || 'Error connection failed'}</div>;
};

const F = ({ label, hint, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {label && <span className="lbl">{label}</span>}
        {hint && <span className="hint">{hint}</span>}
        {children}
    </div>
);

const StatusBadge = ({ configured, loading }) => {
    if (loading) return <span className="status-pill pending"><Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> Checking</span>;
    if (configured) return <span className="status-pill connected"><CheckCircle2 size={10} /> Connected</span>;
    return <span className="status-pill pending"><CircleDot size={10} /> Not configured</span>;
};

const Card = ({ accent, iconBg, icon: Icon, title, badge, children }) => (
    <div className="card">
        <div className="card-head">
            <div className="accent" style={{ background: accent }} />
            <div className="icon-wrap" style={{ background: iconBg }}>
                <Icon size={16} style={{ color: accent }} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#111827', flex: 1 }}>{title}</span>
            {badge}
        </div>
        <div style={{ padding: '24px 32px' }}>{children}</div>
    </div>
);

const secretPlaceholder = (configured, fallback) =>
    configured ? '•••••••• Saved — enter new value to replace' : fallback;

export default function IntegrationPage() {
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

    // Weather
    const [wZips, setWZips] = useState('');
    const [wRadius, setWRadius] = useState('25');
    const [wSt, setWSt] = useState(null);
    const [wErr, setWErr] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data } = await axiosInstance.get('/integrations');
                if (cancelled) return;
                setSummary({ ...DEFAULTS, ...data });
                if (data?.weather?.serviceAreaZips) setWZips(data.weather.serviceAreaZips);
                if (data?.weather?.alertRadiusMiles) setWRadius(String(data.weather.alertRadiusMiles));
            } catch {
                /* silent — page still works for save */
            } finally {
                if (!cancelled) setSummaryLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const markConfigured = (key) =>
        setSummary((prev) => ({ ...prev, [key]: { ...prev[key], configured: true } }));

    const saveWeather = async () => {
        if (!wZips?.trim()) { toast.error('Enter at least one ZIP'); return; }
        setWSt('loading'); setWErr('');
        try {
            await axiosInstance.post('/weather-settings-save', {
                serviceAreaZips: wZips,
                alertRadiusMiles: Number(wRadius),
            });
            setWSt('success');
            toast.success('Storm tracking updated');
            markConfigured('weather');
        } catch (e) {
            const msg = extractError(e);
            setWSt('error'); setWErr(msg); toast.error(msg);
        }
    };

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
        } catch (e) {
            setCtmSt('error'); setCtmErr(extractError(e));
        }
    };

    const s3Ready = summary.awsS3?.configured;

    return (
        <div className="int-root" style={{ minHeight: '100vh', background: '#f3f4f6', padding: '40px 20px' }}>
            <style>{styles}</style>
            <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Header */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <div style={{ width: 40, height: 40, background: '#1f2937', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Zap size={20} color="#fbbf24" />
                        </div>
                        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#111827' }}>My Integrations</h1>
                    </div>
                    <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
                        Connect the tools tied to your own account — phone systems, mailbox and storm-area preferences.
                    </p>
                </div>

                {/* Communications & Call Tracking */}
                <Card
                    accent="#ea580c" iconBg="#fff7ed" icon={Phone} title="Communications & Call Tracking"
                    badge={<StatusBadge loading={summaryLoading} configured={summary.ringcentral.configured && summary.ctm.configured} />}
                >
                    {!summaryLoading && !s3Ready && (
                        <div className="err" style={{ background: '#fffbeb', borderColor: '#fcd34d', color: '#92400e', marginBottom: 16 }}>
                            <AlertCircle size={14} />
                            Your administrator hasn't configured shared AWS S3 storage yet — once they do, you can connect RingCentral / CTM here.
                        </div>
                    )}
                    <div className="grid-2" style={{ opacity: !summaryLoading && !s3Ready ? 0.55 : 1, pointerEvents: !summaryLoading && !s3Ready ? 'none' : 'auto' }}>
                        {/* RingCentral */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div className="provider-name" style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f3f4f6', paddingBottom: 10 }}>
                                <Phone size={16} color="#ea580c" /> RingCentral
                            </div>
                            {summary.ringcentral.configured && summary.ringcentral.connectionStatus && summary.ringcentral.connectionStatus !== 'connected' && (
                                <div className="err" style={{ background: '#fffbeb', borderColor: '#fcd34d', color: '#92400e', marginTop: 0 }}>
                                    <AlertCircle size={14} />
                                    {summary.ringcentral.connectionStatus === 'subscription_error'
                                        ? 'Webhook subscription expired or failed to renew. Reconnect to restore real-time call events.'
                                        : `Connection status: ${summary.ringcentral.connectionStatus}. Reconnect recommended.`}
                                </div>
                            )}
                            <F label="Client ID">
                                <input className="input" placeholder={secretPlaceholder(summary.ringcentral.configured, 'Enter ID')}
                                    value={rcId} onChange={(e) => setRcId(e.target.value)} />
                            </F>
                            <F label="Client Secret">
                                <input className="input mono" type="password"
                                    placeholder={secretPlaceholder(summary.ringcentral.configured, 'Enter Secret')}
                                    value={rcSecret} onChange={(e) => setRcSecret(e.target.value)} />
                            </F>
                            <F label="JWT Token">
                                <textarea className="input mono"
                                    placeholder={secretPlaceholder(summary.ringcentral.configured, 'Paste JWT...')}
                                    value={rcJwt} onChange={(e) => setRcJwt(e.target.value)}
                                    style={{ minHeight: 80, resize: 'none' }} />
                            </F>
                            <button className="btn btn-orange" onClick={saveRc} disabled={rcSt === 'loading'}>
                                {summary.ringcentral.configured ? 'Reconnect Phone' : 'Connect Phone'} <SI status={rcSt} />
                            </button>
                            <Banner status={rcSt} error={rcErr} />
                            {rcSubWarn && (
                                <div className="err" style={{ background: '#fffbeb', borderColor: '#fcd34d', color: '#92400e' }}>
                                    ⚠️ {rcSubWarn}
                                </div>
                            )}
                        </div>
                        <div className="divider-v" />
                        {/* CTM */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div className="provider-name" style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f3f4f6', paddingBottom: 10 }}>
                                <Globe size={16} color="#ea580c" /> Call Tracking Metrics
                            </div>
                            {summary.ctm.configured && summary.ctm.connectionStatus && summary.ctm.connectionStatus !== 'connected' && (
                                <div className="err" style={{ background: '#fffbeb', borderColor: '#fcd34d', color: '#92400e', marginTop: 0 }}>
                                    <AlertCircle size={14} />
                                    Connection status: {summary.ctm.connectionStatus}. Reconnect recommended.
                                </div>
                            )}
                            <F label="Account ID">
                                <input className="input" placeholder={secretPlaceholder(summary.ctm.configured, 'ID')}
                                    value={ctmAccount} onChange={(e) => setCtmAccount(e.target.value)} />
                            </F>
                            <F label="API Key">
                                <input className="input" placeholder={secretPlaceholder(summary.ctm.configured, 'Key')}
                                    value={ctmKey} onChange={(e) => setCtmKey(e.target.value)} />
                            </F>
                            <F label="API Secret">
                                <input className="input mono" type="password"
                                    placeholder={secretPlaceholder(summary.ctm.configured, 'Secret')}
                                    value={ctmSecret} onChange={(e) => setCtmSecret(e.target.value)} />
                            </F>
                            <button className="btn btn-orange" onClick={saveCtm} disabled={ctmSt === 'loading'}>
                                {summary.ctm.configured ? 'Re-sync 30-Day Data' : 'Sync 30-Day Data'} <SI status={ctmSt} />
                            </button>
                            {ctmSt === 'success' && <div className="ok">{ctmCount} calls synced successfully</div>}
                            {ctmSt === 'error' && <Banner status="error" error={ctmErr} />}
                        </div>
                    </div>
                </Card>

                {/* Storm Tracking */}
                <Card
                    accent="#0891b2" iconBg="#ecfeff" icon={CloudRain} title="Storm Tracking"
                    badge={<StatusBadge loading={summaryLoading} configured={summary.weather.configured} />}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ background: '#f0f9ff', color: '#0369a1', padding: '8px 12px', borderRadius: 8, fontSize: 13,
                                      border: '1px solid #bae6fd', display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}>
                            <Globe size={14} /> NOAA Integration Active
                        </div>
                        <F label="Target ZIPs">
                            <input className="input" placeholder="77001, 77002"
                                value={wZips} onChange={(e) => setWZips(e.target.value)} />
                        </F>
                        <F label="Alert Radius">
                            <select className="input" value={wRadius} onChange={(e) => setWRadius(e.target.value)}>
                                <option value="25">25 Miles</option>
                                <option value="50">50 Miles</option>
                                <option value="100">100 Miles</option>
                            </select>
                        </F>
                        <button className="btn btn-teal" onClick={saveWeather} disabled={wSt === 'loading'}>
                            {summary.weather.configured ? 'Update Config' : 'Save Config'} <SI status={wSt} />
                        </button>
                        {wSt === 'error' && <Banner status="error" error={wErr} />}
                    </div>
                </Card>

                <div style={{ height: 40 }} />
            </div>
        </div>
    );
}
