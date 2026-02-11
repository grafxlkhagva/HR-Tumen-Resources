'use client';

import React from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Mail,
  MoreHorizontal,
  Phone,
  ScrollText,
  Trash2,
  User,
  Cake,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Employee, LifecycleStage } from '@/types';

// Status config for detailed variant
const statusConfig: Record<string, { variant: 'success' | 'info' | 'warning' | 'error' | 'muted'; label: string; color: string }> = {
  'Идэвхтэй': { variant: 'success', label: 'Идэвхтэй', color: 'emerald' },
  'Идэвхтэй туршилт': { variant: 'warning', label: 'Туршилт', color: 'amber' },
  'Идэвхтэй үндсэн': { variant: 'success', label: 'Үндсэн', color: 'emerald' },
  'Түр эзгүй': { variant: 'info', label: 'Түр эзгүй', color: 'blue' },
  'Чөлөөлөгдөж буй': { variant: 'warning', label: 'Чөлөөлөгдөж буй', color: 'orange' },
  'Ажлаас гарсан': { variant: 'error', label: 'Гарсан', color: 'rose' },
  'Түр түдгэлзүүлсэн': { variant: 'muted', label: 'Түдгэлзсэн', color: 'slate' },
};

const lifecycleConfig: Record<string, { bg: string; text: string; label: string }> = {
  recruitment: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Бүрдүүлэлт' },
  onboarding: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Чиглүүлэх' },
  development: { bg: 'bg-violet-500/20', text: 'text-violet-400', label: 'Хөгжүүлэлт' },
  retention: { bg: 'bg-rose-500/20', text: 'text-rose-400', label: 'Тогтворжилт' },
  offboarding: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Чөлөөлөх' },
};

export type EmployeeCardEmployee = Pick<
  Employee,
  | 'id'
  | 'firstName'
  | 'lastName'
  | 'employeeCode'
  | 'photoURL'
  | 'questionnaireCompletion'
  | 'lifecycleStage'
  | 'jobTitle'
  | 'departmentId'
  | 'status'
  | 'email'
  | 'phoneNumber'
  | 'hireDate'
> & {
  departmentName?: string;
  /** Gender from questionnaire: 'male' | 'female' */
  gender?: string;
  /** Birth date from questionnaire (string, Date, or Firestore Timestamp) */
  birthDate?: any;
};

export interface EmployeeCardProps {
  employee: EmployeeCardEmployee;
  /** 'compact' - dashboard style (centered, minimal), 'detailed' - full info with actions */
  variant?: 'compact' | 'detailed';
  /** Custom footer content (e.g. "Томилогдоогүй" for unassigned) */
  footer?: React.ReactNode;
  /** Optional top-right actions (e.g. edit button) */
  topRightActions?: React.ReactNode;
  /** Control visibility of top-right actions */
  actionsVisibility?: 'hover' | 'always';
  /** Show built-in questionnaire shortcut icon (detailed variant) */
  showQuestionnaireAction?: boolean;
  /** Department name for detailed variant */
  departmentName?: string;
  /** Show questionnaire progress ring around avatar */
  showProgressRing?: boolean;
  /** Show lifecycle stage badge (compact variant) */
  showLifecycleBadge?: boolean;
  /** Delete handler - enables dropdown with delete option */
  onDelete?: (employee: EmployeeCardEmployee) => void;
  /** Additional class name */
  className?: string;
  /** Wrap content in Link to employee page */
  asLink?: boolean;
}

function AvatarWithProgress({
  employee,
  size = 72,
  avatarSize = 56,
  showRing = true,
  linkToProfile = true,
}: {
  employee?: EmployeeCardEmployee | null;
  size?: number;
  avatarSize?: number;
  showRing?: boolean;
  linkToProfile?: boolean;
}) {
  const quesProgress = employee?.questionnaireCompletion || 0;
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (quesProgress / 100) * circumference;
  const progressColor = quesProgress < 50 ? '#f43f5e' : quesProgress < 90 ? '#f59e0b' : '#10b981';

  const content = (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <div className="absolute inset-0 flex items-center justify-center">
        <Avatar
          className="border-2 border-white/50 dark:border-slate-800"
          style={{ width: avatarSize, height: avatarSize }}
        >
          <AvatarImage src={employee?.photoURL} alt={employee?.firstName} className="object-cover" />
          <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 dark:from-slate-800 dark:to-slate-700 dark:text-slate-300">
            {employee
              ? `${employee.firstName?.charAt(0) || ''}${employee.lastName?.charAt(0) || ''}`
              : null}
          </AvatarFallback>
        </Avatar>
      </div>
      {employee && showRing && (
        <svg
          className="absolute inset-0 pointer-events-none -rotate-90"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle
            stroke="rgba(0,0,0,0.05)"
            strokeWidth="3"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <circle
            stroke={progressColor}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
            style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
          />
        </svg>
      )}
    </div>
  );

  if (employee?.id && linkToProfile) {
    return <Link href={`/dashboard/employees/${employee.id}`}>{content}</Link>;
  }
  return content;
}

