# financeTransactions subcollection migration план

Энэ баримт нь Phase 5.2 — `financeTransactions[]` массивийг subcollection руу
шилжүүлэх томоохон refactor-ийн дараалал юм. Scope-оос гадуур тул одоогоор
хэрэгжүүлэхгүй, харин 1MB doc-limit сэрэмжилсэн үед ашиглагдана.

## Яагаад?

- Одоо `financeTransactions` бол `tms_transport_management/{id}` баримтын
  доторх массив (embedded).
- Рубеж: **1MB / баримт** (Firestore hard limit).
- Том contract-тай TM-үүд (100+ гүйлгээ + зургийн URL + subTransports)
  нэг өдөрт 900KB хүрэх боломжтой.
- 1MB-г давсан үед **бүх write нам үл болдог** — хэрэглэгч алдаа харахгүй.

## Зорилтот бүтэц

```
tms_transport_management/{tmId}
├── financeTransactions?: FinanceTx[]            ← backward-compat legacy
└── finance_transactions (subcollection)          ← шинэ хаалт
    ├── {txId1}: { type, amount, paidAmount, ... }
    ├── {txId2}: ...
```

## 4 шатлалт roll-out

### Шат 1: Dual-read (read-from-both) — 1 sprint

1. `useFinanceTransactions(tmId)` гэсэн шинэ hook:
   - Subcollection-аас real-time subscribe.
   - Хоосон эсвэл alias үед parent doc-ийн `financeTransactions` array-аас уншиж нэмэх.
2. Finance page-д энэ hook-ийг ашиглах (parent doc-оос бус).
3. **Write логик өөрчлөгдөхгүй** — одоо байгаа код `financeTransactions` array-руу үргэлжлэн бичиж байна.

**Verification:** Хуучин TM-ийг нээхэд гүйлгээ харагдаж байх.

### Шат 2: Dual-write (write-to-both) — 1 sprint

1. `add-transaction-dialog` + `edit-transaction-dialog` + `executeDelete`:
   - **Эхлээд** subcollection-д write хийнэ.
   - **Дараа** parent array-д `arrayUnion`/`arrayRemove`-ээр ижил hash-тай өөрчлөлт хийнэ.
2. Read hook одоо subcollection-ийг авдаг тул UI-д зөвхөн subcollection data л харагдаж байна.
3. Write fail-ээс parent array орхиход хоёр хаалтын хооронд зөрүү гарахгүй (eventual consistency).

**Verification:** 2 хаалтанд ижил гүйлгээ байгааг спот шалгах script бэлдэх.

### Шат 3: Backfill + migrate — 1 цаг

```js
// scripts/migrate-finance-to-subcollection.js
for (const tmDoc of snapshot.docs) {
  const txs = tmDoc.data().financeTransactions || [];
  const subRef = tmDoc.ref.collection('finance_transactions');
  for (const tx of txs) {
    await subRef.doc(tx.id).set(tx, { merge: true });
  }
}
```

Хуучин хуудас хуучин array-аасаа уншиж байхын тулд энэ шатанд **parent array хэвээр үлдэнэ**.

### Шат 4: Parent array-ыг устгах — 1 sprint

1. Write код-оос `financeTransactions` парент mutation-ийг арилгах.
2. Read hook-ийн fallback-ийг арилгах (backward-compat no longer needed).
3. Backfill script-ийн 2-р бүлэг: parent-аас `financeTransactions: null` set.
4. Doc-size monitor-ээр 50%+ багассан эсэхийг баталгаажуулах.

## Тестийн стратеги

- **Integration test:** Firestore emulator дээр нэг TM үүсгэн:
  1. Parent array-д 1 tx сэргээх.
  2. Dual-read hook → parent-ээс л харагдах.
  3. Subcollection-д өөр 1 tx нэмэх.
  4. Dual-read → хоёр tx нэгдэж харагдах.
  5. Delete → зөв арилах.

## Risk

- **Read cost дараа давхар** (subscribe 2 чиглэл) — dual-read шатад түр өндөр.
- **Парент array-ийн ордерт** хайлт шаардагдсан бол `orderBy` query index нэмэх шаардлагатай.
- **1 TM дорх гүйлгээ 10,000+** бол pagination Firestore cursor ашиглана.

## Estimate

| Шат | Хугацаа | Deploy риск |
|---|---|---|
| 1. Dual-read | 3 өдөр | Бага |
| 2. Dual-write | 3 өдөр | Дунд |
| 3. Backfill | 1 цаг | Бага (read-only copy) |
| 4. Cleanup | 2 өдөр | Бага |

Нийт: **1.5-2 sprint.**

---

Bодитоор хэрэгжүүлэх үеэр энэ баримтыг checklist болгон ашигла.
