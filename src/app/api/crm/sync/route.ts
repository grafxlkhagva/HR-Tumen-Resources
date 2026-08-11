import { NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue, Timestamp, type Firestore, type WriteBatch } from 'firebase-admin/firestore';
import { KAM_LIST, SEG_MAP, TEAM_OF, normalizeStageId } from '@/app/crm/_types';
import { COMPANY_CANON, nameDocId, normName } from '@/app/crm/_lib/stats';

/**
 * Google Sheets (Apps Script) → Firestore синк — прототипийн sync.py-ийн яг порт.
 *
 * - crm_orders-ыг бүтнээр дахин бичнэ (9 нэхэмжлэхийн шийтийн "All data")
 * - Шинэ компанийг funnel_stage='customer'-ээр автоматаар үүсгэнэ
 * - Компанийн KAM = хамгийн олон рейс хийсэн валид KAM (tie-break: сүүлийн ym)
 * - Агрегатууд: crm_order_stats / crm_company_stats / crm_carrier_stats (бүтэн overwrite)
 * - Lead report шийт → crm_deals (leadKey-ээр; гараар үүсгэсэн deals-д халдахгүй)
 */

export const runtime = 'nodejs';
export const maxDuration = 300;

/** sync.py ALL_SHEETS — зөвхөн 9 нэхэмжлэх үүсгэдэг шийт. */
const ALL_SHEETS = [
    'Автокран',
    'Барло',
    'Дотор',
    'Орон нутаг',
    'Олон улс',
    'Төсөл',
    'Түгээлт',
    'Цемент',
    'Элс',
];

const VALID_YEARS = new Set([2022, 2023, 2024, 2025, 2026]);

type SheetRow = Record<string, unknown>;

/** sync.py _num — таслал хасаад тоо болгоно, болохгүй бол 0. */
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

function getBearerToken(req: Request): string | null {
    const header = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match?.[1] || null;
}

/** sync.py fetch_data — retry 3, timeout 180с, 24MB chunked хариу. */
async function fetchSheets(retries = 3): Promise<Record<string, SheetRow[]>> {
    const base = process.env.CRM_SHEETS_URL;
    const token = process.env.CRM_SHEETS_TOKEN;
    if (!base || !token) {
        throw new Error('CRM_SHEETS_URL / CRM_SHEETS_TOKEN тохируулаагүй байна (.env.local).');
    }
    const url = `${base}?token=${encodeURIComponent(token)}`;
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < retries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 180_000);
        try {
            const resp = await fetch(url, {
                headers: { 'User-Agent': 'TumenCRM/1.0' },
                signal: controller.signal,
                cache: 'no-store',
            });
            if (!resp.ok) throw new Error(`Sheets API ${resp.status}`);
            return (await resp.json()) as Record<string, SheetRow[]>;
        } catch (e) {
            lastErr = e;
            await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        } finally {
            clearTimeout(timer);
        }
    }
    throw lastErr instanceof Error ? lastErr : new Error('Sheets татаж чадсангүй');
}

/** Collection-ийн бүх doc-ийг 500-аар багцлан устгана. */
async function deleteAllDocs(db: Firestore, coll: string): Promise<number> {
    const refs = await db.collection(coll).listDocuments();
    for (let i = 0; i < refs.length; i += 500) {
        const batch = db.batch();
        for (const ref of refs.slice(i, i + 500)) batch.delete(ref);
        await batch.commit();
    }
    return refs.length;
}

