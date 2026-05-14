'use client';

/**
 * rejection-alert.tsx
 *
 * DRAFT төлөвт баримтын дээр харагдах "Засварлах шаардлагатай" alert.
 * Хянагчаас гарсан reject коммент бүрийг хянагчийн нэр + ишлэлтэй
 * байдлаар харуулна.
 *
 * Phase 3 extraction — `[id]/page.tsx`-ээс хуваав. Зан үйл өөрчлөгдөөгүй.
 */

import React, { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import type { ERDocument } from '../../types';
import type { Employee } from '@/types';

interface RejectionAlertProps {
    approvalStatus: ERDocument['approvalStatus'];
    employeesList: Employee[] | undefined;
}

function RejectionAlertImpl({ approvalStatus, employeesList }: RejectionAlertProps) {
    const rejectedEntries = useMemo(() => {
        if (!approvalStatus) return [];
        return Object.entries(approvalStatus).filter(
            ([, s]) => s?.status === 'REJECTED',
        );
    }, [approvalStatus]);

    if (rejectedEntries.length === 0) return null;

    return (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-2">
                <p className="text-sm font-medium text-rose-900">Засварлах шаардлагатай</p>
                {rejectedEntries.map(([uid, s]) => {
                    const rUser = employeesList?.find((u) => u.id === uid);
                    return (
                        <p key={uid} className="text-sm text-rose-700">
                            <span className="font-medium">{rUser?.firstName}:</span> &quot;{s.comment}&quot;
                        </p>
                    );
                })}
            </div>
        </div>
    );
}

export const RejectionAlert = React.memo(RejectionAlertImpl);
