"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUnreadMessages } from "@/lib/hooks/useUnreadMessages";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const NOTIF_SEEN_KEY = "ck.notif.seenAt";

/**
 * Top-bar widget for the dashboard.
 *
 * Multi-tenant credits display:
 *   - Reads the calling user's profile to get company_id + role.
 *   - Reads credit_balances row for that company (everyone on the team sees
 *     the same shared pool).
 *   - For company admin/owner: clicking the widget jumps to /dashboard/billing.
 *   - For other roles (estimator/field/office/client): widget is read-only
 *     (no link, no $ amount, no plan name) — per requirement that team members
 *     see ONLY credits, never billing details.
 *   - For superadmin: widget is hidden entirely (they have no company).
 */
const DashboardHeader = ({
    title = "ClaimKing Dashboard",
    onToggleMobile = () => {},
    isMobileOpen = false,
}) => {
    const [credits, setCredits] = useState(null); // null while loading
    const [role, setRole] = useState(null);
    const [companyId, setCompanyId] = useState(null);
    // Notification bell — driven by the same unread-message store as the
    // sidebar badge. Zero unread → plain bell, no dot.
    const { unreadMessages } = useUnreadMessages();

    // Owner-alert bell (signature / payment) — reads the notification_log feed.
    const [notifItems, setNotifItems] = useState([]);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifSeenAt, setNotifSeenAt] = useState(0);
    const notifRef = useRef(null);

    useEffect(() => {
        document.title = title;
    }, [title]);

    // Load the recent alert feed (one row per event — the email attempt).
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const seen = Number(localStorage.getItem(NOTIF_SEEN_KEY) || 0);
                if (!cancelled) setNotifSeenAt(seen);
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                if (!token || !API_URL || cancelled) return;
                const res = await fetch(`${API_URL}/notifications/log?limit=30`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok || cancelled) return;
                const j = await res.json();
                const rows = Array.isArray(j.data) ? j.data : [];
                // Dedupe to one card per event — keep the email row (always
                // attempted), fall back to whatever channel exists.
                const byEvent = new Map();
                for (const r of rows) {
                    const k = `${r.event}:${r.estimate_id}:${r.created_at}`;
                    if (!byEvent.has(k) || r.channel === "email") byEvent.set(k, r);
                }
                if (!cancelled) setNotifItems(Array.from(byEvent.values()));
            } catch {
                /* non-fatal — bell just shows nothing */
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Close the dropdown on any outside click.
    useEffect(() => {
        if (!notifOpen) return;
        const onDoc = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [notifOpen]);

    const notifUnread = notifItems.filter(
        (n) => new Date(n.created_at).getTime() > notifSeenAt,
    ).length;

    const toggleNotif = () => {
        setNotifOpen((open) => {
            const next = !open;
            if (next) {
                // Opening marks everything seen.
                const now = Date.now();
                localStorage.setItem(NOTIF_SEEN_KEY, String(now));
                setNotifSeenAt(now);
            }
            return next;
        });
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user || cancelled) return;

                const { data: profile } = await supabase
                    .from("profiles")
                    .select("role, company_id")
                    .eq("id", user.id)
                    .single();
                if (cancelled) return;
                setRole(profile?.role ?? null);
                setCompanyId(profile?.company_id ?? null);

                if (!profile?.company_id || profile.role === "superadmin") return;

                const { data: balance } = await supabase
                    .from("credit_balances")
                    .select("monthly_credits, bonus_credits")
                    .eq("company_id", profile.company_id)
                    .maybeSingle();
                if (cancelled) return;
                const total =
                    (balance?.monthly_credits ?? 0) + (balance?.bonus_credits ?? 0);
                setCredits(total);
            } catch {
                /* fail quietly — widget just won't render */
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const openNewClaim = () => (window.location.href = "/dashboard/claims");
    const exportReport = () => {
        const value = document.getElementById("dateRangeSelector")?.value;
        console.log("Exporting report for:", value);
    };

    const isCompanyAdmin = role === "admin" && !!companyId;
    const isCompanyMember = !!companyId && role !== "superadmin";

    const CreditsBadge = (
        <span
            className="dashboard-credits-badge"
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.45rem 0.875rem",
                background: "linear-gradient(135deg, #fef9e6, #fef3c7)",
                color: "#92400e",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: 600,
                border: "1px solid #fde68a",
            }}
        >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.31 17.86c-3.92.43-7.31-2.65-7.31-6.5 0-3.85 3.39-6.93 7.31-6.5 2.76.3 5.06 2.6 5.36 5.36.42 3.91-2.65 7.21-6.36 7.64z" />
            </svg>
            {credits === null ? "…" : credits.toLocaleString()} credits
        </span>
    );

    return (
        <header className="dashboard-header">
            <div className="dashboard-header-left">
                <button
                    type="button"
                    className={`dashboard-hamburger ${isMobileOpen ? "active" : ""}`}
                    onClick={onToggleMobile}
                    aria-label="Toggle menu"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
                <h1 className="dashboard-title">{title}</h1>
                <button
                    onClick={openNewClaim}
                    className="dashboard-new-claim-btn"
                    type="button"
                >
                    + New Claim
                </button>
            </div>

            <div className="dashboard-header-right">
                {/* Owner-alert bell (signature / payment) — dropdown feed. */}
                {isCompanyMember && (
                    <div ref={notifRef} style={{ position: "relative" }}>
                        <button
                            type="button"
                            onClick={toggleNotif}
                            aria-label={notifUnread > 0 ? `${notifUnread} new notifications` : "Notifications"}
                            title="Notifications"
                            style={{
                                position: "relative",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "36px",
                                height: "36px",
                                borderRadius: "8px",
                                border: "1px solid #e5e7eb",
                                background: notifOpen ? "#f9fafb" : "#fff",
                                color: "#374151",
                                cursor: "pointer",
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                            </svg>
                            {notifUnread > 0 && (
                                <span
                                    style={{
                                        position: "absolute",
                                        top: "-5px",
                                        right: "-5px",
                                        minWidth: "17px",
                                        height: "17px",
                                        padding: "0 4px",
                                        borderRadius: "999px",
                                        background: "#ef4444",
                                        color: "#fff",
                                        fontSize: "10px",
                                        fontWeight: 700,
                                        lineHeight: "17px",
                                        textAlign: "center",
                                    }}
                                >
                                    {notifUnread > 99 ? "99+" : notifUnread}
                                </span>
                            )}
                        </button>

                        {notifOpen && (
                            <div
                                style={{
                                    position: "absolute",
                                    top: "44px",
                                    right: 0,
                                    width: "340px",
                                    maxHeight: "420px",
                                    overflowY: "auto",
                                    background: "#fff",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "12px",
                                    boxShadow: "0 12px 32px rgba(0,0,0,0.14)",
                                    zIndex: 1000,
                                }}
                            >
                                <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <strong style={{ color: "#1a1f3a", fontSize: "14px" }}>Notifications</strong>
                                    <Link href="/dashboard/settings" onClick={() => setNotifOpen(false)} style={{ fontSize: "12px", color: "#6b7280", textDecoration: "none" }}>
                                        Settings
                                    </Link>
                                </div>
                                {notifItems.length === 0 ? (
                                    <div style={{ padding: "28px 16px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>
                                        No notifications yet.
                                    </div>
                                ) : (
                                    notifItems.map((n) => {
                                        const isNew = new Date(n.created_at).getTime() > notifSeenAt;
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
                                                    <div style={{ fontSize: "13px", color: "#1a1f3a", fontWeight: 500 }}>
                                                        {n.body || (n.event === "signature" ? "Estimate signed" : "Payment received")}
                                                    </div>
                                                    <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>
                                                        {new Date(n.created_at).toLocaleString()}
                                                        {n.status !== "sent" && (
                                                            <span style={{ color: n.status === "failed" ? "#ef4444" : "#9ca3af", marginLeft: "6px" }}>
                                                                · {n.status}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Notification bell — links straight to the Messages inbox.
                    Only rendered for company members (superadmins have no
                    client conversations of their own). */}
                {isCompanyMember && (
                    <Link
                        href="/dashboard/messages"
                        aria-label={
                            unreadMessages > 0
                                ? `${unreadMessages} unread messages`
                                : "Messages"
                        }
                        title={
                            unreadMessages > 0
                                ? `${unreadMessages} unread message${unreadMessages > 1 ? "s" : ""}`
                                : "Messages"
                        }
                        style={{
                            position: "relative",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "36px",
                            height: "36px",
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb",
                            background: "#fff",
                            color: "#374151",
                            textDecoration: "none",
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                        </svg>
                        {unreadMessages > 0 && (
                            <span
                                style={{
                                    position: "absolute",
                                    top: "-5px",
                                    right: "-5px",
                                    minWidth: "17px",
                                    height: "17px",
                                    padding: "0 4px",
                                    borderRadius: "999px",
                                    background: "#FDB813",
                                    color: "#1a1f3a",
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    lineHeight: "17px",
                                    textAlign: "center",
                                }}
                            >
                                {unreadMessages > 99 ? "99+" : unreadMessages}
                            </span>
                        )}
                    </Link>
                )}

                {/* Credits widget:
                    - Company admin → wrapped in a link to /dashboard/billing
                    - Other team members → plain badge, no link, no $ amount
                    - Superadmin → not rendered */}
                {isCompanyMember && (
                    isCompanyAdmin ? (
                        <Link href="/dashboard/billing" style={{ textDecoration: "none" }}>
                            {CreditsBadge}
                        </Link>
                    ) : (
                        CreditsBadge
                    )
                )}
                <select
                    className="dashboard-date-select"
                    id="dateRangeSelector"
                    defaultValue="Last 30 Days"
                >
                    <option>Last 30 Days</option>
                    <option>Last 7 Days</option>
                    <option>Last Quarter</option>
                    <option>Year to Date</option>
                </select>
                <button
                    onClick={exportReport}
                    className="dashboard-export-btn"
                    type="button"
                >
                    Export Report
                </button>
            </div>
        </header>
    );
};

export default DashboardHeader;
