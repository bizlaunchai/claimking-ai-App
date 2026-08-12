"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const NOTIF_SEEN_KEY = "ck.notif.seenAt";

/**
 * Owner-alert bell (signature / payment) — reads the notification_log feed and
 * shows a dropdown of recent alerts with an unread badge. Self-contained so it
 * can drop anywhere (sidebar company row, header, etc.).
 *
 * Unread = rows newer than a localStorage last-seen stamp; opening the dropdown
 * marks everything seen. The dropdown is fixed-positioned (anchored to the
 * button) so a clipping/overflow parent (e.g. the sidebar) never hides it.
 */
export default function NotificationBell() {
    const [items, setItems] = useState([]);
    const [open, setOpen] = useState(false);
    const [seenAt, setSeenAt] = useState(0);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const btnRef = useRef(null);
    const popRef = useRef(null);

    const load = useCallback(async () => {
        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token || !API_URL) return;
            const res = await fetch(`${API_URL}/notifications/log?limit=30`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const j = await res.json();
            const rows = Array.isArray(j.data) ? j.data : [];
            // One card per event — merge the email + text rows (logged within
            // the same second) into a single entry that carries both channel
            // statuses. Bucket by event + estimate + minute so a later re-sign
            // stays a separate card.
            const groups = new Map();
            for (const r of rows) {
                const minute = new Date(r.created_at).toISOString().slice(0, 16);
                const key = `${r.event}:${r.estimate_id}:${minute}`;
                if (!groups.has(key)) {
                    groups.set(key, {
                        id: r.id,
                        event: r.event,
                        body: r.body,
                        created_at: r.created_at,
                        channels: {}, // channel -> status
                    });
                }
                const g = groups.get(key);
                g.channels[r.channel] = r.status;
                if (r.channel === "email" && r.body) g.body = r.body; // prefer email summary
            }
            // Bell shows the latest 10 events; full list lives in Settings.
            setItems(Array.from(groups.values()).slice(0, 10));
        } catch {
            /* non-fatal */
        }
    }, []);

    // Initial load + keep the feed fresh: poll every 60s and refetch whenever
    // the tab regains focus (the sidebar persists across client-side nav, so a
    // one-shot mount fetch would miss events signed/paid after page load).
    useEffect(() => {
        setSeenAt(Number(localStorage.getItem(NOTIF_SEEN_KEY) || 0));
        load();
        const id = setInterval(load, 60000);
        const onFocus = () => load();
        window.addEventListener("focus", onFocus);
        return () => {
            clearInterval(id);
            window.removeEventListener("focus", onFocus);
        };
    }, [load]);

    useEffect(() => {
        if (!open) return;
        const onDoc = (e) => {
            if (
                popRef.current && !popRef.current.contains(e.target) &&
                btnRef.current && !btnRef.current.contains(e.target)
            ) setOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);

    const unread = items.filter((n) => new Date(n.created_at).getTime() > seenAt).length;

    const toggle = () => {
        setOpen((o) => {
            const next = !o;
            if (next) {
                load(); // refresh on open so the panel is current
                const rect = btnRef.current?.getBoundingClientRect();
                if (rect) {
                    // Anchor below the bell; nudge left so a 320px panel stays on-screen.
                    const left = Math.min(rect.left, window.innerWidth - 332);
                    setPos({ top: rect.bottom + 8, left: Math.max(8, left) });
                }
                const now = Date.now();
                localStorage.setItem(NOTIF_SEEN_KEY, String(now));
                setSeenAt(now);
            }
            return next;
        });
    };

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={toggle}
                aria-label={unread > 0 ? `${unread} new notifications` : "Notifications"}
                title="Notifications"
                style={{
                    position: "relative",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    border: "none",
                    background: open ? "rgba(253, 184, 19, 0.15)" : "transparent",
                    color: "var(--crown-gold, #FDB813)",
                    cursor: "pointer",
                    flexShrink: 0,
                    transition: "background 0.2s ease",
                }}
            >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                </svg>
                {unread > 0 && (
                    <span
                        style={{
                            position: "absolute",
                            top: "-3px",
                            right: "-3px",
                            minWidth: "16px",
                            height: "16px",
                            padding: "0 4px",
                            borderRadius: "999px",
                            background: "#ef4444",
                            color: "#fff",
                            fontSize: "10px",
                            fontWeight: 700,
                            lineHeight: "16px",
                            textAlign: "center",
                        }}
                    >
                        {unread > 99 ? "99+" : unread}
                    </span>
                )}
            </button>

            {open && (
                <div
                    ref={popRef}
                    style={{
                        position: "fixed",
                        top: pos.top,
                        left: pos.left,
                        width: "320px",
                        maxHeight: "420px",
                        overflowY: "auto",
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        boxShadow: "0 12px 32px rgba(0,0,0,0.16)",
                        zIndex: 4000,
                        color: "#1a1f3a",
                    }}
                >
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong style={{ fontSize: "14px" }}>Notifications</strong>
                        <Link href="/dashboard/settings?section=notifications" onClick={() => setOpen(false)} style={{ fontSize: "12px", color: "#6b7280", textDecoration: "none" }}>
                            Settings
                        </Link>
                    </div>
                    {items.length === 0 ? (
                        <div style={{ padding: "28px 16px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>
                            No notifications yet.
                        </div>
                    ) : (
                        items.map((n) => {
                            const isNew = new Date(n.created_at).getTime() > seenAt;
                            return (
                                <div
                                    key={n.id}
                                    style={{
                                        padding: "12px 16px",
                                        borderBottom: "1px solid #f5f5f5",
                                        background: isNew ? "#fffdf5" : "#fff",
                                        display: "flex",
                                        gap: "10px",
                                        alignItems: "flex-start",
                                    }}
                                >
                                    <span style={{ fontSize: "16px", lineHeight: "18px" }}>
                                        {n.event === "signature" ? "✍️" : "💳"}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: "13px", fontWeight: 500 }}>
                                            {n.body || (n.event === "signature" ? "Estimate signed" : "Payment received")}
                                        </div>
                                        <div style={{ display: "flex", gap: "10px", marginTop: "3px", flexWrap: "wrap" }}>
                                            {["email", "sms"].map((ch) => {
                                                const st = n.channels?.[ch];
                                                if (!st) return null;
                                                const color = st === "sent" ? "#059669" : st === "failed" ? "#ef4444" : "#9ca3af";
                                                return (
                                                    <span key={ch} style={{ fontSize: "11px", color, fontWeight: 500 }}>
                                                        {ch === "email" ? "Email" : "Text"}: {st}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                        <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>
                                            {new Date(n.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    {items.length > 0 && (
                        <Link
                            href="/dashboard/settings?section=notifications"
                            onClick={() => setOpen(false)}
                            style={{
                                display: "block",
                                textAlign: "center",
                                padding: "12px 16px",
                                fontSize: "13px",
                                fontWeight: 600,
                                color: "#1a1f3a",
                                textDecoration: "none",
                                borderTop: "1px solid #f0f0f0",
                                position: "sticky",
                                bottom: 0,
                                background: "#fff",
                            }}
                        >
                            View all
                        </Link>
                    )}
                </div>
            )}
        </>
    );
}
