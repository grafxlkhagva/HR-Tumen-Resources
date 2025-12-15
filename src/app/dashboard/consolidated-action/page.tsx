'use client';

import * as React from 'react';
import ReactFlow, {
  Controls,
  Background,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Position,
  Handle,
} from 'reactflow';
import 'reactflow/dist/style.css';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCollection, useFirebase, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Briefcase, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddPositionDialog } from '../organization/add-position-dialog';

// --- Type Definitions ---
type PositionData = {
  id: string;
  title: string;
  departmentId: string;
  headcount: number;
  isActive: boolean;
  reportsTo?: string;
  levelId?: string;
  employmentTypeId?: string;
  jobCategoryId?: string;
  createdAt?: string;
  // Locally computed
  filled: number;
};

type Employee = {
    id: string;
    positionId: string;
    status: 'Идэвхтэй';
}

type Department = {
    id: string;
    name: string;
    color?: string;
};

type Reference = {
    id: string;
    name: string;
}

type JobCategoryReference = Reference & {
    code: string;
}

type PositionNodeData = {
    label: string;
    headcount: number;
    filled: number;
    color: string;
    onEdit: () => void;
    onDelete: () => void;
};


// --- Helper Functions for Layout ---
const nodeWidth = 240;
const nodeHeight = 100;
const horizontalSpacing = 60;
const verticalSpacing = 100;

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  if (nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const graph = new Map<string, string[]>();
  const nodeMap = new Map<string, Node>();
  const roots: string[] = [];

  nodes.forEach((node) => {
    graph.set(node.id, []);
    nodeMap.set(node.id, node);
  });

  edges.forEach((edge) => {
    graph.get(edge.source)?.push(edge.target);
  });

  nodes.forEach(node => {
      const isChild = edges.some(edge => edge.target === node.id);
      if(!isChild) {
          roots.push(node.id);
      }
  });

  const layout = new Map<string, { x: number; y: number; width: number }>();

  function calculateWidth(nodeId: string): number {
    const children = graph.get(nodeId) || [];
    if (children.length === 0) {
      return nodeWidth;
    }
    const childrenWidth = children.map(calculateWidth).reduce((sum, width) => sum + width, 0);
    return Math.max(nodeWidth, childrenWidth + (children.length - 1) * horizontalSpacing);
  }
  
  function positionNodes(nodeId: string, x: number, y: number) {
    const node = nodeMap.get(nodeId);
    if (!node) return;

    const totalWidth = layout.get(nodeId)?.width || nodeWidth;
    layout.set(nodeId, { ...layout.get(nodeId)!, x: x + (totalWidth - nodeWidth) / 2, y });

    const children = graph.get(nodeId) || [];
    let currentX = x;
    children.forEach((childId) => {
      positionNodes(childId, currentX, y + nodeHeight + verticalSpacing);
      currentX += (layout.get(childId)?.width || 0) + horizontalSpacing;
    });
  }
  
  nodes.forEach(node => {
    layout.set(node.id, { x: 0, y: 0, width: calculateWidth(node.id) });
  });

  let currentX = 0;
  roots.forEach(rootId => {
      positionNodes(rootId, currentX, 0);
      currentX += (layout.get(rootId)?.width || 0) + horizontalSpacing * 2;
  })


  const layoutedNodes = nodes.map((node) => {
    const pos = layout.get(node.id);
    return {
      ...node,
      position: { x: pos?.x || 0, y: pos?.y || 0 },
    };
  });

  return { nodes: layoutedNodes, edges };
};


// --- Custom Node Component ---
const PositionNode = ({ data }: { data: PositionNodeData }) => {
    const cardStyle = {
        backgroundColor: data.color || 'hsl(var(--card))',
        borderColor: data.color || 'hsl(var(--primary))',
        borderWidth: data.color ? '2px' : '1px',
        color: 'hsl(var(--card-foreground))',
    };

    return (
        <Card className="w-[240px] h-[100px] rounded-lg shadow-lg" style={cardStyle}>
            <Handle type="target" position={Position.Top} className="!bg-primary" />
            <CardHeader className="p-3">
                <div className="flex items-start justify-between">
                    <CardTitle className="text-base truncate">{data.label}</CardTitle>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-1">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={data.onEdit}>
                                <Pencil className="mr-2 h-4 w-4" /> Засах
                            </DropdownMenuItem>
                             <DropdownMenuItem onClick={data.onDelete} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Устгах
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4" />
                    <div>
                        <div className="text-xs">Батлагдсан</div>
                        <div className="font-bold">{data.headcount}</div>
                    </div>
                </div>
                 <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                     <div>
                        <div className="text-xs">Ажиллаж буй</div>
                        <div className="font-bold">{data.filled}</div>
                    </div>
                </div>
            </CardContent>
             <Handle type="source" position={Position.Bottom} className="!bg-primary" />
        </Card>
    );
};

const nodeTypes = {
  position: PositionNode,
};

