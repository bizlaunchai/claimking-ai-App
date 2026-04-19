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
    padding: 8px 12px;
    font-size: 13px;
    color: #111827;
    outline: none;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
    font-family: 'DM Sans', sans-serif;
  }
  .input::placeholder { color: #9ca3af; }
  .input:focus {
    border-color: #6366f1;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
  }
  .input.mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 0.02em; }

  .lbl { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #6b7280; display: block; margin-bottom: 5px; }
  .hint { font-size: 12px; color: #9ca3af; margin-bottom: 7px; line-height: 1.5; }

  .btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 15px; border-radius: 8px;
    font-size: 13px; font-weight: 600; cursor: pointer;
    border: none; transition: all 0.15s; white-space: nowrap;
    font-family: 'DM Sans', sans-serif;
  }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-indigo  { background: #4f46e5; color: #fff; }
  .btn-indigo:hover:not(:disabled)  { background: #4338ca; }
  .btn-violet  { background: #7c3aed; color: #fff; }
  .btn-violet:hover:not(:disabled)  { background: #6d28d9; }
  .btn-orange  { background: #ea580c; color: #fff; }
  .btn-orange:hover:not(:disabled)  { background: #c2410c; }
  .btn-rose    { background: #e11d48; color: #fff; }
  .btn-rose:hover:not(:disabled)    { background: #be123c; }
  .btn-teal    { background: #0d9488; color: #fff; }
  .btn-teal:hover:not(:disabled)    { background: #0f766e; }
  .btn-ghost   { background: #fff; color: #374151; border: 1.5px solid #e5e7eb; }
  .btn-ghost:hover:not(:disabled)   { background: #f9fafb; border-color: #d1d5db; }

  .ok  { display: flex; align-items: center; gap: 8px; padding: 9px 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; color: #166534; font-size: 12px; font-weight: 500; margin-top: 10px; }
  .err { display: flex; align-items: center; gap: 8px; padding: 9px 12px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; color: #be123c; font-size: 12px; font-weight: 500; margin-top: 10px; }

  .divider-v { width: 1px; background: #f3f4f6; align-self: stretch; flex-shrink: 0; }

  .provider-logo { height: 15px; object-fit: contain; }

  .provider-name { font-size: 13px; font-weight: 600; color: #1f2937; }

  .sub-head { font-size: 12px; font-weight: 600; color: #374151; display: flex; align-items: center; gap: 7px; padding-bottom: 10px; border-bottom: 1px solid #f3f4f6; margin-bottom: 12px; }

  .oauth-card {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 16px; border: 1.5px solid #e5e7eb; border-radius: 10px;
    background: #fff; cursor: pointer; transition: all 0.15s;
    font-family: 'DM Sans', sans-serif; text-align: left;
  }
  .oauth-card:hover { background: #fafafa; border-color: #c7d2fe; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

  .fwd-box { background: linear-gradient(135deg,#eff6ff,#f0f9ff); border: 1px solid #bfdbfe; border-radius: 10px; padding: 16px; }

  .tag { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .tag-free    { background: #ede9fe; color: #5b21b6; }
  .tag-enc     { background: #ffe4e6; color: #be123c; }

  .mono-tag { display: inline-flex; align-items: center; gap: 5px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 6px; padding: 7px 10px; font-size: 11px; color: #6b7280; font-family: 'JetBrains Mono', monospace; white-space: nowrap; align-self: center; }

  .webhook-pill { display: inline-flex; align-items: center; gap: 5px; background: #f9fafb; border: 1px dashed #d1d5db; border-radius: 6px; padding: 5px 9px; font-size: 11px; color: #9ca3af; font-family: 'JetBrains Mono', monospace; margin-top: 8px; }

  .noaa-pill { display: flex; align-items: center; gap: 7px; padding: 9px 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 12px; color: #166534; font-weight: 500; }
`;

// ─── helpers ──────────────────────────────────────────────────────────────────

const SI = ({ status, size = 14 }) => {
    const s = { width: size, height: size, flexShrink: 0 };
    if (status === 'loading') return <Loader2 style={{ ...s, animation: 'spin 1s linear infinite' }} />;
    if (status === 'success') return <CheckCircle2 style={s} />;
    if (status === 'error')   return <XCircle style={s} />;
    return null;
};

const extractError = (err) =>
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    'Something went wrong';

const Banner = ({ status, error }) => {
    if (!status || status === 'loading') return null;
    if (status === 'success') return <div className="ok"><CheckCircle2 size={14} style={{ flexShrink: 0 }} />Connected successfully</div>;
    return <div className="err"><XCircle size={14} style={{ flexShrink: 0 }} />{error || 'Something went wrong'}</div>;
};

const F = ({ label, hint, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                <Icon size={14} style={{ color: accent }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1f2937', flex: 1 }}>{title}</span>
            {badge}
        </div>
        <div style={{ padding: 24 }}>{children}</div>
    </div>
);

// ─── page ─────────────────────────────────────────────────────────────────────

export default function IntegrationPage() {
    const s = (init = '') => useState(init);

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
            setSt('error'); setErr(msg); toast.error(msg);
        }
    };

    return (
        <div className="int-root" style={{ minHeight: '100vh', background: '#f3f4f6', padding: '32px 20px' }}>
            <style>{styles}</style>
            <div style={{ maxWidth: 840, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Header */}
                <div className="fade-up" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                            <div style={{ width: 34, height: 34, background: '#1f2937', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Zap size={16} color="#fbbf24" />
                            </div>
                            <h1 style={{ margin: 0, fontSize: 21, fontWeight: 600, color: '#111827' }}>Integrations</h1>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
                            Connect AI providers, phone systems, email, and storage. All credentials are AES-256 encrypted.
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
                        <AlertCircle size={13} color="#d97706" />
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#b45309' }}>Configure before using live features</span>
                    </div>
                </div>

                {/* AI Providers */}
                <Card accent="#4f46e5" iconBg="#eef2ff" icon={Cpu} title="AI Providers" delay={40}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 24 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                <img className="provider-logo" src="https://upload.wikimedia.org/wikipedia/commons/4/4d/OpenAI_Logo.svg" alt="OpenAI" />
                                <span className="provider-name">OpenAI</span>
                            </div>
                            <F hint="Powers estimates, policy analysis, email replies & document generation.">
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input className="input mono" type="password" autoComplete="new-password" placeholder="sk-proj-..." value={openaiKey} onChange={e => setOpenaiKey(e.target.value)} style={{ flex: 1 }} />
                                    <button className="btn btn-indigo" onClick={() => callApi('/openai-key-save', { apiKey: openaiKey }, setOpenaiSt, setOpenaiErr, () => setOpenaiKey(''))} disabled={openaiSt === 'loading'}>
                                        Save <SI status={openaiSt} />
                                    </button>
                                </div>
                            </F>
                            <Banner status={openaiSt} error={openaiErr} />
                        </div>

                        <div className="divider-v" />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                <img className="provider-logo" src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" alt="Gemini" />
                                <span className="provider-name">Google Gemini</span>
                            </div>
                            <F hint="Alternative AI provider for image generation and analysis.">
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input className="input mono" type="password" autoComplete="new-password" placeholder="AIza..." value={geminiKey} onChange={e => setGeminiKey(e.target.value)} style={{ flex: 1 }} />
                                    <button className="btn btn-indigo" onClick={() => callApi('/gemini-key-save', { apiKey: geminiKey }, setGeminiSt, setGeminiErr, () => setGeminiKey(''))} disabled={geminiSt === 'loading'}>
                                        Save <SI status={geminiSt} />
                                    </button>
                                </div>
                            </F>
                            <Banner status={geminiSt} error={geminiErr} />
                        </div>
                    </div>
                </Card>

                {/* Image Generation */}
                <Card accent="#7c3aed" iconBg="#f5f3ff" icon={ImageIcon} title="Image Generation" delay={80}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                            <img className="provider-logo" src="https://replicate.com/favicon.ico" alt="Replicate" style={{ borderRadius: 3 }} />
                            <span className="provider-name">Replicate</span>
                        </div>
                        <F hint="Powers 3D roof mockup generation via Stable Diffusion XL.">
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <input className="input mono" type="password" autoComplete="new-password" placeholder="r8_..." value={repToken} onChange={e => setRepToken(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
                                <div className="mono-tag"><Database size={11} />stability-ai/sdxl</div>
                                <button className="btn btn-violet" onClick={() => callApi('/replicate-token-save', { apiToken: repToken }, setRepSt, setRepErr, () => setRepToken(''))} disabled={repSt === 'loading'}>
                                    Test & Save <SI status={repSt} />
                                </button>
                            </div>
                        </F>
                        <Banner status={repSt} error={repErr} />
                    </div>
                </Card>

                {/* Call Tracking */}
                <Card accent="#ea580c" iconBg="#fff7ed" icon={Phone} title="Phone & Call Tracking" delay={120}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 24 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div className="sub-head">
                                <img className="provider-logo" src="https://www.ringcentral.com/favicon.ico" alt="RC" style={{ borderRadius: 2 }} />
                                RingCentral
                            </div>
                            <F label="Client ID">
                                <input className="input" type="text" placeholder="Client ID" value={rcId} onChange={e => setRcId(e.target.value)} />
                            </F>
                            <F label="Client Secret">
                                <input className="input mono" type="password" autoComplete="new-password" placeholder="Client Secret" value={rcSecret} onChange={e => setRcSecret(e.target.value)} />
                            </F>
                            <F label="JWT Token">
                                <textarea className="input mono" placeholder="Paste JWT token..." value={rcJwt} onChange={e => setRcJwt(e.target.value)} style={{ minHeight: 68, resize: 'none' }} />
                            </F>
                            <button className="btn btn-orange" onClick={() => callApi('/ringcentral-save', { clientId: rcId, clientSecret: rcSecret, jwtToken: rcJwt }, setRcSt, setRcErr)} disabled={rcSt === 'loading'} style={{ alignSelf: 'flex-start' }}>
                                Connect <SI status={rcSt} />
                            </button>
                            <Banner status={rcSt} error={rcErr} />
                            <div className="webhook-pill"><Wifi size={10} />POST /api/webhooks/ringcentral</div>
                        </div>

                        <div className="divider-v" />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div className="sub-head"><Globe size={13} color="#ea580c" />Call Tracking Metrics</div>
                            <F label="Account ID">
                                <input className="input" type="text" placeholder="Account ID" value={ctmAccount} onChange={e => setCtmAccount(e.target.value)} />
                            </F>
                            <F label="API Key">
                                <input className="input" type="text" placeholder="API Key" value={ctmKey} onChange={e => setCtmKey(e.target.value)} />
                            </F>
                            <F label="API Secret">
                                <input className="input mono" type="password" autoComplete="new-password" placeholder="API Secret" value={ctmSecret} onChange={e => setCtmSecret(e.target.value)} />
                            </F>
                            <button className="btn btn-orange" disabled={ctmSt === 'loading'} style={{ alignSelf: 'flex-start' }}
                                    onClick={async () => {
                                        if (!ctmKey || !ctmSecret || !ctmAccount) { toast.error('Please fill in all CTM fields'); return; }
                                        setCtmSt('loading'); setCtmErr('');
                                        try {
                                            const res = await axiosInstance.post('/ctm-save', { apiKey: ctmKey, apiSecret: ctmSecret, accountId: ctmAccount });
                                            setCtmSt('success'); setCtmCount(res.data?.importedCount ?? 0);
                                            toast.success(`Imported ${res.data?.importedCount ?? 0} calls`);
                                        } catch (e) { const m = extractError(e); setCtmSt('error'); setCtmErr(m); toast.error(m); }
                                    }}>
                                Save & Import 30 Days <SI status={ctmSt} />
                            </button>
                            {ctmSt === 'success' && ctmCount !== null
                                ? <div className="ok"><CheckCircle2 size={14} style={{ flexShrink: 0 }} />{ctmCount} calls imported from last 30 days</div>
                                : <Banner status={ctmSt === 'success' ? null : ctmSt} error={ctmErr} />
                            }
                        </div>
                    </div>
                </Card>

                {/* Email */}
                <Card accent="#059669" iconBg="#ecfdf5" icon={Mail} title="Email Connections" delay={160}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <button className="oauth-card" onClick={() => toast.info('Redirect to Google OAuth...')}>
                                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_Color_Logo.svg" style={{ width: 20 }} alt="Google" />
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Connect Gmail</div>
                                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>gmail.readonly scope</div>
                                </div>
                            </button>
                            <button className="oauth-card" onClick={() => toast.info('Redirect to Microsoft OAuth...')}>
                                <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" style={{ width: 20 }} alt="Microsoft" />
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Connect Outlook</div>
                                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Mail.Read via Graph API</div>
                                </div>
                            </button>
                        </div>
                        <div className="fwd-box">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                <Key size={12} color="#1d4ed8" />
                                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#1d4ed8' }}>
                                    Email Forwarding Alternative
                                </span>
                            </div>
                            <p style={{ fontSize: 12, color: '#374151', margin: '0 0 10px', lineHeight: 1.5 }}>
                                Fallback for non-OAuth users — forward insurance emails to this address:
                            </p>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input readOnly value={fwdEmail} className="input mono" style={{ flex: 1, background: '#fff', borderColor: '#bfdbfe', color: '#1d4ed8' }} />
                                <button onClick={() => { navigator.clipboard.writeText(fwdEmail); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                                        style={{ padding: '8px 11px', background: '#fff', border: '1.5px solid #bfdbfe', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}>
                                    {copied ? <Check size={14} color="#059669" /> : <Copy size={14} color="#1d4ed8" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Weather */}
                <Card accent="#0891b2" iconBg="#ecfeff" icon={CloudRain} title="Storm & Weather Tracking"
                      badge={<span className="tag tag-free"><Zap size={10} />Free API</span>} delay={200}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div className="noaa-pill">
                            <CheckCircle2 size={13} color="#059669" />
                            NOAA & NWS APIs active — no API key required
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <F label="Service Area ZIPs">
                                <input className="input" type="text" placeholder="77001, 77002, 77003" value={wZips} onChange={e => setWZips(e.target.value)} />
                            </F>
                            <F label="Alert Radius">
                                <select className="input" value={wRadius} onChange={e => setWRadius(e.target.value)}>
                                    <option value="10">Within 10 miles</option>
                                    <option value="25">Within 25 miles</option>
                                    <option value="50">Within 50 miles</option>
                                    <option value="100">Within 100 miles</option>
                                </select>
                            </F>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn btn-teal" onClick={() => callApi('/weather-settings-save', { serviceAreaZips: wZips, alertRadiusMiles: Number(wRadius) }, setWSt, setWErr)} disabled={wSt === 'loading'}>
                                Save Settings <SI status={wSt} />
                            </button>
                        </div>
                        <Banner status={wSt} error={wErr} />
                    </div>
                </Card>

                {/* AWS S3 */}
                <Card accent="#dc2626" iconBg="#fef2f2" icon={HardDrive} title="Storage — AWS S3"
                      badge={<span className="tag tag-enc"><Shield size={10} />AES-256 Encrypted</span>} delay={240}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>
                            Stores uploaded PDFs, job photos, generated mockups, and call recordings.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <F label="Access Key ID">
                                <input className="input mono" type="text" placeholder="AKIA..." value={s3Key} onChange={e => setS3Key(e.target.value)} />
                            </F>
                            <F label="Secret Access Key">
                                <input className="input mono" type="password" autoComplete="new-password" placeholder="••••••••••••••••••" value={s3Secret} onChange={e => setS3Secret(e.target.value)} />
                            </F>
                            <F label="Region">
                                <input className="input" type="text" placeholder="us-east-1" value={s3Region} onChange={e => setS3Region(e.target.value)} />
                            </F>
                            <F label="Bucket Name">
                                <input className="input" type="text" placeholder="my-claimking-bucket" value={s3Bucket} onChange={e => setS3Bucket(e.target.value)} />
                            </F>
                        </div>
                        <div>
                            <button className="btn btn-rose" onClick={() => callApi('/aws-s3-save', { accessKeyId: s3Key, secretAccessKey: s3Secret, region: s3Region, bucketName: s3Bucket }, setS3St, setS3Err)} disabled={s3St === 'loading'}>
                                Save & Test Connection <SI status={s3St} />
                            </button>
                        </div>
                        <Banner status={s3St} error={s3Err} />
                    </div>
                </Card>

                <div style={{ height: 24 }} />
            </div>
        </div>
    );
}