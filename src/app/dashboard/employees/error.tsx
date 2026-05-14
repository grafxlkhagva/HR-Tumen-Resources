'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default function EmployeesError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        Sentry.captureException(error, {
            tags: { module: 'employees' },
            extra: { digest: error.digest },
        });
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
            <div className="mx-auto max-w-md space-y-6">
                <div className="mx-auto h-16 w-16 rounded-full bg-rose-100 flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-rose-600" aria-hidden="true" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-slate-900">
                        Ажилтны модульд алдаа гарлаа
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
                        <Link href="/dashboard/employees">
                            <Home className="h-4 w-4" />
                            Ажилтан руу буцах
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
