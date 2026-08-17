'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast as sonner } from 'sonner';
import 'leaflet/dist/leaflet.css';
import axiosInstance from '@/lib/axiosInstance';
import { usePermissions } from '@/lib/permissions/PermissionsContext';
import { Can } from '@/lib/permissions/Can';
import AddressAutocomplete from '@/components/common/AddressAutocomplete';
import { useCompanyTrades } from '@/lib/useCompanyTrades';
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
    const { trades: companyTrades } = useCompanyTrades();
    const [form, setForm] = useState({
        claim_id: '', estimate_id: '', address: '', job_type: JOB_TYPES[0], scope: '', notes: '',
        job_cost: '', lat: '', lng: '', permit_status: 'not_required', material_order_status: 'not_ordered',
    });
    const [trades, setTrades] = useState([]);
    const [windows, setWindows] = useState([]); // Q2.9 availability windows
    const [completeBy, setCompleteBy] = useState('');
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const toggleTrade = (t) => setTrades((ts) => ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]);

    // Q2.8 — "Add Job" starts from an existing client (search → pick → choose
    // one of their estimates), or a blank standalone job for retail/cash work.
    const [mode, setMode] = useState('client'); // 'client' | 'standalone'
    const [clientQuery, setClientQuery] = useState('');
    const [clientResults, setClientResults] = useState([]);
    const [searchingClients, setSearchingClients] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [estimates, setEstimates] = useState([]);
    const [loadingEstimates, setLoadingEstimates] = useState(false);
    const [showAllEst, setShowAllEst] = useState(false);
    const EST_LIMIT = 5;
    const searchTimer = useRef(null);
    const clientName = (c) => [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unnamed client';
    const clientAddr = (c) => c.address || [c.city, c.state, c.zip_code].filter(Boolean).join(', ') || '';

    // Debounced client search (min 2 chars) against the existing list endpoint.
    useEffect(() => {
        if (mode !== 'client' || selectedClient) return;
        const q = clientQuery.trim();
        if (searchTimer.current) clearTimeout(searchTimer.current);
        if (q.length < 2) { setClientResults([]); setSearchingClients(false); return; }
        setSearchingClients(true);
        searchTimer.current = setTimeout(async () => {
            try {
                const res = await axiosInstance.get('/client-portal', { params: { search: q }, suppressErrorToast: true });
                setClientResults((res.data?.data ?? []).slice(0, 8));
            } catch { setClientResults([]); }
            finally { setSearchingClients(false); }
        }, 300);
        return () => searchTimer.current && clearTimeout(searchTimer.current);
    }, [clientQuery, mode, selectedClient]);

    const pickClient = async (c) => {
        setSelectedClient(c);
        setClientResults([]);
        setShowAllEst(false);
        set('claim_id', c.id);
        set('estimate_id', '');
        set('address', clientAddr(c));
        setLoadingEstimates(true);
        try {
            const res = await axiosInstance.get('/estimates', { params: { client_id: c.id }, suppressErrorToast: true });
            setEstimates(res.data?.data ?? []);
        } catch { setEstimates([]); }
        finally { setLoadingEstimates(false); }
    };

    const clearClient = () => {
        setSelectedClient(null); setEstimates([]); setClientQuery('');
        set('claim_id', ''); set('estimate_id', ''); set('address', '');
    };

    const pickEstimate = (est) => {
        const id = est?.id || '';
        set('estimate_id', id);
        // Seed job type + scope from the chosen estimate (editable).
        if (est) {
            if (est.damage_type && JOB_TYPES.includes(est.damage_type)) set('job_type', est.damage_type);
            const title = est.title || est.estimate_title;
            if (title && !form.scope.trim()) set('scope', `Based on estimate: ${title}`);
        }
    };

    const save = async () => {
        if (mode === 'client' && !selectedClient) {
            toast('Search and pick a client, or switch to Standalone.', 'error');
            return;
        }
        if (mode === 'standalone' && !form.address.trim()) {
            toast('Enter an address for the standalone job.', 'error');
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
            if (mode === 'client' && selectedClient) {
                payload.claim_id = selectedClient.id;
                if (form.estimate_id) payload.estimate_id = form.estimate_id;
            }
            if (form.address.trim()) payload.address = form.address.trim();
            if (form.lat !== '' && !isNaN(parseFloat(form.lat))) payload.lat = parseFloat(form.lat);
            if (form.lng !== '' && !isNaN(parseFloat(form.lng))) payload.lng = parseFloat(form.lng);
            if (form.job_cost !== '' && !isNaN(parseInt(form.job_cost, 10))) payload.job_cost = parseInt(form.job_cost, 10);
            // Q2.9 — availability windows + deadline (no scheduled_start here; the sub sets it).
            const cleanWindows = cleanupWindows(windows);
            if (cleanWindows.length) payload.availability_windows = cleanWindows;
            if (completeBy) payload.complete_by = completeBy;

            const res = await axiosInstance.post('/jobs', payload);
            toast('Job created.', 'success');
            onSaved(res.data?.data);
        } catch (e) {
            // interceptor toasts; keep the modal open
        } finally {
            setSaving(false);
        }
    };

    const money = (n) => (n || n === 0)
        ? `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '';

    return (
        <Modal onClose={onClose}>
            <div className="modal-head">
                <div><h2>Add Job</h2><div className="sub">Start from an existing client + estimate, or create a standalone retail/cash job.</div></div>
                <button className="modal-close" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
                {/* Q2.8 — client vs standalone */}
                <div className="form-section">
                    <div className="jobsrc-toggle">
                        <button type="button" className={`jobsrc-btn ${mode === 'client' ? 'on' : ''}`} onClick={() => setMode('client')}>Existing client</button>
                        <button type="button" className={`jobsrc-btn ${mode === 'standalone' ? 'on' : ''}`} onClick={() => { setMode('standalone'); clearClient(); }}>Standalone (retail)</button>
                    </div>

                    {mode === 'client' && !selectedClient && (
                        <div className="field full" style={{ position: 'relative', marginTop: '0.75rem' }}>
                            <label>Search client by name</label>
                            <div className="cr-input-wrap">
                                <input type="text" value={clientQuery} onChange={(e) => setClientQuery(e.target.value)} placeholder="Start typing a client's name…" autoFocus />
                                {searchingClients && <span className="cr-searching-icon" aria-label="Searching" />}
                            </div>
                            {(searchingClients || clientResults.length > 0) && clientQuery.trim().length >= 2 && (
                                <div className="client-results">
                                    {searchingClients && [0, 1, 2].map((i) => (
                                        <div className="client-result sk" key={`sk-${i}`}>
                                            <span className="sk-shimmer sk-line name" />
                                            <span className="sk-shimmer sk-line addr" />
                                        </div>
                                    ))}
                                    {!searchingClients && clientResults.length === 0 && (
                                        <div className="client-result empty muted"><span className="empty-emoji">🔍</span>No matching clients.</div>
                                    )}
                                    {!searchingClients && clientResults.map((c) => (
                                        <button type="button" key={c.id} className="client-result" onClick={() => pickClient(c)}>
                                            <span className="cr-name">{clientName(c)}</span>
                                            <span className="cr-addr">{clientAddr(c) || 'No address'}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {mode === 'client' && selectedClient && (
                        <div className="picked-client">
                            <div className="pc-head">
                                <div>
                                    <div className="pc-name">{clientName(selectedClient)}</div>
                                    <div className="pc-addr">{clientAddr(selectedClient) || 'No address on file'}</div>
                                </div>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={clearClient}>Change</button>
                            </div>
                            <div className="pc-est-label">Base this job on an estimate</div>
                            {loadingEstimates ? (
                                <div className="est-list">
                                    {[0, 1, 2].map((i) => (
                                        <div className="est-card sk" key={`est-sk-${i}`}>
                                            <div className="est-main">
                                                <span className="sk-shimmer sk-line title" />
                                                <span className="sk-shimmer sk-line meta" />
                                            </div>
                                            <span className="sk-shimmer sk-bar total" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="est-list">
                                    {estimates.length === 0 && <div className="hint">No estimates for this client yet — you can still create the job.</div>}
                                    {(showAllEst ? estimates : estimates.slice(0, EST_LIMIT)).map((est) => {
                                        const on = form.estimate_id === est.id;
                                        const meta = [est.damage_type, est.status].filter(Boolean).join(' · ') || 'estimate';
                                        return (
                                            <button type="button" key={est.id} className={`est-card ${on ? 'on' : ''}`} onClick={() => pickEstimate(est)}>
                                                <div className="est-main">
                                                    <span className="est-title">{est.title || est.estimate_title || 'Untitled estimate'}</span>
                                                    <span className="est-meta">{meta}</span>
                                                </div>
                                                {est.total_rcv > 0 && <span className="est-total">{money(est.total_rcv)}</span>}
                                                {on && <span className="est-check" aria-hidden="true">✓</span>}
                                            </button>
                                        );
                                    })}
                                    {estimates.length > EST_LIMIT && (
                                        <button type="button" className="est-more" onClick={() => setShowAllEst((v) => !v)}>
                                            {showAllEst ? 'Show fewer' : `Show all ${estimates.length} estimates`}
                                        </button>
                                    )}
                                    {estimates.length > 0 && (
                                        <button type="button" className={`est-card no-est ${!form.estimate_id ? 'on' : ''}`} onClick={() => pickEstimate(null)}>
                                            <div className="est-main"><span className="est-title">No estimate</span><span className="est-meta">Create the job without linking one</span></div>
                                            {!form.estimate_id && <span className="est-check" aria-hidden="true">✓</span>}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="form-section">
                    <h3>Job Details</h3>
                    <div className="form-grid">
                        <div className="field full">
                            <label>Property Address</label>
                            <AddressAutocomplete
                                placeholder="Street, City, State ZIP"
                                value={form.address}
                                onChange={(v) => set('address', v)}
                                onSelect={(p) => set('address', p.formatted || p.address)} />
                            <span className="hint">{mode === 'client' ? 'Pre-filled from the client — edit if the job site differs.' : 'Required for a standalone job.'}</span>
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
                                {companyTrades.map((t) => (
                                    <button key={t.key} type="button" className={`trade-chip ${trades.includes(t.key) ? 'on' : ''}`} onClick={() => toggleTrade(t.key)}>{t.label}</button>
                                ))}
                            </div>
                        </div>
                        <div className="field full"><label>Scope of Work</label><textarea value={form.scope} onChange={(e) => set('scope', e.target.value)} placeholder="Describe exactly what needs to be done..." /></div>
                        <div className="field full"><label>Site Notes</label><textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Gate codes, parking, pets, staging, hazards..." /></div>
                        <div className="field full">
                            <AvailabilityWindowsEditor windows={windows} setWindows={setWindows} completeBy={completeBy} setCompleteBy={setCompleteBy} />
                        </div>
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
   Q2.9 — AVAILABILITY WINDOWS EDITOR (shared: Add Job + Manage Job)
   We do NOT pick a start date here — the sub sets the actual date on their
   accepted job. We record the windows they must work within + a complete-by
   deadline, both shown to the sub AND on the client portal for that job.
   ========================================================================= */
function cleanupWindows(windows) {
    return (windows || [])
        .filter((w) => w && w.start)
        .map((w) => ({ start: w.start, end: w.end || w.start, note: (w.note || '').trim() || undefined }));
}

function AvailabilityWindowsEditor({ windows, setWindows, completeBy, setCompleteBy }) {
    const add = () => setWindows([...(windows || []), { start: '', end: '', note: '' }]);
    const upd = (i, k, v) => setWindows(windows.map((w, idx) => idx === i ? { ...w, [k]: v } : w));
    const rm = (i) => setWindows(windows.filter((_, idx) => idx !== i));
    return (
        <div className="avail-editor">
            <label>Availability windows <span className="hint">(optional — dates the crew must work within; leave empty for “any date”)</span></label>
            {(windows || []).map((w, i) => (
                <div className="avail-row" key={i}>
                    <input type="date" value={w.start || ''} onChange={(e) => upd(i, 'start', e.target.value)} aria-label="Window start" />
                    <span className="avail-to">to</span>
                    <input type="date" value={w.end || ''} min={w.start || undefined} onChange={(e) => upd(i, 'end', e.target.value)} aria-label="Window end" />
                    <input type="text" className="avail-note" value={w.note || ''} onChange={(e) => upd(i, 'note', e.target.value)} placeholder="Note e.g. HOA only Mon–Wed" />
                    <button type="button" className="btn btn-xs btn-ghost" onClick={() => rm(i)} title="Remove window">✕</button>
                </div>
            ))}
            <button type="button" className="btn btn-sm btn-ghost avail-add" onClick={add}>+ Add window</button>
            <div className="avail-deadline">
                <label>Complete-by deadline <span className="hint">(optional)</span></label>
                <input type="date" value={completeBy || ''} onChange={(e) => setCompleteBy(e.target.value)} />
            </div>
        </div>
    );
}

/* =========================================================================
   FIND SUBS (dispatch) MODAL  → GET /subs/match + POST /jobs/:id/dispatch
   ========================================================================= */
function DispatchModal({ job, onClose, onDispatched, toast }) {
    const { trades: companyTrades } = useCompanyTrades();
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
            toast(`Offer sent to ${sub_ids.length} sub(s). Accepts come in as requests to approve (auto-accept subs win instantly).`, 'success');
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
                        <div className="field"><label>Trade</label><select value={trade} onChange={(e) => setTrade(e.target.value)}>{companyTrades.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select></div>
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
function DispatchTracker({ job, canDispatch, canApprove, toast, onChanged }) {
    const [dispatch, setDispatch] = useState(undefined); // undefined=loading, null=none
    const [cancelling, setCancelling] = useState(false);
    const [acting, setActing] = useState(''); // `${subId}:${approve|deny}`

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

    // Q2.11 — approve (fills the job, first-approved-wins) or deny one request.
    const act = async (subId, kind) => {
        setActing(`${subId}:${kind}`);
        try {
            await axiosInstance.post(`/jobs/${job.id}/dispatch/${kind}`, { sub_id: subId });
            toast(kind === 'approve' ? 'Request approved — job assigned.' : 'Request denied.', kind === 'approve' ? 'success' : 'info');
            await load();
            onChanged?.();
        } catch { /* interceptor shows "already filled" etc. */ } finally { setActing(''); }
    };

    if (dispatch === undefined) return <div className="hint ck-load-inline"><span className="ck-spinner sm" />Loading dispatch…</div>;
    if (dispatch === null) return <div className="hint">No dispatch sent for this job yet.</div>;

    const respMeta = {
        accepted: ['green', 'Accepted'],
        requested: ['amber', 'Requested'],
        declined: ['red', 'Declined'],
        no_response: ['muted', 'No response'],
    };
    const pending = (dispatch.recipients || []).filter((r) => r.response === 'requested');
    return (
        <div>
            <div className="detail-grid" style={{ marginBottom: '0.75rem' }}>
                <div className="detail-item"><div className="dl">Status</div><div className="dv" style={{ textTransform: 'capitalize' }}>{dispatch.status}</div></div>
                <div className="detail-item"><div className="dl">Pay Offered</div><div className="dv">{money(dispatch.pay_amount)}</div></div>
                <div className="detail-item"><div className="dl">Area</div><div className="dv">{dispatch.area_label || '—'}</div></div>
                <div className="detail-item"><div className="dl">Expires</div><div className="dv">{fmtDateTime(dispatch.expires_at)}</div></div>
            </div>
            {dispatch.status === 'open' && pending.length > 0 && (
                <div className="dispatch-request-banner">⏳ <strong>{pending.length} request{pending.length > 1 ? 's' : ''} awaiting approval.</strong> {canApprove ? 'Approve one to assign the job — the rest are auto-declined.' : 'A user with approval permission must review these.'}</div>
            )}
            <div className="dispatch-track">
                <div className="dt-head"><div>Sub</div><div>Dist</div><div>Notified</div><div>Viewed</div><div>Response</div></div>
                {(dispatch.recipients || []).map((r) => {
                    const [cls, label] = respMeta[r.response] || ['muted', r.response];
                    const showActions = canApprove && dispatch.status === 'open' && r.response === 'requested';
                    return (
                        <div className="dt-row" key={r.sub_id}>
                            <div className="dt-name">{r.sub?.business_name || '—'}</div>
                            <div>{r.distance_miles != null ? `${r.distance_miles} mi` : '—'}</div>
                            <div>{r.notified_email_at ? '✉️' : ''}{r.notified_sms_at ? ' 💬' : ''}{!r.notified_email_at && !r.notified_sms_at ? '—' : ''}</div>
                            <div>{r.viewed_at ? '👁' : '—'}</div>
                            <div className={`jr-money ${cls}`} style={{ textAlign: 'left', fontWeight: 700 }}>
                                {label}
                                {showActions && (
                                    <div className="dt-actions">
                                        <button className="btn btn-xs btn-success" onClick={() => act(r.sub_id, 'approve')} disabled={!!acting}>{acting === `${r.sub_id}:approve` ? '…' : 'Approve'}</button>
                                        <button className="btn btn-xs btn-ghost" onClick={() => act(r.sub_id, 'deny')} disabled={!!acting}>{acting === `${r.sub_id}:deny` ? '…' : 'Deny'}</button>
                                    </div>
                                )}
                            </div>
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
    const { trades: companyTrades } = useCompanyTrades();
    const canDispatch = has('dispatch_subs');
    const canApprove = has('approve_sub_requests');
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
                windows: (Array.isArray(j.availability_windows) ? j.availability_windows : []).map((w) => ({
                    start: String(w.start || '').slice(0, 10), end: String(w.end || '').slice(0, 10), note: w.note || '',
                })),
                completeBy: j.complete_by ? String(j.complete_by).slice(0, 10) : '',
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
        return <Modal onClose={onClose}><div className="modal-body" style={{ padding: '3rem' }}><div className="ck-load-block"><span className="ck-spinner" /><span>Loading job…</span></div></div></Modal>;
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
        availability_windows: cleanupWindows(edit.windows), // Q2.9 — [] clears
        complete_by: edit.completeBy || null,
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
                                <label>Set Date (internal)</label>
                                <input type="datetime-local" value={schedDate} onChange={(e) => setSchedDate(e.target.value)} />
                                <span className="hint">The sub usually sets this on their accepted job. Setting it here must fall inside the windows below.</span>
                            </div>
                            <div className="field" style={{ alignSelf: 'end' }}>
                                <button className="btn btn-secondary btn-block" onClick={schedule} disabled={busy === 'schedule' || !isReady} title={!isReady ? 'Clear all blockers first' : ''}>
                                    {busy === 'schedule' ? 'Scheduling…' : '📅 Schedule Job'}
                                </button>
                                {!isReady && <span className="hint" style={{ color: '#dc2626' }}>Blocked jobs can’t be scheduled.</span>}
                            </div>
                            <div className="field full">
                                <AvailabilityWindowsEditor
                                    windows={edit.windows} setWindows={(v) => setE('windows', v)}
                                    completeBy={edit.completeBy} setCompleteBy={(v) => setE('completeBy', v)}
                                />
                                <button className="btn btn-sm btn-ghost" style={{ marginTop: '0.5rem' }} onClick={saveDetails} disabled={busy === 'save'}>{busy === 'save' ? 'Saving…' : 'Save windows & deadline'}</button>
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
                    <DispatchTracker job={job} canDispatch={canDispatch} canApprove={canApprove} toast={toast} onChanged={load} />
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
                                <div className="trade-chips">{companyTrades.map((t) => <button key={t.key} type="button" className={`trade-chip ${edit.trades.includes(t.key) ? 'on' : ''}`} onClick={() => toggleTrade(t.key)}>{t.label}</button>)}</div>
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
   COMPLETE CONFIRM (Q2.10) — drag-to-Completed checks the completion
   requirements (checklist done + completion photos) as a confirm step.
   ========================================================================= */
function CompleteConfirmModal({ jobId, jobNumber, toast, onClose, onDone }) {
    const [data, setData] = useState(null);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        let alive = true;
        (async () => {
            const [jr, cr] = await Promise.all([
                axiosInstance.get(`/jobs/${jobId}`, { suppressErrorToast: true }).catch(() => null),
                axiosInstance.get(`/jobs/${jobId}/checklist`, { suppressErrorToast: true }).catch(() => ({ data: { data: [] } })),
            ]);
            if (alive) setData({ job: jr?.data?.data || {}, checklist: cr?.data?.data || [] });
        })();
        return () => { alive = false; };
    }, [jobId]);

    const loading = !data;
    const checklist = data?.checklist || [];
    const openItems = checklist.filter((c) => !c.done);
    const photos = data?.job?.completion_photos || [];
    const missing = openItems.length > 0 || photos.length === 0;

    const complete = async () => {
        setBusy(true);
        try {
            await axiosInstance.post(`/jobs/${jobId}/complete`);
            toast('Job marked complete.', 'success');
            onDone();
        } catch { /* interceptor toasts */ } finally { setBusy(false); }
    };

    return (
        <Modal onClose={busy ? () => {} : onClose}>
            <div className="modal-head">
                <div><h3 style={{ margin: 0 }}>Complete {jobNumber || 'job'}?</h3><div className="hint">Drag-to-Completed confirmation</div></div>
                <button className="modal-close" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
                {loading ? <div className="hint">Checking completion requirements…</div> : (
                    <div className="complete-reqs">
                        <div className={`req-row ${openItems.length ? 'warn' : 'ok'}`}>
                            <span>{openItems.length ? '⚠' : '✓'}</span>
                            {openItems.length ? `${openItems.length} checklist item${openItems.length > 1 ? 's' : ''} still open` : `Checklist complete${checklist.length ? ` (${checklist.length})` : ''}`}
                        </div>
                        <div className={`req-row ${photos.length ? 'ok' : 'warn'}`}>
                            <span>{photos.length ? '✓' : '⚠'}</span>
                            {photos.length ? `${photos.length} completion photo${photos.length > 1 ? 's' : ''}` : 'No completion photos added'}
                        </div>
                        <p className="hint" style={{ marginTop: '0.75rem' }}>
                            {missing ? 'These are recommended — you can still complete the job, or cancel to finish them first.' : 'All completion requirements are met.'}
                        </p>
                    </div>
                )}
            </div>
            <div className="modal-foot">
                <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
                <button className="btn btn-success" onClick={complete} disabled={busy || loading}>{busy ? 'Completing…' : '✓ Complete job'}</button>
            </div>
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
    const [dragJobId, setDragJobId] = useState(null); // Q2.10 drag-to-Completed
    const [dropActive, setDropActive] = useState(false);
    const [completeJob, setCompleteJob] = useState(null); // { id, job_number } pending confirm

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
        const canComplete = j.readiness_state !== 'complete' && j.readiness_state !== 'blocked';
        return (
            <div
                className={`job-card ${dragJobId === j.id ? 'dragging' : ''}`}
                key={j.id}
                draggable={canComplete}
                onDragStart={canComplete ? (e) => { setDragJobId(j.id); e.dataTransfer.effectAllowed = 'move'; } : undefined}
                onDragEnd={() => { setDragJobId(null); setDropActive(false); }}
                title={canComplete ? 'Drag to the Complete tab to finish this job' : undefined}
            >
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
                            {[['all', 'All'], ['blocked', 'Blocked'], ['ready', 'Ready'], ['scheduled', 'Scheduled'], ['in_production', 'In Production'], ['complete', 'Complete']].map(([f, label]) => {
                                const isCompleteDrop = f === 'complete' && dragJobId;
                                return (
                                    <button
                                        key={f}
                                        className={`filter-tab ${stateFilter === f ? 'active' : ''} ${isCompleteDrop && dropActive ? 'drop-target' : ''} ${f === 'complete' && dragJobId ? 'droppable' : ''}`}
                                        onClick={() => setStateFilter(f)}
                                        onDragOver={isCompleteDrop ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropActive(true); } : undefined}
                                        onDragLeave={isCompleteDrop ? () => setDropActive(false) : undefined}
                                        onDrop={isCompleteDrop ? (e) => {
                                            e.preventDefault();
                                            const job = jobs.find((x) => x.id === dragJobId);
                                            setDropActive(false); setDragJobId(null);
                                            if (job) setCompleteJob({ id: job.id, job_number: job.job_number });
                                        } : undefined}
                                    >{label}</button>
                                );
                            })}
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
            {completeJob && (
                <CompleteConfirmModal
                    jobId={completeJob.id}
                    jobNumber={completeJob.job_number}
                    toast={toast}
                    onClose={() => setCompleteJob(null)}
                    onDone={() => { setCompleteJob(null); load(); }}
                />
            )}
        </div>
    );
}
