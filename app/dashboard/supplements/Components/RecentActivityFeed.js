"use client";
import React from "react";

const RecentActivityFeed = ({recentActivities}) => {
    const renderIcon = (type) => {
        switch (type) {
            case 'success': return '✓';
            case 'warning': return '!';
            case 'info': return '📄';
            default: return '•';
        }
    };

    return (
        <div className="activity-feed-section">
            <h2 className="section-title">Recent Activity</h2>

            <div className="activity-list">
                {recentActivities.length > 0 ? (
                    recentActivities.map((item, index) => (
                        <div key={item.id || index} className="activity-item">
                            <div className={`activity-icon ${item.type || 'info'}`}>
                                {renderIcon(item.type)}
                            </div>
                            <div className="activity-content">
                                <div className="activity-text">{item.text}</div>
                                <div className="activity-time">{item.time}</div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-6 text-center text-gray-400">
                        No recent activity
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecentActivityFeed;