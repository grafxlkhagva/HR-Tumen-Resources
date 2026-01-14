'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
    Node,
    Edge,
    useNodesState,
    useEdgesState,
    OnNodesChange,
    OnEdgesChange,
    Connection,
    addEdge
} from 'reactflow';
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useCollection } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { RelationTemplate, StageNodeData } from './types';
import { useToast } from '@/hooks/use-toast';

interface ProcessManagementContextType {
    // Template State
    templates: RelationTemplate[];
    isLoadingTemplates: boolean;
    currentTemplate: RelationTemplate | null;
    selectTemplate: (templateId: string) => void;
    createNewTemplate: (name: string, type: string) => Promise<void>;
    saveCurrentTemplate: () => Promise<void>;
    deleteTemplate: (templateId: string) => Promise<void>;

    // Instance State
    instances: any[]; // using any for now to avoid strict type issues with Firestore returns for the moment
    currentInstance: any | null;
    selectInstance: (instanceId: string) => void;
    deleteInstance: (instanceId: string) => Promise<void>;
    viewMode: 'template' | 'instance';
    setViewMode: (mode: 'template' | 'instance') => void;

    // Flow State
    nodes: Node[];
    edges: Edge[];
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: (connection: Connection) => void;
    addNode: (node: Node) => void;

    // Selection State
    selectedNode: Node<StageNodeData> | null;
    setSelectedNodeId: (id: string | null) => void;
    updateSelectedNodeData: (data: Partial<StageNodeData>) => void;
}

const ProcessManagementContext = createContext<ProcessManagementContextType | null>(null);

export function useProcessManagement() {
    const context = useContext(ProcessManagementContext);
    if (!context) {
        throw new Error('useProcessManagement must be used within a ProcessManagementProvider');
    }
    return context;
}

