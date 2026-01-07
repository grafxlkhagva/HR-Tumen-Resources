'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardFooter
} from '@/components/ui/card';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselApi
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { useFirebase, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Pencil, Building, Hash, Info, Users, User, Globe, Briefcase, FileText, Rocket, Eye, Shield, Phone, Mail, MapPin, Video, ArrowLeft, Handshake, Zap, Users2, Network, ScrollText, Settings, Quote } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { z } from 'zod';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { CoreValue } from '@/types/points';
import { query, orderBy } from 'firebase/firestore';
import { hexToHsl } from '@/lib/color-utils';

interface BrandColor {
    id: string;
    name: string;
    hex: string;
}

interface CompanyBranding {
    brandColors: BrandColor[];
    themeMapping: {
        primary: string;
        secondary: string;
        accent: string;
    };
}


const videoSchema = z.object({
    title: z.string(),
    description: z.string().optional(),
    url: z.string(),
});

const companyProfileSchema = z.object({
    name: z.string().min(2, { message: 'Нэр дор хаяж 2 тэмдэгттэй байх ёстой.' }),
    logoUrl: z.string().optional(),
    legalName: z.string().optional(),
    registrationNumber: z.string().optional(),
    taxId: z.string().optional(),
    industry: z.string().optional(),
    employeeCount: z.string().optional(),
    ceo: z.string().optional(),
    website: z.string().url({ message: 'Вэбсайтын хаяг буруу байна.' }).optional().or(z.literal('')),
    mission: z.string().optional(),
    vision: z.string().optional(),
    videos: z.array(videoSchema).optional(),
    phoneNumber: z.string().optional(),
    contactEmail: z.string().email().optional().or(z.literal('')),
    address: z.string().optional(),
    introduction: z.string().optional(),
    coverUrls: z.array(z.string()).optional(),
});

type CompanyProfileValues = z.infer<typeof companyProfileSchema>;


const valueIcons: { [key: string]: React.ElementType } = {
    responsibility: Handshake,
    innovation: Zap,
    collaboration: Users2,
    default: Shield,
};

const InfoRow = ({
    icon: Icon,
    label,
    value,
    className,
}: {
    icon: React.ElementType;
    label: string;
    value?: string | null;
    className?: string;
}) => (
    <div className={`flex items-start gap-4 ${className}`}>
        <Icon className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-medium text-foreground">{value || 'Тодорхойгүй'}</p>
        </div>
    </div>
);

function PageSkeleton() {
    return (
        <div className='space-y-12 py-8'>
            <div className="flex flex-col items-center text-center space-y-4 mb-12">
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="h-10 w-64" />
            </div>
            <div className="space-y-8">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        </div>
    );
}

