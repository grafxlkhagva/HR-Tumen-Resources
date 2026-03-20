'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, Newspaper, LogOut, PenSquare, ShieldAlert } from 'lucide-react';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/news/posts', label: 'Нийтлэлүүд', icon: Newspaper },
  { href: '/news/posts/add', label: 'Шинэ нийтлэл', icon: PenSquare },
] as const;

function NewsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { employeeProfile } = useEmployeeProfile();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  React.useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (employeeProfile && employeeProfile.role !== 'admin' && !employeeProfile.newsAccess) {
      router.replace('/');
    }
  }, [user, isUserLoading, router, employeeProfile]);

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

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (employeeProfile && employeeProfile.role !== 'admin' && !employeeProfile.newsAccess) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted/30">
        <div className="text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-7 w-7 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Хандах эрхгүй</h2>
            <p className="text-sm text-muted-foreground mt-1">Мэдээлэл системд нэвтрэх эрх олгогдоогүй байна.</p>
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
      <aside className="flex w-56 flex-col border-r bg-muted/30">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <Link href="/news" className="flex items-center gap-2 font-semibold">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10">
              <Newspaper className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <span>Мэдээлэл</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href === '/news/posts' && pathname.startsWith('/news/posts/edit'));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={user.photoURL ?? undefined} />
              <AvatarFallback className="rounded-lg text-xs">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm font-medium">{displayName}</span>
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

      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return <NewsShell>{children}</NewsShell>;
}
