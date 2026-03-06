'use client';

import { DAY_TYPE_CONFIGS, DayTypeConfig } from '../types';
import { cn } from '@/lib/utils';

interface CalendarLegendProps {
    configs?: DayTypeConfig[];
    compact?: boolean;
    showIndicators?: boolean;
}

export function CalendarLegend({ 
    configs = DAY_TYPE_CONFIGS, 
    compact = false,
    showIndicators = true 
}: CalendarLegendProps) {
    return (
        <div className="space-y-3">
            {/* Өдрийн төрлүүд */}
            <div className={cn('flex flex-wrap gap-x-6 gap-y-2 items-center', compact && 'gap-x-4 gap-y-1')}>
                {configs.map((config) => (
                    <div key={config.type} className="flex items-center gap-2">
                        <div 
                            className={cn(
                                'rounded border',
                                config.bgColor,
                                config.borderColor,
                                compact ? 'w-3 h-3' : 'w-4 h-4'
                            )}
                        />
                        <span className={cn('text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
                            {config.label}
                        </span>
                    </div>
                ))}
            </div>

            {/* Индикаторууд */}
            {showIndicators && (
                <div className={cn('flex flex-wrap gap-x-6 gap-y-2 items-center', compact && 'gap-x-4 gap-y-1')}>
                    <div className="flex items-center gap-2">
                        <div className={cn('rounded-full bg-pink-500', compact ? 'w-2 h-2' : 'w-2.5 h-2.5')} />
                        <span className={cn('text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
                            Үйл явдал
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={cn('rounded-full bg-purple-500', compact ? 'w-2 h-2' : 'w-2.5 h-2.5')} />
                        <span className={cn('text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
                            Тэмдэглэл
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
