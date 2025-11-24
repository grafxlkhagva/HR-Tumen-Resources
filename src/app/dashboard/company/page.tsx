'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Pencil, Building, Hash, Info, Users, User, Globe, Briefcase, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { z } from 'zod';

const companyProfileSchema = z.object({
  name: z.string().min(2, { message: 'Нэр дор хаяж 2 тэмдэгттэй байх ёстой.' }),
  legalName: z.string().optional(),
  registrationNumber: z.string().optional(),
  taxId: z.string().optional(),
  industry: z.string().optional(),
  employeeCount: z.string().optional(),
  ceo: z.string().optional(),
  website: z.string().url({ message: 'Вэбсайтын хаяг буруу байна.' }).optional().or(z.literal('')),
});

type CompanyProfileValues = z.infer<typeof companyProfileSchema>;


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
    <Icon className="h-5 w-5 text-muted-foreground" />
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value || 'Тодорхойгүй'}</p>
    </div>
  </div>
);

function PageSkeleton() {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <Skeleton className="h-8 w-48" />
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
  
  if (!companyProfile) {
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
    <div className="py-8">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Ерөнхий мэдээлэл</CardTitle>
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
    </div>
  );
}