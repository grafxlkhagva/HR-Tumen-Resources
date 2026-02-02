'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { JobApplication, Vacancy, RecruitmentStage, Candidate, Scorecard, MessageTemplate } from '@/types/recruitment';
import { format } from 'date-fns';
import {
    Loader2,
    ArrowLeft,
    Mail,
    Phone,
    MessageSquare,
    Send,
    CheckCircle2,
    Clock,
    FileText,
    User,
    ChevronRight,
    Star,
    Calendar,
    X,
    Trash2,
    LayoutDashboard,
    Zap,
    Briefcase,
    History,
    MessageCircle,
    MapPin,
    Link2,
    Copy,
    Share2,
    MoreHorizontal,
    Files,
    Quote,
    Check,
    Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { VerticalTabMenu } from '@/components/ui/vertical-tab-menu';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/patterns/page-layout';
import { motion, AnimatePresence } from 'framer-motion';
import { sendSMS } from '@/lib/notifications';
import { InterviewScorecard, ScorecardCriteria } from '../../components/interview-scorecard';
import { ScheduleInterviewDialog } from '../../components/schedule-interview-dialog';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// --- Types & Helpers ---

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

    // --- State ---
    const [application, setApplication] = useState<JobApplication | null>(null);
    const [candidate, setCandidate] = useState<Candidate | null>(null);
    const [vacancy, setVacancy] = useState<Vacancy | null>(null);
    const [globalStages, setGlobalStages] = useState<RecruitmentStage[]>([]);
    const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([]);

    // Live Data
    const [events, setEvents] = useState<ApplicationEvent[]>([]);
    const [notes, setNotes] = useState<InternalNote[]>([]);
    const [scorecards, setScorecards] = useState<Scorecard[]>([]);

    // UI State
    const [activeTab, setActiveTab] = useState('activity');
    const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
    const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

    // Actions State
    const [noteText, setNoteText] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const [sendingNote, setSendingNote] = useState(false);
    const [showScorecard, setShowScorecard] = useState(false);
    const [submittingScorecard, setSubmittingScorecard] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Message Preview
    const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
    const [previewText, setPreviewText] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [sendAsSms, setSendAsSms] = useState(false);

    // --- Data Fetching ---

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
                } else {
                    setGlobalStages(DEFAULT_STAGES);
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

    // Subscriptions
    useEffect(() => {
        if (!firestore || !applicationId) return;

        // Events
        const eventsQuery = query(collection(firestore, 'application_events'), where('applicationId', '==', applicationId));
        const unsubEvents = onSnapshot(eventsQuery, (snapshot) => {
            const evts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ApplicationEvent));
            evts.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
            setEvents(evts);
        });

        // Notes
        const notesQuery = query(collection(firestore, 'application_notes'), where('applicationId', '==', applicationId));
        const unsubNotes = onSnapshot(notesQuery, (snapshot) => {
            const nts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InternalNote));
            nts.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt)); // Newest first usually better for notes
            setNotes(nts);
        });

        // Scorecards
        const scorecardsQuery = query(collection(firestore, 'scorecards'), where('applicationId', '==', applicationId));
        const unsubScorecards = onSnapshot(scorecardsQuery, (snapshot) => {
            const scs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scorecard));
            scs.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
            setScorecards(scs);
        });

        return () => {
            unsubEvents();
            unsubNotes();
            unsubScorecards();
        };
    }, [firestore, applicationId]);

    // --- Actions ---

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

    const handleSelectTemplate = (tpl: MessageTemplate) => {
        setSelectedTemplate(tpl);
        const text = tpl.body.replace(/{{name}}/g, candidate?.firstName || 'Нэр');
        setPreviewText(text);
        setShowPreview(true);
    };

    const handleSendMessage = async () => {
        if (!firestore || !candidate || !previewText.trim() || !applicationId) return;
        setSendingMessage(true);
        try {
            await logEvent('MESSAGE', 'Мессеж илгээсэн', previewText);

            if (sendAsSms && candidate.phone) {
                await sendSMS(candidate.phone, previewText);
                toast({
                    title: 'Мессеж амжилттай SMS-ээр илгээгдлээ',
                    description: 'Хэрэглэгчийн утас руу илгээгдсэн.'
                });
            } else {
                toast({
                    title: 'Мессеж амжилттай илгээгдлээ',
                    description: 'Түүхэнд хадгалагдлаа.'
                });
            }

            setShowPreview(false);
            setPreviewText('');
        } catch (error: any) {
            console.error("Error sending message:", error);
            toast({
                title: 'Мессеж илгээж чадсангүй',
                description: error.message || 'Сүлжээний алдаа.',
                variant: 'destructive'
            });
        } finally {
            setSendingMessage(false);
        }
    };

    // Tag handlers
    const handleAddTag = async () => {
        if (!firestore || !candidate || !tagInput.trim()) return;
        const newTag = tagInput.trim();
        if ((candidate.tags || []).includes(newTag)) return; // duplicate check
        const updatedTags = [...(candidate.tags || []), newTag];
        try {
            await updateDoc(doc(firestore, 'candidates', candidate.id), { tags: updatedTags, updatedAt: new Date().toISOString() });
            setCandidate({ ...candidate, tags: updatedTags });
            await logEvent('SYSTEM', 'Таг нэмсэн', newTag);
            setTagInput('');
        } catch (e) {
            console.error(e);
        }
    };

    const handleRemoveTag = async (tagToRemove: string) => {
        if (!firestore || !candidate) return;
        const updatedTags = (candidate.tags || []).filter(t => t !== tagToRemove);
        try {
            await updateDoc(doc(firestore, 'candidates', candidate.id), { tags: updatedTags, updatedAt: new Date().toISOString() });
            setCandidate({ ...candidate, tags: updatedTags });
            await logEvent('SYSTEM', 'Таг устгасан', tagToRemove);
        } catch (e) {
            console.error(e);
        }
    };

    const handleScorecardSubmit = async (scores: ScorecardCriteria[], notesContent: string) => {
        if (!firestore || !application || !candidate) return;
        setSubmittingScorecard(true);
        try {
            const averageScore = scores.reduce((acc, curr) => acc + curr.score, 0) / scores.length;
            const cleanCriteria = scores.map(c => ({
                id: c.id, name: c.name, description: c.description || '', score: c.score
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

            await logEvent('SCORECARD', 'Үнэлгээ өгсөн', `Дундаж оноо: ${averageScore.toFixed(1)}`);
            toast({ title: 'Үнэлгээ амжилттай хадгалагдлаа' });
            setShowScorecard(false);
        } catch (error: any) {
            console.error("Error saving scorecard:", error);
            toast({ title: 'Алдаа гарлаа', description: error.message, variant: 'destructive' });
        } finally {
            setSubmittingScorecard(false);
        }
    };

    const handleDeleteApplication = async () => {
        if (!firestore || !applicationId) return;
        setIsDeleting(true);
        try {
            const batch = writeBatch(firestore);
            // In a real app, use cloud functions for recursive delete. Here we try best effort
            const collectionsToDelete = ['application_messages', 'application_events', 'application_notes', 'scorecards'];
            for (const collName of collectionsToDelete) {
                const q = query(collection(firestore, collName), where('applicationId', '==', applicationId));
                const snapshot = await getDocs(q);
                snapshot.forEach((d) => batch.delete(d.ref));
            }
            if (application?.candidateId) batch.delete(doc(firestore, 'candidates', application.candidateId));
            batch.delete(doc(firestore, 'applications', applicationId as string));
            await batch.commit();

            router.push('/dashboard/recruitment');
            toast({ title: 'Устгагдлаа' });
        } catch (error) {
            console.error(error);
            setIsDeleting(false);
        }
    };


    // --- Loading / Error States ---
    if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    if (error || !application || !candidate) return <div className="p-8 text-center text-red-500">{error || 'Мэдээлэл олдсонгүй'}</div>;

    const currentStage = globalStages.find(s => s.id === application.currentStageId);

    return (
        <div className="flex h-screen w-full flex-col bg-[#F8FAFC] overflow-hidden text-slate-900 font-sans">

            <header className="shrink-0 border-b bg-white/80 backdrop-blur-md z-30">
                <div className="px-6 py-4">
                    <PageHeader
                        title={`${candidate.lastName} ${candidate.firstName}`}
                        description={[vacancy?.title || null, currentStage?.title || null].filter(Boolean).join(' • ')}
                        showBackButton
                        hideBreadcrumbs
                        backButtonPlacement="inline"
                        backBehavior="history"
                        fallbackBackHref="/dashboard/recruitment"
                        actions={
                            <div className="flex items-center gap-3">
                                <div className="flex bg-slate-100 p-1 rounded-lg border">
                                    <Button variant={leftSidebarOpen ? 'outline' : 'ghost'} size="icon" className={cn("h-8 w-8 rounded-md", leftSidebarOpen && "shadow-sm")} onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}>
                                        <LayoutDashboard className="h-4 w-4" />
                                    </Button>
                                    <Button variant={rightSidebarOpen ? 'outline' : 'ghost'} size="icon" className={cn("h-8 w-8 rounded-md", rightSidebarOpen && "shadow-sm")} onClick={() => setRightSidebarOpen(!rightSidebarOpen)}>
                                        <User className="h-4 w-4" />
                                    </Button>
                                </div>

                                <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="bg-slate-900 text-white gap-2 rounded-xl h-10 hover:bg-slate-800 shadow-lg shadow-slate-200">
                                <Zap className="h-4 w-4 text-amber-400 fill-amber-400" />
                                Шуурхай үйлдэл
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-xl p-2">
                            <DropdownMenuLabel className="text-xs uppercase text-slate-400 tracking-wider font-bold px-2 py-1.5">Үйлдлүүд</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => { setShowScorecard(true); setActiveTab('evaluation'); }} className="gap-2 p-2.5 rounded-lg cursor-pointer">
                                <Star className="h-4 w-4 text-amber-500" /> Үнэлгээ өгөх
                            </DropdownMenuItem>
                            <ScheduleInterviewDialog applicationId={application.id} candidate={candidate} vacancy={vacancy || undefined} onScheduled={(i) => logEvent('SYSTEM', 'Ярилцлага', i.title)}>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="gap-2 p-2.5 rounded-lg cursor-pointer">
                                    <Calendar className="h-4 w-4 text-blue-500" /> Ярилцлага товлох
                                </DropdownMenuItem>
                            </ScheduleInterviewDialog>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleStatusUpdate('HIRED')} className="gap-2 p-2.5 rounded-lg text-emerald-600 cursor-pointer">
                                <CheckCircle2 className="h-4 w-4" /> Ажилд авах
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusUpdate('REJECTED')} className="gap-2 p-2.5 rounded-lg text-red-600 cursor-pointer">
                                <X className="h-4 w-4" /> Татгалзах
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="gap-2 p-2.5 rounded-lg text-red-600 cursor-pointer hover:bg-red-50">
                                <Trash2 className="h-4 w-4" /> Устгах
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        }
                    />
                </div>
            </header>

            {/* Main Layout Area */}
            <main className="flex flex-1 min-h-0 overflow-hidden">

                {/* Left Sidebar: Timeline */}
                <AnimatePresence initial={false}>
                    {leftSidebarOpen && (
                        <motion.aside
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 320, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className="bg-white border-r flex flex-col z-20"
                        >
                            <div className="p-4 border-b bg-slate-50/50">
                                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Сонгон шалгаруулалт</h3>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-4 space-y-2">
                                    {globalStages.map((stage, idx) => {
                                        const isCurrent = application.currentStageId === stage.id;
                                        const isPast = globalStages.findIndex(s => s.id === application.currentStageId) > idx;

                                        return (
                                            <div
                                                key={stage.id}
                                                onClick={() => setSelectedStageId(stage.id)}
                                                className={cn(
                                                    "relative p-3 rounded-lg cursor-pointer flex items-center gap-3 transition-all border",
                                                    isCurrent ? "bg-blue-50 border-blue-100" :
                                                        selectedStageId === stage.id ? "bg-slate-50 border-slate-200" : "border-transparent hover:bg-slate-50"
                                                )}
                                            >
                                                <div className={cn(
                                                    "shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2",
                                                    isPast ? "bg-emerald-100 border-emerald-200 text-emerald-600" :
                                                        isCurrent ? "bg-blue-600 border-blue-600 text-white" :
                                                            "bg-white border-slate-200 text-slate-400"
                                                )}>
                                                    {isPast ? <Check className="h-4 w-4" /> : idx + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn("text-sm font-semibold truncate", isCurrent ? "text-blue-900" : "text-slate-700")}>{stage.title}</p>
                                                    {isCurrent && <p className="text-[10px] text-blue-600 uppercase font-bold">Одоогийн шат</p>}
                                                </div>
                                                {selectedStageId === stage.id && <ChevronRight className="h-4 w-4 text-slate-400" />}
                                            </div>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                            <div className="p-4 border-t bg-slate-50">
                                <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => {
                                    const currentIndex = globalStages.findIndex(s => s.id === application.currentStageId);
                                    if (currentIndex < globalStages.length - 1) handleUpdateStage(globalStages[currentIndex + 1].id);
                                }}>Дараагийн шат</Button>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* Center Content: Tabs */}
                {/* Important: flex-1 ensures it takes remaining width. flex-col ensures headers stay atop. min-w-0 prevents flex items from overflowing container */}
                <section className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
                        <div className="shrink-0 bg-white border-b px-6">
                            <VerticalTabMenu
                                orientation="horizontal"
                                className="py-3"
                                items={[
                                    { value: 'activity', label: 'Үйл ажиллагаа' },
                                    { value: 'messages', label: 'Харилцаа холбоо' },
                                    { value: 'notes', label: 'Тэмдэглэл' },
                                    { value: 'evaluation', label: `Үнэлгээ (${scorecards.length})` },
                                ]}
                            />
                        </div>

                        {/* Content Area - Where scrolling happens */}
                        <div className="flex-1 min-h-0 overflow-hidden relative">

                            {/* Activity Tab */}
                            <TabsContent value="activity" className="h-full m-0 p-0 border-none outline-none data-[state=inactive]:hidden data-[state=active]:flex flex-col">
                                <ScrollArea className="h-full w-full">
                                    <div className="p-8 max-w-3xl mx-auto space-y-6">
                                        {events.length === 0 ? (
                                            <div className="text-center py-20 text-slate-400">
                                                <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                                <p>Одоогоор үйл ажиллагаа бүртгэгдээгүй байна</p>
                                            </div>
                                        ) : (
                                            <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 py-2">
                                                {events.map((evt, i) => {
                                                    const iconMap: any = {
                                                        'STAGE_CHANGE': CheckCircle2,
                                                        'MESSAGE': MessageSquare,
                                                        'NOTE': FileText,
                                                        'SCORECARD': Star,
                                                        'SYSTEM': Clock
                                                    };
                                                    const Icon = iconMap[evt.type] || Clock;

                                                    return (
                                                        <div key={evt.id} className="relative pl-8">
                                                            <div className={cn(
                                                                "absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white ring-1 ring-slate-200 bg-white flex items-center justify-center",
                                                                evt.type === 'STAGE_CHANGE' ? "ring-emerald-400 bg-emerald-50 text-emerald-600" :
                                                                    evt.type === 'MESSAGE' ? "ring-blue-400 bg-blue-50 text-blue-600" :
                                                                        "text-slate-400"
                                                            )}>
                                                                <div className="h-1.5 w-1.5 rounded-full bg-current" />
                                                            </div>
                                                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div>
                                                                        <h4 className="font-bold text-slate-900 text-sm">{evt.title}</h4>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <span className="text-xs text-slate-500 font-medium">{evt.userName}</span>
                                                                            <span className="text-slate-300 mx-1">•</span>
                                                                            <span className="text-xs text-slate-400">{evt.createdAt ? format(new Date(evt.createdAt), 'MM/dd HH:mm') : '-'}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                                                        <Icon className="h-4 w-4" />
                                                                    </div>
                                                                </div>
                                                                {evt.description && <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg">{evt.description}</p>}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </TabsContent>

                            {/* Messages Tab */}
                            <TabsContent value="messages" className="h-full m-0 p-0 border-none outline-none data-[state=inactive]:hidden data-[state=active]:flex flex-col">
                                <div className="flex-1 flex overflow-hidden">
                                    {/* Template List */}
                                    <div className="w-64 border-r bg-white flex flex-col overflow-hidden">
                                        <div className="p-4 border-b font-bold text-xs uppercase text-slate-400 tracking-wider">Загварууд</div>
                                        <ScrollArea className="flex-1">
                                            <div className="p-2 space-y-1">
                                                {messageTemplates.map(tpl => (
                                                    <div key={tpl.id} onClick={() => handleSelectTemplate(tpl)} className="p-3 rounded-lg hover:bg-slate-100 cursor-pointer text-sm font-bold text-slate-900 border border-transparent hover:border-slate-200 transition-all">
                                                        {tpl.title}
                                                    </div>
                                                ))}
                                                {messageTemplates.length === 0 && <div className="p-4 text-xs text-slate-400 text-center">Загвар байхгүй</div>}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                    {/* Editor Area */}
                                    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 p-6 overflow-y-auto">
                                        {showPreview ? (
                                            <div className="max-w-2xl mx-auto w-full space-y-6">
                                                <div className="bg-white p-6 rounded-2xl shadow-sm border">
                                                    <Label className="mb-2 block text-slate-500">Мессежний агуулга</Label>
                                                    <Textarea
                                                        value={previewText}
                                                        onChange={e => setPreviewText(e.target.value)}
                                                        className="min-h-[200px] border-none text-base resize-none focus-visible:ring-0 p-0"
                                                        placeholder="Энд бичнэ үү..."
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Switch checked={sendAsSms} onCheckedChange={setSendAsSms} />
                                                        <Label>SMS-ээр илгээх</Label>
                                                    </div>
                                                    <div className="flex gap-3">
                                                        <Button variant="outline" onClick={() => setShowPreview(false)}>Болих</Button>
                                                        <Button onClick={handleSendMessage} disabled={sendingMessage} className="bg-blue-600 gap-2">
                                                            {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Илгээх
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                                <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                                                <p>Загвар сонгох эсвэл шууд бичих</p>
                                                <Button variant="outline" className="mt-4" onClick={() => setShowPreview(true)}>Шинэ мессеж бичих</Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Notes Tab */}
                            <TabsContent value="notes" className="h-full m-0 p-0 border-none outline-none data-[state=inactive]:hidden data-[state=active]:flex flex-col">
                                <ScrollArea className="flex-1 w-full bg-amber-50/30">
                                    <div className="p-8 max-w-4xl mx-auto space-y-6 pb-32">
                                        {notes.length === 0 ? (
                                            <div className="text-center py-20 text-slate-400">
                                                <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                                <p>Тэмдэглэл байхгүй байна</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {notes.map(note => (
                                                    <div key={note.id} className="bg-amber-50 border border-amber-100 p-5 rounded-xl text-amber-900 relative">
                                                        <Quote className="absolute top-4 right-4 h-6 w-6 text-amber-200/50" />
                                                        <p className="text-sm font-medium mb-4 leading-relaxed whitespace-pre-wrap">{note.text}</p>
                                                        <div className="flex items-center gap-2 pt-4 border-t border-amber-100/50">
                                                            <div className="h-5 w-5 rounded-full bg-amber-200 flex items-center justify-center text-[10px] font-bold text-amber-700">
                                                                {note.authorName[0]}
                                                            </div>
                                                            <span className="text-xs font-bold opacity-70">{note.authorName}</span>
                                                            <span className="text-[10px] opacity-50 ml-auto">{format(new Date(note.createdAt), 'MM/dd HH:mm')}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                                {/* Input Area Fixed at Bottom */}
                                <div className="shrink-0 p-6 bg-white border-t shadow-lg z-10">
                                    <div className="max-w-4xl mx-auto flex gap-4">
                                        <Textarea
                                            value={noteText}
                                            onChange={e => setNoteText(e.target.value)}
                                            placeholder="Тэмдэглэл бичих..."
                                            className="min-h-[80px]"
                                        />
                                        <Button
                                            onClick={handleSendNote}
                                            disabled={!noteText.trim() || sendingNote}
                                            className="h-auto px-6 bg-amber-500 hover:bg-amber-600 text-white"
                                        >
                                            {sendingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Evaluation Tab */}
                            <TabsContent value="evaluation" className="h-full m-0 p-0 border-none outline-none data-[state=inactive]:hidden data-[state=active]:flex flex-col">
                                <ScrollArea className="h-full w-full">
                                    <div className="p-8 max-w-4xl mx-auto">
                                        <div className="flex justify-between items-center mb-8">
                                            <h3 className="font-bold text-lg">Үнэлгээний түүх</h3>
                                            <Button onClick={() => setShowScorecard(true)} className="bg-slate-900 text-white gap-2">
                                                <Star className="h-4 w-4 text-amber-400" /> Үнэлгээ нэмэх
                                            </Button>
                                        </div>
                                        {scorecards.length === 0 ? (
                                            <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed">
                                                <Star className="h-10 w-10 mx-auto mb-4 text-slate-300" />
                                                <p className="text-slate-500 font-medium">Одоогоор үнэлгээ байхгүй</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {scorecards.map(sc => (
                                                    <div key={sc.id} className="bg-white border rounded-xl overflow-hidden shadow-sm">
                                                        <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="h-8 w-8">
                                                                    <AvatarFallback>{sc.interviewerName?.[0]}</AvatarFallback>
                                                                </Avatar>
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-900">{sc.interviewerName}</p>
                                                                    <p className="text-xs text-slate-500">{format(new Date(sc.createdAt), 'yyyy.MM.dd')}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border shadow-sm">
                                                                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                                                                <span className="font-bold text-slate-900">{sc.averageScore.toFixed(1)}</span>
                                                            </div>
                                                        </div>
                                                        <div className="p-5">
                                                            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6">
                                                                {sc.criteria.map((c, idx) => (
                                                                    <div key={idx} className="flex justify-between items-center border-b border-dotted pb-2 last:border-0">
                                                                        <span className="text-sm text-slate-600">{c.name}</span>
                                                                        <div className="flex gap-1">
                                                                            {[1, 2, 3, 4, 5].map(star => (
                                                                                <div key={star} className={cn("h-1.5 w-4 rounded-full", star <= c.score ? "bg-blue-500" : "bg-slate-200")} />
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            {sc.notes && (
                                                                <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 italic">
                                                                    "{sc.notes}"
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                        </div>
                    </Tabs>
                </section>

                {/* Right Sidebar: Profile Info */}
                <AnimatePresence initial={false}>
                    {rightSidebarOpen && (
                        <motion.aside
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 380, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className="bg-white border-l z-20 flex flex-col"
                        >
                            <ScrollArea className="flex-1">
                                <div className="p-6 space-y-8">
                                    {/* Contact Info */}
                                    <div>
                                        <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4">Холбоо барих</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border hover:bg-white hover:shadow-sm transition-all cursor-pointer group">
                                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                    <Phone className="h-4 w-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-slate-400 font-bold uppercase">Утас</p>
                                                    <p className="text-sm font-semibold text-slate-900 truncate">{candidate.phone}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border hover:bg-white hover:shadow-sm transition-all cursor-pointer group">
                                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                    <Mail className="h-4 w-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-slate-400 font-bold uppercase">Имэйл</p>
                                                    <p className="text-sm font-semibold text-slate-900 truncate">{candidate.email}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tags */}
                                    <div>
                                        <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4">Тагууд</h3>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {(candidate.tags || []).map(tag => (
                                                <Badge key={tag} variant="secondary" className="bg-slate-100 hover:bg-red-50 hover:text-red-500 cursor-pointer gap-1 group transition-colors pr-1">
                                                    {tag}
                                                    <X className="h-3 w-3 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleRemoveTag(tag); }} />
                                                </Badge>
                                            ))}
                                            {(candidate.tags || []).length === 0 && <span className="text-sm text-slate-400 italic">Таг байхгүй</span>}
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                className="flex-1 bg-slate-50 border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                                placeholder="Таг нэмэх..."
                                                value={tagInput}
                                                onChange={e => setTagInput(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                                            />
                                            <Button size="sm" variant="outline" onClick={handleAddTag} disabled={!tagInput.trim()}>
                                                <Check className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Files */}
                                    <div>
                                        <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4">Файлууд</h3>
                                        <div className="space-y-3">
                                            {candidate.resumeUrl && (
                                                <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 border rounded-xl hover:bg-slate-50 hover:border-blue-200 group transition-all">
                                                    <div className="h-10 w-10 bg-red-50 rounded-lg flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                                                        <FileText className="h-5 w-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-slate-700 truncate">Resume.pdf</p>
                                                        <p className="text-xs text-slate-400">CV / Resume</p>
                                                    </div>
                                                    <Download className="h-4 w-4 text-slate-300 group-hover:text-blue-500" />
                                                </a>
                                            )}
                                            {/* Placeholder for other files */}
                                            <div className="border border-dashed rounded-xl p-4 text-center cursor-pointer hover:bg-slate-50">
                                                <p className="text-xs text-slate-500 font-medium">+ Файл нэмэх</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>
                        </motion.aside>
                    )}
                </AnimatePresence>
            </main>

            <Dialog open={showScorecard} onOpenChange={setShowScorecard}>
                <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
                    <DialogTitle className="sr-only">Үнэлгээний хуудас</DialogTitle>
                    <InterviewScorecard
                        candidateName={`${candidate!.lastName} ${candidate!.firstName}`}
                        onSubmit={handleScorecardSubmit}
                        onCancel={() => setShowScorecard(false)}
                        isLoading={submittingScorecard}
                    />
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
                <AlertDialogContent>
                    <p>Loading...</p>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Энэ үйлдлийг буцаах боломжгүй. Нэр дэвшигч болон түүнтэй холбоотой бүх мэдээлэл (үнэлгээ, тэмдэглэл, түүх) бүрмөсөн устах болно.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Болих</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteApplication} className="bg-red-600 hover:bg-red-700">
                            Устгах
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
