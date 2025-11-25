'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, initiateEmailSignIn } from '@/firebase';
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
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        toast({
          title: 'Амжилттай нэвтэрлээ',
          description: 'Хяналтын самбар луу шилжиж байна.',
        });
        router.push('/dashboard');
      }
      // If no user, do nothing and stay on login page
    });

    return () => unsubscribe();
  }, [auth, router, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    setIsLoading(true);
    setError(null);

    const email = isEmail(identifier) ? identifier : `${identifier}@example.com`;

    try {
      // initiateEmailSignIn is non-blocking, but we can catch immediate client-side errors
      // The actual result is handled by onAuthStateChanged
      await initiateEmailSignIn(auth, email, password);

      // The onAuthStateChanged listener will handle the redirect on success.
      // We need a timeout here to handle the failure case, as onAuthStateChanged doesn't fire for failed sign-ins.
      setTimeout(() => {
        if (!auth.currentUser) {
          setIsLoading(false);
          const errorMessage = 'Нэвтрэх нэр эсвэл нууц үг буруу байна.';
          setError(errorMessage);
          toast({
            variant: 'destructive',
            title: 'Нэвтрэхэд алдаа гарлаа',
            description: errorMessage,
          });
        }
      }, 2500); // 2.5 second timeout to wait for auth state change

    } catch (err: any) {
      // This will catch potential client-side validation errors from the SDK, though less common for signIn
      setIsLoading(false);
      const errorMessage = 'Нэвтрэх үед тооцоолоогүй алдаа гарлаа.';
      setError(errorMessage);
       toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: err.message || errorMessage,
      });
    }
  };

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
