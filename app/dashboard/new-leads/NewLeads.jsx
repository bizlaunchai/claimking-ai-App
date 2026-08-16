'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Flame, Sun, Snowflake, Phone, MessageSquare, CalendarPlus, FileText,
    ArrowRightCircle, MoreHorizontal, X, MapPin, LayoutGrid, List as ListIcon,
    RefreshCw, CloudLightning, Clock, UserPlus, Ban, ThumbsDown, Eye, Plus, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance';
import { usePermissions } from '@/lib/permissions/PermissionsContext';
import AddressAutocomplete from '@/components/common/AddressAutocomplete';
import 'leaflet/dist/leaflet.css';
import './new-leads.css';

// ─── Status model (mirror of the backend transition service) ─────────────
// Order = the New Leads pipeline. `hot` is a virtual tab (new + contacted).
const STATUS_META = {
    new: { label: 'New', cls: 'new' },
    contacted: { label: 'Contacted', cls: 'contacted' },
    no_reply: { label: 'No Reply', cls: 'no-reply' },
    estimate_scheduled: { label: 'Est. Scheduled', cls: 'est-scheduled' },
    estimate_sent: { label: 'Est. Sent', cls: 'est-sent' },
    follow_up: { label: 'Follow Up', cls: 'follow-up' },
    claim_started: { label: 'Claim Started', cls: 'claim-started' },
    job_approved: { label: 'Job Approved', cls: 'job-approved' },
    declined: { label: 'Declined', cls: 'declined' },
    do_not_contact: { label: 'Do Not Contact', cls: 'dnc' },
};
const PIPELINE = Object.keys(STATUS_META);

// Tabs shown above the board. Hot first (the default working queue).
const TABS = [
    { key: 'hot', label: 'Hot' },
    ...PIPELINE.map((k) => ({ key: k, label: STATUS_META[k].label })),
];

// Front-end mirror of the backend ALLOWED map — UX affordance only, the server
// re-validates every move (an illegal drop/select just surfaces its 400 toast).
const ALLOWED_NEXT = {
    new: ['contacted', 'estimate_scheduled', 'claim_started', 'declined', 'do_not_contact'],
    contacted: ['no_reply', 'estimate_scheduled', 'estimate_sent', 'follow_up', 'claim_started', 'declined', 'do_not_contact'],
    no_reply: ['contacted', 'declined', 'do_not_contact'],
    estimate_scheduled: ['estimate_sent', 'follow_up', 'claim_started', 'declined', 'do_not_contact'],
    estimate_sent: ['follow_up', 'claim_started', 'declined', 'do_not_contact'],
    follow_up: ['contacted', 'estimate_scheduled', 'claim_started', 'declined', 'do_not_contact'],
    claim_started: ['job_approved'],
    job_approved: [],
    declined: ['contacted'],
    do_not_contact: ['contacted'], // admin-only on the server
};

const REASON_REQUIRED = new Set(['declined', 'do_not_contact']);

// Known source keys → display label + pill colour class. Unknown sources fall
// back to a neutral pill with the raw key title-cased.
const SOURCE_META = {
    'google-ad': { label: 'Google Ads', cls: 'google-ad' },
    google_ads: { label: 'Google Ads', cls: 'google-ad' },
    organic: { label: 'Organic Search', cls: 'organic' },
    gmb: { label: 'Google My Business', cls: 'gmb' },
    'facebook-ad': { label: 'Facebook Ads', cls: 'facebook-ad' },
    facebook_ads: { label: 'Facebook Ads', cls: 'facebook-ad' },
    referral: { label: 'Referral', cls: 'referral' },
    phone: { label: 'Phone Call', cls: 'phone' },
    ai_call: { label: 'AI Call', cls: 'ai-call' },
    form: { label: 'Website Form', cls: 'form' },
    webhook: { label: 'Webhook', cls: 'webhook' },
    manual: { label: 'Manual', cls: 'manual' },
};
function sourceInfo(src) {
    if (!src) return { label: 'Unknown', cls: 'unknown' };
    return SOURCE_META[src] || { label: src.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), cls: 'unknown' };
}

// ─── small helpers ────────────────────────────────────────────────────────
function fmtRelative(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const s = (Date.now() - d.getTime()) / 1000;
    if (s < 0) return 'just now';
    if (s < 60) return 'just now';
    const m = s / 60;
    if (m < 60) return `${Math.floor(m)} min ago`;
    const h = m / 60;
    if (h < 24) return `${Math.floor(h)}h ago`;
    const days = h / 24;
    if (days < 7) return `${Math.floor(days)}d ago`;
    return d.toLocaleDateString();
}
function fullName(l) {
    const n = `${l.first_name || ''} ${l.last_name || ''}`.trim();
    return n || l.email || l.phone || 'Unnamed lead';
}
// Speed-to-lead: an untouched New lead older than 5 min is overdue (BL 4.5.5).
function isOverdue(l) {
    if (l.status !== 'new' || (l.touches ?? 0) > 0) return false;
    return Date.now() - new Date(l.created_at).getTime() > 5 * 60 * 1000;
}
function recordingUrl(l) {
    const d = l.source_detail || {};
    return d.recording_url || d.recording || d.call_recording_url || null;
}

