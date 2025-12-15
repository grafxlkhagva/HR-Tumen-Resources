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
import { useCollection, useFirebase, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// --- Type Definitions ---
type Department = {
  id: string;
  name: string;
  typeId?: string;
  parentId?: string;
};

type DepartmentType = {
  id: string;
  name: string;
};

type Position = {
  id: string;
  departmentId: string;
  headcount: number;
  isActive: boolean;
};

type Employee = {
    id: string;
    positionId: string;
    status: 'Идэвхтэй';
}

type DepartmentNodeData = {
    label: string;
    type: string;
    headcount: number;
    filled: number;
};


// --- Helper Functions for Layout ---
const nodeWidth = 240;
const nodeHeight = 120;
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
const DepartmentNode = ({ data }: { data: DepartmentNodeData }) => {
    return (
        <Card className="w-[240px] h-[120px] rounded-lg border-2 border-primary shadow-lg bg-card text-card-foreground">
            <Handle type="target" position={Position.Top} className="!bg-primary" />
            <CardHeader className="p-3">
                <CardTitle className="text-base truncate">{data.label}</CardTitle>
                <CardDescription>{data.type}</CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0 grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <div>
                        <div className="text-xs text-muted-foreground">Батлагдсан</div>
                        <div className="font-bold">{data.headcount}</div>
                    </div>
                </div>
                 <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-muted-foreground" />
                     <div>
                        <div className="text-xs text-muted-foreground">Ажиллаж буй</div>
                        <div className="font-bold">{data.filled}</div>
                    </div>
                </div>
            </CardContent>
             <Handle type="source" position={Position.Bottom} className="!bg-primary" />
        </Card>
    );
};

const nodeTypes = {
  department: DepartmentNode,
};

// --- Main Chart Component ---
const OrganizationChart = () => {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const deptsQuery = useMemoFirebase(() => collection(firestore, 'departments'), [firestore]);
    const deptTypesQuery = useMemoFirebase(() => collection(firestore, 'departmentTypes'), [firestore]);
    const positionsQuery = useMemoFirebase(() => collection(firestore, 'positions'), [firestore]);
    const employeesQuery = useMemoFirebase(() => collection(firestore, 'employees'), [firestore]);

    const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(deptsQuery);
    const { data: departmentTypes, isLoading: isLoadingTypes } = useCollection<DepartmentType>(deptTypesQuery);
    const { data: positions, isLoading: isLoadingPos } = useCollection<Position>(positionsQuery);
    const { data: employees, isLoading: isLoadingEmp } = useCollection<Employee>(employeesQuery);

    const isLoading = isLoadingDepts || isLoadingTypes || isLoadingPos || isLoadingEmp;
    
    const onConnect = React.useCallback(
        (connection: Connection) => {
          if (!firestore || !connection.source || !connection.target) return;
    
          const newEdge = { ...connection, animated: true, style: { strokeWidth: 2 } };
          setEdges((eds) => addEdge(newEdge, eds));
          
          // Update parentId in Firestore
          const childDocRef = doc(firestore, 'departments', connection.target);
          updateDocumentNonBlocking(childDocRef, { parentId: connection.source });

          toast({
            title: 'Холбоос үүслээ',
            description: 'Бүтцийн хамаарал амжилттай шинэчлэгдлээ.',
          });
        },
        [firestore, setEdges, toast]
    );

    const onEdgesDelete = React.useCallback(
        (edgesToDelete: Edge[]) => {
            if(!firestore) return;
            
            edgesToDelete.forEach(edge => {
                const childDocRef = doc(firestore, 'departments', edge.target);
                updateDocumentNonBlocking(childDocRef, { parentId: '' });
            });

            toast({
                title: 'Холбоос устлаа',
                variant: 'destructive',
            });
        },
        [firestore]
    );

    React.useEffect(() => {
        if (isLoading || !departments || !departmentTypes || !positions || !employees) return;

        const typeMap = new Map(departmentTypes.map(t => [t.id, t.name]));
        
        const filledCountByDept = employees.reduce((acc, emp) => {
            const pos = positions.find(p => p.id === emp.positionId);
            if (pos && emp.status === 'Идэвхтэй') {
                acc.set(pos.departmentId, (acc.get(pos.departmentId) || 0) + 1);
            }
            return acc;
        }, new Map<string, number>());
        
        const headcountByDept = positions.reduce((acc, pos) => {
            if (pos.isActive) {
                acc.set(pos.departmentId, (acc.get(pos.departmentId) || 0) + pos.headcount);
            }
            return acc;
        }, new Map<string, number>());


        const initialNodes: Node[] = departments.map(dept => ({
            id: dept.id,
            type: 'department',
            data: { 
                label: dept.name,
                type: typeMap.get(dept.typeId || '') || 'Тодорхойгүй',
                headcount: headcountByDept.get(dept.id) || 0,
                filled: filledCountByDept.get(dept.id) || 0
            },
            position: { x: 0, y: 0 },
        }));

        const initialEdges: Edge[] = departments
            .filter(dept => dept.parentId)
            .map(dept => ({
                id: `${dept.parentId}-${dept.id}`,
                source: dept.parentId!,
                target: dept.id,
                animated: true,
                style: { strokeWidth: 2 },
            }));

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges);

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

    }, [isLoading, departments, departmentTypes, positions, employees, setNodes, setEdges]);
    
    if (isLoading) {
        return <Skeleton className="w-full h-[600px]" />;
    }

    return (
        <div style={{ width: '100%', height: 'calc(100vh - 200px)' }}>
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
          <CardTitle>Байгууллагын бүтэц</CardTitle>
          <CardDescription>
            Байгууллагын бүтцийг хязгааргүй canvas дээр харах, удирдах. Нэгжээс нөгөө рүү чирч холбоос үүсгээрэй.
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
