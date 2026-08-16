'use client';

// ─────────────────────────────────────────────────────────────────────────────
// AddressAutocomplete — QA Q0.1
//
// ONE shared Google Places autocomplete input used by every address field
// (leads, claims, jobs, subs, client create, scheduling…). Type a partial
// address → pick a suggestion → the parent gets street + city + state + zip +
// coordinates in one shot, so no sub-field is retyped.
//
// Graceful fallback: if NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set (or Google
// fails to load), it renders a plain text input that just reports what the user
// types — so every form still works, it simply loses the suggestions until the
// key is added. This is why it's safe to adopt everywhere now.
//
// Setup (one-time, by the account owner):
//   1. Google Cloud Console → enable "Places API" + "Maps JavaScript API" and
//      turn on billing for the project.
//   2. Create an API key, restrict it by HTTP referrer to your domains.
//   3. Put it in the frontend env as NEXT_PUBLIC_GOOGLE_MAPS_API_KEY and redeploy.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Singleton loader — the Maps JS script is injected once for the whole app and
// every instance awaits the same promise.
let mapsPromise = null;
function loadGoogleMaps() {
    if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
    if (!GOOGLE_KEY) return Promise.reject(new Error('no key'));
    if (window.google?.maps?.places) return Promise.resolve(window.google);
    if (mapsPromise) return mapsPromise;

    mapsPromise = new Promise((resolve, reject) => {
        // Reuse an existing tag if one is already on the page.
        const existing = document.getElementById('ck-google-maps');
        if (existing) {
            existing.addEventListener('load', () => resolve(window.google));
            existing.addEventListener('error', reject);
            return;
        }
        const s = document.createElement('script');
        s.id = 'ck-google-maps';
        s.async = true;
        s.defer = true;
        s.src =
            `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_KEY)}` +
            `&libraries=places&loading=async`;
        s.onload = () => resolve(window.google);
        s.onerror = () => { mapsPromise = null; reject(new Error('google maps failed to load')); };
        document.head.appendChild(s);
    });

    // Google's suggestion dropdown (.pac-container) is appended to <body>, so it
    // must sit above any modal. Inject the z-index fix once.
    if (!document.getElementById('ck-pac-style')) {
        const st = document.createElement('style');
        st.id = 'ck-pac-style';
        st.textContent = '.pac-container{z-index:2147483647 !important;border-radius:8px;margin-top:2px;box-shadow:0 8px 24px rgba(15,23,42,.15);font-family:inherit}';
        document.head.appendChild(st);
    }
    return mapsPromise;
}

// Google address_components → the flat shape every ClaimKing form uses.
function parsePlace(place) {
    const comps = place?.address_components || [];
    const get = (type, useShort = false) => {
        const c = comps.find((x) => x.types.includes(type));
        return c ? (useShort ? c.short_name : c.long_name) : '';
    };
    const streetNumber = get('street_number');
    const route = get('route');
    const address = [streetNumber, route].filter(Boolean).join(' ').trim();
    const city =
        get('locality') || get('sublocality') || get('postal_town') ||
        get('administrative_area_level_2') || '';
    const state = get('administrative_area_level_1', true);
    const zip = get('postal_code');
    const loc = place?.geometry?.location;
    const lat = loc ? (typeof loc.lat === 'function' ? loc.lat() : loc.lat) : null;
    const lng = loc ? (typeof loc.lng === 'function' ? loc.lng() : loc.lng) : null;
    return {
        address,
        city,
        state,
        zip,
        lat: lat != null ? Number(lat) : null,
        lng: lng != null ? Number(lng) : null,
        formatted: place?.formatted_address || '',
    };
}

/**
 * Props:
 *   value        — current street-address string (controlled)
 *   onChange(v)  — user typed; report the raw string
 *   onSelect(p)  — a suggestion was picked; p = {address,city,state,zip,lat,lng,formatted}
 *   country      — ISO code(s) to restrict to (default 'us')
 *   ...rest      — placeholder / style / className / disabled / id passed to the input
 */
export default function AddressAutocomplete({
    value = '',
    onChange,
    onSelect,
    country = 'us',
    placeholder = 'Start typing an address…',
    style,
    className,
    disabled,
    id,
    ...rest
}) {
    const inputRef = useRef(null);
    const acRef = useRef(null);
    // The place_changed listener attaches once, so read the latest callbacks
    // through refs to avoid capturing a stale closure.
    const onSelectRef = useRef(onSelect);
    const onChangeRef = useRef(onChange);
    onSelectRef.current = onSelect;
    onChangeRef.current = onChange;

    useEffect(() => {
        if (!GOOGLE_KEY) return; // fallback mode — plain input, no autocomplete
        let cancelled = false;

        loadGoogleMaps()
            .then((google) => {
                if (cancelled || !inputRef.current || acRef.current) return;
                const ac = new google.maps.places.Autocomplete(inputRef.current, {
                    types: ['address'],
                    fields: ['address_components', 'geometry', 'formatted_address'],
                    componentRestrictions: country ? { country } : undefined,
                });
                acRef.current = ac;
                ac.addListener('place_changed', () => {
                    const place = ac.getPlace();
                    if (!place?.address_components) return;
                    const parsed = parsePlace(place);
                    // Keep the visible input as the street line, not the full
                    // "…, City, ST 00000, USA" string.
                    onChangeRef.current?.(parsed.address || parsed.formatted);
                    onSelectRef.current?.(parsed);
                });
            })
            .catch(() => { /* stays a plain input */ });

        return () => { cancelled = true; };
    }, [country]);

    // Stop Enter (choosing a suggestion) from also submitting the surrounding form.
    const onKeyDown = (e) => {
        if (e.key === 'Enter') e.preventDefault();
        rest.onKeyDown?.(e);
    };

    return (
        <input
            {...rest}
            id={id}
            ref={inputRef}
            type="text"
            className={className}
            style={style}
            disabled={disabled}
            placeholder={placeholder}
            value={value}
            autoComplete="off"
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={onKeyDown}
        />
    );
}
