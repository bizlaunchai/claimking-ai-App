'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/lib/axiosInstance';
import './crm-sync.css';

/**
 * Connect Your CRM page — backend-wired (replaces the prior static docs mock).
 *
 * Flow:
 *   1. Lists every CRM in the catalogue + the company's current connections
 *   2. Click a card → opens the Connect modal (API key paste OR OAuth button)
 *   3. Click an existing connection → goes to the detail page
 *
 * Routes used:
 *   GET    /crm/connections                    list current connections
 *   POST   /crm/connections                    create API-key connection
 *   GET    /crm/oauth/:crm/authorize           OAuth redirect (303)
 *   DELETE /crm/connections/:id                disconnect
 */

// Catalogue order mirrors the spec — JobNimbus + AccuLynx surface first as P1.
const CRM_CATALOGUE = [
    { key: 'jobnimbus',    name: 'JobNimbus',   icon: '🛠️',  tag: 'P1 · Roofing',     auth: 'api_key', help: 'developer.jobnimbus.com' },
    { key: 'acculynx',     name: 'AccuLynx',    icon: '🏠',  tag: 'P1 · Roofing',     auth: 'oauth',   help: 'developer.acculynx.com' },
    { key: 'salesforce',   name: 'Salesforce',  icon: '☁️',  tag: 'Popular',          auth: 'oauth',   help: 'developer.salesforce.com' },
    { key: 'hubspot',      name: 'HubSpot',     icon: '🔶',  tag: 'Easy Setup',       auth: 'oauth',   help: 'developers.hubspot.com' },
    { key: 'zoho',         name: 'Zoho CRM',    icon: '📊',  tag: 'Affordable',       auth: 'oauth',   help: 'zoho.com/crm/developer' },
    { key: 'pipedrive',    name: 'Pipedrive',   icon: '🎯',  tag: 'Sales Focus',      auth: 'api_key', help: 'developers.pipedrive.com' },
    { key: 'monday',       name: 'Monday.com',  icon: '📅',  tag: 'Visual',           auth: 'api_key', help: 'developer.monday.com' },
    { key: 'clickup',      name: 'ClickUp',     icon: '🚀',  tag: 'All-in-One',       auth: 'api_key', help: 'clickup.com/api' },
    { key: 'freshsales',   name: 'Freshsales',  icon: '🌿',  tag: 'AI Powered',       auth: 'api_key', help: 'developers.freshworks.com' },
    { key: 'jobber',       name: 'Jobber',      icon: '🔨',  tag: 'Field Service',    auth: 'oauth',   help: 'developer.getjobber.com' },
    { key: 'jobprogress',  name: 'JobProgress', icon: '📈',  tag: 'Contractors',      auth: 'api_key', help: 'jobprogress.com/api' },
];

// CRMs the backend actually has adapter code for. Others show "Coming soon".
const SUPPORTED_FOR_PUSH = new Set(['jobnimbus', 'acculynx', 'salesforce', 'hubspot']);

