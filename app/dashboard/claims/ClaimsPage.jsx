'use client'
import React, { useState, useEffect, useRef } from 'react';
import "./claims.css"
import StatCard from "@/app/dashboard/claims/Components/StatCard.js";
import AnalyticsCard from "@/app/dashboard/claims/Components/AnalyticsCard.js";
import RecentActivity from "@/app/dashboard/claims/Components/RecentActivity.js";
import ActionItems from "@/app/dashboard/claims/Components/ActionItems.js";

const ClaimsManagement = () => {
    // State declarations
    const [allClaims, setAllClaims] = useState([]);
    const [filteredClaims, setFilteredClaims] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [currentView, setCurrentView] = useState('grid');
    const [currentTab, setCurrentTab] = useState('all');
    const [currentStage, setCurrentStage] = useState(0);
    const [visibleGridItems, setVisibleGridItems] = useState(10);
    const [currentStageScroll, setCurrentStageScroll] = useState(0);
    const [selectedClaim, setSelectedClaim] = useState(null);
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [showMoveMenu, setShowMoveMenu] = useState(false);
    const [moveMenuClaimId, setMoveMenuClaimId] = useState(null);
    const [recentActivities, setRecentActivities] = useState([]);
    const [actionItems, setActionItems] = useState([]);

    const [statsData, setStatsData] = useState({
        totalClaims: { value: "0", change: "0% vs last month", isPositive: true },
        actionRequired: { value: "0", change: "0 overdue", isPositive: false },
        pipelineValue: { value: "$0", change: "0% increase", isPositive: true },
        highPriority: { value: "0", change: "0 critical", isPositive: false },
        needSupplement: { value: "0", change: "0 ready", isPositive: true },
        avgResolution: { value: "0d", change: "0d faster", isPositive: true },
    });

    const [analyticsData, setAnalyticsData] = useState({
        totalClaims: { value: "0", trend: "0%", subtitle: "Active in Pipeline", progress: 0 },
        pipelineValue: { value: "$0", trend: "0%", subtitle: "Total Potential Revenue", progress: 0 },
        avgDays: { value: "0", trend: "0d", stages: ["0d", "0d", "0d"] },
        successRate: { value: "0%", trend: "0%", approved: 0, declined: 0, pending: 0 },
        needAction: { value: "0", overdue: 0, supplement: 0, schedule: 0 },
        avgClaim: { value: "$0", trend: "0%", min: "$0", max: "$0", median: "$0" }
    });

    const stageNames = [
        'Need Claim Number',
        'Scheduled Inspection',
        'In Progress',
        'Partial Approval',
        'Supplementing',
        'Final Check Processing',
        'Completed',
        'Declined',
        'Cold Claims'
    ];

    const stagesPerView = 5;
    const totalStages = 9;

    // Generate sample claims
    const generateClaims = () => {
        // const distributions = [8, 10, 15, 6, 8, 9, 12, 4, 8];
        const distributions = [];
        const claims = [];
        let claimId = 1;

        distributions.forEach((count, stageIndex) => {
            for (let i = 0; i < count; i++) {
                const priorities = ['low', 'medium', 'high', 'urgent'];
                const priority = priorities[Math.floor(Math.random() * priorities.length)];
                const amount = Math.floor(Math.random() * 50000) + 10000;

                claims.push({
                    id: `CLM-2024-${String(claimId).padStart(3, '0')}`,
                    client: `Client ${claimId}`,
                    address: `${100 + claimId} Main St, Doylestown`,
                    amount: amount,
                    damageType: ['Wind/Hail', 'Water Damage', 'Fire', 'Lightning'][Math.floor(Math.random() * 4)],
                    priority: priority,
                    stage: stageIndex + 1,
                    stageName: stageNames[stageIndex],
                    needAction: Math.random() > 0.7,
                    highValue: amount > 35000,
                    urgent: priority === 'urgent' || priority === 'high'
                });
                claimId++;
            }
        });

        setAllClaims(claims);
        setFilteredClaims(claims);
    };

    // Initialize
    useEffect(() => {
        generateClaims();
    }, []);

    // Stage navigation scrolling
    const scrollStages = (direction) => {
        if (direction === 'right' && currentStageScroll < totalStages - stagesPerView) {
            setCurrentStageScroll(prev => prev + 1);
        } else if (direction === 'left' && currentStageScroll > 0) {
            setCurrentStageScroll(prev => prev - 1);
        }
    };

    // Show specific stage
    const showStage = (stageNumber) => {
        setCurrentStage(stageNumber);
        filterClaims(stageNumber, currentTab);
    };

    // Switch tabs
    const switchTab = (tab) => {
        setCurrentTab(tab);
        if (tab !== 'all') {
            setCurrentStage(0);
        }
        filterClaims(currentStage, tab);
    };

    // Filter claims based on current tab and stage
    const filterClaims = (stage = currentStage, tab = currentTab) => {
        let filtered = allClaims.filter(claim => {
            // Stage filter
            if (stage > 0 && claim.stage !== stage) {
                return false;
            }

            // Tab filter
            switch(tab) {
                case 'action':
                    return claim.needAction;
                case 'high':
                    return claim.highValue;
                case 'urgent':
                    return claim.urgent;
                case 'all':
                default:
                    return true;
            }
        });

        setFilteredClaims(filtered);
        setCurrentPage(1);
        setVisibleGridItems(10);
    };

    // View Mode Toggle
    const setViewMode = (mode) => {
        setCurrentView(mode);
    };

    // Create claim card HTML
    const createClaimCard = (claim) => {
        return (
            <div key={claim.id} className="claim-card" onClick={() => showClaimDetails(claim)}>
                <div className="claim-header">
                    <span className="claim-id">{claim.id}</span>
                    <div className={`claim-priority priority-${claim.priority}`}></div>
                </div>
                <div className="claim-client">{claim.client}</div>
                <div className="claim-amount">${claim.amount.toLocaleString()}</div>
                <div className="claim-tags">
                    <span className="claim-tag">{claim.damageType}</span>
                    {claim.urgent && <span className="claim-tag tag-urgent">Urgent</span>}
                </div>
                <div className="claim-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="claim-action-btn" onClick={() => showClaimDetails(claim)}>View</button>
                    <button className="claim-action-btn move-stage" onClick={(e) => showMoveStageMenu(claim.id, e)}>Move Stage</button>
                </div>
            </div>
        );
    };

    // Create stage column
    const createStageColumn = (stageNum) => {
        const stageClaims = filteredClaims.filter(c => c.stage === stageNum);
        const visibleClaims = stageClaims.slice(0, visibleGridItems);

        let cardsHtml = visibleClaims.map(claim => createClaimCard(claim));

        if (visibleClaims.length === 0) {
            cardsHtml = <div style={{padding: '1rem', color: '#6b7280', textAlign: 'center'}}>No claims</div>;
        }

        return (
            <div key={stageNum} className="pipeline-stage">
                <div className="stage-header">
                    <div className="stage-info">
                        <div className="stage-number">{stageNum}</div>
                        <div className="stage-title">{stageNames[stageNum - 1]}</div>
                        <div className="stage-stats">
                            <span className="stage-count">{stageClaims.length}</span> claims •
                            <span className="stage-value">${stageClaims.reduce((sum, c) => sum + c.amount, 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                <div className="stage-cards">
                    {cardsHtml}
                </div>
            </div>
        );
    };

    // Update Grid View
    const renderGridView = () => {
        if (typeof window === 'undefined') return null; // prevent SSR error

        const isMobile = window.innerWidth <= 768;

        if (isMobile && currentStage > 0) {
            return createStageColumn(currentStage);
        } else {
            return Array.from({ length: 9 }, (_, i) => i + 1).map(stageNum =>
                createStageColumn(stageNum)
            );
        }
    };


    // Show claim details
    const showClaimDetails = (claim) => {
        setSelectedClaim(claim);
        setShowClaimModal(true);
    };

    // Close modal
    const closeModal = () => {
        setShowClaimModal(false);
        setSelectedClaim(null);
    };

    // Show move stage menu
    const showMoveStageMenu = (claimId, event) => {
        if (event) event.stopPropagation();
        setShowClaimModal(false);
        setMoveMenuClaimId(claimId);
        setShowMoveMenu(true);
    };

    // Close move menu
    const closeMoveMenu = () => {
        setShowMoveMenu(false);
        setMoveMenuClaimId(null);
    };

    // Move claim to stage
    const moveClaimToStage = (claimId, newStage) => {
        const updatedClaims = allClaims.map(claim =>
            claim.id === claimId
                ? {...claim, stage: newStage, stageName: stageNames[newStage - 1]}
                : claim
        );

        setAllClaims(updatedClaims);
        setFilteredClaims(updatedClaims.filter(claim => {
            if (currentStage > 0 && claim.stage !== currentStage) return false;
            switch(currentTab) {
                case 'action': return claim.needAction;
                case 'high': return claim.highValue;
                case 'urgent': return claim.urgent;
                default: return true;
            }
        }));

        closeMoveMenu();
        alert(`Moved ${claimId} to Stage ${newStage}: ${stageNames[newStage - 1]}`);
    };

    // Update List View
    const renderListView = () => {
        const start = (currentPage - 1) * itemsPerPage;
        const end = Math.min(start + itemsPerPage, filteredClaims.length);
        const currentClaims = filteredClaims.slice(start, end);

        return (
            <table className="claims-table">
                <thead>
                <tr>
                    <th>Claim ID</th>
                    <th>Client Name</th>
                    <th>Property Address</th>
                    <th>Amount</th>
                    <th>Damage Type</th>
                    <th>Priority</th>
                    <th>Stage</th>
                    <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {currentClaims.map(claim => (
                    <tr key={claim.id}>
                        <td className="table-claim-id">{claim.id}</td>
                        <td>{claim.client}</td>
                        <td>{claim.address}</td>
                        <td style={{color: '#16a34a', fontWeight: 600}}>${claim.amount.toLocaleString()}</td>
                        <td>{claim.damageType}</td>
                        <td>
                <span className={`table-priority priority-${claim.priority}`}>
                  {claim.priority.charAt(0).toUpperCase() + claim.priority.slice(1)}
                </span>
                        </td>
                        <td>
                            <select
                                className="stage-selector"
                                value={claim.stage}
                                onChange={(e) => moveToStage(claim.id, parseInt(e.target.value))}
                            >
                                {stageNames.map((name, idx) => (
                                    <option key={idx + 1} value={idx + 1}>
                                        {idx + 1}. {name}
                                    </option>
                                ))}
                            </select>
                        </td>
                        <td>
                            <div className="table-actions">
                                <button className="table-action-btn" onClick={() => viewClaim(claim.id)}>View</button>
                                <button className="table-action-btn primary" onClick={() => processClaim(claim.id)}>Process</button>
                            </div>
                        </td>
                    </tr>
                ))}
                {filteredClaims.length === 0 && (
                    <tr>
                        <td colSpan="8" style={{textAlign: 'center', padding: '2rem', color: '#6b7280'}}>
                            No claims found
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
        );
    };

    // Move claim to different stage from list
    const moveToStage = (claimId, newStage) => {
        const updatedClaims = allClaims.map(claim =>
            claim.id === claimId
                ? {...claim, stage: newStage, stageName: stageNames[newStage - 1]}
                : claim
        );

        setAllClaims(updatedClaims);
        setFilteredClaims(updatedClaims.filter(claim => {
            if (currentStage > 0 && claim.stage !== currentStage) return false;
            switch(currentTab) {
                case 'action': return claim.needAction;
                case 'high': return claim.highValue;
                case 'urgent': return claim.urgent;
                default: return true;
            }
        }));

        alert(`Moved ${claimId} to Stage ${newStage}: ${stageNames[newStage - 1]}`);
    };

    // View claim details from list
    const viewClaim = (claimId) => {
        const claim = allClaims.find(c => c.id === claimId);
        if (claim) {
            showClaimDetails(claim);
        }
    };

    // Process claim
    const processClaim = (claimId) => {
        alert(`Processing ${claimId}`);
    };

    // Update items per page
    const updateItemsPerPage = (value) => {
        setItemsPerPage(parseInt(value));
        setCurrentPage(1);
    };

    // Show More for Grid View
    const showMoreGrid = () => {
        if (visibleGridItems >= filteredClaims.length) {
            setVisibleGridItems(10);
        } else {
            setVisibleGridItems(prev => prev + 10);
        }
    };

    // Pagination functions
    const nextPage = () => {
        const maxPage = Math.ceil(filteredClaims.length / itemsPerPage) || 1;
        if (currentPage < maxPage) {
            setCurrentPage(prev => prev + 1);
        }
    };

    const previousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    };

    const goToPage = (page) => {
        const maxPage = Math.ceil(filteredClaims.length / itemsPerPage) || 1;
        if (page >= 1 && page <= maxPage) {
            setCurrentPage(page);
        }
    };

    // Update showing count
    const getShowingCount = () => {
        if (currentView === 'grid') {
            return `1-${Math.min(visibleGridItems, filteredClaims.length)}`;
        } else {
            const start = (currentPage - 1) * itemsPerPage + 1;
            const end = Math.min(currentPage * itemsPerPage, filteredClaims.length);
            return filteredClaims.length > 0 ? `${start}-${end}` : '0';
        }
    };

    // Render pagination buttons
    const renderPaginationButtons = () => {
        const totalPages = Math.ceil(filteredClaims.length / itemsPerPage) || 1;
        const buttons = [];

        // Previous button
        buttons.push(
            <button
                key="prev"
                className="pagination-btn"
                onClick={previousPage}
                disabled={currentPage === 1 || totalPages === 0}
            >
                Previous
            </button>
        );

        // Page number buttons
        if (totalPages === 1 || filteredClaims.length === 0) {
            buttons.push(
                <button key="1" className="pagination-btn active" disabled>1</button>
            );
        } else {
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, startPage + 4);

            if (endPage - startPage < 4) {
                startPage = Math.max(1, endPage - 4);
            }

            if (startPage > 1) {
                buttons.push(
                    <button key="1" className="pagination-btn" onClick={() => goToPage(1)}>1</button>
                );
                if (startPage > 2) {
                    buttons.push(<span key="ellipsis1" style={{padding: '0 0.5rem', color: '#6b7280'}}>...</span>);
                }
            }

            for (let i = startPage; i <= endPage; i++) {
                buttons.push(
                    <button
                        key={i}
                        className={`pagination-btn ${i === currentPage ? 'active' : ''}`}
                        onClick={() => goToPage(i)}
                    >
                        {i}
                    </button>
                );
            }

            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    buttons.push(<span key="ellipsis2" style={{padding: '0 0.5rem', color: '#6b7280'}}>...</span>);
                }
                buttons.push(
                    <button key={totalPages} className="pagination-btn" onClick={() => goToPage(totalPages)}>
                        {totalPages}
                    </button>
                );
            }
        }

        // Next button
        buttons.push(
            <button
                key="next"
                className="pagination-btn"
                onClick={nextPage}
                disabled={currentPage >= totalPages || totalPages <= 1}
            >
                Next
            </button>
        );

        return buttons;
    };

    // Export functions
    const exportClaims = () => {
        const headers = ['Claim ID', 'Client Name', 'Address', 'Amount', 'Damage Type', 'Priority', 'Stage'];
        const csvContent = [
            headers.join(','),
            ...filteredClaims.map(claim => [
                claim.id,
                `"${claim.client}"`,
                `"${claim.address}"`,
                claim.amount,
                claim.damageType,
                claim.priority,
                `"Stage ${claim.stage}: ${claim.stageName}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `claims_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        alert(`Exported ${filteredClaims.length} claims to CSV`);
    };

    const exportPipeline = () => {
        exportClaims();
    };

    const bulkUpdate = () => {
        alert('Bulk Update: Select multiple claims to update their status, stage, or priority');
    };

    const generateReport = () => {
        const totalValue = filteredClaims.reduce((sum, c) => sum + c.amount, 0);
        const avgValue = totalValue / filteredClaims.length;

        alert(`Revenue Report:\nTotal Claims: ${filteredClaims.length}\nTotal Value: $${totalValue.toLocaleString()}\nAverage Claim: $${Math.round(avgValue).toLocaleString()}\n\nDetailed report would open in new window`);
    };

    const createNewClaim = () => {
        alert('New Claim form would open here');
    };

    // Calculate stage transform for mobile
    const getStageTransform = () => {
        const scrollAmount = 48; // 40px + 8px gap
        return `translateX(${-(currentStageScroll * scrollAmount)}px)`;
    };

    // Get current stage info
    const getCurrentStageInfo = () => {
        if (currentStage === 0) {
            let titleText = 'All Claims';
            switch(currentTab) {
                case 'action': titleText = 'Action Required Claims'; break;
                case 'high': titleText = 'High Value Claims (>$35,000)'; break;
                case 'urgent': titleText = 'Urgent Priority Claims'; break;
            }

            const totalValue = filteredClaims.reduce((sum, c) => sum + c.amount, 0);
            return {
                title: titleText,
                stats: `${filteredClaims.length} total claims • $${totalValue.toLocaleString()} total value • Showing ${getShowingCount()} of ${filteredClaims.length}`
            };
        } else {
            const stageClaims = allClaims.filter(c => c.stage === currentStage);
            const totalValue = stageClaims.reduce((sum, c) => sum + c.amount, 0);
            return {
                title: `Stage ${currentStage}: ${stageNames[currentStage - 1]}`,
                stats: `${stageClaims.length} claims • $${totalValue.toLocaleString()} total value • Showing ${getShowingCount()} of ${stageClaims.length}`
            };
        }
    };

    const stageInfo = getCurrentStageInfo();

    return (
        <div className="main-container">
            {/* Header */}
            <div className="header-section">
                <h1 className="header-title">Claims Pipeline Management</h1>
                <p className="header-subtitle">Track and manage all active insurance claims in real-time</p>
            </div>

            {/* Search Section */}
            <div className="search-section">
                <div className="search-box">
                    <svg className="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path
                            d="M17.5 17.5L13.875 13.875M15.8333 9.16667C15.8333 12.8486 12.8486 15.8333 9.16667 15.8333C5.48477 15.8333 2.5 12.8486 2.5 9.16667C2.5 5.48477 5.48477 2.5 9.16667 2.5C12.8486 2.5 15.8333 5.48477 15.8333 9.16667Z"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <input type="text" className="search-input"
                           placeholder="Search by client name, claim ID, or address..."/>
                </div>
                <div className="quick-actions">
                    <button className="quick-action-btn" onClick={createNewClaim}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path
                                d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2Z"/>
                        </svg>
                        New Claim
                    </button>
                    <button className="quick-action-btn" onClick={exportClaims}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path
                                d="M8 10a.5.5 0 0 0 .5-.5V3.707l2.146 2.147a.5.5 0 0 0 .708-.708l-3-3a.5.5 0 0 0-.708 0l-3 3a.5.5 0 1 0 .708.708L7.5 3.707V9.5a.5.5 0 0 0 .5.5z"/>
                            <path d="M2 12.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/>
                        </svg>
                        Export
                    </button>
                </div>
            </div>

            <div className="stats-overview">
                <StatCard label="Total Claims" data={statsData.totalClaims} />
                <StatCard label="Action Required" data={statsData.actionRequired} />
                <StatCard label="Pipeline Value" data={statsData.pipelineValue} />
                <StatCard label="High Priority" data={statsData.highPriority} />
                <StatCard label="Need Supplement" data={statsData.needSupplement} />
                <StatCard label="Avg. Resolution" data={statsData.avgResolution} />
            </div>

            {/* Pipeline Tabs */}
            <div className="pipeline-tabs">
                <button
                    className={`pipeline-tab ${currentTab === 'action' ? 'active' : ''}`}
                    onClick={() => switchTab('action')}
                >
                    Action Required
                    <span className="tab-badge action">0</span>
                </button>
                <button
                    className={`pipeline-tab ${currentTab === 'all' ? 'active' : ''}`}
                    onClick={() => switchTab('all')}
                >
                    All Claims
                    <span className="tab-badge">0</span>
                </button>
                <button
                    className={`pipeline-tab ${currentTab === 'high' ? 'active' : ''}`}
                    onClick={() => switchTab('high')}
                >
                    High Value
                    <span className="tab-badge">0</span>
                </button>
                <button
                    className={`pipeline-tab ${currentTab === 'urgent' ? 'active' : ''}`}
                    onClick={() => switchTab('urgent')}
                >
                    Urgent
                    <span className="tab-badge urgent">0</span>
                </button>
            </div>

            {/* Stage Navigator */}
            <div className="stage-navigator">
                <button
                    className="stage-nav-arrow left"
                    onClick={() => scrollStages('left')}
                    style={{
                        display:
                            typeof window !== 'undefined' && window.innerWidth <= 768 && currentStageScroll > 0
                                ? 'flex'
                                : 'none',
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M10 13l-5-5 5-5v10z" />
                    </svg>
                </button>

                <div className="stage-nav-container">
                    <div className="stage-nav-scroll" style={{transform: getStageTransform()}}>
                        {Array.from({length: 9}, (_, i) => i + 1).map(stageNum => (
                            <button
                                key={stageNum}
                                className={`stage-nav-btn ${currentStage === stageNum ? 'active' : ''}`}
                                onClick={() => showStage(stageNum)}
                            >
                                {stageNum}
                            </button>
                        ))}
                    </div>
                </div>
                <button
                    className="stage-nav-arrow right"
                    onClick={() => scrollStages('right')}
                    style={{
                        display:
                            typeof window !== 'undefined' && window.innerWidth <= 768
                                ? 'flex'
                                : 'none',
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M6 13l5-5-5-5v10z" />
                    </svg>
                </button>

            </div>

            {/* View Controls */}
            <div className="view-controls">
                <div className="view-toggle-container">
                    <button
                        className={`view-toggle-btn ${currentView === 'grid' ? 'active' : ''}`}
                        onClick={() => setViewMode('grid')}
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path
                                d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zM9 2.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3z"/>
                        </svg>
                        Grid View
                    </button>
                    <button
                        className={`view-toggle-btn ${currentView === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path fillRule="evenodd"
                                  d="M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5z"/>
                        </svg>
                        List View
                    </button>
                </div>

                <div className="items-per-page">
                    <label>Show:</label>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => updateItemsPerPage(e.target.value)}
                    >
                        <option value="10">10 items</option>
                        <option value="25">25 items</option>
                        <option value="50">50 items</option>
                        <option value="100">100 items</option>
                    </select>
                </div>
            </div>

            {/* Pipeline Content */}
            <div className="pipeline-content">
                {/* Current Stage Info */}
                <div className="current-stage-info">
                    <h3 className="current-stage-title">{stageInfo.title}</h3>
                    <div className="current-stage-stats">
                        {stageInfo.stats.split(' • ').map((stat, index) => (
                            <span key={index} dangerouslySetInnerHTML={{__html: stat}}/>
                        ))}
                    </div>
                </div>

                {/* Pipeline Board View (Grid) */}
                {currentView === 'grid' && (
                    <>
                        <div className="pipeline-board" id="pipelineView">
                            {renderGridView()}
                        </div>

                        {/* Show More Button for Grid View */}
                        {filteredClaims.length > 10 && (
                            <div className="show-more-container">
                                <button className="show-more-btn" onClick={showMoreGrid}>
                                    {visibleGridItems >= filteredClaims.length ? 'Show Less' : `Show More (${Math.min(10, filteredClaims.length - visibleGridItems)})`}
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* List View Table */}
                {currentView === 'list' && (
                    <div className="list-view-table">
                        {renderListView()}

                        {/* Pagination Controls */}
                        <div className="pagination-controls">
                            <div className="pagination-info">
                                Showing <span id="paginationInfo">
                  {filteredClaims.length > 0 ?
                      `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, filteredClaims.length)}` :
                      '0'
                  }
                </span> of <span id="totalClaims">{filteredClaims.length}</span> claims
                            </div>
                            <div className="pagination-buttons">
                                {renderPaginationButtons()}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Analytics Section */}
            <div className="analytics-section">
                <div className="analytics-header">
                    <h2 className="analytics-title">Pipeline Analytics</h2>
                    <div className="analytics-actions">
                        <button className="analytics-btn" onClick={exportPipeline}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path
                                    d="M8 10a.5.5 0 0 0 .5-.5V3.707l2.146 2.147a.5.5 0 0 0 .708-.708l-3-3a.5.5 0 0 0-.708 0l-3 3a.5.5 0 1 0 .708.708L7.5 3.707V9.5a.5.5 0 0 0 .5.5z"/>
                            </svg>
                            Export Pipeline
                        </button>
                        <button className="analytics-btn" onClick={bulkUpdate}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path
                                    d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                            </svg>
                            Bulk Update
                        </button>
                        <button className="analytics-btn primary" onClick={generateReport}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M3 1h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2z"/>
                            </svg>
                            Revenue Report
                        </button>
                    </div>
                </div>

                <div className="analytics-grid grid grid-cols-4 gap-5">
                    {/* Total Claims Card
                    <div className="analytics-card">
                        <div className="analytics-card-header">
                            <h3 className="analytics-card-title">Total Claims</h3>
                            <span className="analytics-trend positive">+12%</span>
                        </div>
                        <div className="analytics-card-value">80</div>
                        <div className="analytics-card-subtitle">Active in Pipeline</div>
                        <div className="analytics-progress">
                            <div className="progress-bar" style={{width: '75%'}}></div>
                        </div>
                    </div>

                     Pipeline Value Card
                    <div className="analytics-card">
                        <div className="analytics-card-header">
                            <h3 className="analytics-card-title">Pipeline Value</h3>
                            <span className="analytics-trend positive">+28%</span>
                        </div>
                        <div className="analytics-card-value">$1.4M</div>
                        <div className="analytics-card-subtitle">Total Potential Revenue</div>
                        <div className="analytics-progress">
                            <div className="progress-bar" style={{width: '82%'}}></div>
                        </div>
                    </div>

                     Average Days Per Stage Card
                    <div className="analytics-card">
                        <div className="analytics-card-header">
                            <h3 className="analytics-card-title">Avg Days/Stage</h3>
                            <span className="analytics-trend negative">-0.8d</span>
                        </div>
                        <div className="analytics-card-value">3.2</div>
                        <div className="analytics-card-subtitle">Processing Time</div>
                        <div className="stage-breakdown">
                            <div className="stage-item">
                                <span className="stage-label">Stage 1-3:</span>
                                <span className="stage-days">2.1d</span>
                            </div>
                            <div className="stage-item">
                                <span className="stage-label">Stage 4-6:</span>
                                <span className="stage-days">4.5d</span>
                            </div>
                            <div className="stage-item">
                                <span className="stage-label">Stage 7-9:</span>
                                <span className="stage-days">3.0d</span>
                            </div>
                        </div>
                    </div>

                     Success Rate Card
                    <div className="analytics-card">
                        <div className="analytics-card-header">
                            <h3 className="analytics-card-title">Success Rate</h3>
                            <span className="analytics-trend positive">+5%</span>
                        </div>
                        <div className="analytics-card-value">94%</div>
                        <div className="analytics-card-subtitle">Claims Approved</div>
                        <div className="success-breakdown">
                            <div className="success-item">
                                <span className="success-label">Approved:</span>
                                <span className="success-value">75 claims</span>
                            </div>
                            <div className="success-item">
                                <span className="success-label">Declined:</span>
                                <span className="success-value">4 claims</span>
                            </div>
                            <div className="success-item">
                                <span className="success-label">Pending:</span>
                                <span className="success-value">1 claim</span>
                            </div>
                        </div>
                    </div>

                     Need Action Card
                    <div className="analytics-card highlight">
                        <div className="analytics-card-header">
                            <h3 className="analytics-card-title">Need Action</h3>
                            <span className="analytics-badge urgent">Urgent</span>
                        </div>
                        <div className="analytics-card-value">12</div>
                        <div className="analytics-card-subtitle">Require Immediate Attention</div>
                        <div className="action-breakdown">
                            <div className="action-item urgent">
                                <span className="action-icon">⚠️</span>
                                <span className="action-text">3 Overdue</span>
                            </div>
                            <div className="action-item warning">
                                <span className="action-icon">📋</span>
                                <span className="action-text">5 Need Supplement</span>
                            </div>
                            <div className="action-item info">
                                <span className="action-icon">📅</span>
                                <span className="action-text">4 Schedule Required</span>
                            </div>
                        </div>
                    </div>

                     Average Claim Card
                    <div className="analytics-card">
                        <div className="analytics-card-header">
                            <h3 className="analytics-card-title">Average Claim</h3>
                            <span className="analytics-trend positive">+15%</span>
                        </div>
                        <div className="analytics-card-value">$17.5K</div>
                        <div className="analytics-card-subtitle">Per Claim Value</div>
                        <div className="claim-range">
                            <div className="range-item">
                                <span className="range-label">Min:</span>
                                <span className="range-value">$8,900</span>
                            </div>
                            <div className="range-item">
                                <span className="range-label">Max:</span>
                                <span className="range-value">$58,900</span>
                            </div>
                            <div className="range-item">
                                <span className="range-label">Median:</span>
                                <span className="range-value">$31,200</span>
                            </div>
                        </div>
                    </div>*/}

                    <AnalyticsCard
                        title="Total Claims"
                        value={analyticsData?.totalClaims?.value}
                        trend={analyticsData?.totalClaims?.trend}
                        subtitle="Active in Pipeline"
                        progress={analyticsData?.totalClaims?.progress || 0}
                    />

                    <AnalyticsCard
                        title="Pipeline Value"
                        value={analyticsData?.pipelineValue?.value || "$0"}
                        trend={analyticsData?.pipelineValue?.trend}
                        subtitle="Total Potential Revenue"
                        progress={analyticsData?.pipelineValue?.progress || 0}
                    />

                    <AnalyticsCard
                        title="Avg Days/Stage"
                        value={analyticsData?.avgDays?.value || "0"}
                        trend={analyticsData?.avgDays?.trend}
                    >
                        <div className="stage-breakdown">
                            {(analyticsData?.avgDays?.stages || ["0d", "0d", "0d"]).map((days, i) => (
                                <div key={i} className="stage-item">
                                    <span className="stage-label">Stage {i*3+1}-{i*3+3}:</span>
                                    <span className="stage-days">{days}</span>
                                </div>
                            ))}
                        </div>
                    </AnalyticsCard>

                    <AnalyticsCard
                        title="Success Rate"
                        value={analyticsData?.successRate?.value || "0%"}
                        trend={analyticsData?.successRate?.trend}
                    >
                        <div className="success-breakdown">
                            <div className="success-item">
                                <span className="success-label">Approved:</span>
                                <span className="success-value">{analyticsData?.successRate?.approved || 0} claims</span>
                            </div>
                        </div>
                    </AnalyticsCard>

                    <AnalyticsCard
                        title="Need Action"
                        value={analyticsData?.needAction?.count || "0"}
                        highlight={true}
                        badge="Urgent"
                    >
                        <div className="action-breakdown">
                            <div className="action-item urgent">
                                <span className="action-icon">⚠️</span>
                                <span className="action-text">{analyticsData?.needAction?.overdue || 0} Overdue</span>
                            </div>
                        </div>
                    </AnalyticsCard>

                </div>

                {/* Activity Section */}
                <div className="activity-section">
                    <div className="activity-container">
                        <RecentActivity activities={recentActivities} />
                        <ActionItems actionItems={actionItems} />
                    </div>
                </div>
            </div>

            {/* Claim Details Modal */}
            {showClaimModal && selectedClaim && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Claim Details</h2>
                            <button className="modal-close" onClick={closeModal}>
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                    <path
                                        d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
                                </svg>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="claim-details-grid">
                                <div className="detail-group">
                                    <label>Claim ID</label>
                                    <div className="detail-value">{selectedClaim.id}</div>
                                </div>
                                <div className="detail-group">
                                    <label>Client Name</label>
                                    <div className="detail-value">{selectedClaim.client}</div>
                                </div>
                                <div className="detail-group">
                                    <label>Property Address</label>
                                    <div className="detail-value">{selectedClaim.address}</div>
                                </div>
                                <div className="detail-group">
                                    <label>Claim Amount</label>
                                    <div className="detail-value" style={{color: '#16a34a', fontWeight: 600}}>
                                        ${selectedClaim.amount.toLocaleString()}
                                    </div>
                                </div>
                                <div className="detail-group">
                                    <label>Damage Type</label>
                                    <div className="detail-value">{selectedClaim.damageType}</div>
                                </div>
                                <div className="detail-group">
                                    <label>Priority</label>
                                    <div className="detail-value">
                                        <span className={`table-priority priority-${selectedClaim.priority}`}>
                                            {selectedClaim.priority.charAt(0).toUpperCase() + selectedClaim.priority.slice(1)}
                                        </span>
                                    </div>
                                </div>
                                <div className="detail-group">
                                    <label>Current Stage</label>
                                    <div className="detail-value">
                                        Stage {selectedClaim.stage}: {selectedClaim.stageName}
                                    </div>
                                </div>
                                <div className="detail-group">
                                    <label>Status</label>
                                    <div className="detail-value">
                                        {selectedClaim.needAction ? (
                                            <span style={{color: '#dc2626', fontWeight: 600}}>Action Required</span>
                                        ) : (
                                            <span style={{color: '#16a34a', fontWeight: 600}}>In Progress</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="modal-btn secondary" onClick={closeModal}>
                                Close
                            </button>
                            <button
                                className="modal-btn primary"
                                onClick={() => showMoveStageMenu(selectedClaim.id)}
                            >
                                Move to Different Stage
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Move Stage Menu */}
            {showMoveMenu && (
                <div className="modal-overlay" onClick={closeMoveMenu}>
                    <div className="modal-content move-stage-menu" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Move Claim to Stage</h2>
                            <button className="modal-close" onClick={closeMoveMenu}>
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                    <path
                                        d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
                                </svg>
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>Select a new stage for claim <strong>{moveMenuClaimId}</strong>:</p>
                            <div className="stage-options">
                                {Array.from({length: 9}, (_, i) => i + 1).map(stageNum => (
                                    <button
                                        key={stageNum}
                                        className="stage-option"
                                        onClick={() => moveClaimToStage(moveMenuClaimId, stageNum)}
                                    >
                                        <div className="stage-option-number">{stageNum}</div>
                                        <div className="stage-option-name">{stageNames[stageNum - 1]}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="modal-btn secondary" onClick={closeMoveMenu}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClaimsManagement;