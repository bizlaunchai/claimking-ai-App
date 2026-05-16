'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import axiosInstance from '@/lib/axiosInstance';

// ─────────────────────────────────────────────────────────────────────────────
// Unified activity timeline shown on the homeowner-facing portal.
//
// Data source: GET /portal-public/<token>/timeline?type=<eventType>
// Each entry has { id, event_type, event_data, created_at, ...source FKs }.
// event_data.summary is the one-line label we render in the feed.
//
// Tabs filter by event_type group. "All" returns everything; the others
// re-fetch with ?type=<event_type>.
//
// Pagination via ?before=<iso-timestamp> cursor — newest 50 first, "Load
// older" appends the next 50.
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
    { key: 'all',                       label: 'All Activity',     types: null },
    { key: 'estimate_created',          label: 'Estimates',        types: ['estimate_created', 'estimate_sent', 'estimate_revised', 'estimate_signed'] },
    { key: 'mockup_generated',          label: '3D Mockups',       types: ['mockup_generated', 'mockup_shared'] },
    { key: 'policy_analysis_completed', label: 'Policy Analyses',  types: ['policy_analysis_run', 'policy_analysis_completed'] },
    { key: 'claim_status_changed',      label: 'Status Changes',   types: ['claim_status_changed'] },
];

// Per-event styling (dot colour + small badge text). Spec wants the
// homeowner to instantly recognise each event category.
const EVENT_META = {
    estimate_created:           { dot: '#16a34a', badge: 'Estimate',         badgeBg: '#dcfce7',  badgeFg: '#15803d' },
    estimate_sent:              { dot: '#16a34a', badge: 'Estimate sent',    badgeBg: '#dcfce7',  badgeFg: '#15803d' },
    estimate_revised:           { dot: '#16a34a', badge: 'Estimate revised', badgeBg: '#dcfce7',  badgeFg: '#15803d' },
    estimate_signed:            { dot: '#0ea5e9', badge: 'Signed',           badgeBg: '#dbeafe',  badgeFg: '#1e40af' },
    mockup_generated:           { dot: '#FDB813', badge: 'Mockup',           badgeBg: '#fef3c7',  badgeFg: '#92400e' },
    mockup_shared:              { dot: '#FDB813', badge: 'Mockup shared',    badgeBg: '#fef3c7',  badgeFg: '#92400e' },
    policy_analysis_run:        { dot: '#a855f7', badge: 'Policy analysis',  badgeBg: '#f3e8ff',  badgeFg: '#7e22ce' },
    policy_analysis_completed:  { dot: '#a855f7', badge: 'Policy analysis',  badgeBg: '#f3e8ff',  badgeFg: '#7e22ce' },
    claim_status_changed:       { dot: '#1a1f3a', badge: 'Status',           badgeBg: '#e0e7ff',  badgeFg: '#4338ca' },
    document_uploaded:          { dot: '#6b7280', badge: 'Document',         badgeBg: '#f3f4f6',  badgeFg: '#374151' },
    note_added:                 { dot: '#6b7280', badge: 'Note',             badgeBg: '#f3f4f6',  badgeFg: '#374151' },
};

const fmtWhen = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const today = new Date(); today.setHours(0,0,0,0);
    const yest  = new Date(today); yest.setDate(today.getDate() - 1);
    const dDay = new Date(d); dDay.setHours(0,0,0,0);
    const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (dDay.getTime() === today.getTime()) return `Today, ${time}`;
    if (dDay.getTime() === yest.getTime())  return `Yesterday, ${time}`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + `, ${time}`;
};

const PAGE_SIZE = 50;

