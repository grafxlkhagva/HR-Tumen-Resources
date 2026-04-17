'use client';

/**
 * TmsTransportSubUnit табуудын virtualization scaffolding (Phase 5.3).
 *
 * Одоогоор бодит virtualization хэрэглэгдэхгүй (нормал wrap-тай `Tabs` л
 * хангалттай). Үүний оронд энэ файл нь дараах тохиолдолд:
 *   - subTransports.length > VIRTUAL_THRESHOLD (жишээ 50)
 *   - Том jittering, scroll lag гарсан
 * `react-window`-г нэмж виртуал scroll хийх цэгийг бэлтгэж өгөв.
 *
 * Интеграцийн алхам:
 *   1. `npm i react-window @types/react-window`
 *   2. Доор байгаа `renderVirtualized` функцийг бөглөх (`FixedSizeList`).
 *   3. `transport-vehicle-card.tsx`-д `shouldVirtualizeSubs`-ийг чекэлж
 *      rendered массивийг орлуулах.
 *
 * Ингэснээр хэт том TM-үүдэд (100+ sub) DOM node count-оос болж lag
 * гарахгүй.
 */

export const VIRTUAL_THRESHOLD = 50;

export function shouldVirtualizeSubs(subCount: number): boolean {
  return subCount > VIRTUAL_THRESHOLD;
}

/**
 * Bөглөх түр заавар — enterprise-д ороод ирээд бодитоор хэрэгтэй болох үед
 * react-window-ийн `FixedSizeList` эсвэл `VariableSizeList`-ийг ашиглана.
 */
export function renderVirtualizedPlaceholder(): null {
  return null;
}
