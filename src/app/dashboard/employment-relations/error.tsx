'use client';

/**
 * employment-relations модулийн алдааны хязгаар (Next.js route-level Error Boundary).
 *
 * Энэ модулийн доорх ямар ч хуудсанд (page.tsx, [id]/page.tsx, create/page.tsx,
 * templates, settings гэх мэт) renderingийн үед throw болсон алдааг энэ компонент
 * барьж аваад user-д ойлгомжтой fallback UI харуулна. Sentry-руу мөн capture хийнэ.
 *
 * Doc: https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default function EmploymentRelationsError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        Sentry.captureException(error, {
            tags: { module: 'employment-relations' },
            extra: { digest: error.digest },
        });
        // Дотоод observability (dev console)
        console.error('[employment-relations] Render error:', error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
            <div className="mx-auto max-w-md space-y-6">
                <div className="mx-auto h-16 w-16 rounded-full bg-rose-100 flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-rose-600" aria-hidden="true" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-slate-900">
                        Хөдөлмөрийн харилцааны модульд алдаа гарлаа
                    </h2>
                    <p className="text-sm text-slate-600">
                        Хуудсыг ачаалах эсвэл өгөгдөл боловсруулахад санаандгүй алдаа гарлаа.
                        Дахин оролдоно уу. Хэрэв алдаа давтагдсан хэвээр бол админд хандана уу.
                    </p>
                    {error?.digest && (
                        <p className="text-[11px] font-mono text-slate-400 mt-2">
                            ref: {error.digest}
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-center gap-3">
                    <Button onClick={() => reset()} className="gap-2">
                        <RotateCcw className="h-4 w-4" />
                        Дахин оролдох
                    </Button>
                    <Button asChild variant="outline" className="gap-2">
                        <Link href="/dashboard/employment-relations">
                            <Home className="h-4 w-4" />
                            Жагсаалт руу буцах
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
