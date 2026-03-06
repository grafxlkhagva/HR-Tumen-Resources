'use client';

import * as React from 'react';
import { Minus, Plus, Maximize, Minimize, RefreshCcw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface OrgChartControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onReset: () => void;
    onFullscreen: () => void;
    onExport?: () => void;
    isFullscreen: boolean;
    scale: number;
}

export function OrgChartControls({
    onZoomIn,
    onZoomOut,
    onReset,
    onFullscreen,
    onExport,
    isFullscreen,
    scale
}: OrgChartControlsProps) {
    return (
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 p-2 bg-background/80 backdrop-blur-sm rounded-lg shadow-lg border">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={onFullscreen}>
                            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                        {isFullscreen ? 'Дэлгэц багасгах' : 'Бүтэн дэлгэц'}
                    </TooltipContent>
                </Tooltip>

                <div className="w-full h-px bg-border my-1" />

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={onZoomIn}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Томруулах</TooltipContent>
                </Tooltip>

                <div className="text-xs text-center font-medium text-muted-foreground py-1 select-none">
                    {Math.round(scale * 100)}%
                </div>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={onZoomOut}>
                            <Minus className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Жижигрүүлэх</TooltipContent>
                </Tooltip>

                <div className="w-full h-px bg-border my-1" />

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={onReset}>
                            <RefreshCcw className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Сэргээх</TooltipContent>
                </Tooltip>

                {onExport && (
                    <>
                        <div className="w-full h-px bg-border my-1" />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={onExport}>
                                    <Download className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">Зураг татах</TooltipContent>
                        </Tooltip>
                    </>
                )}
            </TooltipProvider>
        </div>
    );
}
