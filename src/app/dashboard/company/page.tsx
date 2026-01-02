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
import { Button } from '@/components/ui/button';
import { useFirebase, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Pencil, Building, Hash, Info, Users, User, Globe, Briefcase, FileText, Rocket, Eye, Shield, Phone, Mail, MapPin, Video, ArrowLeft, Handshake, Zap, Users2, Network, ScrollText, Settings } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { z } from 'zod';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';

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
    values: z.array(z.object({
        title: z.string(),
        description: z.string(),
        icon: z.string(),
    })).optional(),
    videos: z.array(videoSchema).optional(),
    phoneNumber: z.string().optional(),
    contactEmail: z.string().email().optional().or(z.literal('')),
    address: z.string().optional(),
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

    const { data: companyProfile, isLoading: isLoadingProfile, error } = useDoc<CompanyProfileValues>(companyProfileRef as any);
    const { data: departments, isLoading: isLoadingDepts } = useCollection(departmentsQuery);
    const { data: positions, isLoading: isLoadingPos } = useCollection(positionsQuery);
    const { data: policies, isLoading: isLoadingPolicies } = useCollection(policiesQuery);

    const isLoading = isLoadingProfile || isLoadingDepts || isLoadingPos || isLoadingPolicies;

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
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-12 pb-32 scroll-smooth">

                <PageHeader
                    showBackButton
                    backHref="/dashboard"
                // title and description are visually handled by the Hero Section below, so we can keep them empty or use them. 
                // Let's use them for consistency but keep the hero section for branding impact.
                />

                {/* Hero Section */}
                <div className="flex flex-col items-center text-center space-y-6 pt-4">
                    <Avatar className="h-32 w-32 rounded-2xl border-4 border-background shadow-xl ring-1 ring-border/50 p-2 bg-card">
                        <AvatarImage src={companyProfile.logoUrl} className="object-contain rounded-xl" />
                        <AvatarFallback className="rounded-xl bg-muted">
                            <Building className="h-12 w-12 text-muted-foreground" />
                        </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                        <h1 className="text-4xl font-black tracking-tight text-foreground">{companyProfile.name}</h1>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{companyProfile.industry}</p>
                    </div>
                </div>

                {/* Mission & Vision */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-card rounded-2xl p-8 border shadow-sm space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-xl">
                                <Rocket className="h-6 w-6 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold">Эрхэм зорилго</h2>
                        </div>
                        <p className="text-muted-foreground leading-relaxed text-lg">{companyProfile.mission || 'Эрхэм зорилго оруулаагүй байна.'}</p>
                    </div>
                    <div className="bg-card rounded-2xl p-8 border shadow-sm space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-xl">
                                <Eye className="h-6 w-6 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold">Алсын хараа</h2>
                        </div>
                        <p className="text-muted-foreground leading-relaxed text-lg">{companyProfile.vision || 'Алсын хараа оруулаагүй байна.'}</p>
                    </div>
                </div>

                {/* Values */}
                {companyProfile.values && companyProfile.values.length > 0 && (
                    <div>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="h-8 w-1 bg-primary rounded-full"></div>
                            <h2 className="text-2xl font-bold">Үнэт зүйлс</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {companyProfile.values.map((value, index) => {
                                const Icon = valueIcons[value.icon] || valueIcons.default;
                                return (
                                    <Card key={index} className="p-6 text-center hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-muted/60">
                                        <div className="mb-6 inline-flex rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-4 mx-auto">
                                            <Icon className="h-8 w-8 text-primary" />
                                        </div>
                                        <h3 className="text-lg font-bold mb-2">{value.title}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Videos */}
                {companyProfile.videos && companyProfile.videos.length > 0 && (
                    <div>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="h-8 w-1 bg-primary rounded-full"></div>
                            <h2 className="text-2xl font-bold">Видео танилцуулга</h2>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {companyProfile.videos.map((video, index) => (
                                <div key={index} className="space-y-4 group">
                                    <div className="aspect-video rounded-2xl overflow-hidden bg-black/5 border shadow-sm relative group-hover:shadow-md transition-all">
                                        <video src={video.url} controls className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg">{video.title}</h4>
                                        <p className="text-sm text-muted-foreground">{video.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* General & Contact Info */}
                <div>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-8 w-1 bg-primary rounded-full"></div>
                        <h2 className="text-2xl font-bold">Дэлгэрэнгүй мэдээлэл</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold">Ерөнхий мэдээлэл</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <InfoRow icon={FileText} label="Компанийн нэр" value={companyProfile.name} />
                                <InfoRow icon={Info} label="Хуулийн этгээдийн нэр" value={companyProfile.legalName} />
                                <InfoRow icon={Hash} label="РД" value={companyProfile.registrationNumber} />
                                <InfoRow icon={Hash} label="Татвар төлөгчийн дугаар" value={companyProfile.taxId} />
                                <InfoRow icon={Briefcase} label="Үйл ажиллагааны чиглэл" value={companyProfile.industry} />
                                <InfoRow icon={Users} label="Ажилтны тоо" value={companyProfile.employeeCount} />
                                <InfoRow icon={User} label="Гүйцэтгэх захирал" value={companyProfile.ceo} />
                                <InfoRow icon={Globe} label="Веб хуудас" value={companyProfile.website} />
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold">Холбоо барих</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <InfoRow icon={Phone} label="Утасны дугаар" value={companyProfile.phoneNumber} />
                                <InfoRow icon={Mail} label="Ерөнхий и-мэйл" value={companyProfile.contactEmail} />
                                <InfoRow icon={MapPin} label="Хаяг" value={companyProfile.address} />
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm flex flex-col">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold">Байгууллагын бүтэц</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5 flex-1">
                                <InfoRow icon={Network} label="Нийт хэлтэс" value={departments?.length.toString() ?? '0'} />
                                <InfoRow icon={Briefcase} label="Нийт ажлын байр" value={positions?.length.toString() ?? '0'} />
                            </CardContent>
                            <CardFooter>
                                <Button asChild variant="secondary" className="w-full">
                                    <Link href="/dashboard/organization">Бүтцийн дэлгэрэнгүй</Link>
                                </Button>
                            </CardFooter>
                        </Card>
                        <Card className="shadow-sm flex flex-col">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold">Дүрэм, журам</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5 flex-1">
                                <InfoRow icon={ScrollText} label="Нийт баримт бичиг" value={policies?.length.toString() ?? '0'} />
                            </CardContent>
                            <CardFooter>
                                <Button asChild variant="secondary" className="w-full">
                                    <Link href="/dashboard/company/policies">Журам удирдах</Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>

                {/* Edit Buttons - fixed at the bottom right */}
                <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-50">
                    <Button asChild variant="outline" size="sm" className="shadow-lg bg-background/80 backdrop-blur hover:bg-background">
                        <Link href="/dashboard/company/edit">
                            <Pencil className="mr-2 h-4 w-4" />
                            Үндсэн мэдээлэл
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="shadow-lg bg-background/80 backdrop-blur hover:bg-background">
                        <Link href="/dashboard/company/mission">
                            <Rocket className="mr-2 h-4 w-4" />
                            Соёл
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="shadow-lg bg-background/80 backdrop-blur hover:bg-background">
                        <Link href="/dashboard/company/videos">
                            <Video className="mr-2 h-4 w-4" />
                            Видео
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="shadow-lg bg-background/80 backdrop-blur hover:bg-background">
                        <Link href="/dashboard/company/policies">
                            <ScrollText className="mr-2 h-4 w-4" />
                            Журам
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="shadow-lg border-purple-200 text-purple-700 hover:bg-purple-50 bg-background/80 backdrop-blur">
                        <Link href="/dashboard/settings/branding">
                            <Settings className="mr-2 h-4 w-4" />
                            Брэндинг
                        </Link>
                    </Button>
                </div>
            </div >
        </div>
    );
}
