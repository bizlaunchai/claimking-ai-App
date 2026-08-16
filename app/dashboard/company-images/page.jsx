import { Suspense } from 'react';
import CompanyImages from './CompanyImages.jsx';

export const metadata = {
    title: 'Company Images | ClaimKing AI',
    description: 'Every job & appointment photo — AI notes, approval, and client-portal posting',
};

export default function Page() {
    return (
        <Suspense fallback={null}>
            <CompanyImages />
        </Suspense>
    );
}
