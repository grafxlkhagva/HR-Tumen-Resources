/**
 * employee-auth-service.ts
 *
 * Client-side helper for /api/employees/[id]/disable-auth route.
 *
 * Зорилго:
 *  - Ажилтан "terminated" болоход Firebase Auth account-ыг disable хийх
 *  - Release rollback (REJECTED) үед буцаан enable хийх
 *
 * Яагаад API route — Admin SDK зөвхөн server-side ажилладаг (`updateUser({disabled})`),
 * client-side firebase SDK-д энэ үйлдэл байхгүй.
 */
import { Auth } from 'firebase/auth';

export interface DisableAuthResult {
  success: boolean;
  uid: string;
  disabled: boolean;
  /** Firestore loginDisabled флаг бичигдсэн эсэх (authoritative source) */
  firestoreUpdated?: boolean;
  /** Firebase Auth updateUser амжилттай байсан эсэх (best-effort, retry-той) */
  authOk?: boolean;
  /** Auth retry-ын тоо */
  authAttempts?: number;
  /** Auth амжилтгүй болсон тохиолдолд харуулах warning мессеж */
  authWarning?: string;
}

/**
 * Firebase Auth account-ыг disable / enable хийнэ.
 *
 * @param auth        firebase/auth instance (caller-ийн token авахын тулд)
 * @param employeeId  Target employee uid (Firebase Auth uid-тэй ижил)
 * @param disabled    true = блоклох, false = буцаан нээх (rollback)
 * @param companyId   Target employee-ийн харьяалагдах companyId. Server-side дээр
 *                    employee доc-г олох, cross-tenant шалгалтад ашиглагдана. Өгөхгүй
 *                    бол server нь caller-ийн companyId-г ашиглана (зөвхөн caller
 *                    өөрийнх нь компаний ажилтан дээр үйлчилнэ).
 *
 * @throws Error хэрэв caller нэвтрээгүй, role хүрэлцэхгүй, эсвэл API алдаа.
 */
export async function setEmployeeAuthDisabled(
  auth: Auth,
  employeeId: string,
  disabled: boolean,
  companyId?: string,
): Promise<DisableAuthResult> {
  if (!auth.currentUser) {
    throw new Error('Нэвтрээгүй байна.');
  }
  if (!employeeId) {
    throw new Error('employeeId шаардлагатай.');
  }

  const token = await auth.currentUser.getIdToken();
  const res = await fetch(`/api/employees/${encodeURIComponent(employeeId)}/disable-auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ disabled, ...(companyId ? { companyId } : {}) }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err?.error || `Auth disable failed (${res.status})`);
  }

  return (await res.json()) as DisableAuthResult;
}
