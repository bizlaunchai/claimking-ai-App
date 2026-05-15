"use client";

import React, { useEffect, useState } from "react";
import AppSidebar from "@/components/layout/AppSidebar";
import DashboardHeader from "@/components/layout/DashboardHeader";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PermissionsProvider } from "@/lib/permissions/PermissionsContext";
import PermissionsGate from "@/components/layout/PermissionsGate";

const ACCESS_DENIED_MESSAGES = {
    superadmin_only: "That page is restricted to ClaimKing platform admins.",
    admin_only: "Only the company admin can access that page.",
    account_suspended: "Your account is suspended — contact your admin.",
    missing_permission: "You don't have permission to access that page.",
};

const DashboardLayout = ({ children }) => {
    const [user, setUser] = useState(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Show toast + strip ?error= from the URL if middleware bounced the user here.
    useEffect(() => {
        const code = searchParams?.get("error");
        if (!code) return;
        const msg = ACCESS_DENIED_MESSAGES[code];
        if (msg) toast.error("Access denied", { description: msg });
        // Clean the URL so a refresh doesn't re-toast.
        if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            url.searchParams.delete("error");
            window.history.replaceState({}, "", url.toString());
        }
    }, [searchParams]);

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            setIsMobile(width < 768);
            if (width < 768) {
                setIsMobileOpen(false);
                setIsCollapsed(false);
            } else if (width < 1024) {
                setIsCollapsed(true);
            } else {
                setIsCollapsed(false);
            }
        };

        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Lock body scroll when mobile drawer is open
    useEffect(() => {
        if (isMobileOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isMobileOpen]);

    useEffect(() => {
        (async () => {
            const supabase = await createClient();
            const { data, error } = await supabase.auth.getClaims();
            if (error || !data?.claims) {
                router.push("/auth/login");
            }
        })();
    }, []);

    const closeMobile = () => setIsMobileOpen(false);
    const toggleMobile = () => setIsMobileOpen((p) => !p);

    const mainMargin = isMobile ? 0 : isCollapsed ? 70 : 250;

    return (
        <PermissionsProvider>
        <div className="dashboard-shell bg-gray-50 text-gray-900 font-sans min-h-screen">
            <AppSidebar
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                isMobileOpen={isMobileOpen}
                closeMobile={closeMobile}
                user={user}
            />

            {isMobileOpen && (
                <div
                    className="dashboard-overlay"
                    onClick={closeMobile}
                    aria-hidden="true"
                />
            )}

            <div
                className="dashboard-main"
                style={{ marginLeft: `${mainMargin}px`, transition: "margin-left 0.3s ease" }}
            >
                {isMobile && !isMobileOpen && (
                    <button
                        type="button"
                        className="mobile-sidebar-toggle"
                        aria-label="Open menu"
                        onClick={toggleMobile}
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                            <line x1="4" y1="6" x2="20" y2="6" />
                            <line x1="4" y1="12" x2="20" y2="12" />
                            <line x1="4" y1="18" x2="20" y2="18" />
                        </svg>
                    </button>
                )}
                <main className="dashboard-content-wrapper">
                    <PermissionsGate>
                        {children}
                    </PermissionsGate>
                </main>
            </div>
        </div>
        </PermissionsProvider>
    );
};

export default DashboardLayout;
