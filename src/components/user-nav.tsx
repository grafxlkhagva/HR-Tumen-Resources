
'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { signOut } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Skeleton } from './ui/skeleton';
import { LogOut, Settings, User } from 'lucide-react';
import {
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
  } from '@/components/ui/sidebar';

export function UserNav() {
    const { employeeProfile, isUserLoading, isProfileLoading } = useEmployeeProfile();
    const auth = useAuth();
    const router = useRouter();
    const userAvatar = PlaceHolderImages.find(p => p.id === "avatar-1");

    const handleLogout = async () => {
        if (!auth) return;
        await signOut(auth);
        router.push('/login');
    };

    if (isUserLoading || isProfileLoading || !employeeProfile) {
        return (
            <div className="p-2 space-y-2">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                </div>
                <Skeleton className="h-8 w-full" />
            </div>
        );
    }

  return (
    <div className="w-full">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                 <div className="flex items-center gap-3 cursor-pointer rounded-md p-2 hover:bg-muted">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={employeeProfile?.photoURL || userAvatar?.imageUrl} alt={employeeProfile?.firstName || "User Avatar"} data-ai-hint={userAvatar?.imageHint} />
                        <AvatarFallback>{employeeProfile?.firstName?.charAt(0) || 'Б'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium">{employeeProfile?.firstName || 'Хэрэглэгч'}</p>
                        <p className="truncate text-xs text-muted-foreground">
                        {employeeProfile?.email}
                        </p>
                    </div>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{employeeProfile?.firstName || 'Хэрэглэгч'}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                    {employeeProfile?.email}
                    </p>
                </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Профайл</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Тохиргоо</span>
                </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Гарах</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

         <SidebarMenu>
            <SidebarMenuItem>
                 <SidebarMenuButton onClick={handleLogout} tooltip="Гарах" variant="outline" className="mt-4">
                    <LogOut />
                    <span>Гарах</span>
                 </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    </div>
  );
}
