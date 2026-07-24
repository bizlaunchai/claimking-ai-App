'use client';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance';
import NewClientForm from './NewClientForm';
import {
    NEW_CLIENT_BLANK,
    validateNewClient,
    toClientCreatePayload,
    toClientShape,
    mapBackendErrors,
} from '@/lib/clients/newClientForm';
import './client-selector.css';

/**
 * ClientSelector — single canonical client pick/create UI for:
 *   • dashboard/estimation
 *   • dashboard/measurement
 *   • dashboard/3d-mockup
 *   • dashboard/policy-analysis
 *
 * Renders one of two states:
 *   • Picker card (.cs-card) with Existing/New tabs when `client` is null
 *   • Selected bar (.cs-selected-bar) with a Change link when `client` is set
 *
 * The component manages its own search/list/form state. Parent owns the
 * selected client and receives the shaped client object from `onChange`.
 *
 * Props:
 *   client                 — current selected client shape, or null
 *   onChange(clientShape)  — called when a client is picked or created (null clears)
 *   banner                 — optional ReactNode rendered inside the picker card (e.g. handoff banner)
 *   selectedExtraActions   — optional ReactNode rendered in selected bar's actions row
 *   scrollId               — optional dom id on the picker card (so callers can scrollIntoView)
 *   searchPlaceholder      — optional override for the search input placeholder
 *   submitLabel            — optional override for the New Client submit button
 */

/**
 * Inline icons. Emoji were used here before, but they render at different
 * sizes and weights on every OS (and Windows draws 📍 in full colour at a
 * different baseline than the text), which is what made the selected bar look
 * misaligned. `currentColor` also lets each icon inherit its row's colour.
 */
