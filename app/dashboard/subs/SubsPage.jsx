'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast as sonner } from 'sonner';
import 'leaflet/dist/leaflet.css';
import axiosInstance from '@/lib/axiosInstance';
import './subs.css';

/* =========================================================================
   CONSTANTS  (task 3.9 Part B — /subs admin API)
   ========================================================================= */
const TRADES = ['roofing', 'gutters', 'siding', 'windows', 'painting', 'general'];

const DOC_LABELS = {
    w9: 'W-9',
    coi_general_liability: 'COI — General Liability',
    additional_insured_endorsement: 'Additional Insured Endorsement',
    coi_workers_comp: 'COI — Workers Comp',
    subcontractor_agreement: 'Subcontractor Agreement',
    bank_ach: 'Bank / ACH',
    license: 'License (state-dependent)',
};

const STATUS_META = {
    invited: ['st-grey', 'Invited'],
    onboarding: ['st-blue', 'Onboarding'],
    pending_review: ['st-amber', 'Pending Review'],
    active: ['st-green', 'Active'],
    suspended: ['st-red', 'Suspended'],
};

const DOC_STATUS_META = {
    missing: ['ds-grey', 'Missing'],
    uploaded: ['ds-blue', 'Uploaded'],
    approved: ['ds-green', 'Approved'],
    rejected: ['ds-red', 'Rejected'],
    expired: ['ds-red', 'Expired'],
};

const money = (n) => '$' + (Number(n) || 0).toLocaleString();
const tradeLabel = (t) => (t || '').replace(/_/g, ' ');
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

function StatusPill({ status }) {
    const [cls, label] = STATUS_META[status] || ['st-grey', status || '—'];
    return <span className={`sub-pill ${cls}`}>{label}</span>;
}

// Compliance badge: distinguish docs the SUB still owes (genuinely missing) from
// docs uploaded and awaiting the admin's review — so a fully-uploaded, pending
// sub reads as "N to review", not the misleading "N missing".
function ComplianceTag({ compliance }) {
    const c = compliance || {};
    const missing = (c.missing_docs || c.missing_required || []).length;
    const toReview = (c.awaiting_review || []).length;
    if (c.compliant) return <span className="compliance-tag ok">✓ Compliant</span>;
    if (missing) return <span className="compliance-tag bad">✗ {missing} missing</span>;
    if (toReview) return <span className="compliance-tag warn">◷ {toReview} to review</span>;
    return <span className="compliance-tag warn">Pending</span>;
}

/* =========================================================================
   ADD SUB MODAL  → POST /subs
   ========================================================================= */
function AddSubModal({ onClose, onSaved, toast }) {
    const [f, setF] = useState({ business_name: '', contact_name: '', email: '', phone: '', notes: '' });
    const [trades, setTrades] = useState([]);
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
    const toggleTrade = (t) => setTrades((ts) => ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]);

    const save = async () => {
        if (!f.business_name.trim() || !f.email.trim() || !f.phone.trim()) { toast('Business name, email, and phone are required.', 'error'); return; }
        if (!trades.length) { toast('Select at least one trade.', 'error'); return; }
        setSaving(true);
        try {
            await axiosInstance.post('/subs', {
                business_name: f.business_name.trim(), contact_name: f.contact_name.trim() || undefined,
                email: f.email.trim(), phone: f.phone.trim(), trades, notes: f.notes.trim() || undefined,
            });
            toast('Subcontractor invited — onboarding link sent.', 'success');
            onSaved();
        } catch { /* interceptor */ } finally { setSaving(false); }
    };

    return (
        <div className="modal open"><div className="modal-overlay" onClick={onClose} /><div className="modal-content">
            <div className="modal-head"><div><h2>Invite Subcontractor</h2><div className="sub">They get an onboarding link to add their info + documents.</div></div><button className="modal-close" onClick={onClose}>&times;</button></div>
            <div className="modal-body">
                <div className="form-grid">
                    <div className="field full"><label>Business / Crew Name <span className="req">*</span></label><input type="text" value={f.business_name} onChange={(e) => set('business_name', e.target.value)} placeholder="e.g. Apex Exteriors" /></div>
                    <div className="field"><label>Contact Name</label><input type="text" value={f.contact_name} onChange={(e) => set('contact_name', e.target.value)} placeholder="Full name" /></div>
                    <div className="field"><label>Phone <span className="req">*</span></label><input type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(330) 555-0100" /></div>
                    <div className="field full"><label>Email <span className="req">*</span></label><input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="crew@email.com" /></div>
                    <div className="field full">
                        <label>Trades <span className="req">*</span></label>
                        <div className="trade-chips">{TRADES.map((t) => <button key={t} type="button" className={`trade-chip ${trades.includes(t) ? 'on' : ''}`} onClick={() => toggleTrade(t)}>{tradeLabel(t)}</button>)}</div>
                    </div>
                    <div className="field full"><label>Notes</label><textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Internal notes (optional)" /></div>
                </div>
            </div>
            <div className="modal-foot"><button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Sending…' : 'Send Invite'}</button></div>
        </div></div>
    );
}

