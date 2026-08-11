import {
    addDoc,
    collection,
    doc,
    serverTimestamp,
    updateDoc,
    Timestamp,
    type Firestore,
} from 'firebase/firestore';
import type {
    Company,
    Deal,
    FunnelStage,
    TumenTaskPriority,
    TumenTaskType,
} from '../_types';
import { normalizeStageId } from '../_types';

/**
 * Прототипийн (app.py) автомат бизнес-логик — deal/company stage шилжилтэд
 * kanban болон дэлгэрэнгүй хуудас хоёулаа ЭНЭ функцүүдийг ашиглана.
 */

interface Actor {
    uid?: string;
    name?: string;
    kam?: string | null;
}

/** Аудит лог — fire-and-forget. Бүх create/update/delete/stage үйлдэлд дуудна. */
export function logAudit(
    firestore: Firestore,
    actor: Actor,
    action: 'create' | 'update' | 'delete' | 'stage' | 'sync',
    entity: string,
    entityId?: string,
    detail?: string,
): void {
    addDoc(collection(firestore, 'crm_audit'), {
        userId: actor.uid ?? null,
        userName: actor.name ?? null,
        action,
        entity,
        entityId: entityId ?? null,
        detail: detail ?? null,
        createdAt: serverTimestamp(),
    }).catch(() => {
        /* аудит унасан ч үндсэн үйлдлийг зогсоохгүй */
    });
}

/** Автомат даалгавар үүсгэх (won → гэрээ +2 хоног, pending/quote → дагах +3 хоног). */
export function createAutoTask(
    firestore: Firestore,
    actor: Actor,
    params: {
        title: string;
        taskType: TumenTaskType;
        priority: TumenTaskPriority;
        dueInDays: number;
        companyId?: string;
        dealId?: string;
    },
): void {
    const due = new Date();
    due.setDate(due.getDate() + params.dueInDays);
    addDoc(collection(firestore, 'crm_activities'), {
        type: 'task',
        title: params.title,
        taskType: params.taskType,
        priority: params.priority,
        dueAt: Timestamp.fromDate(due),
        companyIds: params.companyId ? [params.companyId] : [],
        dealIds: params.dealId ? [params.dealId] : [],
        contactIds: [],
        ticketIds: [],
        kam: actor.kam ?? null,
        ownerId: actor.uid ?? null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    }).catch(() => {});
}

const COMPANY_STAGE_RANK: Record<string, number> = {
    lead: 0,
    contacted: 1,
    qualified: 2,
    quote: 3,
    customer: 4,
    loyal: 5,
};

/**
 * Компанийн funnel үе солих. lost руу шилжихэд шалтгаан заавал.
 * Анхны идэвхжилтэд firstContactAt тавьдаг прототипийн журмыг үе ахих үед мөрдөнө.
 */
export async function moveCompanyStage(
    firestore: Firestore,
    actor: Actor,
    company: Pick<Company, 'id' | 'name' | 'funnelStage' | 'firstContactAt'>,
    newStage: FunnelStage,
    lostReason?: string,
): Promise<{ ok: boolean; error?: string }> {
    if (newStage === 'lost' && !lostReason?.trim()) {
        return { ok: false, error: 'Алдсан шалтгаанаа заавал бөглөнө үү.' };
    }
    const patch: Record<string, unknown> = {
        funnelStage: newStage,
        updatedAt: serverTimestamp(),
    };
    if (newStage === 'lost') patch.lostReason = lostReason!.trim();
    if (newStage !== 'lead' && !company.firstContactAt) patch.firstContactAt = serverTimestamp();
    await updateDoc(doc(firestore, 'crm_companies', company.id), patch);
    logAudit(
        firestore,
        actor,
        'stage',
        'crm_companies',
        company.id,
        `${company.name}: ${company.funnelStage ?? '—'} → ${newStage}${lostReason ? ` (${lostReason})` : ''}`,
    );
    return { ok: true };
}

/**
 * Deal-ийн stage солих — прототипийн бүх дүрэмтэй:
 * - pending/lost → шалтгаан ЗААВАЛ
 * - won → closedAt + компанийг customer болгож ахиулах (customer/loyal-ыг буцаахгүй)
 *   + "Гэрээ" даалгавар (+2 хоног, өндөр)
 * - pending → "Дагах" даалгавар (+3 хоног, дунд)
 * - терминалаас буцаахад closedAt цэвэрлэнэ
 */
