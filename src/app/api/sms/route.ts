import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase for Server Side (if not already)
// Note: In Next.js App Router, global scope variables persist across requests in lambda warm start.
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const firestore = getFirestore(app);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { to, text } = body;

        if (!to || !text) {
            return NextResponse.json({ error: 'Missing phone number or text' }, { status: 400 });
        }

        console.log(`[API/SMS] Sending to ${to}`);

        // 1. Get Settings from Firestore
        const settingsRef = doc(firestore, 'recruitment_settings', 'default');
        const settingsSnap = await getDoc(settingsRef);

        // Default to mock if settings are completely missing or document doesn't exist
        let smsConfig = null;
        if (settingsSnap.exists()) {
            smsConfig = settingsSnap.data().smsConfig;
        }

        if (!smsConfig || !smsConfig.apiKey || !smsConfig.apiSecret) {
            // Fallback: If no config is present, we pretend it worked to avoid breaking the UI for demo purposes.
            // In production, you might want to throw an error here.
            console.warn('[API/SMS] No Mocean configuration found in Firestore. Simulating success.');
            await new Promise(resolve => setTimeout(resolve, 800));
            return NextResponse.json({
                success: true,
                status: 'simulated_success',
                note: 'Configure Mocean API in Recruitment Settings to send real SMS.'
            });
        }

        const { apiKey, apiSecret, senderId } = smsConfig;

        // 2. Call Mocean REST API
        // https://rest.moceanapi.com/rest/2/sms
        const params = new URLSearchParams();
        params.append('mocean-api-key', apiKey);
        params.append('mocean-api-secret', apiSecret);
        params.append('mocean-from', senderId || 'Mocean'); // Default sender ID
        params.append('mocean-to', to);
        params.append('mocean-text', text);
        params.append('mocean-resp-format', 'json');
        params.append('mocean-medium', 'moceanapi'); // Optional source indicator

        const response = await fetch('https://rest.moceanapi.com/rest/2/sms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        const result = await response.json();

        // Mocean API returns status '0' for success
        if (result.messages && result.messages[0].status === '0') {
            console.log('[API/SMS] Sent successfully via Mocean:', result.messages[0].msgid);
            return NextResponse.json({ success: true, apiResponse: result });
        } else {
            console.error('[API/SMS] Mocean Error:', result);
            const errorMsg = result.messages ? result.messages[0].err_msg : 'Unknown Mocean Error';
            return NextResponse.json({
                error: 'Mocean API Error',
                details: errorMsg
            }, { status: 400 });
        }

    } catch (error: any) {
        console.error('[API/SMS] Server Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
