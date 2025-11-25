'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { Employee } from '../employees/data';

interface CodeLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  isLoading: boolean;
}

export function CodeLogDialog({
  open,
  onOpenChange,
  employees,
  isLoading,
}: CodeLogDialogProps) {

  const sortedEmployees = React.useMemo(() => {
    return [...employees].sort((a, b) => (a.employeeCode > b.employeeCode ? 1 : -1));
  }, [employees]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ажилтны кодын түүх</DialogTitle>
          <DialogDescription>
            Системд үүсгэгдсэн бүх ажилтны код болон харгалзах ажилтны жагсаалт.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96 rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-background/95 backdrop-blur">
              <TableRow>
                <TableHead className="w-[150px]">Ажилтны код</TableHead>
                <TableHead>Ажилтны нэр</TableHead>
                <TableHead className="text-right">Ажилд орсон огноо</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-28 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              {!isLoading && sortedEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-mono">{employee.employeeCode}</TableCell>
                  <TableCell className="font-medium">{employee.firstName} {employee.lastName}</TableCell>
                  <TableCell className="text-right">
                    {employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && sortedEmployees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    Ажилтны бүртгэл олдсонгүй.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