const ScoreBadge = ({ score }) => {
    const map = {
        hot: <><Flame size={12} strokeWidth={2.5} style={{ verticalAlign: '-2px', marginRight: 3 }} />HOT</>,
        warm: <><Sun size={12} strokeWidth={2.5} style={{ verticalAlign: '-2px', marginRight: 3 }} />WARM</>,
        cold: <><Snowflake size={12} strokeWidth={2.5} style={{ verticalAlign: '-2px', marginRight: 3 }} />COLD</>,
    };
    // lead_score is a 0–100 number from the backend (band thresholds match
    // lead-enrichment.service: ≥75 Hot, ≥50 Warm, else Cold). Older/seed rows may
    // carry a band string or null — handle all three without crashing.
    const s = typeof score === 'number'
        ? (score >= 75 ? 'hot' : score >= 50 ? 'warm' : 'cold')
        : String(score || 'cold').toLowerCase();
    return <span className={`lead-score ${s}`}>{map[s] || map.cold}</span>;
};
const StatusPill = ({ status }) => {
    const m = STATUS_META[status] || { label: status, cls: 'unknown' };
    return <span className={`nl-status-pill ${m.cls}`}>{m.label}</span>;
};

// Clickable status badge (Q1.3) — the current status as a button that drops a
// menu of allowed next statuses. Fixed-positioned so it isn't clipped by the
// table/board overflow. Reason-required moves (Decline / DNC) route through the
// same reason modal via onChange. The server re-validates every transition.
function StatusMenu({ lead, onChange, disabled }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState(null);
    const nexts = ALLOWED_NEXT[lead.status] || [];
    const toggle = (e) => {
        e.stopPropagation();
        if (open || !nexts.length) { setOpen(false); return; }
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ top: r.bottom + 4, left: r.left });
        setOpen(true);
    };
    useEffect(() => {
        if (!open) return;
        const close = () => setOpen(false);
        window.addEventListener('click', close);
        window.addEventListener('scroll', close, true);
        return () => { window.removeEventListener('click', close); window.removeEventListener('scroll', close, true); };
    }, [open]);
    return (
        <span className="nl-status-menu-wrap" onClick={(e) => e.stopPropagation()}>
            <button type="button" className={`nl-status-trigger ${nexts.length ? 'clickable' : ''}`} onClick={toggle} disabled={disabled} title={nexts.length ? 'Change status' : 'No moves available'}>
                <StatusPill status={lead.status} />
                {!!nexts.length && <ChevronDown size={12} className="nl-status-caret" />}
            </button>
            {open && nexts.length > 0 && (
                <div className="nl-status-dropdown" style={{ position: 'fixed', top: pos?.top, left: pos?.left }}>
                    <div className="nl-status-dd-head">Move to…</div>
                    {nexts.map((s) => (
                        <button key={s} type="button" className="nl-status-dd-item" onClick={() => { setOpen(false); onChange(lead, s); }}>
                            <span className={`nl-kdot ${STATUS_META[s].cls}`} /> {STATUS_META[s].label}
                            {REASON_REQUIRED.has(s) && <span className="nl-dd-note">reason</span>}
                        </button>
                    ))}
                </div>
            )}
        </span>
    );
}

