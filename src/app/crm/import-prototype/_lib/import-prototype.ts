'use client';

import {
    collection,
    doc,
    getDocs,
    serverTimestamp,
    Timestamp,
    writeBatch,
    type Firestore,
} from 'firebase/firestore';
import { normalizeStageId, npsZone, type FunnelStage } from '../../_types';
import { normName } from '../../_lib/stats';

/**
 * Прототипийн (Logistic Dashboards/crm/crm.db) бодит датаг Firestore руу
 * системийн бүтцэд хөрвүүлж upsert хийнэ. Идемпотент: prototypeId талбараар
 * дахин ажиллуулахад давхардуулахгүй; компанийг normName-ээр одоо байгаа
 * бичлэгтэй (ж: HubSpot импортын) тааруулна.
 */

const BATCH = 450;

export interface ProtoData {
    companies: Record<string, unknown>[];
    contacts: Record<string, unknown>[];
    deals: Record<string, unknown>[];
    cx_surveys: Record<string, unknown>[];
}

export interface ImportCounts {
    companiesCreated: number;
    companiesUpdated: number;
    contacts: number;
    deals: number;
    surveys: number;
    skipped: number;
}

export type Progress = (msg: string) => void;

function s(x: unknown): string | null {
    if (x === null || x === undefined) return null;
    const v = String(x).trim();
    return v || null;
}

function n(x: unknown): number | null {
    if (x === null || x === undefined || x === '') return null;
    const v = Number(x);
    return Number.isFinite(v) ? v : null;
}

