'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserPlus } from 'lucide-react';
import { Employee } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UnassignedEmployeesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employees: Employee[];
    onAssign: (employee: Employee) => void;
}

export function UnassignedEmployeesDialog({
    open,
    onOpenChange,
    employees,
    onAssign,
}: UnassignedEmployeesDialogProps) {
    const [search, setSearch] = React.useState('');

    const filteredEmployees = React.useMemo(() => {
        return employees.filter(emp =>
            `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
            emp.jobTitle?.toLowerCase().includes(search.toLowerCase()) ||
            emp.employeeCode?.toLowerCase().includes(search.toLowerCase())
        );
    }, [employees, search]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0 gap-0 overflow-hidden rounded-[24px]">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle className="text-xl font-semibold">Томилогдоогүй ажилтнууд</DialogTitle>
                    <DialogDescription>
                        Ажлын байр томилох шаардлагатай байгаа {employees.length} ажилтан байна.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-4 border-b bg-muted/20">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Нэр, албан тушаал, кодоор хайх..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-background rounded-xl border-slate-200"
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                        {filteredEmployees.map((emp) => (
                            <div
                                key={emp.id}
                                className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-100"
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                        <AvatarImage src={emp.photoURL} />
                                        <AvatarFallback className="bg-slate-100 text-slate-600 font-semibold">
                                            {emp.firstName?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-semibold text-sm text-slate-900">{emp.firstName} {emp.lastName}</div>
                                        <div className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">{emp.jobTitle || 'Албан тушаал тодорхойгүй'}</div>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-xl h-8 text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => onAssign(emp)}
                                >
                                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                                    Томилох
                                </Button>
                            </div>
                        ))}
                        {filteredEmployees.length === 0 && (
                            <div className="py-20 text-center space-y-2">
                                <Search className="h-10 w-10 text-slate-200 mx-auto" />
                                <p className="text-sm font-medium text-slate-400">Хайлт илэрцгүй</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="p-4 border-t bg-slate-50 flex justify-end">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl h-10 px-6 font-semibold">Хаах</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
