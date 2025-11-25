'use client';

import * as React from 'react';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Building, Briefcase, Mail, Phone, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-center gap-4">
      <Icon className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium">{value || 'Тодорхойгүй'}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
    return (
        <div className="p-4 space-y-6">
            <div className="flex flex-col items-center gap-4">
                <Skeleton className="w-24 h-24 rounded-full" />
                <div className="space-y-1 text-center">
                    <Skeleton className="h-7 w-40" />
                    <Skeleton className="h-5 w-32" />
                </div>
            </div>
            <Card>
                <CardHeader>
                   <Skeleton className="h-6 w-28" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent className="flex items-center justify-center p-6">
                     <Skeleton className="w-40 h-40" />
                </CardContent>
            </Card>
        </div>
    )
}

export default function MobileHomePage() {
  const { employeeProfile, isProfileLoading } = useEmployeeProfile();
  const userAvatar = PlaceHolderImages.find((p) => p.id === 'avatar-2'); // Example avatar

  if (isProfileLoading || !employeeProfile) {
    return <ProfileSkeleton />;
  }

  const { firstName, lastName, jobTitle, email, employeeCode } = employeeProfile;
  const fullName = `${firstName} ${lastName}`;
  const qrValue = `MECARD:N:${lastName},${firstName};TEL:${''};EMAIL:${email};NOTE:ID-${employeeCode};;`;

  return (
    <div className="p-4 space-y-6 animate-in fade-in-50">
      <div className="flex flex-col items-center gap-4 pt-4">
        <Avatar className="h-24 w-24 border-4 border-background">
          <AvatarImage src={userAvatar?.imageUrl} alt={fullName} data-ai-hint={userAvatar?.imageHint} />
          <AvatarFallback className="text-3xl">
            {firstName?.charAt(0)}
            {lastName?.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h1 className="text-2xl font-bold">{fullName}</h1>
          <p className="text-muted-foreground">{jobTitle}</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle className="text-lg">Хувийн мэдээлэл</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <InfoRow icon={Briefcase} label="Албан тушаал" value={jobTitle} />
            <InfoRow icon={Mail} label="Имэйл" value={email} />
            <InfoRow icon={Building} label="Ажилтны код" value={employeeCode} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="text-lg">QR Код</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 p-6">
            <div className="bg-white p-2 rounded-lg border">
                 <QrCode className="h-32 w-32" />
            </div>
            <p className="text-center text-sm text-muted-foreground">
                Та өөрийн QR кодыг уншуулан бүртгэл хийлгэх боломжтой.
            </p>
        </CardContent>
      </Card>

    </div>
  );
}
