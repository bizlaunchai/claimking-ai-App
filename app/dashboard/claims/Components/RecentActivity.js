"use client";
import React from "react";


const RecentActivity = ({activities}) => {

    // Icon map function based on type
    const getIcon = (type) => {
        switch (type) {
            case 'success': return '✓';
            case 'warning': return '!';
            case 'info': return '📄';
            case 'urgent': return '⚡';
            case 'call': return '📞';
            default: return '•';
        }
    };

    return (
        <div className="activity-column">
            <h3 className="activity-title">Recent Activity</h3>
            <div className="activity-list">
                {activities?.length > 0 ? (
                    activities.map((activity, index) => (
                        <div key={activity.id || index} className="activity-item">
                            <div className={`activity-icon ${activity.type}`}>
                                {getIcon(activity.type)}
                            </div>
                            <div className="activity-content">
                                <div className="activity-text">{activity.text}</div>
                                <div className="activity-time">{activity.time}</div>
                            </div>
                            <div className="activity-amount">
                                {activity.amountPrefix}{activity.amount}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-5 text-center text-gray-400">
                         No recent activity found
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecentActivity;