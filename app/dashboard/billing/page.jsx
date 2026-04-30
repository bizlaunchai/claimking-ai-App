
import { Suspense } from 'react';

import { Loader2 } from 'lucide-react';
import Billing from "@/app/dashboard/billing/Billing.jsx";

export const metadata = {
  title: "Billing | ClaimKing AI",
  description: "Manage your subscription and credits."
};

export default function BillingPage() {
  return (
      <Suspense fallback={
        <div style={{ padding: 40, display: 'flex', justifyContent: 'center', minHeight: '100vh' }}>
          <Loader2 size={28} className="animate-spin" style={{ color: '#4f46e5' }} />
        </div>
      }>
        <Billing />
      </Suspense>
  );
}