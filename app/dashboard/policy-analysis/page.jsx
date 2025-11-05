'use client'
import React, { useState, useRef, useEffect } from 'react';
import "./policy-analysis.css"

const PolicyAnalysis = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedClient, setSelectedClient] = useState(null);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [activeTab, setActiveTab] = useState('existing');
    const [newClientName, setNewClientName] = useState('');
    const [newClientCarrier, setNewClientCarrier] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [openAccordions, setOpenAccordions] = useState({ actions: true });
    const [clientSearch, setClientSearch] = useState('');
    
    const fileInputRef = useRef(null);
    const uploadZoneRef = useRef(null);

    const clients = [
        { name: 'Sarah Johnson', carrier: 'State Farm', policy: '#SF-2024-789456' },
        { name: 'Michael Chen', carrier: 'Allstate', policy: '#AS-2024-123789' },
    ];

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        client.carrier.toLowerCase().includes(clientSearch.toLowerCase()) ||
        client.policy.toLowerCase().includes(clientSearch.toLowerCase())
    );

    useEffect(() => {
        const uploadZone = uploadZoneRef.current;
        if (!uploadZone) return;

        const handleDragOver = (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragging');
        };

        const handleDragLeave = () => {
            uploadZone.classList.remove('dragging');
        };

        const handleDrop = (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragging');
            handleFiles(e.dataTransfer.files);
        };

        uploadZone.addEventListener('dragover', handleDragOver);
        uploadZone.addEventListener('dragleave', handleDragLeave);
        uploadZone.addEventListener('drop', handleDrop);

        return () => {
            uploadZone.removeEventListener('dragover', handleDragOver);
            uploadZone.removeEventListener('dragleave', handleDragLeave);
            uploadZone.removeEventListener('drop', handleDrop);
        };
    }, []);

    const updateProgress = (step) => {
        setCurrentStep(step);
    };

    const handleSelectClient = (name) => {
        setSelectedClient(name);
        updateProgress(2);
    };

    const handleCreateClient = () => {
        if (newClientName && newClientCarrier !== '') {
            handleSelectClient(newClientName);
        } else {
            alert('Please fill in all required fields');
        }
    };

    const handleChangeClient = () => {
        setSelectedClient(null);
        setUploadedFiles([]);
        setShowResults(false);
        updateProgress(1);
    };

    const handleFiles = (files) => {
        if (files.length > 0) {
            const fileArray = Array.from(files);
            setUploadedFiles(prev => [...prev, ...fileArray]);
            updateProgress(3);
        }
    };

    const handleFileInputChange = (e) => {
        handleFiles(e.target.files);
    };

    const removeFile = (index) => {
        setUploadedFiles(prev => {
            const newFiles = prev.filter((_, i) => i !== index);
            if (newFiles.length === 0) {
                updateProgress(2);
            }
            return newFiles;
        });
    };

    const handleAnalyze = () => {
        if (uploadedFiles.length === 0) return;
        
        setIsAnalyzing(true);
        
        setTimeout(() => {
            setShowResults(true);
            setIsAnalyzing(false);
            updateProgress(4);
        }, 3000);
    };

    const toggleAccordion = (section) => {
        setOpenAccordions(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const progressWidth = ((currentStep - 1) / 3) * 100;

    return (
        <div className="bg-gray-50 min-h-screen">
            {/* Header Section */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">
                            AI Policy Analysis
                        </h1>
                        <p className="text-sm text-gray-600 mt-1">Decode insurance policies in seconds</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="status-badge ready">
                            AI Ready
                        </span>
                        <span className="status-badge ready">
                            HIPAA Compliant
                        </span>
                    </div>
                </div>
            </div>

            {/* Progress Steps */}
            <div className="px-6 py-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="progress-steps">
                        <div className="progress-line" style={{ width: `${progressWidth}%` }}></div>
                        <div className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
                            <div className="step-circle">1</div>
                            <div className="step-label">Select Client</div>
                        </div>
                        <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
                            <div className="step-circle">2</div>
                            <div className="step-label">Upload Documents</div>
                        </div>
                        <div className={`step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
                            <div className="step-circle">3</div>
                            <div className="step-label">Analyze Policy</div>
                        </div>
                        <div className={`step ${currentStep >= 4 ? 'active' : ''}`}>
                            <div className="step-circle">4</div>
                            <div className="step-label">View Results</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="px-6 pb-6">
                {/* Step 1: Client Selection */}
                {!selectedClient && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Select or Create Client</h2>
                        
                        <div className="flex gap-4 mb-4">
                            <button 
                                className={`tab-button ${activeTab === 'existing' ? 'active' : ''}`}
                                onClick={() => setActiveTab('existing')}
                            >
                                Existing Client
                            </button>
                            <button 
                                className={`tab-button ${activeTab === 'new' ? 'active' : ''}`}
                                onClick={() => setActiveTab('new')}
                            >
                                New Client
                            </button>
                        </div>

                        {/* Existing Client Tab */}
                        {activeTab === 'existing' && (
                            <div>
                                <div className="relative mb-4">
                                    <input 
                                        type="text" 
                                        placeholder="Search client name, address, or policy number..." 
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                        value={clientSearch}
                                        onChange={(e) => setClientSearch(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredClients.map((client, index) => (
                                        <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-yellow-400 cursor-pointer transition">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{client.name}</h3>
                                                    <p className="text-sm text-gray-600">{client.carrier}</p>
                                                    <p className="text-sm text-gray-500">Policy: {client.policy}</p>
                                                </div>
                                                <button 
                                                    onClick={() => handleSelectClient(client.name)}
                                                    className="px-3 py-1 bg-yellow-400 text-gray-900 rounded text-sm font-medium hover:bg-yellow-500 transition"
                                                >
                                                    Select
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* New Client Tab */}
                        {activeTab === 'new' && (
                            <div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name*</label>
                                        <input 
                                            type="text" 
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                            value={newClientName}
                                            onChange={(e) => setNewClientName(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Carrier*</label>
                                        <select 
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                            value={newClientCarrier}
                                            onChange={(e) => setNewClientCarrier(e.target.value)}
                                        >
                                            <option value="">Select Carrier</option>
                                            <option>State Farm</option>
                                            <option>Allstate</option>
                                            <option>Progressive</option>
                                            <option>USAA</option>
                                        </select>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleCreateClient}
                                    className="mt-4 px-6 py-3 bg-yellow-400 text-gray-900 rounded-lg font-medium hover:bg-yellow-500 transition"
                                >
                                    Create Client & Continue
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Selected Client Bar */}
                {selectedClient && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="text-sm text-green-800">✓ Client Selected: </span>
                                <span className="font-semibold text-green-900">{selectedClient}</span>
                            </div>
                            <button 
                                onClick={handleChangeClient}
                                className="text-sm text-blue-600 hover:underline"
                            >
                                Change Client
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Document Upload */}
                {selectedClient && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 2: Upload Policy Documents</h2>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Upload Zone */}
                            <div>
                                <div 
                                    ref={uploadZoneRef}
                                    className={`upload-zone p-8 rounded-lg text-center ${uploadedFiles.length > 0 ? 'has-files' : ''}`}
                                >
                                    <input 
                                        ref={fileInputRef}
                                        type="file" 
                                        className="file-input-hidden"
                                        multiple 
                                        accept=".pdf,.jpg,.png,.doc,.docx"
                                        onChange={handleFileInputChange}
                                    />
                                    {uploadedFiles.length === 0 ? (
                                        <div>
                                            <p className="text-gray-700 font-medium text-lg mb-2">Drag & drop policy documents here</p>
                                            <p className="text-xs text-gray-500 mt-2">PDF, JPG, PNG, DOC, DOCX • Max 50MB</p>
                                            <div className="grid grid-cols-2 gap-2 mt-4">
                                                <button 
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition"
                                                >
                                                    📁 Select Files
                                                </button>
                                                <button 
                                                    onClick={() => alert('Camera feature will open device camera for document capture')}
                                                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition"
                                                >
                                                    📷 Take Photo
                                                </button>
                                                <button 
                                                    onClick={() => alert('Email import will connect to your email to import policy documents')}
                                                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition"
                                                >
                                                    ✉️ Import Email
                                                </button>
                                                <button 
                                                    onClick={() => alert('Document scanner will open scanning interface')}
                                                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition"
                                                >
                                                    📄 Scan Doc
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="text-green-600 text-4xl mb-2">✓</div>
                                            <p className="text-green-700 font-medium">Documents Ready</p>
                                            <p className="text-sm text-gray-600 mt-1">Click "Analyze Policy" to continue</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Document Checklist & Uploaded Files */}
                            <div>
                                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Required Documents:</h3>
                                    <div className="space-y-2 text-sm">
                                        <label className="flex items-center gap-2">
                                            <input 
                                                type="checkbox" 
                                                className="rounded text-yellow-400"
                                                checked={uploadedFiles.length > 0}
                                                readOnly
                                            />
                                            <span className="text-gray-700">Declarations Page <span className="text-red-500">*</span></span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input type="checkbox" className="rounded text-yellow-400" />
                                            <span className="text-gray-700">Policy Booklet</span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input type="checkbox" className="rounded text-yellow-400" />
                                            <span className="text-gray-700">Endorsements/Riders</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Uploaded Files List */}
                                {uploadedFiles.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Uploaded Files:</h3>
                                        <div className="space-y-2">
                                            {uploadedFiles.map((file, index) => (
                                                <div key={index} className="document-item slide-down">
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium">{file.name}</p>
                                                        <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                    </div>
                                                    <span className="status-badge ready text-xs">Ready</span>
                                                    <button 
                                                        onClick={() => removeFile(index)}
                                                        className="ml-2 text-gray-400 hover:text-red-500 text-lg"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Analyze Button */}
                        <div className="mt-6 text-center">
                            <button 
                                onClick={handleAnalyze}
                                disabled={uploadedFiles.length === 0 || isAnalyzing}
                                className={`analyze-button px-8 py-3 rounded-lg font-medium text-lg transition ${
                                    uploadedFiles.length === 0 || isAnalyzing
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-yellow-400 text-gray-900 hover:bg-yellow-500'
                                } ${isAnalyzing ? 'processing' : ''}`}
                            >
                                {isAnalyzing ? (
                                    <div className="spinner">
                                        <div className="loading-dots">
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>
                                        <span className="ml-2">Analyzing Policy</span>
                                    </div>
                                ) : (
                                    <span className="button-text">
                                        {uploadedFiles.length === 0 ? 'Select Files to Enable Analysis' : 'Analyze Policy'}
                                    </span>
                                )}
                            </button>
                            <p className="text-xs text-gray-500 mt-2">Analysis typically takes 30-60 seconds</p>
                        </div>
                    </div>
                )}

                {/* Step 3 & 4: Analysis Results */}
                {showResults ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Results */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Policy Analysis Results</h2>
                                
                                {/* Coverage Summary */}
                                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                                    <h3 className="font-semibold text-gray-800 mb-2">Coverage Summary</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-600">Policy Type:</span>
                                            <strong className="block">HO-3 (Open Peril)</strong>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Coverage A:</span>
                                            <strong className="block">$225,000</strong>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Wind/Hail Deductible:</span>
                                            <strong className="block text-red-600">2% ($4,500)</strong>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Standard Deductible:</span>
                                            <strong className="block">$1,000</strong>
                                        </div>
                                    </div>
                                </div>

                                {/* What's Covered */}
                                <div className="border border-green-200 rounded-lg mb-4">
                                    <div 
                                        className="accordion-header bg-green-50 p-4 flex justify-between items-center"
                                        onClick={() => toggleAccordion('covered')}
                                    >
                                        <h3 className="font-semibold text-green-800">✓ What's Covered</h3>
                                        <span>{openAccordions.covered ? '▲' : '▼'}</span>
                                    </div>
                                    <div className={`accordion-content ${openAccordions.covered ? 'open' : ''}`}>
                                        <div className="p-4 text-sm">
                                            <ul className="space-y-1">
                                                <li>✓ Wind and Hail Damage</li>
                                                <li>✓ Fire and Lightning</li>
                                                <li>✓ Weight of Ice, Snow, Sleet</li>
                                                <li>✓ Code Upgrade Coverage (10%)</li>
                                                <li>✓ Extended Replacement Cost (25%)</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* What's Excluded */}
                                <div className="border border-red-200 rounded-lg mb-4">
                                    <div 
                                        className="accordion-header bg-red-50 p-4 flex justify-between items-center"
                                        onClick={() => toggleAccordion('excluded')}
                                    >
                                        <h3 className="font-semibold text-red-800">✗ What's Excluded</h3>
                                        <span>{openAccordions.excluded ? '▲' : '▼'}</span>
                                    </div>
                                    <div className={`accordion-content ${openAccordions.excluded ? 'open' : ''}`}>
                                        <div className="p-4 text-sm">
                                            <ul className="space-y-1">
                                                <li>✗ Flood (separate policy needed)</li>
                                                <li>✗ Earthquake</li>
                                                <li>✗ Wear and Tear</li>
                                                <li>✗ Cosmetic Damage</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Items */}
                                <div className="border border-yellow-400 rounded-lg">
                                    <div 
                                        className="accordion-header bg-yellow-50 p-4 flex justify-between items-center"
                                        onClick={() => toggleAccordion('actions')}
                                    >
                                        <h3 className="font-semibold text-yellow-800">⚡ Action Items</h3>
                                        <span>{openAccordions.actions ? '▲' : '▼'}</span>
                                    </div>
                                    <div className={`accordion-content ${openAccordions.actions ? 'open' : ''}`}>
                                        <div className="p-4 space-y-2">
                                            <div className="bg-green-100 border border-green-300 rounded p-3 text-sm">
                                                <strong className="text-green-800">Include code upgrades</strong> - 10% additional coverage available
                                            </div>
                                            <div className="bg-red-100 border border-red-300 rounded p-3 text-sm">
                                                <strong className="text-red-800">High wind deductible</strong> - Client pays $4,500
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Side Panel */}
                        <div>
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                                <div className="space-y-3">
                                    <button className="w-full py-2 bg-yellow-400 text-gray-900 rounded-lg font-medium hover:bg-yellow-500 transition">
                                        Generate Report
                                    </button>
                                    <button className="w-full py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                                        Create Estimate
                                    </button>
                                    <button className="w-full py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                                        Share with Client
                                    </button>
                                </div>

                                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                    <h4 className="text-sm font-semibold text-blue-900 mb-2">Coverage Score</h4>
                                    <div className="text-3xl font-bold text-blue-600">85/100</div>
                                    <p className="text-xs text-blue-700 mt-1">Good coverage with opportunities</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    selectedClient && uploadedFiles.length > 0 && (
                        <div className="bg-white rounded-lg border border-gray-200 p-6 disabled-section">
                            <div className="disabled-overlay">
                                <div className="disabled-message">
                                    <p className="text-gray-700 font-medium mb-2">📄 No Policy Analyzed Yet</p>
                                    <p className="text-sm text-gray-600">Upload documents and click "Analyze Policy" to see results</p>
                                </div>
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default PolicyAnalysis;

