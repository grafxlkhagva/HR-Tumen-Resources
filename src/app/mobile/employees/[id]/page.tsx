'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Employee } from '@/app/dashboard/employees/data';
import { Skeleton } from '@/components/ui/skeleton';
import { EmployeeCard } from '../EmployeeCard';

type Department = {
    id: string;
    name: string;
}

function PageSkeleton() {
    return (
        <div className="p-4 space-y-6">
            <header className="py-4 relative flex items-center justify-center">
                <Skeleton className="h-6 w-6 absolute left-0" />
                <Skeleton className="h-7 w-40" />
            </header>
            <div className="mt-4 space-y-3 flex flex-col items-center">
                 <Skeleton className="w-24 h-24 rounded-full" />
                 <Skeleton className="h-7 w-48" />
                 <Skeleton className="h-5 w-32" />
            </div>
             <div className="mt-6 space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
             </div>
        </div>
    )
}

export default function EmployeeDetailPage() {
    const { id } = useParams();
    const employeeId = Array.isArray(id) ? id[0] : id;


    const employeeRef = useMemoFirebase(({firestore}) => (firestore ? doc(firestore, 'employees', employeeId) : null), [employeeId]);
    const { data: employee, isLoading: isLoadingEmployee } = useDoc<Employee>(employeeRef);
    
    const departmentRef = useMemoFirebase(({firestore}) => (firestore && employee?.departmentId ? doc(firestore, 'departments', employee.departmentId) : null), [employee?.departmentId]);
    const { data: department, isLoading: isLoadingDept } = useDoc(departmentRef);

    const isLoading = isLoadingEmployee || isLoadingDept;

    if (isLoading) {
        return <PageSkeleton />;
    }

    if (!employee) {
        return <div>Ажилтан олдсонгүй</div>
    }

    const employeeWithDept = {
        ...employee,
        department: (department as Department)?.name || 'Тодорхойгүй',
    };

    return <EmployeeCard employee={employeeWithDept} />;
}
