'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    FileText,
    Check,
    X,
    Clock,
    Search,
    MessageSquare,
    Loader2,
    CheckCircle2,
    Eye
} from 'lucide-react';
import { useFirebase, useCollection } from '@/firebase';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { collection, query, where, doc, updateDoc, Timestamp, orderBy } from 'firebase/firestore';
import { ERDocument } from '../../dashboard/employment-relations/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatDateTime } from '../../dashboard/employment-relations/utils';

export default function DocumentReviewPage() {
    const router = useRouter();
    const { firestore } = useFirebase();
    const { employeeProfile, isProfileLoading } = useEmployeeProfile();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');

    // Review Actions State
    const [selectedDoc, setSelectedDoc] = useState<ERDocument | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
    const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
    const [comment, setComment] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Fetch documents based on the user's position
    const docsQuery = useMemo(() => {
        if (!firestore || !employeeProfile) return null;

        const reviewerIds = [employeeProfile.id];
        if (employeeProfile.positionId) reviewerIds.push(employeeProfile.positionId);

        return query(
            collection(firestore, 'er_documents'),
            where('reviewers', 'array-contains-any', reviewerIds),
            where('status', '==', 'IN_REVIEW'),
            orderBy('updatedAt', 'desc')
        );
    }, [firestore, employeeProfile]);

    const { data: documents, isLoading, error: queryError } = useCollection<ERDocument>(docsQuery as any);

    const filteredDocs = useMemo(() => {
        if (!documents) return [];
        return documents.filter(doc =>
            doc.metadata?.templateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.metadata?.employeeName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [documents, searchTerm]);

    const handleAction = async () => {
        if (!selectedDoc || !actionType || !employeeProfile || !firestore) return;

        setIsProcessing(true);
        try {
            const docRef = doc(firestore, 'er_documents', selectedDoc.id);
            const newApprovalStatus = { ...(selectedDoc.approvalStatus || {}) };

            // Find which reviewer record the current user matches (either by PID or UID)
            const matchedReviewerKey = selectedDoc.reviewers?.find(rid =>
                rid === employeeProfile.id || (employeeProfile.positionId && rid === employeeProfile.positionId)
            );

            if (matchedReviewerKey) {
                newApprovalStatus[matchedReviewerKey] = {
                    status: actionType === 'APPROVE' ? 'APPROVED' : 'REJECTED',
                    comment: comment,
                    actorId: employeeProfile.id,
                    updatedAt: Timestamp.now()
                };
            } else {
                // Fallback for safety
                newApprovalStatus[employeeProfile.id] = {
                    status: actionType === 'APPROVE' ? 'APPROVED' : 'REJECTED',
                    comment: comment,
                    updatedAt: Timestamp.now()
                };
            }

            // Check if all designated reviewers have an approval
            const allApproved = selectedDoc.reviewers?.every(rid =>
                newApprovalStatus[rid]?.status === 'APPROVED'
            );

            const updateData: any = {
                approvalStatus: newApprovalStatus,
                updatedAt: Timestamp.now()
            };

            if (actionType === 'REJECT') {
                updateData.status = 'DRAFT';
                updateData.rejectionReason = comment;
            } else if (allApproved) {
                updateData.status = 'APPROVED';
            }

            await updateDoc(docRef, updateData);

            toast({
                title: actionType === 'APPROVE' ? "Батлагдлаа" : "Буцаагдлаа",
                description: actionType === 'APPROVE' ? "Таны зөвшөөрөл бүртгэгдлээ" : "Баримтыг засвар руу буцаалаа"
            });

            setIsActionDialogOpen(false);
            setComment('');
            setSelectedDoc(null);
        } catch (error) {
            console.error(error);
            toast({ title: "Алдаа гарлаа", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col pb-10">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md sticky top-0 z-20 px-6 pt-12 pb-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="rounded-full hover:bg-slate-100 shrink-0"
                    >
                        <ArrowLeft className="h-6 w-6 text-slate-600" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 leading-tight">Хянах баримтууд</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Position-Based Review</p>
                    </div>
                </div>
                {documents && documents.length > 0 && (
                    <Badge className="bg-primary/10 text-primary border-none text-xs font-bold px-3 py-1 rounded-full">
                        {documents.length}
                    </Badge>
                )}
            </div>

            {/* User Info / Position Badge */}
            {employeeProfile && (
                <div className="px-6 pt-4">
                    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-3 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                            {employeeProfile.jobTitle?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] font-bold text-primary uppercase tracking-wider leading-none mb-1">Таны албан тушаал</p>
                            <p className="text-xs font-bold text-slate-700 truncate">{employeeProfile.jobTitle}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="px-6 pt-4 space-y-4">
                <div className="relative group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Ажилтан эсвэл загвараар хайх..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-10 bg-white border-slate-100 rounded-2xl shadow-sm focus:ring-primary/10 transition-all text-sm"
                    />
                </div>
            </div>

            {/* Documents List */}
            <div className="flex-1 px-6 pt-4 space-y-4">
                {queryError && (
                    <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 space-y-2">
                        <h3 className="font-bold text-rose-900">Алдаа гарлаа</h3>
                        <p className="text-sm text-rose-700">{queryError.message}</p>
                        {queryError.message.includes('index') && (
                            <a
                                href={queryError.message.match(/https:\/\/[^\s]+/)?.[0] || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 underline block mt-2"
                            >
                                Index үүсгэх холбоос
                            </a>
                        )}
                    </div>
                )}

                {(isLoading || isProfileLoading) ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Уншиж байна...</p>
                    </div>
                ) : !employeeProfile ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 text-slate-400 font-bold uppercase tracking-widest text-xs">
                        Ажилтны мэдээлэл олдсонгүй
                    </div>
                ) : filteredDocs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                        <div className="h-20 w-20 bg-slate-100 rounded-[30px] flex items-center justify-center">
                            <CheckCircle2 className="h-10 w-10 text-slate-300" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-slate-900">Одоогоор баримт байхгүй</h3>
                            <p className="text-sm text-slate-500 max-w-[200px] mx-auto leading-relaxed text-balance">
                                Таны албан тушаалд хамаарах хүлээгдэж буй баримт алга байна.
                            </p>
                        </div>
                    </div>
                ) : (
                    filteredDocs.map((doc) => {
                        const handledByMe = doc.approvalStatus?.[employeeProfile.id] ??
                            (employeeProfile.positionId ? doc.approvalStatus?.[employeeProfile.positionId] : undefined);
                        const isHandled = handledByMe && handledByMe.status !== 'PENDING';
                        const myStatus = handledByMe?.status;

                        return (
                            <Card
                                key={doc.id}
                                className={cn(
                                    "border-none shadow-premium overflow-hidden transition-all active:scale-[0.98] group relative rounded-3xl",
                                    isHandled ? "opacity-60" : "hover:border-primary/20"
                                )}
                            >
                                <CardContent className="p-5 flex flex-col gap-4">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1 flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors">
                                                    <FileText className="h-4 w-4 text-slate-500 group-hover:text-primary" />
                                                </div>
                                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter py-0 h-5 border-slate-200 text-slate-400">
                                                    {doc.metadata?.templateName || 'Загвар'}
                                                </Badge>
                                            </div>
                                            <h4 className="text-base font-bold text-slate-900 truncate pr-4 pt-1">
                                                {doc.metadata?.employeeName}
                                            </h4>
                                            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                                                <Clock className="h-3 w-3" />
                                                {formatDateTime(doc.updatedAt)}
                                            </div>
                                        </div>
                                        {isHandled ? (
                                            myStatus === 'APPROVED' ? (
                                                <Badge className="bg-emerald-50 text-emerald-600 border-none rounded-full px-2 py-0.5">
                                                    <Check className="h-3 w-3" />
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-rose-50 text-rose-600 border-none rounded-full px-2 py-0.5">
                                                    <X className="h-3 w-3" />
                                                </Badge>
                                            )
                                        ) : (
                                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse mt-2" />
                                        )}
                                    </div>

                                    <div className="flex gap-2 pt-1">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="flex-1 h-10 rounded-xl bg-slate-50 font-bold text-[11px] text-slate-600 hover:bg-slate-100 transition-all border border-slate-100"
                                            onClick={() => { setSelectedDoc(doc); setIsPreviewOpen(true); }}
                                        >
                                            <Eye className="h-3.5 w-3.5 mr-2" />
                                            Унших
                                        </Button>
                                        {!isHandled && (
                                            <div className="flex gap-2 flex-[2]">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1 h-10 rounded-xl border-rose-100 text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all font-bold text-[11px]"
                                                    onClick={() => { setSelectedDoc(doc); setActionType('REJECT'); setIsActionDialogOpen(true); }}
                                                >
                                                    <X className="h-3.5 w-3.5 mr-2" />
                                                    Буцаах
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 transition-all font-bold text-[11px]"
                                                    onClick={() => { setSelectedDoc(doc); setActionType('APPROVE'); setIsActionDialogOpen(true); }}
                                                >
                                                    <Check className="h-3.5 w-3.5 mr-2" />
                                                    Батлах
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })
                )}
            </div>

            {/* Preview Dialog */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-[95vw] h-[85vh] p-0 overflow-hidden flex flex-col rounded-[32px]">
                    <DialogHeader className="p-6 border-b shrink-0">
                        <DialogTitle className="text-lg font-bold truncate">{selectedDoc?.metadata?.templateName}</DialogTitle>
                        <DialogDescription className="text-xs">{selectedDoc?.metadata?.employeeName}</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto bg-slate-100/50 p-4 flex justify-center">
                        <div
                            className="bg-white p-6 shadow-sm w-full min-h-full rounded-2xl preview-content prose prose-slate prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: selectedDoc?.content?.replace(/\n/g, '<br/>') || '' }}
                        />
                    </div>
                    <DialogFooter className="p-4 border-t shrink-0 flex gap-3 sm:justify-start">
                        <Button
                            className="flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-bold"
                            onClick={() => { setIsPreviewOpen(false); setActionType('APPROVE'); setIsActionDialogOpen(true); }}
                        >
                            Батлах
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1 h-12 rounded-2xl border-rose-100 text-rose-600 hover:bg-rose-50 font-bold"
                            onClick={() => { setIsPreviewOpen(false); setActionType('REJECT'); setIsActionDialogOpen(true); }}
                        >
                            Буцаах
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Action Dialog (Approve/Reject with comment) */}
            <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
                <DialogContent className="max-w-[90vw] rounded-[32px] p-8">
                    <DialogHeader className="space-y-4">
                        <div className={cn(
                            "h-16 w-16 rounded-[24px] flex items-center justify-center mx-auto mb-2",
                            actionType === 'APPROVE' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>
                            {actionType === 'APPROVE' ? <CheckCircle2 className="h-8 w-8" /> : <MessageSquare className="h-8 w-8" />}
                        </div>
                        <DialogTitle className="text-2xl font-black text-center tracking-tight">
                            {actionType === 'APPROVE' ? 'Батлах уу?' : 'Буцаах уу?'}
                        </DialogTitle>
                        <DialogDescription className="text-center text-slate-500 font-medium leading-relaxed">
                            {actionType === 'APPROVE'
                                ? 'Та энэ бичиг баримтыг хянаж үзээд зөвшөөрч байгаа бол баталгаажуулна уу.'
                                : 'Засварлах шаардлагатай мэдээллийг доорх коммент хэсэгт бичиж үлдээнэ үү.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-6">
                        <Textarea
                            placeholder={actionType === 'APPROVE' ? "Нэмэлт тайлбар (заавал биш)..." : "Засварлах шалтгаан (заавал)..."}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="min-h-[140px] rounded-2xl bg-slate-50/50 border-slate-100 focus:ring-primary/10 transition-all p-4"
                        />
                    </div>

                    <DialogFooter className="flex flex-col gap-3">
                        <Button
                            className={cn(
                                "w-full h-14 rounded-2xl font-bold text-base shadow-lg transition-all active:scale-[0.98]",
                                actionType === 'APPROVE' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" : "bg-rose-600 hover:bg-rose-700 shadow-rose-200"
                            )}
                            disabled={isProcessing || (actionType === 'REJECT' && !comment)}
                            onClick={handleAction}
                        >
                            {isProcessing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                            {actionType === 'APPROVE' ? 'Батлах' : 'Буцаах'}
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full h-12 rounded-2xl font-bold text-slate-400"
                            onClick={() => { setIsActionDialogOpen(false); setComment(''); }}
                        >
                            Цуцлах
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <style jsx global>{`
                .preview-content h1 { font-size: 1.5rem; font-weight: 800; margin-bottom: 1rem; }
                .preview-content h2 { font-size: 1.25rem; font-weight: 700; margin-top: 1.5rem; }
                .preview-content p { margin-bottom: 0.75rem; line-height: 1.6; }
                .preview-content table { width: 100%; border-collapse: collapse; margin-block: 1rem; }
                .preview-content td, .preview-content th { border: 1px solid #e2e8f0; padding: 0.5rem; }
            `}</style>
        </div>
    );
}
