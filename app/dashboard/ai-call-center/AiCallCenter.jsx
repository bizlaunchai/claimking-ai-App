'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance';
import { Phone, Target, Timer, BarChart3, Settings, Upload, Link2, Lock } from 'lucide-react';
import IntegrationSettingsModal from './IntegrationSettingsModal';
import CallImportModal from './CallImportModal';
import { usePermissions } from '@/lib/permissions/PermissionsContext';
import "./ai-call-center.css"

const PAGE_SIZE = 10;

const SOURCE_LABEL = {
    ringcentral: 'RingCentral',
    ctm: 'CTM',
    csv_import: 'Imported',
};

const INTENT_LABEL = {
    new_lead: 'New Lead', existing_client: 'Existing Client', vendor: 'Vendor', spam: 'Spam', support: 'Support',
};
const OUTCOME_LABEL = {
    appointment_set: 'Appointment Set', callback_requested: 'Callback', info_only: 'Info Only',
    not_interested: 'Not Interested', wrong_number: 'Wrong Number', other: 'Other',
};
const INTENT_OPTIONS = Object.keys(INTENT_LABEL);
const OUTCOME_OPTIONS = Object.keys(OUTCOME_LABEL);

function IntentBadge({ intent }) {
    if (!intent) return null;
    return <span className={`intent-badge intent-${intent}`}>{INTENT_LABEL[intent] || intent}</span>;
}
function OutcomeBadge({ outcome }) {
    if (!outcome) return null;
    return <span className="outcome-badge">{OUTCOME_LABEL[outcome] || outcome}</span>;
}

function formatDuration(seconds) {
    const s = Number(seconds) || 0;
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
}

function formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (isToday) return `Today, ${time}`;
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return `Yesterday, ${time}`;
    return `${d.toLocaleDateString()} ${time}`;
}

function SourceBadge({ source }) {
    const label = SOURCE_LABEL[source] || source;
    const cls = source === 'ringcentral' ? 'source-rc' : 'source-ctm';
    return <span className={`source-badge ${cls}`}>{label}</span>;
}

