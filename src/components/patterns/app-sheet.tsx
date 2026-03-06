'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

export {
  Sheet as AppSheet,
  SheetTrigger as AppSheetTrigger,
  SheetClose as AppSheetClose,
  SheetPortal as AppSheetPortal,
  SheetOverlay as AppSheetOverlay,
  SheetHeader as AppSheetHeader,
  SheetFooter as AppSheetFooter,
  SheetTitle as AppSheetTitle,
  SheetDescription as AppSheetDescription,
};

export function AppSheetContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SheetContent>) {
  return (
    <SheetContent
      className={cn(
        'bg-background',
        // Standard tone for the close button
        '[&>button]:text-muted-foreground [&>button:hover]:text-foreground',
        className
      )}
      {...props}
    />
  );
}

