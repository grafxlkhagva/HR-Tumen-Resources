'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, initiateEmailSignUp, useFirebase, setDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/icons';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getCountFromServer, collection } from 'firebase/firestore';

export default function SignupPage() {
  const router = useRouter();
  const auth = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Check if any user (admin) already exists
      if (!firestore) {
        setError('Firestore-н тохиргоо хийгдээгүй байна.');
        setIsLoading(false);
        return;
      }
      const usersCollection = collection(firestore, 'employees');
      const snapshot = await getCountFromServer(usersCollection);
      
      if (snapshot.data().count > 0) {
        setError('Админ хэрэглэгч бүртгэгдсэн байна. Нэвтрэх хэсэг рүү шилжинэ үү.');
        toast({
          variant: 'destructive',
          title: 'Бүртгэл хаалттай',
          description: 'Зөвхөн нэг админ хэрэглэгч бүртгүүлэх боломжтой.',
        });
        setIsLoading(false);
        return;
      }

      // If no admin, proceed with creating the first one
      initiateEmailSignUp(auth, email, password);

      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          const userData = {
            id: user.uid,
            email: user.email,
            role: 'admin', // Assign admin role
            firstName: 'Admin',
            lastName: 'User',
            jobTitle: 'Системийн Админ',
            department: 'Тодорхойгүй',
            hireDate: new Date().toISOString(),
          };
          const userDocRef = doc(firestore, 'employees', user.uid);
          
          setDocumentNonBlocking(userDocRef, userData, { merge: true });
          
          toast({
            title: 'Амжилттай бүртгүүллээ',
            description: 'Та одоо нэвтэрч орно уу.',
          });
          router.push('/login');
          unsubscribe();
        } else {
          // This timeout gives Firebase auth state a moment to propagate
          setTimeout(() => {
            if (!auth.currentUser) {
              const errorMessage = 'Бүртгэл үүсгэхэд алдаа гарлаа.';
              setError(errorMessage);
              toast({
                variant: 'destructive',
                title: 'Алдаа гарлаа',
                description: errorMessage,
              });
              setIsLoading(false);
            }
          }, 2000);
        }
      }, (error) => {
          const errorMessage = 'Бүртгэл үүсгэхэд алдаа гарлаа.';
          setError(errorMessage);
          toast({
              variant: 'destructive',
              title: 'Алдаа гарлаа',
              description: error.message || errorMessage,
          });
          console.error(error);
          setIsLoading(false);
          unsubscribe();
      });

    } catch (err) {
      console.error("Error during signup check: ", err);
      setError('Системийн дотоод алдаа гарлаа.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Админ бүртгүүлэх</CardTitle>
          <CardDescription>
            Системийн анхны админ хэрэглэгчийг үүсгэх.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Имэйл</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@yourcompany.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              Бүртгүүлэх
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Бүртгэлтэй юу?{' '}
            <Link href="/login" className="underline">
              Нэвтрэх
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
