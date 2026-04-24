'use client'
import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance';
import './unassigned-leads.css';

function formatDuration(s) {
    const n = Number(s) || 0;
    const m = Math.floor(n / 60);
    return `${m}:${String(n % 60).padStart(2, '0')}`;
}

function formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString();
}

export default function UnassignedLeads() {
    const [leads, setLeads] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState({});

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [leadsRes, clientsRes] = await Promise.all([
                axiosInstance.get('/api/metrics/calls/unassigned', { params: { limit: 100 } }),
                axiosInstance.get('/client-portal').catch(() => ({ data: { data: [] } })),
            ]);
            setLeads(leadsRes.data || []);
            setClients(clientsRes.data?.data || clientsRes.data || []);
        } catch (e) {
            console.error('unassigned load failed', e);
            toast.error('Failed to load unassigned leads');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const assign = async (callId, clientId) => {
        if (!clientId) return;
        setAssigning(prev => ({ ...prev, [callId]: true }));
        try {
            await axiosInstance.patch(`/api/calls/${callId}/assign`, { client_id: clientId });
            toast.success('Call assigned to client');
            setLeads(prev => prev.filter(l => l.id !== callId));
        } catch (e) {
            console.error('assign failed', e);
            toast.error('Failed to assign');
        } finally {
            setAssigning(prev => ({ ...prev, [callId]: false }));
        }
    };

    return (
        <div className="unassigned-container">
            <div className="unassigned-header">
                <div>
                    <h1 className="unassigned-title">Unassigned Leads</h1>
                    <p className="unassigned-subtitle">
                        Calls whose phone number didn&apos;t match an existing client. Assign them or create a new client.
                    </p>
                </div>
                <button className="unassigned-refresh" onClick={load}>Refresh</button>
            </div>

            {loading && <div className="unassigned-empty">Loading…</div>}
            {!loading && leads.length === 0 && (
                <div className="unassigned-empty">
                    No unassigned leads. Every recent call is matched to a client.
                </div>
            )}

            <div className="unassigned-list">
                {leads.map(lead => (
                    <div key={lead.id} className="unassigned-row">
                        <div className="unassigned-cell">
                            <div className="unassigned-time">{formatDateTime(lead.started_at)}</div>
                            <span className={`source-chip ${lead.source === 'ringcentral' ? 'chip-rc' : 'chip-ctm'}`}>
                                {lead.source}
                            </span>
                        </div>
                        <div className="unassigned-cell">
                            <div className="unassigned-name">{lead.caller_name || 'Unknown caller'}</div>
                            <div className="unassigned-phone">{lead.caller_number || '—'}</div>
                        </div>
                        <div className="unassigned-cell">
                            <div>{lead.direction} · {lead.status}</div>
                            <div className="unassigned-meta">
                                {formatDuration(lead.duration_seconds)}
                                {lead.tracking_source ? ` · ${lead.tracking_source}` : ''}
                            </div>
                        </div>
                        <div className="unassigned-cell">
                            <select
                                className="unassigned-select"
                                disabled={assigning[lead.id]}
                                defaultValue=""
                                onChange={(e) => assign(lead.id, e.target.value)}
                            >
                                <option value="" disabled>Assign to client…</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {(c.first_name || '') + ' ' + (c.last_name || '')} — {c.phone}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
