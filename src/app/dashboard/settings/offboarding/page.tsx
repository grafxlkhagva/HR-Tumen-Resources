'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Pencil, Info, FileText, LogOut, ClipboardList, Calculator, MessageSquare } from 'lucide-react';
import { useFirebase, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, setDoc, query, collection, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface OffboardingTask {
    id: string;
    title: string;
    description?: string;
    policyId?: string;
}

interface OffboardingStage {
    id: string;
    title: string;
    description: string;
    icon: string;
    tasks: OffboardingTask[];
}

const DEFAULT_STAGES: OffboardingStage[] = [
    {
        id: 'exit-initiation',
        title: 'Ажлаас гарах шийдвэр, мэдэгдлийн үе',
        description: 'Ажилтны хүсэлт эсвэл байгууллагын шийдвэр. Албан ёсны мэдэгдэл, баримтжуулалт.',
        icon: 'LogOut',
        tasks: [
            { id: '1', title: 'Ажлаас гарах өргөдөл/мэдэгдэл хүлээн авах', description: 'Ажилтны өргөдөл эсвэл компанийн мэдэгдэл бүртгэх' },
            { id: '2', title: 'Чөлөөлөх үндэслэл тодорхойлох', description: 'Өөрийн хүсэлт, компанийн санаачилга эсвэл бусад шалтгаан' },
            { id: '3', title: 'Сүүлийн ажлын өдөр тогтоох', description: 'Хөдөлмөрийн хуулийн дагуу мэдэгдлийн хугацаа тооцох' },
            { id: '4', title: 'Холбогдох талуудад мэдэгдэх', description: 'Удирдлага, хүний нөөцийн хэлтэст мэдэгдэх' }
        ]
    },
    {
        id: 'knowledge-handover',
        title: 'Ажлын хүлээлцэх, шилжилтийн үе',
        description: 'Ажлын үүрэг, файл, харилцагч шилжүүлэх. Орлох хүний бэлтгэл.',
        icon: 'ClipboardList',
        tasks: [
            { id: '5', title: 'Ажлын үүргийн жагсаалт гаргах', description: 'Одоогийн хариуцаж буй бүх ажлуудыг жагсаах' },
            { id: '6', title: 'Шилжүүлэх ажлуудыг хуваарилах', description: 'Ажил бүрийг хэнд шилжүүлэхийг тодорхойлох' },
            { id: '7', title: 'Баримт бичиг, файлуудыг шилжүүлэх', description: 'Чухал баримт бичгүүдийг зохих газарт хадгалах' },
            { id: '8', title: 'Харилцагч, түншүүдийг танилцуулах', description: 'Гадаад харилцагчдыг орлох хүнд танилцуулах' },
            { id: '9', title: 'Мэдлэгийн баримтжуулалт', description: 'Чухал процесс, мэдлэгийг бичиж үлдээх' }
        ]
    },
    {
        id: 'formal-separation',
        title: 'Албан ёсны хаалт, эцсийн тооцооны үе',
        description: 'Системийн эрх хаах, эд хөрөнгө буцаах, эцсийн цалин тооцох.',
        icon: 'Calculator',
        tasks: [
            { id: '10', title: 'Системийн эрхүүд хаах', description: 'И-мэйл, дотоод системүүдийн эрх хүчингүй болгох' },
            { id: '11', title: 'Эд хөрөнгө буцаах', description: 'Компьютер, утас, түлхүүр, карт гэх мэт' },
            { id: '12', title: 'Эцсийн цалин тооцох', description: 'Цалин, урамшуулал, нөхөн олговор тооцоолох' },
            { id: '13', title: 'Ашиглаагүй амралт тооцох', description: 'Үлдсэн амралтын өдрийн тооцоо' },
            { id: '14', title: 'Ажлаас чөлөөлсөн тушаал гаргах', description: 'Албан ёсны чөлөөлөх тушаал бэлтгэх' }
        ]
    },
    {
        id: 'exit-review',
        title: 'Exit үнэлгээ, харилцаа хадгалах үе',
        description: 'Гарах ярилцлага, сэтгэл ханамж шинжилгээ, Alumni сүлжээ.',
        icon: 'MessageSquare',
        tasks: [
            { id: '15', title: 'Exit interview хийх', description: 'Ажлаас гарах ярилцлага зохион байгуулах' },
            { id: '16', title: 'Сэтгэл ханамж, шалтгааны судалгаа', description: 'Гарах шийдвэрийн шалтгааныг судлах' },
            { id: '17', title: 'Тодорхойлолт бэлтгэх', description: 'Ажилтанд ажил байдлын тодорхойлолт олгох' },
            { id: '18', title: 'Баяртай, талархал илэрхийлэх', description: 'Ажилтны хувь нэмрийг үнэлж талархах' },
            { id: '19', title: 'Alumni сүлжээнд бүртгэх', description: 'Шаардлагатай бол alumni програмд нэмэх' }
        ]
    }
];

const STAGE_ICONS: Record<string, React.ElementType> = {
    'LogOut': LogOut,
    'ClipboardList': ClipboardList,
    'Calculator': Calculator,
    'MessageSquare': MessageSquare,
};

export default function OffboardingSettingsPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'settings', 'offboarding') : null), [firestore]);
    const { data: config, isLoading } = useDoc<any>(configRef as any);

    // Fetch policies for selection
    const policiesQuery = useMemoFirebase(() =>
        (firestore ? query(collection(firestore, 'companyPolicies'), orderBy('title', 'asc')) : null),
        [firestore]);
    const { data: policies } = useCollection<any>(policiesQuery);

    const [stages, setStages] = useState<OffboardingStage[]>(DEFAULT_STAGES);
    const [editingTask, setEditingTask] = useState<{
        stageId: string;
        taskId: string | null;
        title: string;
        description: string;
        policyId?: string;
    } | null>(null);

    useEffect(() => {
        if (config && config.stages) {
            setStages(config.stages);
        } else if (config === null && firestore) {
            // Config document doesn't exist - save default stages
            setDoc(doc(firestore, 'settings', 'offboarding'), { stages: DEFAULT_STAGES })
                .then(() => {
                    console.log('Default offboarding stages initialized');
                })
                .catch((err) => {
                    console.error('Failed to initialize default stages:', err);
                });
        }
    }, [config, firestore]);

    const handleSaveConfig = async (newStages: OffboardingStage[]) => {
        if (!firestore) return;
        try {
            await setDoc(doc(firestore, 'settings', 'offboarding'), { stages: newStages });
            toast({
                title: 'Амжилттай хадгалагдлаа',
                description: 'Ажлаас чөлөөлөх хөтөлбөрийн тохиргоог шинэчиллээ.'
            });
        } catch (error) {
            toast({
                title: 'Алдаа гарлаа',
                description: 'Тохиргоог хадгалахад алдаа гарлаа.',
                variant: 'destructive'
            });
        }
    };

    const addTask = (stageId: string) => {
        setEditingTask({ stageId, taskId: null, title: '', description: '', policyId: undefined });
    };

    const editTask = (stageId: string, task: OffboardingTask) => {
        setEditingTask({
            stageId,
            taskId: task.id,
            title: task.title,
            description: task.description || '',
            policyId: task.policyId
        });
    };

    const deleteTask = (stageId: string, taskId: string) => {
        const newStages = stages.map(s => {
            if (s.id === stageId) {
                return { ...s, tasks: s.tasks.filter(t => t.id !== taskId) };
            }
            return s;
        });
        setStages(newStages);
        handleSaveConfig(newStages);
    };

    const saveTask = () => {
        if (!editingTask) return;
        if (!editingTask.title.trim()) {
            toast({ title: 'Гарчиг оруулах шаардлагатай', variant: 'destructive' });
            return;
        }

        const newStages = stages.map(s => {
            if (s.id === editingTask.stageId) {
                let newTasks = [...s.tasks];
                if (editingTask.taskId) {
                    // Edit
                    newTasks = newTasks.map(t => t.id === editingTask.taskId ? {
                        ...t,
                        title: editingTask.title,
                        description: editingTask.description,
                        policyId: editingTask.policyId
                    } : t);
                } else {
                    // Add
                    newTasks.push({
                        id: Math.random().toString(36).substr(2, 9),
                        title: editingTask.title,
                        description: editingTask.description,
                        policyId: editingTask.policyId
                    });
                }
                return { ...s, tasks: newTasks };
            }
            return s;
        });

        setStages(newStages);
        handleSaveConfig(newStages);
        setEditingTask(null);
    };

    if (isLoading) {
        return <div className="p-8 text-center animate-pulse">Ачаалж байна...</div>;
    }

    return (
        <div className="space-y-8">
            <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-slate-800">Ажлаас чөлөөлөх хөтөлбөр тохиргоо</h2>
                <p className="text-sm text-muted-foreground max-w-2xl">
                    4 үе шат бүхий ажлаас чөлөөлөх процессын таскуудыг удирдах.
                </p>
            </div>

            <Alert className="bg-rose-50 border-rose-100 text-rose-800">
                <Info className="h-4 w-4 text-rose-600" />
                <AlertTitle className="font-bold">Мэдээлэл</AlertTitle>
                <AlertDescription className="text-sm">
                    Энд тохируулсан таскууд нь ажлаас гарч буй бүх ажилчдад автоматаар үүсэх болно.
                </AlertDescription>
            </Alert>

            <Tabs defaultValue={stages[0]?.id} className="w-full">
                <div className="flex overflow-x-auto pb-2 scrollbar-hide">
                    <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl h-auto">
                        {stages.map((stage, idx) => {
                            const IconComponent = STAGE_ICONS[stage.icon] || LogOut;
                            return (
                                <TabsTrigger
                                    key={stage.id}
                                    value={stage.id}
                                    className="px-4 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm font-semibold transition-all flex items-center gap-2"
                                >
                                    <IconComponent className="h-4 w-4" />
                                    <span className="hidden sm:inline">{stage.title}</span>
                                    <span className="sm:hidden">{idx + 1}</span>
                                    <Badge variant="secondary" className="ml-1 bg-slate-200 dark:bg-slate-700 text-[10px]">
                                        {stage.tasks.length}
                                    </Badge>
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>
                </div>

                {stages.map(stage => {
                    const IconComponent = STAGE_ICONS[stage.icon] || LogOut;
                    return (
                        <TabsContent key={stage.id} value={stage.id} className="mt-6 space-y-6">
                            <Card className="shadow-premium border-slate-200/60 overflow-hidden">
                                <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-800/50">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-start gap-4">
                                            <div className="h-12 w-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                                                <IconComponent className="h-6 w-6" />
                                            </div>
                                            <div className="space-y-1">
                                                <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-100">{stage.title}</CardTitle>
                                                <CardDescription>{stage.description}</CardDescription>
                                            </div>
                                        </div>
                                        <Button onClick={() => addTask(stage.id)} size="sm" className="bg-rose-600 hover:bg-rose-700">
                                            <Plus className="h-4 w-4 mr-2" /> Таск нэмэх
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="space-y-4">
                                        {stage.tasks.length === 0 ? (
                                            <div className="py-12 text-center border-2 border-dashed rounded-2xl border-slate-100 text-slate-400">
                                                Таск нэмээгүй байна.
                                            </div>
                                        ) : (
                                            stage.tasks.map((task, idx) => (
                                                <div
                                                    key={task.id}
                                                    className="group flex items-start gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
                                                >
                                                    <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 font-bold text-slate-500 text-xs">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm mb-1">{task.title}</h4>
                                                        {task.description && <p className="text-xs text-slate-500 line-clamp-2">{task.description}</p>}
                                                        {task.policyId && (
                                                            <div className="mt-1 flex items-center gap-1">
                                                                <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-5 font-medium text-emerald-600 border-emerald-200 bg-emerald-50">
                                                                    <FileText className="h-2.5 w-2.5" />
                                                                    {policies?.find((p: any) => p.id === task.policyId)?.title || 'Холбоотой журам'}
                                                                </Badge>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600" onClick={() => editTask(stage.id, task)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => deleteTask(stage.id, task.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    );
                })}
            </Tabs>

            {editingTask && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <Card className="w-full max-w-md shadow-2xl rounded-2xl border-none">
                        <CardHeader>
                            <CardTitle>{editingTask.taskId ? 'Таск засах' : 'Шинэ таск нэмэх'}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="task-title">Таскын нэр</Label>
                                <Input
                                    id="task-title"
                                    value={editingTask.title}
                                    onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
                                    placeholder="Жишээ: Эд хөрөнгө буцаах"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="task-desc">Тайлбар (заавал биш)</Label>
                                <Input
                                    id="task-desc"
                                    value={editingTask.description}
                                    onChange={e => setEditingTask({ ...editingTask, description: e.target.value })}
                                    placeholder="Жишээ: Компьютер, утас, түлхүүр..."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Холбоотой журам (Сонгох шаардлагагүй)</Label>
                                <Select
                                    value={editingTask.policyId || "none"}
                                    onValueChange={(val) => setEditingTask({ ...editingTask, policyId: val === "none" ? undefined : val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Журам сонгох..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none" className="text-slate-500 italic">Журам сонгохгүй</SelectItem>
                                        {policies?.map((policy: any) => (
                                            <SelectItem key={policy.id} value={policy.id}>
                                                {policy.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button variant="outline" className="flex-1" onClick={() => setEditingTask(null)}>Цуцлах</Button>
                                <Button className="flex-1 bg-rose-600 hover:bg-rose-700" onClick={saveTask}>Хадгалах</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
