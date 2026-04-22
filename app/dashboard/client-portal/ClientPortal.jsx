"use client"
import React, { useCallback, useEffect, useState } from 'react';
import "./clientPortal.css"
import dynamic from "next/dynamic.js";
import axiosInstance from "@/lib/axiosInstance";
import { toast } from "sonner";

const FileUploader = dynamic(
    () => import("@/utiles/FileUploader"),
    { ssr: false }
);

const STATUS_MAP = {
    1: '1. Need Claim #',
    2: '2. Scheduled Inspection',
    3: '3. In Progress',
    4: '4. Partial Approval',
    5: '5. Supplementing',
    6: '6. Final Check Processing',
    7: '7. Completed',
    8: '8. Declined',
    9: '9. Cold Claims',
};

const statusOptions = [
    { value: 'all', label: 'All' },
    { value: '1', label: '1. Need Claim #' },
    { value: '2', label: '2. Scheduled' },
    { value: '3', label: '3. In Progress' },
    { value: '4', label: '4. Partial' },
    { value: '5', label: '5. Supplementing' },
    { value: '6', label: '6. Final Check' },
    { value: '7', label: '7. Completed' },
    { value: '8', label: '8. Declined' },
    { value: '9', label: '9. Cold Claims' },
];

const sortOptions = [
    { value: 'recent', label: 'Most Recent Activity' },
    { value: 'created', label: 'Recently Created' },
    { value: 'alphabetical', label: 'Alphabetical' },
    { value: 'value', label: 'Claim Value' },
];

const getStatusClass = (statusNum) => {
    const map = {
        1: 'status-need-claim',
        2: 'status-scheduled',
        3: 'status-in-progress',
        4: 'status-partial',
        5: 'status-supplementing',
        6: 'status-final-check',
        7: 'status-completed',
        8: 'status-declined',
        9: 'status-cold',
    };
    return map[statusNum] ?? 'status-active';
};

