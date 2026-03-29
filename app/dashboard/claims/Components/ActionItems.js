"use client";
import React from "react";


const ActionItems = ({actionItems}) => {

    return (
        <div className="activity-column">
            <h3 className="activity-title">Action Items</h3>
            <div className="action-list">
                {actionItems.length > 0 ? (
                    actionItems.map((action, index) => (
                        <div key={action.id || index} className="action-card">
                            <div className={`action-priority ${action.priority?.toLowerCase()}`}>
                                {action.priority} Priority
                            </div>
                            <div className="action-title">{action.title}</div>
                            <div className="action-client">{action.client} - {action.claimId}</div>
                            <div className="action-deadline">
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                                    <path d="M7 0a7 7 0 1 1 0 14A7 7 0 0 1 7 0zm0 1.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zm0 2a.75.75 0 0 1 .75.75v2.5h2a.75.75 0 0 1 0 1.5h-2.75a.75.75 0 0 1-.75-.75v-3.25A.75.75 0 0 1 7 3.5z"/>
                                </svg>
                                {action.deadline}
                            </div>
                            <button className="action-complete-btn">Complete Action</button>
                        </div>
                    ))
                ) : (
                    <div className="p-10 text-center text-gray-400">
                        No pending action items
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActionItems;