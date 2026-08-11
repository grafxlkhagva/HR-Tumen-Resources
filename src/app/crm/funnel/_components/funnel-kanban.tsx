'use client';

import * as React from 'react';
import {
    DndContext,
    closestCorners,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ACTIVE_FUNNEL_STAGES, type Company, type FunnelStage } from '../../_types';
import { moveCompanyStage } from '../../_lib/crm-actions';
import { FunnelColumn, stageShortLabel } from './funnel-column';
import { FunnelCard } from './funnel-card';

/** funnelStage байхгүй/танигдахгүй бол lead гэж үзнэ (шинэ бичлэгийн default). */
export function normalizeFunnelStage(stage?: string): FunnelStage {
    const all: FunnelStage[] = [
        'lead',
        'contacted',
        'qualified',
        'quote',
        'customer',
        'loyal',
        'lost',
    ];
    return all.includes(stage as FunnelStage) ? (stage as FunnelStage) : 'lead';
}

interface FunnelKanbanProps {
    companies: Company[];
    actor: { uid?: string; name?: string; kam?: string | null };
}

export function FunnelKanban({ companies, actor }: FunnelKanbanProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [activeId, setActiveId] = React.useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    );

    const boardCompanies = React.useMemo(
        () =>
            companies.filter((c) =>
                (ACTIVE_FUNNEL_STAGES as string[]).includes(normalizeFunnelStage(c.funnelStage)),
            ),
        [companies],
    );

    const byStage = React.useMemo(() => {
        const map = new Map<FunnelStage, Company[]>();
        ACTIVE_FUNNEL_STAGES.forEach((s) => map.set(s, []));
        boardCompanies.forEach((c) => {
            map.get(normalizeFunnelStage(c.funnelStage))?.push(c);
        });
        // Сүүлд өөрчлөгдсөн нь дээр
        map.forEach((arr) =>
            arr.sort((a, b) => {
                const ta = (a.updatedAt as unknown as { seconds?: number } | undefined)?.seconds || 0;
                const tb = (b.updatedAt as unknown as { seconds?: number } | undefined)?.seconds || 0;
                return tb - ta;
            }),
        );
        return map;
    }, [boardCompanies]);

    const activeCompany = React.useMemo(
        () => (activeId ? boardCompanies.find((c) => c.id === activeId) : null),
        [boardCompanies, activeId],
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(String(event.active.id));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null);
        const { active, over } = event;
        if (!over) return;

        const companyId = String(active.id);
        const overId = String(over.id);

        const moved = boardCompanies.find((c) => c.id === companyId);
        if (!moved) return;

        // over.id нь баганын stage ID эсвэл өөр картын ID байж болно
        let newStage = (ACTIVE_FUNNEL_STAGES as string[]).includes(overId)
            ? (overId as FunnelStage)
            : undefined;
        if (!newStage) {
            const overCompany = boardCompanies.find((c) => c.id === overId);
            if (overCompany) newStage = normalizeFunnelStage(overCompany.funnelStage);
        }

        if (!newStage || newStage === normalizeFunnelStage(moved.funnelStage)) return;
        if (!firestore) return;

        moveCompanyStage(firestore, actor, moved, newStage)
            .then((res) => {
                if (res.ok) {
                    toast({
                        title: 'Амжилттай',
                        description: `"${moved.name}" → ${stageShortLabel(newStage!)}`,
                    });
                } else {
                    toast({
                        variant: 'destructive',
                        title: 'Алдаа',
                        description: res.error || 'Шат солиход алдаа гарлаа.',
                    });
                }
            })
            .catch(() => {
                toast({
                    variant: 'destructive',
                    title: 'Алдаа',
                    description: 'Шат солиход алдаа гарлаа.',
                });
            });
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
        >
            <div className="flex h-full gap-3 overflow-x-auto p-4">
                {ACTIVE_FUNNEL_STAGES.map((stage) => (
                    <FunnelColumn
                        key={stage}
                        stage={stage}
                        companies={byStage.get(stage) || []}
                    />
                ))}
            </div>

            <DragOverlay>
                {activeCompany ? <FunnelCard company={activeCompany} isOverlay /> : null}
            </DragOverlay>
        </DndContext>
    );
}
