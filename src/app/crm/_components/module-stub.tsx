'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface ModuleStubProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    primaryAction?: { label: string };
}

export function ModuleStub({ icon, title, description, primaryAction }: ModuleStubProps) {
    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b px-6 py-4">
                <div>
                    <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                {primaryAction && (
                    <Button size="sm" className="bg-cyan-600 hover:bg-cyan-600/90" disabled>
                        <Plus className="h-4 w-4 mr-1.5" />
                        {primaryAction.label}
                    </Button>
                )}
            </header>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/30 px-6 py-16 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10">
                        {icon}
                    </div>
                    <h2 className="text-base font-semibold">{title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Энэ хэсэг Phase 1-д хөгжүүлэгдэнэ. Хүснэгт, шүүлтүүр, бичлэгийн дэлгэрэнгүй хуудас удахгүй нэмэгдэнэ.
                    </p>
                </div>
            </div>
        </div>
    );
}
