# CRM нэгтгэл — Flask прототип → Next.js модуль

Эх загвар: `Logistic Dashboards/crm` (Flask + SQLite, порт 5001) — Түмэн Тээхийн борлуулалт/CX-ийн бүрэн CRM прототип.
Зорилго: прототипийн бүх боломжийг `src/app/crm` модульд Firestore дээр бодит болгох.

## Үндсэн шийдвэрүүд

1. **Deal pipeline-ийг прототипийн загвараар солино** — `TUMEN_PIPELINE`: `lead → opportunity → won / pending / lost`
   (📥 Хүсэлт / 💰 Үнийн санал илгээсэн / ✅ Амжилттай / ⏳ Хүлээгдэж байгаа / ✗ Алдсан).
   Хуучин stage ID-ууд (`appointment`, `closed_won`, ...) `LEGACY_STAGE_MAP`-аар автоматаар шинэ рүү буудаг.
   - `pending`/`lost` руу шилжихэд **шалтгаан заавал** (`lostReason`)
   - `won` → `closedAt` + компанийг `customer` болгож ахиулна (customer/loyal-ыг буцаахгүй) + "Гэрээ" даалгавар (+2 хоног, өндөр)
   - `pending` → "Дагах" даалгавар (+3 хоног, дунд)
   - "Үнийн санал илгээсэн" → `opportunity` + `quotedAt` + crm_quotes бичлэг + дагах даалгавар (+3 хоног)
2. **Компанийн funnel** — `Company.funnelStage`: `lead/contacted/qualified/quote/customer/loyal/lost`; `/crm/funnel` kanban нь эхний 4 идэвхтэй үеийг харуулна. Компанид: segment, kam, source, registerNo, tariff, шалгуур (qRoute/qCargo/qVolume/qTiming), lostReason, firstContactAt нэмэгдэнэ.
3. **KAM загвар** — `kam` нь Sheets-тэй таарах нэр (стринг): Нямдорж, Баяраа, Амар, Одонтунгалаг, Отгонбаатар. Багууд: Орон нутаг (Нямдорж, Баяраа), Олон улс (Амар), Төсөл/Түгээлт (Одонтунгалаг, Отгонбаатар). `Employee.crmKamName` талбараар апп-ын хэрэглэгчийг KAM-тай холбоно; role='admin' = захирал (бүх дата), crmKamName-тэй хэрэглэгч өөрийн датаг харна (dashboard-ын толгой тоо, funnel, tasks, calendar, quotes — прототипийн адил; аналитик/тайлан хуудсууд нийтээрээ ил).
4. **Google Sheets синк** — `/api/crm/sync` (POST, admin-only, Bearer idToken). Apps Script URL/token нь `.env.local`-д (`CRM_SHEETS_URL`, `CRM_SHEETS_TOKEN`). Синк нь:
   - `crm_orders`-ыг бүтнээр дахин бичнэ (прототипийн адил, 9 шийтийн "All data")
   - Шинэ компанийг `customer` үеэр автоматаар үүсгэнэ (SEG_MAP сегменттэй)
   - Компанийн KAM = хамгийн олон рейс хийсэн валид KAM
   - Агрегатууд: `crm_company_stats` (компани тус бүр жил жилээр), `crm_order_stats` (жил/сар/KAM/сегмент/баг), `crm_carrier_stats` (жолооч тус бүр)
   - Лийд шийтээс deals-ийг `leadKey`-ээр синк (гараар үүсгэсэн deals-д халдахгүй)
