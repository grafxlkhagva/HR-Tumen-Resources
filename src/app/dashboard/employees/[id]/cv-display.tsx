'use client';

import React from 'react';
import { useDoc, useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { Printer, User, Phone, Mail, MapPin, Briefcase, GraduationCap, BookOpen, Languages, Award, Users } from 'lucide-react';

const CVSection = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
    <section>
        <h2 className="flex items-center text-lg font-semibold mb-4 border-b pb-2">
            <Icon className="mr-3 h-5 w-5 text-primary" />
            {title}
        </h2>
        <div className="space-y-4 text-sm">
            {children}
        </div>
    </section>
);

const CVEntry = ({ title, subtitle, date, children }: { title: string; subtitle?: string; date?: string; children?: React.ReactNode }) => (
    <div>
        <div className="flex justify-between items-start">
            <div>
                <h3 className="font-semibold">{title}</h3>
                {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
            </div>
            {date && <p className="text-xs text-muted-foreground text-right">{date}</p>}
        </div>
        {children && <div className="mt-2 text-muted-foreground prose prose-sm dark:prose-invert max-w-none">{children}</div>}
    </div>
);

const CVSkeleton = () => (
    <Card>
        <CardHeader>
             <Skeleton className="h-6 w-24 ml-auto" />
        </CardHeader>
        <CardContent className="space-y-8">
            <div className="flex items-center space-x-6">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-5 w-32" />
                </div>
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-4">
                    <Skeleton className="h-6 w-1/3" />
                     <div className="space-y-3">
                         <Skeleton className="h-5 w-full" />
                         <Skeleton className="h-5 w-5/6" />
                     </div>
                </div>
            ))}
        </CardContent>
    </Card>
);

export function CVDisplay({ employeeId }: { employeeId: string }) {
    const { firestore } = useFirebase();

    const employeeRef = useMemoFirebase(() => firestore ? doc(firestore, 'employees', employeeId) : null, [firestore, employeeId]);
    const questionnaireRef = useMemoFirebase(() => firestore ? doc(firestore, `employees/${employeeId}/questionnaire`, 'data') : null, [firestore, employeeId]);

    const { data: employee, isLoading: isLoadingEmployee } = useDoc(employeeRef);
    const { data: questionnaire, isLoading: isLoadingQuestionnaire } = useDoc(questionnaireRef);
    
    const isLoading = isLoadingEmployee || isLoadingQuestionnaire;
    
    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return <CVSkeleton />;
    }

    if (!questionnaire) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>CV</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Энэ ажилтны анкетын мэдээлэл олдсонгүй.</p>
                </CardContent>
            </Card>
        );
    }
    
    const avatar = PlaceHolderImages.find((p) => p.id === employee?.avatarId) || PlaceHolderImages.find(p => p.id === 'avatar-2');
    const fullName = `${questionnaire.firstName || ''} ${questionnaire.lastName || ''}`;

    const formatDate = (date: any) => {
        if (!date) return '';
        try {
            return new Date(date.seconds * 1000).toLocaleDateString('mn-MN');
        } catch {
             if(date instanceof Date) return date.toLocaleDateString('mn-MN');
             return date.toString();
        }
    };
    
    const formatDateRange = (start: any, end: any, isCurrent?: boolean) => {
        if (!start) return '';
        const startDate = formatDate(start);
        const endDate = isCurrent ? 'Одоо' : (end ? formatDate(end) : 'Тодорхойгүй');
        return `${startDate} - ${endDate}`;
    }

    return (
        <Card>
            <CardHeader className="flex-row justify-between items-center">
                 <CardTitle>CV</CardTitle>
                <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Хэвлэх
                </Button>
            </CardHeader>
            <CardContent className="space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={avatar?.imageUrl} alt={fullName} />
                        <AvatarFallback className="text-3xl">{questionnaire.firstName?.charAt(0)}{questionnaire.lastName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-3xl font-bold">{fullName}</h1>
                        <p className="text-lg text-primary">{employee?.jobTitle}</p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1 space-y-8">
                        <CVSection title="Ерөнхий мэдээлэл" icon={User}>
                            <p><strong>Регистрийн дугаар:</strong> {questionnaire.registrationNumber}</p>
                            <p><strong>Төрсөн огноо:</strong> {formatDate(questionnaire.birthDate)}</p>
                            <p><strong>Хүйс:</strong> {questionnaire.gender === 'male' ? 'Эрэгтэй' : 'Эмэгтэй'}</p>
                        </CVSection>
                        <CVSection title="Холбоо барих" icon={Phone}>
                            <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground"/> {questionnaire.personalEmail || questionnaire.workEmail}</p>
                            <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground"/> {questionnaire.personalPhone || questionnaire.workPhone}</p>
                            <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground"/> {questionnaire.homeAddress}</p>
                        </CVSection>
                    </div>

                    <div className="md:col-span-2 space-y-8">
                        {questionnaire.education && questionnaire.education.length > 0 && (
                            <CVSection title="Боловсрол" icon={GraduationCap}>
                                {questionnaire.education.map((edu: any, index: number) => (
                                    <CVEntry 
                                        key={index}
                                        title={edu.degree || 'Тодорхойгүй'}
                                        subtitle={`${edu.school || edu.schoolCustom}, ${edu.country}`}
                                        date={formatDateRange(edu.entryDate, edu.gradDate, edu.isCurrent)}
                                    />
                                ))}
                            </CVSection>
                        )}
                        
                        {questionnaire.experiences && questionnaire.experiences.length > 0 && (
                            <CVSection title="Ажлын туршлага" icon={Briefcase}>
                                {questionnaire.experiences.map((exp: any, index: number) => (
                                     <CVEntry 
                                        key={index}
                                        title={exp.position}
                                        subtitle={exp.company}
                                        date={formatDateRange(exp.startDate, exp.endDate)}
                                    >
                                        <p>{exp.description}</p>
                                    </CVEntry>
                                ))}
                            </CVSection>
                        )}

                        {questionnaire.languages && questionnaire.languages.length > 0 && (
                           <CVSection title="Гадаад хэлний мэдлэг" icon={Languages}>
                                {questionnaire.languages.map((lang: any, index: number) => (
                                     <p key={index}><strong>{lang.language}:</strong> Сонсох - {lang.listening}, Унших - {lang.reading}, Ярих - {lang.speaking}, Бичих - {lang.writing}</p>
                                ))}
                           </CVSection>
                        )}

                        {questionnaire.trainings && questionnaire.trainings.length > 0 && (
                             <CVSection title="Мэргэшлийн бэлтгэл" icon={Award}>
                                {questionnaire.trainings.map((tr: any, index: number) => (
                                     <CVEntry 
                                        key={index}
                                        title={tr.name}
                                        subtitle={tr.organization}
                                        date={formatDateRange(tr.startDate, tr.endDate)}
                                    />
                                ))}
                            </CVSection>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
