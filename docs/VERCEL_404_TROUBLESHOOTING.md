# Vercel дээр 404 NOT_FOUND алдаа — шалгах зүйлс

Deploy хийсний дараа "404: NOT_FOUND" гарвал доороос шалгана.

## 1. Vercel Project Settings

**Dashboard → Төсөл → Settings → General**

| Тохиргоо | Хүлээгдэх утга |
|----------|-----------------|
| **Framework Preset** | **Next.js** |
| **Root Directory** | Хоосон (эсвэл `.`) — төслийн root заахгүй |
| **Build Command** | `npm run build` (default) |
| **Output Directory** | Заавал бүү өг — Next.js-д Vercel өөрөө тохируулна |
| **Install Command** | `npm install` |

Хэрэв Root Directory дээр дэд хавтас (жишээ: `app`, `frontend`) сонгосон бол буцааж **хоосон** болгоно.

## 2. Build амжилттай эсэх

**Deployments** таб → Сүүлийн deployment дарж **Build Logs** нээнэ.

- **Building** хэсэг **Error**-оор дуусаагүй байх ёстой.
- "Build Completed" гэж гарсан эсэхийг шалгана.
- Build алдаатай бол лог дээрх error-ийг засаад дахин push/redeploy хийнэ.

## 3. Ямар URL дээр нээж байгаа вэ

- **Production**: Domains таб дээрх Production domain (жишээ: `xxx.vercel.app`) руу ороод шалгана.
- **Preview**: Branch/PR-ийн preview URL нь тэр branch-ийн build-ээс ирнэ. `main`-аас deploy хийсэн бол Production URL ашиглана.
- Custom domain холбосон бол DNS (CNAME) зөв заасан эсэхийг шалгана.

## 4. Favicon 404

`src/app/favicon.ico` байгаа бол Next.js build-д орно. Үндсэн 404 засагдсаны дараа favicon ихэвчлэн зөв ачаалагдана. Одоо гол нь нүүр хуудас (/) 404 биш болгох явдал.

## 5. CSP "blocks eval" алдаа

Console дээр "Content Security Policy ... blocks the use of 'eval'" гарч болно.

- Зарим нь **браузер extension** эсвэл **Chrome DevTools**-аас ирдэг — Incognito эсвэл extension унтрааж дахин туршина.
- Үнэхээр талын кодын алдаа бол **next.config.ts** дотор `headers` нэмж CSP зориулалтаар `'unsafe-eval'` зөвшөөрч болно — нууцлалд анхаарна.

---

**Дүгнэлт:** Ихэвчлэн **Root Directory** буруу эсвэл **Framework Preset** нь Next.js биш байхад 404 гардаг. Эхлээд 1–2-ыг засаад **Redeploy** хийнэ.
