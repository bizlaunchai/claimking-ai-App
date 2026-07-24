'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axiosInstance from '@/lib/axiosInstance';

// ─────────────────────────────────────────────────────────────────────────────
// "Other Documents" for the homeowner portal.
//
// Spec source: docs/Client-Portal.html line 1496
//   "Documents Library: All shared docs — signed contracts, scope of work,
//    photos, measurement reports."
//
// Visibility model (identical to the mockups gallery):
//   * Every claim document lives in claim_uploads.
//   * is_visible_in_portal defaults to FALSE — a claim's files routinely
//     include carrier paperwork and internal photos.
//   * The contractor opts each file in from the claim detail page.
//   * GET /portal-public/:token/documents returns ONLY shared ones, and the
//     download endpoint re-checks the flag, so un-sharing takes effect even
//     for a bookmarked link.
//
// Downloads go through the token-scoped proxy — the homeowner has no bearer
// token, so the dashboard's /s3/file route is not an option here.
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_LABELS = {
    estimate: 'Estimate',
    measurement: 'Measurement report',
    photo: 'Photo',
    other: 'Document',
};

const fmtDate = (iso) => {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleDateString([], {
            month: 'short', day: 'numeric', year: 'numeric',
        });
    } catch { return iso; }
};

const fmtSize = (bytes) => {
    const n = Number(bytes) || 0;
    if (!n) return '';
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

export default function PortalDocuments() {
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
                    `/portal-public/${token}/documents`,
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

    const download = async (doc) => {
        setDownloadingId(doc.id);
        setError(null);
        try {
            const res = await axiosInstance.get(
                `/portal-public/${token}/documents/${doc.id}/file`,
                { responseType: 'blob', suppressErrorToast: true },
            );
            const url = URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = doc.portal_label || doc.file_name || 'document';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch {
            // Most likely the contractor un-shared it since this list loaded.
            setError('That document is no longer available. Please refresh.');
        } finally {
            setDownloadingId(null);
        }
    };

    if (loading) {
        return <p className="text-gray-500 text-sm">Loading documents…</p>;
    }

    if (items.length === 0) {
        // Friendly empty state rather than hiding the section — the homeowner
        // learns the section exists and checks back later.
        return (
            <p className="text-gray-700 bg-white border border-gray-200 rounded p-6 text-center text-sm">
                Your contractor hasn’t shared any documents yet.
            </p>
        );
    }

    return (
        <div className="space-y-2">
            {error && (
                <p className="text-red-700 bg-red-50 border border-red-200 rounded p-3 text-sm">
                    {error}
                </p>
            )}
            {items.map((d) => (
                <div
                    key={d.id}
                    className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3"
                >
                    <div className="w-11 h-11 shrink-0 rounded bg-gray-100 text-gray-500 text-[10px] font-semibold flex items-center justify-center uppercase">
                        {(d.file_name || '').split('.').pop()?.slice(0, 4) || 'FILE'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                            {d.portal_label || d.file_name || 'Document'}
                        </div>
                        <div className="text-xs text-gray-500">
                            {TYPE_LABELS[d.upload_type] || 'Document'}
                            {fmtSize(d.file_size) && ` · ${fmtSize(d.file_size)}`}
                            {` · ${fmtDate(d.shared_at || d.created_at)}`}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => download(d)}
                        disabled={downloadingId === d.id}
                        className="px-3 py-1.5 border border-gray-300 text-gray-800 text-sm font-medium rounded hover:bg-gray-50 disabled:opacity-60 whitespace-nowrap"
                    >
                        {downloadingId === d.id ? 'Downloading…' : 'Download'}
                    </button>
                </div>
            ))}
        </div>
    );
}
