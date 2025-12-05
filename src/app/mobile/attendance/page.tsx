
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ArrowRight, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { mn } from 'date-fns/locale';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

type AttendanceRecord = {
    id: string;
    employeeId: string;
    date: string;
    checkInTime: string;
    checkOutTime?: string;
    status: 'PRESENT' | 'LEFT';
}

function AttendanceHistory({ record }: { record: AttendanceRecord | null }) {
    if (!record) {
        return (
            <div className="text-center text-muted-foreground py-8">
                <Clock className="mx-auto h-12 w-12" />
                <p className="mt-4">Өнөөдөр бүртгэл хийгдээгүй байна.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-4">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <div>
                        <p className="font-semibold">Ирсэн цаг</p>
                        <p className="text-sm text-muted-foreground">Та амжилттай ирцгээ бүртгүүллээ.</p>
                    </div>
                </div>
                <p className="text-lg font-bold">{format(new Date(record.checkInTime), 'HH:mm')}</p>
            </div>
             {record.checkOutTime && (
                 <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                        <CheckCircle className="h-8 w-8 text-destructive" />
                        <div>
                            <p className="font-semibold">Явсан цаг</p>
                            <p className="text-sm text-muted-foreground">Таны явсан цаг бүртгэгдлээ.</p>
                        </div>
                    </div>
                    <p className="text-lg font-bold">{format(new Date(record.checkOutTime), 'HH:mm')}</p>
                </div>
             )}
        </div>
    )
}

function AttendanceSkeleton() {
    return (
        <div className="p-4 space-y-6">
            <header className="py-4">
                <Skeleton className="h-8 w-48" />
            </header>
            <Card>
                <CardHeader className="text-center">
                    <Skeleton className="h-4 w-40 mx-auto" />
                    <Skeleton className="h-12 w-56 mx-auto mt-2" />
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                     <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>
        </div>
    )
}

export default function AttendancePage() {
    const [currentTime, setCurrentTime] = React.useState(new Date());
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const { employeeProfile, isProfileLoading } = useEmployeeProfile();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    
    const todayString = format(new Date(), 'yyyy-MM-dd');

    const attendanceQuery = useMemoFirebase(
      () =>
        firestore && employeeProfile
          ? query(
              collection(firestore, 'attendance'),
              where('employeeId', '==', employeeProfile.id),
              where('date', '==', todayString)
            )
          : null,
      [firestore, employeeProfile, todayString]
    );

    const { data: attendanceRecords, isLoading: isAttendanceLoading } = useCollection<AttendanceRecord>(attendanceQuery);
    const todaysRecord = attendanceRecords?.[0];

    React.useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleCheckIn = async () => {
        if (!firestore || !employeeProfile) return;
        setIsSubmitting(true);
        try {
            const attendanceCollection = collection(firestore, 'attendance');
            await addDocumentNonBlocking(attendanceCollection, {
                employeeId: employeeProfile.id,
                date: todayString,
                checkInTime: new Date().toISOString(),
                status: 'PRESENT',
            });
            toast({ title: 'Ирц амжилттай бүртгэгдлээ.' });
        } catch (error) {
            toast({ variant: "destructive", title: 'Алдаа гарлаа', description: 'Ирц бүртгэхэд алдаа гарлаа.' });
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleCheckOut = async () => {
        if (!firestore || !todaysRecord) return;
        setIsSubmitting(true);
        try {
            const recordDocRef = doc(firestore, 'attendance', todaysRecord.id);
            await updateDocumentNonBlocking(recordDocRef, {
                checkOutTime: new Date().toISOString(),
                status: 'LEFT',
            });
            toast({ title: 'Явсан цаг амжилттай бүртгэгдлээ.' });
        } catch (error) {
             toast({ variant: "destructive", title: 'Алдаа гарлаа', description: 'Явсан цаг бүртгэхэд алдаа гарлаа.' });
             console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const isLoading = isProfileLoading || isAttendanceLoading;

    if(isLoading) {
        return <AttendanceSkeleton />;
    }

    const todayFormatted = format(currentTime, 'yyyy оны MM-р сарын dd, EEEE', { locale: mn });
    const timeFormatted = format(currentTime, 'HH:mm:ss');
    
    const hasCheckedIn = !!todaysRecord;
    const hasCheckedOut = !!todaysRecord?.checkOutTime;

    return (
        <div className="p-4 space-y-6 animate-in fade-in-50">
            <header className="py-4">
                <h1 className="text-2xl font-bold">Цагийн бүртгэл</h1>
            </header>

            <Card className="text-center">
                <CardHeader>
                    <p className="text-sm text-muted-foreground">{todayFormatted}</p>
                    <CardTitle className="text-5xl font-bold tracking-tighter">{timeFormatted}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <Button 
                        size="lg" 
                        className="h-16 text-lg bg-green-500 hover:bg-green-600" 
                        onClick={handleCheckIn}
                        disabled={hasCheckedIn || isSubmitting}
                    >
                        {isSubmitting && !hasCheckedIn ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <ArrowRight className="mr-2 h-6 w-6" />}
                        Ирсэн
                    </Button>
                    <Button 
                        size="lg" 
                        variant="destructive" 
                        className="h-16 text-lg"
                        onClick={handleCheckOut}
                        disabled={!hasCheckedIn || hasCheckedOut || isSubmitting}
                    >
                         {isSubmitting && hasCheckedIn && !hasCheckedOut ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <ArrowLeft className="mr-2 h-6 w-6" />}
                        Явсан
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Өнөөдрийн түүх</CardTitle>
                </CardHeader>
                <CardContent>
                    <AttendanceHistory record={todaysRecord || null} />
                </CardContent>
            </Card>
        </div>
    );
}

    