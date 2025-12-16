
'use client';

import React, { useCallback, useMemo, useState, CSSProperties } from 'react';
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
} from 'reactflow';
import 'reactflow/dist/style.css';

import {
  useCollection,
  useFirebase,
  useMemoFirebase,
  updateDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, query, where, collectionGroup } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { User, Users, Briefcase, PlusCircle, CalendarCheck2, LogIn, LogOut, MoreHorizontal, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AddPositionDialog } from '../organization/add-position-dialog';
import { AssignEmployeeDialog } from '../organization/assign-employee-dialog';
import { isWithinInterval, format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// --- Types ---
interface Department {
  id: string;
  name: string;
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

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  photoURL?: string;
  jobTitle: string;
  positionId?: string;
  status: string;
  hireDate: string;
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
    status: 'Хүлээгдэж буй' | 'Зөвшөөрсөн' | 'Татгалзсан';
};

interface PositionNodeData {
  label: string;
  title: string;
  department: string;
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

type CustomNode = Node<PositionNodeData> | Node<EmployeeNodeData>;

// --- Node Components ---
const PositionNode = ({ data }: { data: PositionNodeData }) => {
  const vacancy = data.headcount - data.filled;
  const isVacant = vacancy > 0;

  const getAttendanceContent = () => {
    if (!data.attendanceStatus) return null;

    const { status, checkInTime, checkOutTime } = data.attendanceStatus;
    
    switch(status) {
        case 'on-leave':
            return <div className="flex items-center gap-1 text-yellow-600"><CalendarCheck2 className="h-3 w-3" /><span>Чөлөөтэй</span></div>
        case 'checked-in':
            return <div className="flex items-center gap-1 text-green-600"><LogIn className="h-3 w-3" /><span>Ирсэн: {checkInTime}</span></div>
        case 'checked-out':
            return <div className="flex flex-col text-xs">
                <div className="flex items-center gap-1 text-green-600"><LogIn className="h-3 w-3" /><span>{checkInTime}</span></div>
                <div className="flex items-center gap-1 text-red-600"><LogOut className="h-3 w-3" /><span>{checkOutTime}</span></div>
            </div>
        case 'absent':
             return <div className="text-muted-foreground">Ирц бүртгүүлээгүй</div>
        default:
            return null;
    }
  }

  return (
    <Card className="w-64 border-2 border-primary/50 shadow-lg">
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      <CardHeader className="pb-2 flex-row items-start justify-between">
        <div>
            <CardTitle className="text-base">{data.title}</CardTitle>
            <CardDescription>{data.department}</CardDescription>
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={() => data.onEditPosition(data as any)}>
                    <Pencil className="mr-2 h-4 w-4" /> Ажлын байр засах
                </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => data.onAddEmployee(data as any)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Ажилтан томилох
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>Орон тоо: {data.headcount}</span>
            </div>
            <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>Томилсон: {data.filled}</span>
            </div>
        </div>
        {data.employees.map(emp => (
            <div key={emp.id} className="flex items-center gap-2 rounded-md bg-muted/50 p-2 text-sm">
                 <Avatar className="h-7 w-7">
                    <AvatarImage src={emp.photoURL} alt={emp.firstName} />
                    <AvatarFallback>{emp.firstName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <span>{emp.firstName} {emp.lastName}</span>
            </div>
        ))}
         {isVacant && (
            <Button variant="outline" size="sm" className="w-full h-8" onClick={() => data.onAddEmployee(data as any)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Ажилтан томилох
            </Button>
        )}
      </CardContent>
       {data.employees.length > 0 && (
         <CardContent className="py-2 border-t text-xs flex justify-between items-center">
            <Badge variant="outline">{data.workScheduleName || 'Хуваарьгүй'}</Badge>
            {getAttendanceContent()}
         </CardContent>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </Card>
  );
};

const UnassignedEmployeeNode = ({ data }: { data: EmployeeNodeData }) => (
    <Card className="w-64 bg-amber-50 border-amber-200 shadow-md">
        <Handle type="source" position={Position.Right} className="!bg-amber-500" />
        <CardContent className="p-3 flex items-center gap-3">
             <Avatar className="h-9 w-9">
                <AvatarImage src={data.avatar} alt={data.name} />
                <AvatarFallback>{data.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <p className="font-semibold">{data.name}</p>
                <p className="text-xs text-muted-foreground">{data.jobTitle || 'Албан тушаалгүй'}</p>
            </div>
        </CardContent>
    </Card>
)

const nodeTypes = {
  position: PositionNode,
  unassigned: UnassignedEmployeeNode,
};

const SkeletonChart = () => (
    <div className="relative h-[80vh] w-full">
        <Skeleton className="h-32 w-64 absolute top-10 left-10" />
        <Skeleton className="h-32 w-64 absolute top-60 left-80" />
        <Skeleton className="h-32 w-64 absolute top-10 right-10" />
    </div>
)

// --- Main Component ---
const OrganizationChart = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
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
  
  const todaysAttendanceQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'attendance'), where('date', '==', format(new Date(), 'yyyy-MM-dd'))) : null),
    [firestore]
  );
  
  const timeOffQuery = useMemoFirebase(
      () => (firestore ? collectionGroup(firestore, 'timeOffRequests') : null),
      [firestore]
  );


  const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(deptsQuery);
  const { data: positions, isLoading: isLoadingPos } = useCollection<Position>(positionsQuery);
  const { data: employees, isLoading: isLoadingEmp } = useCollection<Employee>(employeesQuery);
  const { data: workSchedules, isLoading: isLoadingSchedules } = useCollection<any>(workSchedulesQuery);
  const { data: positionLevels, isLoading: isLoadingLevels } = useCollection<any>(positionLevelsQuery);
  const { data: employmentTypes, isLoading: isLoadingEmpTypes } = useCollection<any>(employmentTypesQuery);
  const { data: jobCategories, isLoading: isLoadingJobCategories } = useCollection<any>(jobCategoriesQuery);
  const { data: todaysAttendance, isLoading: isLoadingAttendance } = useCollection<AttendanceRecord>(todaysAttendanceQuery);
  const { data: timeOffRequests, isLoading: isLoadingTimeOff } = useCollection<TimeOffRequest>(timeOffQuery);


  const isLoading = isLoadingDepts || isLoadingPos || isLoadingEmp || isLoadingSchedules || isLoadingAttendance || isLoadingTimeOff || isLoadingLevels || isLoadingEmpTypes || isLoadingJobCategories;

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

  useMemo(() => {
    if (isLoading || !positions) return;

    const deptMap = new Map(departments?.map(d => [d.id, d.name]));
    const workScheduleMap = new Map(workSchedules?.map(ws => [ws.id, ws.name]));

    const positionNodes = new Map<string, Node<PositionNodeData>>();
    const employeeMap = new Map<string, Employee>();
    const posToEmployeeMap = new Map<string, Employee[]>();

    const attendanceMap = new Map(todaysAttendance?.map(a => [a.employeeId, a]));
    const today = new Date();
    const onLeaveEmployeeIds = new Set(
        timeOffRequests
            ?.filter(req => req.status === 'Зөвшөөрсөн' && isWithinInterval(today, { start: new Date(req.startDate), end: new Date(req.endDate) }))
            .map(req => req.employeeId)
    );

    employees?.forEach(e => {
        employeeMap.set(e.id, e);
        if (e.positionId) {
            if (!posToEmployeeMap.has(e.positionId)) {
                posToEmployeeMap.set(e.positionId, []);
            }
            posToEmployeeMap.get(e.positionId)?.push(e);
        }
    });

    const unassignedEmployees = employees?.filter(e => !e.positionId && e.status === 'Идэвхтэй') || [];

    const newNodes: CustomNode[] = [];
    const newEdges: Edge[] = [];
    const positionLayout: Record<string, { x: number, y: number }> = {};
    const levelCounts: Record<number, number> = {};

    function getLevel(posId: string, visited = new Set<string>()): number {
        if (visited.has(posId)) return 100; // Cycle detection
        visited.add(posId);
        const pos = positions?.find(p => p.id === posId);
        if (!pos || !pos.reportsTo) return 0;
        return 1 + getLevel(pos.reportsTo, visited);
    }

    const sortedPositions = (positions || []).map(p => ({ ...p, level: getLevel(p.id) })).sort((a, b) => a.level - b.level);

    sortedPositions.forEach(pos => {
        const level = pos.level;
        levelCounts[level] = (levelCounts[level] || 0) + 1;
        const x = (levelCounts[level] * 350) - 175;
        const y = level * 250;
        positionLayout[pos.id] = { x, y };

         const assignedEmployees = posToEmployeeMap.get(pos.id) || [];
         const employee = assignedEmployees[0]; // Assuming one employee per position for status
         let attendanceStatus;

         if (employee) {
             if (onLeaveEmployeeIds.has(employee.id)) {
                 attendanceStatus = { status: 'on-leave' };
             } else {
                 const attendance = attendanceMap.get(employee.id);
                 if (attendance) {
                     if (attendance.checkOutTime) {
                         attendanceStatus = { status: 'checked-out', checkInTime: format(new Date(attendance.checkInTime), 'HH:mm'), checkOutTime: format(new Date(attendance.checkOutTime), 'HH:mm') };
                     } else {
                         attendanceStatus = { status: 'checked-in', checkInTime: format(new Date(attendance.checkInTime), 'HH:mm') };
                     }
                 } else {
                     attendanceStatus = { status: 'absent' };
                 }
             }
         }

        const node: Node<PositionNodeData> = {
            id: pos.id,
            type: 'position',
            position: { x, y },
            data: {
                ...pos,
                label: pos.title,
                title: pos.title,
                department: deptMap.get(pos.departmentId) || 'Unknown',
                headcount: pos.headcount,
                filled: posToEmployeeMap.get(pos.id)?.length || 0,
                employees: assignedEmployees,
                onAddEmployee: handleAddEmployeeClick,
                onEditPosition: handleEditPositionClick,
                workScheduleName: pos.workScheduleId ? workScheduleMap.get(pos.workScheduleId) : undefined,
                attendanceStatus
            },
        };
        positionNodes.set(pos.id, node);
        newNodes.push(node);

        if (pos.reportsTo && sortedPositions.find(p => p.id === pos.reportsTo)) {
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

    unassignedEmployees.forEach((emp, index) => {
        newNodes.push({
            id: emp.id,
            type: 'unassigned',
            position: { x: -350, y: index * 100 },
            data: {
                label: emp.firstName,
                name: `${emp.firstName} ${emp.lastName}`,
                jobTitle: emp.jobTitle,
                avatar: emp.photoURL,
            },
        });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [isLoading, departments, positions, employees, workSchedules, todaysAttendance, timeOffRequests]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
        if (connection.source && connection.target && firestore) {
            const employeeId = connection.source;
            const positionId = connection.target;
            
            const employeeNode = nodes.find(n => n.id === employeeId);
            const positionNode = nodes.find(n => n.id === positionId);
            
            if (employeeNode?.type !== 'unassigned' || positionNode?.type !== 'position') {
                return;
            }

            const employeeDocRef = doc(firestore, 'employees', employeeId);
            const pos = positions?.find(p => p.id === positionId);

            updateDocumentNonBlocking(employeeDocRef, {
                positionId: positionId,
                jobTitle: pos?.title || 'Тодорхойгүй',
            });
        }
    },
    [firestore, nodes, positions]
  );

  return (
    <div style={{ height: 'calc(100vh - 100px)' }}>
      <style>
        {`
            .react-flow__edge.animated .react-flow__edge-path {
                animation: dashdraw 2s linear infinite;
            }
        `}
      </style>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Байгууллагын бүтэц (Албан тушаалаар)</CardTitle>
                <CardDescription>
                    Ажилтныг сул ажлын байранд чирж томилох эсвэл, ажлын байрны мэдээллийг засах.
                </CardDescription>
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
                fitView
                >
                <Background />
                <Controls />
            </ReactFlow>
        )}
         <Button size="icon" onClick={handleOpenAddDialog} className="absolute bottom-4 right-4 z-10 rounded-full h-12 w-12 shadow-lg">
            <PlusCircle className="h-6 w-6" />
            <span className="sr-only">Ажлын байр нэмэх</span>
        </Button>
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


