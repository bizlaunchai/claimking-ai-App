'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance';
import '../crm-sync.css';

/**
 * Per-connection detail page — sync settings, field mappings, sync log,
 * push/pull triggers, webhook URL display.
 *
 * Tabs are simple anchor-style nav (no router state) so a hard refresh just
 * lands on Overview again — fine for a tool a contractor visits sporadically.
 */

const TABS = ['overview', 'settings', 'mapping', 'log'];

const ENTITIES = [
    { key: 'clients', label: 'Clients (contacts)' },
    { key: 'claims', label: 'Claims (jobs)' },
    { key: 'estimates', label: 'Estimates' },
    { key: 'communications', label: 'Communications' },
    { key: 'documents', label: 'Documents' },
    { key: 'photos', label: 'Photos' },
];

const ConnectionDetail = () => {
    const params = useParams();
    const router = useRouter();
    const id = params?.id;

    const [conn, setConn] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');

    // Settings tab — staged edits
    const [settingsDraft, setSettingsDraft] = useState(null);
    const [savingSettings, setSavingSettings] = useState(false);

    // Field mapping tab
    const [mappings, setMappings] = useState([]);
    const [defaultMapping, setDefaultMapping] = useState({});
    const [savingMappings, setSavingMappings] = useState(false);
    const [mappingsLoading, setMappingsLoading] = useState(false);

    // Sync log tab
    const [log, setLog] = useState([]);
    const [logLoading, setLogLoading] = useState(false);
    const [logTotal, setLogTotal] = useState(0);

    // Push/pull busy state
    const [pulling, setPulling] = useState(false);

    // ─── Loaders ─────────────────────────────────────────────────────────
    const loadConn = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await axiosInstance.get(`/crm/connections/${id}`);
            setConn(res.data);
            setSettingsDraft({
                entities: res.data?.sync_settings?.entities ?? {},
                direction: res.data?.sync_settings?.direction ?? 'two_way',
                frequency: res.data?.sync_settings?.frequency ?? 'hourly',
                conflict: res.data?.sync_settings?.conflict ?? 'last_write_wins',
            });
        } catch {
            /* axios toasts */
        } finally {
            setLoading(false);
        }
    }, [id]);

    const loadMappings = useCallback(async () => {
        if (!id || !conn?.crm_type) return;
        setMappingsLoading(true);
        try {
            const [savedRes, defaultsRes] = await Promise.all([
                axiosInstance.get(`/crm/connections/${id}/field-mappings`),
                axiosInstance.get(`/crm/defaults/${conn.crm_type}/field-mapping`, { suppressErrorToast: true }),
            ]);
            const saved = savedRes.data?.data ?? [];
            const defaults = defaultsRes.data?.mapping ?? {};
            setDefaultMapping(defaults);
            // If nothing saved yet, seed the editor from defaults.
            if (saved.length === 0 && Object.keys(defaults).length > 0) {
                setMappings(
                    Object.entries(defaults).map(([ckField, extField]) => {
                        const [entity, field] = ckField.split('.');
                        return {
                            claimking_entity: entity,
                            claimking_field: field,
                            external_field: extField,
                            sync_direction: 'bidirectional',
                            is_required: false,
                            _new: true,
                        };
                    }),
                );
            } else {
                setMappings(saved);
            }
        } catch {
            /* axios toasts */
        } finally {
            setMappingsLoading(false);
        }
    }, [id, conn?.crm_type]);

    const loadLog = useCallback(async () => {
        if (!id) return;
        setLogLoading(true);
        try {
            const res = await axiosInstance.get(`/crm/connections/${id}/sync-log`, {
                params: { pageSize: 100 },
            });
            setLog(res.data?.data ?? []);
            setLogTotal(res.data?.total ?? 0);
        } catch {
            /* axios toasts */
        } finally {
            setLogLoading(false);
        }
    }, [id]);

    useEffect(() => { loadConn(); }, [loadConn]);
    useEffect(() => { if (tab === 'mapping') loadMappings(); }, [tab, loadMappings]);
    useEffect(() => { if (tab === 'log' || tab === 'overview') loadLog(); }, [tab, loadLog]);

    // ─── Webhook URL (display only) ──────────────────────────────────────
    const webhookUrl = useMemo(() => {
        if (!conn) return '';
        const base = process.env.NEXT_PUBLIC_API_URL || '';
        return `${base.replace(/\/$/, '')}/webhooks/crm/${conn.crm_type}/${conn.id}`;
    }, [conn]);

    const copyWebhook = async () => {
        try {
            await navigator.clipboard.writeText(webhookUrl);
            toast.success('Webhook URL copied');
        } catch {
            toast.error('Could not copy — select and Ctrl+C manually');
        }
    };

    // ─── Settings save ───────────────────────────────────────────────────
    const saveSettings = async () => {
        setSavingSettings(true);
        try {
            await axiosInstance.patch(`/crm/connections/${id}`, {
                sync_settings: settingsDraft,
            });
            toast.success('Sync settings saved');
            loadConn();
        } catch {
            /* axios toasts */
        } finally {
            setSavingSettings(false);
        }
    };

    // ─── Field mappings save (replace-all) ──────────────────────────────
    const addMappingRow = () => {
        setMappings((rows) => [
            ...rows,
            {
                claimking_entity: 'client',
                claimking_field: '',
                external_field: '',
                sync_direction: 'bidirectional',
                is_required: false,
                _new: true,
            },
        ]);
    };

    const updateMapping = (idx, patch) => {
        setMappings((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    };

    const removeMapping = (idx) => {
        setMappings((rows) => rows.filter((_, i) => i !== idx));
    };

    const resetMappingsToDefault = () => {
        setMappings(
            Object.entries(defaultMapping).map(([ckField, extField]) => {
                const [entity, field] = ckField.split('.');
                return {
                    claimking_entity: entity,
                    claimking_field: field,
                    external_field: extField,
                    sync_direction: 'bidirectional',
                    is_required: false,
                    _new: true,
                };
            }),
        );
        toast.info('Reset to default — Save to persist');
    };

    const saveMappings = async () => {
        // Drop any blank rows + dedupe by (entity, field)
        const cleaned = mappings
            .filter((m) => m.claimking_field?.trim() && m.external_field?.trim())
            .map((m) => ({
                claimking_entity: m.claimking_entity,
                claimking_field: m.claimking_field.trim(),
                external_field: m.external_field.trim(),
                transform: m.transform || undefined,
                sync_direction: m.sync_direction || 'bidirectional',
                is_required: !!m.is_required,
            }));
        setSavingMappings(true);
        try {
            const res = await axiosInstance.post(`/crm/connections/${id}/field-mappings`, {
                mappings: cleaned,
            });
            toast.success(`Saved ${res.data?.data?.length ?? 0} mappings`);
            loadMappings();
        } catch {
            /* axios toasts */
        } finally {
            setSavingMappings(false);
        }
    };

    // ─── Push/pull triggers ──────────────────────────────────────────────
    const triggerPull = async () => {
        setPulling(true);
        try {
            const res = await axiosInstance.post(`/crm/connections/${id}/pull?limit=50`);
            const { created = 0, updated = 0, skipped = 0, errors = 0 } = res.data ?? {};
            toast.success(`Pull done — ${created} created · ${updated} updated · ${skipped} skipped · ${errors} errors`);
            loadConn();
            loadLog();
        } catch {
            /* axios toasts */
        } finally {
            setPulling(false);
        }
    };

    // ─── Render ──────────────────────────────────────────────────────────
    if (loading || !conn) {
        return <div style={{ padding: 24, color: '#6b7280' }}>Loading connection…</div>;
    }

    return (
        <div className="main-container">
            <div style={{ marginBottom: '1rem' }}>
                <button type="button" className="crm-link-btn" onClick={() => router.push('/dashboard/crm-sync')}>
                    ← Back to CRM list
                </button>
            </div>

            {/* Header card */}
            <div className="crm-selection">
                <div className="conn-detail-head">
                    <div style={{ flex: 1 }}>
                        <h2 className="section-title" style={{ marginBottom: 4 }}>{conn.connection_name}</h2>
                        <p className="section-description" style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{conn.crm_type}</p>
                    </div>
                    <span className={`conn-status conn-status-${conn.status}`}>{conn.status.replace('_', ' ')}</span>
                </div>
                {conn.last_error && (
                    <div className="conn-error-banner">
                        <strong>Last error:</strong> {conn.last_error}
                    </div>
                )}

                {/* Tabs */}
                <div className="crm-tabs">
                    {TABS.map((t) => (
                        <button
                            key={t}
                            type="button"
                            className={`crm-tab ${tab === t ? 'crm-tab-active' : ''}`}
                            onClick={() => setTab(t)}
                        >
                            {t === 'overview' && 'Overview'}
                            {t === 'settings' && 'Sync settings'}
                            {t === 'mapping' && 'Field mapping'}
                            {t === 'log' && `Sync log (${logTotal})`}
                        </button>
                    ))}
                </div>

                {/* ── Overview ─────────────────────────────────────────── */}
                {tab === 'overview' && (
                    <div className="crm-tab-body">
                        <div className="crm-grid-2col">
                            <div className="crm-stat">
                                <div className="crm-stat-label">Last sync</div>
                                <div className="crm-stat-value">{conn.last_sync_at ? new Date(conn.last_sync_at).toLocaleString() : '—'}</div>
                            </div>
                            <div className="crm-stat">
                                <div className="crm-stat-label">Connected since</div>
                                <div className="crm-stat-value">{new Date(conn.created_at).toLocaleString()}</div>
                            </div>
                            <div className="crm-stat">
                                <div className="crm-stat-label">Direction</div>
                                <div className="crm-stat-value">{conn.sync_settings?.direction ?? 'two_way'}</div>
                            </div>
                            <div className="crm-stat">
                                <div className="crm-stat-label">Frequency</div>
                                <div className="crm-stat-value">{conn.sync_settings?.frequency ?? 'hourly'}</div>
                            </div>
                        </div>

                        <div className="crm-action-row">
                            <button type="button" className="crm-btn-primary" onClick={triggerPull} disabled={pulling}>
                                {pulling ? 'Pulling…' : '↓ Pull recent contacts'}
                            </button>
                            <span className="crm-hint" style={{ marginLeft: 12 }}>
                                Use the Claims page to push a specific claim — auto-push runs in the background.
                            </span>
                        </div>

                        <div style={{ marginTop: '1.5rem' }}>
                            <h4 className="crm-h4">Webhook URL (for real-time sync)</h4>
                            <p className="crm-hint">Paste this into your CRM's webhook settings. Requests are HMAC-verified.</p>
                            <div className="crm-webhook-row">
                                <code className="crm-webhook-code">{webhookUrl}</code>
                                <button type="button" className="crm-btn-secondary" onClick={copyWebhook}>Copy</button>
                            </div>
                        </div>

                        {/* Recent log preview */}
                        <div style={{ marginTop: '1.5rem' }}>
                            <h4 className="crm-h4">Recent events</h4>
                            {logLoading ? (
                                <div className="crm-hint">Loading…</div>
                            ) : log.length === 0 ? (
                                <div className="crm-hint">No sync events yet.</div>
                            ) : (
                                <LogTable rows={log.slice(0, 8)} />
                            )}
                        </div>
                    </div>
                )}

                {/* ── Settings ─────────────────────────────────────────── */}
                {tab === 'settings' && settingsDraft && (
                    <div className="crm-tab-body">
                        <h4 className="crm-h4">What to sync</h4>
                        <div className="crm-checkbox-grid">
                            {ENTITIES.map((e) => (
                                <label key={e.key} className="crm-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={!!settingsDraft.entities?.[e.key]}
                                        onChange={(ev) => setSettingsDraft((d) => ({
                                            ...d,
                                            entities: { ...d.entities, [e.key]: ev.target.checked },
                                        }))}
                                    />
                                    <span>{e.label}</span>
                                </label>
                            ))}
                        </div>

                        <h4 className="crm-h4" style={{ marginTop: '1.5rem' }}>Direction</h4>
                        <div className="crm-radio-row">
                            {[
                                { value: 'push', label: 'Push only (ClaimKing → CRM)' },
                                { value: 'pull', label: 'Pull only (CRM → ClaimKing)' },
                                { value: 'two_way', label: 'Two-way sync' },
                            ].map((opt) => (
                                <label key={opt.value} className="crm-radio">
                                    <input
                                        type="radio"
                                        name="direction"
                                        value={opt.value}
                                        checked={settingsDraft.direction === opt.value}
                                        onChange={(e) => setSettingsDraft((d) => ({ ...d, direction: e.target.value }))}
                                    />
                                    <span>{opt.label}</span>
                                </label>
                            ))}
                        </div>

                        <h4 className="crm-h4" style={{ marginTop: '1.5rem' }}>Frequency</h4>
                        <select
                            className="crm-select"
                            value={settingsDraft.frequency}
                            onChange={(e) => setSettingsDraft((d) => ({ ...d, frequency: e.target.value }))}
                        >
                            <option value="realtime">Real-time (webhooks)</option>
                            <option value="every_15_min">Every 15 minutes</option>
                            <option value="hourly">Hourly</option>
                            <option value="daily">Daily</option>
                        </select>

                        <h4 className="crm-h4" style={{ marginTop: '1.5rem' }}>Conflict resolution</h4>
                        <select
                            className="crm-select"
                            value={settingsDraft.conflict}
                            onChange={(e) => setSettingsDraft((d) => ({ ...d, conflict: e.target.value }))}
                        >
                            <option value="last_write_wins">Latest update wins</option>
                            <option value="claimking_primary">ClaimKing is source of truth</option>
                            <option value="crm_primary">CRM is source of truth</option>
                        </select>

                        <div className="crm-action-row" style={{ marginTop: '2rem' }}>
                            <button type="button" className="crm-btn-primary" onClick={saveSettings} disabled={savingSettings}>
                                {savingSettings ? 'Saving…' : 'Save settings'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Field mapping ────────────────────────────────────── */}
                {tab === 'mapping' && (
                    <div className="crm-tab-body">
                        <div className="crm-action-row" style={{ justifyContent: 'space-between' }}>
                            <p className="crm-hint" style={{ flex: 1 }}>
                                Map ClaimKing fields to your {conn.crm_type} fields. Defaults are pre-filled — override anything you need.
                            </p>
                            <button type="button" className="crm-btn-secondary" onClick={resetMappingsToDefault}>↺ Reset to defaults</button>
                            <button type="button" className="crm-btn-secondary" onClick={addMappingRow}>+ Add field</button>
                        </div>

                        {mappingsLoading ? (
                            <div className="crm-hint">Loading…</div>
                        ) : (
                            <div className="crm-mapping-table">
                                <div className="crm-mapping-row crm-mapping-head">
                                    <span>ClaimKing entity</span>
                                    <span>ClaimKing field</span>
                                    <span>{conn.crm_type} field</span>
                                    <span>Direction</span>
                                    <span></span>
                                </div>
                                {mappings.map((m, idx) => (
                                    <div key={idx} className="crm-mapping-row">
                                        <select
                                            value={m.claimking_entity}
                                            onChange={(e) => updateMapping(idx, { claimking_entity: e.target.value })}
                                        >
                                            <option value="client">client</option>
                                            <option value="claim">claim</option>
                                            <option value="estimate">estimate</option>
                                            <option value="property">property</option>
                                            <option value="communication">communication</option>
                                        </select>
                                        <input
                                            type="text"
                                            value={m.claimking_field}
                                            onChange={(e) => updateMapping(idx, { claimking_field: e.target.value })}
                                            placeholder="e.g. first_name"
                                        />
                                        <input
                                            type="text"
                                            value={m.external_field}
                                            onChange={(e) => updateMapping(idx, { external_field: e.target.value })}
                                            placeholder={`e.g. ${conn.crm_type === 'jobnimbus' ? 'first_name' : 'firstName'}`}
                                        />
                                        <select
                                            value={m.sync_direction || 'bidirectional'}
                                            onChange={(e) => updateMapping(idx, { sync_direction: e.target.value })}
                                        >
                                            <option value="bidirectional">↔ both</option>
                                            <option value="push">→ push</option>
                                            <option value="pull">← pull</option>
                                            <option value="disabled">disabled</option>
                                        </select>
                                        <button
                                            type="button"
                                            className="crm-icon-btn"
                                            onClick={() => removeMapping(idx)}
                                            title="Remove"
                                        >×</button>
                                    </div>
                                ))}
                                {mappings.length === 0 && (
                                    <div className="crm-hint" style={{ padding: '1rem' }}>
                                        No fields mapped. Click "Reset to defaults" to seed from the {conn.crm_type} template.
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="crm-action-row" style={{ marginTop: '1rem' }}>
                            <button type="button" className="crm-btn-primary" onClick={saveMappings} disabled={savingMappings}>
                                {savingMappings ? 'Saving…' : `Save ${mappings.length} mappings`}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Sync log ─────────────────────────────────────────── */}
                {tab === 'log' && (
                    <div className="crm-tab-body">
                        {logLoading ? (
                            <div className="crm-hint">Loading…</div>
                        ) : log.length === 0 ? (
                            <div className="crm-hint">No sync events yet.</div>
                        ) : (
                            <LogTable rows={log} />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Reusable log table ──────────────────────────────────────────────────
const LogTable = ({ rows }) => (
    <div className="crm-log-table">
        <div className="crm-log-row crm-log-head">
            <span>When</span>
            <span>Event</span>
            <span>Direction</span>
            <span>Record</span>
            <span>Status</span>
            <span>Detail</span>
        </div>
        {rows.map((r) => (
            <div key={r.id} className="crm-log-row">
                <span>{new Date(r.created_at).toLocaleString()}</span>
                <span>{r.event_type}</span>
                <span>{r.direction}</span>
                <span>{r.record_type ?? '—'} {r.external_record_id ? `· ${r.external_record_id.slice(0, 12)}…` : ''}</span>
                <span className={`crm-log-status crm-log-status-${r.status}`}>{r.status}</span>
                <span className="crm-log-detail">{r.error_message || (r.http_status ? `HTTP ${r.http_status}` : '')}</span>
            </div>
        ))}
    </div>
);

export default ConnectionDetail;
