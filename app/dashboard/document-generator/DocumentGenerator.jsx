'use client'
import React, { useState, useEffect, useRef } from 'react';
import "./document-generator.css"

const DocumentGenerator = () => {
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [viewMode, setViewMode] = useState('grid');
    const [isGenerating, setIsGenerating] = useState(false);
    const [documentType, setDocumentType] = useState('');
    const [requirements, setRequirements] = useState('');
    const [clientInfo, setClientInfo] = useState('');
    const [specificDetails, setSpecificDetails] = useState('');
    const [tone, setTone] = useState('Professional');
    const categoriesSectionRef = useRef(null);

    const documents = [
        // Estimates & Quotes
        { name: 'Roofing Estimate', type: 'Estimate', category: 'estimates', icon: '📊', badge: 'popular' },
        { name: 'Full Property Estimate', type: 'Estimate', category: 'estimates', icon: '🏠' },
        { name: 'Storm Damage Quote', type: 'Estimate', category: 'estimates', icon: '💨', badge: 'new' },
        { name: 'Repair vs Replace Analysis', type: 'Estimate', category: 'estimates', icon: '🔨' },
        
        // Contracts
        { name: 'Work Authorization', type: 'Contract', category: 'contracts', icon: '✍️', badge: 'popular' },
        { name: 'Service Agreement', type: 'Contract', category: 'contracts', icon: '📜' },
        { name: 'Contingency Agreement', type: 'Contract', category: 'contracts', icon: '🤝' },
        { name: 'Subcontractor Agreement', type: 'Contract', category: 'contracts', icon: '📋' },
        
        // Insurance Forms
        { name: 'Insurance Claim Form', type: 'Insurance', category: 'insurance', icon: '📑', badge: 'popular' },
        { name: 'Proof of Loss', type: 'Insurance', category: 'insurance', icon: '📄' },
        { name: 'AOB Form', type: 'Insurance', category: 'insurance', icon: '📝', badge: 'new' },
        { name: 'Certificate of Completion', type: 'Insurance', category: 'insurance', icon: '✅' },
        
        // Supplements
        { name: 'Supplement Request', type: 'Supplement', category: 'supplements', icon: '➕', badge: 'popular' },
        { name: 'Price Increase Letter', type: 'Supplement', category: 'supplements', icon: '📈' },
        { name: 'Hidden Damage Report', type: 'Supplement', category: 'supplements', icon: '🔍' },
        { name: 'Code Upgrade Request', type: 'Supplement', category: 'supplements', icon: '⚡' },
        
        // Invoices
        { name: 'Final Invoice', type: 'Invoice', category: 'invoices', icon: '💵' },
        { name: 'Progress Invoice', type: 'Invoice', category: 'invoices', icon: '📊' },
        { name: 'Deductible Invoice', type: 'Invoice', category: 'invoices', icon: '💳' },
        
        // Letters
        { name: 'Introduction Letter', type: 'Letter', category: 'letters', icon: '✉️' },
        { name: 'Adjuster Follow-up', type: 'Letter', category: 'letters', icon: '📬' },
        { name: 'Denial Appeal', type: 'Letter', category: 'letters', icon: '📮', badge: 'new' },
        
        // Inspection Reports
        { name: 'Roof Inspection Report', type: 'Report', category: 'reports', icon: '🔎' },
        { name: 'Photo Documentation', type: 'Report', category: 'reports', icon: '📸' },
        { name: 'Storm Damage Report', type: 'Report', category: 'reports', icon: '⛈️' },
        
        // Waivers & Releases
        { name: 'Liability Waiver', type: 'Waiver', category: 'waivers', icon: '⚠️' },
        { name: 'Lien Release', type: 'Release', category: 'waivers', icon: '🔒' },
        { name: 'Material Warranty', type: 'Warranty', category: 'waivers', icon: '📝' },
        
        // Management Forms
        { name: 'Employee Onboarding', type: 'HR Form', category: 'management', icon: '👥' },
        { name: 'Safety Checklist', type: 'Management', category: 'management', icon: '📋' },
        { name: 'Project Timeline', type: 'Management', category: 'management', icon: '📅' },
    ];

    const filteredDocuments = documents.filter(doc => {
        const matchesCategory = activeCategory === 'all' || doc.category === activeCategory;
        const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            doc.type.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handleCategoryClick = (category) => {
        setActiveCategory(category);
    };

    const handleShowCategory = (category) => {
        setActiveCategory(category);
        if (categoriesSectionRef.current) {
            categoriesSectionRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleDocumentClick = (doc) => {
        alert(`Opening template: ${doc.name}\n\nThis would open the document editor with the selected template.`);
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setTimeout(() => {
            alert('Document generated successfully! It would open in the editor now.');
            setIsGenerating(false);
            setShowModal(false);
            setDocumentType('');
            setRequirements('');
            setClientInfo('');
            setSpecificDetails('');
            setTone('Professional');
        }, 2000);
    };

    const handleModalGenerate = async () => {
        setIsGenerating(true);
        setTimeout(() => {
            alert('Document generated successfully! It would open in the editor now.');
            setIsGenerating(false);
            setShowModal(false);
            setDocumentType('');
            setRequirements('');
            setClientInfo('');
            setSpecificDetails('');
            setTone('Professional');
        }, 2000);
    };

    return (
        <div>
            {/* Top Header */}
            <div className="document-generator-header">
                <div className="document-generator-header-container">
                    <div className="document-generator-logo-section">
                        <div className="document-generator-logo">
                            <svg viewBox="0 0 24 24">
                                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2.86-2h8.28l.5-2.02l-2.87-1.73L12 13l-1.77-2.75l-2.87 1.73L7.86 14z"/>
                            </svg>
                        </div>
                        <div className="document-generator-logo-text">ClaimKing.AI</div>
                    </div>
                    <div className="document-generator-nav-actions">
                        <button className="document-generator-nav-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                            My Documents
                        </button>
                        <button className="document-generator-nav-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            Recent
                        </button>
                        <button className="document-generator-nav-btn primary" onClick={() => setShowModal(true)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 4v16m8-8H4"/>
                            </svg>
                            New Document
                        </button>
                    </div>
                </div>
            </div>

            <div className="main-container">
            {/* Hero Section */}
            <div className="hero-section">
                <div className="hero-badge">AI-Powered</div>
                <h1 className="hero-title">Insurance Document Generator</h1>
                <p className="hero-subtitle">
                    Create professional insurance forms, contracts, estimates, and management documents instantly. 
                    Choose from our templates or let AI generate custom documents for your specific needs.
                </p>
            </div>

            {/* Stats Bar */}
            <div className="stats-bar">
                <div className="stat-item">
                    <div className="stat-value">150+</div>
                    <div className="stat-label">Document Templates</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">25k</div>
                    <div className="stat-label">Documents Created</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">98%</div>
                    <div className="stat-label">Accuracy Rate</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">2 min</div>
                    <div className="stat-label">Avg. Creation Time</div>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="search-filter-bar">
                <div className="search-box">
                    <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="M21 21l-4.35-4.35"/>
                    </svg>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search for templates (e.g., 'roof estimate', 'insurance form', 'contract')"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select className="filter-dropdown">
                    <option>All Categories</option>
                    <option>Estimates</option>
                    <option>Contracts</option>
                    <option>Insurance Forms</option>
                    <option>Supplements</option>
                    <option>Invoices</option>
                </select>
                <select className="filter-dropdown">
                    <option>Sort by: Popular</option>
                    <option>Sort by: Newest</option>
                    <option>Sort by: A-Z</option>
                    <option>Sort by: Most Used</option>
                </select>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <div className="action-card" onClick={() => handleShowCategory('estimates')}>
                    <div className="action-icon">📋</div>
                    <div className="action-title">Roofing Estimate</div>
                    <div className="action-description">Generate detailed estimates with material breakdowns and labor costs</div>
                </div>
                <div className="action-card" onClick={() => handleShowCategory('contracts')}>
                    <div className="action-icon">📝</div>
                    <div className="action-title">Work Authorization</div>
                    <div className="action-description">Create binding contracts and work authorization forms</div>
                </div>
                <div className="action-card" onClick={() => handleShowCategory('insurance')}>
                    <div className="action-icon">🏢</div>
                    <div className="action-title">Insurance Forms</div>
                    <div className="action-description">Claim forms, supplements, and adjuster correspondence</div>
                </div>
                <div className="action-card" onClick={() => setShowModal(true)}>
                    <div className="action-icon">🤖</div>
                    <div className="action-title">AI Custom Document</div>
                    <div className="action-description">Describe what you need and AI will create it instantly</div>
                </div>
            </div>

            {/* Document Categories */}
            <div className="categories-section" ref={categoriesSectionRef}>
                <div className="section-header">
                    <h2 className="section-title">Document Templates</h2>
                    <div className="view-toggle">
                        <button 
                            className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z"/>
                            </svg>
                        </button>
                        <button 
                            className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 4h18v2H3zm0 7h18v2H3zm0 7h18v2H3z"/>
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Category Tabs */}
                <div className="category-tabs">
                    <button 
                        className={`category-tab ${activeCategory === 'all' ? 'active' : ''}`}
                        onClick={() => handleCategoryClick('all')}
                    >
                        All Templates
                    </button>
                    <button 
                        className={`category-tab ${activeCategory === 'estimates' ? 'active' : ''}`}
                        onClick={() => handleCategoryClick('estimates')}
                    >
                        Estimates & Quotes
                    </button>
                    <button 
                        className={`category-tab ${activeCategory === 'contracts' ? 'active' : ''}`}
                        onClick={() => handleCategoryClick('contracts')}
                    >
                        Contracts
                    </button>
                    <button 
                        className={`category-tab ${activeCategory === 'insurance' ? 'active' : ''}`}
                        onClick={() => handleCategoryClick('insurance')}
                    >
                        Insurance Forms
                    </button>
                    <button 
                        className={`category-tab ${activeCategory === 'supplements' ? 'active' : ''}`}
                        onClick={() => handleCategoryClick('supplements')}
                    >
                        Supplements
                    </button>
                    <button 
                        className={`category-tab ${activeCategory === 'invoices' ? 'active' : ''}`}
                        onClick={() => handleCategoryClick('invoices')}
                    >
                        Invoices
                    </button>
                    <button 
                        className={`category-tab ${activeCategory === 'letters' ? 'active' : ''}`}
                        onClick={() => handleCategoryClick('letters')}
                    >
                        Letters
                    </button>
                    <button 
                        className={`category-tab ${activeCategory === 'reports' ? 'active' : ''}`}
                        onClick={() => handleCategoryClick('reports')}
                    >
                        Inspection Reports
                    </button>
                    <button 
                        className={`category-tab ${activeCategory === 'waivers' ? 'active' : ''}`}
                        onClick={() => handleCategoryClick('waivers')}
                    >
                        Waivers & Releases
                    </button>
                    <button 
                        className={`category-tab ${activeCategory === 'management' ? 'active' : ''}`}
                        onClick={() => handleCategoryClick('management')}
                    >
                        Management Forms
                    </button>
                </div>

                {/* Documents Grid */}
                <div className="documents-grid">
                    {filteredDocuments.map((doc, index) => (
                        <div 
                            key={index}
                            className="document-card" 
                            onClick={() => handleDocumentClick(doc)}
                        >
                            {doc.badge && (
                                <span className={`document-badge ${doc.badge}`}>
                                    {doc.badge === 'new' ? 'New' : 'Popular'}
                                </span>
                            )}
                            <div className="document-icon">{doc.icon}</div>
                            <div className="document-name">{doc.name}</div>
                            <div className="document-type">{doc.type}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Create Custom Document Section */}
            <div className="create-document-section">
                <div className="create-content">
                    <div className="create-header">
                        <div className="create-icon-wrapper">
                            <span className="create-icon">🤖</span>
                        </div>
                        <div className="create-text">
                            <h2 className="create-title">Create Custom Document with AI</h2>
                            <p className="create-subtitle">
                                Can't find what you're looking for? Describe your document needs and our AI will generate a professional template instantly.
                            </p>
                        </div>
                    </div>

                    <div className="create-form">
                        <div className="form-group">
                            <label className="form-label">Document Type</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g., 'Hail damage assessment form' or 'Customer complaint resolution letter'"
                                value={documentType}
                                onChange={(e) => setDocumentType(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Specific Requirements</label>
                            <textarea
                                className="form-textarea"
                                placeholder="Describe any specific fields, sections, or legal requirements you need included..."
                                value={requirements}
                                onChange={(e) => setRequirements(e.target.value)}
                            />
                        </div>
                        <div className="form-actions">
                            <button 
                                className="generate-btn"
                                onClick={handleGenerate}
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                                            <polyline points="22 4 12 14.01 9 11.01"/>
                                        </svg>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                            <polyline points="14 2 14 8 20 8"/>
                                            <line x1="12" y1="18" x2="12" y2="12"/>
                                            <line x1="9" y1="15" x2="15" y2="15"/>
                                        </svg>
                                        Generate Document with AI
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Documents */}
            <div className="recent-section">
                <div className="section-header">
                    <h2 className="section-title">Recently Generated</h2>
                    <button className="nav-btn">View All</button>
                </div>
                <div className="recent-list">
                    <div className="recent-item">
                        <div className="recent-icon">📊</div>
                        <div className="recent-info">
                            <div className="recent-name">Smith Residence - Roof Estimate</div>
                            <div className="recent-meta">Created 2 hours ago • Roofing Estimate</div>
                        </div>
                        <div className="recent-actions">
                            <button className="action-btn">Edit</button>
                            <button className="action-btn">Download</button>
                            <button className="action-btn">Share</button>
                        </div>
                    </div>
                    <div className="recent-item">
                        <div className="recent-icon">✍️</div>
                        <div className="recent-info">
                            <div className="recent-name">Johnson Property - Work Authorization</div>
                            <div className="recent-meta">Created yesterday • Contract</div>
                        </div>
                        <div className="recent-actions">
                            <button className="action-btn">Edit</button>
                            <button className="action-btn">Download</button>
                            <button className="action-btn">Share</button>
                        </div>
                    </div>
                    <div className="recent-item">
                        <div className="recent-icon">➕</div>
                        <div className="recent-info">
                            <div className="recent-name">Williams Claim - Supplement Request</div>
                            <div className="recent-meta">Created 3 days ago • Supplement</div>
                        </div>
                        <div className="recent-actions">
                            <button className="action-btn">Edit</button>
                            <button className="action-btn">Download</button>
                            <button className="action-btn">Share</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Assistant Button */}
            <button className="ai-assistant-btn" onClick={() => alert('AI Assistant would open here - ready to help you find or create any document!')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21.928 11.607c-.202-.488-.635-.605-.928-.633V8c0-1.103-.897-2-2-2h-6V4.61c.305-.274.5-.668.5-1.11a1.5 1.5 0 0 0-3 0c0 .442.195.836.5 1.11V6H5c-1.103 0-2 .897-2 2v2.997l-.082.006A1 1 0 0 0 1.99 12v2a1 1 0 0 0 1 1H3v5c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2v-5a1 1 0 0 0 1-1v-1.938a1.006 1.006 0 0 0-.072-.455zM5 20V8h14l.001 3.996L19 12v2l.001.005.001 5.995H5z"/>
                    <ellipse cx="8.5" cy="12" rx="1.5" ry="2"/>
                    <ellipse cx="15.5" cy="12" rx="1.5" ry="2"/>
                    <path d="M8 16h8v2H8z"/>
                </svg>
                AI Document Assistant
            </button>

            {/* Modal for AI Generator */}
            {showModal && (
                <div className="modal active" onClick={(e) => {
                    if (e.target.classList.contains('modal')) {
                        setShowModal(false);
                    }
                }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">AI Document Generator</h3>
                            <button className="close-modal" onClick={() => setShowModal(false)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"/>
                                    <line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label light">What type of document do you need?</label>
                                <input
                                    type="text"
                                    className="form-input light"
                                    placeholder="e.g., 'Insurance claim denial appeal letter'"
                                    value={documentType}
                                    onChange={(e) => setDocumentType(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label light">Client/Project Information</label>
                                <input
                                    type="text"
                                    className="form-input light"
                                    placeholder="Client name, property address, claim number..."
                                    value={clientInfo}
                                    onChange={(e) => setClientInfo(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label light">Specific Details</label>
                                <textarea
                                    className="form-textarea light"
                                    placeholder="Any specific points to include, damage details, amounts, dates..."
                                    value={specificDetails}
                                    onChange={(e) => setSpecificDetails(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label light">Tone & Style</label>
                                <select 
                                    className="filter-dropdown" 
                                    style={{ width: '100%' }}
                                    value={tone}
                                    onChange={(e) => setTone(e.target.value)}
                                >
                                    <option>Professional</option>
                                    <option>Formal Legal</option>
                                    <option>Friendly</option>
                                    <option>Urgent</option>
                                    <option>Diplomatic</option>
                                </select>
                            </div>
                            <div className="form-actions">
                                <button 
                                    className="generate-btn" 
                                    style={{ width: '100%' }}
                                    onClick={handleModalGenerate}
                                    disabled={isGenerating}
                                >
                                    {isGenerating ? (
                                        <>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                                                <polyline points="22 4 12 14.01 9 11.01"/>
                                            </svg>
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                                            </svg>
                                            Generate Document Now
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default DocumentGenerator;

