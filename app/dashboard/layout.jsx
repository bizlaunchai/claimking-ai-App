import { Suspense } from "react";
import DashboardLayoutClient from "./DashboardLayoutClient";

export default function DashboardLayout({ children }) {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
            <DashboardLayoutClient>
                {children}
            </DashboardLayoutClient>
        </Suspense>
    );
}