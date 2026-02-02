'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function AddActionButton({
  label,
  description,
  onClick,
  href,
  disabled,
  className,
  icon,
  stopPropagation = false,
}: {
  /** Tooltip title */
  label: string;
  /** Tooltip description (optional) */
  description?: string;
  /** Click handler (use for dialogs) */
  onClick?: () => void;
  /** Link target (use for navigation) */
  href?: string;
  disabled?: boolean;
  className?: string;
  /** Override icon (defaults to Plus) */
  icon?: React.ReactNode;
  /** Useful when used inside cards/flow nodes */
  stopPropagation?: boolean;
}) {
  const content = (
    <Button
      type="button"
      variant="default"
      size="icon"
      className={cn(
        'h-9 w-9 rounded-lg',
        // Attention-grabbing primary button: primary bg + white icon
        'bg-primary text-primary-foreground hover:bg-primary/90',
        'shadow-sm hover:shadow-md transition-shadow',
        'focus-visible:ring-primary/30',
        className
      )}
      onClick={(e) => {
        if (stopPropagation) {
          e.preventDefault();
          e.stopPropagation();
        }
        onClick?.();
      }}
      onPointerDown={(e) => {
        if (!stopPropagation) return;
        e.stopPropagation();
      }}
      disabled={disabled}
      aria-label={label}
    >
      {icon ?? <Plus className="h-4 w-4" />}
    </Button>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          {href ? (
            <Link
              href={href}
              aria-disabled={disabled ? true : undefined}
              tabIndex={disabled ? -1 : undefined}
              onClick={(e) => {
                if (disabled) {
                  e.preventDefault();
                  return;
                }
                if (stopPropagation) e.stopPropagation();
              }}
              onPointerDown={(e) => {
                if (stopPropagation) e.stopPropagation();
              }}
              className={cn(disabled && 'pointer-events-none opacity-50')}
            >
              {content}
            </Link>
          ) : (
            content
          )}
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-0.5">
            <div className="text-xs font-semibold">{label}</div>
            {description ? <div className="text-xs text-muted-foreground">{description}</div> : null}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

