"use client";

import React from "react";
import { usePermissions } from "./PermissionsContext";

/**
 * Render `children` only when the current user has the requested permission(s).
 *
 *   <Can permission="generate_estimates">
 *     <Button>Generate</Button>
 *   </Can>
 *
 *   <Can anyOf={["view_jobs","view_claims"]}>...</Can>
 *   <Can allOf={["edit_estimates","view_claims"]}>...</Can>
 *
 * Hide-on-no-permission is the project default. Pass `fallback` to render
 * something instead (e.g. a disabled button with a tooltip).
 */
export function Can({ permission, anyOf, allOf, fallback = null, children }) {
    const { has, loading } = usePermissions();

    if (loading) return null;

    let ok = true;
    if (permission) ok = has(permission);
    if (ok && Array.isArray(anyOf) && anyOf.length > 0) ok = anyOf.some(has);
    if (ok && Array.isArray(allOf) && allOf.length > 0) ok = allOf.every(has);

    if (!ok) return fallback;
    return <>{children}</>;
}

export default Can;
