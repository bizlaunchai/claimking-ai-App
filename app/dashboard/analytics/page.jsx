"use client";
import React, { useState, useEffect, useRef } from 'react';
import "./analytics.css";

const AnalyticsPage = () => {
    const [activeTab, setActiveTab] = useState('claims');
    const [dateRange, setDateRange] = useState({ label: '30 days', value: '30d' });
    const [showDateDropdown, setShowDateDropdown] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [currentTabName, setCurrentTabName] = useState('Claims & Revenue');
    const dateDropdownRef = useRef(null);
    const mobileMenuRef = useRef(null);

    const dateOptions = [
        { label: 'Today', value: '1d' },
        { label: '7 days', value: '7d' },
        { label: '30 days', value: '30d' },
        { label: '90 days', value: '90d' },
        { label: 'Custom Range', value: 'Custom' }
    ];

    const tabs = [
        { id: 'claims', name: 'Claims & Revenue' },
        { id: 'sales', name: 'Sales & Leads' },
        { id: 'customers', name: 'Customers & Reviews' },
        { id: 'marketing', name: 'Marketing & Social' },
        { id: 'operations', name: 'Operations' },
        { id: 'predictive', name: 'Predictive' }
    ];

    const switchTab = (tabId) => {
        setActiveTab(tabId);
        const tab = tabs.find(t => t.id === tabId);
        if (tab) setCurrentTabName(tab.name);
    };

    const selectDateRange = (range) => {
        setDateRange(range);
        setShowDateDropdown(false);
    };

    const exportAnalytics = () => {
        const exportOptions = confirm(
            'Export Analytics Report\n\n' +
            'Choose format:\n' +
            'OK = PDF (recommended)\n' +
            'Cancel = Excel/CSV'
        );
        
        if (exportOptions) {
            alert('Generating PDF report...\nYour analytics report will download shortly.');
        } else {
            alert('Generating Excel report...\nYour analytics data will download shortly.');
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target)) {
                setShowDateDropdown(false);
            }
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
                setShowMobileMenu(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        const progressBars = document.querySelectorAll('.progress-fill');
        progressBars.forEach(bar => {
            const width = bar.style.width;
            bar.style.width = '0';
            setTimeout(() => {
                bar.style.width = width;
            }, 100);
        });
    }, [activeTab]);

    return (
        <div>
            {/* Header */}
            <div className="header">
                <div className="header-left">
                    <div className="crown-logo">
                        <svg viewBox="0 0 24 24" fill="#1a1f3a">
                            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2.86-2h8.28l.5-2.02l-2.87-1.73L12 13l-1.77-2.75l-2.87 1.73L7.86 14z"/>
                        </svg>
                    </div>
                    <h1>Analytics</h1>
                </div>
                <div className="header-controls">
                    <div className="date-range-selector" ref={dateDropdownRef}>
                        <button 
                            className={`date-dropdown-btn ${showDateDropdown ? 'active' : ''}`}
                            onClick={() => setShowDateDropdown(!showDateDropdown)}
                        >
                            <span className="date-label">Date:</span>
                            <span className="date-text">{dateRange.value}</span>
                            <span className="dropdown-arrow">▼</span>
                        </button>
                        <div className={`date-dropdown-menu ${showDateDropdown ? 'show' : ''}`}>
                            {dateOptions.map((option) => (
                                <div 
                                    key={option.value}
                                    className={`date-option ${dateRange.value === option.value ? 'active' : ''}`}
                                    onClick={() => selectDateRange(option)}
                                >
                                    {option.label}
                                </div>
                            ))}
                        </div>
                    </div>
                    <button className="export-btn" onClick={exportAnalytics} title="Export Analytics">
                        Export
                    </button>
                    <div className="live-indicator">
                        <span className="live-dot"></span>
                        <span>Live</span>
                    </div>
                </div>
            </div>

            <div className="container">
                {/* KPI Cards */}
                <div className="kpi-grid">
                    <div className="kpi-card">
                        <div className="kpi-label">Total Revenue</div>
                        <div className="kpi-value">$487,290</div>
                        <div className="kpi-change positive">↑ 12% vs last month</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Active Claims</div>
                        <div className="kpi-value">47</div>
                        <div className="kpi-change positive">↑ 8 this week</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Close Rate</div>
                        <div className="kpi-value">68%</div>
                        <div className="kpi-change positive">↑ 5% improved</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Avg Claim Value</div>
                        <div className="kpi-value">$10,350</div>
                        <div className="kpi-change positive">↑ $1,200</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Lead Response</div>
                        <div className="kpi-value">12 min</div>
                        <div className="kpi-change positive">↓ 3 min faster</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Customer Score</div>
                        <div className="kpi-value">4.8 <span className="stars">★</span></div>
                        <div className="kpi-change positive">127 reviews</div>
                    </div>
                </div>

                {/* Analytics Tabs */}
                <div className="analytics-container">
                    {/* Mobile Tab Header */}
                    <div className="mobile-tab-header" ref={mobileMenuRef}>
                        <div className="mobile-tab-control">
                            <div className="current-tab-name">{currentTabName}</div>
                            <button 
                                className={`tab-menu-btn ${showMobileMenu ? 'open' : ''}`}
                                onClick={() => setShowMobileMenu(!showMobileMenu)}
                            >
                                <div className="hamburger">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </button>
                        </div>
                        <div className={`mobile-tab-menu ${showMobileMenu ? 'show' : ''}`}>
                            {tabs.map((tab) => (
                                <div 
                                    key={tab.id}
                                    className={`mobile-tab-option ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => {
                                        switchTab(tab.id);
                                        setShowMobileMenu(false);
                                    }}
                                >
                                    {tab.name}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Desktop Tab Navigation */}
                    <div className="tab-nav">
                        {tabs.map((tab) => (
                            <button 
                                key={tab.id}
                                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => switchTab(tab.id)}
                            >
                                {tab.name}
                            </button>
                        ))}
                    </div>

                    {/* Claims & Revenue Tab */}
                    {activeTab === 'claims' && (
                        <div className="tab-content active">
                            <div className="chart-container">
                                <div className="chart-header">
                                    <div>
                                        <div className="chart-title">Revenue Trends</div>
                                        <div className="chart-subtitle">Monthly revenue over 12 months</div>
                                    </div>
                                </div>
                                <div className="revenue-chart">
                                    <div className="chart-bars">
                                        {[
                                            { month: 'Jan', height: 60 },
                                            { month: 'Feb', height: 65 },
                                            { month: 'Mar', height: 70 },
                                            { month: 'Apr', height: 75 },
                                            { month: 'May', height: 72 },
                                            { month: 'Jun', height: 80 },
                                            { month: 'Jul', height: 85 },
                                            { month: 'Aug', height: 82 },
                                            { month: 'Sep', height: 88 },
                                            { month: 'Oct', height: 90 },
                                            { month: 'Nov', height: 78 },
                                            { month: 'Dec', height: 75 }
                                        ].map((item) => (
                                            <div key={item.month} className="chart-bar" style={{height: `${item.height}%`}}>
                                                <span className="chart-bar-label">{item.month}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="chart-container">
                                <div className="chart-title">Claims Pipeline Funnel</div>
                                <div className="funnel-container">
                                    {[
                                        { label: 'New Leads:', value: 234, width: 100 },
                                        { label: 'Inspected:', value: 189, width: 80 },
                                        { label: 'Estimated:', value: 156, width: 67 },
                                        { label: 'Approved:', value: 134, width: 57 },
                                        { label: 'Completed:', value: 98, width: 42 },
                                        { label: 'Paid:', value: 87, width: 37 }
                                    ].map((stage) => (
                                        <div key={stage.label} className="funnel-stage">
                                            <span className="funnel-label">{stage.label}</span>
                                            <div className="funnel-bar" style={{width: `${stage.width}%`}}>
                                                <span className="funnel-value">{stage.value}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="metrics-grid">
                                <div className="metric-box">
                                    <div className="metric-box-header">Top Insurance Companies</div>
                                    {[
                                        { name: 'State Farm', value: '82% approval' },
                                        { name: 'Allstate', value: '78% approval' },
                                        { name: 'Progressive', value: '71% approval' }
                                    ].map((item) => (
                                        <div key={item.name} className="metric-item">
                                            <span className="metric-name">{item.name}</span>
                                            <span className="metric-value">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="metric-box">
                                    <div className="metric-box-header">Top ZIP Codes</div>
                                    {[
                                        { name: '75001', value: '$124,500' },
                                        { name: '75023', value: '$98,300' },
                                        { name: '75034', value: '$87,200' }
                                    ].map((item) => (
                                        <div key={item.name} className="metric-item">
                                            <span className="metric-name">{item.name}</span>
                                            <span className="metric-value">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="metric-box">
                                    <div className="metric-box-header">Claim Types</div>
                                    {[
                                        { name: 'Wind/Hail', value: '42%' },
                                        { name: 'Water Damage', value: '28%' },
                                        { name: 'Storm', value: '30%' }
                                    ].map((item) => (
                                        <div key={item.name} className="metric-item">
                                            <span className="metric-name">{item.name}</span>
                                            <span className="metric-value">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sales & Leads Tab */}
                    {activeTab === 'sales' && (
                        <div className="tab-content active">
                            <div className="chart-container">
                                <div className="chart-title">Lead Sources Breakdown</div>
                                <div style={{display: 'flex', justifyContent: 'space-around', alignItems: 'center'}}>
                                    <div className="donut-chart">
                                        <svg width="200" height="200">
                                            <circle cx="100" cy="100" r="80" fill="none" stroke="#e5e7eb" strokeWidth="30"/>
                                            <circle cx="100" cy="100" r="80" fill="none" stroke="#FDB813" strokeWidth="30" 
                                                    strokeDasharray="100 400" strokeDashoffset="0"/>
                                            <circle cx="100" cy="100" r="80" fill="none" stroke="#fde68a" strokeWidth="30" 
                                                    strokeDasharray="84 400" strokeDashoffset="-100"/>
                                            <circle cx="100" cy="100" r="80" fill="none" stroke="#fef3c7" strokeWidth="30" 
                                                    strokeDasharray="66 400" strokeDashoffset="-184"/>
                                        </svg>
                                        <div className="donut-center">
                                            <div className="donut-value">234</div>
                                            <div className="donut-label">Total Leads</div>
                                        </div>
                                    </div>
                                    <div>
                                        {[
                                            { name: '📧 Email AI:', value: '34% (79 leads)' },
                                            { name: '⛈️ Storm Tracking:', value: '28% (66 leads)' },
                                            { name: '👥 Referrals:', value: '22% (51 leads)' },
                                            { name: '🌐 Website:', value: '10% (23 leads)' },
                                            { name: '📱 Social Media:', value: '6% (15 leads)' }
                                        ].map((item) => (
                                            <div key={item.name} className="metric-item">
                                                <span className="metric-name">{item.name}</span>
                                                <span className="metric-value">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="chart-container">
                                <div className="chart-title">Sales Team Leaderboard</div>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Rep Name</th>
                                            <th>Leads</th>
                                            <th>Closed</th>
                                            <th>Value</th>
                                            <th>Conversion</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { name: 'John D.', leads: 45, closed: 31, value: '$320K', conversion: '69%' },
                                            { name: 'Sarah M.', leads: 42, closed: 27, value: '$280K', conversion: '64%' },
                                            { name: 'Mike R.', leads: 38, closed: 24, value: '$248K', conversion: '63%' }
                                        ].map((rep) => (
                                            <tr key={rep.name}>
                                                <td><strong>{rep.name}</strong></td>
                                                <td>{rep.leads}</td>
                                                <td>{rep.closed}</td>
                                                <td>{rep.value}</td>
                                                <td><span className="kpi-change positive">{rep.conversion}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="metrics-grid">
                                <div className="metric-box">
                                    <div className="metric-box-header">Conversion Metrics</div>
                                    {[
                                        { name: 'Lead to Inspection', value: '78%' },
                                        { name: 'Inspection to Estimate', value: '82%' },
                                        { name: 'Estimate to Approval', value: '71%' },
                                        { name: 'Overall Conversion', value: '42%', special: true }
                                    ].map((item) => (
                                        <div key={item.name} className="metric-item">
                                            <span className="metric-name">{item.name}</span>
                                            <span className="metric-value" style={item.special ? {color: '#16a34a', fontSize: '1rem'} : {}}>
                                                {item.value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="metric-box">
                                    <div className="metric-box-header">Response Performance</div>
                                    {[
                                        { name: 'Average Response', value: '12 min' },
                                        { name: 'Fastest Response', value: '2 min' },
                                        { name: 'Missed Leads Today', value: '3' },
                                        { name: 'After-hours Leads', value: '18 this week' }
                                    ].map((item) => (
                                        <div key={item.name} className="metric-item">
                                            <span className="metric-name">{item.name}</span>
                                            <span className="metric-value">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Customers & Reviews Tab */}
                    {activeTab === 'customers' && (
                        <div className="tab-content active">
                            <div className="chart-container">
                                <div className="chart-title">Review Platforms Performance</div>
                                <div style={{padding: '1rem 0'}}>
                                    {[
                                        { platform: 'Google', rating: '4.9', stars: '★★★★★', reviews: 89, width: 89 },
                                        { platform: 'Facebook', rating: '4.7', stars: '★★★★☆', reviews: 45, width: 45 },
                                        { platform: 'BBB', rating: 'A+', stars: '', reviews: 12, width: 12 },
                                        { platform: 'Yelp', rating: '4.6', stars: '★★★★☆', reviews: 23, width: 23 }
                                    ].map((platform) => (
                                        <div key={platform.platform} style={{marginBottom: '1rem'}}>
                                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
                                                <span style={{fontWeight: 600}}>{platform.platform}</span>
                                                <span>
                                                    {platform.rating} {platform.stars && <span className="stars">{platform.stars}</span>} ({platform.reviews} reviews)
                                                </span>
                                            </div>
                                            <div className="progress-bar">
                                                <div className="progress-fill" style={{width: `${platform.width}%`}}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="metrics-grid">
                                <div className="metric-box">
                                    <div className="metric-box-header">Customer Satisfaction</div>
                                    {[
                                        { name: 'Net Promoter Score', value: '72' },
                                        { name: 'Customer Lifetime Value', value: '$24,500' },
                                        { name: 'Repeat Customer Rate', value: '34%' },
                                        { name: 'Referral Rate', value: '41%' }
                                    ].map((item) => (
                                        <div key={item.name} className="metric-item">
                                            <span className="metric-name">{item.name}</span>
                                            <span className="metric-value">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="metric-box">
                                    <div className="metric-box-header">Recent Reviews</div>
                                    {[
                                        { stars: '⭐⭐⭐⭐⭐', time: '2 hours ago' },
                                        { stars: '⭐⭐⭐⭐⭐', time: '5 hours ago' },
                                        { stars: '⭐⭐⭐⭐', time: 'Yesterday' },
                                        { stars: '⭐⭐⭐⭐⭐', time: '2 days ago' }
                                    ].map((review, idx) => (
                                        <div key={idx} className="metric-item">
                                            <span className="metric-name">{review.stars}</span>
                                            <span className="metric-value">{review.time}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Marketing & Social Tab */}
                    {activeTab === 'marketing' && (
                        <div className="tab-content active">
                            <div className="chart-container">
                                <div className="chart-title">Social Media Engagement</div>
                                <div className="social-grid">
                                    {[
                                        { platform: 'Facebook', followers: '2,341', engagement: '8.2% engagement', leads: '12 leads/month' },
                                        { platform: 'Instagram', followers: '1,876', engagement: '6.5% engagement', leads: '8 leads/month' },
                                        { platform: 'LinkedIn', followers: '892', engagement: '4.1% engagement', leads: '5 leads/month' },
                                        { platform: 'TikTok', followers: '3,210', engagement: '12.3% engagement', leads: '18 leads/month' }
                                    ].map((social) => (
                                        <div key={social.platform} className="social-card">
                                            <div className="social-platform">{social.platform}</div>
                                            <div className="social-followers">{social.followers}</div>
                                            <div className="social-engagement">{social.engagement}</div>
                                            <div className="social-engagement">{social.leads}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="chart-container">
                                <div className="chart-title">Campaign ROI</div>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Campaign</th>
                                            <th>Spend</th>
                                            <th>Leads</th>
                                            <th>Revenue</th>
                                            <th>ROI</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { campaign: 'Storm Alert SMS', spend: '$500', leads: 34, revenue: '$45,000', roi: '9000%' },
                                            { campaign: 'Google Ads', spend: '$2,000', leads: 28, revenue: '$31,000', roi: '1550%' },
                                            { campaign: 'Facebook Ads', spend: '$1,500', leads: 19, revenue: '$18,000', roi: '1200%' }
                                        ].map((campaign) => (
                                            <tr key={campaign.campaign}>
                                                <td><strong>{campaign.campaign}</strong></td>
                                                <td>{campaign.spend}</td>
                                                <td>{campaign.leads}</td>
                                                <td>{campaign.revenue}</td>
                                                <td><span className="kpi-change positive">{campaign.roi}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Operations Tab */}
                    {activeTab === 'operations' && (
                        <div className="tab-content active">
                            <div className="metrics-grid">
                                <div className="metric-box">
                                    <div className="metric-box-header">Team Productivity</div>
                                    {[
                                        { name: 'Jobs/Day', value: '8.4' },
                                        { name: 'Avg Job Duration', value: '4.2 hours' },
                                        { name: 'Drive Time Efficiency', value: '87%' },
                                        { name: 'Materials Waste', value: '3.2%' }
                                    ].map((item) => (
                                        <div key={item.name} className="metric-item">
                                            <span className="metric-name">{item.name}</span>
                                            <span className="metric-value">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="metric-box">
                                    <div className="metric-box-header">Email AI Performance</div>
                                    {[
                                        { name: 'Emails Scanned', value: '12,847' },
                                        { name: 'Claims Detected', value: '1,283' },
                                        { name: 'Accuracy Rate', value: '94%' },
                                        { name: 'Time Saved', value: '127 hrs/mo' }
                                    ].map((item) => (
                                        <div key={item.name} className="metric-item">
                                            <span className="metric-name">{item.name}</span>
                                            <span className="metric-value">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="metric-box">
                                    <div className="metric-box-header">Response Times</div>
                                    {[
                                        { name: 'First Contact', value: '12 min' },
                                        { name: 'Quote Delivery', value: '2.4 hours' },
                                        { name: 'Same Day Inspection', value: '89%' },
                                        { name: 'Job Start', value: '3.2 days' }
                                    ].map((item) => (
                                        <div key={item.name} className="metric-item">
                                            <span className="metric-name">{item.name}</span>
                                            <span className="metric-value">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="chart-container">
                                <div className="chart-title">Cost Analysis</div>
                                <div style={{display: 'flex', justifyContent: 'space-around', padding: '2rem 0'}}>
                                    {[
                                        { value: '32%', label: 'Labor Costs' },
                                        { value: '41%', label: 'Material Costs' },
                                        { value: '18%', label: 'Overhead' },
                                        { value: '28%', label: 'Profit Margin', color: '#16a34a' }
                                    ].map((item) => (
                                        <div key={item.label} style={{textAlign: 'center'}}>
                                            <div style={{fontSize: '2rem', fontWeight: 700, color: item.color || '#1a1f3a'}}>
                                                {item.value}
                                            </div>
                                            <div style={{fontSize: '0.875rem', color: '#6b7280'}}>{item.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Predictive Tab */}
                    {activeTab === 'predictive' && (
                        <div className="tab-content active">
                            <div className="chart-container">
                                <div className="chart-title">🔮 Weather Forecast Impact</div>
                                <div className="metrics-grid">
                                    <div className="metric-box">
                                        <div className="metric-box-header">Next 14 Days</div>
                                        {[
                                            { name: 'Storm Probability', value: '65%' },
                                            { name: 'Estimated Leads', value: '45-60' },
                                            { name: 'Revenue Projection', value: '$450K-600K' }
                                        ].map((item) => (
                                            <div key={item.name} className="metric-item">
                                                <span className="metric-name">{item.name}</span>
                                                <span className="metric-value">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="metric-box">
                                        <div className="metric-box-header">Growth Projections</div>
                                        {[
                                            { name: '3-Month Forecast', value: '$1.4M' },
                                            { name: '6-Month Pipeline', value: '$2.8M' },
                                            { name: 'Year-End Target', value: '85% complete' }
                                        ].map((item) => (
                                            <div key={item.name} className="metric-item">
                                                <span className="metric-name">{item.name}</span>
                                                <span className="metric-value">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="chart-container">
                                <div className="chart-title">Seasonal Trends</div>
                                <div style={{padding: '1rem'}}>
                                    {[
                                        { name: '🌸 Spring (Mar-May)', value: 'Highest storm activity' },
                                        { name: '☀️ Summer (Jun-Aug)', value: 'Peak season - 40% of revenue' },
                                        { name: '🍂 Fall (Sep-Nov)', value: 'Moderate activity' },
                                        { name: '❄️ Winter (Dec-Feb)', value: 'Slow period - maintenance focus' }
                                    ].map((item) => (
                                        <div key={item.name} className="metric-item">
                                            <span className="metric-name">{item.name}</span>
                                            <span className="metric-value">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* AI Insights Section */}
                <div className="insights-container">
                    <div className="insights-title">💡 AI-Generated Insights</div>
                    {[
                        { icon: '📈', text: 'Your email response time improved 25% this month - keep it up!' },
                        { icon: '🎯', text: 'State Farm approval rate is 15% higher than average - prioritize these claims' },
                        { icon: '📱', text: 'Tuesday 2-4 PM generates most social media leads - schedule posts accordingly' },
                        { icon: '👥', text: 'Consider hiring - you\'re at 95% capacity with growing demand' },
                        { icon: '🌧️', text: 'Rain forecast this weekend - expect 20+ leads, prepare crew availability' }
                    ].map((insight, idx) => (
                        <div key={idx} className="insight-item">
                            <span className="insight-icon">{insight.icon}</span>
                            <span className="insight-text">{insight.text}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPage;

