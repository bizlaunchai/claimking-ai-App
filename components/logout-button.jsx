"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react"; // ✅ import logout icon

export function LogoutButton({ iconOnly = false }) {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  // Render nothing if iconOnly is null
  if (iconOnly === null) return null;

  return (
      <Button
          variant="danger"
          size={iconOnly ? "icon" : "default"}
          onClick={logout}
          style={{width:'100%'}}
      >
        {iconOnly ? <LogOut size={16} /> : "Logout"} {/* Show icon if iconOnly */}
      </Button>
  );
}
