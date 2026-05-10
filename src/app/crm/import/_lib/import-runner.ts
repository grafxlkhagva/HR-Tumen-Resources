import {
    Firestore,
    collection,
    doc,
    getDocs,
    query,
    serverTimestamp,
    where,
    writeBatch,
} from 'firebase/firestore';
import {
    mapCompanyRow,
    mapContactRow,
    mapDealRow,
    type MappedCompany,
    type MappedContact,
    type MappedDeal,
} from './mappers';
import type { Employee } from '@/types';

export interface ImportProgress {
    phase: string;
    processed: number;
    total: number;
    skipped: number;
    issues: string[];
}

export type ProgressCallback = (p: ImportProgress) => void;

const BATCH_LIMIT = 450; // Firestore-ийн 500-аас доогуур

interface ExistingMap {
    /** hubspotId → docId */
    map: Map<string, string>;
}

/** hubspotId → existing doc map үүсгэх (entire collection-ийг scan хийнэ — MVP-д үр ашигтай). */
async function loadExistingMap(
    firestore: Firestore,
    collectionName: string,
): Promise<ExistingMap> {
    const snap = await getDocs(
        query(collection(firestore, collectionName), where('hubspotId', '!=', null)),
    );
    const map = new Map<string, string>();
    snap.forEach((d) => {
        const data = d.data();
        if (data.hubspotId) map.set(String(data.hubspotId), d.id);
    });
    return { map };
}

interface ImportResult {
    /** hubspotId → manai doc id (re-run, ассоциацид ашиглана). */
    idMap: Map<string, string>;
    inserted: number;
    updated: number;
    skipped: number;
    issues: string[];
}

/** companies CSV-аас domain → manai docId map үүсгэх. */
export function buildCompanyDomainMap(
    rows: Record<string, string>[],
    companyIdMap: Map<string, string>,
): Map<string, string> {
    const out = new Map<string, string>();
    rows.forEach((row) => {
        const hubspotId = row['Record ID']?.trim();
        if (!hubspotId) return;
        const docId = companyIdMap.get(hubspotId);
        if (!docId) return;

        // Үндсэн domain
        const main = row['Company Domain Name']?.trim().toLowerCase();
        if (main) out.set(main, docId);

        // Бусад domain (Additional Domains, ‖-аар салгасан)
        const additional = row['Additional Domains']?.trim();
        if (additional) {
            additional
                .split(/[,;|‖]/)
                .map((d) => d.trim().toLowerCase())
                .filter(Boolean)
                .forEach((d) => out.set(d, docId));
        }
    });
    return out;
}

/** companies CSV-аас name → manai docId map (case-insensitive) үүсгэх. */
export function buildCompanyNameMap(
    rows: Record<string, string>[],
    companyIdMap: Map<string, string>,
): Map<string, string> {
    const out = new Map<string, string>();
    rows.forEach((row) => {
        const hubspotId = row['Record ID']?.trim();
        if (!hubspotId) return;
        const docId = companyIdMap.get(hubspotId);
        if (!docId) return;
        const name = (row['Company name'] || row['Company Name'] || '').trim().toLowerCase();
        if (name) out.set(name, docId);
    });
    return out;
}

/** contacts CSV-аас email → manai contactDocId map (deal->contact fallback-д). */
export function buildContactEmailMap(
    rows: Record<string, string>[],
    contactIdMap: Map<string, string>,
): Map<string, string> {
    const out = new Map<string, string>();
    rows.forEach((row) => {
        const hubspotId = row['Record ID']?.trim();
        if (!hubspotId) return;
        const docId = contactIdMap.get(hubspotId);
        if (!docId) return;
        const email = (row['Email'] || '').trim().toLowerCase();
        if (email) out.set(email, docId);
    });
    return out;
}

async function commitInBatches<T>(
    firestore: Firestore,
    items: T[],
    apply: (batch: ReturnType<typeof writeBatch>, item: T) => void,
    onProgress?: (done: number) => void,
): Promise<void> {
    let i = 0;
    while (i < items.length) {
        const batch = writeBatch(firestore);
        const slice = items.slice(i, i + BATCH_LIMIT);
        slice.forEach((it) => apply(batch, it));
        await batch.commit();
        i += slice.length;
        onProgress?.(i);
    }
}

/** Helper: undefined талбаруудыг устгана (Firestore undefined-г зөвшөөрдөггүй). */
function clean<T extends Record<string, unknown>>(obj: T): T {
    const out: Record<string, unknown> = {};
    Object.keys(obj).forEach((k) => {
        const v = obj[k];
        if (v !== undefined) out[k] = v;
    });
    return out as T;
}

// ─────────────────────────────────────── COMPANIES

