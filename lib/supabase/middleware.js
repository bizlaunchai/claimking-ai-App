import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { hasEnvVars } from "../utils";
import { permissionForDashboardPath } from "../permissions/routeMap";

/**
 * Edge middleware — runs on every request before the page handler.
 *
 * Responsibilities:
 *   1. Refresh the Supabase session cookies.
 *   2. Redirect unauthenticated users to /auth/login (except public pages).
 *   3. Enforce ONBOARDING for authenticated users without a company:
 *      a user who signed up but never purchased a plan has
 *      `profiles.company_id = NULL`. They are funneled to
 *      `/onboarding/select-plan` and cannot access the dashboard, AI tools,
 *      etc. until they pick a plan and Stripe webhook attaches them to a
 *      newly-created company.
 *
 * Superadmin bypass: users with `role = 'superadmin'` have no company_id but
 * SHOULD have full access to the dashboard (their own /dashboard/admin/* pages).
 *
 * Paths that DO NOT require a company even for non-superadmin users:
 *   /onboarding/*       — the plan picker itself
 *   /auth/*             — login / signup / reset / accept-invite signup
 *   /accept-invite/*    — team-invite acceptance flow
 *   /dashboard/billing  — so users can purchase a plan from the billing page too
 *   /                   — landing
 */
const NO_COMPANY_REQUIRED_PREFIXES = [
  "/onboarding",
  "/auth",
  "/accept-invite",
  "/dashboard/billing",
];

// Paths gated to superadmin only (ClaimKing platform team).
// Company admins MUST NOT see these — they're for managing the SaaS itself
// (plans catalog, coupons, feature costs, global API keys, all users/orders).
const SUPERADMIN_ONLY_PREFIXES = [
  "/dashboard/admin",
];

// Paths gated to company admin (or superadmin). Team members in other roles
// (estimator/field/office/client) get 403-redirected.
const COMPANY_ADMIN_ONLY_PREFIXES = [
  "/dashboard/billing",
  "/dashboard/purchase-credits",
  "/dashboard/team",
];

function isPublicPath(pathname) {
  return (
    pathname === "/" ||
    NO_COMPANY_REQUIRED_PREFIXES.some((p) => pathname.startsWith(p))
  );
}

function isSuperadminPath(pathname) {
  return SUPERADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
}

function isCompanyAdminPath(pathname) {
  return COMPANY_ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!hasEnvVars) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and supabase.auth.getClaims().
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const pathname = request.nextUrl.pathname;

  // ── 1. Unauthenticated → /auth/login ───────────────────────────────────
  // /portal/* is the token-based homeowner-facing portal. Homeowners are
  // NOT authenticated users — the URL token is the only credential. So we
  // allow these requests through and let the page handler resolve the token
  // via the backend (which enforces validity, expiry, and rate limiting).
  if (
    pathname !== "/" &&
    !user &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/auth") &&
    !pathname.startsWith("/accept-invite") &&
    !pathname.startsWith("/portal") &&
    // /sign/* is the homeowner-facing estimate signing flow.
    // Same model as /portal/* — token IS the credential, no auth needed.
    !pathname.startsWith("/sign")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // ── Security headers for /portal/* and /sign/* (homeowner-facing) ─────
  // The URL is essentially a long-lived bearer token in plaintext.
  // We harden the response to:
  //   - keep it out of search engines (X-Robots-Tag)
  //   - prevent CDN / browser caching of stale or per-user content (no-store)
  //   - block embedding in iframes (clickjacking defence)
  //   - strip the Referer header so the token isn't leaked to outbound links
  if (pathname.startsWith("/portal") || pathname.startsWith("/sign")) {
    supabaseResponse.headers.set(
      "X-Robots-Tag",
      "noindex, nofollow, noarchive",
    );
    supabaseResponse.headers.set("Cache-Control", "private, no-store");
    supabaseResponse.headers.set("X-Frame-Options", "DENY");
    supabaseResponse.headers.set("Referrer-Policy", "no-referrer");
  }

  // ── 2. Authenticated path-level checks ─────────────────────────────────
  // (no-company gate + role-based path gates)
  //
  // Server-side enforcement so a non-admin team member typing the URL
  // /dashboard/billing or /dashboard/admin/plans gets bounced even when the
  // sidebar entry is hidden. Backend RolesGuard / PermissionGuard ALSO
  // enforce on every API call — this middleware is just the friendly UX
  // layer (no error toast, just a clean redirect).
  if (user && !isPublicPath(pathname) && pathname.startsWith("/dashboard")) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, company_id, status")
        .eq("id", user.sub)
        .single();

      // Suspended accounts → login with explanation
      if (profile?.status === "suspended") {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/login";
        url.searchParams.set("error", "account_suspended");
        return NextResponse.redirect(url);
      }

      const role = profile?.role;
      const isSuperadmin = role === "superadmin";
      const isPlatformStaff = role === "platform_staff";
      const isCompanyAdmin = role === "admin" && !!profile?.company_id;
      const hasCompany = !!profile?.company_id;

      // ── 2a. Platform admin paths (/dashboard/admin/*) ──────────────
      // Allowed: superadmin (full access) OR platform_staff (granular —
      // individual page access enforced by backend PlatformPermissionGuard
      // and the admin layout's permission-based sidebar). Company users
      // — even company admins — get bounced.
      if (isSuperadminPath(pathname) && !isSuperadmin && !isPlatformStaff) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        url.searchParams.set("error", "superadmin_only");
        return NextResponse.redirect(url);
      }

      // ── 2b. Company-admin-only paths ───────────────────────────────
      // /billing, /purchase-credits, /team. Non-admin team members (and
      // anyone without a company) get bounced.
      if (isCompanyAdminPath(pathname)) {
        // Allowed: company admin OR superadmin.
        if (!isCompanyAdmin && !isSuperadmin) {
          // If they don't have a company AT ALL → onboarding flow handles
          // this. /dashboard/billing itself is in the no-company allowlist
          // so plan purchase works.
          if (!hasCompany) {
            const url = request.nextUrl.clone();
            url.pathname = "/onboarding/select-plan";
            return NextResponse.redirect(url);
          }
          // Has a company but wrong role → bounce to dashboard with toast.
          const url = request.nextUrl.clone();
          url.pathname = "/dashboard";
          url.searchParams.set("error", "admin_only");
          return NextResponse.redirect(url);
        }
      }

      // ── 2c. Onboarding gate for any other dashboard path ───────────
      // Plain team members must already have a company. Superadmin and
      // platform_staff bypass (they're platform-level, no company).
      if (!isSuperadmin && !isPlatformStaff && !hasCompany) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding/select-plan";
        return NextResponse.redirect(url);
      }

      // ── 2d. Per-page permission gate ───────────────────────────────
      // Superadmin / platform_staff bypass company permission checks.
      // For company members, look up the permission this route requires
      // and consult role_permissions + user_permission_overrides.
      if (!isSuperadmin && !isPlatformStaff && hasCompany) {
        const required = permissionForDashboardPath(pathname);
        if (required) {
          const { data: hasPerm } = await supabase.rpc("user_has_permission", {
            p_user_id: user.sub,
            p_key: required,
          });
          if (!hasPerm) {
            const url = request.nextUrl.clone();
            url.pathname = "/dashboard";
            url.searchParams.set("error", "missing_permission");
            return NextResponse.redirect(url);
          }
        }
      }
    } catch {
      // Profile lookup failed (transient DB error, race after signup, etc.).
      // Fall through — the page itself will redirect / show an error.
    }
  }

  return supabaseResponse;
}
