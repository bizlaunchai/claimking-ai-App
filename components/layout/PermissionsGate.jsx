"use client";

import React from "react";
import { usePermissions } from "@/lib/permissions/PermissionsContext";

/**
 * Renders a soft loading overlay over the dashboard content area while the
 * effective-permissions context is loading. Sidebar handles its own skeleton.
 *
 * Why an overlay rather than a full-page replacement: keeps the sidebar /
 * header / content scaffold mounted so the layout doesn't snap on resolve,
 * which is especially janky on mobile.
 */
export default function PermissionsGate({ children }) {
    const { loading } = usePermissions();

    return (
        <>
            {children}
            {loading && (
                <div className="permissions-loading-overlay" aria-busy="true" aria-live="polite">
                    <div className="permissions-loading-spinner" />
                    <div className="permissions-loading-text">Loading workspace…</div>
                </div>
            )}
        </>
    );
}
