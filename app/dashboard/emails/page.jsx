import { Suspense } from 'react';
import EmailAssistant from "@/app/dashboard/emails/EmailAssistant.jsx";

export const metadata = {
    title: "Email Assistant | ClaimKing AI",
    description: "",
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
};

const EmailAssistantLoading = () => (
    <div style={{ padding: '20px', textAlign: 'center' }}>
        Loading email assistant...
    </div>
);

const Page = () => {
    return (
        <Suspense fallback={<EmailAssistantLoading />}>
            <EmailAssistant />
        </Suspense>
    );
};

export default Page;