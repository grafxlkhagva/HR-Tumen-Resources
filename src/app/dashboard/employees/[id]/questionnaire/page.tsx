'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';

export default function QuestionnairePage() {
    const { id } = useParams();
    const employeeId = Array.isArray(id) ? id[0] : id;

    return (
        <div className="py-8">
            <div className="mb-4 flex items-center gap-4">
                <Button asChild variant="outline" size="icon">
                    <Link href={`/dashboard/employees/${employeeId}`}>
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Буцах</span>
                    </Link>
                </Button>
                <h1 className="text-xl font-semibold tracking-tight">Ажилтны анкет</h1>
            </div>

             <Card className="flex h-[50vh] flex-col items-center justify-center">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <CardTitle>Анкетын мэдээлэл</CardTitle>
                    <CardDescription>
                        Энэ хэсэгт ажилтны анкетын мэдээллийг удирдах болно.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Удахгүй...</p>
                </CardContent>
            </Card>
        </div>
    );
}
