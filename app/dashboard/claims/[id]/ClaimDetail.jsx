'use client'
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance';
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

const ClaimDetail = ({ id }) => {
    const [claim, setClaim] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploads, setUploads] = useState([]);
    const [activity, setActivity] = useState([]);
    const [uploadingType, setUploadingType] = useState(null);
    const fileRefs = { estimate: useRef(null), measurement: useRef(null), photo: useRef(null) };

    const load = async () => {
        try {
            setLoading(true);
            const [c, u, a] = await Promise.all([
                axiosInstance.get(`/client-portal/${id}`),
                axiosInstance.get(`/client-portal/${id}/uploads`),
                axiosInstance.get(`/client-portal/${id}/activity`),
            ]);
            setClaim(c.data?.data || null);
            setUploads(u.data?.data || []);
            setActivity(a.data?.data || []);
        } catch {
            // axiosInstance toasts
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [id]);

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

    const removeUpload = async (uploadId) => {
        try {
            await axiosInstance.delete(`/client-portal/${id}/uploads/${uploadId}`);
            setUploads(list => list.filter(x => x.id !== uploadId));
            toast.success('Document removed.');
        } catch { /* toasted */ }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading claim…</div>;
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
                                    <button className="table-action-btn" onClick={() => removeUpload(u.id)}>Delete</button>
                                </div>
                            ))}
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
        </div>
    );
};

export default ClaimDetail;
