'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { collection, query, where, getDocs, doc, addDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';
import {
    ArrowLeft,
    Loader2,
    ClipboardCheck,
    CheckCircle2,
    Clock,
    Star,
    ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { InterviewScorecard, ScorecardCriteria } from '../../dashboard/recruitment/components/interview-scorecard';
import type { EvaluationRequest } from '@/types/recruitment';

export default function MobileEvaluationsPage() {
    const router = useRouter();
    const { firestore } = useFirebase();
    const { user } = useEmployeeProfile();
    const { toast } = useToast();

    const [requests, setRequests] = useState<EvaluationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeRequest, setActiveRequest] = useState<EvaluationRequest | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [tab, setTab] = useState<'pending' | 'completed'>('pending');

    useEffect(() => {
        if (!firestore || !user?.uid) {
            setLoading(false);
            return;
        }
        let cancelled = false;

        const loadData = async () => {
            setLoading(true);
            const seen = new Map<string, EvaluationRequest>();

            // 1) Email-ээр хайх (хамгийн найдвартай)
            if (user.email) {
                try {
                    const byEmail = query(
                        collection(firestore, 'evaluation_requests'),
                        where('assignedToEmail', '==', user.email),
                    );
                    const snap = await getDocs(byEmail);
                    snap.docs.forEach(d => seen.set(d.id, { id: d.id, ...d.data() } as EvaluationRequest));
                } catch (_) { /* index may not exist yet */ }
            }

            // 2) Auth UID-аар хайх
            try {
                const byUid = query(
                    collection(firestore, 'evaluation_requests'),
                    where('assignedTo', '==', user.uid),
                );
                const snap = await getDocs(byUid);
                snap.docs.forEach(d => seen.set(d.id, { id: d.id, ...d.data() } as EvaluationRequest));
            } catch (_) { /* ignore */ }

            // 3) Employee doc ID email-ээр олж хайх (хуучин data-д assignedToEmail байхгүй тохиолдолд)
            if (user.email) {
                try {
                    const empQ = query(collection(firestore, 'employees'), where('email', '==', user.email));
                    const empSnap = await getDocs(empQ);
                    const empIds = empSnap.docs.map(d => d.id).filter(id => id !== user.uid);
                    if (empIds.length > 0) {
                        const byEmpId = query(
                            collection(firestore, 'evaluation_requests'),
                            where('assignedTo', 'in', empIds),
                        );
                        const snap = await getDocs(byEmpId);
                        snap.docs.forEach(d => seen.set(d.id, { id: d.id, ...d.data() } as EvaluationRequest));
                    }
                } catch (_) { /* ignore */ }
            }

            if (!cancelled) {
                const items = Array.from(seen.values());
                items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setRequests(items);
                setLoading(false);
            }
        };

        loadData();
        return () => { cancelled = true; };
    }, [firestore, user?.uid, user?.email]);

    const pending = requests.filter(r => r.status === 'pending');
    const completed = requests.filter(r => r.status === 'completed');
    const displayList = tab === 'pending' ? pending : completed;

    const handleScorecardSubmit = async (criteria: ScorecardCriteria[], notes: string) => {
        if (!firestore || !activeRequest || !user) return;
        setSubmitting(true);
        try {
            const averageScore = criteria.reduce((sum, c) => sum + c.score, 0) / (criteria.length || 1);

            const scorecardDoc = await addDoc(collection(firestore, 'scorecards'), {
                applicationId: activeRequest.applicationId,
                candidateId: activeRequest.candidateId,
                interviewerId: user.uid,
                interviewerName: user.displayName || activeRequest.assignedToName,
                stageId: activeRequest.stageId,
                criteria,
                notes,
                averageScore,
                createdAt: new Date().toISOString(),
            });

            await updateDoc(doc(firestore, 'evaluation_requests', activeRequest.id), {
                status: 'completed',
                scorecardId: scorecardDoc.id,
                completedAt: new Date().toISOString(),
            });

            await addDoc(collection(firestore, 'application_events'), {
                applicationId: activeRequest.applicationId,
                type: 'EVALUATION_COMPLETED',
                stageId: activeRequest.stageId,
                userId: user.uid,
                userName: user.displayName || activeRequest.assignedToName,
                title: 'Үнэлгээ бөглөгдлөө',
                description: `${activeRequest.assignedToName} үнэлгээ бөглөв — дундаж: ${averageScore.toFixed(1)}/5`,
                data: { scorecardId: scorecardDoc.id },
                createdAt: new Date().toISOString(),
            });

            toast({ title: 'Үнэлгээ амжилттай илгээгдлээ' });
            setActiveRequest(null);
            // Update local state — mark the request as completed
            setRequests(prev => prev.map(r =>
                r.id === activeRequest.id ? { ...r, status: 'completed' as const, scorecardId: scorecardDoc.id, completedAt: new Date().toISOString() } : r
            ));
        } catch (err: any) {
            toast({ title: 'Алдаа', description: err.message, variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white border-b px-4 py-3 flex items-center gap-3">
                <Button variant="ghost" size="icon" className="shrink-0 -ml-2" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-base font-semibold text-slate-900">Сонгон шалгаруулалт</h1>
                    <p className="text-[11px] text-slate-400">Үнэлгээний хүсэлтүүд</p>
                </div>
                {pending.length > 0 && (
                    <Badge variant="destructive" className="h-6 min-w-[24px] px-2 text-xs">
                        {pending.length}
                    </Badge>
                )}
            </div>

            {/* Tab Switcher */}
            <div className="px-4 pt-3">
                <Tabs value={tab} onValueChange={(v) => setTab(v as 'pending' | 'completed')}>
                    <TabsList className="w-full">
                        <TabsTrigger value="pending" className="flex-1 gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            Хүлээгдэж буй
                            {pending.length > 0 && (
                                <Badge variant="destructive" className="h-4 min-w-[16px] px-1 text-[9px] ml-1">
                                    {pending.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="completed" className="flex-1 gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Бөглөсөн
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Content */}
            <div className="flex-1 px-4 py-3 space-y-3">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        <p className="text-xs text-slate-400">Ачаалж байна...</p>
                    </div>
                ) : displayList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                            <ClipboardCheck className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">
                            {tab === 'pending' ? 'Хүлээгдэж буй үнэлгээ байхгүй' : 'Бөглөсөн үнэлгээ байхгүй'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            {tab === 'pending' ? 'Танд хуваарилагдсан үнэлгээ одоогоор алга байна.' : 'Та одоогоор үнэлгээ бөглөөгүй байна.'}
                        </p>
                    </div>
                ) : (
                    displayList.map(req => (
                        <Card
                            key={req.id}
                            className={cn(
                                "transition-all active:scale-[0.98]",
                                req.status === 'pending' && "border-blue-100 cursor-pointer"
                            )}
                            onClick={() => req.status === 'pending' && setActiveRequest(req)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className={cn(
                                        "h-10 w-10 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                                        req.status === 'pending' ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"
                                    )}>
                                        {req.status === 'pending' ? <Star className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 truncate">{req.candidateName}</p>
                                                <p className="text-[11px] text-slate-400 truncate">{req.vacancyTitle || 'Сул орон тоо'}</p>
                                            </div>
                                            {req.status === 'pending' && (
                                                <ChevronRight className="h-5 w-5 text-slate-300 shrink-0 mt-0.5" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[10px]",
                                                    req.status === 'pending'
                                                        ? "border-blue-200 text-blue-600 bg-blue-50"
                                                        : "border-green-200 text-green-600 bg-green-50"
                                                )}
                                            >
                                                {req.status === 'pending' ? 'Хүлээгдэж буй' : 'Бөглөсөн'}
                                            </Badge>
                                            <span className="text-[10px] text-slate-400">
                                                {req.requestedByName} илгээсэн
                                            </span>
                                            <span className="text-[10px] text-slate-300">
                                                {format(new Date(req.createdAt), 'MM/dd')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {req.status === 'pending' && (
                                    <Button size="sm" className="w-full mt-3 bg-blue-600 hover:bg-blue-700 gap-1.5 h-9">
                                        <Star className="h-3.5 w-3.5" /> Үнэлгээ бөглөх
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Scorecard Dialog */}
            <Dialog open={!!activeRequest} onOpenChange={(open) => { if (!open) setActiveRequest(null); }}>
                <DialogContent className="max-w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-none shadow-2xl">
                    <DialogTitle className="sr-only">Үнэлгээний хуудас</DialogTitle>
                    {activeRequest && (
                        <InterviewScorecard
                            candidateName={activeRequest.candidateName}
                            onSubmit={handleScorecardSubmit}
                            onCancel={() => setActiveRequest(null)}
                            isLoading={submitting}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
