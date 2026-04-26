'use client';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import axiosInstance from '../../../lib/axiosInstance.js';
import './emails.css';

const PROVIDERS = [
    { id: 'gmail',   name: 'Gmail',                 logo: 'gmail'   },
    { id: 'outlook', name: 'Outlook / Microsoft 365', logo: 'outlook' },
];

const SYNC_FREQUENCIES = [
    { value: 5,  label: 'Every 5 minutes' },
    { value: 15, label: 'Every 15 minutes' },
    { value: 30, label: 'Every 30 minutes' },
    { value: 60, label: 'Every hour' },
];

const SCAN_HISTORY = [
    { value: 7,    label: 'Last 7 days' },
    { value: 30,   label: 'Last 30 days' },
    { value: 90,   label: 'Last 90 days' },
    { value: 3650, label: 'All emails' },
];

const DEFAULT_SETTINGS = {
    monitored_domains: [
        '@statefarm.com', '@allstate.com', '@libertymutual.com',
        '@nationwide.com', '@travelers.com', '@progressive.com',
        '@usaa.com', '@erie.com', '@farmers.com',
    ],
    custom_domains: [],
    keywords: ['claim', 'estimate', 'adjuster', 'inspection', 'supplement', 'denial', 'EOB', 'scope of loss'],
    sync_frequency_minutes: 15,
    scan_history_days: 30,
    auto_match: true,
    notify_on_unassigned: true,
    notify_on_denial: true,
};

const matchMethodLabel = {
    client_email:  'Email match',
    policy_number: 'Policy # match',
    address_match: 'Address match',
    name_match:    'Name match',
    manual:        'Manual',
};

