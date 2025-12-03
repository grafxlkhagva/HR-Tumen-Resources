
'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight, LogOut, User, Bell, Lock } from 'lucide-react';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button';

function SettingsItem({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
}) {
  return (
    <Link href={href} className="flex w-full items-center justify-between rounded-lg bg-background p-4 text-left transition-colors hover:bg-muted/50">
        <div className="flex items-center gap-4">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{label}</span>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </Link>
  );
}


function PageSkeleton() {
    return (
        <div className="p-4 space-y-6">
            <header className="py-4">
                <Skeleton className="h-8 w-24" />
            </header>
            <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-40" />
                </div>
            </div>
             <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
            </div>
             <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
            </div>
        </div>
    )
}

export default function MobileUserPage() {
  const { employeeProfile, isProfileLoading } = useEmployeeProfile();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/login');
  };

  if (isProfileLoading || !employeeProfile) {
    return <PageSkeleton />;
  }

  const { firstName, lastName, jobTitle, photoURL } = employeeProfile;
  const fullName = `${firstName} ${lastName}`;

  return (
    <div className="p-4">
       <header className="py-4">
            <h1 className="text-2xl font-bold">Хэрэглэгч</h1>
        </header>
        
      <div className="flex items-center gap-4 rounded-lg bg-background p-4 mb-6">
        <Avatar className="h-16 w-16">
          <AvatarImage src={photoURL} alt={fullName} />
          <AvatarFallback className="text-2xl">
            {firstName?.charAt(0)}
            {lastName?.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-xl font-semibold">{fullName}</p>
          <p className="text-muted-foreground">{jobTitle}</p>
        </div>
      </div>
      
      <div className="space-y-2">
        <SettingsItem icon={User} label="Анкет засах" href="/mobile/profile/edit" />
        <SettingsItem icon={Bell} label="Мэдэгдэл" href="#" />
        <SettingsItem icon={Lock} label="Нууц үг солих" href="#" />
      </div>

       <div className="mt-6 space-y-2">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="flex w-full items-center justify-between rounded-lg bg-background p-4 text-left text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground">
                        <div className="flex items-center gap-4">
                            <LogOut className="h-5 w-5" />
                            <span className="font-medium">Системээс гарах</span>
                        </div>
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Та системээс гарахдаа итгэлтэй байна уу?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Таны сессшн дуусгавар болох ба дахин нэвтрэх шаардлагатай болно.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLogout}>Тийм, гарах</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
      </div>

    </div>
  );
}
