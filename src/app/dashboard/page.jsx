"use client";
import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

const DashboardPage = () => {
    // Refs for charts
    const claimsChartRef = useRef(null);
    const typesChartRef = useRef(null);
    const insuranceChartRef = useRef(null);

    const claimsChartInstance = useRef(null);
    const typesChartInstance = useRef(null);
    const insuranceChartInstance = useRef(null);

    useEffect(() => {
        Chart.defaults.color = "#6b7280";
        Chart.defaults.font.family =
            '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI"';

        // === Claims Volume Chart ===
        const claimsCtx = claimsChartRef.current?.getContext("2d");
        if (claimsCtx) {
            if (claimsChartInstance.current) claimsChartInstance.current.destroy();

            claimsChartInstance.current = new Chart(claimsCtx, {
                type: "line",
                data: {
                    labels: Array.from({ length: 30 }, (_, i) => i + 1),
                    datasets: [
                        {
                            label: "Claims",
                            data: Array.from({ length: 30 }, () =>
                                Math.floor(Math.random() * 20) + 10
                            ),
                            borderColor: "#FDB813",
                            backgroundColor: "rgba(253, 184, 19, 0.1)",
                            tension: 0.4,
                            fill: true,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                },
            });
        }

        // === Claim Types Breakdown ===
        const typesCtx = typesChartRef.current?.getContext("2d");
        if (typesCtx) {
            if (typesChartInstance.current) typesChartInstance.current.destroy();

            typesChartInstance.current = new Chart(typesCtx, {
                type: "doughnut",
                data: {
                    labels: ["Wind Damage", "Hail", "Fire", "Theft"],
                    datasets: [
                        {
                            label: "Claim Types",
                            data: Array.from({ length: 4 }, () =>
                                Math.floor(Math.random() * 50) + 10
                            ),
                            backgroundColor: [
                                "#FDB813",
                                "#34D399",
                                "#60A5FA",
                                "#F87171",
                            ],
                        },
                    ],
                },
                options: {
                    responsive: true,
                    plugins: { legend: { position: "bottom" } },
                },
            });
        }

        // === Top Insurance Companies ===
        const insuranceCtx = insuranceChartRef.current?.getContext("2d");
        if (insuranceCtx) {
            if (insuranceChartInstance.current) insuranceChartInstance.current.destroy();

            insuranceChartInstance.current = new Chart(insuranceCtx, {
                type: "bar",
                data: {
                    labels: ["Company A", "Company B", "Company C", "Company D"],
                    datasets: [
                        {
                            label: "Claims Volume",
                            data: Array.from({ length: 4 }, () =>
                                Math.floor(Math.random() * 100) + 20
                            ),
                            backgroundColor: "#60A5FA",
                        },
                    ],
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                },
            });
        }

        // Cleanup on unmount
        return () => {
            claimsChartInstance.current?.destroy();
            typesChartInstance.current?.destroy();
            insuranceChartInstance.current?.destroy();
        };
    }, []);

    return (
        <div className="dashboard-content">
            <div className="content-container">
                {/* KPI Cards */}
                <div className="kpi-grid">
                    {[
                        { label: "Total Claims Value", value: "$3,847,293", change: "↑ 18.5%" },
                        { label: "Approval Rate", value: "87.3%", change: "↑ 4.2%" },
                        { label: "Supplement Success", value: "92.1%", change: "↑ 6.8%" },
                        { label: "AI Accuracy", value: "96.4%", change: "↑ 2.1%" },
                        { label: "Active Claims", value: "342", change: "↑ 27" },
                        { label: "Avg Processing Time", value: "2.4 days", change: "↓ 0.8" },
                    ].map((kpi, i) => (
                        <div key={i} className="kpi-card">
                            <div className="kpi-label">{kpi.label}</div>
                            <div className="kpi-value">{kpi.value}</div>
                            <span className="kpi-change positive">{kpi.change}</span>
                        </div>
                    ))}
                </div>

                {/* Charts Grid */}
                <div className="chart-grid">
                    {/* Claims Trend */}
                    <div className="chart-card">
                        <div className="chart-header">
                            <div className="chart-title">Claims Volume Trend</div>
                            <div className="chart-subtitle">Daily claims over last 30 days</div>
                        </div>
                        <div className="chart-container">
                            <canvas ref={claimsChartRef}></canvas>
                        </div>
                    </div>

                    {/* Claim Types */}
                    <div className="chart-card">
                        <div className="chart-header">
                            <div className="chart-title">Claim Types Breakdown</div>
                            <div className="chart-subtitle">By damage category</div>
                        </div>
                        <div className="chart-container">
                            <canvas ref={typesChartRef}></canvas>
                        </div>
                    </div>

                    {/* AI Performance */}
                    <div className="chart-card full-width">
                        <div className="chart-header">
                            <div className="chart-title">AI Performance Metrics</div>
                            <div className="chart-subtitle">Automated processing statistics</div>
                        </div>
                        <div className="ai-grid">
                            {[
                                { value: "4,892", label: "Estimates Generated" },
                                { value: "1,247", label: "Policies Analyzed" },
                                { value: "873", label: "3D Mockups Created" },
                                { value: "2,156", label: "Calls Handled" },
                                { value: "$847K", label: "Supplements Found" },
                            ].map((m, i) => (
                                <div key={i} className="ai-metric">
                                    <div className="ai-metric-value">{m.value}</div>
                                    <div className="ai-metric-label">{m.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Insurance Companies */}
                    <div className="chart-card">
                        <div className="chart-header">
                            <div className="chart-title">Top Insurance Companies</div>
                            <div className="chart-subtitle">By claim volume</div>
                        </div>
                        <div className="chart-container">
                            <canvas ref={insuranceChartRef}></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