/* =========================================================================
   REVIEW DOC MODAL  → POST /subs/:id/docs/:type/review
   ========================================================================= */
function ReviewDocModal({ subId, doc, onClose, onDone, toast }) {
    const [reason, setReason] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [busy, setBusy] = useState('');
    const [viewing, setViewing] = useState(false);
    const isCoi = doc.doc_type.startsWith('coi_') || doc.doc_type === 'additional_insured_endorsement';
    const isEsignStub = String(doc.s3_key || '').startsWith('esign-stub:');
    const hasFile = !!doc.s3_key && !isEsignStub;

    const viewDoc = async () => {
        setViewing(true);
        try {
            const res = await axiosInstance.get(`/subs/${subId}/docs/${doc.doc_type}/file`, { responseType: 'blob', suppressErrorToast: true });
            const url = URL.createObjectURL(res.data);
            window.open(url, '_blank', 'noopener');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (e) {
            let msg = 'Could not open the document.';
            try { const t = await e?.response?.data?.text?.(); if (t) msg = JSON.parse(t).message || msg; } catch { /* */ }
            toast(msg, 'error');
        } finally { setViewing(false); }
    };

    const decide = async (approve) => {
        if (!approve && !reason.trim()) { toast('A rejection reason is required.', 'error'); return; }
        setBusy(approve ? 'a' : 'r');
        try {
            await axiosInstance.post(`/subs/${subId}/docs/${doc.doc_type}/review`, {
                approve, reason: approve ? undefined : reason.trim(),
                expires_at: approve && expiresAt ? new Date(expiresAt).toISOString() : undefined,
            });
            toast(approve ? 'Document approved.' : 'Document rejected.', 'success');
            onDone();
        } catch { /* */ } finally { setBusy(''); }
    };

    return (
        <div className="modal open"><div className="modal-overlay" onClick={onClose} /><div className="modal-content" style={{ maxWidth: 520 }}>
            <div className="modal-head"><div><h2>Review — {DOC_LABELS[doc.doc_type] || doc.doc_type}</h2><div className="sub">Uploaded {fmtDate(doc.uploaded_at)}</div></div><button className="modal-close" onClick={onClose}>&times;</button></div>
            <div className="modal-body">
                <div className="field">
                    <label>Document</label>
                    {hasFile ? (
                        <button type="button" className="btn btn-secondary btn-sm doc-view-btn" onClick={viewDoc} disabled={viewing}>{viewing ? 'Opening…' : '🔍 View uploaded document'}</button>
                    ) : (
                        <div className="hint">{isEsignStub ? 'E-signed agreement — no file to view yet.' : 'No file uploaded yet.'}</div>
                    )}
                </div>
                {isCoi && (
                    <div className="field"><label>Expiry date <span className="hint" style={{ fontWeight: 400 }}>(COIs auto-expire on this date)</span></label><input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></div>
                )}
                <div className="field"><label>Rejection reason <span className="hint" style={{ fontWeight: 400 }}>(required to reject)</span></label><textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What's wrong with this document?" /></div>
            </div>
            <div className="modal-foot">
                <button className="btn btn-ghost" onClick={onClose} disabled={!!busy}>Cancel</button>
                <button className="btn btn-danger" onClick={() => decide(false)} disabled={!!busy}>{busy === 'r' ? '…' : 'Reject'}</button>
                <button className="btn btn-success" onClick={() => decide(true)} disabled={!!busy}>{busy === 'a' ? '…' : 'Approve'}</button>
            </div>
        </div></div>
    );
}

/* =========================================================================
   RECORD PAYMENT MODAL  → POST /subs/:id/payments
   ========================================================================= */
function RecordPaymentModal({ subId, jobs, onClose, onDone, toast }) {
    const [amount, setAmount] = useState('');
    const [jobId, setJobId] = useState('');
    const [status, setStatus] = useState('paid');
    const [method, setMethod] = useState('');
    const [memo, setMemo] = useState('');
    const [saving, setSaving] = useState(false);

    const save = async () => {
        const amt = parseFloat(amount);
        if (isNaN(amt) || amt <= 0) { toast('Enter a valid amount.', 'error'); return; }
        setSaving(true);
        try {
            await axiosInstance.post(`/subs/${subId}/payments`, {
                amount: amt, job_id: jobId || undefined, status, method: method.trim() || undefined, memo: memo.trim() || undefined,
            });
            toast('Payment recorded.', 'success');
            onDone();
        } catch { /* */ } finally { setSaving(false); }
    };

    return (
        <div className="modal open"><div className="modal-overlay" onClick={onClose} /><div className="modal-content" style={{ maxWidth: 520 }}>
            <div className="modal-head"><div><h2>Record Payment</h2><div className="sub">Manual payout ledger entry.</div></div><button className="modal-close" onClick={onClose}>&times;</button></div>
            <div className="modal-body">
                <div className="form-grid">
                    <div className="field"><label>Amount ($) <span className="req">*</span></label><input type="number" min="0" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></div>
                    <div className="field"><label>Status</label><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="paid">Paid</option></select></div>
                    <div className="field full"><label>Job <span className="hint" style={{ fontWeight: 400 }}>(optional)</span></label><select value={jobId} onChange={(e) => setJobId(e.target.value)}><option value="">— None —</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.job_number} · {j.address}</option>)}</select></div>
                    <div className="field"><label>Method</label><input type="text" value={method} onChange={(e) => setMethod(e.target.value)} placeholder="ACH, check, etc." /></div>
                    <div className="field"><label>Memo</label><input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Reference" /></div>
                </div>
            </div>
            <div className="modal-foot"><button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Record Payment'}</button></div>
        </div></div>
    );
}

