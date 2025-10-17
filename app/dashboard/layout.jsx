/*
import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";

export default function ProtectedLayout({
  children,
}) {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <Link href={"/"}>Next.js Supabase Starter</Link>
              <div className="flex items-center gap-2">
                <DeployButton />
              </div>
            </div>
            {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
          </div>
        </nav>
        <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5">
          {children}
        </div>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
          <p>
            Powered by{" "}
            <a
              href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
              target="_blank"
              className="font-bold hover:underline"
              rel="noreferrer"
            >
              Supabase
            </a>
          </p>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
*/



"use client";

import React, {useEffect, useState} from "react";
import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import {createClient} from "@/lib/supabase/client";
import {useRouter} from "next/navigation";

const DashboardLayout = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [user, setUser] = useState(null);
    const router = useRouter();

  useEffect(() => {
      (async () => {
          const supabase = await createClient();

          const { data, error } = await supabase.auth.getClaims();
          if (error || !data?.claims) {
              router.push("/auth/login");
              return;
          }
          setUser(data?.claims);

      })()

  }, [])

  return (
      <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
        {/* Sidebar */}
        <AppSidebar
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
            user={user}
        />

        {/* Main Content */}
        <div className="flex flex-col flex-1 min-h-screen">
          {/* Header */}
          <header
              className={`fixed flex-1 top-0 z-40 w-full bg-white shadow-sm border-b border-gray-200 transition-all duration-300
                                ${isSidebarCollapsed ? "lg:ml-20 lg:pr-20" : "lg:ml-64 lg:pr-64"}`}
          >
            <AppHeader title="ClaimKing Dashboard" />
          </header>

          {/* Page Content */}
          <main
              className={`flex-1 overflow-y-auto pt-[80px] p-6 transition-all duration-300
            ${isSidebarCollapsed ? "lg:ml-20" : "lg:ml-64"}`}
          >
            {children}
          </main>
        </div>
      </div>
  );
};

export default DashboardLayout;

