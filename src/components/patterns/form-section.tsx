'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// ============================================
// FORM SECTION - For grouping form fields
// ============================================

interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-body-medium font-medium">{title}</h3>
          )}
          {description && (
            <p className="text-caption text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className="grid gap-4">{children}</div>
    </div>
  );
}

// ============================================
// FORM CARD - For card-wrapped form sections
// ============================================

interface FormCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function FormCard({
  title,
  description,
  children,
  footer,
  className,
}: FormCardProps) {
  return (
    <Card className={cn(className)}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className={cn(!title && !description && "pt-card")}>
        <div className="grid gap-4">{children}</div>
      </CardContent>
      {footer && (
        <div className="flex items-center justify-end gap-2 border-t p-card">
          {footer}
        </div>
      )}
    </Card>
  );
}

// ============================================
// FORM ROW - For horizontal form field layouts
// ============================================

interface FormRowProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function FormRow({ children, columns = 2, className }: FormRowProps) {
  return (
    <div className={cn(
      "grid gap-4",
      columns === 1 && "grid-cols-1",
      columns === 2 && "grid-cols-1 sm:grid-cols-2",
      columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      columns === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
      className
    )}>
      {children}
    </div>
  );
}

// ============================================
// FORM FIELD WRAPPER - For consistent field styling
// ============================================

interface FormFieldWrapperProps {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormFieldWrapper({
  label,
  required,
  error,
  hint,
  children,
  className,
}: FormFieldWrapperProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-body-medium text-foreground">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="text-caption text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-caption text-error">{error}</p>
      )}
    </div>
  );
}

// ============================================
// FORM DIVIDER - For visual separation
// ============================================

interface FormDividerProps {
  label?: string;
  className?: string;
}

export function FormDivider({ label, className }: FormDividerProps) {
  if (label) {
    return (
      <div className={cn("relative py-4", className)}>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-2 text-caption text-muted-foreground">
            {label}
          </span>
        </div>
      </div>
    );
  }
  
  return <div className={cn("border-t my-4", className)} />;
}
