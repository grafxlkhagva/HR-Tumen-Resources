/**
 * Sentry edge runtime initialization (Next.js middleware).
 * DSN байхгүй үед init-ийг алгасна.
 */
import * as Sentry from '@sentry/nextjs';

const DSN = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    tracesSampleRate: 0.05,
    environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV,
  });
}
