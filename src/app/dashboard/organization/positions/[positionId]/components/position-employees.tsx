'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Mail, Phone, Calendar, ArrowUpRight, UserPlus, Sparkles, User, UserX } from 'lucide-react';
import { Employee } from '@/app/dashboard/employees/data';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

interface PositionEmployeesProps {
    employees: Employee[];
    onAssignClick?: () => void;
}

export function PositionEmployees({ employees, onAssignClick }: PositionEmployeesProps) {
    // Logic: A position can have at most ONE employee.
    const currentEmployee = employees[0]; // Take the first one if exists (should be only one)
    const isVacant = !currentEmployee;

    return (
        <Card className="border-none shadow-premium ring-1 ring-border/60 overflow-hidden bg-card rounded-3xl">
            <CardHeader className="bg-muted/30 border-b border-border/50 flex flex-row items-center justify-between px-8 py-6">
                <div className="flex items-center gap-2.5">
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center transition-colors", isVacant ? "bg-amber-50" : "bg-emerald-50")}>
                        {isVacant ? <UserX className="w-4 h-4 text-amber-500" /> : <User className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <div>
                        <CardTitle className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Одоо ажиллаж буй</CardTitle>
                        <p className={cn("text-[10px] font-bold mt-0.5 uppercase tracking-wider", isVacant ? "text-amber-500" : "text-emerald-600")}>
                            {isVacant ? 'Сул орон тоо' : 'Эзэнтэй'}
                        </p>
                    </div>
                </div>
                {isVacant && (
                    <Button
                        onClick={onAssignClick}
                        variant="outline"
                        size="sm"
                        className="rounded-xl h-9 px-4 font-bold text-[10px] uppercase tracking-wider border-border hover:bg-muted transition-all active:scale-95 gap-2 shadow-sm"
                    >
                        <UserPlus className="w-3.5 h-3.5" />
                        Ажилтан томилох
                    </Button>
                )}
            </CardHeader>
            <CardContent className="p-8">
                {isVacant ? (
                    <div className="py-16 flex flex-col items-center justify-center text-center">
                        <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-6 ring-1 ring-border shadow-inner">
                            <UserX className="w-9 h-9 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground tracking-tight">Одоогоор сул байна</h3>
                        <p className="text-xs font-medium text-muted-foreground max-w-sm mt-2 leading-relaxed">
                            Энэхүү ажлын байранд одоогоор ажилтан томилогдоогүй байна. Та дээрх "Ажилтан томилох" товчийг ашиглан ажилтан сонгоно уу.
                        </p>
                    </div>
                ) : (
                    <div className="max-w-xl">
                        <Link
                            href={`/dashboard/employees/${currentEmployee.id}`}
                            className="group relative flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 rounded-2xl bg-white dark:bg-slate-950 border border-border shadow-sm hover:shadow-premium-hover hover:border-primary/20 transition-all duration-300"
                        >
                            <div className="relative shrink-0">
                                <Avatar className="h-20 w-20 rounded-2xl ring-4 ring-white dark:ring-slate-900 shadow-lg shadow-slate-200/50 dark:shadow-black/20">
                                    <AvatarImage src={currentEmployee.photoURL} className="object-cover" />
                                    <AvatarFallback className="bg-slate-100 text-slate-400 font-bold text-xl rounded-2xl">
                                        {currentEmployee.firstName?.charAt(0)}{currentEmployee.lastName?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-sm" />
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-lg font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
                                        {currentEmployee.firstName} {currentEmployee.lastName}
                                    </h4>
                                    <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-all duration-300 transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                                </div>
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{currentEmployee.employeeCode}</p>

                                <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 text-xs font-medium text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-3.5 h-3.5 opacity-70" />
                                        <span>{currentEmployee.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5 opacity-70" />
                                        <span>{currentEmployee.phoneNumber}</span>
                                    </div>
                                </div>
                            </div>
                        </Link>

                        <div className="mt-8 flex justify-end">
                            <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs font-bold uppercase tracking-wider">
                                Чөлөөлөх / Шилжүүлэх
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
