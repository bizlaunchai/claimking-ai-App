import { Suspense } from 'react';
import RateBook from './RateBook.jsx';

export const metadata = {
    title: 'Rate Book · ClaimKing.AI',
    description: 'Train AI on your own pricing — upload prior estimates or enter rates manually.',
};

const Page = () => {
    return (
        <Suspense fallback={<div className="ck-load-block"><span className="ck-spinner" /><span>Loading rate book…</span></div>}>
            <RateBook />
        </Suspense>
    );
};

export default Page;
