'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirebase, useMemoFirebase, useDoc } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { RoleChoiceOrbit } from '@/components/role-choice-orbit';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const router = useRouter();
  const [showRoleChoice, setShowRoleChoice] = React.useState(false);
  const [isCheckingRole, setIsCheckingRole] = React.useState(false);
  const [isNavigating, setIsNavigating] = React.useState(false);
  const [userFlags, setUserFlags] = React.useState<{ isAdmin: boolean; tmsAccess: boolean; newsAccess: boolean; crmAccess: boolean; businessPlanAccess: boolean; projectsAccess: boolean; meetingsAccess: boolean; companyAccess: boolean; officialLettersAccess: boolean }>({ isAdmin: false, tmsAccess: false, newsAccess: false, crmAccess: false, businessPlanAccess: false, projectsAccess: false, meetingsAccess: false, companyAccess: false, officialLettersAccess: false });
  const hasCheckedRole = React.useRef(false);

  // Fetch company profile for dialog
  const companyProfileRef = useMemoFirebase(
    ({ firestore }) => (firestore ? doc(firestore, 'company', 'profile') : null),
    []
  );
  const { data: companyProfile } = useDoc(companyProfileRef);

  React.useEffect(() => {
    // Prevent multiple checks
    if (hasCheckedRole.current || isCheckingRole || isNavigating) return;

    if (isUserLoading) {
      return; // Wait until user status is resolved
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    // User is logged in, fetch their role and redirect
    const checkUserRoleAndRedirect = async () => {
      if (!firestore) {
        return;
      }
      
      hasCheckedRole.current = true;
      setIsCheckingRole(true);
      
      const userDocRef = doc(firestore, 'employees', user.uid);
      
      try {
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          if (userData.role === 'admin' || userData.tmsAccess || userData.newsAccess || userData.crmAccess || userData.businessPlanAccess || userData.projectsAccess || userData.meetingsAccess || userData.companyAccess || userData.officialLettersAccess) {
            setUserFlags({
              isAdmin: userData.role === 'admin',
              tmsAccess: !!userData.tmsAccess,
              newsAccess: !!userData.newsAccess,
              crmAccess: !!userData.crmAccess,
              businessPlanAccess: !!userData.businessPlanAccess,
              projectsAccess: !!userData.projectsAccess,
              meetingsAccess: !!userData.meetingsAccess,
              companyAccess: !!userData.companyAccess,
              officialLettersAccess: !!userData.officialLettersAccess,
            });
            setShowRoleChoice(true);
          } else {
            // Regular employee - redirect directly
            setIsNavigating(true);
            router.replace('/mobile/home');
          }
        } else {
          // Fallback if doc doesn't exist
          router.replace('/login');
        }
      } catch (error) {
        console.error("[Home] Error fetching user role", error);
        router.replace('/login');
      } finally {
        setIsCheckingRole(false);
      }
    };

    checkUserRoleAndRedirect();

  }, [isUserLoading, user, router, firestore, isCheckingRole, isNavigating]);

  const handleChooseAdmin = React.useCallback(() => {
    setIsNavigating(true);
    router.replace('/dashboard');
  }, [router]);

  const handleChooseEmployee = React.useCallback(() => {
    setIsNavigating(true);
    router.replace('/mobile/home');
  }, [router]);

  const handleChooseTms = React.useCallback(() => {
    setIsNavigating(true);
    router.replace('/tms');
  }, [router]);

  const handleChooseNews = React.useCallback(() => {
    setIsNavigating(true);
    router.replace('/news');
  }, [router]);

  const handleChooseCrm = React.useCallback(() => {
    setIsNavigating(true);
    router.replace('/crm');
  }, [router]);

  const handleChooseBusinessPlan = React.useCallback(() => {
    setIsNavigating(true);
    router.replace('/business-plan');
  }, [router]);

  const handleChooseProjects = React.useCallback(() => {
    setIsNavigating(true);
    router.replace('/projects');
  }, [router]);

  const handleChooseMeetings = React.useCallback(() => {
    setIsNavigating(true);
    router.replace('/meetings');
  }, [router]);

  const handleChooseCompany = React.useCallback(() => {
    setIsNavigating(true);
    router.replace('/company');
  }, [router]);

  const handleChooseOfficialLetters = React.useCallback(() => {
    setIsNavigating(true);
    router.replace('/official-letters');
  }, [router]);

  if (showRoleChoice) {
    return (
      <RoleChoiceOrbit
        onChooseAdmin={userFlags.isAdmin ? handleChooseAdmin : undefined}
        onChooseEmployee={handleChooseEmployee}
        onChooseTms={userFlags.tmsAccess || userFlags.isAdmin ? handleChooseTms : undefined}
        onChooseNews={userFlags.newsAccess || userFlags.isAdmin ? handleChooseNews : undefined}
        onChooseCrm={userFlags.crmAccess || userFlags.isAdmin ? handleChooseCrm : undefined}
        onChooseBusinessPlan={userFlags.businessPlanAccess || userFlags.isAdmin ? handleChooseBusinessPlan : undefined}
        onChooseProjects={userFlags.projectsAccess || userFlags.isAdmin ? handleChooseProjects : undefined}
        onChooseMeetings={userFlags.meetingsAccess || userFlags.isAdmin ? handleChooseMeetings : undefined}
        onChooseCompany={userFlags.companyAccess || userFlags.isAdmin ? handleChooseCompany : undefined}
        onChooseOfficialLetters={userFlags.officialLettersAccess || userFlags.isAdmin ? handleChooseOfficialLetters : undefined}
        companyName={(companyProfile as { name?: string } | null)?.name}
        companyLogoUrl={(companyProfile as { logoUrl?: string } | null)?.logoUrl}
      />
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
