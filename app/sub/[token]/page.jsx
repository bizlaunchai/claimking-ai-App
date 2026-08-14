import SubPortal from './SubPortal.jsx';

export const metadata = {
    title: 'Contractor Portal | ClaimKing AI',
    robots: { index: false, follow: false },
};

export default async function Page({ params }) {
    const { token } = await params;
    return <SubPortal token={token} />;
}
