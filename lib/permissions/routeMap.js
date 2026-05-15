/**
 * Dashboard route → permission key map.
 *
 * Each entry says: to load this page, the user MUST have this permission.
 * Used by both:
 *   - middleware.js (server-side redirect on direct URL access)
 *   - AppSidebar  (hides the nav link when the user lacks the permission)
 *
 * Backend @RequirePermission on every controller is the real enforcement —
 * these are the UX layer. Keep the keys in sync with sql/05_role_permissions.sql.
 *
 * Order matters: more specific prefixes must come BEFORE shorter ones.
 */
export const DASHBOARD_ROUTE_PERMISSIONS = [
    { prefix: "/dashboard/new-leads", permission: "view_leads" },
    { prefix: "/dashboard/unassigned-leads", permission: "view_leads" },
    { prefix: "/dashboard/jobs-ready", permission: "view_jobs" },
    { prefix: "/dashboard/claims", permission: "view_claims" },
    { prefix: "/dashboard/supplements", permission: "create_supplement" },
    { prefix: "/dashboard/client-portal", permission: "manage_portal_links" },
    { prefix: "/dashboard/measurement", permission: "use_measurements" },
    { prefix: "/dashboard/estimation", permission: "generate_estimates" },
    { prefix: "/dashboard/3d-mockup", permission: "generate_mockups" },
    { prefix: "/dashboard/policy-analysis", permission: "run_policy_analysis" },
    { prefix: "/dashboard/document-generator", permission: "use_doc_generator" },
    { prefix: "/dashboard/emails", permission: "use_email_assistant" },
    { prefix: "/dashboard/email-sms", permission: "view_email_sms" },
    { prefix: "/dashboard/ai-call-center", permission: "use_call_center" },
    { prefix: "/dashboard/storm-tracking", permission: "view_storm_tracking" },
    { prefix: "/dashboard/crm-sync", permission: "view_crm_sync" },
    { prefix: "/dashboard/google-my-business", permission: "view_gmb" },
    { prefix: "/dashboard/social-media", permission: "manage_social" },
    { prefix: "/dashboard/api-settings", permission: "manage_api_settings" },
    { prefix: "/dashboard/analytics", permission: "view_analytics" },
    { prefix: "/dashboard/payments", permission: "view_payments" },
    { prefix: "/dashboard/referral", permission: "view_referrals" },
    { prefix: "/dashboard/settings", permission: "view_settings" },
    { prefix: "/dashboard/account", permission: "edit_own_account" },
    { prefix: "/dashboard/purchase-credits", permission: "purchase_credits" },
    // /dashboard/billing, /dashboard/team, /dashboard/admin/* are handled by
    // role-based gates in middleware (company_admin / superadmin) — they are
    // intentionally NOT listed here.
];

export function permissionForDashboardPath(pathname) {
    if (!pathname) return null;
    for (const r of DASHBOARD_ROUTE_PERMISSIONS) {
        if (pathname === r.prefix || pathname.startsWith(r.prefix + "/")) {
            return r.permission;
        }
    }
    return null;
}
