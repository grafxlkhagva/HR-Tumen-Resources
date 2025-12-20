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
    MapPin, Video, ScrollText, Network, Briefcase, Globe, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// Types
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
    values: z.array(z.object({
        title: z.string(),
        description: z.string(),
        icon: z.string(),
    })).optional(),
    videos: z.array(videoSchema).optional(),
    phoneNumber: z.string().optional(),
    contactEmail: z.string().email().optional().or(z.literal('')),
    address: z.string().optional(),
    website: z.string().optional(),
    employeeCount: z.string().optional(),
    industry: z.string().optional(),
});

type CompanyProfileValues = z.infer<typeof companyProfileSchema>;

const valueIcons: { [key: string]: React.ElementType } = {
    responsibility: Handshake,
    innovation: Zap,
    collaboration: Users2,
    default: Shield,
};

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

    // Data Fetching
    const { data: companyProfile, isLoading: isLoadingProfile } = useDoc<CompanyProfileValues>(companyProfileRef);
    const { data: departments } = useCollection(departmentsQuery);
    const { data: policies } = useCollection(policiesQuery);

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
        <div className="min-h-screen bg-slate-50 pb-24">
            {/* Dynamic Hero Section */}
            <div className="relative h-64 bg-gradient-to-br from-indigo-900 via-primary to-indigo-800 overflow-hidden">
                {/* Abstract Shapes */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

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
                {companyProfile.values && companyProfile.values.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg px-1">Үнэт зүйлс</h3>
                        <div className="flex overflow-x-auto pb-4 gap-4 -mx-6 px-6 snap-x snap-mandatory scrollbar-hide">
                            {companyProfile.values.map((value, index) => {
                                const Icon = valueIcons[value.icon] || valueIcons.default;
                                return (
                                    <div key={index} className="snap-center min-w-[200px] max-w-[200px] bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                                            <Icon className="h-5 w-5 text-slate-700" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm mb-1">{value.title}</h4>
                                            <p className="text-xs text-muted-foreground line-clamp-3">{value.description}</p>
                                        </div>
                                    </div>
                                )
                            })}
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
