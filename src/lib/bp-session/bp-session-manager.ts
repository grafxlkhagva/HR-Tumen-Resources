/**
 * bp-session-manager.ts
 * ─────────────────────
 * Business Plan AI chat-ийн session memory удирдлага.
 *
 * Collection: companies/{cid}/bp_ai_sessions/{sessionId}
 *   sessionId = `${companyId}_${uid}`  ← нэг байгуулага, нэг хэрэглэгч = нэг session
 *
 * Хадгалах зүйлс:
 *   - summary: Сүүлийн ярианы товч тайлбар (AI-р үүсгэсэн)
 *   - keyDecisions: Хийгдсэн шийдвэрүүд (Objective/KR/KPI үүссэн г.м.)
 *   - pendingActions: Дараагийн хийх зүйлс
 *   - lastActiveAt: Хамгийн сүүлд идэвхтэй байсан цаг
 */

import { getFirebaseAdminFirestore } from '@/lib/firebase-admin';
import {
  BP_SESSIONS_COLLECTION,
  type BpSessionDecision,
  type BpSessionData,
} from './bp-session-types';

export { BP_SESSIONS_COLLECTION, type BpSessionDecision, type BpSessionData } from './bp-session-types';

function sessionId(companyId: string, userId: string): string {
  return `${companyId}_${userId}`;
}

/** Session уншина — байхгүй бол null */
export async function getBpSession(
  companyId: string,
  userId: string,
): Promise<BpSessionData | null> {
  try {
    const db = getFirebaseAdminFirestore();
    const snap = await db
      .doc(`${BP_SESSIONS_COLLECTION}/${sessionId(companyId, userId)}`)
      .get();
    return snap.exists ? (snap.data() as BpSessionData) : null;
  } catch {
    return null;
  }
}

/** Session үүсгэх эсвэл шинэчлэх */
export async function upsertBpSession(
  companyId: string,
  userId: string,
  patch: Partial<Omit<BpSessionData, 'companyId' | 'userId' | 'createdAt'>>,
): Promise<void> {
  try {
    const db = getFirebaseAdminFirestore();
    const ref = db.doc(
      `${BP_SESSIONS_COLLECTION}/${sessionId(companyId, userId)}`
    );
    const existing = await ref.get();
    if (!existing.exists) {
      await ref.set({
        companyId,
        userId,
        summary: '',
        keyDecisions: [],
        pendingActions: [],
        messageCount: 0,
        lastActiveAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        ...patch,
      });
    } else {
      await ref.update({
        ...patch,
        lastActiveAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('[bp-session] upsert failed:', err);
  }
}

/** Шийдвэр нэмэх */
export async function addBpDecision(
  companyId: string,
  userId: string,
  decision: BpSessionDecision,
): Promise<void> {
  try {
    const db = getFirebaseAdminFirestore();
    const ref = db.doc(
      `${BP_SESSIONS_COLLECTION}/${sessionId(companyId, userId)}`
    );
    const snap = await ref.get();
    const existing = snap.exists ? (snap.data() as BpSessionData) : null;
    const decisions = existing?.keyDecisions || [];
    // Хамгийн сүүлийн 20 шийдвэр хадгална
    const updated = [...decisions, decision].slice(-20);
    if (snap.exists) {
      await ref.update({ keyDecisions: updated, lastActiveAt: new Date().toISOString() });
    } else {
      await ref.set({
        companyId, userId, summary: '', keyDecisions: updated,
        pendingActions: [], messageCount: 1,
        lastActiveAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('[bp-session] addDecision failed:', err);
  }
}

/** Session-ийн context-г system prompt-д оруулах форматлана */
export function formatSessionForPrompt(session: BpSessionData | null): string {
  if (!session || (!session.summary && session.keyDecisions.length === 0)) return '';

  const parts: string[] = ['## 💬 Өмнөх ярианы дүн'];

  if (session.summary) {
    parts.push(`**Хамгийн сүүлийн яриа:** ${session.summary}`);
  }

  if (session.keyDecisions.length > 0) {
    const recent = session.keyDecisions.slice(-5);
    parts.push('**Хийгдсэн шийдвэрүүд:**');
    recent.forEach(d => parts.push(`- ${d.date.slice(0, 10)}: ${d.action}`));
  }

  if (session.pendingActions.length > 0) {
    parts.push('**Хийх ёстой зүйлс (өмнөх яриагаар):**');
    session.pendingActions.slice(-3).forEach(a => parts.push(`- ${a}`));
  }

  return parts.join('\n');
}
