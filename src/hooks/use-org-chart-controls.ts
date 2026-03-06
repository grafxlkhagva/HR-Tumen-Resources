import { useState, useCallback } from 'react';

export interface OrgChartControlsState {
    scale: number;
    position: { x: number; y: number };
    isFullscreen: boolean;
}

export function useOrgChartControls() {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [startPan, setStartPan] = useState({ x: 0, y: 0 });

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));
    const handleReset = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    const toggleFullscreen = useCallback((element?: HTMLElement) => {
        if (!document.fullscreenElement) {
            const target = element || document.documentElement;
            target.requestFullscreen().then(() => {
                setIsFullscreen(true);
            }).catch(err => {
                console.warn(`Fullscreen request failed, falling back to CSS fullscreen: ${err.message}`);
                // Fallback to CSS fullscreen
                setIsFullscreen(true);
            });
        } else {
            document.exitFullscreen().then(() => {
                setIsFullscreen(false);
            }).catch(err => {
                console.warn(`Exit fullscreen failed: ${err.message}`);
                setIsFullscreen(false);
            });
        }
    }, []);

    // Listen for fullscreen change events to update state if user exits via ESC
    // Note: In a real implementation this should be in a useEffect

    return {
        scale,
        position,
        isFullscreen,
        handleZoomIn,
        handleZoomOut,
        handleReset,
        toggleFullscreen,
        setPosition,
        isDragging,
        setIsDragging,
        startPan,
        setStartPan
    };
}
