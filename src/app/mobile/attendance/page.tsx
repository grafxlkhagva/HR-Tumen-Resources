'use client';

import * as React from 'react';
import { Clock, WifiOff } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

import { useAttendance } from './hooks/use-attendance';
import {
    HeroCard,
    QuickActions,
    RecentActivityList,
    MonthlyAttendanceDashboard,
    RequestSheet,
    HistorySheet,
    BreakSheet,
} from './components';

function AttendanceSkeleton() {
    return (
        <div className="p-4 space-y-6">
            <header className="py-4 flex justify-between">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </header>
            <Skeleton className="h-48 w-full rounded-3xl" />
            <div className="flex justify-between gap-4">
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
    );
}

export default function AttendancePage() {
    const [currentTime, setCurrentTime] = React.useState<Date | null>(null);
    const [isRequestDialogOpen, setIsRequestDialogOpen] = React.useState(false);
    const [isBreakSheetOpen, setIsBreakSheetOpen] = React.useState(false);
    const [isOnBreak, setIsOnBreak] = React.useState(false);

    const {
        isSubmitting,
        submittingStep,
        error,
        matchedLocationName,
        employeeProfile,
        todaysRecord,
        disabledDates,
        todayString,
        isLoading,
        handleCheckIn,
        handleCheckOut,
        clearError,
    } = useAttendance();

    // Clock timer
    React.useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Clear error after 5 seconds
    React.useEffect(() => {
        if (error) {
            const timer = setTimeout(clearError, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, clearError]);

    if (isLoading) return <AttendanceSkeleton />;

    return (
        <div className="min-h-dvh bg-gradient-to-b from-background to-muted/20 pb-20 relative">
            {/* Request Sheet */}
            <RequestSheet
                open={isRequestDialogOpen}
                onOpenChange={setIsRequestDialogOpen}
                employeeId={employeeProfile?.id}
                disabledDates={disabledDates}
            />

            {/* Break Sheet */}
            <BreakSheet
                open={isBreakSheetOpen}
                onOpenChange={setIsBreakSheetOpen}
                employeeId={employeeProfile?.id || ''}
                attendanceId={todaysRecord?.id}
                onBreakStatusChange={setIsOnBreak}
            />

            {/* Header */}
            <header className="px-6 py-6 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Ирц бүртгэл</h1>
                    <p className="text-sm text-muted-foreground">
                        {currentTime ? format(currentTime, 'yyyy оны MM сарын dd') : todayString}
                    </p>
                </div>
                <div className="bg-muted p-2 rounded-full">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                </div>
            </header>

            <main className="px-6 space-y-8">
                {/* Hero Section - Clock and Check-in/out */}
                <HeroCard
                    currentTime={currentTime}
                    todaysRecord={todaysRecord}
                    isSubmitting={isSubmitting}
                    submittingStep={submittingStep}
                    onCheckIn={handleCheckIn}
                    onCheckOut={handleCheckOut}
                    matchedLocationName={matchedLocationName}
                />

                {/* Error Alert */}
                {error && (
                    <Alert 
                        variant="destructive" 
                        className="animate-in fade-in zoom-in border-destructive/50 bg-destructive/10"
                    >
                        <WifiOff className="h-4 w-4" />
                        <AlertTitle>Анхааруулга</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Quick Actions */}
                <QuickActions
                    onRequestClick={() => setIsRequestDialogOpen(true)}
                    onBreakClick={() => setIsBreakSheetOpen(true)}
                    historySheetTrigger={<HistorySheet employeeId={employeeProfile?.id || ''} />}
                    isOnBreak={isOnBreak}
                />

                {/* Recent Activity */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="font-semibold text-lg">Сүүлийн ирцүүд</h3>
                    </div>
                    <RecentActivityList employeeId={employeeProfile?.id || ''} />
                </div>

                {/* Monthly Summary */}
                <MonthlyAttendanceDashboard employeeId={employeeProfile?.id || ''} />
            </main>
        </div>
    );
}
