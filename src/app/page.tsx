'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  React.useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        // User is logged in, decide where to go.
        // This logic might need to be more sophisticated based on user roles.
        router.replace('/dashboard');
      } else {
        // No user, redirect to login.
        router.replace('/login');
      }
    }
  }, [isUserLoading, user, router]);
  
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
