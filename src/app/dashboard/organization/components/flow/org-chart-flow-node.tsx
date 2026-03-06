import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Department } from '../../types';
import { cn } from '@/lib/utils';
import { DepartmentStructureCard } from '@/components/organization/department-structure-card';

interface OrgChartNodeData extends Department {
    label: string;
    isRoot?: boolean;
    onDepartmentClick?: (id: string) => void;
    onDepartmentUpdate?: (id: string, data: Partial<Department>) => void;
}

export const OrgChartFlowNode = memo(({ data, selected }: NodeProps<OrgChartNodeData>) => {
    const { id, isRoot } = data;

    return (
        <div className={cn("relative z-10 selection:bg-none", selected ? "ring-0" : "")}>
            {/* Input Handle (Target) - Top */}
            {!isRoot && (
                <Handle
                    type="target"
                    position={Position.Top}
                    className="!bg-muted-foreground/20 !w-2 !h-2 !border-0 !top-0 opacity-0"
                />
            )}

            <DepartmentStructureCard
                department={data}
                selected={selected}
                onDepartmentClick={data.onDepartmentClick}
                onDepartmentUpdate={data.onDepartmentUpdate as any}
            />

            {/* Output Handle (Source) - Bottom */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="!bg-muted-foreground/20 !w-2 !h-2 !border-0 !bottom-0 opacity-0"
            />
        </div>
    );
});

OrgChartFlowNode.displayName = 'OrgChartFlowNode';
