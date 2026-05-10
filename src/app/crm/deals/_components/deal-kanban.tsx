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
import { doc, serverTimestamp } from 'firebase/firestore';
import { updateDocumentNonBlocking, useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
    DEFAULT_PIPELINE,
    getStage,
    type Deal,
    type Pipeline,
} from '../../_types';
import { DealColumn } from './deal-column';
import { DealCard } from './deal-card';

interface DealKanbanProps {
    deals: Deal[];
    pipeline?: Pipeline;
    contactNames: Map<string, string>;
    companyNames: Map<string, string>;
}

export function DealKanban({
    deals,
    pipeline = DEFAULT_PIPELINE,
    contactNames,
    companyNames,
}: DealKanbanProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [activeId, setActiveId] = React.useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    );

    const dealsByStage = React.useMemo(() => {
        const map = new Map<string, Deal[]>();
        pipeline.stages.forEach((s) => map.set(s.id, []));
        deals.forEach((d) => {
            const arr = map.get(d.stageId);
            if (arr) {
                arr.push(d);
            } else {
                // Stage уналд орвол anchor stage руу шилжүүлнэ — UI дээр лав хаа нэгтэй харагдах хэрэгтэй
                const fallback = pipeline.stages[0];
                if (fallback) {
                    const arr0 = map.get(fallback.id);
                    arr0?.push(d);
                }
            }
        });
        // Огноогоор эрэмбэлэх
        map.forEach((arr) =>
            arr.sort((a, b) => {
                const da = a.updatedAt?.seconds || 0;
                const db = b.updatedAt?.seconds || 0;
                return db - da;
            }),
        );
        return map;
    }, [deals, pipeline]);

    const activeDeal = React.useMemo(
        () => (activeId ? deals.find((d) => d.id === activeId) : null),
        [deals, activeId],
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(String(event.active.id));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null);
        const { active, over } = event;
        if (!over) return;

        const dealId = String(active.id);
        const overId = String(over.id);

        const movedDeal = deals.find((d) => d.id === dealId);
        if (!movedDeal) return;

        // over.id can be either a stageId (when dropping on column droppable)
        // or another deal's id (when dropping on top of a card)
        let newStageId: string | undefined = pipeline.stages.find((s) => s.id === overId)?.id;
        if (!newStageId) {
            const overDeal = deals.find((d) => d.id === overId);
            if (overDeal) newStageId = overDeal.stageId;
        }

        if (!newStageId || newStageId === movedDeal.stageId) return;

        if (!firestore) return;
        const ref = doc(firestore, 'crm_deals', dealId);
        const stage = getStage(pipeline, newStageId);

        const patch: Record<string, unknown> = {
            stageId: newStageId,
            updatedAt: serverTimestamp(),
        };
        if (stage?.outcome) {
            patch.closedAt = serverTimestamp();
        } else if (movedDeal.closedAt) {
            patch.closedAt = null;
        }

        updateDocumentNonBlocking(ref, patch);
        toast({
            title: 'Шилжсэн',
            description: `"${movedDeal.name}" → ${stage?.label ?? newStageId}`,
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
                {pipeline.stages.map((stage) => (
                    <DealColumn
                        key={stage.id}
                        stage={stage}
                        deals={dealsByStage.get(stage.id) || []}
                        contactNames={contactNames}
                        companyNames={companyNames}
                    />
                ))}
            </div>

            <DragOverlay>
                {activeDeal ? (
                    <DealCard
                        deal={activeDeal}
                        stage={
                            getStage(pipeline, activeDeal.stageId) ?? pipeline.stages[0]
                        }
                        contactName={
                            activeDeal.contactId
                                ? contactNames.get(activeDeal.contactId)
                                : undefined
                        }
                        companyName={
                            activeDeal.companyId
                                ? companyNames.get(activeDeal.companyId)
                                : undefined
                        }
                        isOverlay
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
