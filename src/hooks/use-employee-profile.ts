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
  deviceId?: string;
  positionId?: string;
  // Add other fields as needed
};

export const useEmployeeProfile = () => {
  const { user, isUserLoading, userError } = useUser();

  const employeeDocRef = useMemoFirebase(
    ({ firestore, user: memoizedUser }) => (firestore && memoizedUser ? doc(firestore, 'employees', memoizedUser.uid) : null),
    []
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
