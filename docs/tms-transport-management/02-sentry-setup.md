# Sentry-тай TMS Transport Management-ийг холбох

Одоо `src/app/tms/transport-management/telemetry.ts` дотор Sentry-аар мэдээллийг
автоматаар дамжуулах prep бүрэн хийгдсэн. Sentry SDK-г холбосноор нэмэлт кодын
өөрчлөлтгүйгээр үйл явдлууд үргэлжлэлтэй дамжуулагдана.

## 1. Sentry project үүсгэх
- [sentry.io](https://sentry.io) дээр "hr-tumen-tms" нэрээр project (platform: Next.js).
- DSN-ийг хуулж авна.

## 2. SDK суулгах

```bash
npm install --save @sentry/nextjs
npx @sentry/wizard -i nextjs
```
Wizard нь `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `next.config.ts` (withSentryConfig)-уудыг автоматаар үүсгэнэ.

## 3. Env variables
`.env.local` + Vercel/Hosting environment-д:

```
NEXT_PUBLIC_SENTRY_DSN=<your-dsn>
SENTRY_ORG=<org-slug>
SENTRY_PROJECT=hr-tumen-tms
SENTRY_AUTH_TOKEN=<token>      # source map upload-д зориулсан
```

## 4. Tag-ийг TMS-д тохируулах
`sentry.client.config.ts`:
```ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    if (event.request?.url?.includes('/tms/transport-management')) {
      event.tags = { ...(event.tags ?? {}), feature: 'tms-transport-management' };
    }
    return event;
  },
});
```

## 5. Telemetry автоматаар холбогдох
`telemetry.ts` дотор `window.Sentry`-ийг шалгадаг тул SDK ачаалагдмагц дараах
өөрчлөлтгүйгээр урсана:
- `tm.save.success` / `tm.save.conflict` / `tm.save.failed`
- `tm.dispatch.conflict` / `tm.dispatch.write_failed`

Sentry Dashboard → Breadcrumbs → feature:tms-transport-management тэмдэгтэйг шүүж харна.

## 6. Alert дүрэм

Нэмэх зөвлөмжит alert:
- **CONFLICT rate > 5/min** → Slack.
- **write_failed** тохиолдол 0-ээс их → Pager.
- **p95 dispatch save > 2s** → warn.

## 7. Release tracking

```
sentry-cli releases new <version>
sentry-cli releases set-commits <version> --auto
sentry-cli releases files <version> upload-sourcemaps .next
sentry-cli releases finalize <version>
```
CI-д Vercel-ийн `VERCEL_GIT_COMMIT_SHA`-г ашиглаж release нэрлэнэ.

## 8. Санамсаргүй PII

`beforeSend`-д `event.user.email` / `request.cookies`-г хаана ёстой:
```ts
delete event.user?.email;
if (event.request) delete event.request.cookies;
```

## 9. Source map upload
`next.config.ts`-д `withSentryConfig` wrapper нэмэгдсэн эсэхийг шалгах:
```ts
module.exports = withSentryConfig(nextConfig, { silent: true });
```

---

Sentry амжилттай холбогдсоны дараа QA checklist-ийн §10-г гүйцэтгэх.
