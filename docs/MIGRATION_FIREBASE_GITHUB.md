# Шинэ Firebase болон шинэ GitHub руу шилжих алхмууд

Төсөл шинэ Firebase төсөл, шинэ GitHub репозитори руу шилжихэд **таны гараар хийх** үйлдлүүд. Дэлгэрэнгүй төлөвлөгөө: `.cursor/plans/` эсвэл `firebase_github_migration` төлөвлөгөөний файл.

## Хийгдсэн өөрчлөлтүүд (код)

- **`src/firebase/config.ts`** — Firebase тохиргоо одоо `process.env.NEXT_PUBLIC_FIREBASE_*`-аас уншигдана. Шинэ төсөлд шилжихэд зөвхөн env-ийг шинэчлэхэд хангалттай.

## Таны хийх үйлдлүүд

### 1. Шинэ Firebase config болон GitHub URL бэлэн болгох

- 1.1 – 1.2: Firebase Console-оос шинэ төсөл үүсгэж, Auth/Firestore/Storage идэвхжүүлж, Web app нэмж **config** хуулна. GitHub-д шинэ репозитори үүсгэж **clone URL**-аа тэмдэглэнэ.

### 2. Локал env тохируулах

Шинэ төслийн утгуудыг **`.env.local`** дээр тохируулна:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY="<шинэ apiKey>"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="<шинэ>.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="<шинэ projectId>"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="<шинэ>.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="<шинэ messagingSenderId>"
NEXT_PUBLIC_FIREBASE_APP_ID="<шинэ appId>"
# заавал биш:
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="<шинэ measurementId>"
```

### 3. Firebase CLI — default төсөл солих (.firebaserc)

Терминалд шинэ төслийг default болгоно (энэ нь **`.firebaserc`**-ийг шинэ `projectId`-аар шинэчилнэ):

```bash
firebase login
firebase use <ШИНЭ_PROJECT_ID>
```

`<ШИНЭ_PROJECT_ID>` — Firebase Console-оос авсан `projectId`.

### 4. Git — шинэ GitHub руу түлхэх

Remote-ийг шинэ репозитори руу зааж, салбараа түлхэнэ:

```bash
git remote set-url origin <ШИНЭ_GITHUB_URL>
git push -u origin main
```

Жишээ: `https://github.com/USERNAME/REPO.git` эсвэл `git@github.com:USERNAME/REPO.git`.

### 5. Firestore rules болон indexes deploy

Шинэ төсөл дээр rules/indexes тавина:

```bash
firebase deploy
```

(Энд firebase.json-д заасан Firestore rules, firestore.indexes.json-ийг deploy хийнэ.)

### 6. Vercel (ашигладаг бол)

- Vercel Dashboard → төсөл → **Settings → Git** → хуучин холболтыг салгаад шинэ GitHub репозитори холбоно.
- **Settings → Environment Variables** дээр дээрх `NEXT_PUBLIC_FIREBASE_*` бүхий утгуудыг шинэ Firebase-ийнхээр нэмж/шинэчилнэ.

---

## Шалгах

- Локал: `npm run dev` → нэвтрэх, Firestore/Storage ажиллаж байгаа эсэх.
- GitHub: шинэ репозитори дээр `main` (эсвэл ашигласан салбар) түлхэгдсэн эсэх.
- `firebase deploy` дараа шинэ төсөл дээр Firestore rules/indexes орсон эсэх.
- Vercel deploy хийгдээд шинэ Firebase руу холбогдсон эсэхийг нэг дахин шалгах.
