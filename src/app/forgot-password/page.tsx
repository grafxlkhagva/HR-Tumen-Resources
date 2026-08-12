'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Building,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc } from 'firebase/firestore';
import { BrandPanel } from '../login/_components/brand-panel';
import { RESEND_COOLDOWN_MS } from '@/lib/auth/password-reset';

type Step = 'request' | 'confirm' | 'done';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('request');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const companyProfileRef = useMemoFirebase(
    ({ firestore }) => (firestore ? doc(firestore, 'company', 'profile') : null),
    []
  );
  const { data: companyProfile, isLoading: isLoadingProfile } = useDoc<{
    name?: string;
    logoUrl?: string;
  }>(companyProfileRef);
  const companyName = companyProfile?.name || 'Түмэн Тээх';

  // Дахин илгээх cooldown тоолуур
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldown]);

  const requestCode = async (isResend = false) => {
    if (isLoading) return;
    if (!identifier.trim()) {
      setError('Ажилтны код эсвэл имэйлээ оруулна уу.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Хүсэлт илгээхэд алдаа гарлаа.');
        return;
      }
      setNotice(data?.message || 'Баталгаажуулах код илгээгдлээ.');
      setStep('confirm');
      setCooldown(Math.round(RESEND_COOLDOWN_MS / 1000));
      // DEV орчинд кодыг шууд харуулж туршихад хялбар болгоно.
      if (data?.devOtp) {
        setOtp(String(data.devOtp));
        toast({ title: 'DEV: код', description: `Туршилтын код: ${data.devOtp}` });
      }
      if (isResend) {
        toast({ title: 'Дахин илгээлээ', description: 'Шинэ код имэйлээр илгээгдлээ.' });
      }
    } catch {
      setError('Сүлжээний алдаа. Дахин оролдоно уу.');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmReset = async () => {
    if (isLoading) return;
    setError(null);
    if (otp.trim().length !== 6) {
      setError('6 оронтой баталгаажуулах кодоо оруулна уу.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Шинэ нууц үг дор хаяж 6 тэмдэгттэй байх ёстой.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Нууц үгүүд таарахгүй байна.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/confirm-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          otp: otp.trim(),
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Нууц үг шинэчлэхэд алдаа гарлаа.');
        return;
      }
      setStep('done');
      toast({ title: 'Амжилттай', description: 'Нууц үг шинэчлэгдлээ. Одоо нэвтэрнэ үү.' });
    } catch {
      setError('Сүлжээний алдаа. Дахин оролдоно уу.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-card lg:grid lg:grid-cols-[1.25fr_1fr] xl:grid-cols-[1.4fr_1fr]">
      <BrandPanel companyName={companyName} isLoadingProfile={isLoadingProfile} />

      <main className="flex flex-col justify-center bg-card px-5 py-10 sm:px-8 sm:py-14 lg:min-h-screen lg:px-12 xl:px-16">
        <div
          className="mx-auto w-full max-w-[400px] animate-fade-in-up motion-reduce:animate-none"
          style={{ animationDelay: '120ms', animationFillMode: 'both' }}
        >
          <div className="flex items-center gap-3">
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
            <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-foreground sm:text-[28px]">
              {step === 'done' ? 'Болсон' : 'Нууц үг сэргээх'}
            </h1>
          </div>

          {/* ── Алхам 1: код хүсэх ── */}
          {step === 'request' && (
            <>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Ажилтны код эсвэл бүртгэлтэй имэйлээ оруулна уу. Бид таны имэйл рүү
                баталгаажуулах код илгээнэ.
              </p>
              <form
                className="mt-7 space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  requestCode(false);
                }}
              >
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
                    aria-describedby={error ? 'fp-error' : undefined}
                    className="h-11 text-[15px]"
                  />
                </div>

                {error && <ErrorBox id="fp-error" message={error} />}

                <Button type="submit" size="lg" className="h-11 w-full text-[15px]" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  Код илгээх
                  {!isLoading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                </Button>
              </form>
            </>
          )}

          {/* ── Алхам 2: код + шинэ нууц үг ── */}
          {step === 'confirm' && (
            <>
              <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{notice}</span>
              </p>
              <form
                className="mt-7 space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  confirmReset();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-foreground">
                    Баталгаажуулах код (6 орон)
                  </Label>
                  <Input
                    id="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="______"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    disabled={isLoading}
                    className="h-11 text-center text-lg tracking-[0.4em]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-foreground">
                    Шинэ нууц үг
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isLoading}
                      className="h-11 pr-12 text-[15px]"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={showPassword ? 'Нууц үг нуух' : 'Нууц үг харах'}
                      aria-pressed={showPassword}
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-foreground">
                    Шинэ нууц үг давтах
                  </Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-11 text-[15px]"
                  />
                </div>

                {error && <ErrorBox id="fp-error" message={error} />}

                <Button type="submit" size="lg" className="h-11 w-full text-[15px]" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  Нууц үг шинэчлэх
                </Button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('request');
                      setError(null);
                      setOtp('');
                    }}
                    className="inline-flex items-center gap-1 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    Буцах
                  </button>
                  <button
                    type="button"
                    disabled={cooldown > 0 || isLoading}
                    onClick={() => requestCode(true)}
                    className="rounded-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {cooldown > 0 ? `Дахин илгээх (${cooldown}с)` : 'Кодоо дахин авах'}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── Алхам 3: амжилт ── */}
          {step === 'done' && (
            <>
              <div className="mt-6 flex flex-col items-center gap-4 rounded-xl border border-border bg-muted/30 px-6 py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Таны нууц үг амжилттай шинэчлэгдлээ. Одоо шинэ нууц үгээрээ нэвтэрнэ үү.
                </p>
                <Button size="lg" className="h-11 w-full text-[15px]" onClick={() => router.replace('/login')}>
                  Нэвтрэх хуудас руу
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </>
          )}

          {step !== 'done' && (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Нууц үгээ санаж байна уу?{' '}
              <Link
                href="/login"
                className="rounded-sm font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Нэвтрэх
              </Link>
            </p>
          )}

          <p className="mt-8 text-center text-[11px] text-muted-foreground">
            {companyName} · Дотоод удирдлагын систем
          </p>
        </div>
      </main>
    </div>
  );
}

function ErrorBox({ id, message }: { id: string; message: string }) {
  return (
    <p
      id={id}
      role="alert"
      className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm leading-snug text-red-700 dark:text-red-300"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}
