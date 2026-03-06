'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, onSnapshot, orderBy, deleteDoc, writeBatch } from 'firebase/firestore';
import { JobApplication, Vacancy, RecruitmentStage, Candidate, Scorecard, MessageTemplate } from '@/types/recruitment';
import { format } from 'date-fns';
import { mn } from 'date-fns/locale';
import {
    Loader2,
    ArrowLeft,
    Mail,
    Phone,
    MessageSquare,
    Send,
    CheckCircle2,
    Circle,
    Clock,
    FileText,
    User,
    ChevronRight,
    Search,
    Filter,
    MoreHorizontal,
    Star,
    ExternalLink,
    Download,
    Calendar,
    X,
    Trash2,
    AlertTriangle,
    Settings,
    MoreVertical,
    MapPin,
    Briefcase,
    Link2,
    Copy,
    Share2,
    History,
    Zap,
    MessageCircle,
    LayoutDashboard,
    Files,
    Quote,
    Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { VerticalTabMenu } from '@/components/ui/vertical-tab-menu';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { InterviewScorecard, ScorecardCriteria } from '../../components/interview-scorecard';
import { ScheduleInterviewDialog } from '../../components/schedule-interview-dialog';
import { sendSMS } from '@/lib/notifications';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Interview } from '@/types/recruitment';

const DEFAULT_STAGES: RecruitmentStage[] = [
    { id: 'screening', title: 'Анкет шүүлт', type: 'SCREENING', order: 0 },
    { id: 'first-interview', title: 'Анхан шатны ярилцлага', type: 'INTERVIEW', order: 1 },
    { id: 'tech-task', title: 'Даалгавар', type: 'CHALLENGE', order: 2 },
    { id: 'final-interview', title: 'Эцсийн ярилцлага', type: 'INTERVIEW', order: 3 },
    { id: 'offer', title: 'Санал тавих', type: 'OFFER', order: 4 },
];


interface ApplicationEvent {
    id: string;
    applicationId: string;
    type: 'STAGE_CHANGE' | 'NOTE' | 'MESSAGE' | 'SCORECARD' | 'SYSTEM';
    userId: string;
    userName: string;
    title: string;
    description: string;
    data?: any;
    createdAt: string;
}

interface InternalNote {
    id: string;
    applicationId: string;
    authorId: string;
    authorName: string;
    text: string;
    createdAt: string;
}

const getTime = (date: any) => {
    if (!date) return 0;
    if (typeof date === 'string') return new Date(date).getTime();
    if (date.seconds) return date.seconds * 1000;
    return new Date(date).getTime();
};

