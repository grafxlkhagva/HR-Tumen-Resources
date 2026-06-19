'use client';

import * as React from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
    AppDialog,
    AppDialogContent,
    AppDialogHeader,
    AppDialogTitle,
    AppDialogDescription,
    AppDialogBody,
    AppDialogFooter,
    FormFieldWrapper,
    FormRow,
} from '@/components/patterns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { createHseDoc, updateHseDoc } from '../services/hse-service';
import {
    HSE_COLLECTIONS,
    INCIDENT_SEVERITY,
    INCIDENT_PROBABILITY,
    FINAL_RISK_LEVELS,
    ICAM_ENV_CONDITIONS,
    ICAM_EQUIPMENT,
    ICAM_ORG_FACTORS,
    ICAM_HUMAN_FACTORS,
    ICAM_SUBSTANDARD_ACTS,
    ICAM_RULES,
    type IncidentInvestigation,
    type IncidentSeverity,
    type FinalRiskLevel,
    type InvestigationPerson,
    type InvestigationTeamMember,
    type CorrectiveAction,
} from '../types';
import { CheckGroup } from './check-group';
import { PhotoGrid } from './photo-grid';

const todayStr = () => new Date().toISOString().slice(0, 10);
const emptyPerson = (): InvestigationPerson => ({ ner: '' });
const emptyMember = (): InvestigationTeamMember => ({ ner: '' });
const emptyAction = (): CorrectiveAction => ({ argaHemjee: '' });

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="border-b pb-1 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
            {children}
        </h3>
    );
}

