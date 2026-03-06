'use client';

import * as React from 'react';
import { Send, Coffee, History } from 'lucide-react';

interface QuickActionsProps {
    onRequestClick: () => void;
    onBreakClick: () => void;
    historySheetTrigger: React.ReactNode;
    isOnBreak?: boolean;
}

export function QuickActions({
    onRequestClick,
    onBreakClick,
    historySheetTrigger,
    isOnBreak = false
}: QuickActionsProps) {
    return (
        <div className="grid grid-cols-3 gap-4">
            <div
                className="flex flex-col items-center gap-2 cursor-pointer group active:scale-95 transition-all"
                onClick={onRequestClick}
            >
                <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Send className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Хүсэлт</span>
            </div>

            {historySheetTrigger}

            <div
                className="flex flex-col items-center gap-2 cursor-pointer group active:scale-95 transition-all"
                onClick={onBreakClick}
            >
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform ${
                    isOnBreak 
                        ? 'bg-green-100 text-green-600 animate-pulse' 
                        : 'bg-purple-50 text-purple-600'
                }`}>
                    <Coffee className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                    {isOnBreak ? 'Амралт дууслаа' : 'Амралт'}
                </span>
            </div>
        </div>
    );
}
