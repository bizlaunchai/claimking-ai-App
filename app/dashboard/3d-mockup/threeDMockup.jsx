'use client'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import "./3d-mockup.css"
import dynamic from "next/dynamic";
import axiosInstance from "@/lib/axiosInstance";
import { toast } from "sonner";

const FileUploader = dynamic(() => import("@/utiles/FileUploader.jsx"), { ssr: false });

// ──────────────────────────────────────────────────────────────────────────────
//   Static catalogues (these don't come from the backend — they're spec data)
// ──────────────────────────────────────────────────────────────────────────────
const SHINGLE_TYPES = ['Architectural', '3-Tab', 'Designer', 'Wood Shakes', 'Slate', 'Metal', 'Clay Tile', 'Concrete Tile'];

const ROOFING_COLORS = [
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
        { name: 'Copper Canyon', value: '#8a7a65' },
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
        { name: 'Sand Dune', value: '#bc8f8f' },
    ]},
];

const SIDING_MATERIALS = ['Vinyl Lap', 'Fiber Cement', 'Wood', 'Board & Batten', 'Brick', 'Stone'];

const SIDING_COLORS = [
    { name: 'Arctic White', value: '#ffffff' },
    { name: 'Cream',         value: '#f5f5f0' },
    { name: 'Sterling Gray', value: '#9ca3af' },
    { name: 'Iron Gray',     value: '#4b5563' },
    { name: 'Cape Cod Blue', value: '#5b8fa3' },
    { name: 'Sandstone',     value: '#d4a574' },
];

const TRIM_COLORS = [
    { name: 'White',  value: '#ffffff' },
    { name: 'Almond', value: '#f5f5dc' },
    { name: 'Brown',  value: '#8b7355' },
    { name: 'Black',  value: '#2f2f2f' },
    { name: 'Gray',   value: '#808080' },
    { name: 'Copper', value: '#b87333' },
];

const QUALITY_OPTIONS = [
    { id: 'fast',     label: 'Fast',     time: '~30 seconds — Draft' },
    { id: 'standard', label: 'Standard', time: '~1 minute — Good'   },
    { id: 'premium',  label: 'Premium',  time: '~2 minutes — Best'  },
];

// ──────────────────────────────────────────────────────────────────────────────
//   Authed image — backend /s3/file requires Bearer auth, so a plain <img>
//   won't load it. We fetch as a blob and turn it into an object URL.
// ──────────────────────────────────────────────────────────────────────────────
const AuthedImage = ({ src, alt = '', style, className }) => {
    const [blobUrl, setBlobUrl] = useState(null);
    const [errored, setErrored] = useState(false);

    useEffect(() => {
        if (!src) { setBlobUrl(null); return; }
        let active = true;
        let createdUrl = null;
        setErrored(false);

        (async () => {
            try {
                const res = await axiosInstance.get(src, { responseType: 'blob' });
                if (!active) return;
                createdUrl = URL.createObjectURL(res.data);
                setBlobUrl(createdUrl);
            } catch {
                if (active) setErrored(true);
            }
        })();

        return () => {
            active = false;
            if (createdUrl) URL.revokeObjectURL(createdUrl);
        };
    }, [src]);

    if (errored) return <div className={className} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>Image unavailable</div>;
    if (!blobUrl) return <div className={className} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>Loading…</div>;
    return <img src={blobUrl} alt={alt} style={style} className={className} />;
};

