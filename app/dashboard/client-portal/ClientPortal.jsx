"use client"
import React, { useCallback, useEffect, useState } from 'react';
import "./clientPortal.css"
import dynamic from "next/dynamic.js";
import axiosInstance from "@/lib/axiosInstance";
import { toast } from "sonner";
import Can from "@/lib/permissions/Can";
import { createClient } from "@/lib/supabase/client";
import { refreshUnreadMessages } from "@/lib/hooks/useUnreadMessages";
import {
    CSV_COLUMN_NAMES,
    buildClientsCsv,
    csvFilename,
    downloadCsv,
} from "./clientCsv";
// CK-FIX Jul-22: the Add/Edit modals below used to hard-code their own state
// and carrier lists (10-11 states, 6 carriers). They now share the single
// source of truth in lib/clients so every entry point matches.
import {
    CLIENT_STATES,
    CLIENT_INSURANCE,
    carrierLabel,
} from "@/lib/clients/newClientForm";

const FileUploader = dynamic(
    () => import("@/utiles/FileUploader"),
    { ssr: false }
);

// 12-stage pipeline — kept in sync with sql/30_client_portals.sql
// (CHECK (claim_status BETWEEN 1 AND 12)) and backend STATUS_MAP.
// Patch _patch_client_portals_12_stages.sql remaps legacy 9-stage data.
const STATUS_MAP = {
    1:  '1. Need Claim Number',
    2:  '2. Awaiting Initial Inspection',
    3:  '3. Scheduled Inspection',
    4:  '4. In Progress',
    5:  '5. Tile Sample Required',
    6:  '6. Reinspection Requested',
    7:  '7. Partial Approval',
    8:  '8. Supplementing',
    9:  '9. Final Check Processing',
    10: '10. Completed',
    11: '11. Declined',
    12: '12. Cold Claims / Lost',
};

// Shorter labels for filter chips (where horizontal space is tight)
// CK-FIX Jul-22: per-company stage customization (rename + hide).
//
// Overrides are stored PER COMPANY on `companies.stage_overrides`
// (sql/70_company_stage_labels.sql) and served by
// GET/PUT /client-portal/stage-overrides. They used to live in localStorage,
// which meant a rename vanished on the next machine and teammates never saw it.
//
// Still a module-level cache read through `loadStageOverrides()`: `stageLabel()`
// is called from deep inside render paths that aren't components. The cache
// starts EMPTY so the server HTML and the first client render match — the fetch
// fills it and bumps a version counter to re-render.
let stageOverridesCache = { labels: {}, hidden: [] };
const setStageOverridesCache = (o) => {
    stageOverridesCache = {
        labels: o?.labels ?? {},
        hidden: Array.isArray(o?.hidden) ? o.hidden : [],
    };
    return stageOverridesCache;
};
const fetchStageOverrides = async () => {
    try {
        const res = await axiosInstance.get('/client-portal/stage-overrides', { suppressErrorToast: true });
        return setStageOverridesCache(res.data?.data);
    } catch {
        // A failed fetch just means the canonical labels are used.
        return stageOverridesCache;
    }
};
const loadStageOverrides = () => stageOverridesCache;
const stageLabel = (n) => {
    const o = loadStageOverrides();
    return (o.labels && o.labels[n]) || STATUS_MAP[n] || `Stage ${n}`;
};
const hiddenStages = () => {
    const o = loadStageOverrides();
    return new Set(o.hidden || []);
};

const statusOptions = [
    { value: 'all', label: 'All' },
    { value: '1',  label: '1. Need Claim #' },
    { value: '2',  label: '2. Awaiting Initial' },
    { value: '3',  label: '3. Scheduled' },
    { value: '4',  label: '4. In Progress' },
    { value: '5',  label: '5. Tile Sample' },
    { value: '6',  label: '6. Reinspection' },
    { value: '7',  label: '7. Partial' },
    { value: '8',  label: '8. Supplementing' },
    { value: '9',  label: '9. Final Check' },
    { value: '10', label: '10. Completed' },
    { value: '11', label: '11. Declined' },
    { value: '12', label: '12. Cold / Lost' },
];

// CSV import whitelist — mirrors CreateClientDto on the backend. Anything
// not listed here is dropped before POST, because the API validates with
// forbidNonWhitelisted and rejects the whole row on an unknown property.
const CSV_IMPORT_FIELDS = [
    'first_name', 'last_name', 'phone', 'email',
    'address', 'city', 'state', 'zip_code', 'property_type',
    'insurance_company', 'insurance_carrier', 'policy_number', 'claim_number',
    'damage_type', 'priority', 'date_of_loss',
    'adjuster_name', 'adjuster_email', 'adjuster_phone', 'notes',
];
const CSV_IMPORT_INT_FIELDS = ['claim_value', 'approved_amount', 'paid_amount'];

const sortOptions = [
    { value: 'recent', label: 'Most Recent Activity' },
    { value: 'created', label: 'Recently Created' },
    { value: 'alphabetical', label: 'Alphabetical' },
    { value: 'value', label: 'Claim Value' },
];

// CSS class for the colored status pill — reuses existing classes from
// clientPortal.css. New stages (Awaiting Initial / Tile Sample /
// Reinspection) get fresh visual buckets that don't collide with the
// terminal-state styling of Completed/Declined/Cold.
const getStatusClass = (statusNum) => {
    const map = {
        1:  'status-need-claim',
        2:  'status-scheduled',         // awaiting initial = scheduled-ish
        3:  'status-scheduled',
        4:  'status-in-progress',
        5:  'status-in-progress',       // tile sample = mid-pipeline
        6:  'status-in-progress',       // reinspection  = mid-pipeline
        7:  'status-partial',
        8:  'status-supplementing',
        9:  'status-final-check',
        10: 'status-completed',
        11: 'status-declined',
        12: 'status-cold',
    };
    return map[statusNum] ?? 'status-active';
};

