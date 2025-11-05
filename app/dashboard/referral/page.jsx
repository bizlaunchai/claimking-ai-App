'use client'
import React, { useState } from 'react';
import "./referral.css"

const Referral = () => {
    const [copied, setCopied] = useState(false);
    const [showQR, setShowQR] = useState(false);

    const referralLink = 'claimking.ai/ref/JOHN123';

    const earningsData = [
        { label: 'Total Earnings', value: '$12,450', change: '↑ Lifetime earnings', positive: true },
        { label: 'This Month', value: '$1,840', change: '↑ 23% vs last month', positive: true },
        { label: 'Pending', value: '$620', change: 'Pays out Nov 1st', positive: false },
        { label: 'Active Referrals', value: '18', change: '↑ 3 this month', positive: true }
    ];

    const monthlyEarnings = [
        { month: 'May', value: 980, height: 53 },
        { month: 'Jun', value: 1200, height: 65 },
        { month: 'Jul', value: 1450, height: 78 },
        { month: 'Aug', value: 1100, height: 59 },
        { month: 'Sep', value: 1500, height: 81 },
        { month: 'Oct', value: 1840, height: 100 }
    ];

    const funnelData = [
        { name: 'Link Clicks', desc: 'Unique visitors to your referral link', value: 245 },
        { name: 'Sign Ups', desc: 'Created an account', value: 68 },
        { name: 'Trial Started', desc: 'Started free trial', value: 42 },
        { name: 'Paid Customer', desc: 'Converted to paid plan', value: 18 }
    ];

    const tiers = [
        { icon: '🥉', name: 'Bronze', requirement: '0-5 referrals', commission: '5%', current: false },
        { icon: '🥈', name: 'Silver', requirement: '6-15 referrals', commission: '10%', current: true },
        { icon: '🥇', name: 'Gold', requirement: '16-30 referrals', commission: '15%', current: false },
        { icon: '💎', name: 'Platinum', requirement: '31+ referrals', commission: '20%', current: false }
    ];

    const referrals = [
        { name: 'ABC Roofing Co.', email: 'john@abcroofing.com', date: 'Oct 15, 2024', status: 'active', plan: 'Professional', commission: '$60/mo' },
        { name: 'XYZ Contractors', email: 'mike@xyzcontract.com', date: 'Oct 12, 2024', status: 'trial', plan: 'Enterprise', commission: 'Pending' },
        { name: 'Premier Exteriors', email: 'sarah@premier.com', date: 'Sep 28, 2024', status: 'active', plan: 'Professional', commission: '$60/mo' },
        { name: 'Storm Guard LLC', email: 'dave@stormguard.com', date: 'Sep 15, 2024', status: 'churned', plan: 'Starter', commission: '$0/mo' },
        { name: 'Quality Roofing', email: 'lisa@quality.com', date: 'Aug 10, 2024', status: 'active', plan: 'Enterprise', commission: '$100/mo' }
    ];

    const coupons = [
        { code: 'JOHN123-SAVE30', discount: '30% OFF', desc: 'Up to 100 claim points', maxSavings: '$7,500', uses: 45, badge: 'BEST DEAL', color: '#16a34a' },
        { code: 'JOHN123-FREE5', discount: '5 FREE CREDITS', desc: 'With any purchase', value: '$750-$1,250', uses: 78, badge: 'POPULAR', color: '#d4a000' },
        { code: 'JOHN123-SAVE15', discount: '15% OFF', desc: 'Any amount of credits', limit: 'No limit on savings', uses: 32, badge: '', color: '#6b7280' }
    ];

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(referralLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    const handleShare = (platform) => {
        const url = `https://${referralLink}`;
        const text = 'Check out ClaimKing.AI - The AI-powered insurance claims platform!';
        
        let shareUrl = '';
        switch(platform) {
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
                break;
            case 'linkedin':
                shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
                break;
            case 'email':
                window.location.href = `mailto:?subject=${encodeURIComponent('Check out ClaimKing.AI')}&body=${encodeURIComponent(`${text}\n\n${url}`)}`;
                return;
        }
        
        if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400');
        }
    };

    const handleCopyCoupon = async (code) => {
        try {
            await navigator.clipboard.writeText(code);
            alert(`✓ "${code}" copied!`);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    const getStatusBadgeClass = (status) => {
        switch(status) {
            case 'active': return 'status-active';
            case 'trial': return 'status-trial';
            case 'churned': return 'status-churned';
            default: return '';
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="referral-header">
                <div className="referral-header-left">
                    <div className="crown-logo">
                        <svg viewBox="0 0 24 24" fill="#1a1f3a">
                            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2.86-2h8.28l.5-2.02l-2.87-1.73L12 13l-1.77-2.75l-2.87 1.73L7.86 14z"/>
                        </svg>
                    </div>
                    <h1>Referral Program</h1>
                </div>
                <div className="referral-header-actions">
                    <button className="btn btn-secondary">View Payouts</button>
                    <button className="btn btn-primary">+ Invite Friends</button>
                </div>
            </div>

            <div className="container">
                {/* Earnings Overview */}
                <div className="earnings-grid">
                    {earningsData.map((earning, index) => (
                        <div key={index} className="earnings-card">
                            <div className="earnings-label">{earning.label}</div>
                            <div className="earnings-value">{earning.value}</div>
                            <div className={`earnings-change ${earning.positive ? 'positive' : ''}`}>
                                {earning.change}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Referral Link Section */}
                <div className="referral-link-section">
                    <h2 className="referral-link-title">🎯 Your Referral Link</h2>
                    <div className="referral-link-container">
                        <input 
                            type="text" 
                            className="referral-link-input" 
                            value={referralLink} 
                            readOnly 
                        />
                        <button 
                            className={`copy-btn ${copied ? 'copied' : ''}`}
                            onClick={handleCopyLink}
                        >
                            {copied ? '✓ Copied!' : 'Copy Link'}
                        </button>
                    </div>
                    <div className="share-buttons">
                        <button className="share-btn" onClick={() => handleShare('facebook')}>
                            📘 Facebook
                        </button>
                        <button className="share-btn" onClick={() => handleShare('twitter')}>
                            🐦 Twitter
                        </button>
                        <button className="share-btn" onClick={() => handleShare('linkedin')}>
                            💼 LinkedIn
                        </button>
                        <button className="share-btn" onClick={() => handleShare('email')}>
                            📧 Email
                        </button>
                        <button className="share-btn" onClick={() => setShowQR(true)}>
                            📱 QR Code
                        </button>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="charts-grid">
                    {/* Monthly Earnings Chart */}
                    <div className="chart-card">
                        <div className="chart-header">
                            <h3 className="chart-title">Monthly Earnings</h3>
                            <span className="chart-subtitle">Last 6 months</span>
                        </div>
                        <div className="bar-chart">
                            {monthlyEarnings.map((item, index) => (
                                <div key={index} className="bar-column">
                                    <span className="bar-value">${item.value.toLocaleString()}</span>
                                    <div 
                                        className="bar" 
                                        style={{ height: `${item.height}%` }}
                                    ></div>
                                    <span className="bar-label">{item.month}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Referral Status Chart */}
                    <div className="chart-card">
                        <div className="chart-header">
                            <h3 className="chart-title">Referral Status</h3>
                            <span className="chart-subtitle">Active vs Inactive</span>
                        </div>
                        <div className="pie-chart-container">
                            <div className="pie-chart">
                                <div className="pie-center">
                                    <div className="pie-percentage">72%</div>
                                    <div className="pie-label">Active</div>
                                </div>
                            </div>
                            <div className="legend">
                                <div className="legend-item">
                                    <div className="legend-color" style={{ background: '#FDB813' }}></div>
                                    <span className="legend-label">Active</span>
                                    <span className="legend-value">18</span>
                                </div>
                                <div className="legend-item">
                                    <div className="legend-color" style={{ background: '#e5e7eb' }}></div>
                                    <span className="legend-label">Inactive</span>
                                    <span className="legend-value">7</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Conversion Funnel */}
                <div className="chart-card" style={{ marginBottom: '2rem' }}>
                    <div className="chart-header">
                        <h3 className="chart-title">Referral Conversion Funnel</h3>
                        <span className="chart-subtitle">Last 30 days</span>
                    </div>
                    <div className="funnel-chart">
                        {funnelData.map((stage, index) => (
                            <div key={index} className="funnel-stage">
                                <div className="funnel-stage-info">
                                    <div className="funnel-stage-name">{stage.name}</div>
                                    <div className="funnel-stage-desc">{stage.desc}</div>
                                </div>
                                <div className="funnel-stage-value">{stage.value}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Referral Tiers */}
                <div className="tiers-section">
                    <h3 className="chart-title">Commission Tiers</h3>
                    <div className="tiers-grid">
                        {tiers.map((tier, index) => (
                            <div key={index} className={`tier-card ${tier.current ? 'current' : ''}`}>
                                <div className="tier-icon">{tier.icon}</div>
                                <div className="tier-name">{tier.name}</div>
                                <div className="tier-requirement">{tier.requirement}</div>
                                <div className="tier-commission">{tier.commission}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Commission Structure */}
                <div className="commission-structure-section">
                    <h3 className="chart-title" style={{ marginBottom: '1rem' }}>💰 How Commissions Work</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                        <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💵</div>
                            <div style={{ fontWeight: 600, color: '#1a1f3a', marginBottom: '0.5rem' }}>Base Plan Bonus</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>$150</div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>When referral uses base plan for 3 months</div>
                        </div>
                        <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💎</div>
                            <div style={{ fontWeight: 600, color: '#1a1f3a', marginBottom: '0.5rem' }}>Upgraded Plan Bonus</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>$300</div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>When referral uses pro/enterprise for 3 months</div>
                        </div>
                        <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔄</div>
                            <div style={{ fontWeight: 600, color: '#1a1f3a', marginBottom: '0.5rem' }}>Recurring Commission</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>5-20%</div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>On all claim points purchased</div>
                        </div>
                    </div>
                </div>

                {/* Coupon Codes */}
                <div className="coupon-section">
                    <h3 className="chart-title">Your Referral Coupon Codes</h3>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                        Share these codes with potential customers - each code can be used once per customer
                    </p>
                    <div className="coupon-grid">
                        {coupons.map((coupon, index) => (
                            <div 
                                key={index} 
                                className="coupon-card"
                                style={{ 
                                    borderColor: coupon.color,
                                    borderStyle: coupon.badge ? 'solid' : 'dashed',
                                    padding: '1.5rem 1rem'
                                }}
                            >
                                {coupon.badge && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '-10px',
                                        right: '1rem',
                                        background: coupon.color,
                                        color: coupon.color === '#16a34a' ? 'white' : '#1a1f3a',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '4px',
                                        fontSize: '0.625rem',
                                        fontWeight: 600
                                    }}>
                                        {coupon.badge}
                                    </div>
                                )}
                                <div className="coupon-code" style={{ color: coupon.color, fontSize: '0.9rem', marginTop: coupon.badge ? '0.5rem' : '0' }}>
                                    {coupon.code}
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1f3a', margin: '0.5rem 0' }}>
                                    {coupon.discount}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{coupon.desc}</div>
                                {coupon.maxSavings && (
                                    <div style={{ fontSize: '0.625rem', color: coupon.color, marginTop: '0.5rem' }}>
                                        Max savings: {coupon.maxSavings}
                                    </div>
                                )}
                                {coupon.value && (
                                    <div style={{ fontSize: '0.625rem', color: coupon.color, marginTop: '0.5rem' }}>
                                        Value: {coupon.value}
                                    </div>
                                )}
                                {coupon.limit && (
                                    <div style={{ fontSize: '0.625rem', color: '#6b7280', marginTop: '0.5rem' }}>
                                        {coupon.limit}
                                    </div>
                                )}
                                <div className="coupon-uses" style={{ marginTop: '0.5rem' }}>
                                    Used {coupon.uses} times
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                                    <button 
                                        onClick={() => handleCopyCoupon(coupon.code)}
                                        style={{ 
                                            flex: 1, 
                                            padding: '0.375rem', 
                                            background: 'white', 
                                            border: '1px solid #e5e7eb', 
                                            borderRadius: '4px', 
                                            fontSize: '0.75rem', 
                                            cursor: 'pointer' 
                                        }}
                                    >
                                        📋 Copy
                                    </button>
                                    <button 
                                        style={{ 
                                            flex: 1, 
                                            padding: '0.375rem', 
                                            background: coupon.color, 
                                            color: coupon.color === '#16a34a' ? 'white' : '#1a1f3a', 
                                            border: 'none', 
                                            borderRadius: '4px', 
                                            fontSize: '0.75rem', 
                                            cursor: 'pointer' 
                                        }}
                                    >
                                        📢 Share
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Referrals Table */}
                <table className="referrals-table">
                    <thead>
                        <tr>
                            <th>Referral</th>
                            <th>Sign Up Date</th>
                            <th>Status</th>
                            <th>Plan</th>
                            <th>Monthly Commission</th>
                        </tr>
                    </thead>
                    <tbody>
                        {referrals.map((referral, index) => (
                            <tr key={index}>
                                <td>
                                    <div className="referral-name">{referral.name}</div>
                                    <div className="referral-email">{referral.email}</div>
                                </td>
                                <td>{referral.date}</td>
                                <td>
                                    <span className={`status-badge ${getStatusBadgeClass(referral.status)}`}>
                                        {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
                                    </span>
                                </td>
                                <td>{referral.plan}</td>
                                <td className="commission-amount">{referral.commission}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* QR Code Modal */}
            {showQR && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}
                    onClick={() => setShowQR(false)}
                >
                    <div 
                        style={{
                            background: 'white',
                            padding: '2rem',
                            borderRadius: '12px',
                            textAlign: 'center'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ marginBottom: '1rem' }}>QR Code for Your Referral Link</h3>
                        <div style={{
                            width: '200px',
                            height: '200px',
                            background: '#f3f4f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1rem',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px'
                        }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '3rem' }}>📱</div>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>QR Code Here</div>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                            Scan this code to visit your referral link
                        </p>
                        <button 
                            onClick={() => setShowQR(false)}
                            style={{
                                padding: '0.5rem 1.5rem',
                                background: '#FDB813',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Referral;

