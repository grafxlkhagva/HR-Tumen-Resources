/**
 * Marketplace (захиалагчийн апп) — Firestore схемийн төрлүүд.
 *
 * Үнийн ханын зарчим (ХАТУУ ДҮРЭМ):
 *   - `MpOrder` болон `MpQuote` дээр driverPrice/driverAmount/margin ОГТ БАЙХГҮЙ —
 *     захиалагч эдгээр doc-уудыг шууд уншсан ч үнийн мэдээлэл задрахгүй.
 *   - `MpOffer` (жолоочийн түүхий санал, driverAmount-тай) нь staff болон тухайн
 *     жолоочид л харагдана; захиалагчид ХЭЗЭЭ Ч серверээс буцаахгүй.
 *
 * Firestore талбарууд camelCase (одоогийн систем-ийн конвенц),
 * API JSON snake_case (driver app-ын конвенц) — хөрвүүлэлтийг
 * src/lib/mobile-api/serializers.ts хийнэ.
 */

import type { Timestamp } from 'firebase/firestore';

/** Firestore Admin/Client SDK-ийн Timestamp хоёулаа таарна */
type Ts = Timestamp | { seconds: number; nanoseconds: number } | Date | string;

// ─── customer_users/{uid} ────────────────────────────────────────────────

export type CustomerAccountType = 'personal' | 'business';
export type CustomerLinkStatus = 'none' | 'pending' | 'linked' | 'rejected';
export type CustomerUserStatus = 'active' | 'blocked';

export interface CustomerUserDevice {
    platform: 'android' | 'ios';
    appVersion?: string;
    updatedAt: Ts;
}

export interface CustomerUser {
    id: string; // == Firebase Auth UID
    phone: string; // E.164, серверээс token-оос хуулна — өөрчлөгдөхгүй
    displayName: string | null;
    email: string | null;
    /** ААН регистр / хувь хүний РД — НӨАТ нэхэмжлэлд */
    registerNumber: string | null;
    accountType: CustomerAccountType;
    /** tms_customers doc id — staff холбосны дараа */
    customerId: string | null;
    customerName: string | null;
    linkStatus: CustomerLinkStatus;
    linkRequest: { registerNumber: string; requestedAt: Ts } | null;
    status: CustomerUserStatus;
    /** token -> device info map (хамгийн ихдээ ~10) */
    fcmTokens: Record<string, CustomerUserDevice>;
    createdAt: Ts;
    updatedAt: Ts;
    lastSeenAt: Ts;
}

// ─── mp_orders/{orderId} ─────────────────────────────────────────────────

export type MpOrderStatus =
    | 'submitted' // Илгээсэн — захиалагч апп-аас үүсгэсэн
    | 'reviewing' // Хянаж байгаа — диспетчер авсан
    | 'sourcing' // Жолооч хайж байна
    | 'quoted' // Үнийн санал ирсэн — захиалагчид үзүүлсэн
    | 'accepted' // Баталгаажсан — захиалагч quote сонгосон
    | 'active' // Идэвхтэй — TM үүссэн, тээвэр явж байна
    | 'completed' // Дууссан
    | 'cancelled'; // Цуцлагдсан

/** Статусын монгол нэршил — TM_STATUS_MAP-тай давхцах хэсэгт ижил үг хэрэглэнэ */
export const MP_ORDER_STATUS_MAP: Record<MpOrderStatus, string> = {
    submitted: 'Илгээсэн',
    reviewing: 'Хянаж байгаа',
    sourcing: 'Жолооч хайж байна',
    quoted: 'Үнийн санал ирсэн',
    accepted: 'Баталгаажсан',
    active: 'Идэвхтэй',
    completed: 'Дууссан',
    cancelled: 'Цуцлагдсан',
};

/** Захиалагч цуцлах боломжтой статусууд (accepted-с өмнө) */
export const MP_CUSTOMER_CANCELLABLE: MpOrderStatus[] = [
    'submitted',
    'reviewing',
    'sourcing',
    'quoted',
];

export interface MpCargo {
    id: string;
    name: string;
    quantity: number;
    unit: 'kg' | 'tons' | 'pcs' | 'liters' | 'm3';
    packagingTypeId?: string | null;
    note?: string | null;
}

export interface MpOrderStatusHistoryEntry {
    status: MpOrderStatus;
    at: Ts;
    byUid: string;
}

