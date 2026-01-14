'use client';

import * as React from 'react';

import { ReactFlowProvider } from 'reactflow';

export default function EmploymentRelationsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
            <ReactFlowProvider>
                {children}
            </ReactFlowProvider>
        </div>
    );
}
