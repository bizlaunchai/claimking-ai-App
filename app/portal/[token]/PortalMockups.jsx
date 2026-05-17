'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axiosInstance from '@/lib/axiosInstance';

// ─────────────────────────────────────────────────────────────────────────────
// 3D Mockups Gallery for the homeowner portal.
//
// Spec source: docs/Client-Portal.html line 1492
//   "3D Mockups Gallery: Every Gemini-generated 3D property mockup with
//    timestamp. Shows roof color/material previews homeowner can flip through."
//
// Visibility model:
//   * Each mockup has is_visible_in_portal (default false).
//   * Contractor flips it on via "Share with Client" on /dashboard/3d-mockup.
//   * Backend GET /portal-public/:token/mockups returns ONLY shared ones.
//   * If the contractor un-shares later, the row vanishes here on next load
//     AND the image URL 404s (the proxy endpoint re-checks visibility).
//
// Image URLs are token-scoped proxy URLs returned by the backend
// (/portal-public/:token/mockups/:versionId/image). We pass them straight
// to <img src> — no client-side AWS keys, no leakage.
// ─────────────────────────────────────────────────────────────────────────────

const fmtDate = (iso) => {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return iso; }
};

// Build absolute URL from the backend-relative path the API returns. Same
// baseURL the rest of axiosInstance uses, so this stays consistent across
// dev / staging / prod environments without hardcoding hosts.
const apiOrigin = () => {
    const base = process.env.NEXT_PUBLIC_API_URL || '';
    return base.replace(/\/+$/, '');
};

export default function PortalMockups() {
    const params = useParams();
    const token = params?.token;

    const [items, setItems]     = useState([]);
    const [loading, setLoading] = useState(true);
    const [lightbox, setLightbox] = useState(null); // currently-open image url

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const { data } = await axiosInstance.get(
                    `/portal-public/${token}/mockups`,
                    { suppressErrorToast: true },
                );
                if (!cancelled) setItems(Array.isArray(data) ? data : []);
            } catch {
                if (!cancelled) setItems([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [token]);

    if (loading) {
        return (
            <div style={{ padding: '2rem 0', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
                Loading mockups…
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div style={{
                padding: '2rem 1rem', textAlign: 'center',
                background: '#fafafa', border: '1px dashed #e5e7eb',
                borderRadius: 10, color: '#6b7280', fontSize: 14,
            }}>
                Your contractor hasn't shared any 3D mockups yet. When they
                do, you'll see them here — color and material previews of
                how your property will look after the work.
            </div>
        );
    }

    return (
        <>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '0.875rem',
            }}>
                {items.map((m) => {
                    const imgSrc = m.version?.image_url
                        ? `${apiOrigin()}${m.version.image_url}`
                        : null;
                    return (
                        <div
                            key={m.id}
                            onClick={() => imgSrc && setLightbox(imgSrc)}
                            style={{
                                cursor: imgSrc ? 'zoom-in' : 'default',
                                background: '#fff',
                                border: '1px solid #eef0f4',
                                borderRadius: 12,
                                overflow: 'hidden',
                                transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                                boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 8px 20px rgba(15,23,42,0.08)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = '';
                                e.currentTarget.style.boxShadow = '0 2px 6px rgba(15,23,42,0.04)';
                            }}
                        >
                            <div style={{
                                aspectRatio: '4 / 3',
                                background: '#f3f4f6',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                overflow: 'hidden',
                            }}>
                                {imgSrc ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={imgSrc}
                                        alt={m.title || '3D Mockup'}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                        loading="lazy"
                                    />
                                ) : (
                                    <span style={{ color: '#9ca3af', fontSize: 12 }}>Image unavailable</span>
                                )}
                            </div>
                            <div style={{ padding: '0.625rem 0.875rem' }}>
                                <div style={{
                                    fontSize: 13, fontWeight: 700, color: '#1a1f3a',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                    {m.title || 'Roof preview'}
                                </div>
                                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                                    {fmtDate(m.created_at)}
                                    {m.version?.version_number ? ` · v${m.version.version_number}` : ''}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Lightbox — click anywhere to close */}
            {lightbox && (
                <div
                    onClick={() => setLightbox(null)}
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(15,23,42,0.85)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 9999, padding: 24, cursor: 'zoom-out',
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={lightbox}
                        alt="Mockup preview"
                        style={{
                            maxWidth: '95vw', maxHeight: '90vh',
                            objectFit: 'contain',
                            borderRadius: 12,
                            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                        }}
                    />
                </div>
            )}
        </>
    );
}
