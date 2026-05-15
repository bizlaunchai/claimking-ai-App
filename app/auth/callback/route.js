import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * OAuth / magic-link / email-verification callback.
 *
 * IMPORTANT: must use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (anon key) here,
 * NOT the service-role key. exchangeCodeForSession() is a user-auth PKCE flow
 * that creates a user-scoped JWT — the service-role key breaks this entirely
 * (500 / "Unsafe attempt to load URL" in Chrome email clients).
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next')?.startsWith('/')
        ? searchParams.get('next')
        : '/dashboard';
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.claimking.ai';

    if (!code) {
        return NextResponse.redirect(`${baseUrl}/auth/login?error=auth-failed`);
    }

    const cookieStore = await cookies();

    // Use the publishable (anon) key — required for user auth PKCE flow.
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options),
                        );
                    } catch {
                        // Ignore — cookies may already have been sent.
                    }
                },
            },
        },
    );

    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !user) {
        console.error('[auth/callback] exchangeCodeForSession failed:', error?.message);
        return NextResponse.redirect(`${baseUrl}/auth/login?error=auth-failed`);
    }

    // Accept-invite and onboarding flows handle their own "what next" logic —
    // skip the profile check so we don't accidentally redirect them away.
    if (next.startsWith('/accept-invite') || next.startsWith('/onboarding')) {
        return NextResponse.redirect(`${baseUrl}${next}`);
    }

    // For all other destinations: check whether this user needs onboarding.
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, role')
            .eq('id', user.id)
            .single();

        // Superadmin / platform_staff → skip company gate
        if (profile?.role === 'superadmin' || profile?.role === 'platform_staff') {
            return NextResponse.redirect(`${baseUrl}${next}`);
        }

        // No company yet → force onboarding
        if (!profile?.company_id) {
            return NextResponse.redirect(`${baseUrl}/onboarding/select-plan`);
        }
    } catch (profileErr) {
        console.error('[auth/callback] profile lookup failed:', profileErr);
        // Fall through — let the middleware handle it on next request.
    }

    return NextResponse.redirect(`${baseUrl}${next}`);
}
