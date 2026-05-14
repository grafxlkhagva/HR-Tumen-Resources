'use client';

import * as React from 'react';
import { useUser, useMemoFirebase, useDoc, useFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import Link from 'next/link';
import { Loader2, Home, Building, FolderKanban, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { UserNav } from '@/components/user-nav';
import { PortalSwitcher } from '@/components/portal-switcher';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';

interface CompanyProfile {
    name?: string;
    logoUrl?: string;
}

function ProjectsShell({ children }: { children: React.ReactNode }) {
    const { user, isUserLoading } = useUser();
    const { employeeProfile, isProfileLoading } = useEmployeeProfile();
    const router = useRouter();
    const { firestore } = useFirebase();

    const companyProfileRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'company', 'profile') : null),
        [firestore],
    );
    const { data: companyProfile, isLoading: isLoadingProfile } =
        useDoc<CompanyProfile>(companyProfileRef);

    const hasAccess = React.useMemo(() => {
        if (!employeeProfile) return null;
        return employeeProfile.role === 'admin' || !!employeeProfile.projectsAccess;
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

    if (isUserLoading || !user || isProfileLoading) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-caption text-muted-foreground">Ачаалж байна...</p>
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
                            Төслүүд модулд нэвтрэх эрх олгогдоогүй байна.
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => router.replace('/')}>
                        Нүүр хуудас руу буцах
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
            <header className="flex-none sticky top-0 z-40 w-full border-b bg-background">
                <div className="flex h-14 items-center justify-between gap-4 px-page">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon-sm" asChild>
                            <Link href="/">
                                <Home className="h-4 w-4" />
                                <span className="sr-only">Бүх портал</span>
                            </Link>
                        </Button>
                        <div className="h-4 w-px bg-border" />
                        <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="text-sm font-medium px-2 h-8 gap-1.5"
                        >
                            <Link href="/projects">
                                <FolderKanban className="h-3.5 w-3.5 text-rose-600" />
                                Төслүүд
                            </Link>
                        </Button>
                        <div className="h-4 w-px bg-border" />
                        <div className="inline-flex items-center gap-2">
                            {isLoadingProfile ? (
                                <>
                                    <Skeleton className="h-7 w-7 rounded-md" />
                                    <Skeleton className="h-4 w-20" />
                                </>
                            ) : (
                                <>
                                    <Avatar className="h-7 w-7 rounded-md border">
                                        <AvatarImage
                                            src={companyProfile?.logoUrl}
                                            className="object-contain"
                                        />
                                        <AvatarFallback className="rounded-md bg-muted text-micro">
                                            <Building className="h-3.5 w-3.5" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-body-medium">
                                        {companyProfile?.name || 'Компани'}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <PortalSwitcher currentPortalId="projects" />
                        <UserNav />
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-[1920px] mx-auto flex flex-col overflow-y-auto">
                {children}
            </main>
        </div>
    );
}

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
    return <ProjectsShell>{children}</ProjectsShell>;
}
