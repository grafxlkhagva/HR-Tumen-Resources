'use client';

import * as React from 'react';
import { useDoc, useMemoFirebase, tenantDoc, tenantEmployeeSubdoc, setDocumentNonBlocking } from '@/firebase';
import { initializeFirebase } from '@/firebase';
import { getAuth } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Zap, Check, X, RefreshCw, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NegeAiIcon } from '@/components/icons/nege-ai-icon';

// ─── Types ───────────────────────────────────────────────────────────────────

import type {
    Skill, SkillLevel, SkillsDoc,
    AiAssessmentDoc, AiSkillSuggestion, SkillCategory,
} from './skills-types';
export type { Skill, SkillLevel } from './skills-types';

const CATEGORY_LABEL: Record<SkillCategory, string> = {
    language: 'Гадаад хэл',
    specialization: 'Мэргэшил',
    technical: 'Техникийн',
    soft: 'Soft skill',
    other: 'Бусад',
};

// ─── Constants ───────────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<SkillLevel, { label: string; color: string }> = {
    beginner:     { label: 'Анхан',     color: 'text-muted-foreground' },
    intermediate: { label: 'Дунд',      color: 'text-blue-600' },
    advanced:     { label: 'Дэвшилтэт', color: 'text-violet-600' },
    expert:       { label: 'Мэргэжлийн', color: 'text-amber-600' },
};

const LEVEL_BAR: Record<SkillLevel, number> = {
    beginner: 25, intermediate: 50, advanced: 75, expert: 100,
};

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptySkills({ onAdd }: { onAdd: () => void }) {
    return (
        <div className="flex flex-col items-center py-8 gap-2">
            <p className="text-caption text-foreground">Ур чадвар бүртгэлгүй байна</p>
            <p className="text-micro text-muted-foreground">Энэ ажилтны ур чадваруудыг нэмж эхэлнэ үү</p>
            <Button size="sm" variant="outline" onClick={onAdd} className="h-8 text-caption mt-1">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Ур чадвар нэмэх
            </Button>
        </div>
    );
}

// ─── Skill row ───────────────────────────────────────────────────────────────

function SkillRow({ skill, onEdit, onDelete }: { skill: Skill; onEdit: () => void; onDelete: () => void }) {
    const cfg = LEVEL_CONFIG[skill.level];
    const bar = LEVEL_BAR[skill.level];

    const barColor: Record<SkillLevel, string> = {
        beginner:     'bg-slate-400',
        intermediate: 'bg-blue-500',
        advanced:     'bg-violet-500',
        expert:       'bg-amber-500',
    };

    return (
        <div className="group flex items-center gap-3 py-2 hover:bg-muted/30 px-2 -mx-2 rounded-md transition-colors">
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                    <span className="text-caption-medium text-foreground truncate">{skill.name}</span>
                    <span className={cn('text-micro shrink-0', cfg.color)}>{cfg.label}</span>
                </div>
                <div className="h-1 w-32 rounded-full bg-muted overflow-hidden mt-1">
                    <div
                        className={cn('h-full rounded-full transition-all', barColor[skill.level])}
                        style={{ width: `${bar}%` }}
                    />
                </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}>
                    <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={onDelete}>
                    <Trash2 className="h-3 w-3" />
                </Button>
            </div>
        </div>
    );
}

// ─── Add / Edit dialog ───────────────────────────────────────────────────────

interface SkillDialogProps {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    initial?: Skill;
    onSave: (skill: Omit<Skill, 'id'>) => void;
}