export async function importCompanies(
    firestore: Firestore,
    rows: Record<string, string>[],
    employees: Employee[],
    onProgress?: ProgressCallback,
): Promise<ImportResult> {
    onProgress?.({
        phase: 'Байгууллага бэлдэж байна...',
        processed: 0,
        total: rows.length,
        skipped: 0,
        issues: [],
    });

    const existing = await loadExistingMap(firestore, 'crm_companies');
    const idMap = new Map<string, string>();
    const issues: string[] = [];
    let skipped = 0;

    const inserts: { hubspotId: string; payload: MappedCompany }[] = [];
    const updates: { docId: string; hubspotId: string; payload: MappedCompany }[] = [];

    for (const row of rows) {
        const result = mapCompanyRow(row, employees);
        if (!result) {
            skipped++;
            continue;
        }
        if (result.issues.length) issues.push(...result.issues);

        const existingId = existing.map.get(result.data.hubspotId);
        if (existingId) {
            updates.push({
                docId: existingId,
                hubspotId: result.data.hubspotId,
                payload: result.data,
            });
            idMap.set(result.data.hubspotId, existingId);
        } else {
            const ref = doc(collection(firestore, 'crm_companies'));
            inserts.push({ hubspotId: result.data.hubspotId, payload: result.data });
            idMap.set(result.data.hubspotId, ref.id);
        }
    }

    // Inserts
    let processed = 0;
    const total = inserts.length + updates.length;

    await commitInBatches(
        firestore,
        inserts,
        (batch, it) => {
            const existingDocId = idMap.get(it.hubspotId);
            const ref = existingDocId
                ? doc(firestore, 'crm_companies', existingDocId)
                : doc(collection(firestore, 'crm_companies'));
            // Bind back the id we generated
            if (!existingDocId) idMap.set(it.hubspotId, ref.id);
            batch.set(
                ref,
                clean({
                    ...it.payload,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                }),
            );
        },
        (done) => {
            processed = done;
            onProgress?.({
                phase: 'Байгууллага шинээр нэмэгдэж байна...',
                processed,
                total,
                skipped,
                issues,
            });
        },
    );

    await commitInBatches(
        firestore,
        updates,
        (batch, it) => {
            const ref = doc(firestore, 'crm_companies', it.docId);
            batch.update(
                ref,
                clean({
                    ...it.payload,
                    updatedAt: serverTimestamp(),
                }),
            );
        },
        (done) => {
            processed = inserts.length + done;
            onProgress?.({
                phase: 'Байгууллага шинэчилж байна...',
                processed,
                total,
                skipped,
                issues,
            });
        },
    );

    return {
        idMap,
        inserted: inserts.length,
        updated: updates.length,
        skipped,
        issues,
    };
}

// ─────────────────────────────────────── CONTACTS

