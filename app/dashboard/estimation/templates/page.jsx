import { Suspense } from 'react';
import Templates from './Templates.jsx';

export const metadata = {
    title: 'Templates & Bundles · ClaimKing.AI',
    description: 'Save common estimate scopes and item bundles for one-click reuse.',
};

const Page = () => (
    <Suspense fallback={<div className="ck-load-block"><span className="ck-spinner" /><span>Loading templates…</span></div>}>
        <Templates />
    </Suspense>
);

export default Page;
