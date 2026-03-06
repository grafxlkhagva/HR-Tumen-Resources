/**
 * TMS лавлах сан: tumen-tech-tms-20 төслөөс vehicle_makes, vehicle_models, vehicle_types, trailer_types, regions, industries, packaging_types-ийг
 * одоогийн төслийн tms_vehicle_makes, tms_vehicle_models, tms_vehicle_types, tms_trailer_types, tms_regions, tms_industries, tms_packaging_types руу хуулна.
 *
 * Хэрэглээ:
 *   node scripts/migrate-tms-vehicle-refs.js scripts/key/tumen-tech-tms-20-key.json [scripts/key/hr-tumenresources-key.json]
 *
 * Эх төсөл: vehicle_makes, vehicle_models, vehicle_types, trailer_types, regions, industries, packaging_types.
 * Зорилтот төсөл: tms_vehicle_makes, tms_vehicle_models, tms_vehicle_types, tms_trailer_types, tms_regions, tms_industries, tms_packaging_types.
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const SOURCE_COLLECTION_MAKES = 'vehicle_makes';
const SOURCE_COLLECTION_MODELS = 'vehicle_models';
const SOURCE_COLLECTION_TYPES = 'vehicle_types';
const SOURCE_COLLECTION_TRAILER_TYPES = 'trailer_types';
const SOURCE_COLLECTION_REGIONS = 'regions';
const SOURCE_COLLECTION_INDUSTRIES = 'industries';
const SOURCE_COLLECTION_PACKAGING_TYPES = 'packaging_types';
const TARGET_COLLECTION_MAKES = 'tms_vehicle_makes';
const TARGET_COLLECTION_MODELS = 'tms_vehicle_models';
const TARGET_COLLECTION_TYPES = 'tms_vehicle_types';
const TARGET_COLLECTION_TRAILER_TYPES = 'tms_trailer_types';
const TARGET_COLLECTION_REGIONS = 'tms_regions';
const TARGET_COLLECTION_INDUSTRIES = 'tms_industries';
const TARGET_COLLECTION_PACKAGING_TYPES = 'tms_packaging_types';
const BATCH_SIZE = 500;

function loadKey(keyPath) {
  const resolved = path.resolve(keyPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Key file not found: ${resolved}`);
  }
  return require(resolved);
}

function toTimestamp(val) {
  if (!val) return null;
  if (val && typeof val.toDate === 'function') return val;
  if (val._seconds !== undefined) return admin.firestore.Timestamp.fromMillis((val._seconds || 0) * 1000);
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : admin.firestore.Timestamp.fromDate(d);
  }
  return null;
}

function mapMake(doc) {
  const d = doc.data();
  const name = (d.name ?? d.makeName ?? d.title ?? d.label ?? '').toString().trim() || 'Unnamed';
  const createdAt = toTimestamp(d.createdAt ?? d.created_at) || admin.firestore.Timestamp.now();
  const updatedAt = toTimestamp(d.updatedAt ?? d.updated_at) || createdAt;
  return { name, createdAt, updatedAt };
}

function mapModel(doc, makeId) {
  const d = doc.data();
  const name = (d.name ?? d.modelName ?? d.title ?? d.label ?? '').toString().trim() || 'Unnamed';
  const createdAt = toTimestamp(d.createdAt ?? d.created_at) || admin.firestore.Timestamp.now();
  const updatedAt = toTimestamp(d.updatedAt ?? d.updated_at) || createdAt;
  return { name, makeId, createdAt, updatedAt };
}

function getMakeIdFromModelDoc(doc, makeIdMap) {
  const d = doc.data();
  let id = d.makeId ?? d.vehicleMakeId ?? d.make_id ?? d.vehicle_make_id ?? null;
  if (id) return makeIdMap.has(id) ? id : null;
  const ref = d.makeRef ?? d.vehicleMakeRef ?? d.make_ref;
  if (ref && (typeof ref === 'string' || (ref && ref.id))) id = typeof ref === 'string' ? ref : ref.id;
  return id && makeIdMap.has(id) ? id : null;
}

function mapType(doc) {
  const d = doc.data();
  const name = (d.name ?? d.typeName ?? d.title ?? d.label ?? '').toString().trim() || 'Unnamed';
  const createdAt = toTimestamp(d.createdAt ?? d.created_at) || admin.firestore.Timestamp.now();
  const updatedAt = toTimestamp(d.updatedAt ?? d.updated_at) || createdAt;
  return { name, createdAt, updatedAt };
}

function mapTrailerType(doc) {
  const d = doc.data();
  const name = (d.name ?? d.typeName ?? d.title ?? d.label ?? '').toString().trim() || 'Unnamed';
  const createdAt = toTimestamp(d.createdAt ?? d.created_at) || admin.firestore.Timestamp.now();
  const updatedAt = toTimestamp(d.updatedAt ?? d.updated_at) || createdAt;
  return { name, createdAt, updatedAt };
}

function mapRegion(doc) {
  const d = doc.data();
  const name = (d.name ?? d.regionName ?? d.title ?? d.label ?? '').toString().trim() || 'Unnamed';
  const createdAt = toTimestamp(d.createdAt ?? d.created_at) || admin.firestore.Timestamp.now();
  const updatedAt = toTimestamp(d.updatedAt ?? d.updated_at) || createdAt;
  return { name, createdAt, updatedAt };
}

function mapIndustry(doc) {
  const d = doc.data();
  const name = (d.name ?? d.industryName ?? d.title ?? d.label ?? '').toString().trim() || 'Unnamed';
  const createdAt = toTimestamp(d.createdAt ?? d.created_at) || admin.firestore.Timestamp.now();
  const updatedAt = toTimestamp(d.updatedAt ?? d.updated_at) || createdAt;
  return { name, createdAt, updatedAt };
}

function mapPackagingType(doc) {
  const d = doc.data();
  const name = (d.name ?? d.packagingTypeName ?? d.title ?? d.label ?? '').toString().trim() || 'Unnamed';
  const createdAt = toTimestamp(d.createdAt ?? d.created_at) || admin.firestore.Timestamp.now();
  const updatedAt = toTimestamp(d.updatedAt ?? d.updated_at) || createdAt;
  return { name, createdAt, updatedAt };
}

async function run() {
  const args = process.argv.slice(2);
  const sourceKeyPath = args[0];
  const targetKeyPath = args[1];

  if (!sourceKeyPath) {
    console.error('Usage: node scripts/migrate-tms-vehicle-refs.js <SOURCE_KEY.json> [TARGET_KEY.json]');
    process.exit(1);
  }

  const sourceKey = loadKey(sourceKeyPath);
  const sourceProjectId = sourceKey.project_id || 'tumen-tech-tms-20';

  let targetApp;
  if (targetKeyPath) {
    const targetKey = loadKey(targetKeyPath);
    targetApp = admin.initializeApp({ credential: admin.credential.cert(targetKey) }, 'target');
  } else {
    try {
      targetApp = admin.initializeApp(
        { projectId: 'hr-tumenresources', credential: admin.credential.applicationDefault() },
        'target'
      );
    } catch (e) {
      console.error('Target: pass TARGET_KEY.json or set GOOGLE_APPLICATION_CREDENTIALS. Error:', e.message);
      process.exit(1);
    }
  }

  const sourceApp = admin.initializeApp(
    { credential: admin.credential.cert(sourceKey), projectId: sourceProjectId },
    'source'
  );

  const sourceDb = sourceApp.firestore();
  const targetDb = targetApp.firestore();

  console.log('Reading source: vehicle_makes...');
  const makesSnap = await sourceDb.collection(SOURCE_COLLECTION_MAKES).get();
  const makes = makesSnap.docs;
  console.log(`Found ${makes.length} vehicle_makes.`);

  const makeIdMap = new Map();
  let batch = targetDb.batch();
  let opCount = 0;
  for (const doc of makes) {
    const data = mapMake(doc);
    const ref = targetDb.collection(TARGET_COLLECTION_MAKES).doc(doc.id);
    batch.set(ref, data);
    makeIdMap.set(doc.id, doc.id);
    opCount++;
    if (opCount >= BATCH_SIZE) {
      await batch.commit();
      console.log(`  Committed ${opCount} makes.`);
      batch = targetDb.batch();
      opCount = 0;
    }
  }
  if (opCount > 0) await batch.commit();
  console.log(`Written ${makes.length} docs to ${TARGET_COLLECTION_MAKES}.`);

  console.log('Reading source: vehicle_models...');
  const modelsSnap = await sourceDb.collection(SOURCE_COLLECTION_MODELS).get();
  const models = modelsSnap.docs;
  console.log(`Found ${models.length} vehicle_models.`);

  batch = targetDb.batch();
  opCount = 0;
  let skipped = 0;
  for (const doc of models) {
    const makeId = getMakeIdFromModelDoc(doc, makeIdMap);
    if (!makeId) {
      skipped++;
      continue;
    }
    const data = mapModel(doc, makeId);
    const ref = targetDb.collection(TARGET_COLLECTION_MODELS).doc(doc.id);
    batch.set(ref, data);
    opCount++;
    if (opCount >= BATCH_SIZE) {
      await batch.commit();
      console.log(`  Committed batch (models).`);
      batch = targetDb.batch();
      opCount = 0;
    }
  }
  if (opCount > 0) await batch.commit();
  console.log(`Written ${models.length - skipped} docs to ${TARGET_COLLECTION_MODELS}. Skipped ${skipped} (no valid makeId).`);

  console.log('Reading source: vehicle_types...');
  const typesSnap = await sourceDb.collection(SOURCE_COLLECTION_TYPES).get();
  const types = typesSnap.docs;
  console.log(`Found ${types.length} vehicle_types.`);

  batch = targetDb.batch();
  opCount = 0;
  for (const doc of types) {
    const data = mapType(doc);
    const ref = targetDb.collection(TARGET_COLLECTION_TYPES).doc(doc.id);
    batch.set(ref, data);
    opCount++;
    if (opCount >= BATCH_SIZE) {
      await batch.commit();
      console.log(`  Committed batch (types).`);
      batch = targetDb.batch();
      opCount = 0;
    }
  }
  if (opCount > 0) await batch.commit();
  console.log(`Written ${types.length} docs to ${TARGET_COLLECTION_TYPES}.`);

  console.log('Reading source: trailer_types...');
  const trailerTypesSnap = await sourceDb.collection(SOURCE_COLLECTION_TRAILER_TYPES).get();
  const trailerTypes = trailerTypesSnap.docs;
  console.log(`Found ${trailerTypes.length} trailer_types.`);

  batch = targetDb.batch();
  opCount = 0;
  for (const doc of trailerTypes) {
    const data = mapTrailerType(doc);
    const ref = targetDb.collection(TARGET_COLLECTION_TRAILER_TYPES).doc(doc.id);
    batch.set(ref, data);
    opCount++;
    if (opCount >= BATCH_SIZE) {
      await batch.commit();
      console.log('  Committed batch (trailer_types).');
      batch = targetDb.batch();
      opCount = 0;
    }
  }
  if (opCount > 0) await batch.commit();
  console.log(`Written ${trailerTypes.length} docs to ${TARGET_COLLECTION_TRAILER_TYPES}.`);

  console.log('Reading source: regions...');
  const regionsSnap = await sourceDb.collection(SOURCE_COLLECTION_REGIONS).get();
  const regions = regionsSnap.docs;
  console.log(`Found ${regions.length} regions.`);

  batch = targetDb.batch();
  opCount = 0;
  for (const doc of regions) {
    const data = mapRegion(doc);
    const ref = targetDb.collection(TARGET_COLLECTION_REGIONS).doc(doc.id);
    batch.set(ref, data);
    opCount++;
    if (opCount >= BATCH_SIZE) {
      await batch.commit();
      console.log('  Committed batch (regions).');
      batch = targetDb.batch();
      opCount = 0;
    }
  }
  if (opCount > 0) await batch.commit();
  console.log(`Written ${regions.length} docs to ${TARGET_COLLECTION_REGIONS}.`);

  console.log('Reading source: industries...');
  const industriesSnap = await sourceDb.collection(SOURCE_COLLECTION_INDUSTRIES).get();
  const industries = industriesSnap.docs;
  console.log(`Found ${industries.length} industries.`);

  batch = targetDb.batch();
  opCount = 0;
  for (const doc of industries) {
    const data = mapIndustry(doc);
    const ref = targetDb.collection(TARGET_COLLECTION_INDUSTRIES).doc(doc.id);
    batch.set(ref, data);
    opCount++;
    if (opCount >= BATCH_SIZE) {
      await batch.commit();
      console.log('  Committed batch (industries).');
      batch = targetDb.batch();
      opCount = 0;
    }
  }
  if (opCount > 0) await batch.commit();
  console.log(`Written ${industries.length} docs to ${TARGET_COLLECTION_INDUSTRIES}.`);

  console.log('Reading source: packaging_types...');
  const packagingTypesSnap = await sourceDb.collection(SOURCE_COLLECTION_PACKAGING_TYPES).get();
  const packagingTypes = packagingTypesSnap.docs;
  console.log(`Found ${packagingTypes.length} packaging_types.`);

  batch = targetDb.batch();
  opCount = 0;
  for (const doc of packagingTypes) {
    const data = mapPackagingType(doc);
    const ref = targetDb.collection(TARGET_COLLECTION_PACKAGING_TYPES).doc(doc.id);
    batch.set(ref, data);
    opCount++;
    if (opCount >= BATCH_SIZE) {
      await batch.commit();
      console.log('  Committed batch (packaging_types).');
      batch = targetDb.batch();
      opCount = 0;
    }
  }
  if (opCount > 0) await batch.commit();
  console.log(`Written ${packagingTypes.length} docs to ${TARGET_COLLECTION_PACKAGING_TYPES}.`);
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