export async function importContacts(
    firestore: Firestore,
    rows: Record<string, string>[],
    employees: Employee[],
    /** company hubspotId → manai docId map (companies импортолсны дараа). */
    companyIdMap: Map<string, string>,
    /** Fallback 1: domain → ourCompanyId. */
    companyDomainMap: Map<string, string>,
    /** Fallback 2: companyName.toLowerCase() → ourCompanyId. */
    companyNameMap: Map<string, string>,
    onProgress?: ProgressCallback,
): Promise<ImportResult> {
    onProgress?.({
        phase: 'Харилцагч бэлдэж байна...',
        processed: 0,
        total: rows.length,
        skipped: 0,
        issues: [],
    });

    const existing = await loadExistingMap(firestore, 'crm_contacts');
    const idMap = new Map<string, string>();
    const issues: string[] = [];
    let skipped = 0;

    const inserts: { hubspotId: string; payload: MappedContact }[] = [];
    const updates: { docId: string; hubspotId: string; payload: MappedContact }[] = [];

    for (const row of rows) {
        const result = mapContactRow(row, employees);
        if (!result) {
            skipped++;
            continue;
        }
        if (result.issues.length) issues.push(...result.issues);

        const existingId = existing.map.get(result.data.hubspotId);
        if (existingId) {
            updates.push({
                docId: existingId,
                hubspotId: result.data.hubspotId,
                payload: result.data,
            });
            idMap.set(result.data.hubspotId, existingId);
        } else {
            inserts.push({ hubspotId: result.data.hubspotId, payload: result.data });
        }
    }

    let processed = 0;
    const total = inserts.length + updates.length;

    const buildPayload = (m: MappedContact) => {
        let companyId: string | undefined = m.companyHubspotId
            ? companyIdMap.get(m.companyHubspotId)
            : undefined;
        // Fallback 1: имэйл domain
        if (!companyId && m.emailDomain) {
            companyId = companyDomainMap.get(m.emailDomain);
        }
        // Fallback 2: company name (case-insensitive)
        if (!companyId && m.companyNameRaw) {
            companyId = companyNameMap.get(m.companyNameRaw.toLowerCase());
        }
        const {
            companyHubspotId: _a,
            emailDomain: _b,
            companyNameRaw: _c,
            ...rest
        } = m;
        return clean({
            ...rest,
            companyId,
        });
    };

    await commitInBatches(
        firestore,
        inserts,
        (batch, it) => {
            const ref = doc(collection(firestore, 'crm_contacts'));
            idMap.set(it.hubspotId, ref.id);
            batch.set(ref, {
                ...buildPayload(it.payload),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        },
        (done) => {
            processed = done;
            onProgress?.({
                phase: 'Харилцагч нэмэгдэж байна...',
                processed,
                total,
                skipped,
                issues,
            });
        },
    );

    await commitInBatches(
        firestore,
        updates,
        (batch, it) => {
            const ref = doc(firestore, 'crm_contacts', it.docId);
            batch.update(ref, {
                ...buildPayload(it.payload),
                updatedAt: serverTimestamp(),
            });
        },
        (done) => {
            processed = inserts.length + done;
            onProgress?.({
                phase: 'Харилцагч шинэчилж байна...',
                processed,
                total,
                skipped,
                issues,
            });
        },
    );

    return {
        idMap,
        inserted: inserts.length,
        updated: updates.length,
        skipped,
        issues,
    };
}

// ─────────────────────────────────────── DEALS

export async function importDeals(
    firestore: Firestore,
    rows: Record<string, string>[],
    employees: Employee[],
    companyIdMap: Map<string, string>,
    contactIdMap: Map<string, string>,
    /** Гэрээ → contact холбох fallback (имэйлээр). */
    contactEmailMap: Map<string, string>,
    /** Гэрээ → company холбох fallback (domain-аар, contact-ийн companyId-аар дамжина). */
    contactCompanyMap: Map<string, string>,
    companyDomainMap: Map<string, string>,
    onProgress?: ProgressCallback,
): Promise<ImportResult> {
    onProgress?.({
        phase: 'Гэрээ бэлдэж байна...',
        processed: 0,
        total: rows.length,
        skipped: 0,
        issues: [],
    });

    const existing = await loadExistingMap(firestore, 'crm_deals');
    const idMap = new Map<string, string>();
    const issues: string[] = [];
    let skipped = 0;

    const inserts: { hubspotId: string; payload: MappedDeal }[] = [];
    const updates: { docId: string; hubspotId: string; payload: MappedDeal }[] = [];

    for (const row of rows) {
        const result = mapDealRow(row, employees);
        if (!result) {
            skipped++;
            continue;
        }
        if (result.issues.length) issues.push(...result.issues);

        const existingId = existing.map.get(result.data.hubspotId);
        if (existingId) {
            updates.push({
                docId: existingId,
                hubspotId: result.data.hubspotId,
                payload: result.data,
            });
            idMap.set(result.data.hubspotId, existingId);
        } else {
            inserts.push({ hubspotId: result.data.hubspotId, payload: result.data });
        }
    }

    let processed = 0;
    const total = inserts.length + updates.length;

    const buildPayload = (m: MappedDeal) => {
        let companyId: string | undefined = m.companyHubspotId
            ? companyIdMap.get(m.companyHubspotId)
            : undefined;
        let contactId: string | undefined = m.contactHubspotId
            ? contactIdMap.get(m.contactHubspotId)
            : undefined;

        // Fallback 1: гэрээний нэрнээс имэйл сугалаад contact руу холбоно
        if (!contactId && m.nameEmail) {
            contactId = contactEmailMap.get(m.nameEmail);
        }

        // Fallback 2: тухайн contact-ийн companyId-аар дамжуулах
        if (!companyId && contactId) {
            companyId = contactCompanyMap.get(contactId);
        }

        // Fallback 3: имэйл domain-аар шууд company-руу
        if (!companyId && m.nameEmail) {
            const dom = m.nameEmail.split('@')[1]?.toLowerCase();
            if (dom) companyId = companyDomainMap.get(dom);
        }

        const {
            companyHubspotId: _a,
            contactHubspotId: _b,
            nameEmail: _c,
            ...rest
        } = m;
        return clean({
            ...rest,
            companyId,
            contactId,
        });
    };

    await commitInBatches(
        firestore,
        inserts,
        (batch, it) => {
            const ref = doc(collection(firestore, 'crm_deals'));
            idMap.set(it.hubspotId, ref.id);
            batch.set(ref, {
                ...buildPayload(it.payload),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        },
        (done) => {
            processed = done;
            onProgress?.({
                phase: 'Гэрээ нэмэгдэж байна...',
                processed,
                total,
                skipped,
                issues,
            });
        },
    );

    await commitInBatches(
        firestore,
        updates,
        (batch, it) => {
            const ref = doc(firestore, 'crm_deals', it.docId);
            batch.update(ref, {
                ...buildPayload(it.payload),
                updatedAt: serverTimestamp(),
            });
        },
        (done) => {
            processed = inserts.length + done;
            onProgress?.({
                phase: 'Гэрээ шинэчилж байна...',
                processed,
                total,
                skipped,
                issues,
            });
        },
    );

    return {
        idMap,
        inserted: inserts.length,
        updated: updates.length,
        skipped,
        issues,
    };
}
