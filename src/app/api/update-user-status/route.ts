// src/app/api/update-user-status/route.ts
import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Ensure Firebase Admin is initialized only once
if (getApps().length === 0) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
        try {
            const serviceAccount = JSON.parse(serviceAccountKey);
            initializeApp({
                credential: cert(serviceAccount),
            });
        } catch (e) {
            console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e);
        }
    } else {
        console.warn('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Admin SDK features will not be available.');
    }
}

function isAdminSDKInitialized() {
    return getApps().some(app => app.name === '[DEFAULT]');
}

export async function POST(request: Request) {
    if (!isAdminSDKInitialized()) {
        const errorMessage = 'Firebase Admin SDK is not initialized. Please configure the service account key.';
        console.error(errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

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
