'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';
import { ReferenceTable } from '../settings/reference-table';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function StructureConfigDialog() {
    const { firestore } = useFirebase();

    const employmentTypesQuery = useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'employmentTypes') : null, [firestore]);
    const positionLevelsQuery = useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'positionLevels') : null, [firestore]);

    const { data: employmentTypes, isLoading: loadingEmpTypes } = useCollection<any>(employmentTypesQuery);
    const { data: positionLevels, isLoading: loadingLevels } = useCollection<any>(positionLevelsQuery);

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Settings2 className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Тохиргоо
                    </span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Бүтцийн тохиргоо</DialogTitle>
                    <DialogDescription>
                        Ажил эрхлэлтийн төрөл болон ажлын байрны зэрэглэлийг эндээс удирдана.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="employment" className="mt-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="employment">Ажил эрхлэлтийн төрөл</TabsTrigger>
                        <TabsTrigger value="levels">Ажлын байрны зэрэглэл</TabsTrigger>
                    </TabsList>

                    <ScrollArea className="h-[400px] mt-4 pr-4">
                        <TabsContent value="employment" className="mt-0">
                            <div className="space-y-4">
                                <div className="text-sm text-muted-foreground mb-4">
                                    Үндсэн, гэрээт, цагийн гэх мэт төрлүүдийг удирдах.
                                </div>
                                <ReferenceTable
                                    collectionName="employmentTypes"
                                    columns={[{ key: 'name', header: 'Нэр' }]}
                                    itemData={employmentTypes}
                                    isLoading={loadingEmpTypes}
                                    dialogTitle="Ажил эрхлэлтийн төрөл"
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="levels" className="mt-0">
                            <div className="space-y-4">
                                <div className="text-sm text-muted-foreground mb-4">
                                    Удирдах, ахлах, мэргэжилтэн гэх мэт зэрэглэлүүдийг удирдах.
                                </div>
                                <ReferenceTable
                                    collectionName="positionLevels"
                                    columns={[{ key: 'name', header: 'Нэр' }]}
                                    itemData={positionLevels}
                                    isLoading={loadingLevels}
                                    dialogTitle="Албан тушаалын зэрэглэл"
                                />
                            </div>
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
