'use client';
import React, { useRef, useState } from 'react';
import { Upload, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance';

/**
 * Historical call CSV import modal (task 4.5 / §6.4). Admin-only (import_call_data).
 * Downloads the template, uploads a filled CSV, shows the results summary. The
 * template is downloadable; call DATA never is (§6.5).
 */
export default function CallImportModal({ open, onClose, onImported }) {
    const inputRef = useRef(null);
    const [busy, setBusy] = useState('');
    const [result, setResult] = useState(null);
    if (!open) return null;

    const downloadTemplate = async () => {
        setBusy('template');
        try {
            const res = await axiosInstance.get('/api/calls/import/template', { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url; a.download = 'call-import-template.csv';
            document.body.appendChild(a); a.click(); a.remove();
            URL.revokeObjectURL(url);
        } catch { /* interceptor */ } finally { setBusy(''); }
    };

    const upload = async (file) => {
        if (!file) return;
        setBusy('upload'); setResult(null);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await axiosInstance.post('/api/calls/import', fd);
            setResult(res.data);
            toast.success(`Imported ${res.data.imported} call(s)`);
            onImported?.();
        } catch { /* interceptor */ } finally { setBusy(''); }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl w-full max-w-[520px] shadow-[0_20px_60px_rgba(0,0,0,0.3)]" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center px-6 py-5 border-b border-gray-200">
                    <h2 className="text-lg font-bold text-gray-800" style={{ margin: 0 }}>Import Historical Calls</h2>
                    <button className="w-8 h-8 border-0 bg-transparent cursor-pointer text-2xl text-gray-500 hover:bg-gray-100 rounded-md" onClick={onClose}>×</button>
                </div>
                <div className="p-6">
                    <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
                        Upload past call data as a CSV to backfill history. Rows are phone-matched to existing clients and deduped — re-uploading the same file adds zero duplicates.
                    </p>

                    <button onClick={downloadTemplate} disabled={busy === 'template'}
                        style={btn('#fff', '#374151', '1.5px solid #e5e7eb')}>
                        {busy === 'template' ? <Loader2 size={15} className="spin" /> : <Download size={15} />} Download CSV template
                    </button>

                    <div style={{ marginTop: 14, border: '2px dashed #e5e7eb', borderRadius: 12, padding: 24, textAlign: 'center', cursor: 'pointer', background: '#f9fafb' }}
                        onClick={() => inputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) upload(e.dataTransfer.files[0]); }}>
                        <Upload size={26} color="#9ca3af" style={{ margin: '0 auto 8px' }} />
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{busy === 'upload' ? <><span className="ck-spinner sm ck-btn-spin" />Importing…</> : 'Click or drop your CSV here'}</div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>date, time, direction, from, to, duration, answered_by, source, campaign, notes</div>
                        <input ref={inputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={(e) => upload(e.target.files?.[0])} />
                    </div>

                    {result && (
                        <div style={{ marginTop: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#166534', marginBottom: 8 }}>
                                <CheckCircle2 size={16} /> Import complete
                            </div>
                            <div style={{ fontSize: 13, color: '#374151', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                <span>Total rows: <b>{result.total_rows}</b></span>
                                <span>Imported: <b>{result.imported}</b></span>
                                <span>Duplicates: <b>{result.duplicates}</b></span>
                                <span>Errors: <b>{result.errors?.length || 0}</b></span>
                            </div>
                            {result.errors?.length > 0 && (
                                <div style={{ marginTop: 8, fontSize: 12, color: '#b45309', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                                    <span>{result.errors.slice(0, 4).map((e) => `row ${e.row}: ${e.reason}`).join(' · ')}{result.errors.length > 4 ? '…' : ''}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}

function btn(bg, color, border) {
    return {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '10px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
        background: bg, color, border: border || 'none', width: '100%',
    };
}
