'use client';

import * as React from 'react';
import { useDoc, useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save, RotateCcw, Paintbrush, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { hexToHsl } from '@/lib/color-utils';
import { PageHeader } from '@/components/page-header';

interface BrandColor {
    id: string;
    name: string;
    hex: string;
}

interface CompanyBranding {
    brandColors: BrandColor[];
    themeMapping: {
        primary: string;
        secondary: string;
        accent: string;
    };
}

const DEFAULT_MAPPING = {
    primary: '',
    secondary: '',
    accent: '',
};

export default function BrandingPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [colors, setColors] = React.useState<BrandColor[]>([]);
    const [mapping, setMapping] = React.useState(DEFAULT_MAPPING);
    const [newColorHex, setNewColorHex] = React.useState('#000000');
    const [newColorName, setNewColorName] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);

    // Using useDoc for real-time sync
    const brandingRef = React.useMemo(() => firestore ? doc(firestore, 'company', 'branding') : null, [firestore]);
    const { data: branding, isLoading } = useDoc<CompanyBranding>(brandingRef as any);

    React.useEffect(() => {
        if (branding) {
            setColors(branding.brandColors || []);
            setMapping(branding.themeMapping || DEFAULT_MAPPING);
        }
    }, [branding]);

    const handleAddColor = () => {
        if (!newColorName) {
            toast({ title: "Өнгөний нэр оруулна уу", variant: "destructive" });
            return;
        }
        const newColor: BrandColor = {
            id: crypto.randomUUID(),
            name: newColorName,
            hex: newColorHex,
        };
        setColors([...colors, newColor]);
        setNewColorName('');
        setNewColorHex('#000000');
    };

    const handleDeleteColor = (id: string) => {
        setColors(colors.filter(c => c.id !== id));
        const newMapping = { ...mapping };
        if (newMapping.primary === id) newMapping.primary = '';
        if (newMapping.secondary === id) newMapping.secondary = '';
        if (newMapping.accent === id) newMapping.accent = '';
        setMapping(newMapping);
    };

    const handleSave = async () => {
        if (!firestore) return;
        setIsSaving(true);
        try {
            await setDoc(doc(firestore, 'company', 'branding'), {
                brandColors: colors,
                themeMapping: mapping,
            });
            toast({ title: "Амжилттай хадгалагдлаа" });
        } catch (error: any) {
            toast({ title: "Алдаа гарлаа", description: error.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const previewStyle = React.useMemo(() => {
        const primaryColor = colors.find(c => c.id === mapping.primary);
        const secondaryColor = colors.find(c => c.id === mapping.secondary);
        const accentColor = colors.find(c => c.id === mapping.accent);

        return {
            '--primary': primaryColor ? hexToHsl(primaryColor.hex) : undefined,
            '--secondary': secondaryColor ? hexToHsl(secondaryColor.hex) : undefined,
            '--accent': accentColor ? hexToHsl(accentColor.hex) : undefined,
        } as React.CSSProperties;
    }, [colors, mapping]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-0 md:pt-0 space-y-8 pb-32">
                <PageHeader
                    title="Брэндинг тохиргоо"
                    description="Системийн өнгө төрхийг өөрийн брэндийн дагуу өөрчлөх."
                    showBackButton={true}
                    hideBreadcrumbs={true}
                    backHref="/dashboard/company"
                    actions={
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => {
                                if (branding) {
                                    setColors(branding.brandColors || []);
                                    setMapping(branding.themeMapping || DEFAULT_MAPPING);
                                }
                            }} disabled={isLoading || isSaving}>
                                <RotateCcw className="mr-2 h-4 w-4" /> Үйлдэл буцаах
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={isLoading || isSaving}>
                                <Save className="mr-2 h-4 w-4" /> Хадгалах
                            </Button>
                        </div>
                    }
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Col: Color Palette Management */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Брэндийн өнгөнүүд</CardTitle>
                                <CardDescription>Танай байгууллагын үндсэн өнгөнүүдийг энд оруулна уу.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex gap-2 items-end">
                                    <div className="space-y-1.5 flex-1">
                                        <Label>Өнгөний нэр</Label>
                                        <Input
                                            placeholder="Жишээ: Үндсэн улаан"
                                            value={newColorName}
                                            onChange={(e) => setNewColorName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Өнгө сонгох</Label>
                                        <div className="flex gap-2">
                                            <div className="h-10 w-10 rounded-md border shadow-sm overflow-hidden relative cursor-pointer group">
                                                <input
                                                    type="color"
                                                    value={newColorHex}
                                                    onChange={(e) => setNewColorHex(e.target.value)}
                                                    className="absolute -top-2 -left-2 w-16 h-16 p-0 border-0 cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <Button onClick={handleAddColor} size="icon" className="shrink-0"><Plus className="h-4 w-4" /></Button>
                                </div>

                                <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto pr-2">
                                    {colors.length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">Өнгө оруулаагүй байна.</p>
                                    )}
                                    {colors.map(color => (
                                        <div key={color.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full border shadow-sm" style={{ backgroundColor: color.hex }} />
                                                <div>
                                                    <p className="font-medium text-sm">{color.name}</p>
                                                    <p className="text-xs text-muted-foreground uppercase">{color.hex}</p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteColor(color.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Системийн өнгө оноох</CardTitle>
                                <CardDescription>Бүртгэсэн өнгөнүүдээс системийн хэсгүүдэд оноох.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-primary" /> Primary Color (Үндсэн)
                                        </Label>
                                        <Select
                                            value={mapping.primary}
                                            onValueChange={(val) => setMapping(prev => ({ ...prev, primary: val }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Өнгө сонгох..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {colors.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: c.hex }} />
                                                            {c.name}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">Товчлуур, идэвхтэй төлөв, толгой хэсэгт ашиглагдана.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-secondary" /> Secondary Color (Хоёрдогч)
                                        </Label>
                                        <Select
                                            value={mapping.secondary}
                                            onValueChange={(val) => setMapping(prev => ({ ...prev, secondary: val }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Өнгө сонгох..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {colors.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: c.hex }} />
                                                            {c.name}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">Хоёрдогч товчлуур, дэвсгэр, badge-д ашиглагдана.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-accent" /> Accent Color (Тодотгол)
                                        </Label>
                                        <Select
                                            value={mapping.accent}
                                            onValueChange={(val) => setMapping(prev => ({ ...prev, accent: val }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Өнгө сонгох..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {colors.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: c.hex }} />
                                                            {c.name}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">Онцлох элементүүд, hover эффектэд ашиглагдана.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Col: Live Preview */}
                    <div className="space-y-6">
                        <Card className="h-full border-2 border-dashed border-muted bg-slate-50 overflow-hidden sticky top-8">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Paintbrush className="w-5 h-5" /> Харагдах байдал</CardTitle>
                                <CardDescription>Сонгосон өнгөнүүд системд хэрхэн харагдах жишээ.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-background rounded-xl border shadow-sm p-6 space-y-8" style={previewStyle as any}>
                                    <div className="space-y-2">
                                        <div className="font-semibold text-sm text-muted-foreground mb-2">Хедер & Navigation</div>
                                        <div className="bg-primary text-primary-foreground p-4 rounded-lg flex justify-between items-center shadow-md">
                                            <span className="font-bold">Logo</span>
                                            <div className="flex gap-3 text-sm font-medium opacity-90">
                                                <span>Нүүр</span>
                                                <span>Ажилчид</span>
                                                <span>Тохиргоо</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="font-semibold text-sm text-muted-foreground mb-2">Товчлуурууд</div>
                                        <div className="flex flex-wrap gap-3">
                                            <Button>Primary Button</Button>
                                            <Button variant="secondary">Secondary Button</Button>
                                            <Button variant="outline">Outline Button</Button>
                                            <Button variant="ghost">Ghost Button</Button>
                                            <Button variant="destructive">Destructive</Button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="font-semibold text-sm text-muted-foreground mb-2">Элементүүд</div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Card className="bg-card shadow-sm">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-lg">Card Title</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <p className="text-sm text-muted-foreground">This is a standard card component.</p>
                                                    <div className="mt-4 flex gap-2">
                                                        <div className="px-2 py-1 rounded bg-primary/10 text-primary text-xs font-bold">Tag 1</div>
                                                        <div className="px-2 py-1 rounded bg-secondary text-secondary-foreground text-xs font-bold">Tag 2</div>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="bg-accent/10 border-accent/20 shadow-none">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-lg text-accent-foreground">Accent Card</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <p className="text-sm text-accent-foreground/80">Using the accent color for highlights.</p>
                                                    <Button size="sm" className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90 w-full">Action</Button>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
