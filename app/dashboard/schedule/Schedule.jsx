'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    ChevronLeft, ChevronRight, Plus, MapPin, Phone, Check, XCircle, X, Clock, RefreshCw, Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import axiosInstance from '@/lib/axiosInstance';
import { createClient } from '@/lib/supabase/client';
import { usePermissions } from '@/lib/permissions/PermissionsContext';
import { Link2, Copy } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './schedule.css';

// ─── Appointment types (Q3.6 — now DB-driven per company) ──────────────────
// Built-in defaults are the fallback; `applyAppointmentTypes()` overwrites these
// from GET /appointment-types once loaded, so custom types + edited colours flow
// through every `TYPE_META[...]` lookup below without threading state everywhere.
// Each entry carries the CSS class (the type key) + colour so we can both use the
// static built-in CSS AND inject colours for custom/edited types.
let TYPE_META = {
    estimate: { label: 'Estimate', cls: 'estimate', color: '#FDB813', text: '#1a1f3a', duration: 60, reminder: true },
    inspection: { label: 'Inspection', cls: 'inspection', color: '#3b82f6', text: '#ffffff', duration: 60, reminder: true },
    adjuster_meeting: { label: 'Adjuster', cls: 'adjuster_meeting', color: '#8b5cf6', text: '#ffffff', duration: 60, reminder: true },
    install: { label: 'Install', cls: 'install', color: '#1a1f3a', text: '#FDB813', duration: 120, reminder: true },
    follow_up: { label: 'Follow-up', cls: 'follow_up', color: '#9ca3af', text: '#ffffff', duration: 30, reminder: true },
};
let TYPES = Object.keys(TYPE_META);

// Rebuild TYPE_META/TYPES from the server list + inject per-type colour CSS.
// `.chip.<key>` colours the legend/dots; `.schedule-page .<key>` sets the
// --c/--t custom props the calendar blocks + type-pick buttons already read.
function applyAppointmentTypes(list) {
    if (!Array.isArray(list) || !list.length) return;
    const active = list.filter((t) => t.is_active !== false);
    const next = {};
    active.forEach((t) => {
        next[t.key] = {
            label: t.label,
            cls: t.key,
            color: t.color,
            text: t.text_color,
            duration: t.default_duration_minutes ?? 60,
            reminder: !!(t.default_reminders?.sms_24h || t.default_reminders?.sms_2h),
            applicable_fields: Array.isArray(t.applicable_fields) ? t.applicable_fields : ['address', 'reminders'],
        };
    });
    TYPE_META = next;
    TYPES = active.map((t) => t.key);

    if (typeof document !== 'undefined') {
        let el = document.getElementById('ck-appt-type-colors');
        if (!el) { el = document.createElement('style'); el.id = 'ck-appt-type-colors'; document.head.appendChild(el); }
        el.textContent = active.map((t) => {
            const c = t.color || '#3b82f6';
            const txt = t.text_color || '#ffffff';
            const k = cssEscapeKey(t.key);
            return `.schedule-page .chip.${k}{background:${c};}` +
                   `.schedule-page .${k}{--c:${c};--t:${txt};}`;
        }).join('\n');
    }
}
// Type keys are our own slugs ([a-z0-9_]) but guard anyway.
function cssEscapeKey(k) { return String(k).replace(/[^a-zA-Z0-9_-]/g, ''); }

