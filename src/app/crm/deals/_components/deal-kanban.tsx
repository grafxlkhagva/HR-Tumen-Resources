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
import {
    TUMEN_PIPELINE,
    getStage,
    normalizeStageId,
    type Company,
    type Deal,
} from '../../_types';
import { moveDealStage, sendDealQuote } from '../../_lib/crm-actions';
import { useKamScope } from '../../_lib/use-kam-scope';
import { DealColumn } from './deal-column';
import { DealCard } from './deal-card';
import { StageReasonDialog } from './stage-reason-dialog';

interface DealKanbanProps {
    deals: Deal[];
    /** Компанийн map — won үед компанийг customer болгож ахиулахад хэрэгтэй. */
    companiesById: Map<string, Company>;
}

export function DealKanban({ deals, companiesById }: DealKanbanProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { actor } = useKamScope();
    const [activeId, setActiveId] = React.useState<string | null>(null);
    const [reasonMove, setReasonMove] = React.useState<{
        deal: Deal;
        newStage: 'pending' | 'lost';
    } | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    );

    const companyNames = React.useMemo(() => {
        const map = new Map<string, string>();
        companiesById.forEach((c, id) => map.set(id, c.name));
        return map;
    }, [companiesById]);

    // Бүх deal-ийг normalizeStageId-ээр бүлэглэнэ (хуучин stage ID-ууд автоматаар буудаг)
    const dealsByStage = React.useMemo(() => {
        const map = new Map<string, Deal[]>();
        TUMEN_PIPELINE.stages.forEach((s) => map.set(s.id, []));
        deals.forEach((d) => {
            map.get(normalizeStageId(d.stageId))?.push(d);
        });
        map.forEach((arr) =>
            arr.sort((a, b) => {
                const da = a.updatedAt?.seconds || 0;
                const db = b.updatedAt?.seconds || 0;
                return db - da;
            }),
        );
        return map;
    }, [deals]);

    const activeDeal = React.useMemo(
        () => (activeId ? deals.find((d) => d.id === activeId) : null),
        [deals, activeId],
    );

    /** Бүх stage шилжилт ЗӨВХӨН moveDealStage-ээр (авто даалгавар, компани ахиулах, аудит). */
    const doMove = React.useCallback(
        async (deal: Deal, newStageId: string, reason?: string) => {
            if (!firestore) return;
            const company = deal.companyId
                ? companiesById.get(deal.companyId) ?? null
                : null;
            try {
                const res = await moveDealStage(
                    firestore,
                    actor,
                    deal,
                    newStageId,
                    reason,
                    company,
                );
                if (res.ok) {
                    const stage = getStage(TUMEN_PIPELINE, newStageId);
                    toast({
                        title: 'Амжилттай',
                        description: `"${deal.name}" → ${stage?.label ?? newStageId}`,
                    });
                } else {
                    toast({
                        variant: 'destructive',
                        title: 'Алдаа',
                        description: res.error || 'Шат солиход алдаа гарлаа.',
                    });
                }
            } catch {
                toast({
                    variant: 'destructive',
                    title: 'Алдаа',
                    description: 'Шат солиход алдаа гарлаа.',
                });
            }
        },
        [firestore, actor, companiesById, toast],
    );

    const handleQuoteSend = React.useCallback(
        async (deal: Deal, amount?: number) => {
            if (!firestore) return;
            try {
                const res = await sendDealQuote(firestore, actor, deal, amount);
                if (res.ok) {
                    toast({
                        title: 'Амжилттай',
                        description: `"${deal.name}" — үнийн санал илгээсэн, дагах даалгавар үүслээ.`,
                    });
                } else {
                    toast({
                        variant: 'destructive',
                        title: 'Алдаа',
                        description: res.error || 'Үнийн санал илгээхэд алдаа гарлаа.',
                    });
                }
            } catch {
                toast({
                    variant: 'destructive',
                    title: 'Алдаа',
                    description: 'Үнийн санал илгээхэд алдаа гарлаа.',
                });
            }
        },
        [firestore, actor, toast],
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

        // over.id нь баганын stageId эсвэл өөр картын id байж болно
        let newStageId: string | undefined = TUMEN_PIPELINE.stages.find(
            (s) => s.id === overId,
        )?.id;
        if (!newStageId) {
            const overDeal = deals.find((d) => d.id === overId);
            if (overDeal) newStageId = normalizeStageId(overDeal.stageId);
        }

        if (!newStageId || newStageId === normalizeStageId(movedDeal.stageId)) return;

        // pending/lost руу шилжихэд шалтгаан ЗААВАЛ — диалог нээнэ, цуцалбал хөдөлгөхгүй
        if (newStageId === 'pending' || newStageId === 'lost') {
            setReasonMove({ deal: movedDeal, newStage: newStageId });
            return;
        }

        void doMove(movedDeal, newStageId);
    };

    return (
        <>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setActiveId(null)}
            >
                <div className="flex h-full gap-3 overflow-x-auto p-4">
                    {TUMEN_PIPELINE.stages.map((stage) => (
                        <DealColumn
                            key={stage.id}
                            stage={stage}
                            deals={dealsByStage.get(stage.id) || []}
                            companyNames={companyNames}
                            onQuoteSend={handleQuoteSend}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeDeal ? (
                        <DealCard
                            deal={activeDeal}
                            stage={
                                getStage(TUMEN_PIPELINE, activeDeal.stageId) ??
                                TUMEN_PIPELINE.stages[0]
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

            <StageReasonDialog
                open={!!reasonMove}
                onOpenChange={(o) => {
                    if (!o) setReasonMove(null);
                }}
                stage={reasonMove?.newStage ?? 'lost'}
                dealName={reasonMove?.deal.name}
                onConfirm={(reason) => {
                    const m = reasonMove;
                    setReasonMove(null);
                    if (m) void doMove(m.deal, m.newStage, reason);
                }}
            />
        </>
    );
}
