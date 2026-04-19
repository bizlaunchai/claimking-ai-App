'use client';
import React, { useState } from 'react';
import {
    Cpu, Image as ImageIcon, Phone, Mail, CloudRain, HardDrive,
    Copy, CheckCircle2, AlertCircle, Loader2, Check, XCircle,
    Zap, Shield, Globe, Database, Key, Wifi,
} from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '../../../lib/axiosInstance.js';

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap');

  .int-root * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }
  .int-root .mono { font-family: 'JetBrains Mono', monospace; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fade-up { animation: fadeUp 0.3s ease both; }

  .card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03);
    transition: box-shadow 0.2s;
    height: 100%;
  }
  .card:hover { box-shadow: 0 2px 4px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06); }

  .card-head {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 22px;
    border-bottom: 1px solid #f3f4f6;
    background: #fafafa;
  }

  .accent { width: 3px; height: 28px; border-radius: 2px; flex-shrink: 0; }

  .icon-wrap {
    width: 32px; height: 32px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }

  .input {
    width: 100%;
    background: #f9fafb;
    border: 1.5px solid #e5e7eb;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 14px;
    color: #111827;
    outline: none;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  }
  .input:focus {
    border-color: #6366f1;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
  }
  .input.mono { font-family: 'JetBrains Mono', monospace; font-size: 13px; }

  .lbl { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #6b7280; display: block; margin-bottom: 5px; }
  .hint { font-size: 12px; color: #9ca3af; margin-bottom: 7px; line-height: 1.5; }

  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 10px 18px; border-radius: 8px;
    font-size: 14px; font-weight: 600; cursor: pointer;
    border: none; transition: all 0.15s; white-space: nowrap;
  }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-indigo  { background: #4f46e5; color: #fff; }
  .btn-indigo:hover:not(:disabled)  { background: #4338ca; }
  .btn-violet  { background: #7c3aed; color: #fff; }
  .btn-orange  { background: #ea580c; color: #fff; }
  .btn-rose    { background: #e11d48; color: #fff; }
  .btn-teal    { background: #0d9488; color: #fff; }

  .ok, .err { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-top: 12px; }
  .ok { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
  .err { background: #fff1f2; border: 1px solid #fecdd3; color: #be123c; }

  .grid-2 { display: grid; grid-template-columns: 1fr 1px 1fr; gap: 32px; }
  .grid-simple { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

  @media (max-width: 768px) {
    .grid-2, .grid-simple { grid-template-columns: 1fr; }
    .divider-v { display: none; }
    .btn { width: 100%; }
    .card-head { padding: 12px 16px; }
    .card-body { padding: 16px !important; }
  }

  .divider-v { width: 1px; background: #f3f4f6; align-self: stretch; }
  .provider-logo { height: 16px; object-fit: contain; }
  .provider-name { font-size: 14px; font-weight: 600; color: #1f2937; }
  .oauth-card {
    display: flex; align-items: center; gap: 12px;
    padding: 16px; border: 1.5px solid #e5e7eb; border-radius: 10px;
    background: #fff; cursor: pointer; transition: all 0.15s; width: 100%;
  }
  .oauth-card:hover { border-color: #c7d2fe; background: #fafafa; }
`;

// ─── components ───────────────────────────────────────────────────────────────

const SI = ({ status, size = 14 }) => {
    if (status === 'loading') return <Loader2 size={size} style={{ animation: 'spin 1s linear infinite' }} />;
    if (status === 'success') return <CheckCircle2 size={size} />;
    if (status === 'error')   return <XCircle size={size} />;
    return null;
};

const extractError = (err) => err?.response?.data?.message || err?.message || 'Something went wrong';

const Banner = ({ status, error }) => {
    if (!status || status === 'loading') return null;
    if (status === 'success') return <div className="ok"><CheckCircle2 size={14} />Connected successfully</div>;
    return <div className="err"><XCircle size={14} />{error || 'Error connection failed'}</div>;
};

const F = ({ label, hint, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {label && <span className="lbl">{label}</span>}
        {hint  && <span className="hint">{hint}</span>}
        {children}
    </div>
);

const Card = ({ accent, iconBg, icon: Icon, title, badge, children, delay = 0 }) => (
    <div className="card fade-up" style={{ animationDelay: `${delay}ms` }}>
        <div className="card-head">
            <div className="accent" style={{ background: accent }} />
            <div className="icon-wrap" style={{ background: iconBg }}>
                <Icon size={16} style={{ color: accent }} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#111827', flex: 1 }}>{title}</span>
            {badge}
        </div>
        <div className="card-body" style={{ padding: '24px 32px' }}>{children}</div>
    </div>
);

export default function IntegrationPage() {
    const s = (init = '') => useState(init);

    // Form States
    const [openaiKey, setOpenaiKey] = s();
    const [openaiSt, setOpenaiSt] = s(null);
    const [openaiErr, setOpenaiErr] = s();

    const [geminiKey, setGeminiKey] = s();
    const [geminiSt, setGeminiSt] = s(null);
    const [geminiErr, setGeminiErr] = s();

    const [repToken, setRepToken] = s();
    const [repSt, setRepSt] = s(null);
    const [repErr, setRepErr] = s();

    const [rcId, setRcId] = s();
    const [rcSecret, setRcSecret] = s();
    const [rcJwt, setRcJwt] = s();
    const [rcSt, setRcSt] = s(null);
    const [rcErr, setRcErr] = s();

    const [ctmKey, setCtmKey] = s();
    const [ctmSecret, setCtmSecret] = s();
    const [ctmAccount, setCtmAccount] = s();
    const [ctmSt, setCtmSt] = s(null);
    const [ctmErr, setCtmErr] = s();
    const [ctmCount, setCtmCount] = useState(null);

    const [wZips, setWZips] = s();
    const [wRadius, setWRadius] = s('25');
    const [wSt, setWSt] = s(null);
    const [wErr, setWErr] = s();

    const [s3Key, setS3Key] = s();
    const [s3Secret, setS3Secret] = s();
    const [s3Region, setS3Region] = s();
    const [s3Bucket, setS3Bucket] = s();
    const [s3St, setS3St] = s(null);
    const [s3Err, setS3Err] = s();

    const [copied, setCopied] = useState(false);
    const fwdEmail = 'intake+acc12345@claimking.ai';

    const callApi = async (ep, payload, setSt, setErr, onOk) => {
        if (Object.values(payload).some(v => !v?.toString().trim())) { toast.error('Please fill in all fields'); return; }
        setSt('loading'); setErr('');
        try {
            await axiosInstance.post(ep, payload);
            setSt('success'); setErr('');
            toast.success('Saved & connected successfully');
            onOk?.();
        } catch (e) {
            const msg = extractError(e);
            console.log(msg);
            setSt('error'); setErr(msg); toast.error(msg);
        }
    };

    return (
        <div className="int-root" style={{ minHeight: '100vh', background: '#f3f4f6', padding: '40px 20px' }}>
            <style>{styles}</style>
            <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Header */}
                <div className="fade-up" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <div style={{ width: 40, height: 40, background: '#1f2937', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Zap size={20} color="#fbbf24" />
                            </div>
                            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#111827' }}>Integrations</h1>
                        </div>
                        <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
                            Securely connect your core business tools. All data is encrypted with AES-256 standards.
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10 }}>
                        <AlertCircle size={14} color="#d97706" />
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#b45309' }}>Production Ready</span>
                    </div>
                </div>

                {/* AI Providers */}
                <Card accent="#4f46e5" iconBg="#eef2ff" icon={Cpu} title="AI Engine Providers" delay={40}>
                    <div className="grid-2">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <img className="provider-logo" src="https://upload.wikimedia.org/wikipedia/commons/4/4d/OpenAI_Logo.svg" alt="OpenAI" />
                                <span className="provider-name">OpenAI (GPT-4)</span>
                            </div>
                            <F hint="Used for automated estimating, analysis, and smart replies.">
                                <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                                    <input className="input mono" type="password" placeholder="sk-proj-..." value={openaiKey} onChange={e => setOpenaiKey(e.target.value)} />
                                    <button className="btn btn-indigo" onClick={() => callApi('/openai-key-save', { apiKey: openaiKey }, setOpenaiSt, setOpenaiErr)} disabled={openaiSt === 'loading'}>
                                        Save Connection <SI status={openaiSt} />
                                    </button>
                                </div>
                            </F>
                            <Banner status={openaiSt} error={openaiErr} />
                        </div>
                        <div className="divider-v" />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <img className="provider-logo" src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" alt="Gemini" />
                                <span className="provider-name">Google Gemini</span>
                            </div>
                            <F hint="Used as a high-performance alternative for vision and multi-modal tasks.">
                                <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                                    <input className="input mono" type="password" placeholder="AIza..." value={geminiKey} onChange={e => setGeminiKey(e.target.value)} />
                                    <button className="btn btn-indigo" onClick={() => callApi('/gemini-key-save', { apiKey: geminiKey }, setGeminiSt, setGeminiErr)} disabled={geminiSt === 'loading'}>
                                        Save Connection <SI status={geminiSt} />
                                    </button>
                                </div>
                            </F>
                            <Banner status={geminiSt} error={geminiErr} />
                        </div>
                    </div>
                </Card>

                {/* Image Generation */}
                <Card accent="#7c3aed" iconBg="#f5f3ff" icon={ImageIcon} title="Visual & Image Generation" delay={80}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <img className="provider-logo" src="https://replicate.com/favicon.ico" alt="Replicate" style={{ borderRadius: 3 }} />
                            <span className="provider-name">Replicate (SDXL)</span>
                        </div>
                        <F hint="Generates detailed 3D roof mockups and property visualizations.">
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <input className="input mono" style={{ flex: 1, minWidth: '240px' }} type="password" placeholder="r8_..." value={repToken} onChange={e => setRepToken(e.target.value)} />
                                <button className="btn btn-violet" onClick={() => callApi('/replicate-token-save', { apiToken: repToken }, setRepSt, setRepErr)} disabled={repSt === 'loading'}>
                                    Verify & Save <SI status={repSt} />
                                </button>
                            </div>
                        </F>
                        <Banner status={repSt} error={repErr} />
                    </div>
                </Card>

                {/* Call Tracking */}
                <Card accent="#ea580c" iconBg="#fff7ed" icon={Phone} title="Communications & Call Tracking" delay={120}>
                    <div className="grid-2">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div className="provider-name" style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f3f4f6', paddingBottom: 10, marginBottom: 5 }}>
                                <img className="provider-logo" src="https://www.ringcentral.com/favicon.ico" alt="RC" /> RingCentral
                            </div>
                            <F label="Client ID"><input className="input" placeholder="Enter ID" value={rcId} onChange={e => setRcId(e.target.value)} /></F>
                            <F label="Client Secret"><input className="input mono" type="password" placeholder="Enter Secret" value={rcSecret} onChange={e => setRcSecret(e.target.value)} /></F>
                            <F label="JWT Token"><textarea className="input mono" placeholder="Paste JWT..." value={rcJwt} onChange={e => setRcJwt(e.target.value)} style={{ minHeight: 80, resize: 'none' }} /></F>
                            <button className="btn btn-orange" onClick={() => callApi('/ringcentral-save', { clientId: rcId, clientSecret: rcSecret, jwtToken: rcJwt }, setRcSt, setRcErr)} disabled={rcSt === 'loading'}>
                                Connect Phone <SI status={rcSt} />
                            </button>
                            <Banner status={rcSt} error={rcErr} />
                        </div>
                        <div className="divider-v" />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div className="provider-name" style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f3f4f6', paddingBottom: 10, marginBottom: 5 }}>
                                <Globe size={16} color="#ea580c" /> Call Tracking Metrics
                            </div>
                            <F label="Account ID"><input className="input" placeholder="ID" value={ctmAccount} onChange={e => setCtmAccount(e.target.value)} /></F>
                            <F label="API Key"><input className="input" placeholder="Key" value={ctmKey} onChange={e => setCtmKey(e.target.value)} /></F>
                            <F label="API Secret"><input className="input mono" type="password" placeholder="Secret" value={ctmSecret} onChange={e => setCtmSecret(e.target.value)} /></F>
                            <button className="btn btn-orange" disabled={ctmSt === 'loading'}
                                    onClick={async () => {
                                        if (!ctmKey || !ctmSecret || !ctmAccount) { toast.error('Fill all fields'); return; }
                                        setCtmSt('loading');
                                        try {
                                            const res = await axiosInstance.post('/ctm-save', { apiKey: ctmKey, apiSecret: ctmSecret, accountId: ctmAccount });
                                            setCtmSt('success'); setCtmCount(res.data?.importedCount ?? 0);
                                        } catch (e) { setCtmSt('error'); setCtmErr(extractError(e)); }
                                    }}>
                                Sync 30-Day Data <SI status={ctmSt} />
                            </button>
                            {ctmSt === 'success' && <div className="ok">{ctmCount} calls synced successfully</div>}
                            {ctmSt === 'error' && <Banner status="error" error={ctmErr} />}
                        </div>
                    </div>
                </Card>

                {/* Email */}
                <Card accent="#059669" iconBg="#ecfdf5" icon={Mail} title="Email Sync & Processing" delay={160}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div className="grid-simple">
                            <button className="oauth-card" onClick={() => toast.info('Redirecting to Google...')}>
                                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_Color_Logo.svg" style={{ width: 22 }} alt="G" />
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>Sync Gmail</div>
                                    <div style={{ fontSize: 12, color: '#9ca3af' }}>Read-only access</div>
                                </div>
                            </button>
                            <button className="oauth-card" onClick={() => toast.info('Redirecting to Microsoft...')}>
                                <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" style={{ width: 22 }} alt="M" />
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>Sync Outlook</div>
                                    <div style={{ fontSize: 12, color: '#9ca3af' }}>Graph API access</div>
                                </div>
                            </button>
                        </div>
                        <div className="fwd-box" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <Key size={14} color="#64748b" />
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Direct Inbound Address</span>
                            </div>
                            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>Use this for automated email forwarding if OAuth is not supported by your provider.</p>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <input readOnly value={fwdEmail} className="input mono" style={{ background: '#fff' }} />
                                <button onClick={() => { navigator.clipboard.writeText(fwdEmail); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                                        style={{ padding: '0 16px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }}>
                                    {copied ? <Check size={16} color="#059669" /> : <Copy size={16} color="#64748b" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Weather & AWS */}
                <div className="grid-simple" style={{ gap: 24 }}>
                    <Card accent="#0891b2" iconBg="#ecfeff" icon={CloudRain} title="Storm Tracking" delay={200}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="noaa-pill" style={{ background: '#f0f9ff', color: '#0369a1', borderColor: '#bae6fd' }}>
                                <Globe size={14} /> NOAA Integration Active
                            </div>
                            <F label="Target ZIPs"><input className="input" placeholder="77001, 77002" value={wZips} onChange={e => setWZips(e.target.value)} /></F>
                            <F label="Radius">
                                <select className="input" value={wRadius} onChange={e => setWRadius(e.target.value)}>
                                    <option value="25">25 Miles</option>
                                    <option value="50">50 Miles</option>
                                    <option value="100">100 Miles</option>
                                </select>
                            </F>
                            <button className="btn btn-teal" onClick={() => callApi('/weather-settings-save', { serviceAreaZips: wZips, alertRadiusMiles: Number(wRadius) }, setWSt, setWErr)}>
                                Save Config <SI status={wSt} />
                            </button>
                        </div>
                    </Card>

                    <Card accent="#dc2626" iconBg="#fef2f2" icon={HardDrive} title="AWS S3 Storage" delay={240}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <F label="Access Key"><input className="input mono" placeholder="AKIA..." value={s3Key} onChange={e => setS3Key(e.target.value)} /></F>
                            <F label="Secret Key"><input className="input mono" type="password" placeholder="••••" value={s3Secret} onChange={e => setS3Secret(e.target.value)} /></F>
                            <div className="grid-simple">
                                <F label="Region"><input className="input" placeholder="us-east-1" value={s3Region} onChange={e => setS3Region(e.target.value)} /></F>
                                <F label="Bucket"><input className="input" placeholder="bucket-name" value={s3Bucket} onChange={e => setS3Bucket(e.target.value)} /></F>
                            </div>
                            <button className="btn btn-rose" onClick={() => callApi('/aws-s3-save', { accessKeyId: s3Key, secretAccessKey: s3Secret, region: s3Region, bucketName: s3Bucket }, setS3St, setS3Err)}>
                                Test & Save <SI status={s3St} />
                            </button>
                            {s3St === 'success' && <div className="ok">AWS S3 connected successfully</div>}
                            {s3St === 'error' && <Banner status="error" error={s3Err} />}
                        </div>
                    </Card>
                </div>

                <div style={{ height: 40 }} />
            </div>
        </div>
    );
}