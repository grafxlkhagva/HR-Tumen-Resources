'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Settings, Users, Pencil, Trash2, ChevronRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
  useCollection,
  useFirebase,
  useMemoFirebase,
  deleteDocumentNonBlocking,
  useDoc,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { AddTypeDialog } from './add-type-dialog';
import { AddDepartmentDialog } from './add-department-dialog';
import { AddPositionDialog } from './add-position-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Employee } from '../employees/data';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';


// Interfaces for Firestore data
type Department = {
  id: string;
  name: string;
  typeId?: string;
  parentId?: string;
  // Locally computed properties
  children?: Department[];
  approved: number; 
  filled: number;
  typeName?: string;
  positions: Position[];
};

type DepartmentType = {
  id: string;
  name: string;
};

type Position = {
  id: string;
  title: string;
  departmentId: string;
  headcount: number;
  filled: number;
  levelId?: string;
  employmentTypeId?: string;
  jobCategoryId?: string;
  isActive?: boolean;
};

type PositionLevel = {
  id: string;
  name: string;
};

type EmploymentType = {
  id: string;
  name: string;
};

type JobCategory = {
  id: string;
  name: string;
  code: string;
}

type CompanyProfile = {
  name: string;
  legalName?: string;
}


const OrgChartNode = ({ node }: { node: Department }) => {
    return (
      <li className="relative flex flex-col items-center">
        {/* Connector line to parent */}
        <div className="absolute bottom-full left-1/2 h-8 w-px -translate-x-1/2 bg-border"></div>
    
        <div className="relative z-10 w-56 rounded-lg border bg-card p-4 text-center text-card-foreground shadow-sm">
          <p className="font-semibold">{node.name}</p>
          <p className="text-sm text-muted-foreground">{node.typeName || 'Тодорхойгүй'}</p>
          <div className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{node.approved || 0}</span>
          </div>
        </div>
        
        {node.children && node.children.length > 0 && (
          <ul className="relative mt-8 flex justify-center gap-8">
            {/* Horizontal line connecting children */}
            <li className="absolute top-0 h-px w-full -translate-y-8 bg-border" style={{
                left: node.children.length > 1 ? `calc(50% - (100% * ${node.children.length - 1} / ${node.children.length}) / 2)` : '50%',
                right: node.children.length > 1 ? `calc(50% - (100% * ${node.children.length - 1} / ${node.children.length}) / 2)` : '50%'
            }}></li>
            {node.children.map((child) => (
                <OrgChartNode key={child.id} node={child} />
            ))}
          </ul>
        )}
      </li>
    );
};
  
const RootOrgChartNode = ({ node }: { node: Department }) => (
    <li className="relative flex flex-col items-center">
    <div className="relative z-10 w-56 rounded-lg border bg-card p-4 text-center text-card-foreground shadow-sm">
        <p className="font-semibold">{node.name}</p>
        <p className="text-sm text-muted-foreground">{node.typeName || 'Тодорхойгүй'}</p>
        <div className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>{node.approved || 0}</span>
        </div>
    </div>
    {node.children && node.children.length > 0 && (
        <>
        {/* Vertical line from root */}
        <div className="absolute top-full left-1/2 h-8 w-px -translate-x-1/2 bg-border"></div>

        <ul className="relative mt-8 flex justify-center gap-8">
            {/* Horizontal line for children */}
            <li className="absolute top-0 h-px w-full -translate-y-8 bg-border" style={{
                left: node.children.length > 1 ? `calc(50% / ${node.children.length})` : '50%',
                right: node.children.length > 1 ? `calc(50% / ${node.children.length})` : '50%'
            }}></li>
            {node.children.map((child) => (
                <OrgChartNode key={child.id} node={child} />
            ))}
        </ul>
        </>
    )}
    </li>
);
  


