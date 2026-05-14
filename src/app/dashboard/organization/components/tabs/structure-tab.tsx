
'use client';

import React, { useState, useMemo, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    useFirebase,
    useMemoFirebase,
    updateDocumentNonBlocking,
    deleteDocumentNonBlocking,
    useDoc,
    tenantDoc,
    useTenantWrite,
} from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { AddDepartmentDialog } from '../../add-department-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import dynamic from 'next/dynamic';
const OrgChartFlowCanvas = dynamic(
    () => import('../flow/org-chart-flow-canvas').then(m => ({ default: m.OrgChartFlowCanvas })),
    { ssr: false }
);
import { Department, DepartmentType, Position, CompanyProfile } from '../../types';
import { OrganizationFilters } from '@/hooks/use-organization-filters';
import { Building2 } from 'lucide-react';
import { EmptyState } from '@/components/organization/empty-state';
import * as Sentry from '@sentry/nextjs';

export interface StructureTabHandle {
    triggerPrint: () => void;
}

interface StructureTabProps {
    departments: Department[] | null;
    departmentTypes: DepartmentType[] | null;
    positions: Position[] | null;
    filters: OrganizationFilters;
    onAddDepartment: () => void;
    onClearFilters: () => void;
    onDepartmentClick: (deptId: string) => void;
    onPrintingChange?: (isPrinting: boolean) => void;
}

