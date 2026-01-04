

// src/app/dashboard/page.tsx
'use client';

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
    addDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, query, where, collectionGroup, writeBatch, getDoc, getDocs, increment } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { User, Users, Briefcase, PlusCircle, CalendarCheck2, LogIn, LogOut, MoreHorizontal, Pencil, Layout, RotateCcw, Loader2, MinusCircle, UserCheck, Newspaper, Building, Settings, Copy, UserMinus, UserPlus, ArrowLeft, Home, Palmtree, Sparkles, Rocket } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AddPositionDialog } from './organization/add-position-dialog';
import { AssignEmployeeDialog } from './organization/assign-employee-dialog';
import { UnassignedEmployeesDialog } from './organization/unassigned-employees-dialog';
import { isWithinInterval, format, startOfToday, endOfToday, isToday, startOfDay, endOfDay, parseISO } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
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
import { VacationRequest } from '@/types/vacation';
import { calculateOnboardingProgress } from '@/lib/onboarding-utils';
import {
    Department,
    Position as JobPosition,
    Employee,
    AttendanceRecord,
    ReferenceItem
} from '@/types';

// Local types for the chart
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


interface JobPositionNodeData {
    label: string;
    title: string;
    department: string;
    departmentColor?: string;
    filled: number;
    employees: Employee[];
    workScheduleName?: string;
    onAssignEmployee: (position: JobPosition) => void;
    onEditPosition: (position: JobPosition) => void;
    onDuplicatePosition: (position: JobPosition) => void;
    attendanceStatus?: AttendanceStatus;
    onboardingProgress?: number; // 0-100
    hasActiveOnboarding?: boolean;
}

interface EmployeeNodeData {
    label: string;
    name: string;
    jobTitle: string;
    avatar?: string;
    employee?: Employee;
    isMore?: boolean;
    onClick?: () => void;
}

type CustomNode = Node<JobPositionNodeData | EmployeeNodeData>;

// --- Constants & Layout ---
const X_GAP = 450;
const Y_GAP = 500;
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

