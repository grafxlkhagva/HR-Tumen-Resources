'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CurrencyInputProps {
    value: number;
    onValueChange: (value: number) => void;
    className?: string;
    placeholder?: string;
    suffix?: string;
    disabled?: boolean;
}

export function CurrencyInput({
    value,
    onValueChange,
    className,
    placeholder,
    suffix = '₮',
    disabled = false
}: CurrencyInputProps) {
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
        // Update display value when the prop value changes externally
        if (value === 0 && displayValue === '') return;
        const formatted = value.toLocaleString();
        if (formatted !== displayValue.replace(/,/g, '')) {
            setDisplayValue(formatted);
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/,/g, '');

        // Only allow numbers
        if (rawValue !== '' && !/^\d+$/.test(rawValue)) return;

        if (rawValue === '') {
            setDisplayValue('');
            onValueChange(0);
            return;
        }

        const numValue = parseInt(rawValue, 10);
        setDisplayValue(numValue.toLocaleString());
        onValueChange(numValue);
    };

    return (
        <div className="relative w-full">
            <Input
                type="text"
                value={displayValue}
                onChange={handleChange}
                disabled={disabled}
                placeholder={placeholder}
                className={cn("pr-8 font-bold", className)}
            />
            {suffix && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground/50 pointer-events-none">
                    {suffix}
                </span>
            )}
        </div>
    );
}
