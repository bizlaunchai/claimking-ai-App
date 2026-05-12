import { Suspense } from "react";
import PolicyAnalysis from "@/app/dashboard/policy-analysis/PolicyAnalysis.jsx";

export const metadata = {
    title: "Policy Analysis | ClaimKing AI",
    description: ""
};


const Page = () => {
    return (
        <Suspense fallback={null}>
            <PolicyAnalysis/>
        </Suspense>
    );
};

export default Page;