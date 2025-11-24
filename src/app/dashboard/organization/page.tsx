'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Settings, Users } from 'lucide-react';
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
  addDocumentNonBlocking,
  useCollection,
  useFirebase,
  useMemoFirebase,
} from '@/firebase';
import { collection } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { AddTypeDialog } from './add-type-dialog';

// Interfaces for Firestore data
type Department = {
  id: string;
  name: string;
  description?: string;
  type?: string;
  headcount?: number;
  children?: Department[];
};

type Position = {
  id: string;
  title: string;
  departmentId: string;
  headcount: number;
  filled: number;
};

const OrgChartNode = ({ node }: { node: Department }) => (
  <div className="relative flex flex-col items-center">
    <div className="relative w-56 rounded-lg border bg-card p-4 text-center text-card-foreground shadow-sm">
      <p className="font-semibold">{node.name}</p>
      <p className="text-sm text-muted-foreground">{node.type}</p>
      <div className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>{node.headcount}</span>
      </div>
    </div>
    {node.children && node.children.length > 0 && (
      <>
        <div className="absolute top-full h-8 w-px bg-border"></div>
        <div className="relative flex justify-center gap-8 pt-8">
          <div className="absolute left-1/2 top-0 h-px w-full -translate-x-1/2 bg-border"></div>
          {node.children.map((child) => (
            <OrgChartNode key={child.id} node={child} />
          ))}
        </div>
      </>
    )}
  </div>
);

const mockOrgData: Department = {
  id: 'ceo',
  name: 'НЭ',
  type: 'Компани',
  headcount: 0,
  children: [
    {
      id: 'eng',
      name: 'Инженерчлэлийн хэлтэс',
      type: 'Хэлтэс',
      headcount: 15,
      children: [
        {
          id: 'fe',
          name: 'Frontend баг',
          type: 'Баг',
          headcount: 7,
          children: [],
        },
        {
          id: 'be',
          name: 'Backend баг',
          type: 'Баг',
          headcount: 8,
          children: [],
        },
      ],
    },
    {
      id: 'mkt',
      name: 'Маркетингийн хэлтэс',
      type: 'Хэлтэс',
      headcount: 8,
      children: [
        {
          id: 'sales',
          name: 'Борлуулалтын алба',
          type: 'Алба',
          headcount: 12,
          children: [],
        },
      ],
    },
    {
      id: 'hr',
      name: 'Хүний нөөцийн алба',
      type: 'Алба',
      headcount: 5,
      children: [],
    },
  ],
};

const StructureTab = () => {
  const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);
  return (
    <>
      <AddTypeDialog open={isAddTypeOpen} onOpenChange={setIsAddTypeOpen} />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Хөхэнэгэ ХХК бүтэц (55)</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddTypeOpen(true)}
              >
                <Settings className="mr-2 h-4 w-4" />
                Төрөл нэмэх
              </Button>
              <Button variant="default" size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Бүтэц нэмэх
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-8">
          <div className="inline-block">
            <OrgChartNode node={mockOrgData} />
          </div>
        </CardContent>
      </Card>
    </>
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
            {positions?.map((pos) => (
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

    