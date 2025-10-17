"use client";

import React, { useState } from "react";
import AppSidebar from "@/layout/AppSidebar";
import AppHeader from "@/layout/AppHeader";

const DashboardLayout = ({ children }) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
            {/* Sidebar */}
            <AppSidebar
                isCollapsed={isSidebarCollapsed}
                setIsCollapsed={setIsSidebarCollapsed}
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
