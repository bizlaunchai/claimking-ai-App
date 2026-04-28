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
            const { data: profile } = await supabase
                .from('profiles')
                .select('business_name, phone')
                .eq('id', user.id)
                .single();

            if (!profile || !profile.business_name) {
                return NextResponse.redirect(`${baseUrl}/onboarding`);
            }

            return NextResponse.redirect(`${baseUrl}${next}`);
        }
    }

    return NextResponse.redirect(`${baseUrl}/auth/login?error=auth-failed`);
}