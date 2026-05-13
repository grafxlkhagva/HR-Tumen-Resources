'use client';

/**
 * Single-tenant compatibility shim. Тестийн file нь feature flag-аар модуль
 * нээдэг байсан (per-tenant subscription). Манай single-tenant production-д
 * feature flag шаардлагагүй тул pass-through wrapper болгов.
 */

interface ModuleGateProps {
    module: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function ModuleGate({ children }: ModuleGateProps) {
    return <>{children}</>;
}
