/**
 * bp-session-types.ts
 * ────────────────────
 * Client-side-д ашиглаж болох type/const.
 * firebase-admin import байхгүй.
 */

export const BP_SESSIONS_COLLECTION = 'bp_ai_sessions';

export interface BpSessionDecision {
  date: string;
  action: string;
  objectId?: string;
}

export interface BpSessionData {
  companyId: string;
  userId: string;
  summary: string;
  keyDecisions: BpSessionDecision[];
  pendingActions: string[];
  messageCount: number;
  lastActiveAt: string;
  createdAt: string;
}
