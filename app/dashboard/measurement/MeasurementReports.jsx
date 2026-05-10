"use client"
import React, {useEffect, useRef, useState, useCallback, useMemo} from 'react';
import "./measurement.css"
import "./measurement-hero.css"
import LocalFileUploader from "@/utiles/LocalFileUploader.jsx";
import axiosInstance from "@/lib/axiosInstance";
import { toast } from "sonner";

const NEW_CLIENT_BLANK = {
    first_name: '', last_name: '', email: '', phone: '',
    address: '', city: '', state: '', zip_code: '',
};

const Page = () => {

    // ── Client selection (real API-backed, mirrors 3D mockup) ────────────
    const [activeClientTab, setActiveClientTab] = useState('existing');
    const [selectedClient, setSelectedClient] = useState(null);
    const [clientSearch, setClientSearch] = useState('');
    const [clientList, setClientList] = useState([]);
    const [clientsLoading, setClientsLoading] = useState(false);
    const [newClientForm, setNewClientForm] = useState(NEW_CLIENT_BLANK);
    const [creatingClient, setCreatingClient] = useState(false);
    const [clientFormError, setClientFormError] = useState(null);

    // ── Upload + extraction ──────────────────────────────────────────────
    const [activeInputTab, setActiveInputTab] = useState('report');
    const [measurementReportsFiles, setMeasurementReportsFiles] = useState([]);
    const [extracting, setExtracting] = useState(false);
    const [extractResult, setExtractResult] = useState(null); // backend row
    const [extractError, setExtractError] = useState(null);

    // ── Editable copy of extracted_data (Module 7) ───────────────────────
    const [edits, setEdits] = useState({});      // { field: value }
    const [savingEdits, setSavingEdits] = useState(false);
    const [confirming, setConfirming] = useState(false);

    // ── Credits + provider status (header display) ──────────────────────
    const [extractCost, setExtractCost] = useState(null);   // { credits_cost, is_active, label }
    const [creditBalance, setCreditBalance] = useState(null); // { monthly_credits, bonus_credits }
    const [providerStatus, setProviderStatus] = useState({ gemini: false });

    // ── Saved measurement list (for the "View All Reports" modal) ───────
    const [reportList, setReportList] = useState([]);
    const [reportListLoading, setReportListLoading] = useState(false);

    // ── Misc UI state retained from earlier stub ─────────────────────────
    const [expandedSections, setExpandedSections] = useState(['roofing']);
    const [selectedAccuracy, setSelectedAccuracy] = useState('standard');
    const [completedPhotos, setCompletedPhotos] = useState([]);
    const [showReport, setShowReport] = useState(false);
    const [activeModal, setActiveModal] = useState(null);
    const [activeSettingsTab, setActiveSettingsTab] = useState('accuracy');
    const [viewAllReportModal, setViewAllReportModal] = useState(false);
    const [droneFiles, setDroneFiles] = useState([]);
    // Cosmetic-only — old demo "processing log". Keeping it so the right-column
    // visual matches the original mock-up. Nothing in the real extract flow
    // writes to this; we just render the static lines.
    const [processingLog, setProcessingLog] = useState([
        { message: '• Detecting structure boundaries... Done', status: 'success' },
        { message: '• Identifying roof planes... Done', status: 'success' },
        { message: '• Calculating square footage... Done', status: 'success' },
        { message: '• Measuring linear elements... Done', status: 'success' },
    ]);

    // Refs
    const reportFileRef = useRef(null);

    // ── Fetch credits cost + user balance + provider status (once) ──────
    const refreshCreditsState = React.useCallback(async () => {
        try {
            const [costRes, balanceRes] = await Promise.all([
                axiosInstance.get('/credits/feature-costs/measurement_extract', { suppressErrorToast: true }),
                axiosInstance.get('/credits/me', { suppressErrorToast: true }),
            ]);
            setExtractCost(costRes.data ?? null);
            setCreditBalance(balanceRes.data ?? null);
        } catch { /* free-tier installs may 404; leave null */ }
    }, []);

    useEffect(() => { refreshCreditsState(); }, [refreshCreditsState]);

    // Provider availability — to flip "AI Ready" badge with real data
    useEffect(() => {
        (async () => {
            try {
                // Reuse mockup's providers endpoint — same Gemini key.
                const res = await axiosInstance.get('/mockup/providers', { suppressErrorToast: true });
                setProviderStatus(res.data?.data ?? { gemini: false });
            } catch { /* ignore */ }
        })();
    }, []);

    // Fetch saved measurements list (lazy — only when modal opens)
    const refreshReportList = React.useCallback(async () => {
        setReportListLoading(true);
        try {
            const res = await axiosInstance.get('/measurement', { suppressErrorToast: true });
            setReportList(res.data?.data ?? []);
        } catch { /* ignore */ } finally { setReportListLoading(false); }
    }, []);

    useEffect(() => {
        // Refresh whenever the All Reports modal opens, OR after a new extraction
        // succeeds (so the count badge stays accurate).
        if (activeModal === 'allReports') refreshReportList();
    }, [activeModal, refreshReportList]);

    // Load list on mount so the header badge shows the real count.
    useEffect(() => { refreshReportList(); }, [refreshReportList]);

    // ── Load clients (debounced search) ──────────────────────────────────
    useEffect(() => {
        if (activeClientTab !== 'existing' || selectedClient) return;
        let cancelled = false;
        setClientsLoading(true);
        const timer = setTimeout(async () => {
            try {
                const params = {};
                if (clientSearch.trim()) params.search = clientSearch.trim();
                const res = await axiosInstance.get('/client-portal', { params });
                if (cancelled) return;
                setClientList(res.data?.data ?? []);
            } catch { /* axiosInstance toasts */ } finally {
                if (!cancelled) setClientsLoading(false);
            }
        }, 250);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [activeClientTab, clientSearch, selectedClient]);

    // ── Client handlers ──────────────────────────────────────────────────
    const switchClientTab = (tab) => setActiveClientTab(tab);

    const selectClient = (raw) => {
        const name =
            raw.full_name ||
            `${raw.first_name ?? ''} ${raw.last_name ?? ''}`.trim() ||
            'Unnamed';
        setSelectedClient({
            id: raw.id,
            name,
            address: [raw.address, raw.city, raw.state, raw.zip_code].filter(Boolean).join(', '),
            stats: '',
        });
    };

    const handleNewClientField = (field, value) =>
        setNewClientForm(prev => ({ ...prev, [field]: value }));

    const createClient = async () => {
        setClientFormError(null);
        const required = ['first_name', 'last_name', 'email', 'phone', 'address', 'city', 'state', 'zip_code'];
        const missing = required.filter(k => !newClientForm[k]?.trim());
        if (missing.length) {
            const msg = `Please fill in: ${missing.map(f => f.replace('_', ' ')).join(', ')}`;
            setClientFormError(msg);
            toast.error(msg);
            return;
        }
        setCreatingClient(true);
        try {
            const res = await axiosInstance.post('/client-portal', {
                first_name: newClientForm.first_name,
                last_name: newClientForm.last_name,
                email: newClientForm.email,
                phone: newClientForm.phone,
                address: newClientForm.address,
                city: newClientForm.city,
                state: newClientForm.state.toUpperCase().slice(0, 2),
                zip_code: newClientForm.zip_code,
                property_type: 'single-family',
                insurance_company: 'other',
                claim_status: 1,
            });
            const created = res.data?.data;
            toast.success('Client created');
            if (created) selectClient(created);
            setNewClientForm(NEW_CLIENT_BLANK);
            setActiveClientTab('existing');
        } catch (err) {
            setClientFormError(err?.userMessage ?? 'Could not create client.');
        } finally {
            setCreatingClient(false);
        }
    };

    const changeClient = () => {
        setSelectedClient(null);
        setExtractResult(null);
        setExtractError(null);
    };

    // ── Input tab + file upload ──────────────────────────────────────────
    const switchInputTab = (tab) => setActiveInputTab(tab);

    // ── REAL extraction flow: POST /measurement/extract ──────────────────
    const runExtraction = async () => {
        const localFile =
            measurementReportsFiles?.[0]?.file ?? measurementReportsFiles?.[0] ?? null;
        if (!localFile) {
            toast.error('Upload a measurement report first');
            return;
        }
        if (extracting) return;
        setExtracting(true);
        setExtractError(null);
        setExtractResult(null);
        try {
            const fd = new FormData();
            fd.append('source_file', localFile);
            if (selectedClient?.id) fd.append('client_id', selectedClient.id);
            if (selectedClient?.name) fd.append('title', `${selectedClient.name} — Measurement`);

            const res = await axiosInstance.post('/measurement/extract', fd);
            const payload = res.data?.data;
            const credits = res.data?.credits;
            setExtractResult(payload);
            // Seed the editable form with whatever the AI got.
            setEdits({ ...(payload?.extracted_data ?? {}) });
            // Sync local credit balance from the server response (saves a round-trip).
            if (credits?.balance_after) {
                setCreditBalance(prev => ({
                    ...(prev ?? {}),
                    monthly_credits: credits.balance_after.monthly,
                    bonus_credits: credits.balance_after.bonus,
                }));
            } else {
                refreshCreditsState();
            }
            // Refresh the report list so the badge count updates immediately.
            refreshReportList();
            toast.success(res.data?.message ?? 'Measurement extracted');
        } catch (err) {
            const msg = err?.userMessage || err?.response?.data?.message || 'Extraction failed';
            setExtractError(msg);
        } finally {
            setExtracting(false);
        }
    };

    // ── Edit a single measurement field ──────────────────────────────────
    const updateField = (field, raw) => {
        // For pitch we keep the string as-is; everything else is numeric.
        const value =
            field === 'pitch'
                ? (raw === '' ? null : raw)
                : (raw === '' || raw === null || raw === undefined
                    ? null
                    : Number.isFinite(Number(raw)) ? Number(raw) : null);
        setEdits(prev => ({ ...prev, [field]: value }));
    };

    // ── Save edits → PATCH /measurement/:id ──────────────────────────────
    const saveEdits = async () => {
        if (!extractResult?.id || savingEdits) return;
        setSavingEdits(true);
        try {
            const res = await axiosInstance.patch(`/measurement/${extractResult.id}`, {
                extracted_data: edits,
            });
            setExtractResult(res.data?.data ?? extractResult);
            toast.success('Measurements saved');
        } catch { /* axiosInstance toasts */ } finally {
            setSavingEdits(false);
        }
    };

    // ── Confirm → PATCH /measurement/:id/confirm ────────────────────────
    const confirmMeasurement = async () => {
        if (!extractResult?.id || confirming) return;
        setConfirming(true);
        try {
            // Save edits first if there are pending changes (best-effort).
            const aiOriginal = extractResult.raw_ai_response?.extracted ?? extractResult.extracted_data ?? {};
            const hasEdits = Object.keys(edits).some(
                k => JSON.stringify(edits[k]) !== JSON.stringify(aiOriginal[k] ?? extractResult.extracted_data?.[k] ?? null),
            );
            if (hasEdits) {
                await axiosInstance.patch(`/measurement/${extractResult.id}`, { extracted_data: edits });
            }
            const res = await axiosInstance.patch(`/measurement/${extractResult.id}/confirm`);
            setExtractResult(res.data?.data ?? extractResult);
            refreshReportList();
            toast.success('Measurement confirmed — ready to use in an estimate');
        } catch { /* toasted */ } finally {
            setConfirming(false);
        }
    };

    // ── Use in estimate ──────────────────────────────────────────────────
    const useInEstimate = () => {
        if (!extractResult?.id) return;
        const params = new URLSearchParams();
        params.set('measurement_id', extractResult.id);
        if (extractResult.client_id) params.set('client_id', extractResult.client_id);
        window.location.href = `/dashboard/estimation?${params.toString()}`;
    };

    // Legacy handler kept so existing inline file inputs still compile.
    const handleFileUpload = () => {};

    // Photo functions
    const togglePhotoRequirement = (photoType) => {
        setCompletedPhotos(prev =>
            prev.includes(photoType)
                ? prev.filter(p => p !== photoType)
                : [...prev, photoType]
        );
    };

    // Section functions
    const toggleSection = (section) => {
        setExpandedSections(prev =>
            prev.includes(section)
                ? prev.filter(s => s !== section)
                : [...prev, section]
        );
    };

    // Accuracy functions
    const selectAccuracyMode = (mode) => {
        setSelectedAccuracy(mode);
    };

    // Analysis functions
    const startAnalysis = () => {
        // Simulate processing
        setTimeout(() => {
            setProcessingLog(prev => [
                ...prev.slice(0, 2),
                { message: '• Calculating square footage... Done', status: 'success' },
                { message: '• Measuring linear elements...', status: 'processing' }
            ]);
        }, 2000);

        setTimeout(() => {
            setProcessingLog(prev => [
                ...prev.slice(0, 3),
                { message: '• Measuring linear elements... Done', status: 'success' }
            ]);
        }, 4000);
    };

    // Report functions
    const generateReport = () => {
        setShowReport(true);
        setTimeout(() => {
            document.getElementById('generatedReport')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    // Export functions
    const downloadPDF = () => {
        alert('Downloading PDF report...');
    };

    const exportXactimate = () => {
        alert('Exporting to Xactimate format...');
    };

    const exportExcel = () => {
        alert('Exporting to Excel...');
    };

    const sendToPortal = () => {
        alert('Sending to client portal...');
    };

    const emailAdjuster = () => {
        alert('Opening email to adjuster...');
    };

    const saveMeasurements = () => {
        alert('Measurements saved successfully!');
    };

    const requestVerify = () => {
        alert('Professional verification requested. We\'ll review within 24 hours.');
    };

    // Modal functions
    const openModal = (modal) => {
        setActiveModal(modal);
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        setActiveModal(null);
        document.body.style.overflow = '';
    };

    // Settings functions
    const switchSettingsTab = (tab) => {
        setActiveSettingsTab(tab);
    };

    const resetSettings = () => {
        if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
            alert('Settings reset to defaults');
        }
    };

    const saveSettings = () => {
        alert('Settings saved successfully!');
        closeModal();
    };

    // Search and filter functions
    const searchClients = (query) => {
        console.log('Searching clients:', query);
    };

    const searchReports = (query) => {
        console.log('Searching reports:', query);
    };

    const filterReports = (filter) => {
        console.log('Filtering reports:', filter);
    };

    const viewReport = (reportId) => {
        alert(`Opening report ${reportId}...`);
        closeModal();
    };

    const downloadReport = (reportId) => {
        alert(`Downloading report ${reportId}...`);
    };

    const shareReport = (reportId) => {
        alert(`Opening share dialog for report ${reportId}...`);
    };

    const loadMoreReports = () => {
        alert('Loading more reports...');
    };


    // ── Derived view-state for the header ────────────────────────────────
    const aiReady = !!providerStatus.gemini;
    const totalCredits =
        (creditBalance?.monthly_credits ?? 0) + (creditBalance?.bonus_credits ?? 0);
    const requiredCredits = extractCost?.credits_cost ?? 0;
    const featureDisabledByAdmin = extractCost && extractCost.is_active === false;
    const insufficientCredits =
        extractCost && !featureDisabledByAdmin && totalCredits < requiredCredits;
    const creditsKnown = extractCost !== null && creditBalance !== null;
    const savedReportsCount = reportList.length;

    return (
        <div>
            <div className="mr-hero">
                <div className="mr-hero-inner">
                    <div className="mr-hero-left">
                        <div className="mr-hero-eyebrow">
                            <span className="mr-hero-dot" />
                            Roof Measurement Studio
                        </div>
                        <h1 className="mr-hero-title">
                            Extract dimensions <span className="mr-hero-title-accent">in seconds</span>
                        </h1>
                        <p className="mr-hero-subtitle">
                            Upload any roof measurement report — EagleView, HOVER, or PDF — and AI extracts every number you need.
                        </p>

                        <div className="mr-hero-stats">
                            <div className={`mr-stat ${aiReady ? 'mr-stat-ok' : 'mr-stat-warn'}`}>
                                <div className="mr-stat-icon">{aiReady ? '✓' : '!'}</div>
                                <div>
                                    <div className="mr-stat-label">AI Status</div>
                                    <div className="mr-stat-value">{aiReady ? 'Ready' : 'Not configured'}</div>
                                </div>
                            </div>

                            {creditsKnown && (
                                <div className={`mr-stat ${insufficientCredits ? 'mr-stat-warn' : 'mr-stat-ok'}`}>
                                    <div className="mr-stat-icon">⚡</div>
                                    <div>
                                        <div className="mr-stat-label">Credits</div>
                                        <div className="mr-stat-value">
                                            {totalCredits.toLocaleString()}
                                            {requiredCredits > 0 && (
                                                <span className="mr-stat-sub"> · {requiredCredits}/run</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                type="button"
                                className="mr-stat mr-stat-link"
                                onClick={() => openModal('allReports')}
                                title="Open saved measurement reports"
                            >
                                <div className="mr-stat-icon">📁</div>
                                <div style={{ textAlign: 'left' }}>
                                    <div className="mr-stat-label">View Reports</div>
                                    <div className="mr-stat-value">
                                        {savedReportsCount}
                                        <span className="mr-stat-sub"> saved</span>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Container */}
            <div className="main-container mr-grid">
                {/* Client Selection Card */}
                <div className="client-selection-card">
                    <div className="tabs">
                        <button
                            className={`tab-btn ${activeClientTab === 'existing' ? 'active' : ''}`}
                            onClick={() => switchClientTab('existing')}
                        >
                            Existing Client
                        </button>
                        <button
                            className={`tab-btn ${activeClientTab === 'new' ? 'active' : ''}`}
                            onClick={() => switchClientTab('new')}
                        >
                            New Client
                        </button>
                    </div>

                    {/* Existing Client Tab */}
                    {activeClientTab === 'existing' && (
                        <div className="tab-content active">
                            <div style={{position: 'relative'}}>
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Search client name, property address, or phone..."
                                    value={clientSearch}
                                    onChange={(e) => setClientSearch(e.target.value)}
                                    style={{paddingLeft: '1rem'}}
                                />
                            </div>

                            <div style={{ display: 'grid', gap: '0.5rem', maxHeight: 280, overflowY: 'auto', marginTop: '0.5rem' }}>
                                {clientsLoading && (
                                    <div style={{ fontSize: 13, color: '#6b7280', padding: '0.5rem' }}>Searching…</div>
                                )}
                                {!clientsLoading && clientList.length === 0 && (
                                    <div style={{ fontSize: 13, color: '#6b7280', padding: '0.5rem' }}>
                                        No clients found. Switch to <strong>New Client</strong> to add one.
                                    </div>
                                )}
                                {clientList.map(c => (
                                    <div
                                        key={c.id}
                                        className="client-option"
                                        onClick={() => selectClient(c)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f9fafb', borderRadius: 6 }}>
                                            <div>
                                                <div style={{ fontWeight: 600, color: '#1f2937' }}>{c.full_name || `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim()}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                    {[c.address, c.city, c.state].filter(Boolean).join(', ')}
                                                </div>
                                            </div>
                                            <button
                                                className="btn btn-outline"
                                                style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                                                onClick={(e) => { e.stopPropagation(); selectClient(c); }}
                                            >Use Client</button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/*<div style={{display: 'grid', gap: '0.5rem'}}>
                                <div className="client-option" onClick={() => selectClient('Johnson Property')}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.75rem',
                                        background: '#f9fafb',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}>
                                        <div>
                                            <div style={{fontWeight: '600', color: '#1f2937'}}>Johnson Property</div>
                                            <div style={{fontSize: '0.75rem', color: '#6b7280'}}>123 Main St, Dallas, TX
                                                • 3 reports on file
                                            </div>
                                        </div>
                                        <button className="btn btn-outline"
                                                style={{padding: '0.375rem 0.75rem', fontSize: '0.75rem'}}>Use Client
                                        </button>
                                    </div>
                                </div>
                            </div>*/}
                        </div>
                    )}

                    {/* New Client Tab */}
                    {activeClientTab === 'new' && (
                        <div className="tab-content active">
                            <form className="form-grid" onSubmit={(e) => { e.preventDefault(); createClient(); }}>
                                <div className="form-group">
                                    <label className="form-label required">First Name</label>
                                    <input type="text" className="form-input" placeholder="John"
                                        value={newClientForm.first_name}
                                        onChange={(e) => handleNewClientField('first_name', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">Last Name</label>
                                    <input type="text" className="form-input" placeholder="Smith"
                                        value={newClientForm.last_name}
                                        onChange={(e) => handleNewClientField('last_name', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">Email</label>
                                    <input type="email" className="form-input" placeholder="john@example.com"
                                        value={newClientForm.email}
                                        onChange={(e) => handleNewClientField('email', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">Phone</label>
                                    <input type="tel" className="form-input" placeholder="(555) 123-4567"
                                        value={newClientForm.phone}
                                        onChange={(e) => handleNewClientField('phone', e.target.value)} />
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label required">Address</label>
                                    <input type="text" className="form-input" placeholder="123 Main Street"
                                        value={newClientForm.address}
                                        onChange={(e) => handleNewClientField('address', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">City</label>
                                    <input type="text" className="form-input" placeholder="Dallas"
                                        value={newClientForm.city}
                                        onChange={(e) => handleNewClientField('city', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">State</label>
                                    <input type="text" className="form-input" maxLength={2} placeholder="TX"
                                        value={newClientForm.state}
                                        onChange={(e) => handleNewClientField('state', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">ZIP Code</label>
                                    <input type="text" className="form-input" placeholder="75201"
                                        value={newClientForm.zip_code}
                                        onChange={(e) => handleNewClientField('zip_code', e.target.value)} />
                                </div>
                                {clientFormError && (
                                    <div className="form-group full-width" role="alert" style={{
                                        background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '4px solid #dc2626',
                                        color: '#7f1d1d', padding: '10px 12px', borderRadius: 6, fontSize: 13,
                                    }}>
                                        {clientFormError}
                                    </div>
                                )}
                                <div className="form-group full-width">
                                    <button type="submit" className="btn btn-primary" disabled={creatingClient}>
                                        {creatingClient ? 'Creating…' : 'Create Client & Continue'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                {/* Selected Client Bar */}
                {selectedClient && (
                    <div className="selected-client-bar active">
                        <div className="client-info">
                            <div>
                                <div className="client-name">{selectedClient.name}</div>
                                <div className="client-address">{selectedClient.address}</div>
                            </div>
                            <div className="client-stats">
                                {selectedClient.stats}
                            </div>
                        </div>
                        <button className="btn btn-outline" style={{padding: '0.375rem 0.75rem', fontSize: '0.75rem'}}
                                onClick={changeClient}>Change
                        </button>
                    </div>
                )}

                {/* Single-column upload + extraction flow */}
                <div className="column-card">
                    <h3 className="column-header">Upload Measurement Report</h3>

                        <div className="input-tabs">
                            <button
                                className={`input-tab ${activeInputTab === 'report' ? 'active' : ''}`}
                                onClick={() => switchInputTab('report')}
                            >
                                Upload Report
                            </button>
                            {/* Ground Photos & Drone tabs hidden for V1 — focus is on
                                PDF / image / report extraction (Brief §05). Re-enable when
                                photogrammetry / drone pipelines are ready.
                            <button
                                className={`input-tab ${activeInputTab === 'ground' ? 'active' : ''}`}
                                onClick={() => switchInputTab('ground')}
                            >
                                Ground Photos
                            </button>
                            <button
                                className={`input-tab ${activeInputTab === 'drone' ? 'active' : ''}`}
                                onClick={() => switchInputTab('drone')}
                            >
                                Drone
                            </button>
                            */}
                        </div>

                        {/* Upload Report Tab */}
                        {activeInputTab === 'report' && (
                            <div className="tab-content active">
                                {/*<div className="upload-zone" onClick={() => reportFileRef.current?.click()}>
                                    <p className="upload-text" style={{marginBottom: '0.5rem'}}>Drag & drop measurement
                                        reports here</p>
                                    <p className="upload-subtext">PDF, XML, ESX, JPG, PNG</p>
                                    <input
                                        type="file"
                                        id="reportFile"
                                        ref={reportFileRef}
                                        style={{display: 'none'}}
                                        accept=".pdf,.xml,.esx,.jpg,.png"
                                        onChange={handleFileUpload}
                                    />
                                </div>*/}

                                <LocalFileUploader
                                    label="Drop measurement report here (PDF or image)"
                                    files={measurementReportsFiles}
                                    setFiles={setMeasurementReportsFiles}
                                    allowedExtensions={['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif']}
                                    maxFiles={1}
                                    maxSizeMB={20}
                                />

                                <div className="provider-badges">
                                    <div className="provider-badge">EagleView</div>
                                    <div className="provider-badge">CoreLogic</div>
                                    <div className="provider-badge">HOVER</div>
                                    <div className="provider-badge">Pictometry</div>
                                    <div className="provider-badge">Xactimate</div>
                                </div>

                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    style={{ width: '100%', marginTop: 12, justifyContent: 'center' }}
                                    onClick={runExtraction}
                                    disabled={
                                        extracting
                                        || measurementReportsFiles.length === 0
                                        || !aiReady
                                        || featureDisabledByAdmin
                                        || insufficientCredits
                                    }
                                >
                                    {extracting
                                        ? 'Extracting…'
                                        : !aiReady
                                            ? 'AI not configured'
                                            : featureDisabledByAdmin
                                                ? 'Feature disabled by admin'
                                                : insufficientCredits
                                                    ? `Need ${requiredCredits} credits`
                                                    : 'Extract Measurements'}
                                    {!extracting && aiReady && !featureDisabledByAdmin && !insufficientCredits && requiredCredits > 0 && (
                                        <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.85 }}>
                                            ({requiredCredits} credit{requiredCredits === 1 ? '' : 's'})
                                        </span>
                                    )}
                                </button>

                                {extractError && (
                                    <div role="alert" style={{
                                        marginTop: 10, padding: '10px 12px', borderRadius: 6, fontSize: 13,
                                        background: '#fef2f2', border: '1px solid #fecaca',
                                        borderLeft: '4px solid #dc2626', color: '#7f1d1d'
                                    }}>
                                        {extractError}
                                    </div>
                                )}

                                {extractResult && (
                                    <ExtractedPanel
                                        row={extractResult}
                                        edits={edits}
                                        onChange={updateField}
                                        onSave={saveEdits}
                                        onConfirm={confirmMeasurement}
                                        onUseInEstimate={useInEstimate}
                                        savingEdits={savingEdits}
                                        confirming={confirming}
                                    />
                                )}
                            </div>
                        )}

                        {/* Ground Photos & Drone tabs hidden for V1 — see comment above
                            on the input-tabs buttons for context. Re-enable along with the
                            tab buttons when those pipelines are ready.

                        {activeInputTab === 'ground' && (
                            <div className="tab-content active">
                                <div className="photo-requirements">
                                    <div className="requirements-section">
                                        <div className="requirements-title">Required Photos (4)</div>
                                        <div className="photo-grid">
                                            {['Front View - Full structure', 'Rear View - Full structure', 'Left Side - Full structure', 'Right Side - Full structure'].map((photo, index) => (
                                                <div
                                                    key={index}
                                                    className={`photo-requirement ${completedPhotos.includes(photo) ? 'completed' : ''}`}
                                                    onClick={() => togglePhotoRequirement(photo)}
                                                >
                                                    <div className="photo-checkbox"></div>
                                                    <span>{photo}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="requirements-section">
                                        <div className="requirements-title">Optional but Recommended (8)</div>
                                        <div className="photo-grid">
                                            {['Front-Left Corner (45°)', 'Front-Right Corner (45°)', 'Rear-Left Corner (45°)', 'Rear-Right Corner (45°)'].map((photo, index) => (
                                                <div
                                                    key={index}
                                                    className={`photo-requirement ${completedPhotos.includes(photo) ? 'completed' : ''}`}
                                                    onClick={() => togglePhotoRequirement(photo)}
                                                >
                                                    <div className="photo-checkbox"></div>
                                                    <span>{photo}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="upload-actions">
                                    <button className="upload-btn">
                                        Take Photos
                                    </button>
                                    <button className="upload-btn">
                                        Upload
                                    </button>
                                    <button className="upload-btn">
                                        Import
                                    </button>
                                </div>

                                <div className="photo-thumbnails">
                                    <div className="photo-thumb">
                                        <div className="photo-quality good"></div>
                                        <div className="photo-label">Front View</div>
                                    </div>
                                    <div className="photo-thumb">
                                        <div className="photo-quality warning"></div>
                                        <div className="photo-label">Left Side</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeInputTab === 'drone' && (
                            <div className="tab-content active">
                                <div style={{
                                    padding: '1rem',
                                    background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
                                    borderRadius: '8px',
                                    marginBottom: '1rem'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        fontSize: '0.875rem',
                                        color: '#1e40af'
                                    }}>
                                        For highest accuracy (99.5%)
                                    </div>
                                </div>

                                <FileUploader label={'Upload drone photos or video'} files={droneFiles} setFiles={setDroneFiles} allowedExtensions={['.jpg', '.png', '.mp4', '.mov']} maxSizeMB={10} maxFiles={1} />

                                <div style={{
                                    padding: '1rem',
                                    background: '#f9fafb',
                                    borderRadius: '8px',
                                    marginTop: '1rem'
                                }}>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        color: '#374151',
                                        marginBottom: '0.5rem'
                                    }}>Flight Guidelines
                                    </div>
                                    <div style={{fontSize: '0.7rem', color: '#6b7280', lineHeight: '1.5'}}>
                                        • Altitude: 75-100 feet<br/>
                                        • Overlap: 60-80%<br/>
                                        • Best time: Mid-day<br/>
                                        • Weather: Clear, low wind
                                    </div>
                                </div>
                            </div>
                        )}
                        */}
                    </div>


            </div>

            {
                activeModal === 'allReports' && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
                        <div className="bg-white rounded-xl w-full max-w-[920px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
                            <div className="flex justify-between items-center px-6 py-6 border-b border-gray-200">
                                <h2 className="text-xl font-bold text-gray-800">Saved Measurement Reports</h2>
                                <button className="w-8 h-8 border-0 bg-transparent cursor-pointer text-2xl text-gray-500 flex items-center justify-center hover:bg-gray-100 rounded-md" onClick={closeModal}>×</button>
                            </div>
                            <div className="p-6">
                                <SavedReportsList
                                    reports={reportList}
                                    loading={reportListLoading}
                                    onSelect={(row) => {
                                        setExtractResult(row);
                                        setEdits({ ...(row?.extracted_data ?? {}) });
                                        closeModal();
                                    }}
                                    onUseInEstimate={(row) => {
                                        const params = new URLSearchParams();
                                        params.set('measurement_id', row.id);
                                        if (row.client_id) params.set('client_id', row.client_id);
                                        window.location.href = `/dashboard/estimation?${params.toString()}`;
                                    }}
                                    onDelete={async (row) => {
                                        if (!window.confirm(`Delete "${row.title || 'Untitled measurement'}"?`)) return;
                                        try {
                                            await axiosInstance.delete(`/measurement/${row.id}`);
                                            toast.success('Report deleted');
                                            refreshReportList();
                                        } catch { /* toasted */ }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )
            }

        </div>
    );
};

export default Page;

// ──────────────────────────────────────────────────────────────────────────
//   ExtractedPanel — show the AI-extracted measurements + editable inputs
//   + Save / Confirm / Use-in-Estimate actions. Defined in this file (not a
//   separate component file) because it's used in exactly one place.
// ──────────────────────────────────────────────────────────────────────────
const FIELD_GRID = [
    { key: 'squares',          label: 'Squares',            unit: 'sq',  step: '0.1' },
    { key: 'total_sq_ft',      label: 'Total Area',         unit: 'ft²', step: '1'   },
    { key: 'pitch',            label: 'Pitch',              unit: 'x/12', step: null,  type: 'text' },
    { key: 'ridge_lf',         label: 'Ridge',              unit: 'LF',  step: '1'   },
    { key: 'hip_lf',           label: 'Hip',                unit: 'LF',  step: '1'   },
    { key: 'valley_lf',        label: 'Valley',             unit: 'LF',  step: '1'   },
    { key: 'eave_lf',          label: 'Eave',               unit: 'LF',  step: '1'   },
    { key: 'rake_lf',          label: 'Rake',               unit: 'LF',  step: '1'   },
    { key: 'step_flashing_lf', label: 'Step Flashing',      unit: 'LF',  step: '1'   },
    { key: 'facets',           label: 'Facets',             unit: '#',   step: '1'   },
    { key: 'waste_factor',     label: 'Waste Factor',       unit: '%',   step: '1'   },
    { key: 'penetrations',     label: 'Penetrations',       unit: '#',   step: '1'   },
];

function ExtractedPanel({
    row, edits, onChange, onSave, onConfirm, onUseInEstimate,
    savingEdits, confirming,
}) {
    const isConfirmed = row?.status === 'confirmed';
    const conf = Math.round((row?.confidence_score ?? 0) * 100);
    const provider =
        row?.source_provider && row.source_provider !== 'unknown'
            ? row.source_provider
            : null;

    return (
        <div style={{
            marginTop: 14, padding: 14, borderRadius: 10,
            background: '#fffbe7', border: '1px solid #FDB813',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                <div>
                    <div style={{ fontWeight: 700, color: '#1a1f3a', fontSize: 14 }}>
                        {isConfirmed ? '✓ Confirmed measurements' : 'Review & confirm extracted measurements'}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        {provider ? `Detected: ${provider} • ` : ''}
                        Confidence: {conf}%
                        {conf < 70 && ' — please double-check the numbers below'}
                    </div>
                </div>
                {isConfirmed && (
                    <span style={{
                        background: '#10b981', color: 'white', fontSize: 11, fontWeight: 600,
                        padding: '3px 10px', borderRadius: 12,
                    }}>CONFIRMED</span>
                )}
            </div>

            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: 10, marginBottom: 12,
            }}>
                {FIELD_GRID.map(f => (
                    <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                            {f.label} <span style={{ color: '#9ca3af', fontWeight: 400 }}>({f.unit})</span>
                        </label>
                        <input
                            type={f.type ?? 'number'}
                            step={f.step ?? undefined}
                            value={edits?.[f.key] ?? ''}
                            placeholder={row?.extracted_data?.[f.key] === null || row?.extracted_data?.[f.key] === undefined ? '—' : ''}
                            onChange={(e) => onChange(f.key, e.target.value)}
                            disabled={isConfirmed}
                            style={{
                                padding: '7px 9px', border: '1px solid #e5e7eb', borderRadius: 6,
                                fontSize: 13, background: isConfirmed ? '#f3f4f6' : '#fff',
                            }}
                        />
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {!isConfirmed && (
                    <>
                        <button
                            type="button" className="btn btn-outline"
                            onClick={onSave} disabled={savingEdits || confirming}
                            style={{ padding: '8px 14px', fontSize: 13 }}
                        >
                            {savingEdits ? 'Saving…' : 'Save Edits'}
                        </button>
                        <button
                            type="button" className="btn btn-primary"
                            onClick={onConfirm} disabled={savingEdits || confirming}
                            style={{ padding: '8px 14px', fontSize: 13 }}
                        >
                            {confirming ? 'Confirming…' : 'Confirm Measurements'}
                        </button>
                    </>
                )}
                <button
                    type="button" className="btn btn-secondary"
                    onClick={onUseInEstimate}
                    style={{ padding: '8px 14px', fontSize: 13 }}
                >
                    Use in Estimate →
                </button>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────────
//   SavedReportsList — list of measurement rows from `GET /measurement`,
//   shown inside the All Reports modal. Filters + per-row actions.
// ──────────────────────────────────────────────────────────────────────────
function SavedReportsList({ reports, loading, onSelect, onUseInEstimate, onDelete }) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const filtered = reports.filter((r) => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            (r.title || '').toLowerCase().includes(q) ||
            (r.source_file_name || '').toLowerCase().includes(q) ||
            (r.source_provider || '').toLowerCase().includes(q)
        );
    });

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                Loading reports…
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <input
                    type="text"
                    placeholder="Search by title, filename, provider…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                        flex: 1, padding: '10px 14px', border: '1px solid #e5e7eb',
                        borderRadius: 8, fontSize: 13,
                    }}
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                        padding: '10px 14px', border: '1px solid #e5e7eb',
                        borderRadius: 8, fontSize: 13, background: 'white',
                    }}
                >
                    <option value="all">All statuses</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="extracted">Extracted (unverified)</option>
                    <option value="failed">Failed</option>
                    <option value="manual">Manual</option>
                </select>
            </div>

            {reports.length === 0 ? (
                <div style={{
                    padding: '3rem 1rem', textAlign: 'center',
                    background: '#f9fafb', borderRadius: 10, border: '1px dashed #e5e7eb',
                }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
                    <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>No reports yet</div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>
                        Upload a measurement PDF to extract your first report.
                    </div>
                </div>
            ) : filtered.length === 0 ? (
                <div style={{
                    padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: 13,
                }}>
                    No reports match your filters.
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 10, maxHeight: 520, overflowY: 'auto', paddingRight: 4 }}>
                    {filtered.map((r) => {
                        const sq = r.extracted_data?.squares;
                        const ridge = r.extracted_data?.ridge_lf;
                        const eave = r.extracted_data?.eave_lf;
                        const conf = Math.round((r.confidence_score ?? 0) * 100);
                        const statusColors = {
                            confirmed: { bg: '#dcfce7', fg: '#166534' },
                            extracted: { bg: '#fef9c3', fg: '#854d0e' },
                            failed:    { bg: '#fee2e2', fg: '#991b1b' },
                            manual:    { bg: '#dbeafe', fg: '#1e40af' },
                        };
                        const sc = statusColors[r.status] || statusColors.extracted;

                        return (
                            <div
                                key={r.id}
                                style={{
                                    padding: 14, border: '1px solid #e5e7eb', borderRadius: 10,
                                    background: 'white', transition: 'all 0.2s ease', cursor: 'pointer',
                                }}
                                onClick={() => onSelect(r)}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#FDB813'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(253,184,19,0.15)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, color: '#1a1f3a', fontSize: 14, marginBottom: 3 }}>
                                            {r.title || r.source_file_name || 'Untitled measurement'}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#6b7280' }}>
                                            {new Date(r.created_at).toLocaleString()}
                                            {r.source_provider && r.source_provider !== 'unknown' && ` · ${r.source_provider}`}
                                            {conf > 0 && ` · ${conf}% confidence`}
                                        </div>
                                    </div>
                                    <span style={{
                                        background: sc.bg, color: sc.fg, fontSize: 11, fontWeight: 600,
                                        padding: '3px 10px', borderRadius: 12, textTransform: 'uppercase',
                                        letterSpacing: 0.3, whiteSpace: 'nowrap',
                                    }}>{r.status}</span>
                                </div>

                                {(sq != null || ridge != null || eave != null) && (
                                    <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#374151', marginBottom: 10, flexWrap: 'wrap' }}>
                                        {sq != null && <span><strong>{sq}</strong> sq</span>}
                                        {ridge != null && <span><strong>{ridge}</strong> LF ridge</span>}
                                        {eave != null && <span><strong>{eave}</strong> LF eave</span>}
                                        {r.extracted_data?.pitch && <span>Pitch <strong>{r.extracted_data.pitch}</strong></span>}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onUseInEstimate(r); }}
                                        style={{
                                            padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                            background: '#FDB813', color: '#1a1f3a', border: 'none', borderRadius: 6,
                                        }}
                                    >Use in Estimate →</button>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onSelect(r); }}
                                        style={{
                                            padding: '6px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                                            background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 6,
                                        }}
                                    >Open</button>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onDelete(r); }}
                                        style={{
                                            padding: '6px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                                            background: 'white', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, marginLeft: 'auto',
                                        }}
                                    >Delete</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
