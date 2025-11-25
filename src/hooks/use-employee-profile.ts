'use client';

import { useUser, useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export type EmployeeProfile = {
  id: string;
  role: 'admin' | 'employee';
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  employeeCode: string;
  avatarId?: string;
  photoURL?: string;
  // Add other fields as needed
};

export const useEmployeeProfile = () => {
  const { user, isUserLoading, userError } = useUser();
  const { firestore } = useFirebase();

  const employeeDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'employees', user.uid) : null),
    [firestore, user]
  );

  const {
    data: employeeProfile,
    isLoading: isProfileLoading,
    error: profileError,
  } = useDoc<EmployeeProfile>(employeeDocRef);

  return {
    user,
    employeeProfile,
    isUserLoading,
    isProfileLoading,
    error: userError || profileError,
  };
};
