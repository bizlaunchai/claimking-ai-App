import { Suspense } from "react";
import AdminPlans from './AdminPlans.jsx';

export const metadata = {
    title: "Admin Plans | ClaimKing AI",
    description: ""
};

export default function Page() {
    return (
        <Suspense fallback={<div className="ck-load-block"><span className="ck-spinner" /><span>Loading…</span></div>}>
            <AdminPlans />
        </Suspense>
    );
}