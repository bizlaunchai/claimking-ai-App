'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import { Loader2, ShieldAlert } from 'lucide-react';

/**
 * Client-side guard for /dashboard/admin/* routes.
 * Verifies the logged-in user has role = 'admin' in profiles, otherwise redirects.
 *
 * Backend RBAC (RolesGuard + @Roles('admin')) is the real enforcement —
 * this is just for UX (hide the UI from non-admins).
 */
export default function AdminLayout({ children }) {
    const router = useRouter();
    const [state, setState] = useState('checking'); // 'checking' | 'allowed' | 'denied'

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.replace('/auth/login');
                    return;
                }
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                if (cancelled) return;
                if (profile?.role === 'admin') setState('allowed');
                else setState('denied');
            } catch {
                if (!cancelled) setState('denied');
            }
        })();
        return () => { cancelled = true; };
    }, [router]);

    if (state === 'checking') {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={28} style={{ color: '#4f46e5', animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    if (state === 'denied') {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                <div style={{ textAlign: 'center', maxWidth: 400 }}>
                    <ShieldAlert size={48} style={{ color: '#dc2626', marginBottom: 12 }} />
                    <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700 }}>Admin Access Required</h2>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
                        You do not have permission to view this page. Contact your administrator if you believe this is a mistake.
                    </p>
                    <button
                        onClick={() => router.replace('/dashboard')}
                        style={{ marginTop: 16, padding: '10px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div style={{
                background: '#1f2937', color: '#fbbf24', padding: '8px 20px',
                fontSize: 12, fontWeight: 600, textAlign: 'center',
                letterSpacing: 0.05, textTransform: 'uppercase',
            }}>
                🔒 Admin Mode — changes affect all users
            </div>
            {children}
        </>
    );
}