const ClientPortal = () => {
    const [showAddClient, setShowAddClient] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
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

    useEffect(() => {
        fetchClients(currentFilter, searchQuery);
    }, []);

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

    const copyPortalLink = (clientId) => {
        const portalUrl = `https://claimking.ai/portal/${clientId}`;
        navigator.clipboard.writeText(portalUrl);
        toast.success('Portal link copied to clipboard!');
    };

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

        return (
            <div className="client-card">
                <div className="card-header">
                    <div>
                        <div className="client-name">{client.full_name}</div>
                        <div className="claim-number">{client.claim_number || '—'}</div>
                    </div>
                    <div className="status-indicator">
                        <div className={`portal-indicator ${!portalActive ? 'inactive' : ''}`}></div>
                        <span className={`status-badge ${statusClass}`}>{STATUS_MAP[client.claim_status]}</span>
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
                        <div className="stat-value">{client.insurance_company}</div>
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
                    <button className="action-btn primary" onClick={() => copyPortalLink(client.id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                        Copy Portal Link
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
                        <button className="btn btn-primary" onClick={() => setShowAddClient(true)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Add New Client
                        </button>
                        <button className="btn btn-secondary" onClick={() => setShowBulkImport(true)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                            Bulk Import
                        </button>
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
                            {statusOptions.map(option => (
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
                                            <td>{client.insurance_company}</td>
                                            <td><span className={`status-badge ${getStatusClass(client.claim_status)}`}>{STATUS_MAP[client.claim_status]}</span></td>
                                            <td>${((client.claim_value ?? 0) / 1000).toFixed(0)}k</td>
                                            <td>{client.progress ?? 0}%</td>
                                            <td style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button className="action-btn" onClick={() => copyPortalLink(client.id)}>Copy Link</button>
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

            <BulkImportModal
                isOpen={showBulkImport}
                onClose={() => setShowBulkImport(false)}
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

    if (!data.insurance_company) errors.insurance_company = 'Insurance company is required';
    if (!data.claim_status) errors.claim_status = 'Claim status is required';

    return errors;
};

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

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Add New Client</h2>
                    <button className="modal-close" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="modal-body">
                    <form onSubmit={handleSubmit}>
                        <div className="form-section">
                            <h3 className="section-title">Client Information</h3>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label required">First Name</label>
                                    <input type="text" className={`form-input ${errors.first_name ? 'input-error' : ''}`} placeholder="John" name="first_name" value={formData.first_name} onChange={handleInputChange} />
                                    {errors.first_name && <span className="field-error">{errors.first_name}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">Last Name</label>
                                    <input type="text" className={`form-input ${errors.last_name ? 'input-error' : ''}`} placeholder="Smith" name="last_name" value={formData.last_name} onChange={handleInputChange} />
                                    {errors.last_name && <span className="field-error">{errors.last_name}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">Phone Number</label>
                                    <input type="tel" className={`form-input ${errors.phone ? 'input-error' : ''}`} placeholder="(555) 123-4567" name="phone" value={formData.phone} onChange={handleInputChange} />
                                    {errors.phone && <span className="field-error">{errors.phone}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">Email Address</label>
                                    <input type="email" className={`form-input ${errors.email ? 'input-error' : ''}`} placeholder="john.smith@email.com" name="email" value={formData.email} onChange={handleInputChange} />
                                    {errors.email && <span className="field-error">{errors.email}</span>}
                                </div>
                            </div>
                        </div>

                        <div className="form-section">
                            <h3 className="section-title">Property Information</h3>
                            <div className="form-grid">
                                <div className="form-group full-width">
                                    <label className="form-label required">Property Address</label>
                                    <input type="text" className={`form-input ${errors.address ? 'input-error' : ''}`} placeholder="123 Main Street" name="address" value={formData.address} onChange={handleInputChange} />
                                    {errors.address && <span className="field-error">{errors.address}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">City</label>
                                    <input type="text" className={`form-input ${errors.city ? 'input-error' : ''}`} placeholder="Dallas" name="city" value={formData.city} onChange={handleInputChange} />
                                    {errors.city && <span className="field-error">{errors.city}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">State</label>
                                    <select className={`form-select ${errors.state ? 'input-error' : ''}`} name="state" value={formData.state} onChange={handleInputChange}>
                                        <option value="">Select State</option>
                                        <option value="TX">Texas</option>
                                        <option value="OK">Oklahoma</option>
                                        <option value="LA">Louisiana</option>
                                        <option value="AR">Arkansas</option>
                                        <option value="FL">Florida</option>
                                        <option value="CO">Colorado</option>
                                        <option value="CA">California</option>
                                        <option value="AZ">Arizona</option>
                                        <option value="GA">Georgia</option>
                                        <option value="NC">North Carolina</option>
                                    </select>
                                    {errors.state && <span className="field-error">{errors.state}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">ZIP Code</label>
                                    <input type="text" className={`form-input ${errors.zip_code ? 'input-error' : ''}`} placeholder="75201" name="zip_code" value={formData.zip_code} onChange={handleInputChange} />
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
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label required">Insurance Company</label>
                                    <select className={`form-select ${errors.insurance_company ? 'input-error' : ''}`} name="insurance_company" value={formData.insurance_company} onChange={handleInputChange}>
                                        <option value="">Select Insurance</option>
                                        <option value="state-farm">State Farm</option>
                                        <option value="allstate">Allstate</option>
                                        <option value="farmers">Farmers</option>
                                        <option value="liberty">Liberty Mutual</option>
                                        <option value="usaa">USAA</option>
                                        <option value="other">Other</option>
                                    </select>
                                    {errors.insurance_company && <span className="field-error">{errors.insurance_company}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Policy Number</label>
                                    <input type="text" className="form-input" placeholder="POL-123456" name="policy_number" value={formData.policy_number} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Claim Number</label>
                                    <input type="text" className="form-input" placeholder="CLM-2024-0001" name="claim_number" value={formData.claim_number} onChange={handleInputChange} />
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
                                    <input type="number" className="form-input" placeholder="50000" name="claim_value" value={formData.claim_value} onChange={handleInputChange} min="0" />
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label">Notes</label>
                                    <textarea className="form-textarea" placeholder="Add any additional notes about this client..." name="notes" value={formData.notes} onChange={handleInputChange}></textarea>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? 'Saving...' : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
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
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Edit Client</h2>
                    <button className="modal-close" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="modal-body">
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
                                        <option value="TX">Texas</option>
                                        <option value="OK">Oklahoma</option>
                                        <option value="LA">Louisiana</option>
                                        <option value="AR">Arkansas</option>
                                        <option value="FL">Florida</option>
                                        <option value="CO">Colorado</option>
                                        <option value="CA">California</option>
                                        <option value="AZ">Arizona</option>
                                        <option value="GA">Georgia</option>
                                        <option value="NC">North Carolina</option>
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
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label required">Insurance Company</label>
                                    <select className={`form-select ${errors.insurance_company ? 'input-error' : ''}`} name="insurance_company" value={formData.insurance_company} onChange={handleInputChange}>
                                        <option value="">Select Insurance</option>
                                        <option value="state-farm">State Farm</option>
                                        <option value="allstate">Allstate</option>
                                        <option value="farmers">Farmers</option>
                                        <option value="liberty">Liberty Mutual</option>
                                        <option value="usaa">USAA</option>
                                        <option value="other">Other</option>
                                    </select>
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

                <div className="modal-footer">
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
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Trash ({clients.length})</h2>
                    <button className="modal-close" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div className="modal-body">
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
                                        <td><span className={`status-badge ${getStatusClass(client.claim_status)}`}>{STATUS_MAP[client.claim_status]}</span></td>
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
                <div className="modal-footer">
                    <button className="btn btn-outline" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

const BulkImportModal = ({ isOpen, onClose }) => {
    const [importOptions, setImportOptions] = useState({
        sendInvitations: true,
        skipDuplicates: true,
        validateEmails: true,
    });
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

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Bulk Import Clients</h2>
                    <button className="modal-close" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div className="modal-body">
                    <div className="form-section">
                        <h3 className="section-title">Upload CSV File</h3>
                        <FileUploader label='Click to upload or drag and drop' files={files} setFiles={setFiles} allowedExtensions={['.csv']} maxSizeMB={10} />
                        <p className="help-text">Columns: first_name, last_name, email, phone, address, city, state, zip_code, insurance_company, policy_number, claim_number, claim_status (1-9), claim_value, notes</p>
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
                            { key: 'sendInvitations', label: 'Send portal invitations automatically' },
                            { key: 'skipDuplicates', label: 'Skip duplicate entries' },
                            { key: 'validateEmails', label: 'Validate email addresses' },
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
                <div className="modal-footer">
                    <button className="btn btn-outline" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={() => { toast.info('Bulk import coming soon'); onClose(); }}>
                        Start Import
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
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Portal Settings</h2>
                    <button className="modal-close" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div className="modal-body">
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
                <div className="modal-footer">
                    <button className="btn btn-outline" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={() => { toast.success('Settings saved!'); onClose(); }}>
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClientPortal;
