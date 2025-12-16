'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { MainNav } from '@/app/main-nav';
import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Search, Loader2, LogOut, Building } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useUser, useAuth, useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { doc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

interface CompanyProfile {
    name?: string;
    logoUrl?: string;
}

function AdminDashboard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const auth = useAuth();

  const companyProfileRef = useMemoFirebase(
    ({firestore}) => (firestore ? doc(firestore, 'company', 'profile') : null),
    []
  );
  const { data: companyProfile, isLoading: isLoadingProfile } = useDoc<CompanyProfile>(companyProfileRef);
    
  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/login');
  };

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            {isLoadingProfile ? (
              <>
                <Skeleton className="size-7 rounded-sm" />
                <Skeleton className="h-5 w-24" />
              </>
            ) : companyProfile?.logoUrl ? (
                <Avatar className="size-7 rounded-sm">
                    <AvatarImage src={companyProfile.logoUrl} className="object-contain" />
                    <AvatarFallback className="rounded-sm bg-muted">
                        <Building className="size-4" />
                    </AvatarFallback>
                </Avatar>
            ) : (
              <Logo className="size-7 text-primary" />
            )}
            <span className="text-lg font-semibold">{companyProfile?.name || 'Teal HR'}</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <MainNav />
        </SidebarContent>
        <SidebarFooter>
            <UserNav />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <SidebarTrigger />
        </header>
        <main className="flex-1 p-4 sm:px-6 sm:py-0">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminDashboard>{children}</AdminDashboard>;
}
