'use client';

import * as React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  href?: string;
  isLoading?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  href,
  isLoading = false,
  className,
}: StatCardProps) {
  const content = (
    <Card className={cn(
      "transition-colors",
      href && "hover:bg-muted/50 cursor-pointer",
      className
    )}>
      <CardContent className="p-card">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-caption text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-title font-semibold tracking-tight">{value}</p>
            )}
            {description && (
              <p className="text-caption text-muted-foreground">{description}</p>
            )}
            {trend && (
              <p className={cn(
                "text-caption font-medium",
                trend.positive ? "text-success" : "text-error"
              )}>
                {trend.positive ? '+' : ''}{trend.value}% {trend.label}
              </p>
            )}
          </div>
          {Icon && (
            <div className="rounded-md bg-muted p-2">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

// Variant for larger stat display
interface StatCardLargeProps extends StatCardProps {
  subtitle?: string;
  children?: React.ReactNode;
}

export function StatCardLarge({
  title,
  value,
  subtitle,
  icon: Icon,
  description,
  href,
  isLoading = false,
  children,
  className,
}: StatCardLargeProps) {
  const content = (
    <Card className={cn(
      "transition-colors",
      href && "hover:bg-muted/50 cursor-pointer",
      className
    )}>
      <CardContent className="p-card">
        <div className="flex items-start justify-between mb-4">
          <p className="text-micro uppercase tracking-wider text-muted-foreground font-medium">
            {title}
          </p>
          {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
        </div>
        
        {isLoading ? (
          <Skeleton className="h-10 w-24 mb-2" />
        ) : (
          <p className="text-display font-semibold tracking-tight">{value}</p>
        )}
        
        {subtitle && (
          <p className="text-caption text-muted-foreground mt-1">{subtitle}</p>
        )}
        
        {description && (
          <p className="text-caption text-muted-foreground mt-2">{description}</p>
        )}
        
        {children && <div className="mt-4">{children}</div>}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

// Grid wrapper for stat cards
interface StatGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatGrid({ children, columns = 4, className }: StatGridProps) {
  return (
    <div className={cn(
      "grid gap-card",
      columns === 2 && "grid-cols-1 sm:grid-cols-2",
      columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      columns === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
      className
    )}>
      {children}
    </div>
  );
}
