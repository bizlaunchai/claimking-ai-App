import { Suspense } from "react";
import PolicyAnalysisHistory from "./PolicyAnalysisHistory.jsx";

export const metadata = {
    title: "Policy Analysis · History | ClaimKing AI",
    description: "",
};

const Page = () => (
    <Suspense fallback={<div>Loading...</div>}>
        <PolicyAnalysisHistory />
    </Suspense>
);

export default Page;