const ClientPortal = () => {
    const [showAddClient, setShowAddClient] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [showStageManager, setShowStageManager] = useState(false); // CK-FIX Jul-22
    const [showExport, setShowExport] = useState(false);
    const [showPortalSettings, setShowPortalSettings] = useState(false);
    const [showTrash, setShowTrash] = useState(false);

    const [currentGridPage, setCurrentGridPage] = useState(1);
    const [currentListPage, setCurrentListPage] = useState(1);
    const [listItemsPerPage, setListItemsPerPage] = useState(50);
    const [currentFilter, setCurrentFilter] = useState('all');
    const [filteredClients, setFilteredClients] = useState([]);
    const [currentView, setCurrentView] = useState('grid');
    const [allClients, setAllClients] = useState([]);
    const [trashedClients, setTrashedClients] = useState([]);
    const [meta, setMeta] = useState({ total: 0, active: 0, completed: 0, total_value: 0 });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('recent');
    const [editingClient, setEditingClient] = useState(null);
    // Client whose portal share/manage modal is currently open. Null = no modal.
    const [shareTarget, setShareTarget] = useState(null);
    // Client whose two-way message thread is open in the messages modal.
    const [messagesTarget, setMessagesTarget] = useState(null);
    // { [client_portal_id]: unreadCount } — drives the badge on each card's
    // Messages button. Fetched separately from the client list so the list
    // endpoint's contract (shared with the Claims page) stays untouched.
    const [unreadByClient, setUnreadByClient] = useState({});

    const gridItemsPerPage = 9;

    const fetchClients = useCallback(async (status, search) => {
        try {
            setLoading(true);
            const params = {};
            if (status && status !== 'all') params.status = status;
            if (search) params.search = search;
            const res = await axiosInstance.get('/client-portal', { params });
            setAllClients(res.data.data);
            setFilteredClients(res.data.data);
            setMeta(res.data.meta);
        } catch {
            // axiosInstance handles toast
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchTrashed = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/client-portal/trash');
            setTrashedClients(res.data.data);
        } catch {
            // handled
        }
    }, []);

    const fetchUnread = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/messages/unread-by-thread', {
                suppressErrorToast: true,
            });
            setUnreadByClient(res.data?.counts ?? {});
        } catch {
            // Cosmetic only (403 for roles without portal access, offline, …) —
            // the page must never break because a badge could not load.
        }
    }, []);

    useEffect(() => {
        fetchClients(currentFilter, searchQuery);
        fetchUnread();
    }, []);

    // Keep the badges live: any change on portal_messages (new client message,
    // or a teammate reading one) refreshes the counts, debounced. Falls back to
    // "refresh on modal close" if realtime isn't enabled on the table.
    useEffect(() => {
        const supabase = createClient();
        let t;
        const channel = supabase
            .channel('client-portal-unread')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'portal_messages' },
                () => {
                    clearTimeout(t);
                    t = setTimeout(fetchUnread, 800);
                },
            )
            .subscribe();
        return () => {
            clearTimeout(t);
            supabase.removeChannel(channel);
        };
    }, [fetchUnread]);

    // Stage renames/hides come from the company row — fetch after mount and
    // re-render, so the server HTML and first client render stay identical.
    const [, setStageOverridesVersion] = useState(0);
    const bumpStageOverrides = useCallback(() => setStageOverridesVersion((v) => v + 1), []);
    useEffect(() => {
        let cancelled = false;
        fetchStageOverrides().then(() => { if (!cancelled) bumpStageOverrides(); });
        return () => { cancelled = true; };
    }, [bumpStageOverrides]);

    const filterByStatus = (status, event) => {
        event?.preventDefault();
        setCurrentFilter(status);
        setCurrentGridPage(1);
        setCurrentListPage(1);
        fetchClients(status, searchQuery);
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
        setCurrentGridPage(1);
        setCurrentListPage(1);
        fetchClients(currentFilter, query);
    };

    const sortClients = (by) => {
        setSortBy(by);
        let sorted = [...filteredClients];
        switch (by) {
            case 'alphabetical':
                sorted.sort((a, b) => a.full_name.localeCompare(b.full_name));
                break;
            case 'value':
                sorted.sort((a, b) => (b.claim_value ?? 0) - (a.claim_value ?? 0));
                break;
            case 'created':
                sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            default:
                sorted.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        }
        setFilteredClients(sorted);
        setCurrentListPage(1);
    };

    /**
     * Export clients to CSV.
     *
     * scope 'all'      → re-fetches /client-portal with NO status/search
     *                    params. The list on screen is already filtered, so
     *                    exporting from local state would silently ship a
     *                    partial file labelled "all".
     * scope 'filtered' → exactly the rows currently on screen (current
     *                    status chip + search + sort order).
     *
     * Trashed clients are excluded either way — the backend list endpoint
     * omits soft-deleted rows, and a trashed client in an "all clients"
     * export would be misleading.
     */
    const exportClients = async (scope) => {
        try {
            let rows;
            if (scope === 'all') {
                const res = await axiosInstance.get('/client-portal');
                rows = res.data?.data ?? [];
            } else {
                rows = filteredClients;
            }

            if (!rows.length) {
                toast.error('No clients to export.');
                return false;
            }

            // CK-FIX Jul-22: the Stage column follows the company's renamed
            // stages, so the sheet matches what the user sees on screen.
            const withStageLabels = rows.map((c) => ({
                ...c,
                status_label: stageLabel(c.claim_status),
            }));

            downloadCsv(buildClientsCsv(withStageLabels), csvFilename(scope));
            toast.success(
                `Exported ${rows.length} client${rows.length === 1 ? '' : 's'} to CSV.`,
            );
            return true;
        } catch {
            // axiosInstance toasts the network error; nothing downloaded.
            return false;
        }
    };

    const handleSoftDelete = async (id) => {
        if (!confirm('Move this client to trash?')) return;
        try {
            await axiosInstance.delete(`/client-portal/${id}`);
            toast.success('Client moved to trash');
            fetchClients(currentFilter, searchQuery);
        } catch {
            // handled
        }
    };

    const handleRestore = async (id) => {
        try {
            await axiosInstance.patch(`/client-portal/${id}/restore`);
            toast.success('Client restored');
            fetchTrashed();
            fetchClients(currentFilter, searchQuery);
        } catch {
            // handled
        }
    };

    const handlePermanentDelete = async (id) => {
        if (!confirm('Permanently delete this client? This cannot be undone.')) return;
        try {
            await axiosInstance.delete(`/client-portal/${id}/permanent`);
            toast.success('Client permanently deleted');
            fetchTrashed();
        } catch {
            // handled
        }
    };

    // Open the share/manage modal for a client. The modal itself talks to
    // /client-portal/:id/tokens to fetch (or create) the active token and
    // exposes copy / rotate / revoke actions.
    //
    // We deliberately DO NOT build a URL like `${origin}/portal/${client.id}`
    // anymore — that was the legacy "client_id IS the token" model which is
    // guessable. The real token comes from the backend and is unguessable.
    const openShareModal = (client) => setShareTarget(client);

    const toggleView = (view) => {
        setCurrentView(view);
        if (view === 'list') setCurrentListPage(1);
    };

    const changeItemsPerPage = (value) => {
        setListItemsPerPage(parseInt(value));
        setCurrentListPage(1);
    };

    const previousPage = () => {
        if (currentListPage > 1) setCurrentListPage(currentListPage - 1);
    };

    const nextPage = () => {
        const totalPages = Math.ceil(filteredClients.length / listItemsPerPage);
        if (currentListPage < totalPages) setCurrentListPage(currentListPage + 1);
    };

    const goToPage = (page) => setCurrentListPage(page);
    const loadMoreClients = () => setCurrentGridPage(currentGridPage + 1);

    const displayedGridClients = filteredClients.slice(0, currentGridPage * gridItemsPerPage);
    const startIndex = (currentListPage - 1) * listItemsPerPage;
    const endIndex = startIndex + listItemsPerPage;
    const displayedListClients = filteredClients.slice(startIndex, endIndex);
    const totalListPages = Math.ceil(filteredClients.length / listItemsPerPage);
    const startItem = (currentListPage - 1) * listItemsPerPage + 1;
    const endItem = Math.min(currentListPage * listItemsPerPage, filteredClients.length);

    const generatePageNumbers = () => {
        const pages = [];
        let startPage = Math.max(1, currentListPage - 2);
        let endPage = Math.min(totalListPages, startPage + 4);
        if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

        if (startPage > 1) {
            pages.push(<button key={1} className="page-btn" onClick={() => goToPage(1)}>1</button>);
            if (startPage > 2) pages.push(<span key="dots1" style={{ padding: '0 0.5rem', color: '#6b7280' }}>...</span>);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button key={i} className={`page-btn ${i === currentListPage ? 'active' : ''}`} onClick={() => goToPage(i)}>
                    {i}
                </button>
            );
        }

        if (endPage < totalListPages) {
            if (endPage < totalListPages - 1) pages.push(<span key="dots2" style={{ padding: '0 0.5rem', color: '#6b7280' }}>...</span>);
            pages.push(<button key={totalListPages} className="page-btn" onClick={() => goToPage(totalListPages)}>{totalListPages}</button>);
        }

        return pages;
    };

    const ClientCard = ({ client }) => {
        const statusClass = getStatusClass(client.claim_status);
        const portalActive = ![1, 8].includes(client.claim_status);
        const hasUnread = (unreadByClient[client.id] ?? 0) > 0;

        return (
            <div className="client-card">
                <div className="card-header">
                    <div>
                        <div className="client-name">{client.full_name}</div>
                        <div className="claim-number">{client.claim_number || '—'}</div>
                    </div>
                    <div className="status-indicator">
                        <div className={`portal-indicator ${!portalActive ? 'inactive' : ''}`}></div>
                        <span className={`status-badge ${statusClass}`}>{stageLabel(client.claim_status)}</span>
                    </div>
                </div>

                <div className="client-details">
                    <div className="detail-item">
                        <svg className="detail-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <span>{client.address}, {client.city}, {client.state} {client.zip_code}</span>
                    </div>
                    <div className="detail-item">
                        <svg className="detail-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                        <span>{client.phone}</span>
                    </div>
                    <div className="detail-item">
                        <svg className="detail-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                            <path d="m22 7-10 5L2 7"></path>
                        </svg>
                        <span>{client.email}</span>
                    </div>
                </div>

                <div className="portal-stats">
                    <div className="stat-item">
                        <div className="stat-value">{client.documents_count ?? 0}</div>
                        <div className="stat-label">Documents</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">{carrierLabel(client.insurance_company)}</div>
                        <div className="stat-label">Insurance</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">${((client.claim_value ?? 0) / 1000).toFixed(0)}k</div>
                        <div className="stat-label">Claim Value</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">{client.progress ?? 0}%</div>
                        <div className="stat-label">Progress</div>
                    </div>
                </div>

                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${client.progress ?? 0}%` }}></div>
                </div>

                <div className="card-actions">
                    <button className="action-btn primary" onClick={() => openShareModal(client)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                        Share Link
                    </button>
                    <button
                        className={`action-btn${hasUnread ? ' has-unread' : ''}`}
                        onClick={() => setMessagesTarget(client)}
                        title={hasUnread
                            ? 'Unread messages from this client'
                            : 'Open message thread with this client'}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        Messages
                        {hasUnread && (
                            <span className="msg-unread-dot" aria-label="Unread messages" />
                        )}
                    </button>
                    <button className="action-btn" onClick={() => setEditingClient(client)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                    </button>
                    {/*<button className="action-btn" style={{ color: '#ef4444' }} onClick={() => handleSoftDelete(client.id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                            <path d="M10 11v6m4-6v6"></path>
                        </svg>
                        Delete
                    </button>*/}
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="client-portal-header-section">
                <div className="client-portal-header-content">
                    <div className="cp-header-left">
                        <h1 className="cp-page-title">Client Portal Management</h1>
                        <p className="cp-page-subtitle">Manage and share secure client access links</p>
                    </div>
                    <div className="cp-header-actions">
                        <Can permission="manage_portal_links">
                        <button className="btn btn-primary" onClick={() => setShowAddClient(true)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Add New Client
                        </button>
                        </Can>
                        <Can permission="manage_portal_links">
                        {/* CK-FIX Jul-22: stage rename/hide manager */}
                        <button className="btn btn-secondary" onClick={() => setShowStageManager(true)}>
                            Manage Stages
                        </button>
                        <button className="btn btn-secondary" onClick={() => setShowBulkImport(true)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                            Bulk Import
                        </button>
                        </Can>
                        <Can permission="manage_portal_links">
                        <button className="btn btn-secondary" onClick={() => setShowExport(true)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Export CSV
                        </button>
                        </Can>
                       {/* <button className="btn btn-outline" onClick={() => { setShowTrash(true); fetchTrashed(); }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                            </svg>
                            Trash
                        </button>*/}
                        <button className="btn btn-outline" onClick={() => setShowPortalSettings(true)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M12 1v6m0 6v6m4.22-13.22l4.24 4.24M1.54 12.5l4.24 4.24M18.36 18.36l-4.24-4.24M4.14 4.14l4.24 4.24"></path>
                            </svg>
                            Portal Settings
                        </button>
                    </div>
                </div>
            </div>

            <div className="client-portal-manager">
                <div className="search-filter-section">
                    <div className="search-bar-container">
                        <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                        </svg>
                        <input
                            type="text"
                            className="search-input-large"
                            placeholder="Search by client name, claim number, phone, or email..."
                            onKeyUp={(e) => handleSearch(e.target.value)}
                        />
                    </div>

                    <div className="filter-row">
                        <div className="filter-chips">
                            {statusOptions.filter(o => o.value === 'all' || !hiddenStages().has(parseInt(o.value))).map(option => option.value === 'all' ? option : { ...option, label: `${option.value}. ${stageLabel(parseInt(option.value)).replace(/^\d+\.\s*/, '')}` }).map(option => (
                                <button
                                    key={option.value}
                                    className={`filter-chip ${currentFilter === option.value ? 'active' : ''}`}
                                    onClick={(e) => filterByStatus(option.value, e)}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        <select className="sort-dropdown" onChange={(e) => sortClients(e.target.value)}>
                            {sortOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <span className="results-count">Showing {filteredClients.length} clients</span>
                    </div>
                </div>

                <div className="metrics-row">
                    <div className="metric-card">
                        <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #FDB813, #ffc947)' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a1f3a" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                        </div>
                        <div className="metric-content">
                            <div className="metric-label">Total Clients</div>
                            <div className="metric-value">{meta.total}</div>
                            <div className="metric-subtitle">{meta.active} active portals</div>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #dcfce7, #86efac)' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                            </svg>
                        </div>
                        <div className="metric-content">
                            <div className="metric-label">Active Claims</div>
                            <div className="metric-value">{meta.active}</div>
                            <div className="metric-subtitle">In various stages</div>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #dbeafe, #93c5fd)' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <div className="metric-content">
                            <div className="metric-label">Completed</div>
                            <div className="metric-value">{meta.completed}</div>
                            <div className="metric-subtitle">Claims closed</div>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #fef3c7, #fcd34d)' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                                <line x1="12" y1="1" x2="12" y2="23"></line>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                            </svg>
                        </div>
                        <div className="metric-content">
                            <div className="metric-label">Total Value</div>
                            <div className="metric-value">${((meta.total_value ?? 0) / 1000000).toFixed(1)}M</div>
                            <div className="metric-subtitle">Across all claims</div>
                        </div>
                    </div>
                </div>

                <div className="view-toggle-container">
                    <div className="view-controls-left">
                        <div className="view-toggle">
                            <button className={`view-btn ${currentView === 'grid' ? 'active' : ''}`} onClick={() => toggleView('grid')}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="7" height="7"></rect>
                                    <rect x="14" y="3" width="7" height="7"></rect>
                                    <rect x="14" y="14" width="7" height="7"></rect>
                                    <rect x="3" y="14" width="7" height="7"></rect>
                                </svg>
                                Grid View
                            </button>
                            <button className={`view-btn ${currentView === 'list' ? 'active' : ''}`} onClick={() => toggleView('list')}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="8" y1="6" x2="21" y2="6"></line>
                                    <line x1="8" y1="12" x2="21" y2="12"></line>
                                    <line x1="8" y1="18" x2="21" y2="18"></line>
                                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                                </svg>
                                List View
                            </button>
                        </div>

                        <div className={`pagination-controls ${currentView === 'list' ? 'active' : ''}`}>
                            <div className="items-per-page">
                                <label htmlFor="itemsPerPage">Show:</label>
                                <select className="items-select" id="itemsPerPage" value={listItemsPerPage} onChange={(e) => changeItemsPerPage(e.target.value)}>
                                    <option value="10">10</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                </select>
                            </div>
                            <div className="pagination-info">
                                <span>{startItem}-{endItem} of {filteredClients.length}</span>
                            </div>
                            <div className="pagination-buttons">
                                <button className="page-btn" onClick={previousPage} disabled={currentListPage === 1}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="15 18 9 12 15 6"></polyline>
                                    </svg>
                                    Previous
                                </button>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>{generatePageNumbers()}</div>
                                <button className="page-btn" onClick={nextPage} disabled={currentListPage === totalListPages}>
                                    Next
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="9 18 15 12 9 6"></polyline>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>Loading clients...</div>
                ) : (
                    <>
                        <div className="clients-grid" style={{ display: currentView === 'grid' ? 'grid' : 'none' }}>
                            {displayedGridClients.map(client => (
                                <ClientCard key={client.id} client={client} />
                            ))}
                            {displayedGridClients.length === 0 && (
                                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                                    No clients found. Add your first client!
                                </div>
                            )}
                        </div>

                        <div className="show-more-container" style={{ display: currentView === 'grid' ? 'block' : 'none' }}>
                            {displayedGridClients.length < filteredClients.length && (
                                <button className="btn btn-outline" onClick={loadMoreClients}>Show More Clients</button>
                            )}
                            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                Showing <span>{displayedGridClients.length}</span> of <span>{filteredClients.length}</span> clients
                            </p>
                        </div>

                        <div className={`clients-list ${currentView === 'list' ? 'active' : ''}`}>
                            <div className="table-wrapper">
                                <table className="clients-table">
                                    <thead>
                                    <tr>
                                        <th>Client Name</th>
                                        <th>Claim #</th>
                                        <th>Property Address</th>
                                        <th>Phone</th>
                                        <th>Email</th>
                                        <th>Insurance</th>
                                        <th>Status</th>
                                        <th>Value</th>
                                        <th>Progress</th>
                                        <th>Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {displayedListClients.map(client => (
                                        <tr key={client.id}>
                                            <td><strong>{client.full_name}</strong></td>
                                            <td>{client.claim_number || '—'}</td>
                                            <td>{client.address}, {client.city}, {client.state}</td>
                                            <td>{client.phone}</td>
                                            <td>{client.email}</td>
                                            <td>{carrierLabel(client.insurance_company)}</td>
                                            <td><span className={`status-badge ${getStatusClass(client.claim_status)}`}>{stageLabel(client.claim_status)}</span></td>
                                            <td>${((client.claim_value ?? 0) / 1000).toFixed(0)}k</td>
                                            <td>{client.progress ?? 0}%</td>
                                            <td style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button className="action-btn" onClick={() => openShareModal(client)}>Share Link</button>
                                                <button
                                                    className={`action-btn${(unreadByClient[client.id] ?? 0) > 0 ? ' has-unread' : ''}`}
                                                    onClick={() => setMessagesTarget(client)}
                                                    title={(unreadByClient[client.id] ?? 0) > 0
                                                        ? 'Unread messages from this client'
                                                        : 'Open message thread with this client'}
                                                >
                                                    Messages
                                                    {(unreadByClient[client.id] ?? 0) > 0 && (
                                                        <span className="msg-unread-dot" aria-label="Unread messages" />
                                                    )}
                                                </button>
                                                <button className="action-btn" onClick={() => setEditingClient(client)}>Edit</button>
                                                {/*<button className="action-btn" style={{ color: '#ef4444' }} onClick={() => handleSoftDelete(client.id)}>Delete</button>*/}
                                            </td>
                                        </tr>
                                    ))}
                                    {displayedListClients.length === 0 && (
                                        <tr>
                                            <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>No clients found.</td>
                                        </tr>
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <AddClientModal
                isOpen={showAddClient}
                onClose={() => setShowAddClient(false)}
                onSaved={() => { setShowAddClient(false); fetchClients(currentFilter, searchQuery); }}
            />

            <EditClientModal
                client={editingClient}
                onClose={() => setEditingClient(null)}
                onSaved={() => { setEditingClient(null); fetchClients(currentFilter, searchQuery); }}
            />

            <SharePortalModal
                client={shareTarget}
                onClose={() => setShareTarget(null)}
            />

            <ClientMessagesModal
                client={messagesTarget}
                onClose={() => {
                    setMessagesTarget(null);
                    // The modal marks the thread read on open, so both this
                    // page's dots and the sidebar badge are now stale.
                    fetchUnread();
                    refreshUnreadMessages();
                }}
            />

            <StageManagerModal
                isOpen={showStageManager}
                onClose={() => setShowStageManager(false)}
                // Re-render the chips/dropdowns in place — the old version did
                // a full window.location.reload() to pick the renames up.
                onSaved={bumpStageOverrides}
            />
            <BulkImportModal
                isOpen={showBulkImport}
                onClose={() => setShowBulkImport(false)}
                onImported={() => fetchClients(currentFilter, searchQuery)}
            />

            <ExportClientsModal
                isOpen={showExport}
                onClose={() => setShowExport(false)}
                onExport={exportClients}
                totalCount={meta.total ?? 0}
                filteredCount={filteredClients.length}
                filterLabel={statusOptions.find(o => o.value === currentFilter)?.label ?? 'All'}
                hasSearch={Boolean(searchQuery)}
            />

            <TrashModal
                isOpen={showTrash}
                clients={trashedClients}
                onClose={() => setShowTrash(false)}
                onRestore={handleRestore}
                onPermanentDelete={handlePermanentDelete}
            />

            <PortalSettingsModal
                isOpen={showPortalSettings}
                onClose={() => setShowPortalSettings(false)}
            />
        </>
    );
};

const INITIAL_FORM = {
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    property_type: 'single-family',
    insurance_company: '',
    policy_number: '',
    claim_number: '',
    claim_status: '',
    notes: '',
    claim_value: '',
};

const validateClientForm = (data) => {
    const errors = {};

    if (!data.first_name?.trim()) errors.first_name = 'First name is required';
    else if (data.first_name.trim().length < 2) errors.first_name = 'First name must be at least 2 characters';

    if (!data.last_name?.trim()) errors.last_name = 'Last name is required';
    else if (data.last_name.trim().length < 2) errors.last_name = 'Last name must be at least 2 characters';

    if (!data.phone?.trim()) errors.phone = 'Phone number is required';
    else if (!/^\(\d{3}\)\s\d{3}-\d{4}$|^\d{10}$|^\+1\d{10}$/.test(data.phone.trim())) {
        errors.phone = 'Phone must be a valid US number e.g. (555) 123-4567';
    }

    if (!data.email?.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
        errors.email = 'Email must be a valid email address';
    }

    if (!data.address?.trim()) errors.address = 'Address is required';
    if (!data.city?.trim()) errors.city = 'City is required';
    if (!data.state?.trim()) errors.state = 'State is required';

    if (!data.zip_code?.trim()) errors.zip_code = 'ZIP code is required';
    else if (!/^\d{5}(-\d{4})?$/.test(data.zip_code.trim())) {
        errors.zip_code = 'ZIP code must be valid (e.g. 75201)';
    }

    // CK-FIX Jul-22: insurance company is optional now (free text).
    if (!data.claim_status) errors.claim_status = 'Claim status is required';

    return errors;
};

// CK-FIX Jul-22: suggestion list behind the free-text carrier input. Rendered
// once per modal — the `list="ck-insurance-carriers"` inputs bind to it by id.
const CarrierDatalist = () => (
    <datalist id="ck-insurance-carriers">
        {CLIENT_INSURANCE.map(([v, label]) => (
            <option key={v} value={label} />
        ))}
    </datalist>
);

const AddClientModal = ({ isOpen, onClose, onSaved }) => {
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        const validationErrors = validateClientForm(formData);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setSubmitting(true);
        try {
            await axiosInstance.post('/client-portal', {
                ...formData,
                claim_status: parseInt(formData.claim_status),
                claim_value: formData.claim_value ? parseInt(formData.claim_value) : 0,
                // Carrier is optional free text now — store NULL, not "", when
                // it's left blank. (On EDIT an empty string is meaningful: it
                // clears a value, so this only applies to create.)
                insurance_company: formData.insurance_company?.trim() || undefined,
            });
            toast.success('Client added successfully!');
            setFormData(INITIAL_FORM);
            setErrors({});
            onSaved();
        } catch (err) {
            const msg = err?.response?.data?.message;
            if (Array.isArray(msg)) {
                const fieldErrors = {};
                msg.forEach(m => {
                    const field = Object.keys(INITIAL_FORM).find(k => m.toLowerCase().includes(k.replace('_', ' ')));
                    if (field) fieldErrors[field] = m;
                });
                setErrors(fieldErrors);
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    // ── Tailwind class presets (kept here so each input doesn't repeat the
    //    20-char focus / transition strings). Mirrors the look of the old
    //    .modal-* / .form-* CSS exactly. ─────────────────────────────────
    const inputBase =
        "px-3.5 py-2.5 border rounded-md text-sm text-gray-700 bg-white transition-all " +
        "focus:outline-none focus:border-[#FDB813] focus:ring-2 focus:ring-[#FDB813]/10";
    const inputErr = "border-red-500 ring-2 ring-red-500/15";
    const inputOk = "border-gray-200";
    const inputCls = (hasErr) => `${inputBase} ${hasErr ? inputErr : inputOk}`;

    const selectBase =
        "px-3.5 py-2.5 border rounded-md text-sm bg-white cursor-pointer transition-all " +
        "focus:outline-none focus:border-[#FDB813] focus:ring-2 focus:ring-[#FDB813]/10";
    const selectCls = (hasErr) => `${selectBase} ${hasErr ? inputErr : inputOk}`;

    const labelBase = "text-sm font-medium text-gray-700";
    const labelReq = `${labelBase} after:content-['*'] after:ml-0.5 after:text-red-600`;
    const fieldErrCls = "block text-red-500 text-xs mt-1";
    const fieldGroup = "flex flex-col gap-1.5";
    const sectionTitle = "text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider";

    return (
        <div
            className="fixed inset-0 w-full h-full bg-black/50 z-[9999] flex items-center justify-center p-4"
        >
            <div
                className="bg-white rounded-xl max-w-[600px] w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
            >
                {/* Header */}
                <div className="px-6 py-6 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-800">Add New Client</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 border-0 bg-transparent cursor-pointer rounded-md flex items-center justify-center transition-all hover:bg-gray-100"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <form onSubmit={handleSubmit}>
                        {/* Client Information */}
                        <div className="mb-6">
                            <h3 className={sectionTitle}>Client Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className={fieldGroup}>
                                    <label className={labelReq}>First Name</label>
                                    <input type="text" className={inputCls(errors.first_name)} placeholder="John" name="first_name" value={formData.first_name} onChange={handleInputChange} />
                                    {errors.first_name && <span className={fieldErrCls}>{errors.first_name}</span>}
                                </div>
                                <div className={fieldGroup}>
                                    <label className={labelReq}>Last Name</label>
                                    <input type="text" className={inputCls(errors.last_name)} placeholder="Smith" name="last_name" value={formData.last_name} onChange={handleInputChange} />
                                    {errors.last_name && <span className={fieldErrCls}>{errors.last_name}</span>}
                                </div>
                                <div className={fieldGroup}>
                                    <label className={labelReq}>Phone Number</label>
                                    <input type="tel" className={inputCls(errors.phone)} placeholder="(555) 123-4567" name="phone" value={formData.phone} onChange={handleInputChange} />
                                    {errors.phone && <span className={fieldErrCls}>{errors.phone}</span>}
                                </div>
                                <div className={fieldGroup}>
                                    <label className={labelReq}>Email Address</label>
                                    <input type="email" className={inputCls(errors.email)} placeholder="john.smith@email.com" name="email" value={formData.email} onChange={handleInputChange} />
                                    {errors.email && <span className={fieldErrCls}>{errors.email}</span>}
                                </div>
                            </div>
                        </div>

                        {/* Property Information */}
                        <div className="mb-6">
                            <h3 className={sectionTitle}>Property Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className={`${fieldGroup} col-span-2`}>
                                    <label className={labelReq}>Property Address</label>
                                    <input type="text" className={inputCls(errors.address)} placeholder="123 Main Street" name="address" value={formData.address} onChange={handleInputChange} />
                                    {errors.address && <span className={fieldErrCls}>{errors.address}</span>}
                                </div>
                                <div className={fieldGroup}>
                                    <label className={labelReq}>City</label>
                                    <input type="text" className={inputCls(errors.city)} placeholder="Dallas" name="city" value={formData.city} onChange={handleInputChange} />
                                    {errors.city && <span className={fieldErrCls}>{errors.city}</span>}
                                </div>
                                <div className={fieldGroup}>
                                    <label className={labelReq}>State</label>
                                    <select className={selectCls(errors.state)} name="state" value={formData.state} onChange={handleInputChange}>
                                        <option value="">Select State</option>
                                        {CLIENT_STATES.map(([code, label]) => (
                                            <option key={code} value={code}>{label}</option>
                                        ))}
                                    </select>
                                    {errors.state && <span className={fieldErrCls}>{errors.state}</span>}
                                </div>
                                <div className={fieldGroup}>
                                    <label className={labelReq}>ZIP Code</label>
                                    <input type="text" className={inputCls(errors.zip_code)} placeholder="75201" name="zip_code" value={formData.zip_code} onChange={handleInputChange} />
                                    {errors.zip_code && <span className={fieldErrCls}>{errors.zip_code}</span>}
                                </div>
                                <div className={fieldGroup}>
                                    <label className={labelBase}>Property Type</label>
                                    <select className={selectCls(false)} name="property_type" value={formData.property_type} onChange={handleInputChange}>
                                        <option value="single-family">Single Family Home</option>
                                        <option value="multi-family">Multi-Family</option>
                                        <option value="commercial">Commercial</option>
                                        <option value="condo">Condo/Townhouse</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Insurance Information */}
                        <div className="mb-0">
                            <h3 className={sectionTitle}>Insurance Information</h3>
                            <CarrierDatalist />
                            <div className="grid grid-cols-2 gap-4">
                                <div className={fieldGroup}>
                                    <label className={labelBase}>Insurance Company</label>
                                    {/* CK-FIX Jul-22: typeable + optional */}
                                    <input type="text" list="ck-insurance-carriers" className={inputCls(errors.insurance_company)}
                                        placeholder="Type or pick a carrier (optional)"
                                        name="insurance_company" value={formData.insurance_company} onChange={handleInputChange} />
                                    {errors.insurance_company && <span className={fieldErrCls}>{errors.insurance_company}</span>}
                                </div>
                                <div className={fieldGroup}>
                                    <label className={labelBase}>Policy Number</label>
                                    <input type="text" className={inputCls(false)} placeholder="POL-123456" name="policy_number" value={formData.policy_number} onChange={handleInputChange} />
                                </div>
                                <div className={fieldGroup}>
                                    <label className={labelBase}>Claim Number</label>
                                    <input type="text" className={inputCls(false)} placeholder="CLM-2024-0001" name="claim_number" value={formData.claim_number} onChange={handleInputChange} />
                                </div>
                                <div className={fieldGroup}>
                                    <label className={labelReq}>Claim Status</label>
                                    <select className={selectCls(errors.claim_status)} name="claim_status" value={formData.claim_status} onChange={handleInputChange}>
                                        <option value="">Select Status</option>
                                        <option value="1">1. Need Claim #</option>
                                        <option value="2">2. Scheduled Inspection</option>
                                        <option value="3">3. In Progress</option>
                                        <option value="4">4. Partial Approval</option>
                                        <option value="5">5. Supplementing</option>
                                        <option value="6">6. Final Check Processing</option>
                                        <option value="7">7. Completed</option>
                                        <option value="8">8. Declined</option>
                                        <option value="9">9. Cold Claims</option>
                                    </select>
                                    {errors.claim_status && <span className={fieldErrCls}>{errors.claim_status}</span>}
                                </div>
                                <div className={fieldGroup}>
                                    <label className={labelBase}>Claim Value ($)</label>
                                    <input type="number" className={inputCls(false)} placeholder="50000" name="claim_value" value={formData.claim_value} onChange={handleInputChange} min="0" />
                                </div>
                                <div className={`${fieldGroup} col-span-2`}>
                                    <label className={labelBase}>Notes</label>
                                    <textarea
                                        className="px-3.5 py-2.5 border border-gray-200 rounded-md text-sm resize-y min-h-[100px] font-[inherit] focus:outline-none focus:border-[#FDB813] focus:ring-2 focus:ring-[#FDB813]/10"
                                        placeholder="Add any additional notes about this client..."
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-6 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="px-5 py-2.5 rounded-md text-sm font-semibold cursor-pointer transition-all inline-flex items-center gap-2 bg-white text-[#1a1f3a] border border-gray-200 hover:bg-gray-50 hover:border-[#FDB813] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-5 py-2.5 rounded-md text-sm font-semibold cursor-pointer transition-all border-0 inline-flex items-center gap-2 bg-gradient-to-br from-[#FDB813] to-[#d4a000] text-[#1a1f3a] shadow-[0_2px_8px_rgba(253,184,19,0.3)] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(253,184,19,0.4)] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {submitting ? 'Saving...' : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Save Client
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const EditClientModal = ({ client, onClose, onSaved }) => {
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (client) {
            setFormData({
                first_name: client.first_name ?? '',
                last_name: client.last_name ?? '',
                phone: client.phone ?? '',
                email: client.email ?? '',
                address: client.address ?? '',
                city: client.city ?? '',
                state: client.state ?? '',
                zip_code: client.zip_code ?? '',
                property_type: client.property_type ?? 'single-family',
                insurance_company: client.insurance_company ?? '',
                policy_number: client.policy_number ?? '',
                claim_number: client.claim_number ?? '',
                claim_status: String(client.claim_status ?? ''),
                notes: client.notes ?? '',
                claim_value: String(client.claim_value ?? ''),
            });
            setErrors({});
        }
    }, [client]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        const validationErrors = validateClientForm(formData);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setSubmitting(true);
        try {
            await axiosInstance.put(`/client-portal/${client.id}`, {
                ...formData,
                claim_status: parseInt(formData.claim_status),
                claim_value: formData.claim_value ? parseInt(formData.claim_value) : 0,
            });
            toast.success('Client updated successfully!');
            setErrors({});
            onSaved();
        } catch {
            // handled by interceptor
        } finally {
            setSubmitting(false);
        }
    };

    if (!client) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
                <div className="flex justify-between items-center px-6 py-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800">Edit Client</h2>
                    <button className="w-8 h-8 border-0 bg-transparent cursor-pointer rounded-md flex items-center justify-center text-gray-500 transition-all duration-200 hover:bg-gray-100" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="p-6">
                    <form onSubmit={handleSubmit}>
                        <div className="form-section">
                            <h3 className="section-title">Client Information</h3>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label required">First Name</label>
                                    <input type="text" className={`form-input ${errors.first_name ? 'input-error' : ''}`} name="first_name" value={formData.first_name} onChange={handleInputChange} />
                                    {errors.first_name && <span className="field-error">{errors.first_name}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">Last Name</label>
                                    <input type="text" className={`form-input ${errors.last_name ? 'input-error' : ''}`} name="last_name" value={formData.last_name} onChange={handleInputChange} />
                                    {errors.last_name && <span className="field-error">{errors.last_name}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">Phone Number</label>
                                    <input type="tel" className={`form-input ${errors.phone ? 'input-error' : ''}`} name="phone" value={formData.phone} onChange={handleInputChange} />
                                    {errors.phone && <span className="field-error">{errors.phone}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">Email Address</label>
                                    <input type="email" className={`form-input ${errors.email ? 'input-error' : ''}`} name="email" value={formData.email} onChange={handleInputChange} />
                                    {errors.email && <span className="field-error">{errors.email}</span>}
                                </div>
                            </div>
                        </div>

                        <div className="form-section">
                            <h3 className="section-title">Property Information</h3>
                            <div className="form-grid">
                                <div className="form-group full-width">
                                    <label className="form-label required">Property Address</label>
                                    <input type="text" className={`form-input ${errors.address ? 'input-error' : ''}`} name="address" value={formData.address} onChange={handleInputChange} />
                                    {errors.address && <span className="field-error">{errors.address}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">City</label>
                                    <input type="text" className={`form-input ${errors.city ? 'input-error' : ''}`} name="city" value={formData.city} onChange={handleInputChange} />
                                    {errors.city && <span className="field-error">{errors.city}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">State</label>
                                    <select className={`form-select ${errors.state ? 'input-error' : ''}`} name="state" value={formData.state} onChange={handleInputChange}>
                                        <option value="">Select State</option>
                                        {CLIENT_STATES.map(([code, label]) => (
                                            <option key={code} value={code}>{label}</option>
                                        ))}
                                    </select>
                                    {errors.state && <span className="field-error">{errors.state}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">ZIP Code</label>
                                    <input type="text" className={`form-input ${errors.zip_code ? 'input-error' : ''}`} name="zip_code" value={formData.zip_code} onChange={handleInputChange} />
                                    {errors.zip_code && <span className="field-error">{errors.zip_code}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Property Type</label>
                                    <select className="form-select" name="property_type" value={formData.property_type} onChange={handleInputChange}>
                                        <option value="single-family">Single Family Home</option>
                                        <option value="multi-family">Multi-Family</option>
                                        <option value="commercial">Commercial</option>
                                        <option value="condo">Condo/Townhouse</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="form-section">
                            <h3 className="section-title">Insurance Information</h3>
                            <CarrierDatalist />
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Insurance Company</label>
                                    {/* CK-FIX Jul-22: typeable + optional */}
                                    <input type="text" list="ck-insurance-carriers"
                                        className={`form-input ${errors.insurance_company ? 'input-error' : ''}`}
                                        placeholder="Type or pick a carrier (optional)"
                                        name="insurance_company" value={formData.insurance_company} onChange={handleInputChange} />
                                    {errors.insurance_company && <span className="field-error">{errors.insurance_company}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Policy Number</label>
                                    <input type="text" className="form-input" name="policy_number" value={formData.policy_number} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Claim Number</label>
                                    <input type="text" className="form-input" name="claim_number" value={formData.claim_number} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">Claim Status</label>
                                    <select className={`form-select ${errors.claim_status ? 'input-error' : ''}`} name="claim_status" value={formData.claim_status} onChange={handleInputChange}>
                                        <option value="">Select Status</option>
                                        <option value="1">1. Need Claim #</option>
                                        <option value="2">2. Scheduled Inspection</option>
                                        <option value="3">3. In Progress</option>
                                        <option value="4">4. Partial Approval</option>
                                        <option value="5">5. Supplementing</option>
                                        <option value="6">6. Final Check Processing</option>
                                        <option value="7">7. Completed</option>
                                        <option value="8">8. Declined</option>
                                        <option value="9">9. Cold Claims</option>
                                    </select>
                                    {errors.claim_status && <span className="field-error">{errors.claim_status}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Claim Value ($)</label>
                                    <input type="number" className="form-input" name="claim_value" value={formData.claim_value} onChange={handleInputChange} min="0" />
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label">Notes</label>
                                    <textarea className="form-textarea" name="notes" value={formData.notes} onChange={handleInputChange}></textarea>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                    <button className="btn btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? 'Saving...' : 'Update Client'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const TrashModal = ({ isOpen, clients, onClose, onRestore, onPermanentDelete }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl w-full max-w-[800px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
                <div className="flex justify-between items-center px-6 py-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800">Trash ({clients.length})</h2>
                    <button className="w-8 h-8 border-0 bg-transparent cursor-pointer rounded-md flex items-center justify-center text-gray-500 transition-all duration-200 hover:bg-gray-100" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div className="p-6">
                    {clients.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>Trash is empty</p>
                    ) : (
                        <div className="table-wrapper">
                            <table className="clients-table">
                                <thead>
                                <tr>
                                    <th>Client Name</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                    <th>Deleted At</th>
                                    <th>Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {clients.map(client => (
                                    <tr key={client.id}>
                                        <td><strong>{client.full_name}</strong></td>
                                        <td>{client.email}</td>
                                        <td><span className={`status-badge ${getStatusClass(client.claim_status)}`}>{stageLabel(client.claim_status)}</span></td>
                                        <td>{new Date(client.deleted_at).toLocaleDateString()}</td>
                                        <td style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="action-btn" style={{ color: '#16a34a' }} onClick={() => onRestore(client.id)}>Restore</button>
                                            <button className="action-btn" style={{ color: '#ef4444' }} onClick={() => onPermanentDelete(client.id)}>Delete Forever</button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                    <button className="btn btn-outline" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

/**
 * Export modal — the scope choice is the whole point of it.
 *
 * "Export CSV" straight from the toolbar would be ambiguous: the list is
 * almost always filtered by a stage chip or a search, so a one-click export
 * either quietly drops rows the user expected, or ignores a filter they
 * deliberately set. Two labelled options with live counts remove the guess.
 */
const ExportClientsModal = ({
    isOpen, onClose, onExport, totalCount, filteredCount, filterLabel, hasSearch,
}) => {
    const [scope, setScope] = useState('all');
    const [exporting, setExporting] = useState(false);
    const [showColumns, setShowColumns] = useState(false);

    if (!isOpen) return null;

    const isFiltered = filterLabel !== 'All' || hasSearch;
    const selectedCount = scope === 'all' ? totalCount : filteredCount;

    const handleExport = async () => {
        setExporting(true);
        try {
            const ok = await onExport(scope);
            if (ok) onClose();
        } finally {
            setExporting(false);
        }
    };

    const scopeOptions = [
        {
            value: 'all',
            title: 'All clients',
            count: totalCount,
            hint: 'Every client in your account, ignoring the filters below.',
        },
        {
            value: 'filtered',
            title: 'Current view only',
            count: filteredCount,
            hint: isFiltered
                ? `Matches ${filterLabel}${hasSearch ? ' + your search' : ''}, in the order shown.`
                : 'Same as the list on screen right now.',
        },
    ];

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
                <div className="flex justify-between items-center px-6 py-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800">Export Clients to CSV</h2>
                    <button
                        className="w-8 h-8 border-0 bg-transparent cursor-pointer rounded-md flex items-center justify-center text-gray-500 transition-all duration-200 hover:bg-gray-100"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="p-6">
                    <div className="form-section">
                        <h3 className="section-title">What to export</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {scopeOptions.map(opt => (
                                <label
                                    key={opt.value}
                                    style={{
                                        display: 'flex', alignItems: 'flex-start', gap: 12,
                                        padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                                        border: `1px solid ${scope === opt.value ? '#FDB813' : '#e5e7eb'}`,
                                        background: scope === opt.value ? '#fffbe7' : '#fff',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="exportScope"
                                        value={opt.value}
                                        checked={scope === opt.value}
                                        onChange={() => setScope(opt.value)}
                                        style={{ marginTop: 3, accentColor: '#FDB813' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                            <span style={{ fontWeight: 600, color: '#1a1f3a', fontSize: 14 }}>
                                                {opt.title}
                                            </span>
                                            <span style={{
                                                background: '#1a1f3a', color: '#fff', fontSize: 11, fontWeight: 700,
                                                padding: '2px 9px', borderRadius: 999, whiteSpace: 'nowrap',
                                            }}>
                                                {opt.count} {opt.count === 1 ? 'client' : 'clients'}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 3 }}>
                                            {opt.hint}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-section">
                        <h3 className="section-title">What's included</h3>
                        <p className="help-text" style={{ marginTop: 0 }}>
                            All {CSV_COLUMN_NAMES.length} fields per client — contact, property,
                            insurance, claim stage, adjuster, and amounts. Opens directly in
                            Excel, Numbers, or Google Sheets.
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowColumns(v => !v)}
                            style={{
                                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                                color: '#2563eb', fontSize: 12.5, fontWeight: 600,
                            }}
                        >
                            {showColumns ? 'Hide column list' : 'Show all columns'}
                        </button>
                        {showColumns && (
                            <div style={{
                                display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10,
                                padding: 12, background: '#f9fafb', borderRadius: 8,
                                border: '1px solid #e5e7eb',
                            }}>
                                {CSV_COLUMN_NAMES.map(name => (
                                    <span key={name} style={{
                                        fontSize: 11.5, color: '#374151', background: '#fff',
                                        border: '1px solid #e5e7eb', borderRadius: 6, padding: '3px 8px',
                                    }}>
                                        {name}
                                    </span>
                                ))}
                            </div>
                        )}
                        <p className="help-text" style={{ marginBottom: 0 }}>
                            Portal share links are never exported — those are access
                            credentials, not client data.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
                    <button className="btn btn-outline" onClick={onClose} disabled={exporting}>
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleExport}
                        disabled={exporting || selectedCount === 0}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        {exporting
                            ? 'Preparing…'
                            : `Download ${selectedCount} ${selectedCount === 1 ? 'client' : 'clients'}`}
                    </button>
                </div>
            </div>
        </div>
    );
};

// CK-FIX Jul-22: rename or hide pipeline stages. Saved locally now;
// TODO(backend): persist per company + reflect in client portal + emails.
// True add/remove needs the claim_status DB constraint widened (see handoff).
const StageManagerModal = ({ isOpen, onClose, onSaved }) => {
    const [overrides, setOverrides] = useState({ labels: {}, hidden: [] });
    const [saving, setSaving] = useState(false);
    // Re-fetch on open so two admins editing stages see each other's work.
    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        fetchStageOverrides().then((o) => {
            if (!cancelled) setOverrides({ labels: { ...(o.labels ?? {}) }, hidden: [...(o.hidden ?? [])] });
        });
        return () => { cancelled = true; };
    }, [isOpen]);
    const setLabel = (n, v) => setOverrides((o) => ({ ...o, labels: { ...(o.labels || {}), [n]: v } }));
    const toggleHidden = (n) => setOverrides((o) => {
        const h = new Set(o.hidden || []);
        h.has(n) ? h.delete(n) : h.add(n);
        return { ...o, hidden: [...h] };
    });
    const persist = async (payload, message) => {
        setSaving(true);
        try {
            const res = await axiosInstance.put('/client-portal/stage-overrides', payload);
            setStageOverridesCache(res.data?.data);
            setOverrides({
                labels: { ...(res.data?.data?.labels ?? {}) },
                hidden: [...(res.data?.data?.hidden ?? [])],
            });
            onSaved?.();
            toast.success(message);
            return true;
        } catch {
            return false;   // axios interceptor already surfaced the error
        } finally {
            setSaving(false);
        }
    };
    const save = async () => {
        if (await persist(overrides, 'Stages updated')) onClose();
    };
    const reset = () => persist({ labels: {}, hidden: [] }, 'Stages reset to defaults');
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
                <div className="flex justify-between items-center px-6 py-5 border-b border-gray-200">
                    <h2 className="text-lg font-bold text-gray-800">Manage Pipeline Stages</h2>
                    <button className="w-8 h-8 border-0 bg-transparent cursor-pointer text-2xl text-gray-500" onClick={onClose}>&times;</button>
                </div>
                <div className="p-6">
                    <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
                        Rename any stage or hide the ones you do not use. Hidden stages disappear from the filter bar but existing clients keep their status.
                    </p>
                    {Object.entries(STATUS_MAP).map(([num, def]) => {
                        const n = parseInt(num);
                        const hidden = (overrides.hidden || []).includes(n);
                        return (
                            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                <span style={{ width: 26, fontSize: 12.5, fontWeight: 700, color: '#6b7280' }}>{n}.</span>
                                <input
                                    type="text"
                                    value={(overrides.labels && overrides.labels[n]) ?? def.replace(/^\d+\.\s*/, '')}
                                    onChange={(e) => setLabel(n, e.target.value)}
                                    style={{ flex: 1, padding: '7px 10px', opacity: hidden ? 0.45 : 1 }}
                                />
                                <button type="button" onClick={() => toggleHidden(n)}
                                    style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, cursor: 'pointer', border: '1px solid #e5e7eb', background: hidden ? '#fee2e2' : '#fff', color: hidden ? '#dc2626' : '#374151', fontWeight: 600 }}>
                                    {hidden ? 'Hidden' : 'Hide'}
                                </button>
                            </div>
                        );
                    })}
                </div>
                <div className="p-6 border-t border-gray-200 flex justify-between gap-3">
                    <button className="btn btn-outline" onClick={reset} disabled={saving}>Reset Defaults</button>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
                        <button className="btn btn-primary" onClick={save} disabled={saving}>
                            {saving ? 'Saving…' : 'Save Stages'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const BulkImportModal = ({ isOpen, onClose, onImported }) => {
    // CK-FIX Jul-22: validateEmails removed per spec; invitations split
    // into independent email / text channels (either or both).
    const [importOptions, setImportOptions] = useState({
        inviteEmail: true,
        inviteText: false,
        skipDuplicates: true,
    });
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(null);
    const [files, setFiles] = useState([]);

    const handleOptionChange = (option) => {
        setImportOptions(prev => ({ ...prev, [option]: !prev[option] }));
    };

    const downloadTemplate = () => {
        const csvContent = `first_name,last_name,email,phone,address,city,state,zip_code,insurance_company,policy_number,claim_number,claim_status,claim_value,notes\nJohn,Smith,john@example.com,(214) 555-0001,123 Main St,Dallas,TX,75201,state-farm,POL-123456,CLM-2024-001,3,50000,Sample note`;
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'claimking-import-template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Template downloaded!');
    };

    // CK-FIX Jul-22: working CSV import (replaces "coming soon" stub)
    const parseCSV = (text) => {
        const rows = [];
        let cur = [''], inQ = false, row = cur;
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (inQ) {
                if (ch === '"' && text[i + 1] === '"') { row[row.length - 1] += '"'; i++; }
                else if (ch === '"') inQ = false;
                else row[row.length - 1] += ch;
            } else if (ch === '"') inQ = true;
            else if (ch === ',') row.push('');
            else if (ch === '\n' || ch === '\r') {
                if (row.length > 1 || row[0] !== '') { rows.push(row); }
                if (ch === '\r' && text[i + 1] === '\n') i++;
                row = ['']; rows.push; cur = row;
            } else row[row.length - 1] += ch;
        }
        if (row.length > 1 || row[0] !== '') rows.push(row);
        return rows;
    };

    const runImport = async () => {
        const f = files[0]?.file || files[0];
        if (!f) { toast.error('Upload a CSV file first'); return; }
        setImporting(true);
        try {
            const text = await f.text();
            const rows = parseCSV(text);
            if (rows.length < 2) { toast.error('CSV has no data rows'); return; }
            // Normalise headers so both the template ("first_name") and a
            // sheet exported from this page ("First Name") import cleanly.
            const headers = rows[0].map((h) =>
                h.trim().toLowerCase().replace(/﻿/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
            );
            const dataRows = rows.slice(1);
            let ok = 0, failed = 0, skipped = 0, inviteFailed = 0;
            // Errors are counted and summarised once at the end instead of
            // toasting per row — a 50-row import would otherwise bury the
            // result under 50 identical toasts.
            let firstRowError = null, firstInviteError = null;
            const seen = new Set();
            for (let i = 0; i < dataRows.length; i++) {
                setImportProgress(`Importing ${i + 1} / ${dataRows.length}...`);
                const rec = {};
                headers.forEach((h, hi) => { rec[h] = (dataRows[i][hi] || '').trim(); });
                if (!rec.first_name && !rec.last_name && !rec.email) { skipped++; continue; }
                const dupKey = (rec.email || `${rec.first_name}|${rec.last_name}|${rec.phone}`).toLowerCase();
                if (importOptions.skipDuplicates && seen.has(dupKey)) { skipped++; continue; }
                seen.add(dupKey);

                // Whitelist to the CreateClientDto fields. The API runs
                // forbidNonWhitelisted, so any stray CSV column (or an extra
                // flag) turns the whole row into a 400. Empty strings are
                // dropped too — "" fails @IsEmail/@Matches on optional fields.
                const payload = {};
                CSV_IMPORT_FIELDS.forEach((k) => { if (rec[k]) payload[k] = rec[k]; });
                CSV_IMPORT_INT_FIELDS.forEach((k) => {
                    const n = parseInt(rec[k]);
                    if (Number.isFinite(n)) payload[k] = Math.max(n, 0);
                });
                payload.claim_status = Math.min(Math.max(parseInt(rec.claim_status) || 1, 1), 12);

                // The create endpoint honors these directly now (one request
                // per row instead of a create + one call per channel).
                if (importOptions.inviteEmail && payload.email) payload.send_invitation_email = true;
                if (importOptions.inviteText && payload.phone) payload.send_invitation_sms = true;

                try {
                    const res = await axiosInstance.post('/client-portal', payload, { suppressErrorToast: true });
                    ok++;

                    // Invites are best-effort server-side: the client IS imported
                    // even when sending bounces (unverified SMTP domain, missing
                    // Twilio config, bad address), so a failed invite is reported
                    // separately from a failed row.
                    const invitations = res.data?.invitations;
                    if (invitations) {
                        for (const ch of ['email', 'sms']) {
                            if (invitations[ch] && !invitations[ch].sent) {
                                inviteFailed++;
                                firstInviteError = firstInviteError || invitations[ch].error;
                            }
                        }
                    }
                } catch (e) {
                    failed++;
                    firstRowError = firstRowError || e.userMessage;
                }
            }

            const summary = `${ok} added${skipped ? `, ${skipped} skipped` : ''}${failed ? `, ${failed} failed` : ''}`;
            if (failed) {
                toast.error(`Import finished — ${summary}`, {
                    description: firstRowError ? `First error: ${firstRowError}` : undefined,
                    duration: 10000,
                });
            } else {
                toast.success(`Import done — ${summary}`);
            }
            if (inviteFailed) {
                // Separate toast: these clients ARE in the system, only the
                // invite did not go out — the fix is a mail/SMS setting, not a re-import.
                toast.warning(`${inviteFailed} portal invitation${inviteFailed === 1 ? '' : 's'} could not be sent`, {
                    description: `${firstInviteError || 'Sending failed.'} — clients were imported; resend from each client's Share Portal button.`,
                    duration: 12000,
                });
            }
            // Refresh the list in place rather than reloading the page — a
            // reload wipes the toasts, and the failure / invite messages are
            // the whole point when something went wrong. On a clean run the
            // modal closes itself; otherwise it stays open so the summary can
            // be read next to the file that produced it.
            if (ok > 0) onImported?.();
            if (ok > 0 && !failed && !inviteFailed) onClose();
        } catch {
            toast.error('Could not read that CSV');
        } finally {
            setImporting(false);
            setImportProgress(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
                <div className="flex justify-between items-center px-6 py-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800">Bulk Import Clients</h2>
                    <button className="w-8 h-8 border-0 bg-transparent cursor-pointer rounded-md flex items-center justify-center text-gray-500 transition-all duration-200 hover:bg-gray-100" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div className="p-6">
                    <div className="form-section">
                        <h3 className="section-title">Upload CSV File</h3>
                        <FileUploader label='Click to upload or drag and drop' files={files} setFiles={setFiles} allowedExtensions={['.csv']} maxSizeMB={10} />
                        <p className="help-text">Columns: first_name, last_name, email, phone, address, city, state, zip_code, insurance_company, policy_number, claim_number, claim_status (1-12), claim_value, notes</p>
                    </div>
                    <div className="form-section">
                        <h3 className="section-title">Download Template</h3>
                        <button className="btn btn-outline" onClick={downloadTemplate}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Download CSV Template
                        </button>
                    </div>
                    <div className="form-section">
                        <h3 className="section-title">Import Options</h3>
                        {[
                            { key: 'inviteEmail', label: 'Send portal invitation by email' },
                            { key: 'inviteText', label: 'Send portal invitation by text (SMS)' },
                            { key: 'skipDuplicates', label: 'Skip duplicate entries' },
                        ].map(({ key, label }) => (
                            <div key={key} className="toggle-group">
                                <span className="toggle-label">{label}</span>
                                <label className="toggle-switch">
                                    <input type="checkbox" checked={importOptions[key]} onChange={() => handleOptionChange(key)} />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                    <button className="btn btn-outline" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" disabled={importing} onClick={runImport}>
                        {importing ? (importProgress || 'Importing...') : 'Start Import'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const PortalSettingsModal = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('general');
    const [settings, setSettings] = useState({
        enablePortal: true,
        requireEmailVerification: true,
        allowDocumentUploads: true,
        sessionTimeout: 30,
        companyName: 'ClaimKing.AI',
        portalTitle: 'Client Portal - ClaimKing.AI',
        welcomeMessage: 'Welcome to ClaimKing.AI Client Portal. Track your claim progress, upload documents, and communicate with your adjuster.',
        primaryColor: '#FDB813',
        secondaryColor: '#1a1f3a',
        viewClaimStatus: true,
        viewEstimates: true,
        uploadDocuments: true,
        downloadReports: true,
        sendMessages: true,
        view3DMockups: true,
        sendWelcomeEmail: true,
        notifyStatusChanges: true,
        notifyNewDocuments: true,
        weeklyUpdates: false,
        enableSMS: false,
        smsFromNumber: '',
    });

    const handleSettingChange = (setting, value) => {
        setSettings(prev => ({ ...prev, [setting]: value }));
    };

    if (!isOpen) return null;

    const tabs = ['general', 'branding', 'permissions', 'notifications'];

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
                <div className="flex justify-between items-center px-6 py-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800">Portal Settings</h2>
                    <button className="w-8 h-8 border-0 bg-transparent cursor-pointer rounded-md flex items-center justify-center text-gray-500 transition-all duration-200 hover:bg-gray-100" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div className="p-6">
                    <div className="settings-tabs">
                        {tabs.map(tab => (
                            <button key={tab} className={`settings-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'general' && (
                        <div className="settings-content">
                            <div className="form-section">
                                <h3 className="section-title">Portal Access</h3>
                                {[
                                    { key: 'enablePortal', label: 'Enable client portal access' },
                                    { key: 'requireEmailVerification', label: 'Require email verification' },
                                    { key: 'allowDocumentUploads', label: 'Allow document uploads' },
                                ].map(({ key, label }) => (
                                    <div key={key} className="toggle-group">
                                        <span className="toggle-label">{label}</span>
                                        <label className="toggle-switch">
                                            <input type="checkbox" checked={settings[key]} onChange={(e) => handleSettingChange(key, e.target.checked)} />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                ))}
                                <div className="form-group">
                                    <label className="form-label">Session timeout (minutes)</label>
                                    <input type="number" className="form-input" value={settings.sessionTimeout} min="5" max="1440" onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'branding' && (
                        <div className="settings-content">
                            <div className="form-section">
                                <h3 className="section-title">Company Branding</h3>
                                {[
                                    { key: 'companyName', label: 'Company Name', type: 'text' },
                                    { key: 'portalTitle', label: 'Portal Title', type: 'text' },
                                ].map(({ key, label, type }) => (
                                    <div key={key} className="form-group">
                                        <label className="form-label">{label}</label>
                                        <input type={type} className="form-input" value={settings[key]} onChange={(e) => handleSettingChange(key, e.target.value)} />
                                    </div>
                                ))}
                                <div className="form-group">
                                    <label className="form-label">Welcome Message</label>
                                    <textarea className="form-textarea" value={settings.welcomeMessage} onChange={(e) => handleSettingChange('welcomeMessage', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'permissions' && (
                        <div className="settings-content">
                            <div className="form-section">
                                <h3 className="section-title">Client Permissions</h3>
                                {[
                                    { key: 'viewClaimStatus', label: 'View claim status' },
                                    { key: 'viewEstimates', label: 'View estimates' },
                                    { key: 'uploadDocuments', label: 'Upload documents' },
                                    { key: 'downloadReports', label: 'Download reports' },
                                    { key: 'sendMessages', label: 'Send messages' },
                                    { key: 'view3DMockups', label: 'View 3D mockups' },
                                ].map(({ key, label }) => (
                                    <div key={key} className="toggle-group">
                                        <span className="toggle-label">{label}</span>
                                        <label className="toggle-switch">
                                            <input type="checkbox" checked={settings[key]} onChange={(e) => handleSettingChange(key, e.target.checked)} />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="settings-content">
                            <div className="form-section">
                                <h3 className="section-title">Email Notifications</h3>
                                {[
                                    { key: 'sendWelcomeEmail', label: 'Send welcome email on portal creation' },
                                    { key: 'notifyStatusChanges', label: 'Notify on status changes' },
                                    { key: 'notifyNewDocuments', label: 'Notify on new documents' },
                                    { key: 'weeklyUpdates', label: 'Send weekly progress updates' },
                                ].map(({ key, label }) => (
                                    <div key={key} className="toggle-group">
                                        <span className="toggle-label">{label}</span>
                                        <label className="toggle-switch">
                                            <input type="checkbox" checked={settings[key]} onChange={(e) => handleSettingChange(key, e.target.checked)} />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                    <button className="btn btn-outline" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={() => { toast.success('Settings saved!'); onClose(); }}>
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// SharePortalModal — issue / view / copy / rotate / revoke a portal token
// for a specific client. Opens from the Share Link button on each card.
//
// Flow on open:
//   1. GET /client-portal/:id/tokens/active — fast path, returns existing
//      active token if one was created at client-creation time.
//   2. If null (legacy clients without a token yet) the contractor clicks
//      "Generate Link" → POST /client-portal/:id/tokens which ensures one.
//
// Rotate: POST .../tokens/rotate. Old token invalidated atomically.
// Revoke: DELETE /client-portal/tokens/:tokenId. URL goes 404 immediately.
// ─────────────────────────────────────────────────────────────────────────────
const SharePortalModal = ({ client, onClose }) => {
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);

    React.useEffect(() => {
        if (!client) { setToken(null); return; }
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const { data } = await axiosInstance.get(
                    `/client-portal/${client.id}/tokens/active`,
                    { suppressErrorToast: true },
                );
                if (!cancelled) setToken(data ?? null);
            } catch {
                if (!cancelled) setToken(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [client]);

    if (!client) return null;

    // Build the public URL. In dev this resolves against the current origin
    // so the contractor can test the link locally before going live.
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const portalUrl = token?.token ? `${origin}/portal/${token.token}` : '';

    const generate = async () => {
        setBusy(true);
        try {
            const { data } = await axiosInstance.post(
                `/client-portal/${client.id}/tokens`,
            );
            setToken(data);
            toast.success('Portal link generated');
        } catch {
            // axiosInstance shows toast
        } finally {
            setBusy(false);
        }
    };

    const rotate = async () => {
        if (!confirm('Rotate this link? The old link will stop working immediately.')) return;
        setBusy(true);
        try {
            const { data } = await axiosInstance.post(
                `/client-portal/${client.id}/tokens/rotate`,
            );
            setToken(data);
            toast.success('New link issued. Old link is now invalid.');
        } catch {
            // handled
        } finally {
            setBusy(false);
        }
    };

    const revoke = async () => {
        if (!token) return;
        if (!confirm('Revoke this link? It will return 404 and you will need to generate a new one to share again.')) return;
        setBusy(true);
        try {
            await axiosInstance.delete(`/client-portal/tokens/${token.id}`);
            setToken(null);
            toast.success('Portal link revoked');
        } catch {
            // handled
        } finally {
            setBusy(false);
        }
    };

    const copy = async () => {
        if (!portalUrl) return;
        try {
            await navigator.clipboard.writeText(portalUrl);
            toast.success('Portal link copied to clipboard!');
        } catch {
            toast.error('Could not copy to clipboard');
        }
    };

    // Inline-style overlay + panel so we don't depend on .modal-overlay /
    // .modal CSS classes which behave inconsistently in this codebase
    // (they rendered inline at the bottom instead of as a centered overlay).
    // Pattern lifted from app/dashboard/admin/users/AdminUsers.jsx.
    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(17,24,39,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1000, padding: 20,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#fff', borderRadius: 14,
                    maxWidth: 560, width: '100%', maxHeight: '90vh',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '18px 22px', borderBottom: '1px solid #f3f4f6',
                    display: 'flex', alignItems: 'center', gap: 10,
                }}>
                    <span style={{ fontWeight: 700, fontSize: 16, flex: 1, color: '#1a1f3a' }}>
                        Share Portal — {client.full_name}
                    </span>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        style={{
                            background: '#f3f4f6', border: 'none',
                            width: 32, height: 32, borderRadius: '50%',
                            cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            color: '#6b7280',
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div style={{
                    padding: 22, overflowY: 'auto',
                    display: 'flex', flexDirection: 'column', gap: 16,
                }}>
                    {loading ? (
                        <div style={{ padding: '2rem 0', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
                            Loading link…
                        </div>
                    ) : !token ? (
                        <>
                            <div style={{
                                background: '#fef9e6', border: '1px solid #FDB813',
                                padding: '0.875rem 1rem', borderRadius: 8,
                                fontSize: 13, color: '#92400e',
                            }}>
                                No portal link has been generated for this client yet. Click below to issue one.
                            </div>
                            <button
                                onClick={generate}
                                disabled={busy}
                                style={primaryBtn}
                            >
                                {busy ? 'Generating…' : 'Generate Portal Link'}
                            </button>
                        </>
                    ) : (
                        <>
                            <div>
                                <label style={fieldLabel}>Portal URL</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        readOnly
                                        value={portalUrl}
                                        onClick={(e) => e.currentTarget.select()}
                                        style={{
                                            flex: 1, padding: '0.625rem 0.75rem',
                                            border: '1px solid #e5e7eb', borderRadius: 6,
                                            fontSize: 13, fontFamily: 'monospace',
                                            background: '#f9fafb', minWidth: 0,
                                        }}
                                    />
                                    <button onClick={copy} style={primaryBtn}>Copy</button>
                                </div>
                                <p style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
                                    Share this with the homeowner via email or SMS. They open it directly — no login required.
                                </p>
                            </div>

                            <div style={{
                                background: '#f9fafb', border: '1px solid #e5e7eb',
                                borderRadius: 8, padding: '0.75rem 1rem',
                                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
                            }}>
                                <Stat label="Views" value={(token.view_count ?? 0).toLocaleString()} />
                                <Stat label="Last viewed" value={token.last_viewed_at ? new Date(token.last_viewed_at).toLocaleDateString() : '—'} />
                                <Stat label="Issued" value={token.created_at ? new Date(token.created_at).toLocaleDateString() : '—'} />
                            </div>

                            {/* Send-link section: Email + SMS buttons that
                                hit POST /client-portal/:id/tokens/send. */}
                            <SendLinkRow client={client} disabled={busy} />

                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    onClick={rotate}
                                    disabled={busy}
                                    style={outlineBtn}
                                >
                                    Rotate (new link)
                                </button>
                                <button
                                    onClick={revoke}
                                    disabled={busy}
                                    style={{ ...outlineBtn, color: '#dc2626', borderColor: '#fecaca' }}
                                >
                                    Revoke access
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '14px 22px', borderTop: '1px solid #f3f4f6',
                    display: 'flex', justifyContent: 'flex-end', gap: 8,
                }}>
                    <button onClick={onClose} style={outlineBtn}>Close</button>
                </div>
            </div>
        </div>
    );
};

// Shared style snippets so the modal stays visually consistent without
// depending on global .btn / .form-label classes.
const fieldLabel = {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: '#6b7280', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 6,
};
const primaryBtn = {
    padding: '10px 16px',
    background: 'linear-gradient(135deg, #FDB813, #d4a000)',
    color: '#1a1f3a', border: 'none', borderRadius: 8,
    fontWeight: 700, fontSize: 13, cursor: 'pointer',
    whiteSpace: 'nowrap',
};
const outlineBtn = {
    flex: 1,
    padding: '10px 16px',
    background: '#fff', color: '#1a1f3a',
    border: '1px solid #e5e7eb', borderRadius: 8,
    fontWeight: 600, fontSize: 13, cursor: 'pointer',
    textAlign: 'center',
};

// ─────────────────────────────────────────────────────────────────────────────
// SendLinkRow — small row of Send Email / Send SMS buttons inside the
// SharePortalModal. Hits POST /client-portal/:id/tokens/send. Each button
// shows the destination it'll actually use (the client's on-file address)
// and surfaces backend ServiceUnavailable errors as a friendly toast (e.g.
// "SMS not configured" when Twilio env vars aren't set).
// ─────────────────────────────────────────────────────────────────────────────
const SendLinkRow = ({ client, disabled }) => {
    const [sending, setSending] = useState(null); // 'email' | 'sms' | null
    // Inline result banner inside the modal. Toast disappears in 4s and
    // sits in the page corner — easy to miss. The banner stays visible
    // until the user clicks Send again or closes the modal.
    //   { kind: 'success' | 'error', text: string } | null
    const [result, setResult] = useState(null);

    const send = async (channel) => {
        if (sending) return;
        setSending(channel);
        setResult(null);
        try {
            const { data } = await axiosInstance.post(
                `/client-portal/${client.id}/tokens/send`,
                { channel },
                { suppressErrorToast: true },
            );
            const dest = data?.to || (channel === 'email' ? client.email : client.phone);
            const msg = channel === 'email'
                ? `Email sent successfully to ${dest}`
                : `SMS sent successfully to ${dest}`;
            toast.success(msg);
            setResult({ kind: 'success', text: msg });
        } catch (e) {
            const status = e?.response?.status;
            const msg = e?.response?.data?.message || e?.userMessage;
            let friendly;
            if (status === 503) {
                friendly = msg || `${channel.toUpperCase()} channel not configured yet`;
            } else if (status === 400) {
                friendly = msg || 'Missing contact info on this client';
            } else {
                friendly = msg || `Failed to send ${channel}. Please try again.`;
            }
            toast.error(friendly);
            setResult({ kind: 'error', text: friendly });
        } finally {
            setSending(null);
        }
    };

    return (
        <div>
            <div style={{
                fontSize: 11, fontWeight: 700, color: '#6b7280',
                textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
            }}>
                Send to client
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <button
                    onClick={() => send('email')}
                    disabled={disabled || sending !== null || !client.email}
                    title={client.email || 'No email on file'}
                    style={{
                        flex: 1, padding: '10px 14px',
                        background: 'linear-gradient(135deg, #FDB813, #d4a000)',
                        color: '#1a1f3a', border: 'none', borderRadius: 8,
                        fontWeight: 700, fontSize: 13, cursor: 'pointer',
                        opacity: (disabled || sending !== null || !client.email) ? 0.5 : 1,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                >
                    {sending === 'email' ? 'Sending…' : `Email${client.email ? ` → ${client.email}` : ''}`}
                </button>
                <button
                    onClick={() => send('sms')}
                    disabled={disabled || sending !== null || !client.phone}
                    title={client.phone || 'No phone on file'}
                    style={{
                        flex: 1, padding: '10px 14px',
                        background: '#fff', color: '#1a1f3a',
                        border: '1px solid #e5e7eb', borderRadius: 8,
                        fontWeight: 600, fontSize: 13, cursor: 'pointer',
                        opacity: (disabled || sending !== null || !client.phone) ? 0.5 : 1,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                >
                    {sending === 'sms' ? 'Sending…' : `SMS${client.phone ? ` → ${client.phone}` : ''}`}
                </button>
            </div>

            {/* Inline result banner — stays until next send or modal close.
                More discoverable than a toast that auto-dismisses in 4s. */}
            {result && (
                <div
                    role="status"
                    style={{
                        marginTop: 10,
                        padding: '10px 12px',
                        borderRadius: 8,
                        fontSize: 13,
                        lineHeight: 1.5,
                        display: 'flex', alignItems: 'flex-start', gap: 8,
                        background: result.kind === 'success' ? '#ecfdf5' : '#fef2f2',
                        color:      result.kind === 'success' ? '#065f46' : '#991b1b',
                        border:     `1px solid ${result.kind === 'success' ? '#a7f3d0' : '#fecaca'}`,
                    }}
                >
                    <span style={{ fontWeight: 700, flexShrink: 0 }}>
                        {result.kind === 'success' ? '✓' : '✕'}
                    </span>
                    <span style={{ flex: 1 }}>{result.text}</span>
                    <button
                        onClick={() => setResult(null)}
                        aria-label="Dismiss"
                        style={{
                            background: 'transparent', border: 'none',
                            color: 'inherit', cursor: 'pointer',
                            fontSize: 16, lineHeight: 1, padding: 0, opacity: 0.6,
                        }}
                    >
                        ×
                    </button>
                </div>
            )}
        </div>
    );
};

const Stat = ({ label, value }) => (
    <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
            {label}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', marginTop: 2 }}>
            {value}
        </div>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ClientMessagesModal — contractor side of the two-way portal thread.
//
// Mirror of /portal/[token]/PortalMessages.jsx but with reversed bubble
// alignment (contractor msgs right/navy, client msgs left/white) and
// authenticated endpoints (/client-portal/:id/messages — not the public
// /portal-public/:token/messages used by homeowners).
//
// On open we:
//   1. GET /client-portal/:id/messages  → load the thread
//   2. POST /client-portal/:id/messages/mark-read → flip read_at on client msgs
//   3. Poll every 30s while modal is open so new homeowner replies appear live
// ─────────────────────────────────────────────────────────────────────────────
const POLL_MS = 30_000;

const fmtMsgTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString([], {
        month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
    });
};

const ClientMessagesModal = ({ client, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    const scrollRef = React.useRef(null);

    React.useEffect(() => {
        if (!client) { setMessages([]); return; }

        let cancelled = false;
        const fetchThread = async ({ silent = false } = {}) => {
            if (!silent) setLoading(true);
            try {
                const { data } = await axiosInstance.get(
                    `/client-portal/${client.id}/messages`,
                    { suppressErrorToast: true },
                );
                if (cancelled) return;
                setMessages(Array.isArray(data) ? data : []);
                setError(null);
            } catch (e) {
                if (cancelled) return;
                if (!silent) setError(e?.response?.data?.message || 'Could not load messages.');
            } finally {
                if (!cancelled && !silent) setLoading(false);
            }
        };

        const markRead = async () => {
            try {
                await axiosInstance.post(
                    `/client-portal/${client.id}/messages/mark-read`,
                    {},
                    { suppressErrorToast: true },
                );
            } catch { /* best-effort */ }
        };

        fetchThread();
        markRead();

        // Poll for homeowner replies while modal is open.
        const id = setInterval(() => fetchThread({ silent: true }), POLL_MS);
        return () => { cancelled = true; clearInterval(id); };
    }, [client]);

    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages.length]);

    if (!client) return null;

    const send = async () => {
        const text = draft.trim();
        if (!text || sending) return;
        setSending(true);
        setError(null);
        try {
            const { data } = await axiosInstance.post(
                `/client-portal/${client.id}/messages`,
                { message: text },
                { suppressErrorToast: true },
            );
            setMessages((prev) => [...prev, data]);
            setDraft('');
        } catch (e) {
            setError(e?.response?.data?.message || 'Could not send. Try again.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(17,24,39,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1000, padding: 20,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#fff', borderRadius: 14,
                    maxWidth: 600, width: '100%', maxHeight: '85vh',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '16px 20px', borderBottom: '1px solid #f3f4f6',
                    display: 'flex', alignItems: 'center', gap: 12,
                }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0, // CK-FIX Jul-22: blob fix
                        background: 'linear-gradient(135deg, #FDB813, #d4a000)',
                        color: '#1a1f3a', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 13,
                    }}>
                        {(client.first_name?.[0] || '') + (client.last_name?.[0] || '')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1f3a' }}>
                            Messages — {client.full_name}
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>
                            {client.claim_number ? `Claim #${client.claim_number}` : 'No claim number'}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        style={{
                            background: '#f3f4f6', border: 'none',
                            width: 32, height: 32, borderRadius: '50%',
                            cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            color: '#6b7280',
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Thread */}
                <div ref={scrollRef} style={{
                    flex: 1, minHeight: 280, maxHeight: '50vh',
                    overflowY: 'auto', padding: '16px 20px',
                    background: '#fafafa',
                }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', color: '#6b7280', fontSize: 13, padding: '2rem 0' }}>
                            Loading thread…
                        </div>
                    ) : messages.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#6b7280', fontSize: 13, padding: '2rem 1rem' }}>
                            No messages yet. When the homeowner posts on their portal you'll see it here — and you can reply from below.
                        </div>
                    ) : (
                        messages.map((m) => {
                            // Reversed alignment from the homeowner side: the
                            // contractor (us) is on the right; the client is
                            // on the left so it visually feels like an inbox.
                            const fromContractor = m.sender_type === 'contractor';
                            return (
                                <div
                                    key={m.id}
                                    style={{
                                        display: 'flex',
                                        justifyContent: fromContractor ? 'flex-end' : 'flex-start',
                                        marginBottom: '0.75rem',
                                    }}
                                >
                                    <div style={{
                                        maxWidth: '78%',
                                        background: fromContractor ? '#1a1f3a' : '#fff',
                                        color:      fromContractor ? '#fff'    : '#1a1f3a',
                                        border: fromContractor ? 'none' : '1px solid #e5e7eb',
                                        borderRadius: 12,
                                        padding: '0.625rem 0.875rem',
                                        fontSize: 14, lineHeight: 1.5,
                                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                    }}>
                                        <div>{m.message_text}</div>
                                        <div style={{
                                            marginTop: 4, fontSize: 10,
                                            color: fromContractor ? 'rgba(255,255,255,0.6)' : '#9ca3af',
                                        }}>
                                            {fromContractor ? 'You' : client.first_name || 'Client'} · {fmtMsgTime(m.created_at)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {error && (
                    <div style={{
                        padding: '0.5rem 1.25rem',
                        background: '#fef2f2', color: '#b91c1c',
                        fontSize: 12, borderTop: '1px solid #fecaca',
                    }}>
                        {error}
                    </div>
                )}

                {/* Reply box */}
                <div style={{
                    padding: '12px 20px 16px',
                    borderTop: '1px solid #e5e7eb', background: '#fff',
                }}>
                    <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                                e.preventDefault();
                                send();
                            }
                        }}
                        placeholder={`Reply to ${client.first_name || 'client'}…`}
                        rows={2}
                        maxLength={5000}
                        style={{
                            width: '100%', padding: '0.5rem 0.75rem',
                            border: '1px solid #e5e7eb', borderRadius: 8,
                            fontSize: 14, resize: 'vertical', minHeight: 60,
                            fontFamily: 'inherit',
                        }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>
                            {draft.length > 0 ? `${draft.length} / 5000` : 'Press ⌘/Ctrl + Enter to send'}
                        </span>
                        <button
                            onClick={send}
                            disabled={sending || !draft.trim()}
                            style={{
                                padding: '0.5rem 1.125rem',
                                background: 'linear-gradient(135deg, #FDB813, #d4a000)',
                                color: '#1a1f3a', border: 'none',
                                borderRadius: 8, fontWeight: 700, fontSize: 13,
                                cursor: sending || !draft.trim() ? 'not-allowed' : 'pointer',
                                opacity: sending || !draft.trim() ? 0.6 : 1,
                            }}
                        >
                            {sending ? 'Sending…' : 'Send reply'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientPortal;