// --- Main Chart Component ---
const OrganizationChart = () => {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isPositionDialogOpen, setIsPositionDialogOpen] = React.useState(false);
    const [editingPosition, setEditingPosition] = React.useState<PositionData | null>(null);

    // Data queries
    const positionsQuery = useMemoFirebase(() => collection(firestore, 'positions'), [firestore]);
    const employeesQuery = useMemoFirebase(() => collection(firestore, 'employees'), [firestore]);
    const departmentsQuery = useMemoFirebase(() => collection(firestore, 'departments'), [firestore]);
    const levelsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'positionLevels') : null), [firestore]);
    const empTypesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'employmentTypes') : null), [firestore]);
    const jobCategoriesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'jobCategories') : null), [firestore]);

    const { data: positions, isLoading: isLoadingPos } = useCollection<PositionData>(positionsQuery);
    const { data: employees, isLoading: isLoadingEmp } = useCollection<Employee>(employeesQuery);
    const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(departmentsQuery);
    const { data: positionLevels, isLoading: isLoadingLevels } = useCollection<Reference>(levelsQuery);
    const { data: employmentTypes, isLoading: isLoadingEmpTypes } = useCollection<Reference>(empTypesQuery);
    const { data: jobCategories, isLoading: isLoadingJobCategories } = useCollection<JobCategoryReference>(jobCategoriesQuery);

    const isLoading = isLoadingPos || isLoadingEmp || isLoadingDepts || isLoadingLevels || isLoadingEmpTypes || isLoadingJobCategories;

    // --- Dialog and CRUD Handlers ---
    const handleOpenEditDialog = (posId: string) => {
        const positionToEdit = positions?.find(p => p.id === posId);
        if (positionToEdit) {
            setEditingPosition(positionToEdit);
            setIsPositionDialogOpen(true);
        }
    };
    
    const handleDeletePosition = (posId: string) => {
        if (!firestore) return;
        const docRef = doc(firestore, 'positions', posId);
        deleteDocumentNonBlocking(docRef);
        toast({
            title: 'Амжилттай устгагдлаа',
            variant: 'destructive',
        });
    };
    
    const onConnect = React.useCallback(
        (connection: Connection) => {
          if (!firestore || !connection.source || !connection.target) return;
    
          const newEdge = { ...connection, animated: true, style: { strokeWidth: 2 } };
          setEdges((eds) => addEdge(newEdge, eds));
          
          const childDocRef = doc(firestore, 'positions', connection.target);
          updateDocumentNonBlocking(childDocRef, { reportsTo: connection.source });

          toast({
            title: 'Холбоос үүслээ',
            description: 'Албан тушаалын хамаарал амжилттай шинэчлэгдлээ.',
          });
        },
        [firestore, setEdges, toast]
    );

    const onEdgesDelete = React.useCallback(
        (edgesToDelete: Edge[]) => {
            if(!firestore) return;
            
            edgesToDelete.forEach(edge => {
                const childDocRef = doc(firestore, 'positions', edge.target);
                updateDocumentNonBlocking(childDocRef, { reportsTo: null });
            });

            toast({
                title: 'Холбоос устлаа',
                variant: 'destructive',
            });
        },
        [firestore, toast]
    );

    React.useEffect(() => {
        if (isLoading || !positions || !employees || !departments) return;

        const filledCountByPosition = employees.reduce((acc, emp) => {
            if (emp.positionId && emp.status === 'Идэвхтэй') {
                acc.set(emp.positionId, (acc.get(emp.positionId) || 0) + 1);
            }
            return acc;
        }, new Map<string, number>());

        const departmentColorMap = new Map(departments.map(d => [d.id, d.color]));
        
        const activePositions = positions.filter(p => p.isActive);

        const initialNodes: Node[] = activePositions.map(pos => ({
            id: pos.id,
            type: 'position',
            data: { 
                label: pos.title,
                headcount: pos.headcount || 0,
                filled: filledCountByPosition.get(pos.id) || 0,
                color: departmentColorMap.get(pos.departmentId) || '#ffffff',
                onEdit: () => handleOpenEditDialog(pos.id),
                onDelete: () => handleDeletePosition(pos.id),
            },
            position: { x: 0, y: 0 },
        }));

        const initialEdges: Edge[] = activePositions
            .filter(pos => pos.reportsTo)
            .map(pos => ({
                id: `${pos.reportsTo}-${pos.id}`,
                source: pos.reportsTo!,
                target: pos.id,
                animated: true,
                style: { strokeWidth: 2 },
            }));

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges);

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

    }, [isLoading, positions, employees, departments, setNodes, setEdges]);
    
    if (isLoading) {
        return <Skeleton className="w-full h-[600px]" />;
    }

    return (
        <div style={{ width: '100%', height: 'calc(100vh - 200px)' }}>
            <AddPositionDialog
                open={isPositionDialogOpen}
                onOpenChange={setIsPositionDialogOpen}
                departments={departments || []}
                allPositions={positions || []}
                positionLevels={positionLevels || []}
                employmentTypes={employmentTypes || []}
                jobCategories={jobCategories || []}
                editingPosition={editingPosition}
            />
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onEdgesDelete={onEdgesDelete}
                nodeTypes={nodeTypes}
                fitView
                className="bg-background"
                proOptions={{ hideAttribution: true }}
                connectionLineStyle={{ stroke: '#2563eb', strokeWidth: 2 }}
                deleteKeyCode={['Backspace', 'Delete']}
            >
                <Controls />
                <Background gap={16} />
            </ReactFlow>
        </div>
    );
};

// --- Page ---
export default function ConsolidatedActionPage() {
  return (
    <div className="py-8">
      <Card>
        <CardHeader>
          <CardTitle>Байгууллагын бүтэц (Албан тушаалаар)</CardTitle>
          <CardDescription>
            Байгууллагын бүтцийг албан тушаалын шатлалаар харах, удирдах. Нэгжээс нөгөө рүү чирч холбоос үүсгээрэй.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <ReactFlowProvider>
                <OrganizationChart />
            </ReactFlowProvider>
        </CardContent>
      </Card>
    </div>
  );
}
