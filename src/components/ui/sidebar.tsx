'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Minimal sidebar menu primitives used by `src/components/user-nav.tsx`.
 * This file exists to satisfy the import `@/components/ui/sidebar`.
 */

export function SidebarMenu({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn('flex flex-col gap-1', className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }: React.HTMLAttributes<HTMLLIElement>) {
  return <li className={cn('list-none', className)} {...props} />;
}

export function SidebarMenuButton({
  className,
  asChild,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const Comp: any = asChild ? 'span' : 'button';
  return (
    <Comp
      className={cn(
        'w-full inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
        'hover:bg-muted transition-colors',
        className
      )}
      {...props}
    />
  );
}

