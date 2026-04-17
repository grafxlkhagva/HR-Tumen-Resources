/**
 * TMS Transport Management Firestore rules-ийг emulator-д туршина.
 *
 * Урьдчилсан нөхцөл:
 *   1. `firebase emulators:start --only firestore,storage` ажиллаж байх.
 *   2. `npm i -D @firebase/rules-unit-testing` (эсвэл dev dep-д суулгах).
 *
 * Хэрэглээ:
 *   FIRESTORE_EMULATOR_HOST=localhost:8080 node scripts/test-tm-rules.js
 */

const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'tm-rules-test';
const RULES_PATH = path.resolve(__dirname, '..', 'firestore.rules');

async function run() {
  const env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(RULES_PATH, 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });

  // Test user setup — tmsAccess: true тэмдэглэгээтэй "employee"
  const uid = 'test-user';
  const adminCtx = env.authenticatedContext(uid);

  // Seed emulator: employees/{uid} баримт tmsAccess-тай.
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().collection('employees').doc(uid).set({
      role: 'employee',
      tmsAccess: true,
    });
    await ctx.firestore().collection('tms_transport_management').doc('seed-tm').set({
      customerId: 'cust-1',
      status: 'planning',
      isContracted: true,
      driverPrice: 1000,
      customerPrice: 1500,
    });
  });

  const tmRef = adminCtx.firestore().collection('tms_transport_management').doc('seed-tm');
  const newRef = adminCtx.firestore().collection('tms_transport_management').doc('new-tm');

  const validBase = {
    customerId: 'cust-1',
    status: 'planning',
    isContracted: false,
  };

  console.log('▶ Running TM rules test suite...');

  // ✅ Хүчинтэй create
  await assertSucceeds(newRef.set(validBase));
  console.log('  ✅ valid create accepted');

  // ❌ Сөрөг driverPrice
  await assertFails(tmRef.update({ driverPrice: -500 }));
  console.log('  ✅ negative driverPrice rejected');

  // ❌ Сөрөг customerPrice
  await assertFails(tmRef.update({ customerPrice: -100 }));
  console.log('  ✅ negative customerPrice rejected');

  // ❌ Буруу status
  await assertFails(tmRef.update({ status: 'HACKED' }));
  console.log('  ✅ invalid status rejected');

  // ❌ Хэт том subTransports массив (200+)
  const bigArr = new Array(201).fill({ id: 'x', subCode: '1' });
  await assertFails(tmRef.update({ subTransports: bigArr }));
  console.log('  ✅ oversized subTransports array rejected');

  // ❌ Хэт том financeTransactions (500+)
  const bigFinance = new Array(501).fill({ id: 'x', type: 'receivable', amount: 0, paidAmount: 0 });
  await assertFails(tmRef.update({ financeTransactions: bigFinance }));
  console.log('  ✅ oversized financeTransactions array rejected');

  // ❌ customerId-г солих оролдлого (update үед resource.customerId == same шалгуур)
  await assertFails(tmRef.update({ customerId: 'different-cust' }));
  console.log('  ✅ customerId mutation rejected');

  // ✅ Хүчинтэй update (price-уудыг засвал)
  await assertSucceeds(tmRef.update({ driverPrice: 2000, customerPrice: 2500 }));
  console.log('  ✅ valid price update accepted');

  // ✅ contractServiceIds массив
  await assertSucceeds(tmRef.update({ contractServiceIds: ['svc-1', 'svc-2'] }));
  console.log('  ✅ contractServiceIds list accepted');

  await env.cleanup();
  console.log('');
  console.log('✔ All rules tests passed.');
}

run().catch((err) => {
  console.error('❌ Rules test failed:', err);
  process.exit(1);
});
