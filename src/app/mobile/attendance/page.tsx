'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ArrowRight, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { mn } from 'date-fns/locale';

export default function AttendancePage() {
    const [currentTime, setCurrentTime] = React.useState(new Date());

    React.useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const today = format(currentTime, 'yyyy оны MM-р сарын dd, EEEE', { locale: mn });
    const time = format(currentTime, 'HH:mm:ss');

    return (
        <div className="p-4 space-y-6 animate-in fade-in-50">
            <header className="py-4">
                <h1 className="text-2xl font-bold">Цагийн бүртгэл</h1>
            </header>

            <Card className="text-center">
                <CardHeader>
                    <p className="text-sm text-muted-foreground">{today}</p>
                    <CardTitle className="text-5xl font-bold tracking-tighter">{time}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <Button size="lg" className="h-16 text-lg bg-green-500 hover:bg-green-600">
                        <ArrowRight className="mr-2 h-6 w-6" />
                        Ирсэн
                    </Button>
                    <Button size="lg" variant="destructive" className="h-16 text-lg">
                        <ArrowLeft className="mr-2 h-6 w-6" />
                        Явсан
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Өнөөдрийн түүх</CardTitle>
                </CardHeader>
                <CardContent>
                     <div className="text-center text-muted-foreground py-8">
                        <Clock className="mx-auto h-12 w-12" />
                        <p className="mt-4">Өнөөдөр бүртгэл хийгдээгүй байна.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
