'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useCollection, useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { RelationTemplate } from '../types';
import { useToast } from '@/hooks/use-toast';

interface StartProcessDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    template: RelationTemplate | null;
}

export function StartProcessDialog({ open, onOpenChange, template }: StartProcessDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [selectedEmployee, setSelectedEmployee] = React.useState<string>('');
    const [isLoading, setIsLoading] = React.useState(false);

    // Fetch employees (simplified for now, ideally paginated or searchable)
    const employeesQuery = React.useMemo(() =>
        firestore ? collection(firestore, 'employees') : null
        , [firestore]);

    const { data: employees = [] } = useCollection(employeesQuery);

    const handleStart = async () => {
        if (!firestore || !template || !selectedEmployee) return;

        setIsLoading(true);
        try {
            const employee = employees.find((e: any) => e.id === selectedEmployee);

            // Create the Process Instance
            await addDoc(collection(firestore, 'relation_instances'), {
                templateId: template.id,
                templateName: template.name,
                employeeId: selectedEmployee,
                employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown',
                status: 'active',
                currentStageId: template.nodes[0]?.id || null, // Start at the first node
                progress: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                // Snapshot the process definition so changes to template don't break active processes
                snapshot: {
                    nodes: template.nodes,
                    edges: template.edges
                },
                completedStages: []
            });

            toast({ title: "Амжилттай", description: "Процесс амжилттай эхэллээ." });
            onOpenChange(false);
            // TODO: Navigate to the process view?
        } catch (e) {
            console.error(e);
            toast({ title: "Алдаа", description: "Процесс эхлүүлэхэд алдаа гарлаа.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Процесс эхлүүлэх</DialogTitle>
                    <DialogDescription>
                        "{template?.name}" процессыг эхлүүлэх ажилтнаа сонгоно уу.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="employee">Ажилтан</Label>
                        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                            <SelectTrigger>
                                <SelectValue placeholder="Ажилтан сонгох..." />
                            </SelectTrigger>
                            <SelectContent>
                                {employees.map((emp: any) => (
                                    <SelectItem key={emp.id} value={emp.id}>
                                        {emp.firstName} {emp.lastName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Цуцлах</Button>
                    <Button onClick={handleStart} disabled={!selectedEmployee || isLoading}>
                        {isLoading ? 'Эхлүүлж байна...' : 'Эхлүүлэх'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
