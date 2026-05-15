import { Suspense } from "react";
import Payments from "@/app/dashboard/payments/Payments.jsx";

export const metadata = {
    title: "Payments | ClaimKing AI",
    description: ""
};

const Page = () => {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Payments />
        </Suspense>
    );
};

export default Page;