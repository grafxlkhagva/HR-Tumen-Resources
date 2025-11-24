'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Settings, Users, Pencil, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useCollection,
  useFirebase,
  useMemoFirebase,
  deleteDocumentNonBlocking
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { AddTypeDialog } from './add-type-dialog';
import { AddDepartmentDialog } from './add-department-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Interfaces for Firestore data
type Department = {
  id: string;
  name: string;
  typeId?: string;
  parentId?: string;
  // Locally computed properties
  children?: Department[];
  headcount?: number;
  typeName?: string;
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
};

const OrgChartNode = ({ node }: { node: Department }) => (
  <li className="relative flex flex-col items-center">
    {/* The card for the current node */}
    <div className="relative z-10 w-56 rounded-lg border bg-card p-4 text-center text-card-foreground shadow-sm">
      <p className="font-semibold">{node.name}</p>
      <p className="text-sm text-muted-foreground">{node.typeName || 'Тодорхойгүй'}</p>
      <div className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>{node.headcount || 0}</span>
      </div>
    </div>
    
    {/* Render children if they exist */}
    {node.children && node.children.length > 0 && (
      <ul className="mt-12 flex justify-center gap-8">
        {/* Vertical line from parent to the horizontal connector */}
        <div className="absolute top-full h-12 w-px bg-border"></div>
        {/* Horizontal line connecting all children */}
        {node.children.length > 1 && (
            <div className="absolute left-1/2 top-1/2 h-px w-full -translate-y-[2.25rem] bg-border"></div>
        )}
        {node.children.map((child) => (
          <OrgChartNode key={child.id} node={child} />
        ))}
      </ul>
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
  const positionsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'positions') : null), [firestore]);
  
  const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(deptsQuery);
  const { data: departmentTypes, isLoading: isLoadingTypes } = useCollection<DepartmentType>(deptTypesQuery);
  const { data: positions, isLoading: isLoadingPos } = useCollection<Position>(positionsQuery);

  const { orgTree, totalHeadcount, deptsWithData } = useMemo(() => {
    if (!departments || !departmentTypes || !positions) {
      return { orgTree: null, totalHeadcount: 0, deptsWithData: [] };
    }

    const typeMap = new Map(departmentTypes.map(t => [t.id, t.name]));
    const positionCountByDept = positions.reduce((acc, pos) => {
      const currentCount = acc.get(pos.departmentId) || 0;
      acc.set(pos.departmentId, currentCount + pos.headcount);
      return acc;
    }, new Map<string, number>());

    const deptsWithData: Department[] = departments.map(d => ({
      ...d,
      typeName: typeMap.get(d.typeId || ''),
      headcount: positionCountByDept.get(d.id) || 0,
      children: [],
    }));

    const deptMap = new Map(deptsWithData.map(d => [d.id, d]));
    const rootNodes: Department[] = [];

    deptsWithData.forEach(dept => {
      if (dept.parentId && deptMap.has(dept.parentId)) {
        const parent = deptMap.get(dept.parentId);
        parent?.children?.push(dept);
      } else {
        rootNodes.push(dept);
      }
    });

    const totalCount = Array.from(positionCountByDept.values()).reduce((sum, count) => sum + count, 0);

    return { orgTree: rootNodes[0] || null, totalHeadcount: totalCount, deptsWithData: deptsWithData };
  }, [departments, departmentTypes, positions]);
  
  const departmentNameMap = useMemo(() => {
      if (!departments) return new Map();
      return new Map(departments.map(d => [d.id, d.name]));
  }, [departments]);

  const isLoading = isLoadingDepts || isLoadingTypes || isLoadingPos;

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
              <CardTitle>Байгууллагын бүтэц ({isLoading ? <Skeleton className="h-6 w-8 inline-block"/> : totalHeadcount})</CardTitle>
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
                Бүтэц нэмэх
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-8">
            {isLoading && (
                 <div className="flex flex-col items-center">
                    <Skeleton className="h-24 w-56"/>
                    <Skeleton className="h-8 w-px mt-1"/>
                    <div className="flex gap-8 mt-8">
                         <Skeleton className="h-24 w-56"/>
                         <Skeleton className="h-24 w-56"/>
                    </div>
                </div>
            )}
            {!isLoading && orgTree && (
              <ul className="inline-block">
                <OrgChartNode node={orgTree} />
              </ul>
            )}
            {!isLoading && !orgTree && (
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
            <CardDescription>Байгууллагын бүх бүртгэлтэй нэгжүүд.</CardDescription>
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
                            <TableCell className="text-right">{dept.headcount}</TableCell>
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
  const positionsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'positions') : null),
    [firestore]
  );
  const departmentsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'departments') : null),
    [firestore]
  );

  const { data: positions, isLoading: isLoadingPos } =
    useCollection<Position>(positionsQuery);
  const { data: departments, isLoading: isLoadingDepts } =
    useCollection<Department>(departmentsQuery);

  const isLoading = isLoadingPos || isLoadingDepts;

  const departmentMap = React.useMemo(() => {
    return (
      departments?.reduce((acc, dept) => {
        acc[dept.id] = dept.name;
        return acc;
      }, {} as Record<string, string>) || {}
    );
  }, [departments]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Ажлын байрны жагсаалт</CardTitle>
          <CardDescription>
            Байгууллагад бүртгэлтэй бүх албан тушаал.
          </CardDescription>
        </div>
        <Button size="sm" className="gap-1">
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
              <TableHead className="text-right">Орон тоо</TableHead>
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
                  <TableCell className="text-right">
                    <Skeleton className="ml-auto h-5 w-16" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && positions?.map((pos) => (
              <TableRow key={pos.id}>
                <TableCell className="font-medium">{pos.title}</TableCell>
                <TableCell>
                  {departmentMap[pos.departmentId] || 'Тодорхойгүй'}
                </TableCell>
                <TableCell className="text-right">
                  {pos.filled} / {pos.headcount}
                </TableCell>
              </TableRow>
            ))}
             {!isLoading && !positions?.length && (
                <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                        Ажлын байрны жагсаалт хоосон байна.
                    </TableCell>
                </TableRow>
             )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const HeadcountTab = () => {
  const { firestore } = useFirebase();
  const positionsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'positions') : null),
    [firestore]
  );
  const { data: positions, isLoading: isLoadingPos } =
    useCollection<Position>(positionsQuery);

  const totalHeadcount =
    positions?.reduce((acc, pos) => acc + pos.headcount, 0) || 0;
  const totalFilled = positions?.reduce((acc, pos) => acc + pos.filled, 0) || 0;
  const vacancy = totalHeadcount - totalFilled;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Нийт орон тоо</CardTitle>
          <CardDescription>Батлагдсан нийт ажлын байрны тоо.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPos ? (
            <Skeleton className="h-10 w-20" />
          ) : (
            <div className="text-4xl font-bold">{totalHeadcount}</div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Ажиллаж буй</CardTitle>
          <CardDescription>Одоогоор ажиллаж буй ажилтны тоо.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPos ? (
            <Skeleton className="h-10 w-20" />
          ) : (
            <div className="text-4xl font-bold">{totalFilled}</div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Сул орон тоо</CardTitle>
          <CardDescription>Нөхөгдөөгүй байгаа ажлын байрны тоо.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPos ? (
            <Skeleton className="h-10 w-20" />
          ) : (
            <div className="text-4xl font-bold text-primary">{vacancy}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default function OrganizationPage() {
  return (
    <div className="py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Байгууллагын удирдлага
          </h1>
          <p className="text-muted-foreground">
            Компанийн бүтэц, ажлын байр, орон тооны төлөвлөлтийг удирдах.
          </p>
        </div>
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