5. **Шинэ collection-ууд**: `crm_orders`, `crm_order_stats`, `crm_company_stats`, `crm_carrier_stats`, `crm_carriers` (гар өглөгийн бүртгэл), `crm_surveys` (NPS), `crm_audit`, `crm_settings`.
6. **firestore.rules** — өмнө нь crm_* дүрэм огт байгаагүй (админ биш хэрэглэгч бичиж чадахгүй байсан алдаа). `isCrmAllowed()` helper + collection бүрд match нэмсэн. Stats/orders/audit нь клиентээс зөвхөн унших (синк Admin SDK-ээр бичнэ; audit-ыг клиент нэмж болно, засахгүй).
7. **Даалгавар/Календарь** — `crm_activities` дээр өргөтгөв: taskType (📞 дуудлага / 🤝 уулзалт / 💰 үнийн санал / 📄 гэрээ / 🔄 дагах / 📎 бичиг / ✔ бусад), priority (🔴 өндөр / 🟡 дунд / ⚪ бага), kam, meetingKind. `/crm/tasks` (хугацааны бүлгүүд: Хэтэрсэн/Өнөөдөр/Энэ 7 хоног/Дараа), `/crm/calendar` (Даваа эхэлдэг сарын хүснэгт).
8. **Шинэ хуудсууд**: `/crm/dashboard` (Хяналт — KPI, сануулга, 2026 зорилт, жилийн хайрцгууд), `/crm/funnel`, `/crm/tasks`, `/crm/calendar`, `/crm/year/[yr]`, `/crm/analytics` (tier/churn risk/trend), `/crm/performance`, `/crm/carriers`, `/crm/audit` (admin). `/crm` → `/crm/dashboard` руу чиглүүлнэ.

## Яг таг хуулсан тоонууд (прототипоос)

- **TARGET_2026** (₮M ашиг): total 1500; сараар [75, 75, 105, 120, 135, 135, 120, 165, 165, 165, 135, 105]; KAM: Нямдорж 533, Баяраа 253, Амар 182, Одонтунгалаг 95, Отгонбаатар 438; баг: Орон нутаг 786, Олон улс 182, Төсөл/Түгээлт 533. (Прототип дээр analytics.py-тэй зөрүүтэй байсныг app.py-ийн буюу хамгийн сүүлийн утгаар авав — ⚠️ тодруулах асуулт хэвээр.)
- **Өнгөний босгууд**: margin ≥14 сайн / ≥8 анхаар; план % ≥90/≥60; NPS бүс 9-10/7-8/0-6; winrate ≥50/≥25; concentration ≥60 муу/≥40 анхаар; SLA on-time ≥80/≥50; үе шатанд >7 хоног = улаан.
- **Tier** (сарын дундаж орлого ₮M): ≥100 Power, ≥50 High, ≥10 Small, бусад Try. **Churn risk**: идэвхгүй + 2025 орлоготой эсвэл trend ≤ −40 → өндөр; trend ≤ −15 → анхаарах.
- **LOST_REASONS**: Үнэ, Хугацаа, Өрсөлдөгч, Хариу өгсөнгүй, Бусад.
- **SEG_MAP**: Автокран/Барло/Дотор/Орон нутаг→Inbound; Олон улс→International; Төсөл/Түгээлт/Цемент/Элс→Project&Dist.

## Дата шилжүүлэлт

Прототипийн `crm.db`-д: companies 240, contacts 343, deals 381 (+orders 28,083 нь Sheets-ээс синкээр орж ирнэ). Шилжүүлэх скрипт: `scripts/crm-migrate-prototype.mjs` — ажиллуулахын өмнө хэрэглэгчээс зөвшөөрөл авна. Orders-ийн бохир огноог (year=0/1899/1900, ~22%) синк дээр шүүнэ.

## Файлын бүтэц (нэмэгдсэн)

- `_types/index.ts` — Tumen CRM төрлүүд/тогтмолууд (энэ файлын "TUMEN" хэсэг)
- `_lib/stats.ts` — stat doc төрлүүд, normName, tier/risk/trend, босго helpers
- `_lib/crm-actions.ts` — moveDealStage / moveCompanyStage / createAutoTask / logAudit
- `app/api/crm/sync/route.ts` — Sheets синк (Admin SDK)
