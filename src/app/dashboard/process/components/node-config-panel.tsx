'use client';

import * as React from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, GripVertical, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProcessManagement } from '../context';
import { ChecklistItem, DocumentRequirement } from '../types';

interface ConfigPanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function NodeConfigPanel({ open, onOpenChange }: ConfigPanelProps) {
    const { selectedNode, updateSelectedNodeData } = useProcessManagement();

    // Local state for immediate feedback
    const [label, setLabel] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [checklist, setChecklist] = React.useState<ChecklistItem[]>([]);
    const [documents, setDocuments] = React.useState<DocumentRequirement[]>([]);
    const [stakeholders, setStakeholders] = React.useState<string[]>([]);

    React.useEffect(() => {
        if (selectedNode) {
            setLabel(selectedNode.data.label);
            setDescription(selectedNode.data.description || '');
            setChecklist(selectedNode.data.checklist || []);
            setDocuments(selectedNode.data.documents || []);
            setStakeholders(selectedNode.data.stakeholders || []);
        }
    }, [selectedNode]);

    const handleSave = () => {
        updateSelectedNodeData({
            label,
            description,
            checklist,
            documents,
            stakeholders
        });
        onOpenChange(false);
    };

    // Stakeholder Handlers
    const addStakeholder = (role: string) => {
        if (!stakeholders.includes(role)) {
            setStakeholders([...stakeholders, role]);
        }
    };

    const removeStakeholder = (role: string) => {
        setStakeholders(stakeholders.filter(s => s !== role));
    };

    // Checklist Handlers
    const addChecklistItem = () => {
        const newItem: ChecklistItem = {
            id: Math.random().toString(36).substr(2, 9),
            text: 'Шинэ ажил',
            isRequired: true
        };
        setChecklist([...checklist, newItem]);
    };

    const updateChecklistItem = (id: string, text: string) => {
        setChecklist(checklist.map(item => item.id === id ? { ...item, text } : item));
    };

    const removeChecklistItem = (id: string) => {
        setChecklist(checklist.filter(item => item.id !== id));
    };

    // Document Handlers
    const addDocument = () => {
        const newDoc: DocumentRequirement = {
            id: Math.random().toString(36).substr(2, 9),
            name: 'Шинэ баримт',
            isRequired: true
        };
        setDocuments([...documents, newDoc]);
    };

    const updateDocument = (id: string, name: string) => {
        setDocuments(documents.map(doc => doc.id === id ? { ...doc, name } : doc));
    };

    const removeDocument = (id: string) => {
        setDocuments(documents.filter(doc => doc.id !== id));
    };

    if (!selectedNode) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
            <SheetContent className="w-[400px] sm:w-[450px] border-l shadow-2xl p-0 flex flex-col gap-0 backdrop-blur-xl bg-background/95">
                <SheetHeader className="p-6 pb-4 border-b">
                    <div className="flex items-center justify-between">
                        <SheetTitle>Шатны тохиргоо</SheetTitle>
                        <div className="px-2 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs font-mono rounded">
                            ID: {selectedNode.id.slice(0, 8)}
                        </div>
                    </div>
                    <SheetDescription>
                        Тухайн үе шатанд хийгдэх ажил, шаардлагатай бичиг баримтыг тохируулна уу.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <ScrollArea className="flex-1">
                        <div className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Шатны нэр</Label>
                                    <Input value={label} onChange={e => setLabel(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Тайлбар</Label>
                                    <Textarea
                                        className="h-20 resize-none"
                                        placeholder="Энэ шатанд хийх ажлын товч тайлбар..."
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                    />
                                </div>
                            </div>

                            <Separator />

                            <Tabs defaultValue="checklist" className="w-full">
                                <TabsList className="w-full grid grid-cols-3">
                                    <TabsTrigger value="checklist" className="text-xs">Чеклист</TabsTrigger>
                                    <TabsTrigger value="docs" className="text-xs">Баримт</TabsTrigger>
                                    <TabsTrigger value="stakeholders" className="text-xs">Хариуцагч</TabsTrigger>
                                </TabsList>

                                <TabsContent value="checklist" className="mt-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs uppercase text-muted-foreground font-semibold">Жагсаалт ({checklist.length})</Label>
                                        <Button size="sm" variant="ghost" className="h-6 text-xs text-indigo-600" onClick={addChecklistItem}>
                                            <Plus className="h-3 w-3 mr-1" /> Нэмэх
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {checklist.map((item) => (
                                            <div key={item.id} className="flex items-start gap-2 group">
                                                <GripVertical className="h-4 w-4 text-slate-300 mt-2.5 cursor-move" />
                                                <div className="flex-1 space-y-1">
                                                    <Input
                                                        className="h-9 text-sm"
                                                        value={item.text}
                                                        onChange={(e) => updateChecklistItem(item.id, e.target.value)}
                                                    />
                                                </div>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-9 w-9 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => removeChecklistItem(item.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        {checklist.length === 0 && (
                                            <div className="text-center py-6 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                                                Жагсаалт хоосон байна
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="docs" className="mt-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs uppercase text-muted-foreground font-semibold">Шаардлагатай Баримт ({documents.length})</Label>
                                        <Button size="sm" variant="ghost" className="h-6 text-xs text-indigo-600" onClick={addDocument}>
                                            <Plus className="h-3 w-3 mr-1" /> Нэмэх
                                        </Button>
                                    </div>

                                    <div className="space-y-2">
                                        {documents.map((doc) => (
                                            <div key={doc.id} className="flex items-start gap-2 group">
                                                <FileText className="h-4 w-4 text-blue-500 mt-2.5" />
                                                <div className="flex-1 space-y-1">
                                                    <Input
                                                        className="h-9 text-sm"
                                                        value={doc.name}
                                                        onChange={(e) => updateDocument(doc.id, e.target.value)}
                                                        placeholder="Баримтын нэр..."
                                                    />
                                                </div>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-9 w-9 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => removeDocument(doc.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}

                                        {documents.length === 0 && (
                                            <div className="p-4 border-2 border-dashed rounded-lg text-center space-y-2 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer" onClick={addDocument}>
                                                <FileText className="h-8 w-8 text-slate-300 mx-auto" />
                                                <p className="text-sm text-muted-foreground">Шаардлагатай баримтын жагсаалт үүсгэх</p>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="stakeholders" className="mt-4 space-y-4">
                                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border mb-3">
                                        <Label className="text-xs text-muted-foreground mb-1.5 block">Хариуцагч нэмэх</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Жишээ: HR Manager, Team Lead..."
                                                className="h-8 text-sm"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const val = e.currentTarget.value.trim();
                                                        if (val) {
                                                            addStakeholder(val);
                                                            e.currentTarget.value = '';
                                                        }
                                                    }
                                                }}
                                                id="new-stakeholder-input"
                                            />
                                            <Button
                                                size="sm"
                                                className="h-8"
                                                onClick={() => {
                                                    const input = document.getElementById('new-stakeholder-input') as HTMLInputElement;
                                                    if (input && input.value.trim()) {
                                                        addStakeholder(input.value.trim());
                                                        input.value = '';
                                                    }
                                                }}
                                            >
                                                Нэмэх
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {stakeholders.map((role, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded border group">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center text-xs font-bold">
                                                        {role.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-sm font-medium">{role}</span>
                                                </div>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => removeStakeholder(role)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}

                                        {stakeholders.length === 0 && (
                                            <div className="text-center py-6 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                                                Хариуцагч тохируулаагүй байна
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </ScrollArea>
                </div>

                <div className="p-4 border-t bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Цуцлах</Button>
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSave}>Хадгалах</Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