export interface MpOrder {
    id: string;
    /** 'MP00001' — tms_settings/global marketplaceCode* counter */
    code: string;
    /** Материаллаг өөрчлөлт бүрд +1; quote accept үед шалгагдана */
    version: number;
    status: MpOrderStatus;
    /** == customer_users uid — rules-ийн түлхүүр талбар */
    createdByUid: string;
    /** tms_customers id (холбогдсон орг ЭСВЭЛ B2C-д accept үед lazy үүсгэсэн) */
    customerId: string | null;
    customerName: string;
    contactName: string;
    contactPhone: string;
    // Чиглэл — захиалагч чөлөөт хаяг өгнө; оффис review үед region/warehouse normalize хийнэ
    loadingRegionId: string | null;
    loadingRegionName: string | null;
    loadingAddress: string;
    unloadingRegionId: string | null;
    unloadingRegionName: string | null;
    unloadingAddress: string;
    loadingDate: string | null; // ISO — TM конвенцтой ижил
    unloadingDate: string | null;
    totalDistanceKm: number | null; // оффис тавина
    cargos: MpCargo[];
    vehicleTypeId: string | null;
    vehicleTypeName: string | null;
    trailerTypeId: string | null;
    trailerTypeName: string | null;
    serviceTypeId: string | null;
    note: string | null;
    offerDeadline: Ts | null;
    // Accept-ийн үр дүн — ЗӨВХӨН захиалагчийн үнэ
    acceptedQuoteId: string | null;
    customerPrice: number | null; // = accepted quote customerAmount (бүхэл ₮)
    hasVat: boolean;
    // Оноолтын projection — захиалагч tms_drivers/tms_vehicles уншихгүйгээр харна
    assignedDriverName: string | null;
    assignedDriverPhone: string | null;
    assignedVehiclePlate: string | null;
    assignedVehicleTypeName: string | null;
    // TM холбоос
    tmId: string | null;
    tmCode: string | null;
    // Үнэлгээ ба нэхэмжлэл
    rating: { stars: number; comment: string | null; createdAt: Ts } | null;
    invoice: {
        amount: number;
        vatAmount: number;
        totalAmount: number;
        registerNumber: string | null;
        status: 'pending' | 'paid';
    } | null;
    statusHistory: MpOrderStatusHistoryEntry[];
    cancelReason: string | null;
    createdAt: Ts;
    updatedAt: Ts;
}

// ─── mp_orders/{orderId}/offers/{offerId} — ДОТООД (staff + жолооч) ──────

export type MpOfferStatus = 'pending' | 'published' | 'accepted' | 'rejected' | 'withdrawn';

export interface MpOffer {
    id: string;
    driverId: string; // tms_drivers doc id
    driverName: string;
    driverPhone: string;
    vehicleId: string | null;
    plateNo: string | null;
    vehicleTypeId: string | null;
    /** Жолоочийн санал — захиалагчид ХЭЗЭЭ Ч илгээхгүй */
    driverAmount: number;
    note: string | null;
    source: 'staff' | 'driver_app';
    status: MpOfferStatus;
    /** Markup хийгдэж publish болсон үед quote doc-ийн id */
    quoteId: string | null;
    createdAt: Ts;
    createdByUid: string;
}

// ─── mp_orders/{orderId}/quotes/{quoteId} — ЗАХИАЛАГЧИД харагдана ────────

export type MpQuoteStatus = 'active' | 'accepted' | 'expired' | 'withdrawn';

export interface MpQuote {
    id: string;
    /** Дотоод offer-ийн лавлагаа — захиалагчид утга нь нууц биш (зөвхөн id) */
    offerId: string;
    /** driverAmount + margin — margin өөрөө ХААНА Ч хадгалагдахгүй энэ doc дээр */
    customerAmount: number;
    hasVat: boolean;
    vehicleTypeName: string | null;
    trailerTypeName: string | null;
    /** Нэрээ нууцалсан танилцуулга: "Жолооч А (4.8★, 120 рейс)" */
    driverLabel: string;
    validUntil: Ts | null;
    status: MpQuoteStatus;
    createdAt: Ts;
}

// ─── mp_driver_ratings/{autoId} ──────────────────────────────────────────

export interface MpDriverRating {
    id: string;
    orderId: string;
    tmId: string | null;
    driverId: string;
    customerUserId: string;
    stars: number; // 1-5
    comment: string | null;
    createdAt: Ts;
}
