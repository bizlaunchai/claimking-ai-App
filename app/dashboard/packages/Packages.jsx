'use client';

// QA Q3.17 — admin manager for sellable packages / memberships / gift
// certificates. Define what the company sells here; sell them to a client from
// the claim detail page; redeem at booking.

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance';
import { usePermissions } from '@/lib/permissions/PermissionsContext';

const KINDS = [
    { key: 'package', label: 'Package (N sessions)' },
    { key: 'membership', label: 'Membership' },
    { key: 'gift_certificate', label: 'Gift certificate' },
];
const KIND_META = {
    package: { label: 'Package', bg: '#eef2ff', fg: '#4338ca', icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96 12 12.01l8.73-5.05 M12 22.08V12' },
    membership: { label: 'Membership', bg: '#ecfeff', fg: '#0e7490', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75' },
    gift_certificate: { label: 'Gift certificate', bg: '#fdf2f8', fg: '#be185d', icon: 'M20 12v10H4V12 M2 7h20v5H2z M12 22V7 M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z' },
};
const money = (cents) => `$${((Number(cents) || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const blank = { name: '', kind: 'package', description: '', price_dollars: '', total_uses: 2, appointment_type: '', validity_days: '' };

function Spin({ size = 14 }) {
    return (
        <svg className="pk-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ verticalAlign: '-2px' }}>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
}
function KindIcon({ kind }) {
    const paths = (KIND_META[kind]?.icon || '').split(' M').map((p, i) => (i === 0 ? p : 'M' + p));
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {paths.map((d, i) => <path key={i} d={d} />)}
        </svg>
    );
}

export default function Packages() {
    const { has } = usePermissions();
    const canManage = has('record_payments');
    const [rows, setRows] = useState([]);
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null); // null | 'new' | row

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [defs, t] = await Promise.all([
                axiosInstance.get('/packages', { params: { all: 1 }, suppressErrorToast: true }),
                axiosInstance.get('/appointment-types', { suppressErrorToast: true }).catch(() => ({ data: { data: [] } })),
            ]);
            setRows(defs.data?.data || []);
            setTypes(t.data?.data || []);
        } catch { setRows([]); } finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    return (
        <div className="pk-wrap">
            <div className="pk-head">
                <div>
                    <h1 className="pk-title">Packages &amp; Memberships</h1>
                    <p className="pk-sub">Sellable inspection packages, memberships and gift certificates. Sell them to a client from their claim page; redeem at booking.</p>
                </div>
                {canManage && <button className="pk-btn pk-btn-primary" onClick={() => setEditing('new')}><span style={{ fontSize: 16, lineHeight: 1 }}>＋</span> New package</button>}
            </div>

            {loading ? (
                <div className="pk-grid">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div className="pk-card" key={i}>
                            <div className="pk-skel" style={{ width: 90, height: 20, borderRadius: 999 }} />
                            <div className="pk-skel" style={{ width: '70%', height: 20, marginTop: 12 }} />
                            <div className="pk-skel" style={{ width: '90%', height: 13, marginTop: 8 }} />
                            <div className="pk-skel" style={{ width: '50%', height: 15, marginTop: 14 }} />
                        </div>
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <div className="pk-empty">
                    <div className="pk-empty-ic"><KindIcon kind="package" /></div>
                    <div className="pk-empty-title">No packages yet</div>
                    <div className="pk-empty-sub">Create something clients can buy — e.g. a 2-visit annual inspection plan.</div>
                    {canManage && <button className="pk-btn pk-btn-primary" style={{ marginTop: 14 }} onClick={() => setEditing('new')}>＋ New package</button>}
                </div>
            ) : (
                <div className="pk-grid">
                    {rows.map((r) => {
                        const m = KIND_META[r.kind] || KIND_META.package;
                        return (
                            <div className={`pk-card ${r.is_active ? '' : 'off'}`} key={r.id}>
                                <div className="pk-card-top">
                                    <span className="pk-kind" style={{ background: m.bg, color: m.fg }}><KindIcon kind={r.kind} /> {m.label}</span>
                                    {!r.is_active && <span className="pk-tag">Hidden</span>}
                                </div>
                                <div className="pk-name">{r.name}</div>
                                {r.description && <div className="pk-desc">{r.description}</div>}
                                <div className="pk-price-row">
                                    <span className="pk-price">{money(r.price_cents)}</span>
                                    {r.total_uses != null && <span className="pk-chip">{r.total_uses} session{r.total_uses === 1 ? '' : 's'}</span>}
                                    {r.appointment_type && <span className="pk-chip">{r.appointment_type.replace(/_/g, ' ')}</span>}
                                    {r.validity_days && <span className="pk-chip">valid {r.validity_days}d</span>}
                                </div>
                                {canManage && (
                                    <div className="pk-actions">
                                        <button className="pk-mini" onClick={() => setEditing(r)}>Edit</button>
                                        {r.is_active && <button className="pk-mini danger" onClick={async () => { await axiosInstance.delete(`/packages/${r.id}`); toast.success('Hidden'); load(); }}>Hide</button>}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {editing && <EditModal row={editing === 'new' ? null : editing} types={types} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}

            <style jsx>{`
                .pk-wrap { padding: 1.75rem; max-width: 1100px; margin: 0 auto; }
                .pk-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
                .pk-title { font-size: 1.55rem; font-weight: 800; color: #1a1f3a; margin: 0; letter-spacing: -.02em; }
                .pk-sub { color: #6b7280; font-size: .9rem; margin: .3rem 0 0; max-width: 640px; line-height: 1.5; }
                .pk-btn { display: inline-flex; align-items: center; gap: 6px; border: none; border-radius: 10px; padding: .6rem 1.1rem; font-weight: 700; font-size: .88rem; cursor: pointer; }
                .pk-btn-primary { background: #1a1f3a; color: #fff; box-shadow: 0 4px 12px rgba(26,31,58,.2); }
                .pk-btn-primary:hover { background: #2b3358; }
                .pk-empty { padding: 3.5rem 1rem; text-align: center; background: #fff; border: 1px solid #eef0f4; border-radius: 16px; }
                .pk-empty-ic { width: 54px; height: 54px; margin: 0 auto 14px; border-radius: 14px; background: #eef2ff; color: #4338ca; display: flex; align-items: center; justify-content: center; }
                .pk-empty-title { font-size: 1.1rem; font-weight: 800; color: #1a1f3a; }
                .pk-empty-sub { color: #6b7280; font-size: .88rem; margin-top: 4px; }
                .pk-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.1rem; }
                .pk-card { background: #fff; border: 1px solid #eef0f4; border-radius: 16px; padding: 1.15rem; box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 6px 18px rgba(15,23,42,.05); transition: transform .18s ease, box-shadow .18s ease; }
                .pk-card:hover { transform: translateY(-2px); box-shadow: 0 2px 4px rgba(15,23,42,.06), 0 14px 30px rgba(15,23,42,.1); }
                .pk-card.off { opacity: .6; }
                .pk-card-top { display: flex; justify-content: space-between; align-items: center; }
                .pk-kind { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; }
                .pk-tag { font-size: 10px; font-weight: 700; color: #92400e; background: #fef3c7; padding: 3px 9px; border-radius: 999px; }
                .pk-name { font-size: 1.1rem; font-weight: 800; color: #1a1f3a; margin: .7rem 0 .2rem; letter-spacing: -.01em; }
                .pk-desc { font-size: .84rem; color: #6b7280; line-height: 1.45; }
                .pk-price-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: .85rem; }
                .pk-price { font-weight: 800; color: #059669; font-size: 1.15rem; }
                .pk-chip { font-size: 11px; font-weight: 600; color: #475569; background: #f1f5f9; padding: 3px 9px; border-radius: 999px; text-transform: capitalize; }
                .pk-actions { display: flex; gap: .45rem; margin-top: .9rem; border-top: 1px solid #f0f1f4; padding-top: .75rem; }
                .pk-mini { border: 1px solid #e5e7eb; background: #fff; border-radius: 8px; padding: .38rem .8rem; font-size: 12px; font-weight: 700; cursor: pointer; color: #374151; transition: background .12s; }
                .pk-mini:hover { background: #f9fafb; }
                .pk-mini.danger { color: #b91c1c; border-color: #fecaca; }
                .pk-mini.danger:hover { background: #fef2f2; }
                .pk-skel { background: linear-gradient(90deg,#eef0f4 25%,#f7f8fa 37%,#eef0f4 63%); background-size: 200% 100%; animation: pk-sh 1.4s ease-in-out infinite; border-radius: 6px; }
                :global(.pk-spin) { animation: pk-spin .7s linear infinite; }
                @keyframes pk-sh { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
                @keyframes pk-spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

function EditModal({ row, types, onClose, onSaved }) {
    const [f, setF] = useState(row
        ? { name: row.name, kind: row.kind, description: row.description || '', price_dollars: (row.price_cents / 100) || '', total_uses: row.total_uses ?? '', appointment_type: row.appointment_type || '', validity_days: row.validity_days ?? '' }
        : blank);
    const [busy, setBusy] = useState(false);
    const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
        return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    }, [onClose]);

    const save = async () => {
        if (!f.name.trim()) { toast.error('Name is required.'); return; }
        setBusy(true);
        try {
            const body = {
                name: f.name.trim(), kind: f.kind, description: f.description.trim() || null,
                price_cents: Math.round((Number(f.price_dollars) || 0) * 100),
                total_uses: f.kind === 'package' ? Math.max(1, Number(f.total_uses) || 1) : (f.total_uses === '' ? null : Number(f.total_uses)),
                appointment_type: f.appointment_type || null,
                validity_days: f.validity_days === '' ? null : Number(f.validity_days),
            };
            if (row) await axiosInstance.patch(`/packages/${row.id}`, body);
            else await axiosInstance.post('/packages', body);
            toast.success(row ? 'Saved' : 'Package created');
            onSaved();
        } catch (e) { toast.error(e?.response?.data?.message || 'Save failed'); }
        finally { setBusy(false); }
    };

    // Portal to body — the dashboard layout has a transformed ancestor that would
    // otherwise trap position:fixed and render this inline instead of centered.
    if (typeof document === 'undefined') return null;
    return createPortal(
        <div className="pkm-back" onClick={onClose}>
            <div className="pkm" onClick={(e) => e.stopPropagation()}>
                <div className="pkm-head">
                    <h2 className="pkm-title">{row ? 'Edit package' : 'New package'}</h2>
                    <button className="pkm-x" onClick={onClose} aria-label="Close">×</button>
                </div>
                <div className="pkm-body">
                    <label className="pkm-l">Name</label>
                    <input className="pkm-i" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Annual Inspection Plan" autoFocus />
                    <label className="pkm-l">Type</label>
                    <select className="pkm-i" value={f.kind} onChange={(e) => set('kind', e.target.value)}>{KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}</select>
                    <div className="pkm-row">
                        <div><label className="pkm-l">Price ($)</label><input className="pkm-i" type="number" min="0" step="0.01" value={f.price_dollars} onChange={(e) => set('price_dollars', e.target.value)} placeholder="200" /></div>
                        <div><label className="pkm-l">Sessions</label><input className="pkm-i" type="number" min="1" value={f.total_uses} onChange={(e) => set('total_uses', e.target.value)} placeholder={f.kind === 'package' ? '2' : 'optional'} /></div>
                    </div>
                    <div className="pkm-row">
                        <div><label className="pkm-l">Applies to type</label>
                            <select className="pkm-i" value={f.appointment_type} onChange={(e) => set('appointment_type', e.target.value)}>
                                <option value="">Any type</option>
                                {types.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                            </select>
                        </div>
                        <div><label className="pkm-l">Valid (days)</label><input className="pkm-i" type="number" min="1" value={f.validity_days} onChange={(e) => set('validity_days', e.target.value)} placeholder="no expiry" /></div>
                    </div>
                    <label className="pkm-l">Description</label>
                    <textarea className="pkm-i" rows={2} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Two roof inspections over 12 months." />
                </div>
                <div className="pkm-foot">
                    <button className="pkm-btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
                    <button className="pkm-btn primary" onClick={save} disabled={busy}>{busy ? <><Spin /> Saving…</> : 'Save package'}</button>
                </div>
            </div>
            <style jsx>{`
                .pkm-back { position: fixed; inset: 0; background: rgba(15,23,42,.55); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 100000; padding: 1rem; animation: pkm-fade .15s ease; }
                .pkm { background: #fff; border-radius: 18px; width: 100%; max-width: 480px; max-height: 92vh; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 24px 60px rgba(15,23,42,.35); animation: pkm-pop .18s cubic-bezier(.2,1,.3,1); }
                .pkm-head { display: flex; align-items: center; justify-content: space-between; padding: 1.1rem 1.3rem; border-bottom: 1px solid #f0f1f4; }
                .pkm-title { font-size: 1.2rem; font-weight: 800; color: #1a1f3a; margin: 0; }
                .pkm-x { background: none; border: none; font-size: 26px; line-height: 1; color: #9ca3af; cursor: pointer; padding: 0 4px; }
                .pkm-x:hover { color: #1a1f3a; }
                .pkm-body { padding: 1.1rem 1.3rem; overflow: auto; }
                .pkm-l { display: block; font-size: .76rem; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: .03em; margin: .85rem 0 .3rem; }
                .pkm-l:first-child { margin-top: 0; }
                .pkm-i { width: 100%; border: 1.5px solid #e5e7eb; border-radius: 10px; padding: .6rem .7rem; font-size: .9rem; font-family: inherit; box-sizing: border-box; transition: border-color .12s, box-shadow .12s; }
                .pkm-i:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.12); }
                .pkm-row { display: grid; grid-template-columns: 1fr 1fr; gap: .7rem; }
                .pkm-foot { display: flex; justify-content: flex-end; gap: .6rem; padding: 1rem 1.3rem; border-top: 1px solid #f0f1f4; background: #fafbfc; }
                .pkm-btn { display: inline-flex; align-items: center; gap: 6px; border-radius: 10px; padding: .6rem 1.1rem; font-weight: 700; font-size: .88rem; cursor: pointer; border: 1px solid transparent; }
                .pkm-btn.ghost { background: #fff; border-color: #e5e7eb; color: #374151; }
                .pkm-btn.primary { background: #1a1f3a; color: #fff; }
                .pkm-btn.primary:hover { background: #2b3358; }
                .pkm-btn:disabled { opacity: .6; cursor: default; }
                :global(.pk-spin) { animation: pk-spin .7s linear infinite; }
                @keyframes pk-spin { to { transform: rotate(360deg); } }
                @keyframes pkm-fade { from { opacity: 0; } to { opacity: 1; } }
                @keyframes pkm-pop { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }
            `}</style>
        </div>,
        document.body,
    );
}
