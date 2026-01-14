'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Search,
    Plus,
    LayoutTemplate,
    FileInput,
    Settings2,
    Play,
    Trash2
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ProcessCanvas } from './components/process-canvas';
import { NodeConfigPanel } from './components/node-config-panel';
import { useProcessManagement } from './context';
import { Node } from 'reactflow';
import { StartProcessDialog } from './components/start-process-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';
import { EmployeeTasksView } from './components/employee-tasks-view';

export function ProcessManagementContent() {
    const {
        templates,
        currentTemplate,
        selectTemplate,
        createNewTemplate,
        saveCurrentTemplate,
        selectedNode,
        setSelectedNodeId,
        // Instance Props
        instances,
        currentInstance,
        selectInstance,
        deleteInstance,
        viewMode,
        deleteTemplate,
        nodes,
        addNode
    } = useProcessManagement();

    // UI state
    const isConfigOpen = !!selectedNode;
    const [isStartDialogOpen, setIsStartDialogOpen] = useState(false);

    const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        setSelectedNodeId(node.id);
    }, [setSelectedNodeId]);

    const handleCreateNew = async () => {
        const name = prompt("Загварын нэр:");
        if (name) {
            await createNewTemplate(name, 'custom');
        }
    };

    return (
        <Tabs defaultValue="admin" className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-950 overflow-hidden">

            {/* TOP HEADER FOR ROLE SWITCHING */}
            <div className="flex-none border-b bg-white dark:bg-slate-900 px-4 h-12 flex items-center justify-between z-30">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-200">Process Management</span>
                    <Separator orientation="vertical" className="h-4 mx-2" />
                    <TabsList className="h-8">
                        <TabsTrigger value="admin" className="text-xs h-7">Удирдлага (HR)</TabsTrigger>
                        <TabsTrigger value="employee" className="text-xs h-7">Ажилтан (My Tasks)</TabsTrigger>
                    </TabsList>
                </div>
            </div>

            {/* ADMIN CONTENT */}
            <TabsContent value="admin" className="flex-1 flex overflow-hidden data-[state=inactive]:hidden mt-0">
                <div className="flex h-full w-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
                    {/* LEFT SIDEBAR */}
                    <div className="w-[320px] flex flex-col border-r bg-white dark:bg-slate-900 h-full flex-shrink-0 z-20 shadow-sm">
                        <Tabs defaultValue="templates" className="flex-1 flex flex-col h-full">
                            {/* Header with Tabs */}
                            <div className="p-4 border-b space-y-4">
                                <div className="flex items-center gap-2 font-semibold text-lg text-slate-800 dark:text-slate-100">
                                    <div className="p-1.5 bg-indigo-600 rounded-md">
                                        <LayoutTemplate className="h-4 w-4 text-white" />
                                    </div>
                                    <span>Процессууд</span>
                                </div>
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="templates">Загварууд</TabsTrigger>
                                    <TabsTrigger value="active">Идэвхтэй</TabsTrigger>
                                </TabsList>
                            </div>

                            {/* Templates Tab */}
                            <TabsContent value="templates" className="flex-1 flex flex-col overflow-hidden m-0 data-[state=inactive]:hidden">
                                <div className="p-4 pb-2 space-y-3">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="Загвар хайх..." className="pl-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
                                    </div>
                                    <Button
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 dark:shadow-none transition-all"
                                        size="sm"
                                        onClick={handleCreateNew}
                                    >
                                        <Plus className="mr-2 h-4 w-4" /> Шинэ загвар
                                    </Button>
                                </div>
                                <ScrollArea className="flex-1">
                                    <div className="p-3 space-y-1">
                                        {templates.map((template) => (
                                            <div
                                                key={template.id}
                                                onClick={() => selectTemplate(template.id)}
                                                className={cn(
                                                    "p-3 rounded-lg cursor-pointer transition-all border border-transparent group relative",
                                                    currentTemplate?.id === template.id && !currentInstance
                                                        ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-sm"
                                                        : "hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                                                )}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className={cn("text-sm font-medium", currentTemplate?.id === template.id && !currentInstance ? "text-indigo-700 dark:text-indigo-400" : "text-slate-700 dark:text-slate-200")}>
                                                        {template.name}
                                                    </h4>
                                                    {currentTemplate?.id === template.id && !currentInstance && (
                                                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-center text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1"><FileInput className="h-3 w-3" /> {(template.nodes?.length || 0)} Шат</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteTemplate(template.id);
                                                        }}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </TabsContent>

                            {/* Active Processes Tab */}
                            <TabsContent value="active" className="flex-1 flex flex-col overflow-hidden m-0 data-[state=inactive]:hidden">
                                <div className="p-4 pb-2 space-y-3">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="Ажилтан хайх..." className="pl-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
                                    </div>
                                </div>
                                <ScrollArea className="flex-1">
                                    <div className="p-3 space-y-1">
                                        {instances.map((instance: any) => (
                                            <div
                                                key={instance.id}
                                                onClick={() => selectInstance(instance.id)}
                                                className={cn(
                                                    "p-3 rounded-lg cursor-pointer transition-all border border-transparent group relative",
                                                    currentInstance?.id === instance.id
                                                        ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-sm"
                                                        : "hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                                                )}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className={cn("text-sm font-medium", currentInstance?.id === instance.id ? "text-indigo-700 dark:text-indigo-400" : "text-slate-700 dark:text-slate-200")}>
                                                        {instance.employeeName || 'Unknown'}
                                                    </h4>
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn(
                                                            "px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide",
                                                            instance.status === 'completed' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                                                        )}>
                                                            {instance.status === 'completed' ? 'Дууссан' : 'Идэвхтэй'}
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteInstance(instance.id);
                                                            }}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-muted-foreground mb-2">
                                                    {instance.templateName}
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                                        style={{ width: `${instance.progress || 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* MAIN CONTENT: Canvas Area */}
                    <div className="flex-1 flex flex-col relative h-full">

                        {/* Canvas Toolbar (Top Overlay) */}
                        <div className="absolute top-4 left-4 z-10 flex gap-2">
                            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border shadow-sm rounded-lg p-1 flex items-center gap-1">
                                <div className="px-3 py-1 border-r pr-3 mr-1">
                                    <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">
                                        {viewMode === 'template' ? 'СОНГОСОН ЗАГВАР:' : 'Ажилтан:'}
                                    </span>
                                    <span className="ml-2 font-medium text-sm text-slate-800 dark:text-slate-200">
                                        {viewMode === 'template'
                                            ? (currentTemplate?.name || 'Сонгоогүй')
                                            : (currentInstance?.employeeName || 'Сонгоогүй')}
                                    </span>
                                </div>
                                {viewMode === 'template' && (
                                    <>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded"><Settings2 className="h-4 w-4" /></Button>
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs ml-2"
                                            onClick={() => saveCurrentTemplate()}
                                            disabled={!currentTemplate}
                                        >
                                            Хадгалах
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white h-7 text-xs ml-1"
                                            onClick={() => setIsStartDialogOpen(true)}
                                            disabled={!currentTemplate}
                                        >
                                            <Play className="h-3 w-3 mr-1" /> Эхлүүлэх
                                        </Button>

                                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 rounded px-3 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                            onClick={() => {
                                                const lastNode = nodes[nodes.length - 1];
                                                const newPosition = lastNode
                                                    ? { x: lastNode.position.x + 350, y: lastNode.position.y }
                                                    : { x: 100, y: 100 };

                                                addNode({
                                                    id: `stage_${Math.random().toString(36).substr(2, 9)}`,
                                                    type: 'stage',
                                                    position: newPosition,
                                                    data: {
                                                        label: `Үе шат ${nodes.length + 1}`,
                                                        type: 'stage',
                                                        checklist: [],
                                                        documents: [],
                                                        stakeholders: []
                                                    },
                                                });
                                            }}
                                            disabled={!currentTemplate}
                                        >
                                            <Plus className="h-3 w-3 mr-1" /> Шат нэмэх
                                        </Button>
                                    </>
                                )}
                                {viewMode === 'instance' && currentInstance && (
                                    <div className="flex items-center gap-2 pl-2 border-l ml-2">
                                        <div className="text-xs text-muted-foreground">Явц:</div>
                                        <div className="font-mono text-xs font-bold text-indigo-600">{currentInstance.progress || 0}%</div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50 ml-2 uppercase font-bold tracking-wider"
                                            onClick={() => deleteInstance(currentInstance.id)}
                                        >
                                            <Trash2 className="h-3 w-3 mr-1" /> Процесс устгах
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* The Canvas */}
                        <div className="flex-1 w-full h-full">
                            <ProcessCanvas onNodeClick={handleNodeClick} />
                        </div>
                    </div>

                    {/* RIGHT DRAWER: Configuration Panel */}
                    <NodeConfigPanel open={isConfigOpen} onOpenChange={(open) => !open && setSelectedNodeId(null)} />

                    {/* DIALOG: Start Process */}
                    <StartProcessDialog
                        open={isStartDialogOpen}
                        onOpenChange={setIsStartDialogOpen}
                        template={currentTemplate}
                    />
                </div>
            </TabsContent>

            {/* EMPLOYEE CONTENT */}
            <TabsContent value="employee" className="flex-1 flex overflow-hidden data-[state=inactive]:hidden mt-0">
                <EmployeeTasksView instances={instances} />
            </TabsContent>
        </Tabs>
    );
}