export function InvestigationForm({
    open,
    onOpenChange,
    investigation,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    investigation?: IncidentInvestigation | null;
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [saving, setSaving] = React.useState(false);

    // 1. Дэлгэрэнгүй мэдээлэл
    const [dugaar, setDugaar] = React.useState('');
    const [ajliinNer, setAjliinNer] = React.useState('');
    const [ognoo, setOgnoo] = React.useState(todayStr());
    const [tsag, setTsag] = React.useState('');
    const [hariutsahAjiltan, setHariutsahAjiltan] = React.useState('');
    const [bairshil, setBairshil] = React.useState('');
    const [tovch, setTovch] = React.useState('');
    const [hunMedeelel, setHunMedeelel] = React.useState<InvestigationPerson[]>([emptyPerson()]);
    const [sudalgaaBag, setSudalgaaBag] = React.useState<InvestigationTeamMember[]>([emptyMember()]);
    // Хохирол
    const [gemtelTodorhoiloolt, setGemtelTodorhoiloolt] = React.useState('');
    const [baigaliHohirol, setBaigaliHohirol] = React.useState('');
    const [omchEvdrel, setOmchEvdrel] = React.useState('');
    const [oronNutagHohirol, setOronNutagHohirol] = React.useState('');
    const [tohioldoTodorhoiloolt, setTohioldoTodorhoiloolt] = React.useState('');
    const [subject, setSubject] = React.useState('');
    const [hiisenSurgalt, setHiisenSurgalt] = React.useState('');
    const [gazarArgaHemjee, setGazarArgaHemjee] = React.useState('');
    // 2. Шалтгаан болон үр дагавар
    const [suurShaltgaan, setSuurShaltgaan] = React.useState('');
    const [shuudShaltgaan, setShuudShaltgaan] = React.useState('');
    const [garsanUrDagavar, setGarsanUrDagavar] = React.useState<IncidentSeverity | ''>('');
    const [garchBolohUrDagavar, setGarchBolohUrDagavar] = React.useState<IncidentSeverity | ''>('');
    const [tohioldohMagadlal, setTohioldohMagadlal] = React.useState('');
    const [garchBolohErsdel, setGarchBolohErsdel] = React.useState<FinalRiskLevel | ''>('');
    // 3. ICAM
    const [icamEnv, setIcamEnv] = React.useState<string[]>([]);
    const [icamEquipment, setIcamEquipment] = React.useState<string[]>([]);
    const [icamOrg, setIcamOrg] = React.useState<string[]>([]);
    const [icamHuman, setIcamHuman] = React.useState<string[]>([]);
    const [icamActs, setIcamActs] = React.useState<string[]>([]);
    const [icamRules, setIcamRules] = React.useState<string[]>([]);
    // 4. Арга хэмжээ
    const [argaHemjeeNuud, setArgaHemjeeNuud] = React.useState<CorrectiveAction[]>([emptyAction()]);
    const [batalgaaNer, setBatalgaaNer] = React.useState('');
    const [zurguud, setZurguud] = React.useState<string[]>([]);

    React.useEffect(() => {
        if (!open) return;
        const v = investigation;
        setDugaar(v?.dugaar || '');
        setAjliinNer(v?.ajliinNer || '');
        setOgnoo(v?.ognoo || todayStr());
        setTsag(v?.tsag || '');
        setHariutsahAjiltan(v?.hariutsahAjiltan || '');
        setBairshil(v?.bairshil || '');
        setTovch(v?.tovch || '');
        setHunMedeelel(v?.hunMedeelel?.length ? v.hunMedeelel : [emptyPerson()]);
        setSudalgaaBag(v?.sudalgaaBag?.length ? v.sudalgaaBag : [emptyMember()]);
        setGemtelTodorhoiloolt(v?.gemtelTodorhoiloolt || '');
        setBaigaliHohirol(v?.baigaliHohirol || '');
        setOmchEvdrel(v?.omchEvdrel || '');
        setOronNutagHohirol(v?.oronNutagHohirol || '');
        setTohioldoTodorhoiloolt(v?.tohioldoTodorhoiloolt || '');
        setSubject(v?.subject || '');
        setHiisenSurgalt(v?.hiisenSurgalt || '');
        setGazarArgaHemjee(v?.gazarArgaHemjee || '');
        setSuurShaltgaan(v?.suurShaltgaan || '');
        setShuudShaltgaan(v?.shuudShaltgaan || '');
        setGarsanUrDagavar(v?.garsanUrDagavar || '');
        setGarchBolohUrDagavar(v?.garchBolohUrDagavar || '');
        setTohioldohMagadlal(v?.tohioldohMagadlal || '');
        setGarchBolohErsdel(v?.garchBolohErsdel || '');
        setIcamEnv(v?.icamEnv || []);
        setIcamEquipment(v?.icamEquipment || []);
        setIcamOrg(v?.icamOrg || []);
        setIcamHuman(v?.icamHuman || []);
        setIcamActs(v?.icamActs || []);
        setIcamRules(v?.icamRules || []);
        setArgaHemjeeNuud(v?.argaHemjeeNuud?.length ? v.argaHemjeeNuud : [emptyAction()]);
        setBatalgaaNer(v?.batalgaaNer || '');
        setZurguud(v?.zurguud || []);
    }, [open, investigation]);

    const updatePerson = (i: number, patch: Partial<InvestigationPerson>) =>
        setHunMedeelel((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
    const updateMember = (i: number, patch: Partial<InvestigationTeamMember>) =>
        setSudalgaaBag((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
    const updateAction = (i: number, patch: Partial<CorrectiveAction>) =>
        setArgaHemjeeNuud((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));

    const handleSave = async () => {
        if (!firestore) return;
        if (!tovch.trim() && !ajliinNer.trim()) {
            toast({ title: 'Тохиолдлын товч мэдээлэл оруулна уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                dugaar: dugaar.trim() || null,
                ajliinNer: ajliinNer.trim() || null,
                ognoo: ognoo || null,
                tsag: tsag || null,
                hariutsahAjiltan: hariutsahAjiltan.trim() || null,
                bairshil: bairshil.trim() || null,
                tovch: tovch.trim() || null,
                hunMedeelel: hunMedeelel.filter((p) => (p.ner || '').trim()),
                sudalgaaBag: sudalgaaBag.filter((m) => (m.ner || '').trim()),
                gemtelTodorhoiloolt: gemtelTodorhoiloolt.trim() || null,
                baigaliHohirol: baigaliHohirol.trim() || null,
                omchEvdrel: omchEvdrel.trim() || null,
                oronNutagHohirol: oronNutagHohirol.trim() || null,
                tohioldoTodorhoiloolt: tohioldoTodorhoiloolt.trim() || null,
                subject: subject.trim() || null,
                hiisenSurgalt: hiisenSurgalt.trim() || null,
                gazarArgaHemjee: gazarArgaHemjee.trim() || null,
                suurShaltgaan: suurShaltgaan.trim() || null,
                shuudShaltgaan: shuudShaltgaan.trim() || null,
                garsanUrDagavar: garsanUrDagavar || null,
                garchBolohUrDagavar: garchBolohUrDagavar || null,
                tohioldohMagadlal: tohioldohMagadlal || null,
                garchBolohErsdel: garchBolohErsdel || null,
                icamEnv,
                icamEquipment,
                icamOrg,
                icamHuman,
                icamActs,
                icamRules,
                argaHemjeeNuud: argaHemjeeNuud.filter((a) => (a.argaHemjee || '').trim()),
                batalgaaNer: batalgaaNer.trim() || null,
                zurguud,
            };
            if (investigation) {
                await updateHseDoc(
                    firestore,
                    HSE_COLLECTIONS.incidentInvestigations,
                    investigation.id,
                    payload,
                );
                toast({ title: 'Тайлан шинэчлэгдлээ.' });
            } else {
                await createHseDoc(firestore, HSE_COLLECTIONS.incidentInvestigations, payload);
                toast({ title: 'Тайлан бүртгэгдлээ.' });
            }
            onOpenChange(false);
        } catch {
            toast({ title: 'Хадгалахад алдаа гарлаа.', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppDialog open={open} onOpenChange={onOpenChange}>
            <AppDialogContent size="lg">
                <AppDialogHeader>
                    <AppDialogTitle>
                        {investigation ? 'Тайлан засах' : 'Аюултай тохиолдлын судалгааны тайлан'}
                    </AppDialogTitle>
                    <AppDialogDescription>TT-HSE-03.00.03</AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-5">
                    {/* 1. ДЭЛГЭРЭНГҮЙ МЭДЭЭЛЭЛ */}
                    <SectionTitle>1. Дэлгэрэнгүй мэдээлэл</SectionTitle>
                    <FormRow columns={2}>
                        <FormFieldWrapper label="№">
                            <Input value={dugaar} onChange={(e) => setDugaar(e.target.value)} />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Ажлын нэр">
                            <Input value={ajliinNer} onChange={(e) => setAjliinNer(e.target.value)} />
                        </FormFieldWrapper>
                    </FormRow>
                    <FormRow columns={3}>
                        <FormFieldWrapper label="Огноо">
                            <Input type="date" value={ognoo} onChange={(e) => setOgnoo(e.target.value)} />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Цаг">
                            <Input type="time" value={tsag} onChange={(e) => setTsag(e.target.value)} />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Хариуцсан ажилтан">
                            <Input
                                value={hariutsahAjiltan}
                                onChange={(e) => setHariutsahAjiltan(e.target.value)}
                            />
                        </FormFieldWrapper>
                    </FormRow>
                    <FormFieldWrapper label="Байршил">
                        <Input value={bairshil} onChange={(e) => setBairshil(e.target.value)} />
                    </FormFieldWrapper>
                    <FormFieldWrapper
                        label="Товч"
                        hint="Юу болсон тухай товч тайлбар (хаана, хэзээ)."
                    >
                        <Textarea value={tovch} onChange={(e) => setTovch(e.target.value)} rows={3} />
                    </FormFieldWrapper>

                    {/* 1.1 Хүний мэдээлэл */}
                    <FormFieldWrapper label="1.1 Хүний мэдээлэл (осолд өртсөн хүн)">
                        <div className="space-y-3">
                            {hunMedeelel.map((p, i) => (
                                <div key={i} className="space-y-2 rounded-md border p-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-micro text-muted-foreground">
                                            Хүн #{i + 1}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            disabled={hunMedeelel.length === 1}
                                            onClick={() =>
                                                setHunMedeelel((prev) =>
                                                    prev.filter((_, idx) => idx !== i),
                                                )
                                            }
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <FormRow columns={2}>
                                        <Input
                                            value={p.ner || ''}
                                            onChange={(e) => updatePerson(i, { ner: e.target.value })}
                                            placeholder="Овог нэр"
                                        />
                                        <Input
                                            value={p.kompani || ''}
                                            onChange={(e) => updatePerson(i, { kompani: e.target.value })}
                                            placeholder="Компани"
                                        />
                                    </FormRow>
                                    <FormRow columns={2}>
                                        <Input
                                            value={p.albanTushaal || ''}
                                            onChange={(e) =>
                                                updatePerson(i, { albanTushaal: e.target.value })
                                            }
                                            placeholder="Албан тушаал"
                                        />
                                        <Input
                                            value={p.ortsonBaidal || ''}
                                            onChange={(e) =>
                                                updatePerson(i, { ortsonBaidal: e.target.value })
                                            }
                                            placeholder="Өртсөн байдал"
                                        />
                                    </FormRow>
                                    <FormRow columns={2}>
                                        <Input
                                            value={p.nas || ''}
                                            onChange={(e) => updatePerson(i, { nas: e.target.value })}
                                            placeholder="Нас"
                                        />
                                        <Input
                                            value={p.ajilSan || ''}
                                            onChange={(e) => updatePerson(i, { ajilSan: e.target.value })}
                                            placeholder="Ажилласан газар, жил"
                                        />
                                    </FormRow>
                                </div>
                            ))}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setHunMedeelel((prev) => [...prev, emptyPerson()])}
                            >
                                <Plus className="mr-1.5 h-4 w-4" />
                                Хүн нэмэх
                            </Button>
                        </div>
                    </FormFieldWrapper>

                    {/* 1.2 Судалгааны баг */}
                    <FormFieldWrapper label="1.2 Судалгааны баг">
                        <div className="space-y-3">
                            {sudalgaaBag.map((m, i) => (
                                <div key={i} className="space-y-2 rounded-md border p-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-micro text-muted-foreground">
                                            Гишүүн #{i + 1}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            disabled={sudalgaaBag.length === 1}
                                            onClick={() =>
                                                setSudalgaaBag((prev) =>
                                                    prev.filter((_, idx) => idx !== i),
                                                )
                                            }
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <FormRow columns={2}>
                                        <Input
                                            value={m.ner || ''}
                                            onChange={(e) => updateMember(i, { ner: e.target.value })}
                                            placeholder="Овог нэр"
                                        />
                                        <Input
                                            value={m.albanTushaal || ''}
                                            onChange={(e) =>
                                                updateMember(i, { albanTushaal: e.target.value })
                                            }
                                            placeholder="Албан тушаал"
                                        />
                                    </FormRow>
                                    <FormRow columns={2}>
                                        <Input
                                            value={m.bagBurelduuleh || ''}
                                            onChange={(e) =>
                                                updateMember(i, { bagBurelduuleh: e.target.value })
                                            }
                                            placeholder="Баг бүрэлдэхүүн (үүрэг)"
                                        />
                                        <Input
                                            value={m.kompani || ''}
                                            onChange={(e) => updateMember(i, { kompani: e.target.value })}
                                            placeholder="Компани"
                                        />
                                    </FormRow>
                                </div>
                            ))}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSudalgaaBag((prev) => [...prev, emptyMember()])}
                            >
                                <Plus className="mr-1.5 h-4 w-4" />
                                Гишүүн нэмэх
                            </Button>
                        </div>
                    </FormFieldWrapper>

                    {/* Хохирол */}
                    <FormFieldWrapper label="Гэмтлийн тодорхойлолт">
                        <Textarea
                            value={gemtelTodorhoiloolt}
                            onChange={(e) => setGemtelTodorhoiloolt(e.target.value)}
                            rows={2}
                        />
                    </FormFieldWrapper>
                    <FormRow columns={2}>
                        <FormFieldWrapper label="Байгаль / Орчны хохирол">
                            <Textarea
                                value={baigaliHohirol}
                                onChange={(e) => setBaigaliHohirol(e.target.value)}
                                rows={2}
                            />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Өмчийн эвдрэл">
                            <Textarea
                                value={omchEvdrel}
                                onChange={(e) => setOmchEvdrel(e.target.value)}
                                rows={2}
                            />
                        </FormFieldWrapper>
                    </FormRow>
                    <FormFieldWrapper label="Орон нутгийн иргэн, мал амьтны хохирол">
                        <Textarea
                            value={oronNutagHohirol}
                            onChange={(e) => setOronNutagHohirol(e.target.value)}
                            rows={2}
                        />
                    </FormFieldWrapper>
                    <FormFieldWrapper label="Аюултай тохиолдлын тодорхойлолт">
                        <Textarea
                            value={tohioldoTodorhoiloolt}
                            onChange={(e) => setTohioldoTodorhoiloolt(e.target.value)}
                            rows={2}
                        />
                    </FormFieldWrapper>
                    <FormFieldWrapper label="Субъект">
                        <Textarea value={subject} onChange={(e) => setSubject(e.target.value)} rows={2} />
                    </FormFieldWrapper>
                    <FormFieldWrapper label="Хийдсэн сургалт">
                        <Textarea
                            value={hiisenSurgalt}
                            onChange={(e) => setHiisenSurgalt(e.target.value)}
                            rows={2}
                        />
                    </FormFieldWrapper>
                    <FormFieldWrapper label="Газар дээр нь авсан арга хэмжээ">
                        <Textarea
                            value={gazarArgaHemjee}
                            onChange={(e) => setGazarArgaHemjee(e.target.value)}
                            rows={2}
                        />
                    </FormFieldWrapper>

                    {/* 2. ШАЛТГААН БОЛОН ҮР ДАГАВАР */}
                    <SectionTitle>2. Аюултай тохиолдлын шалтгаан болон үр дагавар</SectionTitle>
                    <FormFieldWrapper label="Суурь шалтгаан">
                        <Textarea
                            value={suurShaltgaan}
                            onChange={(e) => setSuurShaltgaan(e.target.value)}
                            rows={2}
                        />
                    </FormFieldWrapper>
                    <FormFieldWrapper label="Шууд шалтгаан">
                        <Textarea
                            value={shuudShaltgaan}
                            onChange={(e) => setShuudShaltgaan(e.target.value)}
                            rows={2}
                        />
                    </FormFieldWrapper>
                    <FormRow columns={2}>
                        <FormFieldWrapper label="Гарсан үр дагавар">
                            <Select
                                value={garsanUrDagavar}
                                onValueChange={(v) => setGarsanUrDagavar(v as IncidentSeverity)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Сонгох" />
                                </SelectTrigger>
                                <SelectContent>
                                    {INCIDENT_SEVERITY.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Гарч болох үр дагавар">
                            <Select
                                value={garchBolohUrDagavar}
                                onValueChange={(v) => setGarchBolohUrDagavar(v as IncidentSeverity)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Сонгох" />
                                </SelectTrigger>
                                <SelectContent>
                                    {INCIDENT_SEVERITY.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormFieldWrapper>
                    </FormRow>
                    <FormRow columns={2}>
                        <FormFieldWrapper label="Тохиолдлын магадлал">
                            <Select
                                value={tohioldohMagadlal}
                                onValueChange={setTohioldohMagadlal}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Сонгох" />
                                </SelectTrigger>
                                <SelectContent>
                                    {INCIDENT_PROBABILITY.map((p) => (
                                        <SelectItem key={p} value={p}>
                                            {p}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormFieldWrapper>
                        <FormFieldWrapper
                            label="Гарч болох эрсдэл"
                            hint="Эрсдэлийн үнэлгээний матриц"
                        >
                            <Select
                                value={garchBolohErsdel}
                                onValueChange={(v) => setGarchBolohErsdel(v as FinalRiskLevel)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Сонгох" />
                                </SelectTrigger>
                                <SelectContent>
                                    {FINAL_RISK_LEVELS.map((r) => (
                                        <SelectItem key={r} value={r}>
                                            {r}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormFieldWrapper>
                    </FormRow>

                    {/* 3. ICAM АРГАЧЛАЛ */}
                    <SectionTitle>3. ICAM аргачлал — нөлөөлсөн хүчин зүйлс</SectionTitle>
                    <FormFieldWrapper label="Орчны болон ажлын байрны нөхцөл">
                        <CheckGroup options={ICAM_ENV_CONDITIONS} value={icamEnv} onChange={setIcamEnv} />
                    </FormFieldWrapper>
                    <FormFieldWrapper label="Тоног төхөөрөмж / Материал">
                        <CheckGroup
                            options={ICAM_EQUIPMENT}
                            value={icamEquipment}
                            onChange={setIcamEquipment}
                        />
                    </FormFieldWrapper>
                    <FormFieldWrapper label="Байгууллагын хүчин зүйл">
                        <CheckGroup options={ICAM_ORG_FACTORS} value={icamOrg} onChange={setIcamOrg} />
                    </FormFieldWrapper>
                    <FormFieldWrapper label="Хүний хүчин зүйл">
                        <CheckGroup options={ICAM_HUMAN_FACTORS} value={icamHuman} onChange={setIcamHuman} />
                    </FormFieldWrapper>
                    <FormFieldWrapper label="Стандарт бус үйлдэл">
                        <CheckGroup
                            options={ICAM_SUBSTANDARD_ACTS}
                            value={icamActs}
                            onChange={setIcamActs}
                        />
                    </FormFieldWrapper>
                    <FormFieldWrapper label="Дүрэм журам">
                        <CheckGroup options={ICAM_RULES} value={icamRules} onChange={setIcamRules} />
                    </FormFieldWrapper>

                    {/* 4. СЭРГИЙЛЭХ / ЗАЛРУУЛАХ АРГА ХЭМЖЭЭ */}
                    <SectionTitle>4. Сэргийлэх / залруулах арга хэмжээ</SectionTitle>
                    <div className="space-y-3">
                        {argaHemjeeNuud.map((a, i) => (
                            <div key={i} className="space-y-2 rounded-md border p-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-micro text-muted-foreground">
                                        Арга хэмжээ #{i + 1}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        disabled={argaHemjeeNuud.length === 1}
                                        onClick={() =>
                                            setArgaHemjeeNuud((prev) =>
                                                prev.filter((_, idx) => idx !== i),
                                            )
                                        }
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Input
                                    value={a.noloolsonHuchin || ''}
                                    onChange={(e) => updateAction(i, { noloolsonHuchin: e.target.value })}
                                    placeholder="Нөлөөлсөн хүчин зүйл"
                                />
                                <Textarea
                                    value={a.argaHemjee || ''}
                                    onChange={(e) => updateAction(i, { argaHemjee: e.target.value })}
                                    placeholder="Дахин гарахаас сэргийлэх арга хэмжээ"
                                    rows={2}
                                />
                                <FormRow columns={3}>
                                    <Input
                                        value={a.hariutsah || ''}
                                        onChange={(e) => updateAction(i, { hariutsah: e.target.value })}
                                        placeholder="Хэн хариуцах"
                                    />
                                    <Input
                                        value={a.hugatsaa || ''}
                                        onChange={(e) => updateAction(i, { hugatsaa: e.target.value })}
                                        placeholder="Хэзээ хийх"
                                    />
                                    <Input
                                        type="date"
                                        value={a.duussanOgnoo || ''}
                                        onChange={(e) => updateAction(i, { duussanOgnoo: e.target.value })}
                                    />
                                </FormRow>
                            </div>
                        ))}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setArgaHemjeeNuud((prev) => [...prev, emptyAction()])}
                        >
                            <Plus className="mr-1.5 h-4 w-4" />
                            Арга хэмжээ нэмэх
                        </Button>
                    </div>

                    <FormFieldWrapper label="Тайланг баталгаажуулсан (овог, нэр)">
                        <Input value={batalgaaNer} onChange={(e) => setBatalgaaNer(e.target.value)} />
                    </FormFieldWrapper>
                    <FormFieldWrapper label="Зураг / будуувч / гар зураг">
                        <PhotoGrid value={zurguud} onChange={setZurguud} folder="incidents" />
                    </FormFieldWrapper>
                </AppDialogBody>
                <AppDialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        Болих
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Хадгалах
                    </Button>
                </AppDialogFooter>
            </AppDialogContent>
        </AppDialog>
    );
}
