'use client'
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import axiosInstance from '@/lib/axiosInstance';
import { LEGAL_DISCLAIMER_SHORT } from '../disclaimer';
import '../policy-analysis.css';

const PAGE_SIZE = 25;

const DOCUMENT_TYPE_LABELS = {
    policy: 'Insurance Policy',
    claim_ack: 'Claim Acknowledgment',
    denial: 'Denial Letter',
    adjuster_estimate: 'Adjuster Estimate',
    scope_of_work: 'Scope of Work',
    email_thread: 'Carrier Email',
    unknown: 'Unknown',
};

const STATUS_STYLES = {
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    processing: 'bg-blue-100 text-blue-700',
    pending: 'bg-gray-100 text-gray-700',
};

const fmtDate = (iso) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
};

const clientName = (c) => {
    if (!c) return '—';
    return c.full_name ||
        `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() ||
        '—';
};

/**
 * Past analyses list. Powered by GET /policy-analyses with paging and the
 * optional status filter. Soft-delete uses DELETE /policy-analyses/:id —
 * the backend already strips deleted rows from list responses, so we just
 * refetch after a remove.
 */
const PolicyAnalysisHistory = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [offset, setOffset] = useState(0);
    const [total, setTotal] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { limit: PAGE_SIZE, offset };
            if (statusFilter) params.status = statusFilter;
            const res = await axiosInstance.get('/policy-analyses', { params });
            setRows(res.data?.data ?? []);
            setTotal(res.data?.meta?.total ?? 0);
        } catch {
            /* axiosInstance toasts */
        } finally {
            setLoading(false);
        }
    }, [offset, statusFilter]);

    useEffect(() => { load(); }, [load]);

    const handleDelete = async (id) => {
        if (!confirm('Delete this analysis? It can be restored by an admin.')) return;
        try {
            await axiosInstance.delete(`/policy-analyses/${id}`);
            load();
        } catch { /* toasted */ }
    };

    // Re-run the AI on the stored S3 file. Backend re-checks credits (so the
    // user is debited again) and overwrites the findings in-place. We just
    // refetch the list to pick up the updated row + status.
    const [reanalyzingId, setReanalyzingId] = useState(null);
    const handleReanalyze = async (id) => {
        if (!confirm('Re-analyze this document? This will use credits again.')) return;
        setReanalyzingId(id);
        try {
            await axiosInstance.post(`/policy-analyses/${id}/reanalyze`);
            await load();
        } catch { /* toasted */ } finally {
            setReanalyzingId(null);
        }
    };

    const pageStart = offset + 1;
    const pageEnd = Math.min(offset + rows.length, total);
    const canPrev = offset > 0;
    const canNext = offset + PAGE_SIZE < total;

    return (
        <div className="policy-analysis-history bg-gray-50 min-h-screen">
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Policy Analysis · History</h1>
                        <p className="text-sm text-gray-600 mt-1">Past analyses for your clients.</p>
                    </div>
                    <Link
                        href="/dashboard/policy-analysis"
                        className="px-4 py-2 bg-yellow-400 text-gray-900 rounded-lg font-medium hover:bg-yellow-500 transition"
                    >
                        + New Analysis
                    </Link>
                </div>
            </div>

            <div className="px-6 py-6">
                <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex items-center gap-3">
                    <label className="text-sm text-gray-700">Status:</label>
                    <select
                        className="px-3 py-2 border border-gray-300 rounded text-sm"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }}
                    >
                        <option value="">All</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                        <option value="processing">Processing</option>
                        <option value="pending">Pending</option>
                    </select>
                    <div className="ml-auto text-sm text-gray-500">
                        {total > 0 ? `${pageStart}–${pageEnd} of ${total}` : ''}
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading…</div>
                    ) : rows.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No analyses yet. <Link href="/dashboard/policy-analysis" className="text-blue-600 underline">Run your first analysis →</Link>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600">
                                <tr>
                                    <th className="text-left px-4 py-3">Date</th>
                                    <th className="text-left px-4 py-3">Client</th>
                                    <th className="text-left px-4 py-3">Document Type</th>
                                    <th className="text-left px-4 py-3">Status</th>
                                    <th className="text-left px-4 py-3">Carrier</th>
                                    <th className="text-left px-4 py-3">File</th>
                                    <th className="text-right px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
                                    <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-700">{fmtDate(r.created_at)}</td>
                                        <td className="px-4 py-3 text-gray-900 font-medium">{clientName(r.client)}</td>
                                        <td className="px-4 py-3 text-gray-700">{DOCUMENT_TYPE_LABELS[r.document_type] ?? r.document_type}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_STYLES[r.status] || 'bg-gray-100 text-gray-700'}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">
                                            {r.detected_carrier || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={r.file_name}>
                                            {r.file_name || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            {r.status === 'completed' && (
                                                <Link
                                                    href={`/dashboard/policy-analysis?analysis=${r.id}`}
                                                    className="text-xs text-blue-600 hover:underline mr-3"
                                                >
                                                    View
                                                </Link>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleReanalyze(r.id)}
                                                disabled={reanalyzingId === r.id}
                                                className={`text-xs mr-3 ${reanalyzingId === r.id ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:underline'}`}
                                            >
                                                {reanalyzingId === r.id ? 'Re-analyzing…' : 'Re-analyze'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(r.id)}
                                                className="text-xs text-red-600 hover:underline"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {total > PAGE_SIZE && (
                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            type="button"
                            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                            disabled={!canPrev}
                            className={`px-3 py-2 text-sm rounded border ${canPrev ? 'border-gray-300 text-gray-700 hover:bg-gray-50' : 'border-gray-200 text-gray-400 cursor-not-allowed'}`}
                        >
                            ← Previous
                        </button>
                        <button
                            type="button"
                            onClick={() => setOffset(offset + PAGE_SIZE)}
                            disabled={!canNext}
                            className={`px-3 py-2 text-sm rounded border ${canNext ? 'border-gray-300 text-gray-700 hover:bg-gray-50' : 'border-gray-200 text-gray-400 cursor-not-allowed'}`}
                        >
                            Next →
                        </button>
                    </div>
                )}

                <p className="text-[11px] text-gray-500 mt-6">
                    <strong>Disclaimer:</strong> {LEGAL_DISCLAIMER_SHORT}
                </p>
            </div>
        </div>
    );
};

export default PolicyAnalysisHistory;
