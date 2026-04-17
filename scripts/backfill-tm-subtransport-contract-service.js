/**
 * TMS Transport Management — subTransport-д contractServiceId backfill.
 *
 * Яагаад?
 *   Өмнө нь нэг TM → нэг гэрээний үйлчилгээ загвартай байхад subTransport-д
 *   үйлчилгээний id хадгалагддаггүй байсан. Multi-service дэмжлэг нэмсэний
 *   дараа хуучин баримтуудын subTransport дотор `contractServiceId` дутуу
 *   тул detail хуудсанд машин dropdown filter буруу ажиллах магадлалтай
 *   (primary-д fallback хийх — backward-compat, гэхдээ тод биш).
 *
 *   Энэ скрипт нь:
 *     - Firestore-аас бүх `tms_transport_management`-ийг бүлэглэн уншина.
 *     - `isContracted == true` бөгөөд subTransport-д contractServiceId дутуу
 *       үед эцэг баримтын `contractServiceId/Name/serviceTypeId`-г subUnit-уудад
 *       denormalize хийнэ.
 *     - Batch-ээр write хийж rate limit-д нийцнэ.
 *     - Default: dry-run; `--apply` аргументтэй үед бодит бичих.
 *
 * Хэрэглээ:
 *   node scripts/backfill-tm-subtransport-contract-service.js \
 *     scripts/key/hr-tumenresources-key.json [--apply]
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const COLLECTION = 'tms_transport_management';
const BATCH_SIZE = 400;

function usage() {
  console.error(
    'Usage: node scripts/backfill-tm-subtransport-contract-service.js <serviceAccountKey.json> [--apply]',
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const keyArg = args.find((a) => !a.startsWith('--'));
const applyMode = args.includes('--apply');

if (!keyArg) usage();
const keyPath = path.resolve(keyArg);
if (!fs.existsSync(keyPath)) {
  console.error(`❌ Service account key олдсонгүй: ${keyPath}`);
  process.exit(1);
}

const serviceAccount = require(keyPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function run() {
  const mode = applyMode ? 'APPLY' : 'DRY-RUN';
  console.log(`▶ TM subTransport contractServiceId backfill — ${mode}`);
  console.log('  Project:', serviceAccount.project_id);
  console.log('');

  const snap = await db.collection(COLLECTION).get();
  console.log(`  Total TM documents: ${snap.size}`);

  let needsUpdate = 0;
  let alreadyOk = 0;
  let noSubTransports = 0;
  let notContracted = 0;

  const pending = [];

  for (const doc of snap.docs) {
    const d = doc.data();
    if (!d.isContracted) {
      notContracted++;
      continue;
    }
    if (!Array.isArray(d.subTransports) || d.subTransports.length === 0) {
      noSubTransports++;
      continue;
    }

    const parentCsId = d.contractServiceId ?? null;
    const parentCsName = d.contractServiceName ?? null;
    const parentStId = d.serviceTypeId ?? null;

    const missingAny = d.subTransports.some((s) => !s.contractServiceId);
    if (!missingAny) {
      alreadyOk++;
      continue;
    }

    const nextSubs = d.subTransports.map((s) => ({
      ...s,
      contractServiceId: s.contractServiceId ?? parentCsId,
      contractServiceName: s.contractServiceName ?? parentCsName,
      serviceTypeId: s.serviceTypeId ?? parentStId,
    }));

    pending.push({ ref: doc.ref, subs: nextSubs, id: doc.id });
    needsUpdate++;
  }

  console.log('  Breakdown:');
  console.log(`    Not contracted (skip):      ${notContracted}`);
  console.log(`    No subTransports (skip):    ${noSubTransports}`);
  console.log(`    Already has contractSvcId:  ${alreadyOk}`);
  console.log(`    NEEDS BACKFILL:             ${needsUpdate}`);
  console.log('');

  if (pending.length === 0) {
    console.log('✔ Backfill хийх шаардлагагүй — бүх документ цэвэр.');
    return;
  }

  if (!applyMode) {
    console.log('⚠  DRY-RUN: бодит өөрчлөлт хийгдээгүй.');
    console.log('   Sample 5 TM:');
    pending.slice(0, 5).forEach((p) => {
      console.log(`     - ${p.id}  (${p.subs.length} sub)`);
    });
    console.log('');
    console.log('   Бодит хэрэгжүүлэхийн тулд `--apply` нэмнэ үү.');
    return;
  }

  console.log(`▶ Applying ${pending.length} document(s) in batches of ${BATCH_SIZE}...`);
  let batch = db.batch();
  let inBatch = 0;
  let committed = 0;
  for (const p of pending) {
    batch.update(p.ref, {
      subTransports: p.subs,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    inBatch++;
    if (inBatch >= BATCH_SIZE) {
      await batch.commit();
      committed += inBatch;
      console.log(`  ... committed ${committed}/${pending.length}`);
      batch = db.batch();
      inBatch = 0;
    }
  }
  if (inBatch > 0) {
    await batch.commit();
    committed += inBatch;
  }
  console.log(`✔ Complete — ${committed} document(s) updated.`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Backfill failed:', err);
    process.exit(1);
  });
