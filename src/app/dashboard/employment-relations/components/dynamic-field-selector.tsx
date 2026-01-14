"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search, Braces } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ALL_DYNAMIC_FIELDS, FieldDefinition } from "../data/field-dictionary"
import { Badge } from "@/components/ui/badge"

interface DynamicFieldSelectorProps {
    onSelect: (field: string) => void;
}

export function DynamicFieldSelector({ onSelect }: DynamicFieldSelectorProps) {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")

    const groups = Array.from(new Set(ALL_DYNAMIC_FIELDS.map(f => f.group)));

    const filteredFields = React.useMemo(() => {
        if (!search) return ALL_DYNAMIC_FIELDS;
        const lower = search.toLowerCase();
        return ALL_DYNAMIC_FIELDS.filter(f =>
            f.label.toLowerCase().includes(lower) ||
            f.key.toLowerCase().includes(lower) ||
            f.example?.toLowerCase().includes(lower)
        );
    }, [search]);

    const handleSelect = (field: string) => {
        onSelect(field);
        setOpen(false);
        setSearch("");
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-[300px] justify-between text-muted-foreground hover:text-foreground">
                    <span className="flex items-center gap-2">
                        <Braces className="h-4 w-4" />
                        Талбар оруулах...
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="end">
                <div className="flex items-center border-b px-3">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <Input
                        placeholder="Талбар хайх (Жишээ нь: Нэр, Цалин...)"
                        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground border-none shadow-none focus-visible:ring-0 px-0"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <ScrollArea className="h-[300px]">
                    <div className="p-1">
                        {filteredFields.length === 0 && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                Талбар олдсонгүй.
                            </div>
                        )}

                        {groups.map((group) => {
                            const groupFields = filteredFields.filter(f => f.group === group);
                            if (groupFields.length === 0) return null;

                            return (
                                <div key={group}>
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/30">
                                        {group}
                                    </div>
                                    {groupFields.map((field) => (
                                        <div
                                            key={field.key}
                                            onClick={() => handleSelect(field.key)}
                                            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                        >
                                            <div className="flex flex-col w-full gap-1">
                                                <div className="flex w-full items-center justify-between">
                                                    <span className="font-medium">{field.label}</span>
                                                    <span className="font-mono text-[10px] text-muted-foreground bg-slate-100 px-1.5 py-0.5 rounded border">
                                                        {field.key}
                                                    </span>
                                                </div>
                                                {field.example && (
                                                    <span className="text-xs text-muted-foreground truncate w-full opacity-80">
                                                        Жишээ: {field.example}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <Separator className="my-1 opacity-50" />
                                </div>
                            )
                        })}
                    </div>
                </ScrollArea>
                <div className="border-t p-2 text-xs text-center text-muted-foreground bg-muted/10">
                    Нийт {filteredFields.length} талбар
                </div>
            </PopoverContent>
        </Popover>
    )
}
