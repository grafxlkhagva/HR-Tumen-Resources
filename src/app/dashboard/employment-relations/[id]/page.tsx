'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFirebase, useDoc, useCollection } from '@/firebase';
import { doc, Timestamp, updateDoc, collection, query, where, getDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ERDocument, DOCUMENT_STATUSES, DocumentStatus } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Loader2, ArrowLeft, CheckCircle2, Circle, Clock,
    User, Briefcase, Building2, Send, Save, Undo2,
    MessageSquare, Check, X, Upload, Printer, Download,
    Search, Plus, Trash2, FileText, Sparkles, Users, XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { formatDateTime, getReplacementMap, generateDocumentContent } from '../utils';
import { format } from 'date-fns';
import { TemplateBuilder } from '../components/template-builder';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useReactToPrint } from 'react-to-print';
import { PrintLayout } from '../components/print-layout';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function DocumentDetailPage({ params }: PageProps) {
    const { firestore, storage, user: currentUser } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();

    const resolvedParams = React.use(params);
    const id = resolvedParams.id;

    const docRef = useMemo(() => firestore ? doc(firestore, 'er_documents', id) : null, [firestore, id]);
    const { data: document, isLoading } = useDoc<ERDocument>(docRef as any);

    // Fetch template to check permissions
    const templateRef = useMemo(() => firestore && document?.templateId ? doc(firestore, 'er_templates', document.templateId) : null, [firestore, document?.templateId]);
    const { data: template } = useDoc<any>(templateRef);

    // Metadata & Entities
    const [editContent, setEditContent] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [selectedDept, setSelectedDept] = useState<string>('');
    const [selectedPos, setSelectedPos] = useState<string>('');
    const [reviewers, setReviewers] = useState<string[]>([]);
    const [isReviewRequired, setIsReviewRequired] = useState(true);

    const departmentsQuery = useMemo(() => firestore ? collection(firestore, 'departments') : null, [firestore]);
    const { data: departments } = useCollection<any>(departmentsQuery);

    const positionsQuery = useMemo(() =>
        firestore && selectedDept ? query(collection(firestore, 'positions'), where('departmentId', '==', selectedDept)) : null
        , [firestore, selectedDept]);
    const { data: positions } = useCollection<any>(positionsQuery);

    const employeesQuery = useMemo(() => firestore ? collection(firestore, 'employees') : null, [firestore]);
    const { data: employeesList } = useCollection<any>(employeesQuery);

    const allPositionsListQuery = useMemo(() => firestore ? collection(firestore, 'positions') : null, [firestore]);
    const { data: allPositions } = useCollection<any>(allPositionsListQuery);

    const occupiedPositions = useMemo(() => {
        if (!allPositions || !employeesList) return [];
        return allPositions.map(pos => {
            const occupant = employeesList.find((emp: any) =>
                (emp.positionId === pos.id || emp.id === pos.managerId) &&
                ['Идэвхтэй', 'Томилогдож буй'].includes(emp.status || 'Идэвхтэй') // Ensure active/onboarding only
            );
            return occupant ? { ...pos, occupant } : null;
        }).filter(Boolean);
    }, [allPositions, employeesList]);

    const [companyProfile, setCompanyProfile] = useState<any>(null);
    useEffect(() => {
        if (!firestore) return;
        getDocs(collection(firestore, 'company_profile')).then(snap => {
            if (!snap.empty) setCompanyProfile(snap.docs[0].data());
        });
    }, [firestore]);

    // UI States
    // UI States
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Print Handling
    const printComponentRef = React.useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printComponentRef,
        documentTitle: document?.metadata?.templateName || 'Document',
        onAfterPrint: () => toast({ title: "Хэвлэх үйлдэл дууслаа" })
    });
    const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [returnReason, setReturnReason] = useState('');

    useEffect(() => {
        if (document) {
            // Only set if current state is empty to avoid overwriting user edits
            if (!editContent) setEditContent(document.content || '');
            if (!selectedDept) setSelectedDept(document.departmentId || '');
            if (!selectedPos) setSelectedPos(document.positionId || '');
            if (reviewers.length === 0) setReviewers(document.reviewers || []);

            if (reviewers.length === 0) setReviewers(document.reviewers || []);

            if (document.employeeId && !selectedEmployee) {
                getDoc(doc(firestore!, 'employees', document.employeeId)).then(snap => {
                    if (snap.exists()) setSelectedEmployee({ id: snap.id, ...snap.data() });
                });
            }
        }
    }, [document, firestore]);

    // Fetch current user's employee profile for position-based checks
    const { data: currentUserProfile } = useDoc<any>(
        useMemo(() => firestore && currentUser ? doc(firestore, 'employees', currentUser.uid) : null, [firestore, currentUser])
    );

    const isApprover = useMemo(() => {
        if (!document?.reviewers || !currentUserProfile) return false;
        // Check if user's position matches any reviewer position
        return document.reviewers.some(rid =>
            rid === currentUserProfile.positionId ||
            rid === currentUserProfile.id // Keep support for direct UID if needed
        );
    }, [document?.reviewers, currentUserProfile]);

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    if (!document) return <div className="p-8 text-center bg-slate-50 h-screen"><p className="text-muted-foreground">Баримт олдсонгүй</p></div>;

    const currentStatus = document.status;
    const isOwner = document.creatorId === currentUser?.uid;



    const steps = [
        { id: 'DRAFT', label: 'Төлөвлөх', icon: Circle, color: 'text-slate-400' },
        { id: 'IN_REVIEW', label: 'Хянах', icon: Clock, color: 'text-amber-500' },
        { id: 'APPROVED', label: 'Батлах', icon: CheckCircle2, color: 'text-emerald-500' },
        { id: 'SIGNED', label: 'Баталгаажих', icon: FileText, color: 'text-emerald-700' },
    ];

    const handleSaveDraft = async () => {
        if (!docRef) return;
        setIsSaving(true);
        try {
            await updateDoc(docRef, {
                content: editContent,
                departmentId: selectedDept,
                positionId: selectedPos,
                reviewers: reviewers,
                metadata: {
                    ...document.metadata,
                    departmentName: departments?.find(d => d.id === selectedDept)?.name,
                    positionName: positions?.find(p => p.id === selectedPos)?.title,
                },
                updatedAt: Timestamp.now()
            });
            toast({ title: "Хадгалагдлаа", description: "Өөрчлөлтүүд амжилттай хадгалагдлаа" });
        } catch (e) {
            toast({ title: "Алдаа", description: "Хадгалахад алдаа гарлаа", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendForReview = async () => {
        if (!docRef) return;

        if (isReviewRequired && reviewers.length === 0) {
            toast({
                title: "Анхааруулга",
                description: "Хянуулах шаардлагатай үед заавал хянагч сонгох ёстой.",
                variant: "destructive"
            });
            return;
        }

        setIsSaving(true);
        try {
            const initialApprovalStatus: Record<string, any> = {};

            if (isReviewRequired && reviewers.length > 0) {
                reviewers.forEach(uid => {
                    initialApprovalStatus[uid] = { status: 'PENDING', updatedAt: Timestamp.now() };
                });
            }

            // If review is not required, jump straight to APPROVED (or REVIEWED if simpler, but APPROVED fits 'skip' better)
            // But usually 'Send for Review' implies starting a process. 
            // If No Review Required -> Document becomes Valid immediately? 
            // Let's assume 'APPROVED' as the final valid state.
            const nextStatus = isReviewRequired ? 'IN_REVIEW' : 'APPROVED';

            await updateDoc(docRef, {
                status: nextStatus,
                reviewers: isReviewRequired ? reviewers : [],
                approvalStatus: initialApprovalStatus,
                updatedAt: Timestamp.now()
            });

            toast({
                title: nextStatus === 'APPROVED' ? "Батлагдлаа" : "Илгээгдлээ",
                description: nextStatus === 'APPROVED' ? "Хянах шат алгасан шууд батлагдлаа" : "Баримт хянах шат руу шилжлээ"
            });
        } catch (e) {
            toast({ title: "Алдаа", description: "Илгээхэд алдаа гарлаа", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleApprove = async () => {
        if (!docRef || !currentUser) return;
        setIsSaving(true);
        try {
            const newApprovalStatus = { ...document.approvalStatus };

            // Find which reviewer record the current user matches (either by PID or UID)
            const matchedReviewerKey = reviewers.find(rid =>
                rid === currentUser.uid || (currentUserProfile && rid === currentUserProfile.positionId)
            );

            if (matchedReviewerKey) {
                newApprovalStatus[matchedReviewerKey] = {
                    status: 'APPROVED',
                    actorId: currentUser.uid,
                    updatedAt: Timestamp.now()
                };
            } else {
                // Fallback for direct UID if not found as PID
                newApprovalStatus[currentUser.uid] = {
                    status: 'APPROVED',
                    updatedAt: Timestamp.now()
                };
            }

            // Check if all approved (using the keys from the reviewers array)
            const allApproved = reviewers.every(id => newApprovalStatus[id]?.status === 'APPROVED');

            await updateDoc(docRef, {
                approvalStatus: newApprovalStatus,
                status: allApproved ? 'REVIEWED' : 'IN_REVIEW',
                updatedAt: Timestamp.now()
            });

            toast({ title: "Зөвшөөрлөө", description: allApproved ? "Бүх хянагчид зөвшөөрсөн. Эцсийн батлалт хүлээж байна." : "Таны зөвшөөрөл бүртгэгдлээ" });
        } catch (e) {
            toast({ title: "Алдаа", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleFinalApprove = async () => {
        if (!docRef) return;
        setIsSaving(true);
        try {
            await updateDoc(docRef, {
                status: 'APPROVED',
                updatedAt: Timestamp.now()
            });

            toast({ title: "Батлагдлаа", description: "Баримт эцэслэн батлагдлаа" });
        } catch (e) {
            toast({ title: "Алдаа", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleReturn = async () => {
        if (!docRef || !currentUser) return;
        if (!returnReason) return;
        setIsSaving(true);
        try {
            const newApprovalStatus = { ...document.approvalStatus };
            newApprovalStatus[currentUser.uid] = {
                status: 'REJECTED',
                comment: returnReason,
                updatedAt: Timestamp.now()
            };

            await updateDoc(docRef, {
                status: 'DRAFT', // Go back to draft
                approvalStatus: newApprovalStatus,
                rejectionReason: returnReason,
                updatedAt: Timestamp.now()
            });

            setIsReturnDialogOpen(false);
            setReturnReason('');
            toast({ title: "Буцаагдлаа", description: "Баримтыг засвар руу буцаалаа" });
        } catch (e) {
            toast({ title: "Алдаа", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleRecall = async () => {
        if (!docRef) return;
        setIsSaving(true);
        try {
            await updateDoc(docRef, {
                status: 'DRAFT',
                updatedAt: Timestamp.now()
            });
            toast({ title: "Буцаан татлаа", description: "Баримтыг засварлахаар төлөвлөх шат руу шилжүүллээ" });
        } catch (e) {
            toast({ title: "Алдаа", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!docRef) return;
        setIsSaving(true);
        try {
            await deleteDoc(docRef);
            toast({ title: "Устгагдлаа", description: "Баримт амжилттай устгагдлаа" });
            router.push('/dashboard/employment-relations');
        } catch (e) {
            toast({ title: "Алдаа", description: "Устгахад алдаа гарлаа", variant: "destructive" });
        } finally {
            setIsSaving(false);
            setIsDeleteDialogOpen(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !docRef || !storage) return;

        setIsUploading(true);
        try {
            // Create a reference to 'signed_docs/<docId>/<filename>'
            const storageRef = ref(storage, `signed_docs/${id}/${Date.now()}_${file.name}`);

            // Upload
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            // Update document
            await updateDoc(docRef, {
                signedDocUrl: downloadURL,
                status: 'SIGNED',
                updatedAt: Timestamp.now()
            });

            toast({ title: "Амжилттай", description: "Эх хувь баталгаажиж, процесс дууслаа" });
        } catch (error) {
            console.error(error);
            toast({ title: "Алдаа", description: "Файл хуулахад алдаа гарлаа", variant: "destructive" });
        } finally {
            setIsUploading(false);
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/30 overflow-hidden">
            {/* Header Content */}
            <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 space-y-8">
                {/* Breadcrumbs & Status Stepper */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-4">
                        <Link href="/dashboard/employment-relations" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-primary transition-colors">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Процесс удирдлага
                        </Link>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 truncate max-w-md">
                                {document.metadata?.templateName || 'Баримтын нэр'}
                            </h1>
                            <Badge className={cn("px-3 py-1 font-bold", DOCUMENT_STATUSES[currentStatus].color)}>
                                {DOCUMENT_STATUSES[currentStatus].label}
                            </Badge>
                        </div>
                    </div>

                    {/* Progress Stepper */}
                    <div className="flex items-center bg-white p-2 rounded-2xl shadow-sm border">
                        {steps.map((step, idx) => {
                            const isPast = steps.findIndex(s => s.id === currentStatus) > idx;
                            const isCurrent = step.id === currentStatus;
                            const isLast = idx === steps.length - 1;

                            return (
                                <React.Fragment key={step.id}>
                                    <div className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-xl transition-all",
                                        isCurrent ? "bg-primary text-white shadow-md shadow-primary/20 scale-105 z-10" : "text-slate-400"
                                    )}>
                                        <div className={cn(
                                            "h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs border-2",
                                            isPast ? "bg-emerald-500 border-emerald-500 text-white" :
                                                isCurrent ? "bg-white text-primary border-white" : "border-slate-200"
                                        )}>
                                            {isPast ? <Check className="h-4 w-4" /> : idx + 1}
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-wider">{step.label}</span>
                                    </div>
                                    {!isLast && <div className="w-12 h-0.5 bg-slate-100 mx-1" />}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                    {/* Sidebar: Entities */}
                    <div className="xl:col-span-1 space-y-4">
                        <EntityCard
                            title="Ажилтан"
                            icon={User}
                            name={selectedEmployee ? `${selectedEmployee.lastName || ''} ${selectedEmployee.firstName || ''}`.trim() : (document.metadata?.employeeName || 'Сонгоогүй')}
                            subText={`ID: ${document.employeeId}`}
                            color="blue"
                        />

                        {currentStatus === 'DRAFT' ? (
                            <>
                                <EntityCard
                                    title="Албан нэгж"
                                    icon={Building2}
                                    name={document.metadata?.departmentName || departments?.find(d => d.id === selectedDept)?.name || 'Мэдээлэлгүй'}
                                    color="amber"
                                />
                                <EntityCard
                                    title="Ажлын байр"
                                    icon={Briefcase}
                                    name={document.metadata?.positionName || positions?.find(p => p.id === selectedPos)?.title || 'Мэдээлэлгүй'}
                                    color="purple"
                                />
                            </>
                        ) : (
                            <>
                                <EntityCard
                                    title="Албан нэгж"
                                    icon={Building2}
                                    name={document.metadata?.departmentName || 'Мэдээлэлгүй'}
                                    color="amber"
                                />
                                <EntityCard
                                    title="Ажлын байр"
                                    icon={Briefcase}
                                    name={document.metadata?.positionName || 'Мэдээлэлгүй'}
                                    color="purple"
                                />
                            </>
                        )}

                        {/* Approvers Section */}
                        <Card className="border-none shadow-sm bg-white overflow-hidden">
                            <CardHeader className="bg-slate-900 text-white p-4">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Users className="h-4 w-4 text-primary" /> Хянах, Батлах
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                {currentStatus === 'DRAFT' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <Label className="text-xs font-bold text-slate-700">Хянуулах шаардлагатай</Label>
                                            <Switch
                                                checked={isReviewRequired}
                                                onCheckedChange={(checked) => {
                                                    setIsReviewRequired(checked);
                                                    if (!checked) setReviewers([]); // Clear reviewers if not required logic prefers
                                                }}
                                            />
                                        </div>

                                        {isReviewRequired && (
                                            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <Label className="text-[10px] uppercase font-bold text-slate-400">Албан тушаалаар сонгох</Label>
                                                <Select onValueChange={(posId) => {
                                                    if (posId && !reviewers.includes(posId)) {
                                                        setReviewers([...reviewers, posId]);
                                                    }
                                                }}>
                                                    <SelectTrigger className="text-xs h-9 bg-slate-50 border-slate-200">
                                                        <Briefcase className="h-3 w-3 mr-2 text-slate-400" />
                                                        <SelectValue placeholder="Сонгох..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {occupiedPositions?.length === 0 ? (
                                                            <div className="p-2 text-[10px] text-slate-400 text-center">Сонгох боломжтой албан тушаал алга</div>
                                                        ) : (
                                                            occupiedPositions?.map(p => {
                                                                const pos = p as any;
                                                                return (
                                                                    <SelectItem key={pos.id} value={pos.id}>
                                                                        <span className="font-bold">{pos.title}</span> <span className="text-slate-400">- {pos.occupant?.firstName}</span>
                                                                    </SelectItem>
                                                                );
                                                            })
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <p className="text-[10px] text-slate-400 pt-1">
                                                    * Зөвхөн ажилтан томилогдсон ажлын байр харагдана.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-3 pt-2">
                                    {reviewers.map((rid, idx) => {
                                        const pos = allPositions?.find(p => p.id === rid);
                                        const occupant = employeesList?.find(u => u.positionId === rid || u.id === rid);
                                        const status = document.approvalStatus?.[occupant?.id || rid];

                                        return (
                                            <div key={rid} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 group">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <Avatar className="h-7 w-7 border shrink-0">
                                                        <AvatarImage src={occupant?.photoURL} />
                                                        <AvatarFallback className="text-[10px]">{pos?.title?.charAt(0) || '?'}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate">
                                                            {pos?.title || 'Тодорхойгүй талбар'}
                                                        </div>
                                                        <div className="text-[11px] font-bold text-slate-800 truncate">
                                                            {occupant ? `${occupant.firstName} ${occupant.lastName}` : 'Сул орон тоо'}
                                                        </div>
                                                        {status && (
                                                            <div className={cn(
                                                                "text-[9px] font-bold uppercase mt-0.5",
                                                                status.status === 'APPROVED' ? "text-emerald-500" :
                                                                    status.status === 'REJECTED' ? "text-rose-500" : "text-amber-500"
                                                            )}>
                                                                {status.status === 'APPROVED' ? 'Зөвшөөрсөн' : status.status === 'REJECTED' ? 'Татгалзсан' : 'Хүлээгдэж буй'}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {currentStatus === 'DRAFT' && (
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-500" onClick={() => setReviewers(reviewers.filter(r => r !== rid))}>
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                )}
                                                {status?.status === 'APPROVED' && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                                                {status?.status === 'REJECTED' && <XCircle className="h-4 w-4 text-rose-500 shrink-0" />}
                                            </div>
                                        );
                                    })}
                                    {reviewers.length === 0 && <p className="text-[10px] text-center text-slate-400 py-4 italic">Хянагч сонгоогүй байна</p>}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content: Content & Collaboration */}
                    <div className="xl:col-span-3 space-y-6">
                        {/* Rejection Notification in Draft */}
                        {currentStatus === 'DRAFT' && document.approvalStatus && Object.values(document.approvalStatus).some((s: any) => s.status === 'REJECTED') && (
                            <Card className="border-none shadow-sm bg-rose-50 border-l-4 border-l-rose-500 overflow-hidden">
                                <CardContent className="p-4 flex gap-4">
                                    <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                                        <Undo2 className="h-5 w-5 text-rose-600" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-rose-900">Засварлах шаардлагатай байна</h4>
                                        <div className="text-sm text-rose-700 space-y-2">
                                            {Object.entries(document.approvalStatus).filter(([_, s]: [any, any]) => s.status === 'REJECTED').map(([uid, s]: [any, any]) => {
                                                const rUser = employeesList?.find(u => u.id === uid);
                                                return (
                                                    <div key={uid} className="bg-white/50 p-2 rounded border border-rose-100 italic">
                                                        <span className="font-bold not-italic">{rUser?.firstName}:</span> "{s.comment}"
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Actions Bar */}
                        <Card className="border-none shadow-sm bg-white overflow-hidden">
                            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-2 font-bold text-slate-700">
                                    <FileText className="h-4 w-4" /> Документын байдал
                                </div>
                                <div className="flex items-center gap-2">
                                    {currentStatus === 'DRAFT' && (
                                        <>
                                            {(template?.isDeletable ?? true) && (
                                                <Button variant="outline" size="sm" className="text-rose-600 hover:bg-rose-50 border-rose-200" onClick={() => setIsDeleteDialogOpen(true)} disabled={isSaving}>
                                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                    Устгах
                                                </Button>
                                            )}
                                            <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={isSaving}>
                                                {isSaving ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5 mr-2" />}
                                                Хадгалах
                                            </Button>
                                            <Button size="sm" onClick={handleSendForReview} disabled={isSaving}>
                                                <Send className="h-3.5 w-3.5 mr-2" />
                                                Хянахаар илгээх
                                            </Button>
                                        </>
                                    )}
                                    {currentStatus === 'IN_REVIEW' && isOwner && (
                                        <Button variant="outline" size="sm" onClick={handleRecall} disabled={isSaving}>
                                            <Undo2 className="h-3.5 w-3.5 mr-2" />
                                            Засвар руу буцаах
                                        </Button>
                                    )}
                                    {currentStatus === 'IN_REVIEW' && isApprover && document.approvalStatus?.[currentUser?.uid!]?.status === 'PENDING' && (
                                        <>
                                            <Button variant="outline" size="sm" className="text-rose-600 hover:bg-rose-50 border-rose-200" onClick={() => setIsReturnDialogOpen(true)} disabled={isSaving}>
                                                <Undo2 className="h-3.5 w-3.5 mr-2" />
                                                Буцаах
                                            </Button>
                                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleApprove} disabled={isSaving}>
                                                <Check className="h-3.5 w-3.5 mr-2" />
                                                Батлах
                                            </Button>
                                        </>
                                    )}
                                    {currentStatus === 'REVIEWED' && isOwner && (
                                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleFinalApprove} disabled={isSaving}>
                                            <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                                            Эцэслэн батлах
                                        </Button>
                                    )}
                                    {currentStatus === 'APPROVED' && (
                                        <>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={handleFileUpload}
                                            />
                                            <Button variant="outline" size="sm" className="border-slate-300" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                                                {isUploading ? <Loader2 className="animate-spin h-3.5 w-3.5 mr-2" /> : <Upload className="h-3.5 w-3.5 mr-2" />}
                                                {isUploading ? 'Хуулж байна...' : 'Эх хувийг хавсаргах'}
                                            </Button>
                                        </>
                                    )}
                                    {currentStatus === 'SIGNED' && document.signedDocUrl && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                            onClick={() => window.open(document.signedDocUrl, '_blank')}
                                        >
                                            <FileText className="h-3.5 w-3.5 mr-2" />
                                            Эх хувийг харах
                                        </Button>
                                    )}
                                    <div className="h-6 w-px bg-slate-200 mx-2" />
                                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handlePrint && handlePrint()}>
                                        <Printer className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handlePrint && handlePrint()}>
                                        <Download className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Hidden Print Layout */}
                        <div style={{ display: 'none' }}>
                            <PrintLayout
                                ref={printComponentRef}
                                content={editContent || document.content || ''}
                                settings={document?.metadata?.printSettings}
                            />
                        </div>

                        {/* Document Content */}
                        <Card className="border-none shadow-lg bg-white overflow-hidden min-h-[800px]">
                            <CardHeader className="p-6 border-b bg-slate-50/50 flex flex-row items-center justify-between">
                                <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-primary" /> Баримтын агуулга
                                </CardTitle>
                                {currentStatus !== 'DRAFT' && <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-400">Зөвхөн харах</Badge>}
                            </CardHeader>
                            <CardContent className="p-0">
                                {currentStatus === 'DRAFT' ? (
                                    <div className="p-8">
                                        <TemplateBuilder
                                            content={editContent}
                                            onChange={setEditContent}
                                            resolvers={getReplacementMap({
                                                employee: selectedEmployee,
                                                department: departments?.find(d => d.id === selectedDept),
                                                position: positions?.find(p => p.id === selectedPos),
                                                company: companyProfile,
                                                system: {
                                                    date: format(new Date(), 'yyyy-MM-dd'),
                                                    year: format(new Date(), 'yyyy'),
                                                    month: format(new Date(), 'MM'),
                                                    day: format(new Date(), 'dd'),
                                                    user: currentUser?.displayName || 'Системийн хэрэглэгч'
                                                },
                                                customInputs: document.customInputs
                                            })}
                                            printSettings={document.printSettings}
                                        />
                                    </div>
                                ) : (
                                    <div className="bg-slate-200/30 p-12 min-h-[600px] flex justify-center overflow-auto">
                                        <div
                                            className="bg-white shadow-2xl p-[20mm] prose prose-slate max-w-none w-[210mm] min-h-[297mm] ring-1 ring-slate-900/5 relative"
                                            dangerouslySetInnerHTML={{
                                                // Even in review/approved, we should probably resolve if any are left
                                                __html: generateDocumentContent(document.content, {
                                                    employee: selectedEmployee,
                                                    department: departments?.find(d => d.id === selectedDept),
                                                    position: positions?.find(p => p.id === selectedPos),
                                                    company: companyProfile,
                                                    system: {
                                                        date: format(new Date(), 'yyyy-MM-dd'),
                                                        year: format(new Date(), 'yyyy'),
                                                        month: format(new Date(), 'MM'),
                                                        day: format(new Date(), 'dd'),
                                                        user: currentUser?.displayName || 'Системийн хэрэглэгч'
                                                    },
                                                    customInputs: document.customInputs
                                                }).replace(/\n/g, '<br/>')
                                            }}
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Review History / Comments (Visible in Review & Approved) */}
                        {currentStatus !== 'DRAFT' && (
                            <Card className="border-none shadow-sm bg-white overflow-hidden">
                                <CardHeader className="p-4 bg-slate-50 border-b">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4 text-slate-400" /> Сэтгэгдэл, шийдвэрүүд
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 space-y-4">
                                    {Object.entries(document.approvalStatus || {}).map(([uid, data]: [string, any]) => {
                                        const rUser = employeesList?.find(u => u.id === uid || u.id === data.actorId || u.positionId === uid);
                                        // Still show even if pending so creator knows who is outstanding
                                        // if (data.status === 'PENDING' && currentStatus === 'IN_REVIEW') return null;

                                        return (
                                            <div key={uid} className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                                <Avatar className="h-10 w-10 border-2 border-white shadow-sm shrink-0">
                                                    <AvatarImage src={rUser?.photoURL} />
                                                    <AvatarFallback>{rUser?.firstName?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="space-y-2 flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <div className="font-bold text-slate-900">
                                                            {rUser ? `${rUser.firstName} ${rUser.lastName}` : (allPositions?.find(p => p.id === uid)?.title || 'Батлах түвшин')}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400">{formatDateTime(data.updatedAt)}</div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge className={cn(
                                                            "text-[10px] py-0 h-5",
                                                            data.status === 'APPROVED' ? "bg-emerald-100 text-emerald-700" :
                                                                data.status === 'REJECTED' ? "bg-rose-100 text-rose-700" :
                                                                    "bg-amber-100 text-amber-700"
                                                        )}>
                                                            {data.status === 'APPROVED' ? 'Батлагдсан' :
                                                                data.status === 'REJECTED' ? 'Буцаасан' :
                                                                    'Хүлээгдэж буй'}
                                                        </Badge>
                                                    </div>
                                                    {data.comment && (
                                                        <div className="text-sm text-slate-600 bg-white p-3 rounded-lg border italic">
                                                            "{data.comment}"
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(!document.approvalStatus || Object.values(document.approvalStatus).every(v => v.status === 'PENDING')) && (
                                        <div className="text-center py-8 text-slate-400 text-sm italic">
                                            Шийдвэр хараахан гараагүй байна
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            {/* Return Dialog */}
            <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Буцаах шалтгаан</DialogTitle>
                        <DialogDescription>
                            Засварлах шаардлагатай байгаа зүйлийг тайлбарлаж бичнэ үү.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder="Тайлбар бичих..."
                            value={returnReason}
                            onChange={(e) => setReturnReason(e.target.value)}
                            className="min-h-[120px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsReturnDialogOpen(false)}>Цуцлах</Button>
                        <Button className="bg-rose-600 hover:bg-rose-700 text-white" onClick={handleReturn} disabled={!returnReason || isSaving}>
                            Илгээх
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Баримт устгах</DialogTitle>
                        <DialogDescription>
                            Та энэ баримтыг устгахдаа итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Цуцлах</Button>
                        <Button className="bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDelete} disabled={isSaving}>
                            {isSaving ? <Loader2 className="animate-spin h-3.5 w-3.5 mr-2" /> : <Trash2 className="h-3.5 w-3.5 mr-2" />}
                            Устгах
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function EntityCard({ title, icon: Icon, name, subText, color }: { title: string, icon: any, name: string, subText?: string, color: 'blue' | 'amber' | 'purple' | 'slate' }) {
    const colorClasses: Record<string, string> = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        purple: "bg-purple-50 text-purple-600 border-purple-100",
        slate: "bg-slate-50 text-slate-600 border-slate-100",
    };

    return (
        <Card className="border-none shadow-sm overflow-hidden bg-white">
            <div className={cn("px-4 py-3 border-b flex items-center gap-2", "bg-slate-50/50")}>
                <Icon className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{title}</h3>
            </div>
            <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center border", colorClasses[color] || colorClasses.slate)}>
                    <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 truncate leading-none">{name}</div>
                    {subText && <div className="text-[10px] text-slate-400 mt-1">{subText}</div>}
                </div>
            </CardContent>
        </Card>
    );
}
