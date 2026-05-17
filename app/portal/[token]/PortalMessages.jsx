'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import axiosInstance from '@/lib/axiosInstance';

// ─────────────────────────────────────────────────────────────────────────────
// Two-way message thread on the homeowner portal.
//
// GET  /portal-public/:token/messages  →  visible thread (oldest first)
// POST /portal-public/:token/messages  →  homeowner posts a reply
//
// We poll every 30s while the tab is visible so the homeowner sees the
// contractor's reply without manual refresh. (No websocket infra in the
// project yet; polling is the pragmatic choice.)
// ─────────────────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 30_000;

const fmtTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString([], {
        month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
    });
};

export default function PortalMessages({ contractorName = 'Your contractor' }) {
    const params = useParams();
    const token = params?.token;

    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    const scrollRef = useRef(null);

    const refresh = async ({ silent = false } = {}) => {
        if (!token) return;
        if (!silent) setLoading(true);
        try {
            const { data } = await axiosInstance.get(
                `/portal-public/${token}/messages`,
                { suppressErrorToast: true },
            );
            setMessages(Array.isArray(data) ? data : []);
            setError(null);
        } catch (e) {
            // 404 means token revoked between page load and now; show inline.
            if (e?.response?.status === 404) {
                setError('This portal is no longer available.');
            } else if (!silent) {
                setError('Could not load messages right now.');
            }
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [token]);

    // Poll while the tab is visible — pause when hidden to save battery.
    useEffect(() => {
        if (!token) return;
        let id = null;
        const start = () => {
            if (id) return;
            id = setInterval(() => refresh({ silent: true }), POLL_INTERVAL_MS);
        };
        const stop = () => {
            if (id) { clearInterval(id); id = null; }
        };
        const onVis = () => (document.visibilityState === 'visible' ? start() : stop());
        start();
        document.addEventListener('visibilitychange', onVis);
        return () => {
            stop();
            document.removeEventListener('visibilitychange', onVis);
        };
        // eslint-disable-next-line
    }, [token]);

    // Scroll to bottom whenever the thread grows
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages.length]);

    const send = async () => {
        const text = draft.trim();
        if (!text || sending) return;
        setSending(true);
        setError(null);
        try {
            const { data } = await axiosInstance.post(
                `/portal-public/${token}/messages`,
                { message: text },
                { suppressErrorToast: true },
            );
            setMessages((prev) => [...prev, data]);
            setDraft('');
        } catch (e) {
            // 429 = rate-limit / duplicate / min-interval — surface the
            // backend's friendly message verbatim so the homeowner knows
            // exactly what happened ("wait a moment", "duplicate", etc).
            const status = e?.response?.status;
            const msg = e?.response?.data?.message;
            if (status === 429) {
                setError(msg || 'You are sending messages too quickly. Please slow down.');
            } else if (status === 400) {
                setError(msg || 'Message could not be sent.');
            } else {
                setError(msg || 'Could not send your message. Please try again.');
            }
        } finally {
            setSending(false);
        }
    };

    return (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
            <div ref={scrollRef} style={{
                maxHeight: 360, overflowY: 'auto',
                padding: '1rem 1.25rem',
                background: '#fafafa',
            }}>
                {loading ? (
                    <div style={{ textAlign: 'center', color: '#6b7280', fontSize: 14, padding: '1rem 0' }}>
                        Loading messages…
                    </div>
                ) : messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#6b7280', fontSize: 14, padding: '1.5rem 0' }}>
                        No messages yet. Send the first one below — {contractorName} will be notified.
                    </div>
                ) : (
                    messages.map((m) => {
                        const fromClient = m.sender_type === 'client';
                        return (
                            <div
                                key={m.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: fromClient ? 'flex-end' : 'flex-start',
                                    marginBottom: '0.75rem',
                                }}
                            >
                                <div style={{
                                    maxWidth: '75%',
                                    background: fromClient ? '#1a1f3a' : '#fff',
                                    color:      fromClient ? '#fff'    : '#1a1f3a',
                                    border: fromClient ? 'none' : '1px solid #e5e7eb',
                                    borderRadius: 12,
                                    padding: '0.625rem 0.875rem',
                                    fontSize: 14,
                                    lineHeight: 1.5,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                }}>
                                    <div>{m.message_text}</div>
                                    <div style={{
                                        marginTop: 4, fontSize: 10,
                                        color: fromClient ? 'rgba(255,255,255,0.6)' : '#9ca3af',
                                    }}>
                                        {fromClient ? 'You' : contractorName} · {fmtTime(m.created_at)}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {error && (
                <div style={{
                    padding: '0.5rem 1.25rem',
                    background: '#fef2f2', color: '#b91c1c',
                    fontSize: 12, borderTop: '1px solid #fecaca',
                }}>
                    {error}
                </div>
            )}

            <div style={{
                padding: '0.875rem 1.25rem', borderTop: '1px solid #e5e7eb',
                background: '#fff',
            }}>
                <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        // Cmd/Ctrl+Enter → send (familiar from most chat apps)
                        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                            e.preventDefault();
                            send();
                        }
                    }}
                    placeholder={`Message ${contractorName}…`}
                    rows={2}
                    maxLength={2000}
                    style={{
                        width: '100%', padding: '0.5rem 0.75rem',
                        border: '1px solid #e5e7eb', borderRadius: 8,
                        fontSize: 14, resize: 'vertical', minHeight: 60,
                        fontFamily: 'inherit',
                    }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>
                        {draft.length > 0 ? `${draft.length} / 2000` : 'Press ⌘/Ctrl + Enter to send'}
                    </span>
                    <button
                        onClick={send}
                        disabled={sending || !draft.trim()}
                        style={{
                            padding: '0.5rem 1.125rem',
                            background: 'linear-gradient(135deg, #FDB813, #d4a000)',
                            color: '#1a1f3a', border: 'none',
                            borderRadius: 8, fontWeight: 700, fontSize: 13,
                            cursor: sending || !draft.trim() ? 'not-allowed' : 'pointer',
                            opacity: sending || !draft.trim() ? 0.6 : 1,
                        }}
                    >
                        {sending ? 'Sending…' : 'Send message'}
                    </button>
                </div>
            </div>
        </div>
    );
}
