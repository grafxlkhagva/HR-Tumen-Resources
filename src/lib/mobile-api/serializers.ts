/**
 * Mobile API serializers — camelCase Firestore → snake_case JSON.
 *
 * ХАТУУ ДҮРЭМ: бүх projection ALLOWLIST — талбар бүрийг гараар зааж өгнө,
 * object spread (...) ХЭЗЭЭ Ч хэрэглэхгүй. Ингэснээр Firestore doc-д шинэ
 * (магадгүй нууц) талбар нэмэгдсэн ч API хариу руу автоматаар "гоождоггүй".
 *
 * Захиалагчийн payload-д driver_price / driverAmount / margin / profitMargin
 * ХЭЗЭЭ Ч ГАРАХГҮЙ — scripts/test-serializers.test.ts үүнийг баталгаажуулна.
 */

import { Timestamp } from 'firebase-admin/firestore';
import type { CustomerUser, MpOrder, MpQuote } from '@/types/marketplace';

/** Firestore Timestamp / Date / string → ISO8601 string | null */
export function toIso(v: unknown): string | null {
    if (v == null) return null;
    if (v instanceof Timestamp) return v.toDate().toISOString();
    if (v instanceof Date) return v.toISOString();
    if (typeof v === 'string') return v;
    if (typeof v === 'object' && v !== null && 'seconds' in v) {
        const s = v as { seconds: number; nanoseconds?: number };
        return new Date(s.seconds * 1000).toISOString();
    }
    return null;
}

// ─── Захиалагчийн профайл ────────────────────────────────────────────────

export function serializeCustomerProfile(p: CustomerUser & { id: string }) {
    return {
        id: p.id,
        phone: p.phone ?? null,
        display_name: p.displayName ?? null,
        email: p.email ?? null,
        register_number: p.registerNumber ?? null,
        account_type: p.accountType ?? 'personal',
        link_status: p.linkStatus ?? 'none',
        company: p.customerId
            ? { id: p.customerId, name: p.customerName ?? null }
            : null,
        status: p.status ?? 'active',
        created_at: toIso(p.createdAt),
    };
}

// ─── Захиалга (захиалагчид харагдах projection) ──────────────────────────

function serializeCargo(c: MpOrder['cargos'][number]) {
    return {
        id: c.id,
        name: c.name,
        quantity: c.quantity,
        unit: c.unit,
        packaging_type_id: c.packagingTypeId ?? null,
        note: c.note ?? null,
    };
}

/** Жагсаалтын хураангуй хувилбар */
export function serializeOrderSummary(o: MpOrder & { id: string }) {
    return {
        id: o.id,
        code: o.code,
        version: o.version,
        status: o.status,
        loading_region_name: o.loadingRegionName ?? null,
        loading_address: o.loadingAddress ?? null,
        unloading_region_name: o.unloadingRegionName ?? null,
        unloading_address: o.unloadingAddress ?? null,
        loading_date: o.loadingDate ?? null,
        unloading_date: o.unloadingDate ?? null,
        vehicle_type_name: o.vehicleTypeName ?? null,
        customer_price: o.customerPrice ?? null,
        has_vat: o.hasVat ?? false,
        created_at: toIso(o.createdAt),
        updated_at: toIso(o.updatedAt),
    };
}

/** Дэлгэрэнгүй хувилбар — жагсаалтын талбарууд + бүх дэлгэрэнгүй */
export function serializeOrderDetail(o: MpOrder & { id: string }) {
    return {
        ...serializeOrderSummary(o), // өөрийн allowlist-ийн spread — Firestore doc-ийн биш
        loading_region_id: o.loadingRegionId ?? null,
        unloading_region_id: o.unloadingRegionId ?? null,
        total_distance_km: o.totalDistanceKm ?? null,
        cargos: (o.cargos ?? []).map(serializeCargo),
        vehicle_type_id: o.vehicleTypeId ?? null,
        trailer_type_id: o.trailerTypeId ?? null,
        trailer_type_name: o.trailerTypeName ?? null,
        note: o.note ?? null,
        offer_deadline: toIso(o.offerDeadline),
        accepted_quote_id: o.acceptedQuoteId ?? null,
        assigned_driver: o.assignedDriverName
            ? {
                  name: o.assignedDriverName,
                  phone: o.assignedDriverPhone ?? null,
                  vehicle_plate: o.assignedVehiclePlate ?? null,
                  vehicle_type_name: o.assignedVehicleTypeName ?? null,
              }
            : null,
        tm_code: o.tmCode ?? null,
        rating: o.rating
            ? { stars: o.rating.stars, comment: o.rating.comment ?? null }
            : null,
        invoice: o.invoice
            ? {
                  amount: o.invoice.amount,
                  vat_amount: o.invoice.vatAmount,
                  total_amount: o.invoice.totalAmount,
                  register_number: o.invoice.registerNumber ?? null,
                  status: o.invoice.status,
              }
            : null,
        cancel_reason: o.cancelReason ?? null,
        status_history: (o.statusHistory ?? []).map((h) => ({
            status: h.status,
            at: toIso(h.at),
        })),
    };
}

// ─── Үнийн санал (quote — захиалагчид харагдана) ─────────────────────────

export function serializeQuote(q: MpQuote & { id: string }) {
    return {
        id: q.id,
        customer_amount: q.customerAmount,
        has_vat: q.hasVat ?? false,
        vehicle_type_name: q.vehicleTypeName ?? null,
        trailer_type_name: q.trailerTypeName ?? null,
        driver_label: q.driverLabel,
        valid_until: toIso(q.validUntil),
        status: q.status,
        created_at: toIso(q.createdAt),
    };
}
