'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast as sonner } from 'sonner';
import 'leaflet/dist/leaflet.css';
import axiosInstance from '@/lib/axiosInstance';
import SignaturePad from '@/components/signature/SignaturePad';
import './sub-portal.css';

/* =========================================================================
   Public subcontractor portal + onboarding wizard (task 3.9 Part C)
   token IS the credential — no auth. Talks to /sub-portal/:token/*.
   ========================================================================= */
const TRADES = ['roofing', 'gutters', 'siding', 'windows', 'painting', 'general'];
const DOC_LABELS = {
    w9: 'W-9',
    coi_general_liability: 'COI — General Liability',
    additional_insured_endorsement: 'Additional Insured Endorsement',
    coi_workers_comp: 'COI — Workers Comp',
    subcontractor_agreement: 'Subcontractor Agreement',
    bank_ach: 'Bank / ACH',
    license: 'License',
};
const DOC_STATUS = {
    missing: ['ds-grey', 'Missing'], uploaded: ['ds-blue', 'Uploaded'],
    approved: ['ds-green', 'Approved'], rejected: ['ds-red', 'Rejected'], expired: ['ds-red', 'Expired'],
};

const money = (n) => '$' + (Number(n) || 0).toLocaleString();
const tradeLabel = (t) => (t || '').replace(/_/g, ' ');
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');

const toast = (msg, type = '') => {
    if (type === 'success') sonner.success(msg);
    else if (type === 'error') sonner.error(msg);
    else if (type === 'warn') sonner.warning(msg);
    else sonner.info(msg);
};

/* ── pin-drop map for the wizard ──
   Uses a self-contained SVG divIcon so the marker never depends on Leaflet's
   default marker-icon.png (which 404s under the Next bundler → the broken
   "question-mark" image Nate reported). No CDN/asset path involved. */
const PIN_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">' +
    '<path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.7 23.3 0 15 0z" fill="#1a1f3a"/>' +
    '<circle cx="15" cy="15" r="5.5" fill="#ffffff"/></svg>';

function PinMap({ lat, lng, onPick }) {
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const onPickRef = useRef(onPick);
    onPickRef.current = onPick; // click handler is attached once — always call the latest onPick
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const L = (await import('leaflet')).default || (await import('leaflet'));
            if (cancelled) return;
            const el = document.getElementById('pinMap');
            if (!el) return;
            if (!mapRef.current || !el._leaflet_id) {
                if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
                const map = L.map('pinMap').setView([lat ?? 39.8283, lng ?? -98.5795], lat != null ? 11 : 4);
                mapRef.current = map;
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(map);
                map.on('click', (e) => {
                    const { lat: la, lng: ln } = e.latlng;
                    onPickRef.current(Math.round(la * 1e6) / 1e6, Math.round(ln * 1e6) / 1e6);
                });
                // The map usually mounts inside a wizard card that was just laid
                // out, so at init its container can still measure 0px — leaving
                // tiles blank AND taps landing on the wrong pixel (or nowhere), so
                // the pin never registers and the "drop pin" validation never
                // clears. Re-measure once the layout settles.
                setTimeout(() => { if (!cancelled && mapRef.current) mapRef.current.invalidateSize(); }, 150);
            }
            const map = mapRef.current;
            if (lat != null && lng != null) {
                const icon = L.divIcon({ className: 'ck-pin-icon', html: PIN_SVG, iconSize: [30, 42], iconAnchor: [15, 42] });
                if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
                else markerRef.current = L.marker([lat, lng], { icon }).addTo(map);
            }
        })();
        return () => { cancelled = true; };
    }, [lat, lng]);
    useEffect(() => () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } }, []);
    return <div id="pinMap" className="pin-map" />;
}

/* ── Q2.2 multi-pin map ──
   Renders EVERY pin as a marker + its own radius circle; clicking empty map
   adds a new pin. A sub with several locations sees all their coverage at once.
   `mapId` lets the wizard and the profile-edit reuse it without colliding. */
function MultiPinMap({ pins, onAddPin, mapId = 'multiPinMap' }) {
    const mapRef = useRef(null);
    const layerRef = useRef(null);
    const onAddRef = useRef(onAddPin);
    onAddRef.current = onAddPin;
    const sig = JSON.stringify((pins || []).map((p) => [p.lat, p.lng, p.radius_miles]));
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const L = (await import('leaflet')).default || (await import('leaflet'));
            if (cancelled) return;
            const el = document.getElementById(mapId);
            if (!el) return;
            if (!mapRef.current || !el._leaflet_id) {
                if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
                const first = (pins || []).find((p) => p.lat != null);
                const map = L.map(mapId).setView(first ? [first.lat, first.lng] : [39.8283, -98.5795], first ? 8 : 4);
                mapRef.current = map;
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(map);
                layerRef.current = L.layerGroup().addTo(map);
                map.on('click', (e) => {
                    const { lat, lng } = e.latlng;
                    onAddRef.current(Math.round(lat * 1e6) / 1e6, Math.round(lng * 1e6) / 1e6);
                });
                setTimeout(() => { if (!cancelled && mapRef.current) mapRef.current.invalidateSize(); }, 150);
            }
            const layer = layerRef.current;
            if (!layer) return;
            layer.clearLayers();
            const icon = L.divIcon({ className: 'ck-pin-icon', html: PIN_SVG, iconSize: [30, 42], iconAnchor: [15, 42] });
            (pins || []).forEach((p) => {
                if (p.lat == null || p.lng == null) return;
                L.marker([p.lat, p.lng], { icon }).addTo(layer);
                L.circle([p.lat, p.lng], {
                    radius: (Number(p.radius_miles) || 30) * 1609.34,
                    color: '#1a1f3a', weight: 1, fillColor: '#1a1f3a', fillOpacity: 0.08,
                }).addTo(layer);
            });
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sig, mapId]);
    useEffect(() => () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } }, []);
    return <div id={mapId} className="pin-map" />;
}

