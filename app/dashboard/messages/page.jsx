import { Suspense } from 'react';
import Messages from './Messages.jsx';

export const metadata = {
    title: 'Messages · ClaimKing.AI',
    description: 'Every client conversation from the portal in one inbox.',
};

const Page = () => (
    <Suspense fallback={<div className="ck-load-block"><span className="ck-spinner" /><span>Loading messages…</span></div>}>
        <Messages />
    </Suspense>
);

export default Page;
