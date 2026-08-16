'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';
import axiosInstance from '@/lib/axiosInstance';

// ─────────────────────────────────────────────────────────────────────────────
// Job Photos gallery for the homeowner portal (QA Q3.10).
//
// Shows the project photos the contractor has posted to this client's portal
// (job_images.posted_to_portal = true), each with the contractor-approved note.
//
// Visibility model mirrors the mockups gallery:
//   * Backend GET /portal-public/:token/photos returns ONLY posted images.
//   * Each item's image is a token-scoped proxy URL that re-validates on fetch,
//     so an un-posted photo 404s immediately even from a bookmarked link.
//   * The caption is the human-approved note — no unapproved AI text ever
//     reaches here (enforced server-side).
// ─────────────────────────────────────────────────────────────────────────────

const fmtDate = (iso) => {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return iso; }
};

const apiOrigin = () => (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

export default function PortalPhotos({ highlightId }) {
    const params = useParams();
    const token = params?.token;

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lightbox, setLightbox] = useState(null);
    const highlightRef = useRef(null);

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const { data } = await axiosInstance.get(
                    `/portal-public/${token}/photos`,
                    { suppressErrorToast: true },
                );
                const rows = Array.isArray(data) ? data : data?.data;
                if (!cancelled) setItems(Array.isArray(rows) ? rows : []);
            } catch {
                if (!cancelled) setItems([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [token]);

    useEffect(() => {
        if (!loading && highlightId && highlightRef.current) {
            highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [loading, highlightId]);

    useEffect(() => {
        if (!lightbox) return;
        const onKey = (e) => { if (e.key === 'Escape') setLightbox(null); };
        window.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [lightbox]);

    if (loading) {
        return (
            <div style={{ padding: '2rem 0', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
                Loading photos…
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
                Your contractor hasn't posted any project photos yet. As work
                progresses, you'll see photos of your property here — with a
                short note explaining each one.
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
                    const imgSrc = m.image_url ? `${apiOrigin()}${m.image_url}` : null;
                    const isHighlight = highlightId && m.id === highlightId;
                    return (
                        <div
                            key={m.id}
                            ref={isHighlight ? highlightRef : null}
                            onClick={() => imgSrc && setLightbox(imgSrc)}
                            style={{
                                cursor: imgSrc ? 'zoom-in' : 'default',
                                background: '#fff',
                                border: isHighlight ? '2px solid #FDB813' : '1px solid #eef0f4',
                                borderRadius: 12,
                                overflow: 'hidden',
                                boxShadow: isHighlight ? '0 0 0 3px rgba(253,184,19,0.2)' : '0 2px 6px rgba(15,23,42,0.04)',
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
                                        alt={m.caption || 'Project photo'}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                        loading="lazy"
                                    />
                                ) : (
                                    <span style={{ color: '#9ca3af', fontSize: 12 }}>Image unavailable</span>
                                )}
                            </div>
                            <div style={{ padding: '0.625rem 0.875rem' }}>
                                {m.caption && (
                                    <div style={{ fontSize: 13, color: '#1a1f3a', lineHeight: 1.4 }}>
                                        {m.caption}
                                    </div>
                                )}
                                <div style={{ fontSize: 11, color: '#6b7280', marginTop: m.caption ? 4 : 0 }}>
                                    {fmtDate(m.posted_at || m.taken_at)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {lightbox && typeof document !== 'undefined' && createPortal(
                <div
                    onClick={() => setLightbox(null)}
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(15,23,42,0.85)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 2147483647, padding: 24, cursor: 'zoom-out',
                    }}
                >
                    <button
                        type="button"
                        aria-label="Close preview"
                        onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
                        style={{
                            position: 'fixed', top: 18, right: 18,
                            width: 44, height: 44,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '50%',
                            border: '1px solid rgba(255,255,255,0.25)',
                            background: 'rgba(15,23,42,0.55)',
                            color: '#fff', cursor: 'pointer',
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                            <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    </button>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={lightbox}
                        alt="Project photo"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            maxWidth: '95vw', maxHeight: '90vh',
                            objectFit: 'contain', borderRadius: 12,
                            boxShadow: '0 20px 60px rgba(0,0,0,0.4)', cursor: 'default',
                        }}
                    />
                </div>,
                document.body,
            )}
        </>
    );
}
