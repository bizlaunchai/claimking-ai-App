'use client'
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance';
import DocumentResultModal from './DocumentResultModal';
import "./document-generator.css"

/**
 * Map an axios error to a friendly, generic message we can show inline so
 * the user understands roughly what went wrong without seeing a stack trace
 * or backend internals.
 */
const friendlyGenerationError = (e) => {
    const status = e?.response?.status;
    const raw = (e?.userMessage || e?.response?.data?.message || '').toString().toLowerCase();

    if (status === 401) return 'Your session expired. Please refresh the page and sign in again.';
    if (status === 402) return 'You don\'t have enough credits to generate this document. Top up credits or contact your admin.';
    if (status === 403) return 'This feature is currently disabled for your account.';
    if (status === 422) return 'Setup is incomplete — likely a missing API key. Open API Settings to add it.';
    if (status === 404) return 'Required record (such as the selected client) could not be found.';
    if (raw.includes('api key not configured') || raw.includes('not configured')) {
        return 'AI provider key is not set up yet. Open API Settings to add your OpenAI / Claude key.';
    }
    if (raw.includes('quota') || raw.includes('rate limit') || raw.includes('429')) {
        return 'The AI provider hit a rate limit. Wait a minute and try again.';
    }
    if (status >= 500) return 'The AI provider had a hiccup on our side. Please try again in a moment.';
    if (!status) return 'Could not reach the server. Check your connection and try again.';
    return 'Something went wrong while generating the document. Please try again.';
};

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
    const [generatedDoc, setGeneratedDoc] = useState(null);
    const [showResultModal, setShowResultModal] = useState(false);
    const categoriesSectionRef = useRef(null);
    const [modalError, setModalError] = useState('');
    // Inline error banner shown above the page-level "Create Custom Document"
    // form when generation fails. Generic, user-friendly copy only.
    const [formError, setFormError] = useState('');

    // Existing clients for the "Client / Project" dropdown.
    // Per Brief §09 documents must auto-populate from the customer file rather
    // than asking the user to retype info that already exists in the system.
    const [clients, setClients] = useState([]);
    const [clientsLoading, setClientsLoading] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState('');

    // Recent generated documents (for the "Recently Generated" section).
    const [recentDocs, setRecentDocs] = useState([]);
    const [recentLoading, setRecentLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setClientsLoading(true);
            try {
                const res = await axiosInstance.get('/client-portal');
                const list = Array.isArray(res?.data) ? res.data : (res?.data?.data ?? []);
                if (!cancelled) setClients(list);
            } catch {
                /* interceptor already toasts */
            } finally {
                if (!cancelled) setClientsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const fetchRecentDocs = async () => {
        setRecentLoading(true);
        try {
            const res = await axiosInstance.get('/document/recent', { params: { limit: 20 } });
            const list = res?.data?.data ?? [];
            setRecentDocs(list);
        } catch {
            /* interceptor toasts */
        } finally {
            setRecentLoading(false);
        }
    };

    useEffect(() => {
        fetchRecentDocs();
    }, []);

    // Clear stale errors when the AI Generator modal is (re)opened.
    useEffect(() => {
        if (showModal) setModalError('');
    }, [showModal]);


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
        // Pre-fill the AI generator with the selected template name and open
        // the modal so the user can refine details before generating.
        setDocumentType(doc.name);
        setShowModal(true);
    };

    const callGenerateApi = async (payload) => {
        const res = await axiosInstance.post('/document/generate', payload);
        return res?.data?.data;
    };

    const resetForm = () => {
        setDocumentType('');
        setRequirements('');
        setClientInfo('');
        setSpecificDetails('');
        setTone('Professional');
        setSelectedClientId('');
    };

    const handleGenerate = async () => {
        if (!documentType.trim()) {
            setFormError('Please describe what document you need before generating.');
            return;
        }
        setIsGenerating(true);
        setFormError('');
        try {
            const data = await callGenerateApi({
                documentType: documentType.trim(),
                clientId: selectedClientId || undefined,
                requirements: requirements.trim() || undefined,
                tone,
            });
            setGeneratedDoc(data);
            setShowResultModal(true);
            toast.success('Document generated', {
                description: `${data?.credits?.cost ?? 0} credits used.`,
            });
            resetForm();
            fetchRecentDocs();
        } catch (e) {
            setFormError(friendlyGenerationError(e));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleModalGenerate = async () => {
        if (!documentType.trim()) {
            setModalError('Please describe what document you need before generating.');
            return;
        }
        setIsGenerating(true);
        setModalError('');
        try {
            const data = await callGenerateApi({
                documentType: documentType.trim(),
                clientId: selectedClientId || undefined,
                clientInfo: clientInfo.trim() || undefined,
                specificDetails: specificDetails.trim() || undefined,
                tone,
            });
            setGeneratedDoc(data);
            setShowModal(false);
            setShowResultModal(true);
            toast.success('Document generated', {
                description: `${data?.credits?.cost ?? 0} credits used.`,
            });
            resetForm();
            fetchRecentDocs();
        } catch (e) {
            setModalError(friendlyGenerationError(e));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleOpenRecent = async (docId) => {
        try {
            const res = await axiosInstance.get(`/document/${docId}`);
            const row = res?.data?.data;
            if (!row) return;
            setGeneratedDoc({
                id: row.id,
                title: row.title,
                content: row.content,
                provider: row.provider,
                model: row.model,
                tone: row.tone,
                documentType: row.document_type,
                clientId: row.client_id,
                createdAt: row.created_at,
                credits: { cost: row.credits_cost, balance_after: null },
            });
            setShowResultModal(true);
        } catch {
            /* interceptor toasts */
        }
    };

    const handleDeleteRecent = async (docId, ev) => {
        ev?.stopPropagation?.();
        if (!confirm('Delete this generated document? This cannot be undone.')) return;
        try {
            await axiosInstance.delete(`/document/${docId}`);
            toast.success('Document deleted');
            setRecentDocs((prev) => prev.filter((d) => d.id !== docId));
        } catch {
            /* interceptor toasts */
        }
    };

    const formatRelativeTime = (iso) => {
        if (!iso) return '';
        const diffMs = Date.now() - new Date(iso).getTime();
        if (Number.isNaN(diffMs)) return '';
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
        return new Date(iso).toLocaleDateString();
    };

    // Result-modal copy/download logic now lives in DocumentResultModal.jsx,
    // which uses the centralized .ck-modal* styles in app/styles/modal.css.

    return (
        <div>
            {/* Top Header */}
            <div className="document-generator-header">
                <div className="document-generator-header-container">
                    <div className="document-generator-logo-section">
                        <div className="document-generator-logo-text">Document Generator</div>
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
                    <div className="stat-value">0</div>
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
                        {formError && (
                            <div className="ck-alert ck-alert--error" role="alert">
                                <span className="ck-alert-icon" aria-hidden="true">⚠️</span>
                                <div className="ck-alert-body">
                                    <div className="ck-alert-title">Couldn't generate the document</div>
                                    <div>{formError}</div>
                                </div>
                            </div>
                        )}
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
                            <label className="form-label">
                                Client / Project
                                <span style={{ marginLeft: 6, color: '#9ca3af', fontWeight: 400, fontSize: 12 }}>
                                    — auto-populates name, address, carrier &amp; claim info
                                </span>
                            </label>
                            <select
                                className="form-input"
                                value={selectedClientId}
                                onChange={(e) => setSelectedClientId(e.target.value)}
                                disabled={clientsLoading}
                            >
                                <option value="">
                                    {clientsLoading
                                        ? 'Loading clients…'
                                        : clients.length === 0
                                            ? 'No clients yet — add one in CRM'
                                            : '-- Select existing client (optional) --'}
                                </option>
                                {clients.map((c) => {
                                    const name = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim();
                                    const loc = [c.city, c.state].filter(Boolean).join(', ');
                                    return (
                                        <option key={c.id} value={c.id}>
                                            {name}{loc ? ` — ${loc}` : ''}{c.claim_number ? ` (claim ${c.claim_number})` : ''}
                                        </option>
                                    );
                                })}
                            </select>
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
                        {modalError && (
                            <div style={{
                                marginTop: '12px',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                color: '#dc2626',
                                fontSize: '13px',
                                lineHeight: '1.5',
                                display: 'flex',
                                gap: '8px',
                                alignItems: 'flex-start',
                            }}>
                                <span style={{ fontSize: '15px', flexShrink: 0 }}>⚠️</span>
                                <span>{modalError}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Documents */}
            <div className="recent-section">
                <div className="section-header">
                    <h2 className="section-title">Recently Generated</h2>
                    <button className="nav-btn" onClick={fetchRecentDocs} disabled={recentLoading}>
                        {recentLoading ? 'Loading…' : 'Refresh'}
                    </button>
                </div>
                <div className="recent-list">
                    {recentLoading && recentDocs.length === 0 && (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                            Loading…
                        </div>
                    )}
                    {!recentLoading && recentDocs.length === 0 && (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                            No documents yet — generate your first document above.
                        </div>
                    )}
                    {recentDocs.map((doc) => (
                        <div
                            key={doc.id}
                            className="recent-item"
                            onClick={() => handleOpenRecent(doc.id)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="recent-icon">📄</div>
                            <div className="recent-info">
                                <div className="recent-name">{doc.title || doc.document_type}</div>
                                <div className="recent-meta">
                                    {formatRelativeTime(doc.created_at)}
                                    {' • '}
                                    {doc.document_type}
                                    {doc.provider ? ` • ${doc.provider}` : ''}
                                </div>
                            </div>
                            <div className="recent-actions">
                                <button
                                    className="action-btn"
                                    onClick={(ev) => { ev.stopPropagation(); handleOpenRecent(doc.id); }}
                                >
                                    Open
                                </button>
                                <button
                                    className="action-btn"
                                    onClick={(ev) => handleDeleteRecent(doc.id, ev)}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
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
                        setModalError('');
                    }
                }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">AI Document Generator</h3>
                            <button className="close-modal" onClick={() => { setShowModal(false); setModalError(''); }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"/>
                                    <line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>
                        <div className="modal-body">
                            {modalError && (
                                <div className="ck-alert ck-alert--error" role="alert">
                                    <span className="ck-alert-icon" aria-hidden="true">⚠️</span>
                                    <div className="ck-alert-body">
                                        <div className="ck-alert-title">Couldn't generate the document</div>
                                        <div>{modalError}</div>
                                    </div>
                                </div>
                            )}
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
                                <label className="form-label light">
                                    Client / Project
                                    <span style={{ marginLeft: 6, color: '#9ca3af', fontWeight: 400, fontSize: 12 }}>
                                        — auto-populates name, address, carrier, policy &amp; claim number
                                    </span>
                                </label>
                                <select
                                    className="form-input light"
                                    value={selectedClientId}
                                    onChange={(e) => setSelectedClientId(e.target.value)}
                                    disabled={clientsLoading}
                                >
                                    <option value="">
                                        {clientsLoading
                                            ? 'Loading clients…'
                                            : clients.length === 0
                                                ? 'No clients yet — add one in CRM'
                                                : '-- Select existing client (optional) --'}
                                    </option>
                                    {clients.map((c) => {
                                        const name = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim();
                                        const loc = [c.city, c.state].filter(Boolean).join(', ');
                                        return (
                                            <option key={c.id} value={c.id}>
                                                {name}{loc ? ` — ${loc}` : ''}{c.claim_number ? ` (claim ${c.claim_number})` : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label light">
                                    Extra context
                                    <span style={{ marginLeft: 6, color: '#9ca3af', fontWeight: 400, fontSize: 12 }}>
                                        — only what is NOT already on the client file
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    className="form-input light"
                                    placeholder="e.g. specific event date, adjuster name, optional notes…"
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

            {/* Generated-document result modal (centralized .ck-modal styles) */}
            {showResultModal && generatedDoc && (
                <DocumentResultModal
                    doc={generatedDoc}
                    onClose={() => setShowResultModal(false)}
                />
            )}
            </div>
        </div>
    );
};

export default DocumentGenerator;

