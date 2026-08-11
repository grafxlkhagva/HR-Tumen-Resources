'use client';

import {
    collection,
    doc,
    getDocs,
    query,
    serverTimestamp,
    Timestamp,
    where,
    writeBatch,
    type Firestore,
} from 'firebase/firestore';
import { KAM_LIST, SEG_MAP, TEAM_OF, normalizeStageId } from '../_types';
import { COMPANY_CANON, nameDocId, normName } from './stats';

/**
 * Google Sheets → Firestore синк — CLIENT талын хувилбар (админ эрхээр).
 * Server route (/api/crm/sync) нь FIREBASE_ADMIN_* env шаарддаг тул түлхүүр
 * тохируулаагүй орчинд энэ client синкийг хэрэглэнэ. Логик нь route-ын яг порт:
 * прототипийн sync.py-тэй мөр мөрөөрөө ижил.
 */

const ALL_SHEETS = ['Автокран', 'Барло', 'Дотор', 'Орон нутаг', 'Олон улс', 'Төсөл', 'Түгээлт', 'Цемент', 'Элс'];
const VALID_YEARS = new Set([2022, 2023, 2024, 2025, 2026]);
const BATCH = 450;

type SheetRow = Record<string, unknown>;
export type Progress = (msg: string) => void;

function num(x: unknown): number {
    if (x === null || x === undefined) return 0;
    const s = String(x).replace(/,/g, '').trim();
    if (!s) return 0;
    const v = Number(s);
    return Number.isFinite(v) ? v : 0;
}

function str(x: unknown): string {
    return x === null || x === undefined ? '' : String(x).trim();
}

