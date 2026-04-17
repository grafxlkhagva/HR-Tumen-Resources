'use client';

/**
 * Transport Management feature telemetry wrapper.
 *
 * Зорилго:
 *   - CONFLICT, write-failure, long-running action гэх мэт TM-ийн чухал үйл
 *     явдлуудыг нэг цэгт logging хийх.
 *   - Эхэн үед `console.*` ашиглана. Sentry холбогдсоны дараа энэ файлыг л
 *     шинэчилж бүх хэрэглээ автоматаар Sentry руу урсана.
 *
 * Хэрэглээ:
 *   import { tmTelemetry } from '@/app/tms/transport-management/telemetry';
 *   tmTelemetry.event('tm.save.conflict', { transportId, userId });
 *   const end = tmTelemetry.startTimer('tm.detail.load');
 *   // ... async work ...
 *   end({ transportId });
 */

type EventPayload = Record<string, unknown>;

const PREFIX = '[tms:tm]';

function hasSentry(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof (window as unknown as { Sentry?: unknown }).Sentry === 'object';
}

function safeCapture(event: string, payload?: EventPayload) {
  if (!hasSentry()) return;
  try {
    const Sentry = (window as unknown as {
      Sentry?: {
        captureMessage?: (m: string, ctx?: unknown) => void;
        addBreadcrumb?: (b: unknown) => void;
      };
    }).Sentry!;
    Sentry.addBreadcrumb?.({
      category: 'tms-transport-management',
      message: event,
      level: 'info',
      data: payload,
    });
  } catch {
    // ignore
  }
}

export const tmTelemetry = {
  /** Discrete үйл явдал (e.g. conflict, save). */
  event(name: string, payload?: EventPayload) {
    // eslint-disable-next-line no-console
    console.info(`${PREFIX} ${name}`, payload ?? {});
    safeCapture(name, payload);
  },

  /** Алдаа — console.error + Sentry capture (хэрвээ холбогдсон бол). */
  error(name: string, err: unknown, payload?: EventPayload) {
    // eslint-disable-next-line no-console
    console.error(`${PREFIX} ${name}`, err, payload ?? {});
    if (hasSentry()) {
      try {
        const Sentry = (window as unknown as {
          Sentry?: { captureException?: (e: unknown, ctx?: unknown) => void };
        }).Sentry!;
        Sentry.captureException?.(err, { extra: { event: name, ...(payload ?? {}) } });
      } catch {
        // ignore
      }
    }
  },

  /** Хугацаа хэмжих таймер. `end()` дуудахад log/Sentry-д дуусгана. */
  startTimer(name: string) {
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return (payload?: EventPayload) => {
      const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
      // eslint-disable-next-line no-console
      console.info(`${PREFIX} ${name} ${elapsed.toFixed(0)}ms`, payload ?? {});
      safeCapture(`${name}.done`, { elapsed_ms: Math.round(elapsed), ...(payload ?? {}) });
    };
  },
};
