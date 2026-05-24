'use client'
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance';
import { createClient } from '@/lib/supabase/client';
import "./claims.css"
import MapView from "@/app/dashboard/claims/MapView.jsx";
import StatCard from "@/app/dashboard/claims/Components/StatCard.js";
import AnalyticsCard from "@/app/dashboard/claims/Components/AnalyticsCard.js";
import RecentActivity from "@/app/dashboard/claims/Components/RecentActivity.js";
import ActionItems from "@/app/dashboard/claims/Components/ActionItems.js";

const ClaimsManagement = () => {
    const router = useRouter();
    const goToDetail = (claimId) => router.push(`/dashboard/claims/${claimId}`);
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
    // Tracks viewport size on the client only — kept in state (not read from
    // window during render) so server and first client render match (no hydration mismatch).
    const [isMobile, setIsMobile] = useState(false);

    // New Claim form modal
    const emptyNcForm = {
        clientName: '', clientEmail: '', clientPhone: '', address: '',
        insurer: '', policy: '', claimNum: '', dateOfLoss: '',
        damageType: 'Wind/Hail', priority: 'medium', amount: '', salesRep: '',
        adjusterName: '', adjusterPhone: '', insuranceEmail: '', notes: ''
    };
    const [showNewClaimModal, setShowNewClaimModal] = useState(false);
    const [ncForm, setNcForm] = useState(emptyNcForm);
    const [ncFiles, setNcFiles] = useState({ estimates: [], measurements: [], photos: [] });
    const [ncSuggestions, setNcSuggestions] = useState([]);
    const [ncErrors, setNcErrors] = useState({ clientName: false, address: false });
    const [ncDragKey, setNcDragKey] = useState(null);
    const [ncDocsOpen, setNcDocsOpen] = useState(false);
    const ncFileInputs = { estimates: useRef(null), measurements: useRef(null), photos: useRef(null) };

    // Reusable Tailwind class strings for the New Claim modal
    const ncSectionCls = "mb-7 last:mb-0";
    const ncTitleCls = "flex items-center gap-2 text-[0.9rem] font-bold text-[#1a1f3a] mb-4 pb-2 border-b-2 border-[#FDB813]";
    const ncStepCls = "inline-flex items-center justify-center w-[22px] h-[22px] bg-[#1a1f3a] text-[#FDB813] rounded-full text-xs font-bold shrink-0";
    const ncOptionalCls = "ml-auto text-[0.7rem] font-semibold uppercase text-gray-400 tracking-wide";
    const ncGridCls = "grid grid-cols-1 sm:grid-cols-2 gap-4";
    const ncFieldCls = "flex flex-col gap-1.5";
    const ncLabelCls = "text-xs font-semibold text-gray-700";
    const ncHintCls = "text-[0.7rem] text-gray-400";
    const ncInputBase = "w-full px-3.5 py-2.5 border-2 rounded-[10px] text-sm text-gray-800 bg-gray-50 transition-all placeholder:text-gray-400 focus:outline-none focus:border-[#FDB813] focus:bg-white focus:shadow-[0_0_0_4px_rgba(253,184,19,0.1)]";
    const ncInput = (err) => `${ncInputBase} ${err ? 'border-red-600 bg-red-50' : 'border-gray-200'}`;

    const salesReps = ['Mike Reynolds', 'Jessica Tran', 'Carlos Ramirez', 'Emily Brooks'];

    // Demo set of existing clients for autofill. In production this is pulled
    // from the clients table (Supabase) keyed by company_id.
    const existingClients = [
        { name: 'Sarah Mitchell', email: 'sarah.mitchell@email.com', phone: '(330) 555-0142', address: '482 Oakwood Dr, Doylestown, OH 44230', insurer: 'State Farm', policy: 'SF-7741920' },
        { name: 'James Carter', email: 'jcarter@email.com', phone: '(330) 555-0198', address: '17 Birchwood Ln, Wadsworth, OH 44281', insurer: 'Allstate', policy: 'AL-2298104' },
        { name: 'Linda Nguyen', email: 'l.nguyen@email.com', phone: '(330) 555-0173', address: '903 Maple Ridge Rd, Medina, OH 44256', insurer: 'Liberty Mutual', policy: 'LM-5530217' },
        { name: 'Robert Davis', email: 'rdavis@email.com', phone: '(234) 555-0110', address: '226 Sunset Blvd, Akron, OH 44302', insurer: 'Nationwide', policy: 'NW-8841003' }
    ];

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

    // 12-stage pipeline — matches sql/_patch_client_portals_12_stages.sql (1..12)
    const stageNames = [
        'Need Claim Number',
        'Awaiting Initial Inspection',
        'Scheduled Inspection',
        'In Progress',
        'Tile Sample Required',
        'Reinspection Requested',
        'Partial Approval',
        'Supplementing',
        'Final Check Processing',
        'Completed',
        'Declined',
        'Cold Claims / Lost'
    ];

    const stagesPerView = 5;
    const totalStages = 12;

    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentUserId, setCurrentUserId] = useState(null);
    const dragClaimId = useRef(null);
    const [dragOverStage, setDragOverStage] = useState(null);
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    // Synced top scrollbar for the Kanban board
    const boardRef = useRef(null);
    const topScrollRef = useRef(null);
    const [boardScrollWidth, setBoardScrollWidth] = useState(0);
    // Mirrors the active filter so background refetches (realtime) can re-apply
    // it without resetting the user's view.
    const filterRef = useRef({ stage: 0, tab: 'all', search: '' });

    // Map a backend client_portal row -> the shape this page renders.
    const mapClaim = (c) => {
        const stage = c.claim_status || 1;
        const amount = Number(c.claim_value) || 0;
        const addressParts = [c.address, c.city, c.state, c.zip_code].filter(Boolean);
        return {
            id: c.id, // real uuid (used for backend calls)
            displayId: c.claim_number || c.id?.slice(0, 8) || 'Pending',
            client: c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed',
            address: addressParts.join(', '),
            amount,
            damageType: c.damage_type || '—',
            insurer: c.insurance_carrier || c.insurance_company || '',
            priority: c.priority || 'medium',
            stage,
            stageName: stageNames[stage - 1] || 'Unknown',
            claimNumber: c.claim_number || '',
            policyNumber: c.policy_number || '',
            assignedTo: c.assigned_to_user_id || null,
            updatedAt: c.updated_at,
            needAction: stage === 1, // no claim # yet -> action required
            // Overdue = an active claim (not terminal) untouched for > 7 days
            overdue: stage < 10 && c.updated_at
                ? (Date.now() - new Date(c.updated_at).getTime()) > 7 * 86400000
                : false,
            highValue: amount > 35000,
            urgent: c.priority === 'urgent' || c.priority === 'high'
        };
    };

    // "Updated 2h ago" style relative time
    const timeAgo = (iso) => {
        if (!iso) return '';
        const diff = Date.now() - new Date(iso).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'just now';
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        const d = Math.floor(h / 24);
        return `${d}d ago`;
    };

    // Compute stat/analytics cards from the real claim list
    const recomputeStats = (claims) => {
        const open = claims.filter(c => c.stage < 10); // not completed/declined/cold
        const pipelineValue = open.reduce((s, c) => s + c.amount, 0);
        const actionReq = claims.filter(c => c.needAction).length;
        const highPri = claims.filter(c => c.urgent).length;
        const supplement = claims.filter(c => c.stage === 8).length;
        const fmtMoney = (n) => n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`;

        setStatsData(prev => ({
            ...prev,
            totalClaims: { value: String(claims.length), change: 'live', isPositive: true },
            actionRequired: { value: String(actionReq), change: `${actionReq} need action`, isPositive: false },
            pipelineValue: { value: fmtMoney(pipelineValue), change: `${open.length} open`, isPositive: true },
            highPriority: { value: String(highPri), change: `${highPri} urgent/high`, isPositive: false },
            needSupplement: { value: String(supplement), change: `${supplement} in supplement`, isPositive: true },
            avgResolution: prev.avgResolution,
        }));
        setAnalyticsData(prev => ({
            ...prev,
            totalClaims: { value: String(claims.length), trend: '', subtitle: 'Active in Pipeline', progress: Math.min(100, claims.length) },
            pipelineValue: { value: fmtMoney(pipelineValue), trend: '', subtitle: 'Total Potential Revenue', progress: 0 },
            needAction: { value: String(actionReq), overdue: 0, supplement, schedule: 0 },
        }));
    };

    // Pure filter — given rows + the active filter, return the visible subset.
    const computeFiltered = (rows, stage, tab, search) => {
        const term = (search || '').trim().toLowerCase();
        return rows.filter(claim => {
            if (stage > 0 && claim.stage !== stage) return false;
            if (term) {
                const haystack = `${claim.client} ${claim.displayId} ${claim.claimNumber} ${claim.address} ${claim.insurer}`.toLowerCase();
                if (!haystack.includes(term)) return false;
            }
            switch (tab) {
                case 'action': return claim.needAction;
                case 'high': return claim.highValue;
                case 'urgent': return claim.urgent;
                case 'mine': return claim.assignedTo && claim.assignedTo === currentUserId;
                case 'overdue': return claim.overdue;
                default: return true;
            }
        });
    };

    // Fetch claims from the shared /client-portal API (a client_portal row = one claim)
    const fetchClaims = async ({ silent = false } = {}) => {
        try {
            if (!silent) setLoading(true);
            const res = await axiosInstance.get('/client-portal');
            const rows = (res.data?.data || []).map(mapClaim);
            const { stage, tab, search } = filterRef.current;
            setAllClaims(rows);
            setFilteredClaims(computeFiltered(rows, stage, tab, search));
            recomputeStats(rows);
        } catch {
            // axiosInstance surfaces a toast on error
        } finally {
            if (!silent) setLoading(false);
        }
    };

    // Keep the latest fetchClaims closure reachable from the realtime callback.
    const fetchClaimsRef = useRef(fetchClaims);
    fetchClaimsRef.current = fetchClaims;

    // Initialize
    useEffect(() => {
        fetchClaims();
    }, []);

    // Realtime multi-user sync — when any team member changes a claim, the
    // board refreshes (debounced, silent). No-op if realtime isn't enabled on
    // the table / publication, so it degrades gracefully.
    useEffect(() => {
        const supabase = createClient();
        let t;
        const channel = supabase
            .channel('claims-board')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'client_portals' },
                () => {
                    clearTimeout(t);
                    t = setTimeout(() => fetchClaimsRef.current({ silent: true }), 800);
                },
            )
            .subscribe();
        return () => {
            clearTimeout(t);
            supabase.removeChannel(channel);
        };
    }, []);

    // Load current user id (for the "My Claims" tab)
    useEffect(() => {
        (async () => {
            try {
                const { data } = await createClient().auth.getUser();
                setCurrentUserId(data?.user?.id || null);
            } catch { /* ignore */ }
        })();
    }, []);

    // Track viewport on the client only
    useEffect(() => {
        const update = () => setIsMobile(window.innerWidth <= 768);
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    // Keep the top scrollbar's width in sync with the board's scroll width.
    useEffect(() => {
        const measure = () => setBoardScrollWidth(boardRef.current?.scrollWidth || 0);
        measure();
        window.addEventListener('resize', measure);
        const tid = setTimeout(measure, 100); // after layout settles
        return () => { window.removeEventListener('resize', measure); clearTimeout(tid); };
    }, [filteredClaims, currentView, visibleGridItems, isMobile, currentStage]);

    // Two-way scroll sync between the top bar and the board.
    const onTopScroll = () => {
        if (boardRef.current && topScrollRef.current) boardRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    };
    const onBoardScroll = () => {
        if (boardRef.current && topScrollRef.current) topScrollRef.current.scrollLeft = boardRef.current.scrollLeft;
    };

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

    // Filter claims based on current tab, stage and search term
    const filterClaims = (stage = currentStage, tab = currentTab, search = searchQuery) => {
        filterRef.current = { stage, tab, search };
        setFilteredClaims(computeFiltered(allClaims, stage, tab, search));
        setCurrentPage(1);
        setVisibleGridItems(10);
    };

    // Search box handler
    const onSearchChange = (value) => {
        setSearchQuery(value);
        filterClaims(currentStage, currentTab, value);
    };

    // View Mode Toggle
    const setViewMode = (mode) => {
        setCurrentView(mode);
    };

    // Create claim card HTML
    const createClaimCard = (claim) => {
        return (
            <div key={claim.id} className="claim-card" onClick={() => showClaimDetails(claim)}
                draggable
                onDragStart={(e) => onCardDragStart(e, claim.id)}
                onDragEnd={onCardDragEnd}>
                <div className="claim-header">
                    <span className="claim-id">{claim.displayId}</span>
                    <div className={`claim-priority priority-${claim.priority}`}></div>
                </div>
                <div className="claim-client">{claim.client}</div>
                {claim.insurer && <div style={{fontSize: '0.72rem', color: '#6b7280', marginBottom: '0.25rem'}}>{claim.insurer}</div>}
                <div className="claim-amount">${claim.amount.toLocaleString()}</div>
                <div className="claim-tags">
                    {claim.damageType && claim.damageType !== '—' && <span className="claim-tag">{claim.damageType}</span>}
                    {claim.urgent && <span className="claim-tag tag-urgent">🔥 Urgent</span>}
                    {claim.overdue && <span className="claim-tag tag-urgent">⏰ Overdue</span>}
                    {claim.stage === 8 && <span className="claim-tag tag-urgent">💰 Supplement</span>}
                </div>
                {claim.updatedAt && <div style={{fontSize: '0.7rem', color: '#9ca3af', marginBottom: '0.5rem'}}>Updated {timeAgo(claim.updatedAt)}</div>}
                <div className="claim-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="claim-action-btn primary" onClick={() => goToDetail(claim.id)}>Open</button>
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
            <div key={stageNum}
                className={`pipeline-stage${dragOverStage === stageNum ? ' drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOverStage !== stageNum) setDragOverStage(stageNum); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverStage(prev => prev === stageNum ? null : prev); }}
                onDrop={(e) => { e.preventDefault(); onStageDrop(stageNum); }}>
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
        if (isMobile && currentStage > 0) {
            return createStageColumn(currentStage);
        } else {
            return Array.from({ length: totalStages }, (_, i) => i + 1).map(stageNum =>
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

    // Apply a stage change to local state (optimistic), keeping the active filter.
    const applyStageLocally = (claimId, newStage) => {
        const updatedClaims = allClaims.map(claim =>
            claim.id === claimId
                ? {...claim, stage: newStage, stageName: stageNames[newStage - 1], needAction: newStage === 1}
                : claim
        );
        setAllClaims(updatedClaims);
        const { stage, tab, search } = filterRef.current;
        setFilteredClaims(computeFiltered(updatedClaims, stage, tab, search));
        recomputeStats(updatedClaims);
    };

    // Persist a stage change to the backend (client_portal.claim_status).
    // Backend logs the activity event automatically on update.
    const persistStage = async (claimId, newStage) => {
        try {
            await axiosInstance.put(`/client-portal/${claimId}`, { claim_status: newStage });
            toast.success(`Moved to ${newStage}. ${stageNames[newStage - 1]}`);
        } catch {
            toast.error('Could not save stage change — reverting.');
            fetchClaims(); // re-sync from server
        }
    };

    // Move claim to stage (from the move-stage menu)
    const moveClaimToStage = (claimId, newStage) => {
        applyStageLocally(claimId, newStage);
        closeMoveMenu();
        persistStage(claimId, newStage);
    };

    // ── Bulk selection (list view) ────────────────────────────────────────
    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };
    const toggleSelectAll = (ids) => {
        setSelectedIds(prev => {
            const allSelected = ids.length > 0 && ids.every(id => prev.has(id));
            return allSelected ? new Set() : new Set(ids);
        });
    };
    const clearSelection = () => setSelectedIds(new Set());

    // Bulk move selected claims to a new stage
    const bulkMove = async (newStage) => {
        const ids = [...selectedIds];
        if (!ids.length || !newStage) return;
        // Optimistic: apply all locally
        let updated = allClaims;
        ids.forEach(id => {
            updated = updated.map(c => c.id === id
                ? { ...c, stage: newStage, stageName: stageNames[newStage - 1], needAction: newStage === 1 }
                : c);
        });
        setAllClaims(updated);
        const { stage, tab, search } = filterRef.current;
        setFilteredClaims(computeFiltered(updated, stage, tab, search));
        recomputeStats(updated);
        clearSelection();
        // Persist sequentially
        let ok = 0;
        for (const id of ids) {
            try { await axiosInstance.put(`/client-portal/${id}`, { claim_status: newStage }); ok++; }
            catch { /* toasted */ }
        }
        toast.success(`Moved ${ok}/${ids.length} claims to ${stageNames[newStage - 1]}.`);
        fetchClaims({ silent: true });
    };

    // Bulk export selected claims to CSV
    const bulkExport = () => {
        const rows = allClaims.filter(c => selectedIds.has(c.id));
        if (!rows.length) return;
        const headers = ['Claim ID', 'Client Name', 'Address', 'Amount', 'Damage Type', 'Priority', 'Stage'];
        const csv = [
            headers.join(','),
            ...rows.map(c => [c.displayId, `"${c.client}"`, `"${c.address}"`, c.amount, c.damageType, c.priority, `"Stage ${c.stage}: ${c.stageName}"`].join(',')),
        ].join('\n');
        const url = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `claims_selected_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        toast.success(`Exported ${rows.length} selected claims.`);
    };

    // ── Native HTML5 drag-and-drop (no external library) ──────────────────
    const onCardDragStart = (e, claimId) => {
        dragClaimId.current = claimId;
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', claimId); } catch { /* ignore */ }
    };
    const onCardDragEnd = () => {
        dragClaimId.current = null;
        setDragOverStage(null);
    };
    const onStageDrop = (newStage) => {
        const claimId = dragClaimId.current;
        setDragOverStage(null);
        dragClaimId.current = null;
        if (!claimId) return;
        const claim = allClaims.find(c => c.id === claimId);
        if (!claim || claim.stage === newStage) return;
        applyStageLocally(claimId, newStage);
        persistStage(claimId, newStage);
    };

    // Update List View
    const renderListView = () => {
        const start = (currentPage - 1) * itemsPerPage;
        const end = Math.min(start + itemsPerPage, filteredClaims.length);
        const currentClaims = filteredClaims.slice(start, end);
        const pageIds = currentClaims.map(c => c.id);
        const allOnPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));

        return (
            <table className="claims-table">
                <thead>
                <tr>
                    <th style={{ width: 36 }}>
                        <input type="checkbox" checked={allOnPageSelected} onChange={() => toggleSelectAll(pageIds)} title="Select all on page" />
                    </th>
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
                    <tr key={claim.id} className={selectedIds.has(claim.id) ? 'row-selected' : ''}>
                        <td><input type="checkbox" checked={selectedIds.has(claim.id)} onChange={() => toggleSelect(claim.id)} /></td>
                        <td className="table-claim-id">{claim.displayId}</td>
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
                        <td colSpan="9" style={{textAlign: 'center', padding: '2rem', color: '#6b7280'}}>
                            No claims found
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
        );
    };

    // Move claim to different stage from the list-view dropdown
    const moveToStage = (claimId, newStage) => {
        applyStageLocally(claimId, newStage);
        persistStage(claimId, newStage);
    };

    // View claim details from list — open the dedicated detail page
    const viewClaim = (claimId) => goToDetail(claimId);

    // Process claim — same detail page (work hub)
    const processClaim = (claimId) => goToDetail(claimId);

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
                claim.displayId,
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

        toast.success(`Exported ${filteredClaims.length} claims to CSV`);
    };

    const exportPipeline = () => {
        exportClaims();
    };

    const bulkUpdate = () => {
        setCurrentView('list');
        toast('Tick the checkboxes in the list to reassign or export multiple claims.');
    };

    const generateReport = () => {
        const totalValue = filteredClaims.reduce((sum, c) => sum + c.amount, 0);
        const avgValue = filteredClaims.length ? totalValue / filteredClaims.length : 0;
        toast(`Revenue: ${filteredClaims.length} claims · $${totalValue.toLocaleString()} total · $${Math.round(avgValue).toLocaleString()} avg`);
    };

    const createNewClaim = () => {
        setNcForm(emptyNcForm);
        setNcFiles({ estimates: [], measurements: [], photos: [] });
        setNcSuggestions([]);
        setNcErrors({ clientName: false, address: false });
        setNcDocsOpen(false);
        setShowNewClaimModal(true);
    };

    const closeNewClaim = () => {
        setShowNewClaimModal(false);
    };

    const ncUpdate = (field, value) => {
        setNcForm(prev => ({ ...prev, [field]: value }));
        if ((field === 'clientName' || field === 'address') && value.trim()) {
            setNcErrors(prev => ({ ...prev, [field]: false }));
        }
    };

    // Autofill: search existing clients
    const ncSearchClients = (value) => {
        const q = value.trim().toLowerCase();
        if (!q) {
            setNcSuggestions([]);
            return;
        }
        setNcSuggestions(existingClients.filter(c =>
            c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q)
        ));
    };

    const ncPickClient = (c) => {
        setNcForm(prev => ({
            ...prev,
            clientName: c.name,
            clientEmail: c.email,
            clientPhone: c.phone,
            address: c.address,
            insurer: c.insurer,
            policy: c.policy
        }));
        setNcSuggestions([]);
        setNcErrors({ clientName: false, address: false });
    };

    const ncAddFiles = (key, fileList) => {
        const added = Array.from(fileList);
        setNcFiles(prev => ({ ...prev, [key]: [...prev[key], ...added] }));
    };

    const ncRemoveFile = (key, idx) => {
        setNcFiles(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== idx) }));
    };

    // Modal damage-type label -> backend enum value
    const DAMAGE_TYPE_MAP = {
        'Wind/Hail': 'wind-hail',
        'Water Damage': 'water',
        'Fire': 'fire',
        'Lightning': 'lightning',
        'Other': 'other',
    };
    const [ncSubmitting, setNcSubmitting] = useState(false);

    const submitNewClaim = async () => {
        const errors = {
            clientName: !ncForm.clientName.trim(),
            address: !ncForm.address.trim()
        };
        setNcErrors(errors);
        if (errors.clientName || errors.address) {
            toast.error('Please enter at least the client name and property address.');
            return;
        }

        const claimNum = ncForm.claimNum.trim();
        const amount = parseInt(ncForm.amount, 10) || 0;
        // No claim number yet -> Stage 1 (Need Claim Number). Otherwise Awaiting Initial Inspection.
        const claimStatus = claimNum ? 2 : 1;

        // Split the single "Client Name" into first/last for the backend.
        const nameParts = ncForm.clientName.trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || nameParts[0];

        const payload = {
            first_name: firstName,
            last_name: lastName,
            address: ncForm.address.trim(),
            claim_status: claimStatus,
            priority: ncForm.priority,
            claim_value: amount,
        };
        // Only send optional fields when filled (backend validates format).
        if (ncForm.clientEmail.trim()) payload.email = ncForm.clientEmail.trim();
        if (ncForm.clientPhone.trim()) payload.phone = ncForm.clientPhone.trim();
        if (ncForm.insurer.trim()) payload.insurance_carrier = ncForm.insurer.trim();
        if (ncForm.policy.trim()) payload.policy_number = ncForm.policy.trim();
        if (claimNum) payload.claim_number = claimNum;
        if (ncForm.dateOfLoss) payload.date_of_loss = ncForm.dateOfLoss;
        if (DAMAGE_TYPE_MAP[ncForm.damageType]) payload.damage_type = DAMAGE_TYPE_MAP[ncForm.damageType];
        if (ncForm.adjusterName.trim()) payload.adjuster_name = ncForm.adjusterName.trim();
        if (ncForm.adjusterPhone.trim()) payload.adjuster_phone = ncForm.adjusterPhone.trim();
        if (ncForm.insuranceEmail.trim()) payload.adjuster_email = ncForm.insuranceEmail.trim();
        if (ncForm.notes.trim()) payload.notes = ncForm.notes.trim();

        setNcSubmitting(true);
        try {
            const res = await axiosInstance.post('/client-portal', payload);
            const newId = res?.data?.data?.id;
            toast.success(`Claim created for ${ncForm.clientName.trim()} — "${stageNames[claimStatus - 1]}".`);

            // Upload any staged documents to the new claim (sequential).
            const groups = [
                ['estimate', ncFiles.estimates],
                ['measurement', ncFiles.measurements],
                ['photo', ncFiles.photos],
            ];
            const totalFiles = groups.reduce((n, [, files]) => n + files.length, 0);
            if (newId && totalFiles > 0) {
                let done = 0;
                for (const [type, files] of groups) {
                    for (const file of files) {
                        const fd = new FormData();
                        fd.append('file', file);
                        fd.append('upload_type', type);
                        try {
                            await axiosInstance.post(`/client-portal/${newId}/uploads`, fd);
                            done++;
                        } catch {
                            // axiosInstance surfaces the error toast
                        }
                    }
                }
                toast.success(`Uploaded ${done}/${totalFiles} document${totalFiles > 1 ? 's' : ''}.`);
            }

            closeNewClaim();
            setCurrentTab('all');
            setCurrentStage(0);
            setCurrentPage(1);
            setVisibleGridItems(10);
            await fetchClaims();
        } catch (err) {
            const msg = err?.response?.data?.message;
            toast.error(Array.isArray(msg) ? msg[0] : (msg || 'Could not create claim.'));
        } finally {
            setNcSubmitting(false);
        }
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
        <div className="claim-main-container">
            {/* Header */}
            <div className="header-section">
                <h1 className="text-white text-2xl">Claims Pipeline Management</h1>
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
                           placeholder="Search by client name, claim ID, or address..."
                           value={searchQuery}
                           onChange={(e) => onSearchChange(e.target.value)}/>
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
                    <span className="tab-badge action">{allClaims.filter(c => c.needAction).length}</span>
                </button>
                <button
                    className={`pipeline-tab ${currentTab === 'all' ? 'active' : ''}`}
                    onClick={() => switchTab('all')}
                >
                    All Claims
                    <span className="tab-badge">{allClaims.length}</span>
                </button>
                <button
                    className={`pipeline-tab ${currentTab === 'high' ? 'active' : ''}`}
                    onClick={() => switchTab('high')}
                >
                    High Value
                    <span className="tab-badge">{allClaims.filter(c => c.highValue).length}</span>
                </button>
                <button
                    className={`pipeline-tab ${currentTab === 'urgent' ? 'active' : ''}`}
                    onClick={() => switchTab('urgent')}
                >
                    Urgent
                    <span className="tab-badge urgent">{allClaims.filter(c => c.urgent).length}</span>
                </button>
                <button
                    className={`pipeline-tab ${currentTab === 'mine' ? 'active' : ''}`}
                    onClick={() => switchTab('mine')}
                >
                    My Claims
                    <span className="tab-badge">{allClaims.filter(c => c.assignedTo && c.assignedTo === currentUserId).length}</span>
                </button>
                <button
                    className={`pipeline-tab ${currentTab === 'overdue' ? 'active' : ''}`}
                    onClick={() => switchTab('overdue')}
                >
                    Overdue
                    <span className="tab-badge urgent">{allClaims.filter(c => c.overdue).length}</span>
                </button>
            </div>

            {/* Stage Navigator */}
            <div className="stage-navigator">
                <button
                    className="stage-nav-arrow left"
                    onClick={() => scrollStages('left')}
                    style={{
                        display: isMobile && currentStageScroll > 0 ? 'flex' : 'none',
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M10 13l-5-5 5-5v10z" />
                    </svg>
                </button>

                <div className="stage-nav-container">
                    <div className="stage-nav-scroll" style={{transform: getStageTransform()}}>
                        {Array.from({length: totalStages}, (_, i) => i + 1).map(stageNum => (
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
                        display: isMobile ? 'flex' : 'none',
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
                    <button
                        className={`view-toggle-btn ${currentView === 'map' ? 'active' : ''}`}
                        onClick={() => setViewMode('map')}
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M15.817.113A.5.5 0 0 1 16 .5v14a.5.5 0 0 1-.402.49l-5 1a.502.502 0 0 1-.196 0L5.5 15.01l-4.902.98A.5.5 0 0 1 0 15.5v-14a.5.5 0 0 1 .402-.49l5-1a.5.5 0 0 1 .196 0L10.5.99l4.902-.98a.5.5 0 0 1 .415.103zM10 1.91l-4-.8v12.98l4 .8V1.91z"/>
                        </svg>
                        Map View
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
                        {/* Top scrollbar — mirrors the board's horizontal scroll */}
                        <div className="board-top-scroll" ref={topScrollRef} onScroll={onTopScroll}>
                            <div style={{ width: boardScrollWidth, height: 1 }} />
                        </div>
                        <div className="pipeline-board" id="pipelineView" ref={boardRef} onScroll={onBoardScroll}>
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
                        {selectedIds.size > 0 && (
                            <div className="bulk-action-bar">
                                <span className="bulk-count">{selectedIds.size} selected</span>
                                <select className="stage-selector" defaultValue="" onChange={(e) => { if (e.target.value) { bulkMove(parseInt(e.target.value, 10)); e.target.value = ''; } }}>
                                    <option value="" disabled>Move to stage…</option>
                                    {stageNames.map((name, idx) => (
                                        <option key={idx + 1} value={idx + 1}>{idx + 1}. {name}</option>
                                    ))}
                                </select>
                                <button className="table-action-btn" onClick={bulkExport}>Export selected</button>
                                <button className="table-action-btn" onClick={clearSelection}>Clear</button>
                            </div>
                        )}
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

                {/* Map View */}
                {currentView === 'map' && (
                    <MapView claims={filteredClaims} onSelect={goToDetail} />
                )}
            </div>

            {/* Analytics Section */}
            <div className="claim-analytics-section">
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
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
                        <div className="flex justify-between items-center px-6 py-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-800">Claim Details</h2>
                            <button className="w-8 h-8 border-0 bg-transparent cursor-pointer rounded-md flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-all" onClick={closeModal}>
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                    <path
                                        d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
                                </svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="claim-details-grid">
                                <div className="detail-group">
                                    <label>Claim ID</label>
                                    <div className="detail-value">{selectedClaim.displayId}</div>
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
                        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
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
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
                        <div className="flex justify-between items-center px-6 py-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-800">Move Claim to Stage</h2>
                            <button className="w-8 h-8 border-0 bg-transparent cursor-pointer rounded-md flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-all" onClick={closeMoveMenu}>
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                    <path
                                        d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
                                </svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <p>Select a new stage for claim <strong>{moveMenuClaimId}</strong>:</p>
                            <div className="stage-options">
                                {Array.from({length: totalStages}, (_, i) => i + 1).map(stageNum => (
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
                        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
                            <button className="modal-btn secondary" onClick={closeMoveMenu}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* New Claim Form Modal */}
            {showNewClaimModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" id="newClaimModal">
                    {/* Backdrop — intentionally no onClick so an outside click does NOT close the modal */}
                    <div className="absolute inset-0 bg-black/50"></div>
                    <div className="relative bg-white rounded-xl w-full max-w-[760px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
                        <div className="flex justify-between items-center p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-[#1a1f3a]">Create New Claim</h2>
                            <button
                                className="w-8 h-8 border-0 bg-gray-100 rounded-full cursor-pointer text-2xl leading-none text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-all"
                                onClick={closeNewClaim}
                            >&times;</button>
                        </div>
                        <div className="p-6">

                            {/* 1. Client Info */}
                            <div className={ncSectionCls}>
                                <div className={ncTitleCls}>
                                    <span className={ncStepCls}>1</span> Client Information
                                </div>
                                <div className={ncGridCls}>
                                    <div className={`${ncFieldCls} sm:col-span-2 relative`}>
                                        <label className={ncLabelCls} htmlFor="ncClientName">Client Name <span className="text-red-600 ml-0.5">*</span></label>
                                        <input
                                            type="text" id="ncClientName"
                                            className={ncInput(ncErrors.clientName)}
                                            placeholder="Start typing to search existing clients..."
                                            autoComplete="off"
                                            value={ncForm.clientName}
                                            onChange={(e) => { ncUpdate('clientName', e.target.value); ncSearchClients(e.target.value); }}
                                            onFocus={(e) => ncSearchClients(e.target.value)}
                                        />
                                        {ncSuggestions.length > 0 && (
                                            <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-gray-200 rounded-[10px] shadow-[0_10px_30px_rgba(0,0,0,0.12)] z-20 max-h-[220px] overflow-y-auto">
                                                {ncSuggestions.map((c, i) => (
                                                    <div key={i} className="px-3.5 py-2.5 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-[#fffbeb]" onClick={() => ncPickClient(c)}>
                                                        <div className="text-[0.85rem] font-semibold text-gray-800">{c.name}</div>
                                                        <div className="text-[0.72rem] text-gray-500">{c.address} • {c.insurer}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <span className={ncHintCls}>Matching clients autofill contact &amp; insurance details.</span>
                                    </div>
                                    <div className={ncFieldCls}>
                                        <label className={ncLabelCls} htmlFor="ncClientEmail">Email</label>
                                        <input type="email" id="ncClientEmail" className={ncInput(false)} placeholder="client@email.com"
                                            value={ncForm.clientEmail} onChange={(e) => ncUpdate('clientEmail', e.target.value)} />
                                    </div>
                                    <div className={ncFieldCls}>
                                        <label className={ncLabelCls} htmlFor="ncClientPhone">Phone</label>
                                        <input type="tel" id="ncClientPhone" className={ncInput(false)} placeholder="(330) 555-0100"
                                            value={ncForm.clientPhone} onChange={(e) => ncUpdate('clientPhone', e.target.value)} />
                                    </div>
                                    <div className={`${ncFieldCls} sm:col-span-2`}>
                                        <label className={ncLabelCls} htmlFor="ncAddress">Property Address <span className="text-red-600 ml-0.5">*</span></label>
                                        <input type="text" id="ncAddress"
                                            className={ncInput(ncErrors.address)}
                                            placeholder="Street, City, State ZIP"
                                            value={ncForm.address} onChange={(e) => ncUpdate('address', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            {/* 2. Claim & Policy */}
                            <div className={ncSectionCls}>
                                <div className={ncTitleCls}>
                                    <span className={ncStepCls}>2</span> Claim &amp; Policy Details
                                </div>
                                <div className={ncGridCls}>
                                    <div className={ncFieldCls}>
                                        <label className={ncLabelCls} htmlFor="ncInsurer">Insurance Carrier</label>
                                        <input type="text" id="ncInsurer" className={ncInput(false)} placeholder="e.g. State Farm"
                                            value={ncForm.insurer} onChange={(e) => ncUpdate('insurer', e.target.value)} />
                                    </div>
                                    <div className={ncFieldCls}>
                                        <label className={ncLabelCls} htmlFor="ncPolicy">Policy Number</label>
                                        <input type="text" id="ncPolicy" className={ncInput(false)} placeholder="Policy #"
                                            value={ncForm.policy} onChange={(e) => ncUpdate('policy', e.target.value)} />
                                    </div>
                                    <div className={ncFieldCls}>
                                        <label className={ncLabelCls} htmlFor="ncClaimNum">Claim Number</label>
                                        <input type="text" id="ncClaimNum" className={ncInput(false)} placeholder="Leave blank if not yet assigned"
                                            value={ncForm.claimNum} onChange={(e) => ncUpdate('claimNum', e.target.value)} />
                                        <span className={ncHintCls}>No claim # yet? It will start in "Need Claim Number".</span>
                                    </div>
                                    <div className={ncFieldCls}>
                                        <label className={ncLabelCls} htmlFor="ncDateOfLoss">Date of Loss</label>
                                        <input type="date" id="ncDateOfLoss" className={ncInput(false)}
                                            value={ncForm.dateOfLoss} onChange={(e) => ncUpdate('dateOfLoss', e.target.value)} />
                                    </div>
                                    <div className={ncFieldCls}>
                                        <label className={ncLabelCls} htmlFor="ncDamageType">Damage Type</label>
                                        <select id="ncDamageType" className={ncInput(false)}
                                            value={ncForm.damageType} onChange={(e) => ncUpdate('damageType', e.target.value)}>
                                            <option value="Wind/Hail">Wind/Hail</option>
                                            <option value="Water Damage">Water Damage</option>
                                            <option value="Fire">Fire</option>
                                            <option value="Lightning">Lightning</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div className={ncFieldCls}>
                                        <label className={ncLabelCls} htmlFor="ncPriority">Priority</label>
                                        <select id="ncPriority" className={ncInput(false)}
                                            value={ncForm.priority} onChange={(e) => ncUpdate('priority', e.target.value)}>
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                            <option value="urgent">Urgent</option>
                                        </select>
                                    </div>
                                    <div className={ncFieldCls}>
                                        <label className={ncLabelCls} htmlFor="ncAmount">Estimated Claim Value</label>
                                        <input type="number" id="ncAmount" className={ncInput(false)} placeholder="0" min="0" step="100"
                                            value={ncForm.amount} onChange={(e) => ncUpdate('amount', e.target.value)} />
                                    </div>
                                    <div className={ncFieldCls}>
                                        <label className={ncLabelCls} htmlFor="ncSalesRep">Sales Rep</label>
                                        <select id="ncSalesRep" className={ncInput(false)}
                                            value={ncForm.salesRep} onChange={(e) => ncUpdate('salesRep', e.target.value)}>
                                            <option value="">Unassigned</option>
                                            {salesReps.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Adjuster */}
                            <div className={ncSectionCls}>
                                <div className={ncTitleCls}>
                                    <span className={ncStepCls}>3</span> Adjuster Info
                                    <span className={ncOptionalCls}>Optional</span>
                                </div>
                                <div className={ncGridCls}>
                                    <div className={ncFieldCls}>
                                        <label className={ncLabelCls} htmlFor="ncAdjusterName">Adjuster Name</label>
                                        <input type="text" id="ncAdjusterName" className={ncInput(false)} placeholder="Full name"
                                            value={ncForm.adjusterName} onChange={(e) => ncUpdate('adjusterName', e.target.value)} />
                                    </div>
                                    <div className={ncFieldCls}>
                                        <label className={ncLabelCls} htmlFor="ncAdjusterPhone">Adjuster Phone</label>
                                        <input type="tel" id="ncAdjusterPhone" className={ncInput(false)} placeholder="(330) 555-0100"
                                            value={ncForm.adjusterPhone} onChange={(e) => ncUpdate('adjusterPhone', e.target.value)} />
                                    </div>
                                    <div className={`${ncFieldCls} sm:col-span-2`}>
                                        <label className={ncLabelCls} htmlFor="ncInsuranceEmail">Insurance / Adjuster Email</label>
                                        <input type="email" id="ncInsuranceEmail" className={ncInput(false)} placeholder="claims@carrier.com"
                                            value={ncForm.insuranceEmail} onChange={(e) => ncUpdate('insuranceEmail', e.target.value)} />
                                        <span className={ncHintCls}>Used by the Email AI to send and track claim correspondence.</span>
                                    </div>
                                </div>
                            </div>

                            {/* 4. Documents (collapsible — most new claims have none yet) */}
                            <div className={ncSectionCls}>
                                <button
                                    type="button"
                                    onClick={() => setNcDocsOpen(o => !o)}
                                    className={`${ncTitleCls} w-full cursor-pointer hover:text-[#FDB813] transition-colors`}
                                >
                                    <span className={ncStepCls}>4</span>
                                    {ncDocsOpen ? 'Documents' : 'Add documents'}
                                    <span className={ncOptionalCls}>Optional</span>
                                    <svg className={`ml-2 transition-transform ${ncDocsOpen ? 'rotate-180' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </button>
                                {!ncDocsOpen && (
                                    <p className="text-[0.72rem] text-gray-400 -mt-2">Photos, measurement &amp; carrier estimate are usually added later as the claim progresses. Click to attach now.</p>
                                )}
                                {ncDocsOpen && (
                                <div className={ncGridCls}>
                                    {[
                                        { key: 'estimates', label: 'Insurance Estimate', title: 'Upload estimate', sub: 'PDF, XLSX', full: false },
                                        { key: 'measurements', label: 'Measurement Report', title: 'Upload report', sub: 'EagleView, Hover, PDF', full: false },
                                        { key: 'photos', label: 'Damage Photos', title: 'Upload photos', sub: 'JPG, PNG — multiple allowed', full: true }
                                    ].map(zone => (
                                        <div key={zone.key} className={`${ncFieldCls} ${zone.full ? 'sm:col-span-2' : ''}`}>
                                            <label className={ncLabelCls}>{zone.label}</label>
                                            <div
                                                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${ncDragKey === zone.key ? 'border-[#FDB813] bg-[#fffbeb]' : 'border-gray-300 bg-gray-50'} hover:border-[#FDB813] hover:bg-[#fffbeb]`}
                                                onClick={() => ncFileInputs[zone.key].current?.click()}
                                                onDragOver={(e) => { e.preventDefault(); setNcDragKey(zone.key); }}
                                                onDragLeave={(e) => { e.preventDefault(); setNcDragKey(null); }}
                                                onDrop={(e) => { e.preventDefault(); setNcDragKey(null); if (e.dataTransfer.files.length) ncAddFiles(zone.key, e.dataTransfer.files); }}>
                                                <svg className="text-gray-400 mb-2 mx-auto" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                    <polyline points="17 8 12 3 7 8"></polyline>
                                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                                </svg>
                                                <div className="text-[0.85rem] font-semibold text-gray-700">{zone.title}</div>
                                                <div className="text-[0.72rem] text-gray-400 mt-0.5">{zone.sub}</div>
                                                <input type="file" ref={ncFileInputs[zone.key]} className="hidden"
                                                    multiple={zone.key === 'photos'} accept={zone.key === 'photos' ? 'image/*' : undefined}
                                                    onChange={(e) => { ncAddFiles(zone.key, e.target.files); e.target.value = ''; }} />
                                            </div>
                                            <div className="mt-3 flex flex-col gap-2">
                                                {ncFiles[zone.key].map((f, i) => (
                                                    <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-100 rounded-lg text-[0.8rem]">
                                                        <svg className="text-[#FDB813] shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                            <polyline points="14 2 14 8 20 8"></polyline>
                                                        </svg>
                                                        <span className="flex-1 text-gray-800 font-medium whitespace-nowrap overflow-hidden text-ellipsis">{f.name}</span>
                                                        <span className="text-gray-400 text-[0.72rem]">{(f.size / 1024).toFixed(0)} KB</span>
                                                        <button className="border-0 bg-transparent text-gray-400 cursor-pointer text-[1.1rem] leading-none px-1 hover:text-red-600" onClick={() => ncRemoveFile(zone.key, i)} title="Remove">&times;</button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                )}
                            </div>

                            {/* 5. Notes */}
                            <div className={ncSectionCls}>
                                <div className={ncTitleCls}>
                                    <span className={ncStepCls}>5</span> Notes
                                    <span className={ncOptionalCls}>Optional</span>
                                </div>
                                <div className={`${ncFieldCls} sm:col-span-2`}>
                                    <textarea id="ncNotes" className={`${ncInputBase} border-gray-200 resize-y min-h-[72px]`} placeholder="Anything the team should know about this claim..."
                                        value={ncForm.notes} onChange={(e) => ncUpdate('notes', e.target.value)}></textarea>
                                </div>
                            </div>

                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                            <button className="px-5 py-2.5 bg-gray-100 text-gray-800 rounded-lg font-semibold text-sm cursor-pointer transition-all hover:bg-gray-200" onClick={closeNewClaim}>Cancel</button>
                            <button className="px-5 py-2.5 bg-[#16a34a] text-white rounded-lg font-semibold text-sm cursor-pointer transition-all hover:bg-[#15803d] disabled:opacity-60 disabled:cursor-not-allowed" onClick={submitNewClaim} disabled={ncSubmitting}>{ncSubmitting ? 'Creating…' : 'Create Claim'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClaimsManagement;