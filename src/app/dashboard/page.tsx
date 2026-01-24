

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
import { User, Users, Briefcase, CalendarCheck2, LogIn, LogOut, MoreHorizontal, Layout, RotateCcw, Loader2, MinusCircle, UserCheck, Newspaper, Building, Settings, UserMinus, UserPlus, ArrowLeft, Home, Palmtree, Sparkles, Rocket, Network, ScrollText, Handshake, Flag, ExternalLink, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AppointEmployeeDialog } from './organization/[departmentId]/components/flow/appoint-employee-dialog';
import { UnassignedEmployeesDialog } from './organization/unassigned-employees-dialog';
import { isWithinInterval, format, startOfToday, endOfToday, isToday, startOfDay, endOfDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { UserNav } from '@/components/user-nav';
import { VacationRequest } from '@/types/vacation';

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
    id: string;
    label: string;
    title: string;
    department: string;
    departmentColor?: string;
    filled: number;
    employees: Employee[];
    workScheduleName?: string;
    attendanceStatus?: AttendanceStatus;
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

const AvatarWithProgress = ({ employee }: { employee?: Employee }) => {
    const size = 72;
    const avatarSize = 56;

    // Questionnaire Completion (Ring)
    const quesProgress = employee?.questionnaireCompletion || 0;
    const radius = (size - 4) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (quesProgress / 100) * circumference;
    const progressColor = quesProgress < 50 ? '#f43f5e' : quesProgress < 90 ? '#f59e0b' : '#10b981';

    const avatarContent = (
        <div 
            className="relative mx-auto transition-transform duration-300 ease-out hover:scale-105" 
            style={{ width: size, height: size }}
        >
            {/* Avatar */}
            <div className="absolute inset-0 flex items-center justify-center">
                <Avatar 
                    className="border-2 border-white/50"
                    style={{ width: avatarSize, height: avatarSize }}
                >
                    <AvatarImage src={employee?.photoURL} alt={employee?.firstName} className="object-cover" />
                    <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600">
                        {employee 
                            ? `${employee.firstName?.charAt(0)}${employee.lastName?.charAt(0)}` 
                            : <User className="h-6 w-6 text-slate-400" />
                        }
                    </AvatarFallback>
                </Avatar>
            </div>

            {/* Progress Ring */}
            {employee && (
                <svg
                    className="absolute inset-0 pointer-events-none -rotate-90"
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                >
                    {/* Track */}
                    <circle
                        stroke="rgba(255,255,255,0.15)"
                        strokeWidth="3"
                        fill="transparent"
                        r={radius}
                        cx={size / 2}
                        cy={size / 2}
                    />
                    {/* Progress */}
                    <circle
                        stroke={progressColor}
                        strokeWidth="3"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        fill="transparent"
                        r={radius}
                        cx={size / 2}
                        cy={size / 2}
                        style={{ 
                            transition: 'stroke-dashoffset 0.6s ease-out'
                        }}
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
        'checked-in': { 
            icon: LogIn, 
            text: 'Ирсэн', 
            bgColor: 'bg-emerald-500/20', 
            textColor: 'text-emerald-400',
            time: status.checkInTime ? format(new Date(status.checkInTime), 'HH:mm') : '' 
        },
        'checked-out': { 
            icon: LogOut, 
            text: 'Явсан', 
            bgColor: 'bg-rose-500/20', 
            textColor: 'text-rose-400',
            time: status.checkOutTime ? format(new Date(status.checkOutTime), 'HH:mm') : '' 
        },
        'on-leave': { 
            icon: CalendarCheck2, 
            text: 'Чөлөөтэй', 
            bgColor: 'bg-sky-500/20', 
            textColor: 'text-sky-400',
            time: '' 
        },
        'absent': { 
            icon: MinusCircle, 
            text: 'Ирээгүй', 
            bgColor: 'bg-slate-500/20', 
            textColor: 'text-slate-400',
            time: '' 
        },
    }[status.status];

    if (!config) return null;

    const Icon = config.icon;

    return (
        <div className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold",
            config.bgColor,
            config.textColor
        )}>
            <Icon className="h-3 w-3" />
            <span>{config.text}</span>
            {config.time && <span className="opacity-70">• {config.time}</span>}
        </div>
    )
}

const JobPositionNode = ({ data }: { data: JobPositionNodeData }) => {
    const employee = data.employees[0];
    const isDarkBg = data.departmentColor ? isColorDark(data.departmentColor) : false;
    const hasEmployee = !!employee;

    return (
        <div className="relative group">
            <Handle type="target" position={Position.Top} className="!bg-primary opacity-0" />
            
            {/* Main Card */}
            <div
                className={cn(
                    "w-72 rounded-2xl shadow-xl relative overflow-hidden transition-all duration-300",
                    "hover:shadow-2xl hover:-translate-y-1",
                    isDarkBg ? "text-white" : "text-slate-800"
                )}
                style={{ backgroundColor: data.departmentColor || '#1e293b' }}
            >
                {/* Glassmorphism overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                
                {/* Top accent line */}
                <div className={cn(
                    "h-1 w-full",
                    hasEmployee ? "bg-emerald-400" : "bg-amber-400"
                )} />

                {/* Detail link button */}
                <Link 
                    href={`/dashboard/organization/positions/${data.id}`}
                    className="absolute top-3 right-3 z-10"
                >
                    <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                        "opacity-0 group-hover:opacity-100",
                        isDarkBg 
                            ? "bg-white/20 hover:bg-white/30 text-white" 
                            : "bg-black/10 hover:bg-black/20 text-slate-700"
                    )}>
                        <ExternalLink className="h-4 w-4" />
                    </div>
                </Link>

                <div className="p-5 space-y-4">
                    {/* Avatar Section */}
                    <div className="flex justify-center">
                        <div className="relative">
                            <AvatarWithProgress employee={employee} />
                            {/* Status dot */}
                            <div className={cn(
                                "absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 flex items-center justify-center",
                                isDarkBg ? "border-slate-800" : "border-white",
                                hasEmployee ? "bg-emerald-500" : "bg-amber-500"
                            )}>
                                {hasEmployee ? (
                                    <UserCheck className="h-3 w-3 text-white" />
                                ) : (
                                    <User className="h-3 w-3 text-white" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="text-center space-y-1">
                        {employee ? (
                            <Link href={`/dashboard/employees/${employee.id}`} className="block group/name">
                                <h3 className="font-bold text-lg leading-tight group-hover/name:underline">
                                    {employee.firstName} {employee.lastName}
                                </h3>
                                <p className={cn(
                                    "text-xs font-mono tracking-wider",
                                    isDarkBg ? "text-white/60" : "text-slate-500"
                                )}>
                                    {employee.employeeCode}
                                </p>
                            </Link>
                        ) : (
                            <div className="py-1">
                                <h3 className={cn(
                                    "font-semibold text-base",
                                    isDarkBg ? "text-white/70" : "text-slate-500"
                                )}>
                                    Сул орон тоо
                                </h3>
                            </div>
                        )}
                        
                        {/* Position Title */}
                        <Link 
                            href={`/dashboard/organization/positions/${data.id}`} 
                            className="block"
                        >
                            <p className={cn(
                                "text-sm font-medium hover:underline",
                                isDarkBg ? "text-white/80" : "text-slate-600"
                            )}>
                                {data.title}
                            </p>
                        </Link>
                    </div>

                    {/* Attendance Status */}
                    {data.attendanceStatus && (
                        <div className="flex justify-center">
                            <AttendanceStatusIndicator status={data.attendanceStatus} />
                        </div>
                    )}

                    {/* Progress bar (if employee has questionnaire) */}
                    {employee?.questionnaireCompletion !== undefined && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                                <span className={isDarkBg ? "text-white/60" : "text-slate-500"}>Анкет</span>
                                <span className={cn(
                                    "font-semibold",
                                    employee.questionnaireCompletion >= 90 ? "text-emerald-400" :
                                    employee.questionnaireCompletion >= 50 ? "text-amber-400" : "text-rose-400"
                                )}>
                                    {Math.round(employee.questionnaireCompletion)}%
                                </span>
                            </div>
                            <div className={cn(
                                "h-1.5 rounded-full overflow-hidden",
                                isDarkBg ? "bg-white/10" : "bg-slate-200"
                            )}>
                                <div 
                                    className={cn(
                                        "h-full rounded-full transition-all duration-500",
                                        employee.questionnaireCompletion >= 90 ? "bg-emerald-400" :
                                        employee.questionnaireCompletion >= 50 ? "bg-amber-400" : "bg-rose-400"
                                    )}
                                    style={{ width: `${employee.questionnaireCompletion}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className={cn(
                        "pt-3 border-t flex items-center justify-between text-xs",
                        isDarkBg ? "border-white/10" : "border-slate-200"
                    )}>
                        <div className="flex items-center gap-1.5">
                            <Building className={cn("h-3.5 w-3.5", isDarkBg ? "text-white/50" : "text-slate-400")} />
                            <span className={cn(
                                "font-medium truncate max-w-[120px]",
                                isDarkBg ? "text-white/80" : "text-slate-600"
                            )}>
                                {data.department}
                            </span>
                        </div>
                        <Badge 
                            variant="secondary" 
                            className={cn(
                                "text-[10px] px-2 py-0.5 font-semibold border-0",
                                hasEmployee 
                                    ? "bg-emerald-500/20 text-emerald-300" 
                                    : "bg-amber-500/20 text-amber-300"
                            )}
                        >
                            {hasEmployee ? "Томилсон" : "Сул"}
                        </Badge>
                    </div>
                </div>
            </div>
            
            <Handle type="source" position={Position.Bottom} className="!bg-primary opacity-0" />
        </div>
    );
};


const UnassignedEmployeeNode = ({ data }: { data: EmployeeNodeData & { isMore?: boolean, onClick?: () => void } }) => {
    if (data.isMore) {
        return (
            <div
                className="w-72 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 shadow-xl p-5 cursor-pointer hover:from-slate-700 hover:to-slate-800 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 group"
                onClick={data.onClick}
            >
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-slate-700/50 flex items-center justify-center border border-dashed border-slate-600 group-hover:border-slate-500 transition-colors">
                        <MoreHorizontal className="h-6 w-6 text-slate-400 group-hover:text-slate-300" />
                    </div>
                    <div>
                        <p className="font-bold text-base text-white">{data.name}</p>
                        <p className="text-xs text-slate-400 font-medium">{data.jobTitle}</p>
                    </div>
                </div>
            </div>
        );
    }

    const employee = data.employee;
    const lifecycleColors: Record<string, { bg: string, text: string, label: string }> = {
        'recruitment': { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Бүрдүүлэлт' },
        'onboarding': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Чиглүүлэх' },
        'development': { bg: 'bg-violet-500/20', text: 'text-violet-400', label: 'Хөгжүүлэлт' },
        'retention': { bg: 'bg-rose-500/20', text: 'text-rose-400', label: 'Тогтворжилт' },
        'offboarding': { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Чөлөөлөх' },
    };
    const lifecycle = employee?.lifecycleStage ? lifecycleColors[employee.lifecycleStage] : null;

    return (
        <div className="relative group">
            {/* Drag Handle - visible connection point */}
            <Handle 
                type="source" 
                position={Position.Right} 
                className="!w-4 !h-4 !bg-amber-500 !border-2 !border-amber-300 !rounded-full !right-[-8px] hover:!bg-amber-600 hover:!scale-125 transition-all cursor-crosshair" 
            />
            
            {/* Main Card */}
            <div className="w-72 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-amber-300">
                {/* Top accent */}
                <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-orange-400" />
                
                <div className="p-5 space-y-4">
                    {/* Avatar & Info */}
                    <div className="flex items-center gap-4">
                        <div className="relative flex-shrink-0">
                            <div className="w-16 h-16">
                                <AvatarWithProgress employee={employee} />
                            </div>
                            {/* Status indicator */}
                            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center shadow-sm">
                                <UserMinus className="h-3 w-3 text-white" />
                            </div>
                        </div>
                        
                        {employee && (
                            <Link href={`/dashboard/employees/${employee.id}`} className="flex-1 min-w-0">
                                <div className="space-y-1">
                                    <p className="font-bold text-slate-800 truncate hover:text-amber-700 transition-colors">{data.name}</p>
                                    <p className="font-mono text-[11px] text-slate-500 bg-white/60 px-2 py-0.5 rounded-md inline-block">{employee.employeeCode}</p>
                                </div>
                            </Link>
                        )}
                    </div>

                    {/* Lifecycle Badge */}
                    {lifecycle && (
                        <div className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            lifecycle.bg, lifecycle.text
                        )}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {lifecycle.label}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="pt-3 border-t border-amber-200/50 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                            Томилогдоогүй
                        </span>
                        <div className="flex items-center gap-1 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] font-semibold">Чирэх</span>
                            <ArrowLeft className="h-3 w-3 rotate-180" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
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
    const [isAppointDialogOpen, setIsAppointDialogOpen] = useState(false);
    const [selectedPosition, setSelectedPosition] = useState<JobPosition | null>(null);
    const [isUnassignedDialogOpen, setIsUnassignedDialogOpen] = React.useState(false);
    const [selectedEmployeeForAppointment, setSelectedEmployeeForAppointment] = React.useState<Employee | null>(null);

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

    // Onboarding processes query
    const onboardingQuery = useMemoFirebase(() =>
        firestore ? query(collection(firestore, 'onboarding_processes'), where('status', '==', 'IN_PROGRESS')) : null
        , [firestore]);
    const { data: onboardingProcesses } = useCollection<any>(onboardingQuery as any);

    // Offboarding processes query
    const offboardingQuery = useMemoFirebase(() =>
        firestore ? query(collection(firestore, 'offboarding_processes'), where('status', '==', 'IN_PROGRESS')) : null
        , [firestore]);
    const { data: offboardingProcesses } = useCollection<any>(offboardingQuery as any);


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


    const { nodePositions, saveLayout, resetLayout } = useLayout(positions);

    // Critical loading states for the organization chart
    const isCriticalLoading = isLoadingDepts || isLoadingPos || isLoadingEmp || isLoadingProfile;
    // Secondary loading states for statistics
    const isStatsLoading = isLoadingSchedules || isLoadingLevels || isLoadingEmpTypes || isLoadingJobCategories || isLoadingAttendance || isLoadingTimeOff || isLoadingPosts;

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



    // New hires (last 30 days)
    const newHiresStats = useMemo(() => {
        if (!employees) return { count: 0 };

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const newHires = employees.filter(emp => {
            if (!emp.hireDate) return false;
            const hireDate = new Date(emp.hireDate);
            return hireDate >= thirtyDaysAgo && emp.status === 'Идэвхтэй';
        });

        return { count: newHires.length };
    }, [employees]);

    // Offboarding stats
    const offboardingStats = useMemo(() => {
        if (!offboardingProcesses || !employees) return { count: 0, ongoing: [] };

        const empMap = new Map((employees as Employee[]).map(e => [e.id, e]));
        const ongoing = offboardingProcesses.map((process: any) => {
            const emp = empMap.get(process.employeeId || process.id);
            return {
                ...process,
                employee: emp
            };
        }).filter((p: any) => p.employee);

        return {
            count: ongoing.length,
            ongoing
        };
    }, [offboardingProcesses, employees]);


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




        const newNodes: CustomNode[] = [];
        const newEdges: Edge[] = [];

        // Filter positions to only show approved ones on the dashboard chart
        const approvedPositions = positions.filter(pos => pos.isApproved !== false);

        approvedPositions.forEach(pos => {
            const assignedEmployees = posToEmployeeMap.get(pos.id) || [];
            const department = deptMap.get(pos.departmentId);
            const employee = assignedEmployees[0];



            const node: Node<JobPositionNodeData> = {
                id: pos.id,
                type: 'position',
                position: nodePositions[pos.id] || { x: 0, y: 0 },
                data: {
                    id: pos.id,
                    label: pos.title,
                    title: pos.title,
                    department: department?.name || 'Unknown',
                    departmentColor: department?.color,
                    filled: posToEmployeeMap.get(pos.id)?.length || 0,
                    employees: assignedEmployees,
                    workScheduleName: pos.workScheduleId ? workScheduleMap.get(pos.workScheduleId) : undefined,
                    attendanceStatus: employee ? employeeAttendanceStatus.get(employee.id) : undefined,
                },
            };
            newNodes.push(node);

            if (pos.reportsTo && approvedPositions.some(p => p.id === pos.reportsTo)) {
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
            setSelectedEmployeeForAppointment((employeeNode.data as any).employee);
            setIsAppointDialogOpen(true);
        },
        [nodes, toast]
    );

    const inactiveEmployeesCount = (employees || []).filter(e => e.status !== 'Идэвхтэй').length;

    return (
        <div className="flex flex-col h-full">
            {/* Stats Bar - 20% height, horizontal scroll */}
            <div className="h-[20vh] min-h-[160px] border-b bg-slate-50 dark:bg-slate-950">
                <div className="h-full overflow-x-auto overflow-y-hidden px-4 sm:px-6 py-4 scrollbar-hide">
                    <div className="flex gap-4 sm:gap-6 h-full min-w-max">
                        {/* 1. Ажилчид - Statistics */}
                        <Link href="/dashboard/employees" className="flex-shrink-0">
                            <Card className="h-full w-[280px] sm:w-[320px] bg-slate-900 dark:bg-slate-800 border-slate-700 hover:bg-slate-800 dark:hover:bg-slate-700 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                                <CardContent className="p-4 sm:p-5 h-full flex flex-col justify-between">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ажилчид</div>
                                        <Users className="h-5 w-5 text-slate-500" />
                                    </div>
                                    {isLoadingEmp ? (
                                        <Skeleton className="h-20 w-full bg-slate-700" />
                                    ) : (
                                        <div className="space-y-3">
                                            {/* Total Active */}
                                            <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                                                <div>
                                                    <div className="text-3xl font-semibold text-white">{activeEmployeesCount}</div>
                                                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Нийт идэвхтэй</div>
                                                </div>
                                                <div className="h-10 w-px bg-slate-700" />
                                            </div>
                                            
                                            {/* Onboarding & Offboarding */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <div className="text-2xl font-semibold text-emerald-400">{onboardingProcesses?.length || 0}</div>
                                                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Onboarding</div>
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-semibold text-amber-400">{offboardingProcesses?.length || 0}</div>
                                                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Offboarding</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>

                        {/* 2. Бүтэц - Organization Structure */}
                        <Link href="/dashboard/organization" className="flex-shrink-0">
                            <Card className="h-full w-[280px] sm:w-[320px] bg-slate-900 dark:bg-slate-800 border-slate-700 hover:bg-slate-800 dark:hover:bg-slate-700 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                                <CardContent className="p-4 sm:p-5 h-full flex flex-col justify-between">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Бүтэц</div>
                                        <Network className="h-5 w-5 text-slate-500" />
                                    </div>
                                    {isLoadingDepts || isLoadingPos ? (
                                        <Skeleton className="h-20 w-full bg-slate-700" />
                                    ) : (
                                        <div className="space-y-3">
                                            {/* Departments & Positions */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <div className="text-2xl font-semibold text-indigo-400">{departments?.length || 0}</div>
                                                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Нэгж</div>
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-semibold text-purple-400">{positions?.length || 0}</div>
                                                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Ажлын байр</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>

                        {/* 3. Attendance */}
                        <Link href="/dashboard/attendance" className="flex-shrink-0">
                            <Card className="h-full w-[280px] sm:w-[320px] bg-slate-900 dark:bg-slate-800 border-slate-700 hover:bg-slate-800 dark:hover:bg-slate-700 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                                <CardContent className="p-4 sm:p-5 h-full flex flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Өнөөдрийн ирц</div>
                                        <UserCheck className="h-5 w-5 text-slate-500" />
                                    </div>
                                    {isLoadingAttendance || isLoadingTimeOff ? (
                                        <Skeleton className="h-10 w-32 bg-slate-700" />
                                    ) : (
                                        <div className="flex items-end gap-6">
                                            <div>
                                                <div className="text-3xl font-semibold text-white">{presentEmployees.size}</div>
                                                <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wide">Ажил дээрээ</div>
                                            </div>
                                            <div className="h-12 w-px bg-slate-700" />
                                            <div>
                                                <div className="text-3xl font-semibold text-white">{onLeaveEmployees.size}</div>
                                                <div className="text-[10px] text-blue-400 font-semibold uppercase tracking-wide">Чөлөөтэй</div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>

                        {/* 3. Vacation (New) */}
                        <Link href="/dashboard/vacation" className="flex-shrink-0">
                            <Card className="h-full w-[280px] sm:w-[320px] bg-slate-900 dark:bg-slate-800 border-slate-700 hover:bg-slate-800 dark:hover:bg-slate-700 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                                <CardContent className="p-4 sm:p-5 h-full flex flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ээлжийн амралт</div>
                                        <Palmtree className="h-5 w-5 text-slate-500" />
                                    </div>
                                    {isLoadingTimeOff ? (
                                        <Skeleton className="h-10 w-16 bg-slate-700" />
                                    ) : (
                                        <div>
                                            <div className="text-4xl font-semibold text-amber-500 mb-1">{onLeaveCount}</div>
                                            <div className="text-xs text-slate-400 font-medium">ажилтан амарч байна</div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>

                        {/* 3. Posts */}
                        <Link href="/dashboard/posts" className="flex-shrink-0">
                            <Card className="h-full w-[280px] sm:w-[320px] bg-slate-900 dark:bg-slate-800 border-slate-700 hover:bg-slate-800 dark:hover:bg-slate-700 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                                <CardContent className="p-4 sm:p-5 h-full flex flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Мэдээлэл</div>
                                        <Newspaper className="h-5 w-5 text-slate-500" />
                                    </div>
                                    {isLoadingPosts ? (
                                        <Skeleton className="h-10 w-16 bg-slate-700" />
                                    ) : (
                                        <div>
                                            <div className="text-4xl font-semibold text-white mb-1">{posts?.length || 0}</div>
                                            <div className="text-xs text-slate-400 font-medium">нийтлэл</div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>

                        {/* 4c. Recruitment & Selection (New) */}
                        <Link href="/dashboard/recruitment" className="flex-shrink-0">
                            <Card className="h-full w-[280px] sm:w-[320px] bg-slate-900 border-slate-700 hover:bg-slate-800 transition-all duration-300 group overflow-hidden">
                                <CardContent className="p-4 sm:p-5 h-full flex flex-col justify-between relative overflow-hidden">
                                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all" />

                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Бүрдүүлэлт</div>
                                        <Handshake className="h-5 w-5 text-blue-400 group-hover:scale-110 transition-transform" />
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <div className="text-2xl font-bold text-white">Сонгон шалгаруулалт</div>
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Recruitment & Selection</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>


                        {/* 5. Point Module */}
                        <Link href="/dashboard/points" className="flex-shrink-0">
                            <Card className="h-full w-[200px] sm:w-[240px] bg-slate-900 dark:bg-slate-800 border-slate-700 hover:bg-slate-800 dark:hover:bg-slate-700 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group">
                                <CardContent className="p-4 sm:p-5 h-full flex flex-col justify-between relative overflow-hidden">
                                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full blur-2xl group-hover:from-yellow-500/30 transition-all" />

                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Пойнт Модул</div>
                                        <Sparkles className="h-5 w-5 text-yellow-500" />
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <div className="text-3xl font-semibold text-white">Points</div>
                                            <Rocket className="w-5 h-5 text-orange-400" />
                                        </div>
                                        <div className="text-xs text-slate-400 font-medium">Recognition System</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>

                        {/* 8. Process Management (New) */}
                        <Link href="/dashboard/employment-relations" className="flex-shrink-0">
                            <Card className="h-full w-[200px] sm:w-[240px] bg-slate-900 dark:bg-slate-800 border-slate-700 hover:bg-slate-800 dark:hover:bg-slate-700 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group">
                                <CardContent className="p-4 sm:p-5 h-full flex flex-col justify-between relative overflow-hidden">
                                    <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-3xl group-hover:from-blue-500/20 group-hover:to-indigo-500/20 transition-all" />

                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Employment Relations</div>
                                        <Handshake className="h-5 w-5 text-blue-500 group-hover:scale-110 transition-transform" />
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <div className="text-2xl font-semibold text-white">Хөдөлмөрийн харилцаа</div>
                                        </div>
                                        <div className="text-xs text-slate-400 font-medium">Гэрээ, протокол, баримт</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>

                        {/* 9. Process Management */}
                        <Link href="/dashboard/process" className="flex-shrink-0">
                            <Card className="h-full w-[200px] sm:w-[240px] bg-slate-900 dark:bg-slate-800 border-slate-700 hover:bg-slate-800 dark:hover:bg-slate-700 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group">
                                <CardContent className="p-4 sm:p-5 h-full flex flex-col justify-between relative overflow-hidden">
                                    <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-full blur-3xl group-hover:from-pink-500/20 group-hover:to-rose-500/20 transition-all" />

                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Process Management</div>
                                        <Handshake className="h-5 w-5 text-pink-500 group-hover:scale-110 transition-transform" />
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <div className="text-2xl font-semibold text-white">Процесс</div>
                                        </div>
                                        <div className="text-xs text-slate-400 font-medium">Шат дамжлага, урсгал</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>

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
                    <Button asChild size="icon" variant="outline" className="rounded-full h-12 w-12 shadow-lg bg-green-500/10 border-green-500/30 hover:bg-green-500/20">
                        <Link href="/dashboard/calendar">
                            <Calendar className="h-6 w-6 text-green-500" />
                            <span className="sr-only">Календар</span>
                        </Link>
                    </Button>
                    <Button asChild size="icon" className="rounded-full h-12 w-12 shadow-lg">
                        <Link href="/dashboard/employees/add">
                            <User className="h-6 w-6" />
                            <span className="sr-only">Ажилтан нэмэх</span>
                        </Link>
                    </Button>
                </div>
            </div>
            <UnassignedEmployeesDialog
                open={isUnassignedDialogOpen}
                onOpenChange={setIsUnassignedDialogOpen}
                employees={employees?.filter(e => !e.positionId && e.status === 'Идэвхтэй') || []}
                onAssign={(emp) => {
                    setSelectedEmployeeForAppointment(emp);
                    setIsAppointDialogOpen(true);
                    setIsUnassignedDialogOpen(false);
                }}
            />
            <AppointEmployeeDialog
                open={isAppointDialogOpen}
                onOpenChange={(open) => {
                    setIsAppointDialogOpen(open);
                    if (!open) setSelectedEmployeeForAppointment(null);
                }}
                position={selectedPosition}
                initialEmployee={selectedEmployeeForAppointment}
            />
        </div >
    );
};

export default OrganizationChart;
