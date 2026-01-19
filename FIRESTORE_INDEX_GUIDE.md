# Firestore Index үүсгэх заавар

## Шуурхай шийдэл:

### Арга 1: Автомат холбоос ашиглах (Хамгийн хялбар)
1. Mobile апп дээр улаан хайрцагт байгаа "Index үүсгэх холбоос" дээр дарна уу
2. Firebase Console нээгдэнэ
3. "Create Index" товч дарна уу
4. 2-5 минут хүлээнэ үү (index бэлэн болтол)
5. Mobile аппыг refresh хийнэ үү

### Арга 2: Гараар үүсгэх
1. Firebase Console руу очно уу: https://console.firebase.google.com
2. Төслөө сонгоно уу
3. Зүүн цэснээс "Firestore Database" сонгоно уу
4. Дээд хэсгээс "Indexes" таб руу очно уу
5. "Create Index" товч дарна уу
6. Дараах мэдээллийг оруулна уу:
   - Collection ID: `er_documents`
   - Fields to index:
     * Field: `reviewers` | Type: `Array-contains-any`
     * Field: `status` | Type: `Ascending`
     * Field: `updatedAt` | Type: `Descending`
   - Query scope: `Collection`
7. "Create" дарна уу

## Index бэлэн болсныг хэрхэн мэдэх вэ?

Firebase Console дээр Indexes хэсэгт очоод:
- Статус нь "Building" байвал хүлээнэ үү
- Статус нь "Enabled" болвол бэлэн болсон гэсэн үг

Ихэвчлэн 2-5 минут орчим хугацаа шаардагдана.

## Index бэлэн болсны дараа:

1. Mobile аппыг refresh хийнэ үү (эсвэл хуудсыг дахин ачаална уу)
2. Улаан алдааны мэдээлэл алга болж, баримт харагдах ёстой
3. Debug Info хэсэгт "Documents found: 1" (эсвэл илүү) гэж харагдана

## Яагаад энэ асуудал гарсан бэ?

Firestore-д `array-contains-any` болон бусад талбарууд дээр хамтад нь шүүлт хийхэд заавал index шаардлагатай. Энэ нь өгөгдлийн санг хурдан болгодог.

Бид `reviewers` массив дээр `array-contains-any` ашиглаж, мөн `status` болон `updatedAt` дээр шүүлт хийж байгаа учраас composite index шаардлагатай болсон.
