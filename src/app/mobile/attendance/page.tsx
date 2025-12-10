'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ArrowRight, ArrowLeft, CheckCircle, Loader2, WifiOff, MapPin, Smartphone, FilePlus } from 'lucide-react';
import { format } from 'date-fns';
import { mn } from 'date-fns/locale';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

type AttendanceRecord = {
    id: string;
    employeeId: string;
    date: string;
    checkInTime: string;
    checkOutTime?: string;
    status: 'PRESENT' | 'LEFT';
}

type AttendanceConfig = {
    latitude: number;
    longitude: number;
    radius: number;
}

// Haversine formula to calculate distance
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
}

function getDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
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
                        <p className="text-sm text-muted-foreground">Та амжилттай ирцээ бүртгүүллээ.</p>
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
    const [currentTime, setCurrentTime] = React.useState<Date | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const { employeeProfile, isProfileLoading } = useEmployeeProfile();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    
    const todayString = React.useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

    const attendanceQuery = useMemoFirebase(() => employeeProfile ? query(collection(firestore, 'attendance'), where('employeeId', '==', employeeProfile.id), where('date', '==', todayString)) : null, [firestore, employeeProfile, todayString]);
    const configQuery = useMemoFirebase(() => doc(firestore, 'company', 'attendanceConfig'), [firestore]);
    
    const { data: attendanceRecords, isLoading: isAttendanceLoading } = useCollection<AttendanceRecord>(attendanceQuery);
    const { data: config, isLoading: isConfigLoading } = useDoc<AttendanceConfig>(configQuery);
    
    const todaysRecord = attendanceRecords?.[0];

    React.useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleAttendance = async (type: 'check-in' | 'check-out') => {
        setIsSubmitting(true);
        setError(null);

        // 1. Check if config and profile are loaded
        if (!config || !employeeProfile || !firestore) {
            setError("Системийн тохиргоог уншиж чадсангүй. Түр хүлээнэ үү.");
            setIsSubmitting(false);
            return;
        }

        // 2. Device Verification
        const currentDeviceId = getDeviceId();
        if (!employeeProfile.deviceId) {
            // First time registration
            const employeeDocRef = doc(firestore, 'employees', employeeProfile.id);
            await updateDocumentNonBlocking(employeeDocRef, { deviceId: currentDeviceId });
            toast({ title: "Төхөөрөмж бүртгэгдлээ", description: "Таны төхөөрөмжийг цаг бүртгэлийн системд амжилттай бүртгэлээ." });
        } else if (employeeProfile.deviceId !== currentDeviceId) {
            setError("Энэ төхөөрөмж бүртгэлгүй байна. Та зөвхөн өөрийн бүртгүүлсэн төхөөрөмжөөс цагаа бүртгүүлэх боломжтой.");
            setIsSubmitting(false);
            return;
        }

        // 3. Location Verification
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
            });
            const { latitude, longitude } = position.coords;
            const distance = getDistance(latitude, longitude, config.latitude, config.longitude);

            if (distance > config.radius) {
                setError(`Та оффисын байршлаас ${Math.round(distance)} метрийн зайд байна. Цаг бүртгүүлэх боломжгүй.`);
                setIsSubmitting(false);
                return;
            }

            // 4. Record Attendance
            if (type === 'check-in') {
                const attendanceCollection = collection(firestore, 'attendance');
                await addDocumentNonBlocking(attendanceCollection, { employeeId: employeeProfile.id, date: todayString, checkInTime: new Date().toISOString(), status: 'PRESENT' });
                toast({ title: 'Ирц амжилттай бүртгэгдлээ.' });
            } else if (type === 'check-out' && todaysRecord) {
                const recordDocRef = doc(firestore, 'attendance', todaysRecord.id);
                await updateDocumentNonBlocking(recordDocRef, { checkOutTime: new Date().toISOString(), status: 'LEFT' });
                toast({ title: 'Явсан цаг амжилттай бүртгэгдлээ.' });
            }
        } catch (geoError: any) {
            if (geoError.code === geoError.PERMISSION_DENIED) {
                setError("Байршлын зөвшөөрөл олгогдоогүй байна. Та браузерын тохиргооноос байршил ашиглах зөвшөөрлийг нээнэ үү.");
            } else {
                setError("Байршлыг тодорхойлоход алдаа гарлаа. Та интернет холболтоо шалгаад дахин оролдоно уу.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const isLoading = isProfileLoading || isAttendanceLoading || isConfigLoading;

    if(isLoading) {
        return <AttendanceSkeleton />;
    }

    const todayFormatted = currentTime ? format(currentTime, 'yyyy оны MM-р сарын dd, EEEE', { locale: mn }) : <Skeleton className="h-4 w-40 mx-auto" />;
    const timeFormatted = currentTime ? format(currentTime, 'HH:mm:ss') : <Skeleton className="h-12 w-48 mx-auto" />;
    
    const hasCheckedIn = !!todaysRecord;
    const hasCheckedOut = !!todaysRecord?.checkOutTime;

    return (
        <div className="p-4 space-y-6 animate-in fade-in-50">
            <header className="py-4">
                <h1 className="text-2xl font-bold">Ирцийн бүртгэл</h1>
            </header>

            {error && (
                <Alert variant="destructive">
                    <WifiOff className="h-4 w-4" />
                    <AlertTitle>Алдаа</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Card className="text-center">
                <CardHeader>
                    <div className="text-sm text-muted-foreground">{todayFormatted}</div>
                    {currentTime ? (
                        <CardTitle className="text-5xl font-bold tracking-tighter">{timeFormatted}</CardTitle>
                    ) : (
                        <Skeleton className="h-12 w-48 mx-auto mt-1" />
                    )}
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <Button size="lg" className="h-16 text-lg bg-green-500 hover:bg-green-600" onClick={() => handleAttendance('check-in')} disabled={hasCheckedIn || isSubmitting}>
                        {isSubmitting && !hasCheckedIn ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <ArrowRight className="mr-2 h-6 w-6" />}
                        Ирсэн
                    </Button>
                    <Button size="lg" variant="destructive" className="h-16 text-lg" onClick={() => handleAttendance('check-out')} disabled={!hasCheckedIn || hasCheckedOut || isSubmitting}>
                         {isSubmitting && hasCheckedIn && !hasCheckedOut ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <ArrowLeft className="mr-2 h-6 w-6" />}
                        Явсан
                    </Button>
                </CardContent>
            </Card>

            {!config && (
                 <Alert>
                    <MapPin className="h-4 w-4" />
                    <AlertTitle>Тохиргоо дутуу</AlertTitle>
                    <AlertDescription>Админ цагийн бүртгэлийн байршлыг тохируулаагүй байна.</AlertDescription>
                </Alert>
            )}

            {employeeProfile && !employeeProfile.deviceId && (
                 <Alert variant="default">
                    <Smartphone className="h-4 w-4" />
                    <AlertTitle>Төхөөрөмж бүртгүүлэх</AlertTitle>
                    <AlertDescription>Та "Ирсэн" товчийг дарж энэ төхөөрөмжийг цаг бүртгэлийн системд бүртгүүлнэ үү.</AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Өнөөдрийн түүх</CardTitle>
                </CardHeader>
                <CardContent>
                    <AttendanceHistory record={todaysRecord || null} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Бусад хүсэлт</CardTitle>
                    <CardDescription>Илүү цаг, хоцролт, гадуур ажиллах зэрэг хүсэлтээ илгээнэ үү.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild className="w-full">
                        <Link href="/mobile/requests">
                            <FilePlus className="mr-2 h-4 w-4" />
                            Хүсэлт гаргах
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
