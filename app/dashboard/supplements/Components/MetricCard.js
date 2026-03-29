import React from 'react';

const MetricCard = ({ label, value, change, isPositive = true }) => {
    return (
        <div className="metric-card">
            <div className="metric-label">{label}</div>
            <div className="metric-value">{value || "0"}</div>
            <span className={`metric-change ${isPositive ? "positive" : "negative"}`}>
                {isPositive ? "↑" : "↓"} {change || "0%"}
            </span>
        </div>
    );
};

export default MetricCard;