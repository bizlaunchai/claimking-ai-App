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
    // Expanded read-only view. The LIST endpoint returns totals only, so the
    // line items are fetched on first expand and then cached per estimate —
    // a homeowner comparing two estimates shouldn't re-fetch on every toggle.
    const [expandedId, setExpandedId] = useState(null);
    const [detailById, setDetailById] = useState({});
    const [detailLoadingId, setDetailLoadingId] = useState(null);

    const toggleDetails = async (estimate) => {
        if (expandedId === estimate.id) { setExpandedId(null); return; }
        setExpandedId(estimate.id);
        if (detailById[estimate.id]) return;

        // A deep link (?estimate=<id>) already loaded the full record.
        if (Array.isArray(estimate.sections)) {
            setDetailById((m) => ({ ...m, [estimate.id]: estimate }));
            return;
        }

        setDetailLoadingId(estimate.id);
        try {
            const res = await axiosInstance.get(
                `/public/estimates/${estimate.id}`,
                { params: { client_id: clientId }, suppressErrorToast: true },
            );
            const full = res.data?.data;
            if (full) setDetailById((m) => ({ ...m, [estimate.id]: full }));
        } catch {
            setError('Unable to load this estimate’s details.');
            setExpandedId(null);
        } finally {
            setDetailLoadingId(null);
        }
    };

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
                const detail = detailById[e.id];
                const sectionCount = Array.isArray(e.sections)
                    ? e.sections.length
                    : (Array.isArray(detail?.sections) ? detail.sections.length : null);
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
                            {/* Fee spec (Jul-24): discount reads as a negative,
                                zero-value rows are hidden — same rules as the PDF. */}
                            {Number(e.discount_amt) > 0 && (
                                <div>
                                    <dt className="text-xs text-gray-500">
                                        Discount{e.discount_type === 'pct' && Number(e.discount_value) > 0
                                            ? ` (${e.discount_value}%)` : ''}
                                    </dt>
                                    <dd className="font-medium text-green-700">-{money(e.discount_amt)}</dd>
                                </div>
                            )}
                            {e.tax_on && Number(e.tax_amt) !== 0 && (
                                <div>
                                    <dt className="text-xs text-gray-500">
                                        {e.tax_name || 'Tax'} ({e.tax_pct ?? 0}%)
                                    </dt>
                                    <dd className="font-medium">{money(e.tax_amt)}</dd>
                                </div>
                            )}
                            {/* Named fee rows only come with the single-estimate
                                fetch; the list endpoint carries their total inside
                                total_rcv, so the numbers still add up either way. */}
                            {((detail ?? e).custom_fees ?? [])
                                .filter((f) => Number(f.amount) !== 0)
                                .map((f) => (
                                    <div key={f.id}>
                                        <dt className="text-xs text-gray-500">{f.name}</dt>
                                        <dd className="font-medium">{money(f.amount)}</dd>
                                    </div>
                                ))}
                            {Number(e.card_fee_amt) !== 0 && (
                                <div>
                                    <dt className="text-xs text-gray-500">
                                        Card processing fee ({e.card_fee_pct ?? 0}%)
                                    </dt>
                                    <dd className="font-medium">{money(e.card_fee_amt)}</dd>
                                </div>
                            )}
                        </dl>

                        <div className="flex flex-wrap gap-2">
                            {/* Read the estimate without downloading anything —
                                most homeowners open this on a phone, where a PDF
                                download is the worst way to read a line-item list. */}
                            <button
                                type="button"
                                onClick={() => toggleDetails(e)}
                                disabled={detailLoadingId === e.id}
                                aria-expanded={expandedId === e.id}
                                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-800 text-sm font-medium rounded hover:bg-gray-50 disabled:opacity-60"
                            >
                                {detailLoadingId === e.id
                                    ? 'Loading…'
                                    : expandedId === e.id ? 'Hide details' : 'View estimate'}
                            </button>
                            <button
                                type="button"
                                onClick={() => downloadPdf(e)}
                                disabled={downloadingId === e.id}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {downloadingId === e.id ? 'Preparing PDF…' : 'Download PDF'}
                            </button>
                        </div>

                        {expandedId === e.id && detail && (
                            <div className="mt-4 border-t border-gray-200 pt-4">
                                {(detail.sections ?? []).length === 0 && (
                                    <p className="text-sm text-gray-500">
                                        No line items have been added to this estimate yet.
                                    </p>
                                )}
                                {(detail.sections ?? []).map((s) => (
                                    <div key={s.id} className="mb-5">
                                        <h3 className="text-sm font-semibold text-gray-900 mb-2">
                                            {s.name}
                                        </h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm min-w-[420px]">
                                                <thead>
                                                    <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                                                        <th className="py-1.5 pr-2 font-medium">Item</th>
                                                        <th className="py-1.5 px-2 font-medium text-right">Qty</th>
                                                        <th className="py-1.5 px-2 font-medium">Unit</th>
                                                        <th className="py-1.5 px-2 font-medium text-right">Price</th>
                                                        <th className="py-1.5 pl-2 font-medium text-right">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(s.items ?? []).map((it) => (
                                                        <tr key={it.id} className="border-b border-gray-100 align-top">
                                                            <td className="py-2 pr-2">
                                                                <div className="text-gray-900">{it.name}</div>
                                                                {/* The "why this line is here" note — the whole
                                                                    point of the portal is transparency. */}
                                                                {it.reason && (
                                                                    <div className="text-xs text-gray-500 mt-0.5">{it.reason}</div>
                                                                )}
                                                                {it.code_ref && (
                                                                    <div className="text-[11px] text-blue-800 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 mt-1 inline-block">
                                                                        {it.code_ref}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="py-2 px-2 text-right whitespace-nowrap">{Number(it.qty) || 0}</td>
                                                            <td className="py-2 px-2 whitespace-nowrap">{it.unit}</td>
                                                            <td className="py-2 px-2 text-right whitespace-nowrap">{money(it.price)}</td>
                                                            <td className="py-2 pl-2 text-right font-medium whitespace-nowrap">
                                                                {money((Number(it.qty) || 0) * (Number(it.price) || 0))}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                                <div className="flex justify-between border-t-2 border-gray-800 pt-2 text-sm font-bold">
                                    <span>Total</span>
                                    <span>{money(detail.total_rcv ?? e.total_rcv)}</span>
                                </div>
                            </div>
                        )}
                    </article>
                );
            })}
        </div>
    );
};

export default PortalEstimates;
