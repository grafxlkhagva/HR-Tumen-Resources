'use client';

import * as React from 'react';
import { Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function MentoringPage() {
    const router = useRouter();

    return (
        <div className="flex flex-col min-h-screen bg-muted/20 pb-20">
            {/* Header */}
            <header className="bg-white px-6 py-6 border-b sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                        <Users className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900">Чиглүүлэг</h1>
                        <p className="text-sm text-slate-500 font-medium">Танд оноогдсон даалгаврууд</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-indigo-400" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-slate-900">Түр хаагдсан</h2>
                    <p className="text-sm text-slate-500 max-w-xs mx-auto">
                        Системийн шинэчлэлтэй холбоотойгоор чиглүүлэгийн хэсэг түр ажиллахгүй байна. Тун удахгүй шинэчлэгдэн орох болно.
                    </p>
                </div>
                <Button
                    onClick={() => router.push('/mobile/home')}
                    variant="outline"
                    className="rounded-xl"
                >
                    Нүүр хуудас руу буцах
                </Button>
            </div>
        </div>
    );
}