export default function PortalTimeline() {
    const params = useParams();
    const token = params?.token;

    const [tabKey, setTabKey] = useState('all');
    const [rows, setRows]     = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);

    const activeTab = useMemo(
        () => TABS.find((t) => t.key === tabKey) ?? TABS[0],
        [tabKey],
    );

    const fetchPage = async ({ append = false } = {}) => {
        if (!token) return;
        if (append) setLoadingMore(true); else setLoading(true);
        try {
            const params = { limit: PAGE_SIZE };
            // For grouped tabs, the backend only filters by a single event_type
            // string, so we fetch each member and merge. For most tabs there's
            // only one type to fetch; for "Estimates" we fetch all 4 in parallel.
            const typesToFetch = activeTab.types?.length
                ? activeTab.types
                : [null];

            if (append && rows.length > 0) {
                params.before = rows[rows.length - 1].created_at;
            }

            const responses = await Promise.all(
                typesToFetch.map((t) => axiosInstance.get(
                    `/portal-public/${token}/timeline`,
                    {
                        params: { ...params, ...(t ? { type: t } : {}) },
                        suppressErrorToast: true,
                    },
                )),
            );

            // Merge + dedupe + sort newest-first.
            const merged = responses.flatMap((r) => r.data ?? []);
            const seen = new Set();
            const deduped = merged.filter((r) => {
                if (seen.has(r.id)) return false;
                seen.add(r.id); return true;
            });
            deduped.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            const next = append ? [...rows, ...deduped] : deduped;
            setRows(next);
            setHasMore(deduped.length >= PAGE_SIZE);
        } catch {
            // axios interceptor handles toast — keep silent here so a single
            // failed tab doesn't break the rest of the page.
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => { fetchPage(); /* eslint-disable-next-line */ }, [token, tabKey]);

    return (
        <div>
            {/* Tab strip — horizontally scrollable on phones so all 5
                tabs stay reachable without wrapping awkwardly. */}
            <div style={{
                display: 'flex', gap: 6,
                marginBottom: '1rem',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                paddingBottom: 4,
            }}>
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTabKey(t.key)}
                        style={{
                            padding: '0.4rem 0.875rem',
                            background: tabKey === t.key ? '#1a1f3a' : '#fff',
                            color:      tabKey === t.key ? '#FDB813' : '#374151',
                            border: tabKey === t.key ? 'none' : '1px solid #e5e7eb',
                            borderRadius: 6,
                            fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            whiteSpace: 'nowrap', flexShrink: 0,
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Feed */}
            {loading ? (
                <div style={{ padding: '2rem 0', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
                    Loading timeline…
                </div>
            ) : rows.length === 0 ? (
                <div style={{
                    padding: '2rem 1rem', textAlign: 'center', color: '#6b7280',
                    background: '#f9fafb', border: '1px dashed #e5e7eb',
                    borderRadius: 10, fontSize: 14,
                }}>
                    No activity yet for this section. Your contractor will update you here as work progresses.
                </div>
            ) : (
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: '1.25rem' }}>
                    <div style={{ borderLeft: '2px solid #e5e7eb', paddingLeft: '1rem', marginLeft: '0.5rem' }}>
                        {rows.map((row) => {
                            const meta = EVENT_META[row.event_type] || EVENT_META.note_added;
                            const summary = row.event_data?.summary || row.event_type;
                            return (
                                <div key={row.id} style={{ marginBottom: '1.25rem', position: 'relative' }}>
                                    <span style={{
                                        position: 'absolute', left: '-1.45rem', top: '0.2rem',
                                        width: 12, height: 12, borderRadius: '50%',
                                        background: meta.dot, border: '2px solid #fff',
                                        boxShadow: `0 0 0 2px ${meta.dot}`,
                                    }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1f3a' }}>
                                            {summary}
                                        </div>
                                        <span style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>
                                            {fmtWhen(row.created_at)}
                                        </span>
                                    </div>
                                    <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <span style={{
                                            padding: '0.15rem 0.5rem',
                                            background: meta.badgeBg, color: meta.badgeFg,
                                            borderRadius: 4, fontSize: 11, fontWeight: 700,
                                            textTransform: 'uppercase', letterSpacing: 0.04,
                                        }}>
                                            {meta.badge}
                                        </span>
                                        {row.event_data?.amount != null && (
                                            <span style={{ fontSize: 12, color: '#374151' }}>
                                                ${Number(row.event_data.amount).toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {hasMore && (
                        <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                            <button
                                onClick={() => fetchPage({ append: true })}
                                disabled={loadingMore}
                                style={{
                                    padding: '0.5rem 1rem', background: '#fff',
                                    border: '1px solid #e5e7eb', borderRadius: 6,
                                    fontSize: 13, color: '#1a1f3a', fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                {loadingMore ? 'Loading…' : 'Load older activity'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
