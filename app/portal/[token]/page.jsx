import PortalView from './PortalView.jsx';

// Public homeowner-facing portal.
//
// URL: /portal/<UUID-v4-token>
//
// The token is the sole credential — homeowners do not log in. The
// backend's resolve_portal_token() function enforces validity, expiry,
// rate limiting, and logs the view. The Next.js middleware allowlists
// /portal/* so unauthenticated requests aren't bounced to /auth/login.
export const metadata = {
    title: 'Your Claim Portal',
    description: '',
    // Belt-and-suspenders on top of the HTTP X-Robots-Tag header set in
    // the response — keep this URL out of search indexes.
    robots: {
        index: false,
        follow: false,
        nocache: true,
        googleBot: { index: false, follow: false, noimageindex: true },
    },
};

export default function Page() {
    // PortalView is a client component — it reads the [token] param via
    // useParams() (Next 15+ pattern: server-component `params` is a Promise).
    return <PortalView />;
}
