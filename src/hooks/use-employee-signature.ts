'use client';

import { doc, setDoc } from 'firebase/firestore';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';

export interface EmployeeSignature {
    dataUrl: string; // PNG data URL (canvas-аас)
    updatedAt: number;
}

/**
 * Ажилтны дахин ашиглагдах гарын үсэг — employees/{uid}/meta/signature дор хадгална.
 * Одоо байгаа Firestore дүрэм (employees дэд коллекц: эзэмшигч бичих) хамарна — deploy шаардлагагүй.
 */
export function useEmployeeSignature() {
    const { firestore } = useFirebase();
    const { employeeProfile } = useEmployeeProfile();
    const uid = employeeProfile?.id;

    const sigRef = useMemoFirebase(
        () => (firestore && uid ? doc(firestore, `employees/${uid}/meta/signature`) : null),
        [firestore, uid],
    );
    const { data: signature, isLoading } = useDoc<EmployeeSignature>(sigRef);

    const saveSignature = async (dataUrl: string) => {
        if (!firestore || !uid) return;
        await setDoc(
            doc(firestore, `employees/${uid}/meta/signature`),
            { dataUrl, updatedAt: Date.now() },
            { merge: true },
        );
    };

    return { signature, isLoading, saveSignature, uid };
}
