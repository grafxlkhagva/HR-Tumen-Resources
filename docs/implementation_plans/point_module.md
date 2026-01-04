# Хүний Нөөцийн Point Module - Хөгжүүлэлтийн Төлөвлөгөө

Энэхүү баримт бичиг нь "Point Module" буюу байгууллагын соёл, урамшууллын системийг хөгжүүлэх дэлгэрэнгүй төлөвлөгөө юм.

## 1. Архитектур ба Өгөгдлийн Бүтэц (Database Schema)

Бид Firebase Firestore ашиглах ба дараах үндсэн collection-уудыг үүсгэнэ.

### 1.1 Collections
*   **`company/branding/values`**: Байгууллагын үнэт зүйлс (Жишээ нь: "Innovation", "Teamwork").
    *   `id`, `title`, `description`, `icon`, `color`, `isActive`
*   **`recognition_posts`**: Ажилтнуудын бие биедээ өгсөн оноо, талархал (Feed).
    *   `id`, `fromUserId`, `toUserId` (array or string), `pointAmount`, `valueId`, `message`, `createdAt`, `reactions`, `visibility`
*   **`point_transactions`**: Санхүүгийн гүйлгээ шиг онооны түүх (ledger).
    *   `id`, `userId`, `amount` (+/-), `type` (received, given, redeemed, penalty), `refId` (link to post or redemption), `createdAt`
*   **`rewards`**: Шагналын дэлгүүрийн бараанууд.
    *   `id`, `title`, `description`, `cost`, `stock`, `imageUrl`, `isActive`, `category`
*   **`redemption_requests`**: Шагнал авах хүсэлтүүд.
    *   `id`, `userId`, `rewardId`, `cost`, `status` (pending, approved, rejected, delivered), `createdAt`, `history` (status changes)
*   **`point_balances`** (эсвэл `employees/id/point_profile`): Хэрэглэгчийн баланс.
    *   `totalEarned`, `currentBalance`, `totalGiven`, `monthlyAllowanceLeft`

## 2. Хөгжүүлэлтийн Үе Шатууд (Phases)

### Phase 1: Суурь Бүтэц & Admin Settings (Foundation)
*   **Зорилго**: Өгөгдлийн загварыг бэлдэх, үнэт зүйлсээ оруулах.
*   ** ажлууд**:
    1.  `src/types/points.ts` - TypeScript interface-уудыг тодорхойлох.
    2.  `src/firebase/points-service.ts` - Firestore-тэй харьцах суурь функцууд.
    3.  **Admin UI**: Үнэт зүйлс (Core Values) нэмэх, засах дэлгэц.
    4.  **Admin UI**: Онооны дүрэм тохируулах (сард хэдэн оноо өгөх эрхтэй гэх мэт).

### Phase 2: Peer-to-Peer Recognition (The Core)
*   **Зорилго**: Ажилтнууд бие биедээ оноо өгөх, feed дээр харах.
*   **Ажлууд**:
    1.  **"Give Points" Modal**: Хүн сонгох -> Үнэт зүйл сонгох -> Тайлбар бичих -> Илгээх.
    2.  **Transaction Logic**: `runTransaction` ашиглан найдвартай оноо шилжүүлэх (Sender allowance хасах -> Receiver balance нэмэх -> Post үүсгэх).
    3.  **Feed Component**: Нийтлэгдсэн талархлуудыг харах, like дарах.
    4.  **My Dashboard**: Өөрийн онооны үлдэгдэл, авсан түүхээ харах.

### Phase 3: Reward Store (Redemption)
*   **Зорилго**: Цуглуулсан оноогоо бодит зүйл болгох.
*   **Ажлууд**:
    1.  **Store UI**: Шагналуудыг жагсааж харуулах (Filter, Categories).
    2.  **Redeem Logic**: Сагсанд хийх эсвэл шууд авах -> Баланс шалгах -> Хүсэлт үүсгэх.
    3.  **Admin Fulfillment**: HR админ хүсэлтүүдийг харж "Approved/Delivered" болгох.

### Phase 4: Analytics & Insights (Culture Management)
*   **Зорилго**: Соёлыг хэмжих.
*   **Ажлууд**:
    1.  **Leaderboard**: Идэвхтэй ажилтнууд.
    2.  **Value Heatmap**: Аль үнэт зүйл хамгийн их яригдаж байна вэ?
    3.  **Manager View**: Багийнхаа идэвхийг харах.

## 3. UI/UX Төлөвлөлт (Folder Structure)

`src/app/dashboard/culture/` фолдер дотор:

*   `page.tsx` - Main Feed & Quick Stats
*   `my-points/page.tsx` - Personal History & Wallet
*   `store/page.tsx` - Reward Catalog
*   `admin/page.tsx` - Configuration (HR only)

## 4. Эхний Алхам
Бид **Phase 1**-ээс эхэлнэ. Эхлээд TypeScript төрлүүдээ зарлаж, Админы тохиргооны хэсгийг хийнэ.
