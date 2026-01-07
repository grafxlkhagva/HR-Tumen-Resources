'use client';

import * as React from 'react';
import { z } from 'zod';
import { useFirebase, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Building, Rocket, Eye, Shield, Handshake, Zap, Users2, Phone, Mail,
    MapPin, Video, ScrollText, Network, Briefcase, Globe, ChevronRight, Info, Hash, User, Quote
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselApi
} from '@/components/ui/carousel';

// Types
import { CoreValue } from '@/types/points';
import { query, orderBy, where } from 'firebase/firestore';

const videoSchema = z.object({
    title: z.string(),
    description: z.string().optional(),
    url: z.string(),
});

const companyProfileSchema = z.object({
    name: z.string(),
    logoUrl: z.string().optional(),
    mission: z.string().optional(),
    vision: z.string().optional(),
    videos: z.array(videoSchema).optional(),
    phoneNumber: z.string().optional(),
    contactEmail: z.string().email().optional().or(z.literal('')),
    address: z.string().optional(),
    website: z.string().optional(),
    employeeCount: z.string().optional(),
    industry: z.string().optional(),
    legalName: z.string().optional(),
    registrationNumber: z.string().optional(),
    taxId: z.string().optional(),
    ceo: z.string().optional(),
    introduction: z.string().optional(),
    coverUrls: z.array(z.string()).optional(),
});

type CompanyProfileValues = z.infer<typeof companyProfileSchema>;

function PageSkeleton() {
    return (
        <div className="bg-background min-h-screen space-y-8">
            <div className="h-64 bg-muted animate-pulse" />
            <div className="px-6 -mt-12 space-y-6">
                <div className="flex flex-col items-center">
                    <Skeleton className="h-24 w-24 rounded-2xl shadow-lg" />
                    <Skeleton className="h-8 w-48 mt-4" />
                    <Skeleton className="h-4 w-32 mt-2" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-24 rounded-xl" />
                    <Skeleton className="h-24 rounded-xl" />
                </div>
            </div>
        </div>
    );
}