const StructureTab = () => {
  const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  
  const { firestore } = useFirebase();

  const deptsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departments') : null), [firestore]);
  const deptTypesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departmentTypes') : null), [firestore]);
  const companyProfileQuery = useMemoFirebase(() => (firestore ? doc(firestore, 'company', 'profile') : null), [firestore]);
  
  const positionsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'positions') : null, [firestore]);
  
  const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(deptsQuery);
  const { data: departmentTypes, isLoading: isLoadingTypes } = useCollection<DepartmentType>(deptTypesQuery);
  const { data: positions, isLoading: isLoadingPos } = useCollection<Position>(positionsQuery);
  const { data: companyProfile, isLoading: isLoadingProfile } = useDoc<CompanyProfile>(companyProfileQuery);

  const { orgTree, totalHeadcount, deptsWithData } = useMemo(() => {
    if (!departments || !departmentTypes || !positions) {
      return { orgTree: [], totalHeadcount: 0, deptsWithData: [] };
    }

    const typeMap = new Map(departmentTypes.map(t => [t.id, t.name]));
    
    const positionCountByDept = positions.reduce((acc, pos) => {
        if (!pos.departmentId || !pos.isActive) return acc;
        const currentCount = acc.get(pos.departmentId) || 0;
        acc.set(pos.departmentId, currentCount + pos.headcount);
        return acc;
    }, new Map<string, number>());
    
    const deptsWithData: Department[] = departments.map(d => ({
      ...d,
      positions: [],
      typeName: typeMap.get(d.typeId || ''),
      approved: positionCountByDept.get(d.id) || 0,
      filled: 0, // Will be calculated later
      children: [],
    }));

    const deptMap = new Map(deptsWithData.map(d => [d.id, d]));
    const rootNodes: Department[] = [];

    deptsWithData.forEach(dept => {
      if (dept.parentId && deptMap.has(dept.parentId)) {
        const parent = deptMap.get(dept.parentId);
        if (parent) {
            if (!parent.children) {
                parent.children = [];
            }
            parent.children.push(dept);
        }
      } else {
        rootNodes.push(dept);
      }
    });

    const totalCount = Array.from(positionCountByDept.values()).reduce((sum, count) => sum + count, 0);

    return { orgTree: rootNodes, totalHeadcount: totalCount, deptsWithData: deptsWithData };
  }, [departments, departmentTypes, positions]);
  
  const departmentNameMap = useMemo(() => {
      if (!departments) return new Map();
      return new Map(departments.map(d => [d.id, d.name]));
  }, [departments]);

  const isLoading = isLoadingDepts || isLoadingTypes || isLoadingPos || isLoadingProfile;

  const handleOpenAddDialog = () => {
    setEditingDepartment(null);
    setIsDeptDialogOpen(true);
  }

  const handleOpenEditDialog = (dept: Department) => {
    setEditingDepartment(dept);
    setIsDeptDialogOpen(true);
  }
  
  const handleDeleteDepartment = (deptId: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'departments', deptId);
    deleteDocumentNonBlocking(docRef);
  }


  return (
    <div className="space-y-8">
      <AddTypeDialog 
        open={isAddTypeOpen} 
        onOpenChange={setIsAddTypeOpen} 
      />
      <AddDepartmentDialog 
        open={isDeptDialogOpen}
        onOpenChange={setIsDeptDialogOpen}
        departments={departments || []}
        departmentTypes={departmentTypes || []}
        editingDepartment={editingDepartment}
      />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{companyProfile?.legalName || 'Байгууллагын бүтэц'} ({isLoading ? <Skeleton className="h-6 w-8 inline-block"/> : totalHeadcount})</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddTypeOpen(true)}
              >
                <Settings className="mr-2 h-4 w-4" />
                Төрөл удирдах
              </Button>
              <Button variant="default" size="sm" onClick={handleOpenAddDialog}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Нэгж нэмэх
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-8">
            {isLoading && (
                 <div className="flex flex-col items-center">
                    <Skeleton className="h-24 w-56"/>
                    <div className="w-px h-8 mt-1 bg-border"/>
                    <div className="flex gap-8 mt-8">
                         <Skeleton className="h-24 w-56"/>
                         <Skeleton className="h-24 w-56"/>
                    </div>
                </div>
            )}
            {!isLoading && orgTree.length > 0 && (
                <ul className="flex justify-center">
                  {orgTree.map(rootNode => <RootOrgChartNode key={rootNode.id} node={rootNode} />)}
                </ul>
            )}
            {!isLoading && orgTree.length === 0 && (
                <div className="text-center py-10">
                    <p className="text-muted-foreground">Байгууллагын бүтэц үүсээгүй байна.</p>
                    <Button className="mt-4" onClick={handleOpenAddDialog}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Анхны нэгжийг нэмэх
                    </Button>
                </div>
            )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
            <CardTitle>Бүх нэгжийн жагсаалт</CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Нэгжийн нэр</TableHead>
                        <TableHead>Төрөл</TableHead>
                        <TableHead>Харьяалагдах дээд нэгж</TableHead>
                        <TableHead className="text-right">Ажилтны тоо</TableHead>
                        <TableHead className="w-[100px] text-right">Үйлдэл</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                     {isLoading && Array.from({length: 3}).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-5 w-10 ml-auto" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                        </TableRow>
                     ))}
                     {!isLoading && deptsWithData.map((dept) => (
                        <TableRow key={dept.id}>
                            <TableCell className="font-medium">{dept.name}</TableCell>
                            <TableCell>{dept.typeName || 'Тодорхойгүй'}</TableCell>
                            <TableCell>{dept.parentId ? departmentNameMap.get(dept.parentId) : '-'}</TableCell>
                            <TableCell className="text-right">{dept.approved}</TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreHorizontal className="h-4 w-4" />
                                            <span className="sr-only">Үйлдлүүд</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleOpenEditDialog(dept)}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Засах
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDeleteDepartment(dept.id)} className="text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Устгах
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                     ))}
                     {!isLoading && deptsWithData.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                Бүртгэгдсэн нэгж байхгүй.
                            </TableCell>
                        </TableRow>
                     )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
};


