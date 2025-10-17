"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: "📊" },
    {
        name: "Claims",
        icon: "📁",
        subItems: [
            { name: "Active Claims", href: "/claims/active" },
            { name: "Archived Claims", href: "/claims/archived" },
            { name: "New Claim", href: "/claims/new" },
        ],
    },
    {
        name: "Policy",
        icon: "📄",
        subItems: [
            { name: "Policy Analysis", href: "/policy/analysis" },
            { name: "3D Mockups", href: "/policy/mockups" },
        ],
    },
    { name: "Reports", href: "/reports", icon: "📈" },
    { name: "Settings", href: "/settings", icon: "⚙️" },
];

const AppSidebar = ({ isCollapsed, setIsCollapsed }) => {
    const pathname = usePathname();
    const [activeSubmenu, setActiveSubmenu] = useState(null);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const toggleSubmenu = (name) =>
        setActiveSubmenu(activeSubmenu === name ? null : name);

    const toggleSidebar = () => setIsCollapsed(!isCollapsed);

    const toggleMobileSidebar = () => {
        setIsMobileOpen(!isMobileOpen);
        document.body.style.overflow = !isMobileOpen ? "hidden" : "";
    };

    useEffect(() => {
        // Close mobile sidebar on route change
        setIsMobileOpen(false);
        document.body.style.overflow = "";
    }, [pathname]);

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity ${
                    isMobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
                onClick={toggleMobileSidebar}
            ></div>

            {/* Sidebar */}
            <aside
                className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 shadow-md z-50 flex flex-col transition-all duration-300
          ${isCollapsed ? "w-20" : "w-64"} ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-md flex items-center justify-center text-white font-bold">
                            C
                        </div>
                        {!isCollapsed && <span className="text-lg font-semibold">ClaimKing.AI</span>}
                    </div>
                    <button
                        onClick={toggleSidebar}
                        className="hidden lg:block text-gray-500 hover:text-gray-700 transition cursor-pointer"
                    >
                        {isCollapsed ? "➡️" : "⬅️"}
                    </button>
                    <button
                        onClick={toggleMobileSidebar}
                        className="lg:hidden text-gray-500 hover:text-gray-700"
                    >
                        ✖️
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto">
                    <ul className="p-2 space-y-1">
                        {menuItems.map((item) => (
                            <li key={item.name}>
                                {item.subItems ? (
                                    <>
                                        <button
                                            onClick={() => toggleSubmenu(item.name)}
                                            className={`w-full flex items-center justify-between p-3 rounded-md hover:bg-yellow-50 transition ${
                                                activeSubmenu === item.name ? "bg-yellow-100" : ""
                                            }`}
                                        >
                      <span className="flex items-center gap-3">
                        <span>{item.icon}</span>
                          {!isCollapsed && <span>{item.name}</span>}
                      </span>
                                            {!isCollapsed && (
                                                <span className="text-sm">
                          {activeSubmenu === item.name ? "▲" : "▼"}
                        </span>
                                            )}
                                        </button>
                                        {activeSubmenu === item.name && !isCollapsed && (
                                            <ul className="ml-8 mt-1 space-y-1">
                                                {item.subItems.map((sub) => (
                                                    <li key={sub.name}>
                                                        <Link
                                                            href={sub.href}
                                                            className={`block p-2 text-sm rounded-md hover:bg-yellow-50 transition ${
                                                                pathname === sub.href ? "bg-yellow-100 font-medium" : ""
                                                            }`}
                                                        >
                                                            {sub.name}
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </>
                                ) : (
                                    <Link
                                        href={item.href}
                                        className={`flex items-center gap-3 p-3 rounded-md hover:bg-yellow-50 transition ${
                                            pathname === item.href ? "bg-yellow-100 font-medium" : ""
                                        }`}
                                    >
                                        <span>{item.icon}</span>
                                        {!isCollapsed && <span>{item.name}</span>}
                                    </Link>
                                )}
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Footer */}
                <div className="p-3 border-t border-gray-100 text-sm text-gray-500">
                    {!isCollapsed && <span>© 2025 ClaimKing.AI</span>}
                </div>
            </aside>

            {/* Mobile Hamburger */}
            <button
                onClick={toggleMobileSidebar}
                className="fixed bottom-6 right-6 z-50 bg-yellow-500 text-white p-3 rounded-full shadow-lg lg:hidden"
            >
                ☰
            </button>
        </>
    );
};

export default AppSidebar;
