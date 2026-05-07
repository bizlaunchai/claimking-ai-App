import { Suspense } from "react";
import Estimation from "@/app/dashboard/estimation/Estimation.jsx";

export const metadata = {
    title: "Estimation | ClaimKing AI",
    description: ""
};

// Suspense boundary required because <Estimation/> uses next/navigation's
// useSearchParams (for the measurement_id handoff). Without it the App
// Router refuses to statically prerender this route.
const Page = () => {
    return (
        <Suspense fallback={null}>
            <Estimation/>
        </Suspense>
    );
};

export default Page;
