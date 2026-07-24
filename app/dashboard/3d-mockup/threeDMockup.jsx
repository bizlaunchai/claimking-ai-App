'use client'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import "./3d-mockup.css"
import dynamic from "next/dynamic";
import axiosInstance from "@/lib/axiosInstance";
import { toast } from "sonner";
import ClientSelector from "@/components/clients/ClientSelector";
import { toClientShape } from "@/lib/clients/newClientForm";
import LocalFileUploader from "../../../utiles/LocalFileUploader.jsx";

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
    // CK-FIX Jul-22: expanded manufacturer catalog
    { brand: 'CertainTeed Landmark', colors: [
        { name: 'Moire Black', value: '#232323' },
        { name: 'Weathered Wood', value: '#8a7561' },
        { name: 'Driftwood', value: '#9a8a76' },
        { name: 'Burnt Sienna', value: '#8a5a3b' },
        { name: 'Resawn Shake', value: '#6e5a44' },
        { name: 'Georgetown Gray', value: '#75726b' },
        { name: 'Colonial Slate', value: '#5d6166' },
        { name: 'Heather Blend', value: '#7d6a58' },
        { name: 'Pewter', value: '#8c8c8a' },
        { name: 'Cottage Red', value: '#7e3b32' },
    ]},
    { brand: 'Atlas Pinnacle Pristine', colors: [
        { name: 'Pristine Black', value: '#1f1f1f' },
        { name: 'Pristine Weathered Wood', value: '#87715c' },
        { name: 'Pristine Desert', value: '#b09a7a' },
        { name: 'Pristine Hearthstone', value: '#6d5f52' },
        { name: 'Pristine Green', value: '#3c4f3d' },
        { name: 'Pristine Blue', value: '#3f5a73' },
        { name: 'Pristine Copper', value: '#9a6b45' },
        { name: 'Pristine Slate', value: '#5b5f63' },
    ]},
    { brand: 'TAMKO Heritage', colors: [
        { name: 'Rustic Black', value: '#262422' },
        { name: 'Rustic Cedar', value: '#8a6a4a' },
        { name: 'Rustic Slate', value: '#5c5e60' },
        { name: 'Weathered Wood', value: '#8b7862' },
        { name: 'Oxford Grey', value: '#77797b' },
        { name: 'Shadow Grey', value: '#909294' },
        { name: 'Virginia Slate', value: '#4f5457' },
    ]},
    { brand: 'IKO Cambridge', colors: [
        { name: 'Dual Black', value: '#242424' },
        { name: 'Driftwood', value: '#98876f' },
        { name: 'Weatherwood', value: '#8d7c67' },
        { name: 'Charcoal Grey', value: '#4d4f51' },
        { name: 'Harvard Slate', value: '#606468' },
        { name: 'Earthtone Cedar', value: '#7d6248' },
        { name: 'Dual Brown', value: '#5f4a38' },
        { name: 'Patriot Slate', value: '#4a5a6a' },
    ]},
];

const SIDING_MATERIALS = ['Vinyl Lap', 'Fiber Cement', 'Wood', 'Board & Batten', 'Brick', 'Stone', 'Other'];

const SIDING_COLORS = [
    { name: 'Arctic White', value: '#ffffff' },
    { name: 'Cream',         value: '#f5f5f0' },
    { name: 'Sterling Gray', value: '#9ca3af' },
    { name: 'Iron Gray',     value: '#4b5563' },
    { name: 'Cape Cod Blue', value: '#5b8fa3' },
    { name: 'Sandstone',     value: '#d4a574' },
    // CK-FIX Jul-22: expanded palette (James Hardie / Mastic / Alside range)
    { name: 'Aged Pewter',   value: '#7b7d78' },
    { name: 'Boothbay Blue', value: '#7295a5' },
    { name: 'Deep Ocean',    value: '#33505e' },
    { name: 'Evening Blue',  value: '#3e4f5f' },
    { name: 'Mountain Sage', value: '#8f9683' },
    { name: 'Heathered Moss',value: '#7d7f5f' },
    { name: 'Khaki Brown',   value: '#8a7a5e' },
    { name: 'Timber Bark',   value: '#6d5f50' },
    { name: 'Cobble Stone',  value: '#b7ab97' },
    { name: 'Navajo Beige',  value: '#d9c7a8' },
    { name: 'Monterey Taupe',value: '#a3937e' },
    { name: 'Countrylane Red', value: '#7e4038' },
    { name: 'Night Gray',    value: '#55575a' },
    { name: 'Light Mist',    value: '#dfe3e2' },
    { name: 'Other',        value: '__other__' },
];

const TRIM_COLORS = [
    { name: 'White',  value: '#ffffff' },
    { name: 'Almond', value: '#f5f5dc' },
    { name: 'Brown',  value: '#8b7355' },
    { name: 'Black',  value: '#2f2f2f' },
    { name: 'Gray',   value: '#808080' },
    { name: 'Copper', value: '#b87333' },
    { name: 'Other',  value: '__other__' },
];

const ACCENT_COLORS = [
    { name: 'Black',           value: '#1a1a1a' },
    { name: 'White',           value: '#ffffff' },
    { name: 'Hunter Green',    value: '#2f4538' },
    { name: 'Navy',            value: '#1e3a5f' },
    { name: 'Burgundy',        value: '#7c1d2e' },
    { name: 'Bronze',          value: '#8b6f47' },
    { name: 'Other',           value: '__other__' },
];

const DOOR_COLORS = [
    { name: 'Classic Red',     value: '#a23737' },
    { name: 'Deep Black',      value: '#1a1a1a' },
    { name: 'Navy Blue',       value: '#1e3a5f' },
    { name: 'Forest Green',    value: '#2f4538' },
    { name: 'Natural Wood',    value: '#8b6f47' },
    { name: 'Crisp White',     value: '#ffffff' },
    { name: 'Other',           value: '__other__' },
];

// CK-FIX Jul-22: popular whole-house color combinations for one-click templates
const MOCKUP_TEMPLATES = [
    { name: 'Modern Farmhouse', desc: 'Black roof, white siding, black trim',
      roofing: { name: 'Onyx Black', value: '#1a1a1a' }, siding: { name: 'Arctic White', value: '#ffffff' }, trim: { name: 'Black', value: '#2f2f2f' }, windows: { name: 'Black', value: '#1a1a1a' } },
    { name: 'Classic Craftsman', desc: 'Weathered wood roof, sage siding, cream trim',
      roofing: { name: 'Weathered Wood', value: '#8b7355' }, siding: { name: 'Mountain Sage', value: '#8f9683' }, trim: { name: 'Almond', value: '#f5f5dc' }, windows: { name: 'White', value: '#ffffff' } },
    { name: 'Coastal Cottage', desc: 'Gray roof, blue siding, white trim',
      roofing: { name: 'Estate Gray', value: '#6b6b6b' }, siding: { name: 'Boothbay Blue', value: '#7295a5' }, trim: { name: 'White', value: '#ffffff' }, windows: { name: 'White', value: '#ffffff' } },
    { name: 'Executive Slate', desc: 'Slate roof, iron gray siding, black accents',
      roofing: { name: 'Colonial Slate', value: '#5d6166' }, siding: { name: 'Iron Gray', value: '#4b5563' }, trim: { name: 'Black', value: '#2f2f2f' }, windows: { name: 'Black', value: '#1a1a1a' } },
    { name: 'Warm Traditional', desc: 'Brown roof, cream siding, brown trim',
      roofing: { name: 'Mission Brown', value: '#7d6144' }, siding: { name: 'Cream', value: '#f5f5f0' }, trim: { name: 'Brown', value: '#8b7355' }, windows: { name: 'White', value: '#ffffff' } },
    { name: 'Deep Forest', desc: 'Hunter green roof, tan siding, white trim',
      roofing: { name: 'Hunter Green', value: '#2f4538' }, siding: { name: 'Navajo Beige', value: '#d9c7a8' }, trim: { name: 'White', value: '#ffffff' }, windows: { name: 'White', value: '#ffffff' } },
    { name: 'Storm Gray', desc: 'Charcoal roof, light mist siding, navy door pop',
      roofing: { name: 'Charcoal', value: '#2d2d2d' }, siding: { name: 'Light Mist', value: '#dfe3e2' }, trim: { name: 'White', value: '#ffffff' }, windows: { name: 'Navy', value: '#1e3a5f' } },
    { name: 'Rustic Cedar', desc: 'Cedar roof, timber bark siding, almond trim',
      roofing: { name: 'Rustic Cedar', value: '#8a6a4a' }, siding: { name: 'Timber Bark', value: '#6d5f50' }, trim: { name: 'Almond', value: '#f5f5dc' }, windows: { name: 'White', value: '#ffffff' } },
    { name: 'Red Door Colonial', desc: 'Black roof, gray siding, classic red accent',
      roofing: { name: 'Moire Black', value: '#232323' }, siding: { name: 'Sterling Gray', value: '#9ca3af' }, trim: { name: 'White', value: '#ffffff' }, windows: { name: 'Classic Red', value: '#a23737' } },
    { name: 'Desert Southwest', desc: 'Terra cotta roof, cobble stone siding',
      roofing: { name: 'Terra Cotta', value: '#a0522d' }, siding: { name: 'Cobble Stone', value: '#b7ab97' }, trim: { name: 'Almond', value: '#f5f5dc' }, windows: { name: 'Bronze', value: '#8b6f47' } },
];

const ROOFING_TYPES = [...SHINGLE_TYPES, 'Other'];

const QUALITY_OPTIONS = [
    { id: 'fast',     label: 'Fast',     time: '~30 seconds — Draft' },
    { id: 'standard', label: 'Standard', time: '~1 minute — Good'   },
    { id: 'premium',  label: 'Premium',  time: '~2 minutes — Best'  },
];

// ──────────────────────────────────────────────────────────────────────────────
//   Authed image — backend /s3/file requires Bearer auth, so a plain <img>
//   won't load it. We fetch as a blob and turn it into an object URL.
//   Module-level cache avoids re-fetching the same src on remount (switching
//   between Original / Result / Split View should be instant).
// ──────────────────────────────────────────────────────────────────────────────
const authedImageCache = new Map();    // src -> blobUrl
const authedImageInflight = new Map(); // src -> Promise<blobUrl>

