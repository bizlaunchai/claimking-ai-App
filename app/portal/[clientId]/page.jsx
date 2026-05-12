import PortalPolicyAnalyses from "./PortalPolicyAnalyses.jsx";

export const metadata = {
    title: "Your Policy Analyses | ClaimKing",
    description: "",
};

const Page = ({ params, searchParams }) => (
    <PortalPolicyAnalyses
        clientId={params.clientId}
        analysisId={searchParams?.analysis}
    />
);

export default Page;
