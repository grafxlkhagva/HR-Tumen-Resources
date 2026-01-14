'use client';

import React, { useCallback } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    BackgroundVariant,
    Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Plus, Play, MousePointer2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { StageNode } from './nodes/stage-node';
import { useProcessManagement } from '../context';

// Register custom nodes
const nodeTypes = {
    stage: StageNode,
};

export function ProcessCanvas({ onNodeClick }: { onNodeClick?: (event: React.MouseEvent, node: Node) => void }) {
    const reactFlowWrapper = React.useRef<HTMLDivElement>(null);
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        addNode
    } = useProcessManagement();

    const [reactFlowInstance, setReactFlowInstance] = React.useState<any>(null);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');
            if (typeof type === 'undefined' || !type) {
                return;
            }

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode: Node = {
                id: `${type}_${Math.random().toString(36).substr(2, 9)}`,
                type,
                position,
                data: { label: type === 'stage' ? 'Шинэ үе шат' : 'Төгсгөл' },
            };

            addNode(newNode);
        },
        [reactFlowInstance, addNode],
    );

    const onDragStart = (event: React.DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-slate-900" ref={reactFlowWrapper}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onInit={setReactFlowInstance}
                onDrop={onDrop}
                onDragOver={onDragOver}
                nodeTypes={nodeTypes as any}
                fitView
                className="touch-none"
            >
                <Background gap={20} size={1} variant={BackgroundVariant.Dots} className="opacity-50" />
                <Controls className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl rounded-xl p-1 [&>button]:border-none [&>button]:bg-transparent [&>button:hover]:bg-slate-100 dark:[&>button:hover]:bg-slate-700" />
                <MiniMap
                    className="border rounded-lg shadow-lg bg-white dark:bg-slate-800"
                    nodeColor={(node) => {
                        switch (node.type) {
                            case 'input': return '#10b981';
                            case 'output': return '#ef4444';
                            default: return '#3b82f6';
                        }
                    }}
                />

                {/* Drag-to-add Panel: Positioned at the bottom left to stay out of the way */}
                <Panel position="bottom-left" className="mb-4 ml-4">
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border shadow-lg rounded-2xl p-2 flex flex-col gap-2">
                        <div className="px-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nodes</span>
                        </div>
                        <div
                            className="flex items-center gap-2 cursor-grab active:cursor-grabbing px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-800"
                            onDragStart={(event) => onDragStart(event, 'stage')}
                            draggable
                        >
                            <Plus className="h-4 w-4 text-indigo-500" />
                            Шат (Чирэх)
                        </div>
                        <div className="px-2 pt-1 uppercase">
                            <p className="text-[8px] text-slate-400 leading-tight font-bold tracking-tighter">Канвас руу чирж <br /> нэмнэ үү</p>
                        </div>
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    );
}
