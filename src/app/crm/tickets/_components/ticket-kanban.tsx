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
    TICKET_STATUSES,
    getTicketStatus,
    type Ticket,
    type TicketStatus,
} from '../../_types';
import { TicketColumn } from './ticket-column';
import { TicketCard } from './ticket-card';

interface TicketKanbanProps {
    tickets: Ticket[];
    contactNames: Map<string, string>;
    companyNames: Map<string, string>;
}

export function TicketKanban({
    tickets,
    contactNames,
    companyNames,
}: TicketKanbanProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [activeId, setActiveId] = React.useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    );

    const ticketsByStatus = React.useMemo(() => {
        const map = new Map<TicketStatus, Ticket[]>();
        TICKET_STATUSES.forEach((s) => map.set(s.id, []));
        tickets.forEach((t) => {
            const arr = map.get(t.status);
            if (arr) {
                arr.push(t);
            } else {
                const fallback = TICKET_STATUSES[0];
                if (fallback) {
                    const arr0 = map.get(fallback.id);
                    arr0?.push(t);
                }
            }
        });
        // Эрэмбэ: priority desc → updatedAt desc
        const priorityRank: Record<string, number> = {
            urgent: 0,
            high: 1,
            medium: 2,
            low: 3,
        };
        map.forEach((arr) =>
            arr.sort((a, b) => {
                const pa = priorityRank[a.priority] ?? 9;
                const pb = priorityRank[b.priority] ?? 9;
                if (pa !== pb) return pa - pb;
                const ua = a.updatedAt?.seconds || 0;
                const ub = b.updatedAt?.seconds || 0;
                return ub - ua;
            }),
        );
        return map;
    }, [tickets]);

    const activeTicket = React.useMemo(
        () => (activeId ? tickets.find((t) => t.id === activeId) : null),
        [tickets, activeId],
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(String(event.active.id));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null);
        const { active, over } = event;
        if (!over) return;

        const ticketId = String(active.id);
        const overId = String(over.id);

        const movedTicket = tickets.find((t) => t.id === ticketId);
        if (!movedTicket) return;

        let newStatus: TicketStatus | undefined = TICKET_STATUSES.find(
            (s) => s.id === overId,
        )?.id;
        if (!newStatus) {
            const overTicket = tickets.find((t) => t.id === overId);
            if (overTicket) newStatus = overTicket.status;
        }

        if (!newStatus || newStatus === movedTicket.status) return;

        if (!firestore) return;
        const ref = doc(firestore, 'crm_tickets', ticketId);
        const status = getTicketStatus(newStatus);

        const patch: Record<string, unknown> = {
            status: newStatus,
            updatedAt: serverTimestamp(),
        };
        if (newStatus === 'resolved' && !movedTicket.resolvedAt) {
            patch.resolvedAt = serverTimestamp();
        }
        if (newStatus === 'closed' && !movedTicket.closedAt) {
            patch.closedAt = serverTimestamp();
        }
        if (status && !status.terminal) {
            // Re-open үед resolved/closed огнооны cleanup хийнэ
            if (movedTicket.resolvedAt) patch.resolvedAt = null;
            if (movedTicket.closedAt) patch.closedAt = null;
        }

        updateDocumentNonBlocking(ref, patch);
        toast({
            title: 'Шилжсэн',
            description: `"${movedTicket.subject}" → ${status?.label ?? newStatus}`,
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
                {TICKET_STATUSES.map((status) => (
                    <TicketColumn
                        key={status.id}
                        status={status}
                        tickets={ticketsByStatus.get(status.id) || []}
                        contactNames={contactNames}
                        companyNames={companyNames}
                    />
                ))}
            </div>

            <DragOverlay>
                {activeTicket ? (
                    <TicketCard
                        ticket={activeTicket}
                        status={
                            getTicketStatus(activeTicket.status) ?? TICKET_STATUSES[0]
                        }
                        contactName={
                            activeTicket.contactId
                                ? contactNames.get(activeTicket.contactId)
                                : undefined
                        }
                        companyName={
                            activeTicket.companyId
                                ? companyNames.get(activeTicket.companyId)
                                : undefined
                        }
                        isOverlay
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