/** Батчуудыг 8-аар зэрэгцүүлж commit хийнэ (28k мөрд хурд чухал). */
async function commitBatches(batches: WriteBatch[]): Promise<void> {
    for (let i = 0; i < batches.length; i += 8) {
        await Promise.all(batches.slice(i, i + 8).map((b) => b.commit()));
    }
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

function newSlice(): Slice {
    return { revenue: 0, profit: 0, trips: 0 };
}

// ── Lead report → crm_deals (sync.py sync_leads-ийн порт) ──

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

async function syncLeads(db: Firestore, data: Record<string, SheetRow[]>): Promise<number> {
    const rows = data['Lead report'];
    if (!Array.isArray(rows) || rows.length === 0) return 0; // шийт байхгүй бол алгасна

    // Өмнөх лийд-deal цэвэрлэх — гараар үүсгэсэн deals (leadKey байхгүй) хөндөгдөхгүй
    const prev = await db.collection('crm_deals').where('leadKey', '!=', null).get();
    for (let i = 0; i < prev.docs.length; i += 500) {
        const batch = db.batch();
        for (const d of prev.docs.slice(i, i + 500)) batch.delete(d.ref);
        await batch.commit();
    }

    const batches: WriteBatch[] = [];
    let batch = db.batch();
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

        // Шат — "Үр дүн" голлоно (sync.py-ийн if/elif дараалал яг таг)
        const rl = result.toLowerCase();
        let stage: string;
        if (ctype === 'Тээвэрчин' || rl.includes('тээвэрчин бүртгэсэн')) {
            stage = 'carrier';
        } else if (rl.includes('тээвэр гүйцэтгэсэн')) {
            stage = 'won';
        } else if (rl.includes('тээвэр гүйцэтгээгүй') || status === 'Алдсан') {
            stage = 'lost';
        } else if (rl.includes('үнийн санал илгээсэн')) {
            stage = 'opportunity';
        } else if (
            rl.includes('мэдээлэл өгсөн') ||
            rl.includes('эргэж холбогдох') ||
            status === 'Эргэж холбогдсон' ||
            status === 'Амжилттай'
        ) {
            stage = 'prospect';
        } else {
            stage = 'lead';
        }

        const source = LEAD_SOURCE[suvag.toLowerCase()] ?? (suvag ? 'callpro' : 'other');
        // Гарчиг: чиглэл → тээврийн төрөл → утас ("Нэр" баганыг ашиглахгүй)
        const title = route || ttype || (phone ? `☎ ${phone}` : 'Лийд');
        if (ttype && route) {
            note = `${ttype} · ${note}`.replace(/^[\s·]+|[\s·]+$/g, '');
        }
        const leadKey = `L|${numNo}|${date}|${phone}`;
        let quotedAt: Timestamp | null = null;
        if (stage === 'opportunity' || stage === 'won') {
            const d = new Date(date);
            if (!Number.isNaN(d.getTime())) quotedAt = Timestamp.fromDate(d);
        }

        const ref = db.collection('crm_deals').doc();
        batch.set(ref, {
            name: title,
            pipelineId: 'default',
            stageId: normalizeStageId(stage),
            sourceType: 'mql', // Lead report = харилцагч өөрөө холбогдсон → бүгд MQL
            source,
            direction: direction || null,
            kam: kam || null,
            phone: phone || null,
            customerType: ctype || null,
            result: result || null,
            notes: note || null,
            leadKey,
            closeDate: date ? date.slice(0, 10) : null,
            quotedAt,
            currency: 'MNT',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        n++;
        inBatch++;
        if (inBatch >= 500) {
            batches.push(batch);
            batch = db.batch();
            inBatch = 0;
        }
    }
    if (inBatch > 0) batches.push(batch);
    await commitBatches(batches);
    return n;
}

export async function POST(request: Request) {
    const db = getFirebaseAdminFirestore();
    const statusRef = db.doc('crm_settings/sync');
    let statusStarted = false;

    try {
        // ── Auth: Bearer idToken → admin эрх ──
        const token = getBearerToken(request);
        if (!token) {
            return NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 });
        }
        let decoded: { uid: string };
        try {
            decoded = (await getFirebaseAdminAuth().verifyIdToken(token)) as { uid: string };
        } catch {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
        }
        const requesterSnap = await db.doc(`employees/${decoded.uid}`).get();
        const requester = requesterSnap.exists ? (requesterSnap.data() as Record<string, unknown>) : null;
        if (requester?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const userName =
            [requester?.firstName, requester?.lastName].filter(Boolean).join(' ') ||
            (requester?.email as string) ||
            decoded.uid;

        await statusRef.set(
            {
                status: 'running',
                message: 'Sheets-ээс дата татаж байна...',
                lastSyncAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
        );
        statusStarted = true;

        // ── 1. Sheets татах ──
        const data = await fetchSheets();
        const allRows = Array.isArray(data['All data']) ? data['All data'] : [];

        // ── 2. Мөрүүдийг парслах (9 шийт + 2022–2026 он) ──
        const orders: ParsedOrder[] = [];
        let totalRev = 0;
        let totalPro = 0;
        for (const r of allRows) {
            const sheet = str(r['шийт']);
            if (!ALL_SHEETS.includes(sheet)) continue;
            const year = Math.trunc(num(r['Year']));
            if (!VALID_YEARS.has(year)) continue; // бохир огноо (0/1899/1900) шүүх
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

        // ── 3. crm_orders бүтнээр дахин бичих ──
        await statusRef.set({ message: `${orders.length} захиалга бичиж байна...` }, { merge: true });
        await deleteAllDocs(db, 'crm_orders');
        {
            const batches: WriteBatch[] = [];
            for (let i = 0; i < orders.length; i += 500) {
                const batch = db.batch();
                for (const o of orders.slice(i, i + 500)) {
                    batch.set(db.collection('crm_orders').doc(), {
                        ...o,
                        syncedAt: FieldValue.serverTimestamp(),
                    });
                }
                batches.push(batch);
            }
            await commitBatches(batches);
        }

        // ── 4. Шинэ компани автоматаар үүсгэх (customer шатаар) ──
        const companiesSnap = await db.collection('crm_companies').get();
        /** normName(name) → { id, name } */
        const companyByKey = new Map<string, { id: string; name: string }>();
        for (const d of companiesSnap.docs) {
            const nm = str((d.data() as Record<string, unknown>).name);
            if (nm) companyByKey.set(normName(nm), { id: d.id, name: nm });
        }
        let newCompanies = 0;
        {
            const batches: WriteBatch[] = [];
            let batch = db.batch();
            let inBatch = 0;
            for (const o of orders) {
                if (!o.company || companyByKey.has(o.companyKey)) continue;
                const ref = db.collection('crm_companies').doc();
                batch.set(ref, {
                    name: o.company,
                    segment: o.segment,
                    kam: o.kam || null,
                    funnelStage: 'customer',
                    source: 'existing',
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                });
                companyByKey.set(o.companyKey, { id: ref.id, name: o.company });
                newCompanies++;
                inBatch++;
                if (inBatch >= 500) {
                    batches.push(batch);
                    batch = db.batch();
                    inBatch = 0;
                }
            }
            if (inBatch > 0) batches.push(batch);
            await commitBatches(batches);
        }

        // ── 5. Давамгай KAM (sync.py:174-179 SQL-ийн порт) ──
        // companyKey → kam → { trips, maxYm } (зөвхөн валид KAM)
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
        /** companyKey → давамгай KAM (рейсээр их, tie-break сүүлийн ym). */
        const dominantKam = new Map<string, string>();
        for (const [key, per] of kamAgg) {
            let best: { kam: string; trips: number; maxYm: number } | null = null;
            for (const [kam, v] of per) {
                if (!best || v.trips > best.trips || (v.trips === best.trips && v.maxYm > best.maxYm)) {
                    best = { kam, trips: v.trips, maxYm: v.maxYm };
                }
            }
            if (best) dominantKam.set(key, best.kam);
        }
        {
            const batches: WriteBatch[] = [];
            let batch = db.batch();
            let inBatch = 0;
            for (const [key, kam] of dominantKam) {
                const c = companyByKey.get(key);
                if (!c) continue;
                batch.update(db.doc(`crm_companies/${c.id}`), {
                    kam,
                    updatedAt: FieldValue.serverTimestamp(),
                });
                inBatch++;
                if (inBatch >= 500) {
                    batches.push(batch);
                    batch = db.batch();
                    inBatch = 0;
                }
            }
            if (inBatch > 0) batches.push(batch);
            await commitBatches(batches);
        }

        // ── 6. Агрегатууд ──
        await statusRef.set({ message: 'Агрегат тооцож байна...' }, { merge: true });

        // 6a. crm_order_stats/{year}
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
                const k = (y.byKam[o.kam] ??= newSlice());
                k.revenue += o.revenue;
                k.profit += o.profit;
                k.trips++;
                const team = TEAM_OF[o.kam];
                if (team) {
                    const t = (y.byTeam[team] ??= newSlice());
                    t.revenue += o.revenue;
                    t.profit += o.profit;
                    t.trips++;
                }
            }
            if (o.segment) {
                const s = (y.bySegment[o.segment] ??= newSlice());
                s.revenue += o.revenue;
                s.profit += o.profit;
                s.trips++;
            }
        }

        // 6b. crm_company_stats/{nameDocId(company)}
        interface CompanyAgg {
            name: string;
            companyKey: string;
            kams: Map<string, number>;
            segRev: Map<string, number>;
            years: Map<number, { revenue: number; profit: number; trips: number; monthlyRevenue: number[] }>;
            lastYm: number;
        }
        const compStats = new Map<string, CompanyAgg>();
        for (const o of orders) {
            if (!o.company) continue;
            let c = compStats.get(o.companyKey);
            if (!c) {
                c = {
                    name: o.company,
                    companyKey: o.companyKey,
                    kams: new Map(),
                    segRev: new Map(),
                    years: new Map(),
                    lastYm: 0,
                };
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

        // 6c. crm_carrier_stats/{nameDocId(driver)}
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
            const yr = c.years.get(o.year) ?? { trips: 0, totalPrice: 0 };
            yr.trips++;
            yr.totalPrice += o.carrierPrice;
            c.years.set(o.year, yr);
            c.lastYm = Math.max(c.lastYm, o.ym);
        }

        // Stats collection-уудыг бүтэн overwrite (хуучирсан doc устгана)
        const statBatches: WriteBatch[] = [];
        let statBatch = db.batch();
        let statInBatch = 0;
        const pushStatOp = (op: (b: WriteBatch) => void) => {
            op(statBatch);
            statInBatch++;
            if (statInBatch >= 500) {
                statBatches.push(statBatch);
                statBatch = db.batch();
                statInBatch = 0;
            }
        };

        const orderStatIds = new Set([...yearStats.keys()].map(String));
        for (const ref of await db.collection('crm_order_stats').listDocuments()) {
            if (!orderStatIds.has(ref.id)) pushStatOp((b) => b.delete(ref));
        }
        for (const [year, y] of yearStats) {
            const ref = db.doc(`crm_order_stats/${year}`);
            pushStatOp((b) =>
                b.set(ref, {
                    id: String(year),
                    year: y.year,
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
                    updatedAt: FieldValue.serverTimestamp(),
                }),
            );
        }

        const compDocIds = new Set<string>();
        for (const c of compStats.values()) compDocIds.add(nameDocId(c.name));
        for (const ref of await db.collection('crm_company_stats').listDocuments()) {
            if (!compDocIds.has(ref.id)) pushStatOp((b) => b.delete(ref));
        }
        for (const c of compStats.values()) {
            const matched = companyByKey.get(c.companyKey);
            let topSeg = '';
            let topSegRev = -1;
            for (const [seg, rev] of c.segRev) {
                if (rev > topSegRev) {
                    topSeg = seg;
                    topSegRev = rev;
                }
            }
            const years: Record<string, { revenue: number; profit: number; trips: number; monthlyRevenue: number[] }> =
                {};
            for (const [y, v] of c.years) years[String(y)] = v;
            const ref = db.doc(`crm_company_stats/${nameDocId(c.name)}`);
            pushStatOp((b) =>
                b.set(ref, {
                    id: nameDocId(c.name),
                    name: matched?.name ?? c.name,
                    companyKey: c.companyKey,
                    companyId: matched?.id ?? null,
                    kam: dominantKam.get(c.companyKey) ?? null,
                    segment: topSeg || null,
                    years,
                    lastYm: c.lastYm,
                    updatedAt: FieldValue.serverTimestamp(),
                }),
            );
        }

        const carrierDocIds = new Set(carrierStats.keys());
        for (const ref of await db.collection('crm_carrier_stats').listDocuments()) {
            if (!carrierDocIds.has(ref.id)) pushStatOp((b) => b.delete(ref));
        }
        for (const [key, c] of carrierStats) {
            const years: Record<string, { trips: number; totalPrice: number }> = {};
            for (const [y, v] of c.years) years[String(y)] = v;
            const ref = db.doc(`crm_carrier_stats/${key}`);
            pushStatOp((b) =>
                b.set(ref, {
                    id: key,
                    name: c.name,
                    trailers: [...c.trailers].sort(),
                    trips: c.trips,
                    totalPrice: c.totalPrice,
                    years,
                    lastYm: c.lastYm,
                    updatedAt: FieldValue.serverTimestamp(),
                }),
            );
        }
        if (statInBatch > 0) statBatches.push(statBatch);
        await commitBatches(statBatches);

        // ── 7. Lead report → crm_deals ──
        await statusRef.set({ message: 'Лийд синк хийж байна...' }, { merge: true });
        const leadDeals = await syncLeads(db, data);

        // ── 8. Аудит + төлөв + хариу ──
        const detail = `${orders.length} мөр, ${newCompanies} шинэ компани, ${leadDeals} лийд`;
        await db.collection('crm_audit').add({
            userId: decoded.uid,
            userName,
            action: 'sync',
            entity: 'crm_orders',
            entityId: null,
            detail,
            createdAt: FieldValue.serverTimestamp(),
        });
        await statusRef.set({
            status: 'ok',
            message: detail,
            lastSyncAt: FieldValue.serverTimestamp(),
            orderCount: orders.length,
            companyCount: compStats.size,
            newCompanies,
            leadDeals,
        });

        return NextResponse.json({
            ok: true,
            orders: orders.length,
            newCompanies,
            companies: compStats.size,
            carriers: carrierStats.size,
            leads: leadDeals,
            years: [...yearStats.keys()].sort(),
            revenueM: Math.round((totalRev / 1e6) * 10) / 10,
            profitM: Math.round((totalPro / 1e6) * 10) / 10,
        });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Internal Server Error';
        if (statusStarted) {
            await statusRef
                .set(
                    { status: 'error', message, lastSyncAt: FieldValue.serverTimestamp() },
                    { merge: true },
                )
                .catch(() => {});
        }
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
