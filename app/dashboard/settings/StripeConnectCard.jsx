'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, CheckCircle2, AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance';

/**
 * Stripe Connect (Standard) card for Settings → Payments.
 *
 * Connecting is OPTIONAL and never blocks onboarding — a contractor can connect
 * anytime. Once connected + charges-enabled, client CARD deposits are charged
 * directly on the contractor's OWN Stripe account (money lands in their balance).
 * Until then, manual/offline deposits still work.
 */
export default function StripeConnectCard() {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await axiosInstance.get('/stripe-connect/status', { suppressErrorToast: true });
            setStatus(r.data?.data ?? null);
        } catch { /* leave null */ } finally { setLoading(false); }
    }, []);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const r = await axiosInstance.post('/stripe-connect/refresh', {}, { suppressErrorToast: true });
            setStatus(r.data?.data ?? null);
        } catch { await load(); } finally { setLoading(false); }
    }, [load]);

    useEffect(() => {
        // Returning from Stripe-hosted onboarding → re-read the live status.
        const p = new URLSearchParams(window.location.search);
        const flag = p.get('stripe');
        if (flag === 'return' || flag === 'refresh') {
            refresh();
            p.delete('stripe');
            const q = p.toString();
            window.history.replaceState({}, '', window.location.pathname + (q ? `?${q}` : ''));
        } else {
            load();
        }
    }, [load, refresh]);

    const connect = async () => {
        setWorking(true);
        try {
            const r = await axiosInstance.post('/stripe-connect/onboard');
            const url = r.data?.url;
            if (url) window.location.href = url;
            else toast.error('Could not start Stripe onboarding — try again.');
        } catch { /* toasted */ } finally { setWorking(false); }
    };

    const disconnect = async () => {
        if (!window.confirm(
            'Disconnect your Stripe account? New card deposits will be paused until you reconnect. ' +
            'This does NOT delete your Stripe account.',
        )) return;
        setWorking(true);
        try {
            const r = await axiosInstance.post('/stripe-connect/disconnect');
            setStatus(r.data?.data ?? null);
            toast.success('Stripe disconnected');
        } catch { /* toasted */ } finally { setWorking(false); }
    };

    const connected = !!status?.connected;
    const ready = connected && status?.charges_enabled;
    const incomplete = connected && !status?.charges_enabled;

    const badge = loading
        ? { text: 'Checking…', bg: '#f3f4f6', fg: '#6b7280' }
        : ready
            ? { text: 'Connected · ready', bg: '#ecfdf5', fg: '#047857' }
            : incomplete
                ? { text: 'Setup incomplete', bg: '#fffbeb', fg: '#b45309' }
                : { text: 'Not connected', bg: '#fef2f2', fg: '#b91c1c' };

    return (
        <div style={{
            border: '1px solid #e5e7eb', borderRadius: 12, padding: 18, marginBottom: 18,
            background: '#fff',
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                <div style={{
                    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                    background: '#635bff15', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <CreditCard size={22} color="#635bff" />
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Stripe — Client Deposits</span>
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px',
                            borderRadius: 999, fontSize: 11.5, fontWeight: 700,
                            background: badge.bg, color: badge.fg,
                        }}>
                            {ready ? <CheckCircle2 size={12} /> : incomplete ? <AlertTriangle size={12} /> : null}
                            {badge.text}
                        </span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
                        Connect your own Stripe account so client card deposits land <strong>directly in your balance</strong>.
                        The monthly ClaimKing subscription is billed separately — this only affects deposits you collect from clients.
                        {' '}Connecting is optional; you can also record manual/offline deposits anytime.
                    </p>

                    {incomplete && !loading && (
                        <div style={{
                            marginTop: 10, padding: '8px 12px', borderRadius: 8, fontSize: 12.5,
                            background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e',
                        }}>
                            Your Stripe onboarding isn’t finished, so we can’t accept card deposits yet. Click <strong>Finish setup</strong> to complete it.
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                        {!connected && (
                            <button onClick={connect} disabled={working || loading} style={btnPrimary}>
                                {working ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                                {working ? 'Starting…' : 'Connect Stripe'}
                            </button>
                        )}
                        {incomplete && (
                            <button onClick={connect} disabled={working || loading} style={btnPrimary}>
                                {working ? <Loader2 size={14} /> : <ExternalLink size={14} />}
                                {working ? 'Opening…' : 'Finish setup'}
                            </button>
                        )}
                        {connected && (
                            <button onClick={refresh} disabled={loading} style={btnGhost}>
                                Refresh status
                            </button>
                        )}
                        {connected && (
                            <button onClick={disconnect} disabled={working} style={btnDanger}>
                                Disconnect
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const btnBase = {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
    borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid transparent',
};
const btnPrimary = { ...btnBase, background: '#635bff', color: '#fff' };
const btnGhost = { ...btnBase, background: '#fff', color: '#374151', border: '1px solid #d1d5db' };
const btnDanger = { ...btnBase, background: '#fff', color: '#dc2626', border: '1px solid #fecaca' };
