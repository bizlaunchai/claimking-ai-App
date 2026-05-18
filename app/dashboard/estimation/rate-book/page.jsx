import { Suspense } from 'react';
import RateBook from './RateBook.jsx';

export const metadata = {
    title: 'Rate Book · ClaimKing.AI',
    description: 'Train AI on your own pricing — upload prior estimates or enter rates manually.',
};

const Page = () => {
    return (
        <Suspense fallback={<div style={{ padding: 24, color: '#6b7280' }}>Loading rate book…</div>}>
            <RateBook />
        </Suspense>
    );
};

export default Page;
