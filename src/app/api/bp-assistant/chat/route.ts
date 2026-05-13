/**
 * POST /api/bp-assistant/chat
 * Business Plan модулийн тусгай AI агент — Фаз 1 (Enriched Context).
 * Байгуулагын бүрэн контекст (profile, mission, vision, values, дэлгэрэнгүй BP),
 * тухайн улирал, явцын дүн шинжилгээтэй.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { requireTenantAuth } from '@/lib/api/auth-middleware';
import { getFirebaseAdminFirestore } from '@/lib/firebase-admin';
import { createStrategyAgentTools } from '@/ai/agents/strategy-agent';
import {
  getBpSession,
  upsertBpSession,
  formatSessionForPrompt,
} from '@/lib/bp-session/bp-session-manager';

// ─── Helpers ──────────────────────────────────────────────────────────────

function getCurrentQuarterLabel(): string {
  const month = new Date().getMonth(); // 0-indexed
  if (month < 3) return 'Q1 (1-р улирал)';
  if (month < 6) return 'Q2 (2-р улирал)';
  if (month < 9) return 'Q3 (3-р улирал)';
  return 'Q4 (4-р улирал)';
}

/** Байгуулагын нэр + идэвхтэй план-ийн хурдан snapshot авна */
async function getBootstrapContext(companyId: string): Promise<{
  companyName: string;
  mission?: string;
  vision?: string;
  activePlanTitle?: string;
  activePlanFramework?: string;
  activePlanYear?: number;
  totalObjectives: number;
  atRiskCount: number;
  completedKpiCount: number;
  totalKpiCount: number;
}> {
  const db = getFirebaseAdminFirestore();
  void companyId; // single-tenant — top-level paths

  try {
    const [companySnap, profileSnap, plansSnap] = await Promise.all([
      db.doc(`company/profile`).get(),
      db.doc(`company/profile`).get(),
      db.collection(`bp_plans`).where('status', '==', 'active').limit(1).get(),
    ]);

    const company = companySnap.data() as any || {};
    const profile = profileSnap.data() as any || {};
    const activePlan = plansSnap.empty ? null : { id: plansSnap.docs[0].id, ...plansSnap.docs[0].data() } as any;

    let totalObjectives = 0;
    let atRiskCount = 0;
    let completedKpiCount = 0;
    let totalKpiCount = 0;

    if (activePlan) {
      const [objSnap, kpiSnap] = await Promise.all([
        db.collection(`${base}/bp_objectives`).where('planId', '==', activePlan.id).get(),
        db.collection(`${base}/bp_kpis`).where('planId', '==', activePlan.id).get(),
      ]);
      totalObjectives = objSnap.size;
      atRiskCount = objSnap.docs.filter(d => {
        const s = d.data().status;
        return s === 'at_risk' || s === 'behind';
      }).length;
      totalKpiCount = kpiSnap.size;
      completedKpiCount = kpiSnap.docs.filter(d => d.data().ragStatus === 'green').length;
    }

    return {
      companyName: company.name || profile.name || 'Байгуулага',
      mission: profile.mission,
      vision: profile.vision,
      activePlanTitle: activePlan?.title,
      activePlanFramework: activePlan?.framework,
      activePlanYear: activePlan?.fiscalYear,
      totalObjectives,
      atRiskCount,
      completedKpiCount,
      totalKpiCount,
    };
  } catch {
    return { companyName: 'Байгуулага', totalObjectives: 0, atRiskCount: 0, completedKpiCount: 0, totalKpiCount: 0 };
  }
}

// ─── System Prompt ─────────────────────────────────────────────────────────

