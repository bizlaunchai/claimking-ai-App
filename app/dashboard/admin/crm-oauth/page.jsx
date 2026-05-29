import { Suspense } from 'react';
import AdminCrmOAuth from './AdminCrmOAuth.jsx';

export const metadata = {
    title: 'CRM OAuth Apps · ClaimKing.AI Admin',
    description: 'Platform-level OAuth credentials for AccuLynx, HubSpot, Salesforce and Zoho.',
};

const Page = () => (
    <Suspense fallback={<div style={{ padding: 40, color: '#6b7280' }}>Loading CRM OAuth settings…</div>}>
        <AdminCrmOAuth />
    </Suspense>
);

export default Page;