// ──────────────────────────────────────────────────────────────────────────────
//   Main component
// ──────────────────────────────────────────────────────────────────────────────
const ThreeDMockup = () => {
    // ── Client selection ─────────────────────────────────────────────────────
    const [clientTab, setClientTab] = useState('existing');
    const [selectedClient, setSelectedClient] = useState(null);

    const [clientSearch, setClientSearch] = useState('');
    const [clients, setClients] = useState([]);
    const [clientsLoading, setClientsLoading] = useState(false);

    const [newClientForm, setNewClientForm] = useState({
        first_name: '', last_name: '', email: '', phone: '',
        address: '', city: '', state: '', zip_code: '',
        preferred_contact: 'both',
    });
    const [creatingClient, setCreatingClient] = useState(false);

    // ── Mockup configuration ────────────────────────────────────────────────
    const [materialTab, setMaterialTab] = useState('roofing');
    const [selectedShingleType, setSelectedShingleType] = useState('Architectural');
    const [selectedSidingMaterial, setSelectedSidingMaterial] = useState('Vinyl Lap');
    const [selectedColors, setSelectedColors] = useState({
        roofing: null, siding: null, trim: null, windows: null,
    });
    const [advanced, setAdvanced] = useState({
        keepRoof: false, ridgeVent: false, shadows: false, wetEffect: false,
    });
    const [aiInstructions, setAiInstructions] = useState('');
    const [selectedQuality, setSelectedQuality] = useState('standard');

    // ── Photo & generation ──────────────────────────────────────────────────
    const [files, setFiles] = useState([]);
    const sourcePhotoKey = files?.[0]?.serverResponse?.payload?.key || null;

    const [currentMockup, setCurrentMockup] = useState(null);
    const [versions, setVersions] = useState([]);
    const [activeVersionId, setActiveVersionId] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewMode, setPreviewMode] = useState('result'); // original | result | split
    const [generationError, setGenerationError] = useState(null); // { title, message, hint } | null

    // ── Provider availability  ──────────────────────────────────────────────
    const [providerStatus, setProviderStatus] = useState({});

    // ── Modals + sharing ─────────────────────────────────────────────────────
    const [showGallery, setShowGallery] = useState(false);
    const [showRecent, setShowRecent] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);
    const [showSharing, setShowSharing] = useState(false);
    const [galleryItems, setGalleryItems] = useState([]);
    const [recentItems, setRecentItems] = useState([]);

    // ── Derived view-state ──────────────────────────────────────────────────
    const activeVersion = useMemo(
        () => versions.find(v => v.id === activeVersionId) ?? versions.find(v => v.is_current) ?? null,
        [versions, activeVersionId],
    );

    const sourceImageSrc = sourcePhotoKey ? `/s3/file?key=${encodeURIComponent(sourcePhotoKey)}` : null;
    const generatedImageSrc = activeVersion?.generated_image_url ?? null;

    // ── Effects: load existing clients when search changes ──────────────────
    useEffect(() => {
        let cancelled = false;
        if (clientTab !== 'existing') return;
        setClientsLoading(true);
        const timer = setTimeout(async () => {
            try {
                const params = {};
                if (clientSearch.trim()) params.search = clientSearch.trim();
                const res = await axiosInstance.get('/client-portal', { params });
                if (cancelled) return;
                setClients(res.data?.data ?? []);
            } catch {
                /* axiosInstance toasts the error */
            } finally {
                if (!cancelled) setClientsLoading(false);
            }
        }, 250);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [clientTab, clientSearch]);

    // ── Effects: provider status ────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const res = await axiosInstance.get('/mockup/providers');
                setProviderStatus(res.data?.data ?? {});
            } catch { /* ignore */ }
        })();
    }, []);

    // ── Effects: gallery / recent (lazy when modal opens) ──────────────────
    useEffect(() => {
        if (!showGallery && !showRecent) return;
        (async () => {
            try {
                const res = await axiosInstance.get('/mockup');
                const items = res.data?.data ?? [];
                setGalleryItems(items);
                setRecentItems(items.slice(0, 10));
            } catch { /* ignore */ }
        })();
    }, [showGallery, showRecent]);

    // ────────────────────────────────────────────────────────────────────────
    //   Client handlers
    // ────────────────────────────────────────────────────────────────────────
    const switchClientTab = (tab) => setClientTab(tab);

    const handleSelectExistingClient = (client) => {
        setSelectedClient({
            id: client.id,
            name: client.full_name || `${client.first_name} ${client.last_name}`,
            address: [client.address, client.city, client.state, client.zip_code].filter(Boolean).join(', '),
        });
    };

    const handleNewClientField = (field, value) =>
        setNewClientForm(prev => ({ ...prev, [field]: value }));

    const [clientFormError, setClientFormError] = useState(null);

    const submitNewClient = async () => {
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
            handleSelectExistingClient(created);
            setNewClientForm({
                first_name: '', last_name: '', email: '', phone: '',
                address: '', city: '', state: '', zip_code: '',
                preferred_contact: 'both',
            });
            setClientTab('existing');
        } catch (err) {
            // axiosInstance has already toasted; keep the message inline too so
            // the user can see the validation reason without scrolling to the toast.
            setClientFormError(err?.userMessage ?? 'Could not create client.');
        } finally {
            setCreatingClient(false);
        }
    };

    const changeClient = () => setSelectedClient(null);

    // ────────────────────────────────────────────────────────────────────────
    //   Material handlers
    // ────────────────────────────────────────────────────────────────────────
    const switchMaterialTab = (tab) => setMaterialTab(tab);

    const selectColor = (category, colorObj) => {
        setSelectedColors(prev => ({ ...prev, [category]: colorObj }));
    };

    const toggleAdvanced = (key) =>
        setAdvanced(prev => ({ ...prev, [key]: !prev[key] }));

    const addPrompt = (text) => {
        setAiInstructions(prev => prev ? `${prev} ${text}` : text);
    };

    // ────────────────────────────────────────────────────────────────────────
    //   Build the material_settings JSON the backend expects
    // ────────────────────────────────────────────────────────────────────────
    const buildMaterialSettings = useCallback(() => {
        const toPick = (cat) => {
            const c = selectedColors[cat];
            if (!c) return null;
            return { color: c.name, hex: c.value };
        };
        const roofingPick = toPick('roofing');
        return {
            shingleType: selectedShingleType,
            roofing: roofingPick ? { ...roofingPick, brand: selectedColors.roofing?.brand ?? null } : null,
            siding: selectedColors.siding
                ? { color: selectedColors.siding.name, hex: selectedColors.siding.value, material: selectedSidingMaterial }
                : null,
            trim: toPick('trim'),
            windows: toPick('windows'),
            advanced,
        };
    }, [selectedColors, selectedShingleType, selectedSidingMaterial, advanced]);

    // ────────────────────────────────────────────────────────────────────────
    //   Map a backend / network error to an inline panel message.
    //   Toast is already handled globally by axiosInstance — this is the
    //   sticky banner inside the preview panel so the user can read it.
    // ────────────────────────────────────────────────────────────────────────
    const buildGenerationError = (err) => {
        const status = err?.response?.status ?? 0;
        const raw = (err?.userMessage ?? err?.message ?? '').toString();
        const lower = raw.toLowerCase();

        if (lower.includes('quota') || lower.includes('429') || status === 429) {
            return {
                title: 'AI quota exceeded',
                message: 'Your Gemini free tier has no image-generation quota left.',
                hint: 'Enable billing on your Google AI key (aistudio.google.com → API keys → Set up Billing) — same key keeps working. Or save a Replicate token in API Settings.',
            };
        }
        if (lower.includes('api key not configured') || lower.includes('no image generation provider')) {
            return {
                title: 'AI not configured',
                message: 'No image AI is connected to your account.',
                hint: 'Open Dashboard → API Settings and save a Gemini key, then come back.',
            };
        }
        if (lower.includes('no gemini image model is available')) {
            return {
                title: 'No image model available',
                message: 'Your Gemini API key cannot access any image-capable model.',
                hint: 'Most likely the key is on the free tier. Enable billing in Google AI Studio, or set the env var GEMINI_IMAGE_MODEL to a model your key has access to.',
            };
        }
        if (lower.includes('s3 credentials not configured')) {
            return {
                title: 'File storage not set up',
                message: 'AWS S3 storage is required to save generated images.',
                hint: 'Configure it under API Settings → AWS S3 Storage.',
            };
        }
        if (status === 401) {
            return {
                title: 'Session expired',
                message: 'Please refresh the page and log in again.',
                hint: null,
            };
        }
        if (status === 0) {
            return {
                title: 'Network error',
                message: 'Could not reach the server.',
                hint: 'Check your internet connection and that the backend is running.',
            };
        }
        return {
            title: 'Generation failed',
            message: raw || 'The mockup could not be generated.',
            hint: 'Try again, or simplify your instructions and re-generate.',
        };
    };

    // ────────────────────────────────────────────────────────────────────────
    //   Generate / re-generate
    // ────────────────────────────────────────────────────────────────────────
    const generateMockup = async () => {
        if (!sourcePhotoKey) { toast.error('Upload a property photo first'); return; }
        if (isGenerating) return;

        setIsGenerating(true);
        setGenerationError(null);
        try {
            const payload = {
                mockup_id: currentMockup?.id,
                client_id: selectedClient?.id,
                source_photo_key: sourcePhotoKey,
                material_settings: buildMaterialSettings(),
                ai_instructions: aiInstructions || undefined,
                quality: selectedQuality,
                title: selectedClient ? `${selectedClient.name} — Mockup` : undefined,
            };
            const res = await axiosInstance.post('/mockup/generate', payload);
            const mockup = res.data?.data?.mockup;
            const version = res.data?.data?.version;

            setCurrentMockup(mockup);
            setVersions(prev => {
                const filtered = prev.filter(v => v.id !== version.id).map(v => ({ ...v, is_current: false }));
                return [...filtered, version];
            });
            setActiveVersionId(version.id);
            setPreviewMode('result');
            toast.success('Mockup generated');
        } catch (err) {
            setGenerationError(buildGenerationError(err));
        } finally {
            setIsGenerating(false);
        }
    };

    const selectVersion = async (versionId) => {
        if (!currentMockup) return;
        setActiveVersionId(versionId);
        try {
            await axiosInstance.patch(`/mockup/${currentMockup.id}/select-version`, { version_id: versionId });
            setVersions(prev => prev.map(v => ({ ...v, is_current: v.id === versionId })));
        } catch { /* toasted */ }
    };

    // ────────────────────────────────────────────────────────────────────────
    //   Confirm / start-over
    // ────────────────────────────────────────────────────────────────────────
    const confirmMockup = async () => {
        if (!currentMockup) { toast.error('Generate a mockup first'); return; }
        try {
            await axiosInstance.patch(`/mockup/${currentMockup.id}`, { status: 'approved' });
            toast.success('Mockup approved & saved to client file');
            setShowSharing(true);
            setTimeout(() => {
                document.getElementById('sharingSection')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch { /* toasted */ }
    };

    const refineMore = () => {
        toast.info('Tweak materials or AI instructions, then click Generate Mockup again.');
    };

    const startOver = () => {
        if (!confirm('Discard this mockup and start over?')) return;
        setSelectedClient(null);
        setFiles([]);
        setCurrentMockup(null);
        setVersions([]);
        setActiveVersionId(null);
        setMaterialTab('roofing');
        setSelectedColors({ roofing: null, siding: null, trim: null, windows: null });
        setAdvanced({ keepRoof: false, ridgeVent: false, shadows: false, wetEffect: false });
        setAiInstructions('');
        setShowSharing(false);
        setGenerationError(null);
    };

    const saveTemplate = () => toast.info('Templates: coming soon.');
    const shareViaSMS   = () => toast.info('SMS sharing: coming soon.');
    const shareViaEmail = () => toast.info('Email sharing: coming soon.');

    // ────────────────────────────────────────────────────────────────────────
    //   Modal close
    // ────────────────────────────────────────────────────────────────────────
    const closeModal = (modalType) => {
        const setters = {
            gallery: setShowGallery, recent: setShowRecent,
            templates: setShowTemplates, tutorial: setShowTutorial,
        };
        setters[modalType]?.(false);
        document.body.style.overflow = '';
    };

    useEffect(() => {
        const handler = (e) => {
            if (e.target.classList?.contains('modal-overlay')) {
                if (e.target.id === 'galleryModal') setShowGallery(false);
                if (e.target.id === 'recentModal') setShowRecent(false);
                if (e.target.id === 'templatesModal') setShowTemplates(false);
                if (e.target.id === 'tutorialModal') setShowTutorial(false);
                document.body.style.overflow = '';
            }
        };
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, []);

    // ────────────────────────────────────────────────────────────────────────
    //   Render
    // ────────────────────────────────────────────────────────────────────────
    const aiReady = providerStatus.gemini || providerStatus.replicate;

    return (
        <div className="mockup-container">
            {/* Header */}
            <div className="mockup-3d-header-section">
                <div className="mockup-3d-header-content">
                    <div className="mockup-3d-header-left">
                        <div className="mockup-3d-page-title">
                            <div className="title-text">
                                <span className="title-line1">3D Mockup</span>
                                <span className="title-line2">Studio</span>
                            </div>
                        </div>
                        <p className="mockup-3d-page-subtitle">AI-powered exterior visualization tool</p>
                        <div className="mockup-3d-status-badges">
                            <div className={`mockup-3d-status-badge ${aiReady ? 'active' : ''}`}>
                                {aiReady ? 'AI Ready' : 'AI Not Configured'}
                            </div>
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

            <div className="main-container">
                {/* ─────────────── Client selection ─────────────── */}
                <div className="client-selection-card">
                    <div className="tabs">
                        <button
                            className={`tab-btn ${clientTab === 'existing' ? 'active' : ''}`}
                            onClick={() => switchClientTab('existing')}
                        >Existing Client</button>
                        <button
                            className={`tab-btn ${clientTab === 'new' ? 'active' : ''}`}
                            onClick={() => switchClientTab('new')}
                        >New Client</button>
                    </div>

                    {clientTab === 'existing' && (
                        <div className="tab-content active">
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Type client name, address, email or phone…"
                                value={clientSearch}
                                onChange={(e) => setClientSearch(e.target.value)}
                            />

                            <div style={{ display: 'grid', gap: '0.5rem', maxHeight: 280, overflowY: 'auto' }}>
                                {clientsLoading && <div style={{ fontSize: 13, color: '#6b7280', padding: '0.5rem' }}>Searching…</div>}
                                {!clientsLoading && clients.length === 0 && (
                                    <div style={{ fontSize: 13, color: '#6b7280', padding: '0.5rem' }}>
                                        No clients found. Switch to <strong>New Client</strong> to add one.
                                    </div>
                                )}
                                {clients.map(c => (
                                    <div
                                        key={c.id}
                                        className="client-option"
                                        onClick={() => handleSelectExistingClient(c)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f9fafb', borderRadius: 6 }}>
                                            <div>
                                                <div style={{ fontWeight: 600, color: '#1f2937' }}>{c.full_name}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                    {[c.address, c.city, c.state].filter(Boolean).join(', ')}
                                                </div>
                                            </div>
                                            <button
                                                className="btn btn-outline"
                                                style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                                                onClick={(e) => { e.stopPropagation(); handleSelectExistingClient(c); }}
                                            >Select Client</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {clientTab === 'new' && (
                        <div className="tab-content active">
                            <div className="form-grid">
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
                                <div className="form-group">
                                    <label className="form-label">Preferred Contact</label>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                        {['sms', 'email', 'both'].map(o => (
                                            <label key={o} style={{ fontSize: '0.875rem' }}>
                                                <input type="radio" name="contact" value={o}
                                                       checked={newClientForm.preferred_contact === o}
                                                       onChange={() => handleNewClientField('preferred_contact', o)} />
                                                {' '}{o.toUpperCase()}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                {clientFormError && (
                                    <div
                                        className="form-group full-width"
                                        role="alert"
                                        style={{
                                            background: '#fef2f2',
                                            border: '1px solid #fecaca',
                                            borderLeft: '4px solid #dc2626',
                                            color: '#7f1d1d',
                                            padding: '10px 12px',
                                            borderRadius: 6,
                                            fontSize: 13,
                                        }}
                                    >
                                        {clientFormError}
                                    </div>
                                )}
                                <div className="form-group full-width">
                                    <button type="button" className="btn btn-primary"
                                            onClick={submitNewClient}
                                            disabled={creatingClient}>
                                        {creatingClient ? 'Creating…' : 'Create & Continue'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

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

                {/* ─────────────── Mockup interface ─────────────── */}
                <div className="mockup-interface">
                    {/* Left panel — photo upload */}
                    <div className="panel-card">
                        <h3 className="panel-header">Photo Upload & Management</h3>

                        <FileUploader
                            label="Upload Property Photo"
                            files={files}
                            setFiles={setFiles}
                            allowedExtensions={['.jpg', '.jpeg', '.png', '.heif']}
                            maxFiles={1}
                            maxSizeMB={50}
                            uploadFolderName="mockup-sources"
                        />

                        {sourcePhotoKey && (
                            <>
                                <div className="photo-display active" style={{ marginTop: 12 }}>
                                    <div className="photo-preview" style={{ aspectRatio: '4/3', overflow: 'hidden', borderRadius: 8, background: '#f3f4f6' }}>
                                        <AuthedImage src={sourceImageSrc} alt="Source" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                </div>
                                <div className="analysis-box">
                                    <div className="analysis-title">Source ready for AI editing</div>
                                    <div className="analysis-items">
                                        <div className="analysis-item">✓ Image stored securely</div>
                                        <div className="analysis-item">✓ Ready for color & material edits</div>
                                        <div className="analysis-item">✓ Will keep camera angle & lighting unchanged</div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Middle panel — material/color customisation */}
                    <div className="panel-card">
                        <h3 className="panel-header">Material & Color Customization</h3>

                        <div className="material-tabs">
                            {[
                                ['roofing', 'Roofing'],
                                ['siding', 'Siding'],
                                ['trim', 'Trim & Accents'],
                                ['windows', 'Windows & Doors'],
                            ].map(([id, label]) => (
                                <button key={id}
                                        className={`material-tab ${materialTab === id ? 'active' : ''}`}
                                        onClick={() => switchMaterialTab(id)}>{label}</button>
                            ))}
                        </div>

                        {materialTab === 'roofing' && (
                            <div className="material-content active">
                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>Shingle Type</div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                        {SHINGLE_TYPES.map(type => (
                                            <button key={type}
                                                    className={`shingle-type-btn ${selectedShingleType === type ? 'selected' : ''}`}
                                                    onClick={() => setSelectedShingleType(type)}>{type}</button>
                                        ))}
                                    </div>
                                </div>

                                {ROOFING_COLORS.map(brand => (
                                    <div key={brand.brand} className="color-section">
                                        <div className="color-brand">{brand.brand}</div>
                                        <div className="color-grid">
                                            {brand.colors.map(color => (
                                                <div key={color.name}
                                                     className={`color-swatch ${selectedColors.roofing?.name === color.name ? 'selected' : ''}`}
                                                     onClick={() => selectColor('roofing', { ...color, brand: brand.brand })}>
                                                    <div className="swatch-color" style={{ background: color.value }} />
                                                    <div className="swatch-name">{color.name}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                <div className="advanced-section">
                                    <div className="advanced-title">Advanced Options</div>
                                    <div className="checkbox-group">
                                        {[
                                            ['keepRoof',  'Keep existing roof color'],
                                            ['ridgeVent', 'Add ridge venting appearance'],
                                            ['shadows',   'Show architectural shadows'],
                                            ['wetEffect', 'Wet/rain effect'],
                                        ].map(([key, label]) => (
                                            <div key={key} className="checkbox-item">
                                                <input type="checkbox" id={key} checked={advanced[key]} onChange={() => toggleAdvanced(key)} />
                                                <label htmlFor={key} className="checkbox-label">{label}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {materialTab === 'siding' && (
                            <div className="material-content active">
                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>Material Type</div>
                                    <div className="material-grid">
                                        {SIDING_MATERIALS.map(m => (
                                            <div key={m}
                                                 className={`material-option ${selectedSidingMaterial === m ? 'selected' : ''}`}
                                                 onClick={() => setSelectedSidingMaterial(m)}
                                                 style={{ cursor: 'pointer' }}>
                                                <div className="material-preview" />
                                                <div className="material-name">{m}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="color-section">
                                    <div className="color-brand">Popular Colors</div>
                                    <div className="color-grid">
                                        {SIDING_COLORS.map(color => (
                                            <div key={color.name}
                                                 className={`color-swatch ${selectedColors.siding?.name === color.name ? 'selected' : ''}`}
                                                 onClick={() => selectColor('siding', color)}>
                                                <div className="swatch-color" style={{ background: color.value }} />
                                                <div className="swatch-name">{color.name}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {materialTab === 'trim' && (
                            <div className="material-content active">
                                <div className="color-section">
                                    <div className="color-brand">Trim & Gutter Color</div>
                                    <div className="color-grid">
                                        {TRIM_COLORS.map(color => (
                                            <div key={color.name}
                                                 className={`color-swatch ${selectedColors.trim?.name === color.name ? 'selected' : ''}`}
                                                 onClick={() => selectColor('trim', color)}>
                                                <div className="swatch-color" style={{ background: color.value }} />
                                                <div className="swatch-name">{color.name}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {materialTab === 'windows' && (
                            <div className="material-content active">
                                <div className="color-section">
                                    <div className="color-brand">Window Frame & Door Color</div>
                                    <div className="color-grid">
                                        {TRIM_COLORS.map(color => (
                                            <div key={color.name}
                                                 className={`color-swatch ${selectedColors.windows?.name === color.name ? 'selected' : ''}`}
                                                 onClick={() => selectColor('windows', color)}>
                                                <div className="swatch-color" style={{ background: color.value }} />
                                                <div className="swatch-name">{color.name}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="ai-instruction-section">
                            <div className="instruction-label">AI Instructions (Be Specific)</div>
                            <textarea
                                className="instruction-textarea"
                                placeholder="Describe exactly what you want — e.g. 'Change roof to GAF Charcoal architectural shingles, keep the brick, make siding Arctic White vinyl, black window frames, white gutters.'"
                                value={aiInstructions}
                                onChange={(e) => setAiInstructions(e.target.value)}
                            />
                            <div className="prompt-chips">
                                {[
                                    'Make it look modern',
                                    'Traditional colonial style',
                                    'Match neighborhood HOA',
                                    'Storm damage replacement',
                                    'Increase curb appeal',
                                ].map(p => (
                                    <button key={p} className="prompt-chip" onClick={() => addPrompt(p)}>{p}</button>
                                ))}
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

                    {/* Right panel — preview & generation */}
                    <div className="panel-card">
                        <h3 className="panel-header">Preview & Results</h3>

                        <div className="preview-window" id="previewWindow" style={{ position: 'relative' }}>
                            {!sourcePhotoKey && (
                                <div className="preview-placeholder">
                                    <p>Upload a photo to begin</p>
                                    <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Preview will appear here</p>
                                </div>
                            )}

                            {sourcePhotoKey && previewMode === 'original' && (
                                <AuthedImage src={sourceImageSrc} alt="Original" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}

                            {sourcePhotoKey && previewMode === 'result' && (
                                generatedImageSrc
                                    ? <AuthedImage src={generatedImageSrc} alt="Generated" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : <AuthedImage src={sourceImageSrc} alt="Source (no generation yet)" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                            )}

                            {sourcePhotoKey && previewMode === 'split' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', height: '100%' }}>
                                    <AuthedImage src={sourceImageSrc} alt="Original" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    {generatedImageSrc
                                        ? <AuthedImage src={generatedImageSrc} alt="Generated" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', color: '#9ca3af', fontSize: 12 }}>Generate to compare</div>}
                                </div>
                            )}

                            {isGenerating && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                    <div style={{ fontSize: 14, color: '#374151', fontWeight: 600 }}>Generating mockup…</div>
                                    <div style={{ fontSize: 12, color: '#6b7280' }}>Quality: {selectedQuality}</div>
                                </div>
                            )}
                        </div>

                        {/* Inline error banner — sticks until user generates again or dismisses */}
                        {generationError && (
                            <div
                                role="alert"
                                style={{
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    borderLeft: '4px solid #dc2626',
                                    color: '#7f1d1d',
                                    padding: '12px 14px',
                                    borderRadius: 8,
                                    margin: '0.75rem 0',
                                    fontSize: 13,
                                    lineHeight: 1.5,
                                    position: 'relative',
                                }}
                            >
                                <button
                                    onClick={() => setGenerationError(null)}
                                    aria-label="Dismiss error"
                                    style={{
                                        position: 'absolute', top: 6, right: 8,
                                        background: 'transparent', border: 'none',
                                        color: '#7f1d1d', fontSize: 18, cursor: 'pointer',
                                        lineHeight: 1, padding: 4,
                                    }}
                                >×</button>
                                <div style={{ fontWeight: 700, marginBottom: 4, paddingRight: 20 }}>
                                    {generationError.title}
                                </div>
                                <div style={{ marginBottom: generationError.hint ? 6 : 0 }}>
                                    {generationError.message}
                                </div>
                                {generationError.hint && (
                                    <div style={{ fontSize: 12, color: '#991b1b', fontStyle: 'italic' }}>
                                        {generationError.hint}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="preview-controls">
                            <button className={`preview-control-btn ${previewMode === 'original' ? 'active' : ''}`} onClick={() => setPreviewMode('original')}>Original</button>
                            <button className={`preview-control-btn ${previewMode === 'result' ? 'active' : ''}`}   onClick={() => setPreviewMode('result')}>Result</button>
                            <button className={`preview-control-btn ${previewMode === 'split' ? 'active' : ''}`}    onClick={() => setPreviewMode('split')}>Split View</button>
                        </div>

                        <div className="generation-section">
                            <button
                                className="generate-btn"
                                onClick={generateMockup}
                                disabled={isGenerating || !sourcePhotoKey || !aiReady}
                            >
                                {isGenerating
                                    ? 'Generating…'
                                    : (currentMockup ? 'Generate Another Version' : 'Generate Mockup')}
                            </button>

                            {!aiReady && !Object.keys(providerStatus).length && (
                                <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 6 }}>Checking AI status…</div>
                            )}
                            {!aiReady && Object.keys(providerStatus).length > 0 && (
                                <div style={{ fontSize: 12, color: '#b91c1c', textAlign: 'center', marginTop: 6 }}>
                                    No image AI configured. Save a Gemini key in API Settings.
                                </div>
                            )}

                            <div className="quality-selector">
                                {QUALITY_OPTIONS.map(q => (
                                    <div key={q.id}
                                         className={`quality-option ${selectedQuality === q.id ? 'selected' : ''}`}
                                         onClick={() => setSelectedQuality(q.id)}>
                                        <span className="quality-label">{q.label}</span>
                                        <span className="quality-time">{q.time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {versions.length > 0 && (
                            <div style={{ margin: '1rem 0' }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Version History</div>
                                <div className="version-history">
                                    {versions.map(v => (
                                        <div key={v.id}
                                             className={`version-thumb ${activeVersionId === v.id || (!activeVersionId && v.is_current) ? 'active' : ''}`}
                                             onClick={() => selectVersion(v.id)}
                                             title={`Generated ${new Date(v.created_at).toLocaleString()}`}>
                                            {v.generated_image_url
                                                ? <AuthedImage src={v.generated_image_url} alt={`V${v.version_number}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : <div style={{ width: '100%', height: '100%', background: '#f3f4f6' }} />}
                                            <div className="version-label">V{v.version_number}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeVersion && (
                            <div className="confidence-section">
                                <div className="confidence-title">Generation Details</div>
                                <div className="confidence-item">
                                    <span className="confidence-label">Provider:</span>
                                    <span className="confidence-value high">{activeVersion.provider}</span>
                                </div>
                                <div className="confidence-item">
                                    <span className="confidence-label">Model:</span>
                                    <span className="confidence-value high">{activeVersion.model || '—'}</span>
                                </div>
                                <div className="confidence-item">
                                    <span className="confidence-label">Time:</span>
                                    <span className="confidence-value high">{activeVersion.generation_time_ms ? `${(activeVersion.generation_time_ms / 1000).toFixed(1)}s` : '—'}</span>
                                </div>
                                <div className="confidence-item">
                                    <span className="confidence-label">Quality:</span>
                                    <span className="confidence-value medium">{activeVersion.quality}</span>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                            <button className="btn btn-primary" onClick={confirmMockup} disabled={!currentMockup}>Confirm This Mockup</button>
                            <button className="btn btn-secondary" onClick={refineMore} disabled={!currentMockup}>Refine Further</button>
                            <button className="btn btn-outline" onClick={startOver}>Start Over</button>
                            <button className="btn btn-outline" onClick={saveTemplate}>Save as Template</button>
                        </div>
                    </div>
                </div>

                {/* Sharing */}
                {showSharing && (
                    <div className="sharing-section" id="sharingSection">
                        <h3 className="sharing-title">Share Your Mockup</h3>
                        <div className="share-buttons">
                            <button className="share-btn" onClick={shareViaSMS}>
                                <div className="share-icon" />
                                <div className="share-label">Send via SMS</div>
                                <div className="share-sublabel">Text to client's phone</div>
                            </button>
                            <button className="share-btn" onClick={shareViaEmail}>
                                <div className="share-icon" />
                                <div className="share-label">Send via Email</div>
                                <div className="share-sublabel">Professional presentation</div>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ─────────────── Modals ─────────────── */}
            {showGallery && (
                <div className="modal-overlay active" id="galleryModal">
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Mockup Gallery</h2>
                            <button className="modal-close" onClick={() => closeModal('gallery')}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="gallery-grid">
                                {galleryItems.length === 0 && <div style={{ color: '#6b7280', fontSize: 13 }}>No mockups yet.</div>}
                                {galleryItems.map(m => (
                                    <div key={m.id} className="gallery-item">
                                        <div className="gallery-image" style={{ position: 'relative', overflow: 'hidden', borderRadius: 8, aspectRatio: '4/3', background: '#f3f4f6' }}>
                                            {m.current_version?.generated_image_url
                                                ? <AuthedImage src={m.current_version.generated_image_url} alt={m.title || 'Mockup'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: 12 }}>Pending</div>}
                                        </div>
                                        <div className="gallery-info">
                                            <div className="gallery-client">{m.title || 'Untitled mockup'}</div>
                                            <div className="gallery-date">{new Date(m.updated_at).toLocaleDateString()}</div>
                                            <div className="gallery-type">Status: {m.status}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showRecent && (
                <div className="modal-overlay active" id="recentModal">
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Recent Projects</h2>
                            <button className="modal-close" onClick={() => closeModal('recent')}>×</button>
                        </div>
                        <div className="modal-body">
                            {recentItems.length === 0 && <div style={{ color: '#6b7280', fontSize: 13 }}>Nothing recent yet.</div>}
                            {recentItems.map(m => (
                                <div key={m.id} className="recent-item">
                                    <div className="recent-preview" style={{ overflow: 'hidden', borderRadius: 8 }}>
                                        {m.current_version?.generated_image_url
                                            ? <AuthedImage src={m.current_version.generated_image_url} alt={m.title || 'Mockup'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            : null}
                                    </div>
                                    <div className="recent-details">
                                        <div className="recent-title">{m.title || 'Untitled mockup'}</div>
                                        <div className="recent-info">
                                            <span>{new Date(m.updated_at).toLocaleString()}</span>
                                            {' • '}
                                            <span className={m.status === 'approved' ? 'status-approved' : 'status-pending'}>{m.status}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {showTemplates && (
                <div className="modal-overlay active" id="templatesModal">
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Mockup Templates</h2>
                            <button className="modal-close" onClick={() => closeModal('templates')}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ color: '#6b7280', fontSize: 14 }}>Templates feature is coming soon.</div>
                        </div>
                    </div>
                </div>
            )}

            {showTutorial && (
                <div className="modal-overlay active" id="tutorialModal">
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">3D Mockup Studio Tutorial</h2>
                            <button className="modal-close" onClick={() => closeModal('tutorial')}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="tutorial-steps">
                                <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>Quick Start Guide</h3>
                                {[
                                    { num: 1, title: 'Pick or create a client',     desc: 'Mockups are saved per-client so you can re-share them later.' },
                                    { num: 2, title: 'Upload property photo',       desc: 'Front-facing photo, good lighting, minimal shadow.' },
                                    { num: 3, title: 'Select materials & colors',   desc: 'Choose roof, siding, trim and accent colors.' },
                                    { num: 4, title: 'Add AI instructions',         desc: 'Be specific. Process one major change at a time.' },
                                    { num: 5, title: 'Generate & refine',           desc: 'Each click creates a new version you can compare.' },
                                ].map(step => (
                                    <div key={step.num} className="step-item">
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

export default ThreeDMockup;
