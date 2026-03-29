import React from 'react';

const StatCard = ({ label, data }) => {
    return (
        <div className="stat-item">
            <div className="stat-value">{data.value}</div>
            <div className="stat-label">{label}</div>
            <div className={`stat-change ${data.isPositive ? "positive" : "negative"}`}>
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="currentColor"
                    style={{ transform: data.isPositive ? "rotate(180deg)" : "none" }}
                >
                    <path d="M6 9.5L2.5 6l1-1L5.5 7V2.5h1V7l2-2 1 1L6 9.5z" />
                </svg>
                {data.change}
            </div>
        </div>
    );
};

export default StatCard;