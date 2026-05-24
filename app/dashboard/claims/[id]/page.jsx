import { Suspense } from 'react';
import ClaimDetail from './ClaimDetail';

export default async function ClaimDetailPage({ params }) {
    const { id } = await params;
    return (
        <Suspense fallback={<div style={{ padding: '2rem' }}>Loading claim…</div>}>
            <ClaimDetail id={id} />
        </Suspense>
    );
}