const PositionsTab = () => {
    const { firestore } = useFirebase();
    const [isPositionDialogOpen, setIsPositionDialogOpen] = useState(false);
    const [editingPosition, setEditingPosition] = useState<Position | null>(null);

    const positionsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'positions') : null), [firestore]);
    const departmentsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departments') : null), [firestore]);
    const levelsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'positionLevels') : null), [firestore]);
    const empTypesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'employmentTypes') : null), [firestore]);
    const jobCategoriesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'jobCategories') : null), [firestore]);

    const { data: positions, isLoading: isLoadingPos, error: errorPos } = useCollection<Position>(positionsQuery);
    const { data: departments, isLoading: isLoadingDepts, error: errorDepts } = useCollection<Department>(departmentsQuery);
    const { data: positionLevels, isLoading: isLoadingLevels } = useCollection<PositionLevel>(levelsQuery);
    const { data: employmentTypes, isLoading: isLoadingEmpTypes } = useCollection<EmploymentType>(empTypesQuery);
    const { data: jobCategories, isLoading: isLoadingJobCategories } = useCollection<JobCategory>(jobCategoriesQuery);

    const isLoading = isLoadingPos || isLoadingDepts || isLoadingLevels || isLoadingEmpTypes || isLoadingJobCategories;

    const totalHeadcount = useMemo(() => {
        if (!positions) {
            return 0;
        }
        return positions
            .filter(pos => pos.isActive)
            .reduce((sum, pos) => sum + (pos.headcount || 0), 0);
    }, [positions]);

    const lookups = React.useMemo(() => {
        const departmentMap = departments?.reduce((acc, dept) => { acc[dept.id] = dept.name; return acc; }, {} as Record<string, string>) || {};
        const levelMap = positionLevels?.reduce((acc, level) => { acc[level.id] = level.name; return acc; }, {} as Record<string, string>) || {};
        const empTypeMap = employmentTypes?.reduce((acc, type) => { acc[type.id] = type.name; return acc; }, {} as Record<string, string>) || {};
        const jobCategoryMap = jobCategories?.reduce((acc, cat) => { acc[cat.id] = `${cat.code} - ${cat.name}`; return acc; }, {} as Record<string, string>) || {};
        return { departmentMap, levelMap, empTypeMap, jobCategoryMap };
    }, [departments, positionLevels, employmentTypes, jobCategories]);
    
    const handleOpenAddDialog = () => {
        setEditingPosition(null);
        setIsPositionDialogOpen(true);
    };

    const handleOpenEditDialog = (pos: Position) => {
        setEditingPosition(pos);
        setIsPositionDialogOpen(true);
    };
    
    const handleDeletePosition = (posId: string) => {
        if (!firestore) return;
        const docRef = doc(firestore, 'positions', posId);
        deleteDocumentNonBlocking(docRef);
    };


    return (
        <>
         <AddPositionDialog
            open={isPositionDialogOpen}
            onOpenChange={setIsPositionDialogOpen}
            departments={departments || []}
            positionLevels={positionLevels || []}
            employmentTypes={employmentTypes || []}
            jobCategories={jobCategories || []}
            editingPosition={editingPosition}
        />
        <Card>
        <CardHeader className="flex-row items-center justify-between">
            <div>
            <CardTitle>Ажлын байрны жагсаалт (Нийт орон тоо: {isLoading ? <Skeleton className="h-6 w-8 inline-block" /> : totalHeadcount})</CardTitle>
            <CardDescription>
                Байгууллагад бүртгэлтэй бүх албан тушаал.
            </CardDescription>
            </div>
            <Button size="sm" className="gap-1" onClick={handleOpenAddDialog}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Ажлын байр нэмэх
            </span>
            </Button>
        </CardHeader>
        <CardContent>
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Албан тушаалын нэр</TableHead>
                <TableHead>Хэлтэс</TableHead>
                <TableHead>Зэрэглэл</TableHead>
                <TableHead>Ажил эрхлэлтийн төрөл</TableHead>
                <TableHead>Төлөв</TableHead>
                <TableHead className="text-right">Орон тоо</TableHead>
                <TableHead className="w-[100px] text-right">Үйлдэл</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                    <TableCell>
                        <Skeleton className="h-5 w-48" />
                    </TableCell>
                    <TableCell>
                        <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                        <Skeleton className="h-6 w-24" />
                    </TableCell>
                    <TableCell>
                        <Skeleton className="h-6 w-24" />
                    </TableCell>
                    <TableCell>
                        <Skeleton className="h-6 w-20" />
                    </TableCell>
                    <TableCell className="text-right">
                        <Skeleton className="ml-auto h-5 w-16" />
                    </TableCell>
                    <TableCell className="text-right">
                        <Skeleton className="ml-auto h-8 w-8" />
                    </TableCell>
                    </TableRow>
                ))}
                {!isLoading && positions?.map((pos) => {
                    const isActive = pos.isActive === undefined ? true : pos.isActive;
                    return (
                        <TableRow key={pos.id}>
                            <TableCell className="font-medium">{pos.title}</TableCell>
                            <TableCell>
                            {lookups.departmentMap[pos.departmentId] || 'Тодорхойгүй'}
                            </TableCell>
                            <TableCell>
                                {pos.levelId ? <Badge variant="secondary">{lookups.levelMap[pos.levelId] || 'Тодорхойгүй'}</Badge> : '-'}
                            </TableCell>
                            <TableCell>
                                {pos.employmentTypeId ? <Badge variant="outline">{lookups.empTypeMap[pos.employmentTypeId] || 'Тодорхойгүй'}</Badge> : '-'}
                            </TableCell>
                            <TableCell>
                                <Badge variant={isActive ? 'default' : 'secondary'} className={cn(isActive && 'bg-green-100 text-green-800')}>
                                    {isActive ? 'Идэвхтэй' : 'Идэвхгүй'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                {pos.headcount}
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleOpenEditDialog(pos)}>
                                            <Pencil className="mr-2 h-4 w-4" /> Засах
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDeletePosition(pos.id)} className="text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" /> Устгах
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    )
                })}
                {!isLoading && !positions?.length && (
                    <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                            Ажлын байрны жагсаалт хоосон байна.
                        </TableCell>
                    </TableRow>
                )}
                 {(errorPos || errorDepts) && (
                    <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-destructive">
                            Мэдээлэл ачаалахад алдаа гарлаа.
                        </TableCell>
                    </TableRow>
                 )}
            </TableBody>
            </Table>
        </CardContent>
        </Card>
        </>
    );
};

