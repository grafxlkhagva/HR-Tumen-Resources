'use client';

import React from 'react';

export interface SignaturePadHandle {
    clear: () => void;
    isEmpty: () => boolean;
    toDataURL: () => string;
}

/**
 * Хурууны/хулганы гарын үсэг зурах canvas.
 * Гадны сан ашиглахгүй — pointer event дээр суурилсан, touch + mouse аль алинд ажиллана.
 */
export const SignaturePad = React.forwardRef<SignaturePadHandle, { className?: string; onBeginDraw?: () => void }>(
    function SignaturePad({ className, onBeginDraw }, ref) {
        const canvasRef = React.useRef<HTMLCanvasElement>(null);
        const drawing = React.useRef(false);
        const empty = React.useRef(true);
        const last = React.useRef<{ x: number; y: number } | null>(null);

        // Canvas-ийг эцгийн өргөнд тааруулж, DPR-ээр масштаблана.
        React.useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const resize = () => {
                const parent = canvas.parentElement;
                if (!parent) return;
                const dpr = window.devicePixelRatio || 1;
                const w = parent.clientWidth;
                const h = 200;
                canvas.width = Math.round(w * dpr);
                canvas.height = Math.round(h * dpr);
                canvas.style.width = `${w}px`;
                canvas.style.height = `${h}px`;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.scale(dpr, dpr);
                    ctx.lineWidth = 2.5;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.strokeStyle = '#0f172a';
                }
            };
            resize();
            window.addEventListener('resize', resize);
            return () => window.removeEventListener('resize', resize);
        }, []);

        const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
            const rect = e.currentTarget.getBoundingClientRect();
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };

        const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drawing.current = true;
            if (empty.current && onBeginDraw) onBeginDraw();
            last.current = pos(e);
        };

        const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
            if (!drawing.current) return;
            const ctx = canvasRef.current?.getContext('2d');
            if (!ctx || !last.current) return;
            const p = pos(e);
            ctx.beginPath();
            ctx.moveTo(last.current.x, last.current.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            last.current = p;
            empty.current = false;
        };

        const end = () => {
            drawing.current = false;
            last.current = null;
        };

        React.useImperativeHandle(ref, () => ({
            clear: () => {
                const canvas = canvasRef.current;
                const ctx = canvas?.getContext('2d');
                if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                empty.current = true;
            },
            isEmpty: () => empty.current,
            toDataURL: () => canvasRef.current?.toDataURL('image/png') ?? '',
        }));

        return (
            <canvas
                ref={canvasRef}
                onPointerDown={start}
                onPointerMove={move}
                onPointerUp={end}
                onPointerLeave={end}
                className={className}
                style={{ touchAction: 'none' }}
            />
        );
    },
);
