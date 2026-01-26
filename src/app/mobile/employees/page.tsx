'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Employee } from '@/app/dashboard/employees/data';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Users, Building2, Phone, Mail, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Department = {
    id: string;
    name: string;
}

function EmployeeListSkeleton() {
    return (
        <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-2xl">
                    <Skeleton className="h-14 w-14 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-5 w-5" />
                </div>
            ))}
        </div>
    );
}

function EmployeeListItem({ employee, department }: { employee: Employee; department?: Department }) {
    const router = useRouter();

    return (
        <div
            onClick={() => router.push(`/mobile/employees/${employee.id}`)}
            className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm cursor-pointer active:scale-[0.98] transition-all hover:border-primary/20 hover:shadow-md group"
        >
            <div className="relative">
                <Avatar className="h-14 w-14 ring-2 ring-white shadow-sm">
                    <AvatarImage src={employee.photoURL} alt={employee.firstName} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-semibold text-lg">
                        {employee.firstName?.charAt(0)}
                    </AvatarFallback>
                </Avatar>
                {/* Online indicator placeholder */}
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
            </div>

            <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 truncate group-hover:text-primary transition-colors">
                    {employee.lastName?.[0]}. {employee.firstName}
                </h3>
                <p className="text-sm text-slate-500 truncate">
                    {employee.jobTitle || 'Ажилтан'}
                </p>
                {department && (
                    <div className="flex items-center gap-1 mt-1">
                        <Building2 className="h-3 w-3 text-slate-400" />
                        <span className="text-xs text-slate-400">{department.name}</span>
                    </div>
                )}
            </div>

            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
    );
}

export default function EmployeesListPage() {
    const { firestore } = useFirebase();
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedDepartment, setSelectedDepartment] = React.useState<string | null>(null);

    // Fetch employees
    const employeesQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, 'employees'), orderBy('firstName')) : null,
        [firestore]
    );
    const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

    // Fetch departments
    const departmentsQuery = useMemoFirebase(
        () => firestore ? collection(firestore, 'departments') : null,
        [firestore]
    );
    const { data: departments, isLoading: isLoadingDepartments } = useCollection<Department>(departmentsQuery);

    // Create department map for quick lookup
    const departmentMap = React.useMemo(() => {
        if (!departments) return new Map<string, Department>();
        return new Map(departments.map(d => [d.id, d]));
    }, [departments]);

    // Filter employees based on search and department
    const filteredEmployees = React.useMemo(() => {
        if (!employees) return [];

        return employees.filter(emp => {
            // Filter by search query
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = searchQuery === '' ||
                emp.firstName?.toLowerCase().includes(searchLower) ||
                emp.lastName?.toLowerCase().includes(searchLower) ||
                emp.jobTitle?.toLowerCase().includes(searchLower) ||
                emp.email?.toLowerCase().includes(searchLower);

            // Filter by department
            const matchesDepartment = !selectedDepartment || emp.departmentId === selectedDepartment;

            return matchesSearch && matchesDepartment;
        });
    }, [employees, searchQuery, selectedDepartment]);

    // Group employees by department for display
    const groupedEmployees = React.useMemo(() => {
        if (!filteredEmployees || !departments) return new Map<string, Employee[]>();

        const grouped = new Map<string, Employee[]>();
        
        filteredEmployees.forEach(emp => {
            const deptId = emp.departmentId || 'unknown';
            if (!grouped.has(deptId)) {
                grouped.set(deptId, []);
            }
            grouped.get(deptId)!.push(emp);
        });

        return grouped;
    }, [filteredEmployees, departments]);

    const isLoading = isLoadingEmployees || isLoadingDepartments;

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 py-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <Button asChild variant="ghost" size="icon" className="rounded-full">
                        <Link href="/mobile/home">
                            <ArrowLeft className="h-5 w-5" />
                            <span className="sr-only">Буцах</span>
                        </Link>
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-lg font-semibold text-slate-900">Хамт олон</h1>
                        <p className="text-xs text-slate-500">
                            {employees ? `${employees.length} ажилтан` : 'Ачааллаж байна...'}
                        </p>
                    </div>
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                        <Users className="h-5 w-5 text-primary" />
                    </div>
                </div>

                {/* Search bar */}
                <div className="mt-4 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Нэр, албан тушаалаар хайх..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 rounded-xl border-slate-200 bg-slate-50 focus:bg-white transition-colors"
                    />
                </div>

                {/* Department filter */}
                {departments && departments.length > 0 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        <Badge
                            variant={selectedDepartment === null ? 'default' : 'outline'}
                            className={cn(
                                'cursor-pointer whitespace-nowrap transition-all',
                                selectedDepartment === null ? 'bg-primary' : 'hover:bg-slate-100'
                            )}
                            onClick={() => setSelectedDepartment(null)}
                        >
                            Бүгд
                        </Badge>
                        {departments.map(dept => (
                            <Badge
                                key={dept.id}
                                variant={selectedDepartment === dept.id ? 'default' : 'outline'}
                                className={cn(
                                    'cursor-pointer whitespace-nowrap transition-all',
                                    selectedDepartment === dept.id ? 'bg-primary' : 'hover:bg-slate-100'
                                )}
                                onClick={() => setSelectedDepartment(dept.id)}
                            >
                                {dept.name}
                            </Badge>
                        ))}
                    </div>
                )}
            </header>

            {/* Content */}
            <main className="p-4 space-y-6">
                {isLoading ? (
                    <EmployeeListSkeleton />
                ) : filteredEmployees.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <Users className="w-10 h-10 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">Ажилтан олдсонгүй</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            {searchQuery ? 'Хайлтын үр дүн байхгүй байна' : 'Одоогоор ажилтан бүртгэгдээгүй байна'}
                        </p>
                    </div>
                ) : selectedDepartment ? (
                    // Show flat list when filtering by department
                    <div className="space-y-3">
                        {filteredEmployees.map(emp => (
                            <EmployeeListItem
                                key={emp.id}
                                employee={emp}
                                department={departmentMap.get(emp.departmentId || '')}
                            />
                        ))}
                    </div>
                ) : (
                    // Show grouped by department when showing all
                    Array.from(groupedEmployees.entries()).map(([deptId, emps]) => {
                        const department = departmentMap.get(deptId);
                        return (
                            <div key={deptId} className="space-y-3">
                                <div className="flex items-center gap-2 px-1">
                                    <Building2 className="h-4 w-4 text-slate-400" />
                                    <h2 className="text-sm font-semibold text-slate-600">
                                        {department?.name || 'Тодорхойгүй хэлтэс'}
                                    </h2>
                                    <Badge variant="secondary" className="text-xs">
                                        {emps.length}
                                    </Badge>
                                </div>
                                <div className="space-y-3">
                                    {emps.map(emp => (
                                        <EmployeeListItem
                                            key={emp.id}
                                            employee={emp}
                                            department={department}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </main>
        </div>
    );
}
