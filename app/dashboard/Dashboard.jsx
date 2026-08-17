"use client";
import React, { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import axiosInstance from "@/lib/axiosInstance.js";
import { LoadingBlock } from "@/components/ui/Loader.jsx";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

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

    const [scope, setScope] = useState(null); // { claims:'all'|'own', leads:'all'|'own' }
    const [loading, setLoading] = useState(true); // first-load state → skeleton/spinner

    // Real, server-side own-only-scoped dashboard numbers (task 5.1). An own-only
    // user's totals reflect only their own pipeline — the backend enforces it.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await axiosInstance.get('/analytics/overview', { suppressErrorToast: true });
                if (cancelled) return;
                const d = res.data || {};
                const c = d.claims || {};
                const l = d.leads || {};
                const money = (n) => '$' + (Number(n) || 0).toLocaleString();
                const stageKeys = Object.keys(c.by_stage || {}).sort((a, b) => Number(a) - Number(b));
                setScope(d.scope || null);
                setDashboardData((prev) => ({
                    ...prev,
                    kpis: [
                        { label: 'Total Claims Value', value: money(c.total_value), change: '', isPositive: true },
                        { label: 'Active Claims', value: String(c.active ?? 0), change: '', isPositive: true },
                        { label: 'Action Required', value: String(c.action_required ?? 0), change: '', isPositive: true },
                        { label: 'Approval Rate', value: (c.approval_rate ?? 0) + '%', change: '', isPositive: true },
                        { label: 'Total Leads', value: String(l.total ?? 0), change: '', isPositive: true },
                        { label: 'Lead Conversion', value: (l.conversion_rate ?? 0) + '%', change: '', isPositive: true },
                    ],
                    claimsTrend: {
                        labels: (c.trend || []).map((t) => t.label),
                        values: (c.trend || []).map((t) => t.value),
                    },
                    claimTypes: {
                        labels: stageKeys.map((s) => `Stage ${s}`),
                        values: stageKeys.map((s) => c.by_stage[s]),
                    },
                    aiMetrics: [
                        { value: String(c.total ?? 0), label: 'Total Claims' },
                        { value: String(c.closed ?? 0), label: 'Closed Claims' },
                        { value: String(l.hot ?? 0), label: 'Hot Leads' },
                        { value: String(l.converted ?? 0), label: 'Leads Converted' },
                        { value: money(c.approved_value), label: 'Approved Value' },
                    ],
                }));
            } catch {
                /* leave the zero-state defaults */
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const claimsChartRef = useRef(null);
    const typesChartRef = useRef(null);
    const insuranceChartRef = useRef(null);

    const claimsChartInstance = useRef(null);
    const typesChartInstance = useRef(null);
    const insuranceChartInstance = useRef(null);


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
    }, [dashboardData, loading]);

    return (
        <div className="dashboard-content">
            <div className="content-container">
                {scope && (scope.claims === 'own' || scope.leads === 'own') && (
                    <div style={{
                        background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af',
                        borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, marginBottom: 16,
                    }}>
                        📊 These numbers reflect <b>your own pipeline</b> only.
                    </div>
                )}
                {/* KPI Cards — skeleton while first load is in flight */}
                <div className="kpi-grid">
                    {loading
                        ? Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="kpi-card" style={{ overflow: "hidden" }}>
                                <SkeletonTheme baseColor="#eef0f3" highlightColor="#f8f9fb" borderRadius={7}>
                                    <div style={{ marginBottom: 12 }}><Skeleton height={11} width="62%" /></div>
                                    <div style={{ marginBottom: 12 }}><Skeleton height={26} width="45%" /></div>
                                    <div><Skeleton height={18} width="34%" /></div>
                                </SkeletonTheme>
                            </div>
                        ))
                        : dashboardData.kpis.map((kpi, i) => (
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
                            {loading
                                ? <LoadingBlock label="Loading chart…" style={{ height: "100%" }} />
                                : <canvas ref={claimsChartRef}></canvas>}
                        </div>
                    </div>

                    <div className="chart-card">
                        <div className="chart-header">
                            <div className="chart-title">Claim Types Breakdown</div>
                        </div>
                        <div className="chart-container">
                            {loading
                                ? <LoadingBlock label="Loading chart…" style={{ height: "100%" }} />
                                : <canvas ref={typesChartRef}></canvas>}
                        </div>
                    </div>

                    <div className="chart-card full-width">
                        <div className="chart-header">
                            <div className="chart-title">AI Performance Metrics</div>
                        </div>
                        <div className="ai-grid">
                            {loading
                                ? Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="ai-metric" style={{ overflow: "hidden", textAlign: "center" }}>
                                        <SkeletonTheme baseColor="rgba(255,255,255,0.45)" highlightColor="rgba(255,255,255,0.9)" borderRadius={7}>
                                            <div style={{ marginBottom: 10 }}><Skeleton height={22} width="55%" /></div>
                                            <div><Skeleton height={12} width="72%" /></div>
                                        </SkeletonTheme>
                                    </div>
                                ))
                                : dashboardData.aiMetrics.map((m, i) => (
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