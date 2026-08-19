'use client';

import * as React from 'react';
import { Bookmark, BookmarkPlus, Check, Trash2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useSavedViews, type SavedView } from '../_lib/use-saved-views';

interface SavedViewsProps<T> {
    /** Жагсаалтын өвөрмөц key (localStorage). */
    viewKey: string;
    /** Одоогийн шүүлтүүрийн төлөв (хадгалахад). */
    current: T;
    /** View сонгоход төлөвийг сэргээнэ. */
    onApply: (state: T) => void;
    /** Одоо ямар нэг шүүлтүүр идэвхтэй эсэх (хадгалах товч идэвхжүүлэх). */
    hasActive?: boolean;
    /** Идэвхтэй view-ийн нэрийг тодруулахад ашиглах харьцуулагч. */
    isActive?: (state: T) => boolean;
}

export function SavedViews<T>({
    viewKey,
    current,
    onApply,
    hasActive,
    isActive,
}: SavedViewsProps<T>) {
    const { views, saveView, deleteView } = useSavedViews<T>(viewKey);
    const [open, setOpen] = React.useState(false);
    const [naming, setNaming] = React.useState(false);
    const [name, setName] = React.useState('');

    const doSave = () => {
        saveView(name, current);
        setName('');
        setNaming(false);
        setOpen(false);
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5">
                    <Bookmark className="h-4 w-4" />
                    View
                    {views.length > 0 && (
                        <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground">
                            {views.length}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Хадгалсан шүүлтүүр</DropdownMenuLabel>
                {views.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        Хадгалсан view алга.
                    </div>
                )}
                {views.map((v: SavedView<T>) => {
                    const active = isActive?.(v.state);
                    return (
                        <DropdownMenuItem
                            key={v.id}
                            onSelect={(e) => {
                                e.preventDefault();
                                onApply(v.state);
                                setOpen(false);
                            }}
                            className="flex items-center gap-2"
                        >
                            {active ? (
                                <Check className="h-3.5 w-3.5 text-cyan-600" />
                            ) : (
                                <span className="w-3.5" />
                            )}
                            <span className={cn('flex-1 truncate', active && 'font-medium')}>
                                {v.name}
                            </span>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteView(v.id);
                                }}
                                className="text-muted-foreground hover:text-rose-600"
                                aria-label="Устгах"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </DropdownMenuItem>
                    );
                })}

                <DropdownMenuSeparator />

                {naming ? (
                    <div className="flex items-center gap-1.5 p-1.5">
                        <Input
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') doSave();
                                if (e.key === 'Escape') setNaming(false);
                            }}
                            placeholder="View нэр..."
                            className="h-7 text-sm"
                        />
                        <Button size="sm" className="h-7 px-2" onClick={doSave} disabled={!name.trim()}>
                            <Check className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                ) : (
                    <DropdownMenuItem
                        disabled={!hasActive}
                        onSelect={(e) => {
                            e.preventDefault();
                            setNaming(true);
                        }}
                        className="gap-2 text-cyan-700"
                    >
                        <BookmarkPlus className="h-4 w-4" />
                        Одоогийн шүүлтүүрийг хадгалах
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
