"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import GoogleAuth from "@/components/auth/GoogleAuth.jsx";
import OutlookAuth from "@/components/auth/OutlookAuth.jsx";

const SUSPENSION_MESSAGES = {
  account_suspended:
    "Your account has been suspended. Please contact support for assistance.",
  company_suspended:
    "Your company's account has been suspended. Please contact your administrator or ClaimKing support.",
};

export function LoginForm({ className, ...props }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Read the one-shot "auth_notice" flash cookie set by the middleware on a
  // suspension redirect, show the message, then clear the cookie so it does
  // not persist across reloads. Keeps the URL clean (no ?error=... param).
  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )auth_notice=([^;]+)/);
    if (match) {
      const notice = decodeURIComponent(match[1]);
      if (SUSPENSION_MESSAGES[notice]) setError(SUSPENSION_MESSAGES[notice]);
      document.cookie = "auth_notice=; path=/; max-age=0";
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // Suspension check up-front so the message shows immediately (without a
      // dashboard round-trip + reload). The middleware still enforces this for
      // direct URL access / already-open sessions.
      const userId = data?.user?.id;
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("status, company_id")
          .eq("id", userId)
          .single();

        let notice = null;
        if (profile?.status === "suspended") {
          notice = "account_suspended";
        } else if (profile?.company_id) {
          const { data: company } = await supabase
            .from("companies")
            .select("status")
            .eq("id", profile.company_id)
            .maybeSingle();
          if (company?.status === "suspended") notice = "company_suspended";
        }

        if (notice) {
          await supabase.auth.signOut();
          setError(SUSPENSION_MESSAGES[notice]);
          setIsLoading(false);
          return;
        }
      }

      // Redirect to protected route
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };



  return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>
              Enter your email below to login to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <Link
                        href="/auth/forgot-password"
                        className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                  <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Logging in..." : "Login"}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <GoogleAuth/>
                <OutlookAuth/>

              </div>
              <div className="mt-4 text-center text-sm">
                Don't have an account?{" "}
                <Link href="/auth/sign-up" className="underline underline-offset-4">
                  Sign up
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
  );
}
