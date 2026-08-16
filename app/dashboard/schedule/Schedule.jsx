'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    ChevronLeft, ChevronRight, Plus, MapPin, Phone, Check, XCircle, X, Clock, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance';
import { createClient } from '@/lib/supabase/client';
import { usePermissions } from '@/lib/permissions/PermissionsContext';
import { Link2, Copy } from 'lucide-react';
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
    const [showLinks, setShowLinks] = useState(false);
    const [notifyChoice, setNotifyChoice] = useState(null); // Q3.4 forced notify choice

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
        requestReschedule(appt, ns, ne, assignee);
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

                {showLinks && <BookingLinks manageAll={manageAll} nameOf={nameOf} onClose={() => setShowLinks(false)} />}

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
                    onReschedule={requestReschedule}
                    onAfter={() => { setModal(null); load(); }}
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
