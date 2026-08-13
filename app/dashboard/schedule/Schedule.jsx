'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    ChevronLeft, ChevronRight, Plus, MapPin, Phone, Check, XCircle, X, Clock, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance';
import { usePermissions } from '@/lib/permissions/PermissionsContext';
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
            const res = await axiosInstance.get('/appointments', {
                params: { start: range.start.toISOString(), end: range.end.toISOString() },
            });
            setAppts((res.data?.data || []).map((a) => ({ ...a, _s: new Date(a.starts_at), _e: new Date(a.ends_at) })));
        } catch {
            setAppts([]);
        } finally {
            setLoading(false);
        }
    }, [range]);

    useEffect(() => { load(); }, [load]);

    // Team roster (best-effort; needs view_team). Used for swimlanes + assignee.
    useEffect(() => {
        if (!manageAll) return;
        (async () => {
            try {
                const res = await axiosInstance.get('/team/members', { suppressErrorToast: true });
                const list = res.data?.data || res.data || [];
                setTeam(list.map((m) => ({
                    id: m.id || m.user_id,
                    name: m.full_name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email || 'Member',
                })).filter((m) => m.id));
            } catch { /* swimlanes degrade to a single lane */ }
        })();
    }, [manageAll]);

    const nameOf = useCallback(
        (id) => team.find((m) => m.id === id)?.name || (id ? 'Assigned' : 'Unassigned'),
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

    // Reschedule (and optionally reassign) — used by drag + the detail modal.
    const reschedule = async (appt, newStart, newEnd, assignee) => {
        const body = { starts_at: newStart.toISOString(), ends_at: newEnd.toISOString() };
        if (assignee !== undefined && assignee !== appt.assigned_to) body.assigned_to = assignee;
        try {
            await axiosInstance.patch(`/appointments/${appt.id}`, body);
            toast.success('Appointment updated');
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

    // Drop an appointment onto a target day (keep time-of-day) + optional rep.
    const onDropDay = (targetDate, assignee) => {
        const appt = appts.find((a) => a.id === dragId);
        setDragId(null);
        if (!appt) return;
        const dur = appt._e - appt._s;
        const ns = new Date(targetDate);
        ns.setHours(appt._s.getHours(), appt._s.getMinutes(), 0, 0);
        const ne = new Date(ns.getTime() + dur);
        if (sameDay(ns, appt._s) && assignee === undefined) return;
        reschedule(appt, ns, ne, assignee);
    };

    const openDetail = (appt) => setModal({ mode: 'detail', appt });

    const days = useMemo(() => {
        if (view === 'day') return [new Date(anchor)];
        const ws = startOfWeek(anchor);
        return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    }, [view, anchor]);

    const todays = useMemo(() => {
        const now = new Date();
        return appts.filter((a) => sameDay(a._s, now)).sort((a, b) => a._s - b._s);
    }, [appts]);

    return (
        <div className="schedule-page">
            <div className="page-header">
                <div>
                    <div className="page-title">Scheduling</div>
                    <div className="page-subtitle">Estimates, inspections, adjuster meetings, installs & follow-ups — one calendar</div>
                </div>
                <div className="header-right">
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

                {/* Legend */}
                <div className="sched-legend">
                    {TYPES.map((t) => (
                        <span key={t}><i className={`chip ${TYPE_META[t].cls}`} />{TYPE_META[t].label}</span>
                    ))}
                </div>

                <div className="sched-main">
                    <div className="sched-cal">
                        {loading && <div className="sched-loading">Loading calendar…</div>}
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
                    team={team}
                    manageAll={manageAll}
                    defaultDate={view === 'day' ? anchor : new Date()}
                    onClose={() => setModal(null)}
                    onSaved={() => { setModal(null); load(); }}
                />
            )}
            {modal?.mode === 'detail' && (
                <DetailModal
                    appt={modal.appt}
                    team={team}
                    manageAll={manageAll}
                    nameOf={nameOf}
                    onClose={() => setModal(null)}
                    onOutcome={saveOutcome}
                    onReschedule={reschedule}
                    onAfter={() => { setModal(null); load(); }}
                />
            )}
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
                                                className={`tg-appt ${TYPE_META[a.type]?.cls || ''} st-${a.status}`}
                                                style={{ top, height }}
                                                draggable
                                                onDragStart={() => setDragId(a.id)}
                                                onDragEnd={() => setDragId(null)}
                                                onClick={() => onOpen(a)}
                                            >
                                                <div className="tg-appt-t">{fmtTime(a._s)}</div>
                                                <div className="tg-appt-n">{TYPE_META[a.type]?.label}{a.address ? ` · ${a.address}` : ''}</div>
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
                                        className={`mg-pill ${TYPE_META[a.type]?.cls || ''} st-${a.status}`}
                                        draggable
                                        onDragStart={() => setDragId(a.id)}
                                        onDragEnd={() => setDragId(null)}
                                        onClick={() => onOpen(a)}
                                    >
                                        {fmtTime(a._s)} {TYPE_META[a.type]?.label}
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
                    <React.Fragment key={rep.id || 'unassigned'}>
                        <div className="team-lane-name">{rep.name}</div>
                        {days.map((day) => {
                            const cellAppts = appts.filter((a) => a.assigned_to === rep.id && sameDay(a._s, day)).sort((a, b) => a._s - b._s);
                            return (
                                <div
                                    key={day.toISOString()}
                                    className="team-cell"
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={() => onDropDay(day, rep.id)}
                                >
                                    {cellAppts.map((a) => (
                                        <div
                                            key={a.id}
                                            className={`team-appt ${TYPE_META[a.type]?.cls || ''} st-${a.status}`}
                                            draggable
                                            onDragStart={() => setDragId(a.id)}
                                            onDragEnd={() => setDragId(null)}
                                            onClick={() => onOpen(a)}
                                        >
                                            {fmtTime(a._s)} {TYPE_META[a.type]?.label}
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
                    <div key={a.id} className={`today-card ${TYPE_META[a.type]?.cls || ''}`}>
                        <div className="today-time"><Clock size={12} style={{ verticalAlign: '-2px' }} /> {fmtTime(a._s)}</div>
                        <button className="today-title" onClick={() => onOpen(a)}>{TYPE_META[a.type]?.label} · {nameOf(a.assigned_to)}</button>
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
// New Appointment modal
// ==========================================================================
function AppointmentModal({ prefill, team, manageAll, defaultDate, onClose, onSaved }) {
    const [type, setType] = useState('estimate');
    const [date, setDate] = useState(ymd(defaultDate || new Date()));
    const [time, setTime] = useState('09:00');
    const [duration, setDuration] = useState(60);
    const [assignee, setAssignee] = useState('');
    const [address, setAddress] = useState(prefill?.address || '');
    const [leadId] = useState(prefill?.lead_id || '');
    const [claimId] = useState(prefill?.claim_id || '');
    const [reminder, setReminder] = useState(true);
    const [slots, setSlots] = useState(null);
    const [busy, setBusy] = useState(false);

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
            const starts = new Date(`${date}T${time}:00`);
            const ends = new Date(starts.getTime() + duration * 60000);
            const body = {
                type, starts_at: starts.toISOString(), ends_at: ends.toISOString(),
                reminder_sms: reminder,
            };
            if (assignee) body.assigned_to = assignee;
            if (address.trim()) body.address = address.trim();
            if (leadId) body.lead_id = leadId;
            if (claimId) body.claim_id = claimId;
            await axiosInstance.post('/appointments', body);
            toast.success('Appointment created');
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
                    {(leadId || claimId) && (
                        <div className="sched-linkchip">{leadId ? 'Linked to lead' : 'Linked to claim'} · booking will update it</div>
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
// Detail modal (reschedule / reassign / outcome / status)
// ==========================================================================
function DetailModal({ appt, team, manageAll, nameOf, onClose, onOutcome, onReschedule, onAfter }) {
    const [date, setDate] = useState(ymd(appt._s));
    const [time, setTime] = useState(`${pad(appt._s.getHours())}:${pad(appt._s.getMinutes())}`);
    const [duration, setDuration] = useState(Math.round((appt._e - appt._s) / 60000));
    const [assignee, setAssignee] = useState(appt.assigned_to || '');
    const [busy, setBusy] = useState(false);
    const done = ['completed', 'no_show', 'cancelled'].includes(appt.status);

    const applyReschedule = async () => {
        setBusy(true);
        const ns = new Date(`${date}T${time}:00`);
        const ne = new Date(ns.getTime() + duration * 60000);
        const ok = await onReschedule(appt, ns, ne, manageAll ? (assignee || null) : undefined);
        setBusy(false);
        if (ok) onAfter();
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
                        <div className="meta">{appt._s.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} – {fmtTime(appt._e)}</div>
                        {appt.address && <div className="meta">{appt.address}</div>}
                        {appt.claim_id && <div className="meta">Linked to a claim</div>}
                        {appt.lead_id && <div className="meta">Linked to a lead</div>}
                    </div>

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
