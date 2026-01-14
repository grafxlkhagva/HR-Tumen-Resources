'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Loader2, ArrowRight, ShieldAlert, Laptop2, Mail, Key } from 'lucide-react';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { OffboardingProcess } from '../types';

interface StepDeactivationProps {
    process: OffboardingProcess;
}

export function StepDeactivation({ process }: StepDeactivationProps) {
    const { firestore } = useFirebase();
    const { id } = useParams();
    const employeeId = Array.isArray(id) ? id[0] : id;
    const { toast } = useToast();

    const defaultSystems = [
        { id: 'email', name: 'Almond Email', icon: Mail, deactivated: false },
        { id: 'hr_system', name: 'HR System Access', icon: Laptop2, deactivated: false },
        { id: 'vpn', name: 'VPN Access', icon: Key, deactivated: false },
    ];

    const [systems, setSystems] = React.useState(
        process.deactivation?.systems && process.deactivation.systems.length > 0
            ? process.deactivation.systems.map(s => ({ ...s, icon: defaultSystems.find(d => d.id === s.id)?.icon || Laptop2 }))
            : defaultSystems
    );

    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const isReadOnly = process.deactivation?.isCompleted;

    const toggleSystem = (id: string) => {
        if (isReadOnly) return;
        setSystems(systems.map(s => s.id === id ? { ...s, deactivated: !s.deactivated } : s));
    };

    const handleSave = async (completeStep: boolean = false) => {
        if (!firestore || !employeeId) return;

        if (completeStep) {
            const activeSystems = systems.filter(s => !s.deactivated);
            if (activeSystems.length > 0) {
                toast({ variant: 'destructive', title: 'Анхааруулга', description: 'Бүх системийн эрхийг хаах шаардлагатай.' });
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const docRef = doc(firestore, `employees/${employeeId}/offboarding_processes`, process.id);

            // Remove icons before saving as they are components
            const systemsData = systems.map(({ icon, ...rest }) => rest);

            await updateDocumentNonBlocking(docRef, {
                deactivation: {
                    systems: systemsData,
                    isCompleted: completeStep
                },
                currentStep: completeStep ? 9 : 8
            });

            toast({ title: completeStep ? 'Амжилттай хадгалагдлаа' : 'Хадгалагдлаа', description: completeStep ? 'Дараагийн шат руу шилжлээ.' : 'Өөрчлөлтүүд хадгалагдлаа.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Хадгалах үед алдаа гарлаа.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="max-w-3xl mx-auto border-t-4 border-t-slate-600 shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span className="bg-slate-100 text-slate-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">8</span>
                    Систем хаалт
                </CardTitle>
                <CardDescription>
                    Ажилтны нэвтрэх эрх болон системүүдийн хандалтыг идэвхгүй болгох.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                <div className="grid gap-4">
                    {systems.map((sys) => {
                        const Icon = sys.icon;
                        return (
                            <div
                                key={sys.id}
                                className={`flex items-center justify-between p-4 rounded-lg border transition-all ${sys.deactivated ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-card hover:shadow-sm'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-full ${sys.deactivated ? 'bg-slate-200 text-slate-500' : 'bg-primary/10 text-primary'}`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className={`font-medium ${sys.deactivated ? 'line-through text-muted-foreground' : ''}`}>{sys.name}</p>
                                        <p className="text-xs text-muted-foreground">{sys.deactivated ? 'Хандах эрх цуцлагдсан' : 'Идэвхтэй'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id={sys.id}
                                        checked={sys.deactivated}
                                        onCheckedChange={() => toggleSystem(sys.id)}
                                        disabled={isReadOnly}
                                    />
                                    <Label htmlFor={sys.id} className="cursor-pointer">{sys.deactivated ? 'Хаагдсан' : 'Хаах'}</Label>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {!isReadOnly && (
                    <div className="bg-amber-50 text-amber-800 p-3 rounded-md flex items-center gap-3 text-sm border border-amber-200">
                        <ShieldAlert className="h-4 w-4 shrink-0" />
                        <div>
                            <strong>Санамж:</strong> Системийн эрхийг хааснаар ажилтан дахин нэвтрэх боломжгүй болно.
                        </div>
                    </div>
                )}

            </CardContent>
            <CardFooter className="flex justify-between gap-3 border-t bg-muted/20 py-4">
                <Button variant="ghost" onClick={() => handleSave(false)} disabled={isSubmitting || isReadOnly}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Хадгалах
                </Button>
                {!isReadOnly ? (
                    <Button
                        onClick={() => handleSave(true)}
                        disabled={isSubmitting}
                        className="bg-slate-700 hover:bg-slate-800"
                    >
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                        Дуусгах & Үргэлжлүүлэх
                    </Button>
                ) : (
                    <div className="flex items-center gap-2 text-green-600 font-medium">
                        <span>✅ Системээс хасагдсан</span>
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}
