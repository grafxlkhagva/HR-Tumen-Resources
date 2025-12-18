'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, Clock, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Employee } from '../employees/data';
import { Skeleton } from '@/components/ui/skeleton';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const statusConfig: { [key: string]: { variant: 'default' | 'secondary' | 'destructive' | 'outline', className: string } } = {
    "Идэвхтэй": { variant: 'default', className: 'bg-green-100 text-green-800' },
    "Жирэмсний амралттай": { variant: 'secondary', className: 'bg-blue-100 text-blue-800' },
    "Хүүхэд асрах чөлөөтэй": { variant: 'secondary', className: 'bg-purple-100 text-purple-800' },
    "Урт хугацааны чөлөөтэй": { variant: 'outline', className: 'border-yellow-300 text-yellow-800' },
    "Ажлаас гарсан": { variant: 'destructive', className: '' },
    "Түр түдгэлзүүлсэн": { variant: 'destructive', className: 'bg-yellow-600 text-white' },
};

function EmployeeCarouselCard({ employee, isSelected, onSelect }: { employee: Employee, isSelected: boolean, onSelect: () => void }) {
    const status = statusConfig[employee.status] || { variant: 'outline', className: '' };
    
    const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // Stop propagation if the click is on a link or inside a link
        if ((e.target as HTMLElement).closest('a')) {
            return;
        }
        onSelect();
    };

    return (
        <Card 
            className={cn("w-full cursor-pointer transition-all", isSelected ? "border-primary shadow-lg" : "hover:shadow-md")}
            onClick={handleCardClick}
        >
            <CardContent className="p-4 flex items-center gap-4">
                 <Link href={`/dashboard/employees/${employee.id}`} onClick={(e) => e.stopPropagation()}>
                    <Avatar className="h-12 w-12 transition-all duration-300 ease-in-out hover:scale-110 hover:shadow-lg">
                        <AvatarImage src={employee.photoURL} alt={employee.firstName} />
                        <AvatarFallback>{employee.firstName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                </Link>
                <div className="flex-1 overflow-hidden">
                    <p className="font-semibold truncate">{employee.firstName} {employee.lastName}</p>
                    <p className="text-xs text-muted-foreground truncate">{employee.jobTitle}</p>
                    <Badge variant={status.variant} className={cn("mt-1", status.className)}>{employee.status}</Badge>
                </div>
            </CardContent>
        </Card>
    )
}

function ProcessChecklistItem({ title, isCompleted }: { title: string, isCompleted: boolean}) {
    return (
        <div className="flex items-center justify-between rounded-md border p-4">
            <div className="flex items-center gap-3">
                {isCompleted ? <Check className="h-5 w-5 text-green-500" /> : <Clock className="h-5 w-5 text-muted-foreground" />}
                <p className={cn("font-medium", isCompleted && "text-muted-foreground line-through")}>{title}</p>
            </div>
            <Button variant="secondary" size="sm" disabled={isCompleted}>Эхлүүлэх</Button>
        </div>
    )
}

function OffboardingProcess({ employee }: { employee: Employee }) {
    // Placeholder data
    const processSteps = [
        { id: 'exit-interview', title: 'Ажлаас гарах ярилцлага', completed: false },
        { id: 'asset-return', title: 'Эд хөрөнгө хүлээлцэх', completed: true },
        { id: 'final-payment', title: 'Эцсийн тооцоо хийх', completed: false },
        { id: 'access-revoke', title: 'Системийн хандалт хаах', completed: false },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Ажлаас чөлөөлөх процесс</CardTitle>
                <CardDescription>{employee.firstName}-г ажлаас чөлөөлөхтэй холбоотой дараах үйлдлүүдийг гүйцэтгэнэ үү.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {processSteps.map(step => (
                     <ProcessChecklistItem key={step.id} title={step.title} isCompleted={step.completed} />
                ))}
            </CardContent>
        </Card>
    )
}

function OnLeaveProcess({ employee }: { employee: Employee }) {
     // Placeholder data
    const processSteps = [
        { id: 'handover', title: 'Ажил хүлээлцэх', completed: true },
        { id: 'leave-documentation', title: 'Холбогдох бичиг баримт бүрдүүлэх', completed: false },
    ];
    return (
        <Card>
            <CardHeader>
                <CardTitle>Чөлөө олгох процесс</CardTitle>
                <CardDescription>{employee.firstName}-д {employee.status?.toLowerCase()} чөлөө олгохтой холбоотой үйлдлүүд.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {processSteps.map(step => (
                     <ProcessChecklistItem key={step.id} title={step.title} isCompleted={step.completed} />
                ))}
            </CardContent>
        </Card>
    )
}


export default function EmploymentRelationsPage() {
  const { firestore } = useFirebase();
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string | null>(null);

  const employeesQuery = useMemoFirebase(({ firestore }) => (firestore ? collection(firestore, 'employees') : null), []);
  const { data: employees, isLoading, error } = useCollection<Employee>(employeesQuery);

  const inactiveEmployees = React.useMemo(() => {
    if (!employees) return [];
    return employees.filter(emp => emp.status !== 'Идэвхтэй');
  }, [employees]);
  
  React.useEffect(() => {
      if(!selectedEmployeeId && inactiveEmployees.length > 0) {
          setSelectedEmployeeId(inactiveEmployees[0].id);
      }
  }, [inactiveEmployees, selectedEmployeeId]);

  const selectedEmployee = React.useMemo(() => {
      if (!selectedEmployeeId || !inactiveEmployees) return null;
      return inactiveEmployees.find(emp => emp.id === selectedEmployeeId) || null;
  }, [selectedEmployeeId, inactiveEmployees]);
  

  return (
    <div className="py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Буцах
          </Link>
        </Button>
         <h1 className="text-2xl font-bold tracking-tight">Хөдөлмөрийн харилцаа</h1>
      </div>

        <Card>
            <CardHeader>
                <CardTitle>Идэвхгүй/Чөлөөтэй ажилтнууд</CardTitle>
                <CardDescription>Процесс удирдах ажилтнаа сонгоно уу.</CardDescription>
            </CardHeader>
            <CardContent>
                 {isLoading && <Skeleton className="h-28 w-full" />}
                 {!isLoading && inactiveEmployees.length > 0 && (
                    <Carousel opts={{ align: "start" }} className="w-full">
                        <CarouselContent className="-ml-4">
                            {inactiveEmployees.map((employee) => (
                            <CarouselItem key={employee.id} className="md:basis-1/2 lg:basis-1/3 pl-4">
                                <EmployeeCarouselCard 
                                    employee={employee} 
                                    isSelected={selectedEmployeeId === employee.id}
                                    onSelect={() => setSelectedEmployeeId(employee.id)}
                                />
                            </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious />
                        <CarouselNext />
                    </Carousel>
                 )}
                 {!isLoading && inactiveEmployees.length === 0 && (
                     <div className="text-center py-10 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">Идэвхгүй эсвэл чөлөөтэй ажилтан байхгүй байна.</p>
                    </div>
                 )}
            </CardContent>
        </Card>

        {isLoading && <Skeleton className="h-64 w-full" />}
        {selectedEmployee && (
            <div className="animate-in fade-in-50">
                {selectedEmployee.status === 'Ажлаас гарсан' ? (
                     <OffboardingProcess employee={selectedEmployee} />
                ) : (
                    <OnLeaveProcess employee={selectedEmployee} />
                )}
            </div>
        )}
    </div>
  );
}
