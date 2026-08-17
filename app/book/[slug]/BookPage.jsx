'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './book.css';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const HCAPTCHA_SITEKEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY || '';

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const fmtDayLabel = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

const TYPE_LABEL = { estimate: 'Free Estimate', inspection: 'Inspection', adjuster_meeting: 'Adjuster Meeting', install: 'Install', follow_up: 'Follow-up' };

const MAX_DAYS = 60;        // how far forward the day nav may page
const AUTO_SCAN_MAX = 14;   // how many empty days to auto-skip on first load

export default function BookPage({ slug }) {
    const [phase, setPhase] = useState('loading');       // loading | notfound | pick | form | done | error
    const [info, setInfo] = useState(null);              // { rep_name, company_name, types }
    const [dayOffset, setDayOffset] = useState(0);
    const [slots, setSlots] = useState(null);            // null = loading, [] = none
    const [slotsErr, setSlotsErr] = useState(false);     // true = fetch failed (distinct from empty)
    const [slot, setSlot] = useState(null);              // chosen slot { start }
    const [fieldErr, setFieldErr] = useState('');        // 'name' | 'contact' — highlights the bad field
    const [type, setType] = useState('estimate');
    const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });
    const [submitting, setSubmitting] = useState(false);
    const [err, setErr] = useState('');
    const [confirm, setConfirm] = useState(null);
    const [hp, setHp] = useState('');                    // honeypot — must stay empty
    const loadedAt = useRef(Date.now());                 // for the min-time bot trap
    const captchaRef = useRef(null);
    const captchaWidget = useRef(null);

    const date = useMemo(() => { const d = new Date(); d.setDate(d.getDate() + dayOffset); d.setHours(0, 0, 0, 0); return d; }, [dayOffset]);

    // Landing payload + jump to the first day that has openings.
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API}/book/${encodeURIComponent(slug)}`);
                if (res.status === 404) { setPhase('notfound'); return; }
                if (!res.ok) throw new Error('load');
                const json = await res.json();
                setInfo(json.data);
                if (json.data?.types?.length) setType(json.data.types[0]);
                // Find the first upcoming day with open slots so we never land on an empty screen.
                let firstOpen = 0;
                for (let o = 0; o <= AUTO_SCAN_MAX; o++) {
                    const d = new Date(); d.setDate(d.getDate() + o); d.setHours(0, 0, 0, 0);
                    try {
                        const r = await fetch(`${API}/book/${encodeURIComponent(slug)}/slots?date=${ymd(d)}`);
                        if (!r.ok) break;                       // give up scanning on error; land on today
                        const j = await r.json();
                        if ((j.data?.slots || []).length) { firstOpen = o; break; }
                    } catch { break; }
                }
                setDayOffset(firstOpen);
                setPhase('pick');
            } catch { setPhase('error'); }
        })();
    }, [slug]);

    // Slots for the selected day.
    const loadSlots = useCallback(async () => {
        setSlots(null);
        setSlotsErr(false);
        try {
            const res = await fetch(`${API}/book/${encodeURIComponent(slug)}/slots?date=${ymd(date)}`);
            if (!res.ok) throw new Error('slots');
            const json = await res.json();
            setSlots(json.data?.slots || []);
        } catch { setSlots([]); setSlotsErr(true); }
    }, [slug, date]);

    useEffect(() => { if (phase === 'pick' || phase === 'form') loadSlots(); }, [loadSlots, phase]);

    // Optional hCaptcha — only if a sitekey is configured. Loads the script once.
    useEffect(() => {
        if (phase !== 'form' || !HCAPTCHA_SITEKEY) return;
        const render = () => {
            if (!captchaRef.current || captchaWidget.current !== null || !window.hcaptcha) return;
            captchaWidget.current = window.hcaptcha.render(captchaRef.current, { sitekey: HCAPTCHA_SITEKEY });
        };
        if (window.hcaptcha) { render(); return; }
        const existing = document.getElementById('hcaptcha-script');
        if (!existing) {
            const s = document.createElement('script');
            s.id = 'hcaptcha-script';
            s.src = 'https://js.hcaptcha.com/1/api.js?render=explicit';
            s.async = true; s.defer = true;
            s.onload = render;
            document.head.appendChild(s);
        } else { existing.addEventListener('load', render); }
    }, [phase]);

    const pickSlot = (s) => { setSlot(s); setPhase('form'); setErr(''); setFieldErr(''); };
    const stepDay = (delta) => { setDayOffset((o) => Math.min(MAX_DAYS, Math.max(0, o + delta))); };

    const submit = async () => {
        setErr(''); setFieldErr('');
        if (!form.name.trim()) { setErr('Please enter your name.'); setFieldErr('name'); return; }
        if (!form.phone.trim() && !form.email.trim()) { setErr('Please add a phone number or email so we can confirm.'); setFieldErr('contact'); return; }
        let captchaToken;
        if (HCAPTCHA_SITEKEY && window.hcaptcha && captchaWidget.current !== null) {
            captchaToken = window.hcaptcha.getResponse(captchaWidget.current);
            if (!captchaToken) { setErr('Please complete the captcha.'); return; }
        }
        setSubmitting(true);
        try {
            const res = await fetch(`${API}/book/${encodeURIComponent(slug)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name, phone: form.phone, email: form.email,
                    address: form.address, notes: form.notes, type,
                    slot_start: slot.start, captcha_token: captchaToken,
                    website: hp, elapsed_ms: Date.now() - loadedAt.current,
                }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                if (res.status === 409) throw new Error('That time was just taken — please pick another slot.');
                throw new Error(json?.message || 'Could not complete your booking. Please try again.');
            }
            setConfirm(json.data);
            setPhase('done');
        } catch (e) {
            setErr(e.message);
            if (HCAPTCHA_SITEKEY && window.hcaptcha && captchaWidget.current !== null) {
                try { window.hcaptcha.reset(captchaWidget.current); } catch { /* noop */ }
            }
        } finally {
            setSubmitting(false);
        }
    };

    // ── render ────────────────────────────────────────────────────────────────
    if (phase === 'loading') return <Shell><div className="bk-center ck-load-block"><span className="ck-spinner" /><span>Loading…</span></div></Shell>;
    if (phase === 'notfound') return <Shell><div className="bk-center"><h2>Booking page not found</h2><p>This link may be disabled or incorrect.</p></div></Shell>;
    if (phase === 'error') return <Shell><div className="bk-center"><h2>Something went wrong</h2><p>Please refresh and try again.</p></div></Shell>;

    if (phase === 'done') return (
        <Shell info={info}>
            <div className="bk-done">
                <div className="bk-check">✓</div>
                <h2>You're booked!</h2>
                <p><strong>{confirm?.confirmed_for}</strong></p>
                <p className="bk-muted">{confirm?.rep_name} from {confirm?.company_name} will see you then. We'll send a reminder before your appointment.</p>
            </div>
        </Shell>
    );

    return (
        <Shell info={info}>
            {/* Type selector — only while choosing a time */}
            {phase === 'pick' && info?.types?.length > 1 && (
                <div className="bk-types">
                    {info.types.map((t) => (
                        <button key={t} className={`bk-type ${type === t ? 'active' : ''}`} onClick={() => setType(t)}>
                            {TYPE_LABEL[t] || t}
                        </button>
                    ))}
                </div>
            )}

            {/* Day nav — only while choosing a time */}
            {phase === 'pick' && (
                <div className="bk-daynav">
                    <button className="bk-daybtn" disabled={dayOffset === 0} onClick={() => stepDay(-1)} aria-label="Previous day">‹</button>
                    <span className="bk-daylabel">{fmtDayLabel(date)}</span>
                    <button className="bk-daybtn" disabled={dayOffset >= MAX_DAYS} onClick={() => stepDay(1)} aria-label="Next day">›</button>
                </div>
            )}

            {phase === 'pick' && (
                <div className="bk-slots">
                    {slots === null && <div className="bk-slots-msg"><span className="bk-muted ck-load-inline"><span className="ck-spinner sm" />Loading times…</span></div>}
                    {slots !== null && slotsErr && (
                        <div className="bk-slots-msg">
                            <div className="bk-muted">Couldn't load available times.</div>
                            <button className="bk-retry" onClick={loadSlots}>Try again</button>
                        </div>
                    )}
                    {slots?.length === 0 && !slotsErr && <div className="bk-muted bk-slots-msg">No open times this day — try another date.</div>}
                    {slots?.map((s) => (
                        <button key={s.start} className="bk-slot" onClick={() => pickSlot(s)}>{fmtTime(s.start)}</button>
                    ))}
                </div>
            )}

            {phase === 'form' && (
                <div className="bk-form">
                    <div className="bk-chosen">
                        <span>{TYPE_LABEL[type] || type} · {fmtDayLabel(new Date(slot.start))} at {fmtTime(slot.start)}</span>
                        <button className="bk-change" onClick={() => { setPhase('pick'); setSlot(null); setErr(''); setFieldErr(''); }}>Change</button>
                    </div>
                    <label htmlFor="bk-name">Your name *</label>
                    <input id="bk-name" className={fieldErr === 'name' ? 'invalid' : ''} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Homeowner" />
                    <div className="bk-grid2">
                        <div><label htmlFor="bk-phone">Phone</label><input id="bk-phone" className={fieldErr === 'contact' ? 'invalid' : ''} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" /></div>
                        <div><label htmlFor="bk-email">Email</label><input id="bk-email" className={fieldErr === 'contact' ? 'invalid' : ''} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@email.com" /></div>
                    </div>
                    <div className="bk-hint">Add a phone number or email so we can confirm.</div>
                    <label htmlFor="bk-address">Property address</label>
                    <input id="bk-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main St, City, ST" />
                    <label htmlFor="bk-notes">Anything we should know?</label>
                    <textarea id="bk-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="e.g. Hail damage after last week's storm" />
                    {/* Honeypot — hidden from humans, bots tend to fill it. Not a real field. */}
                    <input
                        type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
                        value={hp} onChange={(e) => setHp(e.target.value)}
                        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
                    />
                    {HCAPTCHA_SITEKEY && <div ref={captchaRef} className="bk-captcha" />}
                    {err && <div className="bk-err">{err}</div>}
                    <button className="bk-submit" disabled={submitting} onClick={submit}>
                        {submitting ? 'Booking…' : `Confirm ${fmtDayLabel(new Date(slot.start))}, ${fmtTime(slot.start)}`}
                    </button>
                </div>
            )}
        </Shell>
    );
}

function Shell({ info, children }) {
    return (
        <div className="book-page">
            <div className="bk-card">
                <div className="bk-header">
                    {info?.has_logo && info?.company_id && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            className="bk-logo"
                            src={`${API}/portal-public/company/${info.company_id}/logo`}
                            alt={info.company_name || 'Company logo'}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                    )}
                    <div className="bk-brand">{info?.company_name || 'ClaimKing'}</div>
                    {info?.rep_name && <div className="bk-sub">Book with {info.rep_name}</div>}
                </div>
                <div className="bk-body">{children}</div>
                <div className="bk-footer">Powered by ClaimKing.AI</div>
            </div>
        </div>
    );
}
