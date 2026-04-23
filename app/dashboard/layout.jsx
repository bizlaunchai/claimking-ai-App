"use client";

import React, {useEffect, useState} from "react";
import AppSidebar from "@/components/layout/AppSidebar";
import DashboardHeader from "@/components/layout/DashboardHeader";
import {createClient} from "@/lib/supabase/client";
import {useRouter} from "next/navigation";

const DashboardLayout = ({ children }) => {
    const [user, setUser] = useState(null);
    const router = useRouter();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Detect screen size
    useEffect(() => {
        const handleResize = () => {
            setIsCollapsed(window.innerWidth < 1024);
        };

        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

  useEffect(() => {
      (async () => {
          const supabase = await createClient();

          const { data, error } = await supabase.auth.getClaims();
          if (error || !data?.claims) {
              router.push("/auth/login");
              return;
          }

      })()

  }, [])

    return (
        <div className="bg-gray-50 text-gray-900 font-sans min-h-screen">
            {/* Sidebar */}
            <div className={`transition-all duration-300`}>
                <AppSidebar
                    isCollapsed={isCollapsed}
                    setIsCollapsed={setIsCollapsed}
                    user={user}
                />
            </div>

            {/* Main Content */}
            <div className={ isCollapsed ? 'ml-[68px]': 'ml-[250px]' } >
                <main className="px-2 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );

};

export default DashboardLayout;

