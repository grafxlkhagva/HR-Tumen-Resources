'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, getMonth, getDate, getYear } from 'date-fns';
import { mn } from 'date-fns/locale';
import { ReferenceTable, ReferenceItem } from '@/components/ui/reference-table';
import { AddHolidayDialog } from '../add-holiday-dialog';

export type PublicHoliday = ReferenceItem & {
    id: string;
    name: string;
    date?: string;
    isRecurring?: boolean;
    month?: number;
    day?: number;
};

export default function HolidaysPage() {
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingHoliday, setEditingHoliday] = React.useState<PublicHoliday | null>(null);

    const publicHolidaysQuery = useMemoFirebase(({firestore}) => firestore ? collection(firestore, 'publicHolidays') : null, []);
    const { data: publicHolidays, isLoading: loadingPublicHolidays } = useCollection<PublicHoliday>(publicHolidaysQuery);

    const handleAddNew = () => {
        setEditingHoliday(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (holiday: PublicHoliday) => {
        setEditingHoliday(holiday);
        setIsDialogOpen(true);
    };

    const holidayColumns = [
        { key: 'name', header: 'Баярын нэр' },
        { 
            key: 'date', 
            header: 'Огноо',
            render: (item: PublicHoliday) => {
                if(item.isRecurring && item.month && item.day) {
                    return `Жил бүрийн ${item.month}-р сарын ${item.day}`;
                }
                if (item.date) {
                    return format(new Date(item.date), 'yyyy-MM-dd');
                }
                return 'Тодорхойгүй';
            }
        },
        {
            key: 'isRecurring',
            header: 'Төрөл',
            render: (item: PublicHoliday) => item.isRecurring ? 'Давтагддаг' : 'Нэг удаагийн'
        }
    ];

    const holidaysForCalendar = React.useMemo(() => {
        if (!publicHolidays) return [];
        const currentYear = getYear(new Date());
        return publicHolidays.map(h => {
            if (h.isRecurring && h.month && h.day) {
                return new Date(currentYear, h.month - 1, h.day);
            }
            if (h.date) {
                return new Date(h.date);
            }
            return null;
        }).filter(d => d !== null) as Date[];
    }, [publicHolidays]);

    const holidayModifiers = {
        holiday: holidaysForCalendar,
    };

    const holidayModifierStyles = {
        holiday: {
            border: '2px solid hsl(var(--primary))',
            borderRadius: 'var(--radius)',
        },
    };

    return (
        <div className="py-8">
            <AddHolidayDialog 
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                editingItem={editingHoliday}
            />
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button asChild variant="outline" size="icon">
                        <Link href="/dashboard/settings/time-off">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sr-only">Буцах</span>
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Бүх нийтийн амралтын өдөр</h1>
                        <p className="text-muted-foreground">Улсын хэмжээнд тэмдэглэгддэг баярын өдрүүдийг бүртгэх, удирдах.</p>
                    </div>
                </div>
                <Button onClick={handleAddNew}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Баярын өдөр нэмэх
                </Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <Calendar
                        mode="multiple"
                        selected={holidaysForCalendar}
                        locale={mn}
                        modifiers={holidayModifiers}
                        modifiersStyles={holidayModifierStyles}
                        className="rounded-md border"
                    />
                </div>
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Бүртгэлтэй баярууд</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ReferenceTable
                                collectionName="publicHolidays"
                                columns={holidayColumns}
                                itemData={publicHolidays}
                                isLoading={loadingPublicHolidays}
                                dialogTitle="Баярын өдөр"
                                hideAddButton={true} 
                                onEdit={handleEdit}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
