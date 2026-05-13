/**
 * strategy-agent.ts
 * ─────────────────
 * Бизнесийн стратегийн AI агент.
 * Business Plan модулийн bp_* collection-уудтай бүрэн ажиллана:
 *   - Унших: plan, theme, objective, KR, KPI, strategy, review, score
 *   - Бичих: objective, key result, KPI, strategy үүсгэх/шинэчлэх
 *
 * Methodology: OKR (Andy Grove/Google), OGSM, BSC (Kaplan & Norton),
 *              KPI management, OKR Confidence Level, 360° feedback
 */

import { z } from 'zod';
import { ai } from '../genkit';
import { getFirebaseAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { searchBpDocs, formatBpContextForPrompt, BP_DOC_TYPE_LABELS } from '@/lib/bp-rag/bp-rag-engine';

// ─── Output schemas ────────────────────────────────────────────────────────

const planSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  fiscalYear: z.number(),
  framework: z.enum(['okr', 'ogsm', 'bsc']),
  status: z.string(),
  startDate: z.string(),
  endDate: z.string(),
});

const themeSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  color: z.string(),
  weight: z.number(),
  status: z.string(),
  perspectiveType: z.string().optional(),
});

const objectiveSummarySchema = z.object({
  id: z.string(),
  themeId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  quarter: z.string().optional(),
  year: z.number(),
  ownerId: z.string(),
  ownerName: z.string(),
  status: z.string(),
  progress: z.number(),
  level: z.string().optional(),
});

const keyResultSummarySchema = z.object({
  id: z.string(),
  objectiveId: z.string(),
  title: z.string(),
  metricType: z.string(),
  startValue: z.number(),
  currentValue: z.number(),
  targetValue: z.number(),
  unit: z.string(),
  status: z.string(),
  dueDate: z.string().optional(),
  confidenceLevel: z.number().optional(),
});

const kpiSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  metricType: z.string(),
  target: z.number(),
  current: z.number(),
  unit: z.string(),
  frequency: z.string(),
  ragStatus: z.string(),
  ownerName: z.string().optional(),
});

