'use client';

import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Жагсаалтын хуудасны react error boundary (Next.js конвенц).
 * Firestore холболт, хэт том query, render алдаанаас хэрэглэгчид ойлгомжтой
 * анхааруулга харуулж retry боломж олгоно.
 */
export default function TransportManagementError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Production-д алдааг хянах зорилгоор console-д үлдээнэ (Sentry/Logflare
    // интеграци дараагийн алхам).
    // eslint-disable-next-line no-console
    console.error('[tms/transport-management] list render error:', error);
  }, [error]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="h-7 w-7 text-destructive" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Жагсаалт ачаалахад алдаа гарлаа</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {error?.message || 'Сүлжээ эсвэл серверийн алдаа. Дахин оролдоно уу.'}
        </p>
        {error?.digest ? (
          <p className="text-[11px] font-mono text-muted-foreground/60">id: {error.digest}</p>
        ) : null}
      </div>
      <Button onClick={reset} size="sm">
        Дахин оролдох
      </Button>
    </div>
  );
}
