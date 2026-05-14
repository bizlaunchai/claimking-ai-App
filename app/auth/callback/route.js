import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next')?.startsWith('/')
        ? searchParams.get('next')
        : '/dashboard';
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.claimking.ai";

    if (code) {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error && user) {
            // If the user is being redirected to an accept-invite page or the
            // onboarding plan picker, don't run the business-profile check —
            // those flows handle their own next-step logic.
            //   - /accept-invite/<token> attaches the user to an existing company
            //   - /onboarding/select-plan creates a company on plan purchase
            if (next.startsWith('/accept-invite') || next.startsWith('/onboarding')) {
                return NextResponse.redirect(`${baseUrl}${next}`);
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id, role')
                .eq('id', user.id)
                .single();

            // Superadmin → never gets the onboarding gate
            if (profile?.role === 'superadmin') {
                return NextResponse.redirect(`${baseUrl}${next}`);
            }

            // No company yet → middleware will redirect to /onboarding/select-plan,
            // but we can shortcut it here too.
            if (!profile?.company_id) {
                return NextResponse.redirect(`${baseUrl}/onboarding/select-plan`);
            }

            return NextResponse.redirect(`${baseUrl}${next}`);
        }
    }

    return NextResponse.redirect(`${baseUrl}/auth/login?error=auth-failed`);
}