
'use client';

import * as React from 'react';
import { ChevronRight, LogOut, User, Bell, Lock } from 'lucide-react';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Skeleton } from '@/components/ui/skeleton';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';

function SettingsItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}) {
  const content = (
      <>
        <div className="flex items-center gap-4">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{label}</span>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </>
  )
    
  if (onClick) {
      return (
          <button onClick={onClick} className="flex w-full items-center justify-between rounded-lg bg-background p-4 text-left transition-colors hover:bg-muted/50">
            {content}
          </button>
      )
  }

  return <div className="flex items-center justify-between rounded-lg bg-background p-4">{content}</div>;
}


function SettingsSkeleton() {
    return (
        <div className="p-4 space-y-6">
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
            </div>
             <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
            </div>
        </div>
    )
}

export default function MobileSettingsPage() {
  const { employeeProfile, isProfileLoading } = useEmployeeProfile();
  const userAvatar = PlaceHolderImages.find((p) => p.id === 'avatar-2');
  const auth = useAuth();
  const router = useRouter();


  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/login');
  };

  if (isProfileLoading || !employeeProfile) {
    return <SettingsSkeleton />;
  }

  const { firstName, lastName, jobTitle } = employeeProfile;

  return (
    <div className="p-4">
       <header className="py-4">
            <h1 className="text-2xl font-bold">Тохиргоо</h1>
        </header>
        
      <div className="flex items-center gap-4 rounded-lg bg-background p-4 mb-6">
        <Avatar className="h-16 w-16">
          <AvatarImage src={userAvatar?.imageUrl} alt={`${firstName} ${lastName}`} />
          <AvatarFallback className="text-2xl">
            {firstName?.charAt(0)}
            {lastName?.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-xl font-semibold">
            {firstName} {lastName}
          </p>
          <p className="text-muted-foreground">{jobTitle}</p>
        </div>
      </div>
      
      <div className="space-y-2">
        <SettingsItem icon={User} label="Профайл засах" />
        <SettingsItem icon={Bell} label="Мэдэгдэл" />
        <SettingsItem icon={Lock} label="Нууц үг солих" />
      </div>

       <div className="mt-6 space-y-2">
        <SettingsItem icon={LogOut} label="Гарах" onClick={handleLogout} />
      </div>

    </div>
  );
}
