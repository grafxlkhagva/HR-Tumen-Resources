/**
 * Tumen Tech 2026 OGSM → bp_kpis seed (нэмэлт).
 *
 * Урьд `seed-bp-2026-ogsm.js`-ээр `bp_key_results` (OGSM tab-ийн Measure)-уудыг
 * үүсгэсэн. Энэ скрипт нь "KPI хэмжүүр" tab-д үзүүлэх `bp_kpis` collection-руу
 * мөн адил Measure-ийг хуулна — frequency, RAG status, ragStatus тооцоолол
 * шаардлагатай KPI engine-руу нийцүүлж.
 *
 * Хэрэглээ:
 *   node scripts/seed-bp-2026-kpis.js scripts/key/hr-tumenresources-key.json <planId> [--apply]
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const keyPath = positional[0];
const planId = positional[1];
const APPLY = args.includes('--apply');

if (!keyPath || !planId) {
    console.error('Usage: node seed-bp-2026-kpis.js <service-account.json> <planId> [--apply]');
    process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(keyPath))) });
const db = admin.firestore();

function parseMeasureToKpi(text) {
    const t = (text || '').toString();
    const pctMatch = t.match(/\(\s*[≥>]?\s*(\d+(?:\.\d+)?)\s*%\s*\)/) || t.match(/[≥>]\s*(\d+(?:\.\d+)?)\s*%/);
    if (pctMatch) {
        return { metricType: 'percentage', target: parseFloat(pctMatch[1]), unit: '%' };
    }
    const numMatch = t.match(/\(\s*[≥>]?\s*(\d+(?:\.\d+)?)\s*\)/);
    if (numMatch) {
        return { metricType: 'number', target: parseFloat(numMatch[1]), unit: '' };
    }
    if (/\bYes\b/i.test(t)) {
        return { metricType: 'boolean', target: 1, unit: '' };
    }
    return { metricType: 'boolean', target: 1, unit: '' };
}

async function main() {
    console.log(`\n=== KPI seed for plan ${planId} (mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}) ===\n`);

    const planSnap = await db.collection('bp_plans').doc(planId).get();
    if (!planSnap.exists) {
        console.error(`Plan not found: ${planId}`);
        process.exit(1);
    }
    console.log(`Plan: ${planSnap.data().title}`);

    // Зэрэгцээ уншилт
    const [krSnap, existingKpiSnap] = await Promise.all([
        db.collection('bp_key_results').where('planId', '==', planId).get(),
        db.collection('bp_kpis').where('planId', '==', planId).get(),
    ]);
    console.log(`  bp_key_results found: ${krSnap.size}`);
    console.log(`  existing bp_kpis:     ${existingKpiSnap.size}`);

    // Existing KPI title set — давхар үүсгэхгүй
    const existingTitles = new Set(existingKpiSnap.docs.map((d) => (d.data().name || '').trim()));

    const newKpis = [];
    for (const d of krSnap.docs) {
        const kr = d.data();
        const title = (kr.title || '').trim();
        if (!title || existingTitles.has(title)) continue;

        const parsed = parseMeasureToKpi(title);
        const ref = db.collection('bp_kpis').doc();
        newKpis.push({
            ref,
            data: {
                planId,
                themeId: kr.themeId || '',
                objectiveId: kr.objectiveId || '',
                name: title.slice(0, 250),
                description: '',
                metricType: parsed.metricType,
                target: parsed.target,
                current: 0,
                unit: parsed.unit,
                frequency: 'quarterly',
                ownerId: kr.ownerId || '',
                ownerName: kr.ownerName || '',
                departmentId: '',
                ragStatus: 'red', // current=0, target>0 → behind
                createdAt: new Date().toISOString(),
            },
        });
    }

    console.log(`\n→ Will create ${newKpis.length} new KPIs`);
    if (newKpis.length > 0) {
        console.log('  Sample:');
        newKpis.slice(0, 3).forEach((k) => {
            console.log(`    - ${k.data.name.slice(0, 70)} | ${k.data.metricType} target=${k.data.target}${k.data.unit}`);
        });
    }

    if (!APPLY) {
        console.log('\n→ DRY-RUN. --apply ашиглаж бодит бичнэ.');
        process.exit(0);
    }

    let batch = db.batch();
    let count = 0;
    for (const item of newKpis) {
        batch.set(item.ref, item.data);
        count++;
        if (count % 400 === 0) {
            await batch.commit();
            batch = db.batch();
        }
    }
    if (count % 400 !== 0) await batch.commit();
    console.log(`\n✓ Wrote ${count} KPI docs to bp_kpis.`);
}

main().catch((err) => {
    console.error('FATAL:', err);
    process.exit(1);
});
