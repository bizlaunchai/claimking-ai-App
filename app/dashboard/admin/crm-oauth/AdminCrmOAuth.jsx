'use client';
import React, { useEffect, useState } from 'react';
import {
    Link as LinkIcon, Loader2, CheckCircle2, CircleDot, Copy, XCircle, Server, Database,
} from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '../../../../lib/axiosInstance.js';

/**
 * Dedicated superadmin page for the platform-level OAuth app credentials
 * ClaimKing.AI registers with each OAuth-based CRM (AccuLynx, HubSpot,
 * Salesforce, Zoho). Reachable from the sidebar so the workflow has a clear
 * home — separate from the AI-provider API Settings page.
 */

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  .admin-crm * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }
  .admin-crm .mono { font-family: 'JetBrains Mono', monospace; }
  .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03); }
  .card-head { display: flex; align-items: center; gap: 12px; padding: 14px 22px;
    border-bottom: 1px solid #f3f4f6; background: #fafafa; }
  .input { width: 100%; background: #f9fafb; border: 1.5px solid #e5e7eb; border-radius: 8px;
    padding: 10px 12px; font-size: 14px; color: #111827; outline: none; transition: all 0.15s; }
  .input:focus { border-color: #FDB813; background: #fff; box-shadow: 0 0 0 3px rgba(253,184,19,0.15); }
  .input.mono { font-family: 'JetBrains Mono', monospace; font-size: 13px; }
  .lbl { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #6b7280; display: block; margin-bottom: 5px; }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 10px 18px; border-radius: 8px; font-size: 14px; font-weight: 600;
    cursor: pointer; border: none; transition: all 0.15s; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-gold { background: #FDB813; color: #1a1f3a; }
  .btn-gold:hover:not(:disabled) { background: #d4a000; }
  .btn-ghost { background: #fff; color: #4b5563; border: 1.5px solid #e5e7eb; }
  .btn-ghost:hover:not(:disabled) { background: #f9fafb; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 768px) { .grid-2 { grid-template-columns: 1fr; } }
  .status-pill { display: inline-flex; align-items: center; gap: 5px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
    padding: 4px 10px; border-radius: 999px; border: 1px solid transparent; }
  .status-pill.connected { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
  .status-pill.pending { background: #f3f4f6; color: #6b7280; border-color: #e5e7eb; }
  .err { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-top: 12px; }
`;

const CRM_OAUTH_PROVIDERS = ['acculynx_oauth', 'hubspot_oauth', 'salesforce_oauth', 'zoho_oauth'];

const CRM_OAUTH_META = {
    acculynx_oauth: {
        label: 'AccuLynx', crmKey: 'acculynx', icon: '🏠', accent: '#0ea5e9',
        hint: 'Register at developer.acculynx.com. Scope: read_write.',
        docs: 'https://developer.acculynx.com/',
    },
    hubspot_oauth: {
        label: 'HubSpot', crmKey: 'hubspot', icon: '🔶', accent: '#ff7a59',
        hint: 'Create a Public App at developers.hubspot.com. Scopes: crm.objects.contacts.* + crm.objects.deals.*',
        docs: 'https://developers.hubspot.com/docs/api/creating-an-app',
    },
    salesforce_oauth: {
        label: 'Salesforce', crmKey: 'salesforce', icon: '☁️', accent: '#00a1e0',
        hint: 'Create a Connected App in Salesforce → Setup → App Manager. Scopes: api, refresh_token, offline_access.',
        docs: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_oauth_and_connected_apps.htm',
    },
    zoho_oauth: {
        label: 'Zoho CRM', crmKey: 'zoho', icon: '📊', accent: '#e42527',
        hint: 'Register at api-console.zoho.com. Scopes: ZohoCRM.modules.ALL, ZohoCRM.settings.ALL.',
        docs: 'https://api-console.zoho.com/',
    },
};

const extractError = (e) => e?.userMessage || e?.response?.data?.message || e?.message || 'Request failed';

const StatusBadge = ({ configured, loading }) => {
    if (loading) return <span className="status-pill pending"><Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> Checking</span>;
    if (configured) return <span className="status-pill connected"><CheckCircle2 size={10} /> Configured</span>;
    return <span className="status-pill pending"><CircleDot size={10} /> Not set</span>;
};

export default function AdminCrmOAuth() {
    const [loading, setLoading] = useState(true);
    const [source, setSource] = useState('db');
    const [providers, setProviders] = useState([]);
    const [busy, setBusy] = useState(null);
    const [oauthApps, setOauthApps] = useState({});

    const refresh = async () => {
        setLoading(true);
        try {
            const { data } = await axiosInstance.get('/admin/global-api-keys');
            setSource(data?.source || 'db');
            setProviders(data?.providers || []);
        } catch (e) {
            toast.error(extractError(e));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refresh(); }, []);

    const providerStatus = (key) =>
        providers.find((p) => p.provider === key) || { configured: false, is_active: true };

    const isEnvOnly = source === 'env';

    const saveOAuthApp = async (provider) => {
        const draft = oauthApps[provider] || {};
        const clientId = (draft.clientId || '').trim();
        const clientSecret = (draft.clientSecret || '').trim();
        if (!clientId || !clientSecret) {
            toast.error('Both Client ID and Client Secret are required');
            return;
        }
        setBusy(provider);
        try {
            await axiosInstance.post(`/admin/global-api-keys/oauth-app/${provider}`, { clientId, clientSecret });
            toast.success(`${CRM_OAUTH_META[provider].label} OAuth app saved`);
            setOauthApps((s) => ({ ...s, [provider]: { clientId: '', clientSecret: '' } }));
            await refresh();
        } catch (e) {
            toast.error(extractError(e));
        } finally {
            setBusy(null);
        }
    };

    const clearProvider = async (provider) => {
        if (!confirm(`Remove the stored ${CRM_OAUTH_META[provider].label} credentials? Customers will lose the ability to connect ${CRM_OAUTH_META[provider].label} until you reconfigure.`)) return;
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

    const copyCallbackUrl = async (crmKey) => {
        const base = process.env.NEXT_PUBLIC_API_URL || '';
        const url = `${String(base).replace(/\/$/, '')}/crm/oauth/${crmKey}/callback`;
        try { await navigator.clipboard.writeText(url); toast.success('Callback URL copied'); }
        catch { toast.error('Could not copy — select manually'); }
    };

    return (
        <div className="admin-crm" style={{ minHeight: '100vh', background: '#f3f4f6', padding: '40px 20px' }}>
            <style>{styles}</style>
            <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #FDB813, #d4a000)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <LinkIcon size={20} color="#1a1f3a" />
                            </div>
                            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#111827' }}>CRM OAuth Apps</h1>
                        </div>
                        <p style={{ margin: 0, fontSize: 14, color: '#6b7280', maxWidth: 720, lineHeight: 1.6 }}>
                            ClaimKing.AI registers ONCE with each OAuth-based CRM and stores the
                            resulting client_id + client_secret here. Customers use these credentials
                            behind the scenes — they never see them. Until configured, the customer-facing
                            "Connect" button shows <em>Awaiting setup</em>.
                        </p>
                    </div>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                        background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe',
                    }}>
                        {source === 'env' ? <><Server size={12} /> Source: ENV (read-only)</>
                            : <><Database size={12} /> Source: Database</>}
                    </span>
                </div>

                {isEnvOnly && (
                    <div className="err" style={{ background: '#fffbeb', borderColor: '#fcd34d', color: '#92400e' }}>
                        <Server size={14} />
                        Backend is configured to read keys exclusively from environment variables.
                        Saving from this UI is disabled.
                    </div>
                )}

                {/* OAuth app cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {CRM_OAUTH_PROVIDERS.map((key) => {
                        const meta = CRM_OAUTH_META[key];
                        const status = providerStatus(key);
                        const draft = oauthApps[key] || {};
                        return (
                            <OAuthAppCard
                                key={key}
                                meta={meta}
                                status={status}
                                loading={loading}
                                clientId={draft.clientId || ''}
                                clientSecret={draft.clientSecret || ''}
                                onChange={(patch) =>
                                    setOauthApps((s) => ({ ...s, [key]: { ...draft, ...patch } }))
                                }
                                onSave={() => saveOAuthApp(key)}
                                onClear={() => clearProvider(key)}
                                onToggle={() => toggleActive(key, status.is_active)}
                                onCopyCallback={() => copyCallbackUrl(meta.crmKey)}
                                disabled={isEnvOnly || busy === key}
                                busy={busy === key}
                            />
                        );
                    })}
                </div>

                <div style={{ height: 40 }} />
            </div>
        </div>
    );
}

function OAuthAppCard({
    meta, status, loading,
    clientId, clientSecret, onChange,
    onSave, onClear, onToggle, onCopyCallback, disabled, busy,
}) {
    return (
        <div className="card">
            <div className="card-head" style={{ borderLeft: `4px solid ${meta.accent}` }}>
                <span style={{ fontSize: 24 }}>{meta.icon}</span>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{meta.label}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        {meta.hint}{' '}
                        <a href={meta.docs} target="_blank" rel="noreferrer" style={{ color: '#4f46e5', fontWeight: 600 }}>
                            Docs ↗
                        </a>
                    </div>
                </div>
                <StatusBadge configured={status.configured} loading={loading} />
            </div>
            <div style={{ padding: '20px 24px' }}>
                {/* Callback URL — paste into the CRM dev portal */}
                <div style={{ marginBottom: 18 }}>
                    <span className="lbl">Callback URL (paste into the CRM's dev portal)</span>
                    <div style={{
                        display: 'flex', gap: 8, alignItems: 'center',
                        background: '#1a1f3a', borderRadius: 6, padding: '8px 10px',
                    }}>
                        <code className="mono" style={{
                            flex: 1, fontSize: 12, color: '#FDB813',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                            {(process.env.NEXT_PUBLIC_API_URL || '<API_URL>').replace(/\/$/, '')}/crm/oauth/{meta.crmKey}/callback
                        </code>
                        <button
                            type="button"
                            onClick={onCopyCallback}
                            style={{
                                background: '#374151', color: '#fbbf24', border: 'none',
                                padding: '4px 10px', borderRadius: 4, fontSize: 11,
                                fontWeight: 600, cursor: 'pointer', display: 'inline-flex',
                                alignItems: 'center', gap: 4,
                            }}
                            title="Copy"
                        >
                            <Copy size={12} /> Copy
                        </button>
                    </div>
                </div>

                <div className="grid-2">
                    <div>
                        <span className="lbl">Client ID</span>
                        <input
                            className="input mono"
                            placeholder={status.configured ? '•••••• Saved — enter to replace' : 'e.g. acc_app_xxxxx'}
                            value={clientId}
                            onChange={(e) => onChange({ clientId: e.target.value })}
                            disabled={disabled}
                        />
                    </div>
                    <div>
                        <span className="lbl">Client Secret</span>
                        <input
                            className="input mono"
                            type="password"
                            placeholder={status.configured ? '••••••' : ''}
                            value={clientSecret}
                            onChange={(e) => onChange({ clientSecret: e.target.value })}
                            disabled={disabled}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                    <button className="btn btn-gold" onClick={onSave} disabled={disabled}>
                        {busy && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                        {status.configured ? 'Update credentials' : 'Save credentials'}
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

                {!status.is_active && status.configured && (
                    <div className="err" style={{ background: '#fffbeb', borderColor: '#fcd34d', color: '#92400e' }}>
                        <XCircle size={14} />
                        Disabled — customers cannot connect {meta.label} until you enable it.
                    </div>
                )}
            </div>
        </div>
    );
}
