'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, Loader2, Plus, ClipboardPaste, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance';
import { usePermissions } from '@/lib/permissions/PermissionsContext';

/**
 * "Answered By" — RingCentral extension → employee mapping (task 4.3, §6.2).
 * The phone system reports which extension answered; this table links each
 * extension to a ClaimKing user so the call log shows the real name. Discovered
 * extensions (seen on real calls) are pre-listed; a bulk-paste box turns Nate's
 * "ext, email" list into rows in one shot.
 */
export default function AgentMappingSection({ open }) {
    const { has } = usePermissions();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [members, setMembers] = useState([]);
    const [rows, setRows] = useState([]); // { provider, provider_agent_id, user_id }
    const [showPaste, setShowPaste] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const [pasteResult, setPasteResult] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axiosInstance.get('/api/calls/agent-mappings', { suppressErrorToast: true });
            setMembers(data?.members || []);
            const mapped = (data?.mappings || []).map((m) => ({
                provider: m.provider, provider_agent_id: m.provider_agent_id, user_id: m.user_id || '',
            }));
            const mappedKeys = new Set(mapped.map((m) => `${m.provider}:${m.provider_agent_id}`));
            const discovered = (data?.unmapped_extensions || [])
                .filter((u) => !mappedKeys.has(`${u.provider}:${u.provider_agent_id}`))
                .map((u) => ({ provider: u.provider, provider_agent_id: u.provider_agent_id, user_id: '', _hint: u.sample_name, _count: u.count }));
            setRows([...mapped, ...discovered]);
        } catch {
            /* silent — RC may not be connected yet */
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { if (open) load(); }, [open, load]);

    const setRow = (i, patch) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    const removeRow = (i) => setRow(i, { user_id: '' }); // clearing → deleted on save
    const addRow = () => setRows((rs) => [...rs, { provider: 'ringcentral', provider_agent_id: '', user_id: '' }]);

    const applyPaste = () => {
        const byEmail = new Map(members.map((m) => [String(m.email || '').toLowerCase(), m]));
        const byName = new Map(members.map((m) => [String(m.name || '').toLowerCase(), m]));
        const lines = pasteText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const matched = [];
        const unmatched = [];
        for (const line of lines) {
            if (/^ext(ension)?\b/i.test(line)) continue; // skip a header row
            const parts = line.split(/[,\t]/).map((p) => p.trim()).filter(Boolean);
            if (parts.length < 2) { unmatched.push(line); continue; }
            const ext = parts[0];
            const key = parts.slice(1).join(' ').toLowerCase();
            const m = byEmail.get(parts[1].toLowerCase()) || byEmail.get(key) || byName.get(key);
            if (m) matched.push({ provider: 'ringcentral', provider_agent_id: ext, user_id: m.id });
            else unmatched.push(line);
        }
        // Merge matched into rows (overwrite same provider:ext, else append).
        setRows((rs) => {
            const next = [...rs];
            for (const m of matched) {
                const idx = next.findIndex((r) => r.provider === m.provider && r.provider_agent_id === m.provider_agent_id);
                if (idx >= 0) next[idx] = { ...next[idx], user_id: m.user_id };
                else next.push(m);
            }
            return next;
        });
        setPasteResult({ matched: matched.length, unmatched });
    };

    const save = async () => {
        setSaving(true);
        try {
            const payload = rows
                .filter((r) => r.provider_agent_id)
                .map((r) => ({ provider: r.provider || 'ringcentral', provider_agent_id: r.provider_agent_id, user_id: r.user_id || null }));
            const { data } = await axiosInstance.patch('/api/calls/agent-mappings', { mappings: payload });
            toast.success('Answered-By mappings saved');
            // Refresh from the server response.
            setMembers(data?.members || members);
            const mapped = (data?.mappings || []).map((m) => ({ provider: m.provider, provider_agent_id: m.provider_agent_id, user_id: m.user_id || '' }));
            const mappedKeys = new Set(mapped.map((m) => `${m.provider}:${m.provider_agent_id}`));
            const discovered = (data?.unmapped_extensions || [])
                .filter((u) => !mappedKeys.has(`${u.provider}:${u.provider_agent_id}`))
                .map((u) => ({ provider: u.provider, provider_agent_id: u.provider_agent_id, user_id: '', _hint: u.sample_name, _count: u.count }));
            setRows([...mapped, ...discovered]);
            setShowPaste(false); setPasteText(''); setPasteResult(null);
        } catch {
            /* interceptor toasts */
        } finally { setSaving(false); }
    };

    const visibleRows = useMemo(() => rows, [rows]);
    if (!has('configure_call_center')) return null;

    return (
        <div style={{ marginTop: 28, borderTop: '1px solid #f3f4f6', paddingTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                <div className="ics-provider" style={{ border: 'none', padding: 0 }}>
                    <Users size={16} color="#ea580c" /> Answered By — Extension Mapping
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="ics-btn" style={{ background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb' }} onClick={() => setShowPaste((v) => !v)}>
                        <ClipboardPaste size={14} /> Bulk paste
                    </button>
                    <button className="ics-btn" style={{ background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb' }} onClick={addRow}>
                        <Plus size={14} /> Add
                    </button>
                    <button className="ics-btn" onClick={save} disabled={saving || loading}>
                        {saving ? <Loader2 size={14} style={{ animation: 'ics-spin 1s linear infinite' }} /> : 'Save mappings'}
                    </button>
                </div>
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                Link each RingCentral extension to the employee who answers on it, so the call log shows the real name.
            </div>

            {showPaste && (
                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                    <div className="ics-lbl">Paste Nate&apos;s list — one per line: <span className="mono">extension, email</span> (or <span className="mono">extension, name</span>)</div>
                    <textarea className="ics-input mono" style={{ minHeight: 96, resize: 'vertical' }}
                        placeholder={'101, jane@roofgutternow.com\n102, Bob Field'}
                        value={pasteText} onChange={(e) => setPasteText(e.target.value)} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                        <button className="ics-btn" onClick={applyPaste} disabled={!pasteText.trim()}>Parse &amp; fill</button>
                        {pasteResult && (
                            <span style={{ fontSize: 12, color: pasteResult.unmatched.length ? '#b45309' : '#166534' }}>
                                {pasteResult.matched} matched{pasteResult.unmatched.length ? ` · ${pasteResult.unmatched.length} not matched` : ''}
                            </span>
                        )}
                    </div>
                    {pasteResult?.unmatched?.length > 0 && (
                        <div style={{ fontSize: 11, color: '#b45309', marginTop: 8 }}>
                            Not matched (check the email/name matches a team member): {pasteResult.unmatched.slice(0, 5).join(' · ')}{pasteResult.unmatched.length > 5 ? '…' : ''}
                        </div>
                    )}
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>Parsing fills the rows below — click <b>Save mappings</b> to apply.</div>
                </div>
            )}

            {loading ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                    <Loader2 size={16} style={{ animation: 'ics-spin 1s linear infinite' }} /> Loading…
                </div>
            ) : !visibleRows.length ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13, background: '#f9fafb', borderRadius: 10 }}>
                    No extensions yet. Connect RingCentral or add a row / paste the list above.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {visibleRows.map((r, i) => (
                        <div key={`${r.provider}:${r.provider_agent_id}:${i}`} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 36px', gap: 10, alignItems: 'center' }}>
                            {r._hint || r._count ? (
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                                    <span className="mono">{r.provider_agent_id}</span>
                                    {r._count ? <span style={{ fontSize: 11, color: '#9ca3af' }}> · {r._count} call{r._count > 1 ? 's' : ''}</span> : null}
                                </div>
                            ) : (
                                <input className="ics-input mono" placeholder="Extension" value={r.provider_agent_id}
                                    onChange={(e) => setRow(i, { provider_agent_id: e.target.value })} />
                            )}
                            <select className="ics-input" value={r.user_id} onChange={(e) => setRow(i, { user_id: e.target.value })}>
                                <option value="">— Unassigned —</option>
                                {members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.email ? ` (${m.email})` : ''}</option>)}
                            </select>
                            <button className="ics-btn" style={{ background: '#fff', color: '#9ca3af', border: '1.5px solid #e5e7eb', padding: 8 }}
                                title="Clear mapping" onClick={() => removeRow(i)}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
