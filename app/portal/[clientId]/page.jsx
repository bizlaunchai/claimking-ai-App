import PortalPolicyAnalyses from "./PortalPolicyAnalyses.jsx";
import PortalEstimates from "./PortalEstimates.jsx";

export const metadata = {
    title: "Your Client Portal | ClaimKing",
    description: "",
};

const Page = ({ params, searchParams }) => {
    const clientId = params.clientId;
    const analysisId = searchParams?.analysis;
    const estimateId = searchParams?.estimate;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-5">
                <div className="max-w-3xl mx-auto">
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Your Client Portal
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Shared by your contractor on ClaimKing.
                    </p>
                </div>
            </header>
            <main className="max-w-3xl mx-auto px-6 py-6 space-y-8">
                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">
                        Your Estimates
                    </h2>
                    <PortalEstimates clientId={clientId} estimateId={estimateId} />
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">
                        Your Policy Analyses
                    </h2>
                    <PortalPolicyAnalyses
                        clientId={clientId}
                        analysisId={analysisId}
                        embedded
                    />
                </section>
            </main>
        </div>
    );
};

export default Page;
