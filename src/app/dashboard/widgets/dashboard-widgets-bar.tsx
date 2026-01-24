// src/app/dashboard/widgets/dashboard-widgets-bar.tsx
'use client';

import React, { useState } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetId } from './catalog';
import { DashboardWidgetCard, WidgetData } from './dashboard-widget-card';
import { AddWidgetDialog } from './add-widget-dialog';

interface DashboardWidgetsBarProps {
    order: WidgetId[];
    hidden: WidgetId[];
    onOrderChange: (newOrder: WidgetId[]) => void;
    onHideWidget: (id: WidgetId) => void;
    onShowWidget: (id: WidgetId) => void;
    data: WidgetData;
    isLoading?: boolean;
}

export function DashboardWidgetsBar({
    order,
    hidden,
    onOrderChange,
    onHideWidget,
    onShowWidget,
    data,
    isLoading = false,
}: DashboardWidgetsBarProps) {
    const [activeId, setActiveId] = useState<WidgetId | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px movement to start dragging (allows clicks)
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as WidgetId);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id) {
            const oldIndex = order.indexOf(active.id as WidgetId);
            const newIndex = order.indexOf(over.id as WidgetId);
            
            if (oldIndex !== -1 && newIndex !== -1) {
                const newOrder = arrayMove(order, oldIndex, newIndex);
                onOrderChange(newOrder);
            }
        }
    };

    const handleDragCancel = () => {
        setActiveId(null);
    };

    // Check if there are available widgets to add
    const hasAvailableWidgets = hidden.length > 0 || order.length < 13; // 13 = total widgets in catalog

    // Build items array - widgets only
    const renderItems = () => {
        return order.map((widgetId) => (
            <DashboardWidgetCard
                key={widgetId}
                id={widgetId}
                data={data}
                isLoading={isLoading}
                onHide={onHideWidget}
                isDragging={activeId === widgetId}
            />
        ));
    };

    return (
        <>
            <div className="h-[20vh] min-h-[160px] border-b bg-slate-50 dark:bg-slate-950 relative">
                <div className="h-full overflow-x-auto overflow-y-hidden px-4 sm:px-6 py-4 scrollbar-hide">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragCancel={handleDragCancel}
                    >
                        <SortableContext
                            items={order}
                            strategy={horizontalListSortingStrategy}
                        >
                            <div className="flex gap-4 sm:gap-6 h-full min-w-max">
                                {renderItems()}
                            </div>
                        </SortableContext>

                        {/* Drag overlay for better visual feedback */}
                        <DragOverlay>
                            {activeId ? (
                                <div className="opacity-80">
                                    <DashboardWidgetCard
                                        id={activeId}
                                        data={data}
                                        isLoading={isLoading}
                                        isDragging
                                    />
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                </div>

                {/* Floating Add Button - bottom center */}
                {hasAvailableWidgets && (
                    <Button
                        size="icon"
                        className={cn(
                            "absolute left-1/2 -translate-x-1/2 -bottom-5 z-20",
                            "h-10 w-10 rounded-full shadow-lg",
                            "bg-primary hover:bg-primary/90 hover:scale-110",
                            "transition-all duration-200"
                        )}
                        onClick={() => setIsAddDialogOpen(true)}
                    >
                        <Plus className="h-5 w-5" />
                        <span className="sr-only">Widget нэмэх</span>
                    </Button>
                )}
            </div>

            {/* Add Widget Dialog */}
            <AddWidgetDialog
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                currentOrder={order}
                hidden={hidden}
                onAddWidget={onShowWidget}
            />
        </>
    );
}
