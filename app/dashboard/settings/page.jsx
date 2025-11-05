'use client'
import React, { useState, useEffect } from 'react';
import "./settings.css"

const Settings = () => {
    const [expandedCategories, setExpandedCategories] = useState([]);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [serviceRadius, setServiceRadius] = useState(50);
    const [primaryColor, setPrimaryColor] = useState('#FDB813');
    const [secondaryColor, setSecondaryColor] = useState('#1a1f3a');
    const [integrations, setIntegrations] = useState({
        salesforce: true,
        hubspot: false,
        acculynx: true,
        jobber: false,
        pipedrive: false,
        zoho: false
    });

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

    const handleIntegrationClick = (integrationId) => {
        setIntegrations(prev => ({
            ...prev,
            [integrationId]: !prev[integrationId]
        }));
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
                    {/* Company & Profile Settings */}
                    <div className={`settings-category ${expandedCategories.includes('company') ? 'expanded' : ''}`}>
                        <div 
                            className={`category-header ${expandedCategories.includes('company') ? 'active' : ''}`}
                            onClick={() => toggleCategory('company')}
                        >
                            <div className="category-icon">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                                </svg>
                            </div>
                            <div className="category-info">
                                <div className="category-title">Company & Profile</div>
                                <div className="category-description">Business information, branding, and user profiles</div>
                            </div>
                            <div className="category-toggle">
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 9l6 6 6-6"/>
                                </svg>
                            </div>
                        </div>
                        <div className={`category-content ${expandedCategories.includes('company') ? 'expanded' : ''}`}>
                            <div className="category-body">
                                {/* Company Information */}
                                <div className="settings-section">
                                    <h3 className="section-title">Company Information</h3>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Company Name</label>
                                            <input type="text" className="form-input" defaultValue="Premium Roofing Solutions" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">DBA Name</label>
                                            <input type="text" className="form-input" placeholder="Doing Business As" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">License Number</label>
                                            <input type="text" className="form-input" defaultValue="ROC-123456" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Tax ID/EIN</label>
                                            <input type="text" className="form-input" defaultValue="12-3456789" />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Business Address</label>
                                        <input type="text" className="form-input" defaultValue="123 Main Street, Suite 100" />
                                    </div>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">City</label>
                                            <input type="text" className="form-input" defaultValue="Phoenix" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">State</label>
                                            <select className="form-select">
                                                <option defaultValue>Arizona</option>
                                                <option>California</option>
                                                <option>Texas</option>
                                                <option>Florida</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">ZIP Code</label>
                                            <input type="text" className="form-input" defaultValue="85001" />
                                        </div>
                                    </div>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Phone</label>
                                            <input type="tel" className="form-input" defaultValue="(555) 123-4567" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Email</label>
                                            <input type="email" className="form-input" defaultValue="info@premiumroofing.com" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Website</label>
                                            <input type="url" className="form-input" defaultValue="https://premiumroofing.com" />
                                        </div>
                                    </div>
                                </div>

                                {/* Service Areas */}
                                <div className="settings-section">
                                    <h3 className="section-title">Service Areas & Coverage</h3>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Service Radius (miles)</label>
                                            <div className="range-group">
                                                <div className="range-header">
                                                    <span>Service Radius</span>
                                                    <span className="range-value">{serviceRadius} miles</span>
                                                </div>
                                                <input 
                                                    type="range" 
                                                    className="range-slider" 
                                                    min="10" 
                                                    max="200" 
                                                    value={serviceRadius}
                                                    onChange={(e) => setServiceRadius(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Service Type</label>
                                            <select className="form-select">
                                                <option>Residential & Commercial</option>
                                                <option>Residential Only</option>
                                                <option>Commercial Only</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Service States</label>
                                        <div className="checkbox-grid">
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="state-az" defaultChecked />
                                                <label htmlFor="state-az" className="checkbox-label">Arizona</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="state-ca" />
                                                <label htmlFor="state-ca" className="checkbox-label">California</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="state-nv" defaultChecked />
                                                <label htmlFor="state-nv" className="checkbox-label">Nevada</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="state-tx" />
                                                <label htmlFor="state-tx" className="checkbox-label">Texas</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="state-nm" />
                                                <label htmlFor="state-nm" className="checkbox-label">New Mexico</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="state-co" />
                                                <label htmlFor="state-co" className="checkbox-label">Colorado</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Branding Settings */}
                                <div className="settings-section">
                                    <h3 className="section-title">Branding & Appearance</h3>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Primary Brand Color</label>
                                            <div className="color-picker-group">
                                                <input 
                                                    type="color" 
                                                    className="color-input" 
                                                    value={primaryColor}
                                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                                />
                                                <span className="color-value">{primaryColor}</span>
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Secondary Color</label>
                                            <div className="color-picker-group">
                                                <input 
                                                    type="color" 
                                                    className="color-input" 
                                                    value={secondaryColor}
                                                    onChange={(e) => setSecondaryColor(e.target.value)}
                                                />
                                                <span className="color-value">{secondaryColor}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Company Logo</label>
                                        <button className="btn btn-outline">Upload Logo</button>
                                        <p className="form-help">Recommended: 500x500px PNG or SVG</p>
                                    </div>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Use Custom Branding</div>
                                            <div className="toggle-description">Apply your brand colors throughout the application</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Claims & Projects Settings */}
                    <div className={`settings-category ${expandedCategories.includes('claims') ? 'expanded' : ''}`}>
                        <div 
                            className={`category-header ${expandedCategories.includes('claims') ? 'active' : ''}`}
                            onClick={() => toggleCategory('claims')}
                        >
                            <div className="category-icon">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                            </div>
                            <div className="category-info">
                                <div className="category-title">
                                    Claims & Projects
                                    <span className="category-badge">PRO</span>
                                </div>
                                <div className="category-description">Configure claim workflows, statuses, and automation</div>
                            </div>
                            <div className="category-toggle">
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 9l6 6 6-6"/>
                                </svg>
                            </div>
                        </div>
                        <div className={`category-content ${expandedCategories.includes('claims') ? 'expanded' : ''}`}>
                            <div className="category-body">
                                <div className="settings-section">
                                    <h3 className="section-title">Claim Workflow Settings</h3>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Auto-assign Claim Numbers</div>
                                            <div className="toggle-description">Automatically generate unique claim IDs</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Claim Number Format</label>
                                            <select className="form-select">
                                                <option>CLM-YYYY-0001</option>
                                                <option>YYYY-MM-0001</option>
                                                <option>Custom Format</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Default Priority</label>
                                            <select className="form-select">
                                                <option>Low</option>
                                                <option defaultValue>Medium</option>
                                                <option>High</option>
                                                <option>Urgent</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Claim Statuses</label>
                                        <div className="checkbox-grid">
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="status-new" defaultChecked />
                                                <label htmlFor="status-new" className="checkbox-label">New</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="status-inspection" defaultChecked />
                                                <label htmlFor="status-inspection" className="checkbox-label">Inspection Scheduled</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="status-estimate" defaultChecked />
                                                <label htmlFor="status-estimate" className="checkbox-label">Estimating</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="status-approval" defaultChecked />
                                                <label htmlFor="status-approval" className="checkbox-label">Awaiting Approval</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="status-progress" defaultChecked />
                                                <label htmlFor="status-progress" className="checkbox-label">In Progress</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="status-complete" defaultChecked />
                                                <label htmlFor="status-complete" className="checkbox-label">Complete</label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Enable Claim Supplements</div>
                                            <div className="toggle-description">Track and manage supplement requests</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Require Manager Approval</div>
                                            <div className="toggle-description">Claims over $10,000 require approval</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                                <div className="settings-section">
                                    <h3 className="section-title">Timeline & Deadlines</h3>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Initial Response Time</label>
                                            <select className="form-select">
                                                <option>1 Hour</option>
                                                <option>2 Hours</option>
                                                <option defaultValue>4 Hours</option>
                                                <option>24 Hours</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Inspection Window</label>
                                            <select className="form-select">
                                                <option>24 Hours</option>
                                                <option defaultValue>48 Hours</option>
                                                <option>72 Hours</option>
                                                <option>1 Week</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Estimate Delivery</label>
                                            <select className="form-select">
                                                <option defaultValue>Same Day</option>
                                                <option>Next Day</option>
                                                <option>48 Hours</option>
                                                <option>3 Days</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Project Completion</label>
                                            <select className="form-select">
                                                <option>7 Days</option>
                                                <option>14 Days</option>
                                                <option defaultValue>30 Days</option>
                                                <option>Custom</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI Tools & Automation */}
                    <div className={`settings-category ${expandedCategories.includes('ai') ? 'expanded' : ''}`}>
                        <div 
                            className={`category-header ${expandedCategories.includes('ai') ? 'active' : ''}`}
                            onClick={() => toggleCategory('ai')}
                        >
                            <div className="category-icon">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                                </svg>
                            </div>
                            <div className="category-info">
                                <div className="category-title">
                                    AI Tools & Automation
                                    <span className="category-badge">NEW</span>
                                </div>
                                <div className="category-description">Configure AI features, automation rules, and smart tools</div>
                            </div>
                            <div className="category-toggle">
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 9l6 6 6-6"/>
                                </svg>
                            </div>
                        </div>
                        <div className={`category-content ${expandedCategories.includes('ai') ? 'expanded' : ''}`}>
                            <div className="category-body">
                                <div className="settings-section">
                                    <h3 className="section-title">AI Estimation</h3>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Enable AI Material Estimation</div>
                                            <div className="toggle-description">Automatically calculate materials from measurement reports</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Waste Factor %</label>
                                            <select className="form-select">
                                                <option>5%</option>
                                                <option defaultValue>10%</option>
                                                <option>15%</option>
                                                <option>20%</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Pricing Database</label>
                                            <select className="form-select">
                                                <option>National Average</option>
                                                <option defaultValue>Regional Pricing</option>
                                                <option>Custom Pricing</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Include Labor Costs</div>
                                            <div className="toggle-description">Add labor calculations to estimates</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                                <div className="settings-section">
                                    <h3 className="section-title">3D Mockup Generator</h3>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Enable 3D Mockup Tool</div>
                                            <div className="toggle-description">Allow AI-generated property visualizations</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Default Mockup Options</label>
                                        <div className="checkbox-grid">
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="mockup-roof" defaultChecked />
                                                <label htmlFor="mockup-roof" className="checkbox-label">Roof Colors</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="mockup-siding" defaultChecked />
                                                <label htmlFor="mockup-siding" className="checkbox-label">Siding Options</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="mockup-trim" defaultChecked />
                                                <label htmlFor="mockup-trim" className="checkbox-label">Trim & Fascia</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="mockup-gutters" />
                                                <label htmlFor="mockup-gutters" className="checkbox-label">Gutters</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="mockup-windows" />
                                                <label htmlFor="mockup-windows" className="checkbox-label">Windows</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="mockup-doors" />
                                                <label htmlFor="mockup-doors" className="checkbox-label">Doors</label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Image Quality</label>
                                            <select className="form-select">
                                                <option>Standard (720p)</option>
                                                <option defaultValue>High (1080p)</option>
                                                <option>Ultra (4K)</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Processing Speed</label>
                                            <select className="form-select">
                                                <option>Fast (Lower Quality)</option>
                                                <option defaultValue>Balanced</option>
                                                <option>Best Quality (Slower)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="settings-section">
                                    <h3 className="section-title">Policy Analyzer</h3>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Enable Policy Analysis</div>
                                            <div className="toggle-description">AI-powered insurance policy interpretation</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Analysis Focus Areas</label>
                                        <div className="checkbox-grid">
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="policy-coverage" defaultChecked />
                                                <label htmlFor="policy-coverage" className="checkbox-label">Coverage Limits</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="policy-deductible" defaultChecked />
                                                <label htmlFor="policy-deductible" className="checkbox-label">Deductibles</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="policy-exclusions" defaultChecked />
                                                <label htmlFor="policy-exclusions" className="checkbox-label">Exclusions</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="policy-endorsements" defaultChecked />
                                                <label htmlFor="policy-endorsements" className="checkbox-label">Endorsements</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="settings-section">
                                    <h3 className="section-title">AI Call Center</h3>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Enable AI Call Answering</div>
                                            <div className="toggle-description">24/7 automated call handling</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Business Hours Mode</label>
                                            <select className="form-select">
                                                <option>Always Use AI</option>
                                                <option defaultValue>Human First, AI Backup</option>
                                                <option>Human Only</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">After Hours Mode</label>
                                            <select className="form-select">
                                                <option defaultValue>AI Handles All Calls</option>
                                                <option>Emergency Only</option>
                                                <option>Voicemail</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">AI Voice Personality</label>
                                        <select className="form-select">
                                            <option>Professional</option>
                                            <option defaultValue>Friendly Professional</option>
                                            <option>Warm & Casual</option>
                                            <option>Formal</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Custom Greeting</label>
                                        <textarea className="form-textarea" placeholder="Thank you for calling Premium Roofing Solutions..." defaultValue="Thank you for calling Premium Roofing Solutions. We're here to help with all your roofing needs. How can I assist you today?"></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Storm Tracking & Weather */}
                    <div className={`settings-category ${expandedCategories.includes('storm') ? 'expanded' : ''}`}>
                        <div 
                            className={`category-header ${expandedCategories.includes('storm') ? 'active' : ''}`}
                            onClick={() => toggleCategory('storm')}
                        >
                            <div className="category-icon">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/>
                                </svg>
                            </div>
                            <div className="category-info">
                                <div className="category-title">Storm Tracking & Weather</div>
                                <div className="category-description">Configure storm alerts, tracking, and weather monitoring</div>
                            </div>
                            <div className="category-toggle">
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 9l6 6 6-6"/>
                                </svg>
                            </div>
                        </div>
                        <div className={`category-content ${expandedCategories.includes('storm') ? 'expanded' : ''}`}>
                            <div className="category-body">
                                <div className="settings-section">
                                    <h3 className="section-title">Storm Alert Settings</h3>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Enable Storm Tracking</div>
                                            <div className="toggle-description">Monitor weather events in your service areas</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Alert Types</label>
                                        <div className="checkbox-grid">
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="alert-hail" defaultChecked />
                                                <label htmlFor="alert-hail" className="checkbox-label">Hail Storms</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="alert-wind" defaultChecked />
                                                <label htmlFor="alert-wind" className="checkbox-label">High Winds</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="alert-tornado" defaultChecked />
                                                <label htmlFor="alert-tornado" className="checkbox-label">Tornadoes</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="alert-flood" defaultChecked />
                                                <label htmlFor="alert-flood" className="checkbox-label">Flooding</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="alert-hurricane" />
                                                <label htmlFor="alert-hurricane" className="checkbox-label">Hurricanes</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="alert-snow" />
                                                <label htmlFor="alert-snow" className="checkbox-label">Heavy Snow</label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Alert Threshold - Hail Size</label>
                                            <select className="form-select">
                                                <option>0.5 inch</option>
                                                <option defaultValue>0.75 inch</option>
                                                <option>1.0 inch</option>
                                                <option>1.5 inch</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Alert Threshold - Wind Speed</label>
                                            <select className="form-select">
                                                <option>40 mph</option>
                                                <option defaultValue>50 mph</option>
                                                <option>60 mph</option>
                                                <option>70 mph</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Auto-Create Lead Areas</div>
                                            <div className="toggle-description">Automatically mark affected areas for canvassing</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Send Team Notifications</div>
                                            <div className="toggle-description">Alert sales team of storm opportunities</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Document Management */}
                    <div className={`settings-category ${expandedCategories.includes('documents') ? 'expanded' : ''}`}>
                        <div 
                            className={`category-header ${expandedCategories.includes('documents') ? 'active' : ''}`}
                            onClick={() => toggleCategory('documents')}
                        >
                            <div className="category-icon">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                                </svg>
                            </div>
                            <div className="category-info">
                                <div className="category-title">Document Management</div>
                                <div className="category-description">Templates, forms, and document generation settings</div>
                            </div>
                            <div className="category-toggle">
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 9l6 6 6-6"/>
                                </svg>
                            </div>
                        </div>
                        <div className={`category-content ${expandedCategories.includes('documents') ? 'expanded' : ''}`}>
                            <div className="category-body">
                                <div className="settings-section">
                                    <h3 className="section-title">Document Templates</h3>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Auto-Generate Documents</div>
                                            <div className="toggle-description">Create documents automatically based on claim status</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Default Templates</label>
                                        <div className="checkbox-grid">
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="template-estimate" defaultChecked />
                                                <label htmlFor="template-estimate" className="checkbox-label">Estimates</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="template-contract" defaultChecked />
                                                <label htmlFor="template-contract" className="checkbox-label">Contracts</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="template-invoice" defaultChecked />
                                                <label htmlFor="template-invoice" className="checkbox-label">Invoices</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="template-supplement" defaultChecked />
                                                <label htmlFor="template-supplement" className="checkbox-label">Supplements</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="template-coc" defaultChecked />
                                                <label htmlFor="template-coc" className="checkbox-label">Certificates</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="template-warranty" />
                                                <label htmlFor="template-warranty" className="checkbox-label">Warranties</label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Document Numbering</label>
                                            <select className="form-select">
                                                <option>Sequential (001, 002...)</option>
                                                <option defaultValue>Date-Based (2024-001)</option>
                                                <option>Custom Format</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Default File Format</label>
                                            <select className="form-select">
                                                <option defaultValue>PDF</option>
                                                <option>Word Document</option>
                                                <option>Both</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Include Company Logo</div>
                                            <div className="toggle-description">Add your logo to all generated documents</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Digital Signatures</div>
                                            <div className="toggle-description">Enable electronic signature collection</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CRM & Integrations */}
                    <div className={`settings-category ${expandedCategories.includes('crm') ? 'expanded' : ''}`}>
                        <div 
                            className={`category-header ${expandedCategories.includes('crm') ? 'active' : ''}`}
                            onClick={() => toggleCategory('crm')}
                        >
                            <div className="category-icon">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                                </svg>
                            </div>
                            <div className="category-info">
                                <div className="category-title">
                                    CRM & Integrations
                                    <span className="category-badge">12</span>
                                </div>
                                <div className="category-description">Connect with CRMs, accounting, and other tools</div>
                            </div>
                            <div className="category-toggle">
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 9l6 6 6-6"/>
                                </svg>
                            </div>
                        </div>
                        <div className={`category-content ${expandedCategories.includes('crm') ? 'expanded' : ''}`}>
                            <div className="category-body">
                                <div className="settings-section">
                                    <h3 className="section-title">Connected CRM Systems</h3>
                                    <div className="integration-grid">
                                        <div 
                                            className={`integration-card ${integrations.salesforce ? 'connected' : ''}`}
                                            onClick={() => handleIntegrationClick('salesforce')}
                                        >
                                            <div className="integration-icon">☁️</div>
                                            <div className="integration-name">Salesforce</div>
                                            <div className="integration-status">{integrations.salesforce ? 'Connected' : 'Not Connected'}</div>
                                        </div>
                                        <div 
                                            className={`integration-card ${integrations.hubspot ? 'connected' : ''}`}
                                            onClick={() => handleIntegrationClick('hubspot')}
                                        >
                                            <div className="integration-icon">🔶</div>
                                            <div className="integration-name">HubSpot</div>
                                            <div className="integration-status">{integrations.hubspot ? 'Connected' : 'Not Connected'}</div>
                                        </div>
                                        <div 
                                            className={`integration-card ${integrations.acculynx ? 'connected' : ''}`}
                                            onClick={() => handleIntegrationClick('acculynx')}
                                        >
                                            <div className="integration-icon">🏠</div>
                                            <div className="integration-name">AccuLynx</div>
                                            <div className="integration-status">{integrations.acculynx ? 'Connected' : 'Not Connected'}</div>
                                        </div>
                                        <div 
                                            className={`integration-card ${integrations.jobber ? 'connected' : ''}`}
                                            onClick={() => handleIntegrationClick('jobber')}
                                        >
                                            <div className="integration-icon">🔨</div>
                                            <div className="integration-name">Jobber</div>
                                            <div className="integration-status">{integrations.jobber ? 'Connected' : 'Not Connected'}</div>
                                        </div>
                                        <div 
                                            className={`integration-card ${integrations.pipedrive ? 'connected' : ''}`}
                                            onClick={() => handleIntegrationClick('pipedrive')}
                                        >
                                            <div className="integration-icon">🎯</div>
                                            <div className="integration-name">Pipedrive</div>
                                            <div className="integration-status">{integrations.pipedrive ? 'Connected' : 'Not Connected'}</div>
                                        </div>
                                        <div 
                                            className={`integration-card ${integrations.zoho ? 'connected' : ''}`}
                                            onClick={() => handleIntegrationClick('zoho')}
                                        >
                                            <div className="integration-icon">📊</div>
                                            <div className="integration-name">Zoho CRM</div>
                                            <div className="integration-status">{integrations.zoho ? 'Connected' : 'Not Connected'}</div>
                                        </div>
                                    </div>
                                    <div className="btn-group">
                                        <button className="btn btn-primary">Add New Integration</button>
                                        <button className="btn btn-outline">Manage Connections</button>
                                    </div>
                                </div>
                                <div className="settings-section">
                                    <h3 className="section-title">Sync Settings</h3>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Sync Frequency</label>
                                            <select className="form-select">
                                                <option>Real-time</option>
                                                <option defaultValue>Every 5 minutes</option>
                                                <option>Every 15 minutes</option>
                                                <option>Every hour</option>
                                                <option>Daily</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Sync Direction</label>
                                            <select className="form-select">
                                                <option>One-way (CRM → ClaimKing)</option>
                                                <option>One-way (ClaimKing → CRM)</option>
                                                <option defaultValue>Two-way sync</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Data to Sync</label>
                                        <div className="checkbox-grid">
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="sync-contacts" defaultChecked />
                                                <label htmlFor="sync-contacts" className="checkbox-label">Contacts</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="sync-claims" defaultChecked />
                                                <label htmlFor="sync-claims" className="checkbox-label">Claims/Deals</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="sync-activities" defaultChecked />
                                                <label htmlFor="sync-activities" className="checkbox-label">Activities</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="sync-documents" defaultChecked />
                                                <label htmlFor="sync-documents" className="checkbox-label">Documents</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="sync-notes" defaultChecked />
                                                <label htmlFor="sync-notes" className="checkbox-label">Notes</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="sync-tasks" />
                                                <label htmlFor="sync-tasks" className="checkbox-label">Tasks</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="settings-section">
                                    <h3 className="section-title">Communication Integrations</h3>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Email Integration (Gmail/Outlook)</div>
                                            <div className="toggle-description">Sync emails with client records</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">RingCentral Integration</div>
                                            <div className="toggle-description">Track calls and SMS messages</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Slack Notifications</div>
                                            <div className="toggle-description">Send updates to Slack channels</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notifications & Alerts */}
                    <div className={`settings-category ${expandedCategories.includes('notifications') ? 'expanded' : ''}`}>
                        <div 
                            className={`category-header ${expandedCategories.includes('notifications') ? 'active' : ''}`}
                            onClick={() => toggleCategory('notifications')}
                        >
                            <div className="category-icon">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                                </svg>
                            </div>
                            <div className="category-info">
                                <div className="category-title">Notifications & Alerts</div>
                                <div className="category-description">Configure how and when you receive notifications</div>
                            </div>
                            <div className="category-toggle">
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 9l6 6 6-6"/>
                                </svg>
                            </div>
                        </div>
                        <div className={`category-content ${expandedCategories.includes('notifications') ? 'expanded' : ''}`}>
                            <div className="category-body">
                                <div className="settings-section">
                                    <h3 className="section-title">Notification Channels</h3>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Email Notifications</label>
                                            <input type="email" className="form-input" defaultValue="notifications@premiumroofing.com" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">SMS Notifications</label>
                                            <input type="tel" className="form-input" defaultValue="+1 (555) 123-4567" />
                                        </div>
                                    </div>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Push Notifications</div>
                                            <div className="toggle-description">Browser and mobile app notifications</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">In-App Notifications</div>
                                            <div className="toggle-description">Show notifications within the application</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                                <div className="settings-section">
                                    <h3 className="section-title">Notification Types</h3>
                                    <table className="settings-table">
                                        <thead>
                                            <tr>
                                                <th>Event</th>
                                                <th>Email</th>
                                                <th>SMS</th>
                                                <th>Push</th>
                                                <th>In-App</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>New Claim Created</td>
                                                <td><input type="checkbox" defaultChecked /></td>
                                                <td><input type="checkbox" defaultChecked /></td>
                                                <td><input type="checkbox" defaultChecked /></td>
                                                <td><input type="checkbox" defaultChecked /></td>
                                            </tr>
                                            <tr>
                                                <td>Claim Status Change</td>
                                                <td><input type="checkbox" defaultChecked /></td>
                                                <td><input type="checkbox" /></td>
                                                <td><input type="checkbox" defaultChecked /></td>
                                                <td><input type="checkbox" defaultChecked /></td>
                                            </tr>
                                            <tr>
                                                <td>Storm Alert</td>
                                                <td><input type="checkbox" defaultChecked /></td>
                                                <td><input type="checkbox" defaultChecked /></td>
                                                <td><input type="checkbox" defaultChecked /></td>
                                                <td><input type="checkbox" defaultChecked /></td>
                                            </tr>
                                            <tr>
                                                <td>Appointment Reminder</td>
                                                <td><input type="checkbox" defaultChecked /></td>
                                                <td><input type="checkbox" defaultChecked /></td>
                                                <td><input type="checkbox" /></td>
                                                <td><input type="checkbox" defaultChecked /></td>
                                            </tr>
                                            <tr>
                                                <td>Payment Received</td>
                                                <td><input type="checkbox" defaultChecked /></td>
                                                <td><input type="checkbox" /></td>
                                                <td><input type="checkbox" defaultChecked /></td>
                                                <td><input type="checkbox" defaultChecked /></td>
                                            </tr>
                                            <tr>
                                                <td>Document Signed</td>
                                                <td><input type="checkbox" defaultChecked /></td>
                                                <td><input type="checkbox" /></td>
                                                <td><input type="checkbox" /></td>
                                                <td><input type="checkbox" defaultChecked /></td>
                                            </tr>
                                            <tr>
                                                <td>Team Activity</td>
                                                <td><input type="checkbox" /></td>
                                                <td><input type="checkbox" /></td>
                                                <td><input type="checkbox" /></td>
                                                <td><input type="checkbox" defaultChecked /></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="settings-section">
                                    <h3 className="section-title">Notification Schedule</h3>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Email Digest Frequency</label>
                                            <select className="form-select">
                                                <option>Real-time</option>
                                                <option defaultValue>Daily Summary</option>
                                                <option>Weekly Summary</option>
                                                <option>Never</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Digest Send Time</label>
                                            <input type="time" className="form-input" defaultValue="09:00" />
                                        </div>
                                    </div>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Do Not Disturb</div>
                                            <div className="toggle-description">Pause notifications during specific hours</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Billing & Subscription */}
                    <div className={`settings-category ${expandedCategories.includes('billing') ? 'expanded' : ''}`}>
                        <div 
                            className={`category-header ${expandedCategories.includes('billing') ? 'active' : ''}`}
                            onClick={() => toggleCategory('billing')}
                        >
                            <div className="category-icon">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                            </div>
                            <div className="category-info">
                                <div className="category-title">Billing & Subscription</div>
                                <div className="category-description">Your ClaimKing.AI subscription, usage, and payment method</div>
                            </div>
                            <div className="category-toggle">
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 9l6 6 6-6"/>
                                </svg>
                            </div>
                        </div>
                        <div className={`category-content ${expandedCategories.includes('billing') ? 'expanded' : ''}`}>
                            <div className="category-body">
                                <div className="alert alert-info">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <line x1="12" y1="16" x2="12" y2="12"/>
                                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                                    </svg>
                                    <div>
                                        <strong>Current Plan: Professional</strong><br />
                                        $299/month • Renews November 15, 2024
                                    </div>
                                </div>
                                <div className="settings-section">
                                    <h3 className="section-title">Subscription Details</h3>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Current Plan</label>
                                            <select className="form-select">
                                                <option>Starter - $99/month</option>
                                                <option defaultValue>Professional - $299/month</option>
                                                <option>Enterprise - $599/month</option>
                                                <option>Custom - Contact Sales</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Billing Cycle</label>
                                            <select className="form-select">
                                                <option defaultValue>Monthly</option>
                                                <option>Annual (Save 15%)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="settings-section">
                                    <h3 className="section-title">Usage & Credits</h3>
                                    <div className="range-group">
                                        <div className="range-header">
                                            <span>AI Credits Used</span>
                                            <span className="range-value">847 / 1000</span>
                                        </div>
                                        <progress value="847" max="1000" style={{width: '100%', height: '20px'}}></progress>
                                    </div>
                                    <p className="form-help">Resets on November 15, 2024</p>
                                    <div className="form-grid" style={{marginTop: '1rem'}}>
                                        <div className="form-group">
                                            <label className="form-label">Team Members</label>
                                            <div><strong>5 / 10</strong> seats used</div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Storage Used</label>
                                            <div><strong>42.3 GB / 100 GB</strong></div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">API Calls</label>
                                            <div><strong>15,234 / 50,000</strong> this month</div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Active Claims</label>
                                            <div><strong>127 / Unlimited</strong></div>
                                        </div>
                                    </div>
                                    <button className="btn btn-outline" style={{marginTop: '1rem'}}>Purchase Additional Credits</button>
                                </div>
                                <div className="settings-section">
                                    <h3 className="section-title">Payment Method</h3>
                                    <div className="form-group">
                                        <label className="form-label">Primary Payment Method</label>
                                        <div style={{padding: '1rem', background: '#f9fafb', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                                            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                                                <svg width="40" height="24" viewBox="0 0 40 24" fill="#1a1f3a">
                                                    <rect width="40" height="24" rx="4" fill="#1a1f3a"/>
                                                    <circle cx="16" cy="12" r="5" fill="#FDB813"/>
                                                    <circle cx="24" cy="12" r="5" fill="#d4a000" opacity="0.8"/>
                                                </svg>
                                                <div>
                                                    <div style={{fontWeight: '600'}}>•••• •••• •••• 4242</div>
                                                    <div style={{fontSize: '0.75rem', color: '#6b7280'}}>Expires 12/25</div>
                                                </div>
                                            </div>
                                            <button className="btn btn-outline">Update</button>
                                        </div>
                                    </div>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Auto-Renewal</div>
                                            <div className="toggle-description">Automatically renew subscription each billing period</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Backup Payment Method</label>
                                        <button className="btn btn-outline">Add Backup Method</button>
                                    </div>
                                </div>
                                <div className="settings-section">
                                    <h3 className="section-title">Billing History</h3>
                                    <table className="settings-table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Description</th>
                                                <th>Amount</th>
                                                <th>Status</th>
                                                <th>Invoice</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>Oct 15, 2024</td>
                                                <td>Professional Plan - Monthly</td>
                                                <td>$299.00</td>
                                                <td><span className="status-indicator active">Paid</span></td>
                                                <td><button className="btn btn-outline">Download</button></td>
                                            </tr>
                                            <tr>
                                                <td>Sep 15, 2024</td>
                                                <td>Professional Plan - Monthly</td>
                                                <td>$299.00</td>
                                                <td><span className="status-indicator active">Paid</span></td>
                                                <td><button className="btn btn-outline">Download</button></td>
                                            </tr>
                                            <tr>
                                                <td>Aug 15, 2024</td>
                                                <td>Professional Plan - Monthly</td>
                                                <td>$299.00</td>
                                                <td><span className="status-indicator active">Paid</span></td>
                                                <td><button className="btn btn-outline">Download</button></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="btn-group">
                                    <button className="btn btn-primary">Upgrade Plan</button>
                                    <button className="btn btn-outline">Change Plan</button>
                                    <button className="btn btn-outline">Cancel Subscription</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Customer Invoicing & Payments */}
                    <div className={`settings-category ${expandedCategories.includes('payments') ? 'expanded' : ''}`}>
                        <div 
                            className={`category-header ${expandedCategories.includes('payments') ? 'active' : ''}`}
                            onClick={() => toggleCategory('payments')}
                        >
                            <div className="category-icon">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                                </svg>
                            </div>
                            <div className="category-info">
                                <div className="category-title">Customer Invoicing & Payments</div>
                                <div className="category-description">Accept payments from customers, create invoices, and manage collections</div>
                            </div>
                            <div className="category-toggle">
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 9l6 6 6-6"/>
                                </svg>
                            </div>
                        </div>
                        <div className={`category-content ${expandedCategories.includes('payments') ? 'expanded' : ''}`}>
                            <div className="category-body">
                                <div className="settings-section">
                                    <h3 className="section-title">Payment Processing Setup</h3>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Accept Online Payments</div>
                                            <div className="toggle-description">Allow customers to pay invoices online</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Payment Processor</label>
                                        <div className="integration-grid">
                                            <div className="integration-card connected">
                                                <div className="integration-icon">💳</div>
                                                <div className="integration-name">Stripe</div>
                                                <div className="integration-status">Connected</div>
                                            </div>
                                            <div className="integration-card">
                                                <div className="integration-icon">🟦</div>
                                                <div className="integration-name">Square</div>
                                                <div className="integration-status">Not Connected</div>
                                            </div>
                                            <div className="integration-card">
                                                <div className="integration-icon">🅿️</div>
                                                <div className="integration-name">PayPal</div>
                                                <div className="integration-status">Not Connected</div>
                                            </div>
                                            <div className="integration-card">
                                                <div className="integration-icon">📱</div>
                                                <div className="integration-name">QuickBooks Payments</div>
                                                <div className="integration-status">Not Connected</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Accepted Payment Methods</label>
                                        <div className="checkbox-grid">
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="accept-credit" defaultChecked />
                                                <label htmlFor="accept-credit" className="checkbox-label">Credit/Debit Cards</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="accept-ach" defaultChecked />
                                                <label htmlFor="accept-ach" className="checkbox-label">ACH Bank Transfer</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="accept-check" defaultChecked />
                                                <label htmlFor="accept-check" className="checkbox-label">Check</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="accept-cash" defaultChecked />
                                                <label htmlFor="accept-cash" className="checkbox-label">Cash</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="accept-financing" />
                                                <label htmlFor="accept-financing" className="checkbox-label">Financing (3rd Party)</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="accept-insurance" defaultChecked />
                                                <label htmlFor="accept-insurance" className="checkbox-label">Insurance Direct Pay</label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Processing Fee Handling</label>
                                            <select className="form-select">
                                                <option>Absorb all fees</option>
                                                <option defaultValue>Pass fees to customer</option>
                                                <option>Split fees 50/50</option>
                                                <option>Custom percentage</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Fee Percentage (if passed to customer)</label>
                                            <input type="number" className="form-input" defaultValue="2.9" step="0.1" min="0" max="10" />
                                            <p className="form-help">Plus $0.30 per transaction</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="settings-section">
                                    <h3 className="section-title">Invoice Configuration</h3>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Invoice Prefix</label>
                                            <input type="text" className="form-input" defaultValue="INV-" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Starting Invoice Number</label>
                                            <input type="number" className="form-input" defaultValue="1247" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Default Payment Terms</label>
                                            <select className="form-select">
                                                <option>Due on receipt</option>
                                                <option>Net 10</option>
                                                <option>Net 15</option>
                                                <option defaultValue>Net 30</option>
                                                <option>Net 45</option>
                                                <option>Net 60</option>
                                                <option>Custom terms</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Late Fee</label>
                                            <select className="form-select">
                                                <option>No late fee</option>
                                                <option>1.5% per month</option>
                                                <option defaultValue>2% per month</option>
                                                <option>$25 flat fee</option>
                                                <option>$50 flat fee</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Invoice Footer Text</label>
                                        <textarea className="form-textarea" placeholder="Thank you for your business..." defaultValue="Thank you for choosing Premium Roofing Solutions. Payment is due within 30 days. Please contact us with any questions."></textarea>
                                    </div>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Auto-Send Invoices</div>
                                            <div className="toggle-description">Automatically email invoices when created</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Send Payment Reminders</div>
                                            <div className="toggle-description">Automatically remind customers of overdue invoices</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">First Reminder</label>
                                            <select className="form-select">
                                                <option>3 days before due</option>
                                                <option defaultValue>On due date</option>
                                                <option>3 days overdue</option>
                                                <option>7 days overdue</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Follow-up Reminders</label>
                                            <select className="form-select">
                                                <option>Every 3 days</option>
                                                <option defaultValue>Every 7 days</option>
                                                <option>Every 14 days</option>
                                                <option>Every 30 days</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="settings-section">
                                    <h3 className="section-title">Payment Plans & Financing</h3>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Offer Payment Plans</div>
                                            <div className="toggle-description">Allow customers to pay in installments</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Minimum for Payment Plan</label>
                                            <input type="number" className="form-input" defaultValue="1000" min="0" />
                                            <p className="form-help">Invoices above this amount can use payment plans</p>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Down Payment Required</label>
                                            <select className="form-select">
                                                <option>No down payment</option>
                                                <option>10%</option>
                                                <option>25%</option>
                                                <option defaultValue>33%</option>
                                                <option>50%</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Financing Partners</label>
                                        <div className="checkbox-grid">
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="finance-greensky" defaultChecked />
                                                <label htmlFor="finance-greensky" className="checkbox-label">GreenSky</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="finance-synchrony" />
                                                <label htmlFor="finance-synchrony" className="checkbox-label">Synchrony</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="finance-wells" />
                                                <label htmlFor="finance-wells" className="checkbox-label">Wells Fargo</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="finance-affirm" />
                                                <label htmlFor="finance-affirm" className="checkbox-label">Affirm</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="settings-section">
                                    <h3 className="section-title">Collections & Recovery</h3>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Send to Collections After</label>
                                            <select className="form-select">
                                                <option>30 days overdue</option>
                                                <option>60 days overdue</option>
                                                <option defaultValue>90 days overdue</option>
                                                <option>120 days overdue</option>
                                                <option>Never - Manual only</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Collections Agency</label>
                                            <select className="form-select">
                                                <option defaultValue>None configured</option>
                                                <option>Internal collections</option>
                                                <option>Third-party agency</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Report to Credit Bureaus</div>
                                            <div className="toggle-description">Report severely overdue accounts to credit agencies</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Client Portal */}
                    <div className={`settings-category ${expandedCategories.includes('portal') ? 'expanded' : ''}`}>
                        <div 
                            className={`category-header ${expandedCategories.includes('portal') ? 'active' : ''}`}
                            onClick={() => toggleCategory('portal')}
                        >
                            <div className="category-icon">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                                </svg>
                            </div>
                            <div className="category-info">
                                <div className="category-title">Client Portal</div>
                                <div className="category-description">Configure client access and portal features</div>
                            </div>
                            <div className="category-toggle">
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 9l6 6 6-6"/>
                                </svg>
                            </div>
                        </div>
                        <div className={`category-content ${expandedCategories.includes('portal') ? 'expanded' : ''}`}>
                            <div className="category-body">
                                <div className="settings-section">
                                    <h3 className="section-title">Portal Access</h3>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Enable Client Portal</div>
                                            <div className="toggle-description">Allow clients to access their claim information</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Portal Features</label>
                                        <div className="checkbox-grid">
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="portal-status" defaultChecked />
                                                <label htmlFor="portal-status" className="checkbox-label">View Claim Status</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="portal-docs" defaultChecked />
                                                <label htmlFor="portal-docs" className="checkbox-label">Access Documents</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="portal-photos" defaultChecked />
                                                <label htmlFor="portal-photos" className="checkbox-label">Upload Photos</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="portal-messages" defaultChecked />
                                                <label htmlFor="portal-messages" className="checkbox-label">Send Messages</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="portal-payment" defaultChecked />
                                                <label htmlFor="portal-payment" className="checkbox-label">Make Payments</label>
                                            </div>
                                            <div className="checkbox-item">
                                                <input type="checkbox" id="portal-schedule" defaultChecked />
                                                <label htmlFor="portal-schedule" className="checkbox-label">Schedule Appointments</label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Auto-Send Portal Invites</div>
                                            <div className="toggle-description">Send portal access when claim is created</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Require Email Verification</div>
                                            <div className="toggle-description">Clients must verify email before access</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Team & Users */}
                    <div className={`settings-category ${expandedCategories.includes('team') ? 'expanded' : ''}`}>
                        <div 
                            className={`category-header ${expandedCategories.includes('team') ? 'active' : ''}`}
                            onClick={() => toggleCategory('team')}
                        >
                            <div className="category-icon">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                                </svg>
                            </div>
                            <div className="category-info">
                                <div className="category-title">
                                    Team & Users
                                    <span className="category-badge">5</span>
                                </div>
                                <div className="category-description">Manage team members, roles, and permissions</div>
                            </div>
                            <div className="category-toggle">
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 9l6 6 6-6"/>
                                </svg>
                            </div>
                        </div>
                        <div className={`category-content ${expandedCategories.includes('team') ? 'expanded' : ''}`}>
                            <div className="category-body">
                                <div className="alert alert-info">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <line x1="12" y1="16" x2="12" y2="12"/>
                                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                                    </svg>
                                    <div>
                                        <strong>Team Size: 5 / 10 members</strong><br />
                                        You can add 5 more team members to your current plan.
                                    </div>
                                </div>
                                <div className="settings-section">
                                    <h3 className="section-title">User Roles</h3>
                                    <table className="settings-table">
                                        <thead>
                                            <tr>
                                                <th>Role</th>
                                                <th>Users</th>
                                                <th>Description</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td><strong>Admin</strong></td>
                                                <td>2</td>
                                                <td>Full system access</td>
                                                <td><button className="btn btn-outline">Edit</button></td>
                                            </tr>
                                            <tr>
                                                <td><strong>Manager</strong></td>
                                                <td>1</td>
                                                <td>Manage teams and approve claims</td>
                                                <td><button className="btn btn-outline">Edit</button></td>
                                            </tr>
                                            <tr>
                                                <td><strong>Estimator</strong></td>
                                                <td>1</td>
                                                <td>Create and manage estimates</td>
                                                <td><button className="btn btn-outline">Edit</button></td>
                                            </tr>
                                            <tr>
                                                <td><strong>Sales Rep</strong></td>
                                                <td>1</td>
                                                <td>Manage leads and appointments</td>
                                                <td><button className="btn btn-outline">Edit</button></td>
                                            </tr>
                                            <tr>
                                                <td><strong>Field Tech</strong></td>
                                                <td>0</td>
                                                <td>Field inspections and photos</td>
                                                <td><button className="btn btn-outline">Edit</button></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="settings-section">
                                    <h3 className="section-title">Permissions</h3>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Require Two-Factor Authentication</div>
                                            <div className="toggle-description">All users must enable 2FA</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Allow API Access</div>
                                            <div className="toggle-description">Users can generate API keys</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div className="btn-group">
                                        <button className="btn btn-primary">Invite Team Member</button>
                                        <button className="btn btn-outline">Manage Roles</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Security & Privacy */}
                    <div className={`settings-category ${expandedCategories.includes('security') ? 'expanded' : ''}`}>
                        <div 
                            className={`category-header ${expandedCategories.includes('security') ? 'active' : ''}`}
                            onClick={() => toggleCategory('security')}
                        >
                            <div className="category-icon">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                                </svg>
                            </div>
                            <div className="category-info">
                                <div className="category-title">Security & Privacy</div>
                                <div className="category-description">Security settings, data privacy, and compliance</div>
                            </div>
                            <div className="category-toggle">
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 9l6 6 6-6"/>
                                </svg>
                            </div>
                        </div>
                        <div className={`category-content ${expandedCategories.includes('security') ? 'expanded' : ''}`}>
                            <div className="category-body">
                                <div className="settings-section">
                                    <h3 className="section-title">Security Settings</h3>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Session Timeout</label>
                                            <select className="form-select">
                                                <option>15 minutes</option>
                                                <option defaultValue>30 minutes</option>
                                                <option>1 hour</option>
                                                <option>4 hours</option>
                                                <option>Never</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Password Policy</label>
                                            <select className="form-select">
                                                <option>Basic (8+ characters)</option>
                                                <option defaultValue>Strong (Complex)</option>
                                                <option>Custom</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">IP Restriction</div>
                                            <div className="toggle-description">Limit access to specific IP addresses</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Audit Logging</div>
                                            <div className="toggle-description">Track all system activities</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                                <div className="settings-section">
                                    <h3 className="section-title">Data Privacy</h3>
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <div className="toggle-label">Data Encryption</div>
                                            <div className="toggle-description">Encrypt sensitive data at rest</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" defaultChecked />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Data Retention</label>
                                        <select className="form-select">
                                            <option>1 year</option>
                                            <option>3 years</option>
                                            <option defaultValue>5 years</option>
                                            <option>7 years</option>
                                            <option>Forever</option>
                                        </select>
                                    </div>
                                    <div className="btn-group">
                                        <button className="btn btn-outline">Export All Data</button>
                                        <button className="btn btn-outline">Request Data Deletion</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Toast */}
            {showSuccessToast && (
                <div className="success-toast show">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Settings saved successfully!
                </div>
            )}
        </div>
    );
};

export default Settings;