const AICallCenter = () => {
    const [expandedNotes, setExpandedNotes] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [selectedCall, setSelectedCall] = useState(null);
    const [sourceFilter, setSourceFilter] = useState('all');
    const [intentFilter, setIntentFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('all'); // all | unmatched
    const [unassignedOnly, setUnassignedOnly] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [funnel, setFunnel] = useState(null);
    const [savingCorrection, setSavingCorrection] = useState(false);
    const [callbackFor, setCallbackFor] = useState(null); // call being called back
    const [callbackPhone, setCallbackPhone] = useState('');
    const [callbackBusy, setCallbackBusy] = useState(false);

    const { has } = usePermissions();
    const canListen = has('listen_recordings');
    const canImport = has('import_call_data');
    const canCorrect = has('use_call_center');
    // Call history is its own switch (§6.5): a user may reach the page without
    // being allowed to see the call log itself.
    const canViewLog = has('view_call_log');

    const [summary, setSummary] = useState(null);
    const [trend, setTrend] = useState([]);
    const [calls, setCalls] = useState([]);
    const [totalCalls, setTotalCalls] = useState(0);
    const [loading, setLoading] = useState(true);
    const [recordingUrl, setRecordingUrl] = useState(null);
    const [recordingCallId, setRecordingCallId] = useState(null);
    const [recordingLoading, setRecordingLoading] = useState(false);

    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    const loadSummary = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/api/metrics/calls/summary');
            setSummary(res.data);
        } catch (e) {
            console.error('summary fetch failed', e);
        }
    }, []);

    const loadTrend = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/api/metrics/calls/timeseries');
            setTrend(res.data || []);
        } catch (e) {
            console.error('timeseries fetch failed', e);
        }
    }, []);

    const loadCalls = useCallback(async () => {
        if (!canViewLog) { setCalls([]); setTotalCalls(0); setLoading(false); return; }
        setLoading(true);
        try {
            const params = {
                limit: PAGE_SIZE,
                offset: (currentPage - 1) * PAGE_SIZE,
            };
            if (sourceFilter !== 'all') params.source = sourceFilter;
            if (intentFilter !== 'all') params.intent = intentFilter;
            if (activeTab === 'unmatched') params.matched = 'unmatched';
            if (unassignedOnly) params.unassigned = 'true';
            const res = await axiosInstance.get('/api/calls', { params });
            setCalls(res.data?.data || []);
            setTotalCalls(res.data?.total || 0);
        } catch (e) {
            console.error('calls fetch failed', e);
            setCalls([]);
            setTotalCalls(0);
        } finally {
            setLoading(false);
        }
    }, [currentPage, sourceFilter, intentFilter, activeTab, unassignedOnly, canViewLog]);

    const loadFunnel = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/api/calls/funnel', { params: { days: 30 }, suppressErrorToast: true });
            setFunnel(res.data);
        } catch { /* silent */ }
    }, []);

    useEffect(() => { loadSummary(); loadTrend(); loadFunnel(); }, [loadSummary, loadTrend, loadFunnel]);
    useEffect(() => { loadCalls(); }, [loadCalls]);

    // Callback bridge (§6.6.3): rings the rep's phone first, then the caller.
    const doCallback = useCallback(async () => {
        if (!callbackFor) return;
        setCallbackBusy(true);
        try {
            const res = await axiosInstance.post(`/api/calls/${callbackFor.id}/callback`, {
                from_phone: callbackPhone.trim() || undefined,
            });
            toast.success(res.data?.message || 'Ringing your phone…');
            setCallbackFor(null); setCallbackPhone('');
        } catch { /* interceptor */ } finally { setCallbackBusy(false); }
    }, [callbackFor, callbackPhone]);

    // Correct a call's intent/outcome or link it to a record (§6.6).
    const correctCall = useCallback(async (id, patch) => {
        setSavingCorrection(true);
        try {
            await axiosInstance.patch(`/api/calls/${id}`, patch);
            setCalls((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
            setSelectedCall((sc) => (sc && sc.id === id ? { ...sc, ...patch } : sc));
            toast.success('Call updated');
        } catch { /* interceptor */ } finally { setSavingCorrection(false); }
    }, []);

    const [refreshing, setRefreshing] = useState(false);
    const [lastRefreshed, setLastRefreshed] = useState(null);

    const handleRefresh = useCallback(async () => {
        if (refreshing) return;
        setRefreshing(true);
        try {
            await Promise.all([loadSummary(), loadTrend(), loadCalls()]);
            setLastRefreshed(new Date());
            toast.success('Refreshed');
        } catch {
            toast.error('Refresh failed');
        } finally {
            setRefreshing(false);
        }
    }, [refreshing, loadSummary, loadTrend, loadCalls]);

    const stats = [
        {
            icon: <Phone size={20} strokeWidth={2} />,
            label: 'Total Calls',
            value: summary ? summary.total_calls : 0,
            change: {
                text: `${summary ? summary.inbound_calls : 0} inbound · ${summary ? summary.outbound_calls : 0} outbound`,
                type: 'neutral',
            },
        },
        {
            icon: <Target size={20} strokeWidth={2} />,
            label: 'Unassigned Leads',
            value: summary ? summary.unassigned_leads : 0,
            change: {
                text: unassignedOnly ? 'filtered' : 'click to filter',
                type: summary && summary.unassigned_leads > 0 ? 'positive' : 'neutral',
            },
        },
        {
            icon: <Timer size={20} strokeWidth={2} />,
            label: 'Average Call Duration',
            value: summary ? formatDuration(summary.avg_duration_seconds) : '0:00',
            change: { text: 'answered calls only', type: 'neutral' },
        },
        {
            icon: <BarChart3 size={20} strokeWidth={2} />,
            label: 'Answered / Missed',
            value: summary ? `${summary.answered_calls} / ${summary.missed_calls}` : '0 / 0',
            change: { text: 'last 30 days', type: 'neutral' },
        },
    ];

    const maxTrend = Math.max(1, ...trend.map(t => t.total_calls || 0));
    const trendData = trend.map(t => {
        const d = new Date(t.date);
        const day = d.toLocaleDateString([], { weekday: 'short' });
        return {
            day,
            value: t.total_calls || 0,
            height: Math.round(((t.total_calls || 0) / maxTrend) * 100),
        };
    });

    // Source breakdown pie chart
    useEffect(() => {
        if (typeof window === 'undefined' || !chartRef.current || !summary) return;
        import('chart.js/auto').then((ChartModule) => {
            const Chart = ChartModule.default || ChartModule.Chart || ChartModule;
            if (chartInstance.current) chartInstance.current.destroy();

            const sources = Object.keys(summary.by_source || {});
            const labels = sources.map(s => SOURCE_LABEL[s] || s);
            const data = sources.map(s => summary.by_source[s].total_calls || 0);
            const hasData = data.some(v => v > 0);

            const ctx = chartRef.current.getContext('2d');
            chartInstance.current = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: hasData ? labels : ['No data'],
                    datasets: [{
                        data: hasData ? data : [1],
                        backgroundColor: hasData ? ['#FDB813', '#1a1f3a', '#3b82f6'] : ['#e5e7eb'],
                        borderWidth: 2,
                        borderColor: '#ffffff',
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            enabled: hasData,
                            callbacks: {
                                label: (ctx) => {
                                    const total = data.reduce((a, b) => a + b, 0) || 1;
                                    const pct = Math.round((ctx.parsed / total) * 100);
                                    return `${ctx.label}: ${ctx.parsed} (${pct}%)`;
                                },
                            },
                        },
                    },
                },
            });
        }).catch(err => console.error('Chart.js load error', err));

        return () => {
            if (chartInstance.current) chartInstance.current.destroy();
        };
    }, [summary]);

    const totalPages = Math.max(1, Math.ceil(totalCalls / PAGE_SIZE));
    const startItem = totalCalls === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
    const endItem = Math.min(currentPage * PAGE_SIZE, totalCalls);

    const toggleNotes = (id) => {
        setExpandedNotes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const openCallDetails = async (call) => {
        setSelectedCall(call);
        setShowModal(true);
    };

    const clearRecording = () => {
        if (recordingUrl) URL.revokeObjectURL(recordingUrl);
        setRecordingUrl(null);
        setRecordingCallId(null);
    };

    const closeModal = () => { setShowModal(false); setSelectedCall(null); clearRecording(); };

    const playRecording = async (call) => {
        if (!call.recording_s3_key) {
            toast.info('Recording not yet available');
            return;
        }
        if (recordingCallId === call.id && recordingUrl) return;
        setRecordingLoading(true);
        try {
            const res = await axiosInstance.get(`/api/calls/${call.id}/recording`, {
                responseType: 'blob',
            });
            if (recordingUrl) URL.revokeObjectURL(recordingUrl);
            const url = URL.createObjectURL(res.data);
            setRecordingUrl(url);
            setRecordingCallId(call.id);
        } catch (e) {
            toast.error('Could not fetch recording');
        } finally {
            setRecordingLoading(false);
        }
    };

    useEffect(() => {
        return () => { if (recordingUrl) URL.revokeObjectURL(recordingUrl); };
    }, [recordingUrl]);

    const goToPage = (p) => setCurrentPage(Math.max(1, Math.min(totalPages, p)));

    return (
        <div className="ai-call-center">
            <div className="page-header">
                <div className="header-left">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <h1 className="page-title">AI Call Center</h1>
                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="refresh-btn"
                            title={lastRefreshed ? `Last refreshed: ${lastRefreshed.toLocaleTimeString()}` : 'Click to fetch the latest calls'}
                        >
                            <span style={{ display: 'inline-block', animation: refreshing ? 'spin 1s linear infinite' : 'none', fontSize: '1rem' }}>⟳</span>
                            {refreshing ? 'Refreshing…' : 'Refresh'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowSettings(true)}
                            className="refresh-btn"
                            title="Configure RingCentral &amp; Call Tracking Metrics"
                        >
                            <Settings size={16} strokeWidth={2} style={{ verticalAlign: '-3px', marginRight: 4 }} />
                            Settings
                        </button>
                        {canImport && (
                            <button
                                type="button"
                                onClick={() => setShowImport(true)}
                                className="refresh-btn"
                                title="Import historical call data (CSV)"
                            >
                                <Upload size={16} strokeWidth={2} style={{ verticalAlign: '-3px', marginRight: 4 }} />
                                Import
                            </button>
                        )}
                    </div>
                    <span className="page-subtitle">
                        Unified RingCentral + Call Tracking Metrics
                        {lastRefreshed && <span style={{ marginLeft: 8, opacity: 0.7 }}>· Updated {lastRefreshed.toLocaleTimeString()}</span>}
                    </span>
                </div>
                <div className="header-filters">
                    <div className="cc-tabs">
                        <button className={activeTab === 'all' ? 'active' : ''} onClick={() => { setActiveTab('all'); setCurrentPage(1); }}>All Calls</button>
                        <button className={activeTab === 'unmatched' ? 'active' : ''} onClick={() => { setActiveTab('unmatched'); setCurrentPage(1); }}>Unmatched</button>
                    </div>
                    <select
                        value={sourceFilter}
                        onChange={e => { setSourceFilter(e.target.value); setCurrentPage(1); }}
                        className="filter-select"
                    >
                        <option value="all">All Sources</option>
                        <option value="ringcentral">RingCentral</option>
                        <option value="ctm">Call Tracking Metrics</option>
                        <option value="csv_import">Imported</option>
                    </select>
                    <select
                        value={intentFilter}
                        onChange={e => { setIntentFilter(e.target.value); setCurrentPage(1); }}
                        className="filter-select"
                    >
                        <option value="all">All Intents</option>
                        {INTENT_OPTIONS.map(i => <option key={i} value={i}>{INTENT_LABEL[i]}</option>)}
                    </select>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                        <input
                            type="checkbox"
                            checked={unassignedOnly}
                            onChange={e => { setUnassignedOnly(e.target.checked); setCurrentPage(1); }}
                        />
                        Unassigned only
                    </label>
                </div>
            </div>

            <div className="page-body">

            {(!summary || summary.total_calls === 0) && (
                <div className="alert-banner">
                    <div className="alert-icon"><Phone size={22} strokeWidth={2} /></div>
                    <div className="alert-content">
                        <div className="alert-text">No calls yet</div>
                        <div className="alert-subtext">
                            Connect RingCentral or Call Tracking Metrics via the{' '}
                            <button
                                type="button"
                                onClick={() => setShowSettings(true)}
                                style={{ background: 'none', border: 0, padding: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}
                            >Settings</button>{' '}
                            button above to start logging calls.
                        </div>
                    </div>
                </div>
            )}

            <div className="stats-grid">
                {stats.map((stat, i) => (
                    <div key={i} className="stat-card">
                        <div className="stat-icon">{stat.icon}</div>
                        <div className="stat-label">{stat.label}</div>
                        <div className="stat-value">{stat.value}</div>
                        <div className={`stat-change ${stat.change.type}`}>
                            <span>{stat.change.text}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="analytics-grid">
                <div className="card chart-card">
                    <div className="card-header">
                        <h2 className="card-title">Call Sources</h2>
                        <p className="card-subtitle">Distribution across providers</p>
                    </div>
                    <div className="card-body">
                        <div className="chart-container">
                            <canvas ref={chartRef}></canvas>
                        </div>
                        <div className="source-legend">
                            {summary && Object.entries(summary.by_source || {}).map(([src, s], i) => {
                                const colors = ['#FDB813', '#1a1f3a', '#3b82f6'];
                                const total = summary.total_calls || 1;
                                const pct = Math.round(((s.total_calls || 0) / total) * 100);
                                return (
                                    <div key={src} className="legend-item">
                                        <span className="legend-color" style={{ background: colors[i % colors.length] }}></span>
                                        <span className="legend-label">{SOURCE_LABEL[src] || src}</span>
                                        <span className="legend-value">{pct}%</span>
                                    </div>
                                );
                            })}
                            {(!summary || !Object.keys(summary.by_source || {}).length) && (
                                <div className="legend-item"><span className="legend-label">No data yet</span></div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="card chart-card">
                    <div className="card-header">
                        <h2 className="card-title">Call Trends</h2>
                        <p className="card-subtitle">Daily call volume</p>
                    </div>
                    <div className="card-body">
                        <div className="trend-chart">
                            <div className="trend-bars">
                                {trendData.length === 0 && (
                                    <div style={{ padding: 24, color: '#9ca3af' }}>No trend data</div>
                                )}
                                {trendData.map((item, i) => (
                                    <div key={i} className="trend-bar-container">
                                        <div className="trend-bar" style={{ height: `${Math.max(5, item.height)}%` }}>
                                            <span className="trend-value">{item.value}</span>
                                        </div>
                                        <span className="trend-label">{item.day}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {funnel && funnel.totals && (
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Attribution Funnel</h2>
                        <p className="card-subtitle">Calls → leads → appointments · last 30 days</p>
                    </div>
                    <div className="card-body">
                        <div className="funnel-row">
                            {[
                                ['Calls', funnel.totals.calls],
                                ['Matched', funnel.totals.matched],
                                ['New Leads', funnel.totals.leads],
                                ['Appointments', funnel.totals.appointments],
                            ].map(([label, val], i) => (
                                <React.Fragment key={label}>
                                    {i > 0 && <div className="funnel-arrow">→</div>}
                                    <div className="funnel-step">
                                        <div className="funnel-val">{val}</div>
                                        <div className="funnel-label">{label}</div>
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                        {funnel.by_source?.length > 0 && (
                            <div className="funnel-sources">
                                {funnel.by_source.map((s) => (
                                    <div className="funnel-src" key={s.source}>
                                        <SourceBadge source={s.source} />
                                        <span>{s.calls} calls · {s.leads} leads · {s.appointments} appts</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">{activeTab === 'unmatched' ? 'Unmatched Calls' : 'Recent Call History'}</h2>
                    <p className="card-subtitle">
                        {loading ? 'Loading…' : `${totalCalls} call${totalCalls === 1 ? '' : 's'}`}
                    </p>
                </div>
                {!canViewLog ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
                        You don’t have permission to view the call history. Ask an admin for “View call log &amp; history”.
                    </div>
                ) : (
                <div className="call-table">
                    <div className="call-header">
                        <div>DATE & TIME</div>
                        <div>CALLER INFORMATION</div>
                        <div>DURATION</div>
                        <div>SOURCE / STATUS</div>
                    </div>

                    {!loading && calls.length === 0 && (
                        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                            No calls match the selected filters.
                        </div>
                    )}

                    {calls.map((call) => (
                        <React.Fragment key={call.id}>
                            <div
                                className={`call-row ${expandedNotes.includes(call.id) ? 'expanded' : ''}`}
                                onClick={() => toggleNotes(call.id)}
                            >
                                <div className="call-time">{formatDateTime(call.started_at)}</div>
                                <div className="caller-info">
                                    <div className="caller-name">
                                        {call.caller_name || (call.client_id ? 'Existing Client' : 'Unknown Caller')}
                                    </div>
                                    <div className="caller-phone">{call.caller_number || '—'}</div>
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                                        <IntentBadge intent={call.ai_intent} />
                                        <OutcomeBadge outcome={call.ai_outcome} />
                                    </div>
                                    {call.answered_by_name && (
                                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Answered by {call.answered_by_name}</div>
                                    )}
                                </div>
                                <div className="call-duration">{formatDuration(call.duration_seconds)}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <SourceBadge source={call.source} />
                                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                                        {call.status}{call.needs_assignment ? ' · unassigned' : ''}
                                    </span>
                                    {(call.client_id || call.lead_id) && (
                                        <span style={{ fontSize: 11, color: '#166534' }}>● {call.client_id ? 'Linked to claim' : 'Linked to lead'}</span>
                                    )}
                                </div>
                            </div>
                            {expandedNotes.includes(call.id) && (
                                <div className="notes-expanded active">
                                    <div className="notes-content">
                                        <div className="note-item">
                                            <div className="note-label">Direction:</div>
                                            <div className="note-value">{call.direction}</div>
                                        </div>
                                        <div className="note-item">
                                            <div className="note-label">Tracking Source:</div>
                                            <div className="note-value">{call.tracking_source || '—'}</div>
                                        </div>
                                        <div className="note-item">
                                            <div className="note-label">Recording:</div>
                                            <div className="note-value">
                                                {call.recording_s3_key ? (
                                                    <button
                                                        className="pagination-btn"
                                                        onClick={(e) => { e.stopPropagation(); openCallDetails(call); playRecording(call); }}
                                                    >▶ Play</button>
                                                ) : call.recording_url ? 'processing…' : '—'}
                                            </div>
                                        </div>
                                        <div className="note-item">
                                            <div className="note-label">&nbsp;</div>
                                            <div className="note-value" style={{ display: 'flex', gap: 8 }}>
                                                <button
                                                    className="pagination-btn"
                                                    onClick={(e) => { e.stopPropagation(); openCallDetails(call); }}
                                                >View Details</button>
                                                <button
                                                    className="pagination-btn"
                                                    onClick={(e) => { e.stopPropagation(); setCallbackFor(call); setCallbackPhone(''); }}
                                                    title="Ring your phone, then connect the caller"
                                                >📞 Callback</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
                )}

                {totalCalls > PAGE_SIZE && (
                    <div className="pagination-container">
                        <div className="pagination-info">
                            Showing {startItem}-{endItem} of {totalCalls} calls
                        </div>
                        <div className="pagination-controls">
                            <button className="pagination-btn" disabled={currentPage === 1} onClick={() => goToPage(1)}>First</button>
                            <button className="pagination-btn" disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}>Previous</button>
                            <span className="pagination-info" style={{ padding: '0 12px' }}>
                                Page {currentPage} of {totalPages}
                            </span>
                            <button className="pagination-btn" disabled={currentPage >= totalPages} onClick={() => goToPage(currentPage + 1)}>Next</button>
                            <button className="pagination-btn" disabled={currentPage >= totalPages} onClick={() => goToPage(totalPages)}>Last</button>
                        </div>
                    </div>
                )}
            </div>

            {showModal && selectedCall && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
                        <div className="flex justify-between items-center px-6 py-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-800">Call Details</h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <button className="pagination-btn" onClick={() => { setCallbackFor(selectedCall); setCallbackPhone(''); }}
                                    title="Ring your phone, then connect the caller">📞 Callback</button>
                                <button className="w-8 h-8 border-0 bg-transparent cursor-pointer text-2xl text-gray-500 flex items-center justify-center hover:bg-gray-100 rounded-md" onClick={closeModal}>×</button>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="detail-section">
                                <div className="detail-label">Caller</div>
                                <div className="detail-content">
                                    <div className="detail-row">
                                        <div className="detail-key">Name:</div>
                                        <div className="detail-value">{selectedCall.caller_name || 'Unknown'}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-key">Phone:</div>
                                        <div className="detail-value">{selectedCall.caller_number}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-key">Direction:</div>
                                        <div className="detail-value">{selectedCall.direction}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-key">Status:</div>
                                        <div className="detail-value">{selectedCall.status}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-key">Source:</div>
                                        <div className="detail-value"><SourceBadge source={selectedCall.source} /></div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-key">Duration:</div>
                                        <div className="detail-value">{formatDuration(selectedCall.duration_seconds)}</div>
                                    </div>
                                    {selectedCall.tracking_source && (
                                        <div className="detail-row">
                                            <div className="detail-key">Tracking Source:</div>
                                            <div className="detail-value">{selectedCall.tracking_source}</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* AI analysis + manual correction (§6.6) */}
                            <div className="detail-section">
                                <div className="detail-label">AI Analysis</div>
                                <div className="detail-content">
                                    {selectedCall.ai_summary
                                        ? <div style={{ fontSize: 14, color: '#374151', marginBottom: 10 }}>{selectedCall.ai_summary}</div>
                                        : <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 10 }}>
                                            {selectedCall.analysis_status === 'failed' ? 'Analysis failed.'
                                                : selectedCall.analysis_status === 'skipped' ? 'Analysis skipped (transcription cap).'
                                                : selectedCall.recording_s3_key ? 'Analysis pending…' : 'No recording to analyze.'}
                                          </div>}
                                    <div className="detail-row">
                                        <div className="detail-key">Intent:</div>
                                        <div className="detail-value">
                                            {canCorrect ? (
                                                <select value={selectedCall.ai_intent || ''} disabled={savingCorrection}
                                                    onChange={(e) => correctCall(selectedCall.id, { ai_intent: e.target.value })}
                                                    className="filter-select" style={{ padding: '4px 8px' }}>
                                                    <option value="">—</option>
                                                    {INTENT_OPTIONS.map(i => <option key={i} value={i}>{INTENT_LABEL[i]}</option>)}
                                                </select>
                                            ) : <IntentBadge intent={selectedCall.ai_intent} />}
                                        </div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-key">Outcome:</div>
                                        <div className="detail-value">
                                            {canCorrect ? (
                                                <select value={selectedCall.ai_outcome || ''} disabled={savingCorrection}
                                                    onChange={(e) => correctCall(selectedCall.id, { ai_outcome: e.target.value })}
                                                    className="filter-select" style={{ padding: '4px 8px' }}>
                                                    <option value="">—</option>
                                                    {OUTCOME_OPTIONS.map(o => <option key={o} value={o}>{OUTCOME_LABEL[o]}</option>)}
                                                </select>
                                            ) : <OutcomeBadge outcome={selectedCall.ai_outcome} />}
                                        </div>
                                    </div>
                                    {selectedCall.answered_by_name && (
                                        <div className="detail-row"><div className="detail-key">Answered By:</div><div className="detail-value">{selectedCall.answered_by_name}</div></div>
                                    )}
                                    {selectedCall.ai_extracted && (
                                        <div style={{ marginTop: 8, background: '#f9fafb', borderRadius: 8, padding: 10 }}>
                                            {Object.entries(selectedCall.ai_extracted).filter(([, v]) => v).map(([k, v]) => (
                                                <div key={k} className="detail-row"><div className="detail-key" style={{ textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}:</div><div className="detail-value">{String(v)}</div></div>
                                            ))}
                                        </div>
                                    )}
                                    {!selectedCall.client_id && !selectedCall.lead_id && (
                                        <div style={{ marginTop: 10, fontSize: 12, color: '#b45309', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Link2 size={13} /> Unmatched — link this call to a claim or lead from the record it belongs to.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedCall.transcript && (
                                <div className="detail-section">
                                    <div className="detail-label">Transcript</div>
                                    <div style={{ fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap', maxHeight: 220, overflowY: 'auto', background: '#f9fafb', borderRadius: 8, padding: 12 }}>
                                        {selectedCall.transcript}
                                    </div>
                                </div>
                            )}

                            {selectedCall.recording_s3_key && (
                                <div className="detail-section">
                                    <div className="detail-label">Call Recording</div>
                                    {canListen ? (
                                        <div className="recording-player">
                                            {recordingCallId === selectedCall.id && recordingUrl ? (
                                                <audio controls autoPlay src={recordingUrl} style={{ width: '100%' }} />
                                            ) : (
                                                <>
                                                    <button className="play-button" disabled={recordingLoading} onClick={() => playRecording(selectedCall)}>
                                                        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                                    </button>
                                                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                                                        {recordingLoading ? 'Loading…' : 'Click to play'}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: 13, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 8, background: '#f9fafb', borderRadius: 8, padding: 12 }}>
                                            <Lock size={14} /> You don&apos;t have permission to listen to recordings. The transcript above is available.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {callbackFor && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4" onClick={() => !callbackBusy && setCallbackFor(null)}>
                    <div className="bg-white rounded-xl w-full max-w-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.3)]" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-5 border-b border-gray-200">
                            <h2 className="text-lg font-bold text-gray-800" style={{ margin: 0 }}>Place a Callback</h2>
                        </div>
                        <div className="p-6">
                            <p style={{ fontSize: 14, color: '#374151', marginBottom: 14 }}>
                                RingCentral will ring <b>your phone</b> first, then connect{' '}
                                <b>{callbackFor.direction === 'inbound' ? (callbackFor.caller_number || 'the caller') : (callbackFor.callee_number || 'the number')}</b>.
                            </p>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Your callback number</label>
                            <input value={callbackPhone} onChange={(e) => setCallbackPhone(e.target.value)}
                                placeholder="Leave blank to use your account phone"
                                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14 }} />
                        </div>
                        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                            <button className="pagination-btn" disabled={callbackBusy} onClick={() => setCallbackFor(null)}>Cancel</button>
                            <button className="pagination-btn" disabled={callbackBusy} onClick={doCallback}
                                style={{ background: '#16a34a', color: '#fff', borderColor: '#16a34a' }}>
                                {callbackBusy ? 'Ringing…' : '📞 Ring my phone'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <IntegrationSettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
            <CallImportModal open={showImport} onClose={() => setShowImport(false)} onImported={() => { loadCalls(); loadSummary(); loadFunnel(); }} />
            </div>
        </div>
    );
};

export default AICallCenter;
