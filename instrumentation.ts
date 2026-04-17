/**
 * Next.js `instrumentation.ts` — Sentry-ийг server/edge runtime дээр ачаалах
 * эхлэл цэг. DSN байхгүй үед config файлууд мөн noop болно.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
