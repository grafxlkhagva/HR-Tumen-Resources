/**
 * Sentry client-side initialization (Next.js app-router).
 * DSN байхгүй үед init-ийг алгасах тул dev/staging орчинд silently noop.
 */
import * as Sentry from '@sentry/nextjs';

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.2,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.NODE_ENV,
    beforeSend(event) {
      // PII зөвшөөрөхгүй — cookie болон user email-ийг цэвэрлэнэ.
      if (event.request) delete event.request.cookies;
      if (event.user) delete event.user.email;
      // TMS-ийн event-уудад feature tag нэмэх (Dashboard filter-д хялбар).
      const url = event.request?.url ?? '';
      if (url.includes('/tms/transport-management')) {
        event.tags = { ...(event.tags ?? {}), feature: 'tms-transport-management' };
      }
      return event;
    },
  });
  // telemetry.ts-д ашиглаж буй `window.Sentry` API-г нээлттэй болгоно.
  if (typeof window !== 'undefined') {
    (window as unknown as { Sentry: typeof Sentry }).Sentry = Sentry;
  }
}
