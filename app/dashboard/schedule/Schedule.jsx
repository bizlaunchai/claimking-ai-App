'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    ChevronLeft, ChevronRight, Plus, MapPin, Phone, Check, XCircle, X, Clock, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance';
import { createClient } from '@/lib/supabase/client';
import { usePermissions } from '@/lib/permissions/PermissionsContext';
import { Link2, Copy } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './schedule.css';

// ─── Appointment types (color-coded per packet §5.4.3) ────────────────────
const TYPE_META = {
    estimate: { label: 'Estimate', cls: 'estimate' },
    inspection: { label: 'Inspection', cls: 'inspection' },
    adjuster_meeting: { label: 'Adjuster', cls: 'adjuster' },
    install: { label: 'Install', cls: 'install' },
    follow_up: { label: 'Follow-up', cls: 'follow-up' },
};
const TYPES = Object.keys(TYPE_META);
// Q3.2 — a synced Jobs Ready entry shows as a job, not a generic "Install".
const entryLabel = (a) => a?.is_job ? `🔧 ${a.job_number || 'Job'}` : (TYPE_META[a?.type]?.label || 'Appointment');
const entryCls = (a) => `${TYPE_META[a?.type]?.cls || ''}${a?.is_job ? ' is-job' : ''}`;
// Q3.12 — the property-local time (calendar itself renders in the viewer's zone).
const TZ_FRIENDLY = { 'America/New_York': 'Eastern', 'America/Chicago': 'Central', 'America/Denver': 'Mountain', 'America/Los_Angeles': 'Pacific', 'America/Phoenix': 'Mountain', 'America/Anchorage': 'Alaska', 'Pacific/Honolulu': 'Hawaii' };
const fmtInTz = (d, tz) => {
    if (!tz) return null;
    try {
        const t = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(d);
        return `${t} ${TZ_FRIENDLY[tz] || ''}`.trim();
    } catch { return null; }
};
// Q3.5 — turn-by-turn navigation link. Prefers coordinates, falls back to the
// typed address (Google geocodes it). Null when there's nothing to route to.
const navHref = (address, lat, lng) => {
    const dest = (lat != null && lng != null) ? `${lat},${lng}` : (address ? encodeURIComponent(address) : null);
    return dest ? `https://www.google.com/maps/dir/?api=1&destination=${dest}` : null;
};
// Self-contained SVG pin (no Leaflet default-icon asset — same pattern as the
// sub/claims maps) for the day-map divIcon.
const MAP_PIN_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 30 42">' +
    '<path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.7 23.3 0 15 0z" fill="#1a1f3a"/>' +
    '<circle cx="15" cy="15" r="5.5" fill="#FDB813"/></svg>';
const STATUS_LABEL = {
    scheduled: 'Scheduled', confirmed: 'Confirmed', completed: 'Completed',
    no_show: 'No-show', cancelled: 'Cancelled', rescheduled: 'Rescheduled',
};
const DURATIONS = [30, 45, 60, 90, 120];

// Calendar day window (company business hours usually sit inside this).
const DAY_START = 7;   // 7 AM
const DAY_END = 20;    // 8 PM
const HOUR_PX = 52;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── date helpers (native, Monday-start) ──────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d) => { const x = new Date(d); const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); x.setHours(0, 0, 0, 0); return x; };
const startOfMonth = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), 1); x.setHours(0, 0, 0, 0); return x; };
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const fmtTime = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const minutesFromMidnight = (d) => d.getHours() * 60 + d.getMinutes();

