/**
 * POST /api/bp-assistant/stream
 * ──────────────────────────────
 * Streaming version — Server-Sent Events (text/event-stream).
 * Tool call дуусах хүртэл хоосон байж, дараа нь text chunk-уудыг урсгана.
 */

import { NextRequest } from 'next/server';
import { ai } from '@/ai/genkit';
import { requireTenantAuth } from '@/lib/api/auth-middleware';
import { getFirebaseAdminFirestore } from '@/lib/firebase-admin';
import { createStrategyAgentTools } from '@/ai/agents/strategy-agent';
import { getBpSession, upsertBpSession, formatSessionForPrompt } from '@/lib/bp-session/bp-session-manager';

// ── Bootstrap helpers (route.ts-с давхардуулж хадгалах)
function getCurrentQuarterLabel(): string {
  const m = new Date().getMonth();
  if (m < 3) return 'Q1 (1-р улирал)';
  if (m < 6) return 'Q2 (2-р улирал)';
  if (m < 9) return 'Q3 (3-р улирал)';
  return 'Q4 (4-р улирал)';
}

async function getBootstrapContext(companyId: string) {
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

    let totalObjectives = 0, atRiskCount = 0, completedKpiCount = 0, totalKpiCount = 0;
    if (activePlan) {
      const [objSnap, kpiSnap] = await Promise.all([
        db.collection(`bp_objectives`).where('planId', '==', activePlan.id).get(),
        db.collection(`bp_kpis`).where('planId', '==', activePlan.id).get(),
      ]);
      totalObjectives = objSnap.size;
      atRiskCount = objSnap.docs.filter(d => ['at_risk','behind'].includes(d.data().status)).length;
      totalKpiCount = kpiSnap.size;
      completedKpiCount = kpiSnap.docs.filter(d => d.data().ragStatus === 'green').length;
    }
    return {
      companyName: company.name || profile.name || 'Байгуулага',
      mission: profile.mission, vision: profile.vision,
      activePlanTitle: activePlan?.title, activePlanFramework: activePlan?.framework,
      activePlanYear: activePlan?.fiscalYear,
      totalObjectives, atRiskCount, completedKpiCount, totalKpiCount,
    };
  } catch {
    return { companyName: 'Байгуулага', totalObjectives: 0, atRiskCount: 0, completedKpiCount: 0, totalKpiCount: 0 };
  }
}

function buildSystemPrompt(ctx: any): string {
  const { companyName, userRole, mission, vision, activePlanTitle, activePlanFramework,
    activePlanYear, totalObjectives, atRiskCount, completedKpiCount, totalKpiCount,
    currentQuarter, currentYear } = ctx;

  const roleNote = ['company_super_admin', 'admin'].includes(userRole)
    ? '🔑 Администратор — бүрэн эрх.'
    : '🔑 Менежер — зөвлөгөө авах, статус шинэчлэх.';

  const planSnap = activePlanTitle
    ? `Идэвхтэй план: "${activePlanTitle}" (${activePlanYear}, ${activePlanFramework?.toUpperCase()}) | ${totalObjectives} зорилго | ${atRiskCount > 0 ? `⚠️ ${atRiskCount} at-risk` : '✅ OK'} | KPI: ${completedKpiCount}/${totalKpiCount}`
    : '⚠️ Идэвхтэй план байхгүй.';

  return `Та бол **${companyName}**-ийн Стратегийн AI Зөвлөх.
${mission ? `🎯 Эрхэм зорилго: ${mission}` : ''}
${vision ? `🔭 Алсын харагдал: ${vision}` : ''}
📅 ${currentYear} / ${currentQuarter}
${planSnap}
${roleNote}

OKR/OGSM/BSC/KPI methodology мэдлэгтэй. Tools: getBpContext, getCompanyContext, getHistoricalTrends, getEmployeePerformanceContext, searchStrategyDocs, createObjective, createKeyResult, updateKeyResult, createKpi, updateObjectiveStatus, getPlanProgress, searchObjectives, getObjectiveDetail.

RAG зарчим: баримтаас асуувал searchStrategyDocs дуудна. Шийдвэр бичихийн өмнө баталгаажуулах. Монгол хэлээр.`;
}

export async function POST(req: NextRequest) {
  const authResult = await requireTenantAuth(req, { rateLimit: 'ai' });
  if (authResult.response) return authResult.response;
  const { companyId, uid, role } = authResult.auth;

  let body: { messages: any[] };
  try { body = await req.json(); } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const { messages } = body;
  if (!messages || !Array.isArray(messages)) {
    return new Response('messages array шаардлагатай', { status: 400 });
  }

  const MAX_MESSAGES = 20;
  const trimmed = messages.length > MAX_MESSAGES ? messages.slice(-MAX_MESSAGES) : messages;

  const [bootstrap, session] = await Promise.all([
    getBootstrapContext(companyId),
    getBpSession(companyId, uid),
  ]);

  const basePrompt = buildSystemPrompt({
    ...bootstrap,
    userRole: role,
    currentQuarter: getCurrentQuarterLabel(),
    currentYear: new Date().getFullYear(),
  });

  const sessionCtx = formatSessionForPrompt(session);
  const systemPrompt = sessionCtx ? `${basePrompt}\n\n${sessionCtx}` : basePrompt;
  const tools = createStrategyAgentTools(companyId, uid);

  // ── SSE stream ─────────────────────────────────────────────────────────
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: data })}\n\n`));

      try {
        const { stream: genStream, response } = ai.generateStream({
          system: systemPrompt,
          messages: trimmed,
          tools,
          maxTurns: 10,
        });

        let fullText = '';
        for await (const chunk of genStream) {
          const t = chunk.text;
          if (t) { send(t); fullText += t; }
        }

        // Session update (fire-and-forget)
        upsertBpSession(companyId, uid, {
          summary: fullText.slice(0, 300),
          messageCount: (session?.messageCount || 0) + trimmed.length,
        }).catch(() => {});

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      } catch (err: any) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: err.message || 'Алдаа' })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
