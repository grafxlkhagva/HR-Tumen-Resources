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
    if (isUserLoading) {
      return; // Wait until user status is resolved
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    // User is logged in, fetch their role and redirect
    const checkUserRoleAndRedirect = async () => {
      if (!firestore) return;
      const userDocRef = doc(firestore, 'employees', user.uid);
      try {
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role === 'admin') {
            router.replace('/dashboard');
          } else {
            router.replace('/mobile/home');
          }
        } else {
          // Fallback if doc doesn't exist, maybe redirect to login
          console.error("User document not found for UID:", user.uid);
          router.replace('/login');
        }
      } catch (error) {
        console.error("Error fetching user role, redirecting to login", error);
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
