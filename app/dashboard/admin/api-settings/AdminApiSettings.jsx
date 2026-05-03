'use client';
import React, { useEffect, useState } from 'react';
import {
    Cpu, Image as ImageIcon, HardDrive, Shield, Database, Loader2,
    CheckCircle2, XCircle, CircleDot, Server, KeyRound,
} from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '../../../../lib/axiosInstance.js';

/**
 * Admin-only page for the shared (global) API credentials that every
 * subscribed user reuses behind the scenes.
 *
 * Per-user integrations (Email, RingCentral, CTM, Storm Tracking) live in
 * /dashboard/api-settings instead.
 */

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  .admin-int * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }
  .admin-int .mono { font-family: 'JetBrains Mono', monospace; }
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
  .btn-indigo { background: #4f46e5; color: #fff; }
  .btn-indigo:hover:not(:disabled) { background: #4338ca; }
  .btn-rose { background: #e11d48; color: #fff; }
  .btn-ghost { background: #fff; color: #4b5563; border: 1.5px solid #e5e7eb; }
  .btn-ghost:hover:not(:disabled) { background: #f9fafb; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1px 1fr 1px 1fr; gap: 24px; }
  .grid-simple { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 1024px) { .grid-3 { grid-template-columns: 1fr; } .grid-3 .divider-v { display: none; } }
  @media (max-width: 768px) { .grid-simple { grid-template-columns: 1fr; } }
  .divider-v { width: 1px; background: #f3f4f6; align-self: stretch; }
  .status-pill { display: inline-flex; align-items: center; gap: 5px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
    padding: 4px 10px; border-radius: 999px; border: 1px solid transparent; }
  .status-pill.connected { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
  .status-pill.pending { background: #f3f4f6; color: #6b7280; border-color: #e5e7eb; }
  .source-pill { display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600;
    background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; }
  .ok, .err { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-top: 12px; }
  .ok { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
  .err { background: #fff1f2; border: 1px solid #fecdd3; color: #be123c; }
`;

const SECRET_PROVIDERS = ['openai', 'gemini', 'claude', 'replicate'];

const PROVIDER_META = {
    openai:   { label: 'OpenAI (GPT-4)',  hint: 'Estimating, smart replies, claim narrative.', placeholder: 'sk-proj-...' },
    gemini:   { label: 'Google Gemini',   hint: 'Vision + multimodal AI, image generation.',   placeholder: 'AIza...' },
    claude:   { label: 'Anthropic Claude', hint: 'Policy analysis & supplement reasoning.',     placeholder: 'sk-ant-...' },
    replicate:{ label: 'Replicate',       hint: 'Optional FLUX/Stable Diffusion image edits.', placeholder: 'r8_...' },
};

const StatusBadge = ({ configured, loading }) => {
    if (loading) return <span className="status-pill pending"><Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> Checking</span>;
    if (configured) return <span className="status-pill connected"><CheckCircle2 size={10} /> Configured</span>;
    return <span className="status-pill pending"><CircleDot size={10} /> Not set</span>;
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

const F = ({ label, hint, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {label && <span className="lbl">{label}</span>}
        {hint && <span className="hint">{hint}</span>}
        {children}
    </div>
);

const extractError = (e) => e?.userMessage || e?.response?.data?.message || e?.message || 'Request failed';

export default function AdminApiSettings() {
    const [loading, setLoading] = useState(true);
    const [source, setSource] = useState('db');
    const [providers, setProviders] = useState([]); // [{provider, configured, is_active, region, bucket_name, ...}]
    const [busy, setBusy] = useState(null); // provider key while a save is in flight

    // Local input buffers (cleared after a successful save)
    const [secrets, setSecrets] = useState({}); // { openai: 'sk-...', ... }
    const [s3, setS3] = useState({ accessKeyId: '', secretAccessKey: '', region: '', bucketName: '' });

    const refresh = async () => {
        setLoading(true);
        try {
            const { data } = await axiosInstance.get('/admin/global-api-keys');
            setSource(data?.source || 'db');
            setProviders(data?.providers || []);
            // Pre-fill non-secret fields for AWS so the admin can see what is stored
            const aws = (data?.providers || []).find((p) => p.provider === 'aws_s3');
            if (aws) {
                setS3((cur) => ({
                    ...cur,
                    region: aws.region || cur.region,
                    bucketName: aws.bucket_name || cur.bucketName,
                }));
            }
        } catch (e) {
            toast.error(extractError(e));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refresh(); }, []);

    const providerStatus = (key) => providers.find((p) => p.provider === key) || { configured: false, is_active: true };

    const isEnvOnly = source === 'env';

    const saveSecret = async (provider) => {
        const value = (secrets[provider] || '').trim();
        if (!value) { toast.error('Enter the API key first'); return; }
        setBusy(provider);
        try {
            await axiosInstance.post(`/admin/global-api-keys/${provider}`, { apiKey: value });
            toast.success(`${PROVIDER_META[provider].label} saved & verified`);
            setSecrets((s) => ({ ...s, [provider]: '' }));
            await refresh();
        } catch (e) {
            toast.error(extractError(e));
        } finally {
            setBusy(null);
        }
    };

    const saveAws = async () => {
        const { accessKeyId, secretAccessKey, region, bucketName } = s3;
        if (!accessKeyId || !secretAccessKey || !region || !bucketName) {
            toast.error('Fill in every field'); return;
        }
        setBusy('aws_s3');
        try {
            await axiosInstance.post('/admin/global-api-keys/aws-s3/save', s3);
            toast.success('AWS S3 saved & verified');
            setS3((cur) => ({ ...cur, accessKeyId: '', secretAccessKey: '' }));
            await refresh();
        } catch (e) {
            toast.error(extractError(e));
        } finally {
            setBusy(null);
        }
    };

    const clearProvider = async (provider) => {
        if (!confirm(`Remove the stored ${provider} credentials? Users will lose access until you reconfigure.`)) return;
        setBusy(provider);
        try {
            await axiosInstance.post(`/admin/global-api-keys/${provider}/clear`);
            toast.success('Credentials removed');
            await refresh();
        } catch (e) {
            toast.error(extractError(e));
        } finally {
            setBusy(null);
        }
    };

    const toggleActive = async (provider, currentlyActive) => {
        setBusy(provider);
        try {
            await axiosInstance.post(`/admin/global-api-keys/${provider}/active`, { isActive: !currentlyActive });
            toast.success(currentlyActive ? 'Provider disabled' : 'Provider enabled');
            await refresh();
        } catch (e) {
            toast.error(extractError(e));
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="admin-int" style={{ minHeight: '100vh', background: '#f3f4f6', padding: '40px 20px' }}>
            <style>{styles}</style>
            <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <div style={{ width: 40, height: 40, background: '#1f2937', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Shield size={20} color="#fbbf24" />
                            </div>
                            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#111827' }}>Shared API Credentials</h1>
                        </div>
                        <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
                            These keys power AI features for every subscribed user. Configure once — applied everywhere.
                        </p>
                    </div>
                    <span className="source-pill" title="Set via API_KEY_SOURCE env var on the backend">
                        {source === 'env' && <><Server size={12} /> Source: ENV (read-only)</>}
                        {source === 'env_first' && <><Server size={12} /> Source: ENV → DB fallback</>}
                        {source === 'db' && <><Database size={12} /> Source: Database</>}
                    </span>
                </div>

                {isEnvOnly && (
                    <div className="err" style={{ background: '#fffbeb', borderColor: '#fcd34d', color: '#92400e' }}>
                        <Server size={14} />
                        Backend is configured to read keys exclusively from environment variables (<span className="mono">API_KEY_SOURCE=env</span>).
                        Saving from this UI is disabled — update the server <span className="mono">.env</span> instead and restart.
                    </div>
                )}

                {/* AI Engine Providers */}
                <Card
                    accent="#4f46e5" iconBg="#eef2ff" icon={Cpu} title="AI Engine Providers"
                    badge={<StatusBadge loading={loading}
                        configured={SECRET_PROVIDERS.slice(0, 3).every((k) => providerStatus(k).configured)} />}
                >
                    <div className="grid-3">
                        {SECRET_PROVIDERS.slice(0, 3).map((key, idx, arr) => {
                            const meta = PROVIDER_META[key];
                            const status = providerStatus(key);
                            return (
                                <React.Fragment key={key}>
                                    <ProviderEditor
                                        meta={meta}
                                        status={status}
                                        value={secrets[key] || ''}
                                        onChange={(v) => setSecrets((s) => ({ ...s, [key]: v }))}
                                        onSave={() => saveSecret(key)}
                                        onClear={() => clearProvider(key)}
                                        onToggle={() => toggleActive(key, status.is_active)}
                                        disabled={isEnvOnly || busy === key}
                                        busy={busy === key}
                                    />
                                    {idx < arr.length - 1 && <div className="divider-v" />}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </Card>

                {/* Image Generation */}
                <Card
                    accent="#0ea5e9" iconBg="#e0f2fe" icon={ImageIcon} title="Image Generation"
                    badge={<StatusBadge loading={loading}
                        configured={providerStatus('gemini').configured || providerStatus('replicate').configured} />}
                >
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>
                        Gemini image generation reuses the AI Engine key above. Replicate is optional and overrides Gemini once a token is saved.
                    </div>
                    <ProviderEditor
                        meta={PROVIDER_META.replicate}
                        status={providerStatus('replicate')}
                        value={secrets.replicate || ''}
                        onChange={(v) => setSecrets((s) => ({ ...s, replicate: v }))}
                        onSave={() => saveSecret('replicate')}
                        onClear={() => clearProvider('replicate')}
                        onToggle={() => toggleActive('replicate', providerStatus('replicate').is_active)}
                        disabled={isEnvOnly || busy === 'replicate'}
                        busy={busy === 'replicate'}
                    />
                </Card>

                {/* AWS S3 */}
                <Card
                    accent="#dc2626" iconBg="#fef2f2" icon={HardDrive} title="AWS S3 Storage (shared)"
                    badge={<StatusBadge loading={loading} configured={providerStatus('aws_s3').configured} />}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <F label="Access Key ID">
                            <input className="input mono" placeholder={providerStatus('aws_s3').configured ? '•••••• Saved — enter new value to replace' : 'AKIA...'}
                                value={s3.accessKeyId}
                                onChange={(e) => setS3({ ...s3, accessKeyId: e.target.value })}
                                disabled={isEnvOnly || busy === 'aws_s3'} />
                        </F>
                        <F label="Secret Access Key">
                            <input className="input mono" type="password"
                                placeholder={providerStatus('aws_s3').configured ? '••••••' : ''}
                                value={s3.secretAccessKey}
                                onChange={(e) => setS3({ ...s3, secretAccessKey: e.target.value })}
                                disabled={isEnvOnly || busy === 'aws_s3'} />
                        </F>
                        <div className="grid-simple">
                            <F label="Region">
                                <input className="input" placeholder="us-east-1"
                                    value={s3.region}
                                    onChange={(e) => setS3({ ...s3, region: e.target.value })}
                                    disabled={isEnvOnly || busy === 'aws_s3'} />
                            </F>
                            <F label="Bucket Name">
                                <input className="input" placeholder="bucket-name"
                                    value={s3.bucketName}
                                    onChange={(e) => setS3({ ...s3, bucketName: e.target.value })}
                                    disabled={isEnvOnly || busy === 'aws_s3'} />
                            </F>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button className="btn btn-rose" onClick={saveAws}
                                disabled={isEnvOnly || busy === 'aws_s3'}>
                                {busy === 'aws_s3' && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                                {providerStatus('aws_s3').configured ? 'Test & Update' : 'Test & Save'}
                            </button>
                            {providerStatus('aws_s3').configured && (
                                <>
                                    <button className="btn btn-ghost" onClick={() => toggleActive('aws_s3', providerStatus('aws_s3').is_active)}
                                        disabled={isEnvOnly || busy === 'aws_s3'}>
                                        {providerStatus('aws_s3').is_active ? 'Disable' : 'Enable'}
                                    </button>
                                    <button className="btn btn-ghost" onClick={() => clearProvider('aws_s3')}
                                        disabled={isEnvOnly || busy === 'aws_s3'}>
                                        Remove
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </Card>

                <div style={{ height: 40 }} />
            </div>
        </div>
    );
}

function ProviderEditor({ meta, status, value, onChange, onSave, onClear, onToggle, disabled, busy }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <KeyRound size={14} color="#4f46e5" />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>{meta.label}</span>
                <div style={{ marginLeft: 'auto' }}>
                    <StatusBadge configured={status.configured} />
                </div>
            </div>
            <F hint={meta.hint}>
                <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                    <input
                        className="input mono"
                        type="password"
                        placeholder={status.configured ? '•••••• Saved — enter new value to replace' : meta.placeholder}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                    />
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-indigo" onClick={onSave} disabled={disabled}>
                            {busy && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                            {status.configured ? 'Update' : 'Save'}
                        </button>
                        {status.configured && (
                            <>
                                <button className="btn btn-ghost" onClick={onToggle} disabled={disabled}>
                                    {status.is_active ? 'Disable' : 'Enable'}
                                </button>
                                <button className="btn btn-ghost" onClick={onClear} disabled={disabled}>
                                    Remove
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </F>
            {!status.is_active && status.configured && (
                <div className="err" style={{ background: '#fffbeb', borderColor: '#fcd34d', color: '#92400e', marginTop: 0 }}>
                    <XCircle size={14} /> Disabled — users cannot use this provider until you enable it.
                </div>
            )}
        </div>
    );
}
