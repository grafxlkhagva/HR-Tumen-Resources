
'use client';

import * as React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check, Clock, Play, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssignedTask } from './AssignProgramDialog';

type TaskStatus = AssignedTask['status'];

const statusConfig: Record<TaskStatus, { label: string; icon: React.ElementType; className: string }> = {
  TODO: { label: 'Хийх', icon: Circle, className: 'text-muted-foreground' },
  IN_PROGRESS: { label: 'Хийж байна', icon: Play, className: 'text-blue-500' },
  DONE: { label: 'Дууссан', icon: Check, className: 'text-green-500' },
  VERIFIED: { label: 'Баталгаажсан', icon: Check, className: 'text-green-700 font-bold' },
};

interface TaskStatusDropdownProps {
  currentStatus: TaskStatus;
  onStatusChange: (newStatus: TaskStatus) => void;
  disabled?: boolean;
}

export function TaskStatusDropdown({ currentStatus, onStatusChange, disabled = false }: TaskStatusDropdownProps) {
  const currentConfig = statusConfig[currentStatus];
  const CurrentIcon = currentConfig.icon;

  const selectableStatuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button variant="outline" size="sm" className={cn("gap-2 w-40 justify-start", currentConfig.className)}>
          <CurrentIcon className="h-4 w-4" />
          <span className="flex-1 text-left">{currentConfig.label}</span>
          <ChevronDown className="h-4 w-4 opacity-50 ml-auto" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={currentStatus} onValueChange={(value) => onStatusChange(value as TaskStatus)}>
          {selectableStatuses.map((status) => {
            const config = statusConfig[status];
            const Icon = config.icon;
            return (
              <DropdownMenuRadioItem key={status} value={status} className={cn("gap-2", config.className)}>
                <Icon className="h-4 w-4" />
                {config.label}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
