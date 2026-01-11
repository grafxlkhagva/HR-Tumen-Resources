'use client';

import * as React from 'react';
import { useUser, useMemoFirebase, useDoc, useFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import Link from 'next/link';
import { Loader2, Home, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { UserNav } from '@/components/user-nav';

interface CompanyProfile {
  name?: string;
  logoUrl?: string;
}

function AdminDashboard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { firestore } = useFirebase();

  // Fetch Company Profile Globally
  const companyProfileRef = useMemoFirebase(() => (firestore ? doc(firestore, 'company', 'profile') : null), [firestore]);
  const { data: companyProfile, isLoading: isLoadingProfile } = useDoc<CompanyProfile>(companyProfileRef);

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-xs text-muted-foreground text-center">
          Ачаалж байна...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-muted/5">
      {/* Global Header */}
      <header className="flex-none sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="h-9 w-9 text-muted-foreground hover:text-foreground">
              <Link href="/dashboard">
                <Home className="h-5 w-5" />
                <span className="sr-only">Нүүр хуудас</span>
              </Link>
            </Button>
            <div className="h-5 w-px bg-border/60" />
            <Link href="/dashboard/company" className="inline-block transition-opacity hover:opacity-80">
              <div className="flex items-center gap-3">
                {isLoadingProfile ? (
                  <>
                    <Skeleton className="size-8 rounded-lg" />
                    <Skeleton className="h-5 w-24" />
                  </>
                ) : (
                  <>
                    <Avatar className="size-8 rounded-lg border">
                      <AvatarImage src={companyProfile?.logoUrl} className="object-contain" />
                      <AvatarFallback className="rounded-lg bg-muted">
                        <Building className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                    <h1 className="text-sm font-semibold tracking-tight text-foreground">{companyProfile?.name || 'Компани'}</h1>
                  </>
                )}
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <UserNav />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto flex flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminDashboard>{children}</AdminDashboard>;
}