// ==========================================================================
// Page
// ==========================================================================
export default function NewLeads() {
    const router = useRouter();
    const { has } = usePermissions();
    const canViewAll = has('view_all_leads');
    const canConvert = has('convert_lead');

    const [tab, setTab] = useState('hot');
    const [view, setView] = useState('queue');            // queue | kanban | map
    const [search, setSearch] = useState('');
    const [sourceFilter, setSourceFilter] = useState('all');
    const [employeeFilter, setEmployeeFilter] = useState('all'); // all | unassigned | userId

    const [rows, setRows] = useState([]);
    const [board, setBoard] = useState({});
    const [loading, setLoading] = useState(true);
    const [teamMembers, setTeamMembers] = useState([]);

    const [busyId, setBusyId] = useState(null);
    const [menuId, setMenuId] = useState(null);           // open overflow menu
    const [reasonModal, setReasonModal] = useState(null); // { lead, to }
    const [drawerId, setDrawerId] = useState(null);       // open detail drawer
    const [showCreate, setShowCreate] = useState(false);  // + New Lead modal (Q1.2)

    const nameOf = useCallback(
        (userId) => teamMembers.find((m) => m.id === userId)?.name || (userId ? 'Team member' : 'Unassigned'),
        [teamMembers],
    );

    // ── data load ───────────────────────────────────────────────────────────
    const loadBoard = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/leads/board', { suppressErrorToast: true });
            setBoard(res.data?.data || {});
        } catch { /* counts degrade to 0 */ }
    }, []);

    const loadRows = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page: 1, pageSize: 100 };
            if (tab !== 'hot') params.status = tab;
            if (canViewAll && employeeFilter !== 'all') params.assigned_to = employeeFilter;
            const res = await axiosInstance.get('/leads', { params });
            let data = res.data?.data || [];
            // Hot = new + contacted (the server has no single "hot" status).
            if (tab === 'hot') data = data.filter((l) => l.status === 'new' || l.status === 'contacted');
            setRows(data);
        } catch {
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [tab, canViewAll, employeeFilter]);

    const refresh = useCallback(() => { loadBoard(); loadRows(); }, [loadBoard, loadRows]);

    useEffect(() => { loadBoard(); }, [loadBoard]);
    useEffect(() => { loadRows(); }, [loadRows]);

    // Team list for reassign + the employee filter (needs view-all).
    useEffect(() => {
        if (!canViewAll) return;
        (async () => {
            try {
                const res = await axiosInstance.get('/team/members', { suppressErrorToast: true });
                const list = res.data?.data || res.data || [];
                setTeamMembers(
                    list
                        .map((m) => ({
                            id: m.id || m.user_id,
                            name: m.full_name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email || 'Member',
                        }))
                        .filter((m) => m.id),
                );
            } catch { /* degrades to All / Unassigned */ }
        })();
    }, [canViewAll]);

    // ── client-side filters (search + source) ────────────────────────────────
    const filtered = useMemo(() => {
        return rows.filter((l) => {
            if (sourceFilter !== 'all' && l.source !== sourceFilter) return false;
            if (search) {
                const q = search.toLowerCase();
                const hay = `${fullName(l)} ${l.phone || ''} ${l.email || ''} ${l.address_line1 || ''} ${l.city || ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [rows, sourceFilter, search]);

    const sourceOptions = useMemo(() => {
        const set = new Set(rows.map((l) => l.source).filter(Boolean));
        return Array.from(set);
    }, [rows]);

    // ── mutations ─────────────────────────────────────────────────────────────
    const withBusy = async (id, fn, successMsg) => {
        setBusyId(id);
        try {
            await fn();
            if (successMsg) toast.success(successMsg);
            await refresh();
        } catch (e) {
            toast.error(e?.userMessage || 'Action failed');
        } finally {
            setBusyId(null);
            setMenuId(null);
        }
    };

    const logTouch = (lead, type, direction, summary) =>
        axiosInstance.post(`/leads/${lead.id}/touch`, { type, direction, summary });

    const doCall = (lead) => {
        if (lead.phone) { try { window.open(`tel:${lead.phone}`); } catch { /* no dialer */ } }
        withBusy(lead.id, () => logTouch(lead, 'call', 'outbound', 'Outbound call'), 'Call logged');
    };
    const doText = (lead) => {
        // A2P registration gates real SMS; here we log the outbound touch (which
        // also moves New → Contacted server-side).
        if (lead.phone) { try { window.open(`sms:${lead.phone}`); } catch { /* no sms app */ } }
        withBusy(lead.id, () => logTouch(lead, 'sms', 'outbound', 'Outbound text'), 'Text logged');
    };
    const setStatus = (lead, to, reason) =>
        withBusy(
            lead.id,
            () => axiosInstance.patch(`/leads/${lead.id}/status`, { to, reason }),
            `Moved to ${STATUS_META[to]?.label || to}`,
        );
    // Schedule → the real Scheduling page, prefilled + linked to this lead.
    // Creating the appointment there flips the lead to Estimate Scheduled
    // (server-side side-effect), so no interim status-move here.
    const doSchedule = (lead) => {
        const addr = [lead.address_line1, lead.city, lead.state, lead.zip].filter(Boolean).join(', ');
        const qs = new URLSearchParams({ lead_id: lead.id });
        if (addr) qs.set('address', addr);
        router.push(`/dashboard/schedule?${qs.toString()}`);
    };
    const doEstimate = (lead) => setStatus(lead, 'estimate_sent');
    const doReassign = (lead, userId) =>
        withBusy(lead.id, () => axiosInstance.patch(`/leads/${lead.id}/assign`, { user_id: userId || null }), 'Reassigned');
    const doConvert = (lead) =>
        withBusy(lead.id, async () => {
            const res = await axiosInstance.post(`/leads/${lead.id}/convert`, {});
            if (res.data?.claim_id) {
                toast.success('Converted — claim created');
                router.push('/dashboard/claims');
            }
        });

    // Reason modal (Decline / DNC) — replaces window.prompt.
    const askReason = (lead, to) => { setMenuId(null); setReasonModal({ lead, to }); };
    const confirmReason = (reason) => {
        if (!reasonModal) return;
        const { lead, to } = reasonModal;
        setReasonModal(null);
        setStatus(lead, to, reason);
    };
    // Click-to-change status (Q1.3): reason-required moves route through the modal,
    // everything else applies immediately. Shared by the Queue + Kanban badges.
    const changeStatus = (lead, to) => {
        if (!to || to === lead.status) return;
        if (REASON_REQUIRED.has(to)) askReason(lead, to);
        else setStatus(lead, to);
    };

    // ── stats derived from the (unfiltered) board counts ──────────────────────
    const stat = (k) => board[k] ?? 0;
    const converted = stat('claim_started') + stat('job_approved');

    return (
        <div className="new-leads-page" onClick={() => setMenuId(null)}>
            {/* Header */}
            <div className="page-header">
                <div>
                    <div className="page-title">New Leads</div>
                    <div className="page-subtitle">
                        Every incoming lead — calls, forms, and integrations — in one live pipeline
                    </div>
                </div>
                <div className="header-right">
                    <button className="btn-secondary" onClick={refresh} title="Refresh">
                        <RefreshCw size={15} style={{ verticalAlign: '-3px' }} /> Refresh
                    </button>
                    <button className="btn-primary" onClick={() => setShowCreate(true)}>
                        <Plus size={16} style={{ verticalAlign: '-3px' }} /> New Lead
                    </button>
                </div>
            </div>

            <div className="content">
                {/* Stats */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-label">Total Leads</div>
                        <div className="stat-value">{stat('total')}</div>
                        <div className="stat-meta">All statuses</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Hot Queue</div>
                        <div className="stat-value">{stat('hot')}</div>
                        <div className="stat-meta">New + Contacted</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Converted</div>
                        <div className="stat-value">{converted}</div>
                        <div className="stat-meta">Claim Started + Job Approved</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">No Reply</div>
                        <div className="stat-value">{stat('no_reply')}</div>
                        <div className="stat-meta">Needs re-engagement</div>
                    </div>
                </div>

                {/* Status tabs with live counts */}
                <div className="pipeline-nav">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            className={`pipeline-tab ${tab === t.key ? 'active' : ''}`}
                            onClick={() => setTab(t.key)}
                        >
                            {t.label}
                            <span className="tab-count">{board[t.key] ?? 0}</span>
                        </button>
                    ))}
                </div>

                {/* Toolbar */}
                <div className="toolbar nl-toolbar">
                    <div className="toolbar-left">
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search name, phone, address…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <select className="filter-select" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                            <option value="all">All Sources</option>
                            {sourceOptions.map((s) => (
                                <option key={s} value={s}>{sourceInfo(s).label}</option>
                            ))}
                        </select>
                        {canViewAll && (
                            <select className="filter-select" value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
                                <option value="all">All Employees</option>
                                <option value="unassigned">Unassigned</option>
                                {teamMembers.map((m) => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                    <div className="nl-view-toggle" role="tablist" aria-label="Lead view">
                        <button className={`nl-view-btn ${view === 'queue' ? 'active' : ''}`} onClick={() => setView('queue')} title="List — every lead in a table you can scan and act on">
                            <ListIcon size={15} /> List
                        </button>
                        <button className={`nl-view-btn ${view === 'kanban' ? 'active' : ''}`} onClick={() => setView('kanban')} title="Board — pipeline columns by status; drag or click a card to move it between stages">
                            <LayoutGrid size={15} /> Board
                        </button>
                        <button className={`nl-view-btn ${view === 'map' ? 'active' : ''}`} onClick={() => setView('map')} title="Map — leads plotted by their address">
                            <MapPin size={15} /> Map
                        </button>
                    </div>
                </div>

                {/* Views */}
                {view === 'queue' && (
                    <QueueView
                        loading={loading}
                        rows={filtered}
                        busyId={busyId}
                        menuId={menuId}
                        setMenuId={setMenuId}
                        canConvert={canConvert}
                        canViewAll={canViewAll}
                        teamMembers={teamMembers}
                        nameOf={nameOf}
                        onCall={doCall}
                        onText={doText}
                        onSchedule={doSchedule}
                        onEstimate={doEstimate}
                        onConvert={doConvert}
                        onReassign={doReassign}
                        onDecline={(l) => askReason(l, 'declined')}
                        onDnc={(l) => askReason(l, 'do_not_contact')}
                        onChangeStatus={changeStatus}
                        onView={(l) => setDrawerId(l.id)}
                    />
                )}
                {view === 'kanban' && (
                    <KanbanView
                        loading={loading}
                        rows={filtered}
                        busyId={busyId}
                        onMove={(lead, to) => setStatus(lead, to)}
                        onChangeStatus={changeStatus}
                        onOpen={(l) => setDrawerId(l.id)}
                    />
                )}
                {view === 'map' && <MapView rows={filtered} onOpen={(id) => setDrawerId(id)} />}
            </div>

            {/* Reason modal */}
            {reasonModal && (
                <ReasonModal
                    to={reasonModal.to}
                    lead={reasonModal.lead}
                    onCancel={() => setReasonModal(null)}
                    onConfirm={confirmReason}
                />
            )}

            {/* Detail drawer */}
            {drawerId && (
                <LeadDrawer
                    leadId={drawerId}
                    nameOf={nameOf}
                    canConvert={canConvert}
                    canViewAll={canViewAll}
                    teamMembers={teamMembers}
                    onClose={() => setDrawerId(null)}
                    onChanged={refresh}
                />
            )}

            {/* + New Lead quick-create (Q1.2) */}
            {showCreate && (
                <NewLeadModal
                    canViewAll={canViewAll}
                    teamMembers={teamMembers}
                    onClose={() => setShowCreate(false)}
                    onCreated={(status) => { setShowCreate(false); if (status && status !== tab && tab !== 'hot') setTab(status); refresh(); }}
                />
            )}
        </div>
    );
}

// ==========================================================================
// + New Lead quick-create modal (Q1.2) — status selectable at creation so Nate
// can backfill leads directly into any stage. Address is plain fields for now;
// swaps to the shared Google-Places component when Q0.1 lands.
// ==========================================================================
const CREATE_SOURCES = [
    ['manual', 'Manual'], ['referral', 'Referral'], ['web_form', 'Website Form'],
    ['facebook', 'Facebook'], ['ai_call', 'Phone / AI Call'],
];
function NewLeadModal({ canViewAll, teamMembers, onClose, onCreated }) {
    const [f, setF] = useState({
        first_name: '', last_name: '', phone: '', email: '',
        address_line1: '', city: '', state: '', zip: '',
        damage_type: '', source: 'manual', status: 'new', notes: '', assigned_to: '',
    });
    const [busy, setBusy] = useState(false);
    const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

    const submit = async () => {
        if (!f.first_name.trim() && !f.last_name.trim() && !f.phone.trim() && !f.email.trim()) {
            toast.error('Add at least a name, phone, or email.');
            return;
        }
        setBusy(true);
        try {
            const payload = { source: f.source, status: f.status };
            ['first_name', 'last_name', 'phone', 'email', 'address_line1', 'city', 'state', 'zip', 'damage_type', 'notes'].forEach((k) => {
                if (f[k]?.trim()) payload[k] = f[k].trim();
            });
            if (canViewAll && f.assigned_to) payload.assigned_to = f.assigned_to;
            const res = await axiosInstance.post('/leads', payload);
            if (res.data?.duplicate) {
                toast.warning(res.data.message || 'This looks like an existing record.');
            } else {
                toast.success(`Lead created${f.status !== 'new' ? ` in ${STATUS_META[f.status]?.label}` : ''}.`);
            }
            onCreated(f.status);
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Could not create the lead.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="modal-backdrop active" onClick={busy ? undefined : onClose}>
            <div className="modal-box nl-create-box" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">New Lead</div>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <div className="nl-form-grid">
                        <div className="nl-field"><label>First name</label><input value={f.first_name} onChange={(e) => set('first_name', e.target.value)} placeholder="Jane" /></div>
                        <div className="nl-field"><label>Last name</label><input value={f.last_name} onChange={(e) => set('last_name', e.target.value)} placeholder="Doe" /></div>
                        <div className="nl-field"><label>Phone</label><input type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(330) 555-0100" /></div>
                        <div className="nl-field"><label>Email</label><input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="jane@email.com" /></div>
                        <div className="nl-field nl-col-2"><label>Address</label>
                            <AddressAutocomplete
                                placeholder="123 Main St"
                                value={f.address_line1}
                                onChange={(v) => set('address_line1', v)}
                                onSelect={(p) => setF((prev) => ({
                                    ...prev,
                                    address_line1: p.address || prev.address_line1,
                                    city: p.city || prev.city,
                                    state: p.state || prev.state,
                                    zip: p.zip || prev.zip,
                                }))} />
                        </div>
                        <div className="nl-field"><label>City</label><input value={f.city} onChange={(e) => set('city', e.target.value)} placeholder="Akron" /></div>
                        <div className="nl-field nl-field-3">
                            <div><label>State</label><input value={f.state} onChange={(e) => set('state', e.target.value)} placeholder="OH" /></div>
                            <div><label>ZIP</label><input value={f.zip} onChange={(e) => set('zip', e.target.value)} placeholder="44301" /></div>
                        </div>
                        <div className="nl-field"><label>Damage type</label><input value={f.damage_type} onChange={(e) => set('damage_type', e.target.value)} placeholder="Roof / Hail" /></div>
                        <div className="nl-field"><label>Source</label><select value={f.source} onChange={(e) => set('source', e.target.value)}>{CREATE_SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                        <div className="nl-field"><label>Status</label><select value={f.status} onChange={(e) => set('status', e.target.value)}>{PIPELINE.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}</select></div>
                        {canViewAll && (
                            <div className="nl-field"><label>Assign to</label><select value={f.assigned_to} onChange={(e) => set('assigned_to', e.target.value)}><option value="">Me</option>{teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
                        )}
                        <div className="nl-field nl-col-2"><label>Notes</label><textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="Anything worth noting…" /></div>
                    </div>
                    {f.status === 'do_not_contact' && <div className="help">Do Not Contact suppresses all outreach company-wide.</div>}
                </div>
                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
                    <button className="btn-primary" onClick={submit} disabled={busy}>{busy ? 'Creating…' : 'Create Lead'}</button>
                </div>
            </div>
        </div>
    );
}

// ==========================================================================
// Queue (table) view — sticky far-left actions column (task 2.7)
// ==========================================================================
function QueueView({
    loading, rows, busyId, menuId, setMenuId, canConvert, canViewAll, teamMembers, nameOf,
    onCall, onText, onSchedule, onEstimate, onConvert, onReassign, onDecline, onDnc, onChangeStatus, onView,
}) {
    // Fixed-position anchor for the overflow menu — the table's overflow:hidden /
    // overflow-x:auto would otherwise CLIP an absolutely-positioned dropdown (only
    // the first item showed). Captured from the button's rect on open.
    const [menuPos, setMenuPos] = useState(null);
    const openMenu = (id, e) => {
        e.stopPropagation(); // don't let this click reach the window-close listener
        if (menuId === id) { setMenuId(null); return; }
        const r = e.currentTarget.getBoundingClientRect();
        setMenuPos({ top: r.bottom + 4, left: r.left });
        setMenuId(id);
    };
    // Close the overflow menu on any outside click or scroll (the menu itself
    // stops propagation, so in-menu clicks are safe).
    useEffect(() => {
        if (!menuId) return;
        const close = () => setMenuId(null);
        window.addEventListener('click', close);
        window.addEventListener('scroll', close, true);
        return () => { window.removeEventListener('click', close); window.removeEventListener('scroll', close, true); };
    }, [menuId, setMenuId]);
    if (loading) return <div className="nl-panel"><div className="empty-state">Loading leads…</div></div>;
    if (!rows.length) return <div className="nl-panel"><div className="empty-state">No leads in this view.</div></div>;

    return (
        <div className="table-card nl-panel">
            <div className="table-scroll">
                <table className="nl-table">
                    <thead>
                        <tr>
                            <th className="nl-sticky-col">Actions</th>
                            <th>Lead</th>
                            <th>Source</th>
                            <th>Score</th>
                            <th>Status</th>
                            <th>Assigned</th>
                            <th>Touches</th>
                            <th>Received</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((l) => {
                            const busy = busyId === l.id;
                            const src = sourceInfo(l.source);
                            const overdue = isOverdue(l);
                            const canConv = ALLOWED_NEXT[l.status]?.includes('claim_started');
                            return (
                                <tr key={l.id} className="lead-row">
                                    {/* Sticky actions */}
                                    <td className="nl-sticky-col">
                                        <div className="nl-actions">
                                            <button className="nl-act call" disabled={busy} title="Call" onClick={() => onCall(l)}>
                                                <Phone size={14} />
                                            </button>
                                            <button className="nl-act text" disabled={busy} title="Text" onClick={() => onText(l)}>
                                                <MessageSquare size={14} />
                                            </button>
                                            <button className="nl-act sched" disabled={busy} title="Schedule estimate" onClick={() => onSchedule(l)}>
                                                <CalendarPlus size={14} />
                                            </button>
                                            <button className="nl-act est" disabled={busy} title="Mark estimate sent" onClick={() => onEstimate(l)}>
                                                <FileText size={14} />
                                            </button>
                                            {canConvert && canConv && (
                                                <button className="nl-act convert" disabled={busy} title="Convert to claim" onClick={() => onConvert(l)}>
                                                    <ArrowRightCircle size={14} />
                                                </button>
                                            )}
                                            <div className="nl-menu-wrap" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    className="nl-act more"
                                                    title="More"
                                                    onClick={(e) => openMenu(l.id, e)}
                                                >
                                                    <MoreHorizontal size={14} />
                                                </button>
                                                {menuId === l.id && (
                                                    <div className="nl-menu" style={{ position: 'fixed', top: menuPos?.top, left: menuPos?.left }}>
                                                        <button onClick={() => { setMenuId(null); onView(l); }}>
                                                            <Eye size={13} /> View details
                                                        </button>
                                                        {canViewAll && (
                                                            <div className="nl-menu-reassign">
                                                                <span><UserPlus size={13} /> Reassign</span>
                                                                <select
                                                                    defaultValue={l.assigned_to || ''}
                                                                    onChange={(e) => onReassign(l, e.target.value)}
                                                                >
                                                                    <option value="">Unassigned</option>
                                                                    {teamMembers.map((m) => (
                                                                        <option key={m.id} value={m.id}>{m.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        )}
                                                        {ALLOWED_NEXT[l.status]?.includes('declined') && (
                                                            <button className="danger" onClick={() => onDecline(l)}>
                                                                <ThumbsDown size={13} /> Decline
                                                            </button>
                                                        )}
                                                        {ALLOWED_NEXT[l.status]?.includes('do_not_contact') && (
                                                            <button className="danger" onClick={() => onDnc(l)}>
                                                                <Ban size={13} /> Do Not Contact
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Lead */}
                                    <td>
                                        <button className="nl-name-btn" onClick={() => onView(l)}>{fullName(l)}</button>
                                        <div className="lead-contact lead-phone">{l.phone || '—'}</div>
                                        {(l.address_line1 || l.city) && (
                                            <div className="lead-contact">{[l.address_line1, l.city, l.state].filter(Boolean).join(', ')}</div>
                                        )}
                                    </td>

                                    {/* Source */}
                                    <td><span className={`source-pill ${src.cls}`}>{src.label}</span></td>

                                    {/* Score */}
                                    <td><ScoreBadge score={l.lead_score} /></td>

                                    {/* Status */}
                                    <td><StatusMenu lead={l} onChange={onChangeStatus} disabled={busyId === l.id} /></td>

                                    {/* Assigned */}
                                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{nameOf(l.assigned_to)}</td>

                                    {/* Touches */}
                                    <td style={{ fontSize: '0.8rem' }}>{l.touches ?? 0}</td>

                                    {/* Received */}
                                    <td style={{ fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                                        {fmtRelative(l.created_at)}
                                        {overdue && (
                                            <div className="nl-overdue"><Clock size={11} style={{ verticalAlign: '-1px' }} /> {'>'}5m untouched</div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ==========================================================================
// Kanban view (task 2.8) — HTML5 drag to change status
// ==========================================================================
function KanbanView({ loading, rows, busyId, onMove, onChangeStatus, onOpen }) {
    const [dragId, setDragId] = useState(null);
    const [overCol, setOverCol] = useState(null);

    const byStatus = useMemo(() => {
        const g = Object.fromEntries(PIPELINE.map((s) => [s, []]));
        for (const l of rows) if (g[l.status]) g[l.status].push(l);
        return g;
    }, [rows]);

    if (loading) return <div className="nl-panel"><div className="empty-state">Loading leads…</div></div>;

    const onDrop = (status) => {
        setOverCol(null);
        const lead = rows.find((l) => l.id === dragId);
        setDragId(null);
        if (!lead || lead.status === status) return;
        if (!ALLOWED_NEXT[lead.status]?.includes(status)) {
            toast.error(`Can't move a ${STATUS_META[lead.status]?.label} lead to ${STATUS_META[status]?.label}.`);
            return;
        }
        onMove(lead, status);
    };

    return (
        <div className="nl-kanban">
            {PIPELINE.map((status) => (
                <div
                    key={status}
                    className={`nl-kcol ${overCol === status ? 'over' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setOverCol(status); }}
                    onDragLeave={() => setOverCol((c) => (c === status ? null : c))}
                    onDrop={() => onDrop(status)}
                >
                    <div className="nl-kcol-head">
                        <span className={`nl-kdot ${STATUS_META[status].cls}`} />
                        {STATUS_META[status].label}
                        <span className="nl-kcount">{byStatus[status].length}</span>
                    </div>
                    <div className="nl-kcol-body">
                        {byStatus[status].map((l) => (
                            <div
                                key={l.id}
                                className={`nl-kcard ${busyId === l.id ? 'busy' : ''}`}
                                draggable
                                onDragStart={() => setDragId(l.id)}
                                onDragEnd={() => { setDragId(null); setOverCol(null); }}
                                onClick={() => onOpen(l)}
                            >
                                <div className="nl-kcard-top">
                                    <span className="nl-kcard-name">{fullName(l)}</span>
                                    <ScoreBadge score={l.lead_score} />
                                </div>
                                <div className="nl-kcard-meta">{sourceInfo(l.source).label}</div>
                                {l.phone && <div className="lead-phone" style={{ fontSize: '0.72rem' }}>{l.phone}</div>}
                                <div className="nl-kcard-status"><StatusMenu lead={l} onChange={onChangeStatus} disabled={busyId === l.id} /></div>
                                <div className="nl-kcard-foot">
                                    {l.storm_event_id && <span className="nl-storm-chip"><CloudLightning size={11} /> Storm</span>}
                                    <span>{fmtRelative(l.created_at)}</span>
                                </div>
                            </div>
                        ))}
                        {!byStatus[status].length && <div className="nl-kempty">—</div>}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ==========================================================================
// Map view (task 2.8) — leaflet pins from lat/lng, storm-linked highlighted
// ==========================================================================
function MapView({ rows, onOpen }) {
    const mapRef = useRef(null);
    const layerRef = useRef(null);
    const withCoords = useMemo(() => rows.filter((l) => l.lat != null && l.lng != null), [rows]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const L = (await import('leaflet')).default || (await import('leaflet'));
            if (cancelled) return;
            const el = document.getElementById('leadsMap');
            if (!el) return;
            if (!mapRef.current || !el._leaflet_id) {
                if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
                mapRef.current = L.map('leadsMap').setView([39.8283, -98.5795], 4);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap',
                    maxZoom: 19,
                }).addTo(mapRef.current);
            }
            const map = mapRef.current;
            if (layerRef.current) { layerRef.current.remove(); layerRef.current = null; }
            const group = L.layerGroup().addTo(map);
            layerRef.current = group;

            const pts = [];
            for (const l of withCoords) {
                const stormy = !!l.storm_event_id;
                const marker = L.circleMarker([l.lat, l.lng], {
                    radius: 8,
                    color: stormy ? '#b91c1c' : '#1a1f3a',
                    fillColor: stormy ? '#ef4444' : '#FDB813',
                    fillOpacity: 0.85,
                    weight: 2,
                });
                marker.bindPopup(
                    `<strong>${fullName(l)}</strong><br/>${sourceInfo(l.source).label}` +
                    `${stormy ? '<br/>⚡ Storm-linked' : ''}<br/><em>${STATUS_META[l.status]?.label || l.status}</em>`,
                );
                marker.on('click', () => onOpen(l.id));
                marker.addTo(group);
                pts.push([l.lat, l.lng]);
            }
            if (pts.length) {
                try { map.fitBounds(pts, { padding: [40, 40], maxZoom: 11 }); } catch { /* single pt */ }
            }
        })();
        return () => { cancelled = true; };
    }, [withCoords, onOpen]);

    // Tear the map down when this view unmounts.
    useEffect(() => () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } }, []);

    return (
        <div className="nl-panel nl-map-wrap">
            <div id="leadsMap" className="nl-map" />
            <div className="nl-map-legend">
                <span><i className="dot storm" /> Storm-linked</span>
                <span><i className="dot normal" /> Standard</span>
                {!withCoords.length && <span className="nl-map-note">No geocoded leads in this view yet.</span>}
            </div>
        </div>
    );
}

// ==========================================================================
// Reason modal (Decline / DNC)
// ==========================================================================
function ReasonModal({ to, lead, onCancel, onConfirm }) {
    const [reason, setReason] = useState('');
    const label = STATUS_META[to]?.label || to;
    return (
        <div className="modal-backdrop active" onClick={onCancel}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">Move to {label}</div>
                    <button className="modal-close" onClick={onCancel}>&times;</button>
                </div>
                <div className="modal-body">
                    <div className="modal-lead-summary">
                        <div className="name">{fullName(lead)}</div>
                        <div className="meta">{sourceInfo(lead.source).label} · Received {fmtRelative(lead.created_at)}</div>
                    </div>
                    <label htmlFor="nl-reason">Reason (required)</label>
                    <input
                        id="nl-reason"
                        type="text"
                        value={reason}
                        autoFocus
                        placeholder={to === 'do_not_contact' ? 'e.g. Requested no further contact' : 'e.g. Chose another contractor'}
                        onChange={(e) => setReason(e.target.value)}
                    />
                    {to === 'do_not_contact' && (
                        <div className="help">Do Not Contact suppresses all calls, texts and emails company-wide. Only an admin can lift it.</div>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onCancel}>Cancel</button>
                    <button className="btn-primary" disabled={!reason.trim()} onClick={() => onConfirm(reason.trim())}>
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
}

// ==========================================================================
// Lead detail drawer (task 2.9)
// ==========================================================================
function LeadDrawer({ leadId, nameOf, canConvert, canViewAll, teamMembers, onClose, onChanged }) {
    const router = useRouter();
    const [lead, setLead] = useState(null);
    const [touches, setTouches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [l, t] = await Promise.all([
                axiosInstance.get(`/leads/${leadId}`, { suppressErrorToast: true }),
                axiosInstance.get(`/leads/${leadId}/touches`, { suppressErrorToast: true }).catch(() => ({ data: { data: [] } })),
            ]);
            setLead(l.data?.data || null);
            setTouches(t.data?.data || []);
        } catch {
            setLead(null);
        } finally {
            setLoading(false);
        }
    }, [leadId]);

    useEffect(() => { load(); }, [load]);

    const act = async (fn, msg) => {
        setBusy(true);
        try {
            await fn();
            if (msg) toast.success(msg);
            await load();
            onChanged();
        } catch (e) {
            toast.error(e?.userMessage || 'Action failed');
        } finally {
            setBusy(false);
        }
    };

    const changeStatus = (to) => act(() => axiosInstance.patch(`/leads/${leadId}/status`, { to }), `Moved to ${STATUS_META[to]?.label}`);
    const reassign = (userId) => act(() => axiosInstance.patch(`/leads/${leadId}/assign`, { user_id: userId || null }), 'Reassigned');
    const convert = () => act(async () => {
        const res = await axiosInstance.post(`/leads/${leadId}/convert`, {});
        if (res.data?.claim_id) { onClose(); router.push('/dashboard/claims'); }
    }, 'Converted — claim created');

    // Callback via RingCentral RingOut — rings the rep's phone, then the lead;
    // logs the touch + auto-advances New → Contacted (§4.2 / task 4.4).
    const callLead = async () => {
        setBusy(true);
        try {
            const res = await axiosInstance.post(`/leads/${leadId}/call`, {});
            toast.success(res.data?.message || 'Ringing your phone…');
            await load();
            onChanged();
        } catch (e) {
            toast.error(e?.userMessage || 'Could not place the call');
        } finally {
            setBusy(false);
        }
    };

    const rec = lead ? recordingUrl(lead) : null;
    const nextStatuses = lead ? (ALLOWED_NEXT[lead.status] || []).filter((s) => !REASON_REQUIRED.has(s)) : [];

    return (
        <div className="nl-drawer-backdrop" onClick={onClose}>
            <aside className="nl-drawer" onClick={(e) => e.stopPropagation()}>
                <div className="nl-drawer-head">
                    <div className="nl-drawer-title">Lead Details</div>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>

                {loading && <div className="nl-drawer-loading"><span className="nl-spinner" /><span>Loading lead…</span></div>}
                {!loading && !lead && <div className="empty-state">Lead not found.</div>}

                {!loading && lead && (
                    <div className="nl-drawer-body">
                        <div className="nl-drawer-hero">
                            <div className="nl-drawer-name">{fullName(lead)}</div>
                            <div className="nl-drawer-badges">
                                <ScoreBadge score={lead.lead_score} />
                                <StatusPill status={lead.status} />
                                {lead.storm_event_id && <span className="nl-storm-chip"><CloudLightning size={12} /> Storm-linked</span>}
                            </div>
                        </div>

                        {/* Contact */}
                        <div className="nl-drawer-sec">
                            <div className="nl-drawer-sec-title">Contact</div>
                            <div className="nl-kv">
                                <span>Phone</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <b className="lead-phone">{lead.phone || '—'}</b>
                                    {lead.phone && (
                                        <button className="filter-select" style={{ padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}
                                            disabled={busy} onClick={callLead} title="Ring your phone, then connect the lead">
                                            📞 Call
                                        </button>
                                    )}
                                </span>
                            </div>
                            <div className="nl-kv"><span>Email</span><b>{lead.email || '—'}</b></div>
                            <div className="nl-kv"><span>Address</span><b>{[lead.address_line1, lead.city, lead.state, lead.zip].filter(Boolean).join(', ') || '—'}</b></div>
                            <div className="nl-kv"><span>Damage</span><b>{lead.damage_type || '—'}</b></div>
                            <div className="nl-kv"><span>Source</span><b>{sourceInfo(lead.source).label}</b></div>
                            <div className="nl-kv"><span>Assigned</span><b>{nameOf(lead.assigned_to)}</b></div>
                        </div>

                        {/* Score reason */}
                        {lead.score_reason && (
                            <div className="nl-drawer-sec">
                                <div className="nl-drawer-sec-title">Why this score</div>
                                <div className="nl-reason-box">{lead.score_reason}</div>
                            </div>
                        )}

                        {/* Storm link */}
                        {lead.storm_event_id && (
                            <div className="nl-drawer-sec">
                                <div className="nl-drawer-sec-title">Storm</div>
                                <div className="nl-reason-box">
                                    Linked to a nearby storm event.{' '}
                                    <a className="nl-link" href="/dashboard/storm-tracking">View storm tracking →</a>
                                </div>
                            </div>
                        )}

                        {/* Recording */}
                        {rec && (
                            <div className="nl-drawer-sec">
                                <div className="nl-drawer-sec-title">Call recording</div>
                                <audio controls src={rec} style={{ width: '100%' }} />
                            </div>
                        )}

                        {/* Timeline */}
                        <div className="nl-drawer-sec">
                            <div className="nl-drawer-sec-title">Activity timeline</div>
                            {!touches.length && <div className="nl-reason-box">No touches logged yet.</div>}
                            {touches.map((t) => (
                                <div key={t.id} className="nl-touch">
                                    <span className={`nl-touch-dir ${t.direction}`}>{t.direction === 'outbound' ? '↗' : '↙'}</span>
                                    <div>
                                        <div className="nl-touch-line"><b>{t.type}</b> · {t.direction}</div>
                                        {t.summary && <div className="nl-touch-sum">{t.summary}</div>}
                                        <div className="nl-touch-time">{fmtRelative(t.created_at)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Notes / disposition */}
                        {lead.disposition && (
                            <div className="nl-drawer-sec">
                                <div className="nl-drawer-sec-title">Disposition</div>
                                <div className="nl-reason-box">{lead.disposition}</div>
                            </div>
                        )}

                        {/* Controls */}
                        <div className="nl-drawer-sec">
                            <div className="nl-drawer-sec-title">Move status</div>
                            <select
                                className="filter-select"
                                style={{ width: '100%' }}
                                value=""
                                disabled={busy || !nextStatuses.length}
                                onChange={(e) => e.target.value && changeStatus(e.target.value)}
                            >
                                <option value="">{nextStatuses.length ? 'Choose next status…' : 'No moves available'}</option>
                                {nextStatuses.map((s) => (
                                    <option key={s} value={s}>{STATUS_META[s].label}</option>
                                ))}
                            </select>

                            {canViewAll && (
                                <>
                                    <div className="nl-drawer-sec-title" style={{ marginTop: '0.75rem' }}>Reassign</div>
                                    <select
                                        className="filter-select"
                                        style={{ width: '100%' }}
                                        value={lead.assigned_to || ''}
                                        disabled={busy}
                                        onChange={(e) => reassign(e.target.value)}
                                    >
                                        <option value="">Unassigned</option>
                                        {teamMembers.map((m) => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </>
                            )}

                            {canConvert && ALLOWED_NEXT[lead.status]?.includes('claim_started') && (
                                <button className="btn-success" style={{ width: '100%', marginTop: '0.75rem' }} disabled={busy} onClick={convert}>
                                    <ArrowRightCircle size={15} style={{ verticalAlign: '-3px' }} /> Convert to Claim
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </aside>
        </div>
    );
}
