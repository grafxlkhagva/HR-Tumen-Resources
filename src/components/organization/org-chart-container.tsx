'use client';

import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useOrgChartControls } from '@/hooks/use-org-chart-controls';
import { OrgChartControls } from './org-chart-controls';

interface OrgChartContainerProps {
    children: React.ReactNode;
    className?: string;
}

export function OrgChartContainer({ children, className }: OrgChartContainerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const {
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
    } = useOrgChartControls();

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return; // Only left click
        setIsDragging(true);
        setStartPan({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        setPosition({
            x: e.clientX - startPan.x,
            y: e.clientY - startPan.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.deltaY < 0) {
                handleZoomIn();
            } else {
                handleZoomOut();
            }
        }
    };

    // Clean up fullscreen listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && isFullscreen) {
                toggleFullscreen(); // Sync state
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [isFullscreen, toggleFullscreen]);

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative overflow-hidden bg-background bg-dot-pattern border rounded-lg transition-all duration-300 isolation-isolate transform-gpu",
                isFullscreen ? "fixed inset-0 z-50 bg-background" : "h-[600px]",
                className
            )}
            style={{ transform: 'translate3d(0,0,0)' }} // Force hardware acceleration/clipping fix for Safari
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
        >
            <div
                ref={contentRef}
                className="absolute origin-center transition-transform duration-100 ease-out will-change-transform pb-20" // Extra padding for safe scrolling
                style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    minWidth: '100%',
                    minHeight: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {children}
            </div>

            <OrgChartControls
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onReset={handleReset}
                onFullscreen={() => toggleFullscreen(containerRef.current || undefined)}
                isFullscreen={isFullscreen}
                scale={scale}
            />
        </div>
    );
}
