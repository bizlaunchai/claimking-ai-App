import { Suspense } from 'react';
import ClaimDetail from './ClaimDetail';

export default async function ClaimDetailPage({ params }) {
    const { id } = await params;
    return (
        <Suspense fallback={<div className="ck-load-block"><span className="ck-spinner" /><span>Loading claim…</span></div>}>
            <ClaimDetail id={id} />
        </Suspense>
    );
}