/** 'YYYY-MM-DD HH:MM:SS' (localtime) → Timestamp; хоосон бол null. */
function ts(x: unknown): Timestamp | null {
    const v = s(x);
    if (!v) return null;
    const d = new Date(v.includes('T') ? v : v.replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? null : Timestamp.fromDate(d);
}

/** undefined утгуудыг хасна (Firestore зөвшөөрдөггүй). */
function clean(obj: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
    return out;
}

export async function importPrototype(
    firestore: Firestore,
    data: ProtoData,
    onProgress: Progress,
): Promise<ImportCounts> {
    const counts: ImportCounts = {
        companiesCreated: 0,
        companiesUpdated: 0,
        contacts: 0,
        deals: 0,
        surveys: 0,
        skipped: 0,
    };

    // ── Одоо байгаа компаниуд: prototypeId + normName-ээр индекслэх ──
    onProgress('Одоо байгаа компаниудыг уншиж байна...');
    const existing = await getDocs(collection(firestore, 'crm_companies'));
    const byProtoId = new Map<string, string>();
    const byName = new Map<string, string>();
    for (const d of existing.docs) {
        const v = d.data() as Record<string, unknown>;
        const pid = s(v.prototypeId);
        if (pid) byProtoId.set(pid, d.id);
        const nm = s(v.name);
        if (nm && !byName.has(normName(nm))) byName.set(normName(nm), d.id);
    }

    // ── Компаниуд ──
    onProgress(`${data.companies.length} компани бичиж байна...`);
    /** proto company id → Firestore doc id */
    const companyIdMap = new Map<string, string>();
    {
        let b = writeBatch(firestore);
        let inBatch = 0;
        for (const c of data.companies) {
            const protoId = `c${c.id}`;
            const name = s(c.name);
            if (!name) {
                counts.skipped++;
                continue;
            }
            const fields = clean({
                name,
                funnelStage: normalizeFunnel(s(c.funnel_stage)),
                segment: s(c.segment),
                kam: s(c.kam),
                source: s(c.source),
                sourceDetail: s(c.source_detail),
                registerNo: s(c.register_no),
                tariff: s(c.tariff),
                qRoute: s(c.q_route),
                qCargo: s(c.q_cargo),
                qVolume: s(c.q_volume),
                qTiming: s(c.q_timing),
                lostReason: s(c.lost_reason),
                notes: s(c.note),
                firstContactAt: ts(c.first_contact_at),
                prototypeId: protoId,
                updatedAt: serverTimestamp(),
            });
            const existingId = byProtoId.get(protoId) ?? byName.get(normName(name));
            if (existingId) {
                // Байгаа бичлэгийг прототипийн талбаруудаар баяжуулна (нэрийг хөндөхгүй)
                const { name: _drop, ...rest } = fields;
                b.update(doc(firestore, 'crm_companies', existingId), rest);
                companyIdMap.set(String(c.id), existingId);
                counts.companiesUpdated++;
            } else {
                const ref = doc(collection(firestore, 'crm_companies'));
                b.set(ref, {
                    ...fields,
                    createdAt: ts(c.created_at) ?? serverTimestamp(),
                });
                companyIdMap.set(String(c.id), ref.id);
                byName.set(normName(name), ref.id);
                counts.companiesCreated++;
            }
            if (++inBatch >= BATCH) {
                await b.commit();
                b = writeBatch(firestore);
                inBatch = 0;
            }
        }
        if (inBatch > 0) await b.commit();
    }

    // ── Харилцагчид (contacts) ──
    onProgress(`${data.contacts.length} харилцагч бичиж байна...`);
    {
        const prev = await getDocs(collection(firestore, 'crm_contacts'));
        const contactByProto = new Map<string, string>();
        for (const d of prev.docs) {
            const pid = s((d.data() as Record<string, unknown>).prototypeId);
            if (pid) contactByProto.set(pid, d.id);
        }
        let b = writeBatch(firestore);
        let inBatch = 0;
        for (const c of data.contacts) {
            const protoId = `ct${c.id}`;
            const fields = clean({
                firstName: s(c.name),
                jobTitle: s(c.position),
                phone: s(c.phone),
                email: s(c.email),
                companyId: companyIdMap.get(String(c.company_id)) ?? null,
                prototypeId: protoId,
                updatedAt: serverTimestamp(),
            });
            const existingId = contactByProto.get(protoId);
            if (existingId) {
                b.update(doc(firestore, 'crm_contacts', existingId), fields);
            } else {
                b.set(doc(collection(firestore, 'crm_contacts')), {
                    ...fields,
                    createdAt: ts(c.created_at) ?? serverTimestamp(),
                });
            }
            counts.contacts++;
            if (++inBatch >= BATCH) {
                await b.commit();
                b = writeBatch(firestore);
                inBatch = 0;
            }
        }
        if (inBatch > 0) await b.commit();
    }

    // ── Deals ──
    onProgress(`${data.deals.length} deal бичиж байна...`);
    {
        const prev = await getDocs(collection(firestore, 'crm_deals'));
        const dealByProto = new Map<string, string>();
        for (const d of prev.docs) {
            const pid = s((d.data() as Record<string, unknown>).prototypeId);
            if (pid) dealByProto.set(pid, d.id);
        }
        let b = writeBatch(firestore);
        let inBatch = 0;
        for (const dl of data.deals) {
            const protoId = `d${dl.id}`;
            const leadKey = s(dl.lead_key);
            const fields = clean({
                name: s(dl.title) ?? 'Deal',
                pipelineId: 'default',
                stageId: normalizeStageId(s(dl.stage) ?? 'lead'),
                sourceType: leadKey ? 'mql' : 'sql',
                source: s(dl.source),
                direction: s(dl.direction),
                cargo: s(dl.cargo),
                amount: n(dl.amount),
                kam: s(dl.kam),
                phone: s(dl.phone),
                customerType: s(dl.customer_type),
                result: s(dl.result),
                leadKey,
                closeDate: s(dl.expected_close),
                lostReason: s(dl.lost_reason),
                notes: s(dl.note),
                companyId: companyIdMap.get(String(dl.company_id)) ?? null,
                closedAt: ts(dl.closed_at),
                currency: 'MNT',
                prototypeId: protoId,
                updatedAt: ts(dl.updated_at) ?? serverTimestamp(),
            });
            const existingId = dealByProto.get(protoId);
            if (existingId) {
                b.update(doc(firestore, 'crm_deals', existingId), fields);
            } else {
                b.set(doc(collection(firestore, 'crm_deals')), {
                    ...fields,
                    createdAt: ts(dl.created_at) ?? serverTimestamp(),
                });
            }
            counts.deals++;
            if (++inBatch >= BATCH) {
                await b.commit();
                b = writeBatch(firestore);
                inBatch = 0;
            }
        }
        if (inBatch > 0) await b.commit();
    }

    // ── NPS судалгаа (cx_surveys — компани нэрээр холбоно) ──
    onProgress(`${data.cx_surveys.length} NPS судалгаа бичиж байна...`);
    {
        const prev = await getDocs(collection(firestore, 'crm_surveys'));
        const surveyByProto = new Map<string, string>();
        for (const d of prev.docs) {
            const pid = s((d.data() as Record<string, unknown>).prototypeId);
            if (pid) surveyByProto.set(pid, d.id);
        }
        let b = writeBatch(firestore);
        let inBatch = 0;
        for (const sv of data.cx_surveys) {
            const protoId = `s${sv.id}`;
            const score = n(sv.nps);
            if (score === null) {
                counts.skipped++;
                continue;
            }
            const companyName = s(sv.company);
            const note = [s(sv.score_note), s(sv.issue_note), s(sv.next_note)]
                .filter(Boolean)
                .join(' · ');
            const fields = clean({
                companyId: companyName ? (byName.get(normName(companyName)) ?? null) : null,
                companyName,
                score,
                zone: npsZone(score),
                note: note || null,
                prototypeId: protoId,
            });
            const existingId = surveyByProto.get(protoId);
            if (existingId) {
                b.update(doc(firestore, 'crm_surveys', existingId), fields);
            } else {
                b.set(doc(collection(firestore, 'crm_surveys')), {
                    ...fields,
                    createdAt: ts(sv.ts) ?? serverTimestamp(),
                });
            }
            counts.surveys++;
            if (++inBatch >= BATCH) {
                await b.commit();
                b = writeBatch(firestore);
                inBatch = 0;
            }
        }
        if (inBatch > 0) await b.commit();
    }

    return counts;
}

const FUNNEL_SET = new Set(['lead', 'contacted', 'qualified', 'quote', 'customer', 'loyal', 'lost']);

function normalizeFunnel(stage: string | null): FunnelStage {
    return (stage && FUNNEL_SET.has(stage) ? stage : 'lead') as FunnelStage;
}
