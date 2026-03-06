/**
 * Нэг удаагийн скрипт: манай төслийн tms_warehouses бүртгэлийг бүс нутаг лавлах (tms_regions) тай холбоно.
 *
 * - Агуулахын regionId нь одоогоор текст (нэр) эсвэл хуучин region doc id байж болно.
 * - tms_regions-ийн id эсвэл name-тай тааруулж, warehouse дээр regionId болон regionRef тохируулна.
 *
 * Хэрэглээ (зорилтот төсөл — манай төсөл):
 *   node scripts/link-warehouses-to-regions.js [TARGET_KEY.json]
 *
 * TARGET_KEY өгөхгүй бол GOOGLE_APPLICATION_CREDENTIALS эсвэл default credentials ашиглана.
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const TMS_WAREHOUSES_COLLECTION = 'tms_warehouses';
const TMS_REGIONS_COLLECTION = 'tms_regions';
const BATCH_SIZE = 500;

function loadKey(keyPath) {
  const resolved = path.resolve(keyPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Key file not found: ${resolved}`);
  }
  return require(resolved);
}

function normalizeForMatch(str) {
  if (typeof str !== 'string') return '';
  return str.trim().toLowerCase();
}

async function run() {
  const args = process.argv.slice(2);
  const targetKeyPath = args[0];

  let app;
  if (targetKeyPath) {
    const targetKey = loadKey(targetKeyPath);
    app = admin.initializeApp({ credential: admin.credential.cert(targetKey) }, 'target');
  } else {
    try {
      app = admin.initializeApp(
        { projectId: 'hr-tumenresources', credential: admin.credential.applicationDefault() },
        'target'
      );
    } catch (e) {
      console.error('TARGET_KEY.json зааж өгнө үү, эсвэл GOOGLE_APPLICATION_CREDENTIALS тохируулна уу. Алдаа:', e.message);
      process.exit(1);
    }
  }

  const db = app.firestore();

  console.log('Уншиж байна: tms_regions...');
  const regionsSnap = await db.collection(TMS_REGIONS_COLLECTION).get();
  const regions = regionsSnap.docs.map((d) => ({ id: d.id, name: (d.data().name || '').toString().trim() }));
  console.log(`Олдсон бүс нутаг: ${regions.length}`);

  const regionById = new Map(regions.map((r) => [r.id, r]));
  const regionByNameNormalized = new Map(
    regions.map((r) => [normalizeForMatch(r.name), r]).filter(([k]) => k !== '')
  );

  console.log('Уншиж байна: tms_warehouses...');
  const warehousesSnap = await db.collection(TMS_WAREHOUSES_COLLECTION).get();
  const warehouses = warehousesSnap.docs;
  console.log(`Олдсон агуулах: ${warehouses.length}`);

  let updated = 0;
  let skipped = 0;
  let batch = db.batch();
  let opCount = 0;

  for (const whDoc of warehouses) {
    const data = whDoc.data();
    const currentRegionId = (data.regionId ?? data.region_id ?? '').toString().trim();

    if (!currentRegionId) {
      skipped++;
      continue;
    }

    let resolvedRegionId = null;

    if (regionById.has(currentRegionId)) {
      resolvedRegionId = currentRegionId;
    } else {
      const byName = regionByNameNormalized.get(normalizeForMatch(currentRegionId));
      if (byName) resolvedRegionId = byName.id;
    }

    if (!resolvedRegionId) {
      console.log(`  Анхаар: агуулах "${data.name || whDoc.id}" — бүс нутаг "${currentRegionId}" лавлахад олдсонгүй, үлдээв.`);
      skipped++;
      continue;
    }

    const regionRef = db.collection(TMS_REGIONS_COLLECTION).doc(resolvedRegionId);
    const whRef = db.collection(TMS_WAREHOUSES_COLLECTION).doc(whDoc.id);

    batch.update(whRef, {
      regionId: resolvedRegionId,
      regionRef,
      updatedAt: admin.firestore.Timestamp.now(),
    });
    opCount++;
    updated++;

    if (opCount >= BATCH_SIZE) {
      await batch.commit();
      console.log(`  Хадгалагдсан: ${updated} агуулах.`);
      batch = db.batch();
      opCount = 0;
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }

  console.log(`\nДууслаа. Холбогдсон: ${updated}, алгасагдсан: ${skipped}.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
