# Concurrent edit test recipe

Хоёр browser tab-аар бодит concurrent edit scenario-г шалгах.

## Урьдчилсан нөхцөл

- `/tms/transport-management/<id>` аль нэг TM.
- Нэг admin account / хоёр профайл (Chrome normal + Incognito).
- Интернэт холболт тогтвортой.

## Scenario A — Dispatch step toggle

1. Chrome normal (Tab A): детал хуудас нээж, аль нэг dispatch step рүү ойртох.
2. Chrome incognito (Tab B): ижил TM-ийн хуудасыг нээх.
3. **Tab A:** step-ийн "Дуусгах" товчийг дарж confirm → амжилттай toast.
4. **Tab B:** Өөр (эсвэл тэр же) step-ийн "Дуусгах" товчийг шууд дарж confirm.

**Ожид Tab B:** *"Зөрчил илэрлээ — Өөр хэрэглэгч энэ бүртгэлийг засварласан байна. Хуудсыг дахин ачааллана уу."* toast.

Баталгаажуулалт: UI-д өмнөх state буцаана (optimistic rollback).

## Scenario B — Finance гүйлгээ

1. Tab A: `/finance` дээр шинэ гүйлгээ "Урьдчилгаа" нэмэх.
2. Tab B: Tab A-ийн гүйлгээг **харахаас өмнө** өөр гүйлгээ "Үлдэгдэл" нэмэх.

**Ожид:** Хоёул амжилттай (`arrayUnion` атомар merge хийнэ). Refresh дараа Tab A, Tab B аль алинд 2 гүйлгээ харагдана.

## Scenario C — Finance гүйлгээ засах

1. Tab A: нэг гүйлгээг устгах.
2. Tab B: тэр же гүйлгээг засах оролдлого → save.

**Ожид Tab B:** *"Энэ гүйлгээг өөр хэрэглэгч устгасан/засварласан байна. Хуудсыг дахин ачааллана уу."*

## Scenario D — Санхүүгийн үнэ

1. Tab A: Санхүү карт → customerPrice засаж Ctrl+S.
2. Tab B: Tab A-ийн save-ийг харахаас өмнө customerPrice өөр утга Ctrl+S.

**Ожид:** Аль алины `runTransaction` `updatedAt`-ийг харна; хоёрдугаарыг `CONFLICT` toast-аар reject.

---

### Log collecting

DevTools → Console:
- `[tms:tm] tm.save.conflict` эсвэл `tm.dispatch.conflict` event харагдвал telemetry ажиллаж байна.
- Sentry dashboard (хэрвээ холбогдсон бол) → Breadcrumbs → өнгөт тэмдэглэгээ.

Аль нэг тохиолдол expected биш болсон үед: screenshot + Sentry event id-г QA pull request-д тэмдэглэнэ.
