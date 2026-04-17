import type { TmsTransportManagementStatus } from '@/app/tms/types';

/**
 * TM-ийн төлөвийн нийтлэг label + Badge variant тохиргоо.
 * Жагсаалт, детал, use-transport-detail зэрэгт давхардаж тодорхойлогдохоос сэргийлэх
 * зорилгоор энд нэгтгэв. `variant`-ийн утгууд нь `components/ui/badge.tsx` дотор
 * зөвшөөрөгдсөн сонголтуудтай тохирно.
 */
export const TM_STATUS_MAP: Record<
  TmsTransportManagementStatus,
  { label: string; variant: 'default' | 'secondary' | 'success' | 'destructive' }
> = {
  draft: { label: 'Ноорог', variant: 'secondary' },
  planning: { label: 'Төлөвлөж буй', variant: 'default' },
  active: { label: 'Идэвхтэй', variant: 'success' },
  completed: { label: 'Дууссан', variant: 'default' },
  cancelled: { label: 'Цуцлагдсан', variant: 'destructive' },
};
