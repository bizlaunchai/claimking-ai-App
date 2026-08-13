'use client'
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance';
import { usePermissions } from '@/lib/permissions/PermissionsContext';
import "../claims.css";

const STAGE_NAMES = [
    'Need Claim Number',
    'Awaiting Initial Inspection',
    'Scheduled Inspection',
    'In Progress',
    'Tile Sample Required',
    'Reinspection Requested',
    'Partial Approval',
    'Supplementing',
    'Final Check Processing',
    'Completed',
    'Declined',
    'Cold Claims / Lost',
];

const UPLOAD_TYPES = [
    { key: 'estimate', label: 'Insurance Estimate', accept: '.pdf,.xlsx,.xls' },
    { key: 'measurement', label: 'Measurement Report', accept: '.pdf' },
    { key: 'photo', label: 'Damage Photos', accept: 'image/*', multiple: true },
];

// Renders an S3-backed image via the authed proxy (bearer-safe; no next/image).
const AuthedThumb = ({ s3Key, name }) => {
    const [url, setUrl] = useState(null);
    useEffect(() => {
        let active = true;
        let objectUrl;
        (async () => {
            try {
                const res = await axiosInstance.get('/s3/file', {
                    params: { key: s3Key },
                    responseType: 'blob',
                    suppressErrorToast: true,
                });
                objectUrl = URL.createObjectURL(res.data);
                if (active) setUrl(objectUrl);
            } catch { /* leave placeholder */ }
        })();
        return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [s3Key]);
    if (!url) return <div style={{ width: 56, height: 56, borderRadius: 8, background: '#f3f4f6' }} />;
    return <img src={url} alt={name} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />;
};

const fmtMoney = (n) => `$${Number(n || 0).toLocaleString()}`;

// Insurance-communication entry types — the client sees these as a read-only
// feed (see PortalInsuranceComm.jsx). Labels/colors mirror the portal badges.
const COMM_TYPES = [
    { key: 'sent',     label: 'We Sent',  badge: { bg: '#eef2ff', fg: '#3730a3' } },
    { key: 'received', label: 'Received', badge: { bg: '#fef3c7', fg: '#92400e' } },
    { key: 'call',     label: 'Call',     badge: { bg: '#dcfce7', fg: '#166534' } },
    { key: 'note',     label: 'Note',     badge: { bg: '#f3f4f6', fg: '#374151' } },
];
const COMM_BADGE = Object.fromEntries(COMM_TYPES.map(t => [t.key, t]));

const ClaimDetail = ({ id }) => {
    const [claim, setClaim] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploads, setUploads] = useState([]);
    const [activity, setActivity] = useState([]);
    const [uploadingType, setUploadingType] = useState(null);
    const fileRefs = { estimate: useRef(null), measurement: useRef(null), photo: useRef(null) };

    // Insurance Communication feed
    const [comms, setComms] = useState([]);
    const [commModalOpen, setCommModalOpen] = useState(false);
    const [commForm, setCommForm] = useState({ type: 'sent', title: '', body: '' });
    const [commFile, setCommFile] = useState(null);
    const [commSubmitting, setCommSubmitting] = useState(false);
    const commFileRef = useRef(null);

    // Assignment (Task 1.3) — reassign from the detail page.
    const { has } = usePermissions();
    const [teamMembers, setTeamMembers] = useState([]);
    const [assigning, setAssigning] = useState(false);

    const load = async () => {
        try {
            setLoading(true);
            const [c, u, a, m] = await Promise.all([
                axiosInstance.get(`/client-portal/${id}`),
                axiosInstance.get(`/client-portal/${id}/uploads`),
                axiosInstance.get(`/client-portal/${id}/activity`),
                axiosInstance.get(`/client-portal/${id}/communications`),
            ]);
            setClaim(c.data?.data || null);
            setUploads(u.data?.data || []);
            setActivity(a.data?.data || []);
            setComms(m.data?.data || []);
        } catch {
            // axiosInstance toasts
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [id]);

    // Team members for the assign dropdown (only for users who can assign).
    useEffect(() => {
        if (!has('assign_claims')) return;
        (async () => {
            try {
                const res = await axiosInstance.get('/team/members', { suppressErrorToast: true });
                const rows = res.data?.data || res.data || [];
                setTeamMembers(rows.map(m => ({
                    id: m.id || m.user_id,
                    name: m.full_name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email || 'Member',
                })).filter(m => m.id));
            } catch { /* ignore */ }
        })();
    }, [has]);

    const reassign = async (userId) => {
        setAssigning(true);
        try {
            await axiosInstance.patch(`/client-portal/${id}/assign`, { user_id: userId || null });
            setClaim(c => ({ ...c, assigned_to_user_id: userId || null }));
            const who = userId ? (teamMembers.find(m => m.id === userId)?.name || 'team member') : 'Unassigned';
            toast.success(userId ? `Assigned to ${who}.` : 'Claim unassigned.');
        } catch {
            toast.error('Could not update assignment.');
        } finally {
            setAssigning(false);
        }
    };

    const changeStage = async (newStage, reason) => {
        const prev = claim?.claim_status;
        setClaim(c => ({ ...c, claim_status: newStage }));
        try {
            const body = { claim_status: newStage };
            if (reason) body.status_change_reason = reason;
            await axiosInstance.put(`/client-portal/${id}`, body);
            toast.success(`Moved to ${newStage}. ${STAGE_NAMES[newStage - 1]}`);
            load();
        } catch {
            setClaim(c => ({ ...c, claim_status: prev }));
        }
    };

    const reopenClaim = () => {
        const reason = window.prompt('Reopen reason (why is this claim being reactivated)?');
        if (reason === null) return; // cancelled
        // Reopen back to "In Progress" (stage 4) by default.
        changeStage(4, reason.trim() || 'Reopened');
    };

    const onUpload = async (type, fileList) => {
        const files = Array.from(fileList || []);
        if (!files.length) return;
        setUploadingType(type);
        let done = 0;
        for (const file of files) {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('upload_type', type);
            try {
                await axiosInstance.post(`/client-portal/${id}/uploads`, fd);
                done++;
            } catch { /* toasted */ }
        }
        setUploadingType(null);
        if (done) toast.success(`Uploaded ${done} file${done > 1 ? 's' : ''}.`);
        const u = await axiosInstance.get(`/client-portal/${id}/uploads`);
        setUploads(u.data?.data || []);
    };

    /**
     * Share / hide one document on the homeowner portal. Optimistic: the
     * checkbox flips immediately and reverts if the request fails — a toggle
     * that lags behind the click reads as broken.
     */
    const toggleUploadVisibility = async (u) => {
        const next = !u.is_visible_in_portal;
        setUploads(list => list.map(x => x.id === u.id ? { ...x, is_visible_in_portal: next } : x));
        try {
            await axiosInstance.patch(
                `/client-portal/${id}/uploads/${u.id}/visibility`,
                { is_visible_in_portal: next },
            );
            toast.success(next ? 'Shared with client' : 'Hidden from client');
        } catch {
            setUploads(list => list.map(x => x.id === u.id ? { ...x, is_visible_in_portal: !next } : x));
        }
    };

    const removeUpload = async (uploadId) => {
        try {
            await axiosInstance.delete(`/client-portal/${id}/uploads/${uploadId}`);
            setUploads(list => list.filter(x => x.id !== uploadId));
            toast.success('Document removed.');
        } catch { /* toasted */ }
    };

    // ── Insurance Communication ─────────────────────────────────────────
    const openCommModal = () => {
        setCommForm({ type: 'sent', title: '', body: '' });
        setCommFile(null);
        setCommModalOpen(true);
    };

    const submitComm = async () => {
        const title = commForm.title.trim();
        if (!title) { toast.error('Add a title for this entry.'); return; }
        setCommSubmitting(true);
        try {
            const fd = new FormData();
            fd.append('type', commForm.type);
            fd.append('title', title);
            if (commForm.body.trim()) fd.append('body', commForm.body.trim());
            if (commFile) fd.append('file', commFile);
            const res = await axiosInstance.post(`/client-portal/${id}/communications`, fd);
            const created = res.data?.data;
            if (created) setComms(list => [created, ...list]);
            setCommModalOpen(false);
            toast.success('Entry added — the client can see it now.');
        } catch {
            /* toasted */
        } finally {
            setCommSubmitting(false);
        }
    };

    const removeComm = async (commId) => {
        try {
            await axiosInstance.delete(`/client-portal/${id}/communications/${commId}`);
            setComms(list => list.filter(x => x.id !== commId));
            toast.success('Entry removed.');
        } catch { /* toasted */ }
    };

    if (loading) return (
        <div className="main-container">
            <style>{`
                @keyframes ckShimmer { 0% { background-position: -680px 0; } 100% { background-position: 680px 0; } }
                .ck-skel { background: linear-gradient(90deg, #eceef3 25%, #f6f7fa 37%, #eceef3 63%); background-size: 680px 100%; animation: ckShimmer 1.4s ease-in-out infinite; border-radius: 8px; }
                @media (prefers-reduced-motion: reduce) { .ck-skel { animation: none; } }
            `}</style>
            <div style={{ padding: '1.75rem 2rem', maxWidth: 1100 }}>
                <div className="ck-skel" style={{ width: 110, height: 13, marginBottom: 22 }} />
                <div className="ck-skel" style={{ width: '42%', height: 30, marginBottom: 12 }} />
                <div className="ck-skel" style={{ width: '62%', height: 14, marginBottom: 28 }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 18, marginBottom: 28 }}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i}>
                            <div className="ck-skel" style={{ width: 72, height: 10, marginBottom: 9 }} />
                            <div className="ck-skel" style={{ width: '80%', height: 16 }} />
                        </div>
                    ))}
                </div>
                <div className="ck-skel" style={{ width: '100%', height: 130, borderRadius: 12 }} />
            </div>
        </div>
    );
    if (!claim) return (
        <div style={{ padding: '2rem' }}>
            <p>Claim not found.</p>
            <Link href="/dashboard/claims" className="show-more-btn" style={{ display: 'inline-block', marginTop: '1rem' }}>← Back to Claims</Link>
        </div>
    );

    const stage = claim.claim_status || 1;
    const carrier = claim.insurance_carrier || claim.insurance_company || '—';
    const isPhoto = (u) => (u.content_type || '').startsWith('image/');

    return (
        <div className="main-container">
            <div className="header-section">
                <Link href="/dashboard/claims" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', textDecoration: 'none' }}>← Back to Claims</Link>
                <h1 className="header-title" style={{ marginTop: '0.5rem' }}>{claim.full_name || `${claim.first_name} ${claim.last_name}`}</h1>
                <p className="header-subtitle">{claim.claim_number || 'Pending claim #'} · {claim.address}{claim.city ? `, ${claim.city}` : ''}</p>
            </div>

            <div className="pipeline-content" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: '1.5rem', alignItems: 'start' }}>
                {/* Left column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
                    {/* Overview */}
                    <div className="current-stage-info" style={{ marginBottom: 0 }}>
                        <h3 className="current-stage-title">Claim Overview</h3>
                        <div className="claim-details-grid" style={{ marginTop: '1rem' }}>
                            <div className="detail-group"><label>Stage</label>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <select className="stage-selector" style={{ minWidth: 220 }} value={stage} onChange={(e) => changeStage(parseInt(e.target.value, 10))}>
                                        {STAGE_NAMES.map((n, i) => <option key={i + 1} value={i + 1}>{i + 1}. {n}</option>)}
                                    </select>
                                    {(stage === 11 || stage === 12) && (
                                        <button className="table-action-btn primary" onClick={reopenClaim}>Reopen</button>
                                    )}
                                </div>
                            </div>
                            <div className="detail-group"><label>Priority</label><div className="detail-value"><span className={`table-priority priority-${claim.priority || 'medium'}`}>{(claim.priority || 'medium')}</span></div></div>
                            <div className="detail-group"><label>Insurance Carrier</label><div className="detail-value">{carrier}</div></div>
                            <div className="detail-group"><label>Policy #</label><div className="detail-value">{claim.policy_number || '—'}</div></div>
                            <div className="detail-group"><label>Damage Type</label><div className="detail-value">{claim.damage_type || '—'}</div></div>
                            <div className="detail-group"><label>Date of Loss</label><div className="detail-value">{claim.date_of_loss || '—'}</div></div>
                            <div className="detail-group"><label>Estimated</label><div className="detail-value" style={{ color: '#16a34a', fontWeight: 600 }}>{fmtMoney(claim.claim_value)}</div></div>
                            <div className="detail-group"><label>Approved</label><div className="detail-value">{fmtMoney(claim.approved_amount)}</div></div>
                            <div className="detail-group"><label>Paid</label><div className="detail-value">{fmtMoney(claim.paid_amount)}</div></div>
                            <div className="detail-group"><label>Email</label><div className="detail-value">{claim.email || '—'}</div></div>
                            <div className="detail-group"><label>Phone</label><div className="detail-value">{claim.phone || '—'}</div></div>
                            <div className="detail-group"><label>Adjuster</label><div className="detail-value">{claim.adjuster_name || '—'}{claim.adjuster_phone ? ` · ${claim.adjuster_phone}` : ''}</div></div>
                            <div className="detail-group">
                                <label>Assigned To</label>
                                <div className="detail-value">
                                    {has('assign_claims') ? (() => {
                                        const opts = [...teamMembers];
                                        if (claim.assigned_to_user_id && !opts.some(m => m.id === claim.assigned_to_user_id)) {
                                            opts.unshift({ id: claim.assigned_to_user_id, name: claim.assigned_to_name || 'Current assignee' });
                                        }
                                        return (
                                            <select
                                                className="stage-selector"
                                                value={claim.assigned_to_user_id || ''}
                                                disabled={assigning}
                                                onChange={(e) => reassign(e.target.value)}
                                            >
                                                <option value="">Unassigned</option>
                                                {opts.map(m => (
                                                    <option key={m.id} value={m.id}>{m.name}</option>
                                                ))}
                                            </select>
                                        );
                                    })() : claim.assigned_to_user_id ? (
                                        claim.assigned_to_name || teamMembers.find(m => m.id === claim.assigned_to_user_id)?.name || 'Assigned'
                                    ) : (
                                        <span style={{ color: '#9ca3af' }}>Unassigned</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        {claim.notes && <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#374151' }}><strong>Notes:</strong> {claim.notes}</p>}
                    </div>

                    {/* Documents */}
                    <div className="current-stage-info" style={{ marginBottom: 0 }}>
                        <h3 className="current-stage-title">Documents ({uploads.length})</h3>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '0.75rem 0 1rem' }}>
                            {UPLOAD_TYPES.map(t => (
                                <div key={t.key}>
                                    <input type="file" ref={fileRefs[t.key]} style={{ display: 'none' }} accept={t.accept} multiple={!!t.multiple}
                                        onChange={(e) => { onUpload(t.key, e.target.files); e.target.value = ''; }} />
                                    <button className="show-more-btn" style={{ padding: '0.5rem 1rem' }} disabled={uploadingType === t.key}
                                        onClick={() => fileRefs[t.key].current?.click()}>
                                        {uploadingType === t.key ? 'Uploading…' : `+ ${t.label}`}
                                    </button>
                                </div>
                            ))}
                        </div>
                        {uploads.length === 0 && <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>No documents yet.</p>}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {uploads.map(u => (
                                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                                    {isPhoto(u) ? <AuthedThumb s3Key={u.s3_key} name={u.file_name} /> : <div style={{ width: 56, height: 56, borderRadius: 8, background: '#eef0f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#6b7280' }}>FILE</div>}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.file_name}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{u.upload_type} · {u.file_size ? `${Math.round(u.file_size / 1024)} KB` : ''}</div>
                                    </div>
                                    {/* Documents are private until the contractor
                                        shares them — a claim's files routinely
                                        include carrier paperwork the homeowner
                                        should not see. */}
                                    <label
                                        title="Show this document in the client's portal"
                                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: u.is_visible_in_portal ? '#15803d' : '#6b7280', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={!!u.is_visible_in_portal}
                                            onChange={() => toggleUploadVisibility(u)}
                                        />
                                        {u.is_visible_in_portal ? 'Shared' : 'Share'}
                                    </label>
                                    <button className="table-action-btn" onClick={() => removeUpload(u.id)}>Delete</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Insurance Communication — read-only feed the client sees
                        on their portal. Contractor logs what was sent to /
                        received from the carrier, calls, and notes. */}
                    <div className="current-stage-info" style={{ marginBottom: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                            <h3 className="current-stage-title" style={{ marginBottom: 0 }}>Insurance Communication ({comms.length})</h3>
                            <button className="show-more-btn" style={{ padding: '0.5rem 1rem' }} onClick={openCommModal}>+ Add Entry</button>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0.4rem 0 0.9rem' }}>
                            Everything you add here appears on the client's portal, newest first.
                        </p>
                        {comms.length === 0 && <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>No entries yet.</p>}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {comms.map(m => {
                                const t = COMM_BADGE[m.type] || COMM_BADGE.note;
                                return (
                                    <div key={m.id} style={{ display: 'flex', gap: '0.75rem', padding: '0.6rem 0.75rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                                        <span style={{ flexShrink: 0, alignSelf: 'flex-start', fontSize: '0.62rem', fontWeight: 800, letterSpacing: '.03em', textTransform: 'uppercase', padding: '0.25rem 0.5rem', borderRadius: 6, background: t.badge.bg, color: t.badge.fg, whiteSpace: 'nowrap' }}>
                                            {t.label}
                                        </span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{m.title}</div>
                                            {m.body && <div style={{ fontSize: '0.78rem', color: '#4b5563', marginTop: 2 }}>{m.body}</div>}
                                            <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 4 }}>
                                                {new Date(m.created_at).toLocaleString()}
                                                {m.attachment_name ? ` · 📎 ${m.attachment_name}` : ''}
                                            </div>
                                        </div>
                                        <button className="table-action-btn" style={{ alignSelf: 'flex-start' }} onClick={() => removeComm(m.id)}>Delete</button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right column — activity timeline */}
                <div className="current-stage-info" style={{ marginBottom: 0 }}>
                    <h3 className="current-stage-title">Activity</h3>
                    {activity.length === 0 && <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.75rem' }}>No activity yet.</p>}
                    <div className="history-timeline" style={{ marginTop: '1rem' }}>
                        {activity.map(ev => (
                            <div key={ev.id} className="history-item">
                                <div className="history-action">
                                    {ev.event_data?.summary || ev.event_type}
                                    <div className="history-date">{new Date(ev.created_at).toLocaleString()}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Add-Entry modal for the Insurance Communication feed */}
            {commModalOpen && (
                <div
                    onClick={() => !commSubmitting && setCommModalOpen(false)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000 }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}
                    >
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.25rem' }}>Add Communication Entry</h3>
                        <p style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: '1rem' }}>This appears on the client's portal feed.</p>

                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Type</label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
                            {COMM_TYPES.map(t => {
                                const active = commForm.type === t.key;
                                return (
                                    <button
                                        key={t.key}
                                        type="button"
                                        onClick={() => setCommForm(f => ({ ...f, type: t.key }))}
                                        style={{ padding: '0.4rem 0.8rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', border: active ? '2px solid #1a1f3a' : '1px solid #d1d5db', background: active ? t.badge.bg : '#fff', color: active ? t.badge.fg : '#374151' }}
                                    >
                                        {t.label}
                                    </button>
                                );
                            })}
                        </div>

                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Title</label>
                        <input
                            type="text"
                            value={commForm.title}
                            onChange={(e) => setCommForm(f => ({ ...f, title: e.target.value }))}
                            placeholder="e.g. Supplement package submitted to Westfield"
                            style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.85rem', marginBottom: '1rem' }}
                        />

                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Details <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span></label>
                        <textarea
                            value={commForm.body}
                            onChange={(e) => setCommForm(f => ({ ...f, body: e.target.value }))}
                            rows={3}
                            placeholder="What happened, in plain English for the homeowner."
                            style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.85rem', marginBottom: '1rem', resize: 'vertical', fontFamily: 'inherit' }}
                        />

                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Attachment <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span></label>
                        <input ref={commFileRef} type="file" style={{ display: 'none' }}
                            onChange={(e) => setCommFile(e.target.files?.[0] || null)} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem' }}>
                            <button type="button" className="show-more-btn" style={{ padding: '0.45rem 0.9rem' }} onClick={() => commFileRef.current?.click()}>
                                Choose file
                            </button>
                            <span style={{ fontSize: '0.78rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {commFile ? commFile.name : 'No file selected'}
                            </span>
                            {commFile && (
                                <button type="button" onClick={() => { setCommFile(null); if (commFileRef.current) commFileRef.current.value = ''; }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.78rem' }}>Remove</button>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            <button type="button" className="table-action-btn" disabled={commSubmitting} onClick={() => setCommModalOpen(false)}>Cancel</button>
                            <button type="button" className="table-action-btn primary" disabled={commSubmitting} onClick={submitComm}>
                                {commSubmitting ? 'Adding…' : 'Add Entry'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClaimDetail;