export function EmployeeCard({
  employee,
  variant = 'compact',
  footer,
  topRightActions,
  actionsVisibility,
  showQuestionnaireAction = true,
  departmentName,
  showProgressRing = true,
  showLifecycleBadge = true,
  onDelete,
  className,
  asLink = true,
}: EmployeeCardProps) {
  const statusStyle = employee.status
    ? statusConfig[employee.status] || { variant: 'muted' as const, label: employee.status, color: 'slate' }
    : null;
  const lifecycle = employee.lifecycleStage
    ? lifecycleConfig[employee.lifecycleStage as LifecycleStage]
    : null;
  const quesProgress = employee.questionnaireCompletion || 0;

  const deptName = departmentName || employee.departmentName;

  if (variant === 'compact') {
    const lifecyclePill =
      showLifecycleBadge && lifecycle ? (
        <span
          className={cn(
            // Plain text, aligned with employee code typography
            'text-[10px] font-mono tracking-wider whitespace-nowrap capitalize font-semibold',
            // keep semantic color but soften so it doesn't dominate
            lifecycle.text,
            'opacity-75'
          )}
        >
          {lifecycle.label}
        </span>
      ) : null;

    return (
      <div
        className={cn(
          'relative w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/70 overflow-hidden transition-all duration-300',
          'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.06),0_8px_20px_rgba(0,0,0,0.08)] hover:-translate-y-1',
          'hover:border-slate-300/80 dark:hover:border-slate-700',
          className
        )}
      >
        {/* Top-left meta (code + lifecycle), like PositionStructureCard */}
        {employee.employeeCode || lifecyclePill ? (
          <div className="absolute top-3 left-4 flex items-baseline gap-3 pointer-events-none">
            {employee.employeeCode ? (
              <div className="text-[10px] font-mono font-medium tracking-wider text-slate-500 dark:text-slate-400 opacity-80">
                {employee.employeeCode}
              </div>
            ) : null}
            {lifecyclePill ? <div className="opacity-90">{lifecyclePill}</div> : null}
          </div>
        ) : null}

        <div className="px-4 pb-4 pt-11">
          {/* Main row (horizontal, like PositionStructureCard) */}
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              <AvatarWithProgress
                employee={employee}
                size={72}
                avatarSize={56}
                showRing={showProgressRing}
                linkToProfile={asLink}
              />
            </div>

            <div className="min-w-0 flex-1">
              {asLink && employee.id ? (
                <Link href={`/dashboard/employees/${employee.id}`} className="block">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate leading-tight">
                      {(employee.lastName || '').trim()}
                    </div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight">
                      {(employee.firstName || '').trim()}
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate leading-tight">
                    {(employee.lastName || '').trim()}
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight">
                    {(employee.firstName || '').trim()}
                  </div>
                </div>
              )}

              <div className="mt-1 flex items-center gap-2 min-w-0">
                {employee.jobTitle ? (
                  <div className="text-xs text-slate-600 dark:text-slate-400 truncate">{employee.jobTitle}</div>
                ) : (
                  <div className="text-xs text-slate-600 dark:text-slate-400 truncate">Албан тушаал тодорхойгүй</div>
                )}
              </div>
            </div>
          </div>

          {footer !== undefined ? (
            <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-slate-800/70">
              <div className={cn('flex items-center justify-start', 'text-[10px] font-medium tracking-wide opacity-75', 'text-slate-700 dark:text-slate-200')}>
                {footer}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // Detailed variant (structure-card layout like PositionStructureCard / DepartmentStructureCard)
  const detailedLifecycle =
    showLifecycleBadge && lifecycle ? (
      <span
        className={cn(
          'text-[10px] font-mono tracking-wider whitespace-nowrap capitalize font-semibold',
          lifecycle.text,
          'opacity-75'
        )}
      >
        {lifecycle.label}
      </span>
    ) : null;

  const effectiveActionsVisibility: 'hover' | 'always' =
    actionsVisibility ?? (topRightActions ? 'always' : 'hover');

  return (
    <div
      className={cn(
        'relative rounded-2xl border overflow-hidden transition-all duration-300 group',
        'bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800/70',
        'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.06),0_8px_20px_rgba(0,0,0,0.08)] hover:-translate-y-1',
        'hover:border-slate-300/80 dark:hover:border-slate-700',
        className
      )}
    >
      {/* Click-anywhere overlay (avoid nested anchors) */}
      {asLink && employee.id ? (
        <Link href={`/dashboard/employees/${employee.id}`} className="absolute inset-0 z-0">
          <span className="sr-only">Ажилтан дэлгэрэнгүй</span>
        </Link>
      ) : null}

      {/* Top-left meta (code + lifecycle) */}
      {employee.employeeCode || detailedLifecycle ? (
        <div className="absolute top-3 left-4 z-10 flex items-baseline gap-3 pointer-events-none">
          {employee.employeeCode ? (
            <div className="text-[10px] font-mono font-medium tracking-wider text-slate-500 dark:text-slate-400 opacity-80">
              {employee.employeeCode}
            </div>
          ) : null}
          {detailedLifecycle ? <div className="opacity-90">{detailedLifecycle}</div> : null}
        </div>
      ) : null}

      {/* Top-right actions */}
      <TooltipProvider delayDuration={150}>
        {topRightActions || onDelete || (employee.id && asLink) ? (
          <div
            className={cn(
              'absolute top-3 right-3 z-30 flex items-center gap-1 transition-opacity pointer-events-auto',
              effectiveActionsVisibility === 'always' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
          >
            {/* Custom actions (e.g. edit) */}
            {topRightActions ? <div className="flex items-center gap-1">{topRightActions}</div> : null}

            {/* Questionnaire shortcut */}
            {employee.id && showQuestionnaireAction ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={`/dashboard/employees/${employee.id}/questionnaire`}
                    className={cn(
                      'h-8 w-8 rounded-lg flex items-center justify-center',
                      'hover:bg-muted text-muted-foreground'
                    )}
                    aria-label="Анкет"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <ScrollText className="h-4 w-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold">Анкет</div>
                    <div className="text-xs text-muted-foreground">Анкет руу очих</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : null}

            {/* More / delete menu */}
            {onDelete ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/employees/${employee.id}`}>Харах</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/employees/${employee.id}/edit`}>Засварлах</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(employee)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Устгах
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs font-semibold">Үйлдэл</div>
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        ) : null}
      </TooltipProvider>

      {/* Give room for meta + actions */}
      <div className="relative z-10 px-4 pb-4 pt-11 space-y-3">
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            <AvatarWithProgress
              employee={employee}
              size={84}
              avatarSize={64}
              showRing={showProgressRing}
              linkToProfile={false}
            />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
              {(employee.lastName || '').trim()}
            </div>
            <div className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight">
              {(employee.firstName || '').trim()}
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
              {employee.jobTitle || 'Албан тушаал тодорхойгүй'}
            </div>
            {deptName ? <div className="text-xs text-slate-500 dark:text-slate-500 truncate">{deptName}</div> : null}

            {(employee.phoneNumber || employee.email) ? (
              <div className="pt-1 space-y-1">
                {employee.phoneNumber ? (
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 truncate">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{employee.phoneNumber}</span>
                  </div>
                ) : null}
                {employee.email ? (
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 truncate">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{employee.email}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Gender & Age from questionnaire */}
            <GenderAgeBadge gender={employee.gender} birthDate={employee.birthDate} />
          </div>
        </div>

        {/* Footer (progress + status text), like PositionStructureCard */}
        <div className="pt-2 mt-1">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-medium text-slate-600 dark:text-slate-400">
              <span>Анкет</span>
              <span>{Math.max(0, Math.min(100, Math.round(quesProgress)))}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
              <div
                className="h-full bg-slate-900 dark:bg-white/70"
                style={{ width: `${Math.max(0, Math.min(100, Math.round(quesProgress)))}%` }}
              />
            </div>
          </div>

          {statusStyle?.label ? (
            <div className="mt-2 text-[10px] font-medium tracking-wide opacity-75 text-slate-700 dark:text-slate-200">
              {statusStyle.label}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Gender & Age badge helper ───────────────────────────────────────────────

function calcAgeFromBirthDate(birthDate: any): number | null {
  if (!birthDate) return null;
  let d: Date;
  if (typeof birthDate === 'string') {
    d = new Date(birthDate);
  } else if (birthDate instanceof Date) {
    d = birthDate;
  } else if (typeof birthDate === 'object' && 'seconds' in birthDate) {
    d = new Date(birthDate.seconds * 1000);
  } else {
    return null;
  }
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age >= 0 ? age : null;
}

function GenderAgeBadge({ gender, birthDate }: { gender?: string; birthDate?: any }) {
  const age = calcAgeFromBirthDate(birthDate);
  const hasGender = gender === 'male' || gender === 'female';
  if (!hasGender && age === null) return null;

  const isMale = gender === 'male';
  const genderLabel = isMale ? 'Эрэгтэй' : 'Эмэгтэй';
  const genderColor = isMale
    ? 'text-blue-600 dark:text-blue-400'
    : 'text-pink-600 dark:text-pink-400';
  const genderBg = isMale
    ? 'bg-blue-50 dark:bg-blue-950/30'
    : 'bg-pink-50 dark:bg-pink-950/30';

  return (
    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
      {hasGender && (
        <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium', genderBg, genderColor)}>
          <User className="h-3 w-3" />
          {genderLabel}
        </span>
      )}
      {age !== null && (
        <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
          <Cake className="h-3 w-3" />
          {age} нас
        </span>
      )}
    </div>
  );
}
