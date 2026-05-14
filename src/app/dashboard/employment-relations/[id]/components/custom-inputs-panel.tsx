'use client';

/**
 * custom-inputs-panel.tsx
 *
 * Template-ийн `customInputs`-ыг sidebar-т жижиг form болгон гаргах panel.
 * Boolean нь Switch, date/number/text нь Input-аар controlled render хийнэ.
 *
 * Phase 3 extraction — `[id]/page.tsx`-ээс хуваав. Зан үйл өөрчлөгдөөгүй.
 */

import React from 'react';
import { Wand2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { ERTemplate } from '../../types';

interface CustomInputsPanelProps {
    customInputs: NonNullable<ERTemplate['customInputs']>;
    values: Record<string, unknown>;
    onChange: (next: Record<string, unknown>) => void;
}

function CustomInputsPanelImpl({ customInputs, values, onChange }: CustomInputsPanelProps) {
    if (!customInputs || customInputs.length === 0) return null;

    const sorted = [...customInputs].sort((a, b) => (a.order || 0) - (b.order || 0));

    return (
        <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b bg-primary/5 flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Нэмэлт утгууд</span>
            </div>
            <div className="p-4 space-y-3">
                {sorted.map((input, idx) => (
                    <div key={`${input.key || 'input'}-${input.order ?? idx}`} className="space-y-1">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs text-slate-600">
                                {input.label}{' '}
                                {input.required && <span className="text-rose-500">*</span>}
                            </Label>
                            {input.type === 'boolean' && (
                                <Switch
                                    checked={values[input.key] === 'Тийм'}
                                    onCheckedChange={(c) =>
                                        onChange({
                                            ...values,
                                            [input.key]: c ? 'Тийм' : 'Үгүй',
                                        })
                                    }
                                />
                            )}
                        </div>
                        {input.type !== 'boolean' && (
                            <Input
                                type={
                                    input.type === 'number'
                                        ? 'number'
                                        : input.type === 'date'
                                            ? 'date'
                                            : 'text'
                                }
                                value={String(values[input.key] ?? '')}
                                onChange={(e) =>
                                    onChange({ ...values, [input.key]: e.target.value })
                                }
                                placeholder={input.description || `${input.label}...`}
                                className="h-8 text-xs"
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export const CustomInputsPanel = React.memo(CustomInputsPanelImpl);
