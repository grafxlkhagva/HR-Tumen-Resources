'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Department, Position } from '../../types';
import { PositionsListTable } from '../../components/positions-list-table';
import dynamic from 'next/dynamic';
const AddPositionDialog = dynamic(
    () => import('../../add-position-dialog').then(m => ({ default: m.AddPositionDialog })),
    { ssr: false }
);
import { PositionStructureChart } from './position-structure-chart';
import { cn } from '@/lib/utils';

import { usePositionsManagement } from './use-positions-management';
import { PositionsToolbar, BulkActionBar } from './positions-toolbar';
import {
    ApproveDialog,
    DisapproveDialog,
    DeleteDialog,
    DeptDeleteDialog,
    DeptDisbandDialog,
    PosDisbandDialog,
} from './position-row-actions';

interface PositionsManagementTabProps {
    department: Department;
    hideChart?: boolean;
    hideAddButton?: boolean;
    /** Hide the internal top control bar (used when page provides its own tabs/controls) */
    hideControls?: boolean;
    /** Render list as table or card list */
    listVariant?: 'table' | 'cards';
}

export const PositionsManagementTab = ({ department, hideChart, hideAddButton, hideControls, listVariant = 'table' }: PositionsManagementTabProps) => {
    const mgmt = usePositionsManagement(department);
    const [viewMode, setViewMode] = useState<'list' | 'chart'>(hideChart ? 'list' : 'chart');

    const showControls = !hideControls;

    return (
        <div className={cn('space-y-4', showControls && 'space-y-6')}>
            {showControls && (
                <PositionsToolbar
                    viewMode={viewMode}
                    onViewModeChange={(v) => setViewMode(v)}
                    hideChart={hideChart}
                    hideAddButton={hideAddButton}
                    onAddPosition={mgmt.handleAddPositionWithReset}
                />
            )}

            {viewMode === 'chart' ? (
                <PositionStructureChart
                    positions={mgmt.positions || []}
                    employees={mgmt.employees || []}
                    department={department}
                    isLoading={mgmt.isLoading}
                    onPositionClick={mgmt.handleEditPosition}
                    onAddChild={mgmt.handleAddChildPosition}
                    onDuplicate={mgmt.handleDuplicatePosition}
                    lookups={mgmt.lookups}
                />
            ) : listVariant === 'cards' ? (
                <PositionsListTable
                    variant="cards"
                    positions={mgmt.positions || []}
                    lookups={mgmt.lookups}
                    isLoading={mgmt.isLoading}
                    selectedIds={mgmt.selectedPositionIds}
                    onSelectionChange={mgmt.setSelectedPositionIds}
                    onEdit={mgmt.handleEditPosition}
                    onDelete={mgmt.handleDeletePosition}
                    onDisband={(pos) => {
                        mgmt.setDisbandPosition(pos);
                        mgmt.setIsPosDisbandConfirmOpen(true);
                    }}
                    onDisapprove={(pos) => {
                        mgmt.setSelectedPositionIds([pos.id]);
                        mgmt.setIsDisapproveConfirmOpen(true);
                    }}
                    onDuplicate={mgmt.handleDuplicatePosition}
                />
            ) : (
                <Card className="border-none shadow-xl shadow-slate-200/40 ring-1 ring-slate-200/50 overflow-hidden">
                    <PositionsListTable
                        positions={mgmt.positions || []}
                        lookups={mgmt.lookups}
                        isLoading={mgmt.isLoading}
                        selectedIds={mgmt.selectedPositionIds}
                        onSelectionChange={mgmt.setSelectedPositionIds}
                        onEdit={mgmt.handleEditPosition}
                        onDelete={mgmt.handleDeletePosition}
                        onDisband={(pos) => {
                            mgmt.setDisbandPosition(pos);
                            mgmt.setIsPosDisbandConfirmOpen(true);
                        }}
                        onDuplicate={mgmt.handleDuplicatePosition}
                    />
                </Card>
            )}

            {/* ── Approval Dialog ── */}
            <ApproveDialog
                open={mgmt.isApproveConfirmOpen}
                onOpenChange={mgmt.setIsApproveConfirmOpen}
                selectedCount={mgmt.selectedPositionIds.length}
                pendingCount={mgmt.stats.pending}
                isApproving={mgmt.isApproving}
                approvalDate={mgmt.approvalDate}
                onApprovalDateChange={mgmt.setApprovalDate}
                approvalNote={mgmt.approvalNote}
                onApprovalNoteChange={mgmt.setApprovalNote}
                onConfirm={mgmt.handleApproveSelected}
                onCancel={() => {
                    mgmt.setApprovalNote('');
                    mgmt.setApprovalDate(new Date());
                }}
            />

            {/* ── Disapproval Dialog ── */}
            <DisapproveDialog
                open={mgmt.isDisapproveConfirmOpen}
                onOpenChange={mgmt.setIsDisapproveConfirmOpen}
                isApproving={mgmt.isApproving}
                disapproveDate={mgmt.disapproveDate}
                onDisapproveDateChange={mgmt.setDisapproveDate}
                disapproveNote={mgmt.disapproveNote}
                onDisapproveNoteChange={mgmt.setDisapproveNote}
                onConfirm={mgmt.handleBulkDisapprove}
                onCancel={() => {
                    mgmt.setDisapproveNote('');
                    mgmt.setDisapproveDate(new Date());
                }}
            />

            {/* ── Bulk Action Bar ── */}
            <BulkActionBar
                selectedCount={mgmt.selectedPositionIds.length}
                isApproving={mgmt.isApproving}
                isDeleting={mgmt.isDeleting}
                onClearSelection={() => mgmt.setSelectedPositionIds([])}
                onApprove={() => mgmt.setIsApproveConfirmOpen(true)}
                onDisapprove={() => mgmt.setIsDisapproveConfirmOpen(true)}
                onDelete={() => mgmt.setIsDeleteConfirmOpen(true)}
            />

            {/* ── Add Position Dialog ── */}
            <AddPositionDialog
                open={mgmt.isAddPositionOpen}
                onOpenChange={mgmt.setIsAddPositionOpen}
                departments={mgmt.allDepartments || [department]}
                allPositions={mgmt.positions || []}
                positionLevels={mgmt.levels || []}
                employmentTypes={mgmt.empTypes || []}
                jobCategories={mgmt.jobCategories || []}
                workSchedules={mgmt.workSchedules || []}
                editingPosition={mgmt.editingPosition}
                preselectedDepartmentId={department.id}
                parentPositionId={mgmt.pendingParentPositionId}
                initialMode={mgmt.pendingParentPositionId ? 'quick' : 'full'}
            />

            {/* ── Bulk Delete Confirmation ── */}
            <DeleteDialog
                open={mgmt.isDeleteConfirmOpen}
                onOpenChange={mgmt.setIsDeleteConfirmOpen}
                selectedCount={mgmt.selectedPositionIds.length}
                onConfirm={mgmt.handleBulkDelete}
            />

            {/* ── Department Delete Dialog ── */}
            <DeptDeleteDialog
                open={mgmt.isDeptDeleteConfirmOpen}
                onOpenChange={mgmt.setIsDeptDeleteConfirmOpen}
                isDeptDeleting={mgmt.isDeptDeleting}
                onConfirm={mgmt.handleSimpleDeptDelete}
            />

            {/* ── Department Disband Dialog ── */}
            <DeptDisbandDialog
                open={mgmt.isDisbandConfirmOpen}
                onOpenChange={mgmt.setIsDisbandConfirmOpen}
                isDeptDeleting={mgmt.isDeptDeleting}
                disbandReason={mgmt.disbandReason}
                onDisbandReasonChange={mgmt.setDisbandReason}
                onConfirm={mgmt.handleDeptDisband}
                onCancel={() => mgmt.setIsDisbandConfirmOpen(false)}
            />

            {/* ── Position Disband Dialog ── */}
            <PosDisbandDialog
                open={mgmt.isPosDisbandConfirmOpen}
                onOpenChange={mgmt.setIsPosDisbandConfirmOpen}
                isDeleting={mgmt.isDeleting}
                disbandPosition={mgmt.disbandPosition}
                disbandReason={mgmt.disbandReason}
                onDisbandReasonChange={mgmt.setDisbandReason}
                onConfirm={mgmt.handleDisbandPosition}
                onCancel={() => { mgmt.setIsPosDisbandConfirmOpen(false); mgmt.setDisbandPosition(null); }}
            />
        </div>
    );
};
