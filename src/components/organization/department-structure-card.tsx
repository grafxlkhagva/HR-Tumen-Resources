'use client';

import * as React from 'react';
import { CheckCircle, ChevronRight, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type DepartmentStructureCardData = {
  id: string;
  name: string;
  typeName?: string;
  approvedCount?: number;
  filled?: number;
  color?: string;
  status?: 'active' | 'inactive';
  isRoot?: boolean;
};

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#64748b', // slate
  '#0f172a', // dark
];

function getContrastColor(hexColor: string | undefined) {
  if (!hexColor || hexColor === 'transparent') return undefined;
  const hex = hexColor.replace('#', '');
  if (hex.length < 6) return '#ffffff';
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 180 ? '#0f172a' : '#ffffff';
}

function normalizeHexColor(input: string | undefined, fallback = '#3b82f6') {
  if (!input) return fallback;
  const raw = input.trim();
  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  const isValid = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(withHash);
  if (!isValid) return fallback;
  // Expand 3-digit hex to 6-digit for <input type="color" />
  if (withHash.length === 4) {
    const r = withHash[1];
    const g = withHash[2];
    const b = withHash[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return withHash.toLowerCase();
}

export function DepartmentStructureCard({
  department,
  selected,
  actionsVisibility = 'hover',
  topLeftActions,
  topActions,
  showOpenButton = true,
  onDepartmentClick,
  onDepartmentUpdate,
  details,
  className,
}: {
  department: DepartmentStructureCardData;
  selected?: boolean;
  actionsVisibility?: 'hover' | 'always';
  /** Actions rendered in top-left (e.g. Add) */
  topLeftActions?: React.ReactNode;
  /** Custom actions rendered in top-right toolbar (left of palette/open) */
  topActions?: React.ReactNode;
  /** Show the open/chevron button (default true) */
  showOpenButton?: boolean;
  onDepartmentClick?: (id: string) => void;
  onDepartmentUpdate?: (id: string, data: Partial<DepartmentStructureCardData>) => void;
  /** Extra details rendered inside the card (below stats) */
  details?: React.ReactNode;
  className?: string;
}) {
  const { id, name, typeName, approvedCount, filled, color: deptColor, status, isRoot } = department;
  const [customColor, setCustomColor] = React.useState<string>(() => normalizeHexColor(deptColor));

  React.useEffect(() => {
    setCustomColor(normalizeHexColor(deptColor));
  }, [deptColor]);

  const backgroundColor = deptColor || (isRoot ? 'hsl(var(--primary))' : undefined);
  const hasCustomBg = !!backgroundColor;
  const textColor = getContrastColor(backgroundColor?.startsWith('hsl') ? undefined : backgroundColor);

  const totalPositions = approvedCount || 0;
  const filledPositions = filled || 0;
  const fillRate = totalPositions > 0 ? Math.round((filledPositions / totalPositions) * 100) : 0;
  const vacantPositions = totalPositions - filledPositions;
  const isDarkBg = hasCustomBg ? textColor === '#ffffff' : false;

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className={cn(
          'relative z-10 w-64 rounded-2xl border shadow-lg transition-all group overflow-hidden',
          selected && 'ring-2 ring-primary/50',
          isRoot && 'w-72',
          !hasCustomBg && 'bg-card text-card-foreground border-border/30',
          hasCustomBg && 'border-white/10',
          className
        )}
        style={{
          backgroundColor: backgroundColor || undefined,
          color: textColor || undefined,
        }}
      >
        {/* Top Section */}
        <div
          className={cn(
            'p-4 pb-3',
            topLeftActions ? 'pl-12' : '',
            hasCustomBg ? 'border-b border-white/10' : 'border-b border-border/30'
          )}
        >
          {/* Top-left actions */}
          {topLeftActions ? (
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
              {topLeftActions}
            </div>
          ) : null}

          {/* Top Toolbar */}
          <div
            className={cn(
              'absolute top-2 right-2 flex items-center gap-1 transition-opacity z-10',
              actionsVisibility === 'always' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
          >
            {topActions ? <div className="flex items-center gap-1">{topActions}</div> : null}
            <Popover>
              <PopoverTrigger asChild>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-7 w-7 rounded-lg',
                        hasCustomBg ? 'hover:bg-white/20 text-current' : 'hover:bg-muted text-muted-foreground'
                      )}
                      aria-label="Өнгө"
                    >
                      <Palette className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs font-semibold">Өнгө</div>
                  </TooltipContent>
                </Tooltip>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3 rounded-xl shadow-xl" align="end">
                <div className="space-y-3">
                  {/* Custom color */}
                  <div className="flex items-center gap-2">
                    <input
                      aria-label="Pick color"
                      type="color"
                      value={customColor}
                      onChange={(e) => {
                        const next = normalizeHexColor(e.target.value);
                        setCustomColor(next);
                        onDepartmentUpdate?.(id, { color: next });
                      }}
                      className="h-8 w-10 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-medium text-muted-foreground">Өнгөний код</div>
                      <input
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        onBlur={() => {
                          const next = normalizeHexColor(customColor);
                          setCustomColor(next);
                          onDepartmentUpdate?.(id, { color: next });
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter') return;
                          const next = normalizeHexColor(customColor);
                          setCustomColor(next);
                          onDepartmentUpdate?.(id, { color: next });
                        }}
                        className={cn(
                          'mt-0.5 h-8 w-full rounded-md border px-2 text-xs font-mono',
                          'bg-background/70 focus:outline-none focus:ring-2 focus:ring-primary/30',
                          hasCustomBg ? 'border-white/15 text-current placeholder:text-current/60' : 'border-border'
                        )}
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>

                  {/* Presets */}
                  <div className="grid grid-cols-7 gap-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        className={cn(
                          'h-6 w-6 rounded-md border border-white/20 transition-transform hover:scale-110',
                          normalizeHexColor(deptColor) === normalizeHexColor(c) && 'ring-2 ring-primary ring-offset-1'
                        )}
                        style={{ backgroundColor: c }}
                        onClick={() => {
                          const next = normalizeHexColor(c);
                          setCustomColor(next);
                          onDepartmentUpdate?.(id, { color: next });
                        }}
                        aria-label={`Set color ${c}`}
                      />
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {showOpenButton ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'h-7 w-7 rounded-lg',
                      hasCustomBg ? 'hover:bg-white/20 text-current' : 'hover:bg-muted text-muted-foreground'
                    )}
                    onClick={() => onDepartmentClick?.(id)}
                    aria-label="Дэлгэрэнгүй"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs font-semibold">Дэлгэрэнгүй</div>
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p
                className={cn(
                  'font-bold tracking-tight line-clamp-2 pr-12',
                  isRoot ? 'text-base' : 'text-sm',
                  !hasCustomBg && 'text-card-foreground'
                )}
              >
                {name}
              </p>
              {status === 'active' && (
                <CheckCircle className={cn('shrink-0 h-3.5 w-3.5', hasCustomBg ? 'text-current opacity-80' : 'text-emerald-500')} />
              )}
            </div>
            {typeName && (
              <p className={cn('text-[11px] font-medium mt-0.5', hasCustomBg ? 'text-current opacity-70' : 'text-muted-foreground')}>
                {typeName}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="p-3 space-y-2.5">
          <div className="space-y-1.5">
            <div className={cn('flex items-center justify-between text-[11px] font-medium', hasCustomBg ? 'text-current opacity-85' : 'text-slate-600')}>
              <span>Батлагдсан ажлын байр</span>
              <span className={cn('font-semibold', hasCustomBg ? 'text-current opacity-100' : 'text-slate-900')}>{totalPositions}</span>
            </div>
            <div className={cn('flex items-center justify-between text-[11px] font-medium', hasCustomBg ? 'text-current opacity-85' : 'text-slate-600')}>
              <span>Томилогдсон</span>
              <span className={cn('font-semibold', hasCustomBg ? 'text-current opacity-100' : 'text-slate-900')}>{filledPositions}</span>
            </div>
            <div className={cn('flex items-center justify-between text-[11px] font-medium', hasCustomBg ? 'text-current opacity-85' : 'text-slate-600')}>
              <span>Сул орон тоо</span>
              <span className={cn('font-semibold', hasCustomBg ? 'text-current opacity-100' : 'text-slate-900')}>{Math.max(0, vacantPositions)}</span>
            </div>
          </div>

          {totalPositions > 0 && (
            <div className="space-y-2">
              <div className={cn('flex items-center justify-between text-[10px] font-medium', isDarkBg ? 'text-white/70' : 'text-slate-600')}>
                <span>Бүрдүүлэлт</span>
                <span>{Math.max(0, Math.min(100, Math.round(fillRate)))}%</span>
              </div>
              <div className={cn('h-1.5 w-full overflow-hidden rounded-full', isDarkBg ? 'bg-white/15' : 'bg-slate-200')}>
                <div
                  className={cn('h-full', isDarkBg ? 'bg-white/70' : 'bg-slate-900')}
                  style={{ width: `${Math.max(0, Math.min(100, Math.round(fillRate)))}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {details ? (
          <div className={cn('px-3 pb-3', hasCustomBg ? 'text-current' : 'text-slate-900')}>
            <div className={cn('pt-3', hasCustomBg ? 'border-t border-white/10' : 'border-t border-border/30')}>
              {details}
            </div>
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  );
}

