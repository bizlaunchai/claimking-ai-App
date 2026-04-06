import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/dashboard';

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
                return NextResponse.redirect(`${origin}/onboarding`);
            }

            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    return NextResponse.redirect(`${origin}/auth/login?error=auth-failed`);
}