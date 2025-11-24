
'use client';

import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase';
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

export function UserNav() {
    const { user, isUserLoading } = useUser();
    const auth = useAuth();
    const router = useRouter();
    const userAvatar = PlaceHolderImages.find(p => p.id === "avatar-1");

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/login');
    };

    if (isUserLoading) {
        return <Skeleton className="h-9 w-9 rounded-full" />;
    }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.photoURL || userAvatar?.imageUrl} alt={user?.displayName || "User Avatar"} data-ai-hint={userAvatar?.imageHint} />
            <AvatarFallback>{user?.displayName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'Б'}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.displayName || 'Хэрэглэгч'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>Профайл</DropdownMenuItem>
          <DropdownMenuItem>Тохиргоо</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>Гарах</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
