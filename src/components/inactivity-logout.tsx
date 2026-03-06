'use client';

import { useInactivityLogout } from '@/hooks/use-inactivity-logout';

/**
 * Нэвтрэгдсэн хэрэглэгч 30 минут идэвхгүй байвал автоматаар logout хийнэ.
 * Root layout-д mount хийнэ.
 */
export function InactivityLogout() {
    useInactivityLogout();
    return null;
}
