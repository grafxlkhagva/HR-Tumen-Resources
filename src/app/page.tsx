'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const router = useRouter();

  React.useEffect(() => {
    console.log('[Home] Effect triggered - isUserLoading:', isUserLoading, 'user:', user ? 'logged in' : 'not logged in');

    if (isUserLoading) {
      console.log('[Home] Still loading user auth state...');
      return; // Wait until user status is resolved
    }

    if (!user) {
      console.log('[Home] No user found, redirecting to /login');
      router.replace('/login');
      return;
    }

    // User is logged in, fetch their role and redirect
    const checkUserRoleAndRedirect = async () => {
      console.log('[Home] User logged in, checking role...');
      if (!firestore) {
        console.warn('[Home] Firestore not available yet');
        return;
      }
      const userDocRef = doc(firestore, 'employees', user.uid);
      try {
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('[Home] User role:', userData.role);
          if (userData.role === 'admin') {
            console.log('[Home] Redirecting to /dashboard');
            router.replace('/dashboard');
          } else {
            console.log('[Home] Redirecting to /mobile/home');
            router.replace('/mobile/home');
          }
        } else {
          // Fallback if doc doesn't exist, maybe redirect to login
          console.error("[Home] User document not found for UID:", user.uid);
          router.replace('/login');
        }
      } catch (error) {
        console.error("[Home] Error fetching user role, redirecting to login", error);
        router.replace('/login');
      }
    };

    checkUserRoleAndRedirect();

  }, [isUserLoading, user, router, firestore]);

  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
