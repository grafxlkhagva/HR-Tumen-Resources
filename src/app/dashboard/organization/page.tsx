'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  MoreVertical,
  PlusCircle,
  Users,
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

// Mock data - replace with data from Firestore
const departments = [
  {
    id: 'd1',
    name: 'Инженерчлэл',
    positions: [
      { id: 'p1', title: 'Програм хангамжийн ахлах инженер', headcount: 1, filled: 1 },
      { id: 'p2', title: 'Програм хангамжийн инженер', headcount: 3, filled: 2 },
      { id: 'p3', title: 'UI/UX Дизайнер', headcount: 1, filled: 1 },
    ],
  },
  {
    id: 'd2',
    name: 'Маркетинг',
    positions: [
      { id: 'p4', title: 'Маркетингийн менежер', headcount: 1, filled: 1 },
      { id: 'p5', title: 'Дижитал маркетер', headcount: 2, filled: 1 },
    ],
  },
    {
    id: 'd3',
    name: 'Хүний нөөц',
    positions: [
      { id: 'p6', title: 'Хүний нөөцийн менежер', headcount: 1, filled: 1 },
      { id: 'p7', title: 'Хүний нөөцийн мэргэжилтэн', headcount: 1, filled: 0 },
    ],
  },
];

const DepartmentCard = ({ department }: { department: (typeof departments)[0] }) => {
  const totalHeadcount = department.positions.reduce((acc, pos) => acc + pos.headcount, 0);
  const totalFilled = department.positions.reduce((acc, pos) => acc + pos.filled, 0);

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
                <CardDescription>{totalFilled} / {totalHeadcount} ажилтан</CardDescription>
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
              <DropdownMenuItem className="text-destructive">Хэлтэс устгах</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <Separator />
        <div className="space-y-3">
            {department.positions.map((position) => (
                <div key={position.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{position.title}</span>
                    </div>
                    <Badge variant={position.filled < position.headcount ? "secondary" : "outline"}>
                        {position.filled} / {position.headcount}
                    </Badge>
                </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default function OrganizationPage() {
  return (
    <div className="py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Бүтэц, орон тоо</h1>
          <p className="text-muted-foreground">
            Компанийн хэлтэс, албан тушаалын бүтцийг удирдах.
          </p>
        </div>
        <Button size="sm" className="gap-1">
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Хэлтэс нэмэх
          </span>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {departments.map((dept) => (
          <DepartmentCard key={dept.id} department={dept} />
        ))}
      </div>
    </div>
  );
}
