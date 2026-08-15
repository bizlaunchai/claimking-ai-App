'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import axiosInstance from '@/lib/axiosInstance';

// Claims Map view (QA Q4.3). Leaflet + OpenStreetMap — the same free, no-API-key
// stack the rest of the app uses (leads map, sub portal, jobs dispatch). The old
// version needed a paid Google Maps key + geocoded every address in the browser,
// so with no key it just showed a "needs a key" panel = "broken map". Coordinates
// now come from the backend (server-side US Census geocoding, cached per claim).

const PIN_SVG = (color) =>
    '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="36" viewBox="0 0 30 42">' +
    `<path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.7 23.3 0 15 0z" fill="${color}"/>` +
    '<circle cx="15" cy="15" r="5.5" fill="#ffffff"/></svg>';

// Pin colour by pipeline stage: open (1–9) navy, closed/won (10–12) green.
const pinColor = (stage) => (stage >= 10 ? '#16a34a' : '#1a1f3a');

const MapView = ({ claims, onSelect }) => {
    const mapEl = useRef(null);
    const mapRef = useRef(null);
    const layerRef = useRef(null);
    const onSelectRef = useRef(onSelect);
    onSelectRef.current = onSelect; // always call the latest without re-running the draw effect
    const [mapReady, setMapReady] = useState(false);
    const [coords, setCoords] = useState(null); // { [id]: {lat,lng} } | null while loading
    const [status, setStatus] = useState('loading'); // loading | ready | error
    const [pending, setPending] = useState(false);

    // Fetch geocoded points from the backend (own-only scoped). If the backend
    // says more are still geocoding, re-fetch until they're all resolved.
    useEffect(() => {
        let cancelled = false;
        let timer = null;
        const load = async () => {
            try {
                const res = await axiosInstance.get('/client-portal/map-points', { suppressErrorToast: true });
                if (cancelled) return;
                const map = {};
                (res.data?.points || []).forEach((p) => { map[p.id] = { lat: p.lat, lng: p.lng }; });
                setCoords(map);
                setStatus('ready');
                setPending(!!res.data?.pending);
                if (res.data?.pending) timer = setTimeout(load, 2500);
            } catch {
                if (!cancelled) setStatus('error');
            }
        };
        load();
        return () => { cancelled = true; if (timer) clearTimeout(timer); };
    }, []);

    // Only plot claims that are in the current filtered list AND have coords.
    const points = useMemo(() => {
        if (!coords) return [];
        return (claims || [])
            .map((c) => (coords[c.id] ? { ...c, ...coords[c.id] } : null))
            .filter(Boolean);
    }, [claims, coords]);

    // Init the Leaflet map once, on mount — independent of the data fetch so the
    // tiles paint immediately. `mapReady` flips true only after the map object
    // actually exists, which is what the marker effect waits on (fixing the race
    // where markers tried to draw before the async Leaflet import resolved).
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const L = (await import('leaflet')).default || (await import('leaflet'));
            if (cancelled || !mapEl.current || mapRef.current) return;
            const map = L.map(mapEl.current).setView([39.83, -98.58], 4);
            mapRef.current = map;
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(map);
            layerRef.current = L.layerGroup().addTo(map);
            setTimeout(() => { if (!cancelled && mapRef.current) mapRef.current.invalidateSize(); }, 150);
            setMapReady(true);
        })();
        return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
    }, []);

    // (Re)draw markers whenever the map is ready OR the plotted points change.
    useEffect(() => {
        if (!mapReady || !mapRef.current || !layerRef.current) return;
        let cancelled = false;
        (async () => {
            const L = (await import('leaflet')).default || (await import('leaflet'));
            if (cancelled || !mapRef.current || !layerRef.current) return;
            layerRef.current.clearLayers();
            if (!points.length) return;
            const bounds = [];
            points.forEach((c) => {
                const icon = L.divIcon({ className: 'claim-pin-icon', html: PIN_SVG(pinColor(c.stage)), iconSize: [26, 36], iconAnchor: [13, 36] });
                const m = L.marker([c.lat, c.lng], { icon }).addTo(layerRef.current);
                m.bindTooltip(`${c.client} — ${c.stageName || 'Stage ' + c.stage}`, { direction: 'top', offset: [0, -30] });
                m.on('click', () => onSelectRef.current?.(c.id));
                bounds.push([c.lat, c.lng]);
            });
            mapRef.current.invalidateSize();
            try { mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 }); } catch { /* */ }
        })();
        return () => { cancelled = true; };
    }, [points, mapReady]);

    if (status === 'error') {
        return <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626', background: 'white', borderRadius: 12, border: '1px solid #e5e7eb' }}>Could not load the map. Please try again.</div>;
    }

    const plotted = points.length;
    const total = (claims || []).length;
    return (
        <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8, fontSize: '0.8rem', color: '#6b7280' }}>
                <span><b style={{ color: '#1a1f3a' }}>{plotted}</b> of {total} claims mapped</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 999, background: '#1a1f3a', display: 'inline-block' }} /> Open</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 999, background: '#16a34a', display: 'inline-block' }} /> Closed</span>
            </div>
            {status === 'ready' && !pending && plotted === 0 && (
                <div style={{ padding: '0.5rem 0', color: '#6b7280', fontSize: '0.85rem' }}>
                    {total === 0 ? 'No claims to map.' : 'None of these claims could be geocoded (missing or unrecognized addresses).'}
                </div>
            )}
            <div style={{ position: 'relative' }}>
                <div ref={mapEl} style={{ width: '100%', height: '70vh', minHeight: 420, borderRadius: 12, border: '1px solid #e5e7eb', background: '#eef0f4' }} />
                {/* full overlay while the first batch of points is loading */}
                {status === 'loading' && (
                    <div className="claim-map-loader">
                        <span className="claim-map-spinner" />
                        <span>Loading map…</span>
                    </div>
                )}
                {/* subtle corner pill while addresses are still geocoding in the background */}
                {status === 'ready' && pending && (
                    <div className="claim-map-geocoding">
                        <span className="claim-map-spinner sm" />
                        Mapping addresses… {plotted}/{total}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MapView;
