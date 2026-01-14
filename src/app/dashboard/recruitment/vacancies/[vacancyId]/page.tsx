'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Vacancy, Candidate, JobApplication, RecruitmentStage } from '@/types/recruitment';
import { format } from 'date-fns';
import { mn } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Save, Calendar as CalendarIcon, Link as LinkIcon, Users, Settings as SettingsIcon, FileText, Image as ImageIcon, Trash2, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { UserPlus, List as ListIcon, Kanban, Calendar as CalendarIconAlt } from 'lucide-react';
import { PipelineBoard } from '../../components/pipeline-board';
import { RecruitmentCalendar } from '../../components/recruitment-calendar';

const DEFAULT_STAGES: RecruitmentStage[] = [
    { id: 'screening', title: 'Анкет шүүлт', type: 'SCREENING', order: 0 },
    { id: 'first-interview', title: 'Анхан шатны ярилцлага', type: 'INTERVIEW', order: 1 },
    { id: 'tech-task', title: 'Даалгавар', type: 'CHALLENGE', order: 2 },
    { id: 'final-interview', title: 'Эцсийн ярилцлага', type: 'INTERVIEW', order: 3 },
    { id: 'offer', title: 'Санал тавих', type: 'OFFER', order: 4 },
];

function AddCandidateDialog({ vacancy, onSuccess }: { vacancy: Vacancy, onSuccess: () => void }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        source: 'MANUAL',
        notes: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore) return;
        setLoading(true);

        try {
            // 1. Create candidate
            const candidateRef = await addDoc(collection(firestore, 'candidates'), {
                ...formData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            // 2. Create application
            const firstStageId = vacancy.stages?.[0]?.id || 'screening';

            await addDoc(collection(firestore, 'applications'), {
                vacancyId: vacancy.id,
                candidateId: candidateRef.id,
                currentStageId: firstStageId,
                status: 'ACTIVE',
                appliedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            toast({ title: 'Горилогч амжилттай нэмэгдлээ' });
            setOpen(false);
            setFormData({ firstName: '', lastName: '', email: '', phone: '', source: 'MANUAL', notes: '' });
            onSuccess();
        } catch (error) {
            console.error(error);
            toast({ title: 'Алдаа гарлаа', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Горилогч нэмэх
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Горилогч гараас нэмэх</DialogTitle>
                    <DialogDescription>
                        Тухайн ажлын байранд нэр оноож горилогчийг бүртгэнэ.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Овог</Label>
                            <Input
                                id="lastName"
                                required
                                value={formData.lastName}
                                onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="firstName">Нэр</Label>
                            <Input
                                id="firstName"
                                required
                                value={formData.firstName}
                                onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">И-мэйл</Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Утас</Label>
                        <Input
                            id="phone"
                            required
                            value={formData.phone}
                            onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="notes">Тэмдэглэл</Label>
                        <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Цуцлах</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Хадгалах
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function VacancyDetailPage() {
    const { vacancyId } = useParams();
    const router = useRouter();
    const { firestore, storage } = useFirebase();
    const { toast } = useToast();

    const [vacancy, setVacancy] = useState<Vacancy | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showJobDetails, setShowJobDetails] = useState(false);

    // Overview Form State
    const [description, setDescription] = useState('');
    const [deadline, setDeadline] = useState<Date | undefined>(undefined);
    const [status, setStatus] = useState<Vacancy['status']>('DRAFT');

    // Candidates Data
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [candidateView, setCandidateView] = useState('list');
    const [globalStages, setGlobalStages] = useState<RecruitmentStage[]>(DEFAULT_STAGES);

    useEffect(() => {
        const fetchData = async () => {
            if (!firestore || !vacancyId) return;
            setLoading(true);
            try {
                // 1. Fetch global stages first
                let currentStages = DEFAULT_STAGES;
                const settingsRef = doc(firestore, 'recruitment_settings', 'default');
                const settingsSnap = await getDoc(settingsRef);
                if (settingsSnap.exists() && settingsSnap.data().defaultStages) {
                    currentStages = settingsSnap.data().defaultStages as RecruitmentStage[];
                    setGlobalStages(currentStages);
                } else {
                    setGlobalStages(DEFAULT_STAGES);
                }

                // 2. Fetch vacancy
                const docRef = doc(firestore, 'vacancies', vacancyId as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const vacancyData = {
                        ...data,
                        id: docSnap.id,
                        stages: currentStages
                    } as Vacancy;

                    setVacancy(vacancyData);
                    setDescription(vacancyData.description || '');
                    setStatus(vacancyData.status);
                    if (vacancyData.deadline) {
                        setDeadline(new Date(vacancyData.deadline));
                    }
                } else {
                    toast({ title: 'Ажлын байр олдсонгүй', variant: 'destructive' });
                    router.push('/dashboard/recruitment');
                }
            } catch (error) {
                console.error("Error fetching vacancy data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [firestore, vacancyId, router, toast]);

    const fetchCandidates = async () => {
        if (!firestore || !vacancyId) return;
        setLoadingCandidates(true);
        try {
            const q = query(collection(firestore, 'applications'), where('vacancyId', '==', vacancyId));
            const appSnaps = await getDocs(q);
            const apps = appSnaps.docs.map(d => ({ id: d.id, ...d.data() } as JobApplication));
            const candidatePromises = apps.map(async (app) => {
                const candidateRef = doc(firestore, 'candidates', app.candidateId);
                const candidateSnap = await getDoc(candidateRef);
                const stageName = globalStages.find(s => s.id === app.currentStageId)?.title || app.currentStageId;
                return { appId: app.id, ...app, stageName, candidate: candidateSnap.exists() ? { id: candidateSnap.id, ...candidateSnap.data() } : null };
            });
            setCandidates(await Promise.all(candidatePromises));
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingCandidates(false);
        }
    };

    useEffect(() => {
        if (firestore && vacancyId) {
            fetchCandidates();
        }
    }, [firestore, vacancyId, globalStages]);

    const handleSaveOverview = async () => {
        if (!firestore || !vacancyId) return;
        setSaving(true);
        try {
            const docRef = doc(firestore, 'vacancies', vacancyId as string);
            await updateDoc(docRef, { description, status, deadline: deadline ? deadline.toISOString() : null, updatedAt: new Date().toISOString() });
            toast({ title: 'Амжилттай хадгалагдлаа' });
            setVacancy(prev => prev ? { ...prev, description, status } : null);
        } catch (error) {
            console.error(error);
            toast({ title: 'Алдаа гарлаа', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteVacancy = async () => {
        if (!firestore || !vacancyId) return;
        setSaving(true);
        try {
            await deleteDoc(doc(firestore, 'vacancies', vacancyId as string));
            toast({ title: 'Ажлын байр устгагдлаа' });
            router.push('/dashboard/recruitment');
        } catch (error) {
            console.error(error);
            toast({ title: 'Устгаж чадсангүй', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const copyPublicLink = () => {
        const url = `${window.location.origin}/apply/${vacancyId}`;
        navigator.clipboard.writeText(url);
        toast({ title: 'Линк хуулагдлаа', description: url });
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (!vacancy) return <div>Not found</div>;

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            <div className="border-b bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/recruitment')}><ArrowLeft className="h-4 w-4" /></Button>
                    <div>
                        <h1 className="text-xl font-semibold flex items-center gap-2">{vacancy.title}<Badge variant={vacancy.status === 'OPEN' ? 'default' : 'secondary'}>{vacancy.status}</Badge></h1>
                        <p className="text-sm text-muted-foreground">{vacancy.departmentId} • {format(new Date(vacancy.createdAt), 'yyyy-MM-dd')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={copyPublicLink}><LinkIcon className="h-4 w-4 mr-2" />Линк хуулах</Button>
                    <Button onClick={handleSaveOverview} disabled={saving}><Save className="h-4 w-4 mr-2" />Хадгалах</Button>
                </div>
            </div>

            <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
                {/* MERGED JOB DETAILS & SETTINGS CARD */}
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader
                        className="py-4 px-6 bg-slate-50/50 cursor-pointer flex flex-row items-center justify-between"
                        onClick={() => setShowJobDetails(!showJobDetails)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                                <SettingsIcon className="h-4 w-4" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Ажлын байрны тохиргоо & Тайлбар</CardTitle>
                                <CardDescription className="text-xs">Зарын дэлгэрэнгүй, төлөв, хугацаа болон бусад тохиргоо</CardDescription>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            {showJobDetails ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                        </Button>
                    </CardHeader>
                    {showJobDetails && (
                        <CardContent className="p-6 space-y-8 animate-in slide-in-from-top-2 duration-200">
                            {/* Status & Deadline Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="bg-slate-50/50 border-slate-100">
                                    <CardContent className="p-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <div className="text-sm font-medium">Нийтлэх төлөв</div>
                                                <div className="text-xs text-muted-foreground">Зар идэвхтэй эсэх</div>
                                            </div>
                                            <Switch
                                                checked={status === 'OPEN'}
                                                onCheckedChange={(checked) => setStatus(checked ? 'OPEN' : 'DRAFT')}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-slate-50/50 border-slate-100">
                                    <CardContent className="p-4 space-y-2">
                                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Эцсийн хугацаа</label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal h-10 bg-white",
                                                        !deadline && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                                    {deadline ? format(deadline, "yyyy-MM-dd") : <span>Хугацаа сонгох</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={deadline}
                                                    onSelect={setDeadline}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </CardContent>
                                </Card>

                                <Card className="bg-slate-50/50 border-slate-100">
                                    <CardContent className="p-4 space-y-2">
                                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Нийтийн линк</label>
                                        <div className="flex gap-2">
                                            <div className="flex-1 px-3 py-2 bg-white border rounded-md text-[10px] text-blue-600 font-mono truncate">
                                                {typeof window !== 'undefined' ? `${window.location.origin}/apply/${vacancyId}` : ''}
                                            </div>
                                            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={copyPublicLink}>
                                                <LinkIcon className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Description Editor */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-slate-400" />
                                        Ажлын байрны танилцуулга
                                    </h3>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        id="image-upload"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file || !vacancyId || !storage) return;
                                            toast({ title: 'Зураг хуулж байна...' });
                                            try {
                                                const storageRef = ref(storage, `vacancies/${vacancyId}/${Date.now()}_${file.name}`);
                                                const uploadTask = uploadBytesResumable(storageRef, file);
                                                uploadTask.on('state_changed', null,
                                                    (error) => { console.error(error); toast({ title: 'Алдаа', variant: 'destructive' }); },
                                                    async () => {
                                                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                                                        setDescription(prev => prev + `\n\n![${file.name}](${downloadURL})`);
                                                        toast({ title: 'Зураг амжилттай орлоо' });
                                                    }
                                                );
                                            } catch (error) { console.error(error); }
                                        }}
                                    />
                                    <Button variant="ghost" size="sm" className="h-8 text-xs gap-2" onClick={() => document.getElementById('image-upload')?.click()}>
                                        <ImageIcon className="h-3 w-3" />
                                        Зураг нэмэх
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <Textarea
                                        className="min-h-[400px] font-mono text-xs resize-none bg-slate-50/30"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="# Ажлын байрны нэр..."
                                    />
                                    <div className="min-h-[400px] p-4 rounded-md border bg-white overflow-auto prose prose-xs max-w-none">
                                        {description ? (
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{description}</ReactMarkdown>
                                        ) : (
                                            <p className="text-slate-400 italic">Тайлбар оруулаагүй байна...</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Danger Zone Row */}
                            <div className="pt-6 border-t flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium flex items-center gap-2">
                                        <Users className="h-4 w-4 text-slate-400" />
                                        Үе шатны тохиргоо
                                    </p>
                                    <p className="text-xs text-muted-foreground">Үе шатууд нэгдмэл (Global) тохиргоотой тул эндээс өөрчлөх боломжгүй.</p>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <Button variant="outline" className="text-xs h-9 flex-1 md:flex-none">Архивлах</Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" className="text-xs h-9 flex-1 md:flex-none gap-2">
                                                <Trash2 className="h-3 w-3" />
                                                Устгах
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
                                                <AlertDialogDescription>Ажлын байрны зар болон түүнтэй холбоотой мэдээллүүд устах болно.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDeleteVacancy} className="bg-red-600 hover:bg-red-700">Тийм, устгах</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        </CardContent>
                    )}
                </Card>

                {/* CANDIDATES CARD - ALWAYS VISIBLE */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="bg-white pb-2 border-b">
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl flex items-center gap-3">
                                        <Users className="h-5 w-5 text-indigo-600" />
                                        Горилогчид
                                    </CardTitle>
                                    <CardDescription>Нийт {candidates.length} хүн бүртгүүлсэн байна</CardDescription>
                                </div>
                                <div className="flex items-center gap-3">
                                    <AddCandidateDialog vacancy={{ ...vacancy, stages: globalStages }} onSuccess={fetchCandidates} />
                                    <Badge variant="secondary" className="px-3 py-1 font-medium bg-indigo-50 text-indigo-700 border-indigo-100">
                                        Бүртгэл {status === 'OPEN' ? 'Идэвхтэй' : 'Хаалттай'}
                                    </Badge>
                                </div>
                            </div>

                            <Tabs value={candidateView} onValueChange={setCandidateView} className="w-full">
                                <TabsList className="bg-slate-100/80 p-1 h-11">
                                    <TabsTrigger value="list" className="gap-2 px-6 h-9 data-[state=active]:bg-white data-[state=active]:shadow-sm"><ListIcon className="h-4 w-4" /> Жагсаалт</TabsTrigger>
                                    <TabsTrigger value="pipeline" className="gap-2 px-6 h-9 data-[state=active]:bg-white data-[state=active]:shadow-sm"><Kanban className="h-4 w-4" /> Процесс</TabsTrigger>
                                    <TabsTrigger value="calendar" className="gap-2 px-6 h-9 data-[state=active]:bg-white data-[state=active]:shadow-sm"><CalendarIconAlt className="h-4 w-4" /> Календар</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {candidateView === 'list' && (
                            <>
                                {loadingCandidates ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        <p className="text-sm font-medium">Мэдээлэл ачаалж байна...</p>
                                    </div>
                                ) : candidates.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
                                        <div className="p-4 rounded-full bg-slate-50 border border-slate-100">
                                            <Users className="h-8 w-8 text-slate-300" />
                                        </div>
                                        <div className="text-center">
                                            <p className="font-semibold text-slate-600">Одоогоор горилогч бүртгүүлээгүй байна</p>
                                            <p className="text-sm text-slate-400">Зар хуудсаа олон нийтийн сувгаар түгээж эхэлнэ үү.</p>
                                        </div>
                                        <Button variant="outline" size="sm" className="mt-2" onClick={copyPublicLink}>
                                            <LinkIcon className="h-4 w-4 mr-2" />
                                            Линк хуулах
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {candidates.map((app) => (
                                            <div
                                                key={app.id}
                                                className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group cursor-pointer"
                                                onClick={() => router.push(`/dashboard/recruitment/applications/${app.id}`)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                                                        <AvatarFallback className="bg-slate-100 text-slate-600 font-medium">
                                                            {app.candidate?.lastName?.charAt(0)}{app.candidate?.firstName?.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <h4 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                                                            {app.candidate?.lastName} {app.candidate?.firstName}
                                                        </h4>
                                                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                                            <span>{app.candidate?.email}</span>
                                                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                            <span>{app.candidate?.phone}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-8">
                                                    <div className="text-right">
                                                        <Badge variant="outline" className="bg-white font-medium text-slate-600">
                                                            {app.stageName}
                                                        </Badge>
                                                        <p className="text-[11px] text-muted-foreground mt-1">
                                                            {format(new Date(app.appliedAt), 'yyyy-MM-dd HH:mm')}
                                                        </p>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="group-hover:translate-x-1 transition-transform">
                                                        <ChevronRight className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                        {candidateView === 'pipeline' && (
                            <PipelineBoard vacancyId={vacancyId as string} />
                        )}
                        {candidateView === 'calendar' && (
                            <RecruitmentCalendar vacancyId={vacancyId as string} />
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
