"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
