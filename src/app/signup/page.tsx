'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, setDocumentNonBlocking } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/icons';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SignupPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user profile in Firestore
      const userDocRef = doc(firestore, 'employees', user.uid);
      const newUser = {
        id: user.uid,
        firstName: firstName,
        lastName: lastName,
        email: user.email,
        jobTitle: 'Тодорхойгүй',
        department: 'Тодорхойгүй',
        hireDate: serverTimestamp(),
      };
      
      setDocumentNonBlocking(userDocRef, newUser, { merge: true });

      toast({
        title: 'Амжилттай бүртгүүллээ',
        description: 'Тавтай морилно уу!',
      });
      router.push('/welcome');
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: 'destructive',
        title: 'Бүртгэл амжилтгүй боллоо',
        description: err.message,
      });
      console.error(err);
    } finally {
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
          <CardTitle className="text-2xl">Teal HR-т бүртгүүлэх</CardTitle>
          <CardDescription>
            Эхлэхийн тулд бүртгэл үүсгэнэ үү
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label htmlFor="lastName">Овог</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Таны овог"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">Нэр</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Таны нэр"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
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
            <Link href="/login" className="font-medium text-primary hover:underline">
              Нэвтрэх
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
