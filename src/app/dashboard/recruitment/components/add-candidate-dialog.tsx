'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    AppDialog,
    AppDialogContent,
    AppDialogDescription,
    AppDialogFooter,
    AppDialogHeader,
    AppDialogTitle,
    AppDialogTrigger,
} from '@/components/patterns';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { useFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Candidate, JobApplication, Vacancy } from '@/types/recruitment';

const candidateSchema = z.object({
    firstName: z.string().min(2, 'Нэрээ оруулна уу'),
    lastName: z.string().min(2, 'Овгоо оруулна уу'),
    email: z.string().email('Имэйл хаягаа зөв оруулна уу'),
    phone: z.string().min(8, 'Утасны дугаараа оруулна уу'),
});

type CandidateFormValues = z.infer<typeof candidateSchema>;

export function AddCandidateDialog({ vacancy }: { vacancy?: Vacancy }) {
    const [open, setOpen] = useState(false);
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<CandidateFormValues>({
        resolver: zodResolver(candidateSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
        },
    });

    const onSubmit = async (data: CandidateFormValues) => {
        if (!firestore) return;
        setIsLoading(true);

        try {
            // 1. Create Candidate
            const newCandidate: Omit<Candidate, 'id'> = {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                phone: data.phone,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                source: 'MANUAL',
            };

            // Note: In real app we need ID to link, but allow Firestore to gen ID.
            // We'll use a transaction or just sequential writes for now.
            const candidateRef = await addDocumentNonBlocking(collection(firestore, 'candidates'), newCandidate);

            if (vacancy && candidateRef) {
                // 2. Create Application
                const newApplication: Omit<JobApplication, 'id'> = {
                    vacancyId: vacancy.id,
                    candidateId: candidateRef.id,
                    currentStageId: vacancy.stages[0]?.id || 'screening',
                    status: 'ACTIVE',
                    appliedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    // Denormalize candidate info for UI convenience if needed, though we fetch separately most times
                    // But for our PipelineBoard we used `enrichedApplications`, so it's fine.
                    candidate: { ...newCandidate, id: candidateRef.id } // Store here if we want to query easily
                };

                // Hack: Store candidate object in application for easier frontend implementation without join
                // In production, we should keep normalized, but for this prototype it speeds up UI dev.
                await addDocumentNonBlocking(collection(firestore, 'applications'), newApplication);
            }

            toast({
                title: 'Амжилттай бүртгэгдлээ',
                description: `${data.lastName} ${data.firstName} горилогчоор бүртгэгдлээ.`,
            });
            setOpen(false);
            form.reset();
        } catch (error) {
            console.error(error);
            toast({
                title: 'Алдаа гарлаа',
                description: 'Хадгалж чадсангүй.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!vacancy) return null;

    return (
        <AppDialog open={open} onOpenChange={setOpen}>
            <AppDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Горилогч нэмэх
                </Button>
            </AppDialogTrigger>
            <AppDialogContent size="md" className="p-0 overflow-hidden">
                <AppDialogHeader className="px-6 pt-6">
                    <AppDialogTitle>Шинэ горилогч бүртгэх</AppDialogTitle>
                    <AppDialogDescription>
                        "{vacancy.title}" ажлын байранд материал бүрдүүлэх.
                    </AppDialogDescription>
                </AppDialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="lastName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Овог</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Нэр</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Имэйл</FormLabel>
                                    <FormControl>
                                        <Input type="email" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Утас</FormLabel>
                                    <FormControl>
                                        <Input type="tel" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <AppDialogFooter className="px-0 py-0 border-t-0 bg-transparent">
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Бүртгэх
                            </Button>
                        </AppDialogFooter>
                    </form>
                </Form>
            </AppDialogContent>
        </AppDialog>
    );
}
