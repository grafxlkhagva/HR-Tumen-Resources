'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center h-screen space-y-4 p-4 text-center">
            <h2 className="text-2xl font-bold">Системийн алдаа гарлаа</h2>
            <p className="text-muted-foreground max-w-md">{error.message}</p>
            <button
                onClick={() => reset()}
                className="px-4 py-2 bg-primary text-white rounded-md"
            >
                Дахин ачаалах
            </button>
            <pre className="mt-4 p-4 bg-slate-100 rounded text-left text-xs overflow-auto max-w-full">
                {error.stack}
            </pre>
        </div>
    );
}
