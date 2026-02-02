'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function ActionIconButton({
  label,
  description,
  href,
  onClick,
  disabled,
  className,
  icon,
  variant = 'ghost',
  size = 'icon',
  stopPropagation = false,
}: {
  label: string;
  description?: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  icon: React.ReactNode;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  /** Useful when used inside cards/flow nodes */
  stopPropagation?: boolean;
}) {
  const btn = (
    <Button
      type="button"
      variant={variant}
      size={size}
      // Match AddActionButton sizing exactly
      className={cn('h-9 w-9 rounded-lg p-0 shrink-0', className)}
      onClick={(e) => {
        if (stopPropagation) {
          e.preventDefault();
          e.stopPropagation();
        }
        onClick?.();
      }}
      onPointerDown={(e) => {
        if (stopPropagation) e.stopPropagation();
      }}
      disabled={disabled}
      aria-label={label}
    >
      {icon}
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
              {btn}
            </Link>
          ) : (
            btn
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

