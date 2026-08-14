'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast as sonner } from 'sonner';
import 'leaflet/dist/leaflet.css';
import axiosInstance from '@/lib/axiosInstance';
import { usePermissions } from '@/lib/permissions/PermissionsContext';
import { Can } from '@/lib/permissions/Can';
import './jobs-ready.css';

/* =========================================================================
   CONSTANTS  (task 3.9 — real /jobs API; see BUILD-PROGRESS.md)
   ========================================================================= */
const JOB_TYPES = [
    'Full Roof Replacement', 'Roof Repair', 'Gutter Replacement',
    'Gutter Repair', 'Siding', 'Windows', 'Inspection', 'Other',
];

// Trade tags used for sub matching (packet §7.5 — must match sub.trades values).
const TRADES = ['roofing', 'gutters', 'siding', 'windows', 'painting', 'general'];

const PERMIT_OPTIONS = [
    ['not_required', 'Not required'],
    ['pending', 'Pending'],
    ['approved', 'Approved'],
];
const MATERIAL_OPTIONS = [
    ['not_ordered', 'Not ordered'],
    ['ordered', 'Ordered'],
    ['confirmed', 'Confirmed'],
    ['delivered', 'Delivered'],
];

// readiness_state → pill class + label (packet §7.4).
const STATE_META = {
    blocked: ['pill-blocked', 'Blocked'],
    ready: ['pill-available', 'Ready'],
    scheduled: ['pill-claimed', 'Scheduled'],
    in_production: ['pill-progress', 'In Production'],
    punch_list: ['pill-progress', 'Punch List'],
    complete: ['pill-completed', 'Complete'],
};

/* =========================================================================
   HELPERS
   ========================================================================= */
const money = (n) => '$' + (Number(n) || 0).toLocaleString();
const tradeLabel = (t) => (t || '').replace(/_/g, ' ');
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');

function StatePill({ state }) {
    const [cls, label] = STATE_META[state] || ['pill-blocked', state || '—'];
    return <span className={`job-status-pill ${cls}`}>{label}</span>;
}

function assignmentLabel(job, teamById) {
    if (job.assignment_type === 'in_house') {
        return '🧑‍💼 ' + (teamById[job.assigned_employee_id]?.full_name || 'In-house');
    }
    if (job.assignment_type === 'subcontractor') return '👷 Subcontractor';
    return 'Unassigned';
}

/* =========================================================================
   MODAL SHELL
   ========================================================================= */
function Modal({ children, onClose, wide }) {
    return (
        <div className="modal open">
            <div className="modal-overlay" onClick={onClose}></div>
            <div className="modal-content" style={wide ? { maxWidth: 920 } : undefined}>{children}</div>
        </div>
    );
}

/* =========================================================================
   CREATE JOB MODAL  → POST /jobs
   ========================================================================= */
