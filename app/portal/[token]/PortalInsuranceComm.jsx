'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axiosInstance from '@/lib/axiosInstance';

// ─────────────────────────────────────────────────────────────────────────────
// "Insurance Communication" — read-only feed on the homeowner portal.
//
// Spec: docs/new/Portal-Sections-Reference.html
//   Everything the contractor sends to / receives from the insurance company
//   on this claim, plus call logs and manual notes. Answers "what's happening
//   with my claim?" without the homeowner having to call.
//
// Data model: claim_communications (sql/75). The contractor adds entries from
// the claim detail page; the client can only read them here.
//   * GET /portal-public/:token/communications           — the feed, newest first
//   * GET /portal-public/:token/communications/:id/attachment — one attachment
//
// No bearer token here — the URL token is the credential, so downloads go
// through the token-scoped proxy, same as the documents section.
// ─────────────────────────────────────────────────────────────────────────────

// Badge styling per entry type — mirrors the reference HTML exactly.
const DIR = {
    sent:     { label: 'WE SENT',  bg: '#eef2ff', fg: '#3730a3' },
    received: { label: 'RECEIVED', bg: '#fef3c7', fg: '#92400e' },
    call:     { label: 'CALL',     bg: '#dcfce7', fg: '#166534' },
    note:     { label: 'NOTE',     bg: '#f3f4f6', fg: '#374151' },
};

const fmtWhen = (iso) => {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString([], {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit',
        });
    } catch { return iso; }
};

export default function PortalInsuranceComm() {
    const params = useParams();
    const token = params?.token;

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const { data } = await axiosInstance.get(
                    `/portal-public/${token}/communications`,
                    { suppressErrorToast: true },
                );
                if (!cancelled) setItems(data?.data ?? []);
            } catch {
                if (!cancelled) setItems([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [token]);

    const downloadAttachment = async (entry) => {
        setDownloadingId(entry.id);
        setError(null);
        try {
            const res = await axiosInstance.get(
                `/portal-public/${token}/communications/${entry.id}/attachment`,
                { responseType: 'blob', suppressErrorToast: true },
            );
            const url = URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = entry.attachment_name || 'attachment';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch {
            setError('That attachment is no longer available. Please refresh.');
        } finally {
            setDownloadingId(null);
        }
    };

    if (loading) {
        return <div className="ck-load-block" style={{ padding: '1.5rem', minHeight: 0 }}><span className="ck-spinner" /><span>Loading updates…</span></div>;
    }

    if (items.length === 0) {
        // Friendly empty state — the homeowner learns the section exists and
        // checks back as the claim progresses.
        return (
            <p className="text-gray-700 bg-white border border-gray-200 rounded p-6 text-center text-sm">
                No insurance updates yet. Your contractor will post here as things
                move forward with your carrier.
            </p>
        );
    }

    return (
        <div>
            {error && (
                <p className="text-red-700 bg-red-50 border border-red-200 rounded p-3 text-sm mb-3">
                    {error}
                </p>
            )}
            {items.map((e, i) => {
                const dir = DIR[e.type] || DIR.note;
                return (
                    <div
                        key={e.id}
                        className="flex gap-3 py-3.5"
                        style={{ borderBottom: i === items.length - 1 ? 'none' : '1px solid #f5f5f5' }}
                    >
                        <div
                            className="shrink-0 w-[86px] text-center font-extrabold py-1 rounded-md h-fit"
                            style={{
                                background: dir.bg, color: dir.fg,
                                fontSize: '10.5px', letterSpacing: '.03em',
                            }}
                        >
                            {dir.label}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-900">{e.title}</div>
                            {e.body && (
                                <div className="text-[13px] text-gray-600 mt-0.5 leading-snug">
                                    {e.body}
                                </div>
                            )}
                            <div className="text-[11px] text-gray-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span>{fmtWhen(e.created_at)}</span>
                                {e.has_attachment && (
                                    <button
                                        type="button"
                                        onClick={() => downloadAttachment(e)}
                                        disabled={downloadingId === e.id}
                                        className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-medium disabled:opacity-60"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                                             stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                            <polyline points="7 10 12 15 17 10"/>
                                            <line x1="12" y1="15" x2="12" y2="3"/>
                                        </svg>
                                        {downloadingId === e.id
                                            ? 'Downloading…'
                                            : (e.attachment_name || 'Attachment')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
