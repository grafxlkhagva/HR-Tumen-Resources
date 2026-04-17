# Firebase budget alerts + doc-size monitor

## 1. Firestore / Storage бюджет

Firebase Console → Settings → Usage and billing → Budgets & alerts.

### Санал болгож буй дүрмүүд

| Нэр | Scope | Threshold | Channel |
|---|---|---|---|
| TM read spike | Firestore read/day | 500,000 | Email |
| TM write spike | Firestore write/day | 50,000 | Email + Slack |
| Storage bandwidth | Storage GB down/day | 5 GB | Email |
| Monthly spend | All | 80% of budget | Email (owner) |

### Set up
1. Billing account нь тухайн Firebase project-тай холбогдсон эсэхийг шалгах.
2. Budget үүсгэх: GCP Console → Billing → Budgets & alerts → Create budget.
3. Scope: `service = Cloud Firestore / Firebase Hosting / Cloud Storage`.
4. Notification: email addresses + Pub/Sub topic (хүсвэл Slack webhook).

## 2. Doc-size хяналтын weekly cron

```bash
# Cron entry (ops сервер эсвэл GitHub Action):
0 9 * * 1  node /opt/tumen/scripts/monitor-tm-doc-size.js /opt/tumen/key.json --warn=600 --crit=850
```

Гаралтыг PM slack-д post хийх (скрипт дотор Slack webhook call нэмж болно — template хэсэгт comment-аар заасан).

## 3. Cloud Function нэмэх (optional)

`monitor-tm-doc-size.js`-ийн доод хэсэгт заагдсан SKETCH-ийг хэрэгжүүлэхэд:

```js
// functions/src/tm-doc-size-monitor.ts
export const tmDocSizeMonitor = functions.firestore
  .document('tms_transport_management/{id}')
  .onWrite(async (change) => {
    const bytes = Buffer.byteLength(JSON.stringify(change.after.data() || {}), 'utf8');
    if (bytes >= 900 * 1024) {
      await sendSlackAlert(`🚨 TM ${change.after.id} size: ${(bytes/1024).toFixed(0)}KB`);
    }
  });
```

Write бүр дээр онгойж real-time alert хийнэ.
