import { NextResponse } from "next/server";
import { serverCreateClient } from "@/lib/supabase/server";

export async function GET(request, context) {
    const { params } = await context; // ✅ await here in Next.js 15+

    const supabase = await serverCreateClient();

    const id = await params?.id;

    if (!id) {
        return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, role")
        .eq("id", id)
        .single();

    if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json(profile);
}
