"use client"
import React, {useEffect, useState} from 'react';
import "./clientPortal.css"
import dynamic from "next/dynamic.js";

const FileUploader = dynamic(
    () => import("@/utiles/FileUploader"),
    { ssr: false }
);

const ClientPortal = () => {

    const [showAddClient, setShowAddClient] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [showPortalSettings, setShowPortalSettings] = useState(false);

    const [currentGridPage, setCurrentGridPage] = useState(1);
    const [currentListPage, setCurrentListPage] = useState(1);
    const [listItemsPerPage, setListItemsPerPage] = useState(50);
    const [currentFilter, setCurrentFilter] = useState('all');
    const [filteredClients, setFilteredClients] = useState([]);
    const [currentView, setCurrentView] = useState('grid');
    const [activeModal, setActiveModal] = useState(null);
    const [activeSettingsTab, setActiveSettingsTab] = useState('general');
    const [toast, setToast] = useState({ show: false, message: '' });
    const [allClients, setAllClients] = useState([]);

    const gridItemsPerPage = 9;

    const handleSaveClient = (clientData) => {
        console.log('Saving client:', clientData);
        // API call to save client
    };

    const handleBulkImport = (file, options) => {
        console.log('Importing file:', file, 'with options:', options);
        // API call for bulk import
    };

    const handleSaveSettings = (settings) => {
        console.log('Saving settings:', settings);
        // API call to save settings
    };




    // Status options
    const statusOptions = [
        { value: 'all', label: 'All' },
        { value: 'need-claim', label: '1. Need Claim #' },
        { value: 'scheduled', label: '2. Scheduled' },
        { value: 'in-progress', label: '3. In Progress' },
        { value: 'partial', label: '4. Partial' },
        { value: 'supplementing', label: '5. Supplementing' },
        { value: 'final-check', label: '6. Final Check' },
        { value: 'completed', label: '7. Completed' },
        { value: 'declined', label: '8. Declined' },
        { value: 'cold', label: '9. Cold Claims' }
    ];

    const sortOptions = [
        { value: 'recent', label: 'Most Recent Activity' },
        { value: 'created', label: 'Recently Created' },
        { value: 'alphabetical', label: 'Alphabetical' },
        { value: 'value', label: 'Claim Value' },
        { value: 'updated', label: 'Last Updated' }
    ];

    // Generate sample client data
    useEffect(() => {
        const clients = generateSampleClients(127);
        setAllClients(clients);
        setFilteredClients(clients);
    }, []);

    const generateSampleClients = (count) => {
        const statuses = [
            '1. Need Claim #',
            '2. Scheduled Inspection',
            '3. In Progress',
            '4. Partial Approval',
            '5. Supplementing',
            '6. Final Check Processing',
            '7. Completed',
            '8. Declined',
            '9. Cold Claims'
        ];
        const insuranceCompanies = ['State Farm', 'Allstate', 'Farmers', 'Liberty Mutual', 'USAA'];
        const clients = [];

        for (let i = 1; i <= count; i++) {
            let statusIndex;
            const rand = Math.random();
            if (rand < 0.15) statusIndex = 0;
            else if (rand < 0.25) statusIndex = 1;
            else if (rand < 0.45) statusIndex = 2;
            else if (rand < 0.55) statusIndex = 3;
            else if (rand < 0.65) statusIndex = 4;
            else if (rand < 0.70) statusIndex = 5;
            else if (rand < 0.85) statusIndex = 6;
            else if (rand < 0.90) statusIndex = 7;
            else statusIndex = 8;

            const status = statuses[statusIndex];
            const progress = calculateProgressByStatus(status);

            clients.push({
                id: `CLM-2024-${String(1000 - i).padStart(3, '0')}`,
                name: `${['Johnson', 'Smith', 'Davis', 'Wilson', 'Brown'][i % 5]} ${['Property', 'Residence', 'Complex'][i % 3]}`,
                address: `${100 + i} ${['Main', 'Oak', 'Pine'][i % 3]} St, Dallas, TX`,
                phone: `(214) 555-${String(1000 + i).padStart(4, '0')}`,
                email: `client${i}@example.com`,
                insurance: insuranceCompanies[i % insuranceCompanies.length],
                status: status,
                statusNumber: statusIndex + 1,
                lastAccess: generateLastAccess(status),
                documents: Math.floor(Math.random() * 20) + 1,
                value: Math.floor(Math.random() * 100000) + 20000,
                progress: progress
            });
        }

        return clients;
    };

    const calculateProgressByStatus = (status) => {
        switch(status) {
            case '1. Need Claim #': return Math.floor(Math.random() * 10);
            case '2. Scheduled Inspection': return 10 + Math.floor(Math.random() * 10);
            case '3. In Progress': return 20 + Math.floor(Math.random() * 20);
            case '4. Partial Approval': return 40 + Math.floor(Math.random() * 15);
            case '5. Supplementing': return 55 + Math.floor(Math.random() * 15);
            case '6. Final Check Processing': return 70 + Math.floor(Math.random() * 15);
            case '7. Completed': return 100;
            case '8. Declined': return Math.floor(Math.random() * 50);
            case '9. Cold Claims': return Math.floor(Math.random() * 30);
            default: return 0;
        }
    };

    const generateLastAccess = (status) => {
        if (status === '7. Completed') return 'Completed';
        if (status === '8. Declined') return 'Declined';
        if (status === '9. Cold Claims') return '30+ days ago';
        if (status === '1. Need Claim #') return 'Never';
        const rand = Math.random();
        if (rand < 0.3) return 'Today';
        if (rand < 0.5) return 'Yesterday';
        if (rand < 0.7) return `${Math.floor(Math.random() * 7) + 2} days ago`;
        return `${Math.floor(Math.random() * 24) + 1} hours ago`;
    };

    const getStatusClass = (status) => {
        if (status.includes('1.')) return 'status-need-claim';
        if (status.includes('2.')) return 'status-scheduled';
        if (status.includes('3.')) return 'status-in-progress';
        if (status.includes('4.')) return 'status-partial';
        if (status.includes('5.')) return 'status-supplementing';
        if (status.includes('6.')) return 'status-final-check';
        if (status.includes('7.')) return 'status-completed';
        if (status.includes('8.')) return 'status-declined';
        if (status.includes('9.')) return 'status-cold';
        return 'status-active';
    };

    // Event handlers
    const filterByStatus = (status, event) => {
        event.preventDefault();

        setCurrentFilter(status);

        if (status === 'all') {
            setFilteredClients([...allClients]);
        } else {
            const statusMap = {
                'need-claim': '1. Need Claim #',
                'scheduled': '2. Scheduled Inspection',
                'in-progress': '3. In Progress',
                'partial': '4. Partial Approval',
                'supplementing': '5. Supplementing',
                'final-check': '6. Final Check Processing',
                'completed': '7. Completed',
                'declined': '8. Declined',
                'cold': '9. Cold Claims'
            };

            const filtered = allClients.filter(client =>
                client.status === statusMap[status]
            );
            setFilteredClients(filtered);
        }

        setCurrentGridPage(1);
        setCurrentListPage(1);
    };

    const searchClients = (query) => {
        if (!query) {
            setFilteredClients(currentFilter === 'all' ? [...allClients] : filteredClients);
        } else {
            const q = query.toLowerCase();
            const filtered = allClients.filter(client =>
                client.name.toLowerCase().includes(q) ||
                client.id.toLowerCase().includes(q) ||
                client.phone.includes(q) ||
                client.email.toLowerCase().includes(q)
            );
            setFilteredClients(filtered);
        }

        setCurrentGridPage(1);
        setCurrentListPage(1);
    };

    const sortClients = (sortBy) => {
        let sortedClients = [...filteredClients];

        switch(sortBy) {
            case 'alphabetical':
                sortedClients.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'value':
                sortedClients.sort((a, b) => b.value - a.value);
                break;
            case 'created':
                sortedClients.sort((a, b) => b.id.localeCompare(a.id));
                break;
            default:
                sortedClients = [...allClients];
        }

        setFilteredClients(sortedClients);
        setCurrentListPage(1);
    };

    const toggleView = (view) => {
        setCurrentView(view);
        if (view === 'list') {
            setCurrentListPage(1);
        }
    };

    const changeItemsPerPage = (value) => {
        setListItemsPerPage(parseInt(value));
        setCurrentListPage(1);
    };

    const previousPage = () => {
        if (currentListPage > 1) {
            setCurrentListPage(currentListPage - 1);
        }
    };

    const nextPage = () => {
        const totalPages = Math.ceil(filteredClients.length / listItemsPerPage);
        if (currentListPage < totalPages) {
            setCurrentListPage(currentListPage + 1);
        }
    };

    const goToPage = (page) => {
        setCurrentListPage(page);
    };

    const loadMoreClients = () => {
        setCurrentGridPage(currentGridPage + 1);
    };

    const copyPortalLink = (clientId) => {
        const portalUrl = `https://claimking.ai/portal/${clientId}`;
        navigator.clipboard.writeText(portalUrl);
        showToast('Portal link copied to clipboard!');
    };

    const viewClientDetails = (clientId) => {
        showToast(`Opening details for ${clientId}...`);
    };

    const showToast = (message) => {
        setToast({ show: true, message });
        setTimeout(() => {
            setToast({ show: false, message: '' });
        }, 3000);
    };

    const openModal = (modalName) => {
        setActiveModal(modalName);
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        setActiveModal(null);
        document.body.style.overflow = '';
    };

    const saveNewClient = () => {
        showToast('Client added successfully!');
        closeModal();
    };

    const downloadTemplate = () => {
        const csvContent = `Name,Email,Phone,Address,City,State,ZIP,Insurance,Policy Number,Claim Number,Status
John Smith,john@example.com,(214) 555-0001,123 Main St,Dallas,TX,75201,State Farm,POL-123456,CLM-2024-001,3`;

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'claimking-import-template.csv';
        a.click();
        window.URL.revokeObjectURL(url);

        showToast('Template downloaded!');
    };

    const startBulkImport = () => {
        showToast('Import started... Processing clients');
        closeModal();

        setTimeout(() => {
            showToast('Successfully imported 25 clients!');
        }, 2000);
    };

    const savePortalSettings = () => {
        showToast('Settings saved successfully!');
        closeModal();
    };

    const switchSettingsTab = (tab) => {
        setActiveSettingsTab(tab);
    };

    // Client card component
    const ClientCard = ({ client }) => {
        const statusClass = getStatusClass(client.status);
        const portalActive = client.lastAccess !== 'Never' && client.lastAccess !== 'Declined';

        return (
            <div className="client-card">
                <div className="card-header">
                    <div>
                        <div className="client-name">{client.name}</div>
                        <div className="claim-number">{client.id}</div>
                    </div>
                    <div className="status-indicator">
                        <div className={`portal-indicator ${!portalActive ? 'inactive' : ''}`}></div>
                        <span className={`status-badge ${statusClass}`}>{client.status}</span>
                    </div>
                </div>

                <div className="client-details">
                    <div className="detail-item">
                        <svg className="detail-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <span>{client.address}</span>
                    </div>
                    <div className="detail-item">
                        <svg className="detail-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
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
                        <div className="stat-value">{client.documents}</div>
                        <div className="stat-label">Documents</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">{client.lastAccess}</div>
                        <div className="stat-label">Last Access</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">{client.insurance}</div>
                        <div className="stat-label">Insurance</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">${(client.value / 1000).toFixed(0)}k</div>
                        <div className="stat-label">Claim Value</div>
                    </div>
                </div>

                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${client.progress}%` }}></div>
                </div>

                <div className="card-actions">
                    <button className="action-btn primary" onClick={() => copyPortalLink(client.id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                        Copy Portal Link
                    </button>
                    <button className="action-btn" onClick={() => viewClientDetails(client.id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        View Details
                    </button>
                </div>
            </div>
        );
    };

    // Calculate displayed clients for grid view
    const displayedGridClients = filteredClients.slice(0, currentGridPage * gridItemsPerPage);

    // Calculate displayed clients for list view
    const startIndex = (currentListPage - 1) * listItemsPerPage;
    const endIndex = startIndex + listItemsPerPage;
    const displayedListClients = filteredClients.slice(startIndex, endIndex);

    // Calculate pagination info
    const totalListPages = Math.ceil(filteredClients.length / listItemsPerPage);
    const startItem = (currentListPage - 1) * listItemsPerPage + 1;
    const endItem = Math.min(currentListPage * listItemsPerPage, filteredClients.length);

    // Generate page numbers for pagination
    const generatePageNumbers = () => {
        const pages = [];
        let startPage = Math.max(1, currentListPage - 2);
        let endPage = Math.min(totalListPages, startPage + 4);

        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        if (startPage > 1) {
            pages.push(
                <button key={1} className="page-btn" onClick={() => goToPage(1)}>
                    1
                </button>
            );

            if (startPage > 2) {
                pages.push(
                    <span key="dots1" style={{ padding: '0 0.5rem', color: '#6b7280' }}>
                        ...
                    </span>
                );
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button
                    key={i}
                    className={`page-btn ${i === currentListPage ? 'active' : ''}`}
                    onClick={() => goToPage(i)}
                >
                    {i}
                </button>
            );
        }

        if (endPage < totalListPages) {
            if (endPage < totalListPages - 1) {
                pages.push(
                    <span key="dots2" style={{ padding: '0 0.5rem', color: '#6b7280' }}>
                        ...
                    </span>
                );
            }

            pages.push(
                <button key={totalListPages} className="page-btn" onClick={() => goToPage(totalListPages)}>
                    {totalListPages}
                </button>
            );
        }

        return pages;
    };

    // Calculate metrics
    const activeCount = filteredClients.filter(c =>
        !['7. Completed', '8. Declined', '9. Cold Claims'].includes(c.status)
    ).length;

    const completedCount = filteredClients.filter(c => c.status === '7. Completed').length;
    const totalValue = filteredClients.reduce((sum, c) => sum + c.value, 0);
    const avgProgress = Math.round(
        filteredClients.reduce((sum, c) => sum + c.progress, 0) / filteredClients.length
    );

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
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Add New Client
                        </button>
                        <button className="btn btn-secondary" onClick={() => setShowBulkImport(true)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                            Bulk Import
                        </button>
                        <button className="btn btn-outline" onClick={() => setShowPortalSettings(true)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 strokeWidth="2">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path
                                    d="M12 1v6m0 6v6m4.22-13.22l4.24 4.24M1.54 12.5l4.24 4.24M18.36 18.36l-4.24-4.24M4.14 4.14l4.24 4.24"></path>
                            </svg>
                            Portal Settings
                        </button>
                    </div>
                </div>
            </div>

            <div className="client-portal-manager">
                {/* Search and Filter Section */}
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
                            onKeyUp={(e) => searchClients(e.target.value)}
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
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <span className="results-count">
                        Showing {filteredClients.length} clients
                    </span>
                    </div>
                </div>

                {/* Metrics Row */}
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
                            <div className="metric-value">{filteredClients.length}</div>
                            <div className="metric-subtitle">{activeCount} active portals</div>
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
                            <div className="metric-value">{activeCount}</div>
                            <div className="metric-subtitle">In various stages</div>
                            <div className="metric-trend">↑ 12% this week</div>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #dbeafe, #93c5fd)' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                        </div>
                        <div className="metric-content">
                            <div className="metric-label">Avg Progress</div>
                            <div className="metric-value">{avgProgress}%</div>
                            <div className="metric-subtitle">Across all claims</div>
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
                            <div className="metric-value">${(totalValue / 1000000).toFixed(1)}M</div>
                            <div className="metric-subtitle">{completedCount} completed</div>
                        </div>
                    </div>
                </div>

                {/* View Toggle and Pagination */}
                <div className="view-toggle-container">
                    <div className="view-controls-left">
                        <div className="view-toggle">
                            <button
                                className={`view-btn ${currentView === 'grid' ? 'active' : ''}`}
                                onClick={() => toggleView('grid')}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="7" height="7"></rect>
                                    <rect x="14" y="3" width="7" height="7"></rect>
                                    <rect x="14" y="14" width="7" height="7"></rect>
                                    <rect x="3" y="14" width="7" height="7"></rect>
                                </svg>
                                Grid View
                            </button>
                            <button
                                className={`view-btn ${currentView === 'list' ? 'active' : ''}`}
                                onClick={() => toggleView('list')}
                            >
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

                        {/* Pagination Controls for List View */}
                        <div className={`pagination-controls ${currentView === 'list' ? 'active' : ''}`}>
                            <div className="items-per-page">
                                <label htmlFor="itemsPerPage">Show:</label>
                                <select
                                    className="items-select"
                                    id="itemsPerPage"
                                    value={listItemsPerPage}
                                    onChange={(e) => changeItemsPerPage(e.target.value)}
                                >
                                    <option value="10">10</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                </select>
                            </div>

                            <div className="pagination-info">
                                <span>{startItem}-{endItem} of {filteredClients.length}</span>
                            </div>

                            <div className="pagination-buttons">
                                <button
                                    className="page-btn"
                                    onClick={previousPage}
                                    disabled={currentListPage === 1}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="15 18 9 12 15 6"></polyline>
                                    </svg>
                                    Previous
                                </button>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    {generatePageNumbers()}
                                </div>
                                <button
                                    className="page-btn"
                                    onClick={nextPage}
                                    disabled={currentListPage === totalListPages}
                                >
                                    Next
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="9 18 15 12 9 6"></polyline>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Client Grid View */}
                <div className="clients-grid" style={{ display: currentView === 'grid' ? 'grid' : 'none' }}>
                    {displayedGridClients.map(client => (
                        <ClientCard key={client.id} client={client} />
                    ))}
                </div>

                {/* Show More Button */}
                <div
                    className="show-more-container"
                    style={{ display: currentView === 'grid' ? 'block' : 'none' }}
                >
                    {displayedGridClients.length < filteredClients.length && (
                        <button className="btn btn-outline" onClick={loadMoreClients}>
                            Show More Clients
                        </button>
                    )}
                    <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                        Showing <span>{displayedGridClients.length}</span> of <span>{filteredClients.length}</span> clients
                    </p>
                </div>

                {/* List View with Fixed Horizontal Scrolling */}
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
                                <th>Last Access</th>
                                <th>Docs</th>
                                <th>Value</th>
                                <th>Progress</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {displayedListClients.map(client => {
                                const statusClass = getStatusClass(client.status);
                                return (
                                    <tr key={client.id}>
                                        <td><strong>{client.name}</strong></td>
                                        <td>{client.id}</td>
                                        <td>{client.address}</td>
                                        <td>{client.phone}</td>
                                        <td>{client.email}</td>
                                        <td>{client.insurance}</td>
                                        <td><span className={`status-badge ${statusClass}`}>{client.status}</span></td>
                                        <td>{client.lastAccess}</td>
                                        <td>{client.documents}</td>
                                        <td>${(client.value / 1000).toFixed(0)}k</td>
                                        <td>{client.progress}%</td>
                                        <td>
                                            <button className="action-btn" onClick={() => copyPortalLink(client.id)}>
                                                Copy Link
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Toast Notification */}
                <div className={`toast ${toast.show ? 'active' : ''}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>{toast.message}</span>
                </div>
            </div>

            <AddClientModal
                isOpen={showAddClient}
                onClose={() => setShowAddClient(false)}
                onSave={handleSaveClient}
            />

            <BulkImportModal
                isOpen={showBulkImport}
                onClose={() => setShowBulkImport(false)}
                onImport={handleBulkImport}
            />

            <PortalSettingsModal
                isOpen={showPortalSettings}
                onClose={() => setShowPortalSettings(false)}
                onSave={handleSaveSettings}
            />

        </>
    );
};

const SearchFilter = () => {
    // Define status options as data
    const statusOptions = [
        { value: 'all', label: 'All' },
        { value: 'need-claim', label: '1. Need Claim #' },
        { value: 'scheduled', label: '2. Scheduled' },
        { value: 'in-progress', label: '3. In Progress' },
        { value: 'partial', label: '4. Partial' },
        { value: 'supplementing', label: '5. Supplementing' },
        { value: 'final-check', label: '6. Final Check' },
        { value: 'completed', label: '7. Completed' },
        { value: 'declined', label: '8. Declined' },
        { value: 'cold', label: '9. Cold Claims' }
    ];

    // Sort options data
    const sortOptions = [
        { value: 'recent', label: 'Most Recent Activity' },
        { value: 'created', label: 'Recently Created' },
        { value: 'alphabetical', label: 'Alphabetical' },
        { value: 'value', label: 'Claim Value' },
        { value: 'updated', label: 'Last Updated' }
    ];

    // Mock functions - replace with your actual implementations
    const searchClients = (searchTerm) => {
        console.log('Searching for:', searchTerm);
        // Implement your search logic here
    };

    const filterByStatus = (status, event) => {
        event.preventDefault();
        console.log('Filtering by status:', status);
        // Implement your filter logic here
    };

    const sortClients = (sortValue) => {
        console.log('Sorting by:', sortValue);
        // Implement your sort logic here
    };

    return (
        <div className="search-filter-section">
            <div className="search-bar-container">
                <svg
                    className="search-icon"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input
                    type="text"
                    className="search-input-large"
                    placeholder="Search by client name, claim number, phone, or email..."
                    onKeyUp={(e) => searchClients(e.target.value)}
                />
            </div>

            <div className="filter-row">
                <div className="filter-chips">
                    {statusOptions.map(option => (
                        <button
                            key={option.value}
                            className={`filter-chip ${option.value === 'all' ? 'active' : ''}`}
                            onClick={(e) => filterByStatus(option.value, e)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                <select
                    className="sort-dropdown"
                    onChange={(e) => sortClients(e.target.value)}
                    defaultValue="recent"
                >
                    {sortOptions.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

                <span className="results-count" id="resultsCount">
                    Showing 127 clients
                </span>
            </div>
        </div>
    );
};

// Add New Client Modal Component
const AddClientModal = ({ isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        propertyType: 'single-family',
        insuranceCompany: '',
        policyNumber: '',
        claimNumber: '',
        claimStatus: '',
        notes: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
        onClose();
        // Reset form
        setFormData({
            firstName: '',
            lastName: '',
            phone: '',
            email: '',
            address: '',
            city: '',
            state: '',
            zipCode: '',
            propertyType: 'single-family',
            insuranceCompany: '',
            policyNumber: '',
            claimNumber: '',
            claimStatus: '',
            notes: ''
        });
    };

    console.log({isOpen});

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
                    <form id="addClientForm" onSubmit={handleSubmit}>
                        {/* Client Information */}
                        <div className="form-section">
                            <h3 className="section-title">Client Information</h3>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label required">First Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="John"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">Last Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Smith"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">Phone Number</label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        placeholder="(555) 123-4567"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">Email Address</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        placeholder="john.smith@email.com"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Property Information */}
                        <div className="form-section">
                            <h3 className="section-title">Property Information</h3>
                            <div className="form-grid">
                                <div className="form-group full-width">
                                    <label className="form-label required">Property Address</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="123 Main Street"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">City</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Dallas"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">State</label>
                                    <select
                                        className="form-select"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Select State</option>
                                        <option value="TX">Texas</option>
                                        <option value="OK">Oklahoma</option>
                                        <option value="LA">Louisiana</option>
                                        <option value="AR">Arkansas</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">ZIP Code</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="75201"
                                        name="zipCode"
                                        value={formData.zipCode}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Property Type</label>
                                    <select
                                        className="form-select"
                                        name="propertyType"
                                        value={formData.propertyType}
                                        onChange={handleInputChange}
                                    >
                                        <option value="single-family">Single Family Home</option>
                                        <option value="multi-family">Multi-Family</option>
                                        <option value="commercial">Commercial</option>
                                        <option value="condo">Condo/Townhouse</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Insurance Information */}
                        <div className="form-section">
                            <h3 className="section-title">Insurance Information</h3>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label required">Insurance Company</label>
                                    <select
                                        className="form-select"
                                        name="insuranceCompany"
                                        value={formData.insuranceCompany}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Select Insurance</option>
                                        <option value="state-farm">State Farm</option>
                                        <option value="allstate">Allstate</option>
                                        <option value="farmers">Farmers</option>
                                        <option value="liberty">Liberty Mutual</option>
                                        <option value="usaa">USAA</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Policy Number</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="POL-123456"
                                        name="policyNumber"
                                        value={formData.policyNumber}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Claim Number</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="CLM-2024-0001"
                                        name="claimNumber"
                                        value={formData.claimNumber}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">Claim Status</label>
                                    <select
                                        className="form-select"
                                        name="claimStatus"
                                        value={formData.claimStatus}
                                        onChange={handleInputChange}
                                        required
                                    >
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
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label">Notes</label>
                                    <textarea
                                        className="form-textarea"
                                        placeholder="Add any additional notes about this client..."
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleInputChange}
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-outline" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Save Client
                    </button>
                </div>
            </div>
        </div>
    );
};

// Bulk Import Modal Component
const BulkImportModal = ({ isOpen, onClose, onImport }) => {
    const [importOptions, setImportOptions] = useState({
        sendInvitations: true,
        skipDuplicates: true,
        validateEmails: true
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [files, setFiles] = useState([])

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'text/csv') {
            setSelectedFile(file);
        } else {
            alert('Please select a valid CSV file');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'text/csv') {
            setSelectedFile(file);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleOptionChange = (option) => {
        setImportOptions(prev => ({
            ...prev,
            [option]: !prev[option]
        }));
    };

    const handleImport = () => {
        if (!selectedFile) {
            alert('Please select a CSV file to import');
            return;
        }
        onImport(selectedFile, importOptions);
        onClose();
        setSelectedFile(null);
    };

    const downloadTemplate = () => {
        // In a real app, this would download a CSV template
        alert('Downloading CSV template...');
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
                    {/* File Upload Area */}
                    <div className="form-section">
                        <h3 className="section-title">Upload CSV File</h3>
                        {/*<div
                            className="file-upload-area"
                            onClick={() => document.getElementById('csvFile').click()}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragOver}
                        >
                            <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                            <p className="upload-text">
                                {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                            </p>
                            <p className="upload-subtext">CSV files only (max 10MB)</p>
                            <input
                                type="file"
                                id="csvFile"
                                className="file-input"
                                accept=".csv"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />
                        </div>*/}

                        <FileUploader label='Click to upload or drag and drop' files={files} setFiles={setFiles} allowedExtensions={['.csv']} maxSizeMB={10} />

                        <p className="help-text">
                            File should include columns: Name, Email, Phone, Address, Insurance, Policy Number, Claim Number
                        </p>
                    </div>

                    {/* Template Download */}
                    <div className="form-section">
                        <h3 className="section-title">Download Template</h3>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
                            Use our CSV template to ensure your data is formatted correctly for import.
                        </p>
                        <button className="btn btn-outline" onClick={downloadTemplate}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Download CSV Template
                        </button>
                    </div>

                    {/* Import Options */}
                    <div className="form-section">
                        <h3 className="section-title">Import Options</h3>
                        <div className="toggle-group">
                            <span className="toggle-label">Send portal invitations automatically</span>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={importOptions.sendInvitations}
                                    onChange={() => handleOptionChange('sendInvitations')}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <div className="toggle-group">
                            <span className="toggle-label">Skip duplicate entries</span>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={importOptions.skipDuplicates}
                                    onChange={() => handleOptionChange('skipDuplicates')}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <div className="toggle-group">
                            <span className="toggle-label">Validate email addresses</span>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={importOptions.validateEmails}
                                    onChange={() => handleOptionChange('validateEmails')}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-outline" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleImport}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        Start Import
                    </button>
                </div>
            </div>
        </div>
    );
};

// Portal Settings Modal Component
const PortalSettingsModal = ({ isOpen, onClose, onSave }) => {
    const [activeTab, setActiveTab] = useState('general');
    const [settings, setSettings] = useState({
        // General Settings
        enablePortal: true,
        requireEmailVerification: true,
        allowDocumentUploads: true,
        sessionTimeout: 30,

        // Branding Settings
        companyName: 'ClaimKing.AI',
        portalTitle: 'Client Portal - ClaimKing.AI',
        welcomeMessage: 'Welcome to ClaimKing.AI Client Portal. Track your claim progress, upload documents, and communicate with your adjuster.',
        primaryColor: '#FDB813',
        secondaryColor: '#1a1f3a',

        // Permissions Settings
        viewClaimStatus: true,
        viewEstimates: true,
        uploadDocuments: true,
        downloadReports: true,
        sendMessages: true,
        view3DMockups: true,

        // Notifications Settings
        sendWelcomeEmail: true,
        notifyStatusChanges: true,
        notifyNewDocuments: true,
        weeklyUpdates: false,
        enableSMS: false,
        smsFromNumber: ''
    });

    const handleSettingChange = (setting, value) => {
        setSettings(prev => ({
            ...prev,
            [setting]: value
        }));
    };

    const handleSave = () => {
        onSave(settings);
        onClose();
    };

    if (!isOpen) return null;

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
                    {/* Settings Tabs */}
                    <div className="settings-tabs">
                        <button
                            className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
                            onClick={() => setActiveTab('general')}
                        >
                            General
                        </button>
                        <button
                            className={`settings-tab ${activeTab === 'branding' ? 'active' : ''}`}
                            onClick={() => setActiveTab('branding')}
                        >
                            Branding
                        </button>
                        <button
                            className={`settings-tab ${activeTab === 'permissions' ? 'active' : ''}`}
                            onClick={() => setActiveTab('permissions')}
                        >
                            Permissions
                        </button>
                        <button
                            className={`settings-tab ${activeTab === 'notifications' ? 'active' : ''}`}
                            onClick={() => setActiveTab('notifications')}
                        >
                            Notifications
                        </button>
                    </div>

                    {/* General Settings Tab */}
                    {activeTab === 'general' && (
                        <div className="settings-content">
                            <div className="form-section">
                                <h3 className="section-title">Portal Access</h3>
                                <div className="toggle-group">
                                    <span className="toggle-label">Enable client portal access</span>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.enablePortal}
                                            onChange={(e) => handleSettingChange('enablePortal', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                <div className="toggle-group">
                                    <span className="toggle-label">Require email verification</span>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.requireEmailVerification}
                                            onChange={(e) => handleSettingChange('requireEmailVerification', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                <div className="toggle-group">
                                    <span className="toggle-label">Allow document uploads</span>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.allowDocumentUploads}
                                            onChange={(e) => handleSettingChange('allowDocumentUploads', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <div className="form-section">
                                <h3 className="section-title">Session Settings</h3>
                                <div className="form-group">
                                    <label className="form-label">Session timeout (minutes)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={settings.sessionTimeout}
                                        min="5"
                                        max="1440"
                                        onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
                                    />
                                    <span className="help-text">Time before inactive clients are logged out</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Branding Settings Tab */}
                    {activeTab === 'branding' && (
                        <div className="settings-content">
                            <div className="form-section">
                                <h3 className="section-title">Company Branding</h3>
                                <div className="form-group">
                                    <label className="form-label">Company Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={settings.companyName}
                                        onChange={(e) => handleSettingChange('companyName', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Portal Title</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={settings.portalTitle}
                                        onChange={(e) => handleSettingChange('portalTitle', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Welcome Message</label>
                                    <textarea
                                        className="form-textarea"
                                        placeholder="Welcome to your claims portal..."
                                        value={settings.welcomeMessage}
                                        onChange={(e) => handleSettingChange('welcomeMessage', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-section">
                                <h3 className="section-title">Colors</h3>
                                <div className="form-group">
                                    <label className="form-label">Primary Color</label>
                                    <div className="color-picker-group">
                                        <input
                                            type="color"
                                            className="color-input"
                                            value={settings.primaryColor}
                                            onChange={(e) => handleSettingChange('primaryColor', e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            className="color-code"
                                            value={settings.primaryColor}
                                            onChange={(e) => handleSettingChange('primaryColor', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Secondary Color</label>
                                    <div className="color-picker-group">
                                        <input
                                            type="color"
                                            className="color-input"
                                            value={settings.secondaryColor}
                                            onChange={(e) => handleSettingChange('secondaryColor', e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            className="color-code"
                                            value={settings.secondaryColor}
                                            onChange={(e) => handleSettingChange('secondaryColor', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Permissions Settings Tab */}
                    {activeTab === 'permissions' && (
                        <div className="settings-content">
                            <div className="form-section">
                                <h3 className="section-title">Client Permissions</h3>
                                <div className="toggle-group">
                                    <span className="toggle-label">View claim status</span>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.viewClaimStatus}
                                            onChange={(e) => handleSettingChange('viewClaimStatus', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                <div className="toggle-group">
                                    <span className="toggle-label">View estimates</span>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.viewEstimates}
                                            onChange={(e) => handleSettingChange('viewEstimates', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                <div className="toggle-group">
                                    <span className="toggle-label">Upload documents</span>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.uploadDocuments}
                                            onChange={(e) => handleSettingChange('uploadDocuments', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                <div className="toggle-group">
                                    <span className="toggle-label">Download reports</span>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.downloadReports}
                                            onChange={(e) => handleSettingChange('downloadReports', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                <div className="toggle-group">
                                    <span className="toggle-label">Send messages</span>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.sendMessages}
                                            onChange={(e) => handleSettingChange('sendMessages', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                <div className="toggle-group">
                                    <span className="toggle-label">View 3D mockups</span>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.view3DMockups}
                                            onChange={(e) => handleSettingChange('view3DMockups', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notifications Settings Tab */}
                    {activeTab === 'notifications' && (
                        <div className="settings-content">
                            <div className="form-section">
                                <h3 className="section-title">Email Notifications</h3>
                                <div className="toggle-group">
                                    <span className="toggle-label">Send welcome email on portal creation</span>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.sendWelcomeEmail}
                                            onChange={(e) => handleSettingChange('sendWelcomeEmail', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                <div className="toggle-group">
                                    <span className="toggle-label">Notify on status changes</span>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.notifyStatusChanges}
                                            onChange={(e) => handleSettingChange('notifyStatusChanges', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                <div className="toggle-group">
                                    <span className="toggle-label">Notify on new documents</span>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.notifyNewDocuments}
                                            onChange={(e) => handleSettingChange('notifyNewDocuments', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                <div className="toggle-group">
                                    <span className="toggle-label">Send weekly progress updates</span>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.weeklyUpdates}
                                            onChange={(e) => handleSettingChange('weeklyUpdates', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <div className="form-section">
                                <h3 className="section-title">SMS Notifications</h3>
                                <div className="toggle-group">
                                    <span className="toggle-label">Enable SMS notifications</span>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.enableSMS}
                                            onChange={(e) => handleSettingChange('enableSMS', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">SMS from number</label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        placeholder="(888) 533-8394"
                                        value={settings.smsFromNumber}
                                        onChange={(e) => handleSettingChange('smsFromNumber', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-outline" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClientPortal;