'use client';

import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Check, Copy } from 'lucide-react';
import { ALL_DYNAMIC_FIELDS } from '@/app/dashboard/employment-relations/data/field-dictionary';

const CATEGORIES = [
    { id: 'Employee', label: 'Ажилтан', icon: '👤' },
    { id: 'Department', label: 'Албан нэгж', icon: '👥' },
    { id: 'Company', label: 'Байгууллага', icon: '🏢' },
    { id: 'System', label: 'Систем', icon: '⚙️' },
] as const;

const LETTER_FIELDS = ALL_DYNAMIC_FIELDS.filter(f =>
    ['Employee', 'Department', 'Company', 'System'].includes(f.group)
);

interface VariablePanelProps {
    onInsert: (field: string) => void;
    className?: string;
    height?: number;
}

export function VariablePanel({ onInsert, className, height = 360 }: VariablePanelProps) {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<string>('Employee');
    const [copied, setCopied] = useState<string | null>(null);

    const filtered = useMemo(() => {
        let fields = LETTER_FIELDS.filter(f => f.group === category);
        if (search) {
            const lower = search.toLowerCase();
            fields = fields.filter(f =>
                f.label.toLowerCase().includes(lower) ||
                f.key.toLowerCase().includes(lower),
            );
        }
        return fields;
    }, [category, search]);

    const handleClick = (key: string) => {
        onInsert(key);
        setCopied(key);
        setTimeout(() => setCopied(null), 1000);
    };

    return (
        <div className={`border rounded-lg overflow-hidden bg-white ${className || ''}`}>
            <div className="p-3 bg-muted/50 border-b space-y-2">
                <p className="text-xs font-semibold">Хувьсагч оруулах</p>
                <div className="grid grid-cols-2 gap-1">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => { setCategory(cat.id); setSearch(''); }}
                            className={`text-xs py-1.5 px-2 rounded-md border transition-colors text-left ${
                                category === cat.id
                                    ? 'bg-slate-800 text-white border-slate-800'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                            }`}
                        >
                            <span className="mr-1">{cat.icon}</span>{cat.label}
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Хайх..."
                        className="h-7 pl-7 text-xs"
                    />
                </div>
            </div>
            <ScrollArea style={{ height }}>
                <div className="p-2 space-y-0.5">
                    {filtered.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-6">Олдсонгүй</p>
                    ) : filtered.map((field, i) => (
                        <button
                            key={`${field.key}-${i}`}
                            onClick={() => handleClick(field.key)}
                            className="w-full text-left group flex flex-col gap-0.5 rounded-md p-2 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-700 group-hover:text-primary">{field.label}</span>
                                {copied === field.key
                                    ? <Check className="h-3 w-3 text-green-500" />
                                    : <Copy className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                            </div>
                            <code className="text-[10px] text-slate-400">{field.key}</code>
                        </button>
                    ))}
                </div>
            </ScrollArea>
            <div className="border-t p-2 text-center text-[10px] text-muted-foreground">
                {filtered.length} хувьсагч
            </div>
        </div>
    );
}
