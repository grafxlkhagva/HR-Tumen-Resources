'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { Vacancy, Candidate, JobApplication, RecruitmentStage } from '@/types/recruitment';
import { format } from 'date-fns';
import { mn } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { VerticalTabMenu } from '@/components/ui/vertical-tab-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Link as LinkIcon, Users, ChevronRight, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PageHeader } from '@/components/patterns/page-layout';
import { OpenVacancyCard } from '@/components/recruitment/open-vacancy-card';
import type { Department } from '@/types';
import { Label } from '@/components/ui/label';
import { PipelineBoard } from '../../components/pipeline-board';
import { RecruitmentCalendar } from '../../components/recruitment-calendar';
import { EditVacancyDialog } from '@/components/recruitment/edit-vacancy-dialog';

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
    const [department, setDepartment] = useState<Department | null>(null);
    const [editOpen, setEditOpen] = useState(false);

    // Candidates Data
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loadingCandidates, setLoadingCandidates] = useState(false);
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

                    // 3. Fetch department (for name/color in OpenVacancyCard)
                    try {
                        if (vacancyData.departmentId) {
                            const deptSnap = await getDoc(doc(firestore, 'departments', vacancyData.departmentId));
                            if (deptSnap.exists()) {
                                setDepartment({ id: deptSnap.id, ...(deptSnap.data() as any) } as Department);
                            } else {
                                setDepartment(null);
                            }
                        }
                    } catch {
                        setDepartment(null);
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

    const handleSaveVacancy = async (draft: { title: string; status: Vacancy['status']; deadline: Date | undefined; description: string }) => {
        if (!firestore || !vacancyId) return;
        setSaving(true);
        try {
            const docRef = doc(firestore, 'vacancies', vacancyId as string);
            await updateDoc(docRef, {
                title: draft.title,
                description: draft.description,
                status: draft.status,
                deadline: draft.deadline ? draft.deadline.toISOString() : null,
                updatedAt: new Date().toISOString()
            });
            toast({ title: 'Амжилттай хадгалагдлаа' });
            setVacancy(prev =>
                prev
                    ? {
                        ...prev,
                        title: draft.title,
                        description: draft.description,
                        status: draft.status,
                        deadline: draft.deadline ? draft.deadline.toISOString() : undefined,
                    }
                    : prev
            );
            setEditOpen(false);
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
            <div className="border-b bg-white px-page py-4 sticky top-0 z-10">
                <PageHeader
                    title={vacancy.title}
                    description="Нээлтэй ажлын байр"
                    showBackButton={true}
                    hideBreadcrumbs={true}
                    backButtonPlacement="inline"
                    backBehavior="history"
                    fallbackBackHref="/dashboard/recruitment"
                />
            </div>

            <div className="flex-1 w-full p-6 md:p-8 space-y-6 pb-32">
                <Tabs defaultValue="candidates" className="w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left column: vacancy card */}
                        <div className="lg:col-span-3 space-y-4">
                            <div className="flex justify-center">
                                <OpenVacancyCard
                                    vacancy={vacancy}
                                    departmentName={department?.name || vacancy.departmentId}
                                    departmentColor={department?.color}
                                    actionsVisibility="always"
                                    showViewAction={false}
                                    showEditAction={true}
                                    onEdit={() => setEditOpen(true)}
                                    sections={[
                                        {
                                            content: (
                                                <div className="space-y-3">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="text-muted-foreground">Нийтийн линк</span>
                                                            <Button variant="outline" size="sm" className="h-8" onClick={copyPublicLink}>
                                                                <LinkIcon className="h-4 w-4 mr-2" />
                                                                Хуулах
                                                            </Button>
                                                        </div>
                                                        <div className="text-[10px] text-blue-700 font-mono truncate">
                                                            {typeof window !== 'undefined' ? `${window.location.origin}/apply/${vacancyId}` : ''}
                                                        </div>
                                                    </div>
                                                </div>
                                            ),
                                        },
                                        {
                                            title: 'Агуулга',
                                            content: vacancy.description ? (
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{vacancy.description}</ReactMarkdown>
                                            ) : (
                                                <div className="text-sm text-muted-foreground">Тайлбар оруулаагүй байна.</div>
                                            ),
                                        },
                                    ]}
                                />
                            </div>
                        </div>

                        {/* Right column: selected tab content */}
                        <div className="lg:col-span-9">
                            <div className="mb-4">
                                <VerticalTabMenu
                                    orientation="horizontal"
                                    items={[
                                        { value: 'candidates', label: 'Горилогчид' },
                                        { value: 'pipeline', label: 'Процесс' },
                                        { value: 'calendar', label: 'Календар' },
                                    ]}
                                />
                            </div>

                            <div className="bg-transparent border-0 rounded-none">
                                <div className="p-0 min-h-[400px]">
                                    <TabsContent value="candidates" className="mt-0">
                                        <Card className="border-slate-200 shadow-sm">
                                            <CardHeader className="bg-white pb-2 border-b">
                                                <div className="flex items-center justify-between gap-4">
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
                                                            Бүртгэл {vacancy.status === 'OPEN' ? 'Идэвхтэй' : 'Хаалттай'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-6">
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
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    <TabsContent value="pipeline" className="mt-0">
                                        <PipelineBoard vacancyId={vacancyId as string} />
                                    </TabsContent>

                                    <TabsContent value="calendar" className="mt-0">
                                        <RecruitmentCalendar vacancyId={vacancyId as string} />
                                    </TabsContent>
                                </div>
                            </div>
                        </div>
                    </div>
                </Tabs>
            </div>

            <EditVacancyDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                vacancy={vacancy}
                vacancyId={vacancyId as string}
                storage={storage}
                saving={saving}
                onSave={handleSaveVacancy}
                    onDelete={handleDeleteVacancy}
            />
        </div>
    );
}
