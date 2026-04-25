"use client";

import React, { useEffect, useState } from "react";
import AppSidebar from "@/components/layout/AppSidebar";
import DashboardHeader from "@/components/layout/DashboardHeader";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const DashboardLayout = ({ children }) => {
    const [user, setUser] = useState(null);
    const router = useRouter();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

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
                <DashboardHeader
                    onToggleMobile={toggleMobile}
                    isMobileOpen={isMobileOpen}
                />
                <main className="dashboard-content-wrapper">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
