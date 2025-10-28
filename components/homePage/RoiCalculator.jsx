'use client';
import React, { useState } from 'react';

const RoiCalculator = () => {
    const [claims, setClaims] = useState(50);
    const [claimValue, setClaimValue] = useState(35000);
    const [teamSize, setTeamSize] = useState(5);

    // Example ROI calculations (you can adjust formulas)
    const timeSaved = claims * 2; // hours
    const additionalRevenue = claims * (claimValue * 0.05); // 5% supplement
    const laborSavings = teamSize * 168; // example: $168 per person saved
    const monthlyROI = ((additionalRevenue + laborSavings) / (teamSize * 1000)) * 100; // %

    return (
        <section className="roi-section" id="roi">
            <div className="roi-container">
                <div className="roi-calculator">
                    <h3 className="calculator-title">Calculate Your ROI</h3>

                    <div className="calculator-input">
                        <label className="calculator-label">Monthly Claims Processed</label>
                        <input
                            type="range"
                            className="calculator-slider"
                            min="10"
                            max="200"
                            value={claims}
                            onChange={(e) => setClaims(Number(e.target.value))}
                        />
                        <div className="calculator-value">{claims} claims</div>
                    </div>

                    <div className="calculator-input">
                        <label className="calculator-label">Average Claim Value</label>
                        <input
                            type="range"
                            className="calculator-slider"
                            min="10000"
                            max="100000"
                            step="5000"
                            value={claimValue}
                            onChange={(e) => setClaimValue(Number(e.target.value))}
                        />
                        <div className="calculator-value">${claimValue.toLocaleString()}</div>
                    </div>

                    <div className="calculator-input">
                        <label className="calculator-label">Current Team Size</label>
                        <input
                            type="range"
                            className="calculator-slider"
                            min="1"
                            max="20"
                            value={teamSize}
                            onChange={(e) => setTeamSize(Number(e.target.value))}
                        />
                        <div className="calculator-value">{teamSize} people</div>
                    </div>

                    <div className="calculator-results">
                        <div className="result-item">
                            <span className="result-label">Time Saved Monthly</span>
                            <span className="result-value">{timeSaved} hours</span>
                        </div>
                        <div className="result-item">
                            <span className="result-label">Additional Revenue (Supplements)</span>
                            <span className="result-value">${additionalRevenue.toLocaleString()}</span>
                        </div>
                        <div className="result-item">
                            <span className="result-label">Labor Cost Savings</span>
                            <span className="result-value">${laborSavings.toLocaleString()}</span>
                        </div>
                        <div className="result-item">
                            <span className="result-label">Monthly ROI</span>
                            <span className="result-value" style={{ color: '#FDB813', fontSize: '1.5rem' }}>
                {monthlyROI.toFixed(0)}%
              </span>
                        </div>
                    </div>
                </div>

                <div className="roi-content">
                    <h2 className="section-title">
                        See Real Results in <span className="hero-highlight">30 Days</span>
                    </h2>
                    <p style={{ fontSize: '1.125rem', color: '#6b7280', margin: '1.5rem 0', lineHeight: 1.8 }}>
                        Our customers report an average ROI of {monthlyROI.toFixed(0)}% within the first month. Here's what ClaimKing.AI
                        replaces:
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', margin: '2rem 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                            <span>Xactimate License</span>
                            <span style={{ color: '#dc2626', fontWeight: 600 }}>-$400/month</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                            <span>Supplement Service</span>
                            <span style={{ color: '#dc2626', fontWeight: 600 }}>-$500/month</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                            <span>Call Answering Service</span>
                            <span style={{ color: '#dc2626', fontWeight: 600 }}>-$800/month</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                            <span>CRM Software</span>
                            <span style={{ color: '#dc2626', fontWeight: 600 }}>-$300/month</span>
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '1rem',
                                background: 'linear-gradient(135deg, rgba(253, 184, 19, 0.1), rgba(253, 184, 19, 0.2))',
                                borderRadius: '8px',
                                border: '2px solid #FDB813',
                            }}
                        >
                            <span style={{ fontWeight: 700, color: '#1a1f3a' }}>ClaimKing.AI (All Features)</span>
                            <span style={{ color: '#16a34a', fontWeight: 700 }}>From $185/month</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default RoiCalculator;
