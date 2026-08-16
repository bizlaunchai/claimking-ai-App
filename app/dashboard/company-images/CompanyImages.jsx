'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Company Images — QA Q3.10 admin tab.
//
// Every job / appointment / completion photo in one place. Filter by client,
// job, date, uploader, source. Per image:
//   * AI-drafted note review — Approve (releases the note to the client caption)
//     or Request revision (re-drafts). Nothing AI-written reaches the client
//     until an approver with `approve_images` approves it (server-enforced).
//   * Post to client portal (posted_to_portal) — appears on the homeowner's
//     "Project Photos" tab under their claim.
//   * Visible to sub (visible_to_sub) — the assigned sub can see this office
//     photo on their job (they otherwise see only their own uploads).
//
// Images stream through the authed /s3/file proxy (Bearer-gated), so we fetch
// them as blobs — same AuthedImage pattern as the 3D mockup page.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import axiosInstance from '@/lib/axiosInstance';
import { usePermissions } from '@/lib/permissions/PermissionsContext';
import ClientSelector from '@/components/clients/ClientSelector';

const authedImageCache = new Map();
const authedImageInflight = new Map();

function AuthedImage({ src, alt = '', style, className, onClick, eager = false }) {
    const [blobUrl, setBlobUrl] = useState(() => (src ? authedImageCache.get(src) ?? null : null));
    const [errored, setErrored] = useState(false);
    // Lazy: don't fetch the blob until the tile scrolls near the viewport, so a
    // page with hundreds of photos doesn't fire hundreds of /s3/file requests at
    // once. `eager` (lightbox) skips the gate.
    const [visible, setVisible] = useState(eager);
    const holderRef = useRef(null);

    // Reset per-src so reusing this instance (e.g. the lightbox) for a new image
    // doesn't keep the previous image's blob or a stale "errored" state.
    useEffect(() => {
        setErrored(false);
        setBlobUrl(src ? authedImageCache.get(src) ?? null : null);
    }, [src]);

    useEffect(() => {
        if (eager || visible || !holderRef.current) return;
        const io = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect(); }
        }, { rootMargin: '300px' });
        io.observe(holderRef.current);
        return () => io.disconnect();
    }, [eager, visible]);

    useEffect(() => {
        if (!src || !visible || blobUrl) return;
        const cached = authedImageCache.get(src);
        if (cached) { setBlobUrl(cached); return; }
        let cancelled = false;
        let promise = authedImageInflight.get(src);
        if (!promise) {
            promise = axiosInstance
                .get(src, { responseType: 'blob' })
                .then((res) => {
                    const url = URL.createObjectURL(res.data);
                    authedImageCache.set(src, url);
                    authedImageInflight.delete(src);
                    return url;
                })
                .catch((e) => { authedImageInflight.delete(src); throw e; });
            authedImageInflight.set(src, promise);
        }
        promise.then((url) => { if (!cancelled) setBlobUrl(url); })
            .catch(() => { if (!cancelled) setErrored(true); });
        return () => { cancelled = true; };
    }, [src, visible, blobUrl]);

    if (errored) return <div ref={holderRef} className={className} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>Image unavailable</div>;
    // Shimmer skeleton while the blob loads (or before it scrolls into view).
    if (!blobUrl) return <div ref={holderRef} className={`${className || ''} ci-skel`} style={style} />;
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={blobUrl} alt={alt} style={style} className={className} onClick={onClick} />;
}

const apiOrigin = () => (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
const s3Src = (row) => (row?.s3_url ? `${apiOrigin()}${row.s3_url}` : null);
const fmtDate = (iso) => {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return iso; }
};

