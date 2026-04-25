"use client";

import React, { useEffect } from "react";

const DashboardHeader = ({
    title = "ClaimKing Dashboard",
    onToggleMobile = () => {},
    isMobileOpen = false,
}) => {
    useEffect(() => {
        document.title = title;
    }, [title]);

    const openNewClaim = () => (window.location.href = "/dashboard/claims");
    const exportReport = () => {
        const value = document.getElementById("dateRangeSelector")?.value;
        console.log("Exporting report for:", value);
    };

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
