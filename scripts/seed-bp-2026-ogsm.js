/**
 * Tumen Tech 2026 OGSM Business Plan → Firestore seed.
 *
 * Эх сурвалж: /Users/lkhagvasurenotgonbayar/Downloads/Tumen Tech OGSM KPI.xlsx (OGSM sheet)
 * → /tmp/ogsm-plan-2026.json (Python-аар parse хийсэн)
 *
 * Үүсгэх баримтууд:
 *   bp_plans        × 1   (fiscalYear=2026, framework=ogsm, status=active)
 *   bp_themes       × 3   (Focus area: Customer/Consumer, Company, Competition)
 *   bp_objectives   × N   (Goal-ийн дагуу нэгтгэсэн)
 *   bp_strategies   × 40  (мөр тус бүр)
 *   bp_key_results  × M   (Measure заасан мөр бүрт)
 *
 * Эзэмшигч (Owner) нэрсийг `employees` collection-той firstName-ээр fuzzy match.
 *
 * Хэрэглээ:
 *   node scripts/seed-bp-2026-ogsm.js scripts/key/hr-tumenresources-key.json [--apply]
 *
 * Default: dry-run (юу үүсэхийг л харуулна). --apply орчуулсэн үед бодит бичнэ.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ──────────────────────────────────────────────────────────────────────────
// CLI
// ──────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const keyPath = args.find((a) => !a.startsWith('--'));
const APPLY = args.includes('--apply');

if (!keyPath) {
    console.error('Usage: node seed-bp-2026-ogsm.js <service-account.json> [--apply]');
    process.exit(1);
}

const absKey = path.resolve(keyPath);
if (!fs.existsSync(absKey)) {
    console.error(`Service account key not found: ${absKey}`);
    process.exit(1);
}

const serviceAccount = require(absKey);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ──────────────────────────────────────────────────────────────────────────
// Load parsed OGSM data
// ──────────────────────────────────────────────────────────────────────────
const PLAN_JSON = '/tmp/ogsm-plan-2026.json';
if (!fs.existsSync(PLAN_JSON)) {
    console.error(`OGSM JSON not found: ${PLAN_JSON}. Run Python parser first.`);
    process.exit(1);
}
const plan = JSON.parse(fs.readFileSync(PLAN_JSON, 'utf8'));

// ──────────────────────────────────────────────────────────────────────────
// Theme definitions (3 focus areas)
// ──────────────────────────────────────────────────────────────────────────
const THEME_DEFS = {
    'Customer/ Consumer': {
        title: 'Хэрэглэгч / Захиалагч',
        description: 'Борлуулалт, тээвэрчид, харилцагч, хамтын ажиллагаа',
        color: '#10B981',
        weight: 40,
        order: 1,
    },
    Company: {
        title: 'Компани',
        description: 'Дотоод процесс, дижитал, ХАБЭА, санхүү',
        color: '#3B82F6',
        weight: 35,
        order: 2,
    },
    Competition: {
        title: 'Өрсөлдөөн',
        description: 'Зах зээлийн судалгаа, бүтээгдэхүүн хөгжүүлэлт, брэндинг',
        color: '#F59E0B',
        weight: 25,
        order: 3,
    },
};

// ──────────────────────────────────────────────────────────────────────────
// Employee owner matching
// ──────────────────────────────────────────────────────────────────────────
async function loadEmployees() {
    const snap = await db.collection('employees').get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function normalize(s) {
    return (s || '').toString().trim().toLowerCase();
}

function matchOwner(ownerName, employees) {
    if (!ownerName) return { id: '', name: '' };
    const needle = normalize(ownerName);
    // Exact firstName match (case-insensitive)
    let hit = employees.find((e) => normalize(e.firstName) === needle);
    if (hit) return { id: hit.id, name: `${hit.lastName || ''} ${hit.firstName || ''}`.trim() };
    // Prefix match (e.g. "Нацагдорж " with trailing space, or partial)
    hit = employees.find((e) => normalize(e.firstName).startsWith(needle) || needle.startsWith(normalize(e.firstName)));
    if (hit) return { id: hit.id, name: `${hit.lastName || ''} ${hit.firstName || ''}`.trim() };
    // lastName match (fallback)
    hit = employees.find((e) => normalize(e.lastName) === needle);
    if (hit) return { id: hit.id, name: `${hit.lastName || ''} ${hit.firstName || ''}`.trim() };
    return { id: '', name: ownerName };
}

// ──────────────────────────────────────────────────────────────────────────
// Measure parsing → KeyResult metric
// ──────────────────────────────────────────────────────────────────────────
function parseMeasure(measureText) {
    const text = (measureText || '').toString();
    if (!text) return null;

    // Pattern: metric_name(target%) e.g. "logging_compliance(≥95%)"
    const pctMatch = text.match(/\(\s*[≥>]?\s*(\d+(?:\.\d+)?)\s*%\s*\)/);
    if (pctMatch) {
        return {
            metricType: 'percentage',
            targetValue: parseFloat(pctMatch[1]),
            unit: '%',
        };
    }
    // Pattern: (≥N) numeric target
    const numMatch = text.match(/\(\s*[≥>]?\s*(\d+(?:\.\d+)?)\s*\)/);
    if (numMatch) {
        return {
            metricType: 'number',
            targetValue: parseFloat(numMatch[1]),
            unit: '',
        };
    }
    // Pattern: ≥N% inline
    const inlinePct = text.match(/[≥>]\s*(\d+(?:\.\d+)?)\s*%/);
    if (inlinePct) {
        return {
            metricType: 'percentage',
            targetValue: parseFloat(inlinePct[1]),
            unit: '%',
        };
    }
    // Pattern: (Yes) → boolean
    if (/\(\s*Yes\s*\)/i.test(text) || /\bYes\b/.test(text)) {
        return {
            metricType: 'boolean',
            targetValue: 1,
            unit: '',
        };
    }
    // Default: boolean (initiative)
    return {
        metricType: 'boolean',
        targetValue: 1,
        unit: '',
    };
}

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────
async function main() {
    console.log(`\n=== Tumen Tech 2026 OGSM seed (mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}) ===\n`);

    // 1) Load employees & match owners
    const employees = await loadEmployees();
    console.log(`Loaded ${employees.length} employees`);

    const ownerMap = {};
    for (const ownerName of plan.owners) {
        ownerMap[ownerName] = matchOwner(ownerName, employees);
    }
    console.log('\nOwner mapping:');
    for (const [k, v] of Object.entries(ownerMap)) {
        const status = v.id ? '✓' : '✗';
        console.log(`  ${status} ${k.padEnd(15)} → ${v.id ? `${v.name} (${v.id})` : 'NO MATCH'}`);
    }

    // 2a) Archive any existing fiscalYear=2026 plans
    const existing = await db.collection('bp_plans').where('fiscalYear', '==', 2026).get();
    const plansToArchive = [];
    for (const d of existing.docs) {
        if (d.data().status !== 'archived') {
            plansToArchive.push(d.ref);
            console.log(`  ⚠ Existing plan to archive: ${d.id} ("${d.data().title}")`);
        }
    }

    // 2b) New plan
    const adminUid = 'system-seed';
    const planRef = db.collection('bp_plans').doc();
    const planDoc = {
        title: 'Tumen Tech 2026 OGSM',
        fiscalYear: 2026,
        framework: 'ogsm',
        status: 'active',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        createdAt: new Date().toISOString(),
        createdBy: adminUid,
    };

    // 3) Themes
    const themeRefs = {};
    const themeDocs = {};
    for (const focusKey of plan.focus_areas) {
        const def = THEME_DEFS[focusKey];
        if (!def) {
            console.warn(`No theme def for focus: "${focusKey}" — skipping`);
            continue;
        }
        const ref = db.collection('bp_themes').doc();
        themeRefs[focusKey] = ref;
        themeDocs[focusKey] = {
            planId: planRef.id,
            title: def.title,
            description: def.description,
            color: def.color,
            weight: def.weight,
            ownerId: '',
            ownerName: '',
            order: def.order,
            status: 'active',
            createdAt: new Date().toISOString(),
        };
    }

    // 4) Group rows by (focus, objective, goal) → bp_objectives
    const goalKey = (r) => `${r.focus}||${r.objective}||${r.goal}`;
    const objectivesByKey = new Map();
    for (const row of plan.rows) {
        const k = goalKey(row);
        if (!objectivesByKey.has(k)) {
            objectivesByKey.set(k, {
                focus: row.focus,
                objective: row.objective,
                goal: row.goal || row.objective, // fallback: use objective if goal missing
                owners: new Set(),
            });
        }
        if (row.owner) objectivesByKey.get(k).owners.add(row.owner);
    }

    const objectiveRefs = new Map(); // key → ref
    const objectiveDocs = new Map();
    for (const [key, info] of objectivesByKey) {
        const ref = db.collection('bp_objectives').doc();
        objectiveRefs.set(key, ref);

        // Primary owner: first owner mentioned
        const primaryOwner = [...info.owners][0] || '';
        const owner = primaryOwner ? ownerMap[primaryOwner] : { id: '', name: '' };
        const themeRef = themeRefs[info.focus];

        objectiveDocs.set(key, {
            planId: planRef.id,
            themeId: themeRef ? themeRef.id : '',
            title: info.goal.slice(0, 200),
            description: info.objective ? `[${info.objective}]` : '',
            year: 2026,
            ownerId: owner.id,
            ownerName: owner.name,
            status: 'on_track',
            progress: 0,
            level: 'company',
            createdAt: new Date().toISOString(),
        });
    }

    // 5) Strategies + Key Results
    const strategyDocs = [];
    const keyResultDocs = [];
    for (const row of plan.rows) {
        const k = goalKey(row);
        const objRef = objectiveRefs.get(k);
        const themeRef = themeRefs[row.focus];
        if (!objRef || !themeRef) continue;

        const owner = row.owner ? ownerMap[row.owner] : { id: '', name: '' };

        // Strategy
        const stratRef = db.collection('bp_strategies').doc();
        const strategyTitle = (row.strategy || row.measure || 'Strategy').slice(0, 200);
        strategyDocs.push({
            ref: stratRef,
            data: {
                planId: planRef.id,
                themeId: themeRef.id,
                parentId: objRef.id,
                type: 'ogsm_strategy',
                title: strategyTitle,
                description: row.notes || '',
                ownerId: owner.id || '',
                ownerName: owner.name || '',
                status: 'on_track',
                progress: 0,
                startDate: '2026-01-01',
                endDate: '2026-12-31',
                createdAt: new Date().toISOString(),
            },
        });

        // Key Result (measure)
        if (row.measure) {
            const krRef = db.collection('bp_key_results').doc();
            const parsed = parseMeasure(row.measure);
            keyResultDocs.push({
                ref: krRef,
                data: {
                    planId: planRef.id,
                    themeId: themeRef.id,
                    objectiveId: objRef.id,
                    strategyId: stratRef.id,
                    title: row.measure.slice(0, 250),
                    metricType: parsed.metricType,
                    startValue: 0,
                    currentValue: 0,
                    targetValue: parsed.targetValue,
                    unit: parsed.unit,
                    ownerId: owner.id || '',
                    ownerName: owner.name || '',
                    status: 'on_track',
                    dueDate: '2026-12-31',
                    createdAt: new Date().toISOString(),
                },
            });
        }
    }

    // 6) Summary
    console.log('\n=== Summary ===');
    console.log(`  bp_plans:       1`);
    console.log(`  bp_themes:      ${Object.keys(themeDocs).length}`);
    console.log(`  bp_objectives:  ${objectiveDocs.size}`);
    console.log(`  bp_strategies:  ${strategyDocs.length}`);
    console.log(`  bp_key_results: ${keyResultDocs.length}`);
    const unmatched = Object.entries(ownerMap).filter(([, v]) => !v.id);
    if (unmatched.length) {
        console.log(`  ⚠ Unmatched owners: ${unmatched.map(([k]) => k).join(', ')}`);
    }

    if (!APPLY) {
        console.log('\n→ DRY-RUN — Firestore-руу бичээгүй. --apply нэмэж бодит бичих.');
        process.exit(0);
    }

    // 7) Write to Firestore via batches
    console.log('\n→ Writing to Firestore...');
    let batch = db.batch();
    let count = 0;
    const COMMIT_AT = 400;

    const queue = [
        // Archive existing plans (update status)
        ...plansToArchive.map((ref) => ({ ref, data: { status: 'archived' }, isUpdate: true })),
        { ref: planRef, data: planDoc },
        ...Object.entries(themeDocs).map(([focus, data]) => ({ ref: themeRefs[focus], data })),
        ...Array.from(objectiveDocs.entries()).map(([key, data]) => ({
            ref: objectiveRefs.get(key),
            data,
        })),
        ...strategyDocs,
        ...keyResultDocs,
    ];

    for (const item of queue) {
        if (item.isUpdate) {
            batch.update(item.ref, item.data);
        } else {
            batch.set(item.ref, item.data);
        }
        count++;
        if (count % COMMIT_AT === 0) {
            await batch.commit();
            console.log(`  committed ${count}...`);
            batch = db.batch();
        }
    }
    if (count % COMMIT_AT !== 0) {
        await batch.commit();
    }

    console.log(`\n✓ Done. Wrote ${count} documents.`);
    console.log(`  planId = ${planRef.id}`);
}

main().catch((err) => {
    console.error('FATAL:', err);
    process.exit(1);
});
