# Нууц үг сэргээх (self-service, имэйл OTP)

Ажилтан нэвтрэх нууц үгээ мартсан үед **өөрөө** сэргээх урсгал. Auth имэйл нь
синтетик (`${код}@example.com`) тул Firebase-ийн бэлэн reset имэйл ажиллахгүй —
иймд employees doc-ийн **жинхэнэ email** руу 6 оронтой OTP илгээж, сервер талд
Admin SDK-ээр нууц үгийг солино.

## Урсгал

1. `/login` → "Нууц үгээ мартсан уу?" → `/forgot-password`
2. Ажилтан код/имэйлээ оруулна → `POST /api/auth/request-reset`
   - employees-ээс exact query-ээр хайна; жинхэнэ имэйлтэй, нэвтрэх эрхтэй бол
     OTP үүсгэж, hash-ийг `password_resets/{uid}`-д хадгалж, кодыг имэйлээр илгээнэ.
   - **Enumeration хамгаалалт:** бүртгэл байгаа эсэхээс үл хамааран ижил ерөнхий хариу.
3. Ажилтан код + шинэ нууц үг оруулна → `POST /api/auth/confirm-reset`
   - OTP-ийг timing-safe шалгаж, **Firestore транзакцид** оролдлого тоолол/lockout/
     consume хийж (race brute-force хамгаалалт), амжилттай бол `auth.updateUser`.

## Аюулгүй байдлын хэмжүүрүүд

- OTP-г зөвхөн salted SHA-256 hash-аар хадгалдаг (түүхий код persist хийдэггүй).
- 6 оронтой OTP, 15 минут TTL, **5 буруу оролдлого**-оор код хүчингүй.
- Дахин илгээх 60с cooldown, 5 хүсэлт/цаг цонх.
- `password_resets` collection клиентээс **бүрэн хаалттай** (firestore.rules — catch-all-аас
  тусгайлан хассан; union семантикийг тооцсон).
- loginDisabled account сэргээгдэхгүй (request + confirm хоёуланд шалгана).
- Түгээмэл сул нууц үгс (`123456`, `password`, …) татгалзана.

## Шаардлагатай тохиргоо (env) — ⚠️ ОДОО ДУТУУ

Сервер талын route-ууд **Firebase Admin SDK** шаарддаг. Эдгээр `.env.local`-д
байхгүй тул одоо route-ууд `503 "Сервер тал тохируулагдаагүй"` буцаана:

```
FIREBASE_ADMIN_PROJECT_ID=hr-tumenresources
FIREBASE_ADMIN_CLIENT_EMAIL=<service-account-email>
FIREBASE_ADMIN_PRIVATE_KEY="<service-account-private-key>"
```

Firebase Console → Project settings → Service accounts → **Generate new private key**.
Vercel дээр мөн адил тохируулна (Production/Preview).

**Имэйл хүргэлт:** `RESEND_API_KEY` аль хэдийн байгаа. Гэхдээ Resend дээр домэйн
verify хийгээгүй бол код зөвхөн Resend бүртгэлийн эзний имэйл рүү хүрнэ. Бодит
хүргэлтэд домэйнээ Resend-д баталгаажуулна.

## Локал турших (dev)

Resend хүргэлтгүйгээр урсгалыг турших бол `.env.local`-д:

```
ALLOW_DEV_OTP=true
```

Энэ үед (production БИШ бол) `request-reset` хариунд `devOtp` талбар нэмэгдэж,
UI кодыг автоматаар бөглөнө. **Production-д ХЭЗЭЭ Ч задрахгүй** (Vercel deployment
бүрд `NODE_ENV=production`).

## Тест

- `src/lib/auth/password-reset.test.ts` — цэвэр логик (40 тест): OTP, hash,
  timing-safe verify, хугацаа, оролдлого/cooldown/window, нууц үгийн бодлого.
- `src/app/api/auth/reset-routes.test.ts` — route интеграци (18 тест, Firebase mock):
  enumeration, lockout, expiry, consume, TOCTOU (loginDisabled), rate-limit, dev/prod devOtp.

Ажиллуулах: `npm test`

## Дараагийн (сонголт, defense-in-depth)

- **IP-д суурилсан edge rate-limit** (Vercel WAF / middleware) — нэвтрэлтгүй route-уудад
  илүү хүчтэй spam/DoS хамгаалалт.
- **firestore.rules unit тест** (`@firebase/rules-unit-testing`) — `password_resets`-ийг
  signed-in хэрэглэгч уншиж чадахгүйг автоматаар батлах.
- Имэйлийг том/жижиг үсгийн ялгаагүй тааруулах бол employees-д `emailLower` талбар нэмэх.
