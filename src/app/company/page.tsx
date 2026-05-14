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
import { useFirebase, useDoc, useMemoFirebase, useFetchCollection, tenantDoc, tenantCollection, useTenantWrite } from '@/firebase';
import { collection, addDoc, updateDoc, Timestamp, deleteDoc, writeBatch } from 'firebase/firestore';
import { Pencil, Building, Hash, Users, User, Globe, FileText, Rocket, Eye, Shield, Phone, Mail, MapPin, Video, Handshake, Zap, Users2, ScrollText, ChevronLeft, ExternalLink, Calendar, Palette, Building2, History, Landmark, Star, Copy, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { companyProfileSchema, CompanyProfileValues, videoSchema } from './schemas';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/patterns/page-layout';
import { CoreValue } from '@/types/points';
import { query, orderBy } from 'firebase/firestore';
import { hexToHsl } from '@/lib/color-utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Position, Department } from '@/app/dashboard/organization/types';

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
    const { toast } = useToast();
    const { tDoc, tCollection } = useTenantWrite();
    const [api, setApi] = React.useState<CarouselApi>();

    React.useEffect(() => {
        if (!api) return;
        const id = setInterval(() => api.scrollNext(), 5000);
        return () => clearInterval(id);
    }, [api]);

    const companyProfileRef = useMemoFirebase(
        ({ firestore, companyPath }) => (firestore ? tenantDoc(firestore, companyPath, 'company', 'profile') : null), []
    );
    const departmentsQuery = useMemoFirebase(({ firestore, companyPath }) => (firestore ? tenantCollection(firestore, companyPath, 'departments') : null), []);
    const positionsQuery = useMemoFirebase(({ firestore, companyPath }) => (firestore ? tenantCollection(firestore, companyPath, 'positions') : null), []);
    const policiesQuery = useMemoFirebase(({ firestore, companyPath }) => (firestore ? tenantCollection(firestore, companyPath, 'companyPolicies') : null), []);
    const brandingRef = useMemoFirebase(({ firestore, companyPath }) => (firestore ? tenantDoc(firestore, companyPath, 'company', 'branding') : null), []);
    const valuesQuery = useMemoFirebase(
        ({ firestore, companyPath }) => {
            if (!firestore || !companyPath) return null;
            return query(collection(firestore, `${companyPath}/company/branding/values`), orderBy('createdAt', 'asc'));
        }, []
    );

    const { data: companyProfile, isLoading: isLoadingProfile, error } = useDoc<CompanyProfileValues>(companyProfileRef as any);
    const { data: branding, isLoading: isLoadingBranding } = useDoc<CompanyBranding>(brandingRef as any);
    const { data: departments, isLoading: isLoadingDepts } = useFetchCollection<Department>(departmentsQuery);
    const { data: positions, isLoading: isLoadingPos } = useFetchCollection<Position>(positionsQuery);
    const { data: policies, isLoading: isLoadingPolicies } = useFetchCollection(policiesQuery);
    const { data: coreValues, isLoading: isLoadingValues } = useFetchCollection<CoreValue>(valuesQuery);

    const isLoading = isLoadingProfile || isLoadingDepts || isLoadingPos || isLoadingPolicies || isLoadingValues || isLoadingBranding;

    const brandStyles = React.useMemo(() => {
        if (!branding?.brandColors || !branding?.themeMapping) return {};
        const { brandColors, themeMapping } = branding;
        const styles: Record<string, string> = {};
        const primary = brandColors.find(c => c.id === themeMapping.primary);
        const secondary = brandColors.find(c => c.id === themeMapping.secondary);
        const accent = brandColors.find(c => c.id === themeMapping.accent);
        const p = primary ? hexToHsl(primary.hex) : null;
        const s = secondary ? hexToHsl(secondary.hex) : null;
        const a = accent ? hexToHsl(accent.hex) : null;
        if (p) styles['--primary'] = p;
        if (s) styles['--secondary'] = s;
        if (a) styles['--accent'] = a;
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
                                <Link href="/company/edit">
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
        <div className="flex flex-col h-full" style={brandStyles}>
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-20">
                <div className="px-6 md:px-8">
                    <div className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                <Link href="/dashboard">
                                    <ChevronLeft className="h-4 w-4" />
                                </Link>
                            </Button>
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 rounded-lg border">
                                    <AvatarImage src={companyProfile.logoUrl} className="object-contain" />
                                    <AvatarFallback className="rounded-lg bg-primary/10">
                                        <Building className="h-5 w-5 text-primary" />
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h1 className="text-lg font-semibold">{companyProfile.name}</h1>
                                    <p className="text-xs text-muted-foreground">{companyProfile.industry || 'Компанийн танилцуулга'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" asChild>
                                <Link href="/company/edit">
                                    <Pencil className="h-3.5 w-3.5 mr-2" />
                                    Засах
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="p-6 md:p-8 space-y-8 pb-32">

                    {/* Hero Card with Cover */}
                    <div className="bg-white rounded-xl border overflow-hidden">
                        {/* Cover Image */}
                        {companyProfile.coverUrls && companyProfile.coverUrls.length > 0 ? (
                            <Carousel setApi={setApi} className="w-full" opts={{ loop: true }}>
                                <CarouselContent className="-ml-0">
                                    {companyProfile.coverUrls.map((url, index) => (
                                        <CarouselItem key={index} className="pl-0">
                                            <div className="relative h-[200px] md:h-[280px] w-full bg-slate-100">
                                                <img src={url} alt={`Cover ${index + 1}`} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                            </div>
                                        </CarouselItem>
                                    ))}
                                </CarouselContent>
                            </Carousel>
                        ) : (
                            <div className="h-[160px] bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
                        )}

                        {/* Company Info */}
                        <div className="p-6 -mt-16 relative bg-white" style={{ marginTop: '-4rem' }}>
                            <div className="flex flex-col md:flex-row gap-6">
                                <Avatar className="h-28 w-28 rounded-2xl border-4 border-white shadow-lg bg-white self-start md:self-end">
                                    <AvatarImage src={companyProfile.logoUrl} className="object-contain p-2" />
                                    <AvatarFallback className="rounded-2xl bg-slate-50">
                                        <Building className="h-12 w-12 text-slate-300" />
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-2 mt-20 md:mt-0 md:pt-28">
                                    <h2 className="text-2xl font-bold text-foreground">{companyProfile.name}</h2>
                                    {companyProfile.legalName && (
                                        <p className="text-sm text-muted-foreground">{companyProfile.legalName}</p>
                                    )}
                                    {companyProfile.introduction && (
                                        <p className="text-sm text-foreground leading-relaxed bg-white rounded-lg p-3 border border-slate-200">
                                            {companyProfile.introduction}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                        {companyProfile.employeeCount && (
                                            <Badge variant="outline" className="gap-1">
                                                <Users className="h-3 w-3" />
                                                {companyProfile.employeeCount} ажилтан
                                            </Badge>
                                        )}
                                        {companyProfile.establishedDate && (
                                            <Badge variant="outline" className="gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {companyProfile.establishedDate}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <Link href="/company/mission" className="bg-white rounded-xl border p-4 hover:border-primary/50 hover:shadow-sm transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                                    <Rocket className="h-5 w-5 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Соёл</p>
                                    <p className="text-xs text-muted-foreground">Эрхэм зорилго</p>
                                </div>
                            </div>
                        </Link>
                        <Link href="/company/videos" className="bg-white rounded-xl border p-4 hover:border-primary/50 hover:shadow-sm transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                    <Video className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Видео</p>
                                    <p className="text-xs text-muted-foreground">{companyProfile.videos?.length || 0} видео</p>
                                </div>
                            </div>
                        </Link>
                        <Link href="/company/branding" className="bg-white rounded-xl border p-4 hover:border-primary/50 hover:shadow-sm transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-violet-50 flex items-center justify-center group-hover:bg-violet-100 transition-colors">
                                    <Palette className="h-5 w-5 text-violet-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Брэндинг</p>
                                    <p className="text-xs text-muted-foreground">Өнгө, лого</p>
                                </div>
                            </div>
                        </Link>
                        <Link href="/company/policies" className="bg-white rounded-xl border p-4 hover:border-primary/50 hover:shadow-sm transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                                    <ScrollText className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Журам</p>
                                    <p className="text-xs text-muted-foreground">{policies?.length || 0} журам</p>
                                </div>
                            </div>
                        </Link>
                        <Link href="/company/history" className="bg-white rounded-xl border p-4 hover:border-primary/50 hover:shadow-sm transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                                    <History className="h-5 w-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Түүх</p>
                                    <p className="text-xs text-muted-foreground">Үйл явдлууд</p>
                                </div>
                            </div>
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - Details */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Mission & Vision */}
                            <div className="bg-white rounded-xl border">
                                <div className="px-4 py-3 border-b">
                                    <h3 className="text-caption-medium text-foreground">Эрхэм зорилго & Алсын хараа</h3>
                                </div>
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <p className="text-micro text-muted-foreground uppercase tracking-wider">Эрхэм зорилго</p>
                                        <p className="text-caption text-foreground leading-relaxed">
                                            {companyProfile.mission || 'Оруулаагүй байна'}
                                        </p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <p className="text-micro text-muted-foreground uppercase tracking-wider">Алсын хараа</p>
                                        <p className="text-caption text-foreground leading-relaxed">
                                            {companyProfile.vision || 'Оруулаагүй байна'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Core Values - карт бүр тусад картаар */}
                            {coreValues && coreValues.filter(v => v.isActive !== false).length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-caption-medium text-foreground px-1">Үнэт зүйлс</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {coreValues.filter(v => v.isActive !== false).map((value) => (
                                            <Card key={value.id} className="rounded-xl border overflow-hidden">
                                                <CardContent className="p-4 flex items-start gap-3">
                                                    <div
                                                        className="h-10 w-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                                                        style={{ backgroundColor: `${value.color}15` }}
                                                    >
                                                        {value.emoji || '⭐'}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-medium text-sm">{value.title}</p>
                                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{value.description}</p>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Videos */}
                            {companyProfile.videos && companyProfile.videos.length > 0 && (
                                <div className="bg-white rounded-xl border">
                                    <div className="px-4 py-3 border-b flex items-center justify-between">
                                        <h3 className="text-caption-medium text-foreground">Видео танилцуулга</h3>
                                        <Button variant="ghost" size="sm" className="h-7 text-caption" asChild>
                                            <Link href="/company/videos">
                                                Бүгдийг харах
                                            </Link>
                                        </Button>
                                    </div>
                                    <div className="p-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {companyProfile.videos.slice(0, 2).map((video, index) => (
                                                <div key={index} className="space-y-3">
                                                    <div className="aspect-video rounded-lg overflow-hidden bg-slate-100">
                                                        <video src={video.url} controls className="w-full h-full object-cover" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm">{video.title}</p>
                                                        {video.description && (
                                                            <p className="text-xs text-muted-foreground line-clamp-1">{video.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column - Info */}
                        <div className="space-y-6">
                            {/* Company Info Card */}
                            <div className="bg-white rounded-xl border">
                                <div className="px-4 py-3 border-b">
                                    <h3 className="text-caption-medium text-foreground">Үндсэн мэдээлэл</h3>
                                </div>
                                <div className="p-4 space-y-3">
                                    {companyProfile.ceo && (
                                        <div>
                                            <p className="text-micro text-muted-foreground">Захирал</p>
                                            <p className="text-caption text-foreground">{companyProfile.ceo}</p>
                                        </div>
                                    )}
                                    {companyProfile.registrationNumber && (
                                        <div>
                                            <p className="text-micro text-muted-foreground">Регистр</p>
                                            <p className="text-caption font-mono text-foreground">{companyProfile.registrationNumber}</p>
                                        </div>
                                    )}
                                    {companyProfile.taxId && (
                                        <div>
                                            <p className="text-micro text-muted-foreground">Татварын дугаар</p>
                                            <p className="text-caption font-mono text-foreground">{companyProfile.taxId}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Contact Card */}
                            <div className="bg-white rounded-xl border">
                                <div className="px-4 py-3 border-b">
                                    <h3 className="text-caption-medium text-foreground">Холбоо барих</h3>
                                </div>
                                <div className="p-4 space-y-3">
                                    {companyProfile.phoneNumber && (
                                        <div>
                                            <p className="text-micro text-muted-foreground">Утас</p>
                                            <p className="text-caption text-foreground">{companyProfile.phoneNumber}</p>
                                        </div>
                                    )}
                                    {companyProfile.contactEmail && (
                                        <div>
                                            <p className="text-micro text-muted-foreground">И-мэйл</p>
                                            <p className="text-caption text-foreground">{companyProfile.contactEmail}</p>
                                        </div>
                                    )}
                                    {companyProfile.website && (
                                        <div>
                                            <p className="text-micro text-muted-foreground">Вэбсайт</p>
                                            <a href={companyProfile.website} target="_blank" rel="noopener noreferrer" className="text-caption text-primary hover:underline inline-flex items-center gap-1">
                                                {companyProfile.website.replace(/^https?:\/\//, '')}
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                    )}
                                    {companyProfile.address && (
                                        <div>
                                            <p className="text-micro text-muted-foreground">Хаяг</p>
                                            <p className="text-caption text-foreground leading-relaxed">{companyProfile.address}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Bank Accounts Card */}
                            {companyProfile.bankAccounts && companyProfile.bankAccounts.length > 0 && (
                                <div className="bg-white rounded-xl border">
                                    <div className="px-4 py-3 border-b flex items-center justify-between">
                                        <h3 className="text-caption-medium text-foreground">Банкны данс</h3>
                                        <span className="text-micro text-muted-foreground">{companyProfile.bankAccounts.length}</span>
                                    </div>
                                    <div className="p-4 space-y-2">
                                        {companyProfile.bankAccounts.map((account, index) => (
                                            <div key={index} className="space-y-1 py-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-caption-medium text-foreground truncate">{account.bankName}</p>
                                                    {account.isPrimary && (
                                                        <Badge variant="outline" className="text-micro h-4 shrink-0">Үндсэн</Badge>
                                                    )}
                                                </div>
                                                {account.accountName && (
                                                    <p className="text-micro text-muted-foreground truncate">{account.accountName}</p>
                                                )}
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-caption font-mono text-foreground">{account.accountNumber}</p>
                                                    {account.currency && (
                                                        <span className="text-micro text-muted-foreground">{account.currency}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Subsidiaries Card */}
                            <Link href="/company/subsidiaries" className="block bg-white rounded-xl border hover:border-primary/50 hover:shadow-sm transition-all">
                                <div className="px-4 py-3 border-b flex items-center justify-between">
                                    <h3 className="text-caption-medium text-foreground">Охин компаниуд</h3>
                                    <ChevronLeft className="h-3.5 w-3.5 rotate-180 text-muted-foreground" />
                                </div>
                                <div className="p-4">
                                    {companyProfile.subsidiaries && companyProfile.subsidiaries.length > 0 ? (
                                        <div className="space-y-2">
                                            {companyProfile.subsidiaries.slice(0, 3).map((item, index) => {
                                                const name = typeof item === 'string' ? item : item.name;
                                                const regNum = typeof item === 'string' ? null : (item as { registrationNumber?: string }).registrationNumber;
                                                const logoUrl = typeof item === 'string' ? null : (item as { logoUrl?: string }).logoUrl;
                                                return (
                                                    <div key={index} className="flex items-center gap-2 py-1">
                                                        {logoUrl && (
                                                            <Avatar className="h-6 w-6 rounded-md shrink-0">
                                                                <AvatarImage src={logoUrl} alt={name} className="object-cover" />
                                                                <AvatarFallback className="rounded-md bg-muted text-micro">
                                                                    {name.charAt(0)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="text-caption text-foreground truncate">{name}</p>
                                                            {regNum && (
                                                                <p className="text-micro text-muted-foreground">РД: {regNum}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {companyProfile.subsidiaries.length > 3 && (
                                                <p className="text-micro text-muted-foreground text-center pt-1">
                                                    +{companyProfile.subsidiaries.length - 3} бусад
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-caption text-muted-foreground text-center py-3">
                                            Охин компани нэмэх
                                        </p>
                                    )}
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
