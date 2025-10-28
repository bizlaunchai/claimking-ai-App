import React from 'react';

const HeroSection = () => {
    return (
        <section className="hero">
            <div className="hero-container">
                <div className="hero-content">
                    <h1>
                        Transform Your Roofing Business with{' '}
                        <span className="hero-highlight">AI-Powered Claims Management</span>
                    </h1>
                    <p className="hero-subtitle">
                        Automate estimates, supplements, and client communications. Save 20+ hours per week while
                        increasing claim approvals by 34%.
                    </p>

                    <div className="hero-stats">
                        <div className="hero-stat">
                            <div className="hero-stat-value">87%</div>
                            <div className="hero-stat-label">Time Saved on Estimates</div>
                        </div>
                        <div className="hero-stat">
                            <div className="hero-stat-value">$47K</div>
                            <div className="hero-stat-label">Avg Additional Revenue/Month</div>
                        </div>
                        <div className="hero-stat">
                            <div className="hero-stat-value">3.2x</div>
                            <div className="hero-stat-label">Faster Claim Processing</div>
                        </div>
                    </div>

                    <div className="hero-cta">
                        <button
                            className="btn btn-primary"
                            style={{ padding: '1rem 2rem', fontSize: '1rem' }}
                        >
                            🚀 Start 14-Day Free Trial
                        </button>
                        <button
                            className="btn btn-secondary"
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                color: 'white',
                                borderColor: 'rgba(255,255,255,0.3)',
                            }}
                        >
                            📅 Schedule Demo
                        </button>
                    </div>
                </div>

                <div className="hero-demo">
                    <div className="demo-badge">LIVE DEMO</div>
                    <div
                        style={{
                            background: '#f9fafb',
                            padding: '2rem',
                            borderRadius: '8px',
                        }}
                    >
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <div
                                style={{
                                    background: 'linear-gradient(135deg, #FDB813, #d4a000)',
                                    color: '#1a1f3a',
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    flex: 1,
                                    textAlign: 'center',
                                }}
                            >
                                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>152</div>
                                <div style={{ fontSize: '0.75rem' }}>Active Claims</div>
                            </div>
                            <div
                                style={{
                                    background: 'white',
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    flex: 1,
                                    textAlign: 'center',
                                    border: '1px solid #e5e7eb',
                                }}
                            >
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>
                                    $2.8M
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Pipeline Value</div>
                            </div>
                        </div>
                        <div
                            style={{
                                background: 'white',
                                padding: '1rem',
                                borderRadius: '8px',
                                border: '1px solid #e5e7eb',
                            }}
                        >
                            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                                Latest AI Activity
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a' }}>
                <span
                    style={{
                        width: '8px',
                        height: '8px',
                        background: '#16a34a',
                        borderRadius: '50%',
                        display: 'inline-block',
                    }}
                />
                                Supplement approved: +$18,450
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HeroSection;
