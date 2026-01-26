// src/app/dashboard/widgets/dashboard-widget-card.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EyeOff, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetId, getWidgetConfig } from './catalog';

export interface WidgetData {
    // Projects widget
    activeProjectsCount?: number;
    overdueTasksCount?: number;
    
    // Employees widget
    activeEmployeesCount?: number;
    onboardingCount?: number;
    offboardingCount?: number;
    
    // Structure widget
    departmentsCount?: number;
    positionsCount?: number;
    
    // Attendance widget
    presentCount?: number;
    onLeaveCount?: number;
    
    // Vacation widget
    vacationCount?: number;
    
    // Posts widget
    postsCount?: number;
    
    // KPI widgets
    newHiresCount?: number;
    openVacanciesCount?: number;
    pendingTimeOffCount?: number;
    inactiveCount?: number;
}

interface DashboardWidgetCardProps {
    id: WidgetId;
    data: WidgetData;
    isLoading?: boolean;
    onHide?: (id: WidgetId) => void;
    isDragging?: boolean;
}

export function DashboardWidgetCard({ 
    id, 
    data, 
    isLoading = false,
    onHide,
    isDragging = false
}: DashboardWidgetCardProps) {
    const config = getWidgetConfig(id);
    
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    if (!config) return null;

    const Icon = config.icon;
    const isCompact = config.size === 'compact';

    const renderContent = () => {
        if (isLoading) {
            return <Skeleton className="h-20 w-full bg-slate-700" />;
        }

        switch (id) {
            case 'projects':
                return (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                            <div>
                                <div className="text-3xl font-semibold text-white">{data.activeProjectsCount ?? 0}</div>
                                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Идэвхтэй төсөл</div>
                            </div>
                            <div className="h-10 w-px bg-slate-700" />
                        </div>
                        <div>
                            <div className="text-2xl font-semibold text-amber-400">{data.overdueTasksCount ?? 0}</div>
                            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Хугацаа хэтэрсэн таск</div>
                        </div>
                    </div>
                );

            case 'employees':
                return (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                            <div>
                                <div className="text-3xl font-semibold text-white">{data.activeEmployeesCount ?? 0}</div>
                                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Нийт идэвхтэй</div>
                            </div>
                            <div className="h-10 w-px bg-slate-700" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <div className="text-2xl font-semibold text-emerald-400">{data.onboardingCount ?? 0}</div>
                                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Onboarding</div>
                            </div>
                            <div>
                                <div className="text-2xl font-semibold text-amber-400">{data.offboardingCount ?? 0}</div>
                                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Offboarding</div>
                            </div>
                        </div>
                    </div>
                );

            case 'structure':
                return (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <div className="text-2xl font-semibold text-indigo-400">{data.departmentsCount ?? 0}</div>
                                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Нэгж</div>
                            </div>
                            <div>
                                <div className="text-2xl font-semibold text-purple-400">{data.positionsCount ?? 0}</div>
                                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Ажлын байр</div>
                            </div>
                        </div>
                    </div>
                );

            case 'attendance':
                return (
                    <div className="flex items-end gap-6">
                        <div>
                            <div className="text-3xl font-semibold text-white">{data.presentCount ?? 0}</div>
                            <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wide">Ажил дээрээ</div>
                        </div>
                        <div className="h-12 w-px bg-slate-700" />
                        <div>
                            <div className="text-3xl font-semibold text-white">{data.onLeaveCount ?? 0}</div>
                            <div className="text-[10px] text-blue-400 font-semibold uppercase tracking-wide">Чөлөөтэй</div>
                        </div>
                    </div>
                );

            case 'vacation':
                return (
                    <div>
                        <div className="text-4xl font-semibold text-amber-500 mb-1">{data.vacationCount ?? 0}</div>
                        <div className="text-xs text-slate-400 font-medium">ажилтан амарч байна</div>
                    </div>
                );

            case 'posts':
                return (
                    <div>
                        <div className="text-4xl font-semibold text-white mb-1">{data.postsCount ?? 0}</div>
                        <div className="text-xs text-slate-400 font-medium">нийтлэл</div>
                    </div>
                );

            case 'recruitment':
                return (
                    <div className="relative z-10">
                        <div className="flex items-baseline gap-2 mb-1">
                            <div className="text-2xl font-bold text-white">Сонгон шалгаруулалт</div>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Recruitment & Selection</div>
                    </div>
                );

            case 'points':
                return (
                    <div className="relative z-10">
                        <div className="flex items-baseline gap-2 mb-1">
                            <div className="text-3xl font-semibold text-white">Points</div>
                        </div>
                        <div className="text-xs text-slate-400 font-medium">Recognition System</div>
                    </div>
                );

            case 'er':
                return (
                    <div className="relative z-10">
                        <div className="flex items-baseline gap-2 mb-1">
                            <div className="text-2xl font-semibold text-white">Хөдөлмөрийн харилцаа</div>
                        </div>
                        <div className="text-xs text-slate-400 font-medium">Гэрээ, протокол, баримт</div>
                    </div>
                );

            case 'process':
                return (
                    <div className="relative z-10">
                        <div className="flex items-baseline gap-2 mb-1">
                            <div className="text-2xl font-semibold text-white">Процесс</div>
                        </div>
                        <div className="text-xs text-slate-400 font-medium">Шат дамжлага, урсгал</div>
                    </div>
                );

            // KPI widgets
            case 'newHires':
                return (
                    <div className="relative z-10">
                        <div className="text-3xl font-semibold text-emerald-400 mb-1">{data.newHiresCount ?? 0}</div>
                        <div className="text-xs text-slate-400 font-medium">сүүлийн 30 хоногт</div>
                    </div>
                );

            case 'openVacancies':
                return (
                    <div className="relative z-10">
                        <div className="text-3xl font-semibold text-blue-400 mb-1">{data.openVacanciesCount ?? 0}</div>
                        <div className="text-xs text-slate-400 font-medium">нээлттэй зар</div>
                    </div>
                );

            case 'pendingTimeOff':
                return (
                    <div className="relative z-10">
                        <div className="text-3xl font-semibold text-orange-400 mb-1">{data.pendingTimeOffCount ?? 0}</div>
                        <div className="text-xs text-slate-400 font-medium">хүлээгдэж буй</div>
                    </div>
                );

            case 'inactive':
                return (
                    <div className="relative z-10">
                        <div className="text-3xl font-semibold text-rose-400 mb-1">{data.inactiveCount ?? 0}</div>
                        <div className="text-xs text-slate-400 font-medium">идэвхгүй ажилтан</div>
                    </div>
                );

            default:
                return null;
        }
    };

    // Get gradient colors for decorative backgrounds
    const getGradientClasses = () => {
        switch (id) {
            case 'projects':
                return 'bg-gradient-to-br from-violet-500/10 to-purple-500/10';
            case 'recruitment':
                return 'bg-blue-500/10';
            case 'points':
                return 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20';
            case 'er':
                return 'bg-gradient-to-br from-blue-500/10 to-indigo-500/10';
            case 'process':
                return 'bg-gradient-to-br from-pink-500/10 to-rose-500/10';
            case 'newHires':
                return 'bg-gradient-to-br from-emerald-500/10 to-green-500/10';
            case 'openVacancies':
                return 'bg-gradient-to-br from-blue-500/10 to-cyan-500/10';
            case 'pendingTimeOff':
                return 'bg-gradient-to-br from-orange-500/10 to-amber-500/10';
            case 'inactive':
                return 'bg-gradient-to-br from-rose-500/10 to-red-500/10';
            default:
                return '';
        }
    };

    const cardContent = (
        <Card 
            ref={setNodeRef}
            style={style}
            className={cn(
                "h-full bg-slate-900 dark:bg-slate-800 border-slate-700 transition-all duration-300 group overflow-hidden",
                "hover:bg-slate-800 dark:hover:bg-slate-700 hover:shadow-xl hover:scale-[1.02]",
                isCompact ? "w-[200px] sm:w-[240px]" : "w-[280px] sm:w-[320px]",
                isDragging && "opacity-50 scale-105 shadow-2xl z-50"
            )}
        >
            <CardContent className="p-4 sm:p-5 h-full flex flex-col justify-between relative overflow-hidden">
                {/* Decorative gradient background for some widgets */}
                {getGradientClasses() && (
                    <div className={cn(
                        "absolute -right-6 -bottom-6 w-28 h-28 rounded-full blur-3xl transition-all",
                        getGradientClasses(),
                        "group-hover:opacity-150"
                    )} />
                )}

                {/* Header with title, icon, and actions */}
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-2">
                        {/* Drag handle */}
                        <button
                            {...attributes}
                            {...listeners}
                            className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Чирэх"
                        >
                            <GripVertical className="h-4 w-4 text-slate-500" />
                        </button>
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            {config.label}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {onHide && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-700/50"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onHide(id);
                                }}
                                aria-label="Нуух"
                            >
                                <EyeOff className="h-3.5 w-3.5 text-slate-400" />
                            </Button>
                        )}
                        <Icon className={cn(
                            "h-5 w-5 text-slate-500 group-hover:scale-110 transition-transform",
                            id === 'projects' && "text-violet-400",
                            id === 'points' && "text-yellow-500",
                            id === 'recruitment' && "text-blue-400",
                            id === 'er' && "text-blue-500",
                            id === 'process' && "text-pink-500",
                            id === 'newHires' && "text-emerald-400",
                            id === 'openVacancies' && "text-blue-400",
                            id === 'pendingTimeOff' && "text-orange-400",
                            id === 'inactive' && "text-rose-400"
                        )} />
                    </div>
                </div>

                {/* Widget content */}
                {renderContent()}
            </CardContent>
        </Card>
    );

    // Wrap with Link if href is provided
    if (config.href) {
        return (
            <Link href={config.href} className="flex-shrink-0">
                {cardContent}
            </Link>
        );
    }

    return <div className="flex-shrink-0">{cardContent}</div>;
}
