'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  MoreVertical,
  PlusCircle,
  Briefcase,
  Building,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

// Interfaces for Firestore data
type Department = {
  id: string;
  name: string;
  description?: string;
};

type Position = {
  id: string;
  title: string;
  departmentId: string;
  headcount: number;
  filled: number;
};

const DepartmentCard = ({
  department,
  positions,
}: {
  department: Department;
  positions: Position[];
}) => {
  const totalHeadcount = positions.reduce(
    (acc, pos) => acc + pos.headcount,
    0
  );
  const totalFilled = positions.reduce((acc, pos) => acc + pos.filled, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Building className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>{department.name}</CardTitle>
              <CardDescription>
                {totalFilled} / {totalHeadcount} ажилтан
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Цэс</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Хэлтэс засах</DropdownMenuItem>
              <DropdownMenuItem>Албан тушаал нэмэх</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Хэлтэс устгах
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <Separator />
        <div className="space-y-3">
          {positions.map((position) => (
            <div key={position.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{position.title}</span>
              </div>
              <Badge
                variant={
                  position.filled < position.headcount ? 'secondary' : 'outline'
                }
              >
                {position.filled} / {position.headcount}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const StructureTab = () => {
    const { firestore } = useFirebase();
    const departmentsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departments') : null), [firestore]);
    const positionsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'positions') : null), [firestore]);

    const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(departmentsQuery);
    const { data: positions, isLoading: isLoadingPos } = useCollection<Position>(positionsQuery);

    const isLoading = isLoadingDepts || isLoadingPos;

    if (isLoading) {
        return (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({length: 3}).map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-lg"/>
                                <div className="space-y-2">
                                    <Skeleton className="h-6 w-32"/>
                                    <Skeleton className="h-4 w-24"/>
                                </div>
                            </div>
                             <Skeleton className="h-8 w-8"/>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-0">
                             <Separator />
                             <div className="space-y-3">
                                <Skeleton className="h-5 w-full"/>
                                <Skeleton className="h-5 w-full"/>
                             </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {departments?.map((dept) => {
                 const deptPositions = positions?.filter(p => p.departmentId === dept.id) || [];
                 return (
                     <DepartmentCard key={dept.id} department={dept} positions={deptPositions} />
                 )
            })}
         </div>
    )
}

const PositionsTab = () => {
  const { firestore } = useFirebase();
  const positionsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'positions') : null), [firestore]);
  const departmentsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departments') : null), [firestore]);

  const { data: positions, isLoading: isLoadingPos } = useCollection<Position>(positionsQuery);
  const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(departmentsQuery);

  const isLoading = isLoadingPos || isLoadingDepts;

  const departmentMap = React.useMemo(() => {
    return departments?.reduce((acc, dept) => {
      acc[dept.id] = dept.name;
      return acc;
    }, {} as Record<string, string>) || {};
  }, [departments]);
  
    return (
        <Card>
            <CardHeader className='flex-row items-center justify-between'>
                <div>
                    <CardTitle>Ажлын байрны жагсаалт</CardTitle>
                    <CardDescription>Байгууллагад бүртгэлтэй бүх албан тушаал.</CardDescription>
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
                            <TableHead className='text-right'>Орон тоо</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({length: 5}).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className='h-5 w-48'/></TableCell>
                                <TableCell><Skeleton className='h-5 w-32'/></TableCell>
                                <TableCell className='text-right'><Skeleton className='h-5 w-16 ml-auto'/></TableCell>
                            </TableRow>
                        ))}
                        {positions?.map(pos => (
                            <TableRow key={pos.id}>
                                <TableCell className='font-medium'>{pos.title}</TableCell>
                                <TableCell>{departmentMap[pos.departmentId] || 'Тодорхойгүй'}</TableCell>
                                <TableCell className='text-right'>{pos.filled} / {pos.headcount}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

const HeadcountTab = () => {
    const { firestore } = useFirebase();
    const positionsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'positions') : null), [firestore]);
    const { data: positions, isLoading: isLoadingPos } = useCollection<Position>(positionsQuery);

    const totalHeadcount = positions?.reduce((acc, pos) => acc + pos.headcount, 0) || 0;
    const totalFilled = positions?.reduce((acc, pos) => acc + pos.filled, 0) || 0;
    const vacancy = totalHeadcount - totalFilled;

    return (
        <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
            <Card>
                <CardHeader>
                    <CardTitle>Нийт орон тоо</CardTitle>
                    <CardDescription>Батлагдсан нийт ажлын байрны тоо.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingPos ? <Skeleton className='h-10 w-20' /> : <div className="text-4xl font-bold">{totalHeadcount}</div>}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Ажиллаж буй</CardTitle>
                    <CardDescription>Одоогоор ажиллаж буй ажилтны тоо.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingPos ? <Skeleton className='h-10 w-20' /> : <div className="text-4xl font-bold">{totalFilled}</div>}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Сул орон тоо</CardTitle>
                    <CardDescription>Нөхөгдөөгүй байгаа ажлын байрны тоо.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingPos ? <Skeleton className='h-10 w-20' /> : <div className="text-4xl font-bold text-primary">{vacancy}</div>}
                </CardContent>
            </Card>
        </div>
    )
}


export default function OrganizationPage() {
  return (
    <div className="py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Байгууллагын удирдлага</h1>
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Хэлтэс, нэгжүүд</h2>
            <Button size="sm" className="gap-1">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Хэлтэс нэмэх
              </span>
            </Button>
          </div>
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