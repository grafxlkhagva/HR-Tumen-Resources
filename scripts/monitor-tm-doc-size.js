/**
 * TMS Transport Management — доккументын хэмжээний мониторинг.
 *
 * Зорилго:
 *   Firestore-д 1 document-ийн хязгаар 1 MiB. `subTransports`,
 *   `financeTransactions`, `dispatchSteps[].taskResults` (зургийн URL) бүгд
 *   нэг баримтад шахагдсан байдаг тул зарим том TM энэ хязгаарт ойртож
 *   магадлалтай.
 *
 * Хэрэглээ:
 *   # Нэг удаагийн audit
 *   node scripts/monitor-tm-doc-size.js scripts/key/hr-tumenresources-key.json
 *
 *   # Дээд threshold-г дурын KB-ээр тохируулах
 *   node scripts/monitor-tm-doc-size.js <key> --warn=700 --crit=900
 *
 * Үр дүн:
 *   - `[OK]`   баримт бүгдийн үндэс <700KB
 *   - `[WARN]` 700-900KB — follow-up-д тэмдэглэх
 *   - `[CRIT]` 900KB+    — яаралтай subcollection migration хэрэгтэй
 *
 * Cloud Function руу хувиргах заавар (SKETCH):
 *   exports.tmDocSizeMonitor = functions.firestore
 *     .document('tms_transport_management/{id}')
 *     .onWrite((change, context) => {
 *       const bytes = Buffer.byteLength(JSON.stringify(change.after.data() || {}), 'utf8');
 *       if (bytes > CRIT_BYTES) {
 *         // Slack/email alert
 *       }
 *     });
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const keyArg = args.find((a) => !a.startsWith('--'));
const warnArg = args.find((a) => a.startsWith('--warn='));
const critArg = args.find((a) => a.startsWith('--crit='));
const warnKb = warnArg ? Number(warnArg.split('=')[1]) : 700;
const critKb = critArg ? Number(critArg.split('=')[1]) : 900;

if (!keyArg) {
  console.error('Usage: node scripts/monitor-tm-doc-size.js <serviceAccountKey.json> [--warn=700] [--crit=900]');
  process.exit(1);
}

const keyPath = path.resolve(keyArg);
if (!fs.existsSync(keyPath)) {
  console.error('❌ Service account key олдсонгүй:', keyPath);
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(require(keyPath)) });
const db = admin.firestore();

function humanKb(bytes) {
  return (bytes / 1024).toFixed(1) + ' KB';
}

async function run() {
  console.log(`▶ Scanning tms_transport_management (warn: ${warnKb}KB, crit: ${critKb}KB)`);
  const snap = await db.collection('tms_transport_management').get();
  console.log(`  Total: ${snap.size} documents\n`);

  const rows = [];
  let totalBytes = 0;
  for (const doc of snap.docs) {
    const raw = JSON.stringify(doc.data() ?? {});
    const bytes = Buffer.byteLength(raw, 'utf8');
    totalBytes += bytes;
    let tag = '[OK]';
    if (bytes >= critKb * 1024) tag = '[CRIT]';
    else if (bytes >= warnKb * 1024) tag = '[WARN]';
    if (tag !== '[OK]') {
      rows.push({ id: doc.id, bytes, tag, code: doc.data()?.code ?? '-' });
    }
  }

  console.log(`Avg size: ${humanKb(totalBytes / Math.max(snap.size, 1))}\n`);

  if (rows.length === 0) {
    console.log('✔ Бүх баримт дотор threshold-оос дотор байна.');
    return;
  }

  rows.sort((a, b) => b.bytes - a.bytes);
  console.log(`⚠  ${rows.length} том баримт илэрлээ:\n`);
  rows.forEach((r) => {
    console.log(`  ${r.tag.padEnd(6)} ${humanKb(r.bytes).padEnd(10)}  ${r.id}  (${r.code})`);
  });
  console.log('\nЗөвлөмж: CRIT-ийг финансын гүйлгээ/дэд тээврийг subcollection руу шилжүүлэх planning-д оруул.');
}

run().then(() => process.exit(0)).catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
