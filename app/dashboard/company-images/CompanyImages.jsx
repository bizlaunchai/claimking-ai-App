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
import axiosInstance from '@/lib/axiosInstance';
import { usePermissions } from '@/lib/permissions/PermissionsContext';
import ClientSelector from '@/components/clients/ClientSelector';

const authedImageCache = new Map();
const authedImageInflight = new Map();

function AuthedImage({ src, alt = '', style, className, onClick }) {
    const [blobUrl, setBlobUrl] = useState(() => (src ? authedImageCache.get(src) ?? null : null));
    const [errored, setErrored] = useState(false);

    useEffect(() => {
        if (!src) return;
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
    }, [src]);

    if (errored) return <div className={className} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>Image unavailable</div>;
    if (!blobUrl) return <div className={className} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>Loading…</div>;
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
    const [busyId, setBusyId] = useState(null);
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

    const togglePosted = async (row) => {
        const next = !row.posted_to_portal;
        setBusyId(row.id);
        try {
            const { data } = await axiosInstance.patch(`/job-images/${row.id}`, { posted_to_portal: next });
            patchRow(row.id, data?.data ?? { posted_to_portal: next });
            toast.success(next ? 'Posted to client portal' : 'Removed from portal');
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Could not update');
        } finally { setBusyId(null); }
    };

    const toggleSubVisible = async (row) => {
        const next = !row.visible_to_sub;
        setBusyId(row.id);
        try {
            const { data } = await axiosInstance.patch(`/job-images/${row.id}`, { visible_to_sub: next });
            patchRow(row.id, data?.data ?? { visible_to_sub: next });
            toast.success(next ? 'Now visible to the assigned sub' : 'Hidden from the sub');
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Could not update');
        } finally { setBusyId(null); }
    };

    const approve = async (row, note) => {
        setBusyId(row.id);
        try {
            const { data } = await axiosInstance.post(`/job-images/${row.id}/approve-note`, note != null ? { note } : {});
            patchRow(row.id, data?.data);
            toast.success('Note approved');
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Could not approve');
        } finally { setBusyId(null); }
    };

    const revise = async (row) => {
        setBusyId(row.id);
        try {
            const { data } = await axiosInstance.post(`/job-images/${row.id}/revise-note`, {});
            patchRow(row.id, data?.data);
            toast.success(data?.message || 'New draft ready');
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Could not revise');
        } finally { setBusyId(null); }
    };

    const remove = async (row) => {
        if (!window.confirm('Delete this photo? This cannot be undone.')) return;
        setBusyId(row.id);
        try {
            await axiosInstance.delete(`/job-images/${row.id}`);
            setRows((prev) => prev.filter((r) => r.id !== row.id));
            toast.success('Photo deleted');
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Could not delete');
        } finally { setBusyId(null); }
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
                <div className="ci-empty">Loading photos…</div>
            ) : visible.length === 0 ? (
                <div className="ci-empty">No photos yet. Upload one, or photos taken at appointments / by subs will appear here.</div>
            ) : (
                <div className="ci-grid">
                    {visible.map((row) => (
                        <ImageCard
                            key={row.id}
                            row={row}
                            canApprove={canApprove}
                            busy={busyId === row.id}
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
                    <AuthedImage src={lightbox} alt="Photo" style={{ maxWidth: '92vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 10 }} />
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
        </div>
    );
}

function ImageCard({ row, canApprove, busy, onOpen, onTogglePosted, onToggleSub, onApprove, onRevise, onDelete }) {
    const [editing, setEditing] = useState(false);
    const [noteDraft, setNoteDraft] = useState(row.ai_note || row.caption || '');
    const badge = AI_BADGE[row.ai_status] || AI_BADGE.none;
    const needsReview = row.ai_status === 'pending' || row.ai_status === 'revision_requested';

    useEffect(() => { setNoteDraft(row.ai_note || row.caption || ''); }, [row.ai_note, row.caption]);

    return (
        <div className="cic">
            <div className="cic-img" onClick={onOpen}>
                <AuthedImage src={s3Src(row)} alt={row.caption || 'Photo'} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} />
                <span className="cic-src">{SOURCE_LABEL[row.source] || row.source}</span>
            </div>
            <div className="cic-body">
                <div className="cic-meta">
                    <span className="cic-badge" style={{ background: badge.bg, color: badge.fg }}>{badge.label}</span>
                    <span className="cic-date">{fmtDate(row.created_at)}</span>
                </div>
                <div className="cic-line">
                    {row.client_name || row.claim_number
                        ? <span><strong>{row.client_name || 'Client'}</strong>{row.claim_number ? ` · ${row.claim_number}` : ''}</span>
                        : <span className="cic-muted">No client linked</span>}
                    {row.job_number ? <span className="cic-muted"> · Job #{row.job_number}</span> : null}
                </div>
                <div className="cic-uploader">by {row.uploader_name}</div>

                {/* Note / AI review */}
                {editing ? (
                    <div className="cic-note-edit">
                        <textarea className="cic-textarea" rows={3} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} />
                        <div className="cic-actions">
                            <button className="cic-btn cic-btn-primary" disabled={busy || !canApprove} onClick={() => { onApprove(noteDraft); setEditing(false); }}>Save & approve</button>
                            <button className="cic-btn" onClick={() => setEditing(false)}>Cancel</button>
                        </div>
                    </div>
                ) : (
                    <>
                        {(row.ai_note || row.caption) && (
                            <div className="cic-note">{row.caption || row.ai_note}</div>
                        )}
                        <div className="cic-actions">
                            {needsReview && canApprove && (
                                <>
                                    <button className="cic-btn cic-btn-primary" disabled={busy} onClick={() => onApprove()}>Approve</button>
                                    <button className="cic-btn" disabled={busy} onClick={onRevise}>Revise (AI)</button>
                                </>
                            )}
                            {canApprove && (
                                <button className="cic-btn" onClick={() => setEditing(true)}>Edit note</button>
                            )}
                            {needsReview && !canApprove && (
                                <span className="cic-muted">Awaiting approver</span>
                            )}
                        </div>
                    </>
                )}

                {/* Toggles */}
                <div className="cic-toggles">
                    <label className={`cic-toggle ${row.posted_to_portal ? 'on' : ''}`}>
                        <input type="checkbox" checked={!!row.posted_to_portal} disabled={busy} onChange={onTogglePosted} />
                        <span>On client portal</span>
                    </label>
                    <label className={`cic-toggle ${row.visible_to_sub ? 'on' : ''}`}>
                        <input type="checkbox" checked={!!row.visible_to_sub} disabled={busy} onChange={onToggleSub} />
                        <span>Visible to sub</span>
                    </label>
                </div>
                <button className="cic-delete" disabled={busy} onClick={onDelete}>Delete</button>
            </div>

            <style jsx>{`
                .cic { background: #fff; border: 1px solid #eef0f4; border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; }
                .cic-img { position: relative; aspect-ratio: 4/3; background: #f3f4f6; }
                .cic-src { position: absolute; top: 8px; left: 8px; background: rgba(26,31,58,0.8); color: #fff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
                .cic-body { padding: 0.75rem 0.875rem; display: flex; flex-direction: column; gap: 0.5rem; }
                .cic-meta { display: flex; justify-content: space-between; align-items: center; }
                .cic-badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
                .cic-date { font-size: 11px; color: #9ca3af; }
                .cic-line { font-size: 13px; color: #1a1f3a; }
                .cic-uploader { font-size: 12px; color: #6b7280; margin-top: -2px; }
                .cic-muted { color: #9ca3af; }
                .cic-note { font-size: 13px; color: #374151; background: #f9fafb; border: 1px solid #f0f1f4; border-radius: 8px; padding: 0.5rem 0.6rem; line-height: 1.4; }
                .cic-textarea { width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.5rem; font-size: 13px; font-family: inherit; resize: vertical; }
                .cic-actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
                .cic-btn { border: 1px solid #e5e7eb; background: #fff; border-radius: 7px; padding: 0.35rem 0.7rem; font-size: 12px; font-weight: 700; cursor: pointer; color: #374151; }
                .cic-btn-primary { background: #1a1f3a; color: #fff; border-color: #1a1f3a; }
                .cic-btn:disabled { opacity: 0.5; cursor: default; }
                .cic-toggles { display: flex; gap: 0.75rem; flex-wrap: wrap; border-top: 1px solid #f0f1f4; padding-top: 0.5rem; }
                .cic-toggle { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 12px; font-weight: 600; color: #6b7280; cursor: pointer; }
                .cic-toggle.on { color: #065f46; }
                .cic-delete { align-self: flex-start; background: none; border: none; color: #b91c1c; font-size: 12px; font-weight: 600; cursor: pointer; padding: 0; }
                .cic-delete:disabled { opacity: 0.5; }
            `}</style>
        </div>
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
                    <button className="um-btn um-btn-primary" onClick={submit} disabled={uploading}>{uploading ? 'Uploading…' : 'Upload'}</button>
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
