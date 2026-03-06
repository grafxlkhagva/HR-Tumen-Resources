import { collection, addDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { DepartmentHistoryEventType } from './types';

export interface AddDepartmentHistoryEventParams {
  firestore: Firestore;
  departmentId: string;
  eventType: DepartmentHistoryEventType;
  positionId?: string;
  positionTitle?: string;
  performedBy: string;
  performedByName: string;
}

/**
 * Нэгжийн бүтэц дотор хийгдсэн үйлдлийг түүхэнд бичнэ (ажлын байр нэмэх/засах/устгах).
 */
export async function addDepartmentHistoryEvent(params: AddDepartmentHistoryEventParams): Promise<void> {
  const { firestore, departmentId, eventType, positionId, positionTitle, performedBy, performedByName } = params;
  const approvedAt = new Date().toISOString();
  await addDoc(collection(firestore, 'departmentHistory'), {
    departmentId,
    approvedAt,
    eventType,
    ...(positionId != null && { positionId }),
    ...(positionTitle != null && positionTitle !== '' && { positionTitle }),
    performedBy,
    performedByName,
  });
}