function SkillDialog({ open, onOpenChange, initial, onSave }: SkillDialogProps) {
    const [name, setName] = React.useState('');
    const [level, setLevel] = React.useState<SkillLevel>('intermediate');
    const [category, setCategory] = React.useState('');

    React.useEffect(() => {
        if (open) {
            setName(initial?.name ?? '');
            setLevel(initial?.level ?? 'intermediate');
            setCategory(initial?.category ?? '');
        }
    }, [open, initial]);

    const handleSave = () => {
        if (!name.trim()) return;
        onSave({ name: name.trim(), level, category: category.trim() || undefined });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>{initial ? 'Ур чадвар засах' : 'Ур чадвар нэмэх'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <label className="text-caption font-medium text-foreground">Ур чадварын нэр *</label>
                        <Input
                            placeholder="Жишээ нь: Excel, Англи хэл, Python..."
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                            autoFocus
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-caption font-medium text-foreground">Түвшин</label>
                        <Select value={level} onValueChange={v => setLevel(v as SkillLevel)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(Object.entries(LEVEL_CONFIG) as [SkillLevel, { label: string }][]).map(([val, { label }]) => (
                                    <SelectItem key={val} value={val}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-caption font-medium text-foreground">Ангилал <span className="text-muted-foreground font-normal">(заавал биш)</span></label>
                        <Input
                            placeholder="Жишээ нь: Програмчлал, Хэл, Менежмент..."
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Болих</Button>
                    <Button onClick={handleSave} disabled={!name.trim()}>Хадгалах</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── AI assessment helpers ───────────────────────────────────────────────────

const AI_THRESHOLD = 80;

async function getAuthToken(): Promise<string | null> {
    try {
        const { firebaseApp } = initializeFirebase();
        const auth = getAuth(firebaseApp);
        return (await auth.currentUser?.getIdToken()) ?? null;
    } catch { return null; }
}

interface SuggestionRowProps {
    suggestion: AiSkillSuggestion;
    onAccept: () => void;
    onDismiss: () => void;
    busy?: boolean;
}

function SuggestionRow({ suggestion, onAccept, onDismiss, busy }: SuggestionRowProps) {
    const cfg = LEVEL_CONFIG[suggestion.level];
    return (
        <div className="group flex items-start gap-3 py-3 px-2 -mx-2 rounded-lg hover:bg-muted/40 transition-colors">
            <Sparkles className="h-3.5 w-3.5 text-violet-500 mt-1 shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-menu font-medium text-foreground">{suggestion.name}</span>
                    <Badge variant="outline" className={cn('text-micro px-1.5 py-0 h-4', cfg.color)}>{cfg.label}</Badge>
                    <span className="text-micro text-muted-foreground">· {CATEGORY_LABEL[suggestion.category]}</span>
                    <span className="text-micro text-muted-foreground">· итгэл {Math.round(suggestion.confidence * 100)}%</span>
                </div>
                {suggestion.evidence && (
                    <p className="text-caption text-muted-foreground mt-0.5 leading-snug">{suggestion.evidence}</p>
                )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={onAccept} disabled={busy} title="Зөвшөөрөх">
                    <Check className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onDismiss} disabled={busy} title="Үгүйсгэх">
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function SkillsTabContent({ employeeId }: { employeeId: string }) {
    const { toast } = useToast();
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [editSkill, setEditSkill] = React.useState<Skill | null>(null);
    const [isAssessing, setIsAssessing] = React.useState(false);
    const [busySuggestionId, setBusySuggestionId] = React.useState<string | null>(null);
    const autoFiredRef = React.useRef(false);

    const skillsDocRef = useMemoFirebase(
        ({ firestore, companyPath }) =>
            firestore && employeeId ? tenantEmployeeSubdoc(firestore, companyPath, employeeId, 'skills', 'data') : null,
        [employeeId]
    );
    const aiAssessmentRef = useMemoFirebase(
        ({ firestore, companyPath }) =>
            firestore && employeeId ? tenantEmployeeSubdoc(firestore, companyPath, employeeId, 'skills', 'ai_assessment') : null,
        [employeeId]
    );
    const employeeRef = useMemoFirebase(
        ({ firestore, companyPath }) =>
            firestore && employeeId ? tenantDoc(firestore, companyPath, 'employees', employeeId) : null,
        [employeeId]
    );

    const { data: skillsDoc, isLoading } = useDoc<SkillsDoc>(skillsDocRef as any);
    const { data: aiDoc, isLoading: aiDocLoading } = useDoc<AiAssessmentDoc>(aiAssessmentRef as any);
    const { data: employee } = useDoc<{ questionnaireCompletion?: number }>(employeeRef as any);

    const skills: Skill[] = skillsDoc?.items ?? [];
    const completion = Math.round(employee?.questionnaireCompletion ?? 0);
    const meetsThreshold = completion >= AI_THRESHOLD;
    const pendingSuggestions = aiDoc?.status === 'pending' ? (aiDoc.suggestions ?? []) : [];

    const save = React.useCallback((items: Skill[]) => {
        if (!skillsDocRef) return;
        setDocumentNonBlocking(skillsDocRef, { items }, { merge: true });
    }, [skillsDocRef]);

    // accept/dismiss-ийг server route-аар transaction-той хийнэ.
    const callDecision = React.useCallback(async (suggestionIds: string[], action: 'accept' | 'dismiss') => {
        const token = await getAuthToken();
        if (!token) throw new Error('Нэвтрэх эрх байхгүй');
        const res = await fetch('/api/skills/decision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ employeeId, suggestionIds, action }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        return data as { added: number; removed: number; remaining: number };
    }, [employeeId]);

    const runAssessment = React.useCallback(async (force: boolean) => {
        if (!meetsThreshold || isAssessing) return;
        setIsAssessing(true);
        try {
            const token = await getAuthToken();
            if (!token) throw new Error('Нэвтрэх эрх байхгүй');
            const res = await fetch('/api/skills/auto-assess', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ employeeId, force }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
            toast({
                title: data.cached ? 'AI-аас өмнө гаргасан санал' : 'AI санал бэлэн боллоо',
                description: `${data.assessment.suggestions.length} ур чадвар`,
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Алдаа', description: e?.message || 'AI үнэлгээ амжилтгүй' });
        } finally {
            setIsAssessing(false);
        }
    }, [employeeId, meetsThreshold, isAssessing, toast]);

    // Auto-trigger: completion 80%+ ба ai_assessment байхгүй үед нэг л удаа автоматаар дуудна.
    React.useEffect(() => {
        if (autoFiredRef.current) return;
        if (!meetsThreshold) return;
        if (aiDocLoading) return;
        if (!aiDoc) {
            autoFiredRef.current = true;
            void runAssessment(false);
        }
    }, [meetsThreshold, aiDoc, aiDocLoading, runAssessment]);

    const acceptSuggestion = async (s: AiSkillSuggestion) => {
        setBusySuggestionId(s.id);
        try {
            const data = await callDecision([s.id], 'accept');
            toast({ title: data.added ? 'Зөвшөөрөгдлөө' : 'Ур чадвар аль хэдийн бүртгэлтэй байсан' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Алдаа', description: e?.message || 'Зөвшөөрөх амжилтгүй' });
        } finally {
            setBusySuggestionId(null);
        }
    };

    const dismissSuggestion = async (s: AiSkillSuggestion) => {
        setBusySuggestionId(s.id);
        try {
            await callDecision([s.id], 'dismiss');
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Алдаа', description: e?.message || 'Үгүйсгэх амжилтгүй' });
        } finally {
            setBusySuggestionId(null);
        }
    };

    const acceptAll = async () => {
        const ids = pendingSuggestions.map(s => s.id);
        if (ids.length === 0) return;
        try {
            const data = await callDecision(ids, 'accept');
            toast({ title: `${data.added} ур чадвар нэмэгдлээ` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Алдаа', description: e?.message || 'Зөвшөөрөх амжилтгүй' });
        }
    };

    const dismissAll = async () => {
        const ids = pendingSuggestions.map(s => s.id);
        if (ids.length === 0) return;
        try {
            await callDecision(ids, 'dismiss');
            toast({ title: 'AI санал хаагдсан' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Алдаа', description: e?.message || 'Хаах амжилтгүй' });
        }
    };

    const handleAdd = (data: Omit<Skill, 'id'>) => {
        const newSkill: Skill = { ...data, id: crypto.randomUUID(), source: 'manual' };
        save([...skills, newSkill]);
        toast({ title: 'Ур чадвар нэмэгдлээ' });
    };

    const handleEdit = (data: Omit<Skill, 'id'>) => {
        if (!editSkill) return;
        save(skills.map(s => s.id === editSkill.id ? { ...editSkill, ...data } : s));
        toast({ title: 'Хадгалагдлаа' });
        setEditSkill(null);
    };

    const handleDelete = (id: string) => {
        save(skills.filter(s => s.id !== id));
        toast({ title: 'Ур чадвар устгагдлаа' });
    };

    // Group by category
    const grouped = React.useMemo(() => {
        const map = new Map<string, Skill[]>();
        for (const s of skills) {
            const key = s.category || '';
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(s);
        }
        return map;
    }, [skills]);

    const openAdd = () => { setEditSkill(null); setDialogOpen(true); };
    const openEdit = (skill: Skill) => { setEditSkill(skill); setDialogOpen(true); };

    if (isLoading) {
        return <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}</div>;
    }

    return (
        <div className="space-y-4">
            {/* AI banner */}
            {!meetsThreshold ? (
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3">
                    <NegeAiIcon size={18} className="opacity-50 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-caption-medium text-foreground">AI-аар суурь үнэлгээ — анкет {AI_THRESHOLD}% болоход бэлэн болно</p>
                        <p className="text-micro text-muted-foreground">Одоогийн бүрдүүлэлт {completion}%</p>
                    </div>
                </div>
            ) : pendingSuggestions.length > 0 ? (
                <Card className="border-violet-200 bg-violet-50/40">
                    <CardHeader className="pb-2 pt-3 px-4">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <NegeAiIcon size={18} />
                                <CardTitle className="text-sm font-semibold">AI санал ({pendingSuggestions.length})</CardTitle>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost" onClick={dismissAll} className="h-7 text-caption text-muted-foreground">Бүгдийг хаах</Button>
                                <Button size="sm" onClick={acceptAll} className="h-7 text-caption bg-violet-600 hover:bg-violet-700"><Check className="h-3.5 w-3.5 mr-1" />Бүгдийг зөвшөөрөх</Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 pt-1 pb-3">
                        {(aiDoc?.aiStatus === 'fallback_only' || aiDoc?.aiStatus === 'partial_salvaged') && (
                            <div className="text-caption text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5 mb-2">
                                {aiDoc.aiStatus === 'fallback_only'
                                    ? 'AI бүрэн ажиллаагүй — зөвхөн анкетын деривативт суурилсан санал гарсан'
                                    : 'AI хариу хэсэгчлэн салвагдсан — зарим санал бүрэн биш байж болзошгүй'}
                            </div>
                        )}
                        <div>
                            {pendingSuggestions.map(s => (
                                <SuggestionRow
                                    key={s.id}
                                    suggestion={s}
                                    onAccept={() => acceptSuggestion(s)}
                                    onDismiss={() => dismissSuggestion(s)}
                                    busy={busySuggestionId === s.id}
                                />
                            ))}
                        </div>
                        {aiDoc?.lastRunAt && (
                            <p className="text-micro text-muted-foreground mt-2">Сүүлд үүсгэсэн: {new Date(aiDoc.lastRunAt).toLocaleString('mn-MN')}</p>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50/30 px-4 py-3">
                    <NegeAiIcon size={18} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-caption-medium text-foreground">AI-аар суурь үнэлгээ хийе</p>
                        <p className="text-micro text-muted-foreground">Анкетын мэдээллээс ур чадварын санал гаргана</p>
                    </div>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button size="sm" onClick={() => runAssessment(true)} disabled={isAssessing} className="h-7 text-caption bg-violet-600 hover:bg-violet-700">
                                    {isAssessing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                                    {aiDoc ? 'Дахин үнэлэх' : 'Үнэлгээ хийх'}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-caption">Анкетын одоогийн мэдээллээр AI-аас санал авах</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            )}

            {/* Section header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-caption-medium text-foreground">Ур чадвар</h3>
                    <p className="text-micro text-muted-foreground">Нийт {skills.length} бүртгэгдсэн</p>
                </div>
                {skills.length > 0 && (
                    <Button size="sm" variant="outline" onClick={openAdd} className="h-8 text-caption">
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Нэмэх
                    </Button>
                )}
            </div>

            {skills.length === 0 ? (
                <EmptySkills onAdd={openAdd} />
            ) : (
                <div className="space-y-3">
                    {Array.from(grouped.entries()).map(([cat, items]) => (
                        <Card key={cat || '__none__'} className="rounded-lg border">
                            {cat && (
                                <CardHeader className="pb-1 pt-3 px-4">
                                    <CardTitle className="text-caption-medium text-foreground">{cat}</CardTitle>
                                </CardHeader>
                            )}
                            <CardContent className={cn('px-4', cat ? 'pt-1 pb-3' : 'py-3')}>
                                {items.map(skill => (
                                    <SkillRow
                                        key={skill.id}
                                        skill={skill}
                                        onEdit={() => openEdit(skill)}
                                        onDelete={() => handleDelete(skill.id)}
                                    />
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <SkillDialog
                open={dialogOpen}
                onOpenChange={open => { setDialogOpen(open); if (!open) setEditSkill(null); }}
                initial={editSkill ?? undefined}
                onSave={editSkill ? handleEdit : handleAdd}
            />
        </div>
    );
}