const CsIcon = {
    Pin: () => (
        <svg className="cs-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    ),
    Mail: () => (
        <svg className="cs-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-10 6L2 7" />
        </svg>
    ),
    Phone: () => (
        <svg className="cs-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
        </svg>
    ),
    Swap: () => (
        <svg className="cs-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M16 3h5v5" /><path d="M21 3l-7 7" />
            <path d="M8 21H3v-5" /><path d="M3 21l7-7" />
        </svg>
    ),
};

const ClientSelector = ({
    client,
    onChange,
    banner = null,
    selectedExtraActions = null,
    scrollId,
    searchPlaceholder = 'Type client name, address, email or phone…',
    submitLabel = 'Save Client & Continue',
}) => {
    const [tab, setTab] = useState('existing');
    const [search, setSearch] = useState('');
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState(NEW_CLIENT_BLANK);
    const [creating, setCreating] = useState(false);
    const [formError, setFormError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});

    // Debounced list fetch. Skips while a client is already selected.
    useEffect(() => {
        if (client) return;
        if (tab !== 'existing') return;
        setLoading(true);
        let cancelled = false;
        const t = setTimeout(async () => {
            try {
                const params = { limit: 25 };
                if (search.trim()) params.search = search.trim();
                const res = await axiosInstance.get('/client-portal', { params });
                if (!cancelled) setList(res.data?.data ?? []);
            } catch {
                if (!cancelled) setList([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, 250);
        return () => { cancelled = true; clearTimeout(t); };
    }, [tab, search, client]);

    const pick = (raw) => {
        const shaped = toClientShape(raw);
        onChange?.(shaped);
        toast.success(`Client set: ${shaped.name}`);
    };

    const handleField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (fieldErrors[field]) {
            setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    const submit = async () => {
        setFormError(null);
        const errs = validateNewClient(form);
        if (Object.keys(errs).length) {
            setFieldErrors(errs);
            setFormError(Object.values(errs)[0] || 'Please fix the highlighted fields.');
            return;
        }
        setFieldErrors({});
        setCreating(true);
        try {
            const res = await axiosInstance.post('/client-portal', toClientCreatePayload(form));
            const created = res.data?.data;
            toast.success('Client created');
            if (created) pick(created);
            setForm(NEW_CLIENT_BLANK);
            setTab('existing');
        } catch (err) {
            const msg = err?.response?.data?.message;
            const mapped = mapBackendErrors(msg);
            if (Object.keys(mapped).length) setFieldErrors(mapped);
            setFormError(err?.userMessage ?? (typeof msg === 'string' ? msg : 'Could not create client.'));
        } finally {
            setCreating(false);
        }
    };

    const change = () => {
        onChange?.(null);
        setTab('existing');
    };

    // ── Selected-bar state ─────────────────────────────────────────────
    if (client) {
        return (
            <div className="cs-selected-bar">
                <div className="cs-selected-main">
                    <div className="cs-selected-identity">
                        <span className="cs-selected-name">{client.name}</span>
                        {client.claim && (
                            <span className="cs-claim-chip">Claim #{client.claim}</span>
                        )}
                    </div>

                    {/* One row per contact fact, each with its own icon column so
                        the values line up instead of wrapping into each other. */}
                    <div className="cs-selected-details">
                        {client.address && (
                            <span className="cs-detail">
                                <CsIcon.Pin />
                                <span className="cs-detail-text">{client.address}</span>
                            </span>
                        )}
                        {client.email && (
                            <a className="cs-detail cs-detail-link" href={`mailto:${client.email}`}>
                                <CsIcon.Mail />
                                <span className="cs-detail-text">{client.email}</span>
                            </a>
                        )}
                        {client.phone && (
                            <a className="cs-detail cs-detail-link" href={`tel:${client.phone}`}>
                                <CsIcon.Phone />
                                <span className="cs-detail-text">{client.phone}</span>
                            </a>
                        )}
                    </div>
                </div>

                <div className="cs-selected-actions">
                    {selectedExtraActions}
                    <button type="button" className="cs-action-btn" onClick={change}>
                        <CsIcon.Swap />
                        Change client
                    </button>
                </div>
            </div>
        );
    }

    // ── Picker state ───────────────────────────────────────────────────
    return (
        <div className="cs-card" id={scrollId}>
            {banner}

            <div className="cs-tabs">
                <button
                    type="button"
                    className={`cs-tab-btn ${tab === 'existing' ? 'active' : ''}`}
                    onClick={() => setTab('existing')}
                >Existing Client</button>
                <button
                    type="button"
                    className={`cs-tab-btn ${tab === 'new' ? 'active' : ''}`}
                    onClick={() => setTab('new')}
                >New Client</button>
            </div>

            {tab === 'existing' && (
                <div>
                    <input
                        type="text"
                        className="cs-search-input"
                        placeholder={searchPlaceholder}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <div className="cs-list">
                        {loading && <div className="cs-empty">Searching…</div>}
                        {!loading && list.length === 0 && (
                            <div className="cs-empty">
                                No clients found. Switch to <strong>New Client</strong> to add one.
                            </div>
                        )}
                        {list.map((c) => {
                            const displayName = c.full_name || `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim();
                            const addressLine = [c.address, c.city, c.state, c.zip_code].filter(Boolean).join(', ');
                            return (
                                <div key={c.id} className="cs-option" onClick={() => pick(c)}>
                                    <div className="cs-option-inner">
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className="cs-option-name">{displayName || 'Unnamed'}</div>
                                            {addressLine && (
                                                <div className="cs-option-addr">
                                                    <CsIcon.Pin />{addressLine}
                                                </div>
                                            )}
                                            <div className="cs-option-meta">
                                                {c.email && <span><CsIcon.Mail />{c.email}</span>}
                                                {c.phone && <span><CsIcon.Phone />{c.phone}</span>}
                                            </div>
                                            {c.claim_number && (
                                                <div className="cs-option-claim">Claim #: {c.claim_number}</div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            className="cs-btn cs-btn-outline"
                                            style={{ padding: '.375rem .75rem', fontSize: '.75rem', flexShrink: 0 }}
                                            onClick={(e) => { e.stopPropagation(); pick(c); }}
                                        >Select Client</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {tab === 'new' && (
                <NewClientForm
                    value={form}
                    fieldErrors={fieldErrors}
                    formError={formError}
                    submitting={creating}
                    onChange={handleField}
                    onSubmit={submit}
                    submitLabel={submitLabel}
                />
            )}
        </div>
    );
};

export default ClientSelector;
