// src/app/dashboard/page.tsx
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
  Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import Link from 'next/link';

import {
  useCollection,
  useFirebase,
  useMemoFirebase,
  updateDocumentNonBlocking,
  useDoc,
} from '@/firebase';
import { collection, doc, query, where, collectionGroup, writeBatch, getDoc, getDocs, increment } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { User, Users, Briefcase, PlusCircle, CalendarCheck2, LogIn, LogOut, MoreHorizontal, Pencil, Layout, RotateCcw, Loader2, MinusCircle, UserCheck, Newspaper, Building, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AddPositionDialog } from './organization/add-position-dialog';
import { AssignEmployeeDialog } from './organization/assign-employee-dialog';
import { isWithinInterval, format, startOfToday, endOfToday, isToday } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Employee as BaseEmployee } from './employees/data';
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
import { useToast } from '@/hooks/use-toast';
import { UserNav } from '@/components/user-nav';
import { AddEmployeeDialog } from './employees/add/page';

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

interface AttendanceRecord {
    id: string;
    employeeId: string;
    date: string; // yyyy-MM-dd
    checkInTime: string;
    checkOutTime?: string;
    status: 'PRESENT' | 'LEFT';
}

interface TimeOffRequest {
    id: string;
    employeeId: string;
    status: 'Зөвшөөрсөн' | 'Хүлээгдэж буй' | 'Татгалзсан';
    startDate: string;
    endDate: string;
}

type AttendanceStatus = {
    status: 'on-leave' | 'checked-in' | 'checked-out' | 'absent';
    checkInTime?: string;
    checkOutTime?: string;
}

interface CompanyProfile {
    name?: string;
    logoUrl?: string;
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
  attendanceStatus?: AttendanceStatus;
}

interface EmployeeNodeData {
  label: string;
  name: string;
  jobTitle: string;
  avatar?: string;
}

type CustomNode = Node<PositionNodeData | EmployeeNodeData>;

// --- Constants & Layout ---
const X_GAP = 380;
const Y_GAP = 350;
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

