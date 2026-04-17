# TMS Transport Management — Production deploy runbook

Энэ runbook нь Option C enterprise-grade deploy-д зориулагдсан. Алхмуудыг
эрэмбээр нь гүйцэтгэнэ. Аль нэг алхам амжилтгүй болбол Rollback-д орох.

---

## 0. Урьдчилсан бэлтгэл (T − 1 өдөр)

| Зүйл | Хариуцагч | Баталгаажуулалт |
|---|---|---|
| `firebase login` буюу CI service account key идэвхтэй | DevOps | `firebase projects:list` хэвийн |
| Prod Firebase project ID баталгаажуулсан | DevOps | `.firebaserc` |
| `gcloud` CLI нэвтэрсэн | DevOps | `gcloud auth list` |
| Backup bucket байгаа | DevOps | `gsutil ls gs://<backup-bucket>` |
| Хэрэглэгчдэд өөрчлөлтийн товч мэдэгдэл | PM | Slack/Telegram |

---

## 1. Code freeze + prod build (T − 2 цаг)

```bash
# 1. Main branch-ийн HEAD commit-ийг тэмдэглэ (rollback-д хэрэгтэй).
git -C "<repo>" log --oneline -1

# 2. Prod build (Turbopack-гүй)
cd <repo>
npm ci
npm run build
```

**Ожид:** `✓ Compiled successfully` + route жагсаалтад `/tms/transport-management/*` бүх route.

**Fallback:** Build fail бол error-ийг нэн даруй засах эсвэл deploy хойшлуулах.

---

## 2. Data backup (T − 30 мин)

```bash
DATE=$(date +%Y%m%d-%H%M)
gcloud firestore export gs://<backup-bucket>/tms-backup-$DATE \
  --collection-ids=tms_transport_management,tms_contracts,tms_vehicles,tms_drivers,tms_customers,tms_settings
```

**Ожид:** `Completed operation: projects/.../operations/<id>` — Firestore console-оос progress харж 100% дуусахыг хүлээх.

**Fallback:** Backup fail бол deploy-оос татгалзах.

---

## 3. Rules emulator test (T − 15 мин)

```bash
# Terminal 1
firebase emulators:start --only firestore,storage

# Terminal 2
npm i -D @firebase/rules-unit-testing   # анхны удаа
node scripts/test-tm-rules.js
```

**Ожид:** `✔ All rules tests passed.`

Negative-test жагсаалт (8 кейс):
- valid create ✅
- negative driverPrice ❌
- negative customerPrice ❌
- invalid status ❌
- oversized subTransports (>200) ❌
- oversized financeTransactions (>500) ❌
- customerId mutation on update ❌
- contractServiceIds list ✅

---

## 4. Firestore rules + Storage rules deploy (T + 0)

```bash
firebase deploy --only firestore:rules,storage
```

**Ожид:**
- `✔ Deploy complete!`
- Firebase console → Firestore → Rules → Шинэ version "Active".

**Rollback:**
```bash
# Console → Firestore → Rules → History → Previous version → Restore
# Эсвэл CLI:
firebase firestore:rules:release <old-ruleset-id>
```

---

## 5. Hosting / App code deploy (T + 5 мин)

Vercel (repo-д тохируулагдсан бол):
```bash
git push origin main
# → Vercel-ийн CI автомат build + deploy
```

Firebase Hosting:
```bash
firebase deploy --only hosting
```

**Ожид:** Production URL-д `/tms/transport-management` шинэ version харагдана (DevTools → Response `x-nextjs-build-id` өөрчлөгдсөн).

**Rollback:**
```bash
# Vercel:   vercel rollback <previous-url>
# Firebase: firebase hosting:rollback
```

---

## 6. Post-deploy verification (T + 15 мин)

1. [ ] `/tms/transport-management` жагсаалт ачаалагддаг эсэх.
2. [ ] Нэг TM-ийг нээж customerPrice засаад Ctrl+S → Refresh → утга үлдсэн.
3. [ ] 2 browser tab-аар ижил TM-ийн dispatch step-ийг нэгэн зэрэг toggle → нөгөөд CONFLICT toast.
4. [ ] Finance → гүйлгээ нэмэх/засах/устгах.
5. [ ] Multi-service TM үүсгэх (2 үйлчилгээ + machine).
6. [ ] Хуучин single-service TM нээгдэх (`contractServiceId` fallback).
7. [ ] Sentry dashboard-д тэг алдаа (эсвэл урьдчилсан байсан адил түвшин).

**Fallback:** Аль нэг шалгуур амжилтгүй болбол Section 4/5-д заасан rollback.

---

## 7. Backfill (T + 1 цаг)

```bash
node scripts/backfill-tm-subtransport-contract-service.js \
  scripts/key/hr-tumenresources-key.json                      # dry-run

# Хангалттай гэж үзвэл:
node scripts/backfill-tm-subtransport-contract-service.js \
  scripts/key/hr-tumenresources-key.json --apply
```

**Ожид:** `✔ Complete — N document(s) updated.`

---

## 8. Monitoring warm-up (T + 24 цаг)

- Sentry → TMS tag-тай event 24 цагт 0 "Unhandled".
- Firestore budget alert идэвхтэй.
- Doc size monitor: `node scripts/monitor-tm-doc-size.js <key>` — 0 CRIT мөр.

---

## 9. Final sign-off

| Шалгуур | Статус |
|---|---|
| Build амжилттай | ☐ |
| Backup хадгалагдсан | ☐ |
| Rules deploy + test pass | ☐ |
| App deploy | ☐ |
| Post-deploy smoke | ☐ |
| Backfill (optional) | ☐ |
| Sentry/monitor хэвийн | ☐ |

Бүх checkbox-д tick тавигдсан үед deploy complete.