export function ProcessManagementProvider({ children }: { children: React.ReactNode }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    // Firebase Data
    const templatesQuery = useMemo(() => firestore ? collection(firestore, 'relation_templates') : null, [firestore]);
    const { data: templates = [], isLoading: isLoadingTemplates } = useCollection<RelationTemplate>(templatesQuery);

    const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);

    // Flow State
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    const currentTemplate = useMemo(() =>
        templates.find(t => t.id === currentTemplateId) || null
        , [templates, currentTemplateId]);

    // Load template data when selected
    React.useEffect(() => {
        if (currentTemplate) {
            // Only set if we haven't loaded them yet or if it's a fresh selection?
            // For now, simple sync.
            // Note: This might cause loop if we save -> it updates -> we reload. 
            // Ideally we only load on ID change.
            if (nodes.length === 0 && edges.length === 0) {
                setNodes(currentTemplate.nodes || []);
                setEdges(currentTemplate.edges || []);
            }
        }
    }, [currentTemplateId, currentTemplate]);

    // Actions
    const createNewTemplate = useCallback(async (name: string, type: string) => {
        if (!firestore) return;

        const newTemplate: Partial<RelationTemplate> = {
            name,
            type: type as any,
            description: '',
            isPublished: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            nodes: [],
            edges: []
        };

        try {
            const ref = await addDocumentNonBlocking(collection(firestore, 'relation_templates'), newTemplate);
            if (ref) {
                toast({ title: "Амжилттай", description: `"${name}" загвар үүсгэгдлээ.` });
                setCurrentTemplateId(ref.id);
                setNodes([]);
                setEdges([]);
            }
        } catch (e) {
            console.error(e);
            toast({ title: "Алдаа", description: "Загвар үүсгэхэд алдаа гарлаа.", variant: "destructive" });
        }
    }, [firestore, toast, setNodes, setEdges]);

    const saveCurrentTemplate = useCallback(async () => {
        if (!firestore || !currentTemplateId) return;

        try {
            await updateDocumentNonBlocking(doc(firestore, 'relation_templates', currentTemplateId), {
                nodes: nodes.map(n => ({ ...n, selected: false })),
                edges,
                updatedAt: new Date().toISOString()
            });
            toast({ title: "Хадгалагдлаа", description: "Өөрчлөлтүүд амжилттай хадгалагдлаа." });
        } catch (e) {
            console.error(e);
            toast({ title: "Алдаа", description: "Хадгалахад алдаа гарлаа.", variant: "destructive" });
        }
    }, [firestore, currentTemplateId, nodes, edges, toast]);

    // Instance Data
    const instancesQuery = useMemo(() => firestore ? collection(firestore, 'relation_instances') : null, [firestore]);
    const { data: instances = [], isLoading: isLoadingInstances } = useCollection(instancesQuery);

    const deleteTemplate = useCallback(async (templateId: string) => {
        if (!firestore) return;

        // 1. Check for active instances using this template
        const linkedInstances = instances.filter(i => (i as any).templateId === templateId);
        const activeCount = linkedInstances.filter(i => (i as any).status === 'active').length;

        if (linkedInstances.length > 0) {
            const msg = activeCount > 0
                ? `Энэ загварыг ${activeCount} ажилтан идэвхтэй ашиглаж байна. Загварыг устгахын тулд эхлээд холбоотой бүх процессыг устгах шаардлагатай.\n\nБүх процессыг устгаад, загварыг хамт устгах уу?`
                : `Энэ загварт холбоотой ${linkedInstances.length} дууссан процесс байна. Бүгдийг нь устгаад загварыг хамт устгах уу?`;

            if (confirm(msg)) {
                try {
                    const { deleteDocumentNonBlocking } = await import('@/firebase');
                    // Delete all linked instances
                    for (const instance of linkedInstances) {
                        await deleteDocumentNonBlocking(doc(firestore, 'relation_instances', (instance as any).id));
                    }
                    // Delete template
                    await deleteDocumentNonBlocking(doc(firestore, 'relation_templates', templateId));

                    if (currentTemplateId === templateId) {
                        setCurrentTemplateId(null);
                        setNodes([]);
                        setEdges([]);
                    }
                    toast({ title: "Амжилттай", description: "Загвар болон холбоотой бүх процессууд устгагдлаа." });
                } catch (e) {
                    console.error(e);
                    toast({ title: "Алдаа", description: "Устгахад алдаа гарлаа.", variant: "destructive" });
                }
            }
            return;
        }

        if (!confirm("Та энэ загварыг устгахдаа итгэлтэй байна уу?")) return;

        try {
            const { deleteDocumentNonBlocking } = await import('@/firebase');
            await deleteDocumentNonBlocking(doc(firestore, 'relation_templates', templateId));

            if (currentTemplateId === templateId) {
                setCurrentTemplateId(null);
                setNodes([]);
                setEdges([]);
            }

            toast({ title: "Устгагдлаа", description: "Загвар амжилттай устгагдлаа." });
        } catch (e) {
            console.error(e);
            toast({ title: "Алдаа", description: "Устгахад алдаа гарлаа.", variant: "destructive" });
        }
    }, [firestore, instances, currentTemplateId, toast, setNodes, setEdges]);

    // Flow Handlers
    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true }, eds)),
        [setEdges],
    );

    const addNode = useCallback((node: Node) => {
        setNodes((nds) => nds.concat(node));
    }, [setNodes]);

    const [currentInstanceId, setCurrentInstanceId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'template' | 'instance'>('template');

    const currentInstance = useMemo(() =>
        (instances as any[]).find(i => i.id === currentInstanceId) || null
        , [instances, currentInstanceId]);

    // Load instance data when selected
    React.useEffect(() => {
        if (currentInstance && viewMode === 'instance') {
            // Load snapshot data from the instance
            // Note: Instances store the snapshot of nodes/edges at the time of creation
            if (currentInstance.snapshot) {
                // Inject runtime data into nodes (progress, status)
                // For now, just load the structure
                setNodes(currentInstance.snapshot.nodes || []);
                setEdges(currentInstance.snapshot.edges || []);
            }
        }
    }, [currentInstanceId, currentInstance, viewMode]);

    const selectInstance = useCallback((id: string) => {
        setCurrentInstanceId(id);
        setViewMode('instance');
        setSelectedNodeId(null);
    }, []);

    // Switch back to template mode
    const selectTemplate = useCallback((id: string) => {
        setCurrentTemplateId(id);
        setViewMode('template');
        setSelectedNodeId(null);
        // Force reload state for new template
        const t = templates.find(temp => temp.id === id);
        if (t) {
            setNodes(t.nodes || []);
            setEdges(t.edges || []);
        }
    }, [templates, setNodes, setEdges]);

    const deleteInstance = useCallback(async (instanceId: string) => {
        if (!firestore) return;

        if (!confirm("Та энэ процессыг устгахдаа итгэлтэй байна уу? Ажилтны бүх даалгавар устах болно.")) return;

        try {
            const { deleteDocumentNonBlocking } = await import('@/firebase');
            await deleteDocumentNonBlocking(doc(firestore, 'relation_instances', instanceId));

            if (currentInstanceId === instanceId) {
                setCurrentInstanceId(null);
                setNodes([]);
                setEdges([]);
                setViewMode('template');
            }

            toast({ title: "Устгагдлаа", description: "Процесс амжилттай устгагдлаа." });
        } catch (e) {
            console.error(e);
            toast({ title: "Алдаа", description: "Устгахад алдаа гарлаа.", variant: "destructive" });
        }
    }, [firestore, currentInstanceId, toast, setNodes, setEdges]);

    // Selection
    const selectedNode = useMemo(() =>
        nodes.find(n => n.id === selectedNodeId) || null
        , [nodes, selectedNodeId]);

    const updateSelectedNodeData = useCallback((data: Partial<StageNodeData>) => {
        setNodes((nds) => nds.map(n => {
            if (n.id === selectedNodeId) {
                return { ...n, data: { ...n.data, ...data } };
            }
            return n;
        }));
    }, [selectedNodeId, setNodes]);

    const value = {
        templates,
        isLoadingTemplates,
        currentTemplate,
        selectTemplate,
        createNewTemplate,
        saveCurrentTemplate,

        // Instance Props
        instances,
        currentInstance,
        selectInstance,
        viewMode,
        setViewMode,

        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        addNode,
        selectedNode,
        setSelectedNodeId,
        updateSelectedNodeData,
        deleteTemplate,
        deleteInstance
    };

    return (
        <ProcessManagementContext.Provider value={value as any}>
            {children}
        </ProcessManagementContext.Provider>
    );
}
