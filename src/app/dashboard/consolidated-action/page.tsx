'use client';

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  Background,
  Controls,
  MarkerType,
  Handle,
  Position,
  NodePositionChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import Link from 'next/link';

import {
  useCollection,
  useFirebase,
  useMemoFirebase,
  updateDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, query, where, collectionGroup, writeBatch, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { User, Users, Briefcase, PlusCircle, CalendarCheck2, LogIn, LogOut, MoreHorizontal, Pencil, Layout, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AddPositionDialog } from '../organization/add-position-dialog';
import { AssignEmployeeDialog } from '../organization/assign-employee-dialog';
import { isWithinInterval, format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Employee as BaseEmployee } from '../employees/data';

// --- Types ---
type Employee = BaseEmployee & {
  questionnaireCompletion?: number;
};


interface Department {
  id: string;
  name: string;
  color?: string;
}

interface Position {
  id: string;
  title: string;
  departmentId: string;
  headcount: number;
  filled: number;
  reportsTo?: string;
  levelId?: string;
  employmentTypeId?: string;
  jobCategoryId?: string;
  workScheduleId?: string;
  isActive?: boolean;
}

interface PositionNodeData {
  label: string;
  title: string;
  department: string;
  departmentColor?: string;
  headcount: number;
  filled: number;
  employees: Employee[];
  workScheduleName?: string;
  onAddEmployee: (position: Position) => void;
  onEditPosition: (position: Position) => void;
  attendanceStatus?: {
    status: 'on-leave' | 'checked-in' | 'checked-out' | 'absent';
    checkInTime?: string;
    checkOutTime?: string;
  }
}

interface EmployeeNodeData {
  label: string;
  name: string;
  jobTitle: string;
  avatar?: string;
}

type CustomNode = Node<PositionNodeData | EmployeeNodeData>;

// --- Constants & Layout ---
const X_GAP = 350;
const Y_GAP = 300;
const LAYOUT_STORAGE_KEY = 'org-chart-layout';

// --- Helper Functions ---
function isColorDark(hex: string): boolean {
    if (!hex) return false;
    const color = hex.startsWith('#') ? hex.substring(1) : hex;
    const rgb = parseInt(color, 16); // convert rrggbb to decimal
    const r = (rgb >> 16) & 0xff; // extract red
    const g = (rgb >> 8) & 0xff; // extract green
    const b = (rgb >> 0) & 0xff; // extract blue
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709
    return luma < 128;
}

// --- Node Components ---

const AvatarWithProgress = ({ employee, size = 80 }: { employee?: Employee; size?: number; }) => {
    const progress = employee?.questionnaireCompletion || 0;
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    const progressColor = 
        progress < 50 ? '#ef4444' : // red-500
        progress < 90 ? '#f59e0b' : // amber-500
        '#22c55e'; // green-500
    
    const avatarContent = (
         <div className="relative mx-auto mb-3" style={{ width: size, height: size }}>
            <Avatar className="h-full w-full">
                <AvatarImage src={employee?.photoURL} alt={employee?.firstName} />
                <AvatarFallback className="text-3xl bg-muted">
                    {employee ? employee.firstName?.charAt(0) : <User className="h-8 w-8 text-muted-foreground"/>}
                </AvatarFallback>
            </Avatar>
            {employee && (
                 <svg
                    className="absolute top-0 left-0"
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                    style={{ '--progress-color': progressColor } as React.CSSProperties}
                >
                    <circle
                        className="text-muted/30"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        r={radius}
                        cx={size / 2}
                        cy={size / 2}
                    />
                    <circle
                        className="transition-all duration-500 ease-in-out stroke-progress"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        fill="transparent"
                        r={radius}
                        cx={size / 2}
                        cy={size / 2}
                        transform={`rotate(-90 ${size/2} ${size/2})`}
                    />
                </svg>
            )}
        </div>
    );
    
    if (employee) {
        return <Link href={`/dashboard/employees/${employee.id}`}>{avatarContent}</Link>
    }

    return avatarContent;
};


const PositionNode = ({ data }: { data: PositionNodeData }) => {
  const employee = data.employees[0];
  const isDarkBg = data.departmentColor ? isColorDark(data.departmentColor) : false;
  const textColor = isDarkBg ? 'text-white' : 'text-foreground';
  const mutedTextColor = isDarkBg ? 'text-gray-300' : 'text-muted-foreground';


  return (
    <Card 
        className={cn("w-64 rounded-xl shadow-lg relative group", textColor)}
        style={{ backgroundColor: data.departmentColor }}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary opacity-0" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className={cn("h-7 w-7 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity", textColor)}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => data.onEditPosition(data as any)}><Pencil className="mr-2 h-4 w-4" /> Ажлын байр засах</DropdownMenuItem>
          <DropdownMenuItem onClick={() => data.onAddEmployee(data as any)}><PlusCircle className="mr-2 h-4 w-4" /> Ажилтан томилох</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CardContent className="p-4 text-center">
        <AvatarWithProgress employee={employee} size={80} />
        
        {employee ? (
            <p className="font-semibold text-base">{employee.firstName} {employee.lastName}</p>
        ) : (
            <p className={cn("font-semibold text-base", mutedTextColor)}>Сул орон тоо</p>
        )}
        <p className={cn("text-sm", mutedTextColor)}>{data.title}</p>
        
        <div className={cn("mt-4 pt-4 border-t space-y-1 text-xs text-left", isDarkBg ? 'border-gray-500' : 'border-border')}>
            <div className="flex justify-between">
                <span className={mutedTextColor}>Хэлтэс:</span>
                <span className="font-medium">{data.department}</span>
            </div>
             <div className="flex justify-between">
                <span className={mutedTextColor}>Орон тоо:</span>
                <span className="font-medium">{data.filled} / {data.headcount}</span>
            </div>
        </div>
        
      </CardContent>
      <Handle type="source" position={Position.Bottom} className="!bg-primary opacity-0" />
    </Card>
  );
};


const UnassignedEmployeeNode = ({ data }: { data: EmployeeNodeData }) => (
    <Card className="w-64 bg-amber-50 border-amber-200 shadow-md">
        <Handle type="source" position={Position.Right} className="!bg-amber-500" />
        <CardContent className="p-3 flex items-center gap-3">
             <Avatar className="h-9 w-9"><AvatarImage src={data.avatar} alt={data.name} /><AvatarFallback>{data.name?.charAt(0)}</AvatarFallback></Avatar>
            <div>
                <p className="font-semibold">{data.name}</p>
                <p className="text-xs text-muted-foreground">{data.jobTitle || 'Албан тушаалгүй'}</p>
            </div>
        </CardContent>
    </Card>
)

const nodeTypes = { position: PositionNode, unassigned: UnassignedEmployeeNode };
const SkeletonChart = () => <div className="relative h-[80vh] w-full"><Skeleton className="h-32 w-64 absolute top-10 left-10" /><Skeleton className="h-32 w-64 absolute top-60 left-80" /><Skeleton className="h-32 w-64 absolute top-10 right-10" /></div>

// --- Layouting Logic ---
function calculateLayout(positions: Position[]) {
    const positionMap = new Map(positions.map((p) => [p.id, p]));
    const childrenMap = new Map<string, string[]>();
    positions.forEach((p) => {
        if (p.reportsTo) {
            if (!childrenMap.has(p.reportsTo)) childrenMap.set(p.reportsTo, []);
            childrenMap.get(p.reportsTo)!.push(p.id);
        }
    });

    const nodePositions: Record<string, { x: number; y: number }> = {};
    const processedNodes = new Set<string>();

    const calculateSubtreeWidth = (nodeId: string): number => {
        const children = childrenMap.get(nodeId) || [];
        if (children.length === 0) {
            return X_GAP;
        }
        return children.reduce((sum, childId) => sum + calculateSubtreeWidth(childId), 0);
    };
    
    function positionNodes(nodeId: string, x: number, y: number) {
        if (processedNodes.has(nodeId)) return;
        nodePositions[nodeId] = { x, y };
        processedNodes.add(nodeId);

        const children = childrenMap.get(nodeId) || [];
        children.sort((a,b) => (positionMap.get(a)?.title || '').localeCompare(positionMap.get(b)?.title || ''));
        
        if (children.length === 0) return;
        
        const totalWidth = children.reduce((sum, childId) => sum + calculateSubtreeWidth(childId), 0);
        let currentX = x - totalWidth / 2;

        children.forEach((childId) => {
            const subtreeWidth = calculateSubtreeWidth(childId);
            positionNodes(childId, currentX + subtreeWidth / 2, y + Y_GAP);
            currentX += subtreeWidth;
        });
    }

    const rootNodes = positions.filter((p) => !p.reportsTo);
    rootNodes.sort((a,b) => (a.title || '').localeCompare(b.title || ''));
    
    let currentX = 0;
    rootNodes.forEach(rootNode => {
        const rootWidth = calculateSubtreeWidth(rootNode.id);
        positionNodes(rootNode.id, currentX + rootWidth / 2, 0);
        currentX += rootWidth;
    });

    return nodePositions;
}


function useLayout(positions: Position[] | null) {
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number, y: number }>>({});

  useEffect(() => {
    if (!positions) return;

    // Load saved layout from localStorage
    const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (savedLayout) {
      try {
        setNodePositions(JSON.parse(savedLayout));
        return;
      } catch (e) {
        console.error("Failed to parse saved layout", e);
      }
    }
    
    // If no saved layout, calculate initial layout
    const initialLayout = calculateLayout(positions);
    setNodePositions(initialLayout);
    
  }, [positions]);

  const saveLayout = useCallback((nodes: CustomNode[]) => {
    const layoutToSave: Record<string, { x: number, y: number }> = {};
    nodes.forEach(node => {
      if(node.position) {
          layoutToSave[node.id] = node.position;
      }
    });
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layoutToSave));
  }, []);

  const resetLayout = useCallback(() => {
      if (!positions) return;
      const initialLayout = calculateLayout(positions);
      setNodePositions(initialLayout);
      localStorage.removeItem(LAYOUT_STORAGE_KEY);
  }, [positions]);
  
  return { nodePositions, saveLayout, resetLayout };
}