const AvatarWithProgress = ({ employee, onboardingProgress }: { employee?: Employee; onboardingProgress?: number }) => {
    const size = 80;

    // Onboarding Progress (Outer Ring)
    const onbProgress = onboardingProgress || 0;
    const outerRadius = 38;
    const outerCircum = 2 * Math.PI * outerRadius;
    const outerOffset = outerCircum - (onbProgress / 100) * outerCircum;
    const outerColor = onbProgress >= 100 ? '#22c55e' : '#3b82f6';

    // Questionnaire Completion (Inner Ring)
    const quesProgress = employee?.questionnaireCompletion || 0;
    const innerRadius = 33;
    const innerCircum = 2 * Math.PI * innerRadius;
    const innerOffset = innerCircum - (quesProgress / 100) * innerCircum;
    const innerColor = quesProgress < 50 ? '#ef4444' : quesProgress < 90 ? '#f59e0b' : '#22c55e';

    const avatarContent = (
        <div className="relative mx-auto transition-all duration-300 ease-in-out hover:scale-110 hover:shadow-lg" style={{ width: size, height: size }}>
            {/* Avatar - Centered and slightly smaller to fit inside rings */}
            <div className="absolute inset-0 flex items-center justify-center">
                <Avatar className="h-[60px] w-[60px]">
                    <AvatarImage src={employee?.photoURL} alt={employee?.firstName} />
                    <AvatarFallback className="text-xl bg-muted">
                        {employee ? `${employee.firstName?.charAt(0)}${employee.lastName?.charAt(0)}` : <User className="h-6 w-6 text-muted-foreground" />}
                    </AvatarFallback>
                </Avatar>
            </div>

            <svg
                className="absolute top-0 left-0 pointer-events-none"
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
            >
                {/* Outer Ring Background (Onboarding Track) */}
                <circle
                    className="text-muted/10"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="transparent"
                    r={outerRadius}
                    cx={size / 2}
                    cy={size / 2}
                />
                {/* Outer Ring (Onboarding Progress) */}
                <circle
                    stroke={outerColor}
                    strokeWidth="3"
                    strokeDasharray={outerCircum}
                    strokeDashoffset={outerOffset}
                    strokeLinecap="round"
                    fill="transparent"
                    r={outerRadius}
                    cx={size / 2}
                    cy={size / 2}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                />

                {/* Inner Ring Background (Questionnaire Track) */}
                <circle
                    className="text-muted/10"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="transparent"
                    r={innerRadius}
                    cx={size / 2}
                    cy={size / 2}
                />
                {/* Inner Ring (Questionnaire Progress) */}
                <circle
                    stroke={innerColor}
                    strokeWidth="3"
                    strokeDasharray={innerCircum}
                    strokeDashoffset={innerOffset}
                    strokeLinecap="round"
                    fill="transparent"
                    r={innerRadius}
                    cx={size / 2}
                    cy={size / 2}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                />
            </svg>
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

const JobPositionNode = ({ data }: { data: JobPositionNodeData }) => {
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
                        <DropdownMenuItem onClick={() => data.onDuplicatePosition(data as any)}><Copy className="mr-2 h-4 w-4" /> Хувилах</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => data.onAssignEmployee(data as any)}><PlusCircle className="mr-2 h-4 w-4" /> Ажилтан томилох</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <CardContent className="p-4 text-center space-y-2">
                <AvatarWithProgress
                    employee={employee}
                    onboardingProgress={data.onboardingProgress}
                />

                <div className="space-y-1">
                    {employee ? (
                        <>
                            <Link href={`/dashboard/employees/${employee.id}`}>
                                <p className="font-semibold text-base hover:underline">{employee.firstName} {employee.lastName}</p>
                                <p className={cn("text-sm font-mono", mutedTextColor)}>{employee.employeeCode}</p>
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
                        <span className={mutedTextColor}>Ажилчид:</span>
                        <span className="font-medium">{data.filled}</span>
                    </div>
                </div>

                {/* Onboarding Progress Indicator */}
                {data.onboardingProgress !== undefined && (
                    <div className={cn("pt-2 mt-2 border-t", isDarkBg ? 'border-gray-500/50' : 'border-border')}>
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                                <Briefcase className={cn("h-3 w-3", data.onboardingProgress >= 100 ? 'text-green-500' : 'text-blue-500')} />
                                <span className={cn("text-xs font-medium", mutedTextColor)}>
                                    {data.onboardingProgress >= 100 ? 'Дасан зохицсон' : 'Дасан зохицох'}
                                </span>
                            </div>
                            <span className={cn("text-xs font-bold", data.onboardingProgress >= 100 ? 'text-green-600' : 'text-blue-600')}>
                                {Math.round(data.onboardingProgress)}%
                            </span>
                        </div>
                        <div className="relative h-1.5 bg-gray-200/50 rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out",
                                    data.onboardingProgress >= 100
                                        ? "bg-gradient-to-r from-green-400 to-green-600"
                                        : "bg-gradient-to-r from-blue-400 to-blue-600"
                                )}
                                style={{ width: `${Math.min(data.onboardingProgress, 100)}%` }}
                            >
                                {/* Animated shimmer effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
                                    style={{
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 2s infinite'
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

            </CardContent>
            <Handle type="source" position={Position.Bottom} className="!bg-primary opacity-0" />
        </Card>
    );
};


const UnassignedEmployeeNode = ({ data }: { data: EmployeeNodeData & { isMore?: boolean, onClick?: () => void } }) => {
    if (data.isMore) {
        return (
            <Card
                className="w-80 bg-slate-900 border-slate-700 shadow-xl p-4 cursor-pointer hover:bg-slate-800 transition-all border-dashed"
                onClick={data.onClick}
            >
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border-2 border-slate-700">
                        <MoreHorizontal className="h-8 w-8 text-slate-400" />
                    </div>
                    <div>
                        <p className="font-bold text-lg text-white">{data.name}</p>
                        <p className="text-sm text-slate-400">{data.jobTitle}</p>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card className="w-80 bg-amber-50 border-amber-200 shadow-md p-4">
            <Handle type="source" position={Position.Right} className="!bg-amber-500" />
            <div className="flex items-center gap-4">
                <div className="w-20 h-20 flex-shrink-0">
                    <AvatarWithProgress employee={data.employee} />
                </div>
                {data.employee && (
                    <Link href={`/dashboard/employees/${data.employee.id}`}>
                        <div className="space-y-0.5">
                            <p className="font-semibold text-lg hover:underline">{data.name}</p>
                            <p className="font-mono text-sm text-muted-foreground">{data.employee.employeeCode}</p>
                            <p className="text-sm text-muted-foreground">{data.jobTitle || 'Албан тушаалгүй'}</p>
                        </div>
                    </Link>
                )}
            </div>
        </Card>
    );
}

const nodeTypes = { position: JobPositionNode, unassigned: UnassignedEmployeeNode };
const SkeletonChart = () => <div className="relative h-[80vh] w-full"><Skeleton className="h-32 w-64 absolute top-10 left-10" /><Skeleton className="h-32 w-64 absolute top-60 left-80" /><Skeleton className="h-32 w-64 absolute top-10 right-10" /></div>

// --- Layouting Logic ---
function calculateLayout(positions: JobPosition[]) {
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

    const widthMemo = new Map<string, number>();
    const calculateSubtreeWidth = (nodeId: string, visited = new Set<string>()): number => {
        if (widthMemo.has(nodeId)) return widthMemo.get(nodeId)!;
        if (visited.has(nodeId)) return X_GAP; // Cycle detected

        const newVisited = new Set(visited);
        newVisited.add(nodeId);

        const children = childrenMap.get(nodeId) || [];
        if (children.length === 0) {
            return X_GAP;
        }
        const width = children.reduce((sum, childId) => sum + calculateSubtreeWidth(childId, newVisited), 0);
        widthMemo.set(nodeId, width);
        return width;
    };

    function positionNodes(nodeId: string, x: number, y: number) {
        if (processedNodes.has(nodeId)) return;
        nodePositions[nodeId] = { x, y };
        processedNodes.add(nodeId);

        const children = childrenMap.get(nodeId) || [];
        children.sort((a, b) => (positionMap.get(a)?.title || '').localeCompare(positionMap.get(b)?.title || ''));

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
    rootNodes.sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    let currentX = 0;
    rootNodes.forEach(rootNode => {
        const rootWidth = calculateSubtreeWidth(rootNode.id);
        positionNodes(rootNode.id, currentX + rootWidth / 2, 0);
        currentX += rootWidth;
    });

    return nodePositions;
}


function useLayout(positions: JobPosition[] | null) {
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
            if (node.position) {
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
    const [selectedPosition, setSelectedPosition] = useState<JobPosition | null>(null);
    const [isUnassignedDialogOpen, setIsUnassignedDialogOpen] = React.useState(false);
    const [selectedEmployeeForAssignment, setSelectedEmployeeForAssignment] = React.useState<Employee | null>(null);
    const [isPositionDialogOpen, setIsPositionDialogOpen] = useState(false);
    const [editingPosition, setEditingPosition] = useState<JobPosition | null>(null);
    const [duplicatingPosition, setDuplicatingPosition] = React.useState<JobPosition | null>(null);

    const { toast } = useToast();
    const { firestore } = useFirebase();

    // Data fetching
    const deptsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departments') : null), [firestore]);
    const positionsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'positions'), where('isActive', '==', true)) : null, [firestore]);
    const employeesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'employees') : null, [firestore]);
    const workSchedulesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'workSchedules') : null), [firestore]);
    const positionLevelsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'positionLevels') : null), [firestore]);
    const employmentTypesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'employmentTypes') : null), [firestore]);
    const jobCategoriesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'jobCategories') : null), [firestore]);
    const companyProfileRef = useMemoFirebase(() => (firestore ? doc(firestore, 'company', 'profile') : null), [firestore]);

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const attendanceQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'attendance'), where('date', '==', todayStr)) : null), [firestore, todayStr]);
    const timeOffQuery = useMemoFirebase(() => (firestore ? query(collectionGroup(firestore, 'timeOffRequests'), where('status', '==', 'Зөвшөөрсөн')) : null), [firestore]);
    const postsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'posts') : null, [firestore]);

    // Onboarding programs query
    const onboardingProgramsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'onboardingPrograms') : null, [firestore]);
    const assignedProgramsQuery = useMemoFirebase(() => firestore ? collectionGroup(firestore, 'assignedPrograms') : null, [firestore]);

    const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(deptsQuery);
    const { data: positions, isLoading: isLoadingPos } = useCollection<JobPosition>(positionsQuery);
    const { data: employees, isLoading: isLoadingEmp } = useCollection<Employee>(employeesQuery);
    const { data: workSchedules, isLoading: isLoadingSchedules } = useCollection<any>(workSchedulesQuery);
    const { data: positionLevels, isLoading: isLoadingLevels } = useCollection<any>(positionLevelsQuery);
    const { data: employmentTypes, isLoading: isLoadingEmpTypes } = useCollection<any>(employmentTypesQuery);
    const { data: jobCategories, isLoading: isLoadingJobCategories } = useCollection<any>(jobCategoriesQuery);
    const { data: attendanceData, isLoading: isLoadingAttendance } = useCollection<AttendanceRecord>(attendanceQuery);

    // Vacation Statistics for Dashboard
    const vacationRequestsQuery = useMemoFirebase(() =>
        firestore ? query(collectionGroup(firestore, 'vacationRequests'), where('status', '==', 'APPROVED')) : null
        , [firestore]);
    const { data: vacationRequests } = useCollection<VacationRequest>(vacationRequestsQuery);

    const onLeaveCount = useMemo(() => {
        if (!vacationRequests) return 0;
        const now = startOfDay(new Date());
        return vacationRequests.filter(r => {
            try {
                return isWithinInterval(now, {
                    start: startOfDay(parseISO(r.startDate)),
                    end: endOfDay(parseISO(r.endDate))
                });
            } catch (e) {
                return false;
            }
        }).length;
    }, [vacationRequests]);
    const { data: timeOffData, isLoading: isLoadingTimeOff } = useCollection<TimeOffRequest>(timeOffQuery);
    const { data: posts, isLoading: isLoadingPosts } = useCollection(postsQuery);
    const { data: companyProfile, isLoading: isLoadingProfile } = useDoc<CompanyProfile>(companyProfileRef);
    const { data: onboardingPrograms } = useCollection<any>(onboardingProgramsQuery);
    const { data: assignedPrograms, isLoading: isLoadingAssigned } = useCollection<any>(assignedProgramsQuery);

    const { nodePositions, saveLayout, resetLayout } = useLayout(positions);

    // Critical loading states for the organization chart
    const isCriticalLoading = isLoadingDepts || isLoadingPos || isLoadingEmp || isLoadingProfile;
    // Secondary loading states for statistics
    const isStatsLoading = isLoadingSchedules || isLoadingLevels || isLoadingEmpTypes || isLoadingJobCategories || isLoadingAttendance || isLoadingTimeOff || isLoadingPosts || isLoadingAssigned;

    // For visual skeleton of the chart
    const isLoading = isCriticalLoading;

    const activeEmployeesCount = useMemo(() => {
        return (employees || []).filter(emp => emp.status === 'Идэвхтэй').length;
    }, [employees]);

    const unassignedEmployees = useMemo(() => {
        return (employees || []).filter(e => !e.positionId && e.status === 'Идэвхтэй');
    }, [employees]);

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

    // Onboarding statistics
    const onboardingStats = useMemo(() => {
        if (!assignedPrograms) return { activePrograms: 0, pendingTasks: 0, avgProgress: 0 };

        const activePrograms = assignedPrograms.filter((p: any) => p.status === 'IN_PROGRESS');
        let totalTasks = 0;
        let totalProgress = 0;
        let completedTasksCount = 0;

        activePrograms.forEach((program: any) => {
            if (program.stages && Array.isArray(program.stages)) {
                const progress = calculateOnboardingProgress(program.stages);
                totalProgress += progress;

                program.stages.forEach((stage: any) => {
                    if (stage.tasks && Array.isArray(stage.tasks)) {
                        totalTasks += stage.tasks.length;
                        completedTasksCount += stage.tasks.filter((t: any) => t.status === 'DONE' || t.status === 'VERIFIED').length;
                    }
                });
            }
        });

        const pendingTasks = totalTasks - completedTasksCount;
        const avgProgress = activePrograms.length > 0 ? Math.round(totalProgress / activePrograms.length) : 0;

        return { activePrograms: activePrograms.length, pendingTasks, avgProgress };
    }, [assignedPrograms]);

    // New hires (last 30 days)
    const newHiresStats = useMemo(() => {
        if (!employees) return { count: 0, avgOnboardingProgress: 0 };

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const newHires = employees.filter(emp => {
            if (!emp.hireDate) return false;
            const hireDate = new Date(emp.hireDate);
            return hireDate >= thirtyDaysAgo && emp.status === 'Идэвхтэй';
        });

        // Calculate average onboarding progress for new hires
        const newHireIds = new Set(newHires.map(e => e.id));
        const newHirePrograms = assignedPrograms?.filter((p: any) => newHireIds.has(p.employeeId)) || [];

        const avgOnboardingProgress = newHirePrograms.length > 0
            ? Math.round(newHirePrograms.reduce((sum: number, p: any) => sum + (p.progress || 0), 0) / newHirePrograms.length)
            : 0;

        return { count: newHires.length, avgOnboardingProgress };
    }, [employees, assignedPrograms]);

    // Recent activities (last 10)
    const recentActivities = useMemo(() => {
        const activities: Array<{ id: string; type: string; employeeName: string; time: string; description: string }> = [];

        // Add today's attendance check-ins
        if (attendanceData && employees) {
            const empMap = new Map((employees as Employee[]).map(e => [e.id, e]));
            attendanceData.forEach(record => {
                const emp = empMap.get(record.employeeId);
                if (emp && record.checkInTime) {
                    activities.push({
                        id: `attendance-${record.id}`,
                        type: 'check-in',
                        employeeName: `${emp.firstName || ''} ${emp.lastName || ''}`,
                        time: record.checkInTime,
                        description: 'Ирлээ'
                    });
                }
            });
        }

        // Sort by time and take last 10
        activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        return activities.slice(0, 10);
    }, [attendanceData, employees]);

    const handleAssignEmployeeClick = (position: JobPosition) => {
        setSelectedPosition(position);
        setIsAssignDialogOpen(true);
    };

    const handleEditPositionClick = (position: JobPosition) => {
        setEditingPosition(position);
        setIsPositionDialogOpen(true);
    };

    const handleOpenAddDialog = () => {
        setEditingPosition(null);
        setIsPositionDialogOpen(true);
    };

    const handleDuplicatePosition = (pos: JobPosition) => {
        if (!firestore) return;

        // Create a new object with only the fields we want to save to Firestore
        const newPositionData = {
            title: `${pos.title} (Хуулбар)`,
            departmentId: pos.departmentId,
            reportsTo: pos.reportsTo || null,
            levelId: pos.levelId || null,
            employmentTypeId: pos.employmentTypeId || null,
            workScheduleId: pos.workScheduleId || null,
            isActive: true, // Always create as active
            jobCategoryId: pos.jobCategoryId || null,
            createdAt: new Date().toISOString(),
            canApproveAttendance: pos.canApproveAttendance || false,
            filled: 0,
        };

        const positionsCollection = collection(firestore, 'positions');
        addDocumentNonBlocking(positionsCollection, newPositionData);

        toast({
            title: "Амжилттай хувиллаа",
            description: `"${pos.title}" ажлын байрыг хувилж, "${newPositionData.title}"-г үүсгэлээ.`
        });
        setDuplicatingPosition(null);
    };


    // Create nodes and edges based on data
    useEffect(() => {
        if (isCriticalLoading || !departments || !positions) return;

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
                if (attendanceRecord.checkOutTime) {
                    employeeAttendanceStatus.set(emp.id, { status: 'checked-out', checkInTime: attendanceRecord.checkInTime, checkOutTime: attendanceRecord.checkOutTime });
                } else {
                    employeeAttendanceStatus.set(emp.id, { status: 'checked-in', checkInTime: attendanceRecord.checkInTime });
                }
            } else {
                employeeAttendanceStatus.set(emp.id, { status: 'absent' });
            }
        });

        // Map employee onboarding programs
        const employeeOnboardingMap = new Map<string, { progress: number; hasActive: boolean }>();
        assignedPrograms?.forEach((program: any) => {
            // Robust way to get employeeId from document path or explicit field
            // Path: employees/{empId}/assignedPrograms/{docId}
            let employeeId = program.employeeId;
            if (!employeeId && program.ref?.path) {
                const path = program.ref.path.startsWith('/') ? program.ref.path.substring(1) : program.ref.path;
                const parts = path.split('/');
                if (parts.length >= 2 && parts[0] === 'employees') {
                    employeeId = parts[1];
                }
            }

            if (employeeId && (program.status === 'IN_PROGRESS' || program.status === 'COMPLETED')) {
                const existing = employeeOnboardingMap.get(employeeId);
                // Keep the highest progress or the active one
                if (!existing || program.progress > existing.progress) {
                    employeeOnboardingMap.set(employeeId, {
                        progress: program.progress || 0,
                        hasActive: program.status === 'IN_PROGRESS'
                    });
                }
            }
        });


        const newNodes: CustomNode[] = [];
        const newEdges: Edge[] = [];

        positions.forEach(pos => {
            const assignedEmployees = posToEmployeeMap.get(pos.id) || [];
            const department = deptMap.get(pos.departmentId);
            const employee = assignedEmployees[0];

            // Get onboarding data for the employee
            const onboardingData = employee ? employeeOnboardingMap.get(employee.id) : undefined;

            const node: Node<JobPositionNodeData> = {
                id: pos.id,
                type: 'position',
                position: nodePositions[pos.id] || { x: 0, y: 0 },
                data: {
                    ...pos, label: pos.title, title: pos.title,
                    department: department?.name || 'Unknown',
                    departmentColor: department?.color,
                    filled: posToEmployeeMap.get(pos.id)?.length || 0,
                    employees: assignedEmployees,
                    onAssignEmployee: handleAssignEmployeeClick,
                    onEditPosition: handleEditPositionClick,
                    onDuplicatePosition: (pos: JobPosition) => setDuplicatingPosition(pos),
                    workScheduleName: pos.workScheduleId ? workScheduleMap.get(pos.workScheduleId) : undefined,
                    attendanceStatus: employee ? employeeAttendanceStatus.get(employee.id) : undefined,
                    onboardingProgress: onboardingData?.progress,
                    hasActiveOnboarding: onboardingData?.hasActive,
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

        // Limit unassigned nodes to 10 on the chart to prevent clutter
        const visibleUnassigned = unassignedEmployees.slice(0, 10);
        visibleUnassigned.forEach((emp, index) => {
            newNodes.push({
                id: emp.id, type: 'unassigned', position: { x: -600, y: index * 120 },
                data: {
                    label: emp.firstName,
                    name: `${emp.firstName} ${emp.lastName}`,
                    jobTitle: emp.jobTitle,
                    avatar: emp.photoURL,
                    employee: emp,
                },
            });
        });

        if (unassignedEmployees.length > 10) {
            newNodes.push({
                id: 'unassigned-more',
                type: 'unassigned',
                position: { x: -600, y: 10 * 120 },
                data: {
                    label: `Бусад ${unassignedEmployees.length - 10}...`,
                    name: `+${unassignedEmployees.length - 10} ажилтан`,
                    jobTitle: 'Бүгдийг харах',
                    isMore: true,
                    onClick: () => setIsUnassignedDialogOpen(true)
                }
            });
        }

        setNodes(newNodes);
        setEdges(newEdges);
    }, [isLoading, departments, positions, employees, workSchedules, nodePositions, attendanceData, timeOffData, onLeaveEmployees, assignedPrograms]);

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

            const posData = positionNode?.data as JobPositionNodeData;
            if (posData.filled >= 1) {
                toast({
                    title: "Орон тоо дүүрсэн",
                    description: `"${posData.title}" ажлын байранд ажилтан томилогдсон байна.`,
                    variant: "destructive"
                })
                return;
            }

            setSelectedPosition(positionNode.data as any);
            setSelectedEmployeeForAssignment((employeeNode.data as any).employee);
            setIsAssignDialogOpen(true);
        },
        [nodes, toast]
    );

    const inactiveEmployeesCount = (employees || []).filter(e => e.status !== 'Идэвхтэй').length;

    return (
        <div className="flex flex-col h-full">
            {/* Stats Bar - 20% height, horizontal scroll */}
            <div className="h-[20vh] min-h-[160px] border-b bg-slate-50 dark:bg-slate-950">
                <div className="h-full overflow-x-auto overflow-y-hidden px-6 py-4">
                    <div className="flex gap-6 h-full">
                        {/* 1. Total Employees */}
                        <Link href="/dashboard/employees" className="flex-shrink-0">
                            <Card className="h-full w-[220px] bg-slate-900 dark:bg-slate-800 border-slate-700 hover:bg-slate-800 dark:hover:bg-slate-700 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                                <CardContent className="p-5 h-full flex flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Нийт ажилчид</div>
                                        <Users className="h-5 w-5 text-slate-500" />
                                    </div>
                                    {isLoadingEmp ? (
                                        <Skeleton className="h-10 w-20 bg-slate-700" />
                                    ) : (
                                        <div>
                                            <div className="text-4xl font-black text-white mb-1">{activeEmployeesCount}</div>
                                            <div className="text-xs text-slate-400 font-medium">идэвхтэй ажилтан</div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>

                        {/* 2. Attendance */}
                        <Link href="/dashboard/attendance" className="flex-shrink-0">
                            <Card className="h-full w-[260px] bg-slate-900 dark:bg-slate-800 border-slate-700 hover:bg-slate-800 dark:hover:bg-slate-700 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                                <CardContent className="p-5 h-full flex flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Өнөөдрийн ирц</div>
                                        <UserCheck className="h-5 w-5 text-slate-500" />
                                    </div>
                                    {isLoadingAttendance || isLoadingTimeOff ? (
                                        <Skeleton className="h-10 w-32 bg-slate-700" />
                                    ) : (
                                        <div className="flex items-end gap-6">
                                            <div>
                                                <div className="text-3xl font-black text-white">{presentEmployees.size}</div>
                                                <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wide">Ажил дээрээ</div>
                                            </div>
                                            <div className="h-12 w-px bg-slate-700" />
                                            <div>
                                                <div className="text-3xl font-black text-white">{onLeaveEmployees.size}</div>
                                                <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wide">Чөлөөтэй</div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>

                        {/* 3. Vacation (New) */}
                        <Link href="/dashboard/vacation" className="flex-shrink-0">
                            <Card className="h-full w-[200px] bg-slate-900 dark:bg-slate-800 border-slate-700 hover:bg-slate-800 dark:hover:bg-slate-700 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                                <CardContent className="p-5 h-full flex flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ээлжийн амралт</div>
                                        <Palmtree className="h-5 w-5 text-slate-500" />
                                    </div>
                                    {isLoadingTimeOff ? (
                                        <Skeleton className="h-10 w-16 bg-slate-700" />
                                    ) : (
                                        <div>
                                            <div className="text-4xl font-black text-amber-500 mb-1">{onLeaveCount}</div>
                                            <div className="text-xs text-slate-400 font-medium">ажилтан амарч байна</div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>

                        {/* 3. Posts */}
                        <Link href="/dashboard/posts" className="flex-shrink-0">
                            <Card className="h-full w-[180px] bg-slate-900 dark:bg-slate-800 border-slate-700 hover:bg-slate-800 dark:hover:bg-slate-700 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                                <CardContent className="p-5 h-full flex flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Мэдээлэл</div>
                                        <Newspaper className="h-5 w-5 text-slate-500" />
                                    </div>
                                    {isLoadingPosts ? (
                                        <Skeleton className="h-10 w-16 bg-slate-700" />
                                    ) : (
                                        <div>
                                            <div className="text-4xl font-black text-white mb-1">{posts?.length || 0}</div>
                                            <div className="text-xs text-slate-400 font-medium">нийтлэл</div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>

                        {/* 4. Onboarding */}
                        <Link href="/dashboard/settings/onboarding" className="flex-shrink-0">
                            <Card className="h-full w-[280px] bg-slate-900 dark:bg-slate-800 border-slate-700 hover:bg-slate-800 dark:hover:bg-slate-700 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                                <CardContent className="p-5 h-full flex flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Дасан зохицох</div>
                                        <Briefcase className="h-5 w-5 text-slate-500" />
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <div className="text-3xl font-black text-white">{onboardingStats.activePrograms}</div>
                                            <div className="text-[10px] text-slate-400 font-medium uppercase">Идэвхтэй</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-black text-amber-400">{onboardingStats.pendingTasks}</div>
                                            <div className="text-[9px] text-slate-400 uppercase font-medium">Хүлээгдэж буй</div>
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            style={{ width: `${onboardingStats.avgProgress}%` }}
                                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-1000"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>

                        {/* 5. Point Module - NEW */}
                        <Link href="/dashboard/points" className="flex-shrink-0">
                            <Card className="h-full w-[240px] bg-slate-900 dark:bg-slate-800 border-slate-700 hover:bg-slate-800 dark:hover:bg-slate-700 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group">
                                <CardContent className="p-5 h-full flex flex-col justify-between relative overflow-hidden">
                                    {/* Decorative background accent */}
                                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full blur-2xl group-hover:from-yellow-500/30 transition-all" />

                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Пойнт Модул</div>
                                        <Sparkles className="h-5 w-5 text-yellow-500" />
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <div className="text-3xl font-black text-white">Points</div>
                                            <Rocket className="w-5 h-5 text-orange-400" />
                                        </div>
                                        <div className="text-xs text-slate-400 font-medium">Recognition System</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>

                        {/* 6. New Hires */}
                        <div className="flex-shrink-0">
                            <Card className="h-full w-[260px] bg-slate-900 dark:bg-slate-800 border-slate-700 hover:bg-slate-800 dark:hover:bg-slate-700 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                                <CardContent className="p-5 h-full flex flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Шинэ ажилтнууд</div>
                                        <UserPlus className="h-5 w-5 text-slate-500" />
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <div className="text-4xl font-black text-white">{newHiresStats.count}</div>
                                            <div className="text-[10px] text-slate-400 font-medium">Сүүлийн 30 хоногт</div>
                                        </div>
                                        <div className="px-3 py-2 bg-slate-800 dark:bg-slate-700 rounded-xl border border-slate-600">
                                            <div className="text-lg font-black text-white">{newHiresStats.avgOnboardingProgress}%</div>
                                            <div className="text-[8px] uppercase font-bold text-slate-400 tracking-wider">Дундаж</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* 6. Unassigned Employees */}
                        <div className="flex-shrink-0 cursor-pointer" onClick={() => setIsUnassignedDialogOpen(true)}>
                            <Card className="h-full w-[220px] bg-slate-900 dark:bg-slate-800 border-slate-700 hover:bg-slate-800 dark:hover:bg-slate-700 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                                <CardContent className="p-5 h-full flex flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Томилогдоогүй</div>
                                        <UserMinus className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <div>
                                        <div className="text-4xl font-black text-rose-500 mb-1">
                                            {unassignedEmployees?.length || 0}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">ажил томилох шаардлагатай</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* Organization Chart - 80% height */}
            <div className="flex-1 relative w-full">
                {isLoading ? <SkeletonChart /> : (
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
                    <Button asChild size="icon" className="rounded-full h-12 w-12 shadow-lg">
                        <Link href="/dashboard/employees/add">
                            <User className="h-6 w-6" />
                            <span className="sr-only">Ажилтан нэмэх</span>
                        </Link>
                    </Button>
                    <Button size="icon" onClick={handleOpenAddDialog} className="rounded-full h-12 w-12 shadow-lg">
                        <PlusCircle className="h-6 w-6" />
                        <span className="sr-only">Ажлын байр нэмэх</span>
                    </Button>
                </div>
            </div>
            <UnassignedEmployeesDialog
                open={isUnassignedDialogOpen}
                onOpenChange={setIsUnassignedDialogOpen}
                employees={employees?.filter(e => !e.positionId && e.status === 'Идэвхтэй') || []}
                onAssign={(emp) => {
                    setSelectedEmployeeForAssignment(emp);
                    setIsAssignDialogOpen(true);
                    setIsUnassignedDialogOpen(false);
                }}
            />
            <AssignEmployeeDialog
                open={isAssignDialogOpen}
                onOpenChange={setIsAssignDialogOpen}
                position={selectedPosition}
                selectedEmployee={selectedEmployeeForAssignment}
                onAssignmentComplete={() => setSelectedEmployeeForAssignment(null)}
                employees={employees?.filter(e => !e.positionId && e.status === 'Идэвхтэй') || []}
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
            <AlertDialog open={!!duplicatingPosition} onOpenChange={(open) => !open && setDuplicatingPosition(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Ажлын байр хувилах</AlertDialogTitle>
                        <AlertDialogDescription>
                            Та "{duplicatingPosition?.title}" ажлын байрыг хувилахдаа итгэлтэй байна уу?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                        <AlertDialogAction onClick={() => duplicatingPosition && handleDuplicatePosition(duplicatingPosition)}>
                            Тийм, хувилах
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default OrganizationChart;