export default function Schedule() {
    const { has } = usePermissions();
    const search = useSearchParams();
    const manageAll = has('manage_all_schedule');

    const [view, setView] = useState('week');           // day | week | month | team
    const [anchor, setAnchor] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
    const [appts, setAppts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [team, setTeam] = useState([]);
    const [modal, setModal] = useState(null);           // { mode:'create'|'detail', appt? , prefill? }
    const [dragId, setDragId] = useState(null);
    const [showLinks, setShowLinks] = useState(false);
    const [showAvail, setShowAvail] = useState(false);      // Q3.11 availability editor
    const [notifyChoice, setNotifyChoice] = useState(null); // Q3.4 forced notify choice
    const [personFilter, setPersonFilter] = useState('');   // Q3.3 '' = everyone; uuid | sub:uuid
    const [showDayMap, setShowDayMap] = useState(false);    // Q3.5 day-route map

    // Visible range for the fetch (widen to full weeks for month).
    const range = useMemo(() => {
        if (view === 'day') return { start: new Date(anchor), end: addDays(anchor, 1) };
        if (view === 'month') {
            const first = startOfMonth(anchor);
            const gridStart = startOfWeek(first);
            return { start: gridStart, end: addDays(gridStart, 42) };
        }
        const ws = startOfWeek(anchor);
        return { start: ws, end: addDays(ws, 7) };
    }, [view, anchor]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { start: range.start.toISOString(), end: range.end.toISOString() };
            if (personFilter) params.assigned_to = personFilter; // Q3.3 worker uuid or sub:uuid
            const res = await axiosInstance.get('/appointments', { params });
            setAppts((res.data?.data || []).map((a) => ({ ...a, _s: new Date(a.starts_at), _e: new Date(a.ends_at) })));
        } catch {
            setAppts([]);
        } finally {
            setLoading(false);
        }
    }, [range, personFilter]);

    useEffect(() => { load(); }, [load]);

    // Q3.3 — calendar people: in-house workers AND subcontractors (with jobs) in
    // ONE roster. Drives the person filter, the assignee picker, and swimlanes.
    // Each row: { id, name, kind:'worker'|'sub', value } where value is what the
    // list filter sends (`sub:<id>` for subs so it matches assigned_sub_id).
    useEffect(() => {
        (async () => {
            try {
                const res = await axiosInstance.get('/appointments/calendar-people', { suppressErrorToast: true });
                const d = res.data?.data || {};
                const workers = (d.workers || []).map((w) => ({ id: w.id, name: w.name, kind: 'worker', value: w.id }));
                const subs = (d.subs || []).map((s) => ({ id: s.id, name: s.name, kind: 'sub', value: `sub:${s.id}` }));
                setTeam([...workers, ...subs]);
            } catch { /* swimlanes degrade to a single lane */ }
        })();
    }, []);

    const nameOf = useCallback(
        (id) => team.find((m) => m.id === id && m.kind !== 'sub')?.name || (id ? 'Assigned' : 'Unassigned'),
        [team],
    );

    // Deep-link ?lead_id / ?claim_id opens the New Appointment modal prefilled.
    useEffect(() => {
        const leadId = search.get('lead_id');
        const claimId = search.get('claim_id');
        if (leadId || claimId) {
            setModal({ mode: 'create', prefill: { lead_id: leadId || '', claim_id: claimId || '', address: search.get('address') || '' } });
        }
        // run once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── nav ───────────────────────────────────────────────────────────────
    const step = (dir) => {
        if (view === 'day') setAnchor((a) => addDays(a, dir));
        else if (view === 'month') setAnchor((a) => { const x = new Date(a); x.setMonth(x.getMonth() + dir); return x; });
        else setAnchor((a) => addDays(a, dir * 7));
    };
    const goToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); setAnchor(d); };

    const rangeLabel = useMemo(() => {
        if (view === 'day') return anchor.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        if (view === 'month') return anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const ws = startOfWeek(anchor); const we = addDays(ws, 6);
        return `${ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${we.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }, [view, anchor]);

    // ── mutations ───────────────────────────────────────────────────────────
    const saveOutcome = async (appt, outcome) => {
        try {
            const res = await axiosInstance.post(`/appointments/${appt.id}/outcome`, { outcome });
            toast.success(outcome === 'completed' ? 'Marked completed' : 'Marked no-show');
            if (res.data?.prompt_send_estimate) {
                toast('Estimate ready to send', {
                    description: 'This estimate appointment is complete — send the estimate from the claim.',
                });
            }
            await load();
            setModal(null);
        } catch (e) { toast.error(e?.userMessage || 'Could not save outcome'); }
    };

    // The actual PATCH. `notify` is only meaningful when the time changed (Q3.4);
    // a pure reassign passes notify=false and the server never messages the client.
    const doReschedule = async (appt, newStart, newEnd, assignee, notify) => {
        const body = { starts_at: newStart.toISOString(), ends_at: newEnd.toISOString() };
        if (assignee !== undefined && assignee !== appt.assigned_to) body.assigned_to = assignee;
        if (notify !== undefined) body.notify = notify;
        try {
            const res = await axiosInstance.patch(`/appointments/${appt.id}`, body);
            const n = res.data?.notified;
            if (n && (n.email || n.sms)) toast.success('Rescheduled — client notified');
            else if (notify === true) toast.success('Rescheduled (client had no reachable contact)');
            else toast.success('Appointment updated');
            await load();
            return true;
        } catch (e) {
            const c = e?.response?.data?.conflict;
            if (e?.response?.status === 409 && c) {
                toast.error('Double-booked', { description: `Clashes with a ${c.type} at ${fmtTime(new Date(c.starts_at))}.` });
            } else {
                toast.error(e?.userMessage || 'Could not reschedule');
            }
            return false;
        }
    };

    // Q3.4 — route reschedules through the mandatory notify choice. A date/time
    // change on a client-linked appointment ALWAYS asks "Notify client?" (no
    // default). A pure reassign (or an unlinked appointment) skips the prompt and
    // never notifies. Returns 'deferred' when the choice modal took over.
    const requestReschedule = async (appt, newStart, newEnd, assignee) => {
        const timeChanged = newStart.getTime() !== appt._s.getTime() || newEnd.getTime() !== appt._e.getTime();
        const hasClient = !!(appt.claim_id || appt.lead_id);
        if (timeChanged && hasClient) {
            setModal(null);
            setNotifyChoice({ appt, ns: newStart, ne: newEnd, assignee });
            return 'deferred';
        }
        return doReschedule(appt, newStart, newEnd, assignee, false);
    };

    // Q3.2 — a Jobs Ready entry reschedules the JOB's date (single source of
    // truth); day-level, window-validated via the jobs endpoint. No reassign,
    // no notify prompt (that's the sub-sets-date flow in Jobs Ready).
    const rescheduleJobEntry = async (jobEntry, targetDate) => {
        if (sameDay(new Date(jobEntry._s), targetDate)) return;
        try {
            await axiosInstance.post(`/jobs/${jobEntry.job_id}/schedule`, { scheduled_start: ymd(targetDate) });
            toast.success(`Job ${jobEntry.job_number || ''} moved to ${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
            await load();
        } catch (e) {
            // Q2.9 window/deadline rejection or a readiness block — surface it.
            toast.error(e?.userMessage || e?.response?.data?.message || 'Could not move the job');
        }
    };

    // Drop an appointment (or job) onto a target day. `lane` is the team-view rep
    // object when dropped into a swimlane (undefined in day/week/month).
    const onDropDay = (targetDate, lane) => {
        const appt = appts.find((a) => a.id === dragId);
        setDragId(null);
        if (!appt) return;
        if (appt.is_job) {
            // Jobs are day-scheduled; a calendar drop changes the DATE only (crew
            // is managed in Jobs Ready), so the lane is ignored.
            rescheduleJobEntry(appt, targetDate);
            return;
        }
        // Q3.3 — an appointment can't be reassigned to a subcontractor.
        if (lane?.kind === 'sub') {
            toast.error('Appointments go to workers, not subs. Subs are assigned jobs in Jobs Ready.');
            return;
        }
        const assignee = lane ? lane.id : undefined;
        const dur = appt._e - appt._s;
        const ns = new Date(targetDate);
        ns.setHours(appt._s.getHours(), appt._s.getMinutes(), 0, 0);
        const ne = new Date(ns.getTime() + dur);
        if (sameDay(ns, appt._s) && assignee === undefined) return;
        requestReschedule(appt, ns, ne, assignee);
    };

    const openDetail = (appt) => setModal({ mode: appt.is_job ? 'job' : 'detail', appt });

    const days = useMemo(() => {
        if (view === 'day') return [new Date(anchor)];
        const ws = startOfWeek(anchor);
        return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    }, [view, anchor]);

    const todays = useMemo(() => {
        const now = new Date();
        return appts.filter((a) => sameDay(a._s, now)).sort((a, b) => a._s - b._s);
    }, [appts]);

    // Only in-house workers can be an APPOINTMENT assignee (subs get jobs, not
    // appointments). The full `team` (workers + subs) drives the filter + lanes.
    const workers = useMemo(() => team.filter((m) => m.kind === 'worker'), [team]);
    const subsList = useMemo(() => team.filter((m) => m.kind === 'sub'), [team]);

    return (
        <div className="schedule-page">
            <div className="page-header">
                <div>
                    <div className="page-title">Scheduling</div>
                    <div className="page-subtitle">Estimates, inspections, adjuster meetings, installs & follow-ups — one calendar</div>
                </div>
                <div className="header-right">
                    <button className="btn-secondary" onClick={() => setShowAvail((s) => !s)} title="Working hours & blocked days"><Clock size={15} style={{ verticalAlign: '-3px' }} /> Availability</button>
                    <button className="btn-secondary" onClick={() => setShowLinks((s) => !s)} title="Booking links"><Link2 size={15} style={{ verticalAlign: '-3px' }} /> Booking Links</button>
                    <button className="btn-secondary" onClick={load} title="Refresh"><RefreshCw size={15} style={{ verticalAlign: '-3px' }} /> Refresh</button>
                    <button className="btn-primary" onClick={() => setModal({ mode: 'create' })}><Plus size={16} style={{ verticalAlign: '-3px' }} /> New Appointment</button>
                </div>
            </div>

            <div className="content">
                {/* Toolbar */}
                <div className="sched-toolbar">
                    <div className="sched-nav">
                        <button className="cal-nav-btn" onClick={() => step(-1)}><ChevronLeft size={16} /></button>
                        <button className="cal-nav-btn" onClick={goToday}>Today</button>
                        <button className="cal-nav-btn" onClick={() => step(1)}><ChevronRight size={16} /></button>
                        <span className="sched-range">{rangeLabel}</span>
                    </div>
                    <div className="sched-toolbar-right">
                        {/* Q3.5 — the day's stops as a map / route */}
                        <button className="cal-nav-btn" onClick={() => setShowDayMap(true)} title="Map the day's stops"><MapPin size={14} style={{ verticalAlign: '-2px' }} /> Day Map</button>
                        {/* Q3.3 — one picker for workers AND subs */}
                        {manageAll && (
                            <select className="sched-person" value={personFilter} onChange={(e) => setPersonFilter(e.target.value)} title="Filter by person">
                                <option value="">👥 All people</option>
                                {workers.length > 0 && (
                                    <optgroup label="Workers">
                                        {workers.map((w) => <option key={w.value} value={w.value}>{w.name}</option>)}
                                    </optgroup>
                                )}
                                {subsList.length > 0 && (
                                    <optgroup label="Subcontractors">
                                        {subsList.map((s) => <option key={s.value} value={s.value}>{s.name}</option>)}
                                    </optgroup>
                                )}
                            </select>
                        )}
                        <div className="sched-views">
                            {['day', 'week', 'month', 'team'].map((v) => (
                                <button
                                    key={v}
                                    className={`sched-view-btn ${view === v ? 'active' : ''}`}
                                    onClick={() => setView(v)}
                                    disabled={v === 'team' && !manageAll}
                                    title={v === 'team' && !manageAll ? 'Needs Manage All Schedule' : ''}
                                >
                                    {v[0].toUpperCase() + v.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {showAvail && <AvailabilityPanel manageAll={manageAll} workers={workers} onClose={() => setShowAvail(false)} onChanged={load} />}
                {showLinks && <BookingLinks manageAll={manageAll} nameOf={nameOf} onClose={() => setShowLinks(false)} />}

                {/* Legend */}
                <div className="sched-legend">
                    {TYPES.map((t) => (
                        <span key={t}><i className={`chip ${TYPE_META[t].cls}`} />{TYPE_META[t].label}</span>
                    ))}
                </div>

                <div className="sched-main">
                    <div className="sched-cal">
                        {loading && (
                            <div className="sched-loading">
                                <span className="detail-spinner lg" />
                                <span>Loading calendar…</span>
                            </div>
                        )}
                        {!loading && (view === 'day' || view === 'week') && (
                            <TimeGrid days={days} appts={appts} onOpen={openDetail} onDropDay={onDropDay} setDragId={setDragId} />
                        )}
                        {!loading && view === 'month' && (
                            <MonthGrid anchor={anchor} appts={appts} onOpen={openDetail} onDropDay={onDropDay} setDragId={setDragId} />
                        )}
                        {!loading && view === 'team' && (
                            <TeamGrid days={days} team={team} appts={appts} nameOf={nameOf} onOpen={openDetail} onDropDay={onDropDay} setDragId={setDragId} />
                        )}
                    </div>

                    {/* Today panel */}
                    <TodayPanel todays={todays} nameOf={nameOf} onOpen={openDetail} onOutcome={saveOutcome} />
                </div>
            </div>

            {modal?.mode === 'create' && (
                <AppointmentModal
                    prefill={modal.prefill}
                    team={workers}
                    manageAll={manageAll}
                    defaultDate={view === 'day' ? anchor : new Date()}
                    onClose={() => setModal(null)}
                    onSaved={() => { setModal(null); load(); }}
                />
            )}
            {modal?.mode === 'detail' && (
                <DetailModal
                    appt={modal.appt}
                    team={workers}
                    manageAll={manageAll}
                    nameOf={nameOf}
                    onClose={() => setModal(null)}
                    onOutcome={saveOutcome}
                    onReschedule={requestReschedule}
                    onAfter={() => { setModal(null); load(); }}
                />
            )}
            {modal?.mode === 'job' && (
                <JobDetailModal appt={modal.appt} onClose={() => setModal(null)} />
            )}
            {showDayMap && (
                <DayMapModal
                    date={view === 'day' ? anchor : new Date()}
                    onClose={() => setShowDayMap(false)}
                    onOpenRef={(kind, refId) => {
                        setShowDayMap(false);
                        const found = appts.find((a) => a.id === (kind === 'job' ? `job:${refId}` : refId));
                        if (found) openDetail(found);
                    }}
                />
            )}
            {notifyChoice && (
                <NotifyChoiceModal
                    info={notifyChoice}
                    onCancel={() => setNotifyChoice(null)}
                    onChoose={async (notify) => {
                        const { appt, ns, ne, assignee } = notifyChoice;
                        setNotifyChoice(null);
                        await doReschedule(appt, ns, ne, assignee, notify);
                    }}
                />
            )}
        </div>
    );
}

// ==========================================================================
// Q3.2 — read-only detail for a synced Jobs Ready entry (manage the job itself
// over in Jobs Ready — this calendar just mirrors + reschedules its date).
// ==========================================================================
function JobDetailModal({ appt, onClose }) {
    const router = useRouter();
    const when = new Date(appt._s).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    return (
        <div className="modal-backdrop active" onClick={onClose}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">🔧 Job {appt.job_number || ''}</div>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <div className="modal-lead-summary">
                        <div className="name">Install{appt.job_type ? ` · ${appt.job_type}` : ''} · <span className={`st-badge st-${appt.status}`}>{STATUS_LABEL[appt.status] || appt.status}</span></div>
                        <div className="meta">Scheduled {when}</div>
                        {appt.address && (
                            <div className="meta meta-addr">
                                <span>{appt.address}</span>
                                {navHref(appt.address, appt.lat, appt.lng) && (
                                    <a className="maps-btn" href={navHref(appt.address, appt.lat, appt.lng)} target="_blank" rel="noreferrer"><MapPin size={12} /> Open in Maps</a>
                                )}
                            </div>
                        )}
                        {appt.assigned_sub_id && <div className="meta">Assigned to a subcontractor</div>}
                    </div>
                    <p className="nc-help">This entry mirrors a job from <strong>Jobs Ready</strong>. Drag it on the calendar to change its date; manage the crew, checklist and completion from Jobs Ready.</p>
                </div>
                <div className="modal-footer between">
                    <button className="btn-secondary" onClick={onClose}>Close</button>
                    <button className="btn-primary" onClick={() => router.push('/dashboard/jobs-ready')}>Open in Jobs Ready →</button>
                </div>
            </div>
        </div>
    );
}

// ==========================================================================
// Q3.5 — Day Map: the day's appointments + jobs as pins (tap → time & details),
// plus a one-tap "Open route in Google Maps" for the whole day.
// ==========================================================================
function DayMapModal({ date, onClose, onOpenRef }) {
    const [data, setData] = useState(null); // { points, unlocated }
    const [loading, setLoading] = useState(true);
    const mapRef = useRef(null);
    const dayLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await axiosInstance.get('/appointments/day-map', { params: { date: ymd(date) }, suppressErrorToast: true });
                if (!cancelled) setData(res.data?.data || { points: [], unlocated: 0 });
            } catch { if (!cancelled) setData({ points: [], unlocated: 0 }); }
            finally { if (!cancelled) setLoading(false); }
        })();
        return () => { cancelled = true; };
    }, [date]);

    const points = data?.points || [];

    // Draw the Leaflet map once points arrive.
    useEffect(() => {
        if (!points.length) return;
        let cancelled = false;
        (async () => {
            const L = (await import('leaflet')).default || (await import('leaflet'));
            if (cancelled) return;
            const el = document.getElementById('dayMap');
            if (!el || el._leaflet_id) return;
            const map = L.map('dayMap', { scrollWheelZoom: true });
            mapRef.current = map;
            map.setView([points[0].lat, points[0].lng], 11);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(map);
            const icon = L.divIcon({ className: 'ck-map-pin', html: MAP_PIN_SVG, iconSize: [28, 40], iconAnchor: [14, 40] });
            const group = [];
            points.forEach((p, i) => {
                const t = p.time ? new Date(p.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Job';
                const nav = navHref(p.address, p.lat, p.lng);
                const html =
                    `<div style="min-width:150px"><strong>${i + 1}. ${escapeHtmlJs(p.title)}</strong><br>` +
                    `<span style="color:#6b7280">${t}${p.address ? ` · ${escapeHtmlJs(p.address)}` : ''}</span>` +
                    (nav ? `<br><a href="${nav}" target="_blank" rel="noreferrer" style="color:#2563eb;font-weight:600">Navigate ↗</a>` : '') + `</div>`;
                const m = L.marker([p.lat, p.lng], { icon }).addTo(map).bindPopup(html);
                group.push(m);
            });
            setTimeout(() => {
                if (cancelled || !mapRef.current) return;
                mapRef.current.invalidateSize();
                try { mapRef.current.fitBounds(L.featureGroup(group).getBounds(), { padding: [30, 30], maxZoom: 14 }); } catch { /* single point */ }
            }, 150);
        })();
        return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
    }, [points]);

    // Whole-day route in Google Maps: last stop is the destination, the rest are waypoints.
    const routeHref = (() => {
        if (points.length < 1) return null;
        const coord = (p) => `${p.lat},${p.lng}`;
        const dest = coord(points[points.length - 1]);
        const wpts = points.slice(0, -1).map(coord).join('|');
        return `https://www.google.com/maps/dir/?api=1&destination=${dest}${wpts ? `&waypoints=${encodeURIComponent(wpts)}` : ''}`;
    })();

    return (
        <div className="modal-backdrop active" onClick={onClose}>
            <div className="modal-box day-map-box" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title"><MapPin size={16} style={{ verticalAlign: '-3px' }} /> Day Map · {dayLabel}</div>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    {loading ? <div className="today-empty">Loading map…</div> : points.length === 0 ? (
                        <div className="today-empty">No mappable stops for this day{data?.unlocated ? ` (${data.unlocated} had an address we couldn’t locate)` : ''}.</div>
                    ) : (
                        <>
                            {routeHref && (
                                <a className="btn-primary route-btn" href={routeHref} target="_blank" rel="noreferrer"><MapPin size={14} style={{ verticalAlign: '-2px' }} /> Open route in Google Maps ({points.length} {points.length === 1 ? 'stop' : 'stops'})</a>
                            )}
                            <div id="dayMap" className="day-map" />
                            <div className="day-stops">
                                {points.map((p, i) => {
                                    const t = p.time ? new Date(p.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Job';
                                    const nav = navHref(p.address, p.lat, p.lng);
                                    return (
                                        <div className="day-stop" key={p.id}>
                                            <span className="day-stop-idx">{i + 1}</span>
                                            <div className="day-stop-info">
                                                <div className="day-stop-title">{p.title}</div>
                                                <div className="day-stop-meta">{t}{p.address ? ` · ${p.address}` : ''}</div>
                                            </div>
                                            <div className="day-stop-actions">
                                                <button className="today-btn" onClick={() => onOpenRef(p.kind, p.ref_id)}>Details</button>
                                                {nav && <a className="today-btn" href={nav} target="_blank" rel="noreferrer"><MapPin size={12} /> Go</a>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {data?.unlocated > 0 && <div className="day-map-note">{data.unlocated} stop{data.unlocated > 1 ? 's' : ''} had an address we couldn’t map.</div>}
                        </>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

function escapeHtmlJs(s) {
    return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ==========================================================================
// Q3.4 — mandatory "Notify client?" choice on a date/time change (no default)
// ==========================================================================
function NotifyChoiceModal({ info, onCancel, onChoose }) {
    const { appt, ns } = info;
    const when = ns.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const linked = appt.claim_id ? 'the client' : 'the lead';
    return (
        <div className="modal-backdrop active" onClick={onCancel}>
            <div className="modal-box notify-choice" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">Moving to a new time</div>
                    <button className="modal-close" onClick={onCancel}>&times;</button>
                </div>
                <div className="modal-body">
                    <div className="nc-when">📅 {when}</div>
                    <p className="nc-q">Let {linked} know about the new time?</p>
                    <p className="nc-help">Notifying sends {appt.claim_id ? 'an email + text with a link to their portal' : 'a text'}. Choose one to continue.</p>
                </div>
                <div className="modal-footer between">
                    <button className="btn-secondary" onClick={onCancel}>Cancel</button>
                    <div className="footer-left" style={{ marginLeft: 'auto' }}>
                        <button className="btn-secondary" onClick={() => onChoose(false)}>Don’t notify</button>
                        <button className="btn-primary" onClick={() => onChoose(true)}>🔔 Notify {linked}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ==========================================================================
// Day / Week — time grid (absolute-positioned blocks)
// ==========================================================================
function TimeGrid({ days, appts, onOpen, onDropDay, setDragId }) {
    const hours = [];
    for (let h = DAY_START; h < DAY_END; h++) hours.push(h);
    const gridH = (DAY_END - DAY_START) * HOUR_PX;
    const now = new Date();

    const posFor = (a) => {
        const startMin = Math.max(DAY_START * 60, minutesFromMidnight(a._s));
        const endMin = Math.min(DAY_END * 60, minutesFromMidnight(a._e));
        const top = ((startMin - DAY_START * 60) / 60) * HOUR_PX;
        const height = Math.max(22, ((endMin - startMin) / 60) * HOUR_PX);
        return { top, height };
    };

    return (
        <div className="tg-wrap">
            <div className="tg-scroll">
                <div className="tg-times">
                    {hours.map((h) => (
                        <div key={h} className="tg-time" style={{ height: HOUR_PX }}>
                            {new Date(2020, 0, 1, h).toLocaleTimeString('en-US', { hour: 'numeric' })}
                        </div>
                    ))}
                </div>
                <div className="tg-cols" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(120px, 1fr))` }}>
                    {days.map((day) => {
                        const dayAppts = appts.filter((a) => sameDay(a._s, day));
                        const isToday = sameDay(day, now);
                        return (
                            <div
                                key={day.toISOString()}
                                className={`tg-col ${isToday ? 'today' : ''}`}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => onDropDay(day)}
                            >
                                <div className="tg-col-head">
                                    <span className="tg-dow">{WEEKDAYS[(day.getDay() + 6) % 7]}</span>
                                    <span className={`tg-date ${isToday ? 'today' : ''}`}>{day.getDate()}</span>
                                </div>
                                <div className="tg-body" style={{ height: gridH }}>
                                    {hours.map((h) => <div key={h} className="tg-hline" style={{ top: (h - DAY_START) * HOUR_PX }} />)}
                                    {dayAppts.map((a) => {
                                        const { top, height } = posFor(a);
                                        return (
                                            <div
                                                key={a.id}
                                                className={`tg-appt ${entryCls(a)} st-${a.status}`}
                                                style={{ top, height }}
                                                draggable
                                                onDragStart={() => setDragId(a.id)}
                                                onDragEnd={() => setDragId(null)}
                                                onClick={() => onOpen(a)}
                                            >
                                                <div className="tg-appt-t">{a.is_job ? 'Job' : fmtTime(a._s)}</div>
                                                <div className="tg-appt-n">{entryLabel(a)}{a.address ? ` · ${a.address}` : ''}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ==========================================================================
// Month grid
// ==========================================================================
function MonthGrid({ anchor, appts, onOpen, onDropDay, setDragId }) {
    const gridStart = startOfWeek(startOfMonth(anchor));
    const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
    const month = anchor.getMonth();
    const now = new Date();

    return (
        <div className="mg-wrap">
            <div className="mg-head">
                {WEEKDAYS.map((d) => <div key={d} className="mg-dow">{d}</div>)}
            </div>
            <div className="mg-grid">
                {cells.map((day) => {
                    const dayAppts = appts.filter((a) => sameDay(a._s, day)).sort((a, b) => a._s - b._s);
                    const dim = day.getMonth() !== month;
                    return (
                        <div
                            key={day.toISOString()}
                            className={`mg-cell ${dim ? 'dim' : ''} ${sameDay(day, now) ? 'today' : ''}`}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => onDropDay(day)}
                        >
                            <div className="mg-date">{day.getDate()}</div>
                            <div className="mg-appts">
                                {dayAppts.slice(0, 4).map((a) => (
                                    <div
                                        key={a.id}
                                        className={`mg-pill ${entryCls(a)} st-${a.status}`}
                                        draggable
                                        onDragStart={() => setDragId(a.id)}
                                        onDragEnd={() => setDragId(null)}
                                        onClick={() => onOpen(a)}
                                    >
                                        {a.is_job ? entryLabel(a) : `${fmtTime(a._s)} ${entryLabel(a)}`}
                                    </div>
                                ))}
                                {dayAppts.length > 4 && <div className="mg-more">+{dayAppts.length - 4} more</div>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ==========================================================================
// Team swimlanes (rep rows × week days)
// ==========================================================================
function TeamGrid({ days, team, appts, nameOf, onOpen, onDropDay, setDragId }) {
    const lanes = team.length ? team : [{ id: null, name: 'Unassigned' }];
    const now = new Date();
    return (
        <div className="team-wrap">
            <div className="team-grid" style={{ gridTemplateColumns: `160px repeat(${days.length}, minmax(120px,1fr))` }}>
                <div className="team-corner" />
                {days.map((d) => (
                    <div key={d.toISOString()} className={`team-colhead ${sameDay(d, now) ? 'today' : ''}`}>
                        {WEEKDAYS[(d.getDay() + 6) % 7]} {d.getDate()}
                    </div>
                ))}
                {lanes.map((rep) => (
                    <React.Fragment key={`${rep.kind || 'w'}:${rep.id || 'unassigned'}`}>
                        <div className="team-lane-name">{rep.name}{rep.kind === 'sub' ? <span className="lane-sub-tag">sub</span> : null}</div>
                        {days.map((day) => {
                            // Q3.3 — a sub lane matches jobs assigned to that sub; a worker
                            // lane matches appointments/jobs assigned to that worker.
                            const cellAppts = appts.filter((a) =>
                                (rep.kind === 'sub' ? a.assigned_sub_id === rep.id : a.assigned_to === rep.id) && sameDay(a._s, day),
                            ).sort((a, b) => a._s - b._s);
                            return (
                                <div
                                    key={day.toISOString()}
                                    className="team-cell"
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={() => onDropDay(day, rep)}
                                >
                                    {cellAppts.map((a) => (
                                        <div
                                            key={a.id}
                                            className={`team-appt ${entryCls(a)} st-${a.status}`}
                                            draggable
                                            onDragStart={() => setDragId(a.id)}
                                            onDragEnd={() => setDragId(null)}
                                            onClick={() => onOpen(a)}
                                        >
                                            {a.is_job ? entryLabel(a) : `${fmtTime(a._s)} ${entryLabel(a)}`}
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>
            <div className="team-hint">Drag an appointment between lanes to reassign, or across days to reschedule.</div>
        </div>
    );
}

// ==========================================================================
// Today panel
// ==========================================================================
function TodayPanel({ todays, nameOf, onOpen, onOutcome }) {
    return (
        <div className="today-panel">
            <div className="today-head">Today · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            {!todays.length && <div className="today-empty">No appointments today.</div>}
            {todays.map((a) => {
                const mapHref = a.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.address)}` : null;
                const done = ['completed', 'no_show', 'cancelled'].includes(a.status);
                return (
                    <div key={a.id} className={`today-card ${entryCls(a)}`}>
                        <div className="today-time"><Clock size={12} style={{ verticalAlign: '-2px' }} /> {a.is_job ? 'Job' : fmtTime(a._s)}</div>
                        <button className="today-title" onClick={() => onOpen(a)}>{entryLabel(a)}{a.is_job ? '' : ` · ${nameOf(a.assigned_to)}`}</button>
                        {a.address && <div className="today-addr">{a.address}</div>}
                        <div className="today-actions">
                            {mapHref && <a className="today-btn" href={mapHref} target="_blank" rel="noreferrer"><MapPin size={13} /> Map</a>}
                            <button className="today-btn" onClick={() => onOpen(a)}>Details</button>
                            {!done && (
                                <>
                                    <button className="today-btn ok" onClick={() => onOutcome(a, 'completed')}><Check size={13} /> Done</button>
                                    <button className="today-btn no" onClick={() => onOutcome(a, 'no_show')}><XCircle size={13} /> No-show</button>
                                </>
                            )}
                            {done && <span className={`today-status st-${a.status}`}>{STATUS_LABEL[a.status]}</span>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ==========================================================================
// Q3.1 — client/lead search-first picker for the New Appointment flow
// ==========================================================================
function PersonSearch({ onPick }) {
    const [q, setQ] = useState('');
    const [results, setResults] = useState(null); // null = idle, [] = no match
    const [searching, setSearching] = useState(false);
    const [adding, setAdding] = useState(false);   // new-person mini-form open
    const [nf, setNf] = useState({ name: '', phone: '', email: '', address: '' });
    const [creating, setCreating] = useState(false);
    const timer = useRef(null);

    useEffect(() => {
        const term = q.trim();
        if (timer.current) clearTimeout(timer.current);
        if (term.length < 2) { setResults(null); setSearching(false); return; }
        setSearching(true);
        timer.current = setTimeout(async () => {
            try {
                const res = await axiosInstance.get('/appointments/people', { params: { q: term }, suppressErrorToast: true });
                setResults(res.data?.data || []);
            } catch { setResults([]); } finally { setSearching(false); }
        }, 300);
        return () => timer.current && clearTimeout(timer.current);
    }, [q]);

    const createPerson = async () => {
        if (!nf.name.trim()) { toast.error('Enter a name'); return; }
        setCreating(true);
        try {
            const res = await axiosInstance.post('/appointments/people', {
                name: nf.name.trim(), phone: nf.phone.trim() || undefined,
                email: nf.email.trim() || undefined, address: nf.address.trim() || undefined,
            });
            const p = res.data?.data;
            if (p?.existed) toast.info('Matched an existing record');
            else toast.success('New client added');
            onPick(p);
        } catch (e) { toast.error(e?.userMessage || 'Could not add client'); }
        finally { setCreating(false); }
    };

    if (adding) {
        return (
            <div className="person-new">
                <input autoFocus placeholder="Full name *" value={nf.name} onChange={(e) => setNf((s) => ({ ...s, name: e.target.value }))} />
                <div className="grid2">
                    <input placeholder="Phone" value={nf.phone} onChange={(e) => setNf((s) => ({ ...s, phone: e.target.value }))} />
                    <input placeholder="Email" value={nf.email} onChange={(e) => setNf((s) => ({ ...s, email: e.target.value }))} />
                </div>
                <input placeholder="Address" value={nf.address} onChange={(e) => setNf((s) => ({ ...s, address: e.target.value }))} />
                <div className="person-new-actions">
                    <button className="btn-link" onClick={() => setAdding(false)}>← Back to search</button>
                    <button className="btn-primary sm" disabled={creating} onClick={createPerson}>{creating ? 'Adding…' : 'Add & select'}</button>
                </div>
            </div>
        );
    }

    return (
        <div className="person-search">
            <input autoFocus placeholder="Search by name or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
            {searching && <div className="person-hint muted">Searching…</div>}
            {results && results.length > 0 && (
                <div className="person-results">
                    {results.map((p) => (
                        <button key={`${p.kind}:${p.id}`} className="person-result" onClick={() => onPick(p)}>
                            <span className="person-name">{p.name}</span>
                            <span className="person-sub"><span className={`person-badge ${p.kind}`}>{p.sub_label}</span>{p.phone ? ` · ${p.phone}` : ''}</span>
                        </button>
                    ))}
                </div>
            )}
            {results && results.length === 0 && !searching && (
                <div className="person-hint muted">No match for “{q.trim()}”.</div>
            )}
            <button className="btn-link person-add" onClick={() => { setNf((s) => ({ ...s, name: q.trim() })); setAdding(true); }}>+ Add a new client</button>
        </div>
    );
}

// ==========================================================================
// New Appointment modal
// ==========================================================================
function AppointmentModal({ prefill, team, manageAll, defaultDate, onClose, onSaved }) {
    const [type, setType] = useState('estimate');
    const [date, setDate] = useState(ymd(defaultDate || new Date()));
    const [time, setTime] = useState('09:00');
    const [duration, setDuration] = useState(60);
    const [assignee, setAssignee] = useState('');
    const [address, setAddress] = useState(prefill?.address || '');
    // Q3.1 — the add flow starts with a client/lead lookup. `person` holds the
    // chosen client { kind:'lead'|'claim', id, name, phone, address, ... }.
    const [person, setPerson] = useState(() => {
        if (prefill?.claim_id) return { kind: 'claim', id: prefill.claim_id, name: prefill.name || 'Linked claim', sub_label: 'Client / claim', address: prefill.address || null };
        if (prefill?.lead_id) return { kind: 'lead', id: prefill.lead_id, name: prefill.name || 'Linked lead', sub_label: 'Lead', address: prefill.address || null };
        return null;
    });
    const [reminder, setReminder] = useState(true);
    const [slots, setSlots] = useState(null);
    const [busy, setBusy] = useState(false);

    const leadId = person?.kind === 'lead' ? person.id : '';
    const claimId = person?.kind === 'claim' ? person.id : '';

    // Picking a person auto-fills the address when the field is still empty.
    const pickPerson = (p) => {
        setPerson(p);
        if (p?.address && !address.trim()) setAddress(p.address);
    };

    // Inline availability for the chosen assignee + date (packet §5.4.5).
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const params = { date };
                if (assignee) params.user_id = assignee;
                const res = await axiosInstance.get('/appointments/availability', { params, suppressErrorToast: true });
                if (!cancelled) setSlots(res.data?.data?.slots || []);
            } catch { if (!cancelled) setSlots(null); }
        })();
        return () => { cancelled = true; };
    }, [assignee, date]);

    const save = async () => {
        setBusy(true);
        try {
            // Q3.12 — send the typed time as a naive WALL-CLOCK + local:true. The
            // backend interprets it in the PROPERTY's timezone (from the client's
            // state), so "2 PM for a Texas property" is stored as 2 PM Central.
            const [th, tm] = time.split(':').map(Number);
            const endTotal = th * 60 + tm + duration;
            const endDay = endTotal >= 1440 ? ymd(addDays(new Date(`${date}T12:00:00`), Math.floor(endTotal / 1440))) : date;
            const eh = Math.floor((endTotal % 1440) / 60), em = endTotal % 60;
            const startWall = `${date}T${pad(th)}:${pad(tm)}:00`;
            const endWall = `${endDay}T${pad(eh)}:${pad(em)}:00`;
            const body = {
                type, starts_at: startWall, ends_at: endWall, local: true,
                reminder_sms: reminder,
            };
            if (assignee) body.assigned_to = assignee;
            if (address.trim()) body.address = address.trim();
            if (leadId) body.lead_id = leadId;
            if (claimId) body.claim_id = claimId;
            const res = await axiosInstance.post('/appointments', body);
            toast.success('Appointment created');
            // Q3.11 — non-blocking heads-up if it's outside the rep's availability.
            if (res.data?.outside_availability) {
                toast('Heads up — that slot is outside this person’s availability', { description: 'It was still booked. Check their working hours / blocked days if this was unintended.' });
            }
            onSaved();
        } catch (e) {
            const c = e?.response?.data?.conflict;
            if (e?.response?.status === 409 && c) {
                toast.error('Double-booked', { description: `Clashes with a ${c.type} at ${fmtTime(new Date(c.starts_at))}.` });
            } else {
                toast.error(e?.userMessage || 'Could not create appointment');
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="modal-backdrop active" onClick={onClose}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">New Appointment</div>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    {/* Q3.1 — who is this for? Search a client/lead first, or add a new one. */}
                    <label>Client</label>
                    {person ? (
                        <div className="person-card">
                            <div className="person-info">
                                <div className="person-name">{person.name}</div>
                                <div className="person-sub">
                                    <span className={`person-badge ${person.kind}`}>{person.sub_label}</span>
                                    {person.phone ? ` · ${person.phone}` : ''}
                                    {person.address ? ` · ${person.address}` : ''}
                                </div>
                            </div>
                            <button className="btn-link" onClick={() => setPerson(null)}>Change</button>
                        </div>
                    ) : (
                        <PersonSearch onPick={pickPerson} />
                    )}
                    <label>Type</label>
                    <div className="type-row">
                        {TYPES.map((t) => (
                            <button key={t} className={`type-pick ${TYPE_META[t].cls} ${type === t ? 'active' : ''}`} onClick={() => setType(t)}>
                                {TYPE_META[t].label}
                            </button>
                        ))}
                    </div>

                    <div className="grid2">
                        <div>
                            <label>Date</label>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                        <div>
                            <label>Time</label>
                            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                        </div>
                    </div>

                    <div className="grid2">
                        <div>
                            <label>Duration</label>
                            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                                {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
                            </select>
                        </div>
                        {manageAll && (
                            <div>
                                <label>Assignee</label>
                                <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                                    <option value="">Me</option>
                                    {team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    {Array.isArray(slots) && (
                        <div className="slots-hint">
                            {slots.length === 0 && <span className="muted">Closed on this day.</span>}
                            {slots.filter((s) => s.available).slice(0, 8).map((s) => {
                                const t = new Date(s.start);
                                const hhmm = `${pad(t.getHours())}:${pad(t.getMinutes())}`;
                                return <button key={s.start} className={`slot ${time === hhmm ? 'active' : ''}`} onClick={() => setTime(hhmm)}>{fmtTime(t)}</button>;
                            })}
                        </div>
                    )}

                    <label>Address</label>
                    <input type="text" value={address} placeholder="Job site address" onChange={(e) => setAddress(e.target.value)} />

                    <label className="check-row">
                        <input type="checkbox" checked={reminder} onChange={(e) => setReminder(e.target.checked)} />
                        Send reminder texts (T-24h / T-2h · respects Do-Not-Contact, held until A2P is live)
                    </label>
                </div>
                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn-primary" disabled={busy} onClick={save}>Create</button>
                </div>
            </div>
        </div>
    );
}

// ==========================================================================
// Q3.11 — per-person availability editor (weekly hours + date overrides).
// Booking + public links compute slots from this, so blocking a day removes it.
// ==========================================================================
const DOW = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [7, 'Sun']];
const DOW_SHORT = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };
const to12h = (hhmm) => { if (!hhmm) return ''; const [h, m] = String(hhmm).split(':').map(Number); const ap = h < 12 ? 'AM' : 'PM'; const h12 = h % 12 === 0 ? 12 : h % 12; return `${h12}:${String(m).padStart(2, '0')} ${ap}`; };
const daysSummary = (days) => {
    if (!days || !days.length) return 'No working days';
    const s = [...days].sort((a, b) => a - b);
    const parts = []; let i = 0;
    while (i < s.length) {
        let j = i; while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
        parts.push(j > i ? `${DOW_SHORT[s[i]]}–${DOW_SHORT[s[j]]}` : DOW_SHORT[s[i]]);
        i = j + 1;
    }
    return parts.join(', ');
};

function AvailabilityPanel({ manageAll, workers, onClose, onChanged }) {
    const [target, setTarget] = useState('');           // '' = me
    const [rules, setRules] = useState(null);            // { weekly, company_default, overrides }
    const [weekly, setWeekly] = useState(null);          // editable working copy
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [ov, setOv] = useState({ day: '', kind: 'blocked', start_time: '09:00', end_time: '13:00', note: '' });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get('/appointments/availability-rules', { params: target ? { user_id: target } : {}, suppressErrorToast: true });
            const d = res.data?.data;
            setRules(d);
            setWeekly({ ...(d?.company_default || {}), ...(d?.weekly || {}) });
        } catch { setRules(null); } finally { setLoading(false); }
    }, [target]);
    useEffect(() => { load(); }, [load]);

    const toggleDay = (n) => setWeekly((w) => {
        const days = new Set(w.days || []);
        days.has(n) ? days.delete(n) : days.add(n);
        return { ...w, days: [...days].sort() };
    });
    const saveWeekly = async () => {
        setSaving(true);
        try {
            await axiosInstance.put('/appointments/availability-rules', { user_id: target || undefined, weekly });
            toast.success('Working hours saved');
            await load(); onChanged?.();
        } catch (e) { toast.error(e?.userMessage || 'Could not save'); } finally { setSaving(false); }
    };
    const addOverride = async () => {
        if (!ov.day) { toast.error('Pick a date'); return; }
        try {
            await axiosInstance.post('/appointments/availability-overrides', { user_id: target || undefined, ...ov });
            toast.success(ov.kind === 'blocked' ? 'Day blocked' : 'Custom hours set');
            setOv({ ...ov, day: '', note: '' });
            await load(); onChanged?.();
        } catch (e) { toast.error(e?.userMessage || 'Could not save'); }
    };
    const removeOverride = async (id) => {
        try { await axiosInstance.delete(`/appointments/availability-overrides/${id}`); await load(); onChanged?.(); }
        catch { /* */ }
    };

    return (
        <div className="bl-panel avail-panel">
            <div className="bl-head">
                <span><Clock size={15} style={{ verticalAlign: '-3px', marginRight: 6 }} />Availability</span>
                <button className="modal-close" onClick={onClose}>&times;</button>
            </div>

            {manageAll && workers.length > 0 && (
                <div className="avail-target">
                    <label>Editing availability for</label>
                    <select value={target} onChange={(e) => setTarget(e.target.value)}>
                        <option value="">Me</option>
                        {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>
            )}

            {loading || !weekly ? (
                <div className="avail-loading"><span className="detail-spinner" /> Loading availability…</div>
            ) : (
                <>
                    {/* Weekly hours */}
                    <div className="avail-card">
                        <div className="avail-card-head">
                            <div>
                                <div className="avail-card-title">Weekly working hours</div>
                                <div className="avail-card-sub">{rules?.weekly ? 'Bookings & your public link use these hours.' : 'Using the company default — customise below.'}</div>
                            </div>
                            {!rules?.weekly && <span className="avail-pill">Company default</span>}
                        </div>
                        <div className="avail-days">
                            {DOW.map(([n, lbl]) => (
                                <button key={n} type="button" className={`avail-day ${(weekly.days || []).includes(n) ? 'on' : ''}`} onClick={() => toggleDay(n)}>{lbl}</button>
                            ))}
                        </div>
                        <div className="avail-summary">
                            🗓 <strong>{daysSummary(weekly.days)}</strong> · {to12h(weekly.start || '08:00')} – {to12h(weekly.end || '18:00')} · {weekly.slot_minutes || 60}-min slots
                        </div>
                        <div className="avail-hours">
                            <label>Start <input type="time" value={weekly.start || '08:00'} onChange={(e) => setWeekly((w) => ({ ...w, start: e.target.value }))} /></label>
                            <label>End <input type="time" value={weekly.end || '18:00'} onChange={(e) => setWeekly((w) => ({ ...w, end: e.target.value }))} /></label>
                            <label>Slot <select value={weekly.slot_minutes || 60} onChange={(e) => setWeekly((w) => ({ ...w, slot_minutes: Number(e.target.value) }))}>{[30, 45, 60, 90, 120].map((s) => <option key={s} value={s}>{s} min</option>)}</select></label>
                        </div>
                        <div className="avail-card-foot">
                            <button className="btn-primary sm" disabled={saving} onClick={saveWeekly}>{saving ? 'Saving…' : 'Save working hours'}</button>
                        </div>
                    </div>

                    {/* Time off / custom hours */}
                    <div className="avail-card">
                        <div className="avail-card-head">
                            <div>
                                <div className="avail-card-title">Time off &amp; custom hours</div>
                                <div className="avail-card-sub">Block a vacation day or set special hours for one date.</div>
                            </div>
                        </div>
                        <div className="avail-ov-list">
                            {(rules?.overrides || []).length === 0 && <div className="avail-empty">No upcoming time off or custom hours.</div>}
                            {(rules?.overrides || []).map((o) => (
                                <div className="avail-ov" key={o.id}>
                                    <span className="avail-ov-day">{new Date(`${o.day}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                    <span className={`avail-ov-kind ${o.kind}`}>{o.kind === 'blocked' ? '⛔ Day off' : `🕒 ${to12h(o.start_time)}–${to12h(o.end_time)}`}</span>
                                    {o.note && <span className="avail-ov-note">{o.note}</span>}
                                    <button className="avail-ov-rm" onClick={() => removeOverride(o.id)} title="Remove">✕</button>
                                </div>
                            ))}
                        </div>
                        <div className="avail-ov-add">
                            <input type="date" value={ov.day} onChange={(e) => setOv({ ...ov, day: e.target.value })} />
                            <select value={ov.kind} onChange={(e) => setOv({ ...ov, kind: e.target.value })}>
                                <option value="blocked">Block (day off)</option>
                                <option value="custom">Custom hours</option>
                            </select>
                            {ov.kind === 'custom' && (
                                <>
                                    <input type="time" value={ov.start_time} onChange={(e) => setOv({ ...ov, start_time: e.target.value })} />
                                    <span className="avail-to">–</span>
                                    <input type="time" value={ov.end_time} onChange={(e) => setOv({ ...ov, end_time: e.target.value })} />
                                </>
                            )}
                            <input type="text" className="avail-ov-note-in" placeholder="Note (optional)" value={ov.note} onChange={(e) => setOv({ ...ov, note: e.target.value })} />
                            <button className="btn-secondary sm" onClick={addOverride}>Add</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ==========================================================================
// Booking Links panel — per-rep public /book/:slug URLs (task 2.12)
// ==========================================================================
function BookingLinks({ manageAll, nameOf, onClose }) {
    const [rows, setRows] = useState(null);
    const [meId, setMeId] = useState(null);
    const [slug, setSlug] = useState('');
    const [saving, setSaving] = useState(false);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    const load = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/appointments/booking-links', { suppressErrorToast: true });
            const list = res.data?.data || [];
            setRows(list);
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            setMeId(user?.id || null);
            const mine = list.find((r) => r.id === user?.id);
            if (mine?.booking_slug) setSlug(mine.booking_slug);
        } catch { setRows([]); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const displayName = (r) => r.full_name || `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email || 'Member';
    const mine = rows?.find((r) => r.id === meId);

    const saveSlug = async () => {
        setSaving(true);
        try {
            await axiosInstance.patch('/appointments/booking-link', { slug: slug.trim() || null });
            toast.success('Booking link saved');
            await load();
        } catch (e) { toast.error(e?.userMessage || 'Could not save link'); }
        finally { setSaving(false); }
    };
    const toggle = async (enabled) => {
        setSaving(true);
        try {
            await axiosInstance.patch('/appointments/booking-link', { enabled });
            toast.success(enabled ? 'Booking enabled' : 'Booking disabled');
            await load();
        } catch (e) { toast.error(e?.userMessage || 'Could not update'); }
        finally { setSaving(false); }
    };
    const copy = (url) => { try { navigator.clipboard.writeText(url); toast.success('Copied'); } catch { /* noop */ } };

    return (
        <div className="bl-panel">
            <div className="bl-head">
                <span>Public Booking Links</span>
                <button className="modal-close" onClick={onClose}>&times;</button>
            </div>

            {/* My link editor */}
            <div className="bl-editor">
                <label>Your booking link</label>
                <div className="bl-editrow">
                    <span className="bl-prefix">{origin}/book/</span>
                    <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="your-name" disabled={saving} />
                    <button className="btn-secondary" disabled={saving} onClick={saveSlug}>
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
                {mine && (
                    <label className="bl-toggle">
                        <input type="checkbox" checked={!!mine.booking_enabled} disabled={saving} onChange={(e) => toggle(e.target.checked)} />
                        Accept public bookings
                    </label>
                )}
                <div className="bl-hint">3–40 chars: lowercase letters, numbers, dashes. Homeowners pick a slot and it lands on your calendar automatically.</div>
            </div>

            {/* Roster (manage-all) */}
            {rows === null && <div className="bl-empty">Loading…</div>}
            {rows?.length > 0 && (
                <div className="bl-list">
                    {rows.filter((r) => r.booking_slug).map((r) => {
                        const url = `${origin}/book/${r.booking_slug}`;
                        return (
                            <div key={r.id} className="bl-row">
                                <div className="bl-rep">{displayName(r)}{r.id === meId ? ' (you)' : ''}</div>
                                <div className="bl-url">{url}</div>
                                <span className={`bl-badge ${r.booking_enabled ? 'on' : 'off'}`}>{r.booking_enabled ? 'On' : 'Off'}</span>
                                <button className="bl-copy" onClick={() => copy(url)}><Copy size={13} /> Copy</button>
                            </div>
                        );
                    })}
                    {!rows.some((r) => r.booking_slug) && <div className="bl-empty">No booking links set yet.</div>}
                </div>
            )}
        </div>
    );
}

// Q3.8 — "On the Way" control: pick arrival + buffer → the client gets the
// window (arrival ± buffer/2) with the tech's name/photo/phone + a deep link.
function OnTheWayControl({ defaultTime, onSend }) {
    const [open, setOpen] = useState(false);
    const [arrival, setArrival] = useState(defaultTime || '09:00');
    const [buffer, setBuffer] = useState(30);
    const [sending, setSending] = useState(false);
    // Live preview of the window the client will see.
    const preview = (() => {
        const m = /^(\d{1,2}):(\d{2})$/.exec(arrival);
        if (!m) return '';
        const mins = +m[1] * 60 + +m[2], half = Math.round(buffer / 2);
        const fmt = (t) => { t = ((t % 1440) + 1440) % 1440; const h = Math.floor(t / 60), mm = t % 60; const ap = h < 12 ? 'AM' : 'PM'; const h12 = h % 12 === 0 ? 12 : h % 12; return `${h12}:${String(mm).padStart(2, '0')} ${ap}`; };
        return `${fmt(mins - half)} – ${fmt(mins + half)}`;
    })();
    const send = async () => {
        setSending(true);
        try { await onSend(arrival, buffer); setOpen(false); }
        finally { setSending(false); }
    };
    if (!open) {
        return <button className="btn-otw" onClick={() => setOpen(true)}><MapPin size={14} style={{ verticalAlign: '-2px' }} /> On the Way</button>;
    }
    return (
        <div className="otw-box">
            <div className="otw-head">🚗 On the Way — the client will be told you arrive:</div>
            <div className="otw-window">{preview}</div>
            <div className="grid2">
                <div><label>Arrival time</label><input type="time" value={arrival} onChange={(e) => setArrival(e.target.value)} /></div>
                <div><label>Window (± minutes)</label>
                    <select value={buffer} onChange={(e) => setBuffer(Number(e.target.value))}>
                        {[10, 15, 20, 30, 45, 60].map((b) => <option key={b} value={b}>{b} min</option>)}
                    </select>
                </div>
            </div>
            <div className="otw-actions">
                <button className="btn-secondary sm" onClick={() => setOpen(false)}>Cancel</button>
                <button className="btn-primary sm" disabled={sending} onClick={send}>{sending ? 'Sending…' : 'Notify client'}</button>
            </div>
        </div>
    );
}

// Q3.7 — inline SMS composer (company Twilio number; A2P-gated server-side).
function SmsComposer({ to, onSent }) {
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const send = async () => {
        if (!body.trim()) return;
        setSending(true);
        try {
            await axiosInstance.post('/sms/send', { to, body: body.trim() });
            toast.success('Message sent');
            setBody(''); onSent?.();
        } catch (e) { toast.error(e?.userMessage || 'Could not send (needs Send SMS + A2P)'); }
        finally { setSending(false); }
    };
    return (
        <div className="sms-composer">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={`Text ${to}…`} rows={2} />
            <button className="btn-primary sm" disabled={sending || !body.trim()} onClick={send}>{sending ? 'Sending…' : 'Send text'}</button>
        </div>
    );
}

// ==========================================================================
// Q3.10 — appointment photos (capture/upload → AI note → approve/post elsewhere)
// Images stream through the authed /s3/file proxy, so we fetch them as blobs.
// ==========================================================================
const apptImgCache = new Map();
function ApptAuthedThumb({ url, alt }) {
    const [blob, setBlob] = useState(() => apptImgCache.get(url) || null);
    useEffect(() => {
        if (!url || apptImgCache.get(url)) { if (apptImgCache.get(url)) setBlob(apptImgCache.get(url)); return; }
        let cancelled = false;
        axiosInstance.get(url, { responseType: 'blob' })
            .then((res) => { const u = URL.createObjectURL(res.data); apptImgCache.set(url, u); if (!cancelled) setBlob(u); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [url]);
    if (!blob) return <div className="appt-photo-thumb appt-photo-loading">…</div>;
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="appt-photo-thumb" src={blob} alt={alt || 'Photo'} />;
}

function ApptPhotos({ appointmentId, claimId }) {
    const [rows, setRows] = useState([]);
    const [busy, setBusy] = useState(false);
    const inputRef = useRef(null);
    const apiOrigin = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

    const load = useCallback(async () => {
        try {
            const { data } = await axiosInstance.get('/job-images', { params: { appointment_id: appointmentId }, suppressErrorToast: true });
            setRows(Array.isArray(data?.data) ? data.data : []);
        } catch { setRows([]); }
    }, [appointmentId]);
    useEffect(() => { load(); }, [load]);

    const upload = async (file) => {
        if (!file) return;
        setBusy(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('appointment_id', appointmentId);
            if (claimId) fd.append('claim_id', claimId);
            await axiosInstance.post('/job-images', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('Photo uploaded — AI note drafting');
            load();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Upload failed');
        } finally { setBusy(false); }
    };

    return (
        <div className="appt-photos">
            <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
            <button className="btn-secondary sm" disabled={busy} onClick={() => inputRef.current?.click()}>{busy ? 'Uploading…' : '📷 Add photo'}</button>
            {!claimId && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Link this appointment to a client to post photos to their portal.</div>}
            {rows.length > 0 && (
                <div className="appt-photo-strip">
                    {rows.map((r) => (
                        <div key={r.id} title={r.caption || r.ai_note || ''} style={{ position: 'relative' }}>
                            <ApptAuthedThumb url={r.s3_url ? `${apiOrigin}${r.s3_url}` : null} alt={r.caption} />
                            {r.posted_to_portal && <span className="appt-photo-badge">portal</span>}
                        </div>
                    ))}
                </div>
            )}
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Review the AI note, approve &amp; post from <strong>Company Images</strong>.</div>
        </div>
    );
}

// ==========================================================================
// Detail modal (reschedule / reassign / outcome / status)
// ==========================================================================
function DetailModal({ appt, team, manageAll, nameOf, onClose, onOutcome, onReschedule, onAfter }) {
    const router = useRouter();
    const [date, setDate] = useState(ymd(appt._s));
    const [time, setTime] = useState(`${pad(appt._s.getHours())}:${pad(appt._s.getMinutes())}`);
    const [duration, setDuration] = useState(Math.round((appt._e - appt._s) / 60000));
    const [assignee, setAssignee] = useState(appt.assigned_to || '');
    const [busy, setBusy] = useState(false);
    const done = ['completed', 'no_show', 'cancelled'].includes(appt.status);

    // Q3.7 — enriched detail: client + history + change log + gated job cost.
    const [detail, setDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(true);
    const [notes, setNotes] = useState(appt.notes || '');
    const [savingNotes, setSavingNotes] = useState(false);
    const [showMsg, setShowMsg] = useState(false);
    useEffect(() => {
        let cancelled = false;
        setLoadingDetail(true);
        (async () => {
            try {
                const res = await axiosInstance.get(`/appointments/${appt.id}/detail`, { suppressErrorToast: true });
                if (!cancelled) { setDetail(res.data?.data); setNotes(res.data?.data?.appointment?.notes || ''); }
            } catch { /* degrade to the basic view */ }
            finally { if (!cancelled) setLoadingDetail(false); }
        })();
        return () => { cancelled = true; };
    }, [appt.id]);

    const client = detail?.client || null;
    const saveNotes = async () => {
        setSavingNotes(true);
        try { await axiosInstance.patch(`/appointments/${appt.id}`, { notes }); toast.success('Notes saved'); }
        catch (e) { toast.error(e?.userMessage || 'Could not save notes'); }
        finally { setSavingNotes(false); }
    };
    const copyPhone = () => { if (client?.phone) { navigator.clipboard?.writeText(client.phone); toast.success('Phone copied'); } };
    const goToPortal = () => { if (client?.claim_id) { onClose(); router.push(`/dashboard/claims/${client.claim_id}`); } };
    const isToday = sameDay(appt._s, new Date());
    const sendOnTheWay = async (arrival, buffer) => {
        try {
            const res = await axiosInstance.post(`/appointments/${appt.id}/on-the-way`, { arrival, buffer_minutes: buffer });
            const n = res.data?.data?.notified;
            if (n && (n.email || n.sms)) toast.success(`Client notified · arriving ${res.data.data.window}`);
            else toast.success(`On-the-way set (${res.data?.data?.window}) — client had no reachable contact`);
        } catch (e) { toast.error(e?.userMessage || 'Could not notify'); }
    };

    const applyReschedule = async () => {
        setBusy(true);
        const ns = new Date(`${date}T${time}:00`);
        const ne = new Date(ns.getTime() + duration * 60000);
        const r = await onReschedule(appt, ns, ne, manageAll ? (assignee || null) : undefined);
        setBusy(false);
        // 'deferred' → the notify-choice modal took over (a time change on a
        // linked appointment); this detail modal was already closed by the parent.
        if (r === true) onAfter();
    };
    const cancelAppt = async () => {
        setBusy(true);
        try {
            await axiosInstance.patch(`/appointments/${appt.id}`, { status: 'cancelled' });
            toast.success('Appointment cancelled');
            onAfter();
        } catch (e) { toast.error(e?.userMessage || 'Could not cancel'); }
        finally { setBusy(false); }
    };

    return (
        <div className="modal-backdrop active" onClick={onClose}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">
                        <i className={`chip ${TYPE_META[appt.type]?.cls || ''}`} style={{ verticalAlign: '-1px', marginRight: 6 }} />
                        {TYPE_META[appt.type]?.label} appointment
                    </div>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <div className="modal-lead-summary">
                        <div className="name">{nameOf(appt.assigned_to)} · <span className={`st-badge st-${appt.status}`}>{STATUS_LABEL[appt.status]}</span></div>
                        <div className="meta">{appt._s.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} – {fmtTime(appt._e)} <span className="tz-you">your time</span></div>
                        {(() => {
                            // Q3.12 — note the property's local time when it differs from the viewer's.
                            const pt = fmtInTz(appt._s, appt.timezone);
                            const yt = fmtInTz(appt._s, Intl.DateTimeFormat().resolvedOptions().timeZone);
                            return pt && pt !== yt ? <div className="meta tz-prop">🌎 Property time: <strong>{pt}</strong></div> : null;
                        })()}
                        {appt.address && (
                            <div className="meta meta-addr">
                                <span>{appt.address}</span>
                                {navHref(appt.address, appt.lat, appt.lng) && (
                                    <a className="maps-btn" href={navHref(appt.address, appt.lat, appt.lng)} target="_blank" rel="noreferrer"><MapPin size={12} /> Open in Maps</a>
                                )}
                            </div>
                        )}
                        {appt.claim_id && <div className="meta">Linked to a claim</div>}
                        {appt.lead_id && <div className="meta">Linked to a lead</div>}
                    </div>

                    {/* Q3.7 — loading state while the enriched detail arrives */}
                    {loadingDetail && (
                        <div className="detail-loading"><span className="detail-spinner" /> Loading client & history…</div>
                    )}

                    {/* Q3.7 — client + quick actions */}
                    {client && (
                        <div className="appt-client">
                            <div className="appt-client-head">
                                <div className="appt-client-name">{client.name}<span className={`person-badge ${client.kind}`}>{client.kind === 'claim' ? 'Client' : 'Lead'}</span></div>
                            </div>
                            <div className="appt-quick">
                                {client.phone && <a className="today-btn" href={`tel:${client.phone}`}><Phone size={12} /> Call</a>}
                                {client.phone && <button className="today-btn" onClick={copyPhone}>Copy #</button>}
                                {client.phone && <button className="today-btn" onClick={() => setShowMsg((s) => !s)}>Message</button>}
                                {client.claim_id && <button className="today-btn" onClick={goToPortal}>Client portal →</button>}
                            </div>
                            {showMsg && client.phone && <SmsComposer to={client.phone} onSent={() => setShowMsg(false)} />}
                            {/* Q3.8 — On the Way (today's appointments only) */}
                            {isToday && !done && client.kind === 'claim' && (
                                <OnTheWayControl defaultTime={`${pad(appt._s.getHours())}:${pad(appt._s.getMinutes())}`} onSend={sendOnTheWay} />
                            )}
                        </div>
                    )}

                    {/* Q3.7 — job cost (financial firewall: only when granted) */}
                    {detail?.can_view_financials && detail?.linked_job_cost != null && (
                        <div className="appt-cost">💰 Job cost: <strong>${Number(detail.linked_job_cost).toLocaleString('en-US')}</strong> <span className="muted">(internal)</span></div>
                    )}

                    {/* Q3.7 — Notes */}
                    <div className="sched-sec-title">Notes</div>
                    <textarea className="appt-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Access, gate codes, what to bring, context…" rows={2} />
                    <button className="btn-secondary sm" disabled={savingNotes} onClick={saveNotes}>{savingNotes ? 'Saving…' : 'Save notes'}</button>

                    {/* Q3.10 — Photos: capture/upload at the appointment. The AI drafts
                        a note; approve + post to the client's portal from Company Images. */}
                    <div className="sched-sec-title">Photos</div>
                    <ApptPhotos appointmentId={appt.id} claimId={client?.claim_id || null} />

                    {/* Q3.7 — client history */}
                    {detail && (detail.history?.appointments?.length > 0 || detail.history?.jobs?.length > 0) && (
                        <>
                            <div className="sched-sec-title">Client history</div>
                            <div className="appt-history">
                                {detail.history.appointments.map((h) => (
                                    <div className="appt-hist-row" key={`a:${h.id}`}>
                                        <span className={`chip ${TYPE_META[h.type]?.cls || ''}`} />
                                        <span className="appt-hist-t">{TYPE_META[h.type]?.label || h.type}</span>
                                        <span className="appt-hist-d">{new Date(h.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        <span className={`st-badge st-${h.status}`}>{STATUS_LABEL[h.status] || h.status}</span>
                                    </div>
                                ))}
                                {detail.history.jobs.map((j) => (
                                    <div className="appt-hist-row" key={`j:${j.id}`}>
                                        <span className="chip install" />
                                        <span className="appt-hist-t">🔧 Job {j.job_number || ''}</span>
                                        <span className="appt-hist-d">{j.scheduled_start ? new Date(`${String(j.scheduled_start).slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : (j.readiness_state || '').replace(/_/g, ' ')}</span>
                                        {j.job_cost != null && <span className="muted">${Number(j.job_cost).toLocaleString('en-US')}</span>}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Q3.7 — change history */}
                    {detail?.change_history?.length > 0 && (
                        <>
                            <div className="sched-sec-title">Change history {detail.move_count > 0 ? `· moved ${detail.move_count}×` : ''}</div>
                            <div className="appt-changes">
                                {detail.change_history.slice(0, 6).map((c, i) => (
                                    <div className="appt-change" key={i}>
                                        <span className="appt-change-a">{(c.action || '').replace(/^appointment_/, '').replace(/_/g, ' ')}</span>
                                        <span className="appt-change-by">{c.by}</span>
                                        <span className="appt-change-at">{new Date(c.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Q3.7 — job-linked actions (route to the claim where these live) */}
                    {client?.claim_id && (
                        <div className="appt-joblinks">
                            <button className="btn-secondary sm" onClick={goToPortal} title="Send the final invoice from the client's claim">Send Final Invoice →</button>
                            <button className="btn-secondary sm" onClick={goToPortal} title="Request a review from the client's claim">Request Review →</button>
                        </div>
                    )}

                    {!done && (
                        <>
                            <div className="sched-sec-title">Reschedule</div>
                            <div className="grid2">
                                <div><label>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                                <div><label>Time</label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
                            </div>
                            <div className="grid2">
                                <div>
                                    <label>Duration</label>
                                    <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                                        {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
                                    </select>
                                </div>
                                {manageAll && (
                                    <div>
                                        <label>Assignee</label>
                                        <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                                            <option value="">Unassigned</option>
                                            {team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <button className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={busy} onClick={applyReschedule}>Save changes</button>
                        </>
                    )}

                    {appt.outcome_note && (
                        <div className="sched-note"><b>Outcome:</b> {appt.outcome_note}</div>
                    )}
                </div>
                <div className="modal-footer between">
                    {!done ? (
                        <>
                            <div className="footer-left">
                                <button className="btn-success" disabled={busy} onClick={() => onOutcome(appt, 'completed')}><Check size={14} style={{ verticalAlign: '-2px' }} /> Done</button>
                                <button className="btn-danger" disabled={busy} onClick={() => onOutcome(appt, 'no_show')}><XCircle size={14} style={{ verticalAlign: '-2px' }} /> No-show</button>
                            </div>
                            <button className="btn-secondary" disabled={busy} onClick={cancelAppt}>Cancel appt</button>
                        </>
                    ) : (
                        <button className="btn-secondary" onClick={onClose}>Close</button>
                    )}
                </div>
            </div>
        </div>
    );
}
