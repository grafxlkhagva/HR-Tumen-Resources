'use client';

import * as React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export type VerticalTabMenuItem = {
  value: string;
  label: React.ReactNode;
};

export function VerticalTabMenu({
  items,
  orientation = 'vertical',
  className,
  triggerClassName,
}: {
  items: VerticalTabMenuItem[];
  orientation?: 'vertical' | 'horizontal';
  className?: string;
  triggerClassName?: string;
}) {
  return (
    <TabsList
      className={cn(
        'bg-transparent h-auto w-full p-0',
        orientation === 'vertical'
          ? 'flex flex-col items-start gap-2'
          : 'flex flex-row items-center gap-6 justify-start',
        className
      )}
    >
      {items.map((tab) => (
        <TabsTrigger
          key={tab.value}
          value={tab.value}
          className={cn(
            // Text-only menu: no bg/border/shadow/scale.
            orientation === 'vertical' ? 'w-full justify-start' : 'w-auto justify-center',
            'px-1 py-1.5 rounded-none bg-transparent shadow-none',
            'text-base font-medium text-muted-foreground hover:text-foreground',
            'data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:scale-100',
            'data-[state=active]:text-primary data-[state=active]:font-semibold',
            triggerClassName
          )}
        >
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}

