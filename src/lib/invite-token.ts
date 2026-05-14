/**
 * invite-token.ts
 *
 * One-time invite token utilities for new employee onboarding.
 *
 * Instead of emailing plaintext passwords, we generate a secure token,
 * store it in Firestore, and email a link. The employee clicks the link
 * and sets their own password.
 */

import { doc, setDoc, Timestamp } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

/** How long an invite token is valid (48 hours) */
const TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

export interface InviteTokenData {
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    authEmail: string;
    companyId: string;
    createdAt: Timestamp;
    expiresAt: Timestamp;
    used: boolean;
    usedAt?: Timestamp;
}

/**
 * Generate a cryptographically secure invite token (URL-safe, 48 chars).
 */
export function generateInviteToken(): string {
    const bytes = new Uint8Array(36);
    crypto.getRandomValues(bytes);
    // Base64url encode
    const base64 = btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    return base64;
}

/**
 * Store invite token in Firestore (client-side, called from add-employee dialog).
 *
 * Stored at top-level `invite_tokens/{token}` so the public invite page
 * can read it without tenant context.
 */
export async function storeInviteToken(
    firestore: Firestore,
    token: string,
    data: Omit<InviteTokenData, 'createdAt' | 'expiresAt' | 'used'>,
): Promise<void> {
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(now.toMillis() + TOKEN_TTL_MS);

    await setDoc(doc(firestore, 'invite_tokens', token), {
        ...data,
        createdAt: now,
        expiresAt,
        used: false,
    } satisfies InviteTokenData);
}

/**
 * Build the invite URL for the email.
 */
export function buildInviteUrl(appUrl: string, token: string): string {
    return `${appUrl}/invite?token=${encodeURIComponent(token)}`;
}
