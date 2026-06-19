'use client';

import * as React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

/**
 * Олон сонголттой checkbox бүлэг — сонгосон утгуудыг string[] хэлбэрээр хадгална.
 * Маягтын checkbox хэсгүүдэд (биеийн байдал, ICAM хүчин зүйлс гэх мэт) ашиглана.
 */
export function CheckGroup({
    options,
    value,
    onChange,
    columns = 2,
}: {
    options: readonly string[];
    value: string[];
    onChange: (next: string[]) => void;
    columns?: 1 | 2 | 3;
}) {
    const toggle = (opt: string) => {
        onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
    };

    const colClass =
        columns === 3 ? 'sm:grid-cols-3' : columns === 2 ? 'sm:grid-cols-2' : 'grid-cols-1';

    return (
        <div className={cn('grid gap-x-4 gap-y-2', colClass)}>
            {options.map((opt) => {
                const checked = value.includes(opt);
                return (
                    <label
                        key={opt}
                        className={cn(
                            'flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-caption transition-colors',
                            checked ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                        )}
                    >
                        <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggle(opt)}
                            className="mt-0.5"
                        />
                        <span className="leading-snug">{opt}</span>
                    </label>
                );
            })}
        </div>
    );
}
