'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, UserCog } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/icons';

export default function WelcomePage() {
  const router = useRouter();

  const handleRoleSelection = (role: 'employee' | 'admin') => {
    // TODO: Save role preference
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl text-center">
        <div className="mb-12 flex items-center justify-center gap-4">
          <Logo className="h-12 w-12 text-primary" />
          <h1 className="text-5xl font-bold tracking-tighter">Teal HR-т тавтай морил!</h1>
        </div>
        <p className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground">
          Эхлэхийн тулд та системд ямар үүрэгтэй хандахаа сонгоно уу. Энэ нь таны хянах самбарыг тохируулахад тусална.
        </p>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <Card className="transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
            <CardHeader className="items-center text-center">
              <div className="rounded-full bg-primary/10 p-4">
                <User className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="pt-4 text-2xl">Ажилтан</CardTitle>
              <CardDescription className="pt-2">
                Өөрийн мэдээлэл, чөлөөний хүсэлт, даалгавруудыг харах.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button size="lg" onClick={() => handleRoleSelection('employee')}>
                Ажилтнаар үргэлжлүүлэх
              </Button>
            </CardContent>
          </Card>
          <Card className="transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
            <CardHeader className="items-center text-center">
              <div className="rounded-full bg-primary/10 p-4">
                <UserCog className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="pt-4 text-2xl">Админ</CardTitle>
              <CardDescription className="pt-2">
                Ажилчид, баримт бичиг болон системийн тохиргоог удирдах.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button size="lg" variant="outline" onClick={() => handleRoleSelection('admin')}>
                Админаар үргэлжлүүлэх
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
