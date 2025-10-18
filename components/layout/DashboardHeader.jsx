"use client";

import React, { useEffect } from "react";

const DashboardHeader = ({ title = "ClaimKing Dashboard" }) => {
    useEffect(() => {
        document.title = title;
    }, [title]);

    const openNewClaim = () => (window.location.href = "/claims/new");
    const exportReport = () => {
        const value = document.getElementById("dateRangeSelector")?.value;
        console.log("Exporting report for:", value);
    };

    return (
        <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-semibold">{title}</h1>
                <button
                    onClick={openNewClaim}
                    className="flex items-center gap-1 bg-yellow-500 text-white px-3 py-1 rounded-md hover:bg-yellow-600 transition"
                >
                    New Claim
                </button>
            </div>

            <div className="flex items-center gap-2">
                <select
                    className="border border-gray-300 rounded-md p-1"
                    id="dateRangeSelector"
                >
                    <option>Last 30 Days</option>
                    <option>Last 7 Days</option>
                    <option>Last Quarter</option>
                    <option>Year to Date</option>
                </select>
                <button
                    onClick={exportReport}
                    className="bg-gray-100 px-3 py-1 rounded-md hover:bg-gray-200 transition"
                >
                    Export Report
                </button>
            </div>
        </div>
    );
};

export default DashboardHeader;
