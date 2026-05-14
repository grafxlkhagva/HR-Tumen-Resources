'use client';

/**
 * entity-info-card.tsx
 *
 * Sidebar-ийн "Холбогдох мэдээлэл" card — ажилтан, албан нэгж, ажлын байрны
 * нэрийг гурван badge-тэй мөрөөр харуулна.
 *
 * Phase 3 extraction — `[id]/page.tsx`-ээс хуваав. Зан үйл өөрчлөгдөөгүй.
 */

import React from 'react';
import { User, Building2, Briefcase } from 'lucide-react';

interface EntityInfoCardProps {
    employeeDisplayName: string;
    departmentName: string;
    positionName: string;
}

function EntityInfoCardImpl({
    employeeDisplayName,
    departmentName,
    positionName,
}: EntityInfoCardProps) {
    return (
        <div className="bg-white rounded-xl border p-4 space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Холбогдох мэдээлэл
            </h3>

            <div className="space-y-3">
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50">
                    <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-slate-400 uppercase font-medium">Ажилтан</p>
                        <p className="text-sm font-medium truncate">{employeeDisplayName}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50">
                    <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-slate-400 uppercase font-medium">Албан нэгж</p>
                        <p className="text-sm font-medium truncate">{departmentName}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50">
                    <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Briefcase className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-slate-400 uppercase font-medium">Ажлын байр</p>
                        <p className="text-sm font-medium truncate">{positionName}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export const EntityInfoCard = React.memo(EntityInfoCardImpl);
