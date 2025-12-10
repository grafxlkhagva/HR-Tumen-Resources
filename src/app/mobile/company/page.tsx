'use client';

import * as React from 'react';
import { z } from 'zod';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Building, Rocket, Eye, Shield, Handshake, Zap, Users2, Phone, Mail, MapPin, Video } from 'lucide-react';

const videoSchema = z.object({
    title: z.string(),
    description: z.string().optional(),
    url: z.string(),
});

const companyProfileSchema = z.object({
  name: z.string().min(2),
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
    <div className="p-4 space-y-6">
        <header className="py-4">
            <Skeleton className="h-8 w-32" />
        </header>
        <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
            </div>
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
    </div>
  );
}

const InfoRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}) => (
  <div className="flex items-start gap-4">
    <Icon className="h-5 w-5 flex-shrink-0 text-muted-foreground mt-0.5" />
    <div>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-sm text-muted-foreground">{value || 'Тодорхойгүй'}</p>
    </div>
  </div>
);


export default function MobileCompanyPage() {
  const { firestore } = useFirebase();
  const companyProfileRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'company', 'profile') : null),
    [firestore]
  );
  
  const { data: companyProfile, isLoading: isLoadingProfile, error } = useDoc<CompanyProfileValues>(companyProfileRef);

  if (isLoadingProfile) {
    return <PageSkeleton />;
  }
  
  if (error || !companyProfile) {
    return (
        <div className="p-4">
            <header className="py-4">
                <h1 className="text-2xl font-bold">Компани</h1>
            </header>
            <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                   {error ? "Мэдээлэл ачаалахад алдаа гарлаа." : "Компанийн мэдээлэл олдсонгүй."}
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="p-4 space-y-6 animate-in fade-in-50">
        <header className="py-4">
            <h1 className="text-2xl font-bold">Компани</h1>
        </header>

        <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 rounded-lg">
                <AvatarImage src={companyProfile.logoUrl} className="object-contain" />
                <AvatarFallback className="rounded-lg bg-muted">
                    <Building className="h-8 w-8 text-muted-foreground" />
                </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-bold">{companyProfile.name}</h2>
        </div>

        {(companyProfile.mission || companyProfile.vision) && (
            <Card>
                <CardContent className="p-4 space-y-4">
                    {companyProfile.mission && (
                         <div className="flex items-start gap-3">
                            <Rocket className="h-5 w-5 flex-shrink-0 text-primary mt-0.5" />
                            <div>
                                <h3 className="font-semibold">Эрхэм зорилго</h3>
                                <p className="text-sm text-muted-foreground">{companyProfile.mission}</p>
                            </div>
                        </div>
                    )}
                     {companyProfile.vision && (
                         <div className="flex items-start gap-3">
                            <Eye className="h-5 w-5 flex-shrink-0 text-primary mt-0.5" />
                            <div>
                                <h3 className="font-semibold">Алсын хараа</h3>
                                <p className="text-sm text-muted-foreground">{companyProfile.vision}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        )}

        {companyProfile.values && companyProfile.values.length > 0 && (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Үнэт зүйлс</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    {companyProfile.values.map((value, index) => {
                        const Icon = valueIcons[value.icon] || valueIcons.default;
                        return (
                             <div key={index} className="flex flex-col items-center text-center gap-2">
                                <div className="rounded-full bg-primary/10 p-3">
                                   <Icon className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm">{value.title}</h4>
                                    <p className="text-xs text-muted-foreground">{value.description}</p>
                                </div>
                            </div>
                        )
                    })}
                </CardContent>
            </Card>
        )}
        
        {companyProfile.videos && companyProfile.videos.length > 0 && (
             <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Видео танилцуулга</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {companyProfile.videos.map((video, index) => (
                        <div key={index} className="space-y-2">
                            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                                <video src={video.url} controls className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h4 className="font-semibold">{video.title}</h4>
                                <p className="text-sm text-muted-foreground">{video.description}</p>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        )}

        {(companyProfile.phoneNumber || companyProfile.contactEmail || companyProfile.address) && (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Холбоо барих</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {companyProfile.phoneNumber && <InfoRow icon={Phone} label="Утас" value={companyProfile.phoneNumber} />}
                    {companyProfile.contactEmail && <InfoRow icon={Mail} label="И-мэйл" value={companyProfile.contactEmail} />}
                    {companyProfile.address && <InfoRow icon={MapPin} label="Хаяг" value={companyProfile.address} />}
                </CardContent>
            </Card>
        )}
    </div>
  );
}