const AuthedImage = ({ src, alt = '', style, className }) => {
    // Local blob/data URLs don't need auth — render them straight via <img>
    const isLocalUrl = typeof src === 'string' && (src.startsWith('blob:') || src.startsWith('data:'));

    const [blobUrl, setBlobUrl] = useState(() => (src && !isLocalUrl ? authedImageCache.get(src) ?? null : null));
    const [errored, setErrored] = useState(false);

    useEffect(() => {
        if (!src || isLocalUrl) { setBlobUrl(null); return; }

        const cached = authedImageCache.get(src);
        if (cached) {
            setBlobUrl(cached);
            setErrored(false);
            return;
        }

        let active = true;
        setErrored(false);

        let promise = authedImageInflight.get(src);
        if (!promise) {
            promise = axiosInstance
                .get(src, { responseType: 'blob' })
                .then((res) => {
                    const url = URL.createObjectURL(res.data);
                    authedImageCache.set(src, url);
                    authedImageInflight.delete(src);
                    return url;
                })
                .catch((e) => {
                    authedImageInflight.delete(src);
                    throw e;
                });
            authedImageInflight.set(src, promise);
        }

        promise
            .then((url) => { if (active) setBlobUrl(url); })
            .catch(() => { if (active) setErrored(true); });

        return () => { active = false; };
    }, [src, isLocalUrl]);

    if (isLocalUrl) return <img src={src} alt={alt} style={style} className={className} />;
    if (errored) return <div className={className} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>Image unavailable</div>;
    if (!blobUrl) return <div className={className} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>Loading…</div>;
    return <img src={blobUrl} alt={alt} style={style} className={className} />;
};

