"use client"
import React, {useState} from 'react';
import "./clientPortal.css"

const Page = () => {

    const [showAddClient, setShowAddClient] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [showPortalSettings, setShowPortalSettings] = useState(false);

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
                        <div
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
                        </div>
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

export default Page;