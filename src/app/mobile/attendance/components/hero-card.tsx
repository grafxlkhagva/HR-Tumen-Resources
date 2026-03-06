'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { calculateDuration, triggerHapticFeedback } from '@/lib/attendance';
import { cn } from '@/lib/utils';
import type { AttendanceRecord } from '@/types/attendance';

interface HeroCardProps {
    currentTime: Date | null;
    todaysRecord: AttendanceRecord | undefined;
    isSubmitting: boolean;
    submittingStep: 'idle' | 'location' | 'validating' | 'saving';
    onCheckIn: () => void;
    onCheckOut: () => void;
    matchedLocationName?: string;
}

export function HeroCard({
    currentTime,
    todaysRecord,
    isSubmitting,
    submittingStep,
    onCheckIn,
    onCheckOut,
    matchedLocationName
}: HeroCardProps) {
    const isCheckedIn = !!todaysRecord;
    const isCheckedOut = !!todaysRecord?.checkOutTime;

    const getStepLabel = () => {
        switch (submittingStep) {
            case 'location': return 'Байршил олж байна...';
            case 'validating': return 'Шалгаж байна...';
            case 'saving': return 'Хадгалж байна...';
            default: return '';
        }
    };

    const handleCheckIn = () => {
        triggerHapticFeedback('medium');
        onCheckIn();
    };

    const handleCheckOut = () => {
        triggerHapticFeedback('medium');
        onCheckOut();
    };

    return (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-primary via-primary/95 to-primary/90 text-primary-foreground overflow-hidden relative">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center relative z-10">
                <div className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-2">Одоогийн цаг</div>
                <div className="text-5xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
                    {currentTime ? format(currentTime, 'HH:mm') : '--:--'}
                </div>
                <div className="text-sm opacity-80 mb-8">{currentTime ? format(currentTime, 'ss') : '--'} секунд</div>

                {!isCheckedIn ? (
                    <div className="flex flex-col items-center gap-3">
                        <Button
                            size="lg"
                            className={cn(
                                "h-16 w-48 rounded-full bg-white text-primary hover:bg-white/90 font-semibold text-lg shadow-xl transition-all",
                                !isSubmitting && "hover:scale-105",
                                isSubmitting && "animate-pulse"
                            )}
                            onClick={handleCheckIn}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span className="text-sm">{getStepLabel()}</span>
                                </div>
                            ) : (
                                "Ирэх"
                            )}
                        </Button>
                        {isSubmitting && submittingStep === 'location' && (
                            <div className="flex items-center gap-2 text-xs opacity-70 animate-pulse">
                                <MapPin className="h-3 w-3" />
                                <span>GPS байршил авч байна...</span>
                            </div>
                        )}
                    </div>
                ) : !isCheckedOut ? (
                    <div className="flex flex-col items-center gap-3">
                        <div className="text-sm bg-white/20 px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-2">
                            <CheckCircle className="h-3 w-3" />
                            Ирсэн: {format(new Date(todaysRecord.checkInTime), 'HH:mm')}
                            {todaysRecord.checkInLocationName && (
                                <span className="opacity-70">• {todaysRecord.checkInLocationName}</span>
                            )}
                        </div>
                        <Button
                            size="lg"
                            className={cn(
                                "h-14 w-48 rounded-full bg-red-500/90 text-white hover:bg-red-500 font-semibold shadow-xl transition-all",
                                !isSubmitting && "hover:scale-105"
                            )}
                            onClick={handleCheckOut}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span className="text-sm">{getStepLabel()}</span>
                                </div>
                            ) : (
                                "Явах"
                            )}
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <div className="bg-white/20 p-3 rounded-full mb-2">
                            <CheckCircle className="w-8 h-8 text-white" />
                        </div>
                        <div className="font-semibold text-lg">Өнөөдрийн ирц хаагдсан</div>
                        <div className="text-sm opacity-80">
                            Ажилласан: {calculateDuration(todaysRecord.checkInTime, todaysRecord.checkOutTime)}
                        </div>
                        <div className="text-xs opacity-60 mt-1">
                            {format(new Date(todaysRecord.checkInTime), 'HH:mm')} - {format(new Date(todaysRecord.checkOutTime!), 'HH:mm')}
                        </div>
                    </div>
                )}
            </CardContent>
            {/* Decorative circles */}
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl opacity-50" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/10 rounded-full blur-3xl opacity-50" />
        </Card>
    );
}