const fmtRelative = (iso) => {
    if (!iso) return 'Never';
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60_000) return 'Just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr ago`;
    if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} days ago`;
    return new Date(iso).toLocaleDateString();
};

const ProviderLogo = ({ logo }) => {
    if (logo === 'gmail') {
        return (
            <div className="gmail-logo">
                <span style={{ color: '#ea4335' }}>G</span>
                <span style={{ color: '#fbbc05' }}>m</span>
                <span style={{ color: '#34a853' }}>a</span>
                <span style={{ color: '#4285f4' }}>i</span>
                <span style={{ color: '#ea4335' }}>l</span>
            </div>
        );
    }
    return <div className="outlook-logo">Outlk</div>;
};

const EmailAssistant = () => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [activeTab, setActiveTab]       = useState('connect');
    const [summary, setSummary]           = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [isSyncing, setIsSyncing]       = useState(false);
    const [copied, setCopied]             = useState(false);
    const [pendingProvider, setPendingProvider] = useState(null); // 'gmail' | 'outlook'

    // Activity tab state
    const [messages, setMessages]                 = useState([]);
    const [messagesLoading, setMessagesLoading]   = useState(false);
    const [statusFilter, setStatusFilter]         = useState('all');
    const [companyFilter, setCompanyFilter]       = useState('');
    const [query, setQuery]                       = useState('');
    const [page, setPage]                         = useState(1);
    const [total, setTotal]                       = useState(0);
    const pageSize = 25;

    // Settings tab state
    const [settings, setSettings]                 = useState(DEFAULT_SETTINGS);
    const [settingsLoading, setSettingsLoading]   = useState(false);
    const [savingSettings, setSavingSettings]     = useState(false);
    const [newKeyword, setNewKeyword]             = useState('');
    const [newDomain, setNewDomain]               = useState('');

    // ── load summary on mount + handle OAuth redirect feedback ────────────
    const loadSummary = useCallback(async () => {
        setSummaryLoading(true);
        try {
            const { data } = await axiosInstance.get('/email/summary');
            setSummary(data);
        } catch {
            // surfaced via interceptor
        } finally {
            setSummaryLoading(false);
        }
    }, []);

    useEffect(() => { loadSummary(); }, [loadSummary]);

    useEffect(() => {
        const gmail = searchParams.get('gmail');
        const outlook = searchParams.get('outlook');
        const errMsg = searchParams.get('message');
        if (gmail === 'connected') {
            toast.success('Gmail connected — syncing your inbox now.');
            router.replace('/dashboard/emails');
            loadSummary();
        } else if (gmail === 'error') {
            toast.error(errMsg || 'Gmail connection failed');
            router.replace('/dashboard/emails');
        }
        if (outlook === 'connected') {
            toast.success('Outlook connected — syncing your inbox now.');
            router.replace('/dashboard/emails');
            loadSummary();
        } else if (outlook === 'error') {
            toast.error(errMsg || 'Outlook connection failed');
            router.replace('/dashboard/emails');
        }
    }, [searchParams, router, loadSummary]);

    // ── load messages whenever activity tab is open or filters change ─────
    const loadMessages = useCallback(async () => {
        setMessagesLoading(true);
        try {
            const { data } = await axiosInstance.get('/email/messages', {
                params: {
                    status: statusFilter,
                    company: companyFilter || undefined,
                    query: query || undefined,
                    page,
                    pageSize,
                },
            });
            setMessages(data.data || []);
            setTotal(data.total || 0);
        } catch {/* interceptor */}
        finally { setMessagesLoading(false); }
    }, [statusFilter, companyFilter, query, page]);

    useEffect(() => {
        if (activeTab === 'activity') loadMessages();
    }, [activeTab, loadMessages]);

    // ── load settings when settings tab is opened ─────────────────────────
    const loadSettings = useCallback(async () => {
        setSettingsLoading(true);
        try {
            const { data } = await axiosInstance.get('/email/settings');
            if (data) setSettings({ ...DEFAULT_SETTINGS, ...data });
        } catch {/* interceptor */}
        finally { setSettingsLoading(false); }
    }, []);

    useEffect(() => {
        if (activeTab === 'settings') loadSettings();
    }, [activeTab, loadSettings]);

    // ── connect / disconnect ──────────────────────────────────────────────
    const handleConnect = async (providerId) => {
        try {
            setPendingProvider(providerId);
            const { data } = await axiosInstance.get(`/${providerId}/oauth-url`);
            if (data?.url) window.location.href = data.url;
            else toast.error('Failed to start authorization');
        } catch {
            setPendingProvider(null);
        }
    };

    const handleDisconnect = async (providerId) => {
        const provider = PROVIDERS.find(p => p.id === providerId);
        if (!confirm(`Disconnect ${provider?.name}?`)) return;
        try {
            await axiosInstance.post(`/${providerId}/disconnect`);
            toast.success(`${provider?.name} disconnected`);
            loadSummary();
        } catch {/* interceptor */}
    };

    const handleSyncAll = async () => {
        if (!summary) return;
        setIsSyncing(true);
        const calls = [];
        if (summary.gmail?.configured)   calls.push(axiosInstance.post('/gmail/sync-now'));
        if (summary.outlook?.configured) calls.push(axiosInstance.post('/outlook/sync-now'));
        try {
            const results = await Promise.allSettled(calls);
            const saved = results
                .filter(r => r.status === 'fulfilled')
                .reduce((acc, r) => acc + (r.value?.data?.saved ?? 0), 0);
            toast.success(`Sync complete — ${saved} new email${saved === 1 ? '' : 's'} found`);
            loadSummary();
            if (activeTab === 'activity') loadMessages();
        } catch {/* interceptor */}
        finally { setIsSyncing(false); }
    };

    const handleCopyEmail = async () => {
        if (!summary?.forwardingAddress) return;
        try {
            await navigator.clipboard.writeText(summary.forwardingAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {/* ignore */}
    };

    // ── settings actions ──────────────────────────────────────────────────
    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            await axiosInstance.post('/email/settings', settings);
            toast.success('Settings saved');
        } catch {/* interceptor */}
        finally { setSavingSettings(false); }
    };

    const toggleMonitoredDomain = (domain) => {
        setSettings(prev => ({
            ...prev,
            monitored_domains: prev.monitored_domains.includes(domain)
                ? prev.monitored_domains.filter(d => d !== domain)
                : [...prev.monitored_domains, domain],
        }));
    };

    const addKeyword = () => {
        const k = newKeyword.trim();
        if (!k) return;
        if (settings.keywords.includes(k)) return;
        setSettings(prev => ({ ...prev, keywords: [...prev.keywords, k] }));
        setNewKeyword('');
    };

    const removeKeyword = (k) =>
        setSettings(prev => ({ ...prev, keywords: prev.keywords.filter(x => x !== k) }));

    const addCustomDomain = () => {
        let d = newDomain.trim().toLowerCase();
        if (!d) return;
        if (!d.startsWith('@')) d = '@' + d;
        if (settings.custom_domains.includes(d)) return;
        setSettings(prev => ({ ...prev, custom_domains: [...prev.custom_domains, d] }));
        setNewDomain('');
    };

    const removeCustomDomain = (d) =>
        setSettings(prev => ({ ...prev, custom_domains: prev.custom_domains.filter(x => x !== d) }));

    // ── per-message actions ───────────────────────────────────────────────
    const handleAssignPrompt = async (messageId) => {
        const clientId = prompt('Enter Client ID to assign this email to:');
        if (!clientId) return;
        try {
            await axiosInstance.post(`/email/messages/${messageId}/assign`, { clientId });
            toast.success('Email assigned to client');
            loadMessages();
            loadSummary();
        } catch {/* interceptor */}
    };

    const handleIgnore = async (messageId) => {
        if (!confirm('Ignore this email? It will be hidden from the inbox.')) return;
        try {
            await axiosInstance.post(`/email/messages/${messageId}/ignore`);
            toast.success('Email ignored');
            loadMessages();
            loadSummary();
        } catch {/* interceptor */}
    };

    // ── derived data ──────────────────────────────────────────────────────
    const connectedCount = useMemo(() => {
        if (!summary) return 0;
        return (summary.gmail?.configured ? 1 : 0) + (summary.outlook?.configured ? 1 : 0);
    }, [summary]);

    const companies = useMemo(() => {
        const set = new Set();
        messages.forEach(m => m.matched_company && set.add(m.matched_company));
        return Array.from(set).sort();
    }, [messages]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const isProviderConnected = (id) =>
        id === 'gmail'   ? !!summary?.gmail?.configured :
        id === 'outlook' ? !!summary?.outlook?.configured : false;

    const providerEmail = (id) =>
        id === 'gmail'   ? summary?.gmail?.emailAddress :
        id === 'outlook' ? summary?.outlook?.emailAddress : null;

    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <div className="header-left">
                    <div className="email-icon">✉</div>
                    <div className="header-content">
                        <h1>Email AI Assistant</h1>
                        <p>Connect Gmail or Outlook to automatically import insurance emails</p>
                    </div>
                </div>
                <button
                    className="sync-btn"
                    onClick={handleSyncAll}
                    disabled={isSyncing || connectedCount === 0}
                >
                    {isSyncing ? '⏳ Syncing...' : '🔄 Sync All'}
                </button>
            </div>

            <div className="container">
                {/* Stats Grid */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-label">Connected</div>
                        <div className="stat-value">
                            {summaryLoading ? '—' : `${connectedCount}/2`}
                            <span className="stat-icon">🔗</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Scanned Today</div>
                        <div className="stat-value">
                            {summaryLoading ? '—' : (summary?.emailsScannedToday ?? 0)}
                            <span className="stat-icon">📧</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Auto-Logged</div>
                        <div className="stat-value">
                            {summaryLoading ? '—' : (summary?.claimsAutoLogged ?? 0)}
                            <span className="stat-icon">📋</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Unassigned</div>
                        <div className="stat-value">
                            {summaryLoading ? '—' : (summary?.unassignedCount ?? 0)}
                            <span className="stat-icon">⚠️</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Last Sync</div>
                        <div className="stat-value" style={{ fontSize: '1rem' }}>
                            {summaryLoading ? '—' : fmtRelative(summary?.lastSyncAt)}
                            <span className="stat-icon">🔄</span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="tabs-container">
                    <div className="tab-buttons">
                        <button className={`tab-btn ${activeTab === 'connect' ? 'active' : ''}`} onClick={() => setActiveTab('connect')}>
                            Connect Accounts
                        </button>
                        <button className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>
                            Email Activity
                            {summary?.unassignedCount > 0 && (
                                <span className="tab-badge">{summary.unassignedCount}</span>
                            )}
                        </button>
                        <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
                            Settings
                        </button>
                    </div>

                    {/* ── Connect Tab ───────────────────────────────────────── */}
                    {activeTab === 'connect' && (
                        <div className="tab-content active">
                            <div className="email-providers">
                                {PROVIDERS.map(p => {
                                    const connected = isProviderConnected(p.id);
                                    return (
                                        <div key={p.id} className="provider-card">
                                            <div className="provider-logo">
                                                <ProviderLogo logo={p.logo} />
                                            </div>
                                            <div className="provider-name">{p.name}</div>
                                            {connected && (
                                                <div className="provider-account">
                                                    {providerEmail(p.id) || 'Connected'}
                                                </div>
                                            )}
                                            <button
                                                className={`connect-provider-btn ${connected ? 'connected' : ''}`}
                                                onClick={() => connected ? handleDisconnect(p.id) : handleConnect(p.id)}
                                                disabled={pendingProvider === p.id}
                                            >
                                                {pendingProvider === p.id
                                                    ? 'Opening…'
                                                    : connected ? 'Disconnect' : 'Connect'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="forward-box">
                                <div className="forward-box-icon">✉</div>
                                <div className="forward-content">
                                    <div className="forward-label">Or forward emails directly</div>
                                    <div className="forward-label" style={{ fontWeight: 400 }}>
                                        Set up automatic forwarding or BCC insurance emails to:
                                    </div>
                                    <span className="forward-email">
                                        {summary?.forwardingAddress || 'Loading…'}
                                    </span>
                                </div>
                                <button
                                    className="copy-btn"
                                    onClick={handleCopyEmail}
                                    style={copied ? { background: '#dcfce7', borderColor: '#86efac' } : {}}
                                    disabled={!summary?.forwardingAddress}
                                >
                                    {copied ? '✅ Copied!' : '📋 Copy'}
                                </button>
                            </div>

                            <div className="benefits-grid">
                                <div className="benefit-card">
                                    <span className="benefit-icon">✓</span>
                                    <div className="benefit-text">
                                        <strong>Never miss a claim</strong><br />
                                        24/7 inbox scanning every {settings.sync_frequency_minutes ?? 15} minutes
                                    </div>
                                </div>
                                <div className="benefit-card">
                                    <span className="benefit-icon">✓</span>
                                    <div className="benefit-text">
                                        <strong>Auto-matched to clients</strong><br />
                                        Linked by email, policy number, or address
                                    </div>
                                </div>
                                <div className="benefit-card">
                                    <span className="benefit-icon">✓</span>
                                    <div className="benefit-text">
                                        <strong>Read-only access</strong><br />
                                        We never send or modify your emails
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Activity Tab ──────────────────────────────────────── */}
                    {activeTab === 'activity' && (
                        <div className="tab-content active">
                            <div className="activity-toolbar">
                                <div className="activity-search">
                                    <input
                                        placeholder="Search sender, subject, body…"
                                        value={query}
                                        onChange={e => { setQuery(e.target.value); setPage(1); }}
                                    />
                                </div>
                                <select
                                    className="dropdown-select"
                                    value={statusFilter}
                                    onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                                >
                                    <option value="all">All emails</option>
                                    <option value="matched">Matched</option>
                                    <option value="unassigned">Unassigned</option>
                                </select>
                                <select
                                    className="dropdown-select"
                                    value={companyFilter}
                                    onChange={e => { setCompanyFilter(e.target.value); setPage(1); }}
                                >
                                    <option value="">All companies</option>
                                    {companies.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            {messagesLoading ? (
                                <div className="empty-state">
                                    <div className="empty-icon">⏳</div>
                                    <div className="empty-title">Loading…</div>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-icon">📥</div>
                                    <div className="empty-title">No emails found</div>
                                    <div className="empty-text">
                                        {connectedCount === 0
                                            ? 'Connect Gmail or Outlook on the Connect Accounts tab.'
                                            : 'Try a sync — your inbox will be scanned for insurance emails.'}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="email-list">
                                        {messages.map(m => (
                                            <div key={m.id} className={`email-row ${m.is_unread ? 'unread' : ''}`}>
                                                <div className="email-row-dot" />
                                                <div className="email-row-from">
                                                    <div className="email-row-name">
                                                        {m.from_name || m.from_email}
                                                    </div>
                                                    {m.matched_company && (
                                                        <span className="company-tag">{m.matched_company}</span>
                                                    )}
                                                </div>
                                                <div className="email-row-body">
                                                    <div className="email-row-subject">{m.subject || '(no subject)'}</div>
                                                    <div className="email-row-snippet">{m.snippet}</div>
                                                </div>
                                                <div className="email-row-meta">
                                                    {m.matched_client ? (
                                                        <>
                                                            <div className="meta-client">{m.matched_client.full_name}</div>
                                                            <div className="meta-method">
                                                                {matchMethodLabel[m.match_method] || 'Auto'}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="meta-unassigned">Unassigned</div>
                                                            <div className="meta-actions">
                                                                <button onClick={() => handleAssignPrompt(m.id)}>Assign</button>
                                                                <button onClick={() => handleIgnore(m.id)}>Ignore</button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="email-row-time">
                                                    <div>{fmtRelative(m.received_at)}</div>
                                                    <span className={`source-badge source-${m.source}`}>{m.source}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {totalPages > 1 && (
                                        <div className="pagination">
                                            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
                                            <span>Page {page} of {totalPages}</span>
                                            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* ── Settings Tab ──────────────────────────────────────── */}
                    {activeTab === 'settings' && (
                        <div className="tab-content active">
                            {settingsLoading ? (
                                <div className="empty-state">
                                    <div className="empty-icon">⏳</div>
                                    <div className="empty-title">Loading settings…</div>
                                </div>
                            ) : (
                                <>
                                    <div className="settings-section">
                                        <h3 className="settings-title">Insurance Companies to Monitor</h3>
                                        <p className="settings-description">
                                            Emails from these domains are auto-flagged as claim-related.
                                        </p>
                                        <div className="checkbox-grid">
                                            {DEFAULT_SETTINGS.monitored_domains.map(domain => {
                                                const enabled = settings.monitored_domains.includes(domain);
                                                const label = domain.replace('@', '').replace(/\.com$/, '');
                                                return (
                                                    <div key={domain} className="checkbox-item">
                                                        <input
                                                            type="checkbox"
                                                            id={domain}
                                                            checked={enabled}
                                                            onChange={() => toggleMonitoredDomain(domain)}
                                                        />
                                                        <label htmlFor={domain}>
                                                            {label.charAt(0).toUpperCase() + label.slice(1)}
                                                            <span className="domain-mono"> ({domain})</span>
                                                        </label>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="settings-section">
                                        <h3 className="settings-title">Custom Domains</h3>
                                        <p className="settings-description">
                                            Add additional sender domains (e.g. local adjusters, regional carriers).
                                        </p>
                                        {settings.custom_domains.length > 0 && (
                                            <div className="domain-list">
                                                {settings.custom_domains.map(d => (
                                                    <div key={d} className="domain-row">
                                                        <span className="domain-mono">{d}</span>
                                                        <button className="domain-remove" onClick={() => removeCustomDomain(d)}>×</button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="domain-add">
                                            <input
                                                placeholder="@example-insurance.com"
                                                value={newDomain}
                                                onChange={e => setNewDomain(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && addCustomDomain()}
                                            />
                                            <button onClick={addCustomDomain}>+ Add</button>
                                        </div>
                                    </div>

                                    <div className="settings-section">
                                        <h3 className="settings-title">Detection Keywords</h3>
                                        <p className="settings-description">
                                            Emails with these words in subject or body get flagged as claim-related.
                                        </p>
                                        <div className="keyword-tags">
                                            {settings.keywords.map(k => (
                                                <span key={k} className="keyword-tag">
                                                    {k}
                                                    <button className="keyword-remove" onClick={() => removeKeyword(k)}>×</button>
                                                </span>
                                            ))}
                                        </div>
                                        <div className="domain-add" style={{ marginTop: '0.75rem' }}>
                                            <input
                                                placeholder="Add keyword (e.g. roof damage)"
                                                value={newKeyword}
                                                onChange={e => setNewKeyword(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && addKeyword()}
                                            />
                                            <button onClick={addKeyword}>+ Add</button>
                                        </div>
                                    </div>

                                    <div className="settings-section">
                                        <h3 className="settings-title">Sync Settings</h3>
                                        <div className="settings-dropdowns">
                                            <div className="dropdown-group">
                                                <label className="dropdown-label">Sync Frequency</label>
                                                <select
                                                    className="dropdown-select"
                                                    value={settings.sync_frequency_minutes}
                                                    onChange={e => setSettings(prev => ({ ...prev, sync_frequency_minutes: Number(e.target.value) }))}
                                                >
                                                    {SYNC_FREQUENCIES.map(o => (
                                                        <option key={o.value} value={o.value}>{o.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="dropdown-group">
                                                <label className="dropdown-label">Scan History</label>
                                                <select
                                                    className="dropdown-select"
                                                    value={settings.scan_history_days}
                                                    onChange={e => setSettings(prev => ({ ...prev, scan_history_days: Number(e.target.value) }))}
                                                >
                                                    {SCAN_HISTORY.map(o => (
                                                        <option key={o.value} value={o.value}>{o.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="settings-section">
                                        <h3 className="settings-title">Automation</h3>
                                        <div className="toggle-row">
                                            <div>
                                                <div className="toggle-title">Auto-match to clients</div>
                                                <div className="toggle-desc">Use sender, policy number, name, and address to link emails to clients.</div>
                                            </div>
                                            <label className="switch">
                                                <input
                                                    type="checkbox"
                                                    checked={settings.auto_match}
                                                    onChange={e => setSettings(prev => ({ ...prev, auto_match: e.target.checked }))}
                                                />
                                                <span className="slider"></span>
                                            </label>
                                        </div>
                                        <div className="toggle-row">
                                            <div>
                                                <div className="toggle-title">Notify on unassigned emails</div>
                                                <div className="toggle-desc">Get an alert when an email can't be auto-matched.</div>
                                            </div>
                                            <label className="switch">
                                                <input
                                                    type="checkbox"
                                                    checked={settings.notify_on_unassigned}
                                                    onChange={e => setSettings(prev => ({ ...prev, notify_on_unassigned: e.target.checked }))}
                                                />
                                                <span className="slider"></span>
                                            </label>
                                        </div>
                                        <div className="toggle-row">
                                            <div>
                                                <div className="toggle-title">Notify on claim denials</div>
                                                <div className="toggle-desc">Send an alert whenever an email is detected with denial language.</div>
                                            </div>
                                            <label className="switch">
                                                <input
                                                    type="checkbox"
                                                    checked={settings.notify_on_denial}
                                                    onChange={e => setSettings(prev => ({ ...prev, notify_on_denial: e.target.checked }))}
                                                />
                                                <span className="slider"></span>
                                            </label>
                                        </div>
                                    </div>

                                    <button
                                        className="save-settings-btn"
                                        onClick={handleSaveSettings}
                                        disabled={savingSettings}
                                    >
                                        <span>💾</span>
                                        {savingSettings ? 'Saving…' : 'Save Settings'}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmailAssistant;
