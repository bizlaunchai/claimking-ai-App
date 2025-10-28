'use client'
import React, {useState, useEffect, useRef, useMemo} from 'react';
import Chart from 'chart.js/auto';
import './supplement.css';

const SupplementsManagement = () => {
    // State declarations
    const [selectedClient, setSelectedClient] = useState(null);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [supplementItems, setSupplementItems] = useState([]);
    const [itemIdCounter, setItemIdCounter] = useState(1);
    const [activeFilter, setActiveFilter] = useState('all');
    const [activeCategory, setActiveCategory] = useState('all');
    const [showSupplementPopup, setShowSupplementPopup] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [clientSearchResults, setClientSearchResults] = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [supplementType, setSupplementType] = useState('');
    const [additionalNotes, setAdditionalNotes] = useState('');

    // Sample data
    const sampleClients = [
        { id: 'CLM-2024-892', name: 'Johnson Property', address: '123 Main St, Dallas, TX', policy: 'POL-12345678' },
        { id: 'CLM-2024-891', name: 'Smith Residence', address: '456 Oak Ave, Houston, TX', policy: 'POL-23456789' },
        { id: 'CLM-2024-890', name: 'Davis Complex', address: '789 Pine Rd, Austin, TX', policy: 'POL-34567890' },
        { id: 'CLM-2024-889', name: 'Wilson Estate', address: '321 Elm St, San Antonio, TX', policy: 'POL-45678901' },
        { id: 'CLM-2024-888', name: 'Martinez Home', address: '654 Maple Dr, Fort Worth, TX', policy: 'POL-56789012' }
    ];

    const supplementItemsData = [
        // Roofing Items
        { id: 1, name: 'Drip Edge Metal', category: 'roofing', unit: 'LF', avgPrice: '8.50', successRate: '92%' },
        { id: 2, name: 'Ridge Cap Shingles', category: 'roofing', unit: 'Bundle', avgPrice: '45.00', successRate: '89%' },
        { id: 3, name: 'Ice & Water Shield', category: 'roofing', unit: 'Roll', avgPrice: '125.00', successRate: '94%' },
        { id: 4, name: 'Starter Strip Shingles', category: 'roofing', unit: 'Bundle', avgPrice: '35.00', successRate: '88%' },
        { id: 5, name: 'Synthetic Underlayment', category: 'roofing', unit: 'SQ', avgPrice: '25.00', successRate: '85%' },
        { id: 6, name: 'Step Flashing', category: 'roofing', unit: 'EA', avgPrice: '2.50', successRate: '91%' },
        { id: 7, name: 'Pipe Boot Flashing', category: 'roofing', unit: 'EA', avgPrice: '15.00', successRate: '93%' },
        { id: 8, name: 'Valley Metal', category: 'roofing', unit: 'LF', avgPrice: '12.00', successRate: '87%' },
        { id: 9, name: 'Chimney Cricket', category: 'roofing', unit: 'EA', avgPrice: '450.00', successRate: '78%' },
        // Gutter Items
        { id: 10, name: 'Seamless Gutters', category: 'gutters', unit: 'LF', avgPrice: '8-12/LF', successRate: '86%' },
        { id: 11, name: 'Downspouts', category: 'gutters', unit: 'EA', avgPrice: '35.00', successRate: '88%' },
        { id: 12, name: 'Gutter Guards', category: 'gutters', unit: 'LF', avgPrice: '22.00', successRate: '72%' },
        { id: 13, name: 'Splash Blocks', category: 'gutters', unit: 'EA', avgPrice: '15.00', successRate: '90%' },
        // Siding Items
        { id: 14, name: 'Vinyl Siding', category: 'siding', unit: 'SQ', avgPrice: '250.00', successRate: '83%' },
        { id: 15, name: 'House Wrap', category: 'siding', unit: 'SQ', avgPrice: '18.00', successRate: '91%' },
        { id: 16, name: 'J-Channel', category: 'siding', unit: 'LF', avgPrice: '2.50', successRate: '88%' },
        // Ventilation Items
        { id: 17, name: 'Ridge Vent', category: 'ventilation', unit: 'LF', avgPrice: '10.00', successRate: '95%' },
        { id: 18, name: 'Soffit Vents', category: 'ventilation', unit: 'EA', avgPrice: '8.00', successRate: '90%' },
        { id: 19, name: 'Turtle Vents', category: 'ventilation', unit: 'EA', avgPrice: '35.00', successRate: '87%' },
        { id: 20, name: 'Power Vent', category: 'ventilation', unit: 'EA', avgPrice: '350.00', successRate: '75%' },
        // Interior Items
        { id: 21, name: 'Drywall Repair', category: 'interior', unit: 'SF', avgPrice: '3.50', successRate: '82%' },
        { id: 22, name: 'Insulation R-30', category: 'interior', unit: 'SF', avgPrice: '1.25', successRate: '79%' },
        { id: 23, name: 'Interior Paint', category: 'interior', unit: 'SF', avgPrice: '2.50', successRate: '77%' },
        // Electrical Items
        { id: 24, name: 'Weatherhead Repair', category: 'electrical', unit: 'EA', avgPrice: '450.00', successRate: '85%' },
        { id: 25, name: 'Service Mast', category: 'electrical', unit: 'EA', avgPrice: '850.00', successRate: '80%' },
        // Permits/Fees
        { id: 26, name: 'Building Permit', category: 'permits', unit: 'EA', avgPrice: '350.00', successRate: '96%' },
        { id: 27, name: 'Dumpster Rental', category: 'permits', unit: 'EA', avgPrice: '450.00', successRate: '92%' },
        { id: 28, name: 'Code Upgrade Fee', category: 'permits', unit: 'EA', avgPrice: '1250.00', successRate: '74%' }
    ];

    // Search clients inline
    const searchClientsInline = (query) => {
        if (query.length < 2) {
            setShowSearchResults(false);
            return;
        }

        const filtered = sampleClients.filter(client =>
            client.name.toLowerCase().includes(query.toLowerCase()) ||
            client.id.toLowerCase().includes(query.toLowerCase())
        );

        setClientSearchResults(filtered);
        setShowSearchResults(true);
    };

    // Select client inline
    const selectClientInline = (id, name, address, policy) => {
        setSelectedClient({ id, name, address, policy });
        setShowSearchResults(false);
    };

    // Quick add item to supplement
    const quickAddItem = (description, unit, price) => {
        const newItem = {
            id: itemIdCounter,
            description,
            quantity: 1,
            unit,
            price: parseFloat(price),
            total: parseFloat(price)
        };

        setSupplementItems(prev => [...prev, newItem]);
        setItemIdCounter(prev => prev + 1);
        showNotification(`Added ${description} to supplement`);
    };

    // Add custom item
    const addCustomItem = () => {
        const newItem = {
            id: itemIdCounter,
            description: '',
            quantity: 1,
            unit: 'EA',
            price: 0,
            total: 0
        };

        setSupplementItems(prev => [...prev, newItem]);
        setItemIdCounter(prev => prev + 1);
    };

    // Remove item
    const removeItem = (itemId) => {
        setSupplementItems(prev => prev.filter(item => item.id !== itemId));
    };

    // Update item
    const updateItem = (itemId, field, value) => {
        setSupplementItems(prev => prev.map(item => {
            if (item.id === itemId) {
                const updatedItem = { ...item, [field]: value };
                if (field === 'quantity' || field === 'price') {
                    updatedItem.total = updatedItem.quantity * updatedItem.price;
                }
                return updatedItem;
            }
            return item;
        }));
    };

    // Calculate total
    const getTotalAmount = () => {
        return supplementItems.reduce((sum, item) => sum + item.total, 0);
    };

    // File upload handlers
    const handleMainDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add('dragover');
    };

    const handleMainDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('dragover');
    };

    const handleMainDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('dragover');

        const files = Array.from(e.dataTransfer.files);
        processMainFiles(files);
    };

    const handleMainFileSelect = (e) => {
        const files = Array.from(e.target.files);
        processMainFiles(files);
    };

    const processMainFiles = (files) => {
        const newFiles = files.filter(file =>
            !uploadedFiles.find(f => f.name === file.name)
        );
        setUploadedFiles(prev => [...prev, ...newFiles]);
    };

    const removeMainFile = (fileName) => {
        setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
    };

    // Clear form
    const clearForm = () => {
        setSelectedClient(null);
        setUploadedFiles([]);
        setSupplementItems([]);
        setSupplementType('');
        setAdditionalNotes('');
        showNotification('Form cleared');
    };

    // Save as draft
    const saveAsDraft = () => {
        showNotification('Supplement saved as draft');
    };

    // Generate supplement
    const generateSupplement = () => {
        if (!selectedClient) {
            alert('Please enter client information');
            return;
        }

        if (uploadedFiles.length === 0) {
            alert('Please upload at least one estimate file');
            return;
        }

        if (supplementItems.length === 0) {
            alert('Please add at least one supplement item');
            return;
        }

        showNotification('Generating supplement...');
        // In production, this would submit the form
    };

    // Show notification
    const showNotification = (message) => {
        // Implementation for showing notifications
        alert(message); // Simple alert for demo
    };

    // Filter supplements table
    const filterSupplements = (status) => {
        setActiveFilter(status);
    };

    // Filter categories
    const filterCategory = (category) => {
        setActiveCategory(category);
    };

    // Toggle FAQ
    const toggleFAQ = (element) => {
        element.parentElement.classList.toggle('expanded');
    };

    // Popup functions
    const openSupplementPopup = () => {
        setShowSupplementPopup(true);
    };

    const closeSupplementPopup = () => {
        setShowSupplementPopup(false);
    };

    const selectType = (element, type) => {
        setSupplementType(type);
        // Remove active class from all and add to clicked
        document.querySelectorAll('.type-option').forEach(opt => {
            opt.classList.remove('active');
        });
        element.classList.add('active');
    };

    // Filtered items based on category
    const filteredItems = supplementItemsData.filter(item =>
        activeCategory === 'all' || item.category === activeCategory
    );

    return (
        <div className="main-container">
            {/* Active Supplement Form Section */}
            <div className="active-supplement-form">
                <div className="form-header">
                    <h1 className="form-title">Create New Supplement</h1>
                    <div className="form-actions">
                        <button className="btn btn-outline" onClick={clearForm}>Clear Form</button>
                        <button className="btn btn-outline" onClick={saveAsDraft}>Save as Draft</button>
                    </div>
                </div>

                {/* Client Information Section */}
                <div className="client-info-section">
                    <h3 className="section-header">Client Information</h3>
                    <div className="client-info-grid">
                        <div className="info-field">
                            <label>Client Name</label>
                            <input
                                type="text"
                                id="clientName"
                                placeholder="Search or enter client name..."
                                value={selectedClient?.name || ''}
                                onChange={(e) => searchClientsInline(e.target.value)}
                            />
                            {showSearchResults && (
                                <div className="inline-search-results active">
                                    {clientSearchResults.map(client => (
                                        <div
                                            key={client.id}
                                            className="client-result"
                                            onClick={() => selectClientInline(client.id, client.name, client.address, client.policy)}
                                        >
                                            <div style={{fontWeight: 600, fontSize: '0.875rem'}}>{client.name}</div>
                                            <div style={{fontSize: '0.75rem', color: '#6b7280'}}>
                                                {client.id} • {client.address}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="info-field">
                            <label>Property Address</label>
                            <input
                                type="text"
                                id="propertyAddress"
                                placeholder="123 Main St, City, State"
                                value={selectedClient?.address || ''}
                                readOnly
                            />
                        </div>
                        <div className="info-field">
                            <label>Claim Number</label>
                            <input
                                type="text"
                                id="claimNumber"
                                placeholder="CLM-2024-XXXX"
                                value={selectedClient?.id || ''}
                                readOnly
                            />
                        </div>
                        <div className="info-field">
                            <label>Policy Number</label>
                            <input
                                type="text"
                                id="policyNumber"
                                placeholder="POL-XXXXXXXX"
                                value={selectedClient?.policy || ''}
                                readOnly
                            />
                        </div>
                        <div className="info-field">
                            <label>Insurance Company</label>
                            <select id="insuranceCompany">
                                <option value="">Select Insurance...</option>
                                <option value="statefarm">State Farm</option>
                                <option value="allstate">Allstate</option>
                                <option value="farmers">Farmers</option>
                                <option value="usaa">USAA</option>
                                <option value="liberty">Liberty Mutual</option>
                                <option value="nationwide">Nationwide</option>
                                <option value="progressive">Progressive</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div className="info-field">
                            <label>Adjuster Name</label>
                            <input type="text" id="adjusterName" placeholder="John Smith"/>
                        </div>
                        <div className="info-field">
                            <label>Adjuster Phone</label>
                            <input type="tel" id="adjusterPhone" placeholder="(555) 123-4567"/>
                        </div>
                        <div className="info-field">
                            <label>Date of Loss</label>
                            <input type="date" id="dateOfLoss"/>
                        </div>
                    </div>
                </div>

                {/* Upload Estimates Section */}
                <div className="upload-estimates-section">
                    <h3 className="section-header">Upload Insurance Estimates and/or Other Documents</h3>
                    <div
                        className="upload-box"
                        id="mainUploadArea"
                        onDrop={handleMainDrop}
                        onDragOver={handleMainDragOver}
                        onDragLeave={handleMainDragLeave}
                        onClick={() => document.getElementById('mainFileInput').click()}
                    >
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <p className="upload-text">Drag and drop estimate files and any other documents for this
                            supplement</p>
                        <p className="upload-hint">Supports: JPG, PNG, PDF, DOC, DOCX (Max 10MB per file)</p>
                        <input
                            type="file"
                            id="mainFileInput"
                            multiple
                            accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                            style={{display: 'none'}}
                            onChange={handleMainFileSelect}
                        />
                    </div>
                    <div className="uploaded-files-list" id="mainFileList">
                        {uploadedFiles.map((file, index) => (
                            <div key={index} className="uploaded-file">
                                <span>{file.name}</span>
                                <span className="remove-file-btn" onClick={() => removeMainFile(file.name)}>×</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Supplement Items Section */}
                <div className="supplement-items-form">
                    <h3 className="section-header">Supplement Line Items</h3>
                    <div className="items-table-container">
                        <table className="supplement-items-table">
                            <thead>
                            <tr>
                                <th>Item Description</th>
                                <th>Quantity</th>
                                <th>Unit</th>
                                <th>Unit Price</th>
                                <th>Total</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody id="supplementItemsBody">
                            {supplementItems.map(item => (
                                <tr key={item.id}>
                                    <td>
                                        <input
                                            type="text"
                                            value={item.description}
                                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                            placeholder="Enter item description"
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            min="1"
                                            onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value))}
                                        />
                                    </td>
                                    <td>
                                        <select
                                            value={item.unit}
                                            onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                                        >
                                            <option value="EA">EA</option>
                                            <option value="LF">LF</option>
                                            <option value="SF">SF</option>
                                            <option value="SQ">SQ</option>
                                            <option value="Bundle">Bundle</option>
                                            <option value="Roll">Roll</option>
                                        </select>
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            value={item.price}
                                            min="0"
                                            step="0.01"
                                            onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value))}
                                        />
                                    </td>
                                    <td style={{fontWeight: 600}}>${item.total.toFixed(2)}</td>
                                    <td>
                                        <div className="item-actions">
                        <span
                            className="action-icon delete"
                            onClick={() => removeItem(item.id)}
                            style={{color: '#dc2626', cursor: 'pointer'}}
                        >
                          ✕
                        </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                            <tfoot>
                            <tr className="total-row">
                                <td colSpan="4" style={{textAlign: 'right', fontWeight: 600}}>
                                    Total Supplement Amount:
                                </td>
                                <td style={{fontWeight: 700, fontSize: '1.125rem', color: '#16a34a'}}>
                                    ${getTotalAmount().toFixed(2)}
                                </td>
                                <td></td>
                            </tr>
                            </tfoot>
                        </table>
                        <button className="btn btn-outline" onClick={addCustomItem} style={{marginTop: '1rem'}}>
                            + Add Custom Line Item
                        </button>
                    </div>
                </div>

                {/* Supplement Details Section */}
                <div className="supplement-details-section">
                    <h3 className="section-header">Supplement Details & Instructions</h3>
                    <textarea
                        id="supplementDetails"
                        className="details-textarea"
                        placeholder="Describe what you're trying to accomplish with this supplement. Include any specific damage details, code requirements, or special circumstances that justify these additions..."
                        rows="6"
                        value={additionalNotes}
                        onChange={(e) => setAdditionalNotes(e.target.value)}
                    ></textarea>
                </div>

                {/* Generate Button */}
                <div className="generate-section">
                    <button className="btn btn-primary btn-large" onClick={generateSupplement}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             strokeWidth="2">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                        </svg>
                        Generate Supplement with AI
                    </button>
                </div>
            </div>

            {/* Key Metrics Row */}
            <div className="metrics-row">
                <div className="metric-card">
                    <div className="metric-label">Total Supplements Generated</div>
                    <div className="metric-value">847</div>
                    <span className="metric-change positive">↑ 18.5% from last month</span>
                </div>
                <div className="metric-card">
                    <div className="metric-label">Average Supplement Value</div>
                    <div className="metric-value">$12,847</div>
                    <span className="metric-change positive">↑ 12.3% above industry avg</span>
                </div>
                <div className="metric-card">
                    <div className="metric-label">Success Rate</div>
                    <div className="metric-value">87.3%</div>
                    <span className="metric-change positive">↑ 4.2% improvement</span>
                </div>
                <div className="metric-card">
                    <div className="metric-label">Revenue Recovered</div>
                    <div className="metric-value">$1.2M</div>
                    <span className="metric-change positive">↑ YTD tracking</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="content-area">
                {/* Left Column */}
                <div className="left-column">
                    {/* Active Supplements Table */}
                        <SupplementsTable/>
                    {/* Common Supplement Items */}
                    <div className="supplement-items-section">
                        <h2 className="section-title">Top Supplemented Line Items</h2>

                        {/* Category Filter Tabs */}
                        <div className="category-tabs flex gap-5 mb-[1rem] flex-wrap">
                            <button
                                className={`filter-btn ${activeCategory === 'all' ? 'active' : ''}`}
                                onClick={() => filterCategory('all')}
                            >
                                All Items
                            </button>
                            <button
                                className={`filter-btn ${activeCategory === 'roofing' ? 'active' : ''}`}
                                onClick={() => filterCategory('roofing')}
                            >
                                Roofing
                            </button>
                            <button
                                className={`filter-btn ${activeCategory === 'gutters' ? 'active' : ''}`}
                                onClick={() => filterCategory('gutters')}
                            >
                                Gutters
                            </button>
                            <button
                                className={`filter-btn ${activeCategory === 'siding' ? 'active' : ''}`}
                                onClick={() => filterCategory('siding')}
                            >
                                Siding
                            </button>
                            <button
                                className={`filter-btn ${activeCategory === 'ventilation' ? 'active' : ''}`}
                                onClick={() => filterCategory('ventilation')}
                            >
                                Ventilation
                            </button>
                            <button
                                className={`filter-btn ${activeCategory === 'interior' ? 'active' : ''}`}
                                onClick={() => filterCategory('interior')}
                            >
                                Interior
                            </button>
                            <button
                                className={`filter-btn ${activeCategory === 'electrical' ? 'active' : ''}`}
                                onClick={() => filterCategory('electrical')}
                            >
                                Electrical
                            </button>
                            <button
                                className={`filter-btn ${activeCategory === 'permits' ? 'active' : ''}`}
                                onClick={() => filterCategory('permits')}
                            >
                                Permits/Fees
                            </button>
                        </div>

                        <div className="items-grid" id="itemsGrid">
                            {filteredItems.map(item => (
                                <div key={item.id} className="item-card" data-category={item.category}>
                                    <div className="item-name">{item.name}</div>
                                    <div className="item-stat">
                                        <span>Unit:</span>
                                        <span>{item.unit}</span>
                                    </div>
                                    <div className="item-stat">
                                        <span>Avg Price:</span>
                                        <span>${item.avgPrice}/{item.unit}</span>
                                    </div>
                                    <div className="item-stat">
                                        <span>Success Rate:</span>
                                        <span>{item.successRate}</span>
                                    </div>
                                    <div className="item-card-actions">
                                        <button
                                            className="quick-add-btn"
                                            onClick={() => quickAddItem(item.name, item.unit, item.avgPrice)}
                                        >
                                            Quick Add
                                        </button>
                                        <button className="edit-btn">
                                            Edit Price
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="right-column">
                    {/* AI Assistant */}
                    <div className="ai-assistant-section">
                        <h2 className="section-title">Ask AI About Supplements</h2>
                        <div className="chat-placeholder">
                            <p style={{color: '#9ca3af', textAlign: 'center', padding: '2rem'}}>
                                AI chat interface coming soon...
                            </p>
                        </div>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Ask about building codes, missing items, or supplement strategies..."
                            style={{width: '100%', marginBottom: '1rem'}}
                        />
                        <div className="starter-questions">
                            <div className="starter-question">What items are commonly missed for hail damage?</div>
                            <div className="starter-question">How do I justify code upgrades?</div>
                            <div className="starter-question">What's the current labor rate in my area?</div>
                        </div>
                    </div>

                    {/* FAQ Accordion */}
                    <div className="faq-section">
                        <h2 className="section-title">Supplement FAQ</h2>
                        <div className="faq-item">
                            <div className="faq-question" onClick={(e) => toggleFAQ(e.currentTarget)}>
                                How to identify missing line items
                                <span className="faq-toggle">▼</span>
                            </div>
                            <div className="faq-answer">
                                Compare the insurance estimate against your detailed inspection. Look for commonly
                                missed items like drip edge, ridge cap, starter strips, and code upgrades. Check if all
                                damaged components are included and verify quantities match your measurements.
                            </div>
                        </div>
                        <div className="faq-item">
                            <div className="faq-question" onClick={(e) => toggleFAQ(e.currentTarget)}>
                                Building code requirements by state
                                <span className="faq-toggle">▼</span>
                            </div>
                            <div className="faq-answer">
                                Each state has different building codes. Common requirements include ice & water shield
                                in certain areas, specific nailing patterns for high-wind zones, and updated ventilation
                                standards. Always check local codes and document requirements for supplements.
                            </div>
                        </div>
                        <div className="faq-item">
                            <div className="faq-question" onClick={(e) => toggleFAQ(e.currentTarget)}>
                                Dealing with adjuster pushback
                                <span className="faq-toggle">▼</span>
                            </div>
                            <div className="faq-answer">
                                Document everything with photos and detailed notes. Reference specific policy language
                                and building codes. Provide manufacturer specifications and local pricing documentation.
                                Be professional but persistent, and consider involving a public adjuster if needed.
                            </div>
                        </div>
                        <div className="faq-item">
                            <div className="faq-question" onClick={(e) => toggleFAQ(e.currentTarget)}>
                                Documentation best practices
                                <span className="faq-toggle">▼</span>
                            </div>
                            <div className="faq-answer">
                                Take clear, dated photos of all damage. Create detailed diagrams with measurements. Keep
                                all correspondence with insurance companies. Document weather events and maintain
                                organized files for each claim.
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="activity-feed-section">
                        <h2 className="section-title">Recent Activity</h2>
                        <div className="activity-item">
                            <div className="activity-icon success">✓</div>
                            <div className="activity-content">
                                <div className="activity-text">Supplement approved - Johnson Residence (+$8,234)</div>
                                <div className="activity-time">2 hours ago</div>
                            </div>
                        </div>
                        <div className="activity-item">
                            <div className="activity-icon warning">!</div>
                            <div className="activity-content">
                                <div className="activity-text">New code requirement added to database</div>
                                <div className="activity-time">5 hours ago</div>
                            </div>
                        </div>
                        <div className="activity-item">
                            <div className="activity-icon success">✓</div>
                            <div className="activity-content">
                                <div className="activity-text">Adjuster response received - Smith Property</div>
                                <div className="activity-time">1 day ago</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <AnalyticsCharts/>

            {/* Footer Actions */}
            <div className="footer-actions">
                <button className="btn btn-outline">Download Supplement Templates</button>
                <button className="btn btn-outline">View Training Videos</button>
                <button className="btn btn-outline">Schedule Adjuster Call</button>
                <button className="btn btn-outline">Export Monthly Report</button>
            </div>

            {/* New Supplement Popup */}
            {showSupplementPopup && (
                <div className="popup-overlay" id="supplementPopup" onClick={closeSupplementPopup}>
                    <div className="supplement-popup" onClick={(e) => e.stopPropagation()}>
                        <div className="popup-header">
                            <h2 className="popup-title">Generate New Supplement</h2>
                            <button className="close-popup" onClick={closeSupplementPopup}>×</button>
                        </div>

                        {/* Step 1: Client Search */}
                        <div className="client-search-section">
                            <label className="search-label">Step 1: Search and Select Client</label>
                            <div style={{position: 'relative'}}>
                                <input
                                    type="text"
                                    className="client-search-input"
                                    id="clientSearchInput"
                                    placeholder="Type client name or claim number..."
                                    onChange={(e) => searchClientsInline(e.target.value)}
                                />
                                {showSearchResults && (
                                    <div className="search-results-dropdown active">
                                        {clientSearchResults.map(client => (
                                            <div
                                                key={client.id}
                                                className="client-result"
                                                onClick={() => selectClientInline(client.id, client.name, client.address, client.policy)}
                                            >
                                                <div style={{fontWeight: 600, fontSize: '0.875rem'}}>{client.name}</div>
                                                <div style={{fontSize: '0.75rem', color: '#6b7280'}}>
                                                    {client.id} • {client.address}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {selectedClient && (
                                <div id="selectedClientInfo" style={{
                                    marginTop: '1rem',
                                    padding: '1rem',
                                    background: '#f9fafb',
                                    borderRadius: '6px'
                                }}>
                                    <strong>Selected Client:</strong> <span
                                    id="selectedClientName">{selectedClient.name}</span><br/>
                                    <small style={{color: '#6b7280'}}>Claim #: <span
                                        id="selectedClaimNumber">{selectedClient.id}</span></small>
                                </div>
                            )}
                        </div>

                        {/* Step 2: Upload Estimates */}
                        <div className="upload-section">
                            <label className="search-label">Step 2: Upload Insurance Estimates (Photos/PDFs)</label>
                            <div
                                className="upload-area"
                                id="uploadArea"
                                onDrop={handleMainDrop}
                                onDragOver={handleMainDragOver}
                                onDragLeave={handleMainDragLeave}
                                onClick={() => document.getElementById('fileInput').click()}
                            >
                                <div className="upload-icon">📁</div>
                                <div className="upload-text">Drag and drop files here or click to browse</div>
                                <div className="upload-hint">Supports: JPG, PNG, PDF (Max 10MB per file)</div>
                                <input
                                    type="file"
                                    id="fileInput"
                                    multiple
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    style={{display: 'none'}}
                                    onChange={handleMainFileSelect}
                                />
                            </div>
                            <div className="file-list" id="fileList">
                                {uploadedFiles.map((file, index) => (
                                    <div key={index} className="uploaded-file">
                                        <span>{file.name}</span>
                                        <span className="remove-file-btn"
                                              onClick={() => removeMainFile(file.name)}>×</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Step 3: Supplement Type */}
                        <div className="supplement-type-section">
                            <label className="search-label">Step 3: Select Supplement Type</label>
                            <div className="type-options">
                                <div
                                    className={`type-option ${supplementType === 'materials' ? 'active' : ''}`}
                                    onClick={(e) => selectType(e.currentTarget, 'materials')}
                                >
                                    <div className="type-option-title">Missing Materials</div>
                                    <div className="type-option-desc">Identify overlooked materials and components</div>
                                </div>
                                <div
                                    className={`type-option ${supplementType === 'code' ? 'active' : ''}`}
                                    onClick={(e) => selectType(e.currentTarget, 'code')}
                                >
                                    <div className="type-option-title">Code Upgrades</div>
                                    <div className="type-option-desc">Required building code compliance items</div>
                                </div>
                                <div
                                    className={`type-option ${supplementType === 'labor' ? 'active' : ''}`}
                                    onClick={(e) => selectType(e.currentTarget, 'labor')}
                                >
                                    <div className="type-option-title">Labor Adjustments</div>
                                    <div className="type-option-desc">Correct labor rates and complexity factors</div>
                                </div>
                                <div
                                    className={`type-option ${supplementType === 'complete' ? 'active' : ''}`}
                                    onClick={(e) => selectType(e.currentTarget, 'complete')}
                                >
                                    <div className="type-option-title">Complete Review</div>
                                    <div className="type-option-desc">Comprehensive analysis of all items</div>
                                </div>
                            </div>
                        </div>

                        {/* Step 4: Additional Notes */}
                        <div className="notes-section">
                            <label className="search-label">Step 4: Additional Notes (Optional)</label>
                            <textarea
                                className="notes-textarea"
                                placeholder="Add any special instructions or notes about this supplement..."
                                value={additionalNotes}
                                onChange={(e) => setAdditionalNotes(e.target.value)}
                            ></textarea>
                        </div>

                        {/* Popup Actions */}
                        <div className="popup-actions">
                            <button className="btn btn-outline" onClick={closeSupplementPopup}>Cancel</button>
                            <button className="btn btn-primary" onClick={generateSupplement}>
                                Generate Supplement
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const AnalyticsCharts = () => {
    const successChartRef = useRef(null);
    const denialChartRef = useRef(null);
    const revenueChartRef = useRef(null);

    const successChartInstance = useRef(null);
    const denialChartInstance = useRef(null);
    const revenueChartInstance = useRef(null);

    useEffect(() => {
        // Success Trends Chart
        if (successChartRef.current) {
            // Destroy existing chart
            if (successChartInstance.current) {
                successChartInstance.current.destroy();
            }

            const successCtx = successChartRef.current.getContext('2d');
            successChartInstance.current = new Chart(successCtx, {
                type: 'line',
                data: {
                    labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
                    datasets: [{
                        label: 'Success Rate',
                        data: [82, 84, 83, 86, 88, 87],
                        borderColor: '#FDB813',
                        backgroundColor: 'rgba(253, 184, 19, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            min: 80,
                            max: 90,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            }
                        }
                    }
                }
            });
        }

        // Denial Reasons Chart
        if (denialChartRef.current) {
            // Destroy existing chart
            if (denialChartInstance.current) {
                denialChartInstance.current.destroy();
            }

            const denialCtx = denialChartRef.current.getContext('2d');
            denialChartInstance.current = new Chart(denialCtx, {
                type: 'bar',
                data: {
                    labels: ['Documentation', 'Policy Exclusion', 'Pricing', 'Duplicate', 'Other'],
                    datasets: [{
                        data: [25, 20, 15, 10, 5],
                        backgroundColor: '#1a1f3a',
                        borderColor: '#1a1f3a',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            }
                        },
                        y: {
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            }
                        }
                    }
                }
            });
        }

        // Revenue Impact Chart
        if (revenueChartRef.current) {
            // Destroy existing chart
            if (revenueChartInstance.current) {
                revenueChartInstance.current.destroy();
            }

            const revenueCtx = revenueChartRef.current.getContext('2d');
            revenueChartInstance.current = new Chart(revenueCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Materials', 'Labor', 'Code Upgrades', 'Permits', 'Other'],
                    datasets: [{
                        data: [35, 25, 20, 10, 10],
                        backgroundColor: [
                            '#FDB813',
                            '#ffc947',
                            '#1a1f3a',
                            '#374151',
                            '#6b7280'
                        ],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        }
                    },
                    cutout: '60%'
                }
            });
        }

        // Cleanup function
        return () => {
            if (successChartInstance.current) {
                successChartInstance.current.destroy();
            }
            if (denialChartInstance.current) {
                denialChartInstance.current.destroy();
            }
            if (revenueChartInstance.current) {
                revenueChartInstance.current.destroy();
            }
        };
    }, []);

    return (
        <div className="analytics-section">
            <div className="chart-card">
                <h3 className="chart-title">Supplement Success Trends</h3>
                <div className="chart-container">
                    <canvas
                        ref={successChartRef}
                        id="successChart"
                    />
                </div>
            </div>
            <div className="chart-card">
                <h3 className="chart-title">Top Denial Reasons</h3>
                <div className="chart-container">
                    <canvas
                        ref={denialChartRef}
                        id="denialChart"
                    />
                </div>
            </div>
            <div className="chart-card">
                <h3 className="chart-title">Revenue Impact</h3>
                <div className="chart-container">
                    <canvas
                        ref={revenueChartRef}
                        id="revenueChart"
                    />
                </div>
            </div>
        </div>
    );
};

const SupplementsTable = () => {
    const [activeFilter, setActiveFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [supplements] = useState([
        {
            id: 'CLM-2024-892',
            client: 'Johnson Property',
            originalEst: 47823,
            supplement: 8234,
            increase: '17.2%',
            status: 'approved',
            created: 'Oct 14, 2024'
        },
        {
            id: 'CLM-2024-891',
            client: 'Smith Residence',
            originalEst: 31450,
            supplement: 5670,
            increase: '18.0%',
            status: 'pending',
            created: 'Oct 13, 2024'
        },
        {
            id: 'CLM-2024-890',
            client: 'Davis Complex',
            originalEst: 128900,
            supplement: 23450,
            increase: '18.2%',
            status: 'review',
            created: 'Oct 12, 2024'
        },
        {
            id: 'CLM-2024-889',
            client: 'Wilson Estate',
            originalEst: 92340,
            supplement: 15200,
            increase: '16.5%',
            status: 'denied',
            created: 'Oct 11, 2024'
        },
        {
            id: 'CLM-2024-888',
            client: 'Martinez Home',
            originalEst: 56789,
            supplement: 9123,
            increase: '16.1%',
            status: 'pending',
            created: 'Oct 10, 2024'
        },
        {
            id: 'CLM-2024-887',
            client: 'Thompson Warehouse',
            originalEst: 195000,
            supplement: 32500,
            increase: '16.7%',
            status: 'approved',
            created: 'Oct 9, 2024'
        },
        {
            id: 'CLM-2024-886',
            client: 'Anderson Property',
            originalEst: 44560,
            supplement: 7890,
            increase: '17.7%',
            status: 'review',
            created: 'Oct 8, 2024'
        },
        {
            id: 'CLM-2024-885',
            client: 'Lee Manufacturing',
            originalEst: 225000,
            supplement: 42300,
            increase: '18.8%',
            status: 'pending',
            created: 'Oct 7, 2024'
        },
        {
            id: 'CLM-2024-884',
            client: 'Taylor Residence',
            originalEst: 52300,
            supplement: 8450,
            increase: '16.2%',
            status: 'approved',
            created: 'Oct 6, 2024'
        },
        {
            id: 'CLM-2024-883',
            client: 'Brown Office Park',
            originalEst: 187000,
            supplement: 28900,
            increase: '15.5%',
            status: 'denied',
            created: 'Oct 5, 2024'
        }
    ]);

    const filterSupplements = (status) => {
        setActiveFilter(status);
    };

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    // Filter and search supplements
    const filteredSupplements = useMemo(() => {
        return supplements.filter(supplement => {
            // Status filter
            const statusMatch = activeFilter === 'all' ||
                (activeFilter === 'review' ? supplement.status === 'review' : supplement.status === activeFilter);

            // Search filter
            const searchMatch = !searchQuery ||
                supplement.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                supplement.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
                supplement.status.toLowerCase().includes(searchQuery.toLowerCase());

            return statusMatch && searchMatch;
        });
    }, [supplements, activeFilter, searchQuery]);

    // Get status badge class and text
    const getStatusBadge = (status) => {
        const statusConfig = {
            approved: { class: 'status-approved', text: 'Approved' },
            pending: { class: 'status-pending', text: 'Pending' },
            review: { class: 'status-review', text: 'In Review' },
            denied: { class: 'status-denied', text: 'Denied' }
        };
        return statusConfig[status] || { class: '', text: status };
    };

    // Get action buttons based on status
    const getActionButtons = (status, id) => {
        if (status === 'denied') {
            return (
                <>
                    <button className="action-btn">View</button>
                    <button className="action-btn">Resubmit</button>
                    <button className="action-btn">Download</button>
                </>
            );
        }
        return (
            <>
                <button className="action-btn">View</button>
                <button className="action-btn">Edit</button>
                <button className="action-btn">Download</button>
            </>
        );
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Clear search
    const clearSearch = () => {
        setSearchQuery('');
    };

    return (
        <div className="table-section">
            <div className="table-header">
                <h2 className="table-title">
                    Active Supplements{activeFilter !== 'all' && ` (${activeFilter === 'review' ? 'In Review' : activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)})`} - {filteredSupplements.length} items
                </h2>
                <div className="search-bar">
                    <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search by claim #, client, or status..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                    />
                    {searchQuery && (
                        <button
                            className="clear-search-btn"
                            onClick={clearSearch}
                            title="Clear search"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <div className="filter-buttons">
                <button
                    className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => filterSupplements('all')}
                >
                    All
                </button>
                <button
                    className={`filter-btn ${activeFilter === 'pending' ? 'active' : ''}`}
                    onClick={() => filterSupplements('pending')}
                >
                    Pending
                </button>
                <button
                    className={`filter-btn ${activeFilter === 'approved' ? 'active' : ''}`}
                    onClick={() => filterSupplements('approved')}
                >
                    Approved
                </button>
                <button
                    className={`filter-btn ${activeFilter === 'denied' ? 'active' : ''}`}
                    onClick={() => filterSupplements('denied')}
                >
                    Denied
                </button>
                <button
                    className={`filter-btn ${activeFilter === 'review' ? 'active' : ''}`}
                    onClick={() => filterSupplements('review')}
                >
                    In Review
                </button>
            </div>

            {filteredSupplements.length === 0 ? (
                <div className="no-results">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <h3>No supplements found</h3>
                    <p>Try adjusting your search or filter criteria</p>
                    {(searchQuery || activeFilter !== 'all') && (
                        <button
                            className="btn btn-outline"
                            onClick={() => {
                                setSearchQuery('');
                                setActiveFilter('all');
                            }}
                        >
                            Clear all filters
                        </button>
                    )}
                </div>
            ) : (
                <table className="supplements-table">
                    <thead>
                    <tr>
                        <th>Claim #</th>
                        <th>Client Name</th>
                        <th>Original Est.</th>
                        <th>Supplement</th>
                        <th>Increase</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredSupplements.map((supplement) => {
                        const statusBadge = getStatusBadge(supplement.status);
                        return (
                            <tr key={supplement.id}>
                                <td>#{supplement.id}</td>
                                <td><strong>{supplement.client}</strong></td>
                                <td>{formatCurrency(supplement.originalEst)}</td>
                                <td>{formatCurrency(supplement.supplement)}</td>
                                <td>{supplement.increase}</td>
                                <td>
                                    <span className={`status-badge ${statusBadge.class}`}>
                                        {statusBadge.text}
                                    </span>
                                </td>
                                <td>{supplement.created}</td>
                                <td>
                                    <div className="table-actions">
                                        {getActionButtons(supplement.status, supplement.id)}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            )}
        </div>
    );
};


export default SupplementsManagement;