// Small inline spinner for busy buttons.
function Spinner({ size = 13 }) {
    return (
        <svg className="ci-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ verticalAlign: '-2px' }}>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
}

// Skeleton placeholder card shown while the list loads. Self-contained styles
// (styled-jsx is component-scoped, so it can't borrow ImageCard's `.cic`).
function SkeletonCard() {
    return (
        <div style={{ background: '#fff', border: '1px solid #eef0f4', borderRadius: 14, overflow: 'hidden' }}>
            <div className="ci-skel ci-skel-img" />
            <div style={{ padding: '0.75rem 0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="ci-skel ci-skel-line" style={{ width: '55%' }} />
                <div className="ci-skel ci-skel-line" style={{ width: '80%' }} />
                <div className="ci-skel ci-skel-line" style={{ width: '40%' }} />
                <div className="ci-skel ci-skel-line" style={{ height: 30, marginTop: 4 }} />
            </div>
        </div>
    );
}

const SOURCE_LABEL = { staff: 'Staff', sub: 'Sub', completion: 'Completion' };
const AI_BADGE = {
    pending: { label: 'AI note — needs review', bg: '#fef3c7', fg: '#92400e' },
    approved: { label: 'Approved', bg: '#dcfce7', fg: '#065f46' },
    revision_requested: { label: 'Revision requested', bg: '#fee2e2', fg: '#991b1b' },
    none: { label: 'No AI note', bg: '#f3f4f6', fg: '#6b7280' },
};

export default function CompanyImages() {
    const { has } = usePermissions();
    const canApprove = has('approve_images');

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ source: '', posted: '', from: '', to: '', q: '' });
    const [showUpload, setShowUpload] = useState(false);
    const [lightbox, setLightbox] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.source) params.source = filters.source;
            if (filters.posted) params.posted = filters.posted;
            if (filters.from) params.from = new Date(filters.from).toISOString();
            if (filters.to) params.to = new Date(filters.to + 'T23:59:59').toISOString();
            const { data } = await axiosInstance.get('/job-images', { params });
            setRows(Array.isArray(data?.data) ? data.data : []);
        } catch {
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [filters.source, filters.posted, filters.from, filters.to]);

    useEffect(() => { load(); }, [load]);

    // Client-side text filter over the enriched labels (client / claim / job).
    const q = filters.q.trim().toLowerCase();
    const visible = q
        ? rows.filter((r) =>
            [r.client_name, r.claim_number, r.job_number, r.uploader_name, r.caption, r.ai_note]
                .filter(Boolean).join(' ').toLowerCase().includes(q))
        : rows;

    const patchRow = (id, patch) =>
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

    // Handlers do the work + toast and RESOLVE (throw on failure) so the card
    // can drive its own per-action loading spinner.
    const togglePosted = async (row) => {
        const next = !row.posted_to_portal;
        try {
            const { data } = await axiosInstance.patch(`/job-images/${row.id}`, { posted_to_portal: next });
            patchRow(row.id, data?.data ?? { posted_to_portal: next });
            toast.success(next ? 'Posted to client portal' : 'Removed from portal');
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Could not update');
        }
    };

    const toggleSubVisible = async (row) => {
        const next = !row.visible_to_sub;
        try {
            const { data } = await axiosInstance.patch(`/job-images/${row.id}`, { visible_to_sub: next });
            patchRow(row.id, data?.data ?? { visible_to_sub: next });
            toast.success(next ? 'Now visible to the assigned sub' : 'Hidden from the sub');
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Could not update');
        }
    };

    const approve = async (row, note) => {
        try {
            const { data } = await axiosInstance.post(`/job-images/${row.id}/approve-note`, note != null ? { note } : {});
            patchRow(row.id, data?.data);
            toast.success('Note approved');
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Could not approve');
        }
    };

    const revise = async (row) => {
        try {
            const { data } = await axiosInstance.post(`/job-images/${row.id}/revise-note`, {});
            patchRow(row.id, data?.data);
            toast.success(data?.message || 'New draft ready');
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Could not revise');
        }
    };

    // The confirm dialog lives in the card (so the "Deleting…" overlay only
    // shows AFTER the user confirms); this just does the delete.
    const remove = async (row) => {
        try {
            await axiosInstance.delete(`/job-images/${row.id}`);
            setRows((prev) => prev.filter((r) => r.id !== row.id));
            toast.success('Photo deleted');
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Could not delete');
        }
    };

    return (
        <div className="ci-wrap">
            <div className="ci-head">
                <div>
                    <h1 className="ci-title">Company Images</h1>
                    <p className="ci-sub">Every job & appointment photo — review AI notes, post to client portals, share with subs.</p>
                </div>
                <button className="ci-btn ci-btn-primary" onClick={() => setShowUpload(true)}>+ Upload photo</button>
            </div>

            <div className="ci-filters">
                <input
                    className="ci-input" placeholder="Search client, claim #, job #, note…"
                    value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                />
                <select className="ci-input" value={filters.source} onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value }))}>
                    <option value="">All sources</option>
                    <option value="staff">Staff</option>
                    <option value="sub">Sub</option>
                    <option value="completion">Completion</option>
                </select>
                <select className="ci-input" value={filters.posted} onChange={(e) => setFilters((f) => ({ ...f, posted: e.target.value }))}>
                    <option value="">Portal: any</option>
                    <option value="true">Posted only</option>
                    <option value="false">Not posted</option>
                </select>
                <label className="ci-date">From <input type="date" className="ci-input" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} /></label>
                <label className="ci-date">To <input type="date" className="ci-input" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} /></label>
            </div>

            {loading ? (
                <div className="ci-grid">
                    {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
            ) : visible.length === 0 ? (
                <div className="ci-empty">No photos yet. Upload one, or photos taken at appointments / by subs will appear here.</div>
            ) : (
                <div className="ci-grid">
                    {visible.map((row) => (
                        <ImageCard
                            key={row.id}
                            row={row}
                            canApprove={canApprove}
                            onOpen={() => setLightbox(s3Src(row))}
                            onTogglePosted={() => togglePosted(row)}
                            onToggleSub={() => toggleSubVisible(row)}
                            onApprove={(note) => approve(row, note)}
                            onRevise={() => revise(row)}
                            onDelete={() => remove(row)}
                        />
                    ))}
                </div>
            )}

            {showUpload && (
                <UploadModal
                    onClose={() => setShowUpload(false)}
                    onUploaded={() => { setShowUpload(false); load(); }}
                />
            )}

            {lightbox && (
                <div className="ci-lightbox" onClick={() => setLightbox(null)}>
                    <AuthedImage src={lightbox} eager alt="Photo" style={{ maxWidth: '92vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 10 }} />
                </div>
            )}

            <style jsx>{`
                .ci-wrap { padding: 1.5rem; max-width: 1280px; margin: 0 auto; }
                .ci-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
                .ci-title { font-size: 1.5rem; font-weight: 800; color: #1a1f3a; margin: 0; }
                .ci-sub { color: #6b7280; font-size: 0.9rem; margin: 0.25rem 0 0; max-width: 620px; }
                .ci-btn { border: none; border-radius: 9px; padding: 0.55rem 1rem; font-weight: 700; font-size: 0.85rem; cursor: pointer; }
                .ci-btn-primary { background: #1a1f3a; color: #fff; }
                .ci-filters { display: flex; gap: 0.5rem; flex-wrap: wrap; margin: 1.25rem 0; align-items: center; }
                .ci-input { border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.45rem 0.6rem; font-size: 0.85rem; background: #fff; }
                .ci-filters .ci-input:first-child { min-width: 240px; flex: 1; }
                .ci-date { font-size: 0.78rem; color: #6b7280; display: inline-flex; align-items: center; gap: 0.35rem; }
                .ci-empty { padding: 3rem 1rem; text-align: center; color: #6b7280; background: #fafafa; border: 1px dashed #e5e7eb; border-radius: 12px; }
                .ci-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
                .ci-lightbox { position: fixed; inset: 0; background: rgba(15,23,42,0.85); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 24px; cursor: zoom-out; }
            `}</style>

            {/* Global so the shimmer/spinner apply inside AuthedImage, SkeletonCard,
                and ImageCard (each is its own styled-jsx scope). */}
            <style jsx global>{`
                @keyframes ci-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
                @keyframes ci-spin { to { transform: rotate(360deg); } }
                .ci-skel { background: linear-gradient(90deg, #eef0f4 25%, #f7f8fa 37%, #eef0f4 63%); background-size: 200% 100%; animation: ci-shimmer 1.4s ease-in-out infinite; border-radius: 8px; }
                .ci-skel-img { width: 100%; aspect-ratio: 4 / 3; border-radius: 0; }
                .ci-skel-line { height: 12px; border-radius: 6px; }
                .ci-spin { animation: ci-spin 0.7s linear infinite; }
                @media (prefers-reduced-motion: reduce) { .ci-skel, .ci-spin { animation: none; } }
            `}</style>
        </div>
    );
}

function ImageCard({ row, canApprove, onOpen, onTogglePosted, onToggleSub, onApprove, onRevise, onDelete }) {
    const [editing, setEditing] = useState(false);
    const [noteDraft, setNoteDraft] = useState(row.ai_note || row.caption || '');
    // Per-action loading: only the control that was clicked shows a spinner.
    const [action, setAction] = useState(null); // 'approve' | 'revise' | 'save' | 'portal' | 'sub' | 'delete'
    const busy = action !== null;
    const run = (name, fn) => async () => {
        if (busy) return;
        setAction(name);
        try { await fn(); } finally { setAction(null); }
    };

    const badge = AI_BADGE[row.ai_status] || AI_BADGE.none;
    const needsReview = row.ai_status === 'pending' || row.ai_status === 'revision_requested';
    const note = row.caption || row.ai_note;

    useEffect(() => { setNoteDraft(row.ai_note || row.caption || ''); }, [row.ai_note, row.caption]);

    // Branded SweetAlert confirm BEFORE deleting — then the card shows its own
    // "Deleting…" overlay while the request runs.
    const confirmDelete = async () => {
        if (busy) return;
        const res = await Swal.fire({
            icon: 'warning',
            title: 'Delete this photo?',
            html: row.posted_to_portal
                ? 'It will be removed from the library <b>and the client portal</b>. This can’t be undone.'
                : 'It will be permanently removed from the library. This can’t be undone.',
            showCancelButton: true,
            confirmButtonText: 'Delete photo',
            cancelButtonText: 'Keep it',
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            reverseButtons: true,
            focusCancel: true,
        });
        if (!res.isConfirmed) return;
        setAction('delete');
        try { await onDelete(); } finally { setAction(null); }
    };

    return (
        <div className={`cic ${action === 'delete' ? 'is-deleting' : ''}`}>
            <div className="cic-img" onClick={onOpen}>
                <AuthedImage src={s3Src(row)} alt={note || 'Photo'} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} />
                <span className="cic-src">{SOURCE_LABEL[row.source] || row.source}</span>
                {row.posted_to_portal && <span className="cic-onportal" title="Live on the client portal">● Live</span>}
                {action === 'delete' && <div className="cic-deleting"><Spinner size={20} /> Deleting…</div>}
            </div>

            <div className="cic-body">
                <div className="cic-meta">
                    <span className="cic-badge" style={{ background: badge.bg, color: badge.fg }}>
                        {row.ai_status === 'approved' && '✓ '}{badge.label}
                    </span>
                    <span className="cic-date">{fmtDate(row.created_at)}</span>
                </div>

                <div className="cic-client">
                    {row.client_name || row.claim_number
                        ? <span className="cic-name">{row.client_name || 'Client'}{row.claim_number ? <span className="cic-claim"> · {row.claim_number}</span> : null}</span>
                        : <span className="cic-muted">No client linked</span>}
                </div>
                <div className="cic-sub">
                    by {row.uploader_name}{row.job_number ? ` · Job #${row.job_number}` : ''}
                </div>

                {/* Note / AI review */}
                {editing ? (
                    <div className="cic-note-edit">
                        <textarea className="cic-textarea" rows={3} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="What the client will see under this photo…" />
                        <div className="cic-actions">
                            <button className="cic-btn cic-btn-primary" disabled={busy || !canApprove}
                                onClick={run('save', async () => { await onApprove(noteDraft); setEditing(false); })}>
                                {action === 'save' ? <Spinner /> : null} Save &amp; approve
                            </button>
                            <button className="cic-btn" disabled={busy} onClick={() => setEditing(false)}>Cancel</button>
                        </div>
                    </div>
                ) : (
                    <>
                        {note && <div className={`cic-note ${row.ai_status === 'pending' || row.ai_status === 'revision_requested' ? 'is-draft' : ''}`}>{note}</div>}
                        <div className="cic-actions">
                            {needsReview && canApprove && (
                                <>
                                    <button className="cic-btn cic-btn-approve" disabled={busy} onClick={run('approve', () => onApprove())}>
                                        {action === 'approve' ? <Spinner /> : <span aria-hidden>✓</span>} Approve
                                    </button>
                                    <button className="cic-btn" disabled={busy} onClick={run('revise', () => onRevise())}>
                                        {action === 'revise' ? <Spinner /> : <span aria-hidden>↻</span>} Revise
                                    </button>
                                </>
                            )}
                            {canApprove && (
                                <button className="cic-btn" disabled={busy} onClick={() => setEditing(true)}>Edit note</button>
                            )}
                            {needsReview && !canApprove && <span className="cic-muted">Awaiting approver</span>}
                        </div>
                    </>
                )}

                {/* Toggle switches */}
                <div className="cic-switches">
                    <ToggleSwitch label="On client portal" on={!!row.posted_to_portal} loading={action === 'portal'}
                        disabled={busy && action !== 'portal'} onChange={run('portal', () => onTogglePosted())} />
                    <ToggleSwitch label="Visible to sub" on={!!row.visible_to_sub} loading={action === 'sub'}
                        disabled={busy && action !== 'sub'} onChange={run('sub', () => onToggleSub())} />
                </div>

                <button className="cic-delete" disabled={busy} onClick={confirmDelete}>
                    {action === 'delete'
                        ? <Spinner />
                        : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                        )}
                    Delete
                </button>
            </div>

            <style jsx>{`
                .cic { background: #fff; border: 1px solid #eef0f4; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column;
                    box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 4px 14px rgba(15,23,42,.05); transition: box-shadow .18s ease, transform .18s ease; }
                .cic:hover { box-shadow: 0 2px 4px rgba(15,23,42,.06), 0 12px 28px rgba(15,23,42,.10); transform: translateY(-2px); }
                .cic.is-deleting { opacity: .6; }
                .cic-img { position: relative; aspect-ratio: 4/3; background: #f3f4f6; }
                .cic-src { position: absolute; top: 10px; left: 10px; background: rgba(26,31,58,.82); color: #fff; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; padding: 3px 9px; border-radius: 999px; backdrop-filter: blur(4px); }
                .cic-onportal { position: absolute; top: 10px; right: 10px; background: rgba(5,150,105,.92); color: #fff; font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 999px; }
                .cic-deleting { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 8px; background: rgba(255,255,255,.7); color: #b91c1c; font-weight: 700; font-size: 13px; }
                .cic-body { padding: .85rem .95rem; display: flex; flex-direction: column; gap: .55rem; }
                .cic-meta { display: flex; justify-content: space-between; align-items: center; }
                .cic-badge { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; }
                .cic-date { font-size: 11px; color: #9ca3af; }
                .cic-client { font-size: 14px; }
                .cic-name { font-weight: 800; color: #1a1f3a; }
                .cic-claim { font-weight: 600; color: #6366f1; }
                .cic-sub { font-size: 12px; color: #6b7280; margin-top: -3px; }
                .cic-muted { color: #9ca3af; }
                .cic-note { font-size: 13px; color: #374151; background: #f8fafc; border: 1px solid #eef0f4; border-radius: 10px; padding: .55rem .7rem; line-height: 1.45; }
                .cic-note.is-draft { background: #fffbeb; border-color: #fde68a; }
                .cic-note.is-draft::before { content: 'AI draft — not shared yet'; display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #b45309; margin-bottom: 3px; }
                .cic-textarea { width: 100%; border: 1px solid #e5e7eb; border-radius: 10px; padding: .55rem .6rem; font-size: 13px; font-family: inherit; resize: vertical; }
                .cic-textarea:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.12); }
                .cic-actions { display: flex; gap: .4rem; flex-wrap: wrap; align-items: center; }
                .cic-btn { display: inline-flex; align-items: center; gap: 5px; border: 1px solid #e5e7eb; background: #fff; border-radius: 8px; padding: .4rem .75rem; font-size: 12px; font-weight: 700; cursor: pointer; color: #374151; transition: background .12s, border-color .12s; }
                .cic-btn:hover:not(:disabled) { background: #f9fafb; border-color: #d1d5db; }
                .cic-btn-primary { background: #1a1f3a; color: #fff; border-color: #1a1f3a; }
                .cic-btn-primary:hover:not(:disabled) { background: #2b3358; }
                .cic-btn-approve { background: #059669; color: #fff; border-color: #059669; }
                .cic-btn-approve:hover:not(:disabled) { background: #047857; }
                .cic-btn:disabled { opacity: .5; cursor: default; }
                .cic-switches { display: flex; flex-direction: column; gap: .5rem; border-top: 1px solid #f0f1f4; padding-top: .6rem; }
                .cic-delete { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #fecaca; color: #b91c1c; font-size: 12px; font-weight: 700; cursor: pointer; padding: .4rem .7rem; border-radius: 8px; transition: background .12s, border-color .12s; }
                .cic-delete:hover:not(:disabled) { background: #fef2f2; border-color: #f87171; }
                .cic-delete:disabled { opacity: .5; cursor: default; }
            `}</style>
        </div>
    );
}

