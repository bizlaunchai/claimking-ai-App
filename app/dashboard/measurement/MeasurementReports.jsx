"use client"
import React, {useEffect, useRef, useState} from 'react';
import "./measurement.css"
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
            setExtractResult(payload);
            // Seed the editable form with whatever the AI got.
            setEdits({ ...(payload?.extracted_data ?? {}) });
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

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (activeModal && event.target.classList.contains('modal-overlay')) {
                closeModal();
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [activeModal]);


    return (
        <div>
            <div className="measurement-header-section" style={{background: 'white'}}>
                <div className="measurement-header-content">
                    <div className="measurement-header-left">
                        <div className="page-title">
                            Measurement Report Analysis
                        </div>
                        <p className="page-subtitle">AI-powered measurements from photos or existing reports</p>
                        <div className="status-badges">
                            <div className="status-badge active">
                                AI Ready
                            </div>
                            <div className="status-badge active">
                                Drone Compatible
                            </div>
                            <div className="status-badge active">
                                98% Accuracy Rate
                            </div>
                        </div>
                    </div>
                    <div className="header-actions">
                        <button className="btn btn-outline" onClick={() => openModal('allReports')}>
                            View All Reports
                            <span style={{
                                background: '#dc2626',
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '10px',
                                fontSize: '0.65rem'
                            }}>0</span>
                        </button>
                        <button className="btn btn-outline" onClick={() => openModal('history')}>
                            Measurement History
                        </button>
                        <button className="btn btn-outline" onClick={() => openModal('settings')}>
                            Calibration Settings
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Container */}
            <div className="main-container">
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
                <div className="column-card" style={{ maxWidth: 880, margin: '0 auto' }}>
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
                                    disabled={extracting || measurementReportsFiles.length === 0}
                                >
                                    {extracting ? 'Extracting…' : 'Extract Measurements'}
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
                activeModal === 'allReports' &&  <div className={`modal-overlay`} id="allReportsModal">
                    <div className="modal">
                        <div className="modal-header">
                            <h2 className="modal-title">All Measurement Reports</h2>
                            <button className="modal-close" onClick={closeModal}>×</button>
                        </div>

                        <div className="modal-body">
                            <div className="modal-search-bar">
                                <input type="text" className="modal-search-input"
                                       placeholder="Search reports by client, address, or report ID..."
                                       onKeyUp={(e) => searchReports(e.target.value)}/>
                                <select className="filter-select" onChange={(e) => filterReports(e.target.value)}>
                                    <option value="all">All Reports</option>
                                    <option value="completed">Completed</option>
                                    <option value="pending">Pending</option>
                                    <option value="ai-generated">AI Generated</option>
                                    <option value="uploaded">Uploaded</option>
                                </select>
                            </div>


                            <div className="reports-list">
                               {/* <div className="report-item">
                                    <div className="report-item-header">
                                        <div>
                                            <div className="report-title">Johnson Property - Full Exterior</div>
                                            <div className="report-meta">Report #MR-2024-0892 • Oct 19, 2025 • AI
                                                Generated
                                            </div>
                                        </div>
                                        <div className="report-status completed">Completed</div>
                                    </div>
                                    <div className="report-details">
                                        <span>32.5 squares</span> • <span>125 LF ridge</span> • <span>180 LF eave</span> • <span>96% confidence</span>
                                    </div>
                                    <div className="report-actions">
                                        <button className="report-action-btn" onClick={() => viewReport('MR-2024-0892')}>View
                                        </button>
                                        <button className="report-action-btn"
                                                onClick={() => downloadReport('MR-2024-0892')}>Download
                                        </button>
                                        <button className="report-action-btn" onClick={() => shareReport('MR-2024-0892')}>Share
                                        </button>
                                    </div>
                                </div>

                                <div className="report-item">
                                    <div className="report-item-header">
                                        <div>
                                            <div className="report-title">Smith Residence - Roof Only</div>
                                            <div className="report-meta">Report #MR-2024-0891 • Oct 18, 2025 • EagleView
                                                Import
                                            </div>
                                        </div>
                                        <div className="report-status completed">Completed</div>
                                    </div>
                                    <div className="report-details">
                                        <span>28.0 squares</span> • <span>110 LF ridge</span> • <span>165 LF eave</span> • <span>100% verified</span>
                                    </div>
                                    <div className="report-actions">
                                        <button className="report-action-btn" onClick={() => viewReport('MR-2024-0891')}>View
                                        </button>
                                        <button className="report-action-btn"
                                                onClick={() => downloadReport('MR-2024-0891')}>Download
                                        </button>
                                        <button className="report-action-btn" onClick={() => shareReport('MR-2024-0891')}>Share
                                        </button>
                                    </div>
                                </div>

                                <div className="report-item">
                                    <div className="report-item-header">
                                        <div>
                                            <div className="report-title">Davis Complex - Insurance Claim</div>
                                            <div className="report-meta">Report #MR-2024-0890 • Oct 17, 2025 • AI
                                                Generated
                                            </div>
                                        </div>
                                        <div className="report-status pending">Pending Review</div>
                                    </div>
                                    <div className="report-details">
                                        <span>45.2 squares</span> • <span>150 LF ridge</span> • <span>220 LF eave</span> • <span>94% confidence</span>
                                    </div>
                                    <div className="report-actions">
                                        <button className="report-action-btn" onClick={() => viewReport('MR-2024-0890')}>View
                                        </button>
                                        <button className="report-action-btn"
                                                onClick={() => downloadReport('MR-2024-0890')}>Download
                                        </button>
                                        <button className="report-action-btn" onClick={() => shareReport('MR-2024-0890')}>Share
                                        </button>
                                    </div>
                                </div>*/}
                            </div>

                            <div className="modal-pagination">
                                <span>Showing 0 of 0 reports</span>
                                <button className="pagination-btn" onClick={loadMoreReports}>Load More</button>
                            </div>
                        </div>
                    </div>
                </div>
            }

            {
                activeModal === 'history' && <div className={`modal-overlay`} id="historyModal">
                    <div className="modal">
                        <div className="modal-header">
                            <h2 className="modal-title">Measurement History</h2>
                            <button className="modal-close" onClick={closeModal}>×</button>
                        </div>

                        <div className="modal-body">

                            <div className="date-filter">
                                <div className="date-input-group">
                                    <label>From:</label>
                                    <input type="date" className="date-input" defaultValue="2025-09-01"/>
                                </div>
                                <div className="date-input-group">
                                    <label>To:</label>
                                    <input type="date" className="date-input" defaultValue="2025-10-19"/>
                                </div>
                                <button className="btn btn-primary" style={{padding: "0.5rem 1rem", fontSize: "0.875rem"}}>
                                    Apply Filter
                                </button>
                            </div>


                            <div className="history-timeline">
                                {/*<div className="timeline-item">
                                    <div className="timeline-date">October 19, 2025</div>
                                    <div className="timeline-entries">
                                        <div className="timeline-entry">
                                            <span className="timeline-time">2:45 PM</span>
                                            <span className="timeline-action">Generated Report</span>
                                            <span className="timeline-client">Johnson Property</span>
                                            <span className="timeline-method ai">AI Analysis</span>
                                        </div>
                                        <div className="timeline-entry">
                                            <span className="timeline-time">11:30 AM</span>
                                            <span className="timeline-action">Uploaded Photos</span>
                                            <span className="timeline-client">Johnson Property</span>
                                            <span className="timeline-method">12 ground photos</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="timeline-item">
                                    <div className="timeline-date">October 18, 2025</div>
                                    <div className="timeline-entries">
                                        <div className="timeline-entry">
                                            <span className="timeline-time">4:15 PM</span>
                                            <span className="timeline-action">Imported Report</span>
                                            <span className="timeline-client">Smith Residence</span>
                                            <span className="timeline-method eagleview">EagleView</span>
                                        </div>
                                        <div className="timeline-entry">
                                            <span className="timeline-time">9:00 AM</span>
                                            <span className="timeline-action">Drone Analysis</span>
                                            <span className="timeline-client">Wilson Estate</span>
                                            <span className="timeline-method drone">Drone + AI</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="timeline-item">
                                    <div className="timeline-date">October 17, 2025</div>
                                    <div className="timeline-entries">
                                        <div className="timeline-entry">
                                            <span className="timeline-time">3:20 PM</span>
                                            <span className="timeline-action">Manual Adjustment</span>
                                            <span className="timeline-client">Davis Complex</span>
                                            <span className="timeline-method">User Override</span>
                                        </div>
                                    </div>
                                </div>*/}
                            </div>


                            <div className="history-stats">
                                {/*<div className="stat-box">
                                    <div className="stat-value">156</div>
                                    <div className="stat-label">Total Measurements</div>
                                </div>
                                <div className="stat-box">
                                    <div className="stat-value">94.2%</div>
                                    <div className="stat-label">Avg Accuracy</div>
                                </div>
                                <div className="stat-box">
                                    <div className="stat-value">3.5 min</div>
                                    <div className="stat-label">Avg Process Time</div>
                                </div>
                                <div className="stat-box">
                                    <div className="stat-value">82%</div>
                                    <div className="stat-label">AI Generated</div>
                                </div>*/}
                            </div>
                        </div>
                    </div>
                </div>
            }

            {
                activeModal === 'settings' && <div className={`modal-overlay`} id="settingsModal">
                    <div className="modal">
                        <div className="modal-header">
                            <h2 className="modal-title">Calibration Settings</h2>
                            <button className="modal-close" onClick={closeModal}>×</button>
                        </div>

                        <div className="modal-body">

                            <div className="settings-tabs">
                                <button className={`settings-tab ${activeSettingsTab === 'accuracy' ? 'active' : ''}`}
                                        onClick={() => switchSettingsTab('accuracy', event)}>Accuracy Settings
                                </button>
                                <button className={`settings-tab ${activeSettingsTab === 'defaults' ? 'active' : ''}`} onClick={() => switchSettingsTab('defaults', event)}>Default
                                    Values
                                </button>
                                <button className={`settings-tab ${activeSettingsTab === 'ai' ? 'active' : ''}`} onClick={() => switchSettingsTab('ai', event)}>AI Configuration
                                </button>
                                <button className={`settings-tab ${activeSettingsTab === 'units' ? 'active' : ''}`} onClick={() => switchSettingsTab('units', event)}>Units &
                                    Format
                                </button>
                            </div>


                            <div id="accuracySettings" className={`settings-content ${activeSettingsTab === 'accuracy' ? 'active' : ''}`}>
                                <div className="settings-section">
                                    <h3 className="settings-subtitle">Measurement Tolerances</h3>
                                    <div className="settings-grid">
                                        <div className="setting-item">
                                            <label>Roof Area Tolerance (%)</label>
                                            <input
                                                type="number"
                                                className="setting-input"
                                                defaultValue="0"
                                                min="1"
                                                max="10"
                                            />
                                        </div>
                                        <div className="setting-item">
                                            <label>Linear Measurement Tolerance (ft)</label>
                                            <input
                                                type="number"
                                                className="setting-input"
                                                defaultValue="0"
                                                min="0.1"
                                                max="2"
                                                step="0.1"
                                            />
                                        </div>
                                        <div className="setting-item">
                                            <label>Minimum Confidence Score (%)</label>
                                            <input
                                                type="number"
                                                className="setting-input"
                                                defaultValue="0"
                                                min="70"
                                                max="100"
                                            />
                                        </div>
                                        <div className="setting-item">
                                            <label>Auto-Verify Threshold (%)</label>
                                            <input
                                                type="number"
                                                className="setting-input"
                                                defaultValue="0"
                                                min="90"
                                                max="100"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="settings-section">
                                    <h3 className="settings-subtitle">Photo Requirements</h3>
                                    <div className="settings-grid">
                                        <div className="setting-item">
                                            <label>Default Resolution</label>
                                            <select className="setting-select" defaultValue="2560x1440">
                                                <option value="1920x1080">1920x1080 (Full HD)</option>
                                                <option value="2560x1440">2560x1440 (2K)</option>
                                                <option value="3840x2160">3840x2160 (4K)</option>
                                            </select>
                                        </div>
                                        <div className="setting-item">
                                            <label>Required Photos for Analysis</label>
                                            <select className="setting-select" defaultValue={'8'}>
                                                <option value='4'>4 (Basic)</option>
                                                <option value={'8'}>8 (Standard)</option>
                                                <option value={'12'}>12 (Comprehensive)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            <div id="defaultsSettings" className={`settings-content ${activeSettingsTab === 'defaults' ? 'active' : ''}`}>
                                <div className="settings-section">
                                    <h3 className="settings-subtitle">Waste Factors</h3>
                                    <div className="settings-grid">
                                        <div className="setting-item">
                                            <label>Roofing Waste Factor (%)</label>
                                            <input type="number" className="setting-input" defaultValue='10'  min="5" max="20"/>
                                        </div>
                                        <div className="setting-item">
                                            <label>Siding Waste Factor (%)</label>
                                            <input type="number" className="setting-input" defaultValue="8" min="5" max="15"/>
                                        </div>
                                        <div className="setting-item">
                                            <label>Complex Roof Additional (%)</label>
                                            <input type="number" className="setting-input" defaultValue="5" min="0" max="10"/>
                                        </div>
                                    </div>
                                </div>

                                <div className="settings-section">
                                    <h3 className="settings-subtitle">Default Pitches</h3>
                                    <div className="settings-grid">
                                        <div className="setting-item">
                                            <label>Standard Pitch</label>
                                            <select className="setting-select" defaultValue='6/12'>
                                                <option value={'4-12'}>4/12</option>
                                                <option value={'6/12'}>6/12</option>
                                                <option value={'8/12'} >8/12</option>
                                                <option value={'10/12'}>10/12</option>
                                            </select>
                                        </div>
                                        <div className="setting-item">
                                            <label>Steep Pitch Threshold</label>
                                            <select className="setting-select" defaultValue="9/12">
                                                <option value='8/12'>8/12</option>
                                                <option value={'9/12'}>9/12</option>
                                                <option value={'10/12'}>10/12</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            <div id="aiSettings" className={`settings-content ${activeSettingsTab === 'ai' ? 'active' : ''}`}>
                                <div className="settings-section">
                                    <h3 className="settings-subtitle">AI Processing</h3>
                                    <div className="settings-grid">
                                        <div className="setting-item full-width">
                                            <label>Default AI Mode</label>
                                            <select className="setting-select">
                                                <option>Quick Estimate (85% accuracy)</option>
                                                <option>Standard (92% accuracy)</option>
                                                <option>Precision (98% accuracy)</option>
                                            </select>
                                        </div>
                                        <div className="setting-item full-width">
                                            <label>Auto-Enhance Photos</label>
                                            <div className="toggle-group">
                                                <label className="toggle-switch">
                                                    <input type="checkbox" defaultChecked/>
                                                    <span className="toggle-slider"></span>
                                                </label>
                                                <span className="toggle-label">Automatically improve photo quality</span>
                                            </div>
                                        </div>
                                        <div className="setting-item full-width">
                                            <label>Shadow Compensation</label>
                                            <div className="toggle-group">
                                                <label className="toggle-switch">
                                                    <input type="checkbox" defaultChecked/>
                                                    <span className="toggle-slider"></span>
                                                </label>
                                                <span className="toggle-label">Adjust for shadows in measurements</span>
                                            </div>
                                        </div>
                                        <div className="setting-item full-width">
                                            <label>Multi-Material Detection</label>
                                            <div className="toggle-group">
                                                <label className="toggle-switch">
                                                    <input type="checkbox" defaultChecked/>
                                                    <span className="toggle-slider"></span>
                                                </label>
                                                <span
                                                    className="toggle-label">Identify different materials automatically</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            <div id="unitsSettings" className={`settings-content ${activeSettingsTab === 'units' ? 'active' : ''}`}>
                                <div className="settings-section">
                                    <h3 className="settings-subtitle">Measurement Units</h3>
                                    <div className="settings-grid">
                                        <div className="setting-item">
                                            <label>Area Units</label>
                                            <select className="setting-select">
                                                <option>Squares (100 sq ft)</option>
                                                <option>Square Feet</option>
                                                <option>Square Meters</option>
                                            </select>
                                        </div>
                                        <div className="setting-item">
                                            <label>Linear Units</label>
                                            <select className="setting-select" defaultValue='feet'>
                                                <option value='feet'>Feet</option>
                                                <option value='meters'>Meters</option>
                                                <option value='yards'>Yards</option>
                                            </select>
                                        </div>
                                        <div className="setting-item">
                                            <label>Decimal Places</label>
                                            <select className="setting-select" defaultValue='1'>
                                                <option value={'0'}>0</option>
                                                <option value={'1'}>1</option>
                                                <option value={'2'}>2</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="settings-section">
                                    <h3 className="settings-subtitle">Report Format</h3>
                                    <div className="settings-grid">
                                        <div className="setting-item full-width">
                                            <label>Include Xactimate Codes</label>
                                            <div className="toggle-group">
                                                <label className="toggle-switch">
                                                    <input type="checkbox" defaultChecked/>
                                                    <span className="toggle-slider"></span>
                                                </label>
                                                <span className="toggle-label">Show codes in generated reports</span>
                                            </div>
                                        </div>
                                        <div className="setting-item full-width">
                                            <label>Include Confidence Scores</label>
                                            <div className="toggle-group">
                                                <label className="toggle-switch">
                                                    <input type="checkbox" defaultChecked/>
                                                    <span className="toggle-slider"></span>
                                                </label>
                                                <span className="toggle-label">Display AI confidence in reports</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            <div className="settings-footer">
                                <button className="btn btn-outline" onClick={resetSettings}>Reset to Defaults</button>
                                <button className="btn btn-primary" onClick={saveSettings}>Save Settings</button>
                            </div>
                        </div>
                    </div>
                </div>
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
