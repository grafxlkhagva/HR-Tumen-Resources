'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Briefcase, Mail, Phone, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    photoURL?: string;
    jobTitle: string;
    department: string;
    email: string;
    phone?: string;
}

const InfoRow = ({ icon: Icon, label, value, href }: { icon: React.ElementType, label: string, value: string, href?: string }) => {
    const content = <div className="flex items-center gap-4">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-medium">{value}</p>
        </div>
    </div>;

    if (href) {
        return <a href={href}>{content}</a>
    }
    return content;
}

export function EmployeeCard({ employee }: { employee: Employee }) {
    return (
        <div className="p-4">
            <header className="py-4 relative flex items-center justify-center">
                <Button asChild variant="ghost" size="icon" className="absolute left-0">
                    <Link href="/mobile/home">
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Буцах</span>
                    </Link>
                </Button>
                <h1 className="text-xl font-semibold">Ажилтны мэдээлэл</h1>
            </header>

            <Card className="mt-4">
                <CardHeader className="items-center text-center space-y-3">
                    <Avatar className="w-24 h-24 text-4xl">
                        <AvatarImage src={employee.photoURL} alt={employee.firstName} />
                        <AvatarFallback>{employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <p className="text-2xl font-semibold">{employee.firstName} {employee.lastName}</p>
                        <p className="text-muted-foreground">{employee.jobTitle}</p>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <InfoRow icon={Briefcase} label="Хэлтэс" value={employee.department} />
                    <InfoRow icon={Mail} label="Имэйл" value={employee.email} href={`mailto:${employee.email}`} />
                    <InfoRow icon={Phone} label="Утас" value={employee.phone || 'Бүртгэлгүй'} href={employee.phone ? `tel:${employee.phone}` : undefined}/>
                </CardContent>
            </Card>
        </div>
    );
}
