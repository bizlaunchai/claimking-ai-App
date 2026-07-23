'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance';
import { createClient } from '@/lib/supabase/client';
import { refreshUnreadMessages } from '@/lib/hooks/useUnreadMessages';
import './messages.css';

// ─────────────────────────────────────────────────────────────────────────────
// Unified contractor inbox over `portal_messages` (spec: docs/new/Messages.html).
//
//   GET    /messages/threads              thread list (search + All/Unread/Read)
//   GET    /messages/threads/:id          one conversation
//   POST   /messages/threads/:id/reply    send
//   POST   /messages/threads/:id/read     mark read on open
//   PATCH  /messages/bulk                 bulk mark read / unread
//   DELETE /messages/bulk                 bulk soft delete
//   POST   /messages/read-all             mark everything read
//
// Deletes are SOFT: the thread leaves this inbox, the homeowner keeps their
// full history on the portal, and a new inbound message revives the thread.
// ─────────────────────────────────────────────────────────────────────────────

const SEARCH_DEBOUNCE_MS = 250;
const REALTIME_DEBOUNCE_MS = 800;
const POLL_INTERVAL_MS = 30_000; // fallback when realtime isn't enabled

const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'read', label: 'Read' },
];

/** "9:42 AM" today, "Yesterday", "Mon", else "Mar 4". */
const shortTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const dayDiff = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
    if (dayDiff <= 0) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (dayDiff === 1) return 'Yesterday';
    if (dayDiff < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

/** "Today 9:42 AM · Portal" for the bubble footer. */
const fullTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString([], {
        month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
    });
};

const channelLabel = (c) => (c === 'sms' ? 'SMS' : c === 'email' ? 'Email' : 'Portal');

