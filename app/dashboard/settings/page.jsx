'use client'
import React, { useState } from 'react';
import "./settings.css"

const Settings = () => {
    const [expandedCategories, setExpandedCategories] = useState([]);
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    const categories = [
        {
            id: 'company',
            title: 'Company & Profile',
            description: 'Business information, branding, and user profiles',
            icon: (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
            )
        },
        {
            id: 'notifications',
            title: 'Notifications & Alerts',
            description: 'Email, SMS, and push notification preferences',
            icon: (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
            )
        },
        {
            id: 'integrations',
            title: 'Integrations & API',
            description: 'Third-party services and API connections',
            icon: (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
            )
        },
        {
            id: 'ai',
            title: 'AI Features & Automation',
            description: 'Configure AI tools, document generation, and automation',
            icon: (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
            )
        },
        {
            id: 'security',
            title: 'Security & Privacy',
            description: 'Password, 2FA, and data privacy settings',
            icon: (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
            )
        },
        {
            id: 'billing',
            title: 'Billing & Subscription',
            description: 'Payment methods, invoices, and plan management',
            icon: (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                </svg>
            )
        }
    ];

    const toggleCategory = (categoryId) => {
        setExpandedCategories(prev => 
            prev.includes(categoryId) 
                ? prev.filter(id => id !== categoryId)
                : [...prev, categoryId]
        );
    };

    const handleSaveAll = () => {
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
    };

    return (
        <div>
            {/* Top Header */}
            <div className="top-header">
                <div className="header-container">
                    <div className="header-left">
                        <div className="logo-section">
                            <div className="logo">
                                <svg viewBox="0 0 24 24">
                                    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2.86-2h8.28l.5-2.02l-2.87-1.73L12 13l-1.77-2.75l-2.87 1.73L7.86 14z"/>
                                </svg>
                            </div>
                            <div className="logo-text">ClaimKing.AI</div>
                        </div>
                        <div className="page-title">Settings & Configuration</div>
                    </div>
                    <div className="header-actions">
                        <button className="header-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 11l3 3L22 4"/>
                                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                            </svg>
                            Reset to Defaults
                        </button>
                        <button className="header-btn primary" onClick={handleSaveAll}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                                <polyline points="17 21 17 13 7 13 7 21"/>
                                <polyline points="7 3 7 8 15 8"/>
                            </svg>
                            Save All Settings
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Container */}
            <div className="main-container">
                <div className="settings-grid">
                    {categories.map((category) => (
                        <div 
                            key={category.id} 
                            className={`settings-category ${expandedCategories.includes(category.id) ? 'expanded' : ''}`}
                        >
                            <div 
                                className={`category-header ${expandedCategories.includes(category.id) ? 'active' : ''}`}
                                onClick={() => toggleCategory(category.id)}
                            >
                                <div className="category-icon">{category.icon}</div>
                                <div className="category-info">
                                    <div className="category-title">
                                        {category.title}
                                    </div>
                                    <div className="category-description">{category.description}</div>
                                </div>
                                <div className="category-toggle">
                                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M6 9l6 6 6-6"/>
                                    </svg>
                                </div>
                            </div>
                            <div className={`category-content ${expandedCategories.includes(category.id) ? 'expanded' : ''}`}>
                                <div className="category-body">
                                    <div className="settings-section">
                                        <h3 className="section-title">{category.title} Settings</h3>
                                        <p className="section-description">
                                            Configure your {category.title.toLowerCase()} preferences below.
                                        </p>
                                        
                                        {/* Example form fields */}
                                        <div className="form-grid">
                                            <div className="form-group">
                                                <label className="form-label">Setting Option 1</label>
                                                <input type="text" className="form-input" placeholder="Enter value..." />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Setting Option 2</label>
                                                <select className="form-select">
                                                    <option>Option 1</option>
                                                    <option>Option 2</option>
                                                    <option>Option 3</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="toggle-group">
                                            <div className="toggle-info">
                                                <div className="toggle-label">Enable Feature</div>
                                                <div className="toggle-description">Toggle this setting on or off</div>
                                            </div>
                                            <label className="toggle-switch">
                                                <input type="checkbox" defaultChecked />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </div>

                                        <div className="btn-group">
                                            <button className="btn btn-primary">Save Changes</button>
                                            <button className="btn btn-secondary">Cancel</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Success Toast */}
            {showSuccessToast && (
                <div className="success-toast show">
                    ✓ All settings saved successfully!
                </div>
            )}
        </div>
    );
};

export default Settings;

