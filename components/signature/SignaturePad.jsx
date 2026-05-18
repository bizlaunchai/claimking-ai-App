'use client';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

/**
 * Reusable HTML5-canvas signature pad.
 *
 * Why hand-rolled vs `react-signature-canvas`:
 *   - One less dependency
 *   - Full control of pen-pressure / smoothing math
 *   - Mobile-touch + mouse + stylus in ~150 lines
 *
 * Imperative ref API:
 *   ref.current.clear()         → wipe the canvas
 *   ref.current.isEmpty()       → boolean
 *   ref.current.toDataURL(type) → "data:image/png;base64,..."   (default PNG)
 *   ref.current.toBlob(type)    → returns a Promise<Blob>
 *
 * The pad sizes itself to its container (display:block + width:100%) and
 * uses a devicePixelRatio backing store so the output looks crisp on retina.
 */
const SignaturePad = forwardRef(function SignaturePad(
    {
        height = 200,
        penColor = '#1a1f3a',
        backgroundColor = '#ffffff',
        lineWidth = 2.5,
        onChange,
        disabled = false,
        className = '',
        style = {},
    },
    ref,
) {
    const canvasRef = useRef(null);
    const drawingRef = useRef(false);
    const lastPointRef = useRef(null);
    const hasInkRef = useRef(false);
    const [, force] = useState(0);

    // ── DPR-aware sizing ────────────────────────────────────────────────
    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.max(1, Math.floor(rect.width * dpr));
        canvas.height = Math.max(1, Math.floor(rect.height * dpr));
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, rect.width, rect.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = penColor;
        ctx.lineWidth = lineWidth;
        // Note: resize wipes the drawing. We accept that — the homeowner
        // almost never resizes mid-signature, and persisting a re-sample
        // would blur the signature.
        hasInkRef.current = false;
        force(n => n + 1);
    }, [backgroundColor, penColor, lineWidth]);

    useEffect(() => {
        resizeCanvas();
        const onResize = () => resizeCanvas();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [resizeCanvas]);

    // ── Drawing ─────────────────────────────────────────────────────────
    const pointFromEvent = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches?.[0];
        const clientX = touch ? touch.clientX : e.clientX;
        const clientY = touch ? touch.clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDraw = (e) => {
        if (disabled) return;
        e.preventDefault();
        drawingRef.current = true;
        lastPointRef.current = pointFromEvent(e);
    };

    const moveDraw = (e) => {
        if (!drawingRef.current) return;
        e.preventDefault();
        const ctx = canvasRef.current.getContext('2d');
        const p = pointFromEvent(e);
        const last = lastPointRef.current;
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        lastPointRef.current = p;
        hasInkRef.current = true;
    };

    const endDraw = () => {
        if (!drawingRef.current) return;
        drawingRef.current = false;
        lastPointRef.current = null;
        onChange?.({ isEmpty: !hasInkRef.current });
    };

    // ── Imperative API ──────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
        clear: () => {
            resizeCanvas();
            onChange?.({ isEmpty: true });
        },
        isEmpty: () => !hasInkRef.current,
        toDataURL: (type = 'image/png', quality) => {
            return canvasRef.current?.toDataURL(type, quality) ?? '';
        },
        toBlob: (type = 'image/png', quality) => {
            return new Promise((resolve) => {
                canvasRef.current?.toBlob((b) => resolve(b), type, quality);
            });
        },
    }), [resizeCanvas, onChange]);

    return (
        <canvas
            ref={canvasRef}
            className={className}
            style={{
                display: 'block',
                width: '100%',
                height,
                touchAction: 'none',
                cursor: disabled ? 'not-allowed' : 'crosshair',
                background: backgroundColor,
                borderRadius: 8,
                ...style,
            }}
            onMouseDown={startDraw}
            onMouseMove={moveDraw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={moveDraw}
            onTouchEnd={endDraw}
            onTouchCancel={endDraw}
        />
    );
});

export default SignaturePad;
