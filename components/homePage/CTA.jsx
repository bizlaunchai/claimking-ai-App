import React from 'react';

const Cta = () => {
    return (
        <section className="cta">
            <div className="cta-container">
                <h2 className="cta-title">Ready to 10x Your Roofing Business?</h2>
                <p className="cta-subtitle">
                    Join 500+ contractors who are closing more claims, faster, with AI-powered automation
                </p>

                <div className="cta-buttons">
                    <button
                        className="btn btn-primary"
                        style={{ padding: '1rem 2rem', fontSize: '1rem' }}
                    >
                        Start Your 14-Day Free Trial
                    </button>
                    <button
                        className="btn btn-secondary"
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            color: 'white',
                            borderColor: 'rgba(255,255,255,0.3)',
                        }}
                    >
                        Watch 5-Minute Demo
                    </button>
                </div>

                <p
                    style={{
                        marginTop: '1.5rem',
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '0.875rem',
                    }}
                >
                    No credit card required • Setup in 5 minutes • Cancel anytime
                </p>
            </div>
        </section>
    );
};

export default Cta;
