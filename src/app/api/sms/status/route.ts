import { NextResponse } from 'next/server';

export async function GET() {
    const hasEnvToken = !!process.env.MOCEAN_API_TOKEN;
    return NextResponse.json({
        envConfigured: hasEnvToken,
        senderId: process.env.MOCEAN_SENDER_ID || null,
    });
}
