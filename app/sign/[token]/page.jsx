import SignView from './SignView.jsx';

// Public homeowner-facing estimate signing page.
// URL: /sign/<base64url-token>
//
// The token IS the credential — no login. Backend's resolvePublicToken()
// enforces validity / expiry / single-use. The middleware whitelists /sign/*
// (mirroring /portal/*) so unauthenticated requests aren't bounced.
export const metadata = {
    title: 'Sign Estimate',
    description: '',
    robots: {
        index: false,
        follow: false,
        nocache: true,
        googleBot: { index: false, follow: false, noimageindex: true },
    },
};

export default function Page() {
    return <SignView />;
}
