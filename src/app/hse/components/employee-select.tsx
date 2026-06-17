'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useHseEmployees } from './use-hse-employees';

export function EmployeeSelect({
    value,
    onChange,
    placeholder = 'Ажилтан сонгох...',
    disabled,
}: {
    value?: string;
    onChange: (id: string) => void;
    placeholder?: string;
    disabled?: boolean;
}) {
    const { options } = useHseEmployees();
    return (
        <SearchableSelect
            options={options.map((o) => ({ value: o.id, label: o.name, description: o.jobTitle }))}
            value={value}
            onValueChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
        />
    );
}

export function EmployeeMultiSelect({
    value,
    onChange,
    placeholder = 'Ажилтнууд сонгох...',
}: {
    value: string[];
    onChange: (ids: string[]) => void;
    placeholder?: string;
}) {
    const { options, nameOf } = useHseEmployees();
    const [open, setOpen] = React.useState(false);

    const toggle = (id: string) => {
        onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-auto min-h-10">
                    <span className="flex flex-wrap gap-1 items-center text-left">
                        {value.length === 0 ? (
                            <span className="text-muted-foreground">{placeholder}</span>
                        ) : (
                            value.map((id) => (
                                <Badge key={id} variant="secondary" className="gap-1">
                                    {nameOf(id)}
                                    <X
                                        className="h-3 w-3 cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggle(id);
                                        }}
                                    />
                                </Badge>
                            ))
                        )}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Хайх..." />
                    <CommandList>
                        <CommandEmpty>Ажилтан олдсонгүй</CommandEmpty>
                        <CommandGroup>
                            {options.map((o) => (
                                <CommandItem key={o.id} value={o.name} onSelect={() => toggle(o.id)}>
                                    <Check className={cn('mr-2 h-4 w-4', value.includes(o.id) ? 'opacity-100' : 'opacity-0')} />
                                    {o.name}
                                    {o.jobTitle && <span className="ml-2 text-xs text-muted-foreground">{o.jobTitle}</span>}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