export default function MobileCompanyPage() {
    const { firestore } = useFirebase();

    // Queries
    const companyProfileRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'company', 'profile') : null),
        [firestore]
    );
    const departmentsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departments') : null), [firestore]);
    const policiesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'companyPolicies') : null), [firestore]);
    const valuesQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'company', 'branding', 'values') : null),
        [firestore]
    );

    // Data Fetching
    const { data: companyProfile, isLoading: isLoadingProfile } = useDoc<CompanyProfileValues>(companyProfileRef);
    const { data: departments } = useCollection(departmentsQuery);
    const { data: policies } = useCollection(policiesQuery);
    const { data: coreValues } = useCollection<CoreValue>(valuesQuery);

    const [api, setApi] = React.useState<CarouselApi>();

    React.useEffect(() => {
        if (!api) return;

        const intervalId = setInterval(() => {
            api.scrollNext();
        }, 5000);

        return () => clearInterval(intervalId);
    }, [api]);

    if (isLoadingProfile) return <PageSkeleton />;

    if (!companyProfile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center text-muted-foreground">
                <Building className="h-12 w-12 mb-4 opacity-20" />
                <p>Компанийн мэдээлэл олдсонгүй.</p>
            </div>
        )
    }

    const sections = [
        { id: 'mission', icon: Rocket, label: 'Зорилго', color: 'text-blue-600', bg: 'bg-blue-50' },
        { id: 'culture', icon: Shield, label: 'Соёл', color: 'text-purple-600', bg: 'bg-purple-50' },
        { id: 'policies', icon: ScrollText, label: 'Журам', color: 'text-amber-600', bg: 'bg-amber-50' },
        { id: 'contact', icon: Phone, label: 'Холбоо барих', color: 'text-green-600', bg: 'bg-green-50' },
    ];

    return (
        <div className="min-h-screen bg-slate-50">{/* Removed pb-24, will add to inner container */}
            {/* Dynamic Hero Section with Slider */}
            <div className="relative h-72 bg-slate-900 overflow-hidden">
                {companyProfile.coverUrls && companyProfile.coverUrls.length > 0 ? (
                    <Carousel setApi={setApi} className="w-full h-full" opts={{ loop: true }}>
                        <CarouselContent className="-ml-0 h-full">
                            {companyProfile.coverUrls.map((url, index) => (
                                <CarouselItem key={index} className="pl-0 h-full">
                                    <div className="relative h-full w-full">
                                        <img src={url} alt={`Cover ${index + 1}`} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40" />
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                    </Carousel>
                ) : (
                    <div className="h-full w-full bg-gradient-to-br from-indigo-900 via-primary to-indigo-800">
                        {/* Abstract Shapes fallback */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
                    </div>
                )}

                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 pt-12 text-center z-10">
                    <Badge variant="outline" className="border-white/30 text-white/80 mb-3 backdrop-blur-md">
                        {companyProfile.industry || 'Байгууллага'}
                    </Badge>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 drop-shadow-md">{companyProfile.name}</h1>
                    {companyProfile.website && (
                        <a href={companyProfile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-white/70 hover:text-white transition-colors bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                            <Globe className="h-3 w-3" />
                            {new URL(companyProfile.website).hostname}
                        </a>
                    )}
                </div>
            </div>

            <div className="px-6 -mt-12 relative z-20 space-y-8">
                {/* Logo Card */}
                <div className="flex justify-center">
                    <div className="h-24 w-24 rounded-2xl bg-white p-2 shadow-xl shadow-indigo-900/10 flex items-center justify-center">
                        <Avatar className="h-full w-full rounded-xl">
                            <AvatarImage src={companyProfile.logoUrl} className="object-contain" />
                            <AvatarFallback className="rounded-xl bg-slate-50">
                                <Building className="h-8 w-8 text-slate-300" />
                            </AvatarFallback>
                        </Avatar>
                    </div>
                </div>

                {/* Introduction Section */}
                {companyProfile.introduction && (
                    <div className="relative px-2">
                        <div className="absolute top-0 -left-1 opacity-10">
                            <Quote className="h-10 w-10 text-primary -scale-x-100" />
                        </div>
                        <p className="text-base text-slate-600 leading-relaxed italic text-center px-4 pt-2">
                            {companyProfile.introduction}
                        </p>
                        <div className="absolute bottom-0 -right-1 opacity-10">
                            <Quote className="h-10 w-10 text-primary" />
                        </div>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <Link href="/mobile/company/policies">
                        <Card className="border-none shadow-sm hover:shadow-md transition-all active:scale-95 bg-white overflow-hidden group">
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-1 relative">
                                <div className="absolute top-0 right-0 p-2 opacity-5">
                                    <ScrollText className="h-10 w-10" />
                                </div>
                                <span className="text-3xl font-bold text-slate-800 group-hover:text-primary transition-colors">{policies?.length || 0}</span>
                                <span className="text-xs text-muted-foreground font-medium">Журам</span>
                            </CardContent>
                        </Card>
                    </Link>
                    <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center text-center gap-1 shadow-sm border border-slate-100">
                        <span className="text-3xl font-bold text-slate-800">{departments?.length || 0}</span>
                        <span className="text-xs text-muted-foreground font-medium">Хэлтэс</span>
                    </div>
                </div>

                {/* Mission & Vision Carousel */}
                {(companyProfile.mission || companyProfile.vision) && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                Бидний тухай
                            </h3>
                        </div>
                        <div className="grid gap-4">
                            {companyProfile.mission && (
                                <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50 to-white overflow-hidden relative">
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100/50 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                                    <CardContent className="p-5 relative z-10">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                                <Rocket className="h-4 w-4" />
                                            </div>
                                            <h4 className="font-semibold text-slate-800">Эрхэм зорилго</h4>
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            {companyProfile.mission}
                                        </p>
                                    </CardContent>
                                </Card>
                            )}

                            {companyProfile.vision && (
                                <Card className="border-none shadow-sm bg-gradient-to-br from-purple-50 to-white overflow-hidden relative">
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-purple-100/50 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                                    <CardContent className="p-5 relative z-10">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="h-8 w-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                                                <Eye className="h-4 w-4" />
                                            </div>
                                            <h4 className="font-semibold text-slate-800">Алсын хараа</h4>
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            {companyProfile.vision}
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                )}

                {/* Values Section */}
                {coreValues && coreValues.filter(v => v.isActive !== false).length > 0 && (
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg px-1">Үнэт зүйлс</h3>
                        <div className="flex overflow-x-auto pb-4 gap-4 -mx-6 px-6 snap-x snap-mandatory scrollbar-hide">
                            {coreValues
                                .filter(v => v.isActive !== false)
                                .sort((a, b) => {
                                    const getTime = (val: any) => {
                                        if (!val) return 0;
                                        if (typeof val.toDate === 'function') return val.toDate().getTime();
                                        if (val instanceof Date) return val.getTime();
                                        return new Date(val).getTime() || 0;
                                    };
                                    return getTime(a.createdAt) - getTime(b.createdAt);
                                })
                                .map((value, index) => (
                                    <div key={value.id || index} className="snap-center min-w-[200px] max-w-[200px] bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-3">
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-slate-50" style={{ backgroundColor: `${value.color}10` }}>
                                            {value.emoji || '⭐'}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm mb-1">{value.title}</h4>
                                            <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed">{value.description}</p>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {/* Policies Shortcut */}
                <Link href="/mobile/company/policies">
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between group active:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                                <ScrollText className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm">Дотоод журам</h4>
                                <p className="text-xs text-muted-foreground">Байгууллагын дүрэмтэй танилцах</p>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-active:translate-x-1 transition-transform" />
                    </div>
                </Link>

                {/* General Information */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg px-1">Ерөнхий мэдээлэл</h3>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
                        {companyProfile.legalName && (
                            <div className="p-4 flex items-center gap-4">
                                <Info className="h-5 w-5 text-muted-foreground" />
                                <div className="flex-1">
                                    <p className="text-xs text-muted-foreground">Хуулийн этгээдийн нэр</p>
                                    <p className="text-sm font-medium">{companyProfile.legalName}</p>
                                </div>
                            </div>
                        )}
                        {companyProfile.registrationNumber && (
                            <div className="p-4 flex items-center gap-4">
                                <Hash className="h-5 w-5 text-muted-foreground" />
                                <div className="flex-1">
                                    <p className="text-xs text-muted-foreground">Регистрийн дугаар</p>
                                    <p className="text-sm font-medium">{companyProfile.registrationNumber}</p>
                                </div>
                            </div>
                        )}
                        {companyProfile.taxId && (
                            <div className="p-4 flex items-center gap-4">
                                <Hash className="h-5 w-5 text-muted-foreground" />
                                <div className="flex-1">
                                    <p className="text-xs text-muted-foreground">Татвар төлөгчийн дугаар</p>
                                    <p className="text-sm font-medium">{companyProfile.taxId}</p>
                                </div>
                            </div>
                        )}
                        {companyProfile.industry && (
                            <div className="p-4 flex items-center gap-4">
                                <Briefcase className="h-5 w-5 text-muted-foreground" />
                                <div className="flex-1">
                                    <p className="text-xs text-muted-foreground">Үйл ажиллагааны чиглэл</p>
                                    <p className="text-sm font-medium">{companyProfile.industry}</p>
                                </div>
                            </div>
                        )}
                        {companyProfile.ceo && (
                            <div className="p-4 flex items-center gap-4">
                                <User className="h-5 w-5 text-muted-foreground" />
                                <div className="flex-1">
                                    <p className="text-xs text-muted-foreground">Гүйцэтгэх захирал</p>
                                    <p className="text-sm font-medium">{companyProfile.ceo}</p>
                                </div>
                            </div>
                        )}
                        {companyProfile.employeeCount && (
                            <div className="p-4 flex items-center gap-4">
                                <Users2 className="h-5 w-5 text-muted-foreground" />
                                <div className="flex-1">
                                    <p className="text-xs text-muted-foreground">Ажилтны тоо</p>
                                    <p className="text-sm font-medium">{companyProfile.employeeCount}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4 pb-8">
                    <h3 className="font-semibold text-lg px-1">Холбоо барих</h3>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
                        {companyProfile.phoneNumber && (
                            <div className="p-4 flex items-center gap-4">
                                <Phone className="h-5 w-5 text-muted-foreground" />
                                <div className="flex-1">
                                    <p className="text-xs text-muted-foreground">Утасны дугаар</p>
                                    <a href={`tel:${companyProfile.phoneNumber}`} className="text-sm font-medium hover:text-primary">{companyProfile.phoneNumber}</a>
                                </div>
                            </div>
                        )}
                        {companyProfile.contactEmail && (
                            <div className="p-4 flex items-center gap-4">
                                <Mail className="h-5 w-5 text-muted-foreground" />
                                <div className="flex-1">
                                    <p className="text-xs text-muted-foreground">Имэйл хаяг</p>
                                    <a href={`mailto:${companyProfile.contactEmail}`} className="text-sm font-medium hover:text-primary">{companyProfile.contactEmail}</a>
                                </div>
                            </div>
                        )}
                        {companyProfile.address && (
                            <div className="p-4 flex items-center gap-4">
                                <MapPin className="h-5 w-5 text-muted-foreground" />
                                <div className="flex-1">
                                    <p className="text-xs text-muted-foreground">Хаяг байршил</p>
                                    <p className="text-sm font-medium">{companyProfile.address}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Simple Footer */}
                <div className="text-center pb-8 pt-4">
                    <p className="text-xs text-muted-foreground/50 font-medium">
                        © {new Date().getFullYear()} {companyProfile.name}
                    </p>
                </div>
            </div>
        </div>
    );
}
