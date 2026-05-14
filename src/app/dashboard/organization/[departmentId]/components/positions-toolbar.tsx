'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, CheckCircle2, XCircle, Loader2, Trash2 } from 'lucide-react';
import { Tabs } from '@/components/ui/tabs';
import { VerticalTabMenu } from '@/components/ui/vertical-tab-menu';

interface PositionsToolbarProps {
    viewMode: 'list' | 'chart';
    onViewModeChange: (mode: 'list' | 'chart') => void;
    hideChart?: boolean;
    hideAddButton?: boolean;
    onAddPosition: () => void;
}

export const PositionsToolbar = ({
    viewMode,
    onViewModeChange,
    hideChart,
    hideAddButton,
    onAddPosition,
}: PositionsToolbarProps) => {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-border/50">
            <div className="flex items-center gap-3">
                <Tabs value={viewMode} onValueChange={(v) => onViewModeChange(v as any)} className="w-auto">
                    {!hideChart && (
                        <VerticalTabMenu
                            orientation="horizontal"
                            items={[
                                { value: 'chart', label: 'Зураглал' },
                                { value: 'list', label: 'Жагсаалт' },
                            ]}
                        />
                    )}
                </Tabs>
            </div>

            {!hideAddButton && (
                <Button
                    variant="default"
                    size="sm"
                    className="h-9 rounded-xl font-bold gap-2 px-6 shadow-sm"
                    onClick={onAddPosition}
                >
                    <PlusCircle className="h-4 w-4" />
                    Ажлын байр нэмэх
                </Button>
            )}
        </div>
    );
};

interface BulkActionBarProps {
    selectedCount: number;
    isApproving: boolean;
    isDeleting: boolean;
    onClearSelection: () => void;
    onApprove: () => void;
    onDisapprove: () => void;
    onDelete: () => void;
}

export const BulkActionBar = ({
    selectedCount,
    isApproving,
    isDeleting,
    onClearSelection,
    onApprove,
    onDisapprove,
    onDelete,
}: BulkActionBarProps) => {
    if (selectedCount === 0) return null;

    return (
        <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/10 rounded-xl animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-primary">{selectedCount} ширхэг сонгосон</span>
                <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-8 text-[11px]">Сонголтыг цэвэрлэх</Button>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="success"
                    size="sm"
                    className="h-9 px-4"
                    onClick={onApprove}
                    disabled={isApproving}
                >
                    {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Батлах
                </Button>
                <Button
                    variant="warning"
                    size="sm"
                    className="h-9 px-4"
                    onClick={onDisapprove}
                    disabled={isApproving}
                >
                    <XCircle className="w-4 h-4" />
                    Цуцлах
                </Button>
                <Button
                    variant="destructive"
                    size="sm"
                    className="h-9 px-4"
                    onClick={onDelete}
                    disabled={isDeleting}
                >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Устгах
                </Button>
            </div>
        </div>
    );
};
