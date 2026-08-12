/**
 * Marketplace + isEmployee() хатуужуулалтын Firestore rules тест.
 *
 * Шалгах зүйлс:
 *   1. Ажилтан (employees doc-той) reference/дотоод өгөгдлөө уншиж чадсан ХЭВЭЭР байх
 *   2. Захиалагч (role='customer' claim, employees doc-гүй) дотоод өгөгдөл уншиж ЧАДАХГҮЙ
 *   3. Захиалагч зөвхөн өөрийн mp_orders + quotes уншина; offers ХААЛТТАЙ
 *   4. Захиалагч employees doc үүсгэж эрх ахиулж ЧАДАХГҮЙ
 *   5. Жолооч (role='driver') өөрийн offer уншина, бусдыг үгүй
 *
 * Урьдчилсан нөхцөл:
 *   npm i -D @firebase/rules-unit-testing
 *   firebase emulators:start --only firestore  (эсвэл exec-ээр)
 *
 * Хэрэглээ:
 *   FIRESTORE_EMULATOR_HOST=localhost:8080 node scripts/test-marketplace-rules.js
 */

const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'mp-rules-test';
const RULES_PATH = path.resolve(__dirname, '..', 'firestore.rules');

let passed = 0;
let failed = 0;

async function check(name, promise) {
  try {
    await promise;
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message.split('\n')[0]}`);
  }
}

async function run() {
  const host = (process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080').split(':');
  const env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(RULES_PATH, 'utf8'),
      host: host[0],
      port: Number(host[1] || 8080),
    },
  });

  // ── Дүрүүд ──────────────────────────────────────────────────────────
  const employeeUid = 'emp-1';       // жирийн ажилтан
  const tmsStaffUid = 'emp-tms';     // tmsAccess ажилтан
  const customerUid = 'cust-user-1'; // захиалагчийн апп хэрэглэгч
  const otherCustomerUid = 'cust-user-2';
  const driverUid = 'drv-auth-1';    // жолоочийн апп хэрэглэгч

  const employee = env.authenticatedContext(employeeUid);
  const tmsStaff = env.authenticatedContext(tmsStaffUid);
  const customer = env.authenticatedContext(customerUid, { role: 'customer' });
  const otherCustomer = env.authenticatedContext(otherCustomerUid, { role: 'customer' });
  const driver = env.authenticatedContext(driverUid, { role: 'driver', driverId: 'drv-1' });

  // Firestore instance-ийг контекст бүрд НЭГ л удаа үүсгэнэ (settings давхардлын алдаанаас сэргийлнэ)
  const employeeDb = employee.firestore();
  const tmsStaffDb = tmsStaff.firestore();
  const customerDb = customer.firestore();
  const otherCustomerDb = otherCustomer.firestore();
  const driverDb = driver.firestore();

  // ── Seed ────────────────────────────────────────────────────────────
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.collection('employees').doc(employeeUid).set({ role: 'employee' });
    await db.collection('employees').doc(tmsStaffUid).set({ role: 'employee', tmsAccess: true });
    await db.collection('positionLevels').doc('lvl-1').set({ name: 'Түвшин 1' });
    await db.collection('tms_contracts').doc('c-1').set({ code: 'CT001', customerPrice: 999 });
    await db.collection('tms_customers').doc('tc-1').set({ name: 'Байгууллага А' });
    await db.collection('crm_deals').doc('d-1').set({ name: 'Deal', amount: 5 });
    await db.collection('customer_users').doc(customerUid).set({
      phone: '+97699112233', displayName: 'Зочин', linkStatus: 'none', status: 'active',
    });
    await db.collection('mp_orders').doc('mp-1').set({
      code: 'MP00001', createdByUid: customerUid, status: 'quoted', version: 2,
      customerName: 'Зочин', loadingAddress: 'УБ', unloadingAddress: 'Дархан',
    });
    await db.collection('mp_orders').doc('mp-1').collection('quotes').doc('q-1').set({
      offerId: 'o-1', customerAmount: 1200000, status: 'active', driverLabel: 'Жолооч А (4.8★)',
    });
    await db.collection('mp_orders').doc('mp-1').collection('offers').doc('o-1').set({
      driverId: 'drv-1', driverAmount: 1000000, status: 'published',
    });
    await db.collection('mp_orders').doc('mp-2').set({
      code: 'MP00002', createdByUid: otherCustomerUid, status: 'submitted', version: 1,
    });
  });

  console.log('\n1. Ажилтан — өмнөх эрхүүд хэвээр байх ёстой:');
  await check('ажилтан catch-all reference унших (positionLevels)',
    assertSucceeds(employeeDb.collection('positionLevels').doc('lvl-1').get()));
  await check('ажилтан өөр ажилтны doc унших',
    assertSucceeds(employeeDb.collection('employees').doc(tmsStaffUid).get()));
  await check('tmsAccess ажилтан tms_contracts унших',
    assertSucceeds(tmsStaffDb.collection('tms_contracts').doc('c-1').get()));
  await check('tmsAccess ажилтан mp_orders унших',
    assertSucceeds(tmsStaffDb.collection('mp_orders').doc('mp-1').get()));
  await check('tmsAccess ажилтан offers унших (driverAmount staff-д харагдана)',
    assertSucceeds(tmsStaffDb.collection('mp_orders').doc('mp-1').collection('offers').doc('o-1').get()));
  await check('tmsAccess ажилтан customer_users унших',
    assertSucceeds(tmsStaffDb.collection('customer_users').doc(customerUid).get()));

  console.log('\n2. Захиалагч — дотоод өгөгдөл ХААЛТТАЙ байх ёстой:');
  await check('захиалагч tms_contracts (үнэ!) уншиж чадахгүй',
    assertFails(customerDb.collection('tms_contracts').doc('c-1').get()));
  await check('захиалагч employees уншиж чадахгүй',
    assertFails(customerDb.collection('employees').doc(employeeUid).get()));
  await check('захиалагч tms_customers уншиж чадахгүй',
    assertFails(customerDb.collection('tms_customers').doc('tc-1').get()));
  await check('захиалагч crm_deals уншиж чадахгүй',
    assertFails(customerDb.collection('crm_deals').doc('d-1').get()));
  await check('захиалагч catch-all reference уншиж чадахгүй',
    assertFails(customerDb.collection('positionLevels').doc('lvl-1').get()));

  console.log('\n3. Захиалагч — эрх ахиулалт хаалттай:');
  await check('захиалагч өөртөө admin employees doc үүсгэж чадахгүй',
    assertFails(customerDb.collection('employees').doc(customerUid).set({ role: 'admin' })));
  await check('захиалагч employees subcollection-д бичиж чадахгүй',
    assertFails(customerDb.collection('employees').doc(customerUid)
      .collection('notes').doc('n1').set({ x: 1 })));

  console.log('\n4. Захиалагч — marketplace эрхүүд:');
  await check('захиалагч өөрийн customer_users doc унших',
    assertSucceeds(customerDb.collection('customer_users').doc(customerUid).get()));
  await check('захиалагч бусдын customer_users уншиж чадахгүй',
    assertFails(otherCustomerDb.collection('customer_users').doc(customerUid).get()));
  await check('захиалагч өөрийн mp_order унших',
    assertSucceeds(customerDb.collection('mp_orders').doc('mp-1').get()));
  await check('захиалагч бусдын mp_order уншиж чадахгүй',
    assertFails(customerDb.collection('mp_orders').doc('mp-2').get()));
  await check('захиалагч өөрийн order-ын quotes унших',
    assertSucceeds(customerDb.collection('mp_orders').doc('mp-1').collection('quotes').doc('q-1').get()));
  await check('захиалагч offers (driverAmount!) уншиж чадахгүй',
    assertFails(customerDb.collection('mp_orders').doc('mp-1').collection('offers').doc('o-1').get()));
  await check('захиалагч mp_orders руу шууд бичиж чадахгүй (API-only)',
    assertFails(customerDb.collection('mp_orders').doc('mp-new').set({ createdByUid: customerUid })));
  await check('захиалагч өөрийн customer_users doc-оо шууд засаж чадахгүй (API-only)',
    assertFails(customerDb.collection('customer_users').doc(customerUid).update({ displayName: 'X' })));
  await check('захиалагч mp_idempotency уншиж чадахгүй',
    assertFails(customerDb.collection('mp_idempotency').doc('k1').get()));

  console.log('\n5. Жолооч:');
  await check('жолооч өөрийн offer унших',
    assertSucceeds(driverDb.collection('mp_orders').doc('mp-1').collection('offers').doc('o-1').get()));
  await check('жолооч quotes (customerAmount!) уншиж чадахгүй',
    assertFails(driverDb.collection('mp_orders').doc('mp-1').collection('quotes').doc('q-1').get()));
  await check('жолооч mp_orders үндсэн doc уншиж чадахгүй (одоогоор хэрэггүй)',
    assertFails(driverDb.collection('mp_orders').doc('mp-1').get()));
  await check('жолооч tms_contracts уншиж чадахгүй',
    assertFails(driverDb.collection('tms_contracts').doc('c-1').get()));
  await check('жолооч catch-all reference уншиж чадахгүй',
    assertFails(driverDb.collection('positionLevels').doc('lvl-1').get()));

  await env.cleanup();

  console.log(`\n${passed} амжилттай, ${failed} алдаатай.`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Тест ажиллуулахад алдаа:', e);
  process.exit(1);
});
