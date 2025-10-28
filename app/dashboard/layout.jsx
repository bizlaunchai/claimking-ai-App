"use client";

import React, {useEffect, useState} from "react";
import AppSidebar from "@/components/layout/AppSidebar";
import DashboardHeader from "@/components/layout/DashboardHeader";
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

          console.log(data);


          const res = await fetch(`/api/profile/${data?.claims?.sub}`);
          if (!res.ok) {
              router.push("/auth/login");
              return;
          }
          // debugger
          const userProfile = await res.json();
          console.log({userProfile});
          setUser(userProfile);

      })()

  }, [])

  /*return (
      <div className="flex bg-gray-50 text-gray-900 font-sans">
        {/!* Sidebar *!/}
        <AppSidebar
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
            user={user}
        />

        {/!* Main Content *!/}
        <div className="flex flex-col flex-1 min-h-screen">
          {/!* Header *!/}
          {/!*<header
              className={`fixed flex-1 top-0 z-40 w-full bg-white shadow-sm border-b border-gray-200 transition-all duration-300 `}
          >
            <DashboardHeader title="ClaimKing Dashboard" />
          </header>*!/}

          {/!* Page Content *!/}
          <main>
            {children}
          </main>
        </div>
      </div>
  );*/

    return (
        <div className="flex justify-between bg-gray-50 text-gray-900 font-sans min-h-screen">
            {/* Sidebar */}
            <div className={`transition-all duration-300`}>
                <AppSidebar
                    isCollapsed={isSidebarCollapsed}
                    setIsCollapsed={setIsSidebarCollapsed}
                    user={user}
                />
            </div>

            {/* Main Content */}
            <div className="w-[90%] pr-[60px]">
                {/* Page Content */}
                <main className="px-2 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );

};

export default DashboardLayout;

