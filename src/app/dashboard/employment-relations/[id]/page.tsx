'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase, useDoc, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { ERDocument, ERDocumentType, ERWorkflow, ERDocumentHistory } from '../types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkflowStatus } from '../components/workflow-status';
import { ApprovalAction } from '../components/approval-action';
import { Badge } from '@/components/ui/badge';
import { Loader2, Printer, Download, Clock, User, ArrowLeft, History, Send, Trash2 } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getStatusConfig, formatDateTime, formatActionType, getReplacementMap } from '../utils';
import { TemplateBuilder } from '../components/template-builder'; // Reusing for read-only view or edit
import Link from 'next/link';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function DocumentDetailPage({ params }: PageProps) {
    const { firestore, auth } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();

    const resolvedParams = React.use(params);
    const id = resolvedParams.id;

    const docRef = React.useMemo(() => firestore ? doc(firestore, 'er_documents', id) : null, [firestore, id]);
    const { data: document, isLoading } = useDoc<ERDocument>(docRef as any);

    // Fetch related Document Type
    const typeRef = React.useMemo(() =>
        firestore && document?.documentTypeId ? doc(firestore, 'er_document_types', document.documentTypeId) : null
        , [firestore, document]);
    const { data: typeData } = useDoc<any>(typeRef as any);

    const workflowRef = React.useMemo(() =>
        firestore && typeData?.workflowId ? doc(firestore, 'er_workflows', typeData.workflowId) : null
        , [firestore, typeData]);
    const { data: workflowData } = useDoc<any>(workflowRef as any);

    // Data fetching for Resolvers (Full Context)
    const employeeQuery = React.useMemo(() =>
        firestore && document?.employeeId ? doc(firestore, 'employees', document.employeeId) : null
        , [firestore, document]);
    const { data: employee } = useDoc<any>(employeeQuery as any);

    const positionQuery = React.useMemo(() =>
        firestore && employee?.positionId ? doc(firestore, 'positions', employee.positionId) : null
        , [firestore, employee]);
    const { data: position } = useDoc<any>(positionQuery as any);

    const departmentQuery = React.useMemo(() =>
        firestore && employee?.departmentId ? doc(firestore, 'departments', employee.departmentId) : null
        , [firestore, employee]);
    const { data: department } = useDoc<any>(departmentQuery as any);

    const questionnaireQuery = React.useMemo(() =>
        firestore && document?.employeeId ? doc(firestore, `employees/${document.employeeId}/questionnaire`, 'data') : null
        , [firestore, document]);
    const { data: questionnaire } = useDoc<any>(questionnaireQuery as any);

    // Fetch Company Profile
    const companyQuery = React.useMemo(() => firestore ? doc(firestore, 'company', 'profile') : null, [firestore]);
    const { data: company } = useDoc<any>(companyQuery as any);

    const resolvers = React.useMemo(() => {
        // We allow resolvers to be built even if some data is missing, 
        // placeholders will just remain empty lines.
        return getReplacementMap({
            employee,
            position,
            department,
            questionnaire,
            company,
            system: {
                user: 'CURRENT_USER', // In real app, get from auth context
                date: new Date().toISOString().split('T')[0],
                year: new Date().getFullYear(),
                month: new Date().getMonth() + 1,
                day: new Date().getDate()
            }
        });
    }, [employee, position, department, questionnaire, company]);

    const [isProcessing, setIsProcessing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (document?.content) setEditContent(document.content);
    }, [document]);


    const handleStatusUpdate = async (action: string, comment?: string) => {
        if (!firestore || !document || !workflowData) return;
        setIsProcessing(true);

        try {
            if (!workflowData.steps || !Array.isArray(workflowData.steps)) {
                throw new Error("Батлах урсгалын алхам тодорхойлогдоогүй байна.");
            }

            const currentStepIndex = workflowData.steps.findIndex((s: any) => s.id === document.currentStepId);
            // If current step not found (e.g. initial draft or weird state), handle gracefully
            // For DRAFT, currentStepId might be undefined/null.

            let newStatus = document.status;
            let newStepId: string | null | undefined = document.currentStepId || null;
            let logAction = action;

            if (action === 'APPROVE') {
                if (currentStepIndex === -1) {
                    // Should not happen for APPROVE action if not found
                    throw new Error("Одоогийн алхам олдсонгүй.");
                }

                // Move to next step
                if (currentStepIndex < workflowData.steps.length - 1) {
                    newStepId = workflowData.steps[currentStepIndex + 1].id;
                } else {
                    // Final step approved
                    newStatus = 'APPROVED';
                    newStepId = null; // No next step
                }
            } else if (action === 'SIGN') {
                newStatus = 'SIGNED';
                newStepId = null;
            } else if (action === 'UPDATE') { // Treat as Reject for now
                // Logic: Reject back to draft? Or previous step?
                // Simple: Back to DRAFT
                newStatus = 'DRAFT';
                newStepId = null;
                logAction = 'REJECT';
            }

            const currentStep = currentStepIndex !== -1 ? workflowData.steps[currentStepIndex] : null;

            const historyEntry: ERDocumentHistory = {
                stepId: currentStep?.id || document.status,
                action: logAction as any,
                actorId: 'CURRENT_USER', // TODO: auth.currentUser.uid
                timestamp: Timestamp.now(),
                comment: comment || ''
            };

            await updateDocumentNonBlocking(docRef!, {
                status: newStatus,
                currentStepId: newStepId === undefined ? null : newStepId,
                history: [...(document.history || []), historyEntry],
                updatedAt: Timestamp.now()
            });

            toast({ title: "Амжилттай", description: "Төлөв шинэчлэгдлээ" });
        } catch (error: any) {
            console.error("Status update error:", error);
            toast({ title: "Алдаа", description: error?.message || "Үйлдэл амжилтгүй боллоо", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSendToWorkflow = async () => {
        if (!firestore || !document || !workflowData) return;
        if (workflowData.steps.length === 0) {
            toast({ title: "Алдаа", description: "Энэ төрөлд батлах урсгал тохируулаагүй байна", variant: "destructive" });
            return;
        }

        try {
            // First step
            const firstStep = workflowData.steps[0];

            await updateDocumentNonBlocking(docRef!, {
                status: 'PENDING',
                currentStepId: firstStep.id,
                content: editContent, // Save content changes if any
                history: [...(document.history || []), {
                    stepId: 'DRAFT',
                    action: 'REVIEW', // Request review
                    actorId: 'CURRENT_USER',
                    timestamp: Timestamp.now(),
                    comment: 'Илгээсэн'
                }],
                updatedAt: Timestamp.now()
            });
            toast({ title: "Амжилттай", description: "Баримт зөвшөөрлийн урсгалд илгээгдлээ" });
            setIsEditing(false);
        } catch (error) {
            toast({ title: "Алдаа", description: "Илгээхэд алдаа гарлаа", variant: "destructive" });
        }
    };

    const handleSaveDraft = async () => {
        if (!firestore || !document) return;
        try {
            await updateDocumentNonBlocking(docRef!, {
                content: editContent,
                updatedAt: Timestamp.now()
            });
            toast({ title: "Амжилттай", description: "Хадгалагдлаа" });
        } catch (e) {
            toast({ title: "Алдаа", variant: "destructive" });
        }
    };

    const handleDelete = async () => {
        if (!firestore || !document) return;
        try {
            await deleteDocumentNonBlocking(docRef!);
            toast({ title: "Устгагдлаа", description: "Баримт амжилттай устгагдлаа" });
            router.push('/dashboard/employment-relations');
        } catch (e) {
            toast({ title: "Алдаа", description: "Устгахад алдаа гарлаа", variant: "destructive" });
        }
    };

    if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
    if (!document) return <div className="p-8">Document not found</div>;

    const statusConfig = getStatusConfig(document.status);
    const currentStep = workflowData?.steps.find((s: any) => s.id === document.currentStepId);

    // Permission check (Mock)
    const canApprove = document.status === 'PENDING' && currentStep;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 pb-32">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard/employment-relations">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-semibold">
                                {typeData?.name || 'Баримт'}
                            </h2>
                            <Badge className={statusConfig.color} variant="secondary">{statusConfig.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                            <span className="font-mono">{document.id}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><User className="h-3 w-3" /> {document.metadata?.employeeName}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDateTime(document.createdAt)}</span>
                        </p>
                    </div>
                    <div className="ml-auto flex gap-2">
                        {document.status === 'DRAFT' && (
                            <>
                                <Button variant="outline" onClick={handleSaveDraft}>Хадгалах</Button>
                                <Button onClick={handleSendToWorkflow}>
                                    <Send className="mr-2 h-4 w-4" />
                                    Илгээх
                                </Button>
                            </>
                        )}
                        <Button variant="outline" size="icon">
                            <Printer className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" size="icon" className="hover:bg-destructive/10 hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Баримт устгах</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Та энэ баримтыг устгахдаа итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                        Устгах
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>

                {/* Workflow Viz */}
                {workflowData && (
                    <Card>
                        <CardContent className="pt-6">
                            <WorkflowStatus
                                status={document.status}
                                currentStepId={document.currentStepId}
                                steps={workflowData.steps}
                                history={document.history}
                            />
                        </CardContent>
                    </Card>
                )}

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3 space-y-6">
                        {/* Approval Box */}
                        {canApprove && currentStep && (
                            <ApprovalAction
                                step={currentStep}
                                onAction={handleStatusUpdate}
                                isProcessing={isProcessing}
                            />
                        )}

                        {/* Document Content */}
                        <Card className="min-h-[800px] border shadow-sm">
                            <CardContent className="p-8 md:p-12 bg-white text-black">
                                {document.status === 'DRAFT' ? (
                                    <TemplateBuilder
                                        content={editContent}
                                        onChange={setEditContent}
                                        resolvers={resolvers}
                                    />
                                ) : (
                                    <div className="prose max-w-none whitespace-pre-wrap font-serif">
                                        {document.content}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        {/* Sidebar Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium">Түүх</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {document.history?.slice().reverse().map((h, i) => (
                                    <div key={i} className="flex gap-3 text-sm border-l-2 pl-3 pb-2 last:pb-0 relative">
                                        <div className={`
                                            absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full border-2 border-white
                                            ${h.action === 'APPROVE' ? 'bg-green-500' : 'bg-blue-500'}
                                        `} />
                                        <div>
                                            <div className="font-medium text-xs text-muted-foreground">{formatDateTime(h.timestamp)}</div>
                                            <div>{formatActionType(h.action)}</div>
                                            {h.comment && <div className="text-xs text-muted-foreground italic mt-1">"{h.comment}"</div>}
                                            <div className="text-xs text-muted-foreground mt-0.5">{h.actorId}</div>
                                        </div>
                                    </div>
                                ))}
                                {(!document.history || document.history.length === 0) && (
                                    <div className="text-muted-foreground text-xs">Түүх байхгүй</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
