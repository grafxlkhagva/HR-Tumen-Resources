'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserPlus, Loader2, GitBranch, ChevronRight } from 'lucide-react';
import { Employee } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCollection, useFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Position } from '../../../types';

interface AppointEmployeeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    position: Position | null;
}

export function AppointEmployeeDialog({
    open,
    onOpenChange,
    position,
}: AppointEmployeeDialogProps) {
    const { firestore } = useFirebase();
    const router = useRouter();
    const [search, setSearch] = React.useState('');

    // 1. Fetch unassigned employees
    const employeesQuery = React.useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'employees'),
            where('status', '==', 'Идэвхтэй'),
            where('positionId', '==', null) // Wait, firestore null queries can be tricky, check the data
        );
    }, [firestore]);

    const { data: allEmployees, isLoading: employeesLoading } = useCollection<Employee>(employeesQuery);

    // 2. Fetch workflow settings
    const settingsRef = React.useMemo(() =>
        firestore ? doc(firestore, 'organization_settings', 'workflows') : null
        , [firestore]);
    const { data: workflowSettings } = useDoc<any>(settingsRef);

    const assignableEmployees = React.useMemo(() => {
        if (!allEmployees) return [];
        // Double check positionId filter in-memory if firestore query is inconsistent
        return allEmployees.filter(emp => !emp.positionId);
    }, [allEmployees]);

    const filteredEmployees = React.useMemo(() => {
        return assignableEmployees.filter(emp =>
            `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
            emp.employeeCode?.toLowerCase().includes(search.toLowerCase())
        );
    }, [assignableEmployees, search]);

    const handleAppoint = (employee: Employee) => {
        if (!position) return;

        const workflowId = workflowSettings?.employee_appointment;

        // Construct the URL with query parameters
        const params = new URLSearchParams();
        params.append('employeeId', employee.id);
        params.append('positionId', position.id);
        params.append('departmentId', position.departmentId);
        if (workflowId) {
            params.append('workflowId', workflowId);
        }

        router.push(`/dashboard/employment-relations/create?${params.toString()}`);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0 gap-0 overflow-hidden rounded-3xl border-none shadow-premium">
                <DialogHeader className="p-8 pb-6 bg-gradient-to-br from-primary/5 to-background border-b">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <UserPlus className="h-5 w-5" />
                        </div>
                        <DialogTitle className="text-xl font-bold">Ажилтан томилох</DialogTitle>
                    </div>
                    <DialogDescription className="text-sm">
                        <span className="font-bold text-foreground">"{position?.title}"</span> ажлын байранд томилох ажилтнаа сонгоно уу.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-8 py-4 border-b bg-muted/20">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Ажилтны нэр, кодоор хайх..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 h-11 bg-background rounded-xl border-border focus-visible:ring-primary shadow-sm"
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-2">
                        {employeesLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Ажилтны жагсаалт уншиж байна...</p>
                            </div>
                        ) : filteredEmployees.length > 0 ? (
                            filteredEmployees.map((emp) => (
                                <div
                                    key={emp.id}
                                    className="flex items-center justify-between p-4 rounded-2xl bg-background border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all group cursor-pointer"
                                    onClick={() => handleAppoint(emp)}
                                >
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-12 w-12 border-2 border-white shadow-sm ring-1 ring-border/20">
                                            <AvatarImage src={emp.photoURL} />
                                            <AvatarFallback className="bg-primary/5 text-primary font-bold">
                                                {emp.firstName?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-bold text-slate-900 group-hover:text-primary transition-colors">{emp.firstName} {emp.lastName}</div>
                                            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-2">
                                                <span className="bg-muted px-1.5 py-0.5 rounded">#{emp.employeeCode}</span>
                                                {emp.jobTitle && <span>{emp.jobTitle}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 transition-all bg-primary/10 text-primary hover:bg-primary hover:text-white"
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center space-y-4">
                                <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto">
                                    <Search className="h-8 w-8 text-muted-foreground/30" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">Илэрц олдсонгүй</p>
                                    <p className="text-xs text-muted-foreground mt-1">Томилогдоогүй, идэвхтэй ажилтан олдсонгүй.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="p-6 border-t bg-muted/10 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <GitBranch className="w-4 h-4 text-purple-500" />
                        <span>Workflow: {workflowSettings?.employee_appointment ? 'ТОХИРУУЛСАН' : 'ТОХИРУУЛААГҮЙ'}</span>
                    </div>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl px-6 h-10 font-bold uppercase tracking-wider text-[10px]">Болих</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
