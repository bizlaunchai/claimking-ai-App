import { Suspense } from 'react';
import Templates from './Templates.jsx';

export const metadata = {
    title: 'Templates & Bundles · ClaimKing.AI',
    description: 'Save common estimate scopes and item bundles for one-click reuse.',
};

const Page = () => (
    <Suspense fallback={<div style={{ padding: 24, color: '#6b7280' }}>Loading templates…</div>}>
        <Templates />
    </Suspense>
);

export default Page;