async function fetchSheets(onProgress: Progress): Promise<Record<string, SheetRow[]>> {
    const base = process.env.NEXT_PUBLIC_CRM_SHEETS_URL;
    const token = process.env.NEXT_PUBLIC_CRM_SHEETS_TOKEN;
    if (!base || !token) throw new Error('NEXT_PUBLIC_CRM_SHEETS_URL/TOKEN тохируулаагүй (.env.local).');
    onProgress('Google Sheets-ээс дата татаж байна (30-90 сек)...');
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const resp = await fetch(`${base}?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
            if (!resp.ok) throw new Error(`Sheets API ${resp.status}`);
            return (await resp.json()) as Record<string, SheetRow[]>;
        } catch (e) {
            lastErr = e;
            await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        }
    }
    throw lastErr instanceof Error ? lastErr : new Error('Sheets татаж чадсангүй');
}

interface ParsedOrder {
    company: string;
    companyKey: string;
    kam: string;
    sheet: string;
    segment: string;
    orderDate: string;
    month: number;
    year: number;
    revenue: number;
    profit: number;
    invNo: string;
    driver: string;
    trailer: string;
    carrierPrice: number;
    ym: number;
}

interface Slice {
    revenue: number;
    profit: number;
    trips: number;
}

/** Collection-ийн бүх doc-ийг батчаар устгана. */
async function deleteAll(firestore: Firestore, coll: string, onProgress: Progress): Promise<number> {
    const snap = await getDocs(collection(firestore, coll));
    if (snap.empty) return 0;
    onProgress(`${coll}: хуучин ${snap.size} бичлэг устгаж байна...`);
    for (let i = 0; i < snap.docs.length; i += BATCH) {
        const b = writeBatch(firestore);
        for (const d of snap.docs.slice(i, i + BATCH)) b.delete(d.ref);
        await b.commit();
    }
    return snap.size;
}

const LEAD_SOURCE: Record<string, string> = {
    'call pro': 'callpro',
    callpro: 'callpro',
    форм: 'form',
    form: 'form',
    'и-мэйл': 'email',
    email: 'email',
    имэйл: 'email',
    facebook: 'facebook',
    фэйсбүүк: 'facebook',
    messenger: 'facebook',
    мессенжер: 'facebook',
};

/** Lead report → crm_deals (leadKey-тэй хуучныг устгаад дахин бичнэ). */
async function syncLeads(
    firestore: Firestore,
    data: Record<string, SheetRow[]>,
    onProgress: Progress,
): Promise<number> {
    const rows = data['Lead report'];
    if (!Array.isArray(rows) || rows.length === 0) return 0;

    const prev = await getDocs(query(collection(firestore, 'crm_deals'), where('leadKey', '!=', null)));
    onProgress(`Лийд deal: хуучин ${prev.size} устгаж, ${rows.length} мөр боловсруулж байна...`);
    for (let i = 0; i < prev.docs.length; i += BATCH) {
        const b = writeBatch(firestore);
        for (const d of prev.docs.slice(i, i + BATCH)) b.delete(d.ref);
        await b.commit();
    }

    let b = writeBatch(firestore);
    let inBatch = 0;
    let n = 0;
    for (const r of rows) {
        const date = str(r['Огноо']);
        const phone = str(r['Ирсэн дуудлага']);
        const ctype = str(r['Хэрэглэгчийн төрөл']);
        const status = str(r['Төлөв']);
        const name = str(r['Нэр']);
        const ttype = str(r['Тээврийн төрөл']);
        const froms = str(r['Хаанаас']);
        const tos = str(r['Хаашаа']);
        const route = froms && tos ? `${froms} → ${tos}` : froms || tos;
        const direction = route || ttype;
        const suvag = str(r['Суваг']);
        const kam = str(r['КАМ']);
        let note = str(r['Тайлбар']);
        const result = str(r['Үр дүн']);
        const numNo = str(r['N'] ?? r['№']);
        if (!(phone || ctype || status || name)) continue;

        const rl = result.toLowerCase();
        let stage: string;
        if (ctype === 'Тээвэрчин' || rl.includes('тээвэрчин бүртгэсэн')) stage = 'carrier';
        else if (rl.includes('тээвэр гүйцэтгэсэн')) stage = 'won';
        else if (rl.includes('тээвэр гүйцэтгээгүй') || status === 'Алдсан') stage = 'lost';
        else if (rl.includes('үнийн санал илгээсэн')) stage = 'opportunity';
        else if (
            rl.includes('мэдээлэл өгсөн') ||
            rl.includes('эргэж холбогдох') ||
            status === 'Эргэж холбогдсон' ||
            status === 'Амжилттай'
        )
            stage = 'prospect';
        else stage = 'lead';

        const source = LEAD_SOURCE[suvag.toLowerCase()] ?? (suvag ? 'callpro' : 'other');
        const title = route || ttype || (phone ? `☎ ${phone}` : 'Лийд');
        if (ttype && route) note = `${ttype} · ${note}`.replace(/^[\s·]+|[\s·]+$/g, '');
        let quotedAt: Timestamp | null = null;
        if (stage === 'opportunity' || stage === 'won') {
            const d = new Date(date);
            if (!Number.isNaN(d.getTime())) quotedAt = Timestamp.fromDate(d);
        }

        b.set(doc(collection(firestore, 'crm_deals')), {
            name: title,
            pipelineId: 'default',
            stageId: normalizeStageId(stage),
            sourceType: 'mql',
            source,
            direction: direction || null,
            kam: kam || null,
            phone: phone || null,
            customerType: ctype || null,
            result: result || null,
            notes: note || null,
            leadKey: `L|${numNo}|${date}|${phone}`,
            closeDate: date ? date.slice(0, 10) : null,
            quotedAt,
            currency: 'MNT',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        n++;
        if (++inBatch >= BATCH) {
            await b.commit();
            b = writeBatch(firestore);
            inBatch = 0;
        }
    }
    if (inBatch > 0) await b.commit();
    return n;
}

export interface ClientSyncResult {
    orders: number;
    newCompanies: number;
    companies: number;
    carriers: number;
    leads: number;
    years: number[];
    revenueM: number;
    profitM: number;
}

export async function runClientSync(
    firestore: Firestore,
    onProgress: Progress,
): Promise<ClientSyncResult> {
    const data = await fetchSheets(onProgress);
    const allRows = Array.isArray(data['All data']) ? data['All data'] : [];

    // ── Парслах ──
    const orders: ParsedOrder[] = [];
    let totalRev = 0;
    let totalPro = 0;
    for (const r of allRows) {
        const sheet = str(r['шийт']);
        if (!ALL_SHEETS.includes(sheet)) continue;
        const year = Math.trunc(num(r['Year']));
        if (!VALID_YEARS.has(year)) continue;
        const month = Math.trunc(num(r['Month']));
        let company = str(r['Company']);
        company = (COMPANY_CANON[company] ?? company).trim();
        const revenue = num(r['Захиалагч НӨАТ-гүй']);
        const profit = num(r['Ашиг']);
        orders.push({
            company,
            companyKey: normName(company),
            kam: str(r['kam']),
            sheet,
            segment: SEG_MAP[sheet] ?? '',
            orderDate: str(r['date']),
            month,
            year,
            revenue,
            profit,
            invNo: str(r['INV дугаар']),
            driver: str(r['Жолооч нэр']),
            trailer: str(r['Чирэгч']),
            carrierPrice: num(r['Тээвэрчин үнэ']),
            ym: year * 100 + month,
        });
        totalRev += revenue;
        totalPro += profit;
    }

    // ── crm_orders бүтэн дахин бичих ──
    await deleteAll(firestore, 'crm_orders', onProgress);
    onProgress(`${orders.length} захиалга бичиж байна...`);
    for (let i = 0; i < orders.length; i += BATCH) {
        const b = writeBatch(firestore);
        for (const o of orders.slice(i, i + BATCH)) {
            b.set(doc(collection(firestore, 'crm_orders')), { ...o, syncedAt: serverTimestamp() });
        }
        await b.commit();
        if (i % (BATCH * 8) === 0 && i > 0) onProgress(`Захиалга: ${i}/${orders.length}...`);
    }

    // ── Шинэ компани (customer шатаар) + давамгай KAM ──
    onProgress('Компаниудыг тааруулж байна...');
    const companiesSnap = await getDocs(collection(firestore, 'crm_companies'));
    const companyByKey = new Map<string, { id: string; name: string }>();
    for (const d of companiesSnap.docs) {
        const nm = str((d.data() as Record<string, unknown>).name);
        if (nm && !companyByKey.has(normName(nm))) companyByKey.set(normName(nm), { id: d.id, name: nm });
    }
    let newCompanies = 0;
    {
        let b = writeBatch(firestore);
        let inBatch = 0;
        for (const o of orders) {
            if (!o.company || companyByKey.has(o.companyKey)) continue;
            const ref = doc(collection(firestore, 'crm_companies'));
            b.set(ref, {
                name: o.company,
                segment: o.segment,
                kam: o.kam || null,
                funnelStage: 'customer',
                source: 'existing',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            companyByKey.set(o.companyKey, { id: ref.id, name: o.company });
            newCompanies++;
            if (++inBatch >= BATCH) {
                await b.commit();
                b = writeBatch(firestore);
                inBatch = 0;
            }
        }
        if (inBatch > 0) await b.commit();
    }

    const kamAgg = new Map<string, Map<string, { trips: number; maxYm: number }>>();
    for (const o of orders) {
        if (!o.companyKey || !KAM_LIST.includes(o.kam)) continue;
        let per = kamAgg.get(o.companyKey);
        if (!per) {
            per = new Map();
            kamAgg.set(o.companyKey, per);
        }
        const cur = per.get(o.kam) ?? { trips: 0, maxYm: 0 };
        cur.trips++;
        cur.maxYm = Math.max(cur.maxYm, o.ym);
        per.set(o.kam, cur);
    }
    {
        let b = writeBatch(firestore);
        let inBatch = 0;
        for (const [key, per] of kamAgg) {
            let best: { kam: string; trips: number; maxYm: number } | null = null;
            for (const [kam, v] of per) {
                if (!best || v.trips > best.trips || (v.trips === best.trips && v.maxYm > best.maxYm)) {
                    best = { kam, trips: v.trips, maxYm: v.maxYm };
                }
            }
            const c = best ? companyByKey.get(key) : null;
            if (!best || !c) continue;
            b.update(doc(firestore, 'crm_companies', c.id), {
                kam: best.kam,
                updatedAt: serverTimestamp(),
            });
            if (++inBatch >= BATCH) {
                await b.commit();
                b = writeBatch(firestore);
                inBatch = 0;
            }
        }
        if (inBatch > 0) await b.commit();
    }

    // ── Агрегатууд ──
    onProgress('Агрегат тооцож байна...');

    interface YearAgg {
        year: number;
        revenue: number;
        profit: number;
        trips: number;
        customerKeys: Set<string>;
        monthlyRevenue: number[];
        monthlyProfit: number[];
        monthlyTrips: number[];
        byKam: Record<string, Slice>;
        byTeam: Record<string, Slice>;
        bySegment: Record<string, Slice>;
    }
    const yearStats = new Map<number, YearAgg>();
    for (const o of orders) {
        let y = yearStats.get(o.year);
        if (!y) {
            y = {
                year: o.year,
                revenue: 0,
                profit: 0,
                trips: 0,
                customerKeys: new Set(),
                monthlyRevenue: Array(12).fill(0),
                monthlyProfit: Array(12).fill(0),
                monthlyTrips: Array(12).fill(0),
                byKam: {},
                byTeam: {},
                bySegment: {},
            };
            yearStats.set(o.year, y);
        }
        y.revenue += o.revenue;
        y.profit += o.profit;
        y.trips++;
        if (o.companyKey) y.customerKeys.add(o.companyKey);
        if (o.month >= 1 && o.month <= 12) {
            y.monthlyRevenue[o.month - 1] += o.revenue;
            y.monthlyProfit[o.month - 1] += o.profit;
            y.monthlyTrips[o.month - 1]++;
        }
        if (KAM_LIST.includes(o.kam)) {
            const k = (y.byKam[o.kam] ??= { revenue: 0, profit: 0, trips: 0 });
            k.revenue += o.revenue;
            k.profit += o.profit;
            k.trips++;
            const team = TEAM_OF[o.kam];
            if (team) {
                const t = (y.byTeam[team] ??= { revenue: 0, profit: 0, trips: 0 });
                t.revenue += o.revenue;
                t.profit += o.profit;
                t.trips++;
            }
        }
        if (o.segment) {
            const s = (y.bySegment[o.segment] ??= { revenue: 0, profit: 0, trips: 0 });
            s.revenue += o.revenue;
            s.profit += o.profit;
            s.trips++;
        }
    }
    await deleteAll(firestore, 'crm_order_stats', onProgress);
    {
        const b = writeBatch(firestore);
        for (const [year, y] of yearStats) {
            b.set(doc(firestore, 'crm_order_stats', String(year)), {
                year,
                revenue: y.revenue,
                profit: y.profit,
                trips: y.trips,
                customers: y.customerKeys.size,
                monthlyRevenue: y.monthlyRevenue,
                monthlyProfit: y.monthlyProfit,
                monthlyTrips: y.monthlyTrips,
                byKam: y.byKam,
                byTeam: y.byTeam,
                bySegment: y.bySegment,
                updatedAt: serverTimestamp(),
            });
        }
        await b.commit();
    }

    interface CompanyAgg {
        name: string;
        companyKey: string;
        years: Map<number, { revenue: number; profit: number; trips: number; monthlyRevenue: number[] }>;
        segRev: Map<string, number>;
        lastYm: number;
    }
    const compStats = new Map<string, CompanyAgg>();
    for (const o of orders) {
        if (!o.company) continue;
        let c = compStats.get(o.companyKey);
        if (!c) {
            c = { name: o.company, companyKey: o.companyKey, years: new Map(), segRev: new Map(), lastYm: 0 };
            compStats.set(o.companyKey, c);
        }
        let yr = c.years.get(o.year);
        if (!yr) {
            yr = { revenue: 0, profit: 0, trips: 0, monthlyRevenue: Array(12).fill(0) };
            c.years.set(o.year, yr);
        }
        yr.revenue += o.revenue;
        yr.profit += o.profit;
        yr.trips++;
        if (o.month >= 1 && o.month <= 12) yr.monthlyRevenue[o.month - 1] += o.revenue;
        if (o.segment) c.segRev.set(o.segment, (c.segRev.get(o.segment) ?? 0) + o.revenue);
        c.lastYm = Math.max(c.lastYm, o.ym);
    }
    await deleteAll(firestore, 'crm_company_stats', onProgress);
    onProgress(`${compStats.size} компанийн агрегат бичиж байна...`);
    {
        let b = writeBatch(firestore);
        let inBatch = 0;
        for (const c of compStats.values()) {
            // Давамгай сегмент (орлогоор их)
            let segment = '';
            let segMax = -1;
            for (const [s, v] of c.segRev) {
                if (v > segMax) {
                    segment = s;
                    segMax = v;
                }
            }
            const years: Record<string, unknown> = {};
            for (const [y, v] of c.years) years[String(y)] = v;
            const linked = companyByKey.get(c.companyKey);
            const dominant = (() => {
                const per = kamAgg.get(c.companyKey);
                if (!per) return null;
                let best: { kam: string; trips: number; maxYm: number } | null = null;
                for (const [kam, v] of per) {
                    if (!best || v.trips > best.trips || (v.trips === best.trips && v.maxYm > best.maxYm)) {
                        best = { kam, trips: v.trips, maxYm: v.maxYm };
                    }
                }
                return best?.kam ?? null;
            })();
            b.set(doc(firestore, 'crm_company_stats', nameDocId(c.name)), {
                name: c.name,
                companyKey: c.companyKey,
                companyId: linked?.id ?? null,
                kam: dominant,
                segment,
                years,
                lastYm: c.lastYm,
                updatedAt: serverTimestamp(),
            });
            if (++inBatch >= BATCH) {
                await b.commit();
                b = writeBatch(firestore);
                inBatch = 0;
            }
        }
        if (inBatch > 0) await b.commit();
    }

    interface CarrierAgg {
        name: string;
        trailers: Set<string>;
        trips: number;
        totalPrice: number;
        years: Map<number, { trips: number; totalPrice: number }>;
        lastYm: number;
    }
    const carrierStats = new Map<string, CarrierAgg>();
    for (const o of orders) {
        if (!o.driver) continue;
        const key = nameDocId(o.driver);
        let c = carrierStats.get(key);
        if (!c) {
            c = { name: o.driver, trailers: new Set(), trips: 0, totalPrice: 0, years: new Map(), lastYm: 0 };
            carrierStats.set(key, c);
        }
        if (o.trailer) c.trailers.add(o.trailer);
        c.trips++;
        c.totalPrice += o.carrierPrice;
        let yr = c.years.get(o.year);
        if (!yr) {
            yr = { trips: 0, totalPrice: 0 };
            c.years.set(o.year, yr);
        }
        yr.trips++;
        yr.totalPrice += o.carrierPrice;
        c.lastYm = Math.max(c.lastYm, o.ym);
    }
    await deleteAll(firestore, 'crm_carrier_stats', onProgress);
    onProgress(`${carrierStats.size} тээвэрчний агрегат бичиж байна...`);
    {
        let b = writeBatch(firestore);
        let inBatch = 0;
        for (const [key, c] of carrierStats) {
            const years: Record<string, unknown> = {};
            for (const [y, v] of c.years) years[String(y)] = v;
            b.set(doc(firestore, 'crm_carrier_stats', key), {
                name: c.name,
                trailers: Array.from(c.trailers),
                trips: c.trips,
                totalPrice: c.totalPrice,
                years,
                lastYm: c.lastYm,
                updatedAt: serverTimestamp(),
            });
            if (++inBatch >= BATCH) {
                await b.commit();
                b = writeBatch(firestore);
                inBatch = 0;
            }
        }
        if (inBatch > 0) await b.commit();
    }

    // ── Лийд deal синк ──
    const leads = await syncLeads(firestore, data, onProgress);

    return {
        orders: orders.length,
        newCompanies,
        companies: compStats.size,
        carriers: carrierStats.size,
        leads,
        years: Array.from(yearStats.keys()).sort(),
        revenueM: Math.round(totalRev / 1e6),
        profitM: Math.round(totalPro / 1e6),
    };
}
