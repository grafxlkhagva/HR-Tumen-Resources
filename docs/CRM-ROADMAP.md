# Түмэн Тээх CRM — Roadmap (том зураг, амьд баримт)

> logistic-ref (Flask прототип + HTML dashboard)-ийг Next.js систем рүү бүрэн
> шилжүүлэх ажлын нэгдсэн жагсаалт. Гүйцэтгэлийг тэмдэглэж хөтөлнө — юу
> хийсэн/хийгээгүй мартагдахгүй. Эх сурвалж: `~/logistic-ref/`, `docs/DEAL-SPEC.md`.

## Статус тэмдэг
✅ бэлэн · 🔨 хийгдэж байна · 🟡 хагас (томьёо бий, UI дутуу) · 🔴 байхгүй

## 1. Deal удирдлага
- ✅ Kanban (5 шат, drag, шат солиход шалтгаан)
- ✅ Deal analytics (funnel/баг/KAM 360°/эх сурвалж) — прототипийн яг томьёо
- ✅ Board шүүлтүүр (хайлт/KAM/суваг/MQL-SQL)
- ✅ Lead эрэмбэ quote_due-ээр · картан дээр шат солих dropdown
- 🔴 Deal KPI самбар (`deal_dashboard.html`): Won/Lost/Pending дүн ₮, Win Rate, дундаж дүн, жил/сар/шат шүүлт
- 🟡 Картан дээрх түргэн форм · нэгдсэн timeline · SLA цаг+эскалаци (DEAL-SPEC)
- 🔴 serviceType / dealType талбар (нээлттэй шийдвэр)

## 2. Борлуулалтын төлөвлөгөө (3 баг + Q план) — ХАМГИЙН ТОМ ГАП
- 🔨 `/crm/plan` — 2026 улирал+жил зорилт vs бодит, баг, KAM (эхний хувилбар бэлэн)
- 🔴 Баг тус бүрийн план хуудас (inbound/international/project_dist) — сар/улирал 3-баганат (2025 бодит / 2026 зорилт / гүйцэтгэл)
- 🔴 Интерактив зорилт оруулах (гараар), funnel параметр, Excel export (`2026_Q2_Sales_Plan.html`)
- 🔴 Жин / захиалгын тоо метрик · Tier A/B/C ангилал · retention/acquisition worksheet
- ✅ `/crm/performance` — уншдаг гүйцэтгэл (синк агрегатаас)

## 3. CX / сэтгэл ханамж / судалгаа
- ✅ Public NPS маягт (`/survey/[token]`) · судалгаа илгээх (`send-survey-dialog`)
- ✅ Гомдол/дэмжлэг (`/crm/tickets`)
- 🔴 CX Daily/Weekly workspace (`cx_dashboard.html`): checklist, өдрийн тэмдэглэл, weekly agenda, MQL→захирал тайлан
- 🟡 Дотоод судалгаа удирдах консол (NPS+сайжруулах хэмжүүр+асуудал+дараа улирал) — schema бий, UI дутуу
- 🟡 SLA хяналт (`analytics.py sla_summary`) · CX summary (`cx_summary`) — гаргаагүй

## 4. Customer / аналитик
- ✅ Харилцагч аналитик (tier/churn/trend/margin/Excel) — `/crm/analytics`
- ✅ Компанийн дэлгэрэнгүй (deals/quotes/shipments/tasks/activity/NPS)
- 🔴 NPS/CX dashboard: gauge (SVG), word cloud, promoter/detractor, insights (`customer.html`)
- ✅ `reports.html` баялаг шинжилгээ: концентраци, эх сурвалжийн хөрвөлт, татгалзсан шалтгаан, салбар, NPS индекс, KAM 7 хоног (`_lib/reports.ts` + `/crm/reports`-д "Бизнес шинжилгээ")
- 🔴 Стратегийн сегмент: Тулгуур/Хөгжүүлэх/Тогтвортой/Нэг удаагийн (`segment_test.html`)

## 5. Жилийн / улирлын зорилт
- ✅ 2026 зорилт явц + alert (dashboard) · жилийн drill-down (`/crm/year/[yr]`) · 2022–2026 цуврал (`/crm/performance`)
- 🟡 YoY өсөлт % · CAGR · жил бүрийн топ харилцагч (`annual_dashboard.html`)

## 6. Бусад
- ✅ Эрх/аудит/глобал хайлт · Sheets синк · AI туслах · автоматжуулалт · notification bell
- 🔨 Имэйл/SMS илгээх (баг барьж байгаа)
- 🔴 Phase 2 (`crm_design.html`): харилцагчийн портал, GPS, FB Lead Ads авто холболт, авто үнэ бодох

## Тодруулах (тоо — таамаглахгүй)
- KAM зорилт: `TARGET_2026.kam` (жил) vs Q2 план (`PLAN_2026.kamQ2`) — цаг хугацааны хамрах хүрээ өөр. Жилийн KAM зорилт зөв эсэхийг баталгаажуулах.
- Одонтунгалаг 95 (app.py KAM) vs 510 (Орон нутаг тогтмол СЕГМЕНТ, Q2 план) — өөр хэмжүүр, зөрүү биш.
- Бүх зорилт/босго тоо прототипийн яг утгаар. Өөрчлөхгүй, эх сурвалж = HTML/`docs/CRM-INTEGRATION.md`.
