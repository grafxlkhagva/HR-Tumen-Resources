'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Loader2,
    HeartHandshake,
    Users,
    Building2,
    Briefcase,
    LifeBuoy,
    ListChecks,
    LogOut,
    ShieldAlert,
    Search,
    Package,
    FileSpreadsheet,
    Mail,
    BarChart3,
    Upload,
} from 'lucide-react';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { cn } from '@/lib/utils';

type NavItem = {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
};

const navSections: { title: string; items: NavItem[] }[] = [
    {
        title: 'CRM',
        items: [
            { href: '/crm/contacts', label: 'Харилцагчид', icon: Users },
            { href: '/crm/companies', label: 'Байгууллагууд', icon: Building2 },
            { href: '/crm/deals', label: 'Гэрээ', icon: Briefcase },
            { href: '/crm/tickets', label: 'Дэмжлэг', icon: LifeBuoy },
            { href: '/crm/activities', label: 'Үйл ажиллагаа', icon: ListChecks },
        ],
    },
    {
        title: 'Sales',
        items: [
            { href: '/crm/products', label: 'Бараа/Үйлчилгээ', icon: Package },
            { href: '/crm/quotes', label: 'Үнийн санал', icon: FileSpreadsheet },
            { href: '/crm/email-templates', label: 'Имэйл загвар', icon: Mail },
        ],
    },
    {
        title: 'Insights',
        items: [
            { href: '/crm/reports', label: 'Тайлан', icon: BarChart3 },
        ],
    },
    {
        title: 'Tools',
        items: [
            { href: '/crm/import', label: 'HubSpot импорт', icon: Upload },
        ],
    },
];

function CrmShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const auth = useAuth();
    const { user, isUserLoading } = useUser();
    const { employeeProfile, isProfileLoading } = useEmployeeProfile();
    const [isLoggingOut, setIsLoggingOut] = React.useState(false);

    const hasAccess = React.useMemo(() => {
        if (!employeeProfile) return null;
        return employeeProfile.role === 'admin' || !!employeeProfile.crmAccess;
    }, [employeeProfile]);

    React.useEffect(() => {
        if (isUserLoading) return;
        if (!user) {
            router.replace('/login');
            return;
        }
        if (employeeProfile && hasAccess === false) {
            router.replace('/');
        }
    }, [user, isUserLoading, router, employeeProfile, hasAccess]);

    const handleLogout = React.useCallback(async () => {
        if (!auth || isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            await signOut(auth);
            router.replace('/login');
        } finally {
            setIsLoggingOut(false);
        }
    }, [auth, isLoggingOut, router]);

    if (isUserLoading || !user || isProfileLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-muted/30">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (hasAccess === false) {
        return (
            <div className="flex h-screen items-center justify-center bg-muted/30">
                <div className="text-center space-y-4">
                    <div className="mx-auto h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
                        <ShieldAlert className="h-7 w-7 text-destructive" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">Хандах эрхгүй</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            CRM модулд нэвтрэх эрх олгогдоогүй байна.
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => router.replace('/')}>
                        Нүүр хуудас руу буцах
                    </Button>
                </div>
            </div>
        );
    }

    const displayName =
        employeeProfile?.firstName && employeeProfile?.lastName
            ? `${employeeProfile.firstName} ${employeeProfile.lastName}`
            : user?.email ?? user?.displayName ?? 'Хэрэглэгч';

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <aside className="flex w-60 flex-col border-r bg-muted/30">
                <div className="flex h-14 items-center gap-2 border-b px-4">
                    <Link href="/crm" className="flex items-center gap-2 font-semibold">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10">
                            <HeartHandshake className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <span>CRM</span>
                    </Link>
                </div>

                <div className="px-3 py-3 border-b">
                    <button
                        type="button"
                        className="w-full flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground hover:border-primary/30 transition-colors"
                        disabled
                        aria-label="Хайх"
                    >
                        <Search className="h-4 w-4" />
                        <span>Хайх...</span>
                        <span className="ml-auto text-[10px] text-muted-foreground/60">⌘K</span>
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto p-3 space-y-4">
                    {navSections.map((section) => (
                        <div key={section.title} className="space-y-1">
                            <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                                {section.title}
                            </div>
                            {section.items.map(({ href, label, icon: Icon }) => {
                                const isActive =
                                    pathname === href || pathname.startsWith(`${href}/`);
                                return (
                                    <Link
                                        key={href}
                                        href={href}
                                        className={cn(
                                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                            isActive
                                                ? 'bg-cyan-600 text-white hover:bg-cyan-600/90'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        )}
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        {label}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                <div className="border-t p-3">
                    <div className="mb-2 flex items-center gap-3 rounded-lg px-2 py-2">
                        <Avatar className="h-8 w-8 rounded-lg">
                            <AvatarImage src={user.photoURL ?? undefined} />
                            <AvatarFallback className="rounded-lg text-xs">
                                {displayName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{displayName}</div>
                            <div className="truncate text-[11px] text-muted-foreground">
                                {employeeProfile?.role === 'admin' ? 'Админ' : 'CRM хэрэглэгч'}
                            </div>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 text-muted-foreground"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                    >
                        {isLoggingOut ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <LogOut className="h-4 w-4" />
                        )}
                        Гарах
                    </Button>
                </div>
            </aside>

            <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
        </div>
    );
}

export default function CrmLayout({ children }: { children: React.ReactNode }) {
    return <CrmShell>{children}</CrmShell>;
}
