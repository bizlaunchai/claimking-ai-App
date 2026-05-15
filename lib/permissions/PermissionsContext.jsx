"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import axiosInstance from "@/lib/axiosInstance";
import { createClient } from "@/lib/supabase/client";

/**
 * Effective permissions for the current user.
 *
 * The shape is the JSONB returned by SQL function `get_user_permissions()`:
 *   - regular member  → { "view_claims": true, "edit_estimates": true, ... }
 *   - superadmin      → { "*": true }
 *   - platform_staff  → granular allow grants (from user_permission_overrides.allow)
 *
 * `has(key)` returns true when the key is present and truthy, or when the
 * wildcard "*" is set. Frontend gating MUST always pair with backend
 * @RequirePermission — this hook is UX only.
 */
const PermissionsContext = createContext({
    permissions: {},
    role: null,
    loading: true,
    has: () => false,
    refresh: async () => {},
});

export function PermissionsProvider({ children }) {
    const [permissions, setPermissions] = useState({});
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setPermissions({});
                setRole(null);
                return;
            }
            const { data: profile } = await supabase
                .from("profiles").select("role").eq("id", user.id).single();
            const r = profile?.role ?? null;
            setRole(r);

            // Superadmin / platform_staff don't have company permissions.
            // Superadmin gets wildcard via the SQL function; staff would 404
            // /team/me/permissions because they have no company. Skip.
            if (r === "superadmin") {
                setPermissions({ "*": true });
                return;
            }
            if (r === "platform_staff") {
                const { data: ov } = await supabase
                    .from("user_permission_overrides")
                    .select("allow")
                    .eq("user_id", user.id)
                    .maybeSingle();
                setPermissions(ov?.allow ?? {});
                return;
            }

            // Company member — fetch effective permissions from backend.
            const res = await axiosInstance.get("/team/me/permissions", {
                suppressErrorToast: true,
            });
            setPermissions(res?.data?.permissions ?? res?.data ?? {});
        } catch {
            setPermissions({});
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const has = useCallback(
        (key) => {
            if (!key) return true;
            if (permissions && permissions["*"] === true) return true;
            const v = permissions?.[key];
            return v === true || (typeof v === "string" && v.length > 0);
        },
        [permissions],
    );

    return (
        <PermissionsContext.Provider value={{ permissions, role, loading, has, refresh: load }}>
            {children}
        </PermissionsContext.Provider>
    );
}

export function usePermissions() {
    return useContext(PermissionsContext);
}