// ──────────────────────────────────────────────────────────────────────────────
//   Main component
// ──────────────────────────────────────────────────────────────────────────────
const ThreeDMockup = () => {
    // Client selection — internal UI state lives in <ClientSelector/>.
    const [selectedClient, setSelectedClient] = useState(null);

    // ── Mockup configuration ────────────────────────────────────────────────
    const [materialTab, setMaterialTab] = useState('roofing');
    const [selectedShingleType, setSelectedShingleType] = useState('Architectural');
    const [selectedSidingMaterial, setSelectedSidingMaterial] = useState('Vinyl Lap');
    const [selectedColors, setSelectedColors] = useState({
        roofing: null, siding: null, trim: null, accents: null, windows: null, doors: null,
    });
    // "Other" custom text per category (free-form material/color)
    const [otherMaterialText, setOtherMaterialText] = useState({
        roofing: '', siding: '', trim: '', accents: '', windows: '', doors: '',
    });
    const [otherColorText, setOtherColorText] = useState({
        roofing: '', siding: '', trim: '', accents: '', windows: '', doors: '',
    });
    // User-added custom categories (Garage Door, Stone Veneer, etc)
    const [customCategories, setCustomCategories] = useState([]);
    const [showAddCustomCat, setShowAddCustomCat] = useState(false);
    const [newCustomCat, setNewCustomCat] = useState({ name: '', material: '', color: '' });
    const [advanced, setAdvanced] = useState({
        keepRoof: false, ridgeVent: false, shadows: false, wetEffect: false,
    });
    const [aiInstructions, setAiInstructions] = useState('');
    const [selectedQuality, setSelectedQuality] = useState('standard');

    // ── Photo & generation ──────────────────────────────────────────────────
    const [files, setFiles] = useState([]);
    // const sourcePhotoKey = files?.[0]?.serverResponse?.payload?.key || null;
    const sourcePhotoKey = files?.[0]?.preview || null;

    const [currentMockup, setCurrentMockup] = useState(null);
    const [versions, setVersions] = useState([]);
    const [activeVersionId, setActiveVersionId] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewMode, setPreviewMode] = useState('original'); // original | result | split
    const [generationError, setGenerationError] = useState(null); // { title, message, hint } | null
    const [splitPos, setSplitPos] = useState(50); // 0-100, position of split view divider
    const [showFullscreen, setShowFullscreen] = useState(false);
    const splitRef = useRef(null);

    // ── Provider availability  ──────────────────────────────────────────────
    const [providerStatus, setProviderStatus] = useState({});

    // ── Company branding (for watermark + PDF logo) ─────────────────────────
    const [branding, setBranding] = useState({ name: null, logo_url: null, website: null });

    // ── Download progress state per type ────────────────────────────────────
    const [downloading, setDownloading] = useState({ png: false, watermark: false, pdf: false });

    // ── Credits (cost per generation + user's current balance) ─────────────
    const [mockupCost, setMockupCost] = useState(null);     // { credits_cost, is_active, label } | null
    const [creditBalance, setCreditBalance] = useState(null); // { monthly_credits, bonus_credits, ... } | null

    // ── Per-gallery-item split slider position (id -> 0..100) ──────────────
    const [gallerySplitPos, setGallerySplitPos] = useState({});

    // ── Modals + sharing ─────────────────────────────────────────────────────
    const [showGallery, setShowGallery] = useState(false);
    const [showRecent, setShowRecent] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);
    const [showSharing, setShowSharing] = useState(false);
    const [galleryItems, setGalleryItems] = useState([]);
    const [recentItems, setRecentItems] = useState([]);
    const [galleryLoading, setGalleryLoading] = useState(false);
    const [reopening, setReopening] = useState(false);
    // Fullscreen viewer for a single gallery item (Original/Result/Split)
    const [galleryFullscreenItem, setGalleryFullscreenItem] = useState(null);
    const [galleryFsMode, setGalleryFsMode] = useState('split'); // original | result | split
    const [galleryFsSplitPos, setGalleryFsSplitPos] = useState(50);
    const galleryFsSplitRef = useRef(null);

    // ── Derived view-state ──────────────────────────────────────────────────
    const activeVersion = useMemo(
        () => versions.find(v => v.id === activeVersionId) ?? versions.find(v => v.is_current) ?? null,
        [versions, activeVersionId],
    );

    const sourceImageSrc = sourcePhotoKey ?? null;
    const generatedImageSrc = activeVersion?.generated_image_url ?? null;

    // ── Effects: provider status ────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const res = await axiosInstance.get('/mockup/providers');
                setProviderStatus(res.data?.data ?? {});
            } catch { /* ignore */ }
        })();
    }, []);

    // ── Effects: company branding (for watermark + PDF) ─────────────────────
    useEffect(() => {
        (async () => {
            try {
                const res = await axiosInstance.get('/mockup/branding', { suppressErrorToast: true });
                if (res.data?.data) setBranding(res.data.data);
            } catch { /* fall back to defaults if endpoint not available */ }
        })();
    }, []);

    // ── Effects: mockup credit cost + user's balance (refresh after generate) ─
    const refreshCreditsState = useCallback(async () => {
        try {
            const [costRes, balanceRes] = await Promise.all([
                axiosInstance.get('/credits/feature-costs/mockup_generate', { suppressErrorToast: true }),
                axiosInstance.get('/credits/me',                              { suppressErrorToast: true }),
            ]);
            setMockupCost(costRes.data ?? null);
            setCreditBalance(balanceRes.data ?? null);
        } catch {
            // Pre-credit-system installs return 404 — leave both null and
            // we'll skip the credit gate in the UI.
        }
    }, []);

    useEffect(() => { refreshCreditsState(); }, [refreshCreditsState]);

    // Derived view-state for the credit display
    const totalCredits = (creditBalance?.monthly_credits ?? 0) + (creditBalance?.bonus_credits ?? 0);
    const requiredCredits = mockupCost?.credits_cost ?? 0;
    const featureDisabledByAdmin = mockupCost && mockupCost.is_active === false;
    const insufficientCredits = mockupCost && !featureDisabledByAdmin && totalCredits < requiredCredits;
    const creditsKnown = mockupCost !== null && creditBalance !== null;

    // ── Effects: gallery / recent (lazy when modal opens) ──────────────────
    useEffect(() => {
        if (!showGallery && !showRecent) return;
        let cancelled = false;
        setGalleryLoading(true);
        (async () => {
            try {
                const res = await axiosInstance.get('/mockup');
                if (cancelled) return;
                const items = res.data?.data ?? [];
                setGalleryItems(items);
                setRecentItems(items.slice(0, 10));
            } catch { /* axios already toasted */ }
            finally {
                if (!cancelled) setGalleryLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [showGallery, showRecent]);

    // ── Gallery fullscreen split drag handler ────────────────────────────────
    const startGalleryFsSplitDrag = useCallback((e) => {
        e.preventDefault();
        const updateFrom = (clientX) => {
            const el = galleryFsSplitRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const pct = ((clientX - rect.left) / rect.width) * 100;
            setGalleryFsSplitPos(Math.max(0, Math.min(100, pct)));
        };
        const move = (ev) => updateFrom(ev.touches ? ev.touches[0].clientX : ev.clientX);
        const stop = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', stop);
            window.removeEventListener('touchmove', move);
            window.removeEventListener('touchend', stop);
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', stop);
        window.addEventListener('touchmove', move, { passive: false });
        window.addEventListener('touchend', stop);
    }, []);

    // ClientSelector emits the shaped client (or null when cleared).
    const handleClientChange = (shaped) => setSelectedClient(shaped);

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

    // ── Split-view drag handler ──────────────────────────────────────────────
    const updateSplitFromEvent = useCallback((clientX) => {
        const el = splitRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const pct = ((clientX - rect.left) / rect.width) * 100;
        setSplitPos(Math.max(0, Math.min(100, pct)));
    }, []);

    const startSplitDrag = useCallback((e) => {
        e.preventDefault();
        const move = (ev) => {
            const x = ev.touches ? ev.touches[0].clientX : ev.clientX;
            updateSplitFromEvent(x);
        };
        const stop = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', stop);
            window.removeEventListener('touchmove', move);
            window.removeEventListener('touchend', stop);
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', stop);
        window.addEventListener('touchmove', move, { passive: false });
        window.addEventListener('touchend', stop);
    }, [updateSplitFromEvent]);

    // ── Gallery-card split drag (per-item, identified by item id) ──────────
    const startGallerySplitDrag = useCallback((e, itemId, containerEl) => {
        e.preventDefault();
        e.stopPropagation();
        const updateFrom = (clientX) => {
            const rect = containerEl.getBoundingClientRect();
            const pct = ((clientX - rect.left) / rect.width) * 100;
            setGallerySplitPos(prev => ({ ...prev, [itemId]: Math.max(0, Math.min(100, pct)) }));
        };
        const move = (ev) => updateFrom(ev.touches ? ev.touches[0].clientX : ev.clientX);
        const stop = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', stop);
            window.removeEventListener('touchmove', move);
            window.removeEventListener('touchend', stop);
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', stop);
        window.addEventListener('touchmove', move, { passive: false });
        window.addEventListener('touchend', stop);
    }, []);

    // ────────────────────────────────────────────────────────────────────────
    //   Build the material_settings JSON the backend expects
    // ────────────────────────────────────────────────────────────────────────
    const buildMaterialSettings = useCallback(() => {
        const toPick = (cat) => {
            const c = selectedColors[cat];
            if (!c) return null;
            // If user picked "Other" swatch, use the free-text color they typed
            if (c.value === '__other__') {
                return { color: otherColorText[cat] || 'custom', hex: null, is_other: true };
            }
            return { color: c.name, hex: c.value };
        };
        const roofingPick = toPick('roofing');
        const shingleType = selectedShingleType === 'Other'
            ? (otherMaterialText.roofing || 'custom shingle')
            : selectedShingleType;
        const sidingMat = selectedSidingMaterial === 'Other'
            ? (otherMaterialText.siding || 'custom siding')
            : selectedSidingMaterial;

        return {
            shingleType,
            shingleType_is_other: selectedShingleType === 'Other',
            roofing: roofingPick ? { ...roofingPick, brand: selectedColors.roofing?.brand ?? null } : null,
            siding: selectedColors.siding
                ? {
                    color: selectedColors.siding.value === '__other__' ? (otherColorText.siding || 'custom') : selectedColors.siding.name,
                    hex: selectedColors.siding.value === '__other__' ? null : selectedColors.siding.value,
                    material: sidingMat,
                    is_other: selectedColors.siding.value === '__other__' || selectedSidingMaterial === 'Other',
                  }
                : null,
            trim:    toPick('trim'),
            accents: toPick('accents'),
            windows: toPick('windows'),
            doors:   toPick('doors'),
            customCategories: customCategories.map(c => ({
                category_name: c.name,
                is_custom: true,
                material: c.material || null,
                color: c.color || null,
            })),
            advanced,
        };
    }, [selectedColors, selectedShingleType, selectedSidingMaterial, advanced, otherMaterialText, otherColorText, customCategories]);

    // Build a verbatim "changes to apply" block to append to AI instructions —
    // ensures the "Other" + custom-category free text reaches Gemini exactly as typed.
    const buildOtherInstructionsBlock = useCallback(() => {
        const lines = [];
        if (selectedShingleType === 'Other' && otherMaterialText.roofing) {
            lines.push(`- Roofing material: ${otherMaterialText.roofing}`);
        }
        if (selectedSidingMaterial === 'Other' && otherMaterialText.siding) {
            lines.push(`- Siding material: ${otherMaterialText.siding}`);
        }
        ['roofing', 'siding', 'trim', 'accents', 'windows', 'doors'].forEach(cat => {
            const c = selectedColors[cat];
            if (c && c.value === '__other__' && otherColorText[cat]) {
                lines.push(`- ${cat.charAt(0).toUpperCase() + cat.slice(1)} color: ${otherColorText[cat]}`);
            }
        });
        customCategories.forEach(c => {
            if (!c.name) return;
            const parts = [];
            if (c.material) parts.push(c.material);
            if (c.color) parts.push(`in ${c.color}`);
            lines.push(`- ${c.name}: ${parts.join(' ') || '(see notes)'}`);
        });
        return lines.length ? `\n\nAdditional custom changes:\n${lines.join('\n')}` : '';
    }, [selectedShingleType, selectedSidingMaterial, otherMaterialText, otherColorText, selectedColors, customCategories]);

    // ────────────────────────────────────────────────────────────────────────
    //   Map a backend / network error to an inline panel message.
    //   Toast is already handled globally by axiosInstance — this is the
    //   sticky banner inside the preview panel so the user can read it.
    // ────────────────────────────────────────────────────────────────────────
    const buildGenerationError = (err) => {
        const status = err?.response?.status ?? 0;
        const raw = (err?.userMessage ?? err?.message ?? '').toString();
        const lower = raw.toLowerCase();

        if (status === 402 || lower.includes('insufficient credits')) {
            const required = err?.response?.data?.required ?? requiredCredits;
            const available = err?.response?.data?.available ?? totalCredits;
            return {
                title: 'Not enough credits',
                message: `This action needs ${required} credits — you have ${available}.`,
                hint: 'Buy more credits, upgrade your plan in Billing, or ask your admin to top you up.',
            };
        }

        if (status === 403 && lower.includes('disabled by admin')) {
            return {
                title: 'Feature disabled',
                message: raw || 'This feature is currently disabled by your admin.',
                hint: 'Reach out to your admin to re-enable 3D Mockup generation.',
            };
        }

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
        const localFile = files?.[0]?.file ?? null;
        if (!localFile) { toast.error('Upload a property photo first'); return; }
        if (isGenerating) return;

        // Low-balance confirm gate (spec: warn when < 25 credits remaining)
        if (creditsKnown && requiredCredits > 0 && totalCredits >= requiredCredits && totalCredits < 25) {
            const remaining = (totalCredits - requiredCredits).toFixed(2).replace(/\.?0+$/, '');
            const ok = window.confirm(
                `Low credit balance.\n\nThis will use ${requiredCredits} credits.\nYou'll have ${remaining} credits remaining.\n\nContinue?`,
            );
            if (!ok) return;
        }

        setIsGenerating(true);
        setGenerationError(null);
        try {
            const formData = new FormData();
            formData.append('source_photo', localFile);
            if (currentMockup?.id) formData.append('mockup_id', currentMockup.id);
            if (selectedClient?.id) formData.append('client_id', selectedClient.id);
            formData.append('material_settings', JSON.stringify(buildMaterialSettings()));
            const fullInstructions = `${aiInstructions || ''}${buildOtherInstructionsBlock()}`.trim();
            if (fullInstructions) formData.append('ai_instructions', fullInstructions);
            formData.append('quality', selectedQuality);
            if (selectedClient) formData.append('title', `${selectedClient.name} — Mockup`);

            const res = await axiosInstance.post('/mockup/generate', formData);
            const mockup = res.data?.data?.mockup;
            const version = res.data?.data?.version;
            const credits = res.data?.data?.credits;

            setCurrentMockup(mockup);
            setVersions(prev => {
                const filtered = prev.filter(v => v.id !== version.id).map(v => ({ ...v, is_current: false }));
                return [...filtered, version];
            });
            setActiveVersionId(version.id);
            setPreviewMode('result');

            // Sync local credit balance from the server response (saves a round-trip).
            if (credits?.balance_after) {
                setCreditBalance(prev => ({
                    ...(prev ?? {}),
                    monthly_credits: credits.balance_after.monthly,
                    bonus_credits:   credits.balance_after.bonus,
                }));
            } else {
                refreshCreditsState();
            }

            toast.success(
                credits?.cost
                    ? `Mockup generated — ${credits.cost} credits used`
                    : 'Mockup generated',
            );
        } catch (err) {
            setGenerationError(buildGenerationError(err));
            // 402 changed nothing on the server, but other errors might have —
            // refresh to stay in sync.
            if (err?.response?.status !== 402) refreshCreditsState();
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

    // Flip mockup.is_visible_in_portal. Backend keeps the timeline event
    // in sync, so the homeowner's portal updates atomically. Mockups
    // default to HIDDEN — the contractor opts in per spec, so they can
    // generate multiple drafts without leaking any to the homeowner.
    const togglePortalVisibility = async () => {
        if (!currentMockup) { toast.error('Generate a mockup first'); return; }
        const next = !(currentMockup.is_visible_in_portal === true);
        // Optimistic update so the button label changes instantly.
        setCurrentMockup((m) => (m ? { ...m, is_visible_in_portal: next } : m));
        try {
            await axiosInstance.patch(
                `/mockup/${currentMockup.id}/visibility`,
                { visible: next },
            );
            toast.success(next
                ? 'Mockup is now visible on the client portal'
                : 'Mockup hidden from the client portal',
            );
        } catch {
            // Roll back optimistic change on failure
            setCurrentMockup((m) => (m ? { ...m, is_visible_in_portal: !next } : m));
        }
    };

    // CK-FIX Jul-22: Refine Further now jumps you into the AI instructions box
    const refineMore = () => {
        const el = document.querySelector('textarea[placeholder*="instruction" i], textarea[placeholder*="AI" i], #ai-instructions');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => el.focus(), 350);
            toast.info('Describe your changes, then click Generate Mockup for a new version.');
        } else {
            toast.info('Tweak materials or AI instructions, then click Generate Mockup again.');
        }
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

    // CK-FIX Jul-22: Save as Template — persisted PER COMPANY via
    // /mockup/templates (sql/71_mockup_templates.sql). Was localStorage, so a
    // saved combo vanished on the next machine and teammates never saw it.
    const [myTemplates, setMyTemplates] = useState([]);
    const loadMyTemplates = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/mockup/templates', { suppressErrorToast: true });
            setMyTemplates(res.data?.data ?? []);
        } catch {
            setMyTemplates([]);   // saved templates are additive — an empty list is a safe fallback
        }
    }, []);
    useEffect(() => { loadMyTemplates(); }, [loadMyTemplates]);

    const saveTemplate = async () => {
        const hasColor = Object.values(selectedColors).some(Boolean);
        if (!hasColor) { toast.error('Pick at least one color first, then save as a template'); return; }
        const name = prompt('Template name:', 'My Color Combo');
        if (!name) return;
        try {
            await axiosInstance.post('/mockup/templates', {
                name: name.trim().slice(0, 80),
                colors: selectedColors,
                instructions: aiInstructions?.trim() || undefined,
            });
            await loadMyTemplates();
            toast.success(`Template "${name}" saved — find it under Mockup Templates`);
        } catch {
            // axios interceptor already showed the error
        }
    };
    const deleteMyTemplate = async (tpl) => {
        try {
            await axiosInstance.delete(`/mockup/templates/${tpl.id}`);
            setMyTemplates((list) => list.filter((t) => t.id !== tpl.id));
        } catch {
            // handled by interceptor
        }
    };
    const applyTemplate = (t) => {
        setSelectedColors({
            roofing: t.roofing ?? t.colors?.roofing ?? null,
            siding:  t.siding  ?? t.colors?.siding  ?? null,
            trim:    t.trim    ?? t.colors?.trim    ?? null,
            windows: t.windows ?? t.colors?.windows ?? null,
        });
        if (t.instructions) setAiInstructions(t.instructions);
        setShowTemplates(false);
        // Usage drives the "most used first" ordering. Fire-and-forget: a
        // failed counter must never block applying the colours.
        if (t.id) {
            axiosInstance
                .post(`/mockup/templates/${t.id}/used`, {}, { suppressErrorToast: true })
                .catch(() => {});
        }
        toast.success(`Applied "${t.name}" — click Generate Mockup`);
    };
    // CK-FIX Jul-22: Save to Client Profile — makes the mockup portal-visible
    // for the selected client without emailing them.
    // CK-FIX Jul-22: AI color-list import — upload up to 10 manufacturer
    // files/images; Gemini vision extracts the swatches into an editable
    // custom palette. Backend: POST /mockup/colors/import (one file per
    // request) → { data: { colors: [{ name, value }], manufacturer, ... } }.
    const [colorImportModal, setColorImportModal] = useState(false);
    const [colorImportFiles, setColorImportFiles] = useState([]);
    const [colorImportBusy, setColorImportBusy] = useState(false);
    const [colorImportProgress, setColorImportProgress] = useState(null);
    // "My Colors" — the company's own palette, stored server-side (sql/73).
    // Was localStorage, so a palette imported on the desktop didn't exist on
    // the laptop or for anyone else on the crew.
    const [customColors, setCustomColors] = useState([]);
    const loadCustomColors = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/mockup/colors', { suppressErrorToast: true });
            setCustomColors(res.data?.data ?? []);
        } catch {
            setCustomColors([]);   // the palette is additive; empty is a safe fallback
        }
    }, []);
    useEffect(() => { loadCustomColors(); }, [loadCustomColors]);

    /** Edit one swatch's hex. Optimistic — a colour picker that lags is unusable. */
    const updateCustomColor = async (color, value) => {
        setCustomColors((list) => list.map((c) => c.id === color.id ? { ...c, value } : c));
        try {
            await axiosInstance.patch(`/mockup/colors/${color.id}`, { value },
                { suppressErrorToast: true });
        } catch {
            setCustomColors((list) => list.map((c) => c.id === color.id ? { ...c, value: color.value } : c));
            toast.error('Could not save that colour');
        }
    };

    const deleteCustomColor = async (color) => {
        const prev = customColors;
        setCustomColors((list) => list.filter((c) => c.id !== color.id));
        try {
            await axiosInstance.delete(`/mockup/colors/${color.id}`, { suppressErrorToast: true });
        } catch {
            setCustomColors(prev);
            toast.error('Could not remove that colour');
        }
    };
    const runColorImport = async () => {
        if (colorImportFiles.length === 0) { toast.error('Add at least one file'); return; }
        setColorImportBusy(true);
        // Sequential, one request per file: a chart the AI can't read fails
        // alone instead of taking the whole batch with it, and the progress
        // counter stays honest.
        const files = colorImportFiles.slice(0, 10);
        const imported = [];
        let failed = 0;
        let firstError = null;
        try {
            for (let i = 0; i < files.length; i++) {
                setColorImportProgress(`Reading ${i + 1} / ${files.length}...`);
                const fd = new FormData();
                fd.append('file', files[i]);
                try {
                    const res = await axiosInstance.post('/mockup/colors/import', fd, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                        suppressErrorToast: true,
                    });
                    const payload = res?.data?.data ?? {};
                    for (const c of payload.colors ?? []) {
                        imported.push({
                            name: c.name || 'Imported',
                            value: c.value || '#cccccc',
                            // Provenance travels with the swatch so the palette
                            // can say where a colour came from later.
                            manufacturer: payload.manufacturer || undefined,
                            product_line: payload.product_line || undefined,
                            source_file: payload.source_file || files[i]?.name,
                        });
                    }
                } catch (e) {
                    failed++;
                    firstError = firstError || e?.userMessage;
                }
            }

            if (imported.length === 0) {
                toast.error(
                    failed
                        ? `Could not read ${failed === files.length ? 'those files' : 'some files'}`
                        : 'No color swatches found in those files',
                    { description: firstError || undefined },
                );
                return;
            }

            // The server upserts by name, so re-importing an updated chart
            // refreshes a swatch instead of stacking a duplicate. Only the new
            // rows are sent — untouched colours are left alone server-side.
            try {
                await axiosInstance.post('/mockup/colors', { colors: imported });
            } catch {
                return;   // interceptor already showed the error
            }
            await loadCustomColors();
            toast.success(`Imported ${imported.length} colors — check "My Colors" and adjust any swatch`, {
                description: failed ? `${failed} file(s) could not be read.` : undefined,
            });
            setColorImportModal(false); setColorImportFiles([]);
        } finally {
            setColorImportBusy(false);
            setColorImportProgress(null);
        }
    };

    const saveToClientProfile = async () => {
        if (!currentMockup) { toast.error('Generate a mockup first'); return; }
        if (!selectedClient) { toast.error('Pick a client first'); return; }
        try {
            await axiosInstance.patch(`/mockup/${currentMockup.id}/visibility`, { visible: true });
            setCurrentMockup((m) => (m ? { ...m, is_visible_in_portal: true } : m));
            toast.success(`Saved to ${selectedClient.name}'s profile — visible in their portal`);
        } catch {
            toast.error('Could not save to client profile');
        }
    };
    const shareViaSMS   = () => toast.info('SMS sharing: coming soon.');

    // ────────────────────────────────────────────────────────────────────────
    //   Share with client via email — pushes to portal + emails homeowner
    // ────────────────────────────────────────────────────────────────────────
    const shareViaEmail = async () => {
        if (!currentMockup) { toast.error('Generate a mockup first'); return; }
        if (!selectedClient) { toast.error('Pick a client first'); return; }
        try {
            await axiosInstance.post(`/mockup/${currentMockup.id}/share-email`, {
                client_id: selectedClient.id,
            });
            // Auto-make portal-visible since we just emailed the client
            if (!currentMockup.is_visible_in_portal) {
                await axiosInstance.patch(`/mockup/${currentMockup.id}/visibility`, { visible: true });
                setCurrentMockup(m => m ? { ...m, is_visible_in_portal: true } : m);
            }
            toast.success(`Mockup emailed to ${selectedClient.name}`);
        } catch (err) {
            // Fall back if backend endpoint not yet wired
            if (err?.response?.status === 404) {
                toast.info('Email sharing endpoint not yet available — share the portal link manually for now.');
            }
        }
    };

    // ────────────────────────────────────────────────────────────────────────
    //   Download options: PNG / Watermarked PNG / PDF with logo
    // ────────────────────────────────────────────────────────────────────────
    const fetchImageBlob = async (src) => {
        const res = await axiosInstance.get(src, { responseType: 'blob' });
        return res.data;
    };

    const triggerDownload = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const downloadFilename = (suffix, ext) => {
        const safe = (selectedClient?.name || 'mockup').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
        const ver = activeVersion?.version_number ? `_v${activeVersion.version_number}` : '';
        return `${safe}${ver}_${suffix}.${ext}`;
    };

    const downloadHighRes = async () => {
        if (!generatedImageSrc) { toast.error('Generate a mockup first'); return; }
        if (downloading.png) return;
        setDownloading(d => ({ ...d, png: true }));
        const toastId = toast.loading('Preparing high-res PNG…');
        try {
            const blob = await fetchImageBlob(generatedImageSrc);
            triggerDownload(blob, downloadFilename('mockup', 'png'));
            toast.success('PNG downloaded', { id: toastId });
        } catch {
            toast.error('Download failed', { id: toastId });
        } finally {
            setDownloading(d => ({ ...d, png: false }));
        }
    };

    // Load an image source as an HTMLImageElement for canvas operations.
    // Used for both the mockup image and the contractor's logo overlay.
    const loadImageElement = (src) => new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload  = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });

    // Fetch the contractor logo as a blob URL (their S3 url often needs the
    // authed proxy, plus crossOrigin works more reliably on a same-origin blob).
    const loadBrandingLogo = async () => {
        if (!branding.logo_url) return null;
        try {
            // Logos may be public S3 or proxied — try axios first, fall back to direct
            try {
                const blob = await fetchImageBlob(branding.logo_url);
                return await loadImageElement(URL.createObjectURL(blob));
            } catch {
                return await loadImageElement(branding.logo_url);
            }
        } catch {
            return null;
        }
    };

    const drawImageToCanvas = (src) => new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve({ canvas, ctx, img });
        };
        img.onerror = reject;
        img.src = src;
    });

    const downloadWatermarked = async () => {
        if (!generatedImageSrc) { toast.error('Generate a mockup first'); return; }
        if (downloading.watermark) return;
        setDownloading(d => ({ ...d, watermark: true }));
        const toastId = toast.loading('Adding watermark…');
        try {
            const blob = await fetchImageBlob(generatedImageSrc);
            const blobUrl = URL.createObjectURL(blob);
            const { canvas, ctx } = await drawImageToCanvas(blobUrl);
            URL.revokeObjectURL(blobUrl);

            const companyName = branding.name || 'Mockup Preview';
            const logoImg = await loadBrandingLogo();

            // Subtle diagonal watermark of the contractor's company name
            const w = canvas.width, h = canvas.height;
            ctx.save();
            ctx.globalAlpha = 0.16;
            ctx.fillStyle = '#1a1f3a';
            ctx.font = `bold ${Math.floor(w / 24)}px Inter, Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.translate(w / 2, h / 2);
            ctx.rotate(-Math.PI / 6);
            const text = `${companyName} · Preview`;
            const tile = Math.floor(w / 3.5);
            for (let y = -h; y < h; y += tile) {
                for (let x = -w; x < w; x += tile * 1.6) {
                    ctx.fillText(text, x, y);
                }
            }
            ctx.restore();

            // Bottom branded bar — contractor logo + name
            ctx.save();
            const bh = Math.max(40, Math.floor(h / 16));
            ctx.fillStyle = 'rgba(26, 31, 58, 0.9)';
            ctx.fillRect(0, h - bh, w, bh);

            const pad = Math.floor(bh * 0.2);
            let textX = pad;
            if (logoImg) {
                const logoH = bh - pad * 2;
                const logoW = (logoImg.width / logoImg.height) * logoH;
                ctx.drawImage(logoImg, pad, h - bh + pad, logoW, logoH);
                textX = pad + logoW + pad;
            }
            ctx.fillStyle = '#ffffff';
            ctx.font = `600 ${Math.floor(bh * 0.42)}px Inter, Arial, sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${companyName} — AI Mockup Preview`, textX, h - bh / 2);
            ctx.restore();

            await new Promise((resolve) => {
                canvas.toBlob((wmBlob) => {
                    if (wmBlob) {
                        triggerDownload(wmBlob, downloadFilename('mockup_watermarked', 'png'));
                        toast.success('Watermarked PNG downloaded', { id: toastId });
                    } else {
                        toast.error('Watermark generation failed', { id: toastId });
                    }
                    resolve();
                }, 'image/png');
            });
        } catch {
            toast.error('Watermark download failed', { id: toastId });
        } finally {
            setDownloading(d => ({ ...d, watermark: false }));
        }
    };

    const downloadPDF = async () => {
        if (!generatedImageSrc) { toast.error('Generate a mockup first'); return; }
        if (downloading.pdf) return;
        setDownloading(d => ({ ...d, pdf: true }));
        const toastId = toast.loading('Building PDF…');
        try {
            const { default: jsPDF } = await import('jspdf');
            const blob = await fetchImageBlob(generatedImageSrc);
            const blobUrl = URL.createObjectURL(blob);
            const { canvas } = await drawImageToCanvas(blobUrl);
            URL.revokeObjectURL(blobUrl);

            const companyName = branding.name || 'Mockup';
            const logoImg = await loadBrandingLogo();

            // Letter-size landscape PDF with header band + footer
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();

            // Header band — contractor branded
            const headerH = 64;
            pdf.setFillColor(26, 31, 58);
            pdf.rect(0, 0, pageW, headerH, 'F');

            let titleX = 24;
            if (logoImg) {
                // Render the contractor logo to a temp canvas → dataURL for jsPDF
                const logoH = headerH - 16;
                const logoW = (logoImg.width / logoImg.height) * logoH;
                const lc = document.createElement('canvas');
                lc.width = logoImg.naturalWidth;
                lc.height = logoImg.naturalHeight;
                lc.getContext('2d').drawImage(logoImg, 0, 0);
                try {
                    const logoData = lc.toDataURL('image/png');
                    pdf.addImage(logoData, 'PNG', 16, 8, logoW, logoH);
                    titleX = 16 + logoW + 12;
                } catch { /* tainted canvas — fall back to text-only */ }
            }

            pdf.setTextColor(253, 184, 19);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(16);
            pdf.text(`${companyName} — 3D Mockup`, titleX, 36);
            pdf.setTextColor(255, 255, 255);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            pdf.text(new Date().toLocaleDateString(), pageW - 24, 36, { align: 'right' });

            // Client meta
            pdf.setTextColor(31, 41, 55);
            pdf.setFontSize(11);
            let y = headerH + 22;
            if (selectedClient?.name) {
                pdf.setFont('helvetica', 'bold');
                pdf.text('Client: ', 24, y);
                pdf.setFont('helvetica', 'normal');
                pdf.text(selectedClient.name, 70, y);
                y += 16;
            }
            if (selectedClient?.address) {
                pdf.setFont('helvetica', 'bold');
                pdf.text('Address: ', 24, y);
                pdf.setFont('helvetica', 'normal');
                pdf.text(selectedClient.address, 80, y);
                y += 16;
            }

            // Image (fit inside remaining page area)
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            const availH = pageH - y - 40;
            const availW = pageW - 48;
            const ratio = canvas.width / canvas.height;
            let drawW = availW, drawH = availW / ratio;
            if (drawH > availH) { drawH = availH; drawW = availH * ratio; }
            const drawX = (pageW - drawW) / 2;
            pdf.addImage(imgData, 'JPEG', drawX, y + 4, drawW, drawH);

            // Footer — contractor + ClaimKing attribution
            pdf.setFontSize(9);
            pdf.setTextColor(107, 114, 128);
            const footerLeft = `Prepared by ${companyName}${branding.website ? ' · ' + branding.website : ''}`;
            pdf.text(footerLeft, 24, pageH - 14);
            pdf.text('Powered by ClaimKing.AI', pageW - 24, pageH - 14, { align: 'right' });

            pdf.save(downloadFilename('mockup', 'pdf'));
            toast.success('PDF downloaded', { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error('PDF download failed', { id: toastId });
        } finally {
            setDownloading(d => ({ ...d, pdf: false }));
        }
    };

    // ────────────────────────────────────────────────────────────────────────
    //   Custom category handlers
    // ────────────────────────────────────────────────────────────────────────
    const addCustomCategory = () => {
        const name = newCustomCat.name.trim();
        if (!name) { toast.error('Category name is required'); return; }
        setCustomCategories(prev => [
            ...prev,
            { id: `cc_${Date.now()}`, name, material: newCustomCat.material.trim(), color: newCustomCat.color.trim() },
        ]);
        setNewCustomCat({ name: '', material: '', color: '' });
        setShowAddCustomCat(false);
        toast.success(`Added "${name}"`);
    };

    const removeCustomCategory = (id) =>
        setCustomCategories(prev => prev.filter(c => c.id !== id));

    const updateCustomCategory = (id, field, value) =>
        setCustomCategories(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));

    // ────────────────────────────────────────────────────────────────────────
    //   Reopen a mockup from gallery — load state for regenerate-from-existing
    // ────────────────────────────────────────────────────────────────────────
    const reopenMockup = async (m) => {
        if (reopening) return;
        setReopening(true);
        try {
            const res = await axiosInstance.get(`/mockup/${m.id}`);
            const full = res.data?.data ?? m;
            setCurrentMockup(full);
            setVersions(full.versions || (full.current_version ? [full.current_version] : []));
            setActiveVersionId(full.current_version?.id || null);

            // Restore selected client from the mockup record if we have it
            if (full.client_id && full.client) {
                setSelectedClient(toClientShape(full.client));
            }

            // Restore material selections from saved snapshot
            const ms = full.material_settings || {};
            if (ms.shingleType) setSelectedShingleType(ms.shingleType);
            if (ms.siding?.material) setSelectedSidingMaterial(ms.siding.material);
            setSelectedColors({
                roofing: ms.roofing ? { name: ms.roofing.color, value: ms.roofing.hex, brand: ms.roofing.brand } : null,
                siding:  ms.siding  ? { name: ms.siding.color,  value: ms.siding.hex }  : null,
                trim:    ms.trim    ? { name: ms.trim.color,    value: ms.trim.hex }    : null,
                accents: ms.accents ? { name: ms.accents.color, value: ms.accents.hex } : null,
                windows: ms.windows ? { name: ms.windows.color, value: ms.windows.hex } : null,
                doors:   ms.doors   ? { name: ms.doors.color,   value: ms.doors.hex }   : null,
            });
            if (Array.isArray(ms.customCategories)) {
                setCustomCategories(ms.customCategories.map((c, i) => ({
                    id: `cc_loaded_${i}`,
                    name: c.category_name || '',
                    material: c.material || '',
                    color: c.color || '',
                })));
            }
            if (ms.advanced) setAdvanced(ms.advanced);
            if (full.ai_instructions) setAiInstructions(full.ai_instructions);

            // Load source photo as a pseudo-file entry so the preview shows it
            if (full.source_photo_url) {
                setFiles([{
                    id: `reopened-${full.id}`,
                    name: 'source-photo.jpg',
                    preview: full.source_photo_url,
                    file: null,
                    serverResponse: { payload: { key: full.source_photo_key } },
                }]);
            }
            setPreviewMode('split');
            setShowGallery(false);
            setShowRecent(false);
            toast.success(`Reopened: ${full.title || 'mockup'}`);
        } catch {
            toast.error('Could not reopen mockup');
        } finally {
            setReopening(false);
        }
    };

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
                            {creditsKnown && (
                                <div
                                    className="mockup-3d-status-badge active"
                                    style={{
                                        background: insufficientCredits
                                            ? 'linear-gradient(135deg, #fef2f2, #fff)'
                                            : 'linear-gradient(135deg, #f0fdf4, #fff)',
                                        borderColor: insufficientCredits ? '#fecaca' : '#bbf7d0',
                                        color: insufficientCredits ? '#991b1b' : '#166534',
                                        fontWeight: 600,
                                    }}
                                    title={`Monthly: ${creditBalance.monthly_credits ?? 0} • Bonus: ${creditBalance.bonus_credits ?? 0}`}
                                >
                                    {totalCredits} credits
                                    {requiredCredits > 0 && ` • ${requiredCredits}/run`}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="mockup-3d-header-actions">
                        <button className="btn btn-outline" onClick={() => setShowGallery(true)}>View Mockup Gallery</button>
                        <button className="btn btn-outline" onClick={() => setShowRecent(true)}>Recent Projects</button>
                        <button className="btn btn-outline" onClick={() => setShowTemplates(true)}>Mockup Templates</button>
                        <button className="btn btn-outline" onClick={() => setColorImportModal(true)}>Import Colors (AI)</button>
                        <button className="btn btn-outline" onClick={() => setShowTutorial(true)}>Tutorial</button>
                    </div>
                </div>
            </div>

            <div className="main-container">
                {/* ─────────────── Client selection (shared component) ─────────────── */}
                <ClientSelector
                    client={selectedClient}
                    onChange={handleClientChange}
                    scrollId="mockupClientSection"
                    selectedExtraActions={(
                        <>
                            <a href="#" className="cs-action-link" onClick={(e) => e.preventDefault()}>View Previous Mockups</a>
                            <a href="#" className="cs-action-link" onClick={(e) => e.preventDefault()}>Client Preferences</a>
                        </>
                    )}
                />


                {/* ─────────────── Mockup interface ─────────────── */}
                <div className="mockup-interface">
                    {/* Left panel — photo upload */}
                    <div className="panel-card">
                        <h3 className="panel-header">Photo Upload & Management</h3>

                        {/*<FileUploader
                            label="Upload Property Photo"
                            files={files}
                            setFiles={setFiles}
                            allowedExtensions={['.jpg', '.jpeg', '.png', '.heif']}
                            maxFiles={1}
                            maxSizeMB={50}
                            uploadFolderName="mockup-sources"
                        />*/}

                        <LocalFileUploader
                            label="Upload Property Photo"
                            files={files}
                            setFiles={setFiles}
                            allowedExtensions={['.jpg', '.jpeg', '.png', '.heif']}
                            maxFiles={1}
                            maxSizeMB={50}
                            uploadFolderName="mockup-sources"
                        />
                        {/* CK-FIX Jul-22: explicit upload button (drag-only was a mobile blocker) */}
                        <input
                            type="file" id="ck-browse-photo" accept=".jpg,.jpeg,.png,.heif" style={{ display: 'none' }}
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                setFiles([{ id: `local-${Date.now()}`, file: f, name: f.name, valid: true, previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : '' }]);
                                e.target.value = '';
                            }}
                        />
                        <button
                            type="button" className="btn btn-outline" style={{ width: '100%', marginTop: 8 }}
                            onClick={() => document.getElementById('ck-browse-photo')?.click()}
                        >Browse Files to Upload</button>

                        {sourcePhotoKey && (
                            <>
                                <div className="photo-display active" style={{ marginTop: 12 }}>
                                    <div className="photo-preview" style={{ aspectRatio: '4/3', overflow: 'hidden', borderRadius: 8, background: '#f3f4f6' }}>
                                        <AuthedImage src={sourcePhotoKey} alt="Source" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                    <div className="panel-card" style={{ position: 'relative' }}>
                        <h3 className="panel-header">Material & Color Customization</h3>

                        {!sourcePhotoKey && (
                            <div style={{
                                background: '#fef9e6',
                                border: '1px dashed #FDB813',
                                borderRadius: 8,
                                padding: '1rem',
                                color: '#92400e',
                                fontSize: 13,
                                textAlign: 'center',
                                marginBottom: '1rem',
                                fontWeight: 500,
                            }}>
                                Upload a property photo first to unlock material, color &amp; AI instruction options.
                            </div>
                        )}

                        <div
                            style={{
                                opacity: sourcePhotoKey ? 1 : 0.45,
                                pointerEvents: sourcePhotoKey ? 'auto' : 'none',
                                filter: sourcePhotoKey ? 'none' : 'grayscale(0.3)',
                                transition: 'opacity 0.2s ease',
                            }}
                            aria-disabled={!sourcePhotoKey}
                        >
                        <div className="material-tabs">
                            {[
                                ['roofing', 'Roofing'],
                                ['siding', 'Siding'],
                                ['trim', 'Trim'],
                                ['accents', 'Accents'],
                                ['windows', 'Windows'],
                                ['doors', 'Doors'],
                                ['custom', `Custom${customCategories.length ? ` (${customCategories.length})` : ''}`],
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
                                        {ROOFING_TYPES.map(type => (
                                            <button key={type}
                                                    className={`shingle-type-btn ${selectedShingleType === type ? 'selected' : ''}`}
                                                    onClick={() => setSelectedShingleType(type)}>{type}</button>
                                        ))}
                                    </div>
                                    {selectedShingleType === 'Other' && (
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder='e.g. "Cedar Shake - Natural" or "Standing Seam Metal - Galvalume"'
                                            value={otherMaterialText.roofing}
                                            onChange={e => setOtherMaterialText(p => ({ ...p, roofing: e.target.value }))}
                                            style={{ width: '100%', marginBottom: '1rem' }}
                                        />
                                    )}
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

                                <div className="color-section">
                                    <div className="color-brand">Other Color</div>
                                    <div className="color-grid">
                                        <div
                                            className={`color-swatch ${selectedColors.roofing?.value === '__other__' ? 'selected' : ''}`}
                                            onClick={() => selectColor('roofing', { name: 'Other', value: '__other__' })}
                                        >
                                            <div className="swatch-color" style={{ background: 'repeating-linear-gradient(45deg,#e5e7eb,#e5e7eb 5px,#f9fafb 5px,#f9fafb 10px)' }} />
                                            <div className="swatch-name">Other</div>
                                        </div>
                                    </div>
                                    {selectedColors.roofing?.value === '__other__' && (
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder='e.g. "Custom slate gray with copper undertone"'
                                            value={otherColorText.roofing}
                                            onChange={e => setOtherColorText(p => ({ ...p, roofing: e.target.value }))}
                                            style={{ width: '100%' }}
                                        />
                                    )}
                                </div>

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
                                    {selectedSidingMaterial === 'Other' && (
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder='e.g. "James Hardie Lap Siding" or "Reclaimed Barnwood"'
                                            value={otherMaterialText.siding}
                                            onChange={e => setOtherMaterialText(p => ({ ...p, siding: e.target.value }))}
                                            style={{ width: '100%', marginTop: '0.75rem' }}
                                        />
                                    )}
                                </div>

                                <div className="color-section">
                                    <div className="color-brand">Popular Colors</div>
                                    <div className="color-grid">
                                        {SIDING_COLORS.map(color => (
                                            <div key={color.name}
                                                 className={`color-swatch ${selectedColors.siding?.name === color.name ? 'selected' : ''}`}
                                                 onClick={() => selectColor('siding', color)}>
                                                <div className="swatch-color" style={{ background: color.value === '__other__' ? 'repeating-linear-gradient(45deg,#e5e7eb,#e5e7eb 5px,#f9fafb 5px,#f9fafb 10px)' : color.value }} />
                                                <div className="swatch-name">{color.name}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {selectedColors.siding?.value === '__other__' && (
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder='e.g. "Iron Gray" or "Sage with cream trim"'
                                            value={otherColorText.siding}
                                            onChange={e => setOtherColorText(p => ({ ...p, siding: e.target.value }))}
                                            style={{ width: '100%', marginTop: '0.5rem' }}
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        {['trim', 'accents', 'windows', 'doors'].includes(materialTab) && (() => {
                            const palette = {
                                trim:    { label: 'Trim & Gutter Color',  list: TRIM_COLORS,   ph: 'e.g. "Aged copper" or "Bright White"' },
                                accents: { label: 'Shutters & Fascia Color', list: ACCENT_COLORS, ph: 'e.g. "Custom maroon shutters"' },
                                windows: { label: 'Window Frame Color',   list: TRIM_COLORS,   ph: 'e.g. "Anodized bronze"' },
                                doors:   { label: 'Front Door Color',     list: DOOR_COLORS,   ph: 'e.g. "Sherwin-Williams Tricorn Black"' },
                            }[materialTab];
                            const cat = materialTab;
                            return (
                                <div className="material-content active">
                                    <div className="color-section">
                                        <div className="color-brand">{palette.label}</div>
                                        <div className="color-grid">
                                            {palette.list.map(color => (
                                                <div key={color.name}
                                                     className={`color-swatch ${selectedColors[cat]?.name === color.name ? 'selected' : ''}`}
                                                     onClick={() => selectColor(cat, color)}>
                                                    <div className="swatch-color" style={{ background: color.value === '__other__' ? 'repeating-linear-gradient(45deg,#e5e7eb,#e5e7eb 5px,#f9fafb 5px,#f9fafb 10px)' : color.value }} />
                                                    <div className="swatch-name">{color.name}</div>
                                                </div>
                                            ))}
                                        </div>
                                        {selectedColors[cat]?.value === '__other__' && (
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder={palette.ph}
                                                value={otherColorText[cat]}
                                                onChange={e => setOtherColorText(p => ({ ...p, [cat]: e.target.value }))}
                                                style={{ width: '100%', marginTop: '0.5rem' }}
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {materialTab === 'custom' && (
                            <div className="material-content active">
                                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                                    Add categories that aren't in the standard list — Garage Door, Stone Veneer, Porch Railing, etc.
                                    Each one is passed verbatim to the AI prompt.
                                </div>

                                {customCategories.length > 0 && (
                                    <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
                                        {customCategories.map(c => (
                                            <div key={c.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.75rem', background: '#f9fafb' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                    <strong style={{ color: '#1f2937', fontSize: '0.95rem' }}>{c.name}</strong>
                                                    <button
                                                        onClick={() => removeCustomCategory(c.id)}
                                                        style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
                                                    >Remove</button>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        placeholder="Material (e.g. natural stone)"
                                                        value={c.material}
                                                        onChange={e => updateCustomCategory(c.id, 'material', e.target.value)}
                                                    />
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        placeholder="Color (e.g. warm tan)"
                                                        value={c.color}
                                                        onChange={e => updateCustomCategory(c.id, 'color', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {showAddCustomCat ? (
                                    <div style={{ border: '2px dashed #FDB813', borderRadius: 8, padding: '1rem', background: '#fffbeb' }}>
                                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Category name (e.g. Garage Door, Stone Veneer)"
                                                value={newCustomCat.name}
                                                onChange={e => setNewCustomCat(p => ({ ...p, name: e.target.value }))}
                                                autoFocus
                                            />
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Material (optional, e.g. carriage-house steel)"
                                                value={newCustomCat.material}
                                                onChange={e => setNewCustomCat(p => ({ ...p, material: e.target.value }))}
                                            />
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Color (optional, e.g. matte black)"
                                                value={newCustomCat.color}
                                                onChange={e => setNewCustomCat(p => ({ ...p, color: e.target.value }))}
                                            />
                                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                                <button className="btn btn-primary" onClick={addCustomCategory}>Add</button>
                                                <button className="btn btn-outline" onClick={() => { setShowAddCustomCat(false); setNewCustomCat({ name: '', material: '', color: '' }); }}>Cancel</button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        className="btn btn-outline"
                                        onClick={() => setShowAddCustomCat(true)}
                                        style={{ width: '100%', padding: '0.875rem', borderStyle: 'dashed', borderWidth: 2, fontSize: '0.95rem', fontWeight: 600 }}
                                    >
                                        + Add Custom Category
                                    </button>
                                )}
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

                            {/*{sourcePhotoKey && previewMode === 'original' && (
                                <AuthedImage src={sourcePhotoKey} alt="Original" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
                            )}*/}

                            {sourcePhotoKey && previewMode === 'original' && (
                                <AuthedImage src={sourcePhotoKey} alt="Original" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
                            )}

                            {sourcePhotoKey && previewMode === 'result' && (
                                generatedImageSrc
                                    ? <AuthedImage src={generatedImageSrc} alt="Generated" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
                                    : ''
                            )}

                            {sourcePhotoKey && previewMode === 'split' && (
                                generatedImageSrc ? (
                                    <div
                                        ref={splitRef}
                                        className="split-compare"
                                        style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', userSelect: 'none', touchAction: 'none' }}
                                    >
                                        {/*<AuthedImage src={sourcePhotoKey} alt="Original" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />*/}

                                        <AuthedImage src={sourcePhotoKey} alt="Original" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />

                                        <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 0 0 ${splitPos}%)` }}>
                                            <AuthedImage src={generatedImageSrc} alt="Generated" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
                                        </div>
                                        <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600, pointerEvents: 'none' }}>BEFORE</div>
                                        <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(253,184,19,0.9)', color: '#1a1f3a', fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600, pointerEvents: 'none' }}>AFTER</div>
                                        <div
                                            onMouseDown={startSplitDrag}
                                            onTouchStart={startSplitDrag}
                                            style={{ position: 'absolute', top: 0, bottom: 0, left: `${splitPos}%`, width: 4, background: '#fff', boxShadow: '0 0 6px rgba(0,0,0,0.5)', cursor: 'ew-resize', transform: 'translateX(-50%)' }}
                                        >
                                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 36, height: 36, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1f3a', fontSize: 14, fontWeight: 700 }}>⇆</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', color: '#6b7280', fontSize: 13 }}>
                                        Generate a mockup to enable side-by-side comparison
                                    </div>
                                )
                            )}

                            {sourcePhotoKey && (
                                <button
                                    onClick={() => setShowFullscreen(true)}
                                    title="Open fullscreen"
                                    style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.65)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                >
                                    ⛶ Fullscreen
                                </button>
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
                                disabled={
                                    isGenerating
                                    || !sourcePhotoKey
                                    || !aiReady
                                    || featureDisabledByAdmin
                                    || insufficientCredits
                                }
                            >
                                {isGenerating
                                    ? 'Generating…'
                                    : featureDisabledByAdmin
                                        ? 'Disabled by admin'
                                        : insufficientCredits
                                            ? `Need ${requiredCredits} credits`
                                            : (currentMockup ? 'Generate Another Version' : 'Generate Mockup')}
                                {!isGenerating && !featureDisabledByAdmin && !insufficientCredits && requiredCredits > 0 && (
                                    <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.85 }}>
                                        ({requiredCredits} credit{requiredCredits === 1 ? '' : 's'})
                                    </span>
                                )}
                            </button>

                            {!aiReady && !Object.keys(providerStatus).length && (
                                <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 6 }}>Checking AI status…</div>
                            )}
                            {!aiReady && Object.keys(providerStatus).length > 0 && (
                                <div style={{ fontSize: 12, color: '#b91c1c', textAlign: 'center', marginTop: 6 }}>
                                    No image AI configured. Save a Gemini key in API Settings.
                                </div>
                            )}
                            {insufficientCredits && (
                                <div style={{ fontSize: 12, color: '#b91c1c', textAlign: 'center', marginTop: 6 }}>
                                    You have {totalCredits} credits — need {requiredCredits}. Top up in Billing.
                                </div>
                            )}
                            {featureDisabledByAdmin && (
                                <div style={{ fontSize: 12, color: '#b91c1c', textAlign: 'center', marginTop: 6 }}>
                                    3D Mockup generation is currently disabled by your admin.
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

                            {/* Share with client — explicit opt-in. Spec
                                wants the contractor to review + curate
                                before the homeowner sees anything, so the
                                default is hidden (badge: red dot off) and
                                this button flips to "Hide from Client"
                                when toggled on (badge: green dot live). */}
                            <button
                                onClick={togglePortalVisibility}
                                disabled={!currentMockup}
                                style={{
                                    padding: '0.625rem 1rem',
                                    background: currentMockup?.is_visible_in_portal
                                        ? '#16a34a'
                                        : '#1a1f3a',
                                    color: currentMockup?.is_visible_in_portal
                                        ? '#fff'
                                        : '#FDB813',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontWeight: 700,
                                    fontSize: 14,
                                    cursor: currentMockup ? 'pointer' : 'not-allowed',
                                    opacity: currentMockup ? 1 : 0.5,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                }}
                            >
                                <span style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: currentMockup?.is_visible_in_portal
                                        ? '#a7f3d0' : '#9ca3af',
                                    boxShadow: currentMockup?.is_visible_in_portal
                                        ? '0 0 0 3px rgba(167,243,208,0.3)' : 'none',
                                }} />
                                {currentMockup?.is_visible_in_portal
                                    ? 'Shared with Client · Click to Hide'
                                    : 'Share with Client'}
                            </button>

                            <button className="btn btn-secondary" onClick={refineMore} disabled={!currentMockup}>Refine Further</button>
                            {/* CK-FIX Jul-22: new Save to Client Profile action */}
                            <button className="btn btn-secondary" onClick={saveToClientProfile} disabled={!currentMockup || !selectedClient}>Save to Client Profile</button>
                            <button className="btn btn-outline" onClick={startOver}>Start Over</button>
                            <button className="btn btn-outline" onClick={saveTemplate}>Save as Template</button>
                        </div>

                        {generatedImageSrc && (
                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Download</div>
                                    {branding.name && (
                                        <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Branded: <strong style={{ color: '#1a1f3a' }}>{branding.name}</strong></div>
                                    )}
                                </div>
                                <div className="download-options">
                                    <button
                                        className="download-btn"
                                        onClick={downloadHighRes}
                                        disabled={downloading.png}
                                        style={{ opacity: downloading.png ? 0.7 : 1, cursor: downloading.png ? 'wait' : 'pointer' }}
                                    >
                                        {downloading.png ? (<><span className="dl-spinner" /> Downloading…</>) : 'High-Res PNG'}
                                    </button>
                                    <button
                                        className="download-btn"
                                        onClick={downloadWatermarked}
                                        disabled={downloading.watermark}
                                        style={{ opacity: downloading.watermark ? 0.7 : 1, cursor: downloading.watermark ? 'wait' : 'pointer' }}
                                    >
                                        {downloading.watermark ? (<><span className="dl-spinner" /> Watermarking…</>) : 'Watermarked PNG'}
                                    </button>
                                    <button
                                        className="download-btn"
                                        onClick={downloadPDF}
                                        disabled={downloading.pdf}
                                        style={{ gridColumn: 'span 2', opacity: downloading.pdf ? 0.7 : 1, cursor: downloading.pdf ? 'wait' : 'pointer' }}
                                    >
                                        {downloading.pdf ? (<><span className="dl-spinner" /> Building PDF…</>) : 'PDF with Logo'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sharing */}
                {showFullscreen && sourcePhotoKey && (
                    <div
                        onClick={() => setShowFullscreen(false)}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
                            zIndex: 9999, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', padding: 20,
                        }}
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowFullscreen(false); }}
                            style={{ position: 'absolute', top: 16, right: 20, background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 14px', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}
                        >✕ Close</button>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                            <button onClick={(e) => { e.stopPropagation(); setPreviewMode('original'); }} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: previewMode === 'original' ? '#FDB813' : 'rgba(255,255,255,0.15)', color: previewMode === 'original' ? '#1a1f3a' : '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Original</button>
                            <button onClick={(e) => { e.stopPropagation(); setPreviewMode('result'); }} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: previewMode === 'result' ? '#FDB813' : 'rgba(255,255,255,0.15)', color: previewMode === 'result' ? '#1a1f3a' : '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Result</button>
                            <button onClick={(e) => { e.stopPropagation(); setPreviewMode('split'); }} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: previewMode === 'split' ? '#FDB813' : 'rgba(255,255,255,0.15)', color: previewMode === 'split' ? '#1a1f3a' : '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Split View</button>
                        </div>
                        <div onClick={(e) => e.stopPropagation()} style={{ width: '90vw', height: '80vh', position: 'relative', background: '#000', borderRadius: 8, overflow: 'hidden' }}>
                            {previewMode === 'original' && (
                                <AuthedImage src={sourcePhotoKey} alt="Original" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            )}
                            {previewMode === 'result' && (
                                generatedImageSrc
                                    ? <AuthedImage src={generatedImageSrc} alt="Generated" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    : <div style={{ color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>No generation yet</div>
                            )}
                            {previewMode === 'split' && generatedImageSrc && (
                                <div
                                    ref={splitRef}
                                    style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', userSelect: 'none', touchAction: 'none' }}
                                >
                                    <AuthedImage src={sourcePhotoKey} alt="Original" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
                                    <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 0 0 ${splitPos}%)` }}>
                                        <AuthedImage src={generatedImageSrc} alt="Generated" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
                                    </div>
                                    <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 12, padding: '4px 10px', borderRadius: 4, fontWeight: 600, pointerEvents: 'none' }}>BEFORE</div>
                                    <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(253,184,19,0.95)', color: '#1a1f3a', fontSize: 12, padding: '4px 10px', borderRadius: 4, fontWeight: 600, pointerEvents: 'none' }}>AFTER</div>
                                    <div
                                        onMouseDown={startSplitDrag}
                                        onTouchStart={startSplitDrag}
                                        style={{ position: 'absolute', top: 0, bottom: 0, left: `${splitPos}%`, width: 4, background: '#fff', boxShadow: '0 0 8px rgba(0,0,0,0.6)', cursor: 'ew-resize', transform: 'translateX(-50%)' }}
                                    >
                                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 44, height: 44, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1f3a', fontSize: 16, fontWeight: 700 }}>⇆</div>
                                    </div>
                                </div>
                            )}
                            {previewMode === 'split' && !generatedImageSrc && (
                                <div style={{ color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 14 }}>Generate a mockup to enable split view</div>
                            )}
                        </div>
                    </div>
                )}

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

            {/* Reopen-in-progress full-screen loader */}
            {reopening && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
                    <div style={{ width: 56, height: 56, border: '5px solid rgba(255,255,255,0.25)', borderTopColor: '#FDB813', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
                    <div style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>Reopening mockup…</div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Loading materials, versions and source photo</div>
                </div>
            )}

            {/* Gallery item fullscreen viewer (Original / Result / Split) */}
            {galleryFullscreenItem && (() => {
                const m = galleryFullscreenItem;
                const src = m.source_photo_url || null;
                const gen = m.current_version?.generated_image_url || null;
                const hasBoth = !!src && !!gen;
                return (
                    <div
                        onClick={() => setGalleryFullscreenItem(null)}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.94)', zIndex: 10000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); setGalleryFullscreenItem(null); }}
                            style={{ position: 'absolute', top: 16, right: 20, background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 14px', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}
                        >✕ Close</button>

                        <div style={{ position: 'absolute', top: 18, left: 24, color: '#fff', fontSize: 14, fontWeight: 600, opacity: 0.85 }}>
                            {m.title || 'Untitled mockup'}
                        </div>

                        {hasBoth && (
                            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                <button onClick={(e) => { e.stopPropagation(); setGalleryFsMode('original'); }} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: galleryFsMode === 'original' ? '#FDB813' : 'rgba(255,255,255,0.15)', color: galleryFsMode === 'original' ? '#1a1f3a' : '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Original</button>
                                <button onClick={(e) => { e.stopPropagation(); setGalleryFsMode('result'); }} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: galleryFsMode === 'result' ? '#FDB813' : 'rgba(255,255,255,0.15)', color: galleryFsMode === 'result' ? '#1a1f3a' : '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Result</button>
                                <button onClick={(e) => { e.stopPropagation(); setGalleryFsMode('split'); }} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: galleryFsMode === 'split' ? '#FDB813' : 'rgba(255,255,255,0.15)', color: galleryFsMode === 'split' ? '#1a1f3a' : '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Split View</button>
                            </div>
                        )}

                        <div onClick={(e) => e.stopPropagation()} style={{ width: '92vw', height: '82vh', position: 'relative', background: '#000', borderRadius: 8, overflow: 'hidden' }}>
                            {galleryFsMode === 'original' && src && (
                                <AuthedImage src={src} alt="Original" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            )}
                            {galleryFsMode === 'result' && gen && (
                                <AuthedImage src={gen} alt="Generated" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            )}
                            {galleryFsMode === 'split' && hasBoth && (
                                <div
                                    ref={galleryFsSplitRef}
                                    style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', userSelect: 'none', touchAction: 'none' }}
                                >
                                    <AuthedImage src={src} alt="Original" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
                                    <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 0 0 ${galleryFsSplitPos}%)` }}>
                                        <AuthedImage src={gen} alt="Generated" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
                                    </div>
                                    <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 12, padding: '4px 10px', borderRadius: 4, fontWeight: 600, pointerEvents: 'none' }}>BEFORE</div>
                                    <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(253,184,19,0.95)', color: '#1a1f3a', fontSize: 12, padding: '4px 10px', borderRadius: 4, fontWeight: 600, pointerEvents: 'none' }}>AFTER</div>
                                    <div
                                        onMouseDown={startGalleryFsSplitDrag}
                                        onTouchStart={startGalleryFsSplitDrag}
                                        style={{ position: 'absolute', top: 0, bottom: 0, left: `${galleryFsSplitPos}%`, width: 4, background: '#fff', boxShadow: '0 0 8px rgba(0,0,0,0.6)', cursor: 'ew-resize', transform: 'translateX(-50%)' }}
                                    >
                                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 44, height: 44, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1f3a', fontSize: 16, fontWeight: 700 }}>⇆</div>
                                    </div>
                                </div>
                            )}
                            {/* Fallbacks when only one image exists */}
                            {!hasBoth && galleryFsMode !== 'original' && !gen && (
                                <div style={{ color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 14 }}>No generated image</div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* ─────────────── Modals ─────────────── */}
            {showGallery && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-[900px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
                        <div className="flex justify-between items-center px-6 py-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-800">Mockup Gallery</h2>
                            <button className="w-8 h-8 border-0 bg-transparent cursor-pointer text-2xl text-gray-500 flex items-center justify-center hover:bg-gray-100 rounded-md transition-all duration-200" onClick={() => closeModal('gallery')}>×</button>
                        </div>
                        <div className="p-6">
                            {galleryLoading && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', gap: '0.75rem' }}>
                                    <div style={{ width: 44, height: 44, border: '4px solid #e5e7eb', borderTopColor: '#FDB813', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
                                    <div style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>Loading mockups…</div>
                                </div>
                            )}
                            <div className="gallery-grid">
                                {!galleryLoading && galleryItems.length === 0 && <div style={{ color: '#6b7280', fontSize: 13 }}>No mockups yet.</div>}
                                {!galleryLoading && galleryItems.map(m => {
                                    const hasBoth = !!m.current_version?.generated_image_url && !!m.source_photo_url;
                                    const pos = gallerySplitPos[m.id] ?? 50;
                                    return (
                                        <div key={m.id} className="gallery-item" title="Use slider to compare · click info to reopen">
                                            <div
                                                className="gallery-image"
                                                style={{ position: 'relative', overflow: 'hidden', borderRadius: 8, aspectRatio: '4/3', background: '#f3f4f6', userSelect: 'none', touchAction: 'none' }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {/* Base layer: original (always full width when present) */}
                                                {m.source_photo_url && (
                                                    <AuthedImage src={m.source_photo_url} alt="Original" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                                )}

                                                {/* Top layer: generated, clipped by split position */}
                                                {hasBoth && (
                                                    <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 0 0 ${pos}%)` }}>
                                                        <AuthedImage src={m.current_version.generated_image_url} alt={m.title || 'Mockup'} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    </div>
                                                )}

                                                {/* If only generated exists (no source), just show generated */}
                                                {!m.source_photo_url && m.current_version?.generated_image_url && (
                                                    <AuthedImage src={m.current_version.generated_image_url} alt={m.title || 'Mockup'} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                                )}

                                                {/* Pending placeholder */}
                                                {!m.source_photo_url && !m.current_version?.generated_image_url && (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: 12 }}>Pending</div>
                                                )}

                                                {/* Split-slider handle + badges (only when both images present) */}
                                                {hasBoth && (
                                                    <>
                                                        <span style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3, pointerEvents: 'none' }}>BEFORE</span>
                                                        <span style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(253,184,19,0.95)', color: '#1a1f3a', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3, pointerEvents: 'none' }}>AFTER</span>
                                                        <div
                                                            onMouseDown={(e) => startGallerySplitDrag(e, m.id, e.currentTarget.parentElement)}
                                                            onTouchStart={(e) => startGallerySplitDrag(e, m.id, e.currentTarget.parentElement)}
                                                            style={{ position: 'absolute', top: 0, bottom: 0, left: `${pos}%`, width: 3, background: '#fff', boxShadow: '0 0 6px rgba(0,0,0,0.6)', cursor: 'ew-resize', transform: 'translateX(-50%)', zIndex: 2 }}
                                                        >
                                                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 26, height: 26, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1f3a', fontSize: 12, fontWeight: 700 }}>⇆</div>
                                                        </div>
                                                    </>
                                                )}

                                                {/* Fullscreen view button — top-center, only when at least one image is present */}
                                                {(m.source_photo_url || m.current_version?.generated_image_url) && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setGalleryFullscreenItem(m);
                                                            setGalleryFsMode(hasBoth ? 'split' : (m.current_version?.generated_image_url ? 'result' : 'original'));
                                                            setGalleryFsSplitPos(50);
                                                        }}
                                                        title="View fullscreen"
                                                        style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 600, zIndex: 3, display: 'flex', alignItems: 'center', gap: 4 }}
                                                    >
                                                        ⛶ Fullscreen
                                                    </button>
                                                )}
                                            </div>
                                            <div className="gallery-info" onClick={() => reopenMockup(m)} style={{ cursor: 'pointer' }} title="Click to reopen">
                                                <div className="gallery-client">{m.title || 'Untitled mockup'}</div>
                                                <div className="gallery-date">{new Date(m.updated_at).toLocaleDateString()}</div>
                                                <div className="gallery-type">Status: {m.status}</div>
                                                <div style={{ fontSize: 11, color: '#FDB813', marginTop: 4, fontWeight: 600 }}>Click to reopen ›</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showRecent && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-[900px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
                        <div className="flex justify-between items-center px-6 py-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-800">Recent Projects</h2>
                            <button className="w-8 h-8 border-0 bg-transparent cursor-pointer text-2xl text-gray-500 flex items-center justify-center hover:bg-gray-100 rounded-md transition-all duration-200" onClick={() => closeModal('recent')}>×</button>
                        </div>
                        <div className="p-6">
                            {galleryLoading && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', gap: '0.75rem' }}>
                                    <div style={{ width: 44, height: 44, border: '4px solid #e5e7eb', borderTopColor: '#FDB813', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
                                    <div style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>Loading recent projects…</div>
                                </div>
                            )}
                            {!galleryLoading && recentItems.length === 0 && <div style={{ color: '#6b7280', fontSize: 13 }}>Nothing recent yet.</div>}
                            {!galleryLoading && recentItems.map(m => (
                                <div key={m.id} className="recent-item" style={{ cursor: 'pointer' }} onClick={() => reopenMockup(m)} title="Click to reopen">
                                    <div className="recent-preview" style={{ overflow: 'hidden', borderRadius: 8 }}>
                                        {m.current_version?.generated_image_url
                                            ? <AuthedImage src={m.current_version.generated_image_url} alt={m.title || 'Mockup'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            : m.source_photo_url
                                                ? <AuthedImage src={m.source_photo_url} alt="Original" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : null}
                                    </div>
                                    <div className="recent-details">
                                        <div className="recent-title">{m.title || 'Untitled mockup'}</div>
                                        <div className="recent-info">
                                            <span>{new Date(m.updated_at).toLocaleString()}</span>
                                            {' • '}
                                            <span className={m.status === 'approved' ? 'status-approved' : 'status-pending'}>{m.status}</span>
                                        </div>
                                        <div style={{ fontSize: 12, color: '#FDB813', marginTop: 4, fontWeight: 600 }}>Click to reopen ›</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* CK-FIX Jul-22: AI color import modal */}
            {colorImportModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-[560px] shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
                        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-200">
                            <h2 className="text-lg font-bold text-gray-800">Import Colors with AI</h2>
                            <button className="w-8 h-8 border-0 bg-transparent cursor-pointer text-2xl text-gray-500" onClick={() => setColorImportModal(false)}>&times;</button>
                        </div>
                        <div className="p-6">
                            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>
                                Upload up to 10 manufacturer color sheets (PDF) or photos. AI extracts every color into your palette — you can fine-tune any swatch afterward.
                            </div>
                            <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => setColorImportFiles(Array.from(e.target.files || []).slice(0, 10))} />
                            {colorImportFiles.length > 0 && (
                                <div style={{ fontSize: 12.5, color: '#374151', marginTop: 8 }}>{colorImportFiles.length} file(s) ready</div>
                            )}
                            {customColors.length > 0 && (
                                <>
                                    <div style={{ fontSize: 13, fontWeight: 700, margin: '14px 0 8px' }}>My Colors (click swatch to adjust)</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {customColors.map((c) => (
                                            <label key={c.id} title={c.manufacturer ? `${c.manufacturer}${c.product_line ? ` · ${c.product_line}` : ''}` : undefined}
                                                style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e5e7eb', borderRadius: 8, padding: '4px 8px', cursor: 'pointer' }}>
                                                {/* onBlur, not onChange — the native colour picker fires
                                                    onChange on every drag, which would be a PATCH per pixel. */}
                                                <input type="color" defaultValue={c.value} key={`${c.id}-${c.value}`}
                                                    onBlur={(e) => { if (e.target.value !== c.value) updateCustomColor(c, e.target.value); }}
                                                    style={{ width: 26, height: 26, border: 'none', padding: 0, background: 'transparent' }} />
                                                <span style={{ fontSize: 12 }}>{c.name}</span>
                                                <button type="button" onClick={() => deleteCustomColor(c)}
                                                    style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontWeight: 700 }}>&times;</button>
                                            </label>
                                        ))}
                                    </div>
                                </>
                            )}
                            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                                <button className="btn btn-primary" onClick={runColorImport} disabled={colorImportBusy}>
                                    {colorImportBusy ? (colorImportProgress || 'Analyzing...') : 'Extract Colors'}
                                </button>
                                <button className="btn btn-outline" onClick={() => setColorImportModal(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showTemplates && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-[900px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
                        <div className="flex justify-between items-center px-6 py-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-800">Mockup Templates</h2>
                            <button className="w-8 h-8 border-0 bg-transparent cursor-pointer text-2xl text-gray-500 flex items-center justify-center hover:bg-gray-100 rounded-md transition-all duration-200" onClick={() => closeModal('templates')}>×</button>
                        </div>
                        <div className="p-6">
                            {/* CK-FIX Jul-22: real template presets (was "coming soon") */}
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>Popular Combinations</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                                {MOCKUP_TEMPLATES.map((t) => (
                                    <button key={t.name} type="button" onClick={() => applyTemplate(t)}
                                        style={{ textAlign: 'left', border: '1px solid #e5e7eb', borderRadius: 12, padding: '0.9rem', background: '#fff', cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                                            {[t.roofing, t.siding, t.trim, t.windows].filter(Boolean).map((c, i) => (
                                                <span key={i} style={{ width: 22, height: 22, borderRadius: '50%', background: c.value, border: '1px solid #d1d5db', display: 'inline-block' }} />
                                            ))}
                                        </div>
                                        <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1a1f3a' }}>{t.name}</div>
                                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{t.desc}</div>
                                    </button>
                                ))}
                            </div>
                            {myTemplates.length > 0 && (
                                <>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: '18px 0 10px' }}>My Saved Templates</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                                        {myTemplates.map((t) => (
                                            <div key={t.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '0.9rem', background: '#fffef7' }}>
                                                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                                                    {['roofing','siding','trim','windows'].map((k) => t.colors?.[k] ? (
                                                        <span key={k} style={{ width: 22, height: 22, borderRadius: '50%', background: t.colors[k].value, border: '1px solid #d1d5db', display: 'inline-block' }} />
                                                    ) : null)}
                                                </div>
                                                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.name}</div>
                                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                                    <button type="button" onClick={() => applyTemplate({ ...t.colors, id: t.id, name: t.name, instructions: t.instructions })} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #FDB813', background: '#FDB813', fontWeight: 700, cursor: 'pointer' }}>Apply</button>
                                                    <button type="button" onClick={() => deleteMyTemplate(t)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#dc2626', cursor: 'pointer' }}>Delete</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showTutorial && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-[900px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
                        <div className="flex justify-between items-center px-6 py-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-800">3D Mockup Studio Tutorial</h2>
                            <button className="w-8 h-8 border-0 bg-transparent cursor-pointer text-2xl text-gray-500 flex items-center justify-center hover:bg-gray-100 rounded-md transition-all duration-200" onClick={() => closeModal('tutorial')}>×</button>
                        </div>
                        <div className="p-6">
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
