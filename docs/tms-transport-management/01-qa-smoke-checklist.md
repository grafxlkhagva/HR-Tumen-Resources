# TMS Transport Management — QA smoke checklist

Production deploy-ийн дараа гараар туршилт хийхэд зориулсан жагсаалт.
Нэг тест хийгч **30-45 минутад** дуусгана. Хэмжил/дүгнэлтийг холбогдох checkbox-т тэмдэглэнэ.

## Урьдчилсан нөхцөл

- Admin эрхтэй тест account.
- `tmsAccess: true` тэмдэгтэй хоёрдогч account (concurrent-test-д).
- 2 browser профайл (Chrome normal + Chrome incognito).
- 1 TM заавал хуучин (`contractServiceId` зөвхөн parent дээр) — regression-д.

---

## 1. Жагсаалт (T-list)

- [ ] `/tms/transport-management` хуудас 2 секундээс богино хугацаанд ачаалагдах.
- [ ] Мөр тус бүрт: код, огноо (`yyyy.MM.dd HH:mm`), харилцагч, үйлчилгээ, машин, төрөл, төлөв.
- [ ] Multi-service TM-д `"N үйлчилгээ · M машин"` badge харагдаж байгаа.
- [ ] "Цааш ачаалах" товчоор paginate хийж 30+ мөр дараалсан.
- [ ] Empty state ("Тээврийн удирдлага бүртгэгдээгүй байна.") нэг удаагийн шалгалт (filter/test env).

## 2. Шинэ үүсгэх (T-create)

### 2a. Contract flow — 1 үйлчилгээ / олон машин
- [ ] `Шинэ тээврийн удирдлага үүсгэх` дарах → step 1.
- [ ] "Гэрээт тээвэр" сонгох → step 2: гэрээ сонгож болж байна.
- [ ] 1 үйлчилгээ checkbox-аар сонгох.
- [ ] Step 3: 2 машин сонгох → "1 машин сонгогдсон → 1 дэд таб" хэлбэрийн counter зөв.
- [ ] "Үүсгэх" дарах → detail хуудас руу redirect.
- [ ] 2 таб харагдах, машины plate харагдана.

### 2b. Multi-service flow
- [ ] 2 үйлчилгээ сонгох.
- [ ] Step 3: үйлчилгээ тус бүрд section — үйлчилгээний нэр тодорхой.
- [ ] Нэгдэх үйлчилгээнд 2 машин, нөгөөд 0 машин → "1 машингүй дэд таб үүснэ" зөв мэдэгдэл.
- [ ] Үүсгэсний дараа `/tms/transport-management` list-д "2 үйлчилгээ · 3 машин" badge.

### 2c. Quotation flow
- [ ] Үнийн саналаас 1-ийг сонгож TM үүсгэх → detail-д үнэ, машины төрөл, dispatchSteps бүрэн зөв хуулагдсан.

### 2d. New (manual) flow
- [ ] Service type + customer сонгох → draft TM үүсэх.

## 3. Детал хуудас (T-detail)

- [ ] Header-д код, огноо `yyyy.MM.dd HH:mm`.
- [ ] "Санхүү" товчоор `/finance` руу шилждэг.
- [ ] Trash товч → alert-ээр баталгаажуулах → устгах.
- [ ] Тээврийн хэрэгсэл карт ✏️ → машин сонгоход driver dropdown нь тухайн машины оноосон жолоочоор шүүгдэнэ.
- [ ] Аль нэг үйлчилгээнд `allowedVehicleIds` байхгүй байвал бүх жолоочийн жагсаалт fallback-оор харагдана.
- [ ] Санхүү карт ✏️ → customerPrice гараар оруулах → ашгийн хувь realtime тооцоологдоно.
- [ ] customerPrice < driverPrice үед save дарвал "Хасах маржин..." confirm dialog → Cancel → dialog хэвээр / Confirm → хадгалагдана.

## 4. Dispatch steps (T-dispatch)

- [ ] Таб солиход dispatchSteps таб-ын үйлчилгээнд тохирсон байна.
- [ ] Control task утгыг оруулаад step-ийг complete дарах → confirm → complete болно.
- [ ] Image upload (≤5MB JPEG) → upload амжилттай.
- [ ] `.txt` файл upload оролдох → Buruu файл төрөл toast.
- [ ] 11MB зураг → "Файлын хэмжээ хэтэрсэн" toast.

## 5. Санхүүгийн хуудас (T-finance)

- [ ] `/finance`-д 4 summary card зөв (авлага / өглөг / үлдэгдэл / ашиг).
- [ ] Авлага нэмэх: amount=1000, paid=500 → status "partial". Огноо `MM.dd`.
- [ ] paid > amount оруулах оролдлого → "Төлсөн дүн нийт дүнгээс их байж болохгүй" validation.
- [ ] Гүйлгээг засах → өөрчлөлт хадгалагдах.
- [ ] Гүйлгээг устгах → alert → устгагдах.

## 6. Concurrent test (T-conflict)

- [ ] 2 tab-аар ижил TM нээх.
- [ ] Tab A: dispatch step "Complete" дарах → амжилттай.
- [ ] Tab B: өмнө render хийсэн хуучин state-ээр ижил step-д interact хийж хадгалах → CONFLICT toast "Өөр хэрэглэгч энэ бүртгэлийг засварласан байна" гарна.

## 7. Mobile (T-mobile)

- [ ] Chrome DevTools → iPhone 12 Pro эмулэшн → detail хуудас бүрэн харагдах.
- [ ] Таб wrap зөв, truncate идэвхтэй.
- [ ] Finance dialog scroll (нарийн дэлгэц дээр).

## 8. Backward compat (T-legacy)

- [ ] Хуучин single-service TM нээгдэх (multi-service flag-гүй).
- [ ] Машин/жолооч/dispatch зөв ажиллах.
- [ ] Finance карт → customerPrice байхгүй ч fallback-оор нөхөгдөж харагдана.

## 9. Accessibility spot-check

- [ ] VoiceOver (macOS: Cmd+F5) идэвхжүүлж pencil товчнуудыг focus аваад текст уншина.
- [ ] Keyboard (Tab) ашиглан бүх dialog-уудад орох.

## 10. Sentry/telemetry

- [ ] Sentry dashboard → "tm.save.success" breadcrumb хэдэн удаа бүртгэгдсэн.
- [ ] CONFLICT simulation дараа `tm.dispatch.conflict` эсвэл `tm.save.conflict` event харагдсан.

---

### Бүх зүйлд tick тавигдсан бол "QA pass" гэж тэмдэглэж хэрэгжүүлэлт бэлэн болно.
