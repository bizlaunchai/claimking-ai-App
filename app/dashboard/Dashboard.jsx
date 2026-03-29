"use client";
import React, { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import axiosInstance from "@/lib/axiosInstance.js";

const DashboardPage = () => {
    // Initial State with 0/Default values (No Dummy Data)
    const [dashboardData, setDashboardData] = useState({
        kpis: [
            { label: "Total Claims Value", value: "$0", change: "0%", isPositive: true },
            { label: "Approval Rate", value: "0%", change: "0%", isPositive: true },
            { label: "Supplement Success", value: "0%", change: "0%", isPositive: true },
            { label: "AI Accuracy", value: "0%", change: "0%", isPositive: true },
            { label: "Active Claims", value: "0", change: "0", isPositive: true },
            { label: "Avg Processing Time", value: "0 days", change: "0", isPositive: true },
        ],
        claimsTrend: { labels: [], values: [] },
        claimTypes: { labels: [], values: [] },
        topCompanies: { labels: [], values: [] },
        aiMetrics: [
            { value: "0", label: "Estimates Generated" },
            { value: "0", label: "Policies Analyzed" },
            { value: "0", label: "3D Mockups Created" },
            { value: "0", label: "Calls Handled" },
            { value: "$0", label: "Supplements Found" },
        ]
    });

    const claimsChartRef = useRef(null);
    const typesChartRef = useRef(null);
    const insuranceChartRef = useRef(null);

    const claimsChartInstance = useRef(null);
    const typesChartInstance = useRef(null);
    const insuranceChartInstance = useRef(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const { data } = await axiosInstance.get('/dashboard-stats');
                if (data) setDashboardData(data);
            } catch (error) {
                console.log("Waiting for API to be ready...");
            }
        };

        fetchDashboardData();
    }, []);

    useEffect(() => {
        Chart.defaults.color = "#6b7280";
        Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI"';

        const commonOptions = { responsive: true, maintainAspectRatio: false };

        // === Claims Volume Chart ===
        const claimsCtx = claimsChartRef.current?.getContext("2d");
        if (claimsCtx) {
            if (claimsChartInstance.current) claimsChartInstance.current.destroy();
            claimsChartInstance.current = new Chart(claimsCtx, {
                type: "line",
                data: {
                    labels: dashboardData.claimsTrend.labels.length ? dashboardData.claimsTrend.labels : ["No Data"],
                    datasets: [{
                        label: "Claims",
                        data: dashboardData.claimsTrend.values.length ? dashboardData.claimsTrend.values : [0],
                        borderColor: "#FDB813",
                        backgroundColor: "rgba(253, 184, 19, 0.1)",
                        tension: 0.4,
                        fill: true,
                    }],
                },
                options: { ...commonOptions, plugins: { legend: { display: false } } },
            });
        }

        // === Claim Types Chart ===
        const typesCtx = typesChartRef.current?.getContext("2d");
        if (typesCtx) {
            if (typesChartInstance.current) typesChartInstance.current.destroy();
            typesChartInstance.current = new Chart(typesCtx, {
                type: "doughnut",
                data: {
                    labels: dashboardData.claimTypes.labels.length ? dashboardData.claimTypes.labels : ["None"],
                    datasets: [{
                        data: dashboardData.claimTypes.values.length ? dashboardData.claimTypes.values : [1],
                        backgroundColor: ["#E5E7EB"], // Gray color for empty state
                    }],
                },
                options: { ...commonOptions, plugins: { legend: { position: "bottom" } } },
            });
        }

        // === Top Insurance Chart ===
        const insuranceCtx = insuranceChartRef.current?.getContext("2d");
        if (insuranceCtx) {
            if (insuranceChartInstance.current) insuranceChartInstance.current.destroy();
            insuranceChartInstance.current = new Chart(insuranceCtx, {
                type: "bar",
                data: {
                    labels: dashboardData.topCompanies.labels.length ? dashboardData.topCompanies.labels : ["No Data"],
                    datasets: [{
                        label: "Claims Volume",
                        data: dashboardData.topCompanies.values.length ? dashboardData.topCompanies.values : [0],
                        backgroundColor: "#60A5FA",
                    }],
                },
                options: { ...commonOptions, plugins: { legend: { display: false } } },
            });
        }

        return () => {
            claimsChartInstance.current?.destroy();
            typesChartInstance.current?.destroy();
            insuranceChartInstance.current?.destroy();
        };
    }, [dashboardData]);

    return (
        <div className="dashboard-content">
            <div className="content-container">
                {/* KPI Cards (Always Visible) */}
                <div className="kpi-grid">
                    {dashboardData.kpis.map((kpi, i) => (
                        <div key={i} className="kpi-card">
                            <div className="kpi-label">{kpi.label}</div>
                            <div className="kpi-value">{kpi.value}</div>
                            <span className="kpi-change positive">{kpi.change}</span>
                        </div>
                    ))}
                </div>

                <div className="chart-grid">
                    <div className="chart-card">
                        <div className="chart-header">
                            <div className="chart-title">Claims Volume Trend</div>
                        </div>
                        <div className="chart-container">
                            <canvas ref={claimsChartRef}></canvas>
                        </div>
                    </div>

                    <div className="chart-card">
                        <div className="chart-header">
                            <div className="chart-title">Claim Types Breakdown</div>
                        </div>
                        <div className="chart-container">
                            <canvas ref={typesChartRef}></canvas>
                        </div>
                    </div>

                    <div className="chart-card full-width">
                        <div className="chart-header">
                            <div className="chart-title">AI Performance Metrics</div>
                        </div>
                        <div className="ai-grid">
                            {dashboardData.aiMetrics.map((m, i) => (
                                <div key={i} className="ai-metric">
                                    <div className="ai-metric-value">{m.value}</div>
                                    <div className="ai-metric-label">{m.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;