const AvatarWithProgress = ({ employee }: { employee?: Employee; }) => {
    const progress = employee?.questionnaireCompletion || 0;
    
    const progressColor =
        progress < 50 ? '#ef4444' : // red-500
        progress < 90 ? '#f59e0b' : // amber-500
        '#22c55e'; // green-500
    
    const avatarContent = (
         <div className="relative w-20 h-20 mx-auto">
            <Avatar className="h-20 w-20">
                <AvatarImage src={employee?.photoURL} alt={employee?.firstName} />
                <AvatarFallback className="text-3xl bg-muted">
                    {employee ? employee.firstName?.charAt(0) : <User className="h-8 w-8 text-muted-foreground"/>}
                </AvatarFallback>
            </Avatar>
            {employee && (
                 <svg
                    className="absolute top-0 left-0"
                    width="80"
                    height="80"
                    viewBox="0 0 80 80"
                >
                    <circle
                        className="text-muted/30"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="transparent"
                        r="38"
                        cx="40"
                        cy="40"
                    />
                    <circle
                        strokeWidth="4"
                        strokeDasharray={2 * Math.PI * 38}
                        strokeDashoffset={(2 * Math.PI * 38) * (1 - progress / 100)}
                        strokeLinecap="round"
                        fill="transparent"
                        r="38"
                        cx="40"
                        cy="40"
                        transform="rotate(-90 40 40)"
                        style={{ stroke: progressColor, transition: 'stroke-dashoffset 0.5s ease-in-out' }}
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

const AttendanceStatusIndicator = ({ status }: { status?: AttendanceStatus }) => {
    if (!status) return null;

    const config = {
        'checked-in': { icon: LogIn, text: 'Ирсэн', color: 'text-green-500', time: status.checkInTime ? format(new Date(status.checkInTime), 'HH:mm') : '' },
        'checked-out': { icon: LogOut, text: 'Явсан', color: 'text-red-500', time: status.checkOutTime ? format(new Date(status.checkOutTime), 'HH:mm') : '' },
        'on-leave': { icon: CalendarCheck2, text: 'Чөлөөтэй', color: 'text-blue-500', time: '' },
        'absent': { icon: MinusCircle, text: 'Ирээгүй', color: 'text-muted-foreground', time: '' },
    }[status.status];
    
    if (!config) return null;

    const Icon = config.icon;

    return (
        <div className={cn("flex items-center justify-center gap-1.5 text-xs font-medium", config.color)}>
            <Icon className="h-3.5 w-3.5" />
            <span>{config.text} {config.time}</span>
        </div>
    )
}

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
      <div className="absolute top-2 right-2 z-10">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className={cn("h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity", textColor)}>
                <MoreHorizontal className="h-4 w-4" />
            </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
            <DropdownMenuItem onClick={() => data.onEditPosition(data as any)}><Pencil className="mr-2 h-4 w-4" /> Ажлын байр засах</DropdownMenuItem>
            <DropdownMenuItem onClick={() => data.onAddEmployee(data as any)}><PlusCircle className="mr-2 h-4 w-4" /> Ажилтан томилох</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardContent className="p-4 text-center space-y-2">
        <AvatarWithProgress employee={employee} />
        
        <div className="space-y-1">
            {employee ? (
                <>
                <Link href={`/dashboard/employees/${employee.id}`}>
                  <p className="font-semibold text-base hover:underline">{employee.firstName} {employee.lastName}</p>
                </Link>
                {employee.questionnaireCompletion !== undefined && (
                    <p className={cn("text-xs font-bold", mutedTextColor)}>
                        Анкет: {Math.round(employee.questionnaireCompletion)}%
                    </p>
                )}
                </>
            ) : (
                <p className={cn("font-semibold text-base", mutedTextColor)}>Сул орон тоо</p>
            )}
            <p className={cn("text-sm", mutedTextColor)}>{data.title}</p>
        </div>
        
        <AttendanceStatusIndicator status={data.attendanceStatus} />

        <div className={cn("pt-3 mt-3 border-t space-y-1 text-xs text-left", isDarkBg ? 'border-gray-500/50' : 'border-border')}>
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
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const { firestore } = useFirebase();

  // Data fetching
  const deptsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departments') : null), [firestore]);
  const positionsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'positions'), where('isActive', '==', true)) : null, [firestore]);
  const employeesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'employees'), where('status', '==', 'Идэвхтэй')) : null, [firestore]);
  const workSchedulesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'workSchedules') : null), [firestore]);
  const positionLevelsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'positionLevels') : null), [firestore]);
  const employmentTypesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'employmentTypes') : null), [firestore]);
  const jobCategoriesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'jobCategories') : null), [firestore]);
  const companyProfileRef = useMemoFirebase(() => (firestore ? doc(firestore, 'company', 'profile') : null), [firestore]);
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const attendanceQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'attendance'), where('date', '==', todayStr)) : null), [firestore, todayStr]);
  const timeOffQuery = useMemoFirebase(() => (firestore ? query(collectionGroup(firestore, 'timeOffRequests'), where('status', '==', 'Зөвшөөрсөн')) : null), [firestore]);
  const postsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'posts') : null, [firestore]);

  const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(deptsQuery);
  const { data: positions, isLoading: isLoadingPos } = useCollection<Position>(positionsQuery);
  const { data: employees, isLoading: isLoadingEmp } = useCollection<Employee>(employeesQuery);
  const { data: workSchedules, isLoading: isLoadingSchedules } = useCollection<any>(workSchedulesQuery);
  const { data: positionLevels, isLoading: isLoadingLevels } = useCollection<any>(positionLevelsQuery);
  const { data: employmentTypes, isLoading: isLoadingEmpTypes } = useCollection<any>(employmentTypesQuery);
  const { data: jobCategories, isLoading: isLoadingJobCategories } = useCollection<any>(jobCategoriesQuery);
  const { data: attendanceData, isLoading: isLoadingAttendance } = useCollection<AttendanceRecord>(attendanceQuery);
  const { data: timeOffData, isLoading: isLoadingTimeOff } = useCollection<TimeOffRequest>(timeOffQuery);
  const { data: posts, isLoading: isLoadingPosts } = useCollection(postsQuery);
  const { data: companyProfile, isLoading: isLoadingProfile } = useDoc<CompanyProfile>(companyProfileRef);
  
  const { nodePositions, saveLayout, resetLayout } = useLayout(positions);

  const isLoading = isLoadingDepts || isLoadingPos || isLoadingEmp || isLoadingSchedules || isLoadingLevels || isLoadingEmpTypes || isLoadingJobCategories || isLoadingAttendance || isLoadingTimeOff || isLoadingPosts || isLoadingProfile;

    const onLeaveEmployees = useMemo(() => {
        if (!timeOffData) return new Set<string>();
        const today = new Date();
        const onLeave = new Set<string>();
        timeOffData.forEach(req => {
            if (isWithinInterval(today, { start: new Date(req.startDate), end: new Date(req.endDate) })) {
                onLeave.add(req.employeeId);
            }
        });
        return onLeave;
    }, [timeOffData]);

    const presentEmployees = useMemo(() => {
        if (!attendanceData) return new Set<string>();
        return new Set(attendanceData.map(a => a.employeeId));
    }, [attendanceData]);

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
  
  const handleOpenAddEmployeeDialog = (position: Position) => {
    setSelectedPosition(position);
    setIsAssignDialogOpen(false); // Close assign dialog if open
    setIsAddEmployeeDialogOpen(true);
  }

  // Create nodes and edges based on data
  useEffect(() => {
    if (isLoading || !positions || !employees) return;

    const deptMap = new Map(departments?.map(d => [d.id, d]));
    const workScheduleMap = new Map(workSchedules?.map(ws => [ws.id, ws.name]));

    const posToEmployeeMap = new Map<string, Employee[]>();
    employees?.forEach(e => {
        if (e.positionId) {
            if (!posToEmployeeMap.has(e.positionId)) posToEmployeeMap.set(e.positionId, []);
            posToEmployeeMap.get(e.positionId)?.push(e);
        }
    });

    const today = new Date();
    const employeeAttendanceStatus = new Map<string, AttendanceStatus>();
    employees.forEach(emp => {
        if (onLeaveEmployees.has(emp.id)) {
            employeeAttendanceStatus.set(emp.id, { status: 'on-leave' });
            return;
        }

        const attendanceRecord = attendanceData?.find(rec => rec.employeeId === emp.id);
        if (attendanceRecord) {
            if(attendanceRecord.checkOutTime) {
                employeeAttendanceStatus.set(emp.id, { status: 'checked-out', checkInTime: attendanceRecord.checkInTime, checkOutTime: attendanceRecord.checkOutTime });
            } else {
                employeeAttendanceStatus.set(emp.id, { status: 'checked-in', checkInTime: attendanceRecord.checkInTime });
            }
        } else {
            employeeAttendanceStatus.set(emp.id, { status: 'absent' });
        }
    });


    const newNodes: CustomNode[] = [];
    const newEdges: Edge[] = [];

    positions.forEach(pos => {
        const assignedEmployees = posToEmployeeMap.get(pos.id) || [];
        const department = deptMap.get(pos.departmentId);
        const employee = assignedEmployees[0];

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
                attendanceStatus: employee ? employeeAttendanceStatus.get(employee.id) : undefined,
            },
        };
        newNodes.push(node);

        if (pos.reportsTo && positions.some(p => p.id === pos.reportsTo)) {
            newEdges.push({ 
                id: `e-${pos.reportsTo}-${pos.id}`,
                source: pos.reportsTo,
                target: pos.id,
                type: 'smoothstep', 
                animated: true, 
                style: { stroke: '#2563eb', strokeWidth: 2 }
            });
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
  }, [isLoading, departments, positions, employees, workSchedules, nodePositions, attendanceData, timeOffData, onLeaveEmployees]);

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
    (connection) => {
        const employeeNode = nodes.find(n => n.id === connection.source);
        const positionNode = nodes.find(n => n.id === connection.target);
        
        if (employeeNode?.type !== 'unassigned' || positionNode?.type !== 'position') return;
        
        const posData = positionNode.data as PositionNodeData;
        if(posData.filled >= posData.headcount) {
             toast({
                variant: "destructive",
                title: "Орон тоо дүүрсэн",
                description: "Энэ ажлын байр дүүрсэн байна. Та эхлээд өмнөх ажилтныг чөлөөлнө үү."
            });
            return;
        }

        setPendingConnection(connection);
    },
    [nodes, toast]
  );

  const confirmAssignment = async () => {
    if (!pendingConnection || !firestore) return;
    setIsConfirming(true);

    const { source: employeeId, target: newPositionId } = pendingConnection;
    if (!employeeId || !newPositionId) return;

    try {
        const batch = writeBatch(firestore);
        
        // No need to check for old position, since we are assigning an unassigned employee.
        
        const newPosRef = doc(firestore, 'positions', newPositionId);
        batch.update(newPosRef, { filled: increment(1) });
        
        const employeeDocRef = doc(firestore, 'employees', employeeId);
        batch.update(employeeDocRef, {
            positionId: newPositionId,
            jobTitle: positions?.find(p => p.id === newPositionId)?.title || 'Тодорхойгүй',
        });

        await batch.commit();

        toast({
            title: "Амжилттай томилогдлоо",
            description: `${nodes.find(n => n.id === employeeId)?.data.name} ажилтныг ${nodes.find(n => n.id === newPositionId)?.data.title} албан тушаалд томиллоо.`
        })
    } catch(e) {
        console.error(e);
        toast({
            title: "Алдаа гарлаа",
            description: "Томилгоо хийхэд алдаа гарлаа.",
            variant: "destructive"
        })
    } finally {
        setIsConfirming(false);
        setPendingConnection(null);
    }
  };

  const cancelAssignment = () => {
    setPendingConnection(null);
  }

  const getConfirmationDialogContent = () => {
    if (!pendingConnection) return { employeeName: '', positionTitle: '' };
    const employeeNode = nodes.find(n => n.id === pendingConnection.source);
    const positionNode = nodes.find(n => n.id === pendingConnection.target);
    return {
        employeeName: employeeNode?.data.name,
        positionTitle: positionNode?.data.title,
    }
  }
  const { employeeName, positionTitle } = getConfirmationDialogContent();

  const activeEmployeesCount = employees?.length || 0;

  return (
    <div style={{ height: 'calc(100vh - 40px)' }} className="flex flex-col">
      <AlertDialog open={!!pendingConnection} onOpenChange={(open) => !open && cancelAssignment()}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Томилгоог баталгаажуулах</AlertDialogTitle>
            <AlertDialogDescription>
                Та <strong>{employeeName}</strong>-г(г) <strong>{positionTitle}</strong> албан тушаалд томилохдоо итгэлтэй байна уу?
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelAssignment} disabled={isConfirming}>Цуцлах</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAssignment} disabled={isConfirming}>
                {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Тийм, томилох
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <div className="p-4 flex items-center justify-between">
            <Link href="/dashboard/company" className="inline-block">
                <div className="flex items-center gap-4 group">
                        {isLoadingProfile ? (
                        <>
                            <Skeleton className="size-10 rounded-lg" />
                            <Skeleton className="h-6 w-32" />
                        </>
                        ) : (
                        <>
                            <Avatar className="size-10 rounded-lg">
                                <AvatarImage src={companyProfile?.logoUrl} className="object-contain"/>
                                <AvatarFallback className="rounded-lg bg-muted">
                                    <Building className="size-5" />
                                </AvatarFallback>
                            </Avatar>
                            <h1 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">{companyProfile?.name || 'Компани'}</h1>
                        </>
                    )}
                </div>
            </Link>
            <div className="flex items-center gap-2">
                <UserNav />
                <Button asChild variant="ghost" size="icon">
                    <Link href="/dashboard/settings/general">
                        <Settings className="h-5 w-5" />
                        <span className="sr-only">Тохиргоо</span>
                    </Link>
                </Button>
            </div>
        </div>

        <CardHeader>
             <div className="grid gap-4 md:grid-cols-3">
                <Link href="/dashboard/employees">
                    <Card className="hover:bg-muted/50 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Нийт ажилчид</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {isLoadingEmp ? <Skeleton className="h-7 w-12"/> : <div className="text-2xl font-bold">{activeEmployeesCount}</div>}
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/dashboard/attendance">
                    <Card className="hover:bg-muted/50 transition-colors">
                         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Ирцийн тойм</CardTitle>
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                             {isLoadingAttendance || isLoadingTimeOff ? (
                                <Skeleton className="h-7 w-20" />
                            ) : (
                                <div className="text-2xl font-bold">
                                    {presentEmployees.size} <span className="text-base font-normal text-muted-foreground">/ {onLeaveEmployees.size} чөлөөтэй</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/dashboard/posts">
                    <Card className="hover:bg-muted/50 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Нийтлэл</CardTitle>
                            <Newspaper className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {isLoadingPosts ? <Skeleton className="h-7 w-12"/> : <div className="text-2xl font-bold">{posts?.length || 0}</div>}
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </CardHeader>
      <div className="relative w-full flex-1">
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
        onAddNewEmployee={handleOpenAddEmployeeDialog}
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
      {isAddEmployeeDialogOpen && (
        <AddEmployeeDialog 
            open={isAddEmployeeDialogOpen}
            onOpenChange={setIsAddEmployeeDialogOpen}
            departments={departments || []}
            positions={positions || []}
            preselectedDept={selectedPosition?.departmentId}
            preselectedPos={selectedPosition?.id}
        />
      )}
    </div>
  );
};

export default OrganizationChart;