function CreateJobModal({ onClose, onSaved, toast }) {
    const [form, setForm] = useState({
        claim_id: '', address: '', job_type: JOB_TYPES[0], scope: '', notes: '',
        job_cost: '', lat: '', lng: '', permit_status: 'not_required', material_order_status: 'not_ordered',
    });
    const [trades, setTrades] = useState([]);
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const toggleTrade = (t) => setTrades((ts) => ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]);

    const save = async () => {
        if (!form.address.trim() && !form.claim_id.trim()) {
            toast('Enter an address, or link a claim to pull one.', 'error');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                job_type: form.job_type,
                scope: form.scope.trim() || undefined,
                notes: form.notes.trim() || undefined,
                trades,
                permit_status: form.permit_status,
                material_order_status: form.material_order_status,
            };
            if (form.claim_id.trim()) payload.claim_id = form.claim_id.trim();
            if (form.address.trim()) payload.address = form.address.trim();
            if (form.lat !== '' && !isNaN(parseFloat(form.lat))) payload.lat = parseFloat(form.lat);
            if (form.lng !== '' && !isNaN(parseFloat(form.lng))) payload.lng = parseFloat(form.lng);
            if (form.job_cost !== '' && !isNaN(parseInt(form.job_cost, 10))) payload.job_cost = parseInt(form.job_cost, 10);

            const res = await axiosInstance.post('/jobs', payload);
            toast('Job created.', 'success');
            onSaved(res.data?.data);
        } catch (e) {
            // interceptor toasts; keep the modal open
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal onClose={onClose}>
            <div className="modal-head">
                <div><h2>Add Job</h2><div className="sub">Link a claim (claim→job) or create a standalone retail/cash job.</div></div>
                <button className="modal-close" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
                <div className="form-section">
                    <h3>Job Details</h3>
                    <div className="form-grid">
                        <div className="field full">
                            <label>Linked Claim ID <span className="hint" style={{ fontWeight: 400 }}>(optional — leave blank for a standalone job)</span></label>
                            <input type="text" value={form.claim_id} onChange={(e) => set('claim_id', e.target.value)} placeholder="client_portals UUID (optional)" />
                        </div>
                        <div className="field full">
                            <label>Property Address</label>
                            <input type="text" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Street, City, State ZIP" />
                            <span className="hint">Pulled from the claim automatically when a claim is linked and this is left blank.</span>
                        </div>
                        <div className="field">
                            <label>Job Type</label>
                            <select value={form.job_type} onChange={(e) => set('job_type', e.target.value)}>
                                {JOB_TYPES.map((t) => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <Can permission="view_job_financials">
                            <div className="field">
                                <label>Job Cost ($) <span className="hint" style={{ fontWeight: 400 }}>(internal)</span></label>
                                <input type="number" min="0" step="50" value={form.job_cost} onChange={(e) => set('job_cost', e.target.value)} placeholder="0" />
                            </div>
                        </Can>
                        <div className="field"><label>Latitude</label><input type="number" step="0.0001" value={form.lat} onChange={(e) => set('lat', e.target.value)} placeholder="e.g. 41.0812" /></div>
                        <div className="field"><label>Longitude</label><input type="number" step="0.0001" value={form.lng} onChange={(e) => set('lng', e.target.value)} placeholder="e.g. -81.5190" /></div>
                        <div className="field"><label>Permit Status</label><select value={form.permit_status} onChange={(e) => set('permit_status', e.target.value)}>{PERMIT_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                        <div className="field"><label>Materials</label><select value={form.material_order_status} onChange={(e) => set('material_order_status', e.target.value)}>{MATERIAL_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                        <div className="field full">
                            <label>Trades <span className="hint" style={{ fontWeight: 400 }}>(used to match subs)</span></label>
                            <div className="trade-chips">
                                {TRADES.map((t) => (
                                    <button key={t} type="button" className={`trade-chip ${trades.includes(t) ? 'on' : ''}`} onClick={() => toggleTrade(t)}>{tradeLabel(t)}</button>
                                ))}
                            </div>
                        </div>
                        <div className="field full"><label>Scope of Work</label><textarea value={form.scope} onChange={(e) => set('scope', e.target.value)} placeholder="Describe exactly what needs to be done..." /></div>
                        <div className="field full"><label>Site Notes</label><textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Gate codes, parking, pets, staging, hazards..." /></div>
                    </div>
                </div>
            </div>
            <div className="modal-foot">
                <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
                <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create Job'}</button>
            </div>
        </Modal>
    );
}

/* =========================================================================
   FIND SUBS (dispatch) MODAL  → GET /subs/match + POST /jobs/:id/dispatch
   ========================================================================= */
function DispatchModal({ job, onClose, onDispatched, toast }) {
    const mapRef = useRef(null);
    const layerRef = useRef(null);
    const [trade, setTrade] = useState((job.trades && job.trades[0]) || 'roofing');
    const [maxMiles, setMaxMiles] = useState('');
    const [pay, setPay] = useState('');
    const [scope, setScope] = useState(job.scope || '');
    const [expiresHours, setExpiresHours] = useState('24');
    const [matches, setMatches] = useState([]);
    const [selected, setSelected] = useState(new Set());
    const [searching, setSearching] = useState(false);
    const [sending, setSending] = useState(false);

    const hasCoords = job.lat != null && job.lng != null;

    const runMatch = useCallback(async () => {
        if (!hasCoords) { toast('This job has no map location (lat/lng). Add coordinates on the job first.', 'warn'); return; }
        setSearching(true);
        try {
            const res = await axiosInstance.get('/subs/match', {
                params: { lat: job.lat, lng: job.lng, trade, max_miles: maxMiles || undefined },
            });
            const rows = res.data?.data || [];
            setMatches(rows);
            setSelected(new Set(rows.map((r) => r.id)));
            if (!rows.length) toast('No compliant, in-range subs for this trade.', 'info');
        } catch (e) { /* interceptor */ } finally { setSearching(false); }
    }, [hasCoords, job.lat, job.lng, trade, maxMiles, toast]);

    // Draw the map + pins whenever matches change.
    useEffect(() => {
        if (!hasCoords) return;
        let cancelled = false;
        (async () => {
            const L = (await import('leaflet')).default || (await import('leaflet'));
            if (cancelled) return;
            const el = document.getElementById('dispatchMap');
            if (!el) return;
            if (!mapRef.current || !el._leaflet_id) {
                if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
                mapRef.current = L.map('dispatchMap').setView([job.lat, job.lng], 9);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(mapRef.current);
            }
            const map = mapRef.current;
            if (layerRef.current) { layerRef.current.remove(); layerRef.current = null; }
            const group = L.layerGroup().addTo(map);
            layerRef.current = group;

            // Job pin (gold).
            L.circleMarker([job.lat, job.lng], { radius: 9, color: '#b8860b', fillColor: '#FDB813', fillOpacity: 0.95, weight: 2 })
                .bindPopup(`<strong>Job site</strong><br/>${job.job_number}`).addTo(group);

            const pts = [[job.lat, job.lng]];
            for (const s of matches) {
                if (s.home_lat == null || s.home_lng == null) continue;
                const on = selected.has(s.id);
                const m = L.circleMarker([s.home_lat, s.home_lng], {
                    radius: 7, color: on ? '#166534' : '#6b7280', fillColor: on ? '#22c55e' : '#d1d5db', fillOpacity: 0.85, weight: 2,
                });
                m.bindPopup(`<strong>${s.business_name}</strong><br/>${s.distance_miles} mi · ⭐ ${s.rating ?? '—'}`);
                m.addTo(group);
                pts.push([s.home_lat, s.home_lng]);
            }
            if (pts.length > 1) { try { map.fitBounds(pts, { padding: [40, 40], maxZoom: 11 }); } catch { /* */ } }
        })();
        return () => { cancelled = true; };
    }, [matches, selected, hasCoords, job.lat, job.lng, job.job_number]);

    useEffect(() => () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } }, []);

    const toggleSub = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const send = async () => {
        const payAmount = parseFloat(pay);
        if (isNaN(payAmount) || payAmount <= 0) { toast('Enter a payout amount.', 'error'); return; }
        if (!scope.trim()) { toast('Add a scope summary for the offer.', 'error'); return; }
        const sub_ids = [...selected];
        if (!sub_ids.length) { toast('Select at least one sub to notify.', 'error'); return; }
        setSending(true);
        try {
            await axiosInstance.post(`/jobs/${job.id}/dispatch`, {
                pay_amount: payAmount,
                scope_summary: scope.trim(),
                sub_ids,
                trade,
                expires_hours: parseInt(expiresHours, 10) || 24,
            });
            toast(`Offer sent to ${sub_ids.length} sub(s). First to accept wins.`, 'success');
            onDispatched();
        } catch (e) { /* interceptor */ } finally { setSending(false); }
    };

    return (
        <Modal onClose={onClose} wide>
            <div className="modal-head">
                <div><h2>Find Subs — Dispatch Offer</h2><div className="sub">{job.job_number} · {job.address || 'No address'}</div></div>
                <button className="modal-close" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
                <div className="form-section">
                    <h3>Match Criteria</h3>
                    <div className="form-grid">
                        <div className="field"><label>Trade</label><select value={trade} onChange={(e) => setTrade(e.target.value)}>{TRADES.map((t) => <option key={t} value={t}>{tradeLabel(t)}</option>)}</select></div>
                        <div className="field"><label>Max distance (mi) <span className="hint" style={{ fontWeight: 400 }}>(optional)</span></label><input type="number" min="1" value={maxMiles} onChange={(e) => setMaxMiles(e.target.value)} placeholder="Sub's own radius" /></div>
                        <div className="field" style={{ alignSelf: 'end' }}>
                            <button className="btn btn-secondary btn-block" onClick={runMatch} disabled={searching || !hasCoords}>{searching ? 'Searching…' : '🔍 Find Matching Subs'}</button>
                        </div>
                    </div>
                    {!hasCoords && <div className="hint" style={{ color: '#dc2626' }}>This job has no lat/lng. Add coordinates on the job before dispatching.</div>}
                </div>

                {hasCoords && (
                    <div className="form-section">
                        <h3>Coverage Map</h3>
                        <div id="dispatchMap" className="dispatch-map" />
                    </div>
                )}

                <div className="form-section">
                    <h3>Matched Subs ({matches.length})</h3>
                    {!matches.length ? (
                        <div className="hint">Run a match to see compliant, in-range subs. Non-compliant (expired COI, etc.) subs are excluded server-side.</div>
                    ) : (
                        <div className="dispatch-sub-list">
                            {matches.map((s) => (
                                <div className={`dispatch-sub ${selected.has(s.id) ? 'sel' : ''}`} key={s.id} onClick={() => toggleSub(s.id)}>
                                    <div className="ds-check">{selected.has(s.id) ? '✓' : ''}</div>
                                    <div style={{ flex: 1 }}>
                                        <div className="ds-name">{s.business_name}</div>
                                        <div className="ds-meta">{s.distance_miles} mi away · ⭐ {s.rating ?? '—'} · {(s.trades || []).map(tradeLabel).join(', ')}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="form-section">
                    <h3>Offer Terms</h3>
                    <div className="form-grid">
                        <div className="field"><label>Sub Payout ($) <span className="req">*</span></label><input type="number" min="0" step="50" value={pay} onChange={(e) => setPay(e.target.value)} placeholder="0" /></div>
                        <div className="field"><label>Offer expires in (hours)</label><input type="number" min="1" max="168" value={expiresHours} onChange={(e) => setExpiresHours(e.target.value)} /></div>
                        <div className="field full"><label>Scope summary (shown pre-accept) <span className="req">*</span></label><textarea value={scope} onChange={(e) => setScope(e.target.value)} placeholder="What the sub sees before accepting — no address or client name." /></div>
                    </div>
                    <div className="msg-preview" style={{ marginTop: '0.5rem' }}>
                        Pre-accept the sub sees: <strong>pay {pay ? money(pay) : '$—'}</strong>, area <strong>{job.area_hint || 'City, ST'}</strong>, distance, scope + photos. Address, client name &amp; phone reveal <strong>only</strong> after they accept.
                    </div>
                </div>
            </div>
            <div className="modal-foot">
                <button className="btn btn-ghost" onClick={onClose} disabled={sending}>Cancel</button>
                <button className="btn btn-primary" onClick={send} disabled={sending || !selected.size}>{sending ? 'Sending…' : `📣 Send Offer to ${selected.size} Sub(s)`}</button>
            </div>
        </Modal>
    );
}

/* =========================================================================
   DISPATCH TRACKER  (recipient grid)  → GET /jobs/:id/dispatch
   ========================================================================= */
function DispatchTracker({ job, canDispatch, toast, onChanged }) {
    const [dispatch, setDispatch] = useState(undefined); // undefined=loading, null=none
    const [cancelling, setCancelling] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await axiosInstance.get(`/jobs/${job.id}/dispatch`, { suppressErrorToast: true });
            setDispatch(res.data?.data ?? null);
        } catch { setDispatch(null); }
    }, [job.id]);

    useEffect(() => { load(); }, [load]);

    const cancel = async () => {
        setCancelling(true);
        try {
            await axiosInstance.post(`/jobs/${job.id}/dispatch/cancel`);
            toast('Dispatch cancelled.', 'success');
            await load();
            onChanged?.();
        } catch { /* */ } finally { setCancelling(false); }
    };

    if (dispatch === undefined) return <div className="hint">Loading dispatch…</div>;
    if (dispatch === null) return <div className="hint">No dispatch sent for this job yet.</div>;

    const respMeta = { accepted: ['green', 'Accepted'], declined: ['red', 'Declined'], no_response: ['muted', 'No response'] };
    return (
        <div>
            <div className="detail-grid" style={{ marginBottom: '0.75rem' }}>
                <div className="detail-item"><div className="dl">Status</div><div className="dv" style={{ textTransform: 'capitalize' }}>{dispatch.status}</div></div>
                <div className="detail-item"><div className="dl">Pay Offered</div><div className="dv">{money(dispatch.pay_amount)}</div></div>
                <div className="detail-item"><div className="dl">Area</div><div className="dv">{dispatch.area_label || '—'}</div></div>
                <div className="detail-item"><div className="dl">Expires</div><div className="dv">{fmtDateTime(dispatch.expires_at)}</div></div>
            </div>
            <div className="dispatch-track">
                <div className="dt-head"><div>Sub</div><div>Dist</div><div>Notified</div><div>Viewed</div><div>Response</div></div>
                {(dispatch.recipients || []).map((r) => {
                    const [cls, label] = respMeta[r.response] || ['muted', r.response];
                    return (
                        <div className="dt-row" key={r.sub_id}>
                            <div className="dt-name">{r.sub?.business_name || '—'}</div>
                            <div>{r.distance_miles != null ? `${r.distance_miles} mi` : '—'}</div>
                            <div>{r.notified_email_at ? '✉️' : ''}{r.notified_sms_at ? ' 💬' : ''}{!r.notified_email_at && !r.notified_sms_at ? '—' : ''}</div>
                            <div>{r.viewed_at ? '👁' : '—'}</div>
                            <div className={`jr-money ${cls}`} style={{ textAlign: 'left', fontWeight: 700 }}>{label}</div>
                        </div>
                    );
                })}
            </div>
            {canDispatch && dispatch.status === 'open' && (
                <button className="btn btn-ghost" style={{ marginTop: '0.75rem' }} onClick={cancel} disabled={cancelling}>{cancelling ? 'Cancelling…' : 'Cancel Dispatch'}</button>
            )}
        </div>
    );
}

/* =========================================================================
   JOB DETAIL / MANAGE MODAL
   ========================================================================= */
function JobModal({ jobId, team, onClose, onChanged, toast }) {
    const { has } = usePermissions();
    const canDispatch = has('dispatch_subs');
    const canFin = has('view_job_financials');

    const [job, setJob] = useState(null);
    const [checklist, setChecklist] = useState([]);
    const [edit, setEdit] = useState(null);
    const [busy, setBusy] = useState('');
    const [showDispatch, setShowDispatch] = useState(false);
    const [schedDate, setSchedDate] = useState('');
    const [newItem, setNewItem] = useState('');

    const load = useCallback(async () => {
        try {
            const [jr, cl] = await Promise.all([
                axiosInstance.get(`/jobs/${jobId}`, { suppressErrorToast: true }),
                axiosInstance.get(`/jobs/${jobId}/checklist`, { suppressErrorToast: true }).catch(() => ({ data: { data: [] } })),
            ]);
            const j = jr.data?.data;
            setJob(j);
            setChecklist(cl.data?.data || []);
            setEdit({
                address: j.address || '', job_type: j.job_type || '', scope: j.scope || '', notes: j.notes || '',
                job_cost: j.job_cost ?? '', permit_status: j.permit_status || 'not_required',
                material_order_status: j.material_order_status || 'not_ordered', trades: j.trades || [],
                lat: j.lat ?? '', lng: j.lng ?? '',
            });
        } catch { /* */ }
    }, [jobId]);

    useEffect(() => { load(); }, [load]);

    const withBusy = async (key, fn, okMsg) => {
        setBusy(key);
        try { await fn(); if (okMsg) toast(okMsg, 'success'); await load(); onChanged?.(); }
        catch { /* interceptor */ } finally { setBusy(''); }
    };

    if (!job || !edit) {
        return <Modal onClose={onClose}><div className="modal-body" style={{ padding: '3rem', textAlign: 'center' }}><div className="hint">Loading job…</div></div></Modal>;
    }

    const setE = (k, v) => setEdit((s) => ({ ...s, [k]: v }));
    const toggleTrade = (t) => setEdit((s) => ({ ...s, trades: s.trades.includes(t) ? s.trades.filter((x) => x !== t) : [...s.trades, t] }));
    const blockers = job.readiness_blockers || [];
    const isReady = job.readiness_state === 'ready' || job.readiness_state === 'scheduled';
    const isDone = job.readiness_state === 'complete';

    const saveDetails = () => withBusy('save', () => axiosInstance.patch(`/jobs/${jobId}`, {
        address: edit.address.trim() || undefined,
        job_type: edit.job_type || undefined,
        scope: edit.scope.trim() || undefined,
        notes: edit.notes || undefined,
        trades: edit.trades,
        permit_status: edit.permit_status,
        material_order_status: edit.material_order_status,
        lat: edit.lat !== '' && !isNaN(parseFloat(edit.lat)) ? parseFloat(edit.lat) : undefined,
        lng: edit.lng !== '' && !isNaN(parseFloat(edit.lng)) ? parseFloat(edit.lng) : undefined,
        ...(canFin && edit.job_cost !== '' ? { job_cost: parseInt(edit.job_cost, 10) || 0 } : {}),
    }), 'Job saved.');

    const toggleGate = (field, val) => withBusy(field, () => axiosInstance.patch(`/jobs/${jobId}`, { [field]: val }), 'Updated.');
    const assign = (employee_id) => withBusy('assign', () => axiosInstance.post(`/jobs/${jobId}/assign`, employee_id ? { type: 'in_house', employee_id } : { type: 'unassigned' }), 'Assignment updated.');

    const schedule = async () => {
        if (!schedDate) { toast('Pick a date/time first.', 'error'); return; }
        setBusy('schedule');
        try {
            await axiosInstance.post(`/jobs/${jobId}/schedule`, { scheduled_start: new Date(schedDate).toISOString() });
            toast('Job scheduled.', 'success');
            await load(); onChanged?.();
        } catch (e) {
            const bl = e?.response?.data?.blockers;
            if (Array.isArray(bl) && bl.length) toast('Still blocked: ' + bl.join(', '), 'error');
        } finally { setBusy(''); }
    };

    const complete = () => withBusy('complete', () => axiosInstance.post(`/jobs/${jobId}/complete`), 'Job marked complete.');
    const addChecklist = () => { if (!newItem.trim()) return; withBusy('chk', () => axiosInstance.post(`/jobs/${jobId}/checklist`, { label: newItem.trim() }).then(() => setNewItem(''))); };
    const toggleChecklist = (item) => withBusy('chk' + item.id, () => axiosInstance.patch(`/jobs/${jobId}/checklist/${item.id}`, { done: !item.done }));

    return (
        <Modal onClose={onClose} wide>
            <div className="modal-head">
                <div><h2>{job.job_number} — {job.job_type || 'Job'}</h2><div className="sub">{job.address || 'No address'}{job.claim_id ? ' · claim-linked' : ' · standalone'}</div></div>
                <button className="modal-close" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
                <div className="detail-grid" style={{ marginBottom: '1.25rem' }}>
                    <div className="detail-item"><div className="dl">Readiness</div><div className="dv"><StatePill state={job.readiness_state} /></div></div>
                    <div className="detail-item"><div className="dl">Assignment</div><div className="dv">{assignmentLabel(job, team.byId)}</div></div>
                    <div className="detail-item"><div className="dl">Scheduled</div><div className="dv">{fmtDate(job.scheduled_start)}</div></div>
                    <Can permission="view_job_financials"><div className="detail-item"><div className="dl">Job Cost</div><div className="dv">{job.job_cost != null ? money(job.job_cost) : '—'}</div></div></Can>
                </div>

                {/* READINESS / BLOCKERS */}
                {!isDone && (
                    <div className="form-section">
                        <h3>Readiness Gates</h3>
                        {blockers.length ? (
                            <div className="blocker-list">
                                {blockers.map((b, i) => <div className="blocker-chip" key={i}>⛔ {b}</div>)}
                                <div className="hint" style={{ marginTop: '0.4rem' }}>Clear each blocker below (contract / payment / permit / materials) — claim-side gates (approval, estimate, measurement) resolve on the linked claim.</div>
                            </div>
                        ) : (
                            <div className="ready-banner">✓ All gates cleared — this job is ready to schedule &amp; dispatch.</div>
                        )}
                        <div className="gate-toggles">
                            <label className={`gate-toggle ${job.contract_signed_at ? 'on' : ''}`}>
                                <input type="checkbox" checked={!!job.contract_signed_at} disabled={busy === 'contract_signed'} onChange={(e) => toggleGate('contract_signed', e.target.checked)} />
                                <span>Contract signed{job.contract_signed_at ? ` · ${fmtDate(job.contract_signed_at)}` : ''}</span>
                            </label>
                            <label className={`gate-toggle ${job.first_payment_received_at ? 'on' : ''}`}>
                                <input type="checkbox" checked={!!job.first_payment_received_at} disabled={busy === 'first_payment_received'} onChange={(e) => toggleGate('first_payment_received', e.target.checked)} />
                                <span>First payment received{job.first_payment_received_at ? ` · ${fmtDate(job.first_payment_received_at)}` : ''}</span>
                            </label>
                        </div>
                    </div>
                )}

                {/* SCHEDULE + ASSIGN + DISPATCH */}
                {!isDone && (
                    <div className="form-section">
                        <h3>Schedule &amp; Crew</h3>
                        <div className="form-grid">
                            <div className="field">
                                <label>Assign In-House Employee</label>
                                <select value={job.assignment_type === 'in_house' ? (job.assigned_employee_id || '') : ''} disabled={busy === 'assign'} onChange={(e) => assign(e.target.value)}>
                                    <option value="">— Unassigned —</option>
                                    {team.list.map((m) => <option key={m.id} value={m.id}>{m.full_name || m.email}</option>)}
                                </select>
                                {job.assignment_type === 'subcontractor' && <span className="hint">Currently assigned to a subcontractor (via accepted dispatch).</span>}
                            </div>
                            <div className="field">
                                <label>Schedule Start</label>
                                <input type="datetime-local" value={schedDate} onChange={(e) => setSchedDate(e.target.value)} />
                            </div>
                            <div className="field" style={{ alignSelf: 'end' }}>
                                <button className="btn btn-secondary btn-block" onClick={schedule} disabled={busy === 'schedule' || !isReady} title={!isReady ? 'Clear all blockers first' : ''}>
                                    {busy === 'schedule' ? 'Scheduling…' : '📅 Schedule Job'}
                                </button>
                                {!isReady && <span className="hint" style={{ color: '#dc2626' }}>Blocked jobs can’t be scheduled.</span>}
                            </div>
                        </div>
                        {canDispatch && (
                            <button className="btn btn-primary" style={{ marginTop: '0.5rem' }} onClick={() => setShowDispatch(true)} disabled={!isReady} title={!isReady ? 'Job must be ready first' : ''}>
                                👷 Find Subs &amp; Dispatch
                            </button>
                        )}
                    </div>
                )}

                {/* DISPATCH TRACKER */}
                <div className="form-section">
                    <h3>Dispatch Tracker</h3>
                    <DispatchTracker job={job} canDispatch={canDispatch} toast={toast} onChanged={load} />
                </div>

                {/* EDIT DETAILS */}
                {!isDone && (
                    <div className="form-section">
                        <h3>Edit Details</h3>
                        <div className="form-grid">
                            <div className="field full"><label>Address</label><input type="text" value={edit.address} onChange={(e) => setE('address', e.target.value)} /></div>
                            <div className="field"><label>Job Type</label><select value={edit.job_type} onChange={(e) => setE('job_type', e.target.value)}>{JOB_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
                            <Can permission="view_job_financials"><div className="field"><label>Job Cost ($)</label><input type="number" min="0" step="50" value={edit.job_cost} onChange={(e) => setE('job_cost', e.target.value)} /></div></Can>
                            <div className="field"><label>Latitude</label><input type="number" step="0.0001" value={edit.lat} onChange={(e) => setE('lat', e.target.value)} /></div>
                            <div className="field"><label>Longitude</label><input type="number" step="0.0001" value={edit.lng} onChange={(e) => setE('lng', e.target.value)} /></div>
                            <div className="field"><label>Permit</label><select value={edit.permit_status} onChange={(e) => setE('permit_status', e.target.value)}>{PERMIT_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                            <div className="field"><label>Materials</label><select value={edit.material_order_status} onChange={(e) => setE('material_order_status', e.target.value)}>{MATERIAL_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                            <div className="field full">
                                <label>Trades</label>
                                <div className="trade-chips">{TRADES.map((t) => <button key={t} type="button" className={`trade-chip ${edit.trades.includes(t) ? 'on' : ''}`} onClick={() => toggleTrade(t)}>{tradeLabel(t)}</button>)}</div>
                            </div>
                            <div className="field full"><label>Scope</label><textarea value={edit.scope} onChange={(e) => setE('scope', e.target.value)} /></div>
                            <div className="field full"><label>Site Notes</label><textarea value={edit.notes} onChange={(e) => setE('notes', e.target.value)} /></div>
                        </div>
                        <button className="btn btn-primary" onClick={saveDetails} disabled={busy === 'save'}>{busy === 'save' ? 'Saving…' : 'Save Changes'}</button>
                    </div>
                )}

                {/* CHECKLIST */}
                <div className="form-section">
                    <h3>Checklist</h3>
                    <div className="checklist">
                        {checklist.length ? checklist.map((c) => (
                            <div className={`check-item ${c.done ? 'done' : ''}`} key={c.id} onClick={() => toggleChecklist(c)} style={{ cursor: 'pointer' }}>
                                <div className="check-box">{c.done ? '✓' : ''}</div>
                                <span className="check-label">{c.label}</span>
                                {c.required && <span className="check-required">Required</span>}
                            </div>
                        )) : <div className="hint">No checklist items yet.</div>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <input type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add a checklist item..." style={{ flex: 1, padding: '0.6rem 0.85rem', border: '2px solid #e5e7eb', borderRadius: 10, fontFamily: 'inherit', fontSize: '0.85rem' }} />
                        <button className="btn btn-ghost" onClick={addChecklist} disabled={busy === 'chk'}>Add</button>
                    </div>
                </div>
            </div>
            <div className="modal-foot">
                <button className="btn btn-ghost" onClick={onClose}>Close</button>
                {!isDone && <button className="btn btn-success" onClick={complete} disabled={busy === 'complete'}>{busy === 'complete' ? 'Completing…' : '✓ Mark Complete'}</button>}
            </div>

            {showDispatch && (
                <DispatchModal job={job} toast={toast} onClose={() => setShowDispatch(false)} onDispatched={() => { setShowDispatch(false); load(); onChanged?.(); }} />
            )}
        </Modal>
    );
}

/* =========================================================================
   MAIN COMPONENT
   ========================================================================= */
export default function JobsReady() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stateFilter, setStateFilter] = useState('all');
    const [assignedFilter, setAssignedFilter] = useState('all');
    const [team, setTeam] = useState({ list: [], byId: {} });
    const [modal, setModal] = useState(null); // { type, id }

    const toast = (msg, type = '') => {
        if (type === 'success') sonner.success(msg);
        else if (type === 'error') sonner.error(msg);
        else if (type === 'warn' || type === 'warning') sonner.warning(msg);
        else sonner.info(msg);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { pageSize: 100 };
            if (stateFilter !== 'all') params.state = stateFilter;
            if (assignedFilter !== 'all') params.assigned = assignedFilter;
            const res = await axiosInstance.get('/jobs', { params });
            setJobs(res.data?.data || []);
        } catch { setJobs([]); } finally { setLoading(false); }
    }, [stateFilter, assignedFilter]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        (async () => {
            try {
                const res = await axiosInstance.get('/team/members', { suppressErrorToast: true });
                const list = res.data?.data || res.data || [];
                setTeam({ list, byId: Object.fromEntries(list.map((m) => [m.id, m])) });
            } catch { /* degrade */ }
        })();
    }, []);

    const counts = useMemo(() => {
        const c = { total: jobs.length, blocked: 0, ready: 0, active: 0, complete: 0 };
        for (const j of jobs) {
            if (j.readiness_state === 'blocked') c.blocked++;
            else if (j.readiness_state === 'ready') c.ready++;
            else if (j.readiness_state === 'complete') c.complete++;
            else c.active++; // scheduled / in_production / punch_list
        }
        return c;
    }, [jobs]);

    const renderCard = (j) => {
        const blockers = j.readiness_blockers || [];
        return (
            <div className="job-card" key={j.id}>
                <div className="job-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="job-id">{j.job_number}</span>
                        <StatePill state={j.readiness_state} />
                    </div>
                    <div className="job-address">{j.address || 'No address'}</div>
                    {j.job_type && <span className="job-type-tag">{j.job_type}</span>}
                    {(j.trades || []).length > 0 && (
                        <div className="card-trades">{(j.trades || []).map((t) => <span className="trade-mini" key={t}>{tradeLabel(t)}</span>)}</div>
                    )}
                    {j.readiness_state === 'blocked' && blockers.length > 0 && (
                        <div className="blocker-list" style={{ marginTop: '0.5rem' }}>
                            {blockers.slice(0, 3).map((b, i) => <span className="blocker-chip sm" key={i}>⛔ {b}</span>)}
                            {blockers.length > 3 && <span className="blocker-chip sm">+{blockers.length - 3} more</span>}
                        </div>
                    )}
                    <div className="job-meta-row">
                        <span className="rep-chip">{assignmentLabel(j, team.byId)}</span>
                        <Can permission="view_job_financials">{j.job_cost != null && <span className="job-claimed-by">{money(j.job_cost)} cost</span>}</Can>
                    </div>
                </div>
                <div className="job-card-actions">
                    <button className="btn btn-primary btn-block" onClick={() => setModal({ type: 'job', id: j.id })}>Manage</button>
                </div>
            </div>
        );
    };

    return (
        <div className="subjobs">
            <div className="header-section">
                <div className="header-content">
                    <div className="header-left">
                        <div>
                            <div className="page-title">Jobs Ready</div>
                            <div className="page-subtitle">Readiness gating, scheduling, and subcontractor dispatch</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="content view active">
                <div className="stats-row">
                    <div className="stat-card"><div className="stat-value">{counts.total}</div><div className="stat-label">Total Jobs</div></div>
                    <div className="stat-card"><div className="stat-value" style={{ color: '#dc2626' }}>{counts.blocked}</div><div className="stat-label">Blocked</div></div>
                    <div className="stat-card"><div className="stat-value green">{counts.ready}</div><div className="stat-label">Ready</div></div>
                    <div className="stat-card"><div className="stat-value">{counts.active}</div><div className="stat-label">Scheduled / In Prod</div></div>
                    <div className="stat-card"><div className="stat-value">{counts.complete}</div><div className="stat-label">Complete</div></div>
                </div>

                <div className="toolbar">
                    <div className="section-title">Jobs Board</div>
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div className="filter-tabs">
                            {[['all', 'All'], ['blocked', 'Blocked'], ['ready', 'Ready'], ['scheduled', 'Scheduled'], ['in_production', 'In Production'], ['complete', 'Complete']].map(([f, label]) => (
                                <button key={f} className={`filter-tab ${stateFilter === f ? 'active' : ''}`} onClick={() => setStateFilter(f)}>{label}</button>
                            ))}
                        </div>
                        <select className="rep-filter" value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)} aria-label="Filter by assignment">
                            <option value="all">All Assignments</option>
                            <option value="unassigned">Unassigned</option>
                            <option value="in_house">In-House</option>
                            <option value="subcontractor">Subcontractor</option>
                        </select>
                        <button className="btn btn-primary" onClick={() => setModal({ type: 'create' })}>+ Add Job</button>
                    </div>
                </div>

                {loading ? (
                    <div className="job-grid">
                        {[0, 1, 2, 3].map((i) => <div className="job-card" key={i} style={{ height: 180 }}><div className="sk-shimmer" style={{ height: '100%', borderRadius: 14 }} /></div>)}
                    </div>
                ) : !jobs.length ? (
                    <div className="empty">No jobs match this filter. Click “+ Add Job” to create one.</div>
                ) : (
                    <div className="job-grid">{jobs.map(renderCard)}</div>
                )}
            </div>

            {modal?.type === 'create' && (
                <CreateJobModal toast={toast} onClose={() => setModal(null)} onSaved={(j) => { setModal(null); load(); if (j?.id) setModal({ type: 'job', id: j.id }); }} />
            )}
            {modal?.type === 'job' && (
                <JobModal jobId={modal.id} team={team} toast={toast} onClose={() => setModal(null)} onChanged={load} />
            )}
        </div>
    );
}
