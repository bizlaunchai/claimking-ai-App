import React from 'react';

const Pricing = () => {
    return (
        <section className="pricing" id="pricing">
            <div className="pricing-container">
                <div className="section-header">
                    <h2 className="section-title">Simple, Transparent Pricing</h2>
                    <p className="section-subtitle">
                        No hidden fees. No per-claim charges. Unlimited users on all plans.
                    </p>
                </div>

                <div className="pricing-grid">
                    {/* Basic Plan */}
                    <div className="pricing-card">
                        <div className="pricing-header">
                            <h3 className="pricing-name">Basic</h3>
                            <div className="pricing-price">
                                $185<span>/month</span>
                            </div>
                            <p className="pricing-description">Perfect for small roofing contractors</p>
                        </div>
                        <div className="pricing-features">
                            {[
                                '50 AI Credits/month',
                                'AI Material Estimation',
                                '3D Property Mockups',
                                'Policy Analyzer',
                                'Client Portal',
                                'Storm Tracking',
                                'Basic Support',
                            ].map((feature, index) => (
                                <div key={index} className="pricing-feature">
                                    <svg viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                                    </svg>
                                    <span>{feature.includes('AI Credits') ? <strong>{feature}</strong> : feature}</span>
                                </div>
                            ))}
                        </div>
                        <button className="pricing-cta btn-secondary">Start Free Trial</button>
                    </div>

                    {/* Pro Plan */}
                    <div className="pricing-card featured">
                        <div className="pricing-badge">Most Popular</div>
                        <div className="pricing-header">
                            <h3 className="pricing-name">Pro</h3>
                            <div className="pricing-price">
                                $350<span>/month</span>
                            </div>
                            <p className="pricing-description">For growing roofing companies</p>
                        </div>
                        <div className="pricing-features">
                            {[
                                '200 AI Credits/month',
                                'Everything in Basic, plus:',
                                'AI Supplement Generator',
                                'AI Email Responder',
                                'CRM Integration',
                                'Advanced Analytics',
                                'Priority Support',
                                'Document Generator',
                            ].map((feature, index) => (
                                <div key={index} className="pricing-feature">
                                    <svg viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                                    </svg>
                                    <span>{feature.includes('AI Credits') || feature.includes('Everything') ? <strong>{feature}</strong> : feature}</span>
                                </div>
                            ))}
                        </div>
                        <button className="pricing-cta">Start Free Trial</button>
                    </div>

                    {/* Ultimate Plan */}
                    <div className="pricing-card">
                        <div className="pricing-header">
                            <h3 className="pricing-name">Ultimate</h3>
                            <div className="pricing-price">
                                $599<span>/month</span>
                            </div>
                            <p className="pricing-description">For large operations & adjusters</p>
                        </div>
                        <div className="pricing-features">
                            {[
                                'Unlimited AI Credits',
                                'Everything in Pro, plus:',
                                'AI Call Center (24/7)',
                                'White-label Options',
                                'API Access',
                                'Custom Integrations',
                                'Dedicated Success Manager',
                                'Training & Onboarding',
                            ].map((feature, index) => (
                                <div key={index} className="pricing-feature">
                                    <svg viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                                    </svg>
                                    <span>{feature.includes('AI Credits') || feature.includes('Everything') ? <strong>{feature}</strong> : feature}</span>
                                </div>
                            ))}
                        </div>
                        <button className="pricing-cta btn-secondary">Contact Sales</button>
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                        🎯 All plans include: Unlimited users • Free updates • Mobile app • Data export
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                        * AI Credits: 1 credit = 1 estimation, mockup, supplement, or AI generation
                    </p>
                </div>
            </div>
        </section>
    );
};

export default Pricing;
