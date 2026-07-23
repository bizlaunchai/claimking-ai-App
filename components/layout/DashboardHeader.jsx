"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUnreadMessages } from "@/lib/hooks/useUnreadMessages";

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

    useEffect(() => {
        document.title = title;
    }, [title]);

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
