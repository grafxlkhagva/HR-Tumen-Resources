'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
    Shield,
    User as UserIcon,
    LayoutGrid,
    Newspaper,
    HeartHandshake,
    Target,
    FolderKanban,
    DoorOpen,
    Building2,
    Stamp,
    Grid3x3,
    Check,
    Orbit,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmployeeProfile, type EmployeeProfile } from '@/hooks/use-employee-profile';

export type PortalId = 'admin' | 'employee' | 'tms' | 'news' | 'crm' | 'business_plan' | 'projects' | 'meetings' | 'company' | 'official_letters';

interface PortalDef {
    id: PortalId;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    href: string;
    color: string;
    /** Тухайн ажилтан үзэх эрхтэй эсэх. */
    visible: (p: EmployeeProfile) => boolean;
}

const PORTALS: PortalDef[] = [
    {
        id: 'admin',
        label: 'Хүний нөөц',
        description: 'Ажилтнууд, бүтэц, хөдөлмөрийн харилцаа',
        icon: Shield,
        href: '/dashboard',
        color: '#3b82f6',
        visible: (p) => p.role === 'admin',
    },
    {
        id: 'employee',
        label: 'Ажилтан',
        description: 'Өөрийн мэдээлэл',
        icon: UserIcon,
        href: '/mobile/home',
        color: '#10b981',
        visible: () => true,
    },
    {
        id: 'tms',
        label: 'TMS',
        description: 'Тээврийн удирдлагын систем',
        icon: LayoutGrid,
        href: '/tms',
        color: '#8b5cf6',
        visible: (p) => p.role === 'admin' || !!p.tmsAccess,
    },
    {
        id: 'news',
        label: 'Мэдээлэл',
        description: 'Байгууллагын мэдээ',
        icon: Newspaper,
        href: '/news',
        color: '#f97316',
        visible: (p) => p.role === 'admin' || !!p.newsAccess,
    },
    {
        id: 'crm',
        label: 'CRM',
        description: 'Харилцагчийн удирдлага',
        icon: HeartHandshake,
        href: '/crm',
        color: '#06b6d4',
        visible: (p) => p.role === 'admin' || !!p.crmAccess,
    },
    {
        id: 'business_plan',
        label: 'Бизнес төлөвлөгөө',
        description: 'Стратеги, OKR, KPI, гүйцэтгэл',
        icon: Target,
        href: '/business-plan',
        color: '#6366f1',
        visible: (p) => p.role === 'admin' || !!p.businessPlanAccess,
    },
    {
        id: 'projects',
        label: 'Төслүүд',
        description: 'Төсөл, даалгавар, Gantt',
        icon: FolderKanban,
        href: '/projects',
        color: '#e11d48',
        visible: (p) => p.role === 'admin' || !!p.projectsAccess,
    },
    {
        id: 'meetings',
        label: 'Хурлын өрөө',
        description: 'Хурлын өрөөний захиалга',
        icon: DoorOpen,
        href: '/meetings',
        color: '#f97316',
        visible: (p) => p.role === 'admin' || !!p.meetingsAccess,
    },
    {
        id: 'company',
        label: 'Компани',
        description: 'Компанийн бүртгэл, бодлого, түүх',
        icon: Building2,
        href: '/company',
        color: '#64748b',
        visible: (p) => p.role === 'admin' || !!p.companyAccess,
    },
    {
        id: 'official_letters',
        label: 'Албан бичиг',
        description: 'Албан бланк, загвар',
        icon: Stamp,
        href: '/official-letters',
        color: '#b45309',
        visible: (p) => p.role === 'admin' || !!p.officialLettersAccess,
    },
];

interface PortalSwitcherProps {
    /** Идэвхтэй портал. Энэ нь dropdown-д check тэмдэг + highlight харагдана. */
    currentPortalId?: PortalId;
    /** Сэгсгэлийн товчны хэлбэр. Default 'icon'. */
    variant?: 'icon' | 'button';
    className?: string;
}

export function PortalSwitcher({
    currentPortalId,
    variant = 'icon',
    className,
}: PortalSwitcherProps) {
    const router = useRouter();
    const { employeeProfile } = useEmployeeProfile();

    const accessible = React.useMemo(() => {
        if (!employeeProfile) return PORTALS;
        return PORTALS.filter((p) => p.visible(employeeProfile));
    }, [employeeProfile]);

    // Хэрэв нэг л портал үзэх эрхтэй бол switcher харуулах нь утгагүй
    if (accessible.length <= 1) return null;

    const current = currentPortalId
        ? PORTALS.find((p) => p.id === currentPortalId)
        : undefined;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {variant === 'button' ? (
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn('gap-2', className)}
                        aria-label="Портал шилжүүлэх"
                    >
                        {current ? (
                            <>
                                <current.icon
                                    className="h-3.5 w-3.5"
                                    style={{ color: current.color }}
                                />
                                <span className="truncate">{current.label}</span>
                            </>
                        ) : (
                            <>
                                <Grid3x3 className="h-3.5 w-3.5" />
                                <span>Портал</span>
                            </>
                        )}
                    </Button>
                ) : (
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        className={className}
                        aria-label="Портал шилжүүлэх"
                    >
                        <Grid3x3 className="h-4 w-4" />
                    </Button>
                )}
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-72 p-1.5">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 py-1.5">
                    Портал шилжүүлэх
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="mb-1" />

                {accessible.map((p) => {
                    const isActive = p.id === currentPortalId;
                    const Icon = p.icon;
                    return (
                        <DropdownMenuItem
                            key={p.id}
                            onSelect={() => {
                                if (!isActive) router.push(p.href);
                            }}
                            disabled={isActive}
                            className={cn(
                                'flex items-start gap-2.5 px-2 py-2 cursor-pointer rounded-md',
                                isActive && 'bg-muted/60',
                            )}
                        >
                            <div
                                className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                                style={{ backgroundColor: `${p.color}15`, color: p.color }}
                            >
                                <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={cn(
                                            'text-sm',
                                            isActive ? 'font-semibold' : 'font-medium',
                                        )}
                                    >
                                        {p.label}
                                    </span>
                                    {isActive && (
                                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                            Идэвхтэй
                                        </span>
                                    )}
                                </div>
                                <div className="text-[11px] text-muted-foreground truncate">
                                    {p.description}
                                </div>
                            </div>
                            {isActive && (
                                <Check
                                    className="h-3.5 w-3.5 mt-2.5 shrink-0"
                                    style={{ color: p.color }}
                                />
                            )}
                        </DropdownMenuItem>
                    );
                })}

                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                    onSelect={() => router.push('/')}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground cursor-pointer"
                >
                    <Orbit className="h-3.5 w-3.5" />
                    Бүх портал (Орбит харах)
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