// --- Main Component ---
const OrganizationChart = () => {
  const [nodes, setNodes] = useState<CustomNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [isPositionDialogOpen, setIsPositionDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);

  const { firestore } = useFirebase();

  // Data fetching
  const deptsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departments') : null), [firestore]);
  const positionsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'positions'), where('isActive', '==', true)) : null, [firestore]);
  const employeesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'employees') : null, [firestore]);
  const workSchedulesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'workSchedules') : null), [firestore]);
  const positionLevelsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'positionLevels') : null), [firestore]);
  const employmentTypesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'employmentTypes') : null), [firestore]);
  const jobCategoriesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'jobCategories') : null), [firestore]);
  
  const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(deptsQuery);
  const { data: positions, isLoading: isLoadingPos } = useCollection<Position>(positionsQuery);
  const { data: employees, isLoading: isLoadingEmp } = useCollection<Employee>(employeesQuery);
  const { data: workSchedules, isLoading: isLoadingSchedules } = useCollection<any>(workSchedulesQuery);
  const { data: positionLevels, isLoading: isLoadingLevels } = useCollection<any>(positionLevelsQuery);
  const { data: employmentTypes, isLoading: isLoadingEmpTypes } = useCollection<any>(employmentTypesQuery);
  const { data: jobCategories, isLoading: isLoadingJobCategories } = useCollection<any>(jobCategoriesQuery);
  
  const { nodePositions, saveLayout, resetLayout } = useLayout(positions);

  const isLoading = isLoadingDepts || isLoadingPos || isLoadingEmp || isLoadingSchedules || isLoadingLevels || isLoadingEmpTypes || isLoadingJobCategories;

  const handleAddEmployeeClick = (position: Position) => {
    setSelectedPosition(position);
    setIsAssignDialogOpen(true);
  };
  
  const handleEditPositionClick = (position: Position) => {
    setEditingPosition(position);
    setIsPositionDialogOpen(true);
  };
  
  const handleOpenAddDialog = () => {
    setEditingPosition(null);
    setIsPositionDialogOpen(true);
  };
  
  // Create nodes and edges based on data
  useEffect(() => {
    if (isLoading || !positions) return;

    const deptMap = new Map(departments?.map(d => [d.id, d]));
    const workScheduleMap = new Map(workSchedules?.map(ws => [ws.id, ws.name]));

    const posToEmployeeMap = new Map<string, Employee[]>();
    employees?.forEach(e => {
        if (e.positionId) {
            if (!posToEmployeeMap.has(e.positionId)) posToEmployeeMap.set(e.positionId, []);
            posToEmployeeMap.get(e.positionId)?.push(e);
        }
    });

    const newNodes: CustomNode[] = [];
    const newEdges: Edge[] = [];

    positions.forEach(pos => {
        const assignedEmployees = posToEmployeeMap.get(pos.id) || [];
        const department = deptMap.get(pos.departmentId);

        const node: Node<PositionNodeData> = {
            id: pos.id,
            type: 'position',
            position: nodePositions[pos.id] || { x: 0, y: 0 },
            data: {
                ...pos, label: pos.title, title: pos.title,
                department: department?.name || 'Unknown',
                departmentColor: department?.color,
                headcount: pos.headcount,
                filled: posToEmployeeMap.get(pos.id)?.length || 0,
                employees: assignedEmployees,
                onAddEmployee: handleAddEmployeeClick,
                onEditPosition: handleEditPositionClick,
                workScheduleName: pos.workScheduleId ? workScheduleMap.get(pos.workScheduleId) : undefined,
            },
        };
        newNodes.push(node);

        if (pos.reportsTo && positions.some(p => p.id === pos.reportsTo)) {
            newEdges.push({ id: `e-${pos.reportsTo}-${pos.id}`, source: pos.reportsTo, target: pos.id, type: 'smoothstep', animated: true, style: { stroke: '#2563eb', strokeWidth: 2 }});
        }
    });
    
    const unassignedEmployees = employees?.filter(e => !e.positionId && e.status === 'Идэвхтэй') || [];
    unassignedEmployees.forEach((emp, index) => {
        newNodes.push({
            id: emp.id, type: 'unassigned', position: { x: -350, y: index * 100 },
            data: { label: emp.firstName, name: `${emp.firstName} ${emp.lastName}`, jobTitle: emp.jobTitle, avatar: emp.photoURL },
        });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [isLoading, departments, positions, employees, workSchedules, nodePositions]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
        setNodes((nds) => {
            const newNodes = applyNodeChanges(changes, nds);
            // Save layout on drag stop
            const dragChange = changes.find(c => c.type === 'position' && c.dragging === false);
            if (dragChange) {
                saveLayout(newNodes);
            }
            return newNodes;
        });
    },
    [saveLayout]
  );
  const onEdgesChange: OnEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  const onConnect: OnConnect = useCallback(
    async (connection) => {
        if (!connection.source || !connection.target || !firestore) return;
        
        const employeeId = connection.source;
        const newPositionId = connection.target;
        
        const employeeNode = nodes.find(n => n.id === employeeId);
        const positionNode = nodes.find(n => n.id === newPositionId);
        
        if (employeeNode?.type !== 'unassigned' || positionNode?.type !== 'position') return;
        
        const oldPositionId = (employees?.find(e => e.id === employeeId) as Employee)?.positionId;

        const batch = writeBatch(firestore);

        if (oldPositionId) {
            const oldPosRef = doc(firestore, 'positions', oldPositionId);
            const oldPosSnap = await getDoc(oldPosRef);
            if (oldPosSnap.exists()) batch.update(oldPosRef, { filled: Math.max(0, (oldPosSnap.data().filled || 0) - 1) });
        }
        
        const newPosRef = doc(firestore, 'positions', newPositionId);
        const newPosSnap = await getDoc(newPosRef);
        if (newPosSnap.exists()) batch.update(newPosRef, { filled: (newPosSnap.data().filled || 0) + 1 });
        
        const employeeDocRef = doc(firestore, 'employees', employeeId);
        batch.update(employeeDocRef, {
            positionId: newPositionId,
            jobTitle: (positions?.find(p => p.id === newPositionId))?.title || 'Тодорхойгүй',
        });

        await batch.commit();
    },
    [firestore, nodes, positions, employees]
  );

  return (
    <div style={{ height: 'calc(100vh - 100px)' }}>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Байгууллагын бүтэц (Албан тушаалаар)</CardTitle>
                <CardDescription>Ажилтныг сул ажлын байранд чирж томилох эсвэл, ажлын байрны мэдээллийг засах.</CardDescription>
            </div>
        </div>
      </CardHeader>
      <div className="relative w-full h-full">
        {isLoading ? <SkeletonChart/> : (
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView>
                <Background />
                <Controls />
            </ReactFlow>
        )}
        <div className="absolute bottom-8 right-4 z-10 flex gap-2">
            <Button size="icon" onClick={resetLayout} variant="outline" className="rounded-full h-12 w-12 shadow-lg">
                <RotateCcw className="h-6 w-6" />
                <span className="sr-only">Байршлыг сэргээх</span>
            </Button>
            <Button size="icon" onClick={handleOpenAddDialog} className="rounded-full h-12 w-12 shadow-lg">
                <PlusCircle className="h-6 w-6" />
                <span className="sr-only">Ажлын байр нэмэх</span>
            </Button>
        </div>
       </div>
       <AssignEmployeeDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        position={selectedPosition}
        employees={employees?.filter(e => !e.positionId) || []}
      />
      <AddPositionDialog
        open={isPositionDialogOpen}
        onOpenChange={setIsPositionDialogOpen}
        editingPosition={editingPosition}
        allPositions={positions}
        departments={departments || []}
        positionLevels={positionLevels || []}
        employmentTypes={employmentTypes || []}
        jobCategories={jobCategories || []}
        workSchedules={workSchedules || []}
      />
    </div>
  );
};

export default OrganizationChart;
