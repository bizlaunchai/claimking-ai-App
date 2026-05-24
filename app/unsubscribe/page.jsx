'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

function UnsubscribeInner() {
    const params = useSearchParams();
    const token = params.get('token');
    const [state, setState] = useState('idle'); // idle | loading | done | error
    const [email, setEmail] = useState('');

    const submit = async () => {
        if (!token) { setState('error'); return; }
        setState('loading');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/unsubscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
            if (!res.ok) throw new Error('failed');
            const data = await res.json();
            setEmail(data?.email || '');
            setState('done');
        } catch {
            setState('error');
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f7', fontFamily: '-apple-system, BlinkMacSystemFont, Inter, Segoe UI, Roboto, sans-serif' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: '2.5rem', maxWidth: 460, width: '90%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: '#FDB813', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: 24 }}>✉</div>
                {state === 'done' ? (
                    <>
                        <h1 style={{ fontSize: '1.4rem', color: '#1a1f3a', marginBottom: 8 }}>You&apos;re unsubscribed</h1>
                        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                            {email ? `${email} will` : 'You will'} no longer receive marketing emails from us.
                        </p>
                    </>
                ) : state === 'error' ? (
                    <>
                        <h1 style={{ fontSize: '1.4rem', color: '#dc2626', marginBottom: 8 }}>Link expired or invalid</h1>
                        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>This unsubscribe link could not be processed.</p>
                    </>
                ) : (
                    <>
                        <h1 style={{ fontSize: '1.4rem', color: '#1a1f3a', marginBottom: 8 }}>Unsubscribe</h1>
                        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            Click below to stop receiving marketing emails from this contractor.
                        </p>
                        <button
                            onClick={submit}
                            disabled={state === 'loading' || !token}
                            style={{ background: '#1a1f3a', color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem 2rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                            {state === 'loading' ? 'Processing…' : 'Unsubscribe me'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default function UnsubscribePage() {
    return (
        <Suspense fallback={null}>
            <UnsubscribeInner />
        </Suspense>
    );
}
