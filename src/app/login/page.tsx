'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Eye, EyeOff, AlertCircle, ArrowRight, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getDoc, doc } from 'firebase/firestore';
import { BrandPanel } from './_components/brand-panel';
import { SYSTEM_MODULES } from './_components/modules';

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
  const [showPassword, setShowPassword] = useState(false);

  const companyProfileRef = useMemoFirebase(
    ({ firestore }) => (firestore ? doc(firestore, 'company', 'profile') : null),
    []
  );
  const { data: companyProfile, isLoading: isLoadingProfile } = useDoc<{
    name?: string;
    logoUrl?: string;
  }>(companyProfileRef);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) return;

    setIsLoading(true);
    setError(null);

    const email = isEmail(identifier) ? identifier : `${identifier}@example.com`;

    try {
      // Эхлээд нэвтрүүлнэ — employees унших эрх нэвтэрсний дараа л байдаг
      const { signInWithEmailAndPassword, signOut } = await import('firebase/auth');
      const uc = await signInWithEmailAndPassword(auth, email, password);
      const uid = uc.user.uid;

      // Нэвтэрсний дараа loginDisabled шалгана
      const employeeRef = doc(firestore, 'employees', uid);
      const empSnap = await getDoc(employeeRef);
      const employee = empSnap.data() as { loginDisabled?: boolean } | undefined;
      if (employee?.loginDisabled === true) {
        await signOut(auth);
        setIsLoading(false);
        const errorMessage = 'Нэвтрэх эрх идэвхгүй болсон байна.';
        setError(errorMessage);
        toast({
          variant: 'destructive',
          title: 'Нэвтрэхэд алдаа гарлаа',
          description: errorMessage,
        });
        return;
      }

      toast({
        title: 'Амжилттай нэвтэрлээ',
        description: 'Хуудас руу шилжиж байна.',
      });

      router.replace('/');

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

  const companyName = companyProfile?.name || 'Түмэн Тээх';

  return (
    <div className="min-h-screen bg-card lg:grid lg:grid-cols-[1.25fr_1fr] xl:grid-cols-[1.4fr_1fr]">
      <BrandPanel companyName={companyName} isLoadingProfile={isLoadingProfile} />

      {/* Баруун тал — нэвтрэх форм */}
      <main className="flex flex-col justify-center bg-card px-5 py-10 sm:px-8 sm:py-14 lg:min-h-screen lg:px-12 xl:px-16">
        <div
          className="mx-auto w-full max-w-[400px] animate-fade-in-up motion-reduce:animate-none"
          style={{ animationDelay: '120ms', animationFillMode: 'both' }}
        >
          <div className="flex items-center gap-3">
            {/* Байгууллагын өөрийн лого (Тохиргоо → Брэндинг дэх logoUrl) */}
            {isLoadingProfile ? (
              <Skeleton className="h-11 w-11 rounded-xl" />
            ) : (
              <Avatar className="h-11 w-11 rounded-xl ring-1 ring-border">
                <AvatarImage src={companyProfile?.logoUrl} alt="" />
                <AvatarFallback className="rounded-xl bg-primary/10">
                  <Building className="h-5 w-5 text-primary" aria-hidden="true" />
                </AvatarFallback>
              </Avatar>
            )}
            <div>
              <h2 className="text-[26px] font-semibold leading-tight tracking-tight text-foreground sm:text-[28px]">
                Системд нэвтрэх
              </h2>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Өөрийн нэвтрэх нэр эсвэл имэйл хаягаар нэвтэрнэ үү.
          </p>

          <form onSubmit={handleLogin} className="mt-7 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-foreground">
                Ажилтны код эсвэл имэйл
              </Label>
              <Input
                id="identifier"
                type="text"
                placeholder="Код эсвэл имэйл хаяг"
                required
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={isLoading}
                aria-invalid={!!error}
                aria-describedby={error ? 'login-error' : undefined}
                className="h-11 text-[15px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Нууц үг
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  aria-invalid={!!error}
                  aria-describedby={error ? 'login-error' : undefined}
                  className="h-11 pr-12 text-[15px]"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={showPassword ? 'Нууц үг нуух' : 'Нууц үг харах'}
                  aria-pressed={showPassword}
                  aria-controls="password"
                  className="absolute right-0 top-0 h-11 w-11 rounded-l-none text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              </div>
            </div>

            {/* Алдааны өнгийг --destructive token-оос салгав: түүнийг компанийн
                брэндийн тохиргоо ажиллах үед дарж бичдэг тул улаан хэвээр байхыг баталгаажуулна. */}
            {error && (
              <p
                id="login-error"
                role="alert"
                className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm leading-snug text-red-700 dark:text-red-300"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="h-11 w-full text-[15px]"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              Нэвтрэх
              {!isLoading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Анхны админ уу?{' '}
            <Link
              href="/signup"
              className="rounded-sm font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Бүртгүүлэх
            </Link>
          </p>

          {/* Утсан дээр модулиудыг формын доор нам хэлбэрээр харуулна */}
          <div className="mt-10 border-t border-border pt-6 lg:hidden">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Системийн модулиуд
            </h3>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {SYSTEM_MODULES.map((m) => {
                const Icon = m.icon;
                return (
                  <li
                    key={m.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                  >
                    <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {m.label}
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="mt-8 text-center text-[11px] text-muted-foreground">
            {companyName} · Дотоод удирдлагын систем
          </p>
        </div>
      </main>
    </div>
  );
}
