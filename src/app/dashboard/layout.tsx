'use client';

import * as React from 'react';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';


function AdminDashboard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

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
          Ачаалж байна...<br />
          <span className="opacity-50">(Auth: {isUserLoading ? 'Хүлээж байна' : 'Дууссан'}, User: {user ? 'Нэвтэрсэн' : 'Байхгүй'})</span>
        </div>
        {!isUserLoading && !user && (
          <button
            className="px-4 py-2 text-sm border rounded hover:bg-accent"
            onClick={() => router.push('/login')}
          >
            Нэвтрэх хэсэг рүү шилжих
          </button>
        )}
        <div className="mt-8">
          <button
            className="text-[10px] opacity-30 hover:opacity-100 px-2 py-1"
            onClick={() => router.push('/login')}
          >
            Гацсан бол энд дарж нэвтрэх хуудас руу очих
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 p-4 sm:px-6 sm:py-0">{children}</main>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminDashboard>{children}</AdminDashboard>;
}