// A proper on/off switch that shows a spinner in the knob while its action runs.
function ToggleSwitch({ label, on, loading, disabled, onChange }) {
    return (
        <button type="button" className={`ts ${on ? 'on' : ''}`} disabled={disabled || loading} onClick={onChange} aria-pressed={on}>
            <span className="ts-track"><span className="ts-knob">{loading ? <Spinner size={11} /> : null}</span></span>
            <span className="ts-label">{label}</span>
            <style jsx>{`
                .ts { display: inline-flex; align-items: center; gap: .5rem; background: none; border: none; padding: 0; cursor: pointer; font: inherit; }
                .ts:disabled { cursor: default; opacity: .7; }
                .ts-track { position: relative; width: 38px; height: 22px; border-radius: 999px; background: #d1d5db; transition: background .18s ease; flex: 0 0 auto; }
                .ts.on .ts-track { background: #059669; }
                .ts-knob { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.25); transition: transform .18s ease; display: flex; align-items: center; justify-content: center; color: #059669; }
                .ts.on .ts-knob { transform: translateX(16px); }
                .ts-label { font-size: 12.5px; font-weight: 600; color: #4b5563; }
                .ts.on .ts-label { color: #065f46; }
            `}</style>
        </button>
    );
}

function UploadModal({ onClose, onUploaded }) {
    const [client, setClient] = useState(null);
    const [caption, setCaption] = useState('');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);

    const submit = async () => {
        if (!file) { toast.error('Pick a photo first.'); return; }
        if (!client?.id) { toast.error('Attach the photo to a client.'); return; }
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('claim_id', client.id);
            if (caption) fd.append('caption', caption);
            await axiosInstance.post('/job-images', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('Photo uploaded — AI note drafting…');
            onUploaded();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Upload failed');
        } finally { setUploading(false); }
    };

    return (
        <div className="um-back" onClick={onClose}>
            <div className="um-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="um-title">Upload a photo</h2>
                <p className="um-sub">Attach it to a client — the AI drafts a note you can approve, then post to their portal.</p>

                <ClientSelector client={client} onChange={setClient} searchPlaceholder="Search client by name / phone…" />

                <div className="um-file" onClick={() => fileRef.current?.click()}>
                    {file ? <span>{file.name}</span> : <span className="um-muted">Click to choose an image</span>}
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </div>

                <textarea className="um-textarea" rows={2} placeholder="Optional caption / note" value={caption} onChange={(e) => setCaption(e.target.value)} />

                <div className="um-actions">
                    <button className="um-btn" onClick={onClose} disabled={uploading}>Cancel</button>
                    <button className="um-btn um-btn-primary" onClick={submit} disabled={uploading}>{uploading ? <><Spinner /> Uploading…</> : 'Upload'}</button>
                </div>
            </div>

            <style jsx>{`
                .um-back { position: fixed; inset: 0; background: rgba(15,23,42,0.5); display: flex; align-items: center; justify-content: center; z-index: 9998; padding: 1rem; }
                .um-modal { background: #fff; border-radius: 16px; padding: 1.5rem; width: 100%; max-width: 480px; max-height: 90vh; overflow: auto; }
                .um-title { font-size: 1.2rem; font-weight: 800; color: #1a1f3a; margin: 0; }
                .um-sub { color: #6b7280; font-size: 0.85rem; margin: 0.25rem 0 1rem; }
                .um-file { border: 1px dashed #cbd5e1; border-radius: 10px; padding: 1rem; text-align: center; cursor: pointer; margin: 0.875rem 0; font-size: 0.85rem; color: #1a1f3a; }
                .um-muted { color: #9ca3af; }
                .um-textarea { width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.5rem; font-size: 0.85rem; font-family: inherit; resize: vertical; }
                .um-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }
                .um-btn { border: 1px solid #e5e7eb; background: #fff; border-radius: 8px; padding: 0.5rem 1rem; font-weight: 700; font-size: 0.85rem; cursor: pointer; }
                .um-btn-primary { background: #1a1f3a; color: #fff; border-color: #1a1f3a; }
                .um-btn:disabled { opacity: 0.5; }
            `}</style>
        </div>
    );
}
