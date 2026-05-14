import { getAuth } from 'firebase/auth';
import { initializeFirebase } from '@/firebase';

async function getAuthToken(): Promise<string | null> {
    try {
        const { firebaseApp } = initializeFirebase();
        const auth = getAuth(firebaseApp);
        const user = auth.currentUser;
        if (!user) return null;
        return await user.getIdToken();
    } catch { return null; }
}

export async function missionAuthFetch(url: string, init: RequestInit = {}): Promise<Response> {
    const token = await getAuthToken();
    if (!token) throw new Error('Нэвтрэлт шаардлагатай');
    return fetch(url, {
        ...init,
        headers: {
            ...(init.headers || {}),
            Authorization: `Bearer ${token}`,
        },
    });
}
