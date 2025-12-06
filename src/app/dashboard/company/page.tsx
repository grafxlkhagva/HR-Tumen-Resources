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
import { Pencil, Building, Hash, Info, Users, User, Globe, Briefcase, FileText, Rocket, Eye, Shield, Handshake, Zap, Users2, Phone, Mail, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { z } from 'zod';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


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
  phoneNumber: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
});

type CompanyProfileValues = z.infer<typeof companyProfileSchema>;


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
        <div className='space-y-8'>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-16 w-16 rounded-lg" />
                        <Skeleton className="h-8 w-48" />
                    </div>
                    <Skeleton className="h-9 w-28" />
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div className="flex items-start gap-4" key={i}>
                            <Skeleton className="h-5 w-5 rounded-sm" />
                            <div className="space-y-1.5">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-5 w-36" />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-9 w-28" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-start gap-4">
                        <Skeleton className="h-6 w-6 rounded-sm" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-5 w-full" />
                            <Skeleton className="h-5 w-3/4" />
                        </div>
                    </div>
                     <div className="flex items-start gap-4">
                        <Skeleton className="h-6 w-6 rounded-sm" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-5 w-2/3" />
                        </div>
                    </div>
                    <div>
                        <Skeleton className="h-4 w-32" />
                         <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <Skeleton className="h-32 w-full rounded-lg" />
                            <Skeleton className="h-32 w-full rounded-lg" />
                            <Skeleton className="h-32 w-full rounded-lg" />
                         </div>
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <Skeleton className="h-8 w-56" />
                    <Skeleton className="h-9 w-28" />
                </CardHeader>
                 <CardContent className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
                    <div className="flex items-start gap-4">
                        <Skeleton className="h-5 w-5 rounded-sm" />
                        <div className="space-y-1.5">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-5 w-36" />
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <Skeleton className="h-5 w-5 rounded-sm" />
                        <div className="space-y-1.5">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-5 w-36" />
                        </div>
                    </div>
                    <div className="flex items-start gap-4 md:col-span-2">
                        <Skeleton className="h-5 w-5 rounded-sm" />
                        <div className="space-y-1.5">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-5 w-36" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

const valueIcons: { [key: string]: React.ElementType } = {
  responsibility: Handshake,
  innovation: Zap,
  collaboration: Users2,
  default: Shield,
};

const MissionVisionCard = ({ profile }: { profile: CompanyProfileValues }) => {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Эрхэм зорилго, Алсын хараа, Үнэт зүйлс</CardTitle>
                <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/company/edit">
                    <Pencil className="mr-2 h-4 w-4" />
                    Засварлах
                </Link>
                </Button>
            </CardHeader>
            <CardContent className="space-y-8">
                {profile.mission && (
                    <div className="flex items-start gap-4">
                        <Rocket className="h-6 w-6 flex-shrink-0 text-primary" />
                        <div>
                            <h3 className="font-semibold">Эрхэм зорилго</h3>
                            <p className="text-muted-foreground">{profile.mission}</p>
                        </div>
                    </div>
                )}
                {profile.vision && (
                     <div className="flex items-start gap-4">
                        <Eye className="h-6 w-6 flex-shrink-0 text-primary" />
                        <div>
                            <h3 className="font-semibold">Алсын хараа</h3>
                            <p className="text-muted-foreground">{profile.vision}</p>
                        </div>
                    </div>
                )}

                {profile.values && profile.values.length > 0 && (
                    <div>
                        <div className="flex items-start gap-4">
                            <Shield className="h-6 w-6 flex-shrink-0 text-primary" />
                            <div>
                                <h3 className="font-semibold">Үнэт зүйлс</h3>
                            </div>
                        </div>
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {profile.values.map((value, index) => {
                                const Icon = valueIcons[value.icon] || valueIcons.default;
                                return (
                                    <Card key={index} className="p-4 bg-muted/40">
                                        <div className="flex flex-col items-center text-center">
                                            <div className="mb-3 rounded-full bg-primary/10 p-3">
                                               <Icon className="h-6 w-6 text-primary" />
                                            </div>
                                            <h4 className="font-semibold">{value.title}</h4>
                                            <p className="text-sm text-muted-foreground mt-1">{value.description}</p>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const ContactInfoCard = ({ profile }: { profile: CompanyProfileValues }) => {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Холбоо барих мэдээлэл</CardTitle>
                <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/company/edit">
                    <Pencil className="mr-2 h-4 w-4" />
                    Засварлах
                </Link>
                </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-y-6 gap-x-8 md:grid-cols-2">
                <InfoRow icon={Phone} label="Утасны дугаар" value={profile.phoneNumber} />
                <InfoRow icon={Mail} label="Ерөнхий и-мэйл" value={profile.contactEmail} />
                <InfoRow icon={MapPin} label="Хаяг" value={profile.address} className="md:col-span-2" />
            </CardContent>
        </Card>
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
    return (
        <div className="py-8">
            <PageSkeleton />
        </div>
    )
  }
  
  const hasGeneralInfo = companyProfile && (companyProfile.name || companyProfile.legalName || companyProfile.ceo);
  const hasMissionInfo = companyProfile && (companyProfile.mission || companyProfile.vision || (companyProfile.values && companyProfile.values.length > 0));
  const hasContactInfo = companyProfile && (companyProfile.phoneNumber || companyProfile.contactEmail || companyProfile.address);


  if (!companyProfile || (!hasGeneralInfo && !hasMissionInfo && !hasContactInfo)) {
      return (
           <div className="py-8 text-center">
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
    <div className="py-8 space-y-8">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 rounded-lg">
                        <AvatarImage src={companyProfile.logoUrl} className="object-contain"/>
                        <AvatarFallback className="rounded-lg bg-muted">
                            <Building className="h-8 w-8 text-muted-foreground" />
                        </AvatarFallback>
                    </Avatar>
                    <CardTitle>{companyProfile.name || 'Компанийн нэр'}</CardTitle>
                </div>
                <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard/company/edit">
                        <Pencil className="mr-2 h-4 w-4" />
                        Засварлах
                    </Link>
                </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
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

        {hasMissionInfo && <MissionVisionCard profile={companyProfile} />}
        
        {hasContactInfo && <ContactInfoCard profile={companyProfile} />}
    </div>
  );
}
