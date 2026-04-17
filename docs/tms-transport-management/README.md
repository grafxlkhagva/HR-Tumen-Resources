# TMS Transport Management — Enterprise deploy bundle

Энэ фолдер нь Option C enterprise-grade deploy-д шаардагдах бүх баримт, алхмын гарын авлагыг нэгтгэв.

## Агуулга

| # | Файл | Агуулга |
|---|---|---|
| 00 | `00-deploy-runbook.md` | Prod build → backup → rules deploy → code deploy → verify → backfill |
| 01 | `01-qa-smoke-checklist.md` | 30-45 мин-ийн QA checklist |
| 02 | `02-sentry-setup.md` | Sentry SDK суулгах, TMS tag, release tracking |
| 03 | `03-finance-subcollection-migration.md` | 1MB doc-limit шийдвэрлэх 4-шатлалт migration plan |
| 04 | `04-onboarding-v2.md` | Хэрэглэгчид зориулсан шинэ фичерийн гарын авлага |
| 05 | `05-concurrent-test-recipe.md` | Concurrent edit scenario тестийн заавар |
| 06 | `06-budget-alerts.md` | Firebase budget + doc-size monitor |

## Scripts (scripts/)

| Script | Зорилго |
|---|---|
| `scripts/backfill-tm-subtransport-contract-service.js` | Хуучин single-service TM-д subUnit contractServiceId-г parent-аас carry |
| `scripts/monitor-tm-doc-size.js` | 1MB-д ойртсон баримтуудыг илрүүлэх weekly audit |
| `scripts/test-tm-rules.js` | Firestore rules emulator-ээр 8 негатив тест |

## Unit tests

- `src/app/tms/transport-management/utils.test.ts`
- `src/app/tms/transport-management/constants.test.ts`
- `src/app/tms/transport-management/finance-math.test.ts`

Тестийг ажиллуулах:
```bash
npm i -D vitest @vitest/ui
npx vitest run
```

## Code modules нэмэгдсэн

- `src/app/tms/reference-data-context.tsx` — static reference-data Context (5 subscription-ийг нэг удаа л уншина).
- `src/app/tms/transport-management/telemetry.ts` — Sentry-ready telemetry wrapper.
- `src/app/tms/transport-management/finance-math.ts` — pure finance compute helpers (тестийн хувьд хялбар).
- `src/app/tms/transport-management/[id]/virtualized-sub-tabs.tsx` — 50+ subTransport virtualization scaffolding.
