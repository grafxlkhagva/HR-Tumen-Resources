'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirebase, useMemoFirebase, useDoc } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { RoleChoiceDialog } from '@/components/role-choice-dialog';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const router = useRouter();
  const [showRoleChoice, setShowRoleChoice] = React.useState(false);
  const [isCheckingRole, setIsCheckingRole] = React.useState(false);

  // Fetch company profile for dialog
  const companyProfileRef = useMemoFirebase(
    ({ firestore }) => (firestore ? doc(firestore, 'company', 'profile') : null),
    []
  );
  const { data: companyProfile } = useDoc(companyProfileRef);

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
      if (isCheckingRole) return;
      
      console.log('[Home] User logged in, checking role...');
      if (!firestore) {
        console.warn('[Home] Firestore not available yet');
        return;
      }
      
      setIsCheckingRole(true);
      const userDocRef = doc(firestore, 'employees', user.uid);
      
      try {
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('[Home] User role:', userData.role);
          
          if (userData.role === 'admin') {
            // Admin user - show role choice dialog
            console.log('[Home] Admin user detected, showing role choice');
            setShowRoleChoice(true);
            setIsCheckingRole(false);
          } else {
            // Regular employee - redirect directly
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

  }, [isUserLoading, user, router, firestore, isCheckingRole]);

  const handleChooseAdmin = () => {
    console.log('[Home] User chose admin mode, redirecting to /dashboard');
    setShowRoleChoice(false);
    router.replace('/dashboard');
  };

  const handleChooseEmployee = () => {
    console.log('[Home] User chose employee mode, redirecting to /mobile/home');
    setShowRoleChoice(false);
    router.replace('/mobile/home');
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      {!showRoleChoice && (
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      )}
      
      <RoleChoiceDialog
        open={showRoleChoice}
        onOpenChange={setShowRoleChoice}
        onChooseAdmin={handleChooseAdmin}
        onChooseEmployee={handleChooseEmployee}
        companyName={companyProfile?.name}
      />
    </div>
  );
}
