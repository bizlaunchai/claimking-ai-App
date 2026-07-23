import { Suspense } from 'react';
import Messages from './Messages.jsx';

export const metadata = {
    title: 'Messages · ClaimKing.AI',
    description: 'Every client conversation from the portal in one inbox.',
};

const Page = () => (
    <Suspense fallback={<div style={{ padding: 24, color: '#6b7280' }}>Loading messages…</div>}>
        <Messages />
    </Suspense>
);

export default Page;
