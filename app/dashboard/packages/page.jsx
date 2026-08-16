import { Suspense } from 'react';
import Packages from './Packages.jsx';

export const metadata = {
    title: 'Packages & Memberships | ClaimKing AI',
    description: 'Sellable inspection packages, memberships and gift certificates',
};

export default function Page() {
    return (
        <Suspense fallback={null}>
            <Packages />
        </Suspense>
    );
}
