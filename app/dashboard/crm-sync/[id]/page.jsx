import { Suspense } from 'react';
import ConnectionDetail from './ConnectionDetail.jsx';

export const metadata = {
    title: 'CRM connection · ClaimKing.AI',
};

const Page = () => (
    <Suspense fallback={<div className="ck-load-block" style={{ padding: 24 }}><span className="ck-spinner" /><span>Loading connection…</span></div>}>
        <ConnectionDetail />
    </Suspense>
);

export default Page;
