'use client';

// QA Q2.12 — shared hook for the company's active trade types.
// Feeds every authed trade picker (sub management, job dispatch). Falls back to
// the built-in six until the API responds, so pickers are never empty.

import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '@/lib/axiosInstance';

export const DEFAULT_TRADES = [
    { key: 'roofing', label: 'Roofing' },
    { key: 'gutters', label: 'Gutters' },
    { key: 'siding', label: 'Siding' },
    { key: 'windows', label: 'Windows' },
    { key: 'painting', label: 'Painting' },
    { key: 'general', label: 'General' },
];

export function useCompanyTrades() {
    const [trades, setTrades] = useState(DEFAULT_TRADES);

    const reload = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/company-trades', { suppressErrorToast: true });
            const list = res.data?.data;
            if (Array.isArray(list) && list.length) {
                setTrades(list.map((t) => ({ key: t.key, label: t.label })));
            }
        } catch { /* keep fallback */ }
    }, []);

    useEffect(() => { reload(); }, [reload]);

    return { trades, reload };
}
