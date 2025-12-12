// src/app/api/update-user-status/route.ts
import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Ensure Firebase Admin is initialized
if (getApps().length === 0) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);
    initializeApp({
        credential: cert(serviceAccount),
    });
}

export async function POST(request: Request) {
    try {
        const { uid, disabled } = await request.json();

        if (!uid || typeof disabled !== 'boolean') {
            return NextResponse.json({ error: 'Missing uid or disabled status' }, { status: 400 });
        }

        await getAuth().updateUser(uid, {
            disabled: disabled,
        });

        return NextResponse.json({ success: true, message: `User ${uid} status updated to disabled: ${disabled}` });
    } catch (error: any) {
        console.error('Error updating user status:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
