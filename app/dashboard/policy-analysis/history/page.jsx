import { Suspense } from "react";
import PolicyAnalysisHistory from "./PolicyAnalysisHistory.jsx";

export const metadata = {
    title: "Policy Analysis · History | ClaimKing AI",
    description: "",
};

const Page = () => (
    <Suspense fallback={<div className="ck-load-block"><span className="ck-spinner" /><span>Loading…</span></div>}>
        <PolicyAnalysisHistory />
    </Suspense>
);

export default Page;