export default function CandidateDetailPage() {
    const { applicationId } = useParams();
    const router = useRouter();
    const { firestore, user } = useFirebase();
    const { toast } = useToast();

    const [application, setApplication] = useState<JobApplication | null>(null);
    const [candidate, setCandidate] = useState<Candidate | null>(null);
    const [vacancy, setVacancy] = useState<Vacancy | null>(null);
    const [globalStages, setGlobalStages] = useState<RecruitmentStage[]>([]);
    const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([]);
    const [events, setEvents] = useState<ApplicationEvent[]>([]);
    const [activeTab, setActiveTab] = useState('activity');
    const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notes, setNotes] = useState<InternalNote[]>([]);
    const [scorecards, setScorecards] = useState<Scorecard[]>([]);
    const [noteText, setNoteText] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const [sendingNote, setSendingNote] = useState(false);
    const [sendAsSms, setSendAsSms] = useState(false);
    const [submittingScorecard, setSubmittingScorecard] = useState(false);
    const [showScorecard, setShowScorecard] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
    const [previewText, setPreviewText] = useState('');
    const [showPreview, setShowPreview] = useState(false);

    const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
    const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            if (!firestore || !applicationId) return;

            try {
                // 1. Fetch Application
                const appRef = doc(firestore, 'applications', applicationId as string);
                const appSnap = await getDoc(appRef);
                if (!appSnap.exists()) {
                    toast({ title: 'Өргөдөл олдсонгүй', variant: 'destructive' });
                    router.push('/dashboard/recruitment');
                    return;
                }
                const appData = { id: appSnap.id, ...appSnap.data() } as JobApplication;
                setApplication(appData);
                setSelectedStageId(appData.currentStageId);

                // 2. Fetch Candidate
                const candidateSnap = await getDoc(doc(firestore, 'candidates', appData.candidateId));
                if (candidateSnap.exists()) {
                    setCandidate({ id: candidateSnap.id, ...candidateSnap.data() } as Candidate);
                }

                // 3. Fetch Vacancy
                const vacancySnap = await getDoc(doc(firestore, 'vacancies', appData.vacancyId));
                if (vacancySnap.exists()) {
                    setVacancy({ id: vacancySnap.id, ...vacancySnap.data() } as Vacancy);
                }

                // 4. Fetch Global Stages & Templates
                const settingsSnap = await getDoc(doc(firestore, 'recruitment_settings', 'default'));
                if (settingsSnap.exists()) {
                    if (settingsSnap.data().defaultStages) setGlobalStages(settingsSnap.data().defaultStages);
                    if (settingsSnap.data().messageTemplates) setMessageTemplates(settingsSnap.data().messageTemplates);
                }
            } catch (err: any) {
                console.error("Error fetching application details:", err);
                setError(err.message || "Мэдээлэл татахад алдаа гарлаа.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [firestore, applicationId, router, toast]);


    // Subscribe to all application events
    useEffect(() => {
        if (!firestore || !applicationId) return;

        const eventsQuery = query(
            collection(firestore, 'application_events'),
            where('applicationId', '==', applicationId)
        );

        const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
            const evts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ApplicationEvent));
            evts.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
            console.log('📊 Events loaded:', evts);
            setEvents(evts);
        });

        return () => unsubscribe();
    }, [firestore, applicationId]);

    // Subscribe to internal notes
    useEffect(() => {
        if (!firestore || !applicationId) return;

        const notesQuery = query(
            collection(firestore, 'application_notes'),
            where('applicationId', '==', applicationId)
        );

        const unsubscribe = onSnapshot(notesQuery, (snapshot) => {
            const nts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InternalNote));
            nts.sort((a, b) => getTime(a.createdAt) - getTime(b.createdAt));
            setNotes(nts);
        });

        return () => unsubscribe();
    }, [firestore, applicationId]);

    // Subscribe to scorecards
    useEffect(() => {
        if (!firestore || !applicationId) return;

        const scorecardsQuery = query(
            collection(firestore, 'scorecards'),
            where('applicationId', '==', applicationId)
        );

        const unsubscribe = onSnapshot(scorecardsQuery, (snapshot) => {
            const scs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scorecard));
            // Sort by createdAt descending on client-side
            scs.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
            setScorecards(scs);
        }, (err) => {
            console.error("Scorecards subscription error:", err);
            toast({ title: 'Үнэлгээний түүхийг уншихад алдаа гарлаа', description: err.message, variant: 'destructive' });
        });

        return () => unsubscribe();
    }, [firestore, applicationId]);

    const logEvent = async (type: ApplicationEvent['type'], title: string, description: string, extraData?: any) => {
        if (!firestore || !applicationId || !user) return;
        try {
            await addDoc(collection(firestore, 'application_events'), {
                applicationId,
                type,
                userId: user.uid,
                userName: user.displayName || 'Систем',
                title,
                description,
                data: extraData || null,
                createdAt: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error logging event:", error);
        }
    };

    const handleSelectTemplate = (tpl: MessageTemplate) => {
        setSelectedTemplate(tpl);
        // Replace dynamic tags
        const text = tpl.body.replace(/{{name}}/g, candidate?.firstName || 'Нэр');
        setPreviewText(text);
        setShowPreview(true);
    };

    const handleSendMessage = async () => {
        if (!firestore || !candidate || !previewText.trim() || !applicationId) return;

        setSendingMessage(true);
        try {
            if (sendAsSms) {
                // SMS logic here if applicable
                console.log("Sending SMS:", previewText);
            }

            await logEvent('MESSAGE', 'Мессеж илгээсэн', previewText);

            toast({
                title: 'Мессеж амжилттай илгээгдлээ',
                description: sendAsSms ? 'Нэр дэвшигчийн гар утсанд SMS очих болно.' : 'Мессеж түүхэнд хадгалагдлаа.'
            });

            setShowPreview(false);
            setPreviewText('');
        } catch (error) {
            console.error("Error sending message:", error);
            toast({ title: 'Мессеж илгээж чадсангүй', variant: 'destructive' });
        } finally {
            setSendingMessage(false);
        }
    };

    const handleSendNote = async () => {
        if (!firestore || !user || !noteText.trim() || !applicationId) return;

        setSendingNote(true);
        try {
            await addDoc(collection(firestore, 'application_notes'), {
                applicationId,
                authorId: user.uid,
                authorName: user.displayName || 'Коллагатор',
                text: noteText,
                createdAt: new Date().toISOString()
            });

            await logEvent('NOTE', 'Дотоод тэмдэглэл нэмсэн', noteText);
            setNoteText('');
        } catch (error) {
            console.error("Error sending note:", error);
            toast({ title: 'Тэмдэглэл хадгалж чадсангүй', variant: 'destructive' });
        } finally {
            setSendingNote(false);
        }
    };

    const handleAddTag = async () => {
        if (!firestore || !candidate || !tagInput.trim()) return;

        const newTag = tagInput.trim();
        if ((candidate.tags || []).includes(newTag)) {
            toast({ title: 'Энэ таг аль хэдийн нэмэгдсэн байна', variant: 'destructive' });
            return;
        }

        const updatedTags = [...(candidate.tags || []), newTag];
        try {
            await updateDoc(doc(firestore, 'candidates', candidate.id), {
                tags: updatedTags,
                updatedAt: new Date().toISOString()
            });
            setCandidate({ ...candidate, tags: updatedTags });
            await logEvent('SYSTEM', 'Таг нэмсэн', `Шинэ таг: ${newTag}`);
            setTagInput('');
        } catch (error) {
            console.error("Error adding tag:", error);
            toast({ title: 'Таг нэмж чадсангүй', variant: 'destructive' });
        }
    };

    const handleRemoveTag = async (tagToRemove: string) => {
        if (!firestore || !candidate) return;

        const updatedTags = (candidate.tags || []).filter(t => t !== tagToRemove);
        try {
            await updateDoc(doc(firestore, 'candidates', candidate.id), {
                tags: updatedTags,
                updatedAt: new Date().toISOString()
            });
            setCandidate({ ...candidate, tags: updatedTags });
            await logEvent('SYSTEM', 'Таг устгасан', `Устгасан таг: ${tagToRemove}`);
        } catch (error) {
            console.error("Error removing tag:", error);
            toast({ title: 'Таг устгаж чадсангүй', variant: 'destructive' });
        }
    };

    const handleUpdateStage = async (stageId: string) => {
        if (!firestore || !applicationId) return;

        try {
            await updateDoc(doc(firestore, 'applications', applicationId as string), {
                currentStageId: stageId,
                updatedAt: new Date().toISOString()
            });
            setApplication(prev => prev ? { ...prev, currentStageId: stageId } : null);
            setSelectedStageId(stageId);

            const stageTitle = globalStages.find(s => s.id === stageId)?.title || stageId;
            await logEvent('STAGE_CHANGE', 'Үе шат өөрчлөгдсөн', `Шинэ төлөв: ${stageTitle}`, { toStageId: stageId });

            toast({ title: 'Үе шат шинэчлэгдлээ' });
        } catch (error) {
            console.error("Error updating stage:", error);
            toast({ title: 'Шинэчилж чадсангүй', variant: 'destructive' });
        }
    };

    const handleStatusUpdate = async (newStatus: JobApplication['status']) => {
        if (!firestore || !applicationId) return;

        try {
            await updateDoc(doc(firestore, 'applications', applicationId as string), {
                status: newStatus,
                updatedAt: new Date().toISOString()
            });
            setApplication(prev => prev ? { ...prev, status: newStatus } : null);

            const statusLabels: Record<string, string> = {
                'REJECTED': 'Татгалзсан',
                'HIRED': 'Ажилд авсан',
                'WITHDRAWN': 'Нэрээ татсан',
                'ACTIVE': 'Идэвхтэй'
            };

            await logEvent('SYSTEM', 'Төлөв өөрчлөгдсөн', `Шинэ төлөв: ${statusLabels[newStatus] || newStatus}`);
            toast({ title: `Төлөв амжилттай шинэчлэгдлээ: ${statusLabels[newStatus]}` });
        } catch (error) {
            console.error("Error updating status:", error);
            toast({ title: 'Алдаа гарлаа', variant: 'destructive' });
        }
    };

    const handleScorecardSubmit = async (scores: ScorecardCriteria[], notesContent: string) => {
        if (!firestore || !application || !candidate) {
            toast({ title: 'Мэдээлэл дутуу байна', variant: 'destructive' });
            return;
        }

        setSubmittingScorecard(true);
        try {
            const averageScore = scores.reduce((acc, curr) => acc + curr.score, 0) / scores.length;

            // Map to clean ScorecardCriteria to avoid undefined fields
            const cleanCriteria = scores.map(c => ({
                id: c.id,
                name: c.name,
                description: c.description || '',
                score: c.score
            }));

            await addDoc(collection(firestore, 'scorecards'), {
                applicationId: application.id,
                candidateId: candidate.id,
                stageId: application.currentStageId,
                interviewerId: user?.uid || 'unknown',
                interviewerName: user?.displayName || 'Үнэлгээчин',
                criteria: cleanCriteria,
                notes: notesContent,
                averageScore,
                createdAt: new Date().toISOString()
            });

            await logEvent('SCORECARD', 'Үнэлгээ өгсөн', `Дундаж оноо: ${averageScore.toFixed(1)}`, { averageScore, stageId: application.currentStageId });

            toast({ title: 'Үнэлгээ амжилттай хадгалагдлаа' });
            setShowScorecard(false);
        } catch (error: any) {
            console.error("Error saving scorecard:", error);
            toast({
                title: 'Үнэлгээг хадгалж чадсангүй',
                description: error.message || 'Firestore error',
                variant: 'destructive'
            });
        } finally {
            setSubmittingScorecard(false);
        }
    };

    const handleDeleteApplication = async () => {
        if (!firestore || !applicationId) return;

        setIsDeleting(true);
        try {
            const batch = writeBatch(firestore);

            // 1. Delete all related sub-data
            const collectionsToDelete = ['application_messages', 'application_events', 'application_notes', 'scorecards', 'interviews'];

            for (const collName of collectionsToDelete) {
                const q = query(collection(firestore, collName), where('applicationId', '==', applicationId));
                const snapshot = await getDocs(q);
                snapshot.forEach((d) => {
                    batch.delete(d.ref);
                });
            }

            // 2. Delete the candidate profile
            if (application?.candidateId) {
                batch.delete(doc(firestore, 'candidates', application.candidateId));
            }

            // 3. Delete the application itself
            batch.delete(doc(firestore, 'applications', applicationId as string));

            await batch.commit();

            toast({
                title: 'Нэр дэвшигч устгагдлаа',
                description: 'Ажил горилогчийн мэдээлэл болон үйл ажиллагааны түүхийг бүрэн устгалаа.'
            });

            router.push('/dashboard/recruitment');
        } catch (error) {
            console.error("Error deleting application:", error);
            toast({
                title: 'Устгаж чадсангүй',
                variant: 'destructive'
            });
            setIsDeleting(false);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

    if (error) {
        return (
            <div className="flex flex-col h-screen items-center justify-center bg-slate-50 p-6 text-center">
                <div className="bg-white p-8 rounded-2xl shadow-sm border max-w-md">
                    <div className="bg-red-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="h-8 w-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Алдаа гарлаа</h2>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <Button onClick={() => window.location.reload()} className="w-full bg-blue-600">
                        Дахин ачаалах
                    </Button>
                </div>
            </div>
        );
    }

    if (!application || !candidate) return <div className="p-8 text-center">Мэдээлэл олдсонгүй</div>;

    const currentStage = globalStages.find(s => s.id === application.currentStageId);

    return (
        <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans text-slate-900">
            {/* Main Content Layout */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

                {/* Modern Glassmorphism Header */}
                <header className="h-20 border-b bg-white/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-30 transition-all">
                    <div className="flex items-center gap-6">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.back()}
                                className="h-10 w-10 rounded-full hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all"
                            >
                                <ArrowLeft className="h-5 w-5 text-slate-600" />
                            </Button>
                        </motion.div>

                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <Avatar className="h-12 w-12 border-2 border-white shadow-lg">
                                    <AvatarImage src={candidate.resumeUrl} />
                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold">
                                        {candidate.firstName?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className={cn(
                                    "absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white shadow-sm",
                                    application.status === 'HIRED' ? "bg-emerald-500" :
                                        application.status === 'REJECTED' ? "bg-red-500" : "bg-blue-500"
                                )} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl font-bold tracking-tight text-slate-900">
                                        {candidate!.lastName} {candidate!.firstName}
                                    </h1>
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                        ID: {application!.id.slice(-6)}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                                        <Briefcase className="h-3.5 w-3.5" />
                                        {vacancy?.title || 'Unknown Role'}
                                    </span>
                                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                                    <span className="text-sm font-medium text-blue-600 flex items-center gap-1.5">
                                        {currentStage?.title}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Sidebar Toggles */}
                        <div className="flex items-center bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50 mr-2 shadow-inner">
                            <Button
                                variant={leftSidebarOpen ? "secondary" : "ghost"}
                                size="icon"
                                className={cn(
                                    "h-9 w-9 rounded-xl transition-all",
                                    leftSidebarOpen && "bg-white shadow-sm text-blue-600"
                                )}
                                onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                            >
                                <LayoutDashboard className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={rightSidebarOpen ? "secondary" : "ghost"}
                                size="icon"
                                className={cn(
                                    "h-9 w-9 rounded-xl transition-all",
                                    rightSidebarOpen && "bg-white shadow-sm text-blue-600"
                                )}
                                onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
                            >
                                <User className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-3">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button className="bg-slate-900 hover:bg-slate-800 text-white gap-2 h-11 px-6 rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-95">
                                        <Zap className="h-4 w-4 fill-amber-400 text-amber-400" />
                                        Шуурхай үйлдэл
                                        <ChevronRight className="h-4 w-4 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl border-none shadow-2xl ring-1 ring-slate-200">
                                    <DropdownMenuLabel className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Нэр дэвшигчийн удирдлага</DropdownMenuLabel>
                                    <DropdownMenuSeparator className="my-1 bg-slate-100" />
                                    <DropdownMenuItem onClick={() => {
                                        setShowScorecard(true);
                                        setActiveTab('evaluation');
                                    }} className="gap-3 p-3 rounded-xl cursor-pointer focus:bg-slate-50">
                                        <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                                            <Star className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">Үнэлгээ өгөх</p>
                                            <p className="text-[10px] text-slate-500">Ур чадварын үнэлгээ хийх</p>
                                        </div>
                                    </DropdownMenuItem>

                                    <ScheduleInterviewDialog
                                        applicationId={application.id}
                                        candidate={candidate}
                                        vacancy={vacancy || undefined}
                                        onScheduled={(interview) => {
                                            logEvent('SYSTEM', 'Ярилцлага товлосон', `${interview.title}: ${format(new Date(interview.startTime), 'yyyy.MM.dd HH:mm')}`, { interviewId: interview.id });
                                        }}
                                    >
                                        <DropdownMenuItem className="gap-3 p-3 rounded-xl cursor-pointer focus:bg-slate-50" onSelect={(e) => e.preventDefault()}>
                                            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                <Calendar className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold">Ярилцлага товлох</p>
                                                <p className="text-[10px] text-slate-500">Уулзалт төлөвлөх</p>
                                            </div>
                                        </DropdownMenuItem>
                                    </ScheduleInterviewDialog>

                                    <DropdownMenuSeparator className="my-1 bg-slate-100" />
                                    <DropdownMenuItem
                                        onClick={() => handleStatusUpdate('HIRED')}
                                        className="gap-3 p-3 rounded-xl cursor-pointer focus:bg-emerald-50 text-emerald-600"
                                    >
                                        <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                            <CheckCircle2 className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">Ажилд авах</p>
                                            <p className="text-[10px] text-emerald-500/70">Шалгаруулалтыг батлах</p>
                                        </div>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => handleStatusUpdate('REJECTED')}
                                        className="gap-3 p-3 rounded-xl cursor-pointer focus:bg-red-50 text-red-600"
                                    >
                                        <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center">
                                            <X className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">Татгалзах</p>
                                            <p className="text-[10px] text-red-500/70">Боломжгүй гэж үзэх</p>
                                        </div>
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator className="my-1 bg-slate-100" />
                                    <DropdownMenuItem
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="gap-3 p-3 rounded-xl cursor-pointer focus:bg-red-600 focus:text-white text-red-600 hover:text-white transition-colors"
                                    >
                                        <div className="h-8 w-8 rounded-lg bg-red-50 group-focus:bg-red-500 flex items-center justify-center">
                                            <Trash2 className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">Системээс устгах</p>
                                            <p className="text-[10px] opacity-70">Бүх мэдээлэл устана</p>
                                        </div>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </header>

                <div className="flex flex-1 min-h-0 overflow-hidden">
                    {/* Left Sidebar: Timeline Visualizer */}
                    <aside className={cn(
                        "bg-white flex flex-col overflow-hidden transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)",
                        leftSidebarOpen ? "w-80 border-r" : "w-0 opacity-0"
                    )}>
                        <div className="p-6 border-b bg-slate-50/50">
                            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Сонгон шалгаруулалт</h2>
                            <p className="text-sm font-bold text-slate-700">Явцын түүх</p>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-6 space-y-2">
                                {globalStages.map((stage, index) => {
                                    const isCurrent = application.currentStageId === stage.id;
                                    const isPast = globalStages.findIndex(s => s.id === application.currentStageId) > index;

                                    return (
                                        <motion.div
                                            key={stage.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className={cn(
                                                "relative p-4 rounded-2xl cursor-pointer transition-all flex items-start gap-4 group",
                                                selectedStageId === stage.id ? "bg-blue-50/80 shadow-sm border border-blue-100/50" : "hover:bg-slate-50 border border-transparent"
                                            )}
                                            onClick={() => setSelectedStageId(stage.id)}
                                        >
                                            <div className="relative mt-0.5">
                                                {isPast ? (
                                                    <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center">
                                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                    </div>
                                                ) : isCurrent ? (
                                                    <div className="h-6 w-6 rounded-full border-2 border-blue-600 flex items-center justify-center bg-white shadow-[0_0_0_4px_rgba(37,99,235,0.1)]">
                                                        <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                                                    </div>
                                                ) : (
                                                    <div className="h-6 w-6 rounded-full border-2 border-slate-200 bg-white group-hover:border-slate-300 transition-colors" />
                                                )}
                                                {index < globalStages.length - 1 && (
                                                    <div className={cn(
                                                        "absolute left-3 top-8 w-[1px] h-10 -translate-x-1/2",
                                                        isPast ? "bg-emerald-300" : "bg-slate-100"
                                                    )} />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={cn(
                                                    "text-sm font-bold transition-colors truncate",
                                                    isCurrent ? "text-blue-700" : isPast ? "text-emerald-700" : "text-slate-500"
                                                )}>
                                                    {stage.title}
                                                </p>
                                                {isCurrent && (
                                                    <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[9px] font-bold uppercase tracking-wider">
                                                        Одоогийн шат
                                                    </span>
                                                )}
                                            </div>
                                            {selectedStageId === stage.id && (
                                                <motion.div layoutId="active-indicator">
                                                    <ChevronRight className="h-4 w-4 text-blue-400 mt-0.5" />
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                        <div className="p-6 bg-slate-50/80 border-t">
                            <Button
                                className="w-full h-11 bg-white border border-blue-100 text-blue-600 font-bold rounded-xl shadow-sm hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all gap-2"
                                onClick={() => {
                                    const currentIndex = globalStages.findIndex(s => s.id === application.currentStageId);
                                    if (currentIndex < globalStages.length - 1) {
                                        handleUpdateStage(globalStages[currentIndex + 1].id);
                                    }
                                }}
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                Дараагийн шат
                            </Button>
                        </div>
                    </aside>

                    {/* Center: Stage Details & High-Interaction Zone */}
                    <main className="flex-1 flex flex-col min-h-0 bg-white relative">
                        <AnimatePresence mode="wait">
                            {selectedStageId ? (
                                <motion.div
                                    key={selectedStageId}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex-1 flex flex-col min-h-0"
                                >
                                    <div className="p-8 border-b flex items-center justify-between bg-gradient-to-r from-white to-slate-50/50">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                                                    {globalStages.find(s => s.id === selectedStageId)?.title}
                                                </h2>
                                                <Badge className="bg-blue-50 text-blue-600 border-blue-100 font-bold uppercase tracking-widest text-[10px]">Active Stage</Badge>
                                            </div>
                                            <p className="text-sm text-slate-500 mt-1 font-medium italic">Энэ шатанд хийгдсэн бүх үйл ажиллагаа, тэмдэглэл болон үнэлгээнүүд</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <ScheduleInterviewDialog
                                                applicationId={application!.id}
                                                candidate={candidate!}
                                                vacancy={vacancy || undefined}
                                                onScheduled={(interview) => {
                                                    logEvent('SYSTEM', 'Ярилцлага товлосон', `${interview.title}: ${format(new Date(interview.startTime), 'yyyy.MM.dd HH:mm')}`, { interviewId: interview.id });
                                                }}
                                            >
                                                <Button variant="outline" className="h-10 px-5 rounded-xl border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition-all font-bold gap-2 group">
                                                    <Calendar className="h-4 w-4 text-slate-400 group-hover:text-blue-500" />
                                                    Ярилцлага товлох
                                                </Button>
                                            </ScheduleInterviewDialog>
                                            <Button
                                                onClick={() => { setShowScorecard(true); setActiveTab('evaluation'); }}
                                                className="h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 gap-2"
                                            >
                                                <Star className="h-4 w-4" />
                                                Хурдан үнэлэх
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col min-h-0 bg-[#F8FAFC]/30">
                                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                                            <div className="px-8 border-b bg-white/50 backdrop-blur-sm">
                                                <VerticalTabMenu
                                                    orientation="horizontal"
                                                    className="py-3"
                                                    items={[
                                                        { value: 'activity', label: 'Үйл ажиллагаа' },
                                                        { value: 'messages', label: 'Харилцаа холбоо' },
                                                        { value: 'notes', label: 'Багийн тэмдэглэл' },
                                                        { value: 'evaluation', label: 'Үнэлгээний түүх' },
                                                    ]}
                                                />
                                            </div>

                                            <TabsContent value="activity" className="flex-1 flex flex-col min-h-0 m-0 pt-6 outline-none overflow-hidden">
                                                <ScrollArea className="flex-1 w-full min-h-0">
                                                    <div className="px-12 pb-12 w-full">
                                                        {events.length === 0 ? (
                                                            <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                                                                <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                                                                    <History className="h-10 w-10 opacity-20" />
                                                                </div>
                                                                <p className="font-bold">Одоогоор үйл ажиллагаа бүртгэгдээгүй байна</p>
                                                                <p className="text-xs mt-1">Шинэ үйлдэл хийхэд энд автоматаар бүртгэгдэнэ</p>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {/* TEST: Энэ текст харагдах ёстой */}
                                                                <div className="mb-8 p-6 bg-yellow-100 border-4 border-yellow-500 rounded-xl">
                                                                    <h2 className="text-2xl font-black text-yellow-900">ТЕСТ: Энэ текст харагдаж байна уу?</h2>
                                                                    <p className="text-lg font-bold text-yellow-800 mt-2">Events тоо: {events.length}</p>
                                                                </div>
                                                                <div className="relative before:absolute before:inset-y-0 before:left-5 before:w-[2px] before:bg-slate-100 pb-8 space-y-12">
                                                                    {events.map((evt, idx) => {
                                                                        const Icon = evt.type === 'STAGE_CHANGE' ? CheckCircle2
                                                                            : evt.type === 'MESSAGE' ? MessageSquare
                                                                                : evt.type === 'SCORECARD' ? Star
                                                                                    : Clock;
                                                                        return (
                                                                            <motion.div
                                                                                key={evt.id}
                                                                                initial={{ opacity: 1, x: 0 }}
                                                                                animate={{ opacity: 1, x: 0 }}
                                                                                transition={{ duration: 0.2 }}
                                                                                className="relative pl-14"
                                                                            >
                                                                                <div className={cn(
                                                                                    "absolute left-0 top-0 h-10 w-10 rounded-2xl border bg-white flex items-center justify-center z-10 shadow-sm transition-all group-hover:scale-110",
                                                                                    evt.type === 'STAGE_CHANGE' ? "text-emerald-500 border-emerald-100" :
                                                                                        evt.type === 'MESSAGE' ? "text-blue-500 border-blue-100" :
                                                                                            evt.type === 'SCORECARD' ? "text-amber-500 border-amber-100" :
                                                                                                "text-slate-400 border-slate-100"
                                                                                )}>
                                                                                    <Icon className="h-5 w-5" />
                                                                                </div>
                                                                                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group min-w-0">
                                                                                    <div className="flex items-start justify-between mb-3 gap-4">
                                                                                        <div className="min-w-0 flex-1">
                                                                                            <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                                                                                                {evt.title || 'Тодорхойгүй үйлдэл'}
                                                                                            </h4>
                                                                                            <div className="flex items-center gap-2 mt-1">
                                                                                                <Avatar className="h-5 w-5 border border-slate-100">
                                                                                                    <AvatarFallback className="text-[8px] font-black bg-blue-50 text-blue-600">
                                                                                                        {(evt.userName || 'S').charAt(0)}
                                                                                                    </AvatarFallback>
                                                                                                </Avatar>
                                                                                                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight">
                                                                                                    {evt.userName || 'Систем'}
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>
                                                                                        <span className="shrink-0 text-[10px] font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                                                                                            {evt.createdAt ? format(new Date(evt.createdAt), 'yyyy.MM.dd HH:mm') : '-'}
                                                                                        </span>
                                                                                    </div>
                                                                                    {evt.description && (
                                                                                        <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                                                                            {evt.description}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            </motion.div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </ScrollArea>
                                            </TabsContent>

                                            <TabsContent value="messages" className="flex-1 flex flex-col min-h-0 m-0 outline-none overflow-hidden">
                                                {messageTemplates.length === 0 ? (
                                                    <div className="flex-1 flex flex-col items-center justify-center p-12">
                                                        <div className="max-w-md w-full text-center p-16 bg-white rounded-[3rem] border border-dashed border-slate-200 shadow-2xl animate-in fade-in zoom-in duration-700">
                                                            <div className="h-28 w-28 rounded-3xl bg-blue-50 flex items-center justify-center mx-auto mb-10 shadow-inner">
                                                                <Mail className="h-14 w-14 text-blue-500/50" />
                                                            </div>
                                                            <h3 className="text-2xl font-black text-slate-900 mb-4 uppercase tracking-tighter">Загвар байхгүй</h3>
                                                            <p className="text-sm text-slate-500 mb-10 leading-relaxed font-medium">
                                                                Та нэр дэвшигчид рүү илгээх бэлэн мессежний загваруудыг тохиргоо хэсэгт нэмнэ үү.
                                                            </p>
                                                            <Button
                                                                variant="outline"
                                                                className="rounded-2xl px-12 border-slate-200 hover:border-blue-600 hover:text-blue-600 gap-3 h-14 transition-all font-black bg-white shadow-xl shadow-slate-200"
                                                                onClick={() => router.push('/dashboard/recruitment?tab=settings')}
                                                            >
                                                                <Settings className="h-5 w-5" />
                                                                ТОХИРГОО РУУ ОЧИХ
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <ScrollArea className="flex-1">
                                                        <div className="p-10">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                                                {messageTemplates.map((tpl) => (
                                                                    <motion.div key={tpl.id} whileHover={{ y: -5 }} className="group">
                                                                        <Card
                                                                            className="relative overflow-hidden border-slate-200/60 shadow-none hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-400 transition-all cursor-pointer bg-white rounded-[2rem] border-b-8 border-b-transparent hover:border-b-blue-600/20"
                                                                            onClick={() => handleSelectTemplate(tpl)}
                                                                        >
                                                                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/20 group-hover:bg-blue-50/30 transition-colors">
                                                                                <div className="flex items-center gap-4">
                                                                                    <div className="h-12 w-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 shadow-sm transition-all duration-500">
                                                                                        <Mail className="h-6 w-6 text-blue-600 transition-colors group-hover:text-white" />
                                                                                    </div>
                                                                                    <h4 className="text-base font-black text-slate-900 line-clamp-1 uppercase tracking-tighter">{tpl.title}</h4>
                                                                                </div>
                                                                            </div>
                                                                            <CardContent className="p-6">
                                                                                <div className="text-sm text-slate-600 line-clamp-5 leading-relaxed whitespace-pre-wrap min-h-[6rem] font-medium">
                                                                                    {tpl.body.replace(/{{name}}/g, candidate?.firstName || 'Нэр')}
                                                                                </div>
                                                                                <div className="mt-8 pt-5 border-t border-slate-50 flex items-center justify-between">
                                                                                    <Badge variant="secondary" className="bg-slate-100 text-slate-400 text-[9px] hover:bg-slate-200 border-none font-black uppercase tracking-widest px-3 py-1">
                                                                                        MESSAGE TEMPLATE
                                                                                    </Badge>
                                                                                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                                                                        <Send className="h-4 w-4" />
                                                                                    </div>
                                                                                </div>
                                                                            </CardContent>
                                                                        </Card>
                                                                    </motion.div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </ScrollArea>
                                                )}
                                            </TabsContent>

                                            <TabsContent value="notes" className="flex-1 flex flex-col min-h-0 m-0 bg-amber-50/20 outline-none overflow-hidden">
                                                <ScrollArea className="flex-1 min-h-0">
                                                    <div className="p-10 space-y-6">
                                                        {notes.length === 0 ? (
                                                            <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                                                                <div className="h-20 w-20 rounded-full bg-amber-50 flex items-center justify-center mb-6">
                                                                    <FileText className="h-10 w-10 text-amber-500/30" />
                                                                </div>
                                                                <p className="font-bold">Дотоод тэмдэглэл байхгүй</p>
                                                                <p className="text-xs mt-1">Зөвхөн ажилтнуудад харагдах тэмдэглэл үлдээгээрэй</p>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                {notes.map((note) => (
                                                                    <motion.div
                                                                        key={note.id}
                                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                                        animate={{ opacity: 1, scale: 1 }}
                                                                        className="p-6 bg-white border border-amber-100 rounded-[2rem] shadow-sm relative group hover:shadow-xl hover:shadow-amber-500/5 transition-all"
                                                                    >
                                                                        <div className="flex items-center justify-between mb-4">
                                                                            <div className="flex items-center gap-3">
                                                                                <Avatar className="h-9 w-9 border-2 border-amber-50">
                                                                                    <AvatarFallback className="text-xs font-black bg-amber-100 text-amber-700">{note.authorName.charAt(0)}</AvatarFallback>
                                                                                </Avatar>
                                                                                <div>
                                                                                    <p className="text-sm font-black text-slate-900 leading-none">{note.authorName}</p>
                                                                                    <p className="text-[10px] text-amber-600 font-bold uppercase mt-1">Colleague</p>
                                                                                </div>
                                                                            </div>
                                                                            <span className="text-[10px] font-bold text-slate-400">{format(new Date(note.createdAt), 'yyyy.MM.dd HH:mm')}</span>
                                                                        </div>
                                                                        <p className="text-sm text-slate-700 leading-relaxed italic font-medium">"{note.text}"</p>
                                                                    </motion.div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </ScrollArea>

                                                <div className="p-8 border-t bg-white shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
                                                    <div className="relative group max-w-4xl mx-auto">
                                                        <Textarea
                                                            placeholder="Нэр дэвшигчийн талаар тэмдэглэл үлдээх..."
                                                            className="min-h-[120px] rounded-[1.5rem] border-slate-200 bg-slate-50/50 p-6 text-sm resize-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all placeholder:font-medium font-medium"
                                                            value={noteText}
                                                            onChange={(e) => setNoteText(e.target.value)}
                                                        />
                                                        <div className="absolute bottom-4 right-4 flex items-center gap-3">
                                                            <Button
                                                                className="h-10 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold gap-2 shadow-lg shadow-amber-100 transition-all active:scale-95"
                                                                disabled={!noteText.trim() || sendingNote}
                                                                onClick={handleSendNote}
                                                            >
                                                                {sendingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                                                                Тэмдэглэл хадгалах
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="evaluation" className="flex-1 flex flex-col min-h-0 m-0 bg-white outline-none overflow-hidden">
                                                <ScrollArea className="flex-1 min-h-0">
                                                    <div className="p-10 max-w-5xl mx-auto w-full">
                                                        <div className="flex items-center justify-between mb-10">
                                                            <div>
                                                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Үнэлгээний түүх</h3>
                                                                <p className="text-sm text-slate-500 font-medium font-serif mt-1">Нийт {scorecards.length} хүн үнэлгээ өгсөн байна</p>
                                                            </div>
                                                            <Button
                                                                onClick={() => setShowScorecard(true)}
                                                                className="h-12 px-8 rounded-2xl bg-slate-900 border-none hover:bg-blue-600 font-black tracking-widest text-[11px] shadow-2xl transition-all active:scale-95 gap-2 uppercase"
                                                            >
                                                                <Star className="h-4 w-4" />
                                                                Үнэлгээ нэмэх
                                                            </Button>
                                                        </div>

                                                        {scorecards.length === 0 ? (
                                                            <div className="text-center py-32 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100">
                                                                <Star className="h-16 w-16 mx-auto mb-6 text-slate-200" />
                                                                <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Одоогоор үнэлгээ хийгдээгүй</p>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-10">
                                                                {scorecards.map((sc, idx) => (
                                                                    <motion.div
                                                                        key={sc.id}
                                                                        initial={{ opacity: 0, y: 20 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        transition={{ delay: idx * 0.1 }}
                                                                    >
                                                                        <Card className="overflow-hidden border-slate-200/60 shadow-xl shadow-slate-200/40 rounded-[2.5rem] hover:border-blue-300 transition-all hover:shadow-2xl">
                                                                            <div className="p-8 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                                                                                <div className="flex items-center gap-5">
                                                                                    <Avatar className="h-14 w-14 border-4 border-white shadow-md">
                                                                                        <AvatarFallback className="text-xl font-black bg-blue-600 text-white">{sc.interviewerName?.charAt(0)}</AvatarFallback>
                                                                                    </Avatar>
                                                                                    <div>
                                                                                        <p className="text-lg font-black text-slate-900 tracking-tighter uppercase">{sc.interviewerName}</p>
                                                                                        <div className="flex items-center gap-3 mt-1 text-[11px] font-black text-blue-600 uppercase tracking-widest">
                                                                                            <span>{globalStages.find(s => s.id === sc.stageId)?.title || 'Undefined Phase'}</span>
                                                                                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                                                                                            <span className="text-slate-400">{format(new Date(sc.createdAt), 'yyyy.MM.dd')}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex flex-col items-center justify-center h-20 w-20 bg-white rounded-3xl border-2 border-amber-100 shadow-inner">
                                                                                    <span className="text-2xl font-black text-slate-900 leading-none">{sc.averageScore.toFixed(1)}</span>
                                                                                    <div className="flex gap-0.5 mt-1">
                                                                                        {[1, 2, 3].map(s => <Star key={s} className="h-2 w-2 fill-amber-400 text-amber-400" />)}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <CardContent className="p-10">
                                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-10">
                                                                                    {sc.criteria.map((c: any) => (
                                                                                        <div key={c.id} className="space-y-3">
                                                                                            <div className="flex justify-between items-center px-1">
                                                                                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{c.name || c.label}</span>
                                                                                                <span className="text-xs font-black text-slate-900">{c.score}/5</span>
                                                                                            </div>
                                                                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                                                <div
                                                                                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000"
                                                                                                    style={{ width: `${(c.score / 5) * 100}%` }}
                                                                                                />
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                                {sc.notes && (
                                                                                    <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 relative overflow-hidden group">
                                                                                        <div className="absolute top-0 left-0 bottom-0 w-2 bg-blue-600/30 group-hover:bg-blue-600 transition-colors" />
                                                                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Overall Impression</h5>
                                                                                        <p className="text-base text-slate-800 leading-relaxed font-medium italic">"{sc.notes}"</p>
                                                                                    </div>
                                                                                )}
                                                                            </CardContent>
                                                                        </Card>
                                                                    </motion.div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </ScrollArea>
                                            </TabsContent>
                                        </Tabs>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4">
                                    <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center">
                                        <Clock className="h-12 w-12 opacity-20" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-black uppercase tracking-widest text-sm">Шат сонгоно уу</p>
                                        <p className="text-xs mt-1">Зүүн талын цэснээс үзэх шатаа сонгоно уу</p>
                                    </div>
                                </div>
                            )}
                        </AnimatePresence>
                    </main>

                    {/* Right Sidebar: Deep Insights & Files */}
                    <aside className={cn(
                        "bg-[#FBFCFE] border-l flex flex-col overflow-hidden transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1)",
                        rightSidebarOpen ? "w-[380px]" : "w-0 opacity-0 border-l-0"
                    )}>
                        <ScrollArea className="flex-1">
                            <div className="p-8 space-y-10">
                                <section>
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Candidate Profile</h3>
                                    <div className="space-y-5">
                                        {[
                                            { icon: Mail, label: 'Email Address', value: candidate!.email, color: 'text-blue-500', bg: 'bg-blue-50' },
                                            { icon: Phone, label: 'Mobile Phone', value: candidate!.phone, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                                            { icon: Calendar, label: 'Applied Date', value: application!.appliedAt ? format(new Date(application!.appliedAt), 'yyyy.MM.dd') : 'Recently', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                                            { icon: ExternalLink, label: 'Referral Source', value: candidate!.source || 'Direct Application', color: 'text-amber-500', bg: 'bg-amber-50' }
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-4 group cursor-default">
                                                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", item.bg, item.color)}>
                                                    <item.icon className="h-5 w-5" />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{item.label}</p>
                                                    <p className="text-sm font-bold text-slate-900 truncate leading-tight mt-0.5">{item.value}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <Separator className="bg-slate-100" />

                                <section>
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Keywords & Tags</h3>
                                        <Badge className="bg-slate-100 text-slate-500 text-[10px] font-black border-none">{(candidate!.tags || []).length}</Badge>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {candidate!.tags && candidate!.tags.length > 0 ? (
                                            candidate!.tags.map((tag, idx) => (
                                                <Badge
                                                    key={`${tag}-${idx}`}
                                                    variant="secondary"
                                                    className="bg-white border border-slate-100 text-slate-600 gap-2 pr-2 py-1.5 text-xs font-bold transition-all hover:border-blue-200 hover:text-blue-600 group rounded-xl shadow-sm"
                                                >
                                                    <div className="h-2 w-2 rounded-full bg-blue-400" />
                                                    {tag}
                                                    <button
                                                        onClick={() => handleRemoveTag(tag)}
                                                        className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all ml-1"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </Badge>
                                            ))
                                        ) : (
                                            <div className="text-center py-6 w-full bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                                <p className="text-xs text-slate-400 font-bold italic">No tags associated</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            placeholder="Add custom tag..."
                                            className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-xs font-bold focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none placeholder:text-slate-300 transition-all shadow-sm"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleAddTag();
                                            }}
                                        />
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="absolute right-2 top-1.5 h-8 px-3 text-[10px] font-black text-blue-600 hover:bg-blue-50 uppercase tracking-widest"
                                            onClick={handleAddTag}
                                        >
                                            Add
                                        </Button>
                                    </div>
                                </section>

                                <Separator className="bg-slate-100" />

                                <section>
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Files & Documents</h3>
                                    <div className="space-y-4">
                                        {candidate!.resumeUrl ? (
                                            <motion.div
                                                whileHover={{ x: 5 }}
                                                className="p-4 bg-white border border-slate-100 rounded-[1.5rem] flex items-center justify-between group shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all"
                                            >
                                                <div className="flex items-center gap-4 overflow-hidden">
                                                    <div className="h-12 w-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center shrink-0 border border-red-50 shadow-inner">
                                                        <FileText className="h-6 w-6" />
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="text-sm font-black text-slate-900 truncate">Curriculum Vitae</p>
                                                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">PDF DOCUMENT • 2.4 MB</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-blue-50 hover:text-blue-600" asChild>
                                                        <a href={candidate!.resumeUrl} target="_blank"><ExternalLink className="h-4 w-4" /></a>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-blue-50 hover:text-blue-600">
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        ) : (
                                            <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/30">
                                                <FileText className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No documents attached</p>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                <Separator className="bg-slate-100" />

                                <section>
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Original Profile Notes</h3>
                                    <div className="p-6 bg-slate-900 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-2 -translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform">
                                            <Quote className="h-10 w-10" />
                                        </div>
                                        <p className="text-xs leading-relaxed font-medium italic opacity-90 relative z-10">
                                            {candidate!.notes || 'The candidate did not provide additional notes during application.'}
                                        </p>
                                    </div>
                                </section>
                            </div>
                        </ScrollArea>
                    </aside>
                </div>
            </div >

            {/* Global Modals & Dialogs */}
            < Dialog open={showScorecard} onOpenChange={setShowScorecard} >
                <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Candidate Evaluation</DialogTitle>
                        <DialogDescription>
                            Assess candidate skills and provide feedback for the interview.
                        </DialogDescription>
                    </DialogHeader>
                    <InterviewScorecard
                        candidateName={`${candidate!.lastName} ${candidate!.firstName}`}
                        onSubmit={handleScorecardSubmit}
                        onCancel={() => setShowScorecard(false)}
                        isLoading={submittingScorecard}
                    />
                </DialogContent>
            </Dialog >

            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent className="rounded-[2rem] p-8 border-none shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black text-slate-900">Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 font-medium text-sm leading-relaxed mt-2">
                            This action cannot be undone. This will permanently delete the candidate profile, all messages, evaluation history, and remove their application from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-8 gap-3">
                        <AlertDialogCancel className="rounded-2xl border-slate-200 font-bold text-xs uppercase tracking-widest h-12 px-6">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteApplication}
                            className="bg-red-600 hover:bg-red-700 rounded-2xl font-bold text-xs uppercase tracking-widest h-12 px-6 shadow-lg shadow-red-200"
                        >
                            Delete Permanently
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}

