import { Suspense } from 'react';
import ConnectionDetail from './ConnectionDetail.jsx';

export const metadata = {
    title: 'CRM connection · ClaimKing.AI',
};

const Page = () => (
    <Suspense fallback={<div style={{ padding: 24, color: '#6b7280' }}>Loading connection…</div>}>
        <ConnectionDetail />
    </Suspense>
);

export default Page;
