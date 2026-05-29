'use client';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import axiosInstance from '../../../lib/axiosInstance.js';
import { createClient } from '@/lib/supabase/client';
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

    const [isAdmin, setIsAdmin]           = useState(false);
    const [roleLoading, setRoleLoading]   = useState(true);
    const [activeTab, setActiveTab]       = useState('connect');
    const [summary, setSummary]           = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [isSyncing, setIsSyncing]       = useState(false);
    const [copied, setCopied]             = useState(false);
    const [pendingProvider, setPendingProvider] = useState(null); // 'gmail' | 'outlook'

    // Activity tab state
    const [activityChannel, setActivityChannel]   = useState('email'); // 'email' | 'sms'
    const [messages, setMessages]                 = useState([]);
    const [messagesLoading, setMessagesLoading]   = useState(false);
    const [smsMessages, setSmsMessages]           = useState([]);
    const [smsMsgLoading, setSmsMsgLoading]       = useState(false);
    const [smsMsgPage, setSmsMsgPage]             = useState(1);
    const [smsMsgTotal, setSmsMsgTotal]           = useState(0);
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

    // SMS Setup tab state
    const [smsConfigured, setSmsConfigured]       = useState(true);
    const [smsNumber, setSmsNumber]               = useState(null);
    const [smsLoading, setSmsLoading]             = useState(false);
    const [areaCode, setAreaCode]                 = useState('');
    const [availableNumbers, setAvailableNumbers] = useState([]);
    const [searchingNumbers, setSearchingNumbers] = useState(false);
    const [provisioning, setProvisioning]         = useState(null); // phoneNumber being bought
    const [releasing, setReleasing]               = useState(false);
    const [smsTo, setSmsTo]                        = useState('');
    const [smsBody, setSmsBody]                    = useState('');
    const [sendingSms, setSendingSms]             = useState(false);
    const [smsCopied, setSmsCopied]               = useState(false);

    // Campaigns tab state
    const [campaigns, setCampaigns]               = useState([]);
    const [campaignMetrics, setCampaignMetrics]   = useState(null);
    const [campaignsLoading, setCampaignsLoading] = useState(false);
    const [builderOpen, setBuilderOpen]           = useState(false);
    const [editingCampaign, setEditingCampaign]   = useState(null); // full campaign or null
    const [savingCampaign, setSavingCampaign]     = useState(false);
    const [generatingCopy, setGeneratingCopy]     = useState(false);
    const [segmentPreview, setSegmentPreview]     = useState(null);

    // Reply composer (Activity tab) — keyed by message id
    const [replyOpenId, setReplyOpenId]           = useState(null);
    const [replyText, setReplyText]               = useState('');
    const [replySending, setReplySending]         = useState(false);

    // Read-only monitoring info (for non-admins) — pulled from /email/summary
    // so users can see what the admin has configured without exposing the
    // editable settings endpoint.
    const monitoringInfo = summary?.monitoring || null;

    // Expand/collapse map for email rows (id -> bool)
    const [expandedRows, setExpandedRows]         = useState({});

    // Draft reply handed off from Policy Analysis ("Generate Reply").
    const [replyDraft, setReplyDraft]             = useState(null);
    const [replyCopied, setReplyCopied]           = useState(false);
    const toggleExpand = (id) =>
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));

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

    // ── load current user's role to gate admin-only UI ────────────────────
    useEffect(() => {
        (async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                // email_settings is a GLOBAL singleton managed by the platform owner
                // (ClaimKing internal team). Company admins do NOT manage it — only
                // role='superadmin' can edit. Backend RolesGuard enforces the same.
                setIsAdmin(profile?.role === 'superadmin');
            } catch {/* non-admin by default */}
            finally { setRoleLoading(false); }
        })();
    }, []);

    // If a non-admin somehow lands on the settings tab, bounce them back.
    useEffect(() => {
        if (!roleLoading && !isAdmin && activeTab === 'settings') {
            setActiveTab('connect');
        }
    }, [roleLoading, isAdmin, activeTab]);

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

    // Build a prefilled reply draft when arriving from Policy Analysis via
    // ?draft_analysis=<id>. The Email Assistant has no compose pipeline yet,
    // so we surface a copy-able draft composed from the analysis findings.
    useEffect(() => {
        const analysisId = searchParams.get('draft_analysis');
        if (!analysisId) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await axiosInstance.get(`/policy-analyses/${analysisId}`, { suppressErrorToast: true });
                if (cancelled) return;
                const a = res.data?.data;
                if (!a) return;
                const ed = a.extracted_data || {};
                const lines = [];
                lines.push(`Re: ${ed.claim_number ? `Claim #${ed.claim_number}` : 'Insurance claim'}${a.detected_carrier ? ` — ${a.detected_carrier}` : ''}`);
                lines.push('');
                lines.push('To whom it may concern,');
                lines.push('');
                if (a.summary) { lines.push(a.summary); lines.push(''); }
                if (a.document_type === 'denial' && Array.isArray(ed.grounds)) {
                    const challenges = ed.grounds.filter((g) => g.challengeable && g.challenge_note);
                    if (challenges.length) {
                        lines.push('We respectfully dispute the stated grounds for denial:');
                        challenges.forEach((g) => lines.push(`• ${g.code || 'Ground'}: ${g.challenge_note}`));
                        lines.push('');
                    }
                }
                const actions = Array.isArray(a.suggested_actions) ? a.suggested_actions : [];
                if (actions.length) {
                    lines.push('We respectfully request the following:');
                    actions.forEach((s) => lines.push(`• ${s.title}${s.detail ? ` — ${s.detail}` : ''}`));
                    lines.push('');
                }
                lines.push('Please confirm receipt and advise on next steps.');
                lines.push('');
                lines.push('Sincerely,');
                setReplyDraft({ analysisId, text: lines.join('\n') });
                setActiveTab('activity');
                router.replace('/dashboard/emails');
            } catch { /* suppressed */ }
        })();
        return () => { cancelled = true; };
    }, [searchParams, router]);

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
        if (activeTab === 'activity' && activityChannel === 'email') loadMessages();
    }, [activeTab, activityChannel, loadMessages]);

    const loadSmsMessages = useCallback(async () => {
        setSmsMsgLoading(true);
        try {
            const { data } = await axiosInstance.get('/sms/messages', {
                params: {
                    status: statusFilter,
                    query: query || undefined,
                    page: smsMsgPage,
                    pageSize,
                },
            });
            setSmsMessages(data.data || []);
            setSmsMsgTotal(data.total || 0);
        } catch {/* interceptor */}
        finally { setSmsMsgLoading(false); }
    }, [statusFilter, query, smsMsgPage]);

    useEffect(() => {
        if (activeTab === 'activity' && activityChannel === 'sms') loadSmsMessages();
    }, [activeTab, activityChannel, loadSmsMessages]);

    const handleSmsAssignPrompt = async (messageId) => {
        const clientId = prompt('Enter Client ID to assign this text to:');
        if (!clientId) return;
        try {
            await axiosInstance.post(`/sms/messages/${messageId}/assign`, { clientId });
            toast.success('Text assigned to client');
            loadSmsMessages();
        } catch {/* interceptor */}
    };

    const handleSmsIgnore = async (messageId) => {
        if (!confirm('Ignore this text? It will be hidden from the list.')) return;
        try {
            await axiosInstance.post(`/sms/messages/${messageId}/ignore`);
            toast.success('Text ignored');
            loadSmsMessages();
        } catch {/* interceptor */}
    };

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
        if (activeTab === 'settings' && isAdmin) loadSettings();
    }, [activeTab, loadSettings, isAdmin]);

    // ── SMS Setup ─────────────────────────────────────────────────────────
    const loadSmsNumber = useCallback(async () => {
        setSmsLoading(true);
        try {
            const { data } = await axiosInstance.get('/sms/number');
            setSmsConfigured(data?.configured ?? false);
            setSmsNumber(data?.number ?? null);
        } catch {/* interceptor */}
        finally { setSmsLoading(false); }
    }, []);

    useEffect(() => {
        if (activeTab === 'sms') loadSmsNumber();
    }, [activeTab, loadSmsNumber]);

    const searchSmsNumbers = async () => {
        setSearchingNumbers(true);
        setAvailableNumbers([]);
        try {
            const { data } = await axiosInstance.get('/sms/available', {
                params: { areaCode: areaCode.trim() || undefined },
            });
            setAvailableNumbers(data?.data || []);
            if (!data?.data?.length) toast.message('No numbers found for that area code — try another.');
        } catch {/* interceptor */}
        finally { setSearchingNumbers(false); }
    };

    const provisionNumber = async (phoneNumber) => {
        setProvisioning(phoneNumber);
        try {
            await axiosInstance.post('/sms/provision', { phoneNumber });
            toast.success('SMS number provisioned');
            setAvailableNumbers([]);
            loadSmsNumber();
        } catch {/* interceptor */}
        finally { setProvisioning(null); }
    };

    const releaseNumber = async () => {
        if (!smsNumber) return;
        if (!confirm(`Release ${smsNumber.phone_number}? Incoming texts to it will stop. This cannot be undone.`)) return;
        setReleasing(true);
        try {
            await axiosInstance.post('/sms/release', { numberId: smsNumber.id });
            toast.success('SMS number released');
            loadSmsNumber();
        } catch {/* interceptor */}
        finally { setReleasing(false); }
    };

    const sendTestSms = async () => {
        if (!smsTo.trim() || !smsBody.trim()) return;
        setSendingSms(true);
        try {
            await axiosInstance.post('/sms/send', { to: smsTo.trim(), body: smsBody.trim() });
            toast.success('SMS sent');
            setSmsBody('');
        } catch {/* interceptor */}
        finally { setSendingSms(false); }
    };

    const handleCopySmsNumber = async () => {
        if (!smsNumber?.phone_number) return;
        try {
            await navigator.clipboard.writeText(smsNumber.phone_number);
            setSmsCopied(true);
            setTimeout(() => setSmsCopied(false), 2000);
        } catch {/* ignore */}
    };

    // ── Campaigns ─────────────────────────────────────────────────────────
    const loadCampaigns = useCallback(async () => {
        setCampaignsLoading(true);
        try {
            const [list, metrics] = await Promise.all([
                axiosInstance.get('/email-campaigns'),
                axiosInstance.get('/email-campaigns/metrics'),
            ]);
            setCampaigns(list.data?.data || []);
            setCampaignMetrics(metrics.data || null);
        } catch {/* interceptor */}
        finally { setCampaignsLoading(false); }
    }, []);

    useEffect(() => {
        if (activeTab === 'campaigns') loadCampaigns();
    }, [activeTab, loadCampaigns]);

    const blankCampaign = () => ({
        name: '',
        type: 'blast',
        trigger_event: 'claim_status_completed',
        segment_filter: { all: true },
        schedule: {},
        from_name: '',
        reply_to: '',
        steps: [{ step_order: 0, delay_hours: 0, subject: '', body_text: '' }],
    });

    const openBuilder = async (id) => {
        if (!id) { setEditingCampaign(blankCampaign()); setSegmentPreview(null); setBuilderOpen(true); return; }
        try {
            const { data } = await axiosInstance.get(`/email-campaigns/${id}`);
            setEditingCampaign({
                ...data,
                steps: data.steps?.length ? data.steps : [{ step_order: 0, delay_hours: 0, subject: '', body_text: '' }],
            });
            setSegmentPreview(null);
            setBuilderOpen(true);
        } catch {/* interceptor */}
    };

    const updateCampaignField = (field, value) =>
        setEditingCampaign(prev => ({ ...prev, [field]: value }));

    const updateStep = (idx, field, value) =>
        setEditingCampaign(prev => {
            const steps = [...prev.steps];
            steps[idx] = { ...steps[idx], [field]: value };
            return { ...prev, steps };
        });

    const addStep = () =>
        setEditingCampaign(prev => ({
            ...prev,
            steps: [...prev.steps, { step_order: prev.steps.length, delay_hours: 24, subject: '', body_text: '' }],
        }));

    const removeStep = (idx) =>
        setEditingCampaign(prev => ({ ...prev, steps: prev.steps.filter((_, i) => i !== idx) }));

    const saveCampaign = async () => {
        if (!editingCampaign?.name?.trim()) { toast.error('Campaign name is required'); return; }
        setSavingCampaign(true);
        try {
            await axiosInstance.post('/email-campaigns', editingCampaign);
            toast.success('Campaign saved');
            setBuilderOpen(false);
            setEditingCampaign(null);
            loadCampaigns();
        } catch {/* interceptor */}
        finally { setSavingCampaign(false); }
    };

    const launchCampaign = async (id) => {
        if (!confirm('Launch this campaign? Emails will be queued for the selected audience.')) return;
        try {
            const { data } = await axiosInstance.post(`/email-campaigns/${id}/launch`);
            toast.success(data?.mode === 'triggered' ? 'Triggered campaign activated' : `Campaign launched — ${data?.enrolled ?? 0} enrolled`);
            loadCampaigns();
        } catch {/* interceptor */}
    };

    const pauseCampaign = async (id, paused) => {
        try {
            await axiosInstance.post(`/email-campaigns/${id}/pause`, { paused });
            toast.success(paused ? 'Campaign paused' : 'Campaign resumed');
            loadCampaigns();
        } catch {/* interceptor */}
    };

    const deleteCampaign = async (id) => {
        if (!confirm('Delete this campaign? This cannot be undone.')) return;
        try {
            await axiosInstance.delete(`/email-campaigns/${id}`);
            toast.success('Campaign deleted');
            loadCampaigns();
        } catch {/* interceptor */}
    };

    const generateCopy = async () => {
        const idx = editingCampaign.steps.length - 1;
        const promptText = prompt('Describe the email you want (e.g. "friendly free roof inspection offer for new storm-damage leads"):');
        if (!promptText) return;
        setGeneratingCopy(true);
        try {
            const { data } = await axiosInstance.post('/email-campaigns/generate-copy', { prompt: promptText, kind: 'both' });
            updateStep(idx, 'subject', data?.subject || editingCampaign.steps[idx].subject);
            updateStep(idx, 'body_text', data?.body || editingCampaign.steps[idx].body_text);
            toast.success('Draft copy generated — review before sending');
        } catch {/* interceptor */}
        finally { setGeneratingCopy(false); }
    };

    const previewSegment = async () => {
        try {
            const { data } = await axiosInstance.post('/email-campaigns/segment-preview', { segment_filter: editingCampaign.segment_filter });
            setSegmentPreview(data);
        } catch {/* interceptor */}
    };

    // ── Reply to a scanned email ──────────────────────────────────────────
    const sendReply = async (messageId) => {
        if (!replyText.trim()) return;
        setReplySending(true);
        try {
            await axiosInstance.post(`/email/messages/${messageId}/reply`, { body: replyText.trim() });
            toast.success('Reply sent');
            setReplyOpenId(null);
            setReplyText('');
        } catch {/* interceptor */}
        finally { setReplySending(false); }
    };

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
                        <h1>Email & SMS AI Assistant</h1>
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
                {replyDraft && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <strong style={{ color: '#92400e' }}>Suggested reply draft (from Policy Analysis)</strong>
                            <button onClick={() => setReplyDraft(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', fontSize: 18 }}>×</button>
                        </div>
                        <textarea
                            readOnly
                            value={replyDraft.text}
                            style={{ width: '100%', minHeight: 220, fontFamily: 'inherit', fontSize: 13, padding: 12, border: '1px solid #fde68a', borderRadius: 8, resize: 'vertical' }}
                        />
                        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                            <button
                                onClick={async () => {
                                    try { await navigator.clipboard.writeText(replyDraft.text); setReplyCopied(true); setTimeout(() => setReplyCopied(false), 2000); toast.success('Draft copied'); }
                                    catch { toast.error('Clipboard unavailable'); }
                                }}
                                style={{ background: '#FDB813', color: '#1a1f3a', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }}
                            >
                                {replyCopied ? '✓ Copied' : 'Copy draft'}
                            </button>
                        </div>
                        <p style={{ fontSize: 11, color: '#92400e', marginTop: 8 }}>
                            This is an AI-assisted draft from your policy analysis — review and edit before sending. Not legal advice.
                        </p>
                    </div>
                )}
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
                        <button className={`tab-btn ${activeTab === 'sms' ? 'active' : ''}`} onClick={() => setActiveTab('sms')}>
                            SMS Setup
                        </button>
                        <button className={`tab-btn ${activeTab === 'campaigns' ? 'active' : ''}`} onClick={() => setActiveTab('campaigns')}>
                            Campaigns
                        </button>
                        {isAdmin && (
                            <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
                                Settings
                            </button>
                        )}
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

                            {/* Read-only monitoring info — visible to all users so they
                                understand what the assistant is currently scanning for.
                                Admins edit these on the Settings tab. */}
                            {monitoringInfo && (
                                <div className="monitoring-info">
                                    <div className="monitoring-header">
                                        <h3>What we&apos;re monitoring</h3>
                                    </div>

                                    <div className="monitoring-grid">
                                        <div className="monitoring-card">
                                            <div className="monitoring-label">Auto-sync frequency</div>
                                            <div className="monitoring-value">
                                                {monitoringInfo.sync_frequency_minutes
                                                    ? `Every ${monitoringInfo.sync_frequency_minutes} min`
                                                    : '—'}
                                            </div>
                                        </div>
                                        <div className="monitoring-card">
                                            <div className="monitoring-label">Scan history</div>
                                            <div className="monitoring-value">
                                                {monitoringInfo.scan_history_days
                                                    ? `Last ${monitoringInfo.scan_history_days} days`
                                                    : '—'}
                                            </div>
                                        </div>
                                        <div className="monitoring-card">
                                            <div className="monitoring-label">Auto-match clients</div>
                                            <div className="monitoring-value">
                                                {monitoringInfo.auto_match ? 'On' : 'Off'}
                                            </div>
                                        </div>
                                    </div>

                                    {(monitoringInfo.monitored_domains?.length > 0 ||
                                      monitoringInfo.custom_domains?.length > 0) && (
                                        <div className="monitoring-block">
                                            <div className="monitoring-label">Monitored domains</div>
                                            <div className="monitoring-chips">
                                                {[...(monitoringInfo.monitored_domains || []),
                                                  ...(monitoringInfo.custom_domains || [])].map(d => (
                                                    <span key={d} className="monitoring-chip domain">{d}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {monitoringInfo.keywords?.length > 0 && (
                                        <div className="monitoring-block">
                                            <div className="monitoring-label">Detection keywords</div>
                                            <div className="monitoring-chips">
                                                {monitoringInfo.keywords.map(k => (
                                                    <span key={k} className="monitoring-chip keyword">{k}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

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
                            <div className="channel-toggle">
                                <button
                                    className={activityChannel === 'email' ? 'active' : ''}
                                    onClick={() => { setActivityChannel('email'); setStatusFilter('all'); }}
                                >
                                    📧 Email
                                </button>
                                <button
                                    className={activityChannel === 'sms' ? 'active' : ''}
                                    onClick={() => { setActivityChannel('sms'); setStatusFilter('all'); setSmsMsgPage(1); }}
                                >
                                    💬 SMS
                                </button>
                            </div>
                            <div className="activity-toolbar">
                                <div className="activity-search">
                                    <input
                                        placeholder={activityChannel === 'sms' ? 'Search number or text…' : 'Search sender, subject, body…'}
                                        value={query}
                                        onChange={e => { setQuery(e.target.value); setPage(1); setSmsMsgPage(1); }}
                                    />
                                </div>
                                <select
                                    className="dropdown-select"
                                    value={statusFilter}
                                    onChange={e => { setStatusFilter(e.target.value); setPage(1); setSmsMsgPage(1); }}
                                >
                                    <option value="all">All {activityChannel === 'sms' ? 'texts' : 'emails'}</option>
                                    <option value="matched">Matched</option>
                                    <option value="unassigned">Unassigned</option>
                                </select>
                                {activityChannel === 'email' && (
                                    <select
                                        className="dropdown-select"
                                        value={companyFilter}
                                        onChange={e => { setCompanyFilter(e.target.value); setPage(1); }}
                                    >
                                        <option value="">All companies</option>
                                        {companies.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                )}
                            </div>

                            {activityChannel === 'email' && (messagesLoading ? (
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
                                        {messages.map(m => {
                                            const expanded = !!expandedRows[m.id];
                                            const displayName = m.from_name || m.from_email || '?';
                                            const initial = (displayName.trim()[0] || '?').toUpperCase();
                                            return (
                                            <div
                                                key={m.id}
                                                className={`email-row-wrap ${m.is_unread ? 'unread' : ''} ${expanded ? 'expanded' : ''} ${m.matched_client ? 'matched' : 'unassigned'}`}
                                            >
                                                <div
                                                    className="email-row"
                                                    onClick={() => toggleExpand(m.id)}
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-expanded={expanded}
                                                >
                                                    <div className={`email-avatar source-${m.source}`}>
                                                        {initial}
                                                        {m.is_unread && <span className="email-unread-dot" />}
                                                    </div>

                                                    <div className="email-row-main">
                                                        <div className="email-row-headline">
                                                            <span className="email-row-name">{displayName}</span>
                                                            {m.matched_company && (
                                                                <span className="company-tag">{m.matched_company}</span>
                                                            )}
                                                            <span className={`source-badge source-${m.source}`}>{m.source}</span>
                                                            <span className="email-row-time-inline">{fmtRelative(m.received_at)}</span>
                                                        </div>
                                                        <div className="email-row-subject">{m.subject || '(no subject)'}</div>
                                                        <div className="email-row-snippet">{m.snippet}</div>
                                                    </div>

                                                    <div className="email-row-side">
                                                        {m.matched_client ? (
                                                            <>
                                                                <span className="status-pill status-matched">
                                                                    ✓ {m.matched_client.full_name}
                                                                </span>
                                                                <div className="meta-method">
                                                                    {matchMethodLabel[m.match_method] || 'Auto-matched'}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="status-pill status-unassigned">⚠ Unassigned</span>
                                                                <div className="meta-actions" onClick={e => e.stopPropagation()}>
                                                                    <button className="btn-assign" onClick={() => handleAssignPrompt(m.id)}>Assign</button>
                                                                    <button className="btn-ignore" onClick={() => handleIgnore(m.id)}>Ignore</button>
                                                                </div>
                                                            </>
                                                        )}
                                                        <button
                                                            className={`expand-btn ${expanded ? 'open' : ''}`}
                                                            onClick={(e) => { e.stopPropagation(); toggleExpand(m.id); }}
                                                            aria-label={expanded ? 'Collapse email' : 'Expand email'}
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="6 9 12 15 18 9" />
                                                            </svg>
                                                            <span>{expanded ? 'Hide' : 'View'}</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                {expanded && (
                                                    <div className="email-row-detail">
                                                        <div className="email-detail-meta">
                                                            <span><strong>From:</strong> {m.from_name ? `${m.from_name} <${m.from_email}>` : m.from_email}</span>
                                                            <span><strong>Received:</strong> {new Date(m.received_at).toLocaleString()}</span>
                                                            {m.matched_company && (
                                                                <span><strong>Company:</strong> {m.matched_company}</span>
                                                            )}
                                                        </div>
                                                        <div className="email-detail-subject">
                                                            {m.subject || '(no subject)'}
                                                        </div>
                                                        <div className="email-detail-body">
                                                            {m.body_text || m.snippet || '(empty body)'}
                                                        </div>
                                                        {m.ai_extracted_data && (
                                                            <div className="email-ai-chips">
                                                                {m.ai_extracted_data.claim_number && <span className="ai-chip">Claim #{m.ai_extracted_data.claim_number}</span>}
                                                                {m.ai_extracted_data.policy_number && <span className="ai-chip">Policy {m.ai_extracted_data.policy_number}</span>}
                                                                {m.ai_extracted_data.adjuster_name && <span className="ai-chip">Adjuster: {m.ai_extracted_data.adjuster_name}</span>}
                                                                {m.ai_category && <span className={`ai-chip cat-${m.ai_category}`}>{m.ai_category.replace('_', ' ')}</span>}
                                                            </div>
                                                        )}
                                                        <div className="email-reply-zone">
                                                            {replyOpenId === m.id ? (
                                                                <>
                                                                    <textarea
                                                                        className="email-reply-input"
                                                                        rows={3}
                                                                        placeholder={`Reply to ${m.from_email}…`}
                                                                        value={replyText}
                                                                        onChange={e => setReplyText(e.target.value)}
                                                                    />
                                                                    <div className="email-reply-actions">
                                                                        <button className="btn-assign" onClick={() => sendReply(m.id)} disabled={replySending || !replyText.trim()}>
                                                                            {replySending ? 'Sending…' : 'Send reply'}
                                                                        </button>
                                                                        <button className="btn-ignore" onClick={() => { setReplyOpenId(null); setReplyText(''); }}>Cancel</button>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <button className="btn-assign" onClick={() => { setReplyOpenId(m.id); setReplyText(''); }}>↩ Reply</button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            );
                                        })}
                                    </div>

                                    {totalPages > 1 && (
                                        <div className="pagination">
                                            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
                                            <span>Page {page} of {totalPages}</span>
                                            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
                                        </div>
                                    )}
                                </>
                            ))}

                            {activityChannel === 'sms' && (smsMsgLoading ? (
                                <div className="empty-state">
                                    <div className="empty-icon">⏳</div>
                                    <div className="empty-title">Loading…</div>
                                </div>
                            ) : smsMessages.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-icon">💬</div>
                                    <div className="empty-title">No texts found</div>
                                    <div className="empty-text">
                                        {!summary
                                            ? 'Loading…'
                                            : 'Provision a number on the SMS Setup tab — inbound texts will appear here.'}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="email-list">
                                        {smsMessages.map(m => {
                                            const inbound = m.direction === 'inbound';
                                            const contact = inbound ? m.from_number : m.to_number;
                                            const initial = inbound ? '↙' : '↗';
                                            return (
                                                <div
                                                    key={m.id}
                                                    className={`email-row-wrap ${m.is_unread && inbound ? 'unread' : ''} ${m.matched_client ? 'matched' : 'unassigned'}`}
                                                >
                                                    <div className="email-row" style={{ cursor: 'default' }}>
                                                        <div className="email-avatar source-sms">{initial}</div>
                                                        <div className="email-row-main">
                                                            <div className="email-row-headline">
                                                                <span className="email-row-name">{contact}</span>
                                                                <span className={`source-badge source-${inbound ? 'gmail' : 'outlook'}`}>
                                                                    {inbound ? 'received' : 'sent'}
                                                                </span>
                                                                <span className="email-row-time-inline">{fmtRelative(m.occurred_at)}</span>
                                                            </div>
                                                            <div className="email-row-snippet">{m.body || '(no text)'}</div>
                                                        </div>
                                                        <div className="email-row-side">
                                                            {m.matched_client ? (
                                                                <span className="status-pill status-matched">✓ {m.matched_client.full_name}</span>
                                                            ) : inbound ? (
                                                                <>
                                                                    <span className="status-pill status-unassigned">⚠ Unassigned</span>
                                                                    <div className="meta-actions">
                                                                        <button className="btn-assign" onClick={() => handleSmsAssignPrompt(m.id)}>Assign</button>
                                                                        <button className="btn-ignore" onClick={() => handleSmsIgnore(m.id)}>Ignore</button>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <span className="status-pill">{m.status}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {Math.ceil(smsMsgTotal / pageSize) > 1 && (
                                        <div className="pagination">
                                            <button disabled={smsMsgPage <= 1} onClick={() => setSmsMsgPage(p => p - 1)}>‹ Prev</button>
                                            <span>Page {smsMsgPage} of {Math.ceil(smsMsgTotal / pageSize)}</span>
                                            <button disabled={smsMsgPage >= Math.ceil(smsMsgTotal / pageSize)} onClick={() => setSmsMsgPage(p => p + 1)}>Next ›</button>
                                        </div>
                                    )}
                                </>
                            ))}
                        </div>
                    )}

                    {/* ── SMS Setup Tab ─────────────────────────────────────── */}
                    {activeTab === 'sms' && (
                        <div className="tab-content active">
                            {!smsConfigured ? (
                                <div className="empty-state">
                                    <div className="empty-icon">📵</div>
                                    <div className="empty-title">SMS not enabled on this server</div>
                                    <div className="empty-text">
                                        Twilio credentials aren&apos;t configured. Ask your administrator to set
                                        TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN to enable text messaging.
                                    </div>
                                </div>
                            ) : smsLoading ? (
                                <div className="empty-state">
                                    <div className="empty-icon">⏳</div>
                                    <div className="empty-title">Loading…</div>
                                </div>
                            ) : smsNumber ? (
                                <>
                                    <div className="sms-active-card">
                                        <div className="sms-active-head">
                                            <div>
                                                <div className="sms-active-label">Your SMS number</div>
                                                <div className="sms-active-number">{smsNumber.phone_number}</div>
                                                <div className="sms-active-sub">
                                                    Give this number to clients and adjusters — inbound texts are
                                                    matched to claims automatically.
                                                </div>
                                            </div>
                                            <div className="sms-active-actions">
                                                <button
                                                    className="copy-btn"
                                                    onClick={handleCopySmsNumber}
                                                    style={smsCopied ? { background: '#dcfce7', borderColor: '#86efac' } : {}}
                                                >
                                                    {smsCopied ? '✅ Copied!' : '📋 Copy'}
                                                </button>
                                                <button className="btn-release" onClick={releaseNumber} disabled={releasing}>
                                                    {releasing ? 'Releasing…' : 'Release'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="sms-compose">
                                        <h3 className="settings-title">Send a text</h3>
                                        <p className="settings-description">
                                            Outbound texts are logged to the matching client&apos;s timeline.
                                        </p>
                                        <input
                                            className="sms-input"
                                            placeholder="Recipient number (e.g. +13305551234)"
                                            value={smsTo}
                                            onChange={e => setSmsTo(e.target.value)}
                                        />
                                        <textarea
                                            className="sms-textarea"
                                            placeholder="Your message…"
                                            value={smsBody}
                                            onChange={e => setSmsBody(e.target.value)}
                                            rows={4}
                                        />
                                        <button
                                            className="save-settings-btn"
                                            onClick={sendTestSms}
                                            disabled={sendingSms || !smsTo.trim() || !smsBody.trim()}
                                        >
                                            <span>💬</span>
                                            {sendingSms ? 'Sending…' : 'Send SMS'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="sms-provision">
                                    <h3 className="settings-title">Get an SMS number</h3>
                                    <p className="settings-description">
                                        Pick an area code and choose a number. Clients and adjusters can text it,
                                        and we&apos;ll link each message to the right claim.
                                    </p>
                                    <div className="domain-add">
                                        <input
                                            placeholder="Area code (e.g. 330) — optional"
                                            value={areaCode}
                                            onChange={e => setAreaCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                                            onKeyDown={e => e.key === 'Enter' && searchSmsNumbers()}
                                        />
                                        <button onClick={searchSmsNumbers} disabled={searchingNumbers}>
                                            {searchingNumbers ? 'Searching…' : 'Search numbers'}
                                        </button>
                                    </div>

                                    {availableNumbers.length > 0 && (
                                        <div className="sms-number-list">
                                            {availableNumbers.map(n => (
                                                <div key={n.phoneNumber} className="sms-number-row">
                                                    <div>
                                                        <div className="sms-number-value">{n.phoneNumber}</div>
                                                        <div className="sms-number-loc">
                                                            {[n.locality, n.region].filter(Boolean).join(', ') || 'United States'}
                                                        </div>
                                                    </div>
                                                    <button
                                                        className="btn-assign"
                                                        onClick={() => provisionNumber(n.phoneNumber)}
                                                        disabled={!!provisioning}
                                                    >
                                                        {provisioning === n.phoneNumber ? 'Buying…' : 'Select'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Campaigns Tab ─────────────────────────────────────── */}
                    {activeTab === 'campaigns' && (
                        <div className="tab-content active">
                            <div className="cmp-metrics">
                                <div className="cmp-metric"><div className="cmp-metric-label">Active</div><div className="cmp-metric-value">{campaignMetrics?.active_campaigns ?? '—'}</div></div>
                                <div className="cmp-metric"><div className="cmp-metric-label">Sent (30d)</div><div className="cmp-metric-value">{campaignMetrics?.sent_30d ?? '—'}</div></div>
                                <div className="cmp-metric"><div className="cmp-metric-label">Open Rate</div><div className="cmp-metric-value green">{campaignMetrics ? `${campaignMetrics.open_rate}%` : '—'}</div></div>
                                <div className="cmp-metric"><div className="cmp-metric-label">Click Rate</div><div className="cmp-metric-value green">{campaignMetrics ? `${campaignMetrics.click_rate}%` : '—'}</div></div>
                            </div>

                            <div className="cmp-toolbar">
                                <div>
                                    <h3 className="settings-title">Campaigns</h3>
                                    <p className="settings-description">Outbound email sequences and one-time sends via Resend.</p>
                                </div>
                                <button className="cmp-new-btn" onClick={() => openBuilder(null)}>+ New Campaign</button>
                            </div>

                            {campaignsLoading ? (
                                <div className="empty-state"><div className="empty-icon">⏳</div><div className="empty-title">Loading…</div></div>
                            ) : campaigns.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-icon">📣</div>
                                    <div className="empty-title">No campaigns yet</div>
                                    <div className="empty-text">Create a drip sequence, one-time blast, or claim-completed review request.</div>
                                </div>
                            ) : (
                                <div className="cmp-list">
                                    {campaigns.map(c => (
                                        <div key={c.id} className="cmp-row">
                                            <div className="cmp-row-main">
                                                <div className="cmp-row-name">{c.name}</div>
                                                <div className="cmp-row-sub">
                                                    <span className={`cmp-type cmp-type-${c.type}`}>{c.type}</span>
                                                    <span className={`cmp-status cmp-status-${c.status}`}>{c.status}</span>
                                                    <span className="cmp-row-stat">{c.sent_count} sent</span>
                                                    <span className="cmp-row-stat green">{c.open_rate}% open</span>
                                                </div>
                                            </div>
                                            <div className="cmp-row-actions">
                                                <button onClick={() => openBuilder(c.id)}>Edit</button>
                                                {['draft', 'paused', 'scheduled'].includes(c.status) && (
                                                    <button className="primary" onClick={() => launchCampaign(c.id)}>Launch</button>
                                                )}
                                                {c.status === 'active' && (
                                                    <button onClick={() => pauseCampaign(c.id, true)}>Pause</button>
                                                )}
                                                {c.status === 'paused' && (
                                                    <button onClick={() => pauseCampaign(c.id, false)}>Resume</button>
                                                )}
                                                <button className="danger" onClick={() => deleteCampaign(c.id)}>Delete</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Settings Tab (admin only) ─────────────────────────── */}
                    {activeTab === 'settings' && isAdmin && (
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
                                                <div className="toggle-title">Auto-create draft claims</div>
                                                <div className="toggle-desc">When AI detects a new-claim notification with no existing match, create a draft claim automatically.</div>
                                            </div>
                                            <label className="switch">
                                                <input
                                                    type="checkbox"
                                                    checked={!!settings.auto_create_claims}
                                                    onChange={e => setSettings(prev => ({ ...prev, auto_create_claims: e.target.checked }))}
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

            {/* ── Campaign builder modal ─────────────────────────────────── */}
            {builderOpen && editingCampaign && (
                <div className="cmp-modal-overlay" onClick={() => setBuilderOpen(false)}>
                    <div className="cmp-modal" onClick={e => e.stopPropagation()}>
                        <div className="cmp-modal-head">
                            <h3>{editingCampaign.id ? 'Edit campaign' : 'New campaign'}</h3>
                            <button onClick={() => setBuilderOpen(false)}>×</button>
                        </div>

                        <div className="cmp-modal-body">
                            <label className="cmp-field">
                                <span>Campaign name</span>
                                <input value={editingCampaign.name} onChange={e => updateCampaignField('name', e.target.value)} placeholder="New Lead Welcome Series" />
                            </label>

                            <div className="cmp-field-row">
                                <label className="cmp-field">
                                    <span>Type</span>
                                    <select value={editingCampaign.type} onChange={e => updateCampaignField('type', e.target.value)}>
                                        <option value="blast">One-time blast</option>
                                        <option value="drip">Drip sequence</option>
                                        <option value="triggered">Triggered</option>
                                        <option value="recurring">Recurring</option>
                                    </select>
                                </label>
                                {editingCampaign.type === 'triggered' ? (
                                    <label className="cmp-field">
                                        <span>Trigger event</span>
                                        <select value={editingCampaign.trigger_event} onChange={e => updateCampaignField('trigger_event', e.target.value)}>
                                            <option value="claim_status_completed">Claim marked completed</option>
                                        </select>
                                    </label>
                                ) : (
                                    <label className="cmp-field">
                                        <span>Send at (optional)</span>
                                        <input type="datetime-local" value={editingCampaign.schedule?.send_at ?? ''} onChange={e => updateCampaignField('schedule', { ...editingCampaign.schedule, send_at: e.target.value })} />
                                    </label>
                                )}
                            </div>

                            <div className="cmp-field-row">
                                <label className="cmp-field"><span>From name</span><input value={editingCampaign.from_name ?? ''} onChange={e => updateCampaignField('from_name', e.target.value)} placeholder="Acme Roofing" /></label>
                                <label className="cmp-field"><span>Reply-to</span><input value={editingCampaign.reply_to ?? ''} onChange={e => updateCampaignField('reply_to', e.target.value)} placeholder="office@acme.com" /></label>
                            </div>

                            {editingCampaign.type !== 'triggered' && (
                                <div className="cmp-segment">
                                    <div className="cmp-field-label">Audience</div>
                                    <label className="cmp-check">
                                        <input type="checkbox" checked={!!editingCampaign.segment_filter?.all} onChange={e => updateCampaignField('segment_filter', e.target.checked ? { all: true } : {})} />
                                        All clients
                                    </label>
                                    {!editingCampaign.segment_filter?.all && (
                                        <input
                                            className="cmp-seg-city"
                                            placeholder="Filter by city (optional)"
                                            value={editingCampaign.segment_filter?.city ?? ''}
                                            onChange={e => updateCampaignField('segment_filter', { ...editingCampaign.segment_filter, city: e.target.value })}
                                        />
                                    )}
                                    <button className="cmp-preview-btn" onClick={previewSegment}>Preview audience</button>
                                    {segmentPreview && <span className="cmp-seg-count">{segmentPreview.count} recipients</span>}
                                </div>
                            )}

                            <div className="cmp-steps">
                                <div className="cmp-field-label">Emails {editingCampaign.type === 'drip' && '(sent in sequence)'}</div>
                                {editingCampaign.steps.map((step, idx) => (
                                    <div key={idx} className="cmp-step">
                                        <div className="cmp-step-head">
                                            <strong>Email {idx + 1}</strong>
                                            {(editingCampaign.type === 'drip' || idx > 0) && (
                                                <label className="cmp-delay">
                                                    Send after
                                                    <input type="number" min="0" value={step.delay_hours ?? 0} onChange={e => updateStep(idx, 'delay_hours', Number(e.target.value))} />
                                                    hrs
                                                </label>
                                            )}
                                            {editingCampaign.steps.length > 1 && (
                                                <button className="cmp-step-remove" onClick={() => removeStep(idx)}>Remove</button>
                                            )}
                                        </div>
                                        <input className="cmp-step-subject" placeholder="Subject line" value={step.subject} onChange={e => updateStep(idx, 'subject', e.target.value)} />
                                        <textarea className="cmp-step-body" rows={4} placeholder="Email body… use {{first_name}}, {{claim_number}} merge tags" value={step.body_text ?? ''} onChange={e => updateStep(idx, 'body_text', e.target.value)} />
                                    </div>
                                ))}
                                <div className="cmp-step-actions">
                                    <button onClick={addStep}>+ Add email</button>
                                    <button onClick={generateCopy} disabled={generatingCopy}>
                                        {generatingCopy ? '✨ Generating…' : '✨ AI write last email'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="cmp-modal-foot">
                            <button onClick={() => setBuilderOpen(false)}>Cancel</button>
                            <button className="primary" onClick={saveCampaign} disabled={savingCampaign}>
                                {savingCampaign ? 'Saving…' : 'Save campaign'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmailAssistant;