const actionResultSchema = z.object({
  success: z.boolean(),
  id: z.string().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

// ─── Factory ────────────────────────────────────────────────────────────────

export function createStrategyAgentTools(companyId: string, userId?: string) {
  const db = getFirebaseAdminFirestore;
  // Single-tenant production: бүх collection top-level дээр байх тул base=''
  // (multi-tenant SaaS-д "companies/{cid}/" prefix байсан).
  void companyId; // referenced for compat; not used in single-tenant paths
  const base = '';
  void base;

  // ── 1. getBpContext ──────────────────────────────────────────────────────
  const getBpContext = ai.defineTool(
    {
      name: 'getBpContext',
      description: `Одоогийн идэвхтэй Business Plan болон бүх стратегийн өгөгдлийг авна.
Plan, theme, objective, KR, KPI-ийн бүрэн дүр зургийг нэг дор харна.
Аливаа зөвлөгөө өгөхийн өмнө энэ tool-ийг эхлээд дуудна уу.`,
      inputSchema: z.object({
        includeScores: z.boolean().optional().describe('Performance score оруулах эсэх'),
      }),
      outputSchema: z.object({
        activePlan: planSummarySchema.nullable(),
        themes: z.array(themeSummarySchema),
        objectives: z.array(objectiveSummarySchema),
        keyResults: z.array(keyResultSummarySchema),
        kpis: z.array(kpiSummarySchema),
        summary: z.string(),
      }),
    },
    async ({ includeScores }) => {
      try {
        const [plansSnap, themesSnap, objSnap, krSnap, kpiSnap] = await Promise.all([
          db().collection(`bp_plans`).orderBy('createdAt', 'desc').limit(5).get(),
          db().collection(`bp_themes`).orderBy('order', 'asc').get(),
          db().collection(`bp_objectives`).orderBy('createdAt', 'desc').get(),
          db().collection(`bp_key_results`).orderBy('createdAt', 'desc').get(),
          db().collection(`bp_kpis`).orderBy('createdAt', 'desc').get(),
        ]);

        const plans = plansSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        const activePlan = plans.find(p => p.status === 'active') || plans[0] || null;

        const themes = themesSnap.docs
          .filter(d => !activePlan || d.data().planId === activePlan?.id)
          .map(d => ({ id: d.id, ...d.data() })) as any[];

        const objectives = objSnap.docs
          .filter(d => !activePlan || d.data().planId === activePlan?.id)
          .map(d => ({ id: d.id, ...d.data() })) as any[];

        const keyResults = krSnap.docs
          .filter(d => !activePlan || d.data().planId === activePlan?.id)
          .map(d => ({ id: d.id, ...d.data() })) as any[];

        const kpis = kpiSnap.docs
          .filter(d => !activePlan || d.data().planId === activePlan?.id)
          .map(d => ({ id: d.id, ...d.data() })) as any[];

        const overdueKrs = keyResults.filter(kr => {
          if (!kr.dueDate || kr.status === 'completed') return false;
          return new Date(kr.dueDate) < new Date();
        });

        const summary = activePlan
          ? `Идэвхтэй план: "${activePlan.title}" (${activePlan.fiscalYear}, ${activePlan.framework?.toUpperCase()})
${themes.length} стратегийн чиглэл | ${objectives.length} зорилго | ${keyResults.length} KR | ${kpis.length} KPI
${overdueKrs.length > 0 ? `⚠️ ${overdueKrs.length} KR хугацаа хэтэрсэн` : '✅ Хугацааны асуудал байхгүй'}`
          : 'Идэвхтэй Business Plan байхгүй байна.';

        return { activePlan, themes, objectives, keyResults, kpis, summary };
      } catch (err: any) {
        return {
          activePlan: null, themes: [], objectives: [], keyResults: [], kpis: [],
          summary: `Алдаа: ${err.message}`,
        };
      }
    }
  );

  // ── 2. getObjectiveDetail ────────────────────────────────────────────────
  const getObjectiveDetail = ai.defineTool(
    {
      name: 'getObjectiveDetail',
      description: 'Нэг Objective-ийн дэлгэрэнгүй мэдээлэл + түүний бүх KR-ийг авна.',
      inputSchema: z.object({
        objectiveId: z.string().describe('Objective-ийн Firestore ID'),
      }),
      outputSchema: z.object({
        objective: objectiveSummarySchema.nullable(),
        keyResults: z.array(keyResultSummarySchema),
        progress: z.number(),
        healthAssessment: z.string(),
      }),
    },
    async ({ objectiveId }) => {
      try {
        const [objSnap, krSnap] = await Promise.all([
          db().doc(`bp_objectives/${objectiveId}`).get(),
          db().collection(`bp_key_results`).where('objectiveId', '==', objectiveId).get(),
        ]);

        if (!objSnap.exists) {
          return { objective: null, keyResults: [], progress: 0, healthAssessment: 'Objective олдсонгүй.' };
        }

        const obj = { id: objSnap.id, ...objSnap.data() } as any;
        const krs = krSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

        // Progress тооцоолол
        const progress = krs.length > 0
          ? Math.round(krs.reduce((sum, kr) => {
              if (kr.metricType === 'boolean') return sum + (kr.currentValue >= 1 ? 100 : 0);
              const range = kr.targetValue - kr.startValue;
              if (range === 0) return sum + (kr.currentValue >= kr.targetValue ? 100 : 0);
              return sum + Math.max(0, Math.min(100, ((kr.currentValue - kr.startValue) / range) * 100));
            }, 0) / krs.length)
          : 0;

        // Health assessment
        const overdueKrs = krs.filter(kr => kr.dueDate && new Date(kr.dueDate) < new Date() && kr.status !== 'completed');
        const atRiskKrs = krs.filter(kr => kr.status === 'at_risk' || kr.status === 'behind');
        const avgConfidence = krs.filter(kr => kr.confidenceLevel !== undefined).reduce((s, kr) => s + kr.confidenceLevel, 0) / (krs.filter(kr => kr.confidenceLevel !== undefined).length || 1);

        let health = `📊 Явц: ${progress}%\n`;
        if (overdueKrs.length > 0) health += `⚠️ ${overdueKrs.length} KR хугацаа хэтэрсэн\n`;
        if (atRiskKrs.length > 0) health += `🔴 ${atRiskKrs.length} KR эрсдэлтэй\n`;
        if (krs.filter(kr => kr.confidenceLevel !== undefined).length > 0) {
          health += `💡 Дундаж confidence: ${avgConfidence.toFixed(1)}\n`;
        }
        if (progress < 30 && obj.status !== 'not_started') health += `🚨 Явц хэт удааширсан байна`;
        else if (progress >= 70) health += `✅ Явц хэвийн`;

        return { objective: obj, keyResults: krs, progress, healthAssessment: health };
      } catch (err: any) {
        return { objective: null, keyResults: [], progress: 0, healthAssessment: `Алдаа: ${err.message}` };
      }
    }
  );

  // ── 3. createObjective ──────────────────────────────────────────────────
  const createObjective = ai.defineTool(
    {
      name: 'createObjective',
      description: `Шинэ Objective (зорилго) үүсгэнэ.
OKR-д quarter заавал оруулна. OGSM/BSC-д quarter шаардлагагүй.
Objective нь амбициоз, хэмжигдэхүйц, тодорхой байх ёстой.`,
      inputSchema: z.object({
        planId: z.string().describe('Business Plan-ийн ID'),
        themeId: z.string().describe('Стратегийн чиглэлийн ID'),
        title: z.string().describe('Objective-ийн нэр — амбициоз, тодорхой байх ёстой'),
        description: z.string().optional().describe('Нэмэлт тайлбар'),
        quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']).optional().describe('OKR-д улирал'),
        year: z.number().describe('Он'),
        ownerId: z.string().optional().describe('Хариуцагчийн UID'),
        ownerName: z.string().optional().describe('Хариуцагчийн нэр'),
        level: z.enum(['company', 'department', 'individual']).optional().default('company'),
      }),
      outputSchema: actionResultSchema,
    },
    async (input) => {
      try {
        const ref = await db().collection(`bp_objectives`).add({
          ...input,
          progress: 0,
          status: 'not_started',
          createdAt: new Date().toISOString(),
          createdBy: userId ?? '',
        });
        return { success: true, id: ref.id, message: `Objective "${input.title}" амжилттай үүсгэгдлээ (ID: ${ref.id})` };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  );

  // ── 4. createKeyResult ──────────────────────────────────────────────────
  const createKeyResult = ai.defineTool(
    {
      name: 'createKeyResult',
      description: `Objective-д Key Result (гол үр дүн) нэмнэ.
KR нь хэмжигдэхүйц байх ёстой: тоо, хувь, эсвэл мөнгөн дүн.
Boolean (тийм/үгүй) нь Initiative зориулалттай — жинхэнэ KR биш.
Confidence level: 0.0 (эрсдэлтэй) → 1.0 (биелсэн).`,
      inputSchema: z.object({
        planId: z.string(),
        objectiveId: z.string().describe('Холбоотой Objective-ийн ID'),
        themeId: z.string().describe('Холбоотой Theme-ийн ID'),
        title: z.string().describe('KR-ийн нэр — хэмжигдэхүйц байх ёстой'),
        metricType: z.enum(['number', 'percentage', 'currency', 'boolean']),
        startValue: z.number().describe('Эхлэх утга'),
        targetValue: z.number().describe('Зорилтот утга'),
        currentValue: z.number().optional().default(0),
        unit: z.string().optional().default('').describe('Нэгж: ₮, %, ш г.м.'),
        ownerId: z.string().optional(),
        ownerName: z.string().optional(),
        dueDate: z.string().optional().describe('YYYY-MM-DD формат'),
        confidenceLevel: z.number().min(0).max(1).optional().describe('0.0–1.0'),
      }),
      outputSchema: actionResultSchema,
    },
    async (input) => {
      try {
        const ref = await db().collection(`bp_key_results`).add({
          ...input,
          currentValue: input.currentValue ?? 0,
          status: 'not_started',
          createdAt: new Date().toISOString(),
        });
        return { success: true, id: ref.id, message: `Key Result "${input.title}" амжилттай нэмэгдлээ (ID: ${ref.id})` };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  );

  // ── 5. updateKeyResult ──────────────────────────────────────────────────
  const updateKeyResult = ai.defineTool(
    {
      name: 'updateKeyResult',
      description: 'KR-ийн одоогийн утга (currentValue), status, confidence level шинэчлэнэ.',
      inputSchema: z.object({
        keyResultId: z.string().describe('KR-ийн Firestore ID'),
        currentValue: z.number().optional(),
        status: z.enum(['not_started', 'on_track', 'at_risk', 'behind', 'completed']).optional(),
        confidenceLevel: z.number().min(0).max(1).optional(),
        notes: z.string().optional(),
      }),
      outputSchema: actionResultSchema,
    },
    async (input) => {
      try {
        const { keyResultId, ...updates } = input;
        const updateData: Record<string, any> = { ...updates, updatedAt: new Date().toISOString() };

        // History-д бичнэ
        const krSnap = await db().doc(`bp_key_results/${keyResultId}`).get();
        if (krSnap.exists && updates.currentValue !== undefined) {
          const prev = krSnap.data()?.currentValue ?? 0;
          if (prev !== updates.currentValue) {
            await db().collection(`bp_kpi_history`).add({
              kpiId: keyResultId,
              planId: krSnap.data()?.planId,
              value: updates.currentValue,
              previousValue: prev,
              recordedAt: new Date().toISOString(),
            });
          }
        }

        await db().doc(`bp_key_results/${keyResultId}`).update(updateData);
        return { success: true, message: 'KR амжилттай шинэчлэгдлээ.' };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  );

  // ── 6. createKpi ────────────────────────────────────────────────────────
  const createKpi = ai.defineTool(
    {
      name: 'createKpi',
      description: `Шинэ KPI үүсгэнэ.
KPI нь операциональ хэмжүүр: ирц, борлуулалт, хэрэглэгчийн сэтгэл ханамж г.м.
OKR Key Result-аас ялгаатай: KPI нь BAU (business as usual) хэмжинэ.
RAG status автоматаар тооцоологдоно: ≥90% → green, ≥70% → amber, <70% → red.`,
      inputSchema: z.object({
        planId: z.string(),
        name: z.string().describe('KPI-ийн нэр'),
        description: z.string().optional(),
        metricType: z.enum(['number', 'percentage', 'currency', 'boolean']),
        target: z.number().describe('Зорилтот утга'),
        current: z.number().optional().default(0),
        unit: z.string().optional().default(''),
        frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly']),
        themeId: z.string().optional().default(''),
        ownerId: z.string().optional().default(''),
        ownerName: z.string().optional().default(''),
        departmentId: z.string().optional().default(''),
      }),
      outputSchema: actionResultSchema,
    },
    async (input) => {
      try {
        // RAG status тооцоолол
        const achievement = input.target > 0 ? (input.current ?? 0) / input.target * 100 : 0;
        const ragStatus = achievement >= 90 ? 'green' : achievement >= 70 ? 'amber' : 'red';

        const ref = await db().collection(`bp_kpis`).add({
          ...input,
          current: input.current ?? 0,
          ragStatus,
          createdAt: new Date().toISOString(),
        });
        return { success: true, id: ref.id, message: `KPI "${input.name}" амжилттай үүсгэгдлээ (ID: ${ref.id})` };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  );

  // ── 7. updateObjectiveStatus ────────────────────────────────────────────
  const updateObjectiveStatus = ai.defineTool(
    {
      name: 'updateObjectiveStatus',
      description: 'Objective-ийн статус шинэчлэнэ.',
      inputSchema: z.object({
        objectiveId: z.string(),
        status: z.enum(['not_started', 'on_track', 'at_risk', 'behind', 'completed']),
        notes: z.string().optional(),
      }),
      outputSchema: actionResultSchema,
    },
    async ({ objectiveId, status, notes }) => {
      try {
        await db().doc(`bp_objectives/${objectiveId}`).update({
          status,
          ...(notes ? { notes } : {}),
          updatedAt: new Date().toISOString(),
        });
        return { success: true, message: `Objective статус "${status}" болж шинэчлэгдлээ.` };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  );

  // ── 8. getPlanProgress ─────────────────────────────────────────────────
  const getPlanProgress = ai.defineTool(
    {
      name: 'getPlanProgress',
      description: `Business Plan-ийн бүрэн явцыг тооцоолно.
Theme тус бүрийн явц, нийт plan-ийн явц, RAG статистик, хоцорсон KR зэргийг буцаана.
Ерөнхий дүгнэлт болон recommendation-г мөн оруулна.`,
      inputSchema: z.object({
        planId: z.string().optional().describe('Хэрэв байхгүй бол идэвхтэй plan ашиглана'),
      }),
      outputSchema: z.object({
        planTitle: z.string(),
        planProgress: z.number(),
        themeBreakdown: z.array(z.object({
          themeTitle: z.string(),
          weight: z.number(),
          progress: z.number(),
          objectiveCount: z.number(),
          atRiskCount: z.number(),
        })),
        kpiSummary: z.object({
          green: z.number(),
          amber: z.number(),
          red: z.number(),
        }),
        overdueKrCount: z.number(),
        recommendation: z.string(),
      }),
    },
    async ({ planId }) => {
      try {
        // Plan авах
        let plan: any;
        if (planId) {
          const snap = await db().doc(`bp_plans/${planId}`).get();
          plan = snap.exists ? { id: snap.id, ...snap.data() } : null;
        } else {
          const snap = await db().collection(`bp_plans`)
            .where('status', '==', 'active').limit(1).get();
          plan = snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
        }

        if (!plan) return {
          planTitle: 'Идэвхтэй план байхгүй', planProgress: 0,
          themeBreakdown: [], kpiSummary: { green: 0, amber: 0, red: 0 },
          overdueKrCount: 0, recommendation: 'Business Plan үүсгэнэ үү.',
        };

        const [themesSnap, objSnap, krSnap, kpiSnap] = await Promise.all([
          db().collection(`bp_themes`).where('planId', '==', plan.id).get(),
          db().collection(`bp_objectives`).where('planId', '==', plan.id).get(),
          db().collection(`bp_key_results`).where('planId', '==', plan.id).get(),
          db().collection(`bp_kpis`).where('planId', '==', plan.id).get(),
        ]);

        const themes = themesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        const objectives = objSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        const keyResults = krSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        const kpis = kpiSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

        // KR progress helper
        const krProgress = (kr: any) => {
          if (kr.metricType === 'boolean') return kr.currentValue >= 1 ? 100 : 0;
          const range = kr.targetValue - kr.startValue;
          if (range === 0) return kr.currentValue >= kr.targetValue ? 100 : 0;
          return Math.max(0, Math.min(100, ((kr.currentValue - kr.startValue) / range) * 100));
        };

        // Theme breakdown
        const themeBreakdown = themes.map(t => {
          const themeObjs = objectives.filter((o: any) => o.themeId === t.id);
          const themeKrs = keyResults.filter((kr: any) =>
            themeObjs.some((o: any) => o.id === kr.objectiveId)
          );
          const progress = themeKrs.length > 0
            ? Math.round(themeKrs.reduce((s: number, kr: any) => s + krProgress(kr), 0) / themeKrs.length)
            : 0;
          const atRiskCount = themeObjs.filter((o: any) => o.status === 'at_risk' || o.status === 'behind').length;
          return {
            themeTitle: t.title,
            weight: t.weight ?? 0,
            progress,
            objectiveCount: themeObjs.length,
            atRiskCount,
          };
        });

        // Weighted plan progress
        const totalWeight = themes.reduce((s, t) => s + (t.weight ?? 0), 0);
        const planProgress = totalWeight > 0
          ? Math.round(themeBreakdown.reduce((s, t) => s + t.progress * t.weight, 0) / totalWeight)
          : 0;

        // KPI RAG
        const kpiSummary = {
          green: kpis.filter((k: any) => k.ragStatus === 'green').length,
          amber: kpis.filter((k: any) => k.ragStatus === 'amber').length,
          red: kpis.filter((k: any) => k.ragStatus === 'red').length,
        };

        // Overdue KR
        const overdueKrCount = keyResults.filter((kr: any) =>
          kr.dueDate && new Date(kr.dueDate) < new Date() && kr.status !== 'completed'
        ).length;

        // Recommendation
        let rec = '';
        if (planProgress < 25) rec = '🚨 Явц маш удааширсан байна. Хориглогдсон зүйлсийг шалгаж, at-risk objective-уудад анхаарал хандуулна уу.';
        else if (planProgress < 50) rec = '⚠️ Явц дунджаас доогуур. At-risk KR-уудад нэмэлт нөөц шаардлагатай.';
        else if (planProgress < 75) rec = '🟡 Явц хэвийн. KR-уудын confidence level-ийг шинэчлэх цаг болсон.';
        else rec = '✅ Явц маш сайн. Q3/Q4-д ambition нэмэгдүүлэх боломжтой.';
        if (overdueKrCount > 0) rec += ` ${overdueKrCount} KR хугацаа хэтэрсэн байна — шуурхай шийдвэр гаргана уу.`;

        return { planTitle: plan.title, planProgress, themeBreakdown, kpiSummary, overdueKrCount, recommendation: rec };
      } catch (err: any) {
        return {
          planTitle: 'Алдаа', planProgress: 0, themeBreakdown: [],
          kpiSummary: { green: 0, amber: 0, red: 0 }, overdueKrCount: 0,
          recommendation: `Алдаа: ${err.message}`,
        };
      }
    }
  );

  // ── 9. searchObjectives ─────────────────────────────────────────────────
  const searchObjectives = ai.defineTool(
    {
      name: 'searchObjectives',
      description: 'Objective-уудыг статус, улирал, чиглэл, эзэмшигчээр хайна.',
      inputSchema: z.object({
        status: z.enum(['not_started', 'on_track', 'at_risk', 'behind', 'completed']).optional(),
        quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']).optional(),
        themeId: z.string().optional(),
        ownerId: z.string().optional(),
        level: z.enum(['company', 'department', 'individual']).optional(),
      }),
      outputSchema: z.object({
        objectives: z.array(objectiveSummarySchema),
        total: z.number(),
      }),
    },
    async (filters) => {
      try {
        let q = db().collection(`bp_objectives`) as FirebaseFirestore.Query;
        if (filters.status) q = q.where('status', '==', filters.status);
        if (filters.quarter) q = q.where('quarter', '==', filters.quarter);
        if (filters.themeId) q = q.where('themeId', '==', filters.themeId);
        if (filters.ownerId) q = q.where('ownerId', '==', filters.ownerId);
        if (filters.level) q = q.where('level', '==', filters.level);

        const snap = await q.limit(50).get();
        const objectives = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        return { objectives, total: objectives.length };
      } catch (err: any) {
        return { objectives: [], total: 0 };
      }
    }
  );

  // ── 10. getCompanyContext ────────────────────────────────────────────────
  const getCompanyContext = ai.defineTool(
    {
      name: 'getCompanyContext',
      description: `Байгуулагын бүрэн профайл авна: нэр, салбар, ажилтны тоо, хэлтэс,
mission, vision, core values болон өмнөх жилийн бизнес план-ийн биелэлт.
Байгуулагын өнөөгийн байдал, стратегийн суурь мэдлэгтэй болоход ашиглана.`,
      inputSchema: z.object({}),
      outputSchema: z.object({
        company: z.object({
          name: z.string(),
          employeeCount: z.number(),
          plan: z.string(),
          address: z.string().optional(),
        }),
        profile: z.object({
          mission: z.string().optional(),
          vision: z.string().optional(),
        }),
        coreValues: z.array(z.object({
          title: z.string(),
          description: z.string(),
          emoji: z.string().optional(),
        })),
        departments: z.array(z.object({
          id: z.string(),
          name: z.string(),
          employeeCount: z.number(),
        })),
        historicalPlans: z.array(z.object({
          title: z.string(),
          fiscalYear: z.number(),
          framework: z.string(),
          status: z.string(),
        })),
        summary: z.string(),
      }),
    },
    async () => {
      try {
        // Single-tenant — company doc нь `company/profile`-аас уншагдана
        const companySnap = await db().doc(`company/profile`).get();
        const companyData = companySnap.data() as any || {};

        const [profileSnap, valuesSnap, deptsSnap, employeesSnap, plansSnap] = await Promise.all([
          db().doc(`company/profile`).get(),
          db().collection(`company/branding/values`).where('isActive', '==', true).orderBy('createdAt', 'asc').get(),
          db().collection(`departments`).get(),
          db().collection(`employees`).get(),
          db().collection(`bp_plans`).orderBy('fiscalYear', 'desc').limit(3).get(),
        ]);

        const profile = profileSnap.data() as any || {};
        const coreValues = valuesSnap.docs.map(d => {
          const v = d.data() as any;
          return { title: v.title || '', description: v.description || '', emoji: v.emoji };
        });

        // Хэлтэс тус бүрийн ажилтны тоо
        const employees = employeesSnap.docs.map(d => d.data() as any);
        const activeEmployees = employees.filter(e =>
          ['active', 'active_probation', 'active_permanent'].includes(e.status)
        );
        const depts = deptsSnap.docs.map(d => {
          const dept = { id: d.id, ...d.data() } as any;
          const count = activeEmployees.filter(e => e.departmentId === dept.id).length;
          return { id: dept.id, name: dept.name || '', employeeCount: count };
        });

        const historicalPlans = plansSnap.docs.map(d => {
          const p = d.data() as any;
          return {
            title: p.title || '',
            fiscalYear: p.fiscalYear || 0,
            framework: p.framework || '',
            status: p.status || '',
          };
        });

        const summary = [
          `🏢 ${companyData.name || profile.name || 'Байгуулага'} — ${activeEmployees.length} идэвхтэй ажилтан, ${depts.length} хэлтэс`,
          profile.mission ? `🎯 Эрхэм зорилго: ${profile.mission}` : '',
          profile.vision ? `🔭 Алсын харагдал: ${profile.vision}` : '',
          coreValues.length > 0 ? `💎 Үнэт зүйлс: ${coreValues.map(v => `${v.emoji || ''} ${v.title}`).join(', ')}` : '',
          historicalPlans.length > 0
            ? `📋 Бизнес планы түүх: ${historicalPlans.map(p => `${p.fiscalYear} (${p.framework?.toUpperCase()}, ${p.status})`).join(' → ')}`
            : '',
        ].filter(Boolean).join('\n');

        return {
          company: {
            name: companyData.name || profile.name || '',
            employeeCount: activeEmployees.length,
            plan: companyData.plan || '',
            address: companyData.address,
          },
          profile: {
            mission: profile.mission,
            vision: profile.vision,
          },
          coreValues,
          departments: depts,
          historicalPlans,
          summary,
        };
      } catch (err: any) {
        return {
          company: { name: '', employeeCount: 0, plan: '' },
          profile: {},
          coreValues: [],
          departments: [],
          historicalPlans: [],
          summary: `Алдаа: ${err.message}`,
        };
      }
    }
  );

  // ── 11. getHistoricalTrends ──────────────────────────────────────────────
  const getHistoricalTrends = ai.defineTool(
    {
      name: 'getHistoricalTrends',
      description: `KPI болон Key Result-ийн сүүлийн 90 хоногийн trend шинжилгээ хийнэ.
Аль KPI буурч байна, аль нь ахиж байна, ямар pattern илэрч байна гэдгийг тооцоолно.
Дүгнэлт болон зөвлөгөөг автоматаар бэлтгэнэ.`,
      inputSchema: z.object({
        kpiId: z.string().optional().describe('Тодорхой KPI-ийн ID. Хэрэв байхгүй бол бүх KPI-ийн trend авна.'),
        days: z.number().optional().default(90).describe('Хэдэн өдрийн түүхийг авах (default 90)'),
      }),
      outputSchema: z.object({
        trends: z.array(z.object({
          kpiId: z.string(),
          kpiName: z.string(),
          dataPoints: z.array(z.object({
            date: z.string(),
            value: z.number(),
          })),
          trendDirection: z.enum(['up', 'down', 'stable']),
          changePercent: z.number(),
          ragStatus: z.string(),
          insight: z.string(),
        })),
        summary: z.string(),
      }),
    },
    async ({ kpiId, days = 90 }) => {
      try {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        // bp_kpi_history-с татна
        let histQuery = db().collection(`bp_kpi_history`)
          .where('recordedAt', '>=', cutoff.toISOString())
          .orderBy('recordedAt', 'asc');
        if (kpiId) histQuery = histQuery.where('kpiId', '==', kpiId) as any;

        const [histSnap, kpisSnap] = await Promise.all([
          histQuery.limit(500).get(),
          db().collection(`bp_kpis`).get(),
        ]);

        const kpiMap = new Map<string, any>();
        kpisSnap.docs.forEach(d => kpiMap.set(d.id, { id: d.id, ...d.data() }));

        // KPI-аар group хийнэ
        const grouped = new Map<string, any[]>();
        histSnap.docs.forEach(d => {
          const h = d.data() as any;
          if (!grouped.has(h.kpiId)) grouped.set(h.kpiId, []);
          grouped.get(h.kpiId)!.push(h);
        });

        const trends = Array.from(grouped.entries()).map(([id, points]) => {
          const kpi = kpiMap.get(id);
          const sorted = points.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
          const first = sorted[0]?.value ?? 0;
          const last = sorted[sorted.length - 1]?.value ?? 0;
          const changePercent = first !== 0 ? Math.round(((last - first) / Math.abs(first)) * 100) : 0;
          const trendDirection: 'up' | 'down' | 'stable' =
            changePercent > 3 ? 'up' : changePercent < -3 ? 'down' : 'stable';

          const ragStatus = kpi?.ragStatus || 'red';
          let insight = '';
          if (trendDirection === 'down' && ragStatus === 'red') {
            insight = `🚨 ${kpi?.name || id}: ${days} хоногт ${Math.abs(changePercent)}% буурсан, RAG улаан байна`;
          } else if (trendDirection === 'up') {
            insight = `✅ ${kpi?.name || id}: ${changePercent}% өссөн, сайн явцтай`;
          } else if (trendDirection === 'down') {
            insight = `⚠️ ${kpi?.name || id}: ${Math.abs(changePercent)}% буурсан, анхаарал хэрэгтэй`;
          } else {
            insight = `📊 ${kpi?.name || id}: Тогтвортой (${changePercent}% өөрчлөлт)`;
          }

          return {
            kpiId: id,
            kpiName: kpi?.name || id,
            dataPoints: sorted.map(p => ({
              date: p.recordedAt?.substring(0, 10) || '',
              value: typeof p.value === 'number' ? p.value : 0,
            })),
            trendDirection,
            changePercent,
            ragStatus,
            insight,
          };
        });

        const downCount = trends.filter(t => t.trendDirection === 'down').length;
        const upCount = trends.filter(t => t.trendDirection === 'up').length;
        const summary = trends.length === 0
          ? 'KPI түүхийн мэдээлэл байхгүй байна. KPI утгуудыг тогтмол шинэчлэх шаардлагатай.'
          : `📈 ${upCount} KPI өсч, 📉 ${downCount} KPI буурч байна. Сүүлийн ${days} хоногийн дүн.`;

        return { trends, summary };
      } catch (err: any) {
        return { trends: [], summary: `Алдаа: ${err.message}` };
      }
    }
  );

  // ── 12. getEmployeePerformanceContext ────────────────────────────────────
  const getEmployeePerformanceContext = ai.defineTool(
    {
      name: 'getEmployeePerformanceContext',
      description: `Бизнес план-тэй холбоотой ажилтнуудын гүйцэтгэлийн дүн шинжилгээ.
Хэн ямар objective хариуцаж байна, тэдний гүйцэтгэлийн оноо хэд вэ,
ямар хэлтэс хамгийн сайн/муу гүйцэтгэлтэй байна гэдгийг харуулна.`,
      inputSchema: z.object({
        planId: z.string().optional().describe('Хэрэв байхгүй бол идэвхтэй планыг ашиглана'),
        topN: z.number().optional().default(10).describe('Хэдэн ажилтны мэдээлэл авах'),
      }),
      outputSchema: z.object({
        ownerObjectiveSummary: z.array(z.object({
          ownerId: z.string(),
          ownerName: z.string(),
          objectiveCount: z.number(),
          completedCount: z.number(),
          atRiskCount: z.number(),
          avgProgress: z.number(),
        })),
        performanceScores: z.array(z.object({
          employeeId: z.string(),
          employeeName: z.string(),
          overallScore: z.number(),
          rating: z.string(),
          reviewType: z.string().optional(),
        })),
        departmentSummary: z.array(z.object({
          departmentId: z.string(),
          departmentName: z.string(),
          employeeCount: z.number(),
          avgScore: z.number(),
          objectiveCount: z.number(),
        })),
        insights: z.string(),
      }),
    },
    async ({ planId, topN = 10 }) => {
      try {
        // Идэвхтэй план авах
        let activePlanId = planId;
        if (!activePlanId) {
          const planSnap = await db().collection(`bp_plans`)
            .where('status', '==', 'active').limit(1).get();
          activePlanId = planSnap.empty ? undefined : planSnap.docs[0].id;
        }

        const queries: Promise<any>[] = [
          db().collection(`bp_objectives`).get(),
          db().collection(`employees`).get(),
          db().collection(`departments`).get(),
        ];
        if (activePlanId) {
          queries.push(
            db().collection(`bp_scores`).where('planId', '==', activePlanId).get()
          );
        }

        const [objSnap, empSnap, deptSnap, scoresSnap] = await Promise.all(queries);

        const objectives = objSnap.docs
          .filter((d: any) => !activePlanId || d.data().planId === activePlanId)
          .map((d: any) => ({ id: d.id, ...d.data() })) as any[];
        const employees = empSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as any[];
        const departments = deptSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as any[];
        const scores = scoresSnap
          ? scoresSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as any[]
          : [];

        // Owner тус бүрийн objective summary
        const ownerMap = new Map<string, any>();
        objectives.forEach((obj: any) => {
          if (!obj.ownerId) return;
          if (!ownerMap.has(obj.ownerId)) {
            ownerMap.set(obj.ownerId, {
              ownerId: obj.ownerId,
              ownerName: obj.ownerName || '',
              objectiveCount: 0,
              completedCount: 0,
              atRiskCount: 0,
              progressSum: 0,
            });
          }
          const entry = ownerMap.get(obj.ownerId)!;
          entry.objectiveCount++;
          if (obj.status === 'completed') entry.completedCount++;
          if (obj.status === 'at_risk' || obj.status === 'behind') entry.atRiskCount++;
          entry.progressSum += obj.progress || 0;
        });
        const ownerObjectiveSummary = Array.from(ownerMap.values())
          .slice(0, topN)
          .map(e => ({
            ...e,
            avgProgress: e.objectiveCount > 0 ? Math.round(e.progressSum / e.objectiveCount) : 0,
          }));

        // Performance scores
        const performanceScores = scores
          .slice(0, topN)
          .map((s: any) => ({
            employeeId: s.employeeId || '',
            employeeName: s.employeeName || '',
            overallScore: s.overallScore || 0,
            rating: s.rating || '',
            reviewType: s.reviewType,
          }));

        // Department summary
        const activeEmps = employees.filter((e: any) =>
          ['active', 'active_probation', 'active_permanent'].includes(e.status)
        );
        const deptSummary = departments.map((dept: any) => {
          const deptEmps = activeEmps.filter((e: any) => e.departmentId === dept.id);
          const deptObjOwners = new Set(
            objectives.filter((o: any) => {
              const emp = employees.find((e: any) => e.id === o.ownerId);
              return emp?.departmentId === dept.id;
            }).map((o: any) => o.ownerId)
          );
          const deptScores = scores.filter((s: any) => {
            const emp = employees.find((e: any) => e.id === s.employeeId);
            return emp?.departmentId === dept.id;
          });
          const avgScore = deptScores.length > 0
            ? Math.round(deptScores.reduce((sum: number, s: any) => sum + (s.overallScore || 0), 0) / deptScores.length)
            : 0;
          return {
            departmentId: dept.id,
            departmentName: dept.name || '',
            employeeCount: deptEmps.length,
            avgScore,
            objectiveCount: deptObjOwners.size,
          };
        }).filter((d: any) => d.employeeCount > 0);

        // Insight
        const topPerformer = performanceScores.sort((a, b) => b.overallScore - a.overallScore)[0];
        const atRiskOwners = ownerObjectiveSummary.filter(o => o.atRiskCount > 0);
        let insights = '';
        if (topPerformer) insights += `🏆 Хамгийн өндөр оноо: ${topPerformer.employeeName} (${topPerformer.overallScore}/100, ${topPerformer.rating})\n`;
        if (atRiskOwners.length > 0) {
          insights += `⚠️ At-risk objective-тай хариуцагч: ${atRiskOwners.map(o => `${o.ownerName} (${o.atRiskCount} эрсдэлтэй)`).join(', ')}\n`;
        }
        const bestDept = [...deptSummary].sort((a, b) => b.avgScore - a.avgScore)[0];
        if (bestDept?.avgScore > 0) insights += `🏅 Хамгийн өндөр гүйцэтгэлтэй хэлтэс: ${bestDept.departmentName} (дундаж ${bestDept.avgScore}/100)`;

        return { ownerObjectiveSummary, performanceScores, departmentSummary: deptSummary, insights };
      } catch (err: any) {
        return {
          ownerObjectiveSummary: [],
          performanceScores: [],
          departmentSummary: [],
          insights: `Алдаа: ${err.message}`,
        };
      }
    }
  );

  // ── 13. searchStrategyDocs (Фаз 2 — RAG) ──────────────────────────────────
  const searchStrategyDocs = ai.defineTool(
    {
      name: 'searchStrategyDocs',
      description: `Байгуулагын стратегийн баримт бичгүүдээс semantic хайлт хийнэ.
Upload хийгдсэн: стратегийн тайлан, жилийн төлөвлөгөө, board presentation,
зах зээлийн шинжилгээ, санхүүгийн тайлан, хурлын тэмдэглэл зэргээс хайна.

Жишээ асуултууд:
- "2024 оны өрсөлдөх давуу талуудыг тайлбарла"
- "Ямар шинэ зах зээлд орохоор төлөвлөсөн байсан вэ"
- "Board-д танилцуулсан эрсдэлийн жагсаалт"
- "Өмнөх жилийн стратегийн биелэлт хэд байсан"`,
      inputSchema: z.object({
        query: z.string().describe('Хайх асуулт — Монгол эсвэл Англи'),
        topK: z.number().min(1).max(8).optional().default(4).describe('Хамгийн их хэдэн хэсэг авах'),
      }),
      outputSchema: z.object({
        found: z.boolean(),
        context: z.string().describe('AI prompt-д оруулах форматлагдсан контекст'),
        sources: z.array(z.object({
          docTitle: z.string(),
          docType: z.string(),
          excerpt: z.string(),
          score: z.number(),
        })),
        message: z.string(),
      }),
    },
    async ({ query, topK = 4 }) => {
      try {
        const firestore = db();
        const results = await searchBpDocs(query, firestore, companyId, topK);

        if (results.length === 0) {
          return {
            found: false,
            context: '',
            sources: [],
            message: 'Холбогдох баримт олдсонгүй. Баримт байршуулаагүй байж болно.',
          };
        }

        const context = formatBpContextForPrompt(results);
        const sources = results.map(r => ({
          docTitle: r.docTitle,
          docType: BP_DOC_TYPE_LABELS[r.docType as import('@/lib/bp-rag/bp-rag-types').BpDocType] || r.docType,
          excerpt: r.text.slice(0, 200) + (r.text.length > 200 ? '...' : ''),
          score: Math.round(r.score * 100) / 100,
        }));

        return {
          found: true,
          context,
          sources,
          message: `${results.length} холбогдох хэсэг олдлоо (${[...new Set(results.map(r => r.docTitle))].join(', ')})`,
        };
      } catch (err: any) {
        return {
          found: false,
          context: '',
          sources: [],
          message: `Хайлтын алдаа: ${err.message}`,
        };
      }
    }
  );

  return [
    getBpContext,
    getObjectiveDetail,
    createObjective,
    createKeyResult,
    updateKeyResult,
    createKpi,
    updateObjectiveStatus,
    getPlanProgress,
    searchObjectives,
    getCompanyContext,
    getHistoricalTrends,
    getEmployeePerformanceContext,
    searchStrategyDocs,
  ];
}
