"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import { LogoutButton } from "./logout-button";
import { createClient } from "@/lib/supabase/client";

export function AuthButton() {
    const [user, setUser] = useState(null);
    const supabase = createClient();

    useEffect(() => {
        const getUser = async () => {
            const { data } = await supabase.auth.getUser();
            setUser(data?.user || null);
        };

        getUser();

        // Optional: Listen for auth state changes (login/logout)
        const { data: listener } = supabase.auth.onAuthStateChange(() => {
            getUser();
        });

        return () => {
            listener?.subscription.unsubscribe();
        };
    }, [supabase]);

    if (user) {
        return (
            <div className="flex items-center gap-4">
                {/*<LogoutButton />*/}
                {/*<Button asChild size="sm" variant="default">
                    <Link href="/dashboard">Dashboard</Link>
                </Button>*/}
                <Link href="/dashboard" className="btn btn-secondary">
                    <button>Dashboard</button>
                </Link>
            </div>
        );
    }

    return (
        <div className="flex gap-2">
            <Link href="/auth/login" className="btn btn-secondary">
                <button>Sign in</button>
            </Link>
            {/*
              <Link href="/auth/sign-up" className="btn btn-secondary">
                <button>Sign up</button>
              </Link>
              */}
        </div>
    );
}
