import { Suspense } from 'react';
import Schedule from './Schedule.jsx';

export const metadata = {
    title: 'Scheduling | ClaimKing AI',
    description: 'Company calendar — estimates, inspections, adjuster meetings, installs and follow-ups',
};

export default function Page() {
    return (
        <Suspense fallback={null}>
            <Schedule />
        </Suspense>
    );
}
