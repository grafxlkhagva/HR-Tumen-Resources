"use client"

import * as React from "react"
import { Search, Copy, Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ALL_DYNAMIC_FIELDS, FieldDefinition } from "../data/field-dictionary"

interface DynamicFieldSelectorProps {
    onSelect: (field: string) => void;
    customFields?: { key: string; label: string; example?: string; type?: string }[];
}

const CATEGORIES = [
    { id: 'Company', label: 'Байгууллага', icon: '🏢' },
    { id: 'Employee', label: 'Ажилтан', icon: '👤' },
    { id: 'Position', label: 'Ажлын байр', icon: '💼' },
    { id: 'Department', label: 'Албан нэгж', icon: '👥' },
    { id: 'System', label: 'Систем', icon: '⚙️' },
    { id: 'Custom', label: 'Өөрийн', icon: '✨' },
] as const;

export function DynamicFieldSelector({ onSelect, customFields }: DynamicFieldSelectorProps) {
    const [activeCategory, setActiveCategory] = React.useState<string>('Company');
    const [search, setSearch] = React.useState("")
    const [copiedField, setCopiedField] = React.useState<string | null>(null);

    const filteredFields = React.useMemo(() => {
        let fields: any[] = [];

        if (activeCategory === 'Custom') {
            fields = customFields || [];
        } else {
            fields = ALL_DYNAMIC_FIELDS.filter(f => f.group === activeCategory);
        }

        if (search) {
            const lower = search.toLowerCase();
            fields = fields.filter(f =>
                f.label.toLowerCase().includes(lower) ||
                f.key.toLowerCase().includes(lower) ||
                (f.example && f.example.toLowerCase().includes(lower))
            );
        }
        return fields;
    }, [activeCategory, search, customFields]);

    const handleSelect = (field: string) => {
        onSelect(field);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 1000);
    };

    return (
        <div className="flex flex-col gap-4 w-full">
            {/* Category Selector */}
            <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                    <Button
                        key={cat.id}
                        variant={activeCategory === cat.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveCategory(cat.id)}
                        className={cn(
                            "justify-start h-9 px-2 text-xs",
                            activeCategory === cat.id ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                        )}
                    >
                        <span className="mr-2 opacity-70">{cat.icon}</span>
                        {cat.label}
                    </Button>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                    placeholder="Талбар хайх... (Ctrl+Shift+V)"
                    className="pl-8 h-9 text-xs"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    data-variable-search="true"
                />
            </div>

            {/* Fields List */}
            <div className="border rounded-lg bg-slate-50/50 overflow-hidden">
                <ScrollArea className="h-[400px]">
                    <div className="p-2 space-y-1">
                        {filteredFields.length === 0 ? (
                            <div className="py-8 text-center text-xs text-muted-foreground">
                                Талбар олдсонгүй
                            </div>
                        ) : (
                            filteredFields.map((field) => (
                                <button
                                    key={field.key}
                                    onClick={() => handleSelect(field.key)}
                                    className="w-full text-left group flex flex-col gap-1 rounded-md p-2 hover:bg-white hover:shadow-sm hover:border-slate-200 border border-transparent transition-all"
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span className="text-xs font-semibold text-slate-700 group-hover:text-primary">
                                            {field.label}
                                        </span>
                                        {copiedField === field.key ? (
                                            <Check className="h-3 w-3 text-green-500" />
                                        ) : (
                                            <Copy className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 w-full overflow-hidden mt-1">
                                        <code className="text-[10px] text-slate-500 bg-slate-100 px-1 rounded truncate">
                                            {field.key}
                                        </code>
                                        {field.type && (
                                            <span className="text-[9px] uppercase tracking-wider bg-indigo-50 text-indigo-600 px-1 rounded border border-indigo-100">
                                                {field.type}
                                            </span>
                                        )}
                                    </div>
                                    {field.example && (
                                        <span className="text-[10px] text-muted-foreground truncate w-full opacity-70">
                                            Жишээ: {field.example}
                                        </span>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </ScrollArea>
                <div className="bg-white border-t p-2 text-[10px] text-center text-muted-foreground">
                    Нийт {filteredFields.length} талбар
                </div>
            </div >
        </div >
    )
}
