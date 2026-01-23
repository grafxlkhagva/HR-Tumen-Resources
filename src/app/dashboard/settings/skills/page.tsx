'use client';

import React from 'react';
import { useFirebase, useCollection } from '@/firebase';
import { collection, query, orderBy, getDocs, writeBatch, doc } from 'firebase/firestore';
import { Card, CardContent } from "@/components/ui/card";
import { ReferenceTable, ReferenceItem } from '@/components/ui/reference-table';
import { GraduationCap, Award, Tag, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function SkillsInventoryPage() {
    const { firestore } = useFirebase();

    const skillsQuery = React.useMemo(() => firestore ? query(
        collection(firestore, 'skills_inventory'),
        orderBy('name', 'asc')
    ) : null, [firestore]);

    const { data: skills, isLoading } = useCollection<ReferenceItem>(skillsQuery as any);

    const columns = React.useMemo(() => [
        {
            key: 'name',
            header: 'Ур чадварын нэр',
            forceFormInput: true,
            render: (val: string) => (
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Award className="h-4 w-4" />
                    </div>
                    <span className="font-bold">{val}</span>
                </div>
            )
        },
        {
            key: 'category',
            header: 'Ангилал',
            forceFormInput: true,
            render: (val: string) => (
                <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-bold uppercase text-[10px] px-2 py-0.5 rounded-md">
                    <Tag className="h-3 w-3 mr-1" />
                    {val || 'Ангилаагүй'}
                </Badge>
            )
        },
        {
            key: 'description',
            header: 'Тайлбар',
            forceFormInput: true,
            render: (val: string) => (
                <span className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]">
                    {val || '-'}
                </span>
            )
        }
    ], []);

    const { toast } = useToast();
    const [isSyncing, setIsSyncing] = React.useState(false);

    const handleSyncFromPositions = async () => {
        if (!firestore) return;
        setIsSyncing(true);
        try {
            // 1. Get all positions
            const positionsSnap = await getDocs(collection(firestore, 'positions'));
            const allUniqueSkillNames = new Set<string>();

            positionsSnap.forEach(pDoc => {
                const data = pDoc.data();
                if (data.skills && Array.isArray(data.skills)) {
                    data.skills.forEach((s: any) => {
                        if (s.name) allUniqueSkillNames.add(s.name.trim());
                    });
                }
            });

            if (allUniqueSkillNames.size === 0) {
                toast({ title: "Бүртгэлтэй ур чадвар олдсонгүй" });
                return;
            }

            // 2. Get existing inventory to avoid duplicates
            const inventorySnap = await getDocs(collection(firestore, 'skills_inventory'));
            const existingNames = new Set(inventorySnap.docs.map(d => d.data().name?.trim().toLowerCase()));

            // 3. Prepare batch for new skills
            const batch = writeBatch(firestore);
            let count = 0;

            allUniqueSkillNames.forEach(skillName => {
                if (!existingNames.has(skillName.toLowerCase())) {
                    const newDocRef = doc(collection(firestore, 'skills_inventory'));
                    batch.set(newDocRef, {
                        name: skillName,
                        category: 'Ажлын байрнаас оруулсан',
                        createdAt: new Date().toISOString()
                    });
                    count++;
                }
            });

            if (count > 0) {
                await batch.commit();
                toast({
                    title: "Амжилттай синк хийгдлээ",
                    description: `${count} шинэ ур чадвар нэмэгдлээ.`
                });
            } else {
                toast({ title: "Бүх ур чадварууд санд бүртгэлтэй байна" });
            }

        } catch (error) {
            console.error("Sync error:", error);
            toast({ title: "Алдаа гарлаа", variant: "destructive" });
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">Ур чадварын сан</h2>
                    <p className="text-sm text-muted-foreground max-w-2xl">
                        Байгууллагын хэмжээнд ашиглагдах нэгдсэн ур чадваруудын жагсаалт. Ажлын байрнаас чадваруудыг татах эсвэл шинээр нэмэх боломжтой.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-xl border-indigo-100 bg-white text-indigo-600 hover:bg-indigo-50 transition-all font-bold gap-2 px-4 shadow-sm"
                    onClick={handleSyncFromPositions}
                    disabled={isSyncing}
                >
                    <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                    Ажлын байрнаас татах
                </Button>
            </div>

            <Card className="shadow-premium border-slate-200/60 overflow-hidden">
                <ReferenceTable
                    collectionName="skills_inventory"
                    columns={columns}
                    itemData={skills}
                    isLoading={isLoading}
                    dialogTitle="Ур чадвар"
                />
            </Card>
        </div>
    );
}
