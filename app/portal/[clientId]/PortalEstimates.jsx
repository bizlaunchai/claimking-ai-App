'use client'
import React, { useEffect, useState } from 'react';
import axiosInstance from '@/lib/axiosInstance';

// ─────────────────────────────────────────────────────────────────────────────
// Public client-facing list of estimates shared by the contractor.
//
// URL surface: rendered inside /portal/<clientId>?estimate=<estimateId>
//
// - Unauthenticated; backend gates by client_id UUID acting as a bearer.
// - Read-only: client cannot edit, only view + download PDF.
// - Only estimates with status ∈ {sent, approved, signed} are returned.
// ─────────────────────────────────────────────────────────────────────────────

const fmtDate = (iso) => {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
};

const money = (n) => `$${(Number(n) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
})}`;

const STATUS_LABELS = {
    sent: 'Sent',
    approved: 'Approved',
    signed: 'Signed',
};

const PortalEstimates = ({ clientId, estimateId }) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                let res;
                if (estimateId) {
                    res = await axiosInstance.get(
                        `/public/estimates/${estimateId}`,
                        { params: { client_id: clientId }, suppressErrorToast: true },
                    );
                    if (!cancelled) setRows(res.data?.data ? [res.data.data] : []);
                } else {
                    res = await axiosInstance.get(
                        '/public/estimates',
                        { params: { client_id: clientId }, suppressErrorToast: true },
                    );
                    if (!cancelled) setRows(res.data?.data ?? []);
                }
            } catch (e) {
                if (!cancelled) {
                    setError(e?.response?.status === 404 ? 'Not found' : 'Unable to load estimates.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [clientId, estimateId]);

    const downloadPdf = async (estimate) => {
        setDownloadingId(estimate.id);
        try {
            const res = await axiosInstance.post(
                `/public/estimates/${estimate.id}/pdf`,
                {}, // server uses its own defaults; portal does not customize branding
                {
                    params: { client_id: clientId },
                    responseType: 'blob',
                    suppressErrorToast: true,
                },
            );
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const disposition = res.headers?.['content-disposition'] || '';
            const match = /filename="?([^"]+)"?/.exec(disposition);
            const filename = match?.[1] || `estimate_${estimate.id.slice(0, 8)}.pdf`;
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch {
            setError('Unable to download PDF. Please try again.');
        } finally {
            setDownloadingId(null);
        }
    };

    if (loading) {
        return <p className="text-gray-500 text-sm">Loading estimates…</p>;
    }
    if (error === 'Not found') {
        return (
            <p className="text-gray-700 bg-white border border-gray-200 rounded p-6 text-center text-sm">
                This estimate is not available.
            </p>
        );
    }
    if (rows.length === 0) {
        return (
            <p className="text-gray-700 bg-white border border-gray-200 rounded p-6 text-center text-sm">
                Your contractor hasn’t shared any estimates yet.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            {error && error !== 'Not found' && (
                <p className="text-red-700 bg-red-50 border border-red-200 rounded p-3 text-sm">
                    {error}
                </p>
            )}
            {rows.map((e) => {
                const sectionCount = Array.isArray(e.sections) ? e.sections.length : null;
                return (
                    <article
                        key={e.id}
                        className="bg-white rounded-lg border border-gray-200 p-5"
                    >
                        <header className="flex justify-between items-start gap-4 mb-3">
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">
                                    {e.estimate_title || 'Estimate'}
                                </p>
                                <h2 className="text-lg font-semibold text-gray-900 mt-1">
                                    {e.title || 'Project estimate'}
                                </h2>
                                <p className="text-xs text-gray-500 mt-1">
                                    Shared {fmtDate(e.updated_at || e.created_at)}
                                    {sectionCount !== null && ` · ${sectionCount} section${sectionCount === 1 ? '' : 's'}`}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-gray-900">
                                    {money(e.total_rcv)}
                                </div>
                                <p className="text-xs text-gray-500">Total</p>
                                {e.status && (
                                    <span className="inline-block mt-1 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                        {STATUS_LABELS[e.status] || e.status}
                                    </span>
                                )}
                            </div>
                        </header>

                        <dl className="grid grid-cols-3 gap-3 text-sm mb-4">
                            <div>
                                <dt className="text-xs text-gray-500">Subtotal</dt>
                                <dd className="font-medium">{money(e.subtotal)}</dd>
                            </div>
                            {e.overhead_on && (
                                <div>
                                    <dt className="text-xs text-gray-500">Overhead &amp; Profit</dt>
                                    <dd className="font-medium">{money(e.overhead_amt)}</dd>
                                </div>
                            )}
                            {e.tax_on && (
                                <div>
                                    <dt className="text-xs text-gray-500">
                                        {e.tax_name || 'Tax'} ({e.tax_pct ?? 0}%)
                                    </dt>
                                    <dd className="font-medium">{money(e.tax_amt)}</dd>
                                </div>
                            )}
                        </dl>

                        <button
                            type="button"
                            onClick={() => downloadPdf(e)}
                            disabled={downloadingId === e.id}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {downloadingId === e.id ? 'Preparing PDF…' : 'Download PDF'}
                        </button>
                    </article>
                );
            })}
        </div>
    );
};

export default PortalEstimates;
