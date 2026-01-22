'use client';

import * as React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-4 text-center",
      className
    )}>
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-body-medium font-medium mb-1">{title}</h3>
      {description && (
        <p className="text-caption text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && (
        action.href ? (
          <Button asChild>
            <a href={action.href}>{action.label}</a>
          </Button>
        ) : (
          <Button onClick={action.onClick}>{action.label}</Button>
        )
      )}
    </div>
  );
}

// Compact version for tables/lists
interface EmptyStateCompactProps {
  icon?: LucideIcon;
  message: string;
  className?: string;
}

export function EmptyStateCompact({
  icon: Icon = Inbox,
  message,
  className,
}: EmptyStateCompactProps) {
  return (
    <div className={cn(
      "flex items-center justify-center gap-2 py-8 text-muted-foreground",
      className
    )}>
      <Icon className="h-4 w-4" />
      <span className="text-caption">{message}</span>
    </div>
  );
}