export const StructureTab = forwardRef<StructureTabHandle, StructureTabProps>(({ departments, departmentTypes, positions, filters, onAddDepartment, onClearFilters, onDepartmentClick, onPrintingChange }, ref) => {
    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
    const [isEditDeptOpen, setIsEditDeptOpen] = useState(false);
    const chartRef = useRef<HTMLDivElement>(null);

    const { firestore } = useFirebase();
    const { tDoc } = useTenantWrite();

    const onDepartmentUpdate = async (id: string, data: Partial<Department>) => {
        if (!firestore) return;
        try {
            await updateDocumentNonBlocking(tDoc('departments', id), data);
        } catch (error) {
            Sentry.captureException(error, { tags: { module: 'organization' } });
        }
    }
    const companyProfileQuery = useMemoFirebase(({ firestore, companyPath }) => (firestore ? tenantDoc(firestore, companyPath, 'company', 'profile') : null), [firestore]);
    const { data: companyProfile, isLoading: isLoadingProfile } = useDoc<CompanyProfile>(companyProfileQuery as any);

    // Apply filters
    const filteredDepartments = useMemo(() => {
        if (!departments) return null;

        return departments.filter(dept => {
            // Search filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesName = dept.name.toLowerCase().includes(searchLower);
                if (!matchesName) return false;
            }

            // Department filter
            if (filters.departments.length > 0 && !filters.departments.includes(dept.id)) {
                return false;
            }

            return true;
        });
    }, [departments, filters]);

    const { orgTree, deptsWithData } = useMemo(() => {
        if (!filteredDepartments || !departmentTypes || !positions) {
            return { orgTree: [], deptsWithData: [] };
        }

        const typeMap = new Map(departmentTypes.map(t => [t.id, { name: t.name, level: t.level || 0 }]));

        const deptsWithData: Department[] = filteredDepartments.map(d => ({
            ...d,
            positions: [],
            typeName: typeMap.get(d.typeId || '')?.name,
            typeLevel: typeMap.get(d.typeId || '')?.level || 0,
            filled: 0,
            approvedCount: 0,
            children: [],
        }));

        positions.forEach(p => {
            if (p.isApproved !== false) { // Only count official (approved) positions
                const dept = deptsWithData.find(d => d.id === p.departmentId);
                if (dept) {
                    dept.filled = (dept.filled || 0) + (p.filled || 0);
                    dept.approvedCount = (dept.approvedCount || 0) + 1;
                }
            }
        });

        const deptMap = new Map(deptsWithData.map(d => [d.id, d]));
        const rootNodes: Department[] = [];

        deptsWithData.forEach(dept => {
            if (dept.parentId && deptMap.has(dept.parentId)) {
                const parent = deptMap.get(dept.parentId);
                if (parent) {
                    if (!parent.children) {
                        parent.children = [];
                    }
                    parent.children.push(dept);
                }
            } else {
                rootNodes.push(dept);
            }
        });

        return { orgTree: rootNodes, deptsWithData: deptsWithData };
    }, [filteredDepartments, departmentTypes, positions]);

    const departmentNameMap = useMemo(() => {
        if (!departments) return new Map();
        return new Map(departments.map(d => [d.id, d.name]));
    }, [departments]);

    const isLoading = !departments || !departmentTypes || !positions || isLoadingProfile;

    const handleOpenEditDialog = (dept: Department) => {
        setEditingDepartment(dept);
        setIsEditDeptOpen(true);
    }

    const handleDeleteDepartment = (deptId: string) => {
        if (!firestore) return;
        const docRef = tDoc('departments', deptId);
        deleteDocumentNonBlocking(docRef);
    }

    const handlePrint = useCallback(() => {
        onPrintingChange?.(true);

        // Get the chart container
        const chartContainer = chartRef.current;
        if (!chartContainer) {
            onPrintingChange?.(false);
            return;
        }

        // Find the ReactFlow viewport
        const viewport = chartContainer.querySelector('.react-flow__viewport') as HTMLElement;
        if (!viewport) {
            onPrintingChange?.(false);
            return;
        }

        // Get current date
        const currentDate = new Date().toLocaleDateString('mn-MN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Clone the viewport content
        const clonedViewport = viewport.cloneNode(true) as HTMLElement;
        
        // Remove interactive elements and handles
        clonedViewport.querySelectorAll('.react-flow__handle, button, [class*="opacity-0"]').forEach(el => el.remove());

        // Create a hidden iframe for printing
        const printFrame = document.createElement('iframe');
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = 'none';
        document.body.appendChild(printFrame);

        const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
        if (!frameDoc) {
            document.body.removeChild(printFrame);
            onPrintingChange?.(false);
            return;
        }

        // Write content to iframe
        frameDoc.open();
        frameDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Байгууллагын бүтэц</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    @page { 
                        size: A4 landscape; 
                        margin: 10mm;
                    }
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background: white;
                        padding: 15px;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 20px;
                        padding-bottom: 15px;
                        border-bottom: 2px solid #e2e8f0;
                    }
                    .header h1 {
                        font-size: 20px;
                        font-weight: 700;
                        color: #0f172a;
                        margin-bottom: 5px;
                    }
                    .header p {
                        font-size: 11px;
                        color: #64748b;
                    }
                    .chart-container {
                        position: relative;
                        width: 100%;
                        min-height: 400px;
                        overflow: visible;
                    }
                    .react-flow__viewport {
                        transform-origin: top left;
                    }
                    .footer {
                        margin-top: 20px;
                        padding-top: 10px;
                        border-top: 1px solid #e2e8f0;
                        display: flex;
                        justify-content: space-between;
                        font-size: 9px;
                        color: #94a3b8;
                    }
                    @media print {
                        body { 
                            -webkit-print-color-adjust: exact !important; 
                            print-color-adjust: exact !important;
                            color-adjust: exact !important;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${companyProfile?.legalName || 'Байгууллагын бүтэц'}</h1>
                    <p>Байгууллагын зохион байгуулалтын бүтэц</p>
                </div>
                <div class="chart-container">
                    ${clonedViewport.outerHTML}
                </div>
                <div class="footer">
                    <span>Хэвлэсэн: ${currentDate}</span>
                    <span>Нийт ${deptsWithData.length} нэгж</span>
                </div>
            </body>
            </html>
        `);
        frameDoc.close();

        // Wait for content to render then print
        setTimeout(() => {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
            
            // Clean up after printing
            setTimeout(() => {
                document.body.removeChild(printFrame);
                onPrintingChange?.(false);
            }, 1000);
        }, 300);
    }, [companyProfile, deptsWithData, onPrintingChange]);

    useImperativeHandle(ref, () => ({ triggerPrint: handlePrint }), [handlePrint]);

    return (
        <div className="space-y-6">
            {/* Local dialog for Editing only */}
            <AddDepartmentDialog
                open={isEditDeptOpen}
                onOpenChange={setIsEditDeptOpen}
                departments={departments || []}
                departmentTypes={departmentTypes || []}
                editingDepartment={editingDepartment}
            />

            {/* Visual Chart */}
            <div className="bg-muted/5 relative rounded-xl">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center min-h-[400px]" aria-live="polite">
                        <div className="flex flex-col items-center justify-center">
                            <Skeleton className="h-24 w-56" />
                            <div className="w-px h-8 mt-1 bg-border" />
                            <div className="flex gap-8 mt-8">
                                <Skeleton className="h-24 w-56" />
                                <Skeleton className="h-24 w-56" />
                            </div>
                        </div>
                    </div>
                )}
                {!isLoading && orgTree.length > 0 ? (
                    <div ref={chartRef}>
                        <OrgChartFlowCanvas
                            data={orgTree}
                            onDepartmentClick={onDepartmentClick}
                            onDepartmentUpdate={onDepartmentUpdate}
                        />
                    </div>
                ) : (
                    !isLoading && (
                        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
                            <EmptyState
                                icon={Building2}
                                title="Байгууллагын бүтэц үүсээгүй байна"
                                description="Эхлэхийн тулд эхний нэгжээ үүсгээрэй. Компанийн үндсэн хэлтсээс эхэлнэ."
                                action={{
                                    label: "Анхны нэгжийг нэмэх",
                                    onClick: onAddDepartment
                                }}
                                tip="Компанийн үндсэн хэлтсээс эхлээд дэд хэлтсүүдийг нэмнэ үү."
                            />
                        </div>
                    )
                )}
            </div>


        </div>
    );
});

StructureTab.displayName = 'StructureTab';