const Messages = () => {
    const router = useRouter();

    // ── Thread list ────────────────────────────────────────────────────────
    const [threads, setThreads] = useState([]);
    const [threadsLoading, setThreadsLoading] = useState(true);
    const [listError, setListError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // ── Selection / bulk ───────────────────────────────────────────────────
    const [selected, setSelected] = useState(() => new Set());
    const [bulkBusy, setBulkBusy] = useState(false);

    // ── Conversation ───────────────────────────────────────────────────────
    const [activeId, setActiveId] = useState(null);
    const [activeClient, setActiveClient] = useState(null);
    const [messages, setMessages] = useState([]);
    const [threadLoading, setThreadLoading] = useState(false);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);

    // ── New-message picker ─────────────────────────────────────────────────
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerQuery, setPickerQuery] = useState('');
    const [pickerRows, setPickerRows] = useState([]);
    const [pickerLoading, setPickerLoading] = useState(false);

    const msgScrollRef = useRef(null);
    const replyRef = useRef(null);

    // Debounce the search box.
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [search]);

    // ── Fetch: thread list ─────────────────────────────────────────────────
    const loadThreads = useCallback(async ({ silent = false } = {}) => {
        if (!silent) setThreadsLoading(true);
        try {
            const { data } = await axiosInstance.get('/messages/threads', {
                params: {
                    filter,
                    ...(debouncedSearch ? { search: debouncedSearch } : {}),
                    limit: 200,
                },
                suppressErrorToast: true,
            });
            const rows = Array.isArray(data?.data) ? data.data : [];
            setThreads(rows);
            setListError(null);

            // Drop selections whose thread is no longer in the list, otherwise a
            // later bulk action would act on rows the user can't even see.
            setSelected((prev) => {
                if (prev.size === 0) return prev;
                const visible = new Set(rows.map((r) => r.client_portal_id));
                const next = new Set([...prev].filter((id) => visible.has(id)));
                return next.size === prev.size ? prev : next;
            });
        } catch (e) {
            if (!silent) {
                setListError(
                    e?.response?.status === 403
                        ? 'You do not have permission to view client messages.'
                        : e?.userMessage || 'Could not load conversations.',
                );
            }
        } finally {
            if (!silent) setThreadsLoading(false);
        }
    }, [filter, debouncedSearch]);

    // Keep the newest closure reachable from timers / realtime callbacks.
    const loadThreadsRef = useRef(loadThreads);
    loadThreadsRef.current = loadThreads;

    useEffect(() => { loadThreads(); }, [loadThreads]);

    // ── Fetch: one conversation ────────────────────────────────────────────
    const loadThread = useCallback(async (clientPortalId, { silent = false } = {}) => {
        if (!clientPortalId) return;
        if (!silent) setThreadLoading(true);
        try {
            const { data } = await axiosInstance.get(`/messages/threads/${clientPortalId}`, {
                suppressErrorToast: true,
            });
            setActiveClient(data?.client ?? null);
            setMessages(Array.isArray(data?.messages) ? data.messages : []);
        } catch (e) {
            if (!silent) {
                toast.error('Could not open the conversation', {
                    description: e?.userMessage || 'Please try again.',
                });
                setActiveId(null);
                setActiveClient(null);
                setMessages([]);
            }
        } finally {
            if (!silent) setThreadLoading(false);
        }
    }, []);

    const activeIdRef = useRef(activeId);
    activeIdRef.current = activeId;
    const loadThreadRef = useRef(loadThread);
    loadThreadRef.current = loadThread;

    // ── Realtime + polling fallback ────────────────────────────────────────
    // Any insert/update on portal_messages refreshes the list and the open
    // conversation, silently. Degrades to the 30s poll if the table isn't in
    // the `supabase_realtime` publication.
    useEffect(() => {
        const refreshAll = () => {
            loadThreadsRef.current({ silent: true });
            if (activeIdRef.current) {
                loadThreadRef.current(activeIdRef.current, { silent: true });
            }
        };

        let debounce;
        const supabase = createClient();
        const channel = supabase
            .channel('messages-inbox')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'portal_messages' },
                () => {
                    clearTimeout(debounce);
                    debounce = setTimeout(refreshAll, REALTIME_DEBOUNCE_MS);
                },
            )
            .subscribe();

        const poll = setInterval(() => {
            if (document.visibilityState === 'visible') refreshAll();
        }, POLL_INTERVAL_MS);

        return () => {
            clearTimeout(debounce);
            clearInterval(poll);
            supabase.removeChannel(channel);
        };
    }, []);

    // Keep the conversation pinned to the newest message.
    useEffect(() => {
        const el = msgScrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages.length, activeId]);

    // ── Open a thread (and mark it read) ───────────────────────────────────
    const openThread = async (clientPortalId) => {
        if (!clientPortalId) return;
        setActiveId(clientPortalId);
        setDraft('');
        await loadThread(clientPortalId);

        const wasUnread = threads.find(
            (t) => t.client_portal_id === clientPortalId,
        )?.unread_count > 0;
        if (!wasUnread) return;

        // Optimistic: clear the dot immediately, then persist.
        setThreads((prev) => prev.map((t) => (
            t.client_portal_id === clientPortalId
                ? { ...t, unread_count: 0, unread: false }
                : t
        )));
        try {
            await axiosInstance.post(`/messages/threads/${clientPortalId}/read`, null, {
                suppressErrorToast: true,
            });
            refreshUnreadMessages();
        } catch {
            // Non-fatal: the next list refresh restores the true state.
            loadThreads({ silent: true });
        }
    };

    const closeConversation = () => {
        setActiveId(null);
        setActiveClient(null);
        setMessages([]);
        setDraft('');
    };

    // ── Reply ──────────────────────────────────────────────────────────────
    const sendReply = async () => {
        const text = draft.trim();
        if (!text || sending || !activeId) return;
        setSending(true);
        try {
            const { data } = await axiosInstance.post(
                `/messages/threads/${activeId}/reply`,
                { message: text },
                { suppressErrorToast: true },
            );
            setMessages((prev) => [...prev, data]);
            setDraft('');
            // Reflect the new preview without waiting for the refetch.
            setThreads((prev) => prev.map((t) => (
                t.client_portal_id === activeId
                    ? {
                        ...t,
                        last_message_text: text,
                        last_direction: 'out',
                        last_message_at: data?.created_at || new Date().toISOString(),
                    }
                    : t
            )));
            loadThreads({ silent: true });
            toast.success('Reply sent to the client portal');
        } catch (e) {
            toast.error('Message not sent', {
                description: e?.userMessage || 'Please try again.',
            });
        } finally {
            setSending(false);
        }
    };

    // ── Selection helpers ──────────────────────────────────────────────────
    const toggleSelect = (id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const allVisibleSelected = useMemo(
        () => threads.length > 0 && threads.every((t) => selected.has(t.client_portal_id)),
        [threads, selected],
    );

    const toggleSelectAll = (checked) => {
        setSelected(checked ? new Set(threads.map((t) => t.client_portal_id)) : new Set());
    };

    // ── Bulk actions ───────────────────────────────────────────────────────
    const runBulkRead = async (action) => {
        const ids = [...selected];
        if (ids.length === 0 || bulkBusy) return;
        setBulkBusy(true);
        try {
            await axiosInstance.patch('/messages/bulk', { thread_ids: ids, action },
                { suppressErrorToast: true });
            // Marking the OPEN thread unread would be undone the moment we
            // re-render it, so close the pane instead.
            if (action === 'unread' && activeId && ids.includes(activeId)) {
                closeConversation();
            }
            setSelected(new Set());
            await loadThreads({ silent: true });
            refreshUnreadMessages();
            toast.success(`Marked ${ids.length} conversation${ids.length > 1 ? 's' : ''} as ${action}`);
        } catch (e) {
            toast.error('Bulk update failed', {
                description: e?.userMessage || 'Please try again.',
            });
        } finally {
            setBulkBusy(false);
        }
    };

    const runBulkDelete = async () => {
        const ids = [...selected];
        if (ids.length === 0 || bulkBusy) return;
        const ok = window.confirm(
            `Delete ${ids.length} conversation${ids.length > 1 ? 's' : ''} from your inbox?\n\n` +
            'The client keeps their copy on the portal, and the thread comes back ' +
            'if they message you again.',
        );
        if (!ok) return;

        setBulkBusy(true);
        try {
            await axiosInstance.delete('/messages/bulk', {
                data: { thread_ids: ids },
                suppressErrorToast: true,
            });
            if (activeId && ids.includes(activeId)) closeConversation();
            setSelected(new Set());
            await loadThreads({ silent: true });
            refreshUnreadMessages();
            toast.success(`${ids.length} conversation${ids.length > 1 ? 's' : ''} deleted`);
        } catch (e) {
            toast.error('Delete failed', {
                description: e?.userMessage || 'Please try again.',
            });
        } finally {
            setBulkBusy(false);
        }
    };

    const deleteActiveThread = async () => {
        if (!activeId) return;
        const ok = window.confirm(
            'Delete this conversation from your inbox?\n\n' +
            'The client keeps their copy on the portal, and the thread comes back ' +
            'if they message you again.',
        );
        if (!ok) return;
        try {
            await axiosInstance.delete('/messages/bulk', {
                data: { thread_ids: [activeId] },
                suppressErrorToast: true,
            });
            closeConversation();
            await loadThreads({ silent: true });
            refreshUnreadMessages();
            toast.success('Conversation deleted');
        } catch (e) {
            toast.error('Delete failed', {
                description: e?.userMessage || 'Please try again.',
            });
        }
    };

    const markActiveUnread = async () => {
        if (!activeId) return;
        try {
            await axiosInstance.patch('/messages/bulk',
                { thread_ids: [activeId], action: 'unread' },
                { suppressErrorToast: true });
            closeConversation();
            await loadThreads({ silent: true });
            refreshUnreadMessages();
            toast.success('Marked as unread');
        } catch (e) {
            toast.error('Could not mark unread', {
                description: e?.userMessage || 'Please try again.',
            });
        }
    };

    const markAllRead = async () => {
        try {
            await axiosInstance.post('/messages/read-all', null, { suppressErrorToast: true });
            await loadThreads({ silent: true });
            refreshUnreadMessages();
            toast.success('All conversations marked as read');
        } catch (e) {
            toast.error('Could not mark all read', {
                description: e?.userMessage || 'Please try again.',
            });
        }
    };

    // ── New message picker ─────────────────────────────────────────────────
    useEffect(() => {
        if (!pickerOpen) return;
        let cancelled = false;
        const t = setTimeout(async () => {
            setPickerLoading(true);
            try {
                const { data } = await axiosInstance.get('/client-portal', {
                    params: pickerQuery.trim() ? { search: pickerQuery.trim() } : {},
                    suppressErrorToast: true,
                });
                if (!cancelled) setPickerRows(Array.isArray(data?.data) ? data.data : []);
            } catch {
                if (!cancelled) setPickerRows([]);
            } finally {
                if (!cancelled) setPickerLoading(false);
            }
        }, SEARCH_DEBOUNCE_MS);
        return () => { cancelled = true; clearTimeout(t); };
    }, [pickerOpen, pickerQuery]);

    const startConversation = async (client) => {
        setPickerOpen(false);
        setPickerQuery('');
        await openThread(client.id);
        setTimeout(() => replyRef.current?.focus(), 50);
    };

    const unreadThreadCount = threads.filter((t) => t.unread_count > 0).length;

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="mi-page">
            <div className="mi-topbar">
                <div className="mi-topbar-left">
                    <h1 className="mi-title">Messages</h1>
                    {unreadThreadCount > 0 && (
                        <span className="mi-unread-pill">{unreadThreadCount} unread</span>
                    )}
                </div>
                <div className="mi-topbar-right">
                    <button
                        type="button"
                        className="mi-btn mi-btn-outline"
                        onClick={markAllRead}
                        disabled={unreadThreadCount === 0}
                    >
                        Mark All Read
                    </button>
                    <button
                        type="button"
                        className="mi-btn mi-btn-gold"
                        onClick={() => { setPickerOpen(true); setPickerQuery(''); }}
                    >
                        New Message
                    </button>
                </div>
            </div>

            <div className={`mi-wrap ${activeId ? 'mi-has-active' : ''}`}>
                {/* ── LEFT: thread list ─────────────────────────────────── */}
                <div className="mi-list-pane">
                    <div className="mi-list-tools">
                        <input
                            className="mi-input"
                            placeholder="Search clients, claims, messages…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <div className="mi-filter-row">
                            {FILTERS.map((f) => (
                                <button
                                    key={f.key}
                                    type="button"
                                    className={`mi-chip ${filter === f.key ? 'active' : ''}`}
                                    onClick={() => setFilter(f.key)}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {selected.size > 0 && (
                        <div className="mi-bulk-bar">
                            <span className="mi-bulk-count">{selected.size} selected</span>
                            <button type="button" className="mi-btn mi-btn-outline mi-btn-sm"
                                onClick={() => runBulkRead('read')} disabled={bulkBusy}>
                                Mark Read
                            </button>
                            <button type="button" className="mi-btn mi-btn-outline mi-btn-sm"
                                onClick={() => runBulkRead('unread')} disabled={bulkBusy}>
                                Mark Unread
                            </button>
                            <button type="button" className="mi-btn mi-btn-danger mi-btn-sm"
                                onClick={runBulkDelete} disabled={bulkBusy}>
                                Delete
                            </button>
                        </div>
                    )}

                    <label className="mi-select-all">
                        <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={(e) => toggleSelectAll(e.target.checked)}
                            disabled={threads.length === 0}
                        />
                        <span>Select all visible</span>
                        {threads.length > 0 && (
                            <span className="mi-select-all-count">{threads.length}</span>
                        )}
                    </label>

                    <div className="mi-threads">
                        {threadsLoading ? (
                            <div className="mi-list-msg">Loading conversations…</div>
                        ) : listError ? (
                            <div className="mi-list-msg mi-list-error">{listError}</div>
                        ) : threads.length === 0 ? (
                            <div className="mi-list-msg">
                                {debouncedSearch
                                    ? 'No conversations match that search.'
                                    : filter === 'unread'
                                        ? 'Nothing unread — you are all caught up.'
                                        : 'No client messages yet.'}
                            </div>
                        ) : threads.map((t) => (
                            <div
                                key={t.client_portal_id}
                                role="button"
                                tabIndex={0}
                                className={`mi-thread${t.unread_count > 0 ? ' unread' : ''}${t.client_portal_id === activeId ? ' active' : ''}`}
                                onClick={() => openThread(t.client_portal_id)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        openThread(t.client_portal_id);
                                    }
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={selected.has(t.client_portal_id)}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={() => toggleSelect(t.client_portal_id)}
                                    aria-label={`Select conversation with ${t.name}`}
                                />
                                <div className="mi-avatar">{t.initials}</div>
                                <div className="mi-t-main">
                                    <div className="mi-t-top">
                                        <span className="mi-t-name">{t.name}</span>
                                        <span className="mi-t-time">{shortTime(t.last_message_at)}</span>
                                    </div>
                                    {t.claim_number && <div className="mi-t-claim">{t.claim_number}</div>}
                                    <div className="mi-t-preview">
                                        {t.last_direction === 'out' ? 'You: ' : ''}
                                        {t.last_message_text || '—'}
                                    </div>
                                </div>
                                <span className="mi-unread-dot" aria-hidden="true" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── RIGHT: conversation ───────────────────────────────── */}
                <div className="mi-convo-pane">
                    {!activeId ? (
                        <div className="mi-empty">
                            <div className="mi-empty-title">No conversation selected</div>
                            <div className="mi-empty-sub">
                                Choose a conversation on the left, or start a new one.
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mi-convo-header">
                                <div className="mi-ch-info">
                                    <button
                                        type="button"
                                        className="mi-back-btn"
                                        onClick={closeConversation}
                                        aria-label="Back to conversations"
                                    >
                                        ←
                                    </button>
                                    <div>
                                        <div className="mi-ch-name">
                                            {activeClient
                                                ? `${activeClient.first_name ?? ''} ${activeClient.last_name ?? ''}`.trim() || 'Client'
                                                : 'Loading…'}
                                        </div>
                                        <div className="mi-ch-sub">
                                            {[
                                                activeClient?.claim_number && `Claim ${activeClient.claim_number}`,
                                                [activeClient?.address, activeClient?.city, activeClient?.state]
                                                    .filter(Boolean).join(', '),
                                                'via Client Portal',
                                            ].filter(Boolean).join(' · ')}
                                        </div>
                                    </div>
                                </div>
                                <div className="mi-ch-actions">
                                    <button type="button" className="mi-icon-btn"
                                        onClick={() => router.push(`/dashboard/claims/${activeId}`)}>
                                        View Claim
                                    </button>
                                    <button type="button" className="mi-icon-btn"
                                        onClick={markActiveUnread}>
                                        Mark Unread
                                    </button>
                                    <button type="button" className="mi-icon-btn mi-icon-btn-danger"
                                        onClick={deleteActiveThread}>
                                        Delete
                                    </button>
                                </div>
                            </div>

                            <div className="mi-messages" ref={msgScrollRef}>
                                {threadLoading ? (
                                    <div className="mi-list-msg">Loading conversation…</div>
                                ) : messages.length === 0 ? (
                                    <div className="mi-list-msg">
                                        No messages yet — send the first one below.
                                        The client is notified by email.
                                    </div>
                                ) : messages.map((m) => (
                                    <div key={m.id} className={`mi-msg ${m.direction === 'in' ? 'in' : 'out'}`}>
                                        <div className="mi-msg-bubble">{m.body}</div>
                                        <div className="mi-msg-meta">
                                            {fullTime(m.created_at)} · {m.direction === 'in'
                                                ? channelLabel(m.channel)
                                                : 'You'}
                                            {m.direction === 'out' && m.is_visible_in_portal === false && (
                                                <span className="mi-internal-tag">Internal</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mi-reply-bar">
                                <textarea
                                    ref={replyRef}
                                    className="mi-input mi-reply-input"
                                    placeholder="Type a reply…  (Enter to send, Shift + Enter for a new line)"
                                    value={draft}
                                    maxLength={5000}
                                    onChange={(e) => setDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            sendReply();
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    className="mi-btn mi-btn-gold"
                                    onClick={sendReply}
                                    disabled={sending || !draft.trim()}
                                >
                                    {sending ? 'Sending…' : 'Send'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ── New message picker ────────────────────────────────────── */}
            {pickerOpen && (
                <div className="mi-modal-backdrop" onClick={() => setPickerOpen(false)}>
                    <div className="mi-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="mi-modal-head">
                            <h2>New message</h2>
                            <button type="button" className="mi-modal-close"
                                onClick={() => setPickerOpen(false)} aria-label="Close">✕</button>
                        </div>
                        <input
                            className="mi-input"
                            placeholder="Search clients by name, address or claim…"
                            value={pickerQuery}
                            onChange={(e) => setPickerQuery(e.target.value)}
                            autoFocus
                        />
                        <div className="mi-picker-list">
                            {pickerLoading ? (
                                <div className="mi-list-msg">Searching…</div>
                            ) : pickerRows.length === 0 ? (
                                <div className="mi-list-msg">No clients found.</div>
                            ) : pickerRows.map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    className="mi-picker-row"
                                    onClick={() => startConversation(c)}
                                >
                                    <span className="mi-avatar mi-avatar-sm">
                                        {`${(c.first_name || '').charAt(0)}${(c.last_name || '').charAt(0)}`.toUpperCase() || '?'}
                                    </span>
                                    <span className="mi-picker-main">
                                        <span className="mi-picker-name">
                                            {`${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'Client'}
                                        </span>
                                        <span className="mi-picker-sub">
                                            {[c.claim_number, c.address, c.city].filter(Boolean).join(' · ')}
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Messages;