export default function CompanyPage() {
    const { firestore } = useFirebase();
    const companyProfileRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'company', 'profile') : null),
        [firestore]
    );

    const departmentsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departments') : null), [firestore]);
    const positionsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'positions') : null), [firestore]);
    const policiesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'companyPolicies') : null), [firestore]);

    const brandingRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'company', 'branding') : null),
        [firestore]
    );

    const valuesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'company', 'branding', 'values'), orderBy('createdAt', 'asc')) : null), [firestore]);
    const { data: companyProfile, isLoading: isLoadingProfile, error } = useDoc<CompanyProfileValues>(companyProfileRef as any);
    const { data: branding, isLoading: isLoadingBranding } = useDoc<CompanyBranding>(brandingRef as any);
    const { data: departments, isLoading: isLoadingDepts } = useCollection(departmentsQuery);
    const { data: positions, isLoading: isLoadingPos } = useCollection(positionsQuery);
    const { data: policies, isLoading: isLoadingPolicies } = useCollection(policiesQuery);
    const { data: coreValues, isLoading: isLoadingValues } = useCollection<CoreValue>(valuesQuery);

    const [api, setApi] = React.useState<CarouselApi>();

    React.useEffect(() => {
        if (!api) return;

        const intervalId = setInterval(() => {
            api.scrollNext();
        }, 5000);

        return () => clearInterval(intervalId);
    }, [api]);

    const isLoading = isLoadingProfile || isLoadingDepts || isLoadingPos || isLoadingPolicies || isLoadingValues || isLoadingBranding;

    const brandStyles = React.useMemo(() => {
        if (!branding || !branding.brandColors || !branding.themeMapping) return {};

        const { brandColors, themeMapping } = branding;
        const styles: any = {};

        const primaryColor = brandColors.find(c => c.id === themeMapping.primary);
        const secondaryColor = brandColors.find(c => c.id === themeMapping.secondary);
        const accentColor = brandColors.find(c => c.id === themeMapping.accent);

        if (primaryColor) styles['--primary'] = hexToHsl(primaryColor.hex);
        if (secondaryColor) styles['--secondary'] = hexToHsl(secondaryColor.hex);
        if (accentColor) styles['--accent'] = hexToHsl(accentColor.hex);

        return styles;
    }, [branding]);


    if (error) {
        return (
            <div className="flex flex-col h-full overflow-hidden p-6 md:p-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Алдаа гарлаа</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-destructive">Компанийн мэдээллийг ачаалахад алдаа гарлаа: {error.message}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 pb-32">
                    <PageSkeleton />
                </div>
            </div>
        )
    }

    if (!companyProfile) {
        return (
            <div className="flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 pb-32">
                    <PageHeader showBackButton backHref="/dashboard" title="Компани" description="Байгууллагын танилцуулга" />
                    <Card>
                        <CardHeader>
                            <CardTitle>Мэдээлэл олдсонгүй</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground mb-4">Компанийн мэдээлэл хараахан оруулаагүй байна.</p>
                            <Button asChild>
                                <Link href="/dashboard/company/edit">
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Мэдээлэл нэмэх
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full overflow-hidden" style={brandStyles}>
            <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-0 md:pt-0 space-y-12 pb-32 scroll-smooth">

                <PageHeader
                    showBackButton
                    hideBreadcrumbs
                    backHref="/dashboard"
                    title="Компанийн танилцуулга"
                />

                {/* Hero / Cover Section */}
                <div className="relative -mx-6 md:-mx-8 group">
                    <div className="overflow-hidden rounded-none md:rounded-b-[2rem]">
                        {companyProfile.coverUrls && companyProfile.coverUrls.length > 0 ? (
                            <Carousel setApi={setApi} className="w-full" opts={{ loop: true }}>
                                <CarouselContent className="-ml-0">
                                    {companyProfile.coverUrls.map((url, index) => (
                                        <CarouselItem key={index} className="pl-0">
                                            <div className="relative h-[350px] md:h-[450px] w-full bg-slate-100 overflow-hidden">
                                                <img src={url} alt={`Cover ${index + 1}`} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                                            </div>
                                        </CarouselItem>
                                    ))}
                                </CarouselContent>
                            </Carousel>
                        ) : (
                            <div className="h-[250px] bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 w-full" />
                        )}
                    </div>

                    {/* Logo - 50% Overlap - Now outside overflow-hidden */}
                    <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 z-30">
                        <div className="relative group/logo">
                            <div className="absolute inset-0 bg-primary/20 rounded-[3rem] blur-2xl opacity-0 group-hover/logo:opacity-100 transition-opacity duration-500" />
                            <Avatar className="h-44 w-44 rounded-[3rem] border-[10px] border-background shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] ring-1 ring-slate-200 p-5 bg-white dark:bg-slate-900 relative z-10 transition-transform duration-500 group-hover/logo:scale-[1.02]">
                                <AvatarImage src={companyProfile.logoUrl} className="object-contain rounded-[1.8rem]" />
                                <AvatarFallback className="rounded-[1.8rem] bg-slate-50 dark:bg-slate-800">
                                    <Building className="h-16 w-16 text-slate-300" />
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                </div>

                <div className="pt-24 pb-12 px-6 flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
                    <div className="text-center space-y-6 max-w-4xl mx-auto">
                        <div className="space-y-2">
                            <p className="text-primary font-bold tracking-[0.3em] uppercase text-xs sm:text-sm animate-in fade-in slide-in-from-bottom-2 delay-300 duration-700">
                                {companyProfile.industry}
                            </p>
                            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">
                                {companyProfile.name}
                            </h1>
                        </div>

                        {/* Minimalist Action Bar */}
                        <div className="flex flex-wrap justify-center gap-3 pt-6 animate-in fade-in slide-in-from-bottom-2 delay-500 duration-700">
                            <Button asChild variant="ghost" className="rounded-full px-6 h-10 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary transition-all">
                                <Link href="/dashboard/company/edit">
                                    <Pencil className="mr-2 h-3.5 w-3.5" />
                                    Мэдээлэл засах
                                </Link>
                            </Button>
                            <Button asChild variant="ghost" className="rounded-full px-6 h-10 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary transition-all">
                                <Link href="/dashboard/company/mission">
                                    <Rocket className="mr-2 h-3.5 w-3.5" />
                                    Соёл
                                </Link>
                            </Button>
                            <Button asChild variant="ghost" className="rounded-full px-6 h-10 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary transition-all">
                                <Link href="/dashboard/company/videos">
                                    <Video className="mr-2 h-3.5 w-3.5" />
                                    Видео
                                </Link>
                            </Button>
                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-2 self-center hidden sm:block" />
                            <Button asChild variant="ghost" className="rounded-full px-6 h-10 font-bold hover:bg-purple-50 text-purple-600 dark:text-purple-400 transition-all">
                                <Link href="/dashboard/company/branding">
                                    <Settings className="mr-2 h-3.5 w-3.5" />
                                    Брэндинг
                                </Link>
                            </Button>
                        </div>

                        {/* Refined Metadata Bar */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 pt-12 animate-in fade-in slide-in-from-bottom-2 delay-700 duration-700">
                            {companyProfile.ceo && (
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Захирал</p>
                                    <p className="text-base font-bold text-slate-800 dark:text-slate-200">{companyProfile.ceo}</p>
                                </div>
                            )}
                            {companyProfile.registrationNumber && (
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Регистр</p>
                                    <p className="text-base font-bold text-slate-800 dark:text-slate-200">{companyProfile.registrationNumber}</p>
                                </div>
                            )}
                            {companyProfile.contactEmail && (
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">И-мэйл</p>
                                    <p className="text-base font-bold text-slate-800 dark:text-slate-200">{companyProfile.contactEmail}</p>
                                </div>
                            )}
                            {companyProfile.website && (
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Вэбсайт</p>
                                    <a href={companyProfile.website} target="_blank" rel="noopener noreferrer" className="text-base font-bold text-slate-800 dark:text-slate-200 hover:text-primary transition-colors block truncate max-w-[150px] mx-auto">
                                        {companyProfile.website.replace(/^https?:\/\//, '')}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Introduction - Ultra Clean */}
                {companyProfile.introduction && (
                    <div className="max-w-3xl mx-auto px-6 py-20 animate-in fade-in delay-1000 duration-1000">
                        <div className="space-y-6 text-center">
                            <Quote className="h-8 w-8 text-primary/20 mx-auto opacity-50" />
                            <p className="text-2xl md:text-3xl font-medium text-slate-700 dark:text-slate-300 leading-snug tracking-tight italic">
                                "{companyProfile.introduction}"
                            </p>
                        </div>
                    </div>
                )}

                {/* Mission & Vision - Open & Airy */}
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 sm:gap-20 my-20 px-6">
                    <div className="space-y-6 group">
                        <div className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] w-fit group-hover:bg-primary/5 group-hover:border-primary/20 transition-all duration-500">
                            <Rocket className="h-8 w-8 text-primary" />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase">Эрхэм зорилго</h2>
                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-lg font-medium">
                                {companyProfile.mission || 'Эрхэм зорилго оруулаагүй байна.'}
                            </p>
                        </div>
                    </div>
                    <div className="space-y-6 group">
                        <div className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] w-fit group-hover:bg-primary/5 group-hover:border-primary/20 transition-all duration-500">
                            <Eye className="h-8 w-8 text-primary" />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase">Алсын хараа</h2>
                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-lg font-medium">
                                {companyProfile.vision || 'Алсын хараа оруулаагүй байна.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Values - Infinite Smooth Design */}
                {coreValues && coreValues.length > 0 && (
                    <div className="bg-slate-50/50 dark:bg-slate-900/30 py-24 -mx-6 md:-mx-8 px-6 md:px-8 border-y border-slate-100 dark:border-slate-800/50">
                        <div className="max-w-7xl mx-auto">
                            <div className="flex flex-col items-center text-center space-y-4 mb-16">
                                <h2 className="text-[10px] font-black tracking-[0.4em] uppercase text-primary">Core Values</h2>
                                <h3 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white">Бидний үнэт зүйлс</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                {coreValues.filter(v => v.isActive).map((value, index) => (
                                    <div key={value.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 group overflow-hidden relative">
                                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500">
                                            <div className="text-9xl rotate-12">{value.emoji || '⭐'}</div>
                                        </div>
                                        <div
                                            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-8 shadow-inner"
                                            style={{ backgroundColor: `${value.color}10`, color: value.color }}
                                        >
                                            {value.emoji || '⭐'}
                                        </div>
                                        <h4 className="text-2xl font-black mb-4 text-slate-900 dark:text-white">{value.title}</h4>
                                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                                            {value.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Videos - Cinematic Grid */}
                {companyProfile.videos && companyProfile.videos.length > 0 && (
                    <div className="max-w-7xl mx-auto py-24 px-6">
                        <div className="flex items-center justify-between mb-16">
                            <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase">Видео танилцуулга</h2>
                            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 mx-10 hidden sm:block" />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                            {companyProfile.videos.map((video, index) => (
                                <div key={index} className="space-y-8 group">
                                    <div className="aspect-video rounded-[2.5rem] overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl group-hover:shadow-2xl group-hover:shadow-primary/10 transition-all duration-700 relative">
                                        <video src={video.url} controls className="w-full h-full object-cover" />
                                    </div>
                                    <div className="px-4 space-y-2">
                                        <h4 className="font-black text-2xl text-slate-900 dark:text-white">{video.title}</h4>
                                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{video.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Location - Clean Footer style */}
                {companyProfile.address && (
                    <div className="max-w-4xl mx-auto py-24 px-6 border-t border-slate-100 dark:border-slate-800/50">
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800">
                                <MapPin className="h-5 w-5 text-primary" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-[10px] font-black tracking-widest uppercase text-slate-400">Бидний хаяг</h3>
                                <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{companyProfile.address}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