export async function moveDealStage(
    firestore: Firestore,
    actor: Actor,
    deal: Pick<Deal, 'id' | 'name' | 'stageId' | 'companyId'>,
    rawNewStage: string,
    reason: string | undefined,
    company?: Pick<Company, 'id' | 'name' | 'funnelStage' | 'firstContactAt'> | null,
): Promise<{ ok: boolean; error?: string }> {
    const newStage = normalizeStageId(rawNewStage);
    const oldStage = normalizeStageId(deal.stageId);
    if (newStage === oldStage) return { ok: true };

    if ((newStage === 'pending' || newStage === 'lost') && !reason?.trim()) {
        return { ok: false, error: 'Шалтгаанаа заавал бөглөнө үү.' };
    }

    const patch: Record<string, unknown> = {
        stageId: newStage,
        updatedAt: serverTimestamp(),
    };
    if (reason?.trim()) patch.lostReason = reason.trim();
    if (newStage === 'won') patch.closedAt = serverTimestamp();
    if (newStage === 'opportunity' && oldStage === 'lead') patch.quotedAt = serverTimestamp();
    if ((oldStage === 'won' || oldStage === 'lost') && newStage !== 'won' && newStage !== 'lost') {
        patch.closedAt = null;
    }

    await updateDoc(doc(firestore, 'crm_deals', deal.id), patch);
    logAudit(
        firestore,
        actor,
        'stage',
        'crm_deals',
        deal.id,
        `${deal.name}: ${oldStage} → ${newStage}${reason ? ` (${reason})` : ''}`,
    );

    if (newStage === 'won') {
        createAutoTask(firestore, actor, {
            title: `Гэрээ байгуулах — ${deal.name}`,
            taskType: 'гэрээ',
            priority: 'өндөр',
            dueInDays: 2,
            companyId: deal.companyId,
            dealId: deal.id,
        });
        // Компанийг customer болгож ахиулна — customer/loyal-ыг буцаахгүй
        if (company && (COMPANY_STAGE_RANK[company.funnelStage ?? 'lead'] ?? 0) < COMPANY_STAGE_RANK.customer) {
            await moveCompanyStage(firestore, actor, company, 'customer');
        }
    } else if (newStage === 'pending') {
        createAutoTask(firestore, actor, {
            title: `Дагах — ${deal.name}`,
            taskType: 'дагах',
            priority: 'дунд',
            dueInDays: 3,
            companyId: deal.companyId,
            dealId: deal.id,
        });
    }

    return { ok: true };
}

/**
 * "💰 Үнийн санал илгээсэн" түргэн үйлдэл (lead багана дээрх) —
 * deal-ийг opportunity болгоод, crm_quotes бичлэг + дагах даалгавар үүсгэнэ.
 */
export async function sendDealQuote(
    firestore: Firestore,
    actor: Actor,
    deal: Pick<Deal, 'id' | 'name' | 'stageId' | 'companyId' | 'contactId' | 'amount' | 'currency' | 'direction'>,
    amount: number | undefined,
): Promise<{ ok: boolean; error?: string }> {
    const res = await moveDealStage(firestore, actor, deal, 'opportunity', undefined, null);
    if (!res.ok) return res;

    const patch: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (amount !== undefined && !isNaN(amount)) patch.amount = amount;
    await updateDoc(doc(firestore, 'crm_deals', deal.id), patch);

    addDoc(collection(firestore, 'crm_quotes'), {
        title: `Үнийн санал — ${deal.name}`,
        status: 'sent',
        dealId: deal.id,
        companyId: deal.companyId ?? null,
        contactId: deal.contactId ?? null,
        ownerId: actor.uid ?? null,
        currency: deal.currency ?? 'MNT',
        lineItems: [],
        subtotal: amount ?? 0,
        totalDiscount: 0,
        totalTax: 0,
        total: amount ?? 0,
        sentAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    }).catch(() => {});

    createAutoTask(firestore, actor, {
        title: `Үнийн санал дагах — ${deal.name}`,
        taskType: 'үнийн санал',
        priority: 'дунд',
        dueInDays: 3,
        companyId: deal.companyId,
        dealId: deal.id,
    });
    return { ok: true };
}
