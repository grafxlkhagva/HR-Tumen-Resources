'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useUser, useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getDoc, doc } from 'firebase/firestore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';


function isEmail(input: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(input);
}

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const companyProfileRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'company', 'profile') : null),
    [firestore]
  );
  const { data: companyProfile, isLoading: isLoadingProfile } = useDoc(companyProfileRef);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) return;

    setIsLoading(true);
    setError(null);

    const email = isEmail(identifier) ? identifier : `${identifier}@example.com`;

    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedInUser = userCredential.user;

      if (!loggedInUser) {
        throw new Error("Хэрэглэгчийн мэдээлэл олдсонгүй.");
      }
      
      const userDocRef = doc(firestore, 'employees', loggedInUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error("Ажилтны бүртгэл олдсонгүй.");
      }

      const userData = userDoc.data();
      const userRole = userData.role;

      toast({
          title: 'Амжилттай нэвтэрлээ',
          description: 'Хуудас руу шилжиж байна.',
      });

      if (userRole === 'admin') {
        router.push('/dashboard');
      } else if (userRole === 'employee') {
        router.push('/mobile/home');
      } else {
        throw new Error("Тодорхойгүй хэрэглэгчийн эрх.");
      }

    } catch (err: any) {
      setIsLoading(false);
      let errorMessage = 'Нэвтрэх үед тооцоолоогүй алдаа гарлаа.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
          errorMessage = 'Нэвтрэх нэр эсвэл нууц үг буруу байна.';
      } else {
        errorMessage = err.message || errorMessage;
      }
      setError(errorMessage);
       toast({
        variant: 'destructive',
        title: 'Нэвтрэхэд алдаа гарлаа',
        description: errorMessage,
      });
    }
  };
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="mb-4 flex flex-col items-center gap-3">
            {isLoadingProfile ? (
              <>
                <Skeleton className="h-16 w-16 rounded-full" />
                <Skeleton className="h-7 w-40" />
              </>
            ) : (
              <>
                <Avatar className="h-16 w-16">
                  <AvatarImage src={companyProfile?.logoUrl} alt={companyProfile?.name} />
                  <AvatarFallback className="rounded-lg bg-muted">
                      <Building className="h-8 w-8 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                 <CardTitle className="text-2xl">{companyProfile?.name || 'Teal HR'}-т нэвтрэх</CardTitle>
              </>
            )}
          </div>
          <CardDescription>
            Өөрийн нэвтрэх нэр эсвэл имэйл хаягаар нэвтэрнэ үү.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Ажилтны код эсвэл имэйл</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="Код эсвэл имэйл хаяг"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Нууц үг</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Нэвтрэх
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="mt-4 text-center text-sm">
        Анхны админ уу?{' '}
        <Link href="/signup" className="underline">
          Бүртгүүлэх
        </Link>
      </div>
    </div>
  );
}
