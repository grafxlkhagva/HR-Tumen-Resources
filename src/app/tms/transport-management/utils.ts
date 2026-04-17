/**
 * TMS-ийн Transport Management feature дотор давхардан хэрэглэгддэг жижиг
 * утилитууд. Копи-пэйстээ багасгаж, нэг газраас нэр/формат өөрчлөх боломжтой
 * болгоно.
 */

export interface VehicleLabelSource {
  id: string;
  licensePlate?: string;
  makeName?: string;
  modelName?: string;
}

/**
 * Тээврийн хэрэгслийг жагсаалт/dropdown-д харуулах нийтлэг label:
 *   "1234УБА · Toyota · Hiace"
 * Хоосон талбарууд алгасагдаж, бүгд хоосон бол id-г fallback-аар буцаана.
 */
export function formatVehicleLabel(v: VehicleLabelSource): string {
  return (
    [v.licensePlate, v.makeName, v.modelName].filter(Boolean).join(' · ') || v.id
  );
}
