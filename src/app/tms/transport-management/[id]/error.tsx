'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function TransportDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-full items-center justify-center bg-muted/20">
      <div className="text-center space-y-4 max-w-md px-6">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Алдаа гарлаа</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {error.message || 'Тээврийн удирдлагын мэдээллийг ачаалахад алдаа гарлаа.'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reset}>
          Дахин оролдох
        </Button>
      </div>
    </div>
  );
}
