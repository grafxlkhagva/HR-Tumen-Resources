/**
 * Sentry server-side initialization (Next.js server runtime).
 * DSN байхгүй үед init-ийг алгасна.
 */
import * as Sentry from '@sentry/nextjs';

const DSN = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV,
  });
}
