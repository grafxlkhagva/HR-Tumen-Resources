'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Pencil, Building, Hash, Info, Users, User, Globe, Briefcase, FileText, Rocket, Eye, Shield, Phone, Mail, MapPin, Video, ArrowLeft, Handshake, Zap, Users2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { z } from 'zod';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';


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
      <p className="font-medium">{value || 'Тодорхойгүй'}</p>
    </div>
  </div>
);

function PageSkeleton() {
    return (
        <div className='space-y-8 py-8'>
             <div className="mb-4">
                <Skeleton className="h-9 w-24" />
            </div>
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
  
  const { data: companyProfile, isLoading: isLoadingProfile, error } = useDoc<CompanyProfileValues>(companyProfileRef);
  
  if (error) {
      return (
          <div className="py-8">
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

  if (isLoadingProfile) {
    return <PageSkeleton />;
  }
  
  if (!companyProfile) {
      return (
           <div className="py-8 text-center">
                <div className="mb-4 flex justify-start">
                    <Button asChild variant="outline" size="sm">
                        <Link href="/dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Буцах
                        </Link>
                    </Button>
                </div>
              <Card>
                <CardHeader>
                    <CardTitle>Мэдээлэл олдсонгүй</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-4">Компанийн мэдээлэл henüz оруулаагүй байна.</p>
                    <Button asChild>
                        <Link href="/dashboard/company/edit">
                            <Pencil className="mr-2 h-4 w-4" />
                            Мэдээлэл нэмэх
                        </Link>
                    </Button>
                </CardContent>
              </Card>
           </div>
      )
  }

  return (
    <div className="py-8 space-y-12">
        <div className="mb-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Буцах
            </Link>
          </Button>
        </div>

        {/* Hero Section */}
        <div className="flex flex-col items-center text-center space-y-4">
             <Avatar className="h-24 w-24 rounded-lg border-2 border-border p-1">
                <AvatarImage src={companyProfile.logoUrl} className="object-contain rounded-md"/>
                <AvatarFallback className="rounded-lg bg-muted">
                    <Building className="h-10 w-10 text-muted-foreground" />
                </AvatarFallback>
            </Avatar>
            <h1 className="text-4xl font-bold tracking-tight">{companyProfile.name}</h1>
        </div>
        
        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <Rocket className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-semibold">Эрхэм зорилго</h2>
                </div>
                <p className="text-muted-foreground">{companyProfile.mission || 'Эрхэм зорилго оруулаагүй байна.'}</p>
            </div>
             <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <Eye className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-semibold">Алсын хараа</h2>
                </div>
                <p className="text-muted-foreground">{companyProfile.vision || 'Алсын хараа оруулаагүй байна.'}</p>
            </div>
        </div>

        {/* Values */}
        {companyProfile.values && companyProfile.values.length > 0 && (
            <div>
                <div className="flex items-center gap-3 mb-6">
                    <Shield className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-semibold">Үнэт зүйлс</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {companyProfile.values.map((value, index) => {
                        const Icon = valueIcons[value.icon] || valueIcons.default;
                        return (
                            <Card key={index} className="p-6 text-center hover:shadow-lg transition-shadow">
                                <div className="mb-4 inline-block rounded-full bg-primary/10 p-3">
                                   <Icon className="h-7 w-7 text-primary" />
                                </div>
                                <h3 className="text-lg font-semibold">{value.title}</h3>
                                <p className="text-sm text-muted-foreground mt-1">{value.description}</p>
                            </Card>
                        );
                    })}
                </div>
            </div>
        )}

        {/* Videos */}
        {companyProfile.videos && companyProfile.videos.length > 0 && (
            <div>
                <div className="flex items-center gap-3 mb-6">
                    <Video className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-semibold">Видео танилцуулга</h2>
                </div>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {companyProfile.videos.map((video, index) => (
                        <div key={index} className="space-y-3">
                            <div className="aspect-video rounded-lg overflow-hidden bg-muted border">
                                <video src={video.url} controls className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h4 className="font-semibold">{video.title}</h4>
                                <p className="text-sm text-muted-foreground">{video.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* General & Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Ерөнхий мэдээлэл</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <InfoRow icon={FileText} label="Компанийн нэр" value={companyProfile.name} />
                    <InfoRow icon={Info} label="Хуулийн этгээдийн нэр" value={companyProfile.legalName} />
                    <InfoRow icon={Hash} label="Улсын бүртгэлийн дугаар" value={companyProfile.registrationNumber} />
                    <InfoRow icon={Hash} label="Татвар төлөгчийн дугаар" value={companyProfile.taxId} />
                    <InfoRow icon={Briefcase} label="Үйл ажиллагааны чиглэл" value={companyProfile.industry} />
                    <InfoRow icon={Users} label="Ажилтны тоо" value={companyProfile.employeeCount} />
                    <InfoRow icon={User} label="Гүйцэтгэх захирал" value={companyProfile.ceo} />
                    <InfoRow icon={Globe} label="Веб хуудас" value={companyProfile.website} />
                </CardContent>
            </Card>
            <Card>
                 <CardHeader>
                    <CardTitle>Холбоо барих мэдээлэл</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <InfoRow icon={Phone} label="Утасны дугаар" value={companyProfile.phoneNumber} />
                    <InfoRow icon={Mail} label="Ерөнхий и-мэйл" value={companyProfile.contactEmail} />
                    <InfoRow icon={MapPin} label="Хаяг" value={companyProfile.address} />
                </CardContent>
            </Card>
        </div>
        
        {/* Edit Buttons - fixed at the bottom right */}
        <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-50">
            <Button asChild variant="outline" size="sm" className="shadow-lg">
                <Link href="/dashboard/company/edit">
                    <Pencil className="mr-2 h-4 w-4" />
                    Үндсэн мэдээлэл
                </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="shadow-lg">
                <Link href="/dashboard/company/mission">
                    <Rocket className="mr-2 h-4 w-4" />
                    Соёл
                </Link>
            </Button>
             <Button asChild variant="outline" size="sm" className="shadow-lg">
                <Link href="/dashboard/company/videos">
                    <Video className="mr-2 h-4 w-4" />
                    Видео
                </Link>
            </Button>
        </div>
    </div>
  );
}
