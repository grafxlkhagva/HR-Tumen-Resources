'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Loader2, ChevronRight, UserPlus } from 'lucide-react';
import { Employee } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface StepEmployeeSelectProps {
    search: string;
    onSearchChange: (value: string) => void;
    employeesLoading: boolean;
    filteredEmployees: Employee[];
    onSelectEmployee: (employee: Employee) => void;
    onCreateNew?: () => void;
}

export function StepEmployeeSelect({
    search,
    onSearchChange,
    employeesLoading,
    filteredEmployees,
    onSelectEmployee,
    onCreateNew,
}: StepEmployeeSelectProps) {
    return (
        <>
            <div className="px-6 py-3 border-b bg-muted/20 shrink-0">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Ажилтны нэр, кодоор хайх..."
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-10 h-10 bg-background rounded-xl"
                    />
                </div>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-2">
                    {onCreateNew && (
                        <button
                            type="button"
                            onClick={onCreateNew}
                            className="w-full flex items-center justify-between p-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:border-primary/60 hover:bg-primary/10 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <UserPlus className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <div className="font-semibold text-sm text-primary">Шинэ ажилтан үүсгэж томилох</div>
                                    <div className="text-[10px] text-muted-foreground">Системд бүртгэлгүй хүнийг нэмэх</div>
                                </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-primary/60 group-hover:text-primary transition-colors" />
                        </button>
                    )}
                    {employeesLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                            <p className="text-xs text-muted-foreground">Ажилтны жагсаалт уншиж байна...</p>
                        </div>
                    ) : filteredEmployees.length > 0 ? (
                        filteredEmployees.map((emp) => (
                            <div
                                key={emp.id}
                                className="flex items-center justify-between p-3 rounded-xl bg-background border hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group"
                                onClick={() => onSelectEmployee(emp)}
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                        <AvatarImage src={emp.photoURL} />
                                        <AvatarFallback className="bg-primary/5 text-primary font-bold">
                                            {emp.firstName?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-semibold text-sm">{emp.firstName} {emp.lastName}</div>
                                        <div className="text-[10px] text-muted-foreground">#{emp.employeeCode}</div>
                                    </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                        ))
                    ) : (
                        <div className="py-12 text-center">
                            <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-sm font-medium">Илэрц олдсонгүй</p>
                            <p className="text-xs text-muted-foreground">
                                {onCreateNew
                                    ? 'Дээрх "Шинэ ажилтан үүсгэж томилох" сонголтыг ашиглана уу'
                                    : 'Томилогдоогүй ажилтан олдсонгүй'}
                            </p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </>
    );
}
