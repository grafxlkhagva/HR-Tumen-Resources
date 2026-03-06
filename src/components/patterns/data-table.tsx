'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyStateCompact } from './empty-state';

// ============================================
// DATA TABLE WRAPPER
// ============================================

interface DataTableProps {
  children: React.ReactNode;
  className?: string;
}

export function DataTable({ children, className }: DataTableProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <Table>{children}</Table>
      </div>
    </Card>
  );
}

// ============================================
// DATA TABLE HEADER
// ============================================

interface DataTableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function DataTableHeader({ children, className }: DataTableHeaderProps) {
  return (
    <TableHeader className={cn("bg-muted/50", className)}>
      {children}
    </TableHeader>
  );
}

// ============================================
// DATA TABLE COLUMN
// ============================================

interface DataTableColumnProps {
  children?: React.ReactNode;
  className?: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}

export function DataTableColumn({
  children,
  className,
  align = 'left',
}: DataTableColumnProps) {
  return (
    <TableHead className={cn(
      "text-micro uppercase tracking-wider text-muted-foreground font-medium whitespace-nowrap",
      align === 'center' && "text-center",
      align === 'right' && "text-right",
      className
    )}>
      {children}
    </TableHead>
  );
}

// ============================================
// DATA TABLE BODY
// ============================================

interface DataTableBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function DataTableBody({ children, className }: DataTableBodyProps) {
  return <TableBody className={className}>{children}</TableBody>;
}

// ============================================
// DATA TABLE ROW
// ============================================

interface DataTableRowProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}

export function DataTableRow({
  children,
  className,
  onClick,
  selected,
}: DataTableRowProps) {
  return (
    <TableRow
      className={cn(
        "transition-colors",
        onClick && "cursor-pointer hover:bg-muted/50",
        selected && "bg-muted/50",
        className
      )}
      onClick={onClick}
    >
      {children}
    </TableRow>
  );
}

// ============================================
// DATA TABLE CELL
// ============================================

interface DataTableCellProps {
  children?: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export function DataTableCell({
  children,
  className,
  align = 'left',
}: DataTableCellProps) {
  return (
    <TableCell className={cn(
      "text-body",
      align === 'center' && "text-center",
      align === 'right' && "text-right",
      className
    )}>
      {children}
    </TableCell>
  );
}

// ============================================
// DATA TABLE LOADING
// ============================================

interface DataTableLoadingProps {
  columns: number;
  rows?: number;
}

export function DataTableLoading({ columns, rows = 5 }: DataTableLoadingProps) {
  return (
    <DataTableBody>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton className="h-5 w-full max-w-[200px]" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </DataTableBody>
  );
}

// ============================================
// DATA TABLE EMPTY
// ============================================

interface DataTableEmptyProps {
  columns: number;
  message?: string;
}

export function DataTableEmpty({
  columns,
  message = 'Мэдээлэл олдсонгүй',
}: DataTableEmptyProps) {
  return (
    <DataTableBody>
      <TableRow>
        <TableCell colSpan={columns}>
          <EmptyStateCompact message={message} />
        </TableCell>
      </TableRow>
    </DataTableBody>
  );
}