// Q3.14 — build + open a clean, branded printable crew sheet, grouped by day.
function openPrintSheet({ companyName, rangeLabel, rows, logoUrl }) {
    const esc = (v) => String(v ?? '—').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const initials = (companyName || 'C').split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join('');
    const fmtTime = (iso) => {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };
    const dayKey = (iso) => String(iso).slice(0, 10);
    const dayLabel = (key) => new Date(`${key}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    const all = rows || [];
    const byDay = {};
    all.forEach((r) => { (byDay[dayKey(r.starts_at)] ||= []).push(r); });
    const days = Object.keys(byDay).sort();

    const sections = days.length ? days.map((k) => {
        const items = byDay[k].map((r) => {
            const meta = TYPE_META[r.type];
            const color = meta?.color || '#9ca3af';
            const label = r.is_job ? `Job #${r.job_number || ''}` : (meta?.label || r.type || 'Appointment');
            const who = r.client_name || (r.claim_number ? `Claim ${r.claim_number}` : '—');
            const sub = r.claim_number && r.client_name ? `<div class="sub">${esc(r.claim_number)}</div>` : '';
            return `<tr>
                <td class="t">${esc(fmtTime(r.starts_at))}</td>
                <td><span class="pill" style="background:${color}20;color:${color}"><span class="dot" style="background:${color}"></span>${esc(label)}</span></td>
                <td class="cl">${esc(who)}${sub}</td>
                <td>${esc(r.address)}</td>
                <td>${esc(r.assignee)}</td>
            </tr>`;
        }).join('');
        return `<section class="day"><h2>${esc(dayLabel(k))} <span class="cnt">${byDay[k].length} ${byDay[k].length === 1 ? 'stop' : 'stops'}</span></h2>
            <table><thead><tr><th style="width:64px">Time</th><th style="width:120px">Type</th><th>Client</th><th>Address</th><th style="width:130px">Assignee</th></tr></thead>
            <tbody>${items}</tbody></table></section>`;
    }).join('') : '<div class="empty"><div class="empty-ic">📅</div>No appointments or jobs scheduled in this range.</div>';

    const summary = all.length
        ? `<div class="summary"><b>${all.length}</b> ${all.length === 1 ? 'entry' : 'entries'} across <b>${days.length}</b> ${days.length === 1 ? 'day' : 'days'}</div>`
        : '';

    const logoImg = logoUrl
        ? `<img class="logo" src="${logoUrl}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'logo logo-fb',textContent:'${esc(initials)}'}))"/>`
        : `<div class="logo logo-fb">${esc(initials)}</div>`;

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(companyName)} — Schedule</title>
        <style>
            *{box-sizing:border-box} html,body{margin:0} body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1a1f3a;font-size:12.5px;line-height:1.5}
            .page{max-width:940px;margin:0 auto;padding:32px 34px}
            .head{display:flex;align-items:center;gap:14px;padding-bottom:16px;border-bottom:3px solid #1a1f3a;margin-bottom:6px}
            .logo{width:52px;height:52px;border-radius:10px;object-fit:cover;flex:0 0 auto;border:1px solid #eef0f4;background:#fff}
            .logo-fb{display:flex;align-items:center;justify-content:center;background:#1a1f3a;color:#FDB813;font-weight:800;font-size:18px;border:none}
            .head-meta{flex:1}
            .co{font-size:20px;font-weight:800;letter-spacing:-.01em}
            .subttl{color:#6b7280;font-size:12.5px;margin-top:1px}
            .summary{margin-left:auto;text-align:right;color:#6b7280;font-size:12px;white-space:nowrap}
            .summary b{color:#1a1f3a;font-size:15px}
            .day{margin-top:22px;page-break-inside:auto}
            h2{font-size:13px;margin:0 0 8px;color:#1a1f3a;display:flex;align-items:baseline;gap:8px}
            .cnt{color:#9ca3af;font-weight:500;font-size:11px}
            table{border-collapse:collapse;width:100%}
            th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;font-weight:700;padding:5px 10px;border-bottom:1.5px solid #e5e7eb}
            td{padding:8px 10px;border-bottom:1px solid #f2f3f5;vertical-align:top}
            tbody tr:nth-child(even){background:#fafbfc}
            td.t{white-space:nowrap;font-weight:700}
            td.cl{font-weight:600}
            .sub{font-size:10.5px;color:#9ca3af;font-weight:400}
            .pill{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px}
            .dot{display:inline-block;width:7px;height:7px;border-radius:50%}
            .empty{text-align:center;color:#9ca3af;padding:64px 0;font-size:14px}
            .empty-ic{font-size:34px;margin-bottom:8px;opacity:.5}
            .foot{margin-top:30px;padding-top:12px;border-top:1px solid #eef0f4;color:#9ca3af;font-size:10.5px;display:flex;justify-content:space-between}
            @media print{.page{max-width:none;padding:0} body{margin:12mm} h2{page-break-after:avoid} tr,section{page-break-inside:avoid} tbody tr:nth-child(even){background:#fafbfc !important;-webkit-print-color-adjust:exact;print-color-adjust:exact} .head,.pill{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
        </style></head><body>
        <div class="page">
            <div class="head">
                ${logoImg}
                <div class="head-meta"><div class="co">${esc(companyName)}</div><div class="subttl">Schedule · ${esc(rangeLabel)}</div></div>
                ${summary}
            </div>
            ${sections}
            <div class="foot"><span>Printed ${new Date().toLocaleString()}</span><span>Powered by ClaimKing.AI</span></div>
        </div>
        </body></html>`;

    const w = window.open('', '_blank', 'width=920,height=1000');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 350);
}
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
// §3.18 — rough drive-time estimate (no routing API): straight-line miles at an
// assumed 35 mph average. Used only to FLAG back-to-back appts that look too tight.
const haversineMi = (a, b) => {
    if (a?.lat == null || a?.lng == null || b?.lat == null || b?.lng == null) return null;
    const R = 3958.8, toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
};
const estDriveMin = (a, b) => { const mi = haversineMi(a, b); return mi == null ? null : Math.round((mi / 35) * 60) + 5; };

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

    const [view, setView] = useState('month');          // day | week | month | team
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
    const [showJobsMap, setShowJobsMap] = useState(false);  // Q3.15 all-jobs map
    const [showCalendars, setShowCalendars] = useState(false); // Q3.13 external calendar sync
    const [showTypes, setShowTypes] = useState(false);      // Q3.6 appointment type center
    const [showConfirm, setShowConfirm] = useState(false);  // §3.18 unconfirmed-tomorrow list
    const [apptTypes, setApptTypes] = useState([]);         // Q3.6 DB-driven types
    const [typesVersion, setTypesVersion] = useState(0);    // bump to re-render on type change

    // Q3.6 — load the company's appointment types once, feed the module-level
    // TYPE_META/TYPES + inject their colours, then bump to re-render.
    const loadTypes = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/appointment-types', { suppressErrorToast: true });
            const list = res.data?.data || [];
            setApptTypes(list);
            applyAppointmentTypes(list);
            setTypesVersion((v) => v + 1);
        } catch { /* keep built-in fallback */ }
    }, []);
    useEffect(() => { loadTypes(); }, [loadTypes]);

    // Q3.13 — the external-calendar OAuth callback returns to ?calendar=connected|error.
    useEffect(() => {
        const c = search?.get('calendar');
        if (c === 'connected') { toast.success('Calendar connected'); setShowCalendars(true); }
        else if (c === 'error') { toast.error('Could not connect that calendar'); }
    }, [search]);

    // Q3.14 — print-friendly crew sheet for the current range (day/week/month).
    // Server resolves client + assignee names; we group by day and print.
    const [printing, setPrinting] = useState(false);
    const printSchedule = async () => {
        setPrinting(true);
        try {
            const params = { start: range.start.toISOString(), end: range.end.toISOString() };
            if (personFilter) params.assigned_to = personFilter;
            const res = await axiosInstance.get('/appointments/print', { params });
            const { company_id, company_name, rows } = res.data?.data || { company_name: 'Schedule', rows: [] };
            const origin = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
            const logoUrl = company_id ? `${origin}/portal-public/company/${company_id}/logo` : null;
            openPrintSheet({ companyName: company_name, rangeLabel, rows, logoUrl });
        } catch {
            toast.error('Could not build the print sheet.');
        } finally { setPrinting(false); }
    };

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
            if (outcome === 'completed') {
                toast.success('Marked completed');
            } else {
                // §3.18 — no-show follow-up: one-tap rebook (create prefilled with the same client).
                toast('Marked no-show', {
                    description: 'Rebook this client?',
                    action: {
                        label: 'Rebook',
                        onClick: () => setModal({ mode: 'create', prefill: { lead_id: appt.lead_id || '', claim_id: appt.claim_id || '', address: appt.address || '', type: appt.type } }),
                    },
                });
            }
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

    // §3.18 — flag back-to-back appts whose est. drive time exceeds the gap.
    const travelWarnings = useMemo(() => {
        const byPerson = {};
        for (const a of appts) {
            if (!a.assigned_to || a.lat == null || a.lng == null) continue;
            (byPerson[a.assigned_to] ||= []).push(a);
        }
        const out = [];
        for (const list of Object.values(byPerson)) {
            list.sort((x, y) => x._s - y._s);
            for (let i = 1; i < list.length; i++) {
                const prev = list[i - 1], cur = list[i];
                if (!sameDay(prev._s, cur._s)) continue;
                const gapMin = Math.round((cur._s - prev._e) / 60000);
                if (gapMin < 0) continue;
                const drive = estDriveMin(prev, cur);
                if (drive != null && drive > gapMin) out.push({ id: cur.id, drive, gapMin, prev, cur });
            }
        }
        return out;
    }, [appts]);
    const travelWarnText = travelWarnings.map((w) =>
        `${w.cur._s.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${w.cur._s.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}: ~${w.drive} min drive but only ${w.gapMin} min gap`,
    ).join('\n');

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
                    <button className="btn-secondary" onClick={() => setShowCalendars(true)} title="Connect Google / Outlook calendar"><span style={{ verticalAlign: '-1px', marginRight: 4 }}>🔗</span> Calendars</button>
                    {has('manage_appointment_types') && (
                        <button className="btn-secondary" onClick={() => setShowTypes(true)} title="Create & edit appointment types"><span style={{ verticalAlign: '-1px', marginRight: 4 }}>🎨</span> Types</button>
                    )}
                    <button className="btn-secondary" onClick={() => setShowLinks((s) => !s)} title="Booking links"><Link2 size={15} style={{ verticalAlign: '-3px' }} /> Booking Links</button>
                    <button className="btn-secondary" onClick={load} disabled={loading} title="Refresh">{loading ? <span className="ck-spinner sm ck-btn-spin" /> : <RefreshCw size={15} style={{ verticalAlign: '-3px' }} />} Refresh</button>
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
                        {/* Q3.14 — print a clean crew sheet of the current range */}
                        <button className="cal-nav-btn" onClick={printSchedule} disabled={printing} title="Print this range as a crew sheet"><Printer size={14} style={{ verticalAlign: '-2px' }} /> {printing ? <><span className="ck-spinner sm ck-btn-spin" />Preparing…</> : 'Print'}</button>
                        {/* Q3.15 — all upcoming jobs on one map */}
                        <button className="cal-nav-btn" onClick={() => setShowJobsMap(true)} title="All upcoming jobs on a map"><MapPin size={14} style={{ verticalAlign: '-2px' }} /> Jobs Map</button>
                        {/* §3.18 — tomorrow's unconfirmed appointments + one-tap confirm texts */}
                        <button className="cal-nav-btn" onClick={() => setShowConfirm(true)} title="Tomorrow's unconfirmed appointments">🔔 Confirm</button>
                        {/* §3.18 — travel-time warning: tight back-to-back gaps */}
                        {travelWarnings.length > 0 && (
                            <button className="cal-nav-btn" style={{ color: '#b45309', borderColor: '#fde68a', background: '#fffbeb' }}
                                title={`Tight drive-time gaps (est.):\n${travelWarnText}`}
                                onClick={() => toast.warning(`${travelWarnings.length} tight gap(s) — hover for details`, { description: travelWarnText })}>
                                ⚠ {travelWarnings.length} tight gap{travelWarnings.length > 1 ? 's' : ''}
                            </button>
                        )}
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

                {showCalendars && <CalendarSyncPanel onClose={() => setShowCalendars(false)} />}
                {showTypes && <TypeCenterModal types={apptTypes} onClose={() => setShowTypes(false)} onChanged={loadTypes} />}
                {showConfirm && <UnconfirmedModal onClose={() => setShowConfirm(false)} />}
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
            {showJobsMap && (
                <JobsMapModal
                    onClose={() => setShowJobsMap(false)}
                    onOpenJobs={() => { window.location.href = '/dashboard/jobs-ready'; }}
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
// §3.18 — tomorrow's unconfirmed appointments with one-tap confirmation texts.
function UnconfirmedModal({ onClose }) {
    const [data, setData] = useState(null);
    const [sending, setSending] = useState(null);
    const [done, setDone] = useState({});
    useEffect(() => {
        let alive = true;
        axiosInstance.get('/appointments/unconfirmed', { suppressErrorToast: true })
            .then((r) => { if (alive) setData(r.data?.data || { appointments: [] }); })
            .catch(() => { if (alive) setData({ appointments: [] }); });
        return () => { alive = false; };
    }, []);
    const confirm = async (a) => {
        setSending(a.id);
        try {
            const r = await axiosInstance.post(`/appointments/${a.id}/request-confirm`);
            const n = r.data?.data?.notified;
            if (n && (n.email || n.sms)) { toast.success('Confirmation sent'); setDone((d) => ({ ...d, [a.id]: true })); }
            else toast.warning('No reachable contact for this client');
        } catch (e) { toast.error(e?.response?.data?.message || 'Could not send'); }
        finally { setSending(null); }
    };
    const list = data?.appointments || [];
    return (
        <div className="modal-backdrop active" onClick={onClose}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, width: '94vw' }}>
                <div className="modal-header"><div className="modal-title">Unconfirmed — {data?.date || 'tomorrow'}</div><button className="modal-close" onClick={onClose}>×</button></div>
                <div className="modal-body" style={{ padding: '0.5rem 0', maxHeight: '60vh', overflow: 'auto' }}>
                    {data === null ? <div className="ck-load-block"><span className="ck-spinner" /><span>Loading…</span></div>
                        : !list.length ? <div style={{ padding: '1.5rem', textAlign: 'center', color: '#6b7280' }}>🎉 All appointments for this day are confirmed.</div>
                            : list.map((a) => (
                                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.6rem 0.9rem', borderBottom: '1px solid #f1f5f9' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, color: '#1a1f3a', fontSize: '0.88rem' }}>{a.client_name}</div>
                                        <div style={{ fontSize: '0.76rem', color: '#6b7280' }}>{new Date(a.starts_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {a.type}{a.address ? ` · ${a.address}` : ''}</div>
                                    </div>
                                    {done[a.id]
                                        ? <span style={{ color: '#16a34a', fontSize: '0.8rem', fontWeight: 700 }}>✓ Sent</span>
                                        : <button className="cal-nav-btn" disabled={!a.confirmable || sending === a.id} onClick={() => confirm(a)} title={a.confirmable ? 'Text/email the client to confirm' : 'No linked client contact'}>{sending === a.id ? <><span className="ck-spinner sm ck-btn-spin" />Sending…</> : 'Send text'}</button>}
                                </div>
                            ))}
                </div>
            </div>
        </div>
    );
}

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
                    {loading ? <div className="today-empty ck-load-block"><span className="ck-spinner" /><span>Loading map…</span></div> : points.length === 0 ? (
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
// Q3.15 — all upcoming jobs on one map. Pin COLOUR = assignee/team, pin SHAPE =
// weekday (Mon = star, etc.), so a glance shows whose job + which day.
// ==========================================================================
const JOBS_MAP_PALETTE = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#65a30d', '#c026d3', '#475569'];
const DOW_SHAPE = [
    { name: 'Sun', svg: (c) => `<circle cx="12" cy="12" r="9.5" fill="${c}" stroke="#fff" stroke-width="1.5"/>` },
    { name: 'Mon', svg: (c) => `<polygon points="12,2 14.6,9 22,9 16,13.5 18.2,21 12,16.5 5.8,21 8,13.5 2,9 9.4,9" fill="${c}" stroke="#fff" stroke-width="1.2"/>` },
    { name: 'Tue', svg: (c) => `<rect x="3" y="3" width="18" height="18" rx="3.5" fill="${c}" stroke="#fff" stroke-width="1.5"/>` },
    { name: 'Wed', svg: (c) => `<polygon points="12,2.5 21.5,20 2.5,20" fill="${c}" stroke="#fff" stroke-width="1.5"/>` },
    { name: 'Thu', svg: (c) => `<polygon points="12,2 21.5,12 12,22 2.5,12" fill="${c}" stroke="#fff" stroke-width="1.5"/>` },
    { name: 'Fri', svg: (c) => `<polygon points="12,2 22,9.3 18.2,21 5.8,21 2,9.3" fill="${c}" stroke="#fff" stroke-width="1.5"/>` },
    { name: 'Sat', svg: (c) => `<polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill="${c}" stroke="#fff" stroke-width="1.5"/>` },
];
const jobMarkerSvg = (color, dow) => `<svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">${DOW_SHAPE[dow].svg(color)}</svg>`;

function JobsMapModal({ onClose, onOpenJobs }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const mapRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await axiosInstance.get('/appointments/jobs-map', { suppressErrorToast: true });
                if (!cancelled) setData(res.data?.data || { points: [], unlocated: 0 });
            } catch { if (!cancelled) setData({ points: [], unlocated: 0 }); }
            finally { if (!cancelled) setLoading(false); }
        })();
        return () => { cancelled = true; };
    }, []);

    const points = data?.points || [];

    // Stable colour per assignee + which assignees/weekdays are present (legend).
    const assignees = useMemo(() => {
        const map = new Map();
        points.forEach((p) => { if (!map.has(p.assignee_id)) map.set(p.assignee_id, { name: p.assignee_name, color: JOBS_MAP_PALETTE[map.size % JOBS_MAP_PALETTE.length] }); });
        return map;
    }, [points]);
    const daysPresent = useMemo(() => {
        const s = new Set(points.map((p) => new Date(`${p.date}T00:00:00`).getDay()));
        return [...s].sort();
    }, [points]);

    useEffect(() => {
        if (!points.length) return;
        let cancelled = false;
        (async () => {
            const L = (await import('leaflet')).default || (await import('leaflet'));
            if (cancelled) return;
            const el = document.getElementById('jobsMap');
            if (!el || el._leaflet_id) return;
            const map = L.map('jobsMap', { scrollWheelZoom: true });
            mapRef.current = map;
            map.setView([points[0].lat, points[0].lng], 10);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(map);
            const group = [];
            points.forEach((p) => {
                const dow = new Date(`${p.date}T00:00:00`).getDay();
                const color = assignees.get(p.assignee_id)?.color || '#475569';
                const icon = L.divIcon({ className: 'ck-jobs-pin', html: jobMarkerSvg(color, dow), iconSize: [24, 24], iconAnchor: [12, 12] });
                const dLabel = new Date(`${p.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                const nav = navHref(p.address, p.lat, p.lng);
                const html = `<div style="min-width:160px"><strong>Job #${escapeHtmlJs(p.job_number || '')}</strong><br>` +
                    `<span style="color:#6b7280">${dLabel} · ${escapeHtmlJs(p.assignee_name)}</span>` +
                    (p.address ? `<br><span style="color:#6b7280">${escapeHtmlJs(p.address)}</span>` : '') +
                    (nav ? `<br><a href="${nav}" target="_blank" rel="noreferrer" style="color:#2563eb;font-weight:600">Navigate ↗</a>` : '') + `</div>`;
                group.push(L.marker([p.lat, p.lng], { icon }).addTo(map).bindPopup(html));
            });
            setTimeout(() => {
                if (cancelled || !mapRef.current) return;
                mapRef.current.invalidateSize();
                try { mapRef.current.fitBounds(L.featureGroup(group).getBounds(), { padding: [30, 30], maxZoom: 13 }); } catch { /* single */ }
            }, 150);
        })();
        return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
    }, [points, assignees]);

    return (
        <div className="modal-backdrop active" onClick={onClose}>
            <div className="modal-box day-map-box" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title"><MapPin size={16} style={{ verticalAlign: '-3px' }} /> All Jobs Map</div>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    {loading ? <div className="today-empty ck-load-block"><span className="ck-spinner" /><span>Loading map…</span></div> : points.length === 0 ? (
                        <div className="today-empty">No upcoming scheduled jobs to map{data?.unlocated ? ` (${data.unlocated} couldn’t be located)` : ''}.</div>
                    ) : (
                        <>
                            <div id="jobsMap" className="day-map" />
                            <div className="jobs-map-legend">
                                <div className="jml-group">
                                    <span className="jml-title">Day</span>
                                    {daysPresent.map((d) => (
                                        <span className="jml-item" key={d}>
                                            <span className="jml-shape" dangerouslySetInnerHTML={{ __html: jobMarkerSvg('#475569', d) }} /> {DOW_SHAPE[d].name}
                                        </span>
                                    ))}
                                </div>
                                <div className="jml-group">
                                    <span className="jml-title">Assignee</span>
                                    {[...assignees.values()].map((a, i) => (
                                        <span className="jml-item" key={i}><span className="jml-swatch" style={{ background: a.color }} /> {a.name}</span>
                                    ))}
                                </div>
                            </div>
                            {data?.unlocated > 0 && <div className="day-map-note">{data.unlocated} job{data.unlocated > 1 ? 's' : ''} had an address we couldn’t map.</div>}
                        </>
                    )}
                </div>
                <div className="modal-footer between">
                    <button className="btn-secondary" onClick={onClose}>Close</button>
                    <button className="btn-secondary" onClick={onOpenJobs}>Open Jobs Ready →</button>
                </div>
            </div>
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
                    <button className="btn-primary sm" disabled={creating} onClick={createPerson}>{creating ? <><span className="ck-spinner sm ck-btn-spin" />Adding…</> : 'Add & select'}</button>
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
    const [type, setType] = useState(TYPES[0] || 'estimate');
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
    const [repeat, setRepeat] = useState('none');        // Q3.16 none|daily|weekly|biweekly|monthly|custom
    const [repeatCount, setRepeatCount] = useState(4);   // total occurrences
    const [repeatInterval, setRepeatInterval] = useState(3); // custom: every N units
    const [repeatUnit, setRepeatUnit] = useState('week');    // custom: day|week|month
    const [redeemable, setRedeemable] = useState([]);    // Q3.17 client's usable packages
    const [redeemId, setRedeemId] = useState('');        // chosen client_package to redeem
    const [slots, setSlots] = useState(null);
    const [busy, setBusy] = useState(false);

    const leadId = person?.kind === 'lead' ? person.id : '';
    const claimId = person?.kind === 'claim' ? person.id : '';

    // Q3.17 — a claim client may have a package to redeem for this booking.
    useEffect(() => {
        if (!claimId) { setRedeemable([]); setRedeemId(''); return; }
        let cancelled = false;
        (async () => {
            try {
                const r = await axiosInstance.get(`/packages/client/${claimId}/redeemable`, { params: { type }, suppressErrorToast: true });
                if (!cancelled) setRedeemable(r.data?.data || []);
            } catch { if (!cancelled) setRedeemable([]); }
        })();
        return () => { cancelled = true; };
    }, [claimId, type]);

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
            if (repeat !== 'none') {
                body.recurrence = { freq: repeat, count: Math.max(2, Math.min(60, Number(repeatCount) || 2)) };
                if (repeat === 'custom') {
                    body.recurrence.interval = Math.max(1, Math.min(52, Number(repeatInterval) || 1));
                    body.recurrence.unit = repeatUnit;
                }
            }
            const res = await axiosInstance.post('/appointments', body);
            const made = res.data?.series?.created;
            toast.success(made && made > 1 ? `${made} appointments created (repeating)` : 'Appointment created');
            // Q3.17 — redeem the chosen package against the new appointment.
            if (redeemId && res.data?.data?.id) {
                try {
                    const rr = await axiosInstance.post(`/packages/redeem/${redeemId}`, { appointment_id: res.data.data.id });
                    const left = rr.data?.data?.remaining_uses;
                    toast.success(left != null ? `Package redeemed — ${left} left` : 'Package redeemed');
                } catch { toast.error('Booked, but the package could not be redeemed'); }
            }
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
                            <button key={t} className={`type-pick ${TYPE_META[t].cls} ${type === t ? 'active' : ''}`}
                                onClick={() => {
                                    setType(t);
                                    // Q3.6 — apply the type's default duration + reminder default.
                                    const meta = TYPE_META[t];
                                    if (meta?.duration) setDuration(meta.duration);
                                    if (meta && typeof meta.reminder === 'boolean') setReminder(meta.reminder);
                                }}>
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
                                {/* Include a custom type's default duration even if it's not a preset. */}
                                {[...new Set([...DURATIONS, duration])].sort((a, b) => a - b).map((d) => <option key={d} value={d}>{d} min</option>)}
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

                    {/* Q3.16 — repeat rule */}
                    <label>Repeat</label>
                    <div className="grid2">
                        <select value={repeat} onChange={(e) => setRepeat(e.target.value)}>
                            <option value="none">Does not repeat</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="biweekly">Every 2 weeks</option>
                            <option value="monthly">Monthly</option>
                            <option value="custom">Custom…</option>
                        </select>
                        {repeat !== 'none' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <input type="number" min="2" max="60" value={repeatCount} onChange={(e) => setRepeatCount(e.target.value)} style={{ width: 70 }} />
                                <span className="muted">occurrences</span>
                            </div>
                        )}
                    </div>
                    {repeat === 'custom' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                            <span className="muted">Every</span>
                            <input type="number" min="1" max="52" value={repeatInterval} onChange={(e) => setRepeatInterval(e.target.value)} style={{ width: 60 }} />
                            <select value={repeatUnit} onChange={(e) => setRepeatUnit(e.target.value)}>
                                <option value="day">day(s)</option>
                                <option value="week">week(s)</option>
                                <option value="month">month(s)</option>
                            </select>
                        </div>
                    )}

                    {/* Q3.17 — redeem a client's package for this appointment */}
                    {redeemable.length > 0 && (
                        <>
                            <label>Redeem package</label>
                            <select value={redeemId} onChange={(e) => setRedeemId(e.target.value)}>
                                <option value="">Don’t redeem</option>
                                {redeemable.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}{p.remaining_uses != null ? ` — ${p.remaining_uses} left` : ''}</option>
                                ))}
                            </select>
                        </>
                    )}

                    <label className="check-row">
                        <input type="checkbox" checked={reminder} onChange={(e) => setReminder(e.target.checked)} />
                        Send reminder texts (T-24h / T-2h · respects Do-Not-Contact, held until A2P is live)
                    </label>
                </div>
                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn-primary" disabled={busy} onClick={save}>{busy ? <><span className="ck-spinner sm ck-btn-spin" />Creating…</> : 'Create'}</button>
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

// ==========================================================================
// Q3.13 — connect Google / Outlook calendars. Two-way: outside events block
// booking here; ClaimKing appointments push to the connected calendar.
// ==========================================================================
const CAL_PROVIDERS = [
    { key: 'google', label: 'Google Calendar', color: '#ea4335' },
    { key: 'outlook', label: 'Outlook Calendar', color: '#0078d4' },
];
function CalendarSyncPanel({ onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try { const r = await axiosInstance.get('/calendar/connections'); setData(r.data?.data || null); }
        catch { setData(null); } finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const connOf = (p) => (data?.connections || []).find((c) => c.provider === p);
    const configured = (p) => (p === 'google' ? data?.google_configured : data?.outlook_configured);

    const connect = async (p) => {
        setBusy(p);
        try { const r = await axiosInstance.get(`/calendar/connect/${p}`); if (r.data?.url) window.location.href = r.data.url; }
        catch (e) { toast.error(e?.response?.data?.message || 'Could not start connect'); setBusy(''); }
    };
    const disconnect = async (p) => {
        setBusy(p);
        try { await axiosInstance.post(`/calendar/disconnect/${p}`); toast.success('Disconnected'); load(); }
        catch { /* */ } finally { setBusy(''); }
    };
    const togglePush = async (p, enabled) => {
        try { await axiosInstance.patch(`/calendar/push/${p}`, { enabled }); load(); }
        catch { /* */ }
    };

    return (
        <div className="modal-backdrop active" onClick={onClose}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
                <div className="modal-header">
                    <div className="modal-title">🔗 Calendar Sync</div>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <p className="muted" style={{ marginTop: 0 }}>Connect your calendar so your outside events block booking here, and ClaimKing appointments show up on your calendar.</p>
                    {loading ? <div className="today-empty ck-load-block"><span className="ck-spinner" /><span>Loading…</span></div> : CAL_PROVIDERS.map((pr) => {
                        const c = connOf(pr.key);
                        const conf = configured(pr.key);
                        return (
                            <div className="cal-conn" key={pr.key}>
                                <div className="cal-conn-top">
                                    <span className="cal-dot" style={{ background: pr.color }} />
                                    <span className="cal-name">{pr.label}</span>
                                    {c && c.connection_status === 'connected' && <span className="cal-badge ok">Connected</span>}
                                    {c && c.connection_status === 'error' && <span className="cal-badge err">Reconnect</span>}
                                </div>
                                {c ? (
                                    <>
                                        <div className="cal-email">{c.email || '—'}</div>
                                        <label className="check-row" style={{ margin: '6px 0' }}>
                                            <input type="checkbox" checked={c.push_enabled !== false} onChange={(e) => togglePush(pr.key, e.target.checked)} />
                                            Push my ClaimKing appointments to this calendar
                                        </label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="btn btn-sm btn-ghost" disabled={busy === pr.key} onClick={() => connect(pr.key)}>Reconnect</button>
                                            <button className="btn btn-sm btn-ghost" style={{ color: '#b91c1c' }} disabled={busy === pr.key} onClick={() => disconnect(pr.key)}>Disconnect</button>
                                        </div>
                                    </>
                                ) : conf ? (
                                    <button className="btn btn-sm btn-primary" disabled={busy === pr.key} onClick={() => connect(pr.key)}>{busy === pr.key ? <><span className="ck-spinner sm ck-btn-spin" />Opening…</> : `Connect ${pr.label}`}</button>
                                ) : (
                                    <div className="muted" style={{ fontSize: 12 }}>Not configured yet — your admin needs to set up the {pr.label} app credentials.</div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="modal-footer"><button className="btn-secondary" onClick={onClose}>Close</button></div>
                <style jsx>{`
                    .cal-conn { border: 1px solid #eef0f4; border-radius: 12px; padding: .8rem .9rem; margin-bottom: .7rem; }
                    .cal-conn-top { display: flex; align-items: center; gap: .5rem; }
                    .cal-dot { width: 10px; height: 10px; border-radius: 50%; }
                    .cal-name { font-weight: 700; color: #1a1f3a; font-size: .92rem; }
                    .cal-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; margin-left: auto; }
                    .cal-badge.ok { background: #dcfce7; color: #065f46; }
                    .cal-badge.err { background: #fee2e2; color: #991b1b; }
                    .cal-email { font-size: .8rem; color: #6b7280; margin-top: 2px; }
                `}</style>
            </div>
        </div>
    );
}

// ==========================================================================
// Q3.6 — Appointment Type creation center. Admin creates/edits types: name,
// color, default duration, default reminders, applicable fields. The colour
// drives calendar colour coding (applyAppointmentTypes injects it).
// ==========================================================================
const APPLICABLE = [['address', 'Address'], ['reminders', 'Reminders']];
function TypeCenterModal({ types, onClose, onChanged }) {
    const [rows, setRows] = useState(() => (types || []).map((t) => ({ ...t })));
    const [busyId, setBusyId] = useState(null);
    const [adding, setAdding] = useState(false);
    const blankNew = { label: '', color: '#3b82f6', default_duration_minutes: 60, default_reminders: { sms_24h: true, sms_2h: true }, applicable_fields: ['address', 'reminders'] };
    const [draft, setDraft] = useState(blankNew);

    useEffect(() => { setRows((types || []).map((t) => ({ ...t }))); }, [types]);

    const patchRow = (id, k, v) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [k]: v } : r)));
    const toggleReminder = (r, key) => {
        const dr = { ...(r.default_reminders || {}), [key]: !(r.default_reminders?.[key]) };
        patchRow(r.id, 'default_reminders', dr);
    };
    const toggleField = (r, f) => {
        const has = (r.applicable_fields || []).includes(f);
        const next = has ? r.applicable_fields.filter((x) => x !== f) : [...(r.applicable_fields || []), f];
        patchRow(r.id, 'applicable_fields', next);
    };

    const saveRow = async (r) => {
        setBusyId(r.id);
        try {
            await axiosInstance.patch(`/appointment-types/${r.id}`, {
                label: r.label, color: r.color, default_duration_minutes: Number(r.default_duration_minutes),
                default_reminders: r.default_reminders, applicable_fields: r.applicable_fields,
            });
            toast.success('Saved');
            onChanged?.();
        } catch (e) { toast.error(e?.response?.data?.message || 'Save failed'); }
        finally { setBusyId(null); }
    };
    const removeRow = async (r) => {
        if (!window.confirm(r.is_builtin ? `Hide "${r.label}" from new bookings?` : `Delete "${r.label}"?`)) return;
        setBusyId(r.id);
        try { await axiosInstance.delete(`/appointment-types/${r.id}`); toast.success(r.is_builtin ? 'Hidden' : 'Deleted'); onChanged?.(); }
        catch (e) { toast.error(e?.response?.data?.message || 'Failed'); }
        finally { setBusyId(null); }
    };
    const reactivate = async (r) => {
        setBusyId(r.id);
        try { await axiosInstance.patch(`/appointment-types/${r.id}`, { is_active: true }); onChanged?.(); }
        catch { /* */ } finally { setBusyId(null); }
    };
    const createType = async () => {
        if (!draft.label.trim()) { toast.error('Name the type first.'); return; }
        setAdding('busy');
        try {
            await axiosInstance.post('/appointment-types', {
                label: draft.label.trim(), color: draft.color,
                default_duration_minutes: Number(draft.default_duration_minutes),
                default_reminders: draft.default_reminders, applicable_fields: draft.applicable_fields,
            });
            toast.success('Type created');
            setDraft(blankNew); setAdding(false); onChanged?.();
        } catch (e) { toast.error(e?.response?.data?.message || 'Create failed'); setAdding(true); }
    };

    return (
        <div className="tc-overlay" onClick={onClose}>
            <div className="tc-modal" onClick={(e) => e.stopPropagation()}>
                <div className="tc-head">
                    <div>
                        <div className="tc-title">Appointment Types</div>
                        <div className="tc-sub">Name, colour, default duration & reminders. The colour codes the calendar.</div>
                    </div>
                    <button className="tc-x" onClick={onClose}>&times;</button>
                </div>

                <div className="tc-list">
                    {rows.map((r) => (
                        <div key={r.id} className="tc-row" style={{ opacity: r.is_active === false ? 0.55 : 1 }}>
                            <input type="color" className="tc-color" value={r.color || '#3b82f6'} onChange={(e) => patchRow(r.id, 'color', e.target.value)} title="Colour" />
                            <div className="tc-main">
                                <div className="tc-row-top">
                                    <input className="tc-label" value={r.label} onChange={(e) => patchRow(r.id, 'label', e.target.value)} />
                                    {r.is_builtin && <span className="tc-tag">built-in</span>}
                                    {r.is_active === false && <span className="tc-tag tc-tag-off">hidden</span>}
                                </div>
                                <div className="tc-row-controls">
                                    <label className="tc-mini">Duration
                                        <input type="number" min="5" max="1440" step="5" value={r.default_duration_minutes} onChange={(e) => patchRow(r.id, 'default_duration_minutes', e.target.value)} /> min
                                    </label>
                                    <label className="tc-chk"><input type="checkbox" checked={!!r.default_reminders?.sms_24h} onChange={() => toggleReminder(r, 'sms_24h')} /> 24h</label>
                                    <label className="tc-chk"><input type="checkbox" checked={!!r.default_reminders?.sms_2h} onChange={() => toggleReminder(r, 'sms_2h')} /> 2h</label>
                                    {APPLICABLE.map(([f, lbl]) => (
                                        <label key={f} className="tc-chk"><input type="checkbox" checked={(r.applicable_fields || []).includes(f)} onChange={() => toggleField(r, f)} /> {lbl}</label>
                                    ))}
                                </div>
                            </div>
                            <div className="tc-actions">
                                <button className="tc-save" disabled={busyId === r.id} onClick={() => saveRow(r)}>Save</button>
                                {r.is_active === false
                                    ? <button className="tc-del" disabled={busyId === r.id} onClick={() => reactivate(r)}>Restore</button>
                                    : <button className="tc-del" disabled={busyId === r.id} onClick={() => removeRow(r)}>{r.is_builtin ? 'Hide' : 'Delete'}</button>}
                            </div>
                        </div>
                    ))}
                </div>

                {adding ? (
                    <div className="tc-row tc-new">
                        <input type="color" className="tc-color" value={draft.color} onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))} />
                        <div className="tc-main">
                            <input className="tc-label" placeholder="New type name (e.g. Roof Tune-up)" value={draft.label} onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} />
                            <div className="tc-row-controls">
                                <label className="tc-mini">Duration
                                    <input type="number" min="5" max="1440" step="5" value={draft.default_duration_minutes} onChange={(e) => setDraft((d) => ({ ...d, default_duration_minutes: e.target.value }))} /> min
                                </label>
                                <label className="tc-chk"><input type="checkbox" checked={draft.default_reminders.sms_24h} onChange={() => setDraft((d) => ({ ...d, default_reminders: { ...d.default_reminders, sms_24h: !d.default_reminders.sms_24h } }))} /> 24h</label>
                                <label className="tc-chk"><input type="checkbox" checked={draft.default_reminders.sms_2h} onChange={() => setDraft((d) => ({ ...d, default_reminders: { ...d.default_reminders, sms_2h: !d.default_reminders.sms_2h } }))} /> 2h</label>
                            </div>
                        </div>
                        <div className="tc-actions">
                            <button className="tc-save" disabled={adding === 'busy'} onClick={createType}>{adding === 'busy' ? <><span className="ck-spinner sm ck-btn-spin" />Adding…</> : 'Add'}</button>
                            <button className="tc-del" onClick={() => { setAdding(false); setDraft(blankNew); }}>Cancel</button>
                        </div>
                    </div>
                ) : (
                    <button className="tc-add" onClick={() => setAdding(true)}>+ Add appointment type</button>
                )}

                <style jsx>{`
                    .tc-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
                    .tc-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 640px; max-height: 90vh; overflow: auto; padding: 1.25rem 1.4rem; }
                    .tc-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
                    .tc-title { font-size: 1.2rem; font-weight: 800; color: #1a1f3a; }
                    .tc-sub { font-size: .82rem; color: #6b7280; margin-top: 2px; }
                    .tc-x { background: none; border: none; font-size: 24px; color: #9ca3af; cursor: pointer; line-height: 1; }
                    .tc-list { display: flex; flex-direction: column; gap: .6rem; }
                    .tc-row { display: flex; gap: .7rem; align-items: flex-start; border: 1px solid #eef0f4; border-radius: 12px; padding: .7rem .8rem; }
                    .tc-new { border-style: dashed; border-color: #cbd5e1; }
                    .tc-color { width: 34px; height: 34px; border: none; background: none; padding: 0; cursor: pointer; flex: 0 0 auto; }
                    .tc-main { flex: 1; min-width: 0; }
                    .tc-row-top { display: flex; align-items: center; gap: .5rem; }
                    .tc-label { font-weight: 700; color: #1a1f3a; border: 1px solid #e5e7eb; border-radius: 6px; padding: .3rem .5rem; font-size: .9rem; flex: 1; min-width: 0; }
                    .tc-tag { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; background: #f3f4f6; border-radius: 999px; padding: 2px 7px; }
                    .tc-tag-off { color: #92400e; background: #fef3c7; }
                    .tc-row-controls { display: flex; gap: .8rem; flex-wrap: wrap; align-items: center; margin-top: .5rem; }
                    .tc-mini { font-size: .78rem; color: #6b7280; display: inline-flex; align-items: center; gap: .3rem; }
                    .tc-mini input { width: 60px; border: 1px solid #e5e7eb; border-radius: 6px; padding: .2rem .4rem; font-size: .8rem; }
                    .tc-chk { font-size: .78rem; color: #6b7280; display: inline-flex; align-items: center; gap: .25rem; }
                    .tc-actions { display: flex; flex-direction: column; gap: .35rem; flex: 0 0 auto; }
                    .tc-save { background: #1a1f3a; color: #fff; border: none; border-radius: 7px; padding: .35rem .8rem; font-size: 12px; font-weight: 700; cursor: pointer; }
                    .tc-del { background: #fff; color: #b91c1c; border: 1px solid #fecaca; border-radius: 7px; padding: .35rem .8rem; font-size: 12px; font-weight: 700; cursor: pointer; }
                    .tc-save:disabled, .tc-del:disabled { opacity: .5; }
                    .tc-add { margin-top: .8rem; width: 100%; padding: .6rem; border: 1px dashed #cbd5e1; border-radius: 10px; background: #fafbfc; color: #1a1f3a; font-weight: 700; font-size: .85rem; cursor: pointer; }
                `}</style>
            </div>
        </div>
    );
}

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
                            <button className="btn-primary sm" disabled={saving} onClick={saveWeekly}>{saving ? <><span className="ck-spinner sm ck-btn-spin" />Saving…</> : 'Save working hours'}</button>
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
            {rows === null && <div className="bl-empty ck-load-block"><span className="ck-spinner" /><span>Loading…</span></div>}
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
                <button className="btn-primary sm" disabled={sending} onClick={send}>{sending ? <><span className="ck-spinner sm ck-btn-spin" />Sending…</> : 'Notify client'}</button>
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
            <button className="btn-primary sm" disabled={sending || !body.trim()} onClick={send}>{sending ? <><span className="ck-spinner sm ck-btn-spin" />Sending…</> : 'Send text'}</button>
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
    if (!blob) return <div className="appt-photo-thumb appt-photo-loading"><span className="ck-spinner sm" /></div>;
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="appt-photo-thumb" src={blob} alt={alt || 'Photo'} />;
}

function ApptPhotos({ appointmentId, claimId }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const inputRef = useRef(null);
    const apiOrigin = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axiosInstance.get('/job-images', { params: { appointment_id: appointmentId }, suppressErrorToast: true });
            setRows(Array.isArray(data?.data) ? data.data : []);
        } catch { setRows([]); }
        finally { setLoading(false); }
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

    // Q3.10 — remove a wrongly-uploaded photo. Backend DELETE /job-images/:id also
    // pulls it from Company Images + the client portal if it was posted.
    const removePhoto = async (r) => {
        if (deletingId) return;
        const res = await Swal.fire({
            icon: 'warning',
            title: 'Delete this photo?',
            html: r.posted_to_portal
                ? 'It’s posted to the client portal — it will be removed <b>there and from Company Images</b>. This can’t be undone.'
                : 'It will be permanently removed from Company Images. This can’t be undone.',
            showCancelButton: true,
            confirmButtonText: 'Delete photo',
            cancelButtonText: 'Keep it',
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            reverseButtons: true,
            focusCancel: true,
            // The appointment detail modal sits at z-index 10000; lift the
            // SweetAlert container above it so the confirm isn't hidden behind.
            didOpen: () => { const c = Swal.getContainer(); if (c) c.style.zIndex = '20000'; },
        });
        if (!res.isConfirmed) return;
        setDeletingId(r.id);
        // Keep the photo on screen with an overlay spinner while it deletes, then
        // drop it on success (so the user sees it working, not a blank strip).
        try {
            await axiosInstance.delete(`/job-images/${r.id}`);
            setRows((prev) => prev.filter((x) => x.id !== r.id));
            toast.success('Photo deleted');
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Delete failed');
        } finally { setDeletingId(null); }
    };

    return (
        <div className="appt-photos">
            <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
            <button className="btn-secondary sm" disabled={busy} onClick={() => inputRef.current?.click()}>{busy ? <><span className="ck-spinner sm ck-btn-spin" />Uploading…</> : '📷 Add photo'}</button>
            {!claimId && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Link this appointment to a client to post photos to their portal.</div>}
            {loading ? (
                <div className="appt-photos-loading ck-load-inline" style={{ marginTop: 6 }}><span className="ck-spinner sm" />Loading photos…</div>
            ) : rows.length > 0 && (
                <div className="appt-photo-strip">
                    {rows.map((r) => (
                        <div key={r.id} className={`appt-photo-item${deletingId === r.id ? ' deleting' : ''}`} title={r.caption || r.ai_note || ''} style={{ position: 'relative' }}>
                            <ApptAuthedThumb url={r.s3_url ? `${apiOrigin}${r.s3_url}` : null} alt={r.caption} />
                            {r.posted_to_portal && <span className="appt-photo-badge">portal</span>}
                            {deletingId === r.id && (
                                <div className="appt-photo-overlay" aria-label="Deleting photo"><span className="ck-spinner" /></div>
                            )}
                            <button
                                type="button"
                                className="appt-photo-del"
                                disabled={deletingId === r.id}
                                title="Delete photo"
                                aria-label="Delete photo"
                                onClick={() => removePhoto(r)}
                            >×</button>
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
    const [busyKind, setBusyKind] = useState(''); // which footer action is running: 'save' | 'cancel' | 'out:completed' | 'out:no_show'
    const [seriesScope, setSeriesScope] = useState('one'); // Q3.16 one | future
    const isSeries = !!appt.series_id;
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
        try {
            const body = { notes };
            if (isSeries && seriesScope === 'future') body.scope = 'future';
            await axiosInstance.patch(`/appointments/${appt.id}`, body);
            toast.success('Notes saved');
        }
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

    // Q3.7 — real send actions (were route-only)
    const [sending37, setSending37] = useState('');
    const sendInvoice = async () => {
        setSending37('invoice');
        try {
            const res = await axiosInstance.post(`/appointments/${appt.id}/send-invoice`);
            const n = res.data?.data?.notified;
            if (n && (n.email || n.sms)) toast.success('Final invoice sent to the client');
            else toast.warning('Invoice ready, but the client had no reachable email/phone');
        } catch (e) { toast.error(e?.userMessage || e?.response?.data?.message || 'Could not send invoice'); }
        finally { setSending37(''); }
    };
    const requestReview = async () => {
        setSending37('review');
        try {
            const res = await axiosInstance.post(`/appointments/${appt.id}/request-review`);
            const n = res.data?.data?.notified;
            if (n && (n.email || n.sms)) toast.success('Review request sent to the client');
            else toast.warning('Sent, but the client had no reachable email/phone');
        } catch (e) { toast.error(e?.userMessage || e?.response?.data?.message || 'Could not request a review'); }
        finally { setSending37(''); }
    };

    // Wrap the parent outcome save so Done / No-show show their own spinner
    // (the parent's saveOutcome doesn't touch this modal's busy state).
    const doOutcome = async (o) => {
        setBusy(true); setBusyKind(`out:${o}`);
        try { await onOutcome(appt, o); }
        finally { setBusy(false); setBusyKind(''); }
    };
    const applyReschedule = async () => {
        setBusy(true); setBusyKind('save');
        const ns = new Date(`${date}T${time}:00`);
        const ne = new Date(ns.getTime() + duration * 60000);
        const r = await onReschedule(appt, ns, ne, manageAll ? (assignee || null) : undefined);
        setBusy(false); setBusyKind('');
        // 'deferred' → the notify-choice modal took over (a time change on a
        // linked appointment); this detail modal was already closed by the parent.
        if (r === true) onAfter();
    };
    const cancelAppt = async () => {
        setBusy(true); setBusyKind('cancel');
        try {
            const body = { status: 'cancelled' };
            if (isSeries && seriesScope === 'future') body.scope = 'future';
            const res = await axiosInstance.patch(`/appointments/${appt.id}`, body);
            const n = res.data?.series_applied || 0;
            toast.success(n > 0 ? `Cancelled this + ${n} following` : 'Appointment cancelled');
            onAfter();
        } catch (e) { toast.error(e?.userMessage || 'Could not cancel'); }
        finally { setBusy(false); setBusyKind(''); }
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
                    <button className="btn-secondary sm" disabled={savingNotes} onClick={saveNotes}>{savingNotes ? <><span className="ck-spinner sm ck-btn-spin" />Saving…</> : 'Save notes'}</button>

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

                    {/* Q3.7 — real send actions: invoice + review request to the client.
                        Shown ONLY when the appointment is linked to an active job
                        (spec: "When linked to an active job"), not merely a claim. */}
                    {detail?.has_active_job && (
                        <div className="appt-joblinks">
                            <button className="btn-secondary sm" disabled={!!sending37} onClick={sendInvoice} title="Email/text the client their final invoice">{sending37 === 'invoice' ? <><span className="ck-spinner sm ck-btn-spin" />Sending…</> : '📄 Send Final Invoice'}</button>
                            <button className="btn-secondary sm" disabled={!!sending37} onClick={requestReview} title="Email/text the client your review link">{sending37 === 'review' ? <><span className="ck-spinner sm ck-btn-spin" />Sending…</> : '⭐ Request Review'}</button>
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
                            <button className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={busy} onClick={applyReschedule}>{busyKind === 'save' ? <><span className="ck-spinner sm ck-btn-spin" />Saving…</> : 'Save changes'}</button>
                        </>
                    )}

                    {appt.outcome_note && (
                        <div className="sched-note"><b>Outcome:</b> {appt.outcome_note}</div>
                    )}

                    {/* Q3.16 — recurring appointment: apply cancel/reassign to one or the series */}
                    {isSeries && !done && (
                        <div className="series-scope">
                            <span className="sched-sec-title" style={{ marginBottom: 4 }}>🔁 Part of a repeating series</span>
                            <label className="check-row"><input type="radio" name="scope" checked={seriesScope === 'one'} onChange={() => setSeriesScope('one')} /> This appointment only</label>
                            <label className="check-row"><input type="radio" name="scope" checked={seriesScope === 'future'} onChange={() => setSeriesScope('future')} /> This and all following</label>
                            <div className="muted" style={{ fontSize: 11 }}>Applies to Cancel and Notes. A time change only ever moves this one.</div>
                        </div>
                    )}
                </div>
                <div className="modal-footer between">
                    {!done ? (
                        <>
                            <div className="footer-left">
                                <button className="btn-success" disabled={busy} onClick={() => doOutcome('completed')}>{busyKind === 'out:completed' ? <><span className="ck-spinner sm ck-btn-spin" />Saving…</> : <><Check size={14} style={{ verticalAlign: '-2px' }} /> Done</>}</button>
                                <button className="btn-danger" disabled={busy} onClick={() => doOutcome('no_show')}>{busyKind === 'out:no_show' ? <><span className="ck-spinner sm ck-btn-spin" />Saving…</> : <><XCircle size={14} style={{ verticalAlign: '-2px' }} /> No-show</>}</button>
                            </div>
                            <button className="btn-secondary" disabled={busy} onClick={cancelAppt}>{busyKind === 'cancel' ? <><span className="ck-spinner sm ck-btn-spin" />Cancelling…</> : 'Cancel appt'}</button>
                        </>
                    ) : (
                        <button className="btn-secondary" onClick={onClose}>Close</button>
                    )}
                </div>
            </div>
        </div>
    );
}
