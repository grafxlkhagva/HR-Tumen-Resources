'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { employeeProfile, isUserLoading, isProfileLoading } = useEmployeeProfile();
  const router = useRouter();
  const isLoading = isUserLoading || isProfileLoading;

  React.useEffect(() => {
    // Do not perform any action while authentication and profile data are loading.
    if (isLoading) {
      return;
    }

    // Once loading is complete, decide where to redirect.
    if (employeeProfile) {
      if (employeeProfile.role === 'admin') {
        router.replace('/dashboard');
      } else if (employeeProfile.role === 'employee') {
        router.replace('/mobile/home');
      } else {
        // If role is undefined or something else, default to login.
        router.replace('/login');
      }
    } else {
      // If there is no user profile after loading, they need to log in.
      router.replace('/login');
    }
  }, [isLoading, employeeProfile, router]);
  
  // Display a full-screen loader while determining the user's status and destination.
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
