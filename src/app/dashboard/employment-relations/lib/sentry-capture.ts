/**
 * sentry-capture.ts
 *
 * ER модулийн critical flow-уудад зориулсан Sentry capture helper.
 *
 * Зориулалт:
 *  - Silent catch блокуудыг (`catch {}`) observability-тэй болгох — production-д
 *    юу буруудаж байгааг харах боломжтой болгоно.
 *  - Module/flow tag-уудтай тогтмол метаданс илгээх.
 *  - Sentry асуудалтай үед app crash хийхгүй (try/catch wrapped).
 *
 * Хэрэглээний жишээ:
 *
 *   try {
 *       await batch.commit();
 *   } catch (err) {
 *       captureERError(err, {
 *           flow: 'send-for-review',
 *           documentId: id,
 *           extra: { reviewerCount: reviewers.length },
 *       });
 *       toast({ title: 'Алдаа', variant: 'destructive' });
 *   }
 */

import * as Sentry from '@sentry/nextjs';

export type ERFlow =
    | 'save-draft'
    | 'send-for-review'
    | 'approve'
    | 'reject'
    | 'final-approve'
    | 'instant-approve'
    | 'send-to-employee'
    | 'delete'
    | 'file-upload'
    | 'create-document'
    | 'release-submit'
    | 'appoint-submit'
    | 'lifecycle-apply'
    | 'lifecycle-auth-disable'
    | 'lifecycle-auth-enable'
    | 'lifecycle-side-effects'
    | 'release-rollback'
    | 'appointment-rollback';

export interface ERCaptureContext {
    flow: ERFlow;
    documentId?: string;
    employeeId?: string;
    actionId?: string;
    /** Чөлөөт нэмэлт мэдээлэл — Sentry-ийн `extra`-д шууд орно */
    extra?: Record<string, unknown>;
    /** Илүү хатуу хэлбэрийн ангилал — нэмэлт tag-аар Sentry-д үлдэнэ */
    severity?: 'warning' | 'error';
}

/**
 * ER модулийн алдааг Sentry-д барина.
 *
 * Sentry initialization асуудалтай байсан ч app-ыг crash хийхгүй —
 * try/catch-аар хамгаална.
 */
export function captureERError(err: unknown, context: ERCaptureContext): void {
    try {
        const error = err instanceof Error ? err : new Error(String(err));
        Sentry.captureException(error, {
            level: context.severity ?? 'error',
            tags: {
                module: 'employment-relations',
                flow: context.flow,
                ...(context.actionId ? { actionId: context.actionId } : {}),
            },
            extra: {
                documentId: context.documentId,
                employeeId: context.employeeId,
                ...(context.extra ?? {}),
            },
        });
    } catch {
        // Sentry асуудалтай — гол flow-ыг гацаахгүй
    }
}

// ─── Phase 4 (P4-B) — Custom business metrics ───────────────────────────────
//
// Sentry SDK v10 нь хуучин `Sentry.metrics` API-ийг устгасан тул business
// metric-уудыг `captureMessage(level: 'info')`-ийн нэрэн дээр tag + extra-аар
// илгээж, Sentry дашбоард дээр `metric:` tag-аар filter хийдэг паттернтэй
// ажиллана. Sample rate 100% (P4-A-аар ER route 1.0). Бүх metric нэг helper-
// ээр тэнцвэртэй илгээгдэх тул дашбоард Discover query-ийг тогтмол format-аар
// үүсгэх боломжтой.
//
//   metric: 'er.approval_latency' — distribution (хоног) — DRAFT → SIGNED
//   metric: 'er.queue_depth'      — gauge (тоо)         — active IN_REVIEW
//   metric: 'er.rollback'         — counter (1/event)   — release/appointment rollback

export type ERMetric =
    | 'er.approval_latency'
    | 'er.queue_depth'
    | 'er.rollback';

export interface ERMetricContext {
    documentId?: string;
    employeeId?: string;
    actionId?: string;
    /** Чөлөөт нэмэлт — Sentry-ийн extra-д шууд орно (e.g. lifecycle: 'release') */
    extra?: Record<string, unknown>;
}

/**
 * ER модулийн business metric илгээнэ. Fire-and-forget — Sentry асуудалтай
 * үед app-ыг блоклохгүй.
 *
 * Дашбоард-д Discover query жишээ:
 *   - latency p95: `metric:er.approval_latency` ангилал, `extra.value` дээр p95
 *   - rollback rate: `metric:er.rollback` count / time window
 *   - queue depth: `metric:er.queue_depth` дундаж extra.value sliding window
 */
export function captureERMetric(
    metric: ERMetric,
    value: number,
    context?: ERMetricContext,
): void {
    try {
        if (!Number.isFinite(value)) return;
        Sentry.captureMessage(metric, {
            level: 'info',
            tags: {
                module: 'employment-relations',
                metric,
                ...(context?.actionId ? { actionId: context.actionId } : {}),
            },
            extra: {
                value,
                documentId: context?.documentId,
                employeeId: context?.employeeId,
                ...(context?.extra ?? {}),
            },
        });
    } catch {
        // Sentry асуудалтай — гол flow-ыг гацаахгүй
    }
}
