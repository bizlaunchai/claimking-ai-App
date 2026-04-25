'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance';
import "./ai-call-center.css"

const PAGE_SIZE = 10;

const SOURCE_LABEL = {
    ringcentral: 'RingCentral',
    ctm: 'CTM',
};

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
    const [unassignedOnly, setUnassignedOnly] = useState(false);

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
        setLoading(true);
        try {
            const params = {
                limit: PAGE_SIZE,
                offset: (currentPage - 1) * PAGE_SIZE,
            };
            if (sourceFilter !== 'all') params.source = sourceFilter;
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
    }, [currentPage, sourceFilter, unassignedOnly]);

    useEffect(() => { loadSummary(); loadTrend(); }, [loadSummary, loadTrend]);
    useEffect(() => { loadCalls(); }, [loadCalls]);

    const stats = [
        {
            icon: '📞',
            label: 'Total Calls',
            value: summary ? summary.total_calls : 0,
            change: {
                text: `${summary ? summary.inbound_calls : 0} inbound · ${summary ? summary.outbound_calls : 0} outbound`,
                type: 'neutral',
            },
        },
        {
            icon: '🎯',
            label: 'Unassigned Leads',
            value: summary ? summary.unassigned_leads : 0,
            change: {
                text: unassignedOnly ? 'filtered' : 'click to filter',
                type: summary && summary.unassigned_leads > 0 ? 'positive' : 'neutral',
            },
        },
        {
            icon: '⏱️',
            label: 'Average Call Duration',
            value: summary ? formatDuration(summary.avg_duration_seconds) : '0:00',
            change: { text: 'answered calls only', type: 'neutral' },
        },
        {
            icon: '📊',
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
                    <h1 className="page-title">AI Call Center</h1>
                    <span className="page-subtitle">Unified RingCentral + Call Tracking Metrics</span>
                </div>
                <div className="header-filters">
                    <select
                        value={sourceFilter}
                        onChange={e => { setSourceFilter(e.target.value); setCurrentPage(1); }}
                        className="filter-select"
                    >
                        <option value="all">All Sources</option>
                        <option value="ringcentral">RingCentral</option>
                        <option value="ctm">Call Tracking Metrics</option>
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
                    <div className="alert-icon">📞</div>
                    <div className="alert-content">
                        <div className="alert-text">No calls yet</div>
                        <div className="alert-subtext">
                            Connect RingCentral or Call Tracking Metrics in <a href="/dashboard/api-settings" style={{ textDecoration: 'underline' }}>API Settings</a> to start logging calls.
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

            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Recent Call History</h2>
                    <p className="card-subtitle">
                        {loading ? 'Loading…' : `${totalCalls} call${totalCalls === 1 ? '' : 's'}`}
                    </p>
                </div>
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
                                </div>
                                <div className="call-duration">{formatDuration(call.duration_seconds)}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <SourceBadge source={call.source} />
                                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                                        {call.status}{call.needs_assignment ? ' · unassigned' : ''}
                                    </span>
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
                                            <div className="note-value">
                                                <button
                                                    className="pagination-btn"
                                                    onClick={(e) => { e.stopPropagation(); openCallDetails(call); }}
                                                >View Details</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>

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
                <div className="modal active" onClick={(e) => e.target.classList.contains('modal') && closeModal()}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Call Details</h2>
                            <button className="modal-close" onClick={closeModal}>×</button>
                        </div>
                        <div className="modal-body">
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

                            {selectedCall.recording_s3_key && (
                                <div className="detail-section">
                                    <div className="detail-label">Call Recording</div>
                                    <div className="recording-player">
                                        {recordingCallId === selectedCall.id && recordingUrl ? (
                                            <audio
                                                controls
                                                autoPlay
                                                src={recordingUrl}
                                                style={{ width: '100%' }}
                                            />
                                        ) : (
                                            <>
                                                <button
                                                    className="play-button"
                                                    disabled={recordingLoading}
                                                    onClick={() => playRecording(selectedCall)}
                                                >
                                                    <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                                </button>
                                                <div style={{ fontSize: 12, color: '#6b7280' }}>
                                                    {recordingLoading ? 'Loading…' : 'Click to play'}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default AICallCenter;
