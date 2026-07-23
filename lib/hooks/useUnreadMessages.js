'use client';

import { useEffect, useState } from 'react';
import axiosInstance from '@/lib/axiosInstance';
import { createClient } from '@/lib/supabase/client';

/**
 * Shared unread-message counter for the Messages inbox.
 *
 * Several components need the same number at once (sidebar nav badge +
 * notification bell), so the fetch, the Supabase realtime channel and the
 * polling fallback live in ONE module-level store. Every `useUnreadMessages()`
 * caller subscribes to it — one network request and one channel regardless of
 * how many components mount.
 *
 * Realtime is best-effort: if `portal_messages` isn't in the `supabase_realtime`
 * publication the subscription simply never fires and the 60s poll keeps the
 * badge fresh. Nothing breaks either way.
 */

const POLL_INTERVAL_MS = 60_000;   // safety net when realtime is unavailable
const REALTIME_DEBOUNCE_MS = 800;  // collapse bursts of inserts into one fetch

let state = { unreadThreads: 0, unreadMessages: 0, loaded: false };
const subscribers = new Set();

let supabase = null;
let channel = null;
let pollId = null;
let debounceId = null;
let inFlight = null;

function emit() {
    subscribers.forEach((fn) => fn(state));
}

async function fetchCount() {
    // Collapse concurrent callers onto one request.
    if (inFlight) return inFlight;
    inFlight = (async () => {
        try {
            const { data } = await axiosInstance.get('/messages/unread-count', {
                suppressErrorToast: true,
            });
            state = {
                unreadThreads: Number(data?.unread_threads) || 0,
                unreadMessages: Number(data?.unread_messages) || 0,
                loaded: true,
            };
        } catch {
            // 403 (no permission) / offline / backend down — keep the last known
            // value and just mark it loaded so the badge stops flickering.
            state = { ...state, loaded: true };
        } finally {
            inFlight = null;
            emit();
        }
    })();
    return inFlight;
}

/** Force a refresh — call after marking things read so the badge updates now. */
export function refreshUnreadMessages() {
    return fetchCount();
}

function start() {
    if (pollId || channel) return;

    pollId = setInterval(() => fetchCount(), POLL_INTERVAL_MS);

    try {
        supabase = createClient();
        channel = supabase
            .channel('messages-unread')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'portal_messages' },
                () => {
                    clearTimeout(debounceId);
                    debounceId = setTimeout(fetchCount, REALTIME_DEBOUNCE_MS);
                },
            )
            .subscribe();
    } catch {
        // Realtime unavailable — the poll above still covers us.
        channel = null;
    }
}

function stop() {
    clearInterval(pollId);
    pollId = null;
    clearTimeout(debounceId);
    debounceId = null;
    if (channel && supabase) {
        try { supabase.removeChannel(channel); } catch { /* already gone */ }
    }
    channel = null;
}

/**
 * @returns {{ unreadThreads: number, unreadMessages: number, loaded: boolean }}
 */
export function useUnreadMessages() {
    const [snapshot, setSnapshot] = useState(state);

    useEffect(() => {
        subscribers.add(setSnapshot);
        if (subscribers.size === 1) start();

        // Adopt whatever the store already knows, then refresh.
        setSnapshot(state);
        fetchCount();

        return () => {
            subscribers.delete(setSnapshot);
            if (subscribers.size === 0) stop();
        };
    }, []);

    return snapshot;
}