const HeadcountTab = () => {
    const { firestore } = useFirebase();
    const [date, setDate] = React.useState<DateRange | undefined>({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    });
    const [selectedDeptEmployees, setSelectedDeptEmployees] = React.useState<Employee[]>([]);
    const [isEmployeeListOpen, setIsEmployeeListOpen] = React.useState(false);
    const [selectedDeptName, setSelectedDeptName] = React.useState("");
    const [openRows, setOpenRows] = useState<Set<string>>(new Set());
  
  
    const positionsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'positions') : null), [firestore]);
    const employeesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'employees') : null), [firestore]);
    const departmentsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departments') : null), [firestore]);
    
    const { data: positions, isLoading: isLoadingPos } = useCollection<Position>(positionsQuery);
    const { data: employees, isLoading: isLoadingEmp } = useCollection<Employee>(employeesQuery);
    const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(departmentsQuery);
  
    const { departmentsWithHeadcount, totalApproved, totalFilled, totalVacancy } = React.useMemo(() => {
        if (!positions || !employees || !departments) {
            return { departmentsWithHeadcount: [], totalApproved: 0, totalFilled: 0, totalVacancy: 0 };
        }
    
        const startDate = date?.from;
        const endDate = date?.to;
    
        const employeeCountByPosition = employees.reduce((acc, emp) => {
            if (!emp.positionId) return acc;
            const hireDate = new Date(emp.hireDate);
            const termDate = emp.terminationDate ? new Date(emp.terminationDate) : null;
    
            const isActiveInPeriod =
                (!startDate || hireDate <= endDate!) &&
                (!endDate || !termDate || termDate >= startDate!);
    
            if (isActiveInPeriod) {
                acc.set(emp.positionId, (acc.get(emp.positionId) || 0) + 1);
            }
            return acc;
        }, new Map<string, number>());
    
        const departmentsData = departments.map(d => {
            const deptPositions = positions
                .filter(p => p.departmentId === d.id)
                .map(p => ({
                    ...p,
                    filled: employeeCountByPosition.get(p.id) || 0,
                }));
    
            const approved = deptPositions.reduce((sum, p) => sum + p.headcount, 0);
            const filled = deptPositions.reduce((sum, p) => sum + p.filled, 0);
    
            return {
                ...d,
                approved,
                filled,
                positions: deptPositions,
            };
        });
    
        const totalApproved = departmentsData.reduce((sum, dept) => sum + (dept.approved || 0), 0);
        const totalFilled = departmentsData.reduce((sum, dept) => sum + (dept.filled || 0), 0);
    
        return { 
            departmentsWithHeadcount: departmentsData,
            totalApproved,
            totalFilled,
            totalVacancy: totalApproved - totalFilled,
        };
    }, [positions, employees, departments, date]);
    
    const handleShowEmployees = (departmentId: string) => {
      const dept = departments?.find(d => d.id === departmentId);
      if (!dept || !employees) return;
  
      const startDate = date?.from;
      const endDate = date?.to;
  
      const filteredEmployees = employees.filter(emp => {
          if (emp.departmentId !== departmentId) return false;
          
          const hireDate = new Date(emp.hireDate);
          const termDate = emp.terminationDate ? new Date(emp.terminationDate) : null;
        
          const isActiveInPeriod = 
              (!startDate || hireDate <= endDate!) && 
              (!endDate || !termDate || termDate >= startDate!);
              
          return isActiveInPeriod;
      });
  
      setSelectedDeptEmployees(filteredEmployees);
      setSelectedDeptName(dept.name);
      setIsEmployeeListOpen(true);
    };

    const toggleRow = (id: string) => {
        setOpenRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };
  
    const isLoading = isLoadingPos || isLoadingEmp || isLoadingDepts;
  
    return (
      <div className="space-y-6">
          <Dialog open={isEmployeeListOpen} onOpenChange={setIsEmployeeListOpen}>
              <DialogContent className="max-w-2xl">
                  <DialogHeader>
                      <DialogTitle>{selectedDeptName} хэлтсийн ажилтнууд</DialogTitle>
                      <DialogDescription>
                          {date?.from && date.to && `${format(date.from, "yyyy/MM/dd")} - ${format(date.to, "yyyy/MM/dd")} хооронд ажиллаж байсан.`}
                      </DialogDescription>
                  </DialogHeader>
                  <div className="max-h-[60vh] overflow-y-auto">
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Ажилтан</TableHead>
                                  <TableHead>Албан тушаал</TableHead>
                                  <TableHead>Ажилд орсон</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {selectedDeptEmployees.map(emp => (
                                  <TableRow key={emp.id}>
                                      <TableCell>
                                          <div className="flex items-center gap-3">
                                              <Avatar className="h-9 w-9">
                                                  <AvatarImage src={emp.photoURL} />
                                                  <AvatarFallback>{emp.firstName.charAt(0)}</AvatarFallback>
                                              </Avatar>
                                              <div className="font-medium">{emp.firstName} {emp.lastName}</div>
                                          </div>
                                      </TableCell>
                                      <TableCell>{emp.jobTitle}</TableCell>
                                      <TableCell>{format(new Date(emp.hireDate), 'yyyy-MM-dd')}</TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  </div>
              </DialogContent>
          </Dialog>
          <Card>
              <CardHeader>
                  <CardTitle>Орон тооны ерөнхий тайлан</CardTitle>
                  <div className="flex justify-end gap-2">
                      <Popover>
                          <PopoverTrigger asChild>
                              <Button
                              id="date"
                              variant={"outline"}
                              className={cn("w-[300px] justify-start text-left font-normal", !date && "text-muted-foreground")}
                              >
                              <ChevronRight className="mr-2 h-4 w-4" />
                              {date?.from ? (
                                  date.to ? (
                                  <>
                                      {format(date.from, "yyyy/MM/dd")} -{" "}
                                      {format(date.to, "yyyy/MM/dd")}
                                  </>
                                  ) : (
                                  format(date.from, "yyyy/MM/dd")
                                  )
                              ) : (
                                  <span>Огноо сонгох</span>
                              )}
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                              <Calendar
                              initialFocus
                              mode="range"
                              defaultMonth={date?.from}
                              selected={date}
                              onSelect={setDate}
                              numberOfMonths={2}
                              />
                          </PopoverContent>
                      </Popover>
                  </div>
              </CardHeader>
              <CardContent>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                      <Card>
                          <CardHeader>
                          <CardTitle>Батлагдсан орон тоо</CardTitle>
                          </CardHeader>
                          <CardContent>
                          {isLoading ? <Skeleton className="h-10 w-20" /> : <div className="text-4xl font-bold">{totalApproved}</div>}
                          </CardContent>
                      </Card>
                      <Card>
                          <CardHeader>
                          <CardTitle>Ажиллаж буй</CardTitle>
                          </CardHeader>
                          <CardContent>
                          {isLoading ? <Skeleton className="h-10 w-20" /> : <div className="text-4xl font-bold">{totalFilled}</div>}
                          </CardContent>
                      </Card>
                      <Card>
                          <CardHeader>
                          <CardTitle>Сул орон тоо</CardTitle>
                          </CardHeader>
                          <CardContent>
                          {isLoading ? <Skeleton className="h-10 w-20" /> : <div className="text-4xl font-bold text-primary">{totalVacancy}</div>}
                          </CardContent>
                      </Card>
                  </div>
              </CardContent>
          </Card>
  
          <Card>
              <CardHeader>
                  <CardTitle>Орон тооны дэлгэрэнгүй тайлан</CardTitle>
              </CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead className="w-[250px]">Хэлтэс/Ажлын байр</TableHead>
                              <TableHead className="text-right">Батлагдсан орон тоо</TableHead>
                              <TableHead className="text-right">Ажиллаж буй</TableHead>
                              <TableHead className="text-right">Сул орон тоо</TableHead>
                              <TableHead className="w-[200px]">Гүйцэтгэл</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {isLoading && Array.from({length: 4}).map((_, i) => (
                              <TableRow key={i}>
                                  <TableCell><Skeleton className="h-5 w-32"/></TableCell>
                                  <TableCell className="text-right"><Skeleton className="h-5 w-10 ml-auto"/></TableCell>
                                  <TableCell className="text-right"><Skeleton className="h-5 w-10 ml-auto"/></TableCell>
                                  <TableCell className="text-right"><Skeleton className="h-5 w-10 ml-auto"/></TableCell>
                                  <TableCell><Skeleton className="h-4 w-full"/></TableCell>
                              </TableRow>
                          ))}
                          {!isLoading && departmentsWithHeadcount.map(dept => (
                                <React.Fragment key={dept.id}>
                                    <TableRow
                                        className="bg-muted/50 hover:bg-muted font-semibold cursor-pointer"
                                        onClick={() => toggleRow(dept.id)}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-2 w-full">
                                                <ChevronRight className={cn("h-4 w-4 transition-transform", openRows.has(dept.id) && "rotate-90")} />
                                                {dept.name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">{dept.approved}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="link" className="p-0 h-auto" onClick={(e) => { e.stopPropagation(); handleShowEmployees(dept.id); }}>{dept.filled}</Button>
                                        </TableCell>
                                        <TableCell className="text-right text-primary">{(dept.approved || 0) - (dept.filled || 0)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Progress value={(dept.approved || 0) > 0 ? ((dept.filled || 0) / (dept.approved || 0)) * 100 : 0} className="h-2" />
                                                <span className="text-xs text-muted-foreground">{Math.round((dept.approved || 0) > 0 ? ((dept.filled || 0) / (dept.approved || 0)) * 100 : 0)}%</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    {openRows.has(dept.id) && dept.positions.map((pos) => {
                                        const posProgress = pos.headcount > 0 ? (pos.filled / pos.headcount) * 100 : 0;
                                        return (
                                        <TableRow key={pos.id} className="text-sm bg-background hover:bg-muted/30">
                                            <TableCell className="pl-12">{pos.title}</TableCell>
                                            <TableCell className="text-right">{pos.headcount}</TableCell>
                                            <TableCell className="text-right">{pos.filled}</TableCell>
                                            <TableCell className="text-right text-primary">{pos.headcount - pos.filled}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Progress value={posProgress} className="h-2 bg-slate-200" />
                                                    <span className="text-xs text-muted-foreground">{Math.round(posProgress)}%</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        )
                                    })}
                                </React.Fragment>
                            ))}
                           {!isLoading && departmentsWithHeadcount.length === 0 && (
                              <TableRow>
                                  <TableCell colSpan={5} className="h-24 text-center">
                                      Мэдээлэл байхгүй.
                                  </TableCell>
                              </TableRow>
                          )}
                      </TableBody>
                       <TableFooter>
                          <TableRow>
                              <TableCell className="font-bold">Нийт</TableCell>
                              <TableCell className="text-right font-bold">{totalApproved}</TableCell>
                              <TableCell className="text-right font-bold">{totalFilled}</TableCell>
                              <TableCell className="text-right font-bold text-primary">{totalVacancy}</TableCell>
                              <TableCell>
                                  <div className="flex items-center gap-2">
                                      <Progress value={totalApproved > 0 ? (totalFilled / totalApproved) * 100 : 0} className="h-2" />
                                      <span className="text-xs text-muted-foreground">{totalApproved > 0 ? Math.round((totalFilled / totalApproved) * 100) : 0}%</span>
                                  </div>
                              </TableCell>
                          </TableRow>
                      </TableFooter>
                  </Table>
              </CardContent>
          </Card>
      </div>
    );
  };

export default function OrganizationPage() {
  return (
    <div className="py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Бүтэц, орон тоо
        </h1>
      </div>

      <Tabs defaultValue="structure" className="space-y-4">
        <TabsList>
          <TabsTrigger value="structure">Бүтэц</TabsTrigger>
          <TabsTrigger value="positions">Ажлын байр</TabsTrigger>
          <TabsTrigger value="headcount">Орон тоо</TabsTrigger>
        </TabsList>
        <TabsContent value="structure">
          <StructureTab />
        </TabsContent>
        <TabsContent value="positions">
          <PositionsTab />
        </TabsContent>
        <TabsContent value="headcount">
          <HeadcountTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
