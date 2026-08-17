'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Activity, AlertTriangle, BarChart3, Cpu, DollarSign, Gauge,
    Power, RefreshCw, Save, ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance.js';

/**
 * Superadmin AI Cost Control dashboard.
 *
 * Backend (all under manage_api_keys permission):
 *   GET  /admin/ai-usage/status
 *   GET  /admin/ai-usage/cost-per-feature?days=
 *   GET  /admin/ai-usage/daily?days=
 *   GET  /admin/ai-usage/recent?limit=
 *   GET  /admin/ai-usage/settings
 *   POST /admin/ai-usage/settings         (upsert caps; omit company_id → global row)
 *   POST /admin/ai-usage/kill-switch      ({ disabled })
 *   GET  /admin/ai-usage/models
 *   POST /admin/ai-usage/models/:featureKey
 *
 * Errors are toasted globally by the axios interceptor.
 */
const TABS = [
    { id: 'overview', label: 'Overview', Icon: BarChart3 },
    { id: 'caps', label: 'Spending Caps', Icon: Gauge },
    { id: 'models', label: 'Models', Icon: Cpu },
    { id: 'recent', label: 'Activity Log', Icon: Activity },
];

const money = (n) => `$${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (n) => Number(n ?? 0).toLocaleString();

// Human-readable names for the internal feature keys shown across the dashboard
// (Models tab, cost-per-feature table, activity log).
const FEATURE_LABELS = {
    __default_text__: 'Default · Text (Claude)',
    __default_vision__: 'Default · Vision (Gemini)',
    __default_image__: 'Default · Image (Gemini)',
    estimate_generate: 'Estimate — Generate',
    estimate_review: 'Estimate — AI Review',
    estimate_changes: 'Estimate — AI Changes',
    supplement_generate: 'Supplement — Generate',
    rate_extract: 'Rate Book — Extract',
    policy_analysis: 'Policy Analysis',
    comms_extract: 'Email / SMS — Extract',
    gmb_review_reply: 'Google Business — Review Reply',
    gmb_caption: 'Google Business — Post Caption',
    photo_vision: 'Photo — Damage Vision',
    measurement_extract: 'Measurement — Extract',
    color_import: 'Color Chart Import',
    mockup_generate: '3D Mockup — Generate',
    document_generate: 'Document — Generate',
};

/** Pretty label for a feature key; falls back to Title Case of the raw key. */
const featureLabel = (key) => {
    if (!key) return '—';
    if (FEATURE_LABELS[key]) return FEATURE_LABELS[key];
    return String(key)
        .replace(/^__|__$/g, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
};

// Known model ids per provider — power the model-picker dropdowns. Not
// exhaustive: the field still accepts a custom id (typed) so a brand-new model
// works before this list is updated.
const KNOWN_MODELS = {
    claude: [
        'claude-opus-4-8', 'claude-opus-4-7', 'claude-sonnet-5',
        'claude-sonnet-4-6', 'claude-haiku-4-5-20251001', 'claude-fable-5',
    ],
    gemini: [
        'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-image',
        'gemini-2.5-flash-image-preview', 'gemini-2.0-flash',
        'gemini-2.0-flash-preview-image-generation', 'gemini-1.5-pro', 'gemini-1.5-flash',
    ],
    openai: ['gpt-4o', 'gpt-4o-mini'],
};

// Friendly labels for the model-picker suggestions (datalist shows label + id).
const MODEL_LABELS = {
    'claude-opus-4-8': 'Claude Opus 4.8 — most capable, priciest',
    'claude-opus-4-7': 'Claude Opus 4.7',
    'claude-sonnet-5': 'Claude Sonnet 5',
    'claude-sonnet-4-6': 'Claude Sonnet 4.6 — balanced (default)',
    'claude-haiku-4-5-20251001': 'Claude Haiku 4.5 — cheapest 💸',
    'claude-fable-5': 'Claude Fable 5',
    'gemini-2.5-pro': 'Gemini 2.5 Pro — best vision',
    'gemini-2.5-flash': 'Gemini 2.5 Flash — cheap (default vision)',
    'gemini-2.5-flash-image': 'Gemini 2.5 Flash Image',
    'gemini-2.5-flash-image-preview': 'Gemini 2.5 Flash Image (preview)',
    'gemini-2.0-flash': 'Gemini 2.0 Flash',
    'gemini-2.0-flash-preview-image-generation': 'Gemini 2.0 Flash Image (preview)',
    'gemini-1.5-pro': 'Gemini 1.5 Pro',
    'gemini-1.5-flash': 'Gemini 1.5 Flash — cheapest vision',
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o mini — cheapest OpenAI',
};

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function AiUsageAdmin() {
    const [tab, setTab] = useState('overview');
    // Time filter: preset 'today' | '7' | '30' | '90' | 'custom'.
    const [preset, setPreset] = useState('30');
    const [customFrom, setCustomFrom] = useState(todayStr());
    const [customTo, setCustomTo] = useState(todayStr());

    const [status, setStatus] = useState(null);
    const [cpf, setCpf] = useState(null);          // { total_cost_usd, features:[] }
    const [daily, setDaily] = useState([]);
    const [settings, setSettings] = useState([]);
    const [models, setModels] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);

    const globalRow = useMemo(
        () => settings.find((s) => s.company_id == null) ?? null,
        [settings],
    );
    const killed = !!globalRow?.ai_disabled;

    // Build the query string + a human label for the active time filter.
    const range = useMemo(() => {
        if (preset === 'today') { const d = todayStr(); return { qs: `from=${d}&to=${d}`, label: 'Today' }; }
        if (preset === 'custom') {
            const from = customFrom || todayStr();
            const to = customTo || todayStr();
            // Guard swapped dates.
            const [a, b] = from <= to ? [from, to] : [to, from];
            return { qs: `from=${a}&to=${b}`, label: a === b ? a : `${a} → ${b}` };
        }
        return { qs: `days=${preset}`, label: `Last ${preset} days` };
    }, [preset, customFrom, customTo]);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [st, cp, dy, se, mo, co] = await Promise.all([
                axiosInstance.get('/admin/ai-usage/status'),
                axiosInstance.get(`/admin/ai-usage/cost-per-feature?${range.qs}`),
                axiosInstance.get(`/admin/ai-usage/daily?${range.qs}`),
                axiosInstance.get('/admin/ai-usage/settings'),
                axiosInstance.get('/admin/ai-usage/models'),
                axiosInstance.get('/admin/ai-usage/companies'),
            ]);
            setStatus(st.data ?? null);
            setCpf(cp.data ?? null);
            setDaily(dy.data ?? []);
            setSettings(se.data ?? []);
            setModels(mo.data ?? []);
            setCompanies(co.data ?? []);
        } catch { /* toasted */ } finally { setLoading(false); }
    }, [range.qs]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const toggleKillSwitch = async () => {
        const next = !killed;
        if (next && !confirm('Turn OFF all AI features platform-wide? Every AI request will be blocked until you turn it back on.')) return;
        try {
            await axiosInstance.post('/admin/ai-usage/kill-switch', { disabled: next });
            toast.success(next ? 'AI globally disabled' : 'AI re-enabled');
            fetchAll();
        } catch { /* toasted */ }
    };

    return (
        <div className="aiu-wrap">
            <style>{styles}</style>
            <div className="aiu-inner">
                {/* Header */}
                <div className="aiu-head">
                    <div>
                        <div className="aiu-title-row">
                            <div className="aiu-logo"><DollarSign size={18} color="#fbbf24" /></div>
                            <h1 className="aiu-title">AI Cost Control</h1>
                        </div>
                        <p className="aiu-sub">
                            Live AI spend, spending caps &amp; circuit breaker, model selection, and the
                            emergency kill-switch. Cost = real provider tokens × published rates (an estimate — reconcile monthly).
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <select className="aiu-input" style={{ width: 150 }} value={preset} onChange={(e) => setPreset(e.target.value)}>
                            <option value="today">Today</option>
                            <option value="7">Last 7 days</option>
                            <option value="30">Last 30 days</option>
                            <option value="90">Last 90 days</option>
                            <option value="custom">Custom range…</option>
                        </select>
                        {preset === 'custom' && (
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <input type="date" className="aiu-input" style={{ width: 150 }} value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)} />
                                <span style={{ color: '#9ca3af', fontSize: 13 }}>→</span>
                                <input type="date" className="aiu-input" style={{ width: 150 }} value={customTo} min={customFrom || undefined} max={todayStr()} onChange={(e) => setCustomTo(e.target.value)} />
                            </div>
                        )}
                        <button className="aiu-btn aiu-btn-ghost" onClick={fetchAll} disabled={loading}>
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>
                </div>

                {/* Kill-switch banner */}
                <div className={`aiu-kill ${killed ? 'on' : ''}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {killed ? <ShieldAlert size={22} color="#dc2626" /> : <Power size={22} color="#059669" />}
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>
                                {killed ? 'AI is DISABLED platform-wide' : 'AI is running'}
                            </div>
                            <div style={{ fontSize: 12.5, color: '#6b7280' }}>
                                {killed
                                    ? 'Every AI request is being blocked. Use this only for emergencies.'
                                    : 'Emergency kill-switch — instantly pauses every AI feature for all companies.'}
                            </div>
                        </div>
                    </div>
                    <button className={`aiu-btn ${killed ? 'aiu-btn-primary' : 'aiu-btn-danger'}`} onClick={toggleKillSwitch}>
                        <Power size={14} /> {killed ? 'Re-enable AI' : 'Kill all AI'}
                    </button>
                </div>

                {/* Tabs */}
                <div className="aiu-tabs">
                    {TABS.map(({ id, label, Icon }) => (
                        <button key={id} className={`aiu-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
                            <Icon size={15} /> {label}
                        </button>
                    ))}
                </div>

                {loading && <div className="aiu-card ck-load-block"><span className="ck-spinner" /><span>Loading…</span></div>}

                {!loading && tab === 'overview' && <Overview status={status} cpf={cpf} daily={daily} rangeLabel={range.label} />}
                {!loading && tab === 'caps' && <CapsTab settings={settings} companies={companies} onSaved={fetchAll} />}
                {!loading && tab === 'models' && <ModelsTab models={models} onSaved={fetchAll} />}
                {tab === 'recent' && <RecentTab />}
            </div>
        </div>
    );
}

/* ────────────────────────────── Overview ────────────────────────────── */
function Overview({ status, cpf, daily, rangeLabel }) {
    const dailyPct = status?.daily_cap_usd
        ? Math.min(100, Math.round((status.daily_spend_usd / status.daily_cap_usd) * 100))
        : null;
    const monthPct = status?.monthly_cap_usd
        ? Math.min(100, Math.round((status.monthly_spend_usd / status.monthly_cap_usd) * 100))
        : null;
    const maxDaily = Math.max(1, ...daily.map((d) => d.cost_usd || 0));

    return (
        <>
            <div className="aiu-stats">
                <StatMeter label="Today's spend" value={money(status?.daily_spend_usd)}
                    cap={status?.daily_cap_usd} pct={dailyPct} />
                <StatMeter label="This month" value={money(status?.monthly_spend_usd)}
                    cap={status?.monthly_cap_usd} pct={monthPct} />
                <div className="aiu-card aiu-stat">
                    <div className="aiu-stat-label">Cost · {rangeLabel}</div>
                    <div className="aiu-stat-val">{money(cpf?.total_cost_usd)}</div>
                    <div className="aiu-stat-foot">
                        {status?.enabled
                            ? <span className="aiu-pill on">Circuit breaker ON</span>
                            : <span className="aiu-pill off">Breaker OFF</span>}
                        {status?.hard_block
                            ? <span className="aiu-pill" style={{ marginLeft: 6 }}>Hard block</span>
                            : <span className="aiu-pill warn" style={{ marginLeft: 6 }}>Alert only</span>}
                    </div>
                </div>
            </div>

            {/* Daily trend */}
            <div className="aiu-card" style={{ padding: 18 }}>
                <div className="aiu-card-title">Daily spend</div>
                {daily.length === 0 ? (
                    <div className="aiu-empty">No spend recorded yet.</div>
                ) : (
                    <div className="aiu-bars">
                        {daily.map((d) => (
                            <div key={d.date} className="aiu-bar-col" title={`${d.date}: ${money(d.cost_usd)} · ${num(d.requests)} req`}>
                                <div className="aiu-bar" style={{ height: `${Math.max(3, (d.cost_usd / maxDaily) * 100)}%` }} />
                                <div className="aiu-bar-lbl">{d.date.slice(5)}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Cost per feature */}
            <div className="aiu-card">
                <div className="aiu-card-title" style={{ padding: '16px 18px 0' }}>Cost per feature</div>
                <div className="aiu-trow aiu-trow-head" style={{ marginTop: 10 }}>
                    <div>Feature</div><div>Requests</div><div>Errors</div>
                    <div>Input tok</div><div>Output tok</div><div style={{ textAlign: 'right' }}>Cost</div>
                </div>
                {(cpf?.features ?? []).length === 0 && <div className="aiu-empty">No usage in this window.</div>}
                {(cpf?.features ?? []).map((f) => (
                    <div key={f.feature} className="aiu-trow">
                        <div>
                            <div style={{ fontWeight: 600 }}>{featureLabel(f.feature)}</div>
                            <div className="aiu-mono" style={{ fontSize: 11, color: '#9ca3af' }}>{f.feature}</div>
                        </div>
                        <div>{num(f.requests)}</div>
                        <div style={{ color: f.errors ? '#b91c1c' : '#6b7280' }}>{num(f.errors)}</div>
                        <div>{num(f.input_tokens)}</div>
                        <div>{num(f.output_tokens)}{f.images ? ` · ${num(f.images)} img` : ''}</div>
                        <div style={{ textAlign: 'right', fontWeight: 700 }}>{money(f.cost_usd)}</div>
                    </div>
                ))}
            </div>
        </>
    );
}

function StatMeter({ label, value, cap, pct }) {
    const danger = pct != null && pct >= 90;
    const warn = pct != null && pct >= 80 && pct < 90;
    return (
        <div className="aiu-card aiu-stat">
            <div className="aiu-stat-label">{label}</div>
            <div className="aiu-stat-val">{value}</div>
            {cap != null ? (
                <>
                    <div className="aiu-meter"><div className="aiu-meter-fill"
                        style={{ width: `${pct}%`, background: danger ? '#dc2626' : warn ? '#f59e0b' : '#4f46e5' }} /></div>
                    <div className="aiu-stat-foot">{pct}% of {money(cap)} cap</div>
                </>
            ) : <div className="aiu-stat-foot" style={{ color: '#9ca3af' }}>No cap set</div>}
        </div>
    );
}

/* ────────────────────────────── Caps tab ────────────────────────────── */
function CapsTab({ settings, companies, onSaved }) {
    const companyName = (id) => companies.find((c) => c.id === id)?.name ?? null;
    return (
        <>
            <div className="aiu-note">
                The <strong>global</strong> row applies to every company that has no override of its own.
                A per-company row takes precedence. Leave a cap blank for “no cap”.
                <em> Hard block</em> = stop requests over cap; off = alert only (still lets them through).
            </div>
            {settings.map((row) => (
                <CapRow key={row.id ?? 'global'} row={row} companyName={companyName(row.company_id)} onSaved={onSaved} />
            ))}
            <NewCompanyCap companies={companies} settings={settings} onSaved={onSaved} />
        </>
    );
}

function CapRow({ row, companyName, onSaved }) {
    const isGlobal = row.company_id == null;
    const [d, setD] = useState({
        daily_cap_usd: row.daily_cap_usd ?? '',
        monthly_cap_usd: row.monthly_cap_usd ?? '',
        daily_request_cap: row.daily_request_cap ?? '',
        enabled: !!row.enabled,
        hard_block: !!row.hard_block,
        alert_threshold_pct: row.alert_threshold_pct ?? '',
        alert_email: row.alert_email ?? '',
    });
    const [saving, setSaving] = useState(false);

    const set = (k, v) => setD((p) => ({ ...p, [k]: v }));
    const numOrNull = (v) => (v === '' || v == null ? null : Number(v));

    const save = async () => {
        setSaving(true);
        try {
            await axiosInstance.post('/admin/ai-usage/settings', {
                company_id: row.company_id ?? undefined,
                daily_cap_usd: numOrNull(d.daily_cap_usd),
                monthly_cap_usd: numOrNull(d.monthly_cap_usd),
                daily_request_cap: numOrNull(d.daily_request_cap),
                enabled: d.enabled,
                hard_block: d.hard_block,
                alert_threshold_pct: numOrNull(d.alert_threshold_pct),
                alert_email: d.alert_email || null,
            });
            toast.success(isGlobal ? 'Global caps saved' : 'Company caps saved');
            onSaved();
        } catch { /* toasted */ } finally { setSaving(false); }
    };

    return (
        <div className="aiu-card" style={{ padding: 18 }}>
            <div className="aiu-card-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                {isGlobal
                    ? <>🌐 Global default</>
                    : <>🏢 {companyName ?? 'Company'} <span className="aiu-mono" style={{ fontSize: 11, color: '#9ca3af' }}>{row.company_id}</span></>}
            </div>
            <div className="aiu-form-grid">
                <Field label="Daily cap ($)"><input type="number" min={0} step="0.01" className="aiu-input" value={d.daily_cap_usd} onChange={(e) => set('daily_cap_usd', e.target.value)} placeholder="none" /></Field>
                <Field label="Monthly cap ($)"><input type="number" min={0} step="0.01" className="aiu-input" value={d.monthly_cap_usd} onChange={(e) => set('monthly_cap_usd', e.target.value)} placeholder="none" /></Field>
                <Field label="Daily request cap"><input type="number" min={0} className="aiu-input" value={d.daily_request_cap} onChange={(e) => set('daily_request_cap', e.target.value)} placeholder="none" /></Field>
                <Field label="Circuit breaker"><select className="aiu-input" value={d.enabled ? 'on' : 'off'} onChange={(e) => set('enabled', e.target.value === 'on')}><option value="on">Enabled</option><option value="off">Disabled</option></select></Field>
                <Field label="Over-cap behaviour"><select className="aiu-input" value={d.hard_block ? 'block' : 'alert'} onChange={(e) => set('hard_block', e.target.value === 'block')}><option value="block">Hard block</option><option value="alert">Alert only</option></select></Field>
                <Field label="Alert at % of cap"><input type="number" min={1} max={100} className="aiu-input" value={d.alert_threshold_pct} onChange={(e) => set('alert_threshold_pct', e.target.value)} placeholder="e.g. 80" /></Field>
                <Field label="Alert email" wide><input type="email" className="aiu-input" value={d.alert_email} onChange={(e) => set('alert_email', e.target.value)} placeholder="ops@company.com" /></Field>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <button className="aiu-btn aiu-btn-primary" onClick={save} disabled={saving}>{saving ? <span className="ck-spinner sm" /> : <Save size={14} />} {saving ? 'Saving…' : 'Save'}</button>
            </div>
        </div>
    );
}

function NewCompanyCap({ companies, settings, onSaved }) {
    const [open, setOpen] = useState(false);
    const [companyId, setCompanyId] = useState('');
    const [saving, setSaving] = useState(false);

    // Only offer companies that don't already have an override row.
    const taken = new Set(settings.filter((s) => s.company_id).map((s) => s.company_id));
    const available = companies.filter((c) => !taken.has(c.id));

    if (!open) {
        return (
            <button className="aiu-btn aiu-btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setOpen(true)}>
                + Add per-company override
            </button>
        );
    }
    return (
        <div className="aiu-card" style={{ padding: 18 }}>
            <div className="aiu-card-title" style={{ marginBottom: 12 }}>New per-company override</div>
            {available.length === 0 ? (
                <div className="aiu-empty" style={{ padding: 12 }}>
                    {companies.length === 0 ? 'No companies found.' : 'Every company already has an override.'}
                </div>
            ) : (
                <Field label="Company" wide>
                    <select className="aiu-input" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                        <option value="">— Select a company —</option>
                        {available.map((c) => (
                            <option key={c.id} value={c.id}>{c.name || '(unnamed)'}</option>
                        ))}
                    </select>
                </Field>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                <button className="aiu-btn aiu-btn-ghost" onClick={() => { setOpen(false); setCompanyId(''); }}>Cancel</button>
                <button className="aiu-btn aiu-btn-primary" disabled={!companyId || saving} onClick={async () => {
                    setSaving(true);
                    try {
                        await axiosInstance.post('/admin/ai-usage/settings', { company_id: companyId, enabled: true, hard_block: true });
                        toast.success('Override created — edit its caps above');
                        setOpen(false); setCompanyId(''); onSaved();
                    } catch { /* toasted */ } finally { setSaving(false); }
                }}>{saving ? <><span className="ck-spinner sm ck-btn-spin" />Creating…</> : 'Create'}</button>
            </div>
        </div>
    );
}

/* ────────────────────────────── Models tab ────────────────────────────── */
function ModelsTab({ models, onSaved }) {
    return (
        <>
            <div className="aiu-note">
                Pick the model each AI feature uses — <strong>no redeploy needed</strong>. The
                <span className="aiu-mono"> __default_*__ </span> rows are the fallback for any feature
                without its own row. Defaults are the cheap tier (Sonnet / Flash); raise a specific
                feature to Opus only if it needs the quality. Pick from the dropdown or type a custom
                model id.
            </div>
            {models.map((m) => <ModelRow key={m.id ?? m.feature_key} m={m} onSaved={onSaved} />)}
        </>
    );
}

/** Real dropdown of known models for the provider (always shows ALL options,
 *  unlike a datalist which filters by typed text) + a "Custom…" escape hatch. */
function ModelPicker({ provider, value, onChange }) {
    const known = KNOWN_MODELS[provider] || [];
    const inKnown = known.includes(value);
    const [custom, setCustom] = useState(!inKnown && !!value);

    if (custom) {
        return (
            <div style={{ display: 'flex', gap: 6 }}>
                <input className="aiu-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder="custom model id" />
                <button type="button" className="aiu-btn aiu-btn-ghost" title="Back to list"
                    onClick={() => { setCustom(false); onChange(known[0] || ''); }}>↩</button>
            </div>
        );
    }
    return (
        <select
            className="aiu-input"
            value={inKnown ? value : '__current__'}
            onChange={(e) => {
                if (e.target.value === '__custom__') { setCustom(true); return; }
                onChange(e.target.value);
            }}
        >
            {!inKnown && value && <option value="__current__">{value} (current)</option>}
            {known.map((mdl) => <option key={mdl} value={mdl}>{MODEL_LABELS[mdl] || mdl}</option>)}
            <option value="__custom__">✎ Custom model id…</option>
        </select>
    );
}

function ModelRow({ m, onSaved }) {
    const [d, setD] = useState({
        provider: m.provider,
        primary_model: m.primary_model,
        fallback_models: (m.fallback_models ?? []).join(', '),
        max_output_tokens: m.max_output_tokens ?? '',
        enabled: !!m.enabled,
    });
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setD((p) => ({ ...p, [k]: v }));

    const save = async () => {
        if (!d.primary_model.trim()) { toast.error('Primary model is required'); return; }
        setSaving(true);
        try {
            await axiosInstance.post(`/admin/ai-usage/models/${encodeURIComponent(m.feature_key)}`, {
                provider: d.provider,
                primary_model: d.primary_model.trim(),
                fallback_models: d.fallback_models.split(',').map((s) => s.trim()).filter(Boolean),
                max_output_tokens: d.max_output_tokens === '' ? null : Number(d.max_output_tokens),
                enabled: d.enabled,
            });
            toast.success(`${m.feature_key} model saved`);
            onSaved();
        } catch { /* toasted */ } finally { setSaving(false); }
    };

    return (
        <div className="aiu-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{featureLabel(m.feature_key)}</div>
                    <div className="aiu-mono" style={{ fontSize: 11, color: '#9ca3af' }}>{m.feature_key}</div>
                </div>
                {!d.enabled && <span className="aiu-pill off"><AlertTriangle size={11} /> disabled</span>}
            </div>
            <div className="aiu-form-grid">
                <Field label="Provider">
                    <select className="aiu-input" value={d.provider} onChange={(e) => set('provider', e.target.value)}>
                        <option value="claude">claude</option>
                        <option value="gemini">gemini</option>
                        <option value="openai">openai</option>
                    </select>
                </Field>
                <Field label="Primary model"><ModelPicker provider={d.provider} value={d.primary_model} onChange={(v) => set('primary_model', v)} /></Field>
                <Field label="Max output tokens"><input type="number" min={1} className="aiu-input" value={d.max_output_tokens} onChange={(e) => set('max_output_tokens', e.target.value)} placeholder="code default" /></Field>
                <Field label="Enabled"><select className="aiu-input" value={d.enabled ? 'on' : 'off'} onChange={(e) => set('enabled', e.target.value === 'on')}><option value="on">Enabled</option><option value="off">Disabled</option></select></Field>
                <Field label="Fallback models (comma-separated)" wide><input className="aiu-input" value={d.fallback_models} onChange={(e) => set('fallback_models', e.target.value)} placeholder="claude-sonnet-5, claude-haiku-4-5-20251001" /></Field>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button className="aiu-btn aiu-btn-primary" onClick={save} disabled={saving}>{saving ? <span className="ck-spinner sm" /> : <Save size={14} />} {saving ? 'Saving…' : 'Save'}</button>
            </div>
        </div>
    );
}

/* ────────────────────────────── Recent tab (server-side paginated) ────────── */
const PAGE_SIZES = [10, 25, 50, 100];
function RecentTab() {
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);          // 0-based
    const [pageSize, setPageSize] = useState(25);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async (p, size) => {
        setLoading(true);
        try {
            const r = await axiosInstance.get(
                `/admin/ai-usage/recent?limit=${size}&offset=${p * size}`,
            );
            setRows(r.data?.data ?? []);
            setTotal(r.data?.total ?? 0);
        } catch { /* toasted */ } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(page, pageSize); }, [page, pageSize, load]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const from = total === 0 ? 0 : page * pageSize + 1;
    const to = Math.min(total, (page + 1) * pageSize);

    const changePageSize = (n) => { setPageSize(n); setPage(0); };

    return (
        <div className="aiu-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', gap: 10, flexWrap: 'wrap' }}>
                <div className="aiu-card-title" style={{ margin: 0 }}>Recent AI requests</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <label style={{ fontSize: 12.5, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                        Per page
                        <select className="aiu-input" style={{ width: 78, padding: '6px 8px' }} value={pageSize} onChange={(e) => changePageSize(Number(e.target.value))}>
                            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </label>
                    <button className="aiu-btn aiu-btn-ghost" onClick={() => load(page, pageSize)} disabled={loading}>
                        {loading ? <span className="ck-spinner sm" /> : <RefreshCw size={13} />} {loading ? 'Loading…' : 'Reload'}
                    </button>
                </div>
            </div>
            <div className="aiu-trow aiu-trow-head aiu-recent">
                <div>Time</div><div>Feature</div><div>Provider / model</div><div>Tokens</div><div>Status</div><div style={{ textAlign: 'right' }}>Cost</div>
            </div>
            {!loading && rows.length === 0 && <div className="aiu-empty">No requests logged.</div>}
            {rows.map((r) => (
                <div key={r.id} className="aiu-trow aiu-recent">
                    <div style={{ color: '#6b7280', fontSize: 12 }}>{new Date(r.created_at).toLocaleString()}</div>
                    <div>
                        <div style={{ fontSize: 12.5 }}>{featureLabel(r.feature)}{r.is_background ? ' ·bg' : ''}</div>
                        <div className="aiu-mono" style={{ fontSize: 10.5, color: '#9ca3af' }}>{r.feature}</div>
                    </div>
                    <div className="aiu-mono" style={{ fontSize: 11.5 }}>{r.provider} / {r.model ?? '—'}</div>
                    <div style={{ fontSize: 12 }}>
                        {num(r.input_tokens)}→{num(r.output_tokens)}{r.image_count ? ` ·${r.image_count}img` : ''}
                        {r.cache_read_tokens > 0 && (
                            <span title={`${num(r.cache_read_tokens)} tokens served from cache`} style={{ marginLeft: 4, color: '#059669', fontWeight: 600 }}>·cached</span>
                        )}
                    </div>
                    <div>
                        {r.status === 'success' && <span className="aiu-pill on">ok</span>}
                        {r.status === 'error' && <span className="aiu-pill off" title={r.error_message ?? ''}>error</span>}
                        {r.status === 'blocked' && <span className="aiu-pill warn" title={r.error_message ?? ''}>blocked</span>}
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 600 }}>{money(r.cost_usd)}</div>
                </div>
            ))}

            {/* Pagination footer */}
            <div className="aiu-pager">
                <span className="aiu-pager-info">
                    {total === 0 ? '0 of 0' : `${num(from)}–${num(to)} of ${num(total)}`}
                </span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button className="aiu-btn aiu-btn-ghost" onClick={() => setPage(0)} disabled={page === 0 || loading}>« First</button>
                    <button className="aiu-btn aiu-btn-ghost" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || loading}>‹ Prev</button>
                    <span style={{ fontSize: 12.5, color: '#6b7280', padding: '0 4px' }}>Page {page + 1} / {totalPages}</span>
                    <button className="aiu-btn aiu-btn-ghost" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1 || loading}>Next ›</button>
                    <button className="aiu-btn aiu-btn-ghost" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1 || loading}>Last »</button>
                </div>
            </div>
        </div>
    );
}

function Field({ label, children, wide }) {
    return (
        <div style={wide ? { gridColumn: '1 / -1' } : undefined}>
            <label className="aiu-lbl">{label}</label>
            {children}
        </div>
    );
}

const styles = `
.aiu-wrap { padding: 28px 24px 60px; min-height: 100vh; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, Inter, Segoe UI, sans-serif; }
.aiu-inner { max-width: 1120px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
.aiu-head { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.aiu-title-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.aiu-logo { width: 36px; height: 36px; background: #1f2937; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.aiu-title { margin: 0; font-size: 22px; font-weight: 700; color: #111827; }
.aiu-sub { margin: 0; font-size: 13px; color: #6b7280; max-width: 680px; }
.aiu-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
.aiu-card-title { font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 8px; }
.aiu-input { width: 100%; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; outline: none; background: #fff; }
.aiu-input:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
.aiu-lbl { display: block; font-size: 11px; color: #6b7280; font-weight: 600; margin-bottom: 4px; }
.aiu-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.aiu-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all .15s; }
.aiu-btn:disabled { opacity: .5; cursor: not-allowed; }
.aiu-btn-primary { background: #4f46e5; color: #fff; }
.aiu-btn-primary:hover:not(:disabled) { background: #4338ca; }
.aiu-btn-ghost { background: #fff; color: #374151; border-color: #d1d5db; }
.aiu-btn-ghost:hover:not(:disabled) { background: #f9fafb; }
.aiu-btn-danger { background: #dc2626; color: #fff; }
.aiu-btn-danger:hover:not(:disabled) { background: #b91c1c; }
.aiu-kill { background: #fff; border: 1px solid #e5e7eb; border-left: 4px solid #059669; border-radius: 12px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.aiu-kill.on { border-left-color: #dc2626; background: #fef2f2; }
.aiu-tabs { display: flex; gap: 4px; border-bottom: 1px solid #e5e7eb; }
.aiu-tab { display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px; background: none; border: none; border-bottom: 2px solid transparent; font-size: 13px; font-weight: 600; color: #6b7280; cursor: pointer; }
.aiu-tab.active { color: #4f46e5; border-bottom-color: #4f46e5; }
.aiu-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
.aiu-stat { padding: 16px 18px; }
.aiu-stat-label { font-size: 12px; color: #6b7280; font-weight: 600; }
.aiu-stat-val { font-size: 26px; font-weight: 800; color: #111827; margin: 4px 0 8px; }
.aiu-stat-foot { font-size: 12px; color: #6b7280; }
.aiu-meter { height: 7px; background: #f3f4f6; border-radius: 99px; overflow: hidden; margin-bottom: 6px; }
.aiu-meter-fill { height: 100%; border-radius: 99px; transition: width .3s; }
.aiu-pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; background: #f3f4f6; color: #374151; }
.aiu-pill.on { background: #ecfdf5; color: #047857; }
.aiu-pill.off { background: #fef2f2; color: #b91c1c; }
.aiu-pill.warn { background: #fffbeb; color: #b45309; }
.aiu-bars { display: flex; align-items: flex-end; gap: 4px; height: 140px; overflow-x: auto; padding-top: 8px; }
.aiu-bar-col { flex: 1; min-width: 14px; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; }
.aiu-bar { width: 70%; background: #4f46e5; border-radius: 3px 3px 0 0; min-height: 3px; }
.aiu-bar-lbl { font-size: 9px; color: #9ca3af; margin-top: 4px; white-space: nowrap; transform: rotate(-45deg); transform-origin: center; }
.aiu-trow { display: grid; grid-template-columns: 1.4fr 0.8fr 0.7fr 0.9fr 1fr 0.8fr; gap: 10px; align-items: center; padding: 11px 16px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
.aiu-trow.aiu-recent { grid-template-columns: 1.4fr 1.1fr 1.4fr 1fr 0.7fr 0.7fr; }
.aiu-trow:last-child { border-bottom: none; }
.aiu-trow-head { font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: #6b7280; background: #f9fafb; }
.aiu-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12.5px; color: #374151; word-break: break-word; }
.aiu-empty { padding: 26px; text-align: center; color: #9ca3af; font-size: 13px; }
.aiu-pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-top: 1px solid #f3f4f6; flex-wrap: wrap; }
.aiu-pager-info { font-size: 12.5px; color: #6b7280; font-weight: 600; }
.aiu-pager .aiu-btn { padding: 6px 10px; font-size: 12px; }
.aiu-note { background: #eef2ff; border: 1px solid #c7d2fe; color: #3730a3; padding: 12px 14px; border-radius: 10px; font-size: 12.5px; line-height: 1.5; }
@media (max-width: 760px) {
  .aiu-trow, .aiu-trow.aiu-recent { grid-template-columns: 1fr 1fr; }
  .aiu-trow-head { display: none; }
}
`;