const initialsOf = (name) => (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
const prettyPhone = (p) => {
    const d = String(p || '').replace(/\D/g, '');
    if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    if (d.length === 11 && d[0] === '1') return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
    return p || '—';
};

/* Read-only service-area map: home pin + the coverage radius circle. Far more
   meaningful than raw "35.55, -97.62" coordinates — Nate sees WHERE and HOW FAR. */
const MINI_PIN_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="36" viewBox="0 0 30 42">' +
    '<path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.7 23.3 0 15 0z" fill="#1a1f3a"/>' +
    '<circle cx="15" cy="15" r="5.5" fill="#ffffff"/></svg>';
function MiniMap({ lat, lng, radiusMiles }) {
    const mapRef = useRef(null);
    useEffect(() => {
        if (lat == null || lng == null) return;
        let cancelled = false;
        (async () => {
            const L = (await import('leaflet')).default || (await import('leaflet'));
            if (cancelled) return;
            const el = document.getElementById('subMiniMap');
            if (!el || el._leaflet_id) return;
            const map = L.map('subMiniMap', { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false });
            mapRef.current = map;
            // set an initial view FIRST so the map is "loaded" (has a pixel origin);
            // fitBounds before that + before the container has size throws
            // "layerPointToLatLng of undefined".
            map.setView([lat, lng], 9);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
            const circle = L.circle([lat, lng], { radius: (Number(radiusMiles) || 25) * 1609.34, color: '#FDB813', fillColor: '#FDB813', fillOpacity: 0.12, weight: 1.5 }).addTo(map);
            const icon = L.divIcon({ className: 'mini-pin-icon', html: MINI_PIN_SVG, iconSize: [26, 36], iconAnchor: [13, 36] });
            L.marker([lat, lng], { icon }).addTo(map);
            // fit to the radius only after the container is laid out + re-measured.
            setTimeout(() => {
                if (cancelled || !mapRef.current) return;
                mapRef.current.invalidateSize();
                try { mapRef.current.fitBounds(circle.getBounds(), { padding: [12, 12] }); } catch { /* container not ready — the setView above is a safe fallback */ }
            }, 200);
        })();
        return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
    }, [lat, lng, radiusMiles]);
    if (lat == null || lng == null) return <div className="mini-map empty">No service-area pin set yet.</div>;
    return <div id="subMiniMap" className="mini-map" />;
}

/* Shimmer skeleton that mirrors the drawer layout so the load feels instant
   and structured instead of a bare "Loading…" line. */
function DrawerSkeleton() {
    return (
        <div className="drawer-skel" aria-busy="true" aria-label="Loading subcontractor">
            <div className="drawer-head">
                <div style={{ flex: 1 }}>
                    <div className="sk-shimmer sk-line" style={{ width: '55%', height: 20 }} />
                    <div className="sk-shimmer sk-line" style={{ width: '80%', height: 12, marginTop: 10 }} />
                </div>
            </div>
            <div className="drawer-body">
                <div className="sk-row">
                    <div className="sk-shimmer sk-pill" />
                    <div className="sk-shimmer sk-pill" />
                </div>
                <div className="sk-shimmer sk-line" style={{ width: 120, height: 12, margin: '1.25rem 0 0.75rem' }} />
                <div className="sk-shimmer sk-block" style={{ height: 54 }} />
                <div className="sk-shimmer sk-line" style={{ width: 120, height: 12, margin: '1.5rem 0 0.75rem' }} />
                {[0, 1, 2, 3, 4].map((i) => <div className="sk-shimmer sk-block" key={i} style={{ height: 44, marginBottom: 8 }} />)}
            </div>
        </div>
    );
}

/* =========================================================================
   SUB DETAIL DRAWER  → GET /subs/:id
   ========================================================================= */
function SubDrawer({ subId, onClose, onChanged, toast }) {
    const [data, setData] = useState(null);
    const [busy, setBusy] = useState('');
    const [reviewDoc, setReviewDoc] = useState(null);
    const [showPay, setShowPay] = useState(false);

    const load = useCallback(async () => {
        try { const res = await axiosInstance.get(`/subs/${subId}`, { suppressErrorToast: true }); setData(res.data?.data); }
        catch { /* */ }
    }, [subId]);
    useEffect(() => { load(); }, [load]);

    const setStatus = async (status) => {
        setBusy('status');
        try { await axiosInstance.patch(`/subs/${subId}/status`, { status }); toast('Status updated.', 'success'); await load(); onChanged?.(); }
        catch { /* */ } finally { setBusy(''); }
    };
    const resend = async () => {
        setBusy('resend');
        try { await axiosInstance.post(`/subs/${subId}/resend-invite`); toast('Invite re-sent.', 'success'); }
        catch { /* */ } finally { setBusy(''); }
    };

    return (
        <div className="drawer-wrap">
            <div className="drawer-overlay" onClick={onClose} />
            <div className="drawer">
                {!data ? (
                    <DrawerSkeleton />
                ) : (
                    <>
                        <div className="drawer-head">
                            <div className="drawer-ident">
                                <div className="drawer-avatar">{initialsOf(data.business_name)}</div>
                                <div style={{ minWidth: 0 }}>
                                    <div className="drawer-title">{data.business_name}</div>
                                    <div className="drawer-sub">{data.contact_name || '—'}{data.rating != null ? ` · ⭐ ${data.rating}` : ''}</div>
                                    <div className="contact-actions">
                                        {data.phone && <a className="contact-chip" href={`tel:${data.phone}`}>📞 {prettyPhone(data.phone)}</a>}
                                        {data.email && <a className="contact-chip" href={`mailto:${data.email}`}>✉️ Email</a>}
                                        {data.phone && <button className="contact-chip" onClick={() => { navigator.clipboard?.writeText(data.phone); toast('Phone copied.', 'success'); }}>⧉ Copy</button>}
                                    </div>
                                </div>
                            </div>
                            <button className="modal-close" onClick={onClose}>&times;</button>
                        </div>
                        <div className="drawer-body">
                            <div className="drawer-status-row">
                                <StatusPill status={data.status} />
                                <ComplianceTag compliance={data.compliance} />
                            </div>

                            {/* contextual "what to do" banner so the drawer states its own purpose */}
                            {(() => {
                                const toReview = data.compliance?.awaiting_review?.length || 0;
                                const missing = (data.compliance?.missing_docs || []).length;
                                if (toReview) return <div className="drawer-cue cue-amber">📄 <strong>{toReview} document{toReview > 1 ? 's' : ''} awaiting your review.</strong> Approve or reject each below to activate this sub.</div>;
                                if (missing) return <div className="drawer-cue cue-red">⏳ Waiting on the sub — {missing} required document{missing > 1 ? 's' : ''} not uploaded yet.</div>;
                                if (data.compliance?.compliant && data.status !== 'active') return <div className="drawer-cue cue-green">✓ All documents approved — ready to activate.</div>;
                                if (data.status === 'active') return <div className="drawer-cue cue-green">✓ Active and compliant — eligible for job dispatch.</div>;
                                return null;
                            })()}

                            <div className="drawer-actions">
                                {data.status === 'active' && <button className="btn btn-ghost" onClick={() => setStatus('suspended')} disabled={busy === 'status'}>Suspend</button>}
                                {data.status === 'suspended' && <button className="btn btn-success" onClick={() => setStatus('active')} disabled={busy === 'status'}>Reactivate</button>}
                                {['invited', 'onboarding'].includes(data.status) && <button className="btn btn-secondary" onClick={resend} disabled={busy === 'resend'}>{busy === 'resend' ? 'Sending…' : 'Resend Invite'}</button>}
                            </div>

                            <div className="drawer-section">
                                <h4>Service Area</h4>
                                <MiniMap lat={data.home_lat} lng={data.home_lng} radiusMiles={data.service_radius_miles} />
                                <div className="area-facts">
                                    <span className="area-fact"><b>{data.service_radius_miles || '—'} mi</b> radius</span>
                                    {data.home_lat != null && <a className="area-fact link" href={`https://www.google.com/maps?q=${data.home_lat},${data.home_lng}`} target="_blank" rel="noopener noreferrer">📍 Open in Maps</a>}
                                </div>
                                <div className="area-trades">{(data.trades || []).length ? (data.trades || []).map((t) => <span key={t} className="trade-chip-sm">{tradeLabel(t)}</span>) : <span className="hint">No trades listed</span>}</div>
                            </div>

                            <div className="drawer-section">
                                <h4>Documents <span className="sec-count">{(data.documents || []).filter((d) => d.status === 'approved').length}/{(data.documents || []).length} approved</span></h4>
                                <div className="doc-list">
                                    {(data.documents || []).map((d) => {
                                        const [cls, label] = DOC_STATUS_META[d.status] || ['ds-grey', d.status];
                                        return (
                                            <div className="doc-row" key={d.doc_type}>
                                                <div style={{ flex: 1 }}>
                                                    <div className="doc-name">{DOC_LABELS[d.doc_type] || d.doc_type}</div>
                                                    {d.expires_at && <div className="doc-exp">Expires {fmtDate(d.expires_at)}</div>}
                                                    {d.rejection_reason && <div className="doc-exp" style={{ color: '#dc2626' }}>Rejected: {d.rejection_reason}</div>}
                                                </div>
                                                <span className={`doc-status ${cls}`}>{label}</span>
                                                {['uploaded', 'approved', 'expired', 'rejected'].includes(d.status) && d.s3_key && (
                                                    <button className="btn btn-ghost btn-xs" onClick={() => setReviewDoc(d)}>Review</button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="drawer-section">
                                <h4>Assigned Jobs ({(data.jobs || []).length})</h4>
                                {(data.jobs || []).length ? (data.jobs).map((j) => (
                                    <div className="mini-row" key={j.id}><span>{j.job_number} · {j.address}</span><span className="mini-tag" style={{ textTransform: 'capitalize' }}>{(j.readiness_state || '').replace(/_/g, ' ')}</span></div>
                                )) : <div className="hint">No jobs assigned.</div>}
                            </div>

                            <div className="drawer-section">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h4 style={{ margin: 0 }}>Payments · YTD {money(data.payments_ytd)}</h4>
                                    <button className="btn btn-primary btn-xs" onClick={() => setShowPay(true)}>+ Record</button>
                                </div>
                                <div style={{ marginTop: '0.6rem' }}>
                                    {(data.payments || []).length ? (data.payments).map((p) => (
                                        <div className="mini-row" key={p.id}><span>{money(p.amount)} · {p.method || '—'} · {fmtDate(p.paid_at || p.created_at)}</span><span className="mini-tag" style={{ textTransform: 'capitalize' }}>{p.status}</span></div>
                                    )) : <div className="hint">No payments recorded.</div>}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {reviewDoc && <ReviewDocModal subId={subId} doc={reviewDoc} toast={toast} onClose={() => setReviewDoc(null)} onDone={() => { setReviewDoc(null); load(); onChanged?.(); }} />}
            {showPay && <RecordPaymentModal subId={subId} jobs={data?.jobs || []} toast={toast} onClose={() => setShowPay(false)} onDone={() => { setShowPay(false); load(); }} />}
        </div>
    );
}

/* =========================================================================
   MAIN
   ========================================================================= */
export default function SubsPage() {
    const [subs, setSubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('roster'); // roster | review
    const [statusFilter, setStatusFilter] = useState('');
    const [tradeFilter, setTradeFilter] = useState('');
    const [search, setSearch] = useState('');
    const [drawerId, setDrawerId] = useState(null);
    const [showAdd, setShowAdd] = useState(false);

    const toast = (msg, type = '') => {
        if (type === 'success') sonner.success(msg);
        else if (type === 'error') sonner.error(msg);
        else if (type === 'warn') sonner.warning(msg);
        else sonner.info(msg);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (statusFilter) params.status = statusFilter;
            if (tradeFilter) params.trade = tradeFilter;
            if (search.trim()) params.search = search.trim();
            const res = await axiosInstance.get('/subs', { params });
            setSubs(res.data?.data || []);
        } catch { setSubs([]); } finally { setLoading(false); }
    }, [statusFilter, tradeFilter, search]);

    useEffect(() => { const t = setTimeout(load, search ? 300 : 0); return () => clearTimeout(t); }, [load, search]);

    const reviewQueue = useMemo(() => subs.filter((s) => s.status === 'pending_review'), [subs]);
    const shown = tab === 'review' ? reviewQueue : subs;

    const stats = useMemo(() => ({
        total: subs.length,
        active: subs.filter((s) => s.status === 'active').length,
        pending: reviewQueue.length,
        noncompliant: subs.filter((s) => !s.compliance?.compliant).length,
    }), [subs, reviewQueue]);

    const renderCard = (s) => (
        <div className="roster-card" key={s.id} onClick={() => setDrawerId(s.id)}>
            <div className="rc-head">
                <div className="rc-avatar">{(s.business_name || '?').slice(0, 2).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="rc-name">{s.business_name}</div>
                    <div className="rc-contact">{s.contact_name || '—'} · {s.phone}</div>
                </div>
                <StatusPill status={s.status} />
            </div>
            <div className="rc-trades">{(s.trades || []).map((t) => <span className="trade-mini" key={t}>{tradeLabel(t)}</span>)}</div>
            <div className="rc-foot">
                <ComplianceTag compliance={s.compliance} />
                <span className="rc-radius">{s.service_radius_miles ? `${s.service_radius_miles} mi` : 'No area'}</span>
                {s.rating != null && <span className="rating-tag">⭐ {s.rating}</span>}
            </div>
        </div>
    );

    return (
        <div className="subs-page">
            <div className="header-section">
                <div className="header-content">
                    <div>
                        <div className="page-title">Subcontractors</div>
                        <div className="page-subtitle">Network roster, compliance review, and payouts</div>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Invite Sub</button>
                </div>
            </div>

            <div className="content">
                <div className="stats-row">
                    <div className="stat-card"><div className="stat-value">{stats.total}</div><div className="stat-label">Total Subs</div></div>
                    <div className="stat-card"><div className="stat-value green">{stats.active}</div><div className="stat-label">Active</div></div>
                    <div className="stat-card"><div className="stat-value" style={{ color: '#d97706' }}>{stats.pending}</div><div className="stat-label">Pending Review</div></div>
                    <div className="stat-card"><div className="stat-value" style={{ color: '#dc2626' }}>{stats.noncompliant}</div><div className="stat-label">Non-compliant</div></div>
                </div>

                <div className="toolbar">
                    <div className="tab-switch">
                        <button className={tab === 'roster' ? 'active' : ''} onClick={() => setTab('roster')}>Roster</button>
                        <button className={tab === 'review' ? 'active' : ''} onClick={() => setTab('review')}>Review Queue{stats.pending ? ` (${stats.pending})` : ''}</button>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <input className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name / email…" />
                        <select className="rep-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="">All statuses</option>
                            {Object.keys(STATUS_META).map((s) => <option key={s} value={s}>{STATUS_META[s][1]}</option>)}
                        </select>
                        <select className="rep-filter" value={tradeFilter} onChange={(e) => setTradeFilter(e.target.value)}>
                            <option value="">All trades</option>
                            {TRADES.map((t) => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{tradeLabel(t)}</option>)}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="roster-grid">{[0, 1, 2].map((i) => <div className="roster-card" key={i} style={{ height: 150 }}><div className="sk-shimmer" style={{ height: '100%', borderRadius: 12 }} /></div>)}</div>
                ) : !shown.length ? (
                    <div className="empty">{tab === 'review' ? 'Nothing awaiting review.' : 'No subcontractors yet. Click “+ Invite Sub”.'}</div>
                ) : (
                    <div className="roster-grid">{shown.map(renderCard)}</div>
                )}
            </div>

            {showAdd && <AddSubModal toast={toast} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
            {drawerId && <SubDrawer subId={drawerId} toast={toast} onClose={() => setDrawerId(null)} onChanged={load} />}
        </div>
    );
}
