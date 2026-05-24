'use client'
import React, { useEffect, useRef, useState } from 'react';

// Module-level singletons so we load the Google Maps script once and keep a
// geocode cache across re-renders / view switches.
let gmapsPromise = null;
const geocodeCache = new Map(); // address string -> { lat, lng }

function loadGoogleMaps(key) {
    if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
    if (window.google?.maps) return Promise.resolve(window.google.maps);
    if (gmapsPromise) return gmapsPromise;
    gmapsPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
        s.async = true;
        s.defer = true;
        s.onload = () => resolve(window.google.maps);
        s.onerror = () => reject(new Error('Failed to load Google Maps'));
        document.head.appendChild(s);
    });
    return gmapsPromise;
}

const MapView = ({ claims, onSelect }) => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const mapEl = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef([]);
    const [status, setStatus] = useState('loading'); // loading | ready | error | no-key

    useEffect(() => {
        if (!key) { setStatus('no-key'); return; }
        let cancelled = false;
        loadGoogleMaps(key)
            .then((maps) => {
                if (cancelled || !mapEl.current) return;
                mapRef.current = new maps.Map(mapEl.current, {
                    center: { lat: 39.83, lng: -98.58 }, // US center
                    zoom: 4,
                    mapTypeControl: false,
                    streetViewControl: false,
                });
                setStatus('ready');
            })
            .catch(() => { if (!cancelled) setStatus('error'); });
        return () => { cancelled = true; };
    }, [key]);

    // Plot markers whenever the map is ready or the claim list changes.
    useEffect(() => {
        if (status !== 'ready' || !window.google?.maps || !mapRef.current) return;
        const maps = window.google.maps;
        const map = mapRef.current;
        const geocoder = new maps.Geocoder();
        const bounds = new maps.LatLngBounds();
        let active = true;

        // Clear old markers
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];

        const withAddr = claims.filter(c => c.address && c.address.trim());
        const cap = withAddr.slice(0, 60); // keep client-side geocoding sane

        const place = (claim, loc) => {
            if (!active) return;
            const marker = new maps.Marker({
                position: loc, map, title: `${claim.client} — ${claim.stageName}`,
            });
            marker.addListener('click', () => onSelect?.(claim.id));
            markersRef.current.push(marker);
            bounds.extend(loc);
            if (markersRef.current.length > 0) map.fitBounds(bounds);
        };

        let i = 0;
        const next = () => {
            if (!active || i >= cap.length) return;
            const claim = cap[i++];
            const cached = geocodeCache.get(claim.address);
            if (cached) { place(claim, cached); next(); return; }
            geocoder.geocode({ address: claim.address }, (results, gStatus) => {
                if (gStatus === 'OK' && results[0]) {
                    const loc = results[0].geometry.location;
                    const ll = { lat: loc.lat(), lng: loc.lng() };
                    geocodeCache.set(claim.address, ll);
                    place(claim, ll);
                }
                // Throttle to dodge OVER_QUERY_LIMIT
                setTimeout(next, 120);
            });
        };
        next();
        return () => { active = false; };
    }, [status, claims, onSelect]);

    if (status === 'no-key') {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', background: 'white', borderRadius: 12, border: '1px solid #e5e7eb' }}>
                <p style={{ fontWeight: 600, color: '#1a1f3a', marginBottom: '0.5rem' }}>Map needs a Google Maps API key</p>
                <p style={{ fontSize: '0.875rem' }}>Set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in your env to enable the map view.</p>
            </div>
        );
    }
    if (status === 'error') {
        return <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>Could not load Google Maps. Check the API key / network.</div>;
    }

    return (
        <div style={{ position: 'relative' }}>
            {status === 'loading' && <div style={{ padding: '1rem', color: '#6b7280' }}>Loading map…</div>}
            <div ref={mapEl} style={{ width: '100%', height: '70vh', minHeight: 420, borderRadius: 12, border: '1px solid #e5e7eb' }} />
        </div>
    );
};

export default MapView;
