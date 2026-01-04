'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Coins, Save, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { PointsConfig } from '@/types/points';

export function PointConfigManager() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [config, setConfig] = useState<PointsConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchConfig = async () => {
            if (!firestore) return;
            try {
                const configRef = doc(firestore, 'points_config', 'main');
                const snap = await getDoc(configRef);
                if (snap.exists()) {
                    setConfig(snap.data() as PointsConfig);
                } else {
                    setConfig({ monthlyAllowanceBase: 1000, updatedAt: null });
                }
            } catch (error) {
                console.error('Error fetching config:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, [firestore]);

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!firestore) return;

        setSaving(true);
        const formData = new FormData(e.currentTarget);
        const amount = parseInt(formData.get('monthlyAllowanceBase') as string);

        try {
            const configRef = doc(firestore, 'points_config', 'main');
            await setDoc(configRef, {
                monthlyAllowanceBase: amount,
                updatedAt: serverTimestamp()
            });
            setConfig(prev => prev ? { ...prev, monthlyAllowanceBase: amount } : null);
            toast({
                title: 'Амжилттай хадгалагдлаа',
                description: `Сар бүрийн бэлэглэх оноог ${amount.toLocaleString()} болгож өөрчиллөө.`
            });
        } catch (error: any) {
            toast({
                title: 'Алдаа гарлаа',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="animate-pulse h-48 bg-muted rounded-xl" />;

    return (
        <Card className="border-2 border-primary/10 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles className="w-24 h-24" />
            </div>

            <CardHeader className="bg-primary/5 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <Coins className="w-5 h-5" />
                    </div>
                    <div>
                        <CardTitle className="text-xl">Системийн оноо тохируулах</CardTitle>
                        <CardDescription>Сар бүр ажилчдад олгох бэлэглэх онооны хэмжээг эндээс удирдана.</CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-6">
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-3">
                        <Label htmlFor="monthlyAllowanceBase" className="text-base font-semibold">
                            Сар бүрийн бэлэглэх оноо (Monthly Allowance)
                        </Label>
                        <div className="relative max-w-xs">
                            <Input
                                id="monthlyAllowanceBase"
                                name="monthlyAllowanceBase"
                                type="number"
                                defaultValue={config?.monthlyAllowanceBase || 1000}
                                className="pl-10 h-12 text-lg font-bold"
                                required
                            />
                            <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-500" />
                            Энэ оноо нь сар бүрийн 1-ний өдөр ажилчин бүрт очих бөгөөд зөвхөн бусдад бэлэглэх зориулалттай.
                        </p>
                    </div>

                    <div className="bg-muted/30 p-4 rounded-lg border text-sm text-slate-600 space-y-2">
                        <h4 className="font-bold text-slate-900">Системийн ажиллах зарчим:</h4>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Бэлэглэлийн оноо нь хуримтлагдахгүй (Expired).</li>
                            <li>Зөвхөн бэлгээр авсан оноог "Дэлгүүр"-ээс бараа авахад ашиглаж болно.</li>
                            <li>Сар бүрийн 1-нд ашиглагдаагүй үлдсэн оноо устгагдаж, шинэ оноо орно.</li>
                        </ul>
                    </div>

                    <Button type="submit" disabled={saving} className="w-full sm:w-auto gap-2 h-11 px-8">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Тохиргоог хадгалах
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