function buildStrategySystemPrompt(ctx: {
  companyName: string;
  companyId: string;
  userRole: string;
  mission?: string;
  vision?: string;
  activePlanTitle?: string;
  activePlanFramework?: string;
  activePlanYear?: number;
  totalObjectives: number;
  atRiskCount: number;
  completedKpiCount: number;
  totalKpiCount: number;
  currentQuarter: string;
  currentYear: number;
}): string {
  const { companyName, userRole, mission, vision, activePlanTitle, activePlanFramework,
    activePlanYear, totalObjectives, atRiskCount, completedKpiCount, totalKpiCount,
    currentQuarter, currentYear } = ctx;

  const roleNote = ['company_super_admin', 'admin'].includes(userRole)
    ? '🔑 Хэрэглэгч нь бүрэн эрхтэй администратор — objective, KR, KPI үүсгэх, шинэчлэх бүрэн боломжтой.'
    : '🔑 Хэрэглэгч нь менежер — зөвлөгөө авах, статус шинэчлэх боломжтой.';

  const planSnapshot = activePlanTitle
    ? `**Идэвхтэй план:** "${activePlanTitle}" (${activePlanYear}, ${activePlanFramework?.toUpperCase()})
**Явцын хурдан дүн:** ${totalObjectives} зорилго | ${atRiskCount > 0 ? `⚠️ ${atRiskCount} at-risk` : '✅ at-risk байхгүй'} | KPI: ${completedKpiCount}/${totalKpiCount} хэвийн`
    : '⚠️ Идэвхтэй Business Plan байхгүй. Шинэ план үүсгэхийг санал болгоно уу.';

  const companyContext = [
    mission ? `🎯 **Эрхэм зорилго:** ${mission}` : '',
    vision ? `🔭 **Алсын харагдал:** ${vision}` : '',
  ].filter(Boolean).join('\n');

  return `Та бол **${companyName}** байгуулагын ганцхан, өвөрмөц **Стратегийн AI Зөвлөх** юм.
Энэ байгуулагын бизнесийн зорилго, стратеги, ажилтны гүйцэтгэлийг бүрэн ойлгодог.

---

## 🏢 Байгуулагын профайл

**Байгуулага:** ${companyName}
${companyContext}

## 📅 Одоогийн контекст

**Он:** ${currentYear} | **Улирал:** ${currentQuarter}
${planSnapshot}

---

## 🧠 Таны мэдлэг ба чадвар

### Стратегийн аргачилалууд
- **OKR:** Andy Grove/Google аргачилал — амбициоз zорилго, хэмжигдэхүйц KR, улирлын каскад, confidence level 0.0–1.0
- **OGSM:** Objective → Goal → Strategy → Measure гэсэн жилийн каскад
- **BSC:** Kaplan & Norton-ийн 4 perspective — санхүүгийн, хэрэглэгчийн, дотоод процесс, суралцахуй & өсөлт
- **KPI Management:** Leading/lagging indicators, RAG status, threshold тохиргоо, trend analysis
- **360° Performance:** Manager (60%) + self (20%) + peer (20%) weighted scoring

### 🔧 Системийн tools
| Tool | Зориулалт |
|---|---|
| getBpContext | Идэвхтэй план, бүх objective/KR/KPI-ийн snapshot |
| getCompanyContext | Байгуулагын профайл, хэлтэс, mission/vision, values, түүхэн планууд |
| getHistoricalTrends | KPI-ийн 90 хоногийн trend, өсөлт/уналтын шинжилгээ |
| getEmployeePerformanceContext | Хариуцагчдын явц, хэлтсийн гүйцэтгэл, 360° score |
| getObjectiveDetail | Нэг objective-ийн дэлгэрэнгүй + KR-ууд |
| getPlanProgress | Plan-ийн theme-ээр явц, RAG, recommendation |
| searchObjectives | Статус/улирал/хэлтсээр хайлт |
| createObjective | Шинэ zорилго үүсгэх |
| createKeyResult | KR нэмэх |
| updateKeyResult | KR шинэчлэх |
| createKpi | KPI үүсгэх |
| updateObjectiveStatus | Objective статус шинэчлэх |

${roleNote}

---

## Харилцааны зарчим

1. **Эхлэхийн өмнө контекст уншина** — мэдэгдэх зүйл асуухад getBpContext эхлээд дуудна
2. **Байгуулагыг мэддэг юм шиг ярина** — "Таны ${companyName}-д...", "Энэ жилийн ${currentQuarter}-д..."
3. **Тодорхой, практик алхмууд** — академик биш, ажиллагааны зөвлөгөө
4. **Баталгаажуулалт** — бичих үйлдлийн өмнө заавал асуух
5. **Монгол хэлээр** ярина

### RAG баримт ашиглах зарчим
- Байгуулагын өнгөрсөн шийдвэр, бодлого, тайлангийн талаар асуувал **searchStrategyDocs** дуудна
- "Өмнө нь юу шийдсэн байсан вэ", "Board-д юу танилцуулсан вэ" гэх асуулт → RAG
- Олдсон хэсгүүдийг эш татаж, эх сурвалж дурдана: "[Баримтын нэр]-д дурдсанаар..."

### Хийхгүй зүйл
- Контекст уншилгүй зөвлөгөө өгөхгүй
- "Маш сайн асуулт" мэтийн хоосон магтаал хэлэхгүй
- Нэг хариулт дотор 3-аас дээш tool дуудахгүй

---

## OKR шилдэг туршлага

**Зөв OKR:** Objective амбициоз (60% биелэх боломжтой), KR 3–5, хэмжигдэхүйц, confidence: 0.3=at risk / 0.7=on track / 1.0=done
**OKR vs KPI:** OKR = стратегийн өөрчлөлт (change), KPI = операциональ эрүүл мэнд (health)
**BSC жин:** 4 perspective нийт 100%, байгуулагын стратегиас хамаарна

Одоо хэрэглэгчийн асуултад хариулна уу.`;
}

