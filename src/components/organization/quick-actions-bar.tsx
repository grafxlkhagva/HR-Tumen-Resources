'use client';

import * as React from 'react';
import { PlusCircle, Upload, Download, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickActionsBarProps {
    activeTab: string;
    onAddDepartment?: () => void;
    onAddPosition?: () => void;
    onManageTypes?: () => void;
    onImport?: () => void;
    onExport?: () => void;
}

export function QuickActionsBar({
    activeTab,
    onAddDepartment,
    onAddPosition,
    onManageTypes,
    onImport,
    onExport,
}: QuickActionsBarProps) {
    return (
        <div className="flex items-center justify-between gap-4 pb-4 border-b">
            <div className="flex items-center gap-2">
                {activeTab === 'structure' && (
                    <>
                        {onManageTypes && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onManageTypes}
                                className="gap-2"
                            >
                                <Settings className="h-3.5 w-3.5" />
                                Төрөл удирдах
                            </Button>
                        )}
                        {onAddDepartment && (
                            <Button
                                size="sm"
                                onClick={onAddDepartment}
                                className="gap-2"
                            >
                                <PlusCircle className="h-3.5 w-3.5" />
                                Нэгж нэмэх
                            </Button>
                        )}
                    </>
                )}

                {activeTab === 'positions' && (
                    <>
                        {onAddPosition && (
                            <Button
                                size="sm"
                                onClick={onAddPosition}
                                className="gap-2"
                            >
                                <PlusCircle className="h-3.5 w-3.5" />
                                Ажлын байр нэмэх
                            </Button>
                        )}
                    </>
                )}
            </div>

            <div className="flex items-center gap-2">
                {onImport && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onImport}
                        className="gap-2"
                        disabled
                    >
                        <Upload className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Import</span>
                    </Button>
                )}
                {onExport && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onExport}
                        className="gap-2"
                        disabled
                    >
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Export</span>
                    </Button>
                )}
            </div>
        </div>
    );
}
