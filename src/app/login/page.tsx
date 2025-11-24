'use client';

import { useState } from 'react';
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

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    initiateEmailSignIn(auth, email, password);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        toast({
          title: 'Амжилттай нэвтэрлээ',
          description: 'Хяналтын самбар луу шилжиж байна.',
        });
        router.push('/dashboard');
        unsubscribe();
      } else {
        // This might be called immediately if the user is not logged in yet.
        // We set a timeout to only show the error if the login is not successful within a few seconds.
        setTimeout(() => {
          if (!auth.currentUser) {
            setError('Имэйл эсвэл нууц үг буруу байна. Дахин оролдоно уу.');
             toast({
                variant: 'destructive',
                title: 'Алдаа гарлаа',
                description: 'Имэйл эсвэл нууц үг буруу байна.',
              });
            setIsLoading(false);
          }
        }, 2000);
      }
    }, (error) => {
        setError('Имэйл эсвэл нууц үг буруу байна. Дахин оролдоно уу.');
        toast({
            variant: 'destructive',
            title: 'Алдаа гарлаа',
            description: error.message || 'Имэйл эсвэл нууц үг буруу байна.',
        });
        console.error(error);
        setIsLoading(false);
        unsubscribe();
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Teal HR-т нэвтрэх</CardTitle>
          <CardDescription>
            Өөрийн бүртгэлээр нэвтэрч орно уу
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Имэйл</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Нууц үг</Label>
                <Link
                  href="#"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Нууц үгээ мартсан уу?
                </Link>
              </div>
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
          <div className="mt-4 text-center text-sm">
            Бүртгэл байхгүй юу?{' '}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Бүртгүүлэх
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
