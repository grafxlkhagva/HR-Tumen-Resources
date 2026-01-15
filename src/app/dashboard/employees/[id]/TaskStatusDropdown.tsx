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
import { ChevronDown, Check, Play, Circle, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssignedTask } from './AssignProgramDialog';

type TaskStatus = AssignedTask['status'];

const statusConfig: Record<TaskStatus, { label: string; icon: React.ElementType; className: string; bg: string }> = {
  TODO: {
    label: 'Хийх',
    icon: Circle,
    className: 'text-slate-400',
    bg: 'bg-slate-50 border-slate-200'
  },
  IN_PROGRESS: {
    label: 'Хийж байна',
    icon: Play,
    className: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-100'
  },
  DONE: {
    label: 'Дууссан',
    icon: Check,
    className: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-100'
  },
  VERIFIED: {
    label: 'Батлагдсан',
    icon: ShieldCheck,
    className: 'text-indigo-600',
    bg: 'bg-indigo-50 border-indigo-100'
  },
};

interface TaskStatusDropdownProps {
  currentStatus: TaskStatus;
  onStatusChange: (newStatus: TaskStatus) => void;
  disabled?: boolean;
  requiresVerification?: boolean;
}

export function TaskStatusDropdown({ currentStatus, onStatusChange, disabled = false, requiresVerification = false }: TaskStatusDropdownProps) {
  const currentConfig = statusConfig[currentStatus];
  const CurrentIcon = currentConfig.icon;

  const selectableStatuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

  if (requiresVerification) {
    selectableStatuses.push('VERIFIED');
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-2 px-3 justify-start rounded-lg transition-all hover:bg-white hover:shadow-sm",
            currentConfig.bg,
            currentConfig.className
          )}
        >
          <CurrentIcon className="h-3.5 w-3.5 fill-current opacity-70" />
          <span className="flex-1 text-left text-[10px] font-bold uppercase tracking-wider">{currentConfig.label}</span>
          <ChevronDown className="h-3 w-3 opacity-30 ml-auto" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48 p-2 rounded-2xl border-slate-100 shadow-xl" align="end">
        <DropdownMenuRadioGroup value={currentStatus} onValueChange={(value) => onStatusChange(value as TaskStatus)}>
          {selectableStatuses.map((status) => {
            const config = statusConfig[status];
            const Icon = config.icon;
            return (
              <DropdownMenuRadioItem
                key={status}
                value={status}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 my-0.5 rounded-xl cursor-pointer transition-colors focus:bg-slate-50",
                  config.className
                )}
              >
                <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", config.bg.split(' ')[0])}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider flex-1">
                  {config.label}
                </span>
                {currentStatus === status && <Check className="h-3.5 w-3.5 opacity-50" />}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
