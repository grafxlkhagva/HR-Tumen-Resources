'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, deleteApp, FirebaseApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut, Auth } from 'firebase/auth';

const SECONDARY_APP_NAME = 'HR_SECONDARY_AUTH';

/**
 * Secondary Firebase App-ийг ашиглан шинэ хэрэглэгч үүсгэнэ.
 * Энэ нь админы session-д нөлөөлөхгүй.
 */
export async function createUserWithSecondaryAuth(
    email: string,
    password: string
): Promise<{ uid: string; email: string | null }> {
    let secondaryApp: FirebaseApp | null = null;
    let secondaryAuth: Auth | null = null;

    try {
        // Secondary app байгаа эсэхийг шалгах
        const existingApp = getApps().find(app => app.name === SECONDARY_APP_NAME);
        
        if (existingApp) {
            secondaryApp = existingApp;
        } else {
            // Шинэ secondary app үүсгэх
            secondaryApp = initializeApp(firebaseConfig, SECONDARY_APP_NAME);
        }

        secondaryAuth = getAuth(secondaryApp);

        // Шинэ хэрэглэгч үүсгэх (secondary app дээр)
        const userCredential = await createUserWithEmailAndPassword(
            secondaryAuth,
            email,
            password
        );

        const newUser = userCredential.user;

        // Secondary app дээрээс sign out хийх
        await signOut(secondaryAuth);

        return {
            uid: newUser.uid,
            email: newUser.email,
        };
    } catch (error: any) {
        // Sign out хийх (хэрэв нэвтэрсэн бол)
        if (secondaryAuth) {
            try {
                await signOut(secondaryAuth);
            } catch (e) {
                // Ignore signout errors
            }
        }

        // Алдааг дамжуулах
        throw error;
    }
}

/**
 * Secondary app-ийг устгах (cleanup хийхэд хэрэглэж болно)
 */
export async function cleanupSecondaryApp(): Promise<void> {
    const existingApp = getApps().find(app => app.name === SECONDARY_APP_NAME);
    if (existingApp) {
        try {
            await deleteApp(existingApp);
        } catch (e) {
            console.warn('Failed to cleanup secondary app:', e);
        }
    }
}
