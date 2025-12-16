

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
  useReactFlow,
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
import { collection, doc, increment, where, query, collectionGroup } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Briefcase, MoreHorizontal, Pencil, Trash2, PlusCircle, UserPlus, LogIn, LogOut, CalendarCheck2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AddPositionDialog } from '../organization/add-position-dialog';
import { AssignEmployeeDialog } from '../organization/assign-employee-dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { AddEmployeeDialog } from '../employees/add/page';
import Link from 'next/link';
import { format, isWithinInterval } from 'date-fns';


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
  employees: Employee[];
};

type Employee = {
    id: string;
    positionId?: string;
    status: 'Идэвхтэй';
    firstName: string;
    lastName: string;
    photoURL?: string;
    questionnaireCompletion?: number;
}

export type Department = {
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

type AttendanceRecord = {
    id: string;
    employeeId: string;
    date: string; // yyyy-MM-dd
    checkInTime: string;
    checkOutTime?: string;
    status: 'PRESENT' | 'LEFT';
}

type TimeOffRequest = {
    id: string;
    employeeId: string;
    startDate: string;
    endDate: string;
    status: 'Зөвшөөрсөн';
}

type AttendanceStatus = {
    checkInTime?: string;
    checkOutTime?: string;
    onLeave?: boolean;
}

type PositionNodeData = {
    label: string;
    headcount: number;
    filled: number;
    employees: Employee[];
    attendanceStatus?: AttendanceStatus;
    color: string;
    onEdit: () => void;
    onDelete: () => void;
    onAssign: () => void;
    onAddEmployee: () => void;
};

type EmployeeNodeData = {
    label: string;
    photoURL?: string;
    jobTitle?: string;
    questionnaireCompletion?: number;
};


// --- Helper Functions for Layout ---
const nodeWidth = 160;
const nodeHeight = 184; // Increased height for attendance status
const horizontalSpacing = 80;
const verticalSpacing = 120;
const unassignedEmployeeSpacing = 40;


const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  if (nodes.length === 0) {
    return { nodes: [], edges: [] };
  }
  
  const positionNodesList = nodes.filter(n => n.type === 'position');
  const employeeNodes = nodes.filter(n => n.type === 'employee');

  // --- Layout for Position Nodes (Tree structure) ---
  const graph = new Map<string, string[]>();
  const nodeMap = new Map<string, Node>();
  const roots: string[] = [];

  positionNodesList.forEach((node) => {
    graph.set(node.id, []);
    nodeMap.set(node.id, node);
  });

  edges.forEach((edge) => {
    if (graph.has(edge.source)) {
      graph.get(edge.source)!.push(edge.target);
    }
  });

  positionNodesList.forEach(node => {
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
  
  function positionNodesLayout(nodeId: string, x: number, y: number) {
    const node = nodeMap.get(nodeId);
    if (!node) return;

    const totalWidth = layout.get(nodeId)?.width || nodeWidth;
    layout.set(nodeId, { ...layout.get(nodeId)!, x: x + (totalWidth - nodeWidth) / 2, y });

    const children = graph.get(nodeId) || [];
    let currentX = x;
    children.forEach((childId) => {
      positionNodesLayout(childId, currentX, y + nodeHeight + verticalSpacing);
      currentX += (layout.get(childId)?.width || 0) + horizontalSpacing;
    });
  }
  
  positionNodesList.forEach(node => {
    layout.set(node.id, { x: 0, y: 0, width: calculateWidth(node.id) });
  });

  let currentX = 0;
  roots.forEach(rootId => {
      positionNodesLayout(rootId, currentX, 0);
      const rootLayout = layout.get(rootId);
      if(rootLayout) {
        currentX += rootLayout.width + horizontalSpacing * 2;
      }
  })

  // --- Layout for Unassigned Employee Nodes ---
  let employeeY = 0;
  const employeeX = - (nodeWidth + horizontalSpacing * 2); // Position to the left of the chart
  employeeNodes.forEach(node => {
      layout.set(node.id, { x: employeeX, y: employeeY, width: nodeWidth });
      employeeY += nodeHeight + unassignedEmployeeSpacing;
  });

  const layoutedNodes = nodes.map((node) => {
    const pos = layout.get(node.id);
    return {
      ...node,
      position: { x: pos?.x || 0, y: pos?.y || 0 },
    };
  });

  return { nodes: layoutedNodes, edges };
};


// --- Custom Node Components ---
const CircularProgressAvatar = ({
  photoURL,
  label,
  completion,
}: {
  photoURL?: string;
  label: string;
  completion?: number;
}) => {
  const percentage = completion || 0;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-20 h-20">
      <svg className="w-full h-full" viewBox="0 0 100 100">
        {/* Background Circle */}
        <circle
          className="text-muted/30"
          strokeWidth="8"
          stroke="currentColor"
          fill="transparent"
          r="40"
          cx="50"
          cy="50"
        />
        {/* Progress Circle */}
        <circle
          className="text-primary"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r="40"
          cx="50"
          cy="50"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Avatar className="w-16 h-16">
          <AvatarImage src={photoURL} alt={label} />
          <AvatarFallback>{label?.charAt(0)}</AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
};


const EmployeeNode = ({ data }: { data: EmployeeNodeData }) => {
    return (
        <div className="w-[120px] h-[120px] rounded-lg shadow-md flex flex-col items-center justify-center p-2 text-center bg-card border-2 border-primary/50 relative">
            <Handle type="source" position={Position.Right} id="a" />
            <CircularProgressAvatar
                photoURL={data.photoURL}
                label={data.label}
                completion={data.questionnaireCompletion}
            />
            <p className="text-[11px] font-semibold leading-tight line-clamp-2 mt-1">{data.label}</p>
        </div>
    );
};


const PositionNode = ({ data }: { data: PositionNodeData }) => {
    const isFilled = data.filled > 0;
    const employee = data.employees[0];
    const status = data.attendanceStatus;
    
    const cardStyle = {
        backgroundColor: data.color || 'hsl(var(--card))',
        borderColor: isFilled ? (data.color || 'hsl(var(--primary))') : 'hsl(var(--border))',
        borderWidth: '2px',
    };

    return (
        <div 
            className="w-[160px] h-[184px] rounded-lg shadow-lg flex flex-col items-center p-3 text-center relative" 
            style={cardStyle}
        >
            <Handle type="target" position={Position.Top} id="b" />
            <Handle type="source" position={Position.Bottom} id="a" />
             <div className="absolute top-2 right-2 z-10">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background/50 backdrop-blur-sm">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={data.onAssign}>
                            <UserPlus className="mr-2 h-4 w-4" /> Ажилтан томилох
                        </DropdownMenuItem>
                         <DropdownMenuItem onClick={data.onAddEmployee}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Шинэ ажилтан нэмэх
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={data.onEdit}>
                            <Pencil className="mr-2 h-4 w-4" /> Засах
                        </DropdownMenuItem>
                            <DropdownMenuItem onClick={data.onDelete} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Устгах
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
             </div>

            <div className="flex-1 flex flex-col items-center justify-center">
            {!isFilled ? (
                // Unfilled State
                <div className="flex flex-col items-center gap-1.5">
                    <UserPlus className="h-8 w-8 text-muted-foreground opacity-70" />
                    <p className="text-sm font-semibold leading-tight line-clamp-2">{data.label}</p>
                    <p className="text-[11px] text-muted-foreground">Сул ({data.headcount})</p>
                    <div className="flex gap-2">
                        <Button size="xs" variant="secondary" onClick={data.onAssign} className="h-6 px-2 text-xs">Томилох</Button>
                        <Button size="xs" variant="outline" onClick={data.onAddEmployee} className="h-6 px-2 text-xs">Шинэ</Button>
                    </div>
                </div>
            ) : (
                // Filled State
                 <div className="flex flex-col items-center gap-1">
                    <Link href={`/dashboard/employees/${employee.id}`}>
                        <CircularProgressAvatar
                            photoURL={employee.photoURL}
                            label={employee.firstName}
                            completion={employee.questionnaireCompletion}
                        />
                    </Link>
                     <p className="text-sm font-semibold leading-tight line-clamp-1">{employee.firstName} {employee.lastName}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{data.label}</p>
                     {data.headcount > 1 && (
                        <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                            {data.filled}/{data.headcount}
                        </Badge>
                     )}
                </div>
            )}
            </div>

            {isFilled && (
                <div className="w-full pt-2 mt-2 border-t text-[11px] font-medium">
                    {status?.onLeave ? (
                        <div className="flex items-center justify-center gap-1.5 text-yellow-600">
                           <CalendarCheck2 className="h-3.5 w-3.5" /> 
                           <span>Чөлөөтэй</span>
                        </div>
                    ) : status?.checkInTime ? (
                         <div className="flex items-center justify-center gap-1.5 text-green-600">
                           <LogIn className="h-3.5 w-3.5" /> 
                           <span>{format(new Date(status.checkInTime), 'HH:mm')}</span>
                           {status.checkOutTime && (
                                <>
                                 <span className="text-muted-foreground">/</span>
                                 <LogOut className="h-3.5 w-3.5" /> 
                                 <span>{format(new Date(status.checkOutTime), 'HH:mm')}</span>
                                </>
                           )}
                        </div>
                    ) : (
                        <div className="text-muted-foreground">Ирц бүртгүүлээгүй</div>
                    )}
                </div>
            )}
        </div>
    );
};

const nodeTypes = {
  position: PositionNode,
  employee: EmployeeNode
};

// --- Main Chart Component ---
const OrganizationChart = () => {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isPositionDialogOpen, setIsPositionDialogOpen] = React.useState(false);
    const [editingPosition, setEditingPosition] = React.useState<PositionData | null>(null);
    const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);
    const [assigningPosition, setAssigningPosition] = React.useState<PositionData | null>(null);
    const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = React.useState(false);
    const [assignmentConfirmation, setAssignmentConfirmation] = React.useState<{ employee: Employee, position: PositionData } | null>(null);


    // Data queries
    const todayString = format(new Date(), 'yyyy-MM-dd');
    const positionsQuery = useMemoFirebase(() => collection(firestore, 'positions'), [firestore]);
    const employeesQuery = useMemoFirebase(() => collection(firestore, 'employees'), [firestore]);
    const departmentsQuery = useMemoFirebase(() => collection(firestore, 'departments'), [firestore]);
    const levelsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'positionLevels') : null), [firestore]);
    const empTypesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'employmentTypes') : null), [firestore]);
    const jobCategoriesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'jobCategories') : null), [firestore]);
    const workSchedulesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'workSchedules') : null), [firestore]);
    const attendanceQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'attendance'), where('date', '==', todayString)) : null), [firestore, todayString]);
    const timeOffQuery = useMemoFirebase(() => (firestore ? query(collectionGroup(firestore, 'timeOffRequests'), where('status', '==', 'Зөвшөөрсөн')) : null), [firestore]);


    const { data: positions, isLoading: isLoadingPos } = useCollection<PositionData>(positionsQuery);
    const { data: employees, isLoading: isLoadingEmp } = useCollection<Employee>(employeesQuery);
    const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(departmentsQuery);
    const { data: positionLevels, isLoading: isLoadingLevels } = useCollection<Reference>(levelsQuery);
    const { data: employmentTypes, isLoading: isLoadingEmpTypes } = useCollection<Reference>(empTypesQuery);
    const { data: jobCategories, isLoading: isLoadingJobCategories } = useCollection<JobCategoryReference>(jobCategoriesQuery);
    const { data: workSchedules, isLoading: isLoadingWorkSchedules } = useCollection<Reference>(workSchedulesQuery);
    const { data: attendanceRecords, isLoading: isLoadingAttendance } = useCollection<AttendanceRecord>(attendanceQuery);
    const { data: timeOffRecords, isLoading: isLoadingTimeOff } = useCollection<TimeOffRequest>(timeOffQuery);


    const isLoading = isLoadingPos || isLoadingEmp || isLoadingDepts || isLoadingLevels || isLoadingEmpTypes || isLoadingJobCategories || isLoadingWorkSchedules || isLoadingAttendance || isLoadingTimeOff;

    // --- Dialog and CRUD Handlers ---
    const handleOpenAddDialog = () => {
        setEditingPosition(null);
        setIsPositionDialogOpen(true);
    };
    
    const handleOpenEditDialog = (posId: string) => {
        const positionToEdit = positions?.find(p => p.id === posId);
        if (positionToEdit) {
            setEditingPosition(positionToEdit);
            setIsPositionDialogOpen(true);
        }
    };

    const handleOpenAssignDialog = (posId: string) => {
        const positionToAssign = positions?.find(p => p.id === posId);
        if(positionToAssign) {
            setAssigningPosition(positionToAssign);
            setIsAssignDialogOpen(true);
        }
    };

    const handleOpenAddEmployeeDialog = (posId: string) => {
        const position = positions?.find(p => p.id === posId);
        if(position) {
            setAssigningPosition(position);
            setIsAddEmployeeDialogOpen(true);
        }
    }
    
    const handleDeletePosition = (posId: string) => {
        if (!firestore) return;
        const docRef = doc(firestore, 'positions', posId);
        deleteDocumentNonBlocking(docRef);
        toast({
            title: 'Амжилттай устгагдлаа',
            variant: 'destructive',
        });
    };

    const handleConfirmAssignment = () => {
        if (!assignmentConfirmation || !firestore) return;

        const { employee, position } = assignmentConfirmation;

        const employeeDocRef = doc(firestore, 'employees', employee.id);
        updateDocumentNonBlocking(employeeDocRef, {
            positionId: position.id,
            jobTitle: position.title,
        });

        const positionDocRef = doc(firestore, 'positions', position.id);
        updateDocumentNonBlocking(positionDocRef, {
            filled: increment(1)
        });

        toast({
            title: 'Ажилтан амжилттай томилогдлоо',
            description: `${employee.firstName}-г ${position.title} албан тушаалд томиллоо.`,
        });

        setAssignmentConfirmation(null);
    };
    
     const onConnect = React.useCallback(
        (connection: Connection) => {
            if (!firestore || !connection.source || !connection.target) return;
            
            const sourceNode = nodes.find(n => n.id === connection.source);
            const targetNode = nodes.find(n => n.id === connection.target);

            // Connecting an employee to a position
            if (sourceNode?.type === 'employee' && targetNode?.type === 'position') {
                const employeeToAssign = employees?.find(e => e.id === sourceNode.id);
                const positionToAssign = positions?.find(p => p.id === targetNode.id);

                if (employeeToAssign && positionToAssign) {
                    if ((positionToAssign.headcount || 0) <= (positionToAssign.filled || 0)) {
                        toast({
                            variant: "destructive",
                            title: "Орон тоо дүүрсэн",
                            description: `"${positionToAssign.title}" ажлын байрны орон тоо дүүрсэн байна.`,
                        });
                        return;
                    }
                    setAssignmentConfirmation({ employee: employeeToAssign, position: positionToAssign });
                }
                return;
            }

            // Connecting a position to another position (reportsTo)
            if (sourceNode?.type === 'position' && targetNode?.type === 'position') {
                const newEdge = { ...connection, animated: true, style: { strokeWidth: 2, stroke: '#2563eb' } };
                setEdges((eds) => addEdge(newEdge, eds));
                
                const childDocRef = doc(firestore, 'positions', connection.target);
                updateDocumentNonBlocking(childDocRef, { reportsTo: connection.source });

                toast({
                    title: 'Холбоос үүслээ',
                    description: 'Албан тушаалын хамаарал амжилттай шинэчлэгдлээ.',
                });
            }
        },
        [firestore, setEdges, toast, nodes, employees, positions]
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
        if (isLoading || !positions || !employees || !departments || !attendanceRecords || !timeOffRecords) return;

        const today = new Date();
        const attendanceMap = new Map<string, AttendanceStatus>();
        
        // Process time-off records first
        timeOffRecords.forEach(req => {
            const start = new Date(req.startDate);
            const end = new Date(req.endDate);
            if (isWithinInterval(today, { start, end })) {
                attendanceMap.set(req.employeeId, { onLeave: true });
            }
        });

        // Process attendance records, but don't overwrite on-leave status
        attendanceRecords.forEach(rec => {
            if (!attendanceMap.has(rec.employeeId)) {
                attendanceMap.set(rec.employeeId, {
                    checkInTime: rec.checkInTime,
                    checkOutTime: rec.checkOutTime,
                });
            }
        });
    
        const employeesByPosition = employees.reduce((acc, emp) => {
            if (emp.positionId && emp.status === 'Идэвхтэй') {
                if (!acc.has(emp.positionId)) {
                    acc.set(emp.positionId, []);
                }
                acc.get(emp.positionId)!.push(emp as Employee);
            }
            return acc;
        }, new Map<string, Employee[]>());

        const departmentColorMap = new Map(departments.map(d => [d.id, d.color]));
        
        const activePositions = positions.filter(p => p.isActive);

        const positionNodes: Node[] = activePositions.map(pos => {
            const assignedEmployees = employeesByPosition.get(pos.id) || [];
            const attendanceStatus = assignedEmployees[0] ? attendanceMap.get(assignedEmployees[0].id) : undefined;
            return {
                id: pos.id,
                type: 'position',
                data: { 
                    label: pos.title,
                    headcount: pos.headcount || 0,
                    filled: assignedEmployees.length,
                    employees: assignedEmployees,
                    attendanceStatus: attendanceStatus,
                    color: departmentColorMap.get(pos.departmentId) || '#ffffff',
                    onEdit: () => handleOpenEditDialog(pos.id),
                    onDelete: () => handleDeletePosition(pos.id),
                    onAssign: () => handleOpenAssignDialog(pos.id),
                    onAddEmployee: () => handleOpenAddEmployeeDialog(pos.id),
                },
                position: { x: 0, y: 0 },
            }
        });
        
        const unassignedEmployees = employees.filter(emp => emp.status === 'Идэвхтэй' && !emp.positionId);
        const employeeNodes: Node[] = unassignedEmployees.map(emp => ({
            id: emp.id,
            type: 'employee',
            data: {
                label: `${emp.firstName} ${emp.lastName}`,
                photoURL: emp.photoURL,
                questionnaireCompletion: emp.questionnaireCompletion,
            },
            position: { x: 0, y: 0 },
            draggable: true,
        }));

        const initialNodes = [...positionNodes, ...employeeNodes];

        const initialEdges: Edge[] = activePositions
            .filter(pos => pos.reportsTo)
            .map(pos => ({
                id: `${pos.reportsTo}-${pos.id}`,
                source: pos.reportsTo!,
                target: pos.id,
                animated: true,
                style: { strokeWidth: 2, stroke: '#2563eb' },
            }));

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges);

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

    }, [isLoading, positions, employees, departments, attendanceRecords, timeOffRecords, setNodes, setEdges]);
    
    if (isLoading) {
        return <Skeleton className="w-full h-[600px]" />;
    }

    return (
        <div style={{ width: '100%', height: 'calc(100vh - 200px)' }} className="relative">
            <style>
                {`
                    @keyframes dashdraw {
                        from {
                            stroke-dashoffset: 100;
                        }
                    }
                    .react-flow__edge.animated .react-flow__edge-path {
                        stroke-dasharray: 5;
                        animation: dashdraw 2s linear infinite;
                    }
                `}
            </style>
            <AlertDialog open={!!assignmentConfirmation} onOpenChange={(open) => !open && setAssignmentConfirmation(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Томилгоог баталгаажуулах</AlertDialogTitle>
                        <AlertDialogDescription>
                            Та <strong>{assignmentConfirmation?.employee.firstName}</strong>-г <strong>{assignmentConfirmation?.position.title}</strong> албан тушаалд томилохдоо итгэлтэй байна уу?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setAssignmentConfirmation(null)}>Цуцлах</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmAssignment}>Тийм, томилох</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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
            <AssignEmployeeDialog 
                open={isAssignDialogOpen}
                onOpenChange={setIsAssignDialogOpen}
                position={assigningPosition}
                employees={employees || []}
            />
            <AddEmployeeDialog 
                open={isAddEmployeeDialogOpen}
                onOpenChange={setIsAddEmployeeDialogOpen}
                departments={departments || []}
                positions={positions || []}
                workSchedules={workSchedules || []}
                preselectedDept={assigningPosition?.departmentId}
                preselectedPos={assigningPosition?.id}
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
            <Button
                size="icon"
                className="absolute bottom-6 right-6 h-12 w-12 rounded-full shadow-lg"
                onClick={handleOpenAddDialog}
            >
                <PlusCircle className="h-6 w-6" />
                <span className="sr-only">Шинэ албан тушаал нэмэх</span>
            </Button>
        </div>
    );
};

// --- Page ---
export default function ConsolidatedActionPage() {
  return (
    <div className="py-8">
        <CardHeader className="px-0">
          <CardTitle>Байгууллагын бүтэц (Албан тушаалаар)</CardTitle>
          <CardDescription>
            Байгууллагын бүтцийг албан тушаалын шатлалаар харах, удирдах. Нэгжээс нөгөө рүү чирч холбоос үүсгээрэй.
          </CardDescription>
        </CardHeader>
        <ReactFlowProvider>
            <OrganizationChart />
        </ReactFlowProvider>
    </div>
  );
}
