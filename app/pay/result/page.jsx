'use client';

// Public deposit-payment result page. Stripe redirects the homeowner here
// after Checkout (success_url / cancel_url). Homeowners are NOT logged in, so
// this route is allowlisted in lib/supabase/middleware.js. No token/estimate
// data is fetched — we only show a friendly outcome message.

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function PayResultInner() {
    const sp = useSearchParams();
    const ok = sp.get('status') === 'success';

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                background: '#f5f6f8',
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                color: '#1f2937',
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: 460,
                    background: '#fff',
                    borderRadius: 16,
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
                    padding: '40px 32px',
                    textAlign: 'center',
                }}
            >
                <div
                    style={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        margin: '0 auto 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: ok ? '#dcfce7' : '#fef3c7',
                    }}
                >
                    {ok ? (
                        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : (
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="8" x2="12" y2="13" /><line x1="12" y1="16.5" x2="12" y2="16.5" /><circle cx="12" cy="12" r="9" /></svg>
                    )}
                </div>

                <h1 style={{ margin: '0 0 10px', fontSize: 22, color: '#1a1f3a' }}>
                    {ok ? 'Payment successful' : 'Payment not completed'}
                </h1>

                <p style={{ margin: '0 0 4px', fontSize: 15, lineHeight: 1.6, color: '#374151' }}>
                    {ok
                        ? 'Thank you — your deposit has been received. Your contractor has been notified and your estimate is updated.'
                        : 'Your payment was cancelled or did not go through, so you have not been charged. You can reopen the payment link and try again.'}
                </p>

                <p style={{ margin: '18px 0 0', fontSize: 12.5, color: '#9ca3af' }}>
                    You can safely close this page.
                </p>

                <div style={{ marginTop: 26, paddingTop: 20, borderTop: '1px solid #f3f4f6', fontSize: 12, color: '#9ca3af' }}>
                    Powered by <strong style={{ color: '#1a1f3a' }}>ClaimKing.AI</strong> · Payments processed securely by Stripe
                </div>
            </div>
        </div>
    );
}

export default function PayResultPage() {
    return (
        <Suspense fallback={null}>
            <PayResultInner />
        </Suspense>
    );
}
