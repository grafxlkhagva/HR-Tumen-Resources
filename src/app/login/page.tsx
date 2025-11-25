'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, initiateEmailSignIn, useUser } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/icons';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged } from 'firebase/auth';

function isEmail(input: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(input);
}

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If auth state is done loading and a user exists, redirect them.
    if (!isUserLoading && user) {
        router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    setIsLoading(true);
    setError(null);

    const email = isEmail(identifier) ? identifier : `${identifier}@example.com`;

    try {
      // initiateEmailSignIn is non-blocking, it just triggers the auth flow
      // onAuthStateChanged listener will handle the success case
      await initiateEmailSignIn(auth, email, password);
      
      // The onAuthStateChanged listener in the useUser hook will eventually update the state.
      // We can't rely on it immediately. We'll handle errors via a catch block.
      // Since initiateEmailSignIn doesn't return a promise that resolves on success/fail
      // but on initiation, we catch errors from the function call itself.
      // The actual "invalid credential" error is an async event that won't be caught here.
      // We rely on the user seeing a loading spinner and then nothing happening, or a toast.
      // The best way to handle this is to use the `signInWithEmailAndPassword` directly
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      await signInWithEmailAndPassword(auth, email, password);

      // Successful login is handled by the useEffect hook, redirecting to /dashboard.
       toast({
          title: 'Амжилттай нэвтэрлээ',
          description: 'Хяналтын самбар луу шилжиж байна.',
        });

    } catch (err: any) {
      setIsLoading(false);
      let errorMessage = 'Нэвтрэх үед тооцоолоогүй алдаа гарлаа.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
          errorMessage = 'Нэвтрэх нэр эсвэл нууц үг буруу байна.';
      }
      setError(errorMessage);
       toast({
        variant: 'destructive',
        title: 'Нэвтрэхэд алдаа гарлаа',
        description: errorMessage,
      });
    }
  };

  // While checking auth state, or if user is found, show a loader to prevent flicker
  if (isUserLoading || user) {
     return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Teal HR-т нэвтрэх</CardTitle>
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