const CRMSync = () => {
    const router = useRouter();
    const [connections, setConnections] = useState([]);
    const [availability, setAvailability] = useState({});  // { acculynx: true|false, ... }
    const [loading, setLoading] = useState(true);

    // Connect modal
    const [connectFor, setConnectFor] = useState(null);   // catalogue entry
    const [apiKey, setApiKey] = useState('');
    const [connectionName, setConnectionName] = useState('');
    const [connecting, setConnecting] = useState(false);

    // ─── Load ─────────────────────────────────────────────────────────────
    const reload = useCallback(async () => {
        setLoading(true);
        try {
            // Connections + platform availability in parallel. Availability is
            // best-effort — if the endpoint errors we just assume every OAuth
            // CRM is unavailable and the card shows "Awaiting setup".
            const [connRes, availRes] = await Promise.all([
                axiosInstance.get('/crm/connections'),
                axiosInstance.get('/crm/platform-availability', { suppressErrorToast: true })
                    .catch(() => ({ data: {} })),
            ]);
            setConnections(connRes.data?.data ?? []);
            setAvailability(availRes.data ?? {});
        } catch {
            /* axios toasts */
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { reload(); }, [reload]);

    // ─── Read query params (set by OAuth callback redirect) ───────────────
    useEffect(() => {
        const url = new URL(window.location.href);
        const connected = url.searchParams.get('connected');
        const error = url.searchParams.get('error');
        const message = url.searchParams.get('message');
        if (connected) {
            toast.success(`Connected ${connected} successfully.`);
            reload();
        }
        if (error) {
            toast.error(`${error} connection failed: ${message ?? 'Unknown error'}`);
        }
        if (connected || error) {
            // Clean the URL so a refresh doesn't re-fire the toast.
            url.searchParams.delete('connected');
            url.searchParams.delete('error');
            url.searchParams.delete('message');
            url.searchParams.delete('connection_id');
            window.history.replaceState({}, '', url.toString());
        }
    }, [reload]);

    // Lookup: crm_type → first active connection (we cap at one active per type).
    const activeByType = useMemo(() => {
        const map = {};
        for (const c of connections) {
            if (c.status === 'connected' || c.status === 'pending' || c.status === 'rate_limited') {
                map[c.crm_type] = c;
            }
        }
        return map;
    }, [connections]);

    // ─── Connect handlers ────────────────────────────────────────────────
    const openConnect = (cat) => {
        if (activeByType[cat.key]) {
            // Already connected — go straight to the detail page.
            router.push(`/dashboard/crm-sync/${activeByType[cat.key].id}`);
            return;
        }
        if (!SUPPORTED_FOR_PUSH.has(cat.key)) {
            toast.info(`${cat.name} adapter is in our roadmap.`);
            return;
        }
        // OAuth CRMs need ClaimKing's platform credentials. Block here with
        // a friendly message rather than letting the OAuth start and 500.
        if (cat.auth === 'oauth' && availability[cat.key] === false) {
            toast.error(
                `${cat.name} isn't ready yet — our team is finalising the integration. Check back soon.`,
            );
            return;
        }
        setConnectFor(cat);
        setApiKey('');
        setConnectionName(cat.name);
    };

    const closeConnect = () => {
        if (connecting) return;
        setConnectFor(null);
        setApiKey('');
        setConnectionName('');
    };

    const submitApiKey = async () => {
        if (!connectFor) return;
        if (!apiKey.trim()) {
            toast.error('Please paste your API key');
            return;
        }
        setConnecting(true);
        try {
            const res = await axiosInstance.post('/crm/connections', {
                crm_type: connectFor.key,
                connection_name: connectionName.trim() || connectFor.name,
                api_key: apiKey.trim(),
            });
            toast.success(`${connectFor.name} connected.`);
            closeConnect();
            await reload();
            if (res.data?.id) router.push(`/dashboard/crm-sync/${res.data.id}`);
        } catch {
            /* axios toasts */
        } finally {
            setConnecting(false);
        }
    };

    const startOAuth = async () => {
        if (!connectFor) return;
        setConnecting(true);
        try {
            // The /authorize endpoint returns a 302 redirect — axios resolves the
            // final URL in res.request.responseURL. Easier path: do a full nav.
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
            // We still need an auth header on /authorize, so call it ourselves to
            // resolve the upstream URL, then redirect the browser there.
            const res = await axiosInstance.get(`/crm/oauth/${connectFor.key}/authorize`, {
                maxRedirects: 0,
                validateStatus: (s) => s >= 200 && s < 400,
            });
            const redirectUrl = res.data?.url ?? res.headers?.location;
            if (!redirectUrl) {
                toast.error('OAuth flow could not start — check superadmin API settings.');
                return;
            }
            window.location.href = redirectUrl;
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message;
            toast.error(msg || 'Could not start OAuth flow');
        } finally {
            setConnecting(false);
        }
    };

    const disconnect = async (conn) => {
        if (!window.confirm(`Disconnect ${conn.connection_name}? Stored credentials will be wiped.`)) return;
        try {
            await axiosInstance.delete(`/crm/connections/${conn.id}`);
            toast.success(`${conn.connection_name} disconnected`);
            reload();
        } catch {
            /* axios toasts */
        }
    };

    // ─── Render ──────────────────────────────────────────────────────────
    return (
        <div className="main-container">
            <div className="hero-section">
                <div className="hero-badge">CRM Sync</div>
                <h1 className="hero-title">Connect your CRM to ClaimKing.AI</h1>
                <p className="hero-subtitle">
                    ClaimKing isn't a CRM — it sits beside the one you already use and keeps
                    contacts, claims, and estimates in sync.
                </p>
            </div>

            {/* Current connections */}
            {connections.length > 0 && (
                <div className="crm-selection">
                    <div className="section-header">
                        <h2 className="section-title">Your connections</h2>
                        <p className="section-description">Click a connection to view sync settings, field mapping, and sync log.</p>
                    </div>
                    <div className="conn-list">
                        {connections.map((c) => {
                            const cat = CRM_CATALOGUE.find(x => x.key === c.crm_type);
                            return (
                                <div key={c.id} className="conn-card" onClick={() => router.push(`/dashboard/crm-sync/${c.id}`)}>
                                    <div className="conn-card-head">
                                        <span className="conn-card-icon">{cat?.icon ?? '🔌'}</span>
                                        <div style={{ flex: 1 }}>
                                            <div className="conn-card-name">{c.connection_name}</div>
                                            <div className="conn-card-sub">{cat?.name ?? c.crm_type}</div>
                                        </div>
                                        <span className={`conn-status conn-status-${c.status}`}>{c.status.replace('_', ' ')}</span>
                                    </div>
                                    <div className="conn-card-foot">
                                        <span>Last sync: {c.last_sync_at ? new Date(c.last_sync_at).toLocaleString() : '—'}</span>
                                        <button
                                            type="button"
                                            className="conn-disconnect"
                                            onClick={(e) => { e.stopPropagation(); disconnect(c); }}
                                            disabled={c.status === 'disconnected'}
                                        >Disconnect</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* CRM catalogue */}
            <div className="crm-selection">
                <div className="section-header">
                    <h2 className="section-title">Pick a CRM</h2>
                    <p className="section-description">Choose from our supported integrations. Most setups take 2–5 minutes.</p>
                </div>

                {loading ? (
                    <div className="crm-grid">
                        {/* Skeleton placeholders match the catalogue length so the layout
                            doesn't jump when real data lands. */}
                        {CRM_CATALOGUE.map((cat) => (
                            <div key={cat.key} className="crm-card crm-card-skeleton" aria-hidden="true">
                                <div className="skeleton-icon" />
                                <div className="skeleton-line skeleton-line-name" />
                                <div className="skeleton-line skeleton-line-tag" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="crm-grid">
                        {CRM_CATALOGUE.map((cat) => {
                            const active = activeByType[cat.key];
                            const supported = SUPPORTED_FOR_PUSH.has(cat.key);
                            const platformReady = availability[cat.key] !== false; // undefined → assume ready
                            const isAwaitingSetup = supported && cat.auth === 'oauth' && !platformReady;
                            const isComingSoon = !supported;

                            let tag = cat.tag;
                            let tagClass = 'crm-tag';
                            let className = 'crm-card';
                            let cornerLabel = null;
                            if (active) {
                                tag = 'Connected';
                                tagClass = 'crm-tag crm-tag-connected';
                                className += ' selected';
                            } else if (isAwaitingSetup) {
                                tag = 'Awaiting setup';
                                tagClass = 'crm-tag crm-tag-awaiting';
                                className += ' crm-card-awaiting';
                                cornerLabel = { text: 'SETUP', cls: 'crm-corner-awaiting' };
                            } else if (isComingSoon) {
                                tag = 'Coming soon';
                                tagClass = 'crm-tag crm-tag-soon';
                                className += ' crm-card-soon';
                                cornerLabel = { text: 'SOON', cls: 'crm-corner-soon' };
                            }

                            return (
                                <div
                                    key={cat.key}
                                    className={className}
                                    onClick={() => openConnect(cat)}
                                    title={isAwaitingSetup
                                        ? `${cat.name} integration is pending platform setup`
                                        : isComingSoon
                                        ? `${cat.name} adapter is on our roadmap`
                                        : `Connect ${cat.name}`}
                                >
                                    {cornerLabel && (
                                        <span className={`crm-corner-ribbon ${cornerLabel.cls}`}>{cornerLabel.text}</span>
                                    )}
                                    <div className="crm-icon">{cat.icon}</div>
                                    <div className="crm-name">{cat.name}</div>
                                    <div className={tagClass}>{tag}</div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Connect modal */}
            {connectFor && (
                <div className="crm-modal-overlay" onClick={closeConnect}>
                    <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="crm-modal-head">
                            <span className="crm-modal-icon">{connectFor.icon}</span>
                            <div style={{ flex: 1 }}>
                                <h3>Connect {connectFor.name}</h3>
                                <p>{connectFor.auth === 'oauth'
                                    ? `You'll be redirected to ${connectFor.name} to authorise ClaimKing.AI.`
                                    : `Paste the API key from your ${connectFor.name} settings.`}
                                </p>
                            </div>
                            <button type="button" className="crm-modal-close" onClick={closeConnect} disabled={connecting}>×</button>
                        </div>

                        <div className="crm-modal-body">
                            {connectFor.auth === 'api_key' && (
                                <>
                                    <label className="crm-field">
                                        <span>Connection name</span>
                                        <input
                                            type="text"
                                            value={connectionName}
                                            onChange={(e) => setConnectionName(e.target.value)}
                                            placeholder={connectFor.name}
                                        />
                                    </label>
                                    <label className="crm-field">
                                        <span>API key</span>
                                        <input
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            placeholder="Paste your API key"
                                            autoComplete="off"
                                        />
                                    </label>
                                    <p className="crm-hint">
                                        Find this in {connectFor.name} → Settings → API. Stored encrypted at rest.
                                        Docs: <a href={`https://${connectFor.help}`} target="_blank" rel="noreferrer">{connectFor.help}</a>
                                    </p>
                                </>
                            )}
                            {connectFor.auth === 'oauth' && (
                                <p className="crm-hint">
                                    Clicking <strong>Continue to {connectFor.name}</strong> opens {connectFor.name}'s login page.
                                    After you approve, we'll bring you back here and your sync will be ready.
                                </p>
                            )}
                        </div>

                        <div className="crm-modal-foot">
                            <button type="button" className="crm-btn-secondary" onClick={closeConnect} disabled={connecting}>Cancel</button>
                            {connectFor.auth === 'api_key' ? (
                                <button type="button" className="crm-btn-primary" onClick={submitApiKey} disabled={connecting}>
                                    {connecting ? 'Connecting…' : 'Connect'}
                                </button>
                            ) : (
                                <button type="button" className="crm-btn-primary" onClick={startOAuth} disabled={connecting}>
                                    {connecting ? 'Redirecting…' : `Continue to ${connectFor.name}`}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CRMSync;
