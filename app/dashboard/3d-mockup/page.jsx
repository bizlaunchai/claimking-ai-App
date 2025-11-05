'use client'
import React, { useState, useRef, useEffect } from 'react';
import "./3d-mockup.css"

const MockupStudio = () => {
    const [clientTab, setClientTab] = useState('existing');
    const [selectedClient, setSelectedClient] = useState(null);
    const [materialTab, setMaterialTab] = useState('roofing');
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [showGallery, setShowGallery] = useState(false);
    const [showRecent, setShowRecent] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);
    const [showSharing, setShowSharing] = useState(false);
    const [selectedQuality, setSelectedQuality] = useState('standard');
    const [selectedShingleType, setSelectedShingleType] = useState('Architectural');
    const [selectedColors, setSelectedColors] = useState({
        roofing: null,
        siding: null,
        trim: null,
        windows: null
    });
    
    const fileInputRef = useRef(null);

    // Client selection handlers
    const switchClientTab = (tab) => {
        setClientTab(tab);
    };

    const handleClientSelect = (clientName) => {
        setSelectedClient({
            name: clientName,
            address: '123 Main St, Dallas, TX 75201'
        });
    };

    const createClient = () => {
        setSelectedClient({
            name: 'New Client',
            address: 'New Address'
        });
    };

    const changeClient = () => {
        setSelectedClient(null);
    };

    // Material tab switching
    const switchMaterialTab = (tab) => {
        setMaterialTab(tab);
    };

    // Photo upload handlers
    const handlePhotoUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setSelectedPhoto(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setSelectedPhoto(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    // Selection handlers
    const selectShingleType = (type) => {
        setSelectedShingleType(type);
    };

    const selectColor = (colorName, category) => {
        setSelectedColors(prev => ({
            ...prev,
            [category]: colorName
        }));
    };

    const selectQuality = (quality) => {
        setSelectedQuality(quality);
    };

    const addPrompt = (text) => {
        const textarea = document.querySelector('.instruction-textarea');
        if (textarea) {
            textarea.value += (textarea.value ? ' ' : '') + text;
        }
    };

    // Generation handlers
    const generateMockup = () => {
        alert('Generating mockup with AI... This would process the image with your selections.');
    };

    const confirmMockup = () => {
        setShowSharing(true);
        setTimeout(() => {
            document.getElementById('sharingSection')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const refineMore = () => {
        alert('Refining mockup further...');
    };

    const startOver = () => {
        if (confirm('Are you sure you want to start over?')) {
            setSelectedClient(null);
            setSelectedPhoto(null);
            setShowSharing(false);
            setMaterialTab('roofing');
            setSelectedColors({
                roofing: null,
                siding: null,
                trim: null,
                windows: null
            });
        }
    };

    const saveTemplate = () => {
        alert('Saving current configuration as template...');
    };

    // Sharing handlers
    const shareViaSMS = () => {
        alert('Opening SMS sharing dialog...');
    };

    const shareViaEmail = () => {
        alert('Opening email composer with mockup...');
    };

    // Modal handlers
    const closeModal = (modalType) => {
        switch(modalType) {
            case 'gallery':
                setShowGallery(false);
                break;
            case 'recent':
                setShowRecent(false);
                break;
            case 'templates':
                setShowTemplates(false);
                break;
            case 'tutorial':
                setShowTutorial(false);
                break;
        }
        document.body.style.overflow = '';
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                const modalId = e.target.id;
                if (modalId === 'galleryModal') setShowGallery(false);
                if (modalId === 'recentModal') setShowRecent(false);
                if (modalId === 'templatesModal') setShowTemplates(false);
                if (modalId === 'tutorialModal') setShowTutorial(false);
                document.body.style.overflow = '';
            }
        };
        
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const shingleTypes = ['Architectural', '3-Tab', 'Designer', 'Wood Shakes', 'Slate', 'Metal', 'Clay Tile', 'Concrete Tile'];
    
    const roofingColors = [
        { brand: 'GAF Timberline HDZ', colors: [
            { name: 'Charcoal', value: '#2d2d2d' },
            { name: 'Weathered Wood', value: '#8b7355' },
            { name: 'Hickory', value: '#6b5d4f' },
            { name: 'Slate', value: '#5a5a5a' },
            { name: 'Mission Brown', value: '#7d6144' },
            { name: 'Hunter Green', value: '#2f4538' },
            { name: 'Shakewood', value: '#8b6f47' },
            { name: 'Biscayne Blue', value: '#a0826d' },
            { name: 'Birchwood', value: '#c8b88b' },
            { name: 'Copper Canyon', value: '#8a7a65' }
        ]},
        { brand: 'Owens Corning Duration', colors: [
            { name: 'Onyx Black', value: '#1a1a1a' },
            { name: 'Estate Gray', value: '#6b6b6b' },
            { name: 'Brownwood', value: '#8b4513' },
            { name: 'Teak', value: '#d2691e' },
            { name: 'Chateau Green', value: '#556b2f' },
            { name: 'Harbor Blue', value: '#4682b4' },
            { name: 'Aged Copper', value: '#b87333' },
            { name: 'Terra Cotta', value: '#a0522d' },
            { name: 'Sand Dune', value: '#bc8f8f' }
        ]}
    ];

    const sidingColors = [
        { name: 'Arctic White', value: '#ffffff' },
        { name: 'Cream', value: '#f5f5f0' },
        { name: 'Sterling Gray', value: '#9ca3af' },
        { name: 'Iron Gray', value: '#4b5563' },
        { name: 'Cape Cod Blue', value: '#5b8fa3' },
        { name: 'Sandstone', value: '#d4a574' }
    ];

    return (
        <div className="mockup-container">
            {/* Header Section */}
            <div className="mockup-3d-header-section">
                <div className="mockup-3d-header-content">
                    <div className="mockup-3d-header-left">
                        <div className="mockup-3d-page-title">
                            <div className="mockup-3d-crown-logo">
                                <svg viewBox="0 0 24 24" fill="#1a1f3a" width="24" height="24">
                                    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2.86-2h8.28l.5-2.02l-2.87-1.73L12 13l-1.77-2.75l-2.87 1.73L7.86 14z"/>
                                </svg>
                            </div>
                            <div className="title-text">
                                <span className="title-line1">3D Mockup</span>
                                <span className="title-line2">Studio</span>
                            </div>
                        </div>
                        <p className="mockup-3d-page-subtitle">AI-powered exterior visualization tool</p>
                        <div className="mockup-3d-status-badges">
                            <div className="mockup-3d-status-badge active">AI Ready</div>
                            <div className="mockup-3d-status-badge active">HD Rendering</div>
                            <div className="mockup-3d-status-badge active">Photorealistic Mode</div>
                        </div>
                    </div>
                    <div className="mockup-3d-header-actions">
                        <button className="btn btn-outline" onClick={() => setShowGallery(true)}>View Mockup Gallery</button>
                        <button className="btn btn-outline" onClick={() => setShowRecent(true)}>Recent Projects</button>
                        <button className="btn btn-outline" onClick={() => setShowTemplates(true)}>Mockup Templates</button>
                        <button className="btn btn-outline" onClick={() => setShowTutorial(true)}>Tutorial</button>
                    </div>
                </div>
            </div>

            {/* Main Container */}
            <div className="main-container">
                {/* Client Selection Card */}
                <div className="client-selection-card">
                    <div className="tabs">
                        <button 
                            className={`tab-btn ${clientTab === 'existing' ? 'active' : ''}`} 
                            onClick={() => switchClientTab('existing')}
                        >
                            Existing Client
                        </button>
                        <button 
                            className={`tab-btn ${clientTab === 'new' ? 'active' : ''}`} 
                            onClick={() => switchClientTab('new')}
                        >
                            New Client
                        </button>
                    </div>
                    
                    {/* Existing Client Tab */}
                    {clientTab === 'existing' && (
                        <div className="tab-content active">
                            <input 
                                type="text" 
                                className="search-input" 
                                placeholder="Type client name, address, or phone..."
                            />
                            
                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                <div className="client-option" onClick={() => handleClientSelect('Johnson Property')}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f9fafb', borderRadius: '6px', cursor: 'pointer' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, color: '#1f2937' }}>Johnson Property</div>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>123 Main St, Dallas, TX • 12 mockups on file</div>
                                        </div>
                                        <button className="btn btn-outline" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}>Select Client</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* New Client Tab */}
                    {clientTab === 'new' && (
                        <div className="tab-content active">
                            <form className="form-grid">
                                <div className="form-group">
                                    <label className="form-label required">Full Name</label>
                                    <input type="text" className="form-input" placeholder="John Smith" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">Email</label>
                                    <input type="email" className="form-input" placeholder="john@example.com" />
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label required">Property Address</label>
                                    <input type="text" className="form-input" placeholder="123 Main Street, Dallas, TX 75201" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">Phone</label>
                                    <input type="tel" className="form-input" placeholder="(555) 123-4567" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Preferred Contact</label>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                        <label style={{ fontSize: '0.875rem' }}>
                                            <input type="radio" name="contact" value="sms" /> SMS
                                        </label>
                                        <label style={{ fontSize: '0.875rem' }}>
                                            <input type="radio" name="contact" value="email" /> Email
                                        </label>
                                        <label style={{ fontSize: '0.875rem' }}>
                                            <input type="radio" name="contact" value="both" defaultChecked /> Both
                                        </label>
                                    </div>
                                </div>
                                <div className="form-group full-width">
                                    <button type="button" className="btn btn-primary" onClick={createClient}>Create & Continue</button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                {/* Selected Client Bar */}
                {selectedClient && (
                    <div className="selected-client-bar active">
                        <div className="client-info">
                            <span className="client-name">{selectedClient.name}</span>
                            <span className="client-address">{selectedClient.address}</span>
                            <a href="#" className="client-action-link" onClick={(e) => { e.preventDefault(); changeClient(); }}>Change</a>
                        </div>
                        <div className="client-actions">
                            <a href="#" className="client-action-link" onClick={(e) => e.preventDefault()}>View Previous Mockups</a>
                            <a href="#" className="client-action-link" onClick={(e) => e.preventDefault()}>Client Preferences</a>
                        </div>
                    </div>
                )}

                {/* Three Panel Mockup Interface */}
                <div className="mockup-interface">
                    {/* Left Panel - Photo Upload & Management */}
                    <div className="panel-card">
                        <h3 className="panel-header">Photo Upload & Management</h3>
                        
                        <div 
                            className={`upload-zone ${selectedPhoto ? 'has-photo' : ''}`}
                            onClick={() => fileInputRef.current?.click()}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                        >
                            <div className="upload-icon"></div>
                            <p className="upload-text">Upload Property Photo</p>
                            <p className="upload-subtext">JPG, PNG, HEIF • Max 50MB</p>
                            <p className="upload-subtext" style={{ marginTop: '0.5rem' }}>High resolution, well-lit, minimal shadows</p>
                            <input 
                                ref={fileInputRef}
                                type="file" 
                                style={{ display: 'none' }} 
                                accept="image/*"
                                onChange={handlePhotoUpload}
                            />
                        </div>
                        
                        <div className="upload-buttons">
                            <button className="upload-btn">Take Photo</button>
                            <button className="upload-btn">Choose from Gallery</button>
                        </div>

                        {/* Photo Display */}
                        {selectedPhoto && (
                            <div className="photo-display active">
                                <div className="photo-preview">
                                    <img src={selectedPhoto} alt="Property preview" />
                                </div>
                                <div className="photo-info">
                                    <div>Filename: house_front.jpg</div>
                                    <div>Dimensions: 4032 x 3024</div>
                                    <div>Size: 8.2 MB</div>
                                </div>
                                <div className="photo-actions">
                                    <button className="photo-action-btn" onClick={() => fileInputRef.current?.click()}>Replace Photo</button>
                                    <button className="photo-action-btn">Enhance Quality</button>
                                </div>
                            </div>
                        )}

                        {/* Photo Analysis Results */}
                        <div className="analysis-box">
                            <div className="analysis-title">Detected Elements:</div>
                            <div className="analysis-items">
                                <div className="analysis-item">✓ Asphalt shingle roof (gray)</div>
                                <div className="analysis-item">✓ Vinyl siding (beige)</div>
                                <div className="analysis-item">✓ Brick accent (red)</div>
                                <div className="analysis-item">✓ 2 garage doors (white)</div>
                                <div className="analysis-item">✓ 6 windows visible</div>
                                <div className="analysis-item">✓ Front door (brown)</div>
                                <div className="analysis-item">✓ Gutters (white)</div>
                                <div className="analysis-item">✓ 2 stories</div>
                            </div>
                        </div>
                    </div>

                    {/* Middle Panel - Customization Controls */}
                    <div className="panel-card">
                        <h3 className="panel-header">Material & Color Customization</h3>
                        
                        <div className="material-tabs">
                            <button 
                                className={`material-tab ${materialTab === 'roofing' ? 'active' : ''}`} 
                                onClick={() => switchMaterialTab('roofing')}
                            >
                                Roofing
                            </button>
                            <button 
                                className={`material-tab ${materialTab === 'siding' ? 'active' : ''}`} 
                                onClick={() => switchMaterialTab('siding')}
                            >
                                Siding
                            </button>
                            <button 
                                className={`material-tab ${materialTab === 'trim' ? 'active' : ''}`} 
                                onClick={() => switchMaterialTab('trim')}
                            >
                                Trim & Accents
                            </button>
                            <button 
                                className={`material-tab ${materialTab === 'windows' ? 'active' : ''}`} 
                                onClick={() => switchMaterialTab('windows')}
                            >
                                Windows & Doors
                            </button>
                            <button 
                                className={`material-tab ${materialTab === 'additional' ? 'active' : ''}`} 
                                onClick={() => switchMaterialTab('additional')}
                            >
                                Additional
                            </button>
                        </div>

                        {/* Roofing Tab */}
                        {materialTab === 'roofing' && (
                            <div className="material-content active">
                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>Shingle Type</div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                        {shingleTypes.map(type => (
                                            <button 
                                                key={type}
                                                className={`shingle-type-btn ${selectedShingleType === type ? 'selected' : ''}`} 
                                                onClick={() => selectShingleType(type)}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {roofingColors.map(brand => (
                                    <div key={brand.brand} className="color-section">
                                        <div className="color-brand">{brand.brand}</div>
                                        <div className="color-grid">
                                            {brand.colors.map(color => (
                                                <div 
                                                    key={color.name}
                                                    className={`color-swatch ${selectedColors.roofing === color.name ? 'selected' : ''}`} 
                                                    onClick={() => selectColor(color.name, 'roofing')}
                                                >
                                                    <div className="swatch-color" style={{ background: color.value }}></div>
                                                    <div className="swatch-name">{color.name}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                <div className="advanced-section">
                                    <div className="advanced-title">Advanced Options</div>
                                    <div className="checkbox-group">
                                        <div className="checkbox-item">
                                            <input type="checkbox" id="keepRoof" />
                                            <label htmlFor="keepRoof" className="checkbox-label">Keep existing roof color</label>
                                        </div>
                                        <div className="checkbox-item">
                                            <input type="checkbox" id="ridgeVent" />
                                            <label htmlFor="ridgeVent" className="checkbox-label">Add ridge venting appearance</label>
                                        </div>
                                        <div className="checkbox-item">
                                            <input type="checkbox" id="shadows" />
                                            <label htmlFor="shadows" className="checkbox-label">Show architectural shadows</label>
                                        </div>
                                        <div className="checkbox-item">
                                            <input type="checkbox" id="wetEffect" />
                                            <label htmlFor="wetEffect" className="checkbox-label">Wet/rain effect</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Siding Tab */}
                        {materialTab === 'siding' && (
                            <div className="material-content active">
                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>Material Type</div>
                                    <div className="material-grid">
                                        {['Vinyl Lap', 'Fiber Cement', 'Wood', 'Board & Batten', 'Brick', 'Stone'].map(material => (
                                            <div key={material} className="material-option">
                                                <div className="material-preview"></div>
                                                <div className="material-name">{material}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="color-section">
                                    <div className="color-brand">Popular Colors</div>
                                    <div className="color-grid">
                                        {sidingColors.map(color => (
                                            <div 
                                                key={color.name}
                                                className={`color-swatch ${selectedColors.siding === color.name ? 'selected' : ''}`} 
                                                onClick={() => selectColor(color.name, 'siding')}
                                            >
                                                <div className="swatch-color" style={{ background: color.value }}></div>
                                                <div className="swatch-name">{color.name}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Trim & Accents Tab */}
                        {materialTab === 'trim' && (
                            <div className="material-content active">
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>Gutters</div>
                                    <div style={{ marginBottom: '0.75rem' }}>
                                        <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Style:</label>
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                            <button className="shingle-type-btn selected">K-Style</button>
                                            <button className="shingle-type-btn">Half-Round</button>
                                            <button className="shingle-type-btn">Box Style</button>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Color:</label>
                                        <div className="color-grid" style={{ marginTop: '0.5rem' }}>
                                            {['#ffffff', '#f5f5dc', '#8b7355', '#2f2f2f', '#808080', '#b87333'].map((color, idx) => (
                                                <div key={idx} className="color-swatch">
                                                    <div className="swatch-color" style={{ background: color }}></div>
                                                    <div className="swatch-name">{['White', 'Almond', 'Brown', 'Black', 'Gray', 'Copper'][idx]}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Windows & Doors Tab */}
                        {materialTab === 'windows' && (
                            <div className="material-content active">
                                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Window & door customization options...</p>
                            </div>
                        )}

                        {/* Additional Tab */}
                        {materialTab === 'additional' && (
                            <div className="material-content active">
                                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Additional element customization...</p>
                            </div>
                        )}

                        {/* AI Instruction Box */}
                        <div className="ai-instruction-section">
                            <div className="instruction-label">AI Instructions (Be Specific)</div>
                            <textarea 
                                className="instruction-textarea" 
                                placeholder="Describe exactly what you want to see in this mockup. Be specific about colors, materials, and any special details. For example: 'Change roof to GAF Charcoal architectural shingles, keep the brick but make siding Arctic White vinyl, black window frames, remove shutters, add white gutters.'"
                            ></textarea>
                            
                            <div className="prompt-chips">
                                <button className="prompt-chip" onClick={() => addPrompt('Make it look modern')}>Make it look modern</button>
                                <button className="prompt-chip" onClick={() => addPrompt('Traditional colonial style')}>Traditional colonial style</button>
                                <button className="prompt-chip" onClick={() => addPrompt('Match neighborhood HOA')}>Match neighborhood HOA</button>
                                <button className="prompt-chip" onClick={() => addPrompt('Storm damage replacement')}>Storm damage replacement</button>
                                <button className="prompt-chip" onClick={() => addPrompt('Increase curb appeal')}>Increase curb appeal</button>
                            </div>

                            <div className="iteration-info">
                                <div className="iteration-title">Note: AI mockups may not be perfect on first try</div>
                                <div className="iteration-text">
                                    • Be very specific in your instructions<br />
                                    • Process one major change at a time<br />
                                    • Use the notes to refine details<br />
                                    • Generate multiple versions to compare<br />
                                    • Each iteration improves accuracy
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Preview & Results */}
                    <div className="panel-card">
                        <h3 className="panel-header">Preview & Results</h3>
                        
                        <div className="preview-window" id="previewWindow">
                            {selectedPhoto ? (
                                <img src={selectedPhoto} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div className="preview-placeholder">
                                    <p>Upload a photo to begin</p>
                                    <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Preview will appear here</p>
                                </div>
                            )}
                        </div>

                        <div className="preview-controls">
                            <button className="preview-control-btn">Original</button>
                            <button className="preview-control-btn">Split View</button>
                            <button className="preview-control-btn">Full Screen</button>
                        </div>

                        <div className="generation-section">
                            <button className="generate-btn" onClick={generateMockup}>Generate Mockup</button>
                            
                            <div className="quality-selector">
                                <div 
                                    className={`quality-option ${selectedQuality === 'fast' ? 'selected' : ''}`} 
                                    onClick={() => selectQuality('fast')}
                                >
                                    <span className="quality-label">Fast</span>
                                    <span className="quality-time">30 seconds - Draft</span>
                                </div>
                                <div 
                                    className={`quality-option ${selectedQuality === 'standard' ? 'selected' : ''}`} 
                                    onClick={() => selectQuality('standard')}
                                >
                                    <span className="quality-label">Standard</span>
                                    <span className="quality-time">1 minute - Good</span>
                                </div>
                                <div 
                                    className={`quality-option ${selectedQuality === 'premium' ? 'selected' : ''}`} 
                                    onClick={() => selectQuality('premium')}
                                >
                                    <span className="quality-label">Premium</span>
                                    <span className="quality-time">2 minutes - Best</span>
                                </div>
                            </div>

                            <button className="btn btn-outline" style={{ width: '100%' }}>Generate 3 Variations</button>
                        </div>

                        <div style={{ margin: '1rem 0' }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Version History</div>
                            <div className="version-history">
                                <div className="version-thumb active">
                                    <div className="version-label">Original</div>
                                </div>
                                <div className="version-thumb">
                                    <div className="version-label">V1</div>
                                </div>
                                <div className="version-thumb">
                                    <div className="version-label">V2</div>
                                </div>
                                <div className="version-thumb">
                                    <div className="version-label">Current</div>
                                </div>
                            </div>
                        </div>

                        <div className="confidence-section">
                            <div className="confidence-title">AI Accuracy Indicator</div>
                            <div className="confidence-item">
                                <span className="confidence-label">Overall:</span>
                                <span className="confidence-value high">94% accurate</span>
                            </div>
                            <div className="confidence-item">
                                <span className="confidence-label">Roof:</span>
                                <span className="confidence-value high">96% ✓</span>
                            </div>
                            <div className="confidence-item">
                                <span className="confidence-label">Siding:</span>
                                <span className="confidence-value high">92% ✓</span>
                            </div>
                            <div className="confidence-item">
                                <span className="confidence-label">Details:</span>
                                <span className="confidence-value medium">88% ⚠</span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                            <button className="btn btn-primary" onClick={confirmMockup}>Confirm This Mockup</button>
                            <button className="btn btn-secondary" onClick={refineMore}>Refine Further</button>
                            <button className="btn btn-outline" onClick={startOver}>Start Over</button>
                            <button className="btn btn-outline" onClick={saveTemplate}>Save as Template</button>
                        </div>
                    </div>
                </div>

                {/* Sharing Section */}
                {showSharing && (
                    <div className="sharing-section" id="sharingSection">
                        <h3 className="sharing-title">Share Your Mockup</h3>
                        
                        <div className="share-buttons">
                            <button className="share-btn" onClick={shareViaSMS}>
                                <div className="share-icon"></div>
                                <div className="share-label">Send via SMS</div>
                                <div className="share-sublabel">Text to client's phone</div>
                            </button>
                            <button className="share-btn" onClick={shareViaEmail}>
                                <div className="share-icon"></div>
                                <div className="share-label">Send via Email</div>
                                <div className="share-sublabel">Professional presentation</div>
                            </button>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>Advanced Sharing</div>
                            <div className="checkbox-group">
                                <div className="checkbox-item">
                                    <input type="checkbox" id="addPortal" defaultChecked />
                                    <label htmlFor="addPortal" className="checkbox-label">Add to client portal automatically</label>
                                </div>
                                <div className="checkbox-item">
                                    <input type="checkbox" id="includeEstimate" />
                                    <label htmlFor="includeEstimate" className="checkbox-label">Include in next estimate</label>
                                </div>
                                <div className="checkbox-item">
                                    <input type="checkbox" id="createPresentation" />
                                    <label htmlFor="createPresentation" className="checkbox-label">Create printed presentation</label>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>Download Options</div>
                            <div className="download-options">
                                <button className="download-btn">Original Size (4K)</button>
                                <button className="download-btn">Web Size (1080p)</button>
                                <button className="download-btn">Comparison GIF</button>
                                <button className="download-btn">All Versions (ZIP)</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {/* Gallery Modal */}
            {showGallery && (
                <div className="modal-overlay active" id="galleryModal" onClick={(e) => e.target.id === 'galleryModal' && closeModal('gallery')}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Mockup Gallery</h2>
                            <button className="modal-close" onClick={() => closeModal('gallery')}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="gallery-filters">
                                <input type="text" className="modal-search-input" placeholder="Search by client name or address..." />
                                <select className="filter-select">
                                    <option>All Mockups</option>
                                    <option>This Week</option>
                                    <option>This Month</option>
                                    <option>Approved</option>
                                    <option>Pending</option>
                                </select>
                            </div>
                            <div className="gallery-grid">
                                {['Johnson Property', 'Smith Residence', 'Davis Complex', 'Wilson Estate'].map((client, idx) => (
                                    <div key={idx} className="gallery-item">
                                        <div className="gallery-image"></div>
                                        <div className="gallery-info">
                                            <div className="gallery-client">{client}</div>
                                            <div className="gallery-date">Oct {19 - idx}, 2025</div>
                                            <div className="gallery-type">Roof + Siding</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Projects Modal */}
            {showRecent && (
                <div className="modal-overlay active" id="recentModal" onClick={(e) => e.target.id === 'recentModal' && closeModal('recent')}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Recent Projects</h2>
                            <button className="modal-close" onClick={() => closeModal('recent')}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="recent-list">
                                <div className="recent-item">
                                    <div className="recent-preview"></div>
                                    <div className="recent-details">
                                        <div className="recent-title">Johnson Property - Complete Exterior</div>
                                        <div className="recent-info">
                                            <span>Today at 2:45 PM</span> • 
                                            <span>3 versions generated</span> • 
                                            <span className="status-approved">Approved</span>
                                        </div>
                                        <div className="recent-materials">
                                            GAF Charcoal roof • CertainTeed Arctic White siding • Black trim
                                        </div>
                                        <div className="recent-actions">
                                            <button className="action-btn">Open</button>
                                            <button className="action-btn">Duplicate</button>
                                            <button className="action-btn">Share</button>
                                        </div>
                                    </div>
                                </div>
                                <div className="recent-item">
                                    <div className="recent-preview"></div>
                                    <div className="recent-details">
                                        <div className="recent-title">Smith Residence - Roof Replacement</div>
                                        <div className="recent-info">
                                            <span>Yesterday at 4:15 PM</span> • 
                                            <span>2 versions generated</span> • 
                                            <span className="status-pending">Pending Review</span>
                                        </div>
                                        <div className="recent-materials">
                                            Owens Corning Estate Gray roof • Existing siding kept
                                        </div>
                                        <div className="recent-actions">
                                            <button className="action-btn">Open</button>
                                            <button className="action-btn">Duplicate</button>
                                            <button className="action-btn">Share</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Templates Modal */}
            {showTemplates && (
                <div className="modal-overlay active" id="templatesModal" onClick={(e) => e.target.id === 'templatesModal' && closeModal('templates')}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Mockup Templates</h2>
                            <button className="modal-close" onClick={() => closeModal('templates')}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="templates-grid">
                                {[
                                    { name: 'Modern Farmhouse', desc: 'White siding, black trim, charcoal roof' },
                                    { name: 'Classic Colonial', desc: 'Cream siding, white trim, weathered wood roof' },
                                    { name: 'Contemporary Clean', desc: 'Gray siding, black windows, slate roof' },
                                    { name: 'Craftsman Style', desc: 'Cedar siding, brown trim, architectural shingles' }
                                ].map((template, idx) => (
                                    <div key={idx} className="template-card">
                                        <div className="template-preview"></div>
                                        <div className="template-name">{template.name}</div>
                                        <div className="template-description">{template.desc}</div>
                                        <button className="template-use-btn">Use Template</button>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                <button className="btn btn-primary">Create New Template</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tutorial Modal */}
            {showTutorial && (
                <div className="modal-overlay active" id="tutorialModal" onClick={(e) => e.target.id === 'tutorialModal' && closeModal('tutorial')}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">3D Mockup Studio Tutorial</h2>
                            <button className="modal-close" onClick={() => closeModal('tutorial')}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="tutorial-video">
                                <div style={{ aspectRatio: '16/9', background: '#000', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ textAlign: 'center', color: 'white' }}>
                                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>▶</div>
                                        <p>Video Tutorial</p>
                                        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Duration: 5:23</p>
                                    </div>
                                </div>
                            </div>
                            <div className="tutorial-steps">
                                <h3 style={{ margin: '1.5rem 0 1rem', fontSize: '1rem', fontWeight: 600 }}>Quick Start Guide</h3>
                                {[
                                    { num: 1, title: 'Upload Property Photo', desc: 'Take or upload a clear photo of the property. Best results with good lighting and minimal shadows.' },
                                    { num: 2, title: 'Select Materials & Colors', desc: 'Choose roofing type, siding material, and colors from our extensive catalog.' },
                                    { num: 3, title: 'Add AI Instructions', desc: 'Be specific about what you want. The more detail, the better the result.' },
                                    { num: 4, title: 'Generate & Refine', desc: 'Generate the mockup and refine as needed. Each iteration improves accuracy.' }
                                ].map((step, idx) => (
                                    <div key={idx} className="step-item">
                                        <div className="step-number">{step.num}</div>
                                        <div className="step-content">
                                            <div className="step-title">{step.title}</div>
                                            <div className="step-description">{step.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MockupStudio;

