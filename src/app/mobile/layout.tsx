'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Settings, Calendar, LogOut } from 'lucide-react';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';

const navItems = [
  { href: '/mobile/home', label: 'Нүүр', icon: Home },
  { href: '/mobile/time-off', label: 'Чөлөө', icon: Calendar },
  { href: '/mobile/settings', label: 'Тохиргоо', icon: Settings },
];

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { employeeProfile, isUserLoading, isProfileLoading } = useEmployeeProfile();
  const isLoading = isUserLoading || isProfileLoading;
    
  React.useEffect(() => {
    // Wait until loading is complete before making any decisions
    if (isLoading) {
      return;
    }
    // After loading, if user is not an employee, redirect to login.
    if (!employeeProfile || employeeProfile.role !== 'employee') {
      router.replace('/login');
    }
  }, [employeeProfile, isLoading, router]);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/login');
  };

  if (isLoading || !employeeProfile || employeeProfile.role !== 'employee') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-muted/20">
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-background shadow-t-lg">
        <div className="mx-auto flex h-16 max-w-md items-center justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 text-xs transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-primary'
                }`}
              >
                <item.icon
                  className="h-6 w-6"
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
           <button
              onClick={handleLogout}
              className="flex flex-col items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              <LogOut className="h-6 w-6" />
              <span>Гарах</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
