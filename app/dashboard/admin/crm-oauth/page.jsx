import { Suspense } from 'react';
import AdminCrmOAuth from './AdminCrmOAuth.jsx';

export const metadata = {
    title: 'CRM OAuth Apps · ClaimKing.AI Admin',
    description: 'Platform-level OAuth credentials for AccuLynx, HubSpot, Salesforce and Zoho.',
};

const Page = () => (
    <Suspense fallback={<div className="ck-load-block" style={{ padding: 40 }}><span className="ck-spinner" /><span>Loading CRM OAuth settings…</span></div>}>
        <AdminCrmOAuth />
    </Suspense>
);

export default Page;
