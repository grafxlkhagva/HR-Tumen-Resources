/**
 * Re-export shim — туршилгын төслийн код `@/hooks/use-tenant-write`-ээс
 * импорт хийдэг. Production-ы үндсэн hook нь `@/firebase/tenant-compat`-д байгаа.
 */
export { useTenantWrite } from '@/firebase/tenant-compat';
