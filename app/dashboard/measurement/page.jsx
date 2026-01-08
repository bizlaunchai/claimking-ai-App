"use client"
import React, {useEffect, useRef, useState} from 'react';
import "./measurement.css"
import FileUploader from "@/utiles/FileUploader.jsx";

const Page = () => {

    // State management
    const [activeClientTab, setActiveClientTab] = useState('existing');
    const [activeInputTab, setActiveInputTab] = useState('report');
    const [selectedClient, setSelectedClient] = useState(null);
    const [expandedSections, setExpandedSections] = useState(['roofing']);
    const [selectedAccuracy, setSelectedAccuracy] = useState('standard');
    const [completedPhotos, setCompletedPhotos] = useState([]);
    const [showReport, setShowReport] = useState(false);
    const [activeModal, setActiveModal] = useState(null);
    const [activeSettingsTab, setActiveSettingsTab] = useState('accuracy');
    const [processingLog, setProcessingLog] = useState([
        { message: '• Detecting structure boundaries... Done', status: 'success' },
        { message: '• Identifying roof planes... Done', status: 'success' },
        { message: '• Calculating square footage...', status: 'processing' },
        { message: '• Measuring linear elements...', status: 'pending' }
    ]);
    const [viewAllReportModal, setViewAllReportModal] = useState(false)
    const [measurementReportsFiles, setMeasurementReportsFiles] = useState([])
    const [droneFiles, setDroneFiles] = useState([])


    // Refs
    const reportFileRef = useRef(null);

    // Client functions
    const switchClientTab = (tab) => {
        setActiveClientTab(tab);
    };

    const selectClient = (clientName) => {
        setSelectedClient({
            name: clientName,
            address: '123 Main St, Dallas, TX 75201',
            stats: 'Roof: ~3,500 sq ft | Last measured: 30 days ago'
        });
        startAnalysis();
    };

    const createClient = () => {
        setSelectedClient({
            name: 'New Client',
            address: '123 Main Street, Dallas, TX 75201',
            stats: 'New client - no previous measurements'
        });
        startAnalysis();
    };

    const changeClient = () => {
        setSelectedClient(null);
    };

    // Input functions
    const switchInputTab = (tab) => {
        setActiveInputTab(tab);
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            console.log('File selected:', file.name);
            // Handle file processing here
        }
    };

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
                            <div className="crown-logo">
                                <svg viewBox="0 0 24 24" fill="#1a1f3a" width="24" height="24">
                                    <path
                                        d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2.86-2h8.28l.5-2.02l-2.87-1.73L12 13l-1.77-2.75l-2.87 1.73L7.86 14z"/>
                                </svg>
                            </div>
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
                            }}>23</span>
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
                                    onChange={(e) => searchClients(e.target.value)}
                                    style={{paddingLeft: '1rem'}}
                                />
                            </div>

                            <div style={{display: 'grid', gap: '0.5rem'}}>
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
                            </div>
                        </div>
                    )}

                    {/* New Client Tab */}
                    {activeClientTab === 'new' && (
                        <div className="tab-content active">
                            <form className="form-grid">
                                <div className="form-group">
                                    <label className="form-label required">Full Name</label>
                                    <input type="text" className="form-input" placeholder="John Smith"/>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input type="tel" className="form-input" placeholder="(555) 123-4567"/>
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label required">Property Address</label>
                                    <input type="text" className="form-input"
                                           placeholder="123 Main Street, Dallas, TX 75201"/>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Property Type</label>
                                    <select className="form-select">
                                        <option>Residential</option>
                                        <option>Commercial</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Stories</label>
                                    <select className="form-select">
                                        <option>1</option>
                                        <option>1.5</option>
                                        <option>2</option>
                                        <option>2.5</option>
                                        <option>3+</option>
                                    </select>
                                </div>
                                <div className="form-group full-width">
                                    <button type="button" className="btn btn-primary" onClick={createClient}>Create
                                        Client & Continue
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

                {/* Three Column Analysis Interface */}
                <div className="analysis-interface">
                    {/* Left Column - Input Sources */}
                    <div className="column-card">
                        <h3 className="column-header">Input Sources</h3>

                        <div className="input-tabs">
                            <button
                                className={`input-tab ${activeInputTab === 'report' ? 'active' : ''}`}
                                onClick={() => switchInputTab('report')}
                            >
                                Upload Report
                            </button>
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

                                <FileUploader label={'Drag & drop measurement reports here'} files={measurementReportsFiles} setFiles={setMeasurementReportsFiles} allowedExtensions={['.pdf', '.xml', '.esx', '.jpg', '.png']} maxFiles={2} />

                                <div className="provider-badges">
                                    <div className="provider-badge">EagleView</div>
                                    <div className="provider-badge">CoreLogic</div>
                                    <div className="provider-badge">HOVER</div>
                                    <div className="provider-badge">Pictometry</div>
                                    <div className="provider-badge">Xactimate</div>
                                </div>
                            </div>
                        )}

                        {/* Ground Photos Tab */}
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

                        {/* Drone Tab */}
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

                                {/*<div className="upload-zone">
                                    <p className="upload-text" style={{marginBottom: '0.5rem'}}>Upload drone photos or video</p>
                                    <p className="upload-subtext">JPG, PNG, MP4, MOV</p>
                                </div>*/}

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
                    </div>

                    {/* Middle Column - Measurement Configuration */}
                    <div className="column-card">
                        <h3 className="column-header">Measurement Configuration</h3>

                        {/* Quick Presets */}
                        <div className="quick-presets">
                            <button className="preset-btn active">Full Exterior</button>
                            <button className="preset-btn">Roof Only</button>
                            <button className="preset-btn">Insurance Standard</button>
                            <button className="preset-btn">Siding Package</button>
                            <button className="preset-btn">Complete Replacement</button>
                        </div>

                        {/* Roofing Measurements */}
                        <div className="measurement-section">
                            <div
                                className={`section-header ${expandedSections.includes('roofing') ? 'expanded' : ''}`}
                                onClick={() => toggleSection('roofing')}
                            >
                                <div className="section-title">
                                    Roofing Measurements
                                </div>
                                <div className="master-toggle">
                                    <span>All</span>
                                    <label className="toggle-switch">
                                        <input type="checkbox" defaultChecked/>
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                            {expandedSections.includes('roofing') && (
                                <div className="section-content active">
                                    <div className="measurement-options">
                                        {[
                                            'Total Roof Area (squares)',
                                            'Area by Pitch',
                                            'Ridge Length (linear feet)',
                                            'Hip Length',
                                            'Valley Length',
                                            'Eave/Drip Edge Length',
                                            'Waste Factor Calculation (10%)'
                                        ].map((option, index) => (
                                            <div key={index} className="measurement-option">
                                                <input
                                                    type="checkbox"
                                                    className="measurement-checkbox"
                                                    defaultChecked={index < 6}
                                                />
                                                <span>{option}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Siding Measurements */}
                        <div className="measurement-section">
                            <div
                                className={`section-header ${expandedSections.includes('siding') ? 'expanded' : ''}`}
                                onClick={() => toggleSection('siding')}
                            >
                                <div className="section-title">
                                    Siding Measurements
                                </div>
                                <div className="master-toggle">
                                    <span>All</span>
                                    <label className="toggle-switch">
                                        <input type="checkbox"/>
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                            {expandedSections.includes('siding') && (
                                <div className="section-content">
                                    <div className="measurement-options">
                                        {[
                                            'Front Elevation (sq ft)',
                                            'Rear Elevation (sq ft)',
                                            'Left Side (sq ft)',
                                            'Right Side (sq ft)'
                                        ].map((option, index) => (
                                            <div key={index} className="measurement-option">
                                                <input type="checkbox" className="measurement-checkbox"/>
                                                <span>{option}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Gutter System */}
                        <div className="measurement-section">
                            <div
                                className={`section-header ${expandedSections.includes('gutter') ? 'expanded' : ''}`}
                                onClick={() => toggleSection('gutter')}
                            >
                                <div className="section-title">
                                    Gutter System
                                </div>
                                <div className="master-toggle">
                                    <span>All</span>
                                    <label className="toggle-switch">
                                        <input type="checkbox"/>
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                            {expandedSections.includes('gutter') && (
                                <div className="section-content">
                                    <div className="measurement-options">
                                        {[
                                            'Gutter Linear Feet',
                                            'Downspout Count & Total Length',
                                            'Inside/Outside Corners Count'
                                        ].map((option, index) => (
                                            <div key={index} className="measurement-option">
                                                <input type="checkbox" className="measurement-checkbox"/>
                                                <span>{option}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* AI Analysis Settings */}
                        <h4 style={{
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: '#374151',
                            margin: '1.5rem 0 1rem'
                        }}>AI Analysis Settings</h4>
                        <div className="accuracy-modes">
                            {[
                                {id: 'quick', title: 'Quick Estimate', time: '1-2 minutes', accuracy: '85%'},
                                {id: 'standard', title: 'Standard', time: '2-5 minutes', accuracy: '92%'},
                                {id: 'precision', title: 'Precision', time: '5-10 minutes', accuracy: '98%'},
                                {id: 'maximum', title: 'Maximum with Drone', time: '10-15 minutes', accuracy: '99.5%'}
                            ].map(mode => (
                                <div
                                    key={mode.id}
                                    className={`accuracy-mode ${selectedAccuracy === mode.id ? 'selected' : ''}`}
                                    onClick={() => selectAccuracyMode(mode.id)}
                                >
                                    <div className="accuracy-title">{mode.title}</div>
                                    <div className="accuracy-details">
                                        <span>{mode.time}</span>
                                        <span>{mode.accuracy}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column - Live Results & Preview */}
                    <div className="column-card">
                        <h3 className="column-header">Live Results & Preview</h3>

                        {/* Analysis Status Panel */}
                        <div className="status-panel">
                            <div className="status-title">Analysis Status</div>
                            <div className="status-steps">
                                <div className="status-step completed">
                                    Client selected
                                </div>
                                <div className="status-step completed">
                                    Photos uploaded (12)
                                </div>
                                <div className="status-step active">
                                    AI analyzing structure...
                                </div>
                                <div className="status-step">
                                    Generating measurements
                                </div>
                                <div className="status-step">
                                    Creating report
                                </div>
                            </div>
                        </div>

                        {/* Processing Log */}
                        <div className="processing-log">
                            {processingLog.map((entry, index) => (
                                <div key={index} className={`log-entry ${entry.status}`}>
                                    {entry.message}
                                </div>
                            ))}
                        </div>

                        {/* 3D Model Preview */}
                        <div className="model-preview">
                            <div className="model-placeholder">
                                <p style={{fontSize: '0.875rem', color: '#6b7280'}}>3D Model Generating...</p>
                            </div>
                            <div className="model-controls">
                                <button className="model-control-btn">Rotate</button>
                                <button className="model-control-btn">Zoom</button>
                                <button className="model-control-btn">Layers</button>
                            </div>
                        </div>

                        {/* Preliminary Results */}
                        <div className="results-section">
                            <div className="results-category">
                                <div className="results-title">Roofing</div>
                                <div className="result-item">
                                    <span className="result-label">Total Area:</span>
                                    <span className="result-value">~32.5 squares</span>
                                </div>
                                <div className="result-item">
                                    <span className="result-label">Main Roof:</span>
                                    <span className="result-value">~28 sq @ 6/12</span>
                                </div>
                                <div className="result-item">
                                    <span className="result-label">Total Ridge:</span>
                                    <span className="result-value">~125 LF</span>
                                </div>
                                <div className="result-item">
                                    <span className="result-label">Total Eave:</span>
                                    <span className="result-value">~180 LF</span>
                                </div>
                            </div>

                            <div className="results-category">
                                <div className="results-title">Siding</div>
                                <div className="result-item">
                                    <span className="result-label">Total Area:</span>
                                    <span className="result-value">~2,850 sq ft</span>
                                </div>
                                <div className="result-item">
                                    <span className="result-label">Front:</span>
                                    <span className="result-value">~750 sq ft</span>
                                </div>
                            </div>
                        </div>

                        {/* Confidence Scores */}
                        <div className="confidence-section">
                            {[
                                {label: 'Roof Area', percentage: 96},
                                {label: 'Siding', percentage: 94},
                                {label: 'Linear Measurements', percentage: 92}
                            ].map((item, index) => (
                                <div key={index} className="confidence-item">
                                    <div className="confidence-header">
                                        <span className="confidence-label">{item.label}</span>
                                        <span className="confidence-percentage">{item.percentage}%</span>
                                    </div>
                                    <div className="confidence-bar">
                                        <div className="confidence-fill high"
                                             style={{width: `${item.percentage}%`}}></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Report Actions */}
                        <div className="report-actions">
                            <button className="btn btn-primary" onClick={generateReport}>Generate Full Report</button>
                            <button className="btn btn-secondary" onClick={saveMeasurements}>Save Measurements</button>
                            <button className="btn btn-outline" onClick={requestVerify}>Request Professional Verify
                            </button>
                        </div>
                    </div>
                </div>

                {/* Generated Report Section */}
                {showReport && (
                    <div className="report-section" id="generatedReport">
                        <div className="report-header">
                            <div className="report-company">
                                <div className="crown-logo">
                                    <svg viewBox="0 0 24 24" fill="#1a1f3a" width="24" height="24">
                                        <path
                                            d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2.86-2h8.28l.5-2.02l-2.87-1.73L12 13l-1.77-2.75l-2.87 1.73L7.86 14z"/>
                                    </svg>
                                </div>
                                <div>
                                    <div style={{fontWeight: '600', color: '#1f2937'}}>ClaimKing.AI</div>
                                    <div style={{fontSize: '0.75rem', color: '#6b7280'}}>Measurement Report</div>
                                </div>
                            </div>
                            <div className="report-details">
                                <div className="report-id">Report #MR-2024-0892</div>
                                <div className="report-date">Generated: October 19, 2025</div>
                                <div className="report-date">Data Source: AI Analysis</div>
                            </div>
                        </div>

                        <table className="measurement-table">
                            <thead>
                            <tr>
                                <th>Code</th>
                                <th>Description</th>
                                <th>Quantity</th>
                                <th>Unit</th>
                                <th>Notes</th>
                            </tr>
                            </thead>
                            <tbody>
                            {[
                                {code: 'RFG', desc: 'Roof Area', qty: '32.5', unit: 'SQ', notes: '@ 6/12 pitch'},
                                {code: 'RDG', desc: 'Ridge Cap', qty: '125.0', unit: 'LF', notes: 'Standard profile'},
                                {code: 'HIP', desc: 'Hip Ridge', qty: '45.0', unit: 'LF', notes: '-'},
                                {code: 'VAL', desc: 'Valley', qty: '45.0', unit: 'LF', notes: 'W-type valley'},
                                {code: 'DRP', desc: 'Drip Edge', qty: '180.0', unit: 'LF', notes: 'Type C'}
                            ].map((row, index) => (
                                <tr key={index}>
                                    <td className="xactimate-code">{row.code}</td>
                                    <td>{row.desc}</td>
                                    <td><strong>{row.qty}</strong></td>
                                    <td>{row.unit}</td>
                                    <td>{row.notes}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>

                        <div className="export-options">
                            <button className="export-btn" onClick={downloadPDF}>
                                Download PDF Report
                            </button>
                            <button className="export-btn" onClick={exportXactimate}>
                                Export to Xactimate (ESX)
                            </button>
                            <button className="export-btn" onClick={exportExcel}>
                                Export to Excel
                            </button>
                            <button className="export-btn" onClick={sendToPortal}>
                                Send to Client Portal
                            </button>
                            <button className="export-btn" onClick={emailAdjuster}>
                                Email to Adjuster
                            </button>
                        </div>
                    </div>
                )}
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
                                <div className="report-item">
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
                                </div>
                            </div>

                            <div className="modal-pagination">
                                <span>Showing 3 of 23 reports</span>
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
                                <div className="timeline-item">
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
                                </div>
                            </div>


                            <div className="history-stats">
                                <div className="stat-box">
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
                                </div>
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
                                                defaultValue="2"
                                                min="1"
                                                max="10"
                                            />
                                        </div>
                                        <div className="setting-item">
                                            <label>Linear Measurement Tolerance (ft)</label>
                                            <input
                                                type="number"
                                                className="setting-input"
                                                defaultValue="0.5"
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
                                                defaultValue="85"
                                                min="70"
                                                max="100"
                                            />
                                        </div>
                                        <div className="setting-item">
                                            <label>Auto-Verify Threshold (%)</label>
                                            <input
                                                type="number"
                                                className="setting-input"
                                                defaultValue="95"
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