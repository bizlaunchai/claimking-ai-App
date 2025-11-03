import React from 'react';

const FreeTrial = () => {
    return (
        <div style={{
            background: 'linear-gradient(135deg, #FDB813 0%, #ffa500 100%)',
            borderRadius: '1rem',
            padding: '2rem',
            margin: '0 auto 0',
            maxWidth: '800px',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(253, 184, 19, 0.3)'
        }}>
            <h3 style={{
                color: 'white',
                fontSize: '1.75rem',
                fontWeight: '700',
                marginBottom: '1rem'
            }}>
                🎉 Start Your Free Trial Today
            </h3>
            <p style={{
                color: 'white',
                fontSize: '1.125rem',
                marginBottom: '1.5rem',
                opacity: '0.95'
            }}>
                Get <strong style={{ fontSize: '1.25rem' }}>5 FREE CLAIMS</strong> when you sign up - no credit card required!
            </p>
            <div style={{
                display: 'flex',
                gap: '2rem',
                justifyContent: 'center',
                flexWrap: 'wrap',
                marginBottom: '1.5rem'
            }}>
                <div style={{ color: 'white' }}>
                    <span style={{ fontSize: '2rem' }}>✓</span>
                    <p style={{ margin: '0' }}>Full AI Features</p>
                </div>
                <div style={{ color: 'white' }}>
                    <span style={{ fontSize: '2rem' }}>✓</span>
                    <p style={{ margin: '0' }}>All Integrations</p>
                </div>
                <div style={{ color: 'white' }}>
                    <span style={{ fontSize: '2rem' }}>✓</span>
                    <p style={{ margin: '0' }}>Client Portal Access</p>
                </div>
            </div>
            <button
                className="btn"
                style={{
                    background: 'white',
                    color: '#FDB813',
                    padding: '1rem 2rem',
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    border: 'none',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                }}
                // onClick={() => window.location.href = 'https://claimking.webdesignstall.com/auth/sign-up'}
            >
                Start Your 5 Free Claims →
            </button>
            <p style={{
                color: 'white',
                fontSize: '0.875rem',
                marginTop: '1rem',
                opacity: '0.8'
            }}>
                Average contractor saves 20+ hours and increases claim values by 34% in their first week
            </p>
        </div>
    )
};

export default FreeTrial;