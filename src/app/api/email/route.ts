// src/app/api/email/route.ts
import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { Resend } from 'resend';

// Initialize Firebase for Server Side
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const firestore = getFirestore(app);

// Initialize Resend (will use RESEND_API_KEY from environment)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface EmailRequest {
    to: string;
    subject: string;
    html?: string;
    text?: string;
    from?: string;
    fromName?: string;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { to, subject, html, text, from, fromName }: EmailRequest = body;

        if (!to || !subject || (!html && !text)) {
            return NextResponse.json(
                { error: 'Missing required fields: to, subject, and html/text' },
                { status: 400 }
            );
        }

        console.log(`[API/Email] Sending email to ${to}`);
        console.log(`[API/Email] Subject: ${subject}`);

        // 1. Get Email Settings from Firestore (optional - for custom from address)
        const emailSettingsRef = doc(firestore, 'company', 'emailSettings');
        const emailSettingsSnap = await getDoc(emailSettingsRef);

        let emailConfig: any = null;
        if (emailSettingsSnap.exists()) {
            emailConfig = emailSettingsSnap.data();
        }

        // Get company profile for default from name
        const companyProfileRef = doc(firestore, 'company', 'profile');
        const companyProfileSnap = await getDoc(companyProfileRef);
        const companyProfile = companyProfileSnap.exists() ? companyProfileSnap.data() : null;
        const companyName = companyProfile?.name || 'HR System';

        // Determine from address and name
        const fromEmail = from || emailConfig?.fromEmail || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        const fromEmailName = fromName || emailConfig?.fromName || companyName;

        // Check if Resend API key is configured
        if (!process.env.RESEND_API_KEY || !resend) {
            console.warn('[API/Email] RESEND_API_KEY not found in environment variables. Simulating success.');
            console.log(`
            ====================================================
            EMAIL SIMULATION (Resend not configured)
            TO: ${to}
            FROM: ${fromEmailName} <${fromEmail}>
            SUBJECT: ${subject}
            ${html ? 'HTML:' : 'TEXT:'}
            ${html || text}
            ====================================================
            
            To enable real email sending:
            1. Sign up at https://resend.com
            2. Get your API key from https://resend.com/api-keys
            3. Add RESEND_API_KEY=re_xxxxx to your .env.local file
            4. Optionally add RESEND_FROM_EMAIL=noreply@yourdomain.com
            `);
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 800));
            
            return NextResponse.json({
                success: true,
                status: 'simulated_success',
                note: 'RESEND_API_KEY not configured. Add it to .env.local to send real emails.'
            });
        }

        // Send email using Resend
        try {
            const { data, error } = await resend.emails.send({
                from: `${fromEmailName} <${fromEmail}>`,
                to: [to],
                subject: subject,
                html: html || undefined,
                text: text || undefined,
            });

            if (error) {
                console.error('[API/Email] Resend Error:', error);
                return NextResponse.json(
                    { 
                        error: 'Failed to send email',
                        details: error.message || 'Unknown Resend error'
                    },
                    { status: 400 }
                );
            }

            console.log('[API/Email] Email sent successfully via Resend:', data?.id);
            return NextResponse.json({
                success: true,
                status: 'sent',
                messageId: data?.id,
                to: to
            });

        } catch (resendError: any) {
            console.error('[API/Email] Resend Exception:', resendError);
            return NextResponse.json(
                { 
                    error: 'Email service error',
                    details: resendError.message || 'Unknown error'
                },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error('[API/Email] Server Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