// ─── Route handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const authResult = await requireTenantAuth(req, { rateLimit: 'ai' });
  if (authResult.response) return authResult.response;
  const { companyId, uid, role } = authResult.auth;

  try {
    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array шаардлагатай' }, { status: 400 });
    }

    // Context window хамгаалалт
    const MAX_MESSAGES = 20;
    const trimmedMessages = messages.length > MAX_MESSAGES
      ? messages.slice(messages.length - MAX_MESSAGES)
      : messages;

    // Bootstrap context + session memory — зэрэгцүүлж авна
    const [bootstrap, session] = await Promise.all([
      getBootstrapContext(companyId),
      getBpSession(companyId, uid),
    ]);
    const currentYear = new Date().getFullYear();

    // System prompt = company context + session memory
    const basePrompt = buildStrategySystemPrompt({
      companyName: bootstrap.companyName,
      companyId,
      userRole: role,
      mission: bootstrap.mission,
      vision: bootstrap.vision,
      activePlanTitle: bootstrap.activePlanTitle,
      activePlanFramework: bootstrap.activePlanFramework,
      activePlanYear: bootstrap.activePlanYear,
      totalObjectives: bootstrap.totalObjectives,
      atRiskCount: bootstrap.atRiskCount,
      completedKpiCount: bootstrap.completedKpiCount,
      totalKpiCount: bootstrap.totalKpiCount,
      currentQuarter: getCurrentQuarterLabel(),
      currentYear,
    });

    // Session memory inject
    const sessionContext = formatSessionForPrompt(session);
    const systemPrompt = sessionContext
      ? `${basePrompt}\n\n${sessionContext}`
      : basePrompt;

    const tools = createStrategyAgentTools(companyId, uid);

    console.log('[BP Assistant] company:', companyId, 'role:', role,
      'plan:', bootstrap.activePlanTitle || 'none',
      'session:', session ? 'loaded' : 'new',
      'messages:', trimmedMessages.length);

    const result = await ai.generate({
      system: systemPrompt,
      messages: trimmedMessages,
      tools,
      maxTurns: 10,
    });

    const responseText = result.text || '';

    // Session update — fire-and-forget (UI-г хойшлуулахгүй)
    upsertBpSession(companyId, uid, {
      summary: responseText.slice(0, 300),
      messageCount: (session?.messageCount || 0) + trimmedMessages.length,
    }).catch(() => {});

    return NextResponse.json({ text: responseText });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Алдаа гарлаа';
    console.error('[BP Assistant] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