/* Shared editor: the multi-pin map + a list where each pin gets its own radius
   slider, label, and remove. Used by the onboarding wizard and profile edit. */
function ServicePinsEditor({ pins, setPins, mapId }) {
    const addPin = (lat, lng) => setPins([...(pins || []), { label: '', lat, lng, radius_miles: 30 }]);
    const updPin = (i, k, v) => setPins(pins.map((p, idx) => idx === i ? { ...p, [k]: v } : p));
    const rmPin = (i) => setPins(pins.filter((_, idx) => idx !== i));
    return (
        <div className="pins-editor">
            <p className="muted">Tap the map to add a service location. Add one per area your crew covers — you’ll be matched to jobs inside <strong>any</strong> pin’s radius.</p>
            <MultiPinMap pins={pins} onAddPin={addPin} mapId={mapId} />
            {(pins || []).length === 0 && <div className="pin-readout">No pins yet — tap the map to add your first.</div>}
            <div className="pins-list">
                {(pins || []).map((p, i) => (
                    <div className="pin-item" key={p.id || i}>
                        <div className="pin-item-head">
                            <span className="pin-item-badge">📍 {i + 1}</span>
                            <input className="pin-item-label" value={p.label || ''} onChange={(e) => updPin(i, 'label', e.target.value)} placeholder={`Location ${i + 1} (e.g. Akron)`} />
                            <button type="button" className="btn btn-xs btn-ghost" onClick={() => rmPin(i)} title="Remove pin">✕</button>
                        </div>
                        <div className="pin-item-coords muted">{p.lat}, {p.lng}</div>
                        <label className="pin-item-radius">Radius: <strong>{p.radius_miles || 30} mi</strong>
                            <input type="range" min="1" max="100" step="1" value={p.radius_miles || 30} onChange={(e) => updPin(i, 'radius_miles', Number(e.target.value))} />
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── subcontractor agreement e-sign modal ── */
const AGREEMENT_PREVIEW = [
    'You are agreeing to the Subcontractor Agreement with the contracting company.',
    'Independent contractor — you handle your own taxes, insurance, tools, and crew.',
    'Maintain general liability + workers’ comp insurance and provide current certificates.',
    'Perform work professionally, to code, per each accepted job’s scope.',
    'Payment per accepted job on satisfactory completion.',
    'Keep client & pricing information confidential; don’t solicit the company’s clients directly.',
    'Either party may terminate with written notice.',
];
function SignAgreementModal({ token, onClose, onSigned, toast }) {
    const padRef = useRef(null);
    const [name, setName] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [empty, setEmpty] = useState(true);
    const [busy, setBusy] = useState(false);

    const sign = async () => {
        if (!name.trim()) { toast('Type your legal name to sign.', 'error'); return; }
        if (!agreed) { toast('Please check the box to agree.', 'error'); return; }
        if (padRef.current?.isEmpty()) { toast('Please draw your signature.', 'error'); return; }
        setBusy(true);
        try {
            const signature = padRef.current.toDataURL('image/png');
            await axiosInstance.post(`/sub-portal/${token}/sign-agreement`, { signer_name: name.trim(), signature });
            toast('Agreement signed.', 'success');
            onSigned();
        } catch { /* interceptor shows the error */ } finally { setBusy(false); }
    };

    return (
        <div className="sign-modal-wrap">
            <div className="sign-modal-overlay" onClick={busy ? undefined : onClose} />
            <div className="sign-modal" role="dialog" aria-modal="true">
                <div className="sign-modal-head">
                    <h3>Subcontractor Agreement</h3>
                    <button className="sign-close" onClick={onClose} disabled={busy}>&times;</button>
                </div>
                <div className="sign-modal-body">
                    <div className="agreement-text">
                        {AGREEMENT_PREVIEW.map((c, i) => <p key={i}>{i === 0 ? c : `${i}. ${c}`}</p>)}
                        <p className="muted">The full agreement is recorded with your signature.</p>
                    </div>
                    <div className="field"><label>Your legal name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full legal name" /></div>
                    <div className="field">
                        <label>Signature</label>
                        <div className="sig-pad-box">
                            <SignaturePad ref={padRef} height={160} onChange={({ isEmpty }) => setEmpty(isEmpty)} />
                        </div>
                        <button type="button" className="sig-clear" onClick={() => { padRef.current?.clear(); setEmpty(true); }} disabled={empty || busy}>Clear</button>
                    </div>
                    <label className="agree-row"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /> I have read and agree to the Subcontractor Agreement.</label>
                </div>
                <div className="sign-modal-foot">
                    <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
                    <button className="btn btn-primary btn-busy" onClick={sign} disabled={busy || !name.trim() || !agreed || empty}>{busy ? <><span className="doc-spin dark" />Signing…</> : '✍ Sign Agreement'}</button>
                </div>
            </div>
        </div>
    );
}

/* ── document uploader row ── */
function DocRow({ token, doc, onUploaded }) {
    const inputRef = useRef(null);
    const [busy, setBusy] = useState(false);
    const [showSign, setShowSign] = useState(false);
    const [cls, label] = DOC_STATUS[doc.status] || ['ds-grey', doc.status];

    const upload = async (file) => {
        if (!file) return;
        setBusy(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            await axiosInstance.post(`/sub-portal/${token}/documents/${doc.doc_type}`, fd);
            toast('Uploaded.', 'success');
            onUploaded();
        } catch { /* */ } finally { setBusy(false); }
    };

    const isAgreement = doc.doc_type === 'subcontractor_agreement';
    return (
        <div className="doc-row">
            <div style={{ flex: 1 }}>
                <div className="doc-name">{DOC_LABELS[doc.doc_type] || doc.doc_type}</div>
                {doc.rejection_reason && <div className="doc-note err">Rejected: {doc.rejection_reason}</div>}
                {doc.expires_at && <div className="doc-note">Expires {fmtDate(doc.expires_at)}</div>}
            </div>
            <span className={`doc-status ${cls}`}>{label}</span>
            {isAgreement ? (
                <button className="btn btn-sm btn-secondary" onClick={() => setShowSign(true)}>{['approved', 'uploaded'].includes(doc.status) ? 'Re-sign' : 'E-Sign'}</button>
            ) : (
                <>
                    <input ref={inputRef} type="file" style={{ display: 'none' }} disabled={busy} onChange={(e) => upload(e.target.files?.[0])} accept="image/*,application/pdf" />
                    <button className="btn btn-sm btn-secondary btn-busy" disabled={busy} onClick={() => inputRef.current?.click()}>{busy ? <><span className="doc-spin" />Uploading…</> : (doc.status === 'missing' ? 'Upload' : 'Replace')}</button>
                </>
            )}
            {showSign && <SignAgreementModal token={token} toast={toast} onClose={() => setShowSign(false)} onSigned={() => { setShowSign(false); onUploaded(); }} />}
        </div>
    );
}

/* =========================================================================
   ONBOARDING WIZARD  (status: invited / onboarding / pending_review)
   ========================================================================= */
function seedPins(portal) {
    const p = portal.profile || {};
    if (Array.isArray(portal.pins) && portal.pins.length) {
        return portal.pins.map((x) => ({ id: x.id, label: x.label || '', lat: x.lat, lng: x.lng, radius_miles: x.radius_miles || 30 }));
    }
    if (p.home_lat != null && p.home_lng != null) {
        return [{ label: 'Primary', lat: p.home_lat, lng: p.home_lng, radius_miles: p.service_radius_miles || 30 }];
    }
    return [];
}

function Wizard({ token, portal, reload }) {
    const p = portal.profile || {};
    const [form, setForm] = useState({
        business_name: p.business_name || '', contact_name: p.contact_name || '', phone: p.phone || '',
    });
    const [pins, setPins] = useState(() => seedPins(portal)); // Q2.2 multi-pin
    const [trades, setTrades] = useState(p.trades || []);
    const [savingInfo, setSavingInfo] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const toggleTrade = (t) => setTrades((ts) => ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]);

    // Q2.4 — resumable onboarding. The form already loads from the saved profile
    // (portal.profile), so a returning sub picks up where they left off. This
    // adds silent, debounced AUTO-SAVE of partial progress as they type — no
    // validation, no toast — so half-finished work survives a refresh/close even
    // if they never hit "Save details". The explicit Save/Submit still gate the
    // fully-validated steps.
    const [autoSave, setAutoSave] = useState('idle'); // 'idle' | 'saving' | 'saved'
    const autoTimer = useRef(null);
    const skipFirst = useRef(true);
    const buildPartial = () => {
        const out = {};
        if (form.business_name.trim()) out.business_name = form.business_name.trim();
        if (form.contact_name.trim()) out.contact_name = form.contact_name.trim();
        if (form.phone.trim()) out.phone = form.phone.trim();
        if (pins.length) out.pins = pins;
        if (trades.length) out.trades = trades;
        return out;
    };
    const pinsSig = JSON.stringify(pins.map((p) => [p.lat, p.lng, p.radius_miles, p.label]));
    useEffect(() => {
        // Don't fire on the initial render (nothing changed yet).
        if (skipFirst.current) { skipFirst.current = false; return; }
        const payload = buildPartial();
        if (Object.keys(payload).length === 0) return;
        if (autoTimer.current) clearTimeout(autoTimer.current);
        setAutoSave('saving');
        autoTimer.current = setTimeout(async () => {
            try {
                await axiosInstance.post(`/sub-portal/${token}/onboarding`, payload, { suppressErrorToast: true });
                setAutoSave('saved');
            } catch { setAutoSave('idle'); }
        }, 900);
        return () => autoTimer.current && clearTimeout(autoTimer.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.business_name, form.contact_name, form.phone, pinsSig, trades]);

    const saveInfo = async () => {
        if (!form.business_name.trim()) { toast('Business name is required.', 'error'); return; }
        if (!pins.length) { toast('Tap the map to add at least one service pin.', 'error'); return; }
        if (!trades.length) { toast('Pick at least one trade.', 'error'); return; }
        setSavingInfo(true);
        try {
            await axiosInstance.post(`/sub-portal/${token}/onboarding`, {
                business_name: form.business_name.trim(), contact_name: form.contact_name.trim() || undefined,
                phone: form.phone.trim() || undefined, pins, trades,
            });
            toast('Profile saved.', 'success');
            reload();
        } catch { /* */ } finally { setSavingInfo(false); }
    };

    const submit = async () => {
        setSubmitting(true);
        try {
            await axiosInstance.post(`/sub-portal/${token}/submit`);
            toast('Submitted for review!', 'success');
            reload();
        } catch { /* */ } finally { setSubmitting(false); }
    };

    if (portal.status === 'pending_review') {
        return (
            <div className="wizard">
                <div className="review-banner">⏳ Your application is under review. We’ll notify you once you’re approved to receive job offers.</div>
                <div className="card">
                    <h3>Your Documents</h3>
                    <div className="doc-list">{(portal.documents || []).map((d) => <DocRow key={d.doc_type} token={token} doc={d} onUploaded={reload} />)}</div>
                </div>
            </div>
        );
    }

    const docsDone = (portal.documents || []).filter((d) => ['uploaded', 'approved'].includes(d.status)).length;
    const docsTotal = (portal.documents || []).length;
    return (
        <div className="wizard">
            <div className="wizard-intro">Complete your setup to start receiving job offers. It takes about 5 minutes.</div>

            <div className="wizard-grid">
                {/* LEFT — who you are & where you work */}
                <section className="wizard-col">
                    <div className="col-head"><span className="col-kicker">Step 1</span><h2>Your business profile</h2></div>

                    <div className="card">
                        <h3>Business Info</h3>
                        <div className="field"><label>Business / Crew Name</label><input value={form.business_name} onChange={(e) => set('business_name', e.target.value)} placeholder="e.g. Apex Exteriors" /></div>
                        <div className="field"><label>Contact Name</label><input value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} placeholder="Your name" /></div>
                        <div className="field"><label>Phone</label><input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(330) 555-0100" /></div>
                    </div>

                    <div className="card">
                        <h3>Service Area</h3>
                        <ServicePinsEditor pins={pins} setPins={setPins} mapId="wizardPinMap" />
                    </div>

                    <div className="card">
                        <h3>Trades</h3>
                        <p className="muted">Pick every trade your crew works.</p>
                        <div className="trade-chips">{TRADES.map((t) => <button key={t} type="button" className={`trade-chip ${trades.includes(t) ? 'on' : ''}`} onClick={() => toggleTrade(t)}>{tradeLabel(t)}</button>)}</div>
                    </div>

                    <div className="wizard-save">
                        <div>
                            <div className="wizard-save-title">
                                Save your business details
                                {autoSave === 'saving' && <span className="autosave-badge saving"> · Saving…</span>}
                                {autoSave === 'saved' && <span className="autosave-badge saved"> · ✓ Progress saved</span>}
                            </div>
                            <p className="muted">Your progress saves automatically as you type — you can close this and come back to your emailed link anytime. Hit Save to finish this step, then upload documents before submitting.</p>
                        </div>
                        <button className="btn btn-primary btn-busy" onClick={saveInfo} disabled={savingInfo}>{savingInfo ? <><span className="doc-spin dark" />Saving…</> : '💾 Save details'}</button>
                    </div>
                </section>

                {/* RIGHT — paperwork & submit */}
                <section className="wizard-col">
                    <div className="col-head"><span className="col-kicker">Step 2</span><h2>Compliance documents</h2><span className="col-count">{docsDone}/{docsTotal} done</span></div>

                    <div className="card">
                        <p className="muted" style={{ marginTop: 0 }}>Upload each required document. Insurance certificates (COIs) are checked for expiry.</p>
                        <div className="doc-list">{(portal.documents || []).map((d) => <DocRow key={d.doc_type} token={token} doc={d} onUploaded={reload} />)}</div>
                    </div>

                    <button className="btn btn-success btn-block" onClick={submit} disabled={submitting || !portal.ready_to_submit}>
                        {submitting ? 'Submitting…' : portal.ready_to_submit ? 'Submit for Review' : 'Upload all required docs first'}
                    </button>
                </section>
            </div>
        </div>
    );
}

/* =========================================================================
   OFFER CARD  (accept-to-reveal)
   ========================================================================= */
function OfferCard({ token, offer, onResponded }) {
    // Seed from the list row so a pending request (Q2.11) shows on reload without
    // needing to open the card first.
    const [detail, setDetail] = useState(offer.response === 'requested' ? { response: 'requested' } : null);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState('');

    const view = async () => {
        if (open) { setOpen(false); return; }
        try {
            const res = await axiosInstance.get(`/sub-portal/${token}/offers/${offer.dispatch_id}`, { suppressErrorToast: true });
            setDetail(res.data?.data);
            setOpen(true);
        } catch { /* */ }
    };

    const respond = async (action) => {
        setBusy(action);
        try {
            const res = await axiosInstance.post(`/sub-portal/${token}/dispatch/${offer.dispatch_id}/respond`, { action });
            const resp = res.data?.data?.response;
            if (action === 'accept') {
                setDetail((d) => ({ ...(d || {}), ...(res.data?.data || {}), response: resp || 'accepted' }));
                if (resp === 'requested') { setOpen(true); toast('Request sent — pending approval. We’ll notify you once it’s confirmed.', 'success'); }
                else toast('Accepted! Job details revealed below.', 'success');
            } else toast('Declined.', 'info');
            onResponded();
        } catch { /* interceptor shows "already filled" / rate-limit etc. */ } finally { setBusy(''); }
    };

    const accepted = detail?.response === 'accepted';
    const requested = detail?.response === 'requested';
    return (
        <div className="offer-card">
            <div className="offer-top">
                <div>
                    <div className="offer-pay">{money(offer.pay_amount)}</div>
                    <div className="offer-meta">{tradeLabel(offer.trade)} · {offer.area_label} · {offer.distance_miles != null ? `${offer.distance_miles} mi` : 'nearby'}</div>
                </div>
                <div className="offer-exp">Expires {fmtDateTime(offer.expires_at)}</div>
            </div>
            {open && detail && (
                <div className="offer-detail">
                    <div className="offer-scope">{detail.scope_summary}</div>
                    {(detail.photos || []).length > 0 && <div className="muted">📷 {detail.photos.length} photo(s) attached</div>}
                    {requested && (
                        <div className="reveal reveal-pending">
                            <div className="reveal-title">⏳ Request submitted — pending approval</div>
                            <div className="muted">The full address and client details unlock once our team approves your request. We’ll notify you.</div>
                        </div>
                    )}
                    {accepted && (
                        <div className="reveal">
                            <div className="reveal-title">✓ You accepted — full details:</div>
                            <div><strong>Address:</strong> {detail.address || '—'}</div>
                            <div><strong>Client:</strong> {detail.client_name || '—'} · {detail.client_phone || '—'}</div>
                            {detail.access_notes && <div><strong>Access:</strong> {detail.access_notes}</div>}
                            <div><strong>Scheduled:</strong> {fmtDateTime(detail.scheduled_start)}</div>
                        </div>
                    )}
                </div>
            )}
            <div className="offer-actions">
                <button className="btn btn-sm btn-ghost" onClick={view}>{open ? 'Hide' : 'View'}</button>
                {requested && <span className="offer-pending-chip">⏳ Awaiting approval</span>}
                {!accepted && !requested && (
                    <>
                        <button className="btn btn-sm btn-ghost" onClick={() => respond('decline')} disabled={!!busy}>{busy === 'decline' ? '…' : 'Decline'}</button>
                        <button className="btn btn-sm btn-success" onClick={() => respond('accept')} disabled={!!busy}>{busy === 'accept' ? '…' : 'Accept'}</button>
                    </>
                )}
            </div>
        </div>
    );
}

/* ── job status updater + photo upload ── */
const subApiOrigin = () => (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

function JobCard({ token, job, reload }) {
    const inputRef = useRef(null);
    const [busy, setBusy] = useState('');
    const [dateVal, setDateVal] = useState(job.scheduled_start ? String(job.scheduled_start).slice(0, 10) : '');
    const photos = Array.isArray(job.completion_photos) ? job.completion_photos : [];

    // Q3.10 — images this sub may see on the job: their own uploads + office
    // photos toggled visible to them. Token routes are public, so a plain <img>
    // src on the streamed file works (no auth header needed).
    const [images, setImages] = useState([]);
    const [imgBust, setImgBust] = useState(0);
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const r = await axiosInstance.get(`/sub-portal/${token}/jobs/${job.id}/images`, { suppressErrorToast: true });
                if (!cancelled) setImages(Array.isArray(r.data?.data) ? r.data.data : []);
            } catch { if (!cancelled) setImages([]); }
        })();
        return () => { cancelled = true; };
    }, [token, job.id, imgBust]);
    const windows = Array.isArray(job.availability_windows) ? job.availability_windows : [];
    const fmtDay = (d) => d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

    const setStatus = async (status) => {
        setBusy('status');
        try { await axiosInstance.post(`/sub-portal/${token}/jobs/${job.id}/status`, { status }); toast('Status updated.', 'success'); reload(); }
        catch { /* */ } finally { setBusy(''); }
    };

    // Q3.8 — "On the Way": notify the client with an arrival window.
    const [otwOpen, setOtwOpen] = useState(false);
    const [otwTime, setOtwTime] = useState('09:00');
    const [otwBuf, setOtwBuf] = useState(30);
    const otwPreview = (() => {
        const m = /^(\d{1,2}):(\d{2})$/.exec(otwTime);
        if (!m) return '';
        const mins = +m[1] * 60 + +m[2], half = Math.round(otwBuf / 2);
        const fmt = (t) => { t = ((t % 1440) + 1440) % 1440; const h = Math.floor(t / 60), mm = t % 60; const ap = h < 12 ? 'AM' : 'PM'; const h12 = h % 12 === 0 ? 12 : h % 12; return `${h12}:${String(mm).padStart(2, '0')} ${ap}`; };
        return `${fmt(mins - half)} – ${fmt(mins + half)}`;
    })();
    const sendOtw = async () => {
        setBusy('otw');
        try {
            await axiosInstance.post(`/sub-portal/${token}/jobs/${job.id}/on-the-way`, { arrival: otwTime, buffer_minutes: otwBuf });
            toast(`Client notified — arriving ${otwPreview}`, 'success');
            setOtwOpen(false);
        } catch { /* interceptor */ } finally { setBusy(''); }
    };

    // Q2.9 — the sub sets the actual install date (server validates it's inside
    // the availability windows / before the deadline, and notifies the client).
    const saveDate = async () => {
        if (!dateVal) { toast('Pick a date first.', 'error'); return; }
        setBusy('date');
        try {
            await axiosInstance.post(`/sub-portal/${token}/jobs/${job.id}/schedule`, { scheduled_start: dateVal });
            toast('Date set — the client has been notified.', 'success');
            reload();
        } catch { /* interceptor shows the out-of-window / past-deadline message */ } finally { setBusy(''); }
    };
    const uploadPhoto = async (file) => {
        if (!file) return;
        setBusy('photo');
        try { const fd = new FormData(); fd.append('file', file); fd.append('phase', 'completion'); await axiosInstance.post(`/sub-portal/${token}/jobs/${job.id}/photos`, fd); toast('Photo added.', 'success'); setImgBust((n) => n + 1); reload(); }
        catch { /* */ } finally { setBusy(''); }
    };

    // Q0.3: a sub may PRINT one job at a time (own accepted job only) — never a
    // list, never an export. This prints just this single card's job.
    const printJob = () => {
        const esc = (v) => String(v ?? '—').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
        const row = (l, v) => `<tr><th style="text-align:left;padding:6px 12px 6px 0;color:#555;white-space:nowrap;vertical-align:top">${l}</th><td style="padding:6px 0">${esc(v)}</td></tr>`;
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>Job ${esc(job.job_number)}</title>
            <style>body{font-family:system-ui,Arial,sans-serif;color:#111;margin:32px;max-width:640px}
            h1{font-size:20px;margin:0 0 4px}h2{font-size:13px;font-weight:600;color:#888;margin:0 0 20px;text-transform:uppercase;letter-spacing:.05em}
            table{border-collapse:collapse;width:100%}</style></head><body>
            <h1>Job ${esc(job.job_number)}</h1><h2>Accepted job — work order</h2>
            <table>
              ${row('Status', (job.readiness_state || '').replace(/_/g, ' '))}
              ${row('Address', job.address)}
              ${row('Scope of work', job.scope)}
              ${job.scheduled_start ? row('Scheduled', fmtDateTime(job.scheduled_start)) : ''}
              ${row('Progress', (job.sub_progress || 'not started').replace(/_/g, ' '))}
              ${row('Completion photos', `${photos.length} on file`)}
            </table>
            <p style="margin-top:32px;font-size:12px;color:#999">Printed ${new Date().toLocaleString()}</p>
            </body></html>`;
        const w = window.open('', '_blank', 'width=720,height=800');
        if (!w) { toast('Allow pop-ups to print this job.', 'error'); return; }
        w.document.write(html);
        w.document.close();
        w.focus();
        w.print();
    };

    const steps = [['on_my_way', 'On My Way'], ['started', 'Started'], ['complete', 'Complete']];
    return (
        <div className="job-card">
            <div className="jc-top">
                <div className="jc-num">{job.job_number}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="jc-state">{(job.readiness_state || '').replace(/_/g, ' ')}</span>
                    <button className="btn btn-sm btn-ghost" onClick={printJob} title="Print this job">🖨 Print</button>
                </div>
            </div>
            <div className="jc-addr">{job.address || '—'}</div>
            {job.scope && <div className="jc-scope">{job.scope}</div>}

            {/* Q2.9 — availability windows + deadline + the sub sets the actual date */}
            <div className="jc-schedule">
                {windows.length > 0 && (
                    <div className="jc-windows">
                        <div className="jc-sched-label">You must work within:</div>
                        {windows.map((w, i) => (
                            <div className="jc-window" key={i}>📆 {fmtDay(w.start)}{w.end && w.end !== w.start ? ` – ${fmtDay(w.end)}` : ''}{w.note ? <span className="jc-window-note"> — {w.note}</span> : null}</div>
                        ))}
                    </div>
                )}
                {job.complete_by && <div className="jc-deadline">⏳ Complete by <strong>{fmtDay(job.complete_by)}</strong></div>}
                <div className="jc-setdate">
                    <label className="jc-sched-label">{job.scheduled_start ? 'Your scheduled date' : 'Set your date'}</label>
                    <div className="jc-setdate-row">
                        <input type="date" value={dateVal} onChange={(e) => setDateVal(e.target.value)} disabled={busy === 'date'} />
                        <button className="btn btn-sm btn-success" disabled={busy === 'date' || !dateVal} onClick={saveDate}>{busy === 'date' ? 'Saving…' : (job.scheduled_start ? 'Update date' : 'Set date')}</button>
                    </div>
                    {job.scheduled_start && <div className="muted">📅 Currently: {fmtDay(job.scheduled_start)}</div>}
                </div>
            </div>

            {/* Q3.8 — On the Way: notify the client with an arrival window */}
            <div className="jc-otw">
                {!otwOpen ? (
                    <button className="btn btn-sm btn-secondary" onClick={() => setOtwOpen(true)}>🚗 On the Way</button>
                ) : (
                    <div className="jc-otw-box">
                        <div className="jc-sched-label">Client will be told you arrive: <strong>{otwPreview}</strong></div>
                        <div className="jc-otw-row">
                            <input type="time" value={otwTime} onChange={(e) => setOtwTime(e.target.value)} />
                            <select value={otwBuf} onChange={(e) => setOtwBuf(Number(e.target.value))}>
                                {[10, 15, 20, 30, 45, 60].map((b) => <option key={b} value={b}>± {b}m</option>)}
                            </select>
                            <button className="btn btn-sm btn-ghost" onClick={() => setOtwOpen(false)}>Cancel</button>
                            <button className="btn btn-sm btn-success" disabled={busy === 'otw'} onClick={sendOtw}>{busy === 'otw' ? 'Sending…' : 'Notify'}</button>
                        </div>
                    </div>
                )}
            </div>

            <div className="jc-steps">
                {steps.map(([s, label]) => (
                    <button key={s} className={`step-btn ${job.sub_progress === s ? 'on' : ''}`} disabled={busy === 'status'} onClick={() => setStatus(s)}>{label}</button>
                ))}
            </div>

            <div className="jc-photos">
                <div className="muted">Completion photos ({photos.length}) — required before marking complete.</div>
                <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => uploadPhoto(e.target.files?.[0])} />
                <button className="btn btn-sm btn-ghost" disabled={busy === 'photo'} onClick={() => inputRef.current?.click()}>{busy === 'photo' ? 'Uploading…' : '📷 Add Photo'}</button>
            </div>

            {/* Q3.10 — images visible to this sub: their own + office-shared */}
            {images.length > 0 && (
                <div className="jc-imgstrip">
                    {images.map((im) => (
                        <div className="jc-img" key={im.id} title={im.caption || ''}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`${subApiOrigin()}/sub-portal/${token}/jobs/${job.id}/images/${im.id}/file`} alt={im.caption || 'Job photo'} loading="lazy" />
                            {im.shared_by_office && <span className="jc-img-tag">shared</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* =========================================================================
   ACTIVE PORTAL  (tabs)
   ========================================================================= */
function ActivePortal({ token, portal, reload }) {
    const [tab, setTab] = useState('offers');
    const [offers, setOffers] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [payments, setPayments] = useState({ payments: [], ytd_paid: 0 });
    const [loading, setLoading] = useState(true);

    const loadTab = useCallback(async () => {
        setLoading(true);
        try {
            if (tab === 'offers') { const r = await axiosInstance.get(`/sub-portal/${token}/offers`, { suppressErrorToast: true }); setOffers(r.data?.data || []); }
            else if (tab === 'jobs') { const r = await axiosInstance.get(`/sub-portal/${token}/jobs`, { suppressErrorToast: true }); setJobs(r.data?.data || []); }
            else if (tab === 'payments') { const r = await axiosInstance.get(`/sub-portal/${token}/payments`, { suppressErrorToast: true }); setPayments(r.data?.data || { payments: [], ytd_paid: 0 }); }
        } catch { /* */ } finally { setLoading(false); }
    }, [tab, token]);
    useEffect(() => { loadTab(); }, [loadTab]);

    const TABS = [['offers', 'Offers'], ['jobs', 'My Jobs'], ['payments', 'Pay'], ['docs', 'Docs'], ['profile', 'Profile']];

    return (
        <div className="active-portal">
            <div className="tab-bar">
                {TABS.map(([t, label]) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{label}</button>)}
            </div>
            <div className="tab-body">
                {loading && ['offers', 'jobs', 'payments'].includes(tab) ? (
                    <div className="muted" style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>
                ) : tab === 'offers' ? (
                    offers.length ? offers.map((o) => <OfferCard key={o.dispatch_id} token={token} offer={o} onResponded={loadTab} />) : <div className="empty">No open offers right now.</div>
                ) : tab === 'jobs' ? (
                    jobs.length ? jobs.map((j) => <JobCard key={j.id} token={token} job={j} reload={loadTab} />) : <div className="empty">No jobs assigned yet.</div>
                ) : tab === 'payments' ? (
                    <>
                        <div className="ytd-card">YTD Paid<span>{money(payments.ytd_paid)}</span></div>
                        {(payments.payments || []).length ? payments.payments.map((p) => (
                            <div className="pay-row" key={p.id}><span>{money(p.amount)} · {p.method || '—'}</span><span className="muted">{fmtDate(p.paid_at || p.created_at)} · {p.status}</span></div>
                        )) : <div className="empty">No payments yet.</div>}
                    </>
                ) : tab === 'docs' ? (
                    <div className="card"><h3>My Documents</h3><div className="doc-list">{(portal.documents || []).map((d) => <DocRow key={d.doc_type} token={token} doc={d} onUploaded={reload} />)}</div></div>
                ) : (
                    <ProfileTab token={token} portal={portal} reload={reload} />
                )}
            </div>
        </div>
    );
}

function ProfileTab({ token, portal, reload }) {
    const p = portal.profile || {};
    const [form, setForm] = useState({ business_name: p.business_name || '', contact_name: p.contact_name || '', phone: p.phone || '' });
    const [pins, setPins] = useState(() => seedPins(portal)); // Q2.2 multi-pin
    const [trades, setTrades] = useState(p.trades || []);
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const toggleTrade = (t) => setTrades((ts) => ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]);

    const save = async () => {
        if (!pins.length) { toast('Add at least one service pin.', 'error'); return; }
        setSaving(true);
        try {
            await axiosInstance.post(`/sub-portal/${token}/onboarding`, {
                business_name: form.business_name.trim(), contact_name: form.contact_name.trim() || undefined, phone: form.phone.trim() || undefined,
                pins, trades,
            });
            toast('Profile updated.', 'success'); reload();
        } catch { /* */ } finally { setSaving(false); }
    };

    return (
        <div className="card">
            <h3>My Profile</h3>
            <div className="field"><label>Business Name</label><input value={form.business_name} onChange={(e) => set('business_name', e.target.value)} /></div>
            <div className="field"><label>Contact Name</label><input value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} /></div>
            <div className="field"><label>Phone</label><input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
            <div style={{ marginTop: '0.75rem' }}><label className="field-label">Service Locations</label><ServicePinsEditor pins={pins} setPins={setPins} mapId="profilePinMap" /></div>
            <div style={{ marginTop: '0.75rem' }}><label className="field-label">Trades</label><div className="trade-chips">{TRADES.map((t) => <button key={t} type="button" className={`trade-chip ${trades.includes(t) ? 'on' : ''}`} onClick={() => toggleTrade(t)}>{tradeLabel(t)}</button>)}</div></div>
            <button className="btn btn-primary btn-block" style={{ marginTop: '1rem' }} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Profile'}</button>
        </div>
    );
}

/* =========================================================================
   ROOT
   ========================================================================= */
export default function SubPortal({ token }) {
    const [portal, setPortal] = useState(undefined); // undefined=loading, null=not found
    const load = useCallback(async () => {
        try { const res = await axiosInstance.get(`/sub-portal/${token}`, { suppressErrorToast: true }); setPortal(res.data?.data); }
        catch { setPortal(null); }
    }, [token]);
    useEffect(() => { load(); }, [load]);

    if (portal === undefined) return <div className="sub-portal"><div className="sp-loading">Loading your portal…</div></div>;
    if (portal === null) return <div className="sub-portal"><div className="sp-error">This link is invalid or has expired. Please contact the company that invited you.</div></div>;

    const name = portal.profile?.business_name || 'Contractor';
    return (
        <div className="sub-portal">
            <div className="sp-header">
                <div className="sp-brand">👷 Contractor Portal</div>
                <div className="sp-name">{name}{portal.status === 'suspended' && <span className="sp-suspended">Suspended</span>}</div>
            </div>
            <div className="sp-content">
                {portal.status === 'active'
                    ? <ActivePortal token={token} portal={portal} reload={load} />
                    : <Wizard token={token} portal={portal} reload={load} />}
            </div>
        </div>
    );
}
