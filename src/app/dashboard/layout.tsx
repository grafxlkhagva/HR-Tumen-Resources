'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';

function AdminDashboard({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Logo className="size-7 text-primary" />
            <span className="text-lg font-semibold">Teal HR</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <MainNav />
        </SidebarContent>
        <SidebarFooter>{/* Footer content if any */}</SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <SidebarTrigger className="sm:hidden" />
          <div className="relative ml-auto flex-1 md:grow-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Хайх..."
              className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
            />
          </div>
          <UserNav />
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
  const { employeeProfile, isUserLoading, isProfileLoading } = useEmployeeProfile();
  const router = useRouter();

  const isLoading = isUserLoading || isProfileLoading;

  React.useEffect(() => {
    // Wait until loading is complete before making any decisions
    if (isLoading) {
      return;
    }

    // After loading, if there's no profile, they are not logged in or not an employee
    if (!employeeProfile) {
      router.replace('/login');
      return;
    }

    // If profile exists, check role for redirection
    if (employeeProfile.role === 'employee') {
      router.replace('/mobile/home');
    } else if (employeeProfile.role !== 'admin') {
      // If role is something else, also redirect to login
      router.replace('/login');
    }
    
    // If role is 'admin', do nothing and let the AdminDashboard render
  }, [employeeProfile, isLoading, router]);


  // While loading, or if the user is not an admin yet (or will be redirected), show a spinner.
  // This prevents rendering the admin dashboard for non-admin users before the redirect happens.
  if (isLoading || !employeeProfile || employeeProfile.role !== 'admin') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Only render the admin dashboard if loading is complete and the user is confirmed to be an admin.
  return <AdminDashboard>{children}</AdminDashboard>;
}
