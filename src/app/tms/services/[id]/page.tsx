'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { PageHeader } from '@/components/patterns/page-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Loader2, Plus, GripVertical, Trash2, Save, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TMS_SERVICE_TYPES_COLLECTION, type TmsServiceType, type TmsDispatchControlTask, type TmsControlTaskType } from '@/app/tms/types';
import { v4 as uuidv4 } from 'uuid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function TmsServiceDetailPage() {
  const params = useParams();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const serviceId = params?.id as string;

  const ref = useMemoFirebase(
    () =>
      firestore && serviceId
        ? doc(firestore, TMS_SERVICE_TYPES_COLLECTION, serviceId)
        : null,
    [firestore, serviceId]
  );
  
  const { data: service, isLoading } = useDoc<TmsServiceType>(ref);

  const [steps, setSteps] = React.useState<{ id: string; name: string; order: number; isRequired: boolean; controlTasks?: TmsDispatchControlTask[] }[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [expandedStep, setExpandedStep] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (service?.dispatchSteps) {
      setSteps(service.dispatchSteps.sort((a, b) => a.order - b.order));
    } else if (service) {
      // Default initial steps for new service
      setSteps([
        { id: uuidv4(), name: 'Баталгаажсан', order: 1, isRequired: true },
        { id: uuidv4(), name: 'Ачихаар явсан', order: 2, isRequired: false },
        { id: uuidv4(), name: 'Ачсан', order: 3, isRequired: true },
        { id: uuidv4(), name: 'Буулгах руу явсан', order: 4, isRequired: false },
        { id: uuidv4(), name: 'Буулгасан', order: 5, isRequired: true },
      ]);
    }
  }, [service]);

  const handleAddStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        id: uuidv4(),
        name: '',
        order: prev.length > 0 ? Math.max(...prev.map((s) => s.order)) + 1 : 1,
        isRequired: false,
      },
    ]);
  };

  const handleRemoveStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const handleStepChange = (id: string, field: 'name' | 'isRequired', value: any) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setSteps((prev) => {
      const newSteps = [...prev];
      const temp = newSteps[index];
      newSteps[index] = newSteps[index - 1];
      newSteps[index - 1] = temp;
      
      // Update orders
      return newSteps.map((step, i) => ({ ...step, order: i + 1 }));
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === steps.length - 1) return;
    setSteps((prev) => {
      const newSteps = [...prev];
      const temp = newSteps[index];
      newSteps[index] = newSteps[index + 1];
      newSteps[index + 1] = temp;
      
      // Update orders
      return newSteps.map((step, i) => ({ ...step, order: i + 1 }));
    });
  };

  const handleAddControlTask = (stepId: string) => {
    setSteps((prev) => prev.map(s => {
      if (s.id !== stepId) return s;
      const newTasks = [...(s.controlTasks || []), {
        id: uuidv4(),
        name: '',
        type: 'checklist' as TmsControlTaskType,
        isRequired: false
      }];
      return { ...s, controlTasks: newTasks };
    }));
  };

  const handleUpdateControlTask = (stepId: string, taskId: string, field: keyof TmsDispatchControlTask, value: any) => {
    setSteps((prev) => prev.map(s => {
      if (s.id !== stepId) return s;
      const newTasks = (s.controlTasks || []).map(t => t.id === taskId ? { ...t, [field]: value } : t);
      return { ...s, controlTasks: newTasks };
    }));
  };

  const handleRemoveControlTask = (stepId: string, taskId: string) => {
    setSteps((prev) => prev.map(s => {
      if (s.id !== stepId) return s;
      return { ...s, controlTasks: (s.controlTasks || []).filter(t => t.id !== taskId) };
    }));
  };

  const handleSave = async () => {
    if (!firestore || !serviceId) return;
    
    // Validate
    if (steps.some((s) => !s.name.trim())) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Бүх алхмын нэрийг оруулна уу.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const formattedSteps = steps.map((s, i) => ({ 
        id: s.id,
        name: s.name.trim(),
        order: i + 1,
        isRequired: s.isRequired,
        controlTasks: s.controlTasks || []
      }));

      await updateDoc(doc(firestore, TMS_SERVICE_TYPES_COLLECTION, serviceId), {
        dispatchSteps: formattedSteps,
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Диспач алхмууд хадгалагдлаа.' });
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Хадгалахад алдаа гарлаа.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !service) {
    return (
      <div className="flex flex-col h-full w-full overflow-auto">
        <div className="border-b bg-background px-4 py-4 sm:px-6">
          <PageHeader
            title="Тээврийн үйлчилгээ"
            description="Дэлгэрэнгүй"
            breadcrumbs={[
              { label: 'Dashboard', href: '/tms' },
              { label: 'Үйлчилгээ', href: '/tms/services' },
              { label: '…' },
            ]}
          />
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <p className="text-muted-foreground">Үйлчилгээ олдсонгүй.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      <div className="border-b bg-background px-4 py-4 sm:px-6">
        <PageHeader
          title={service.name || 'Нэргүй үйлчилгээ'}
          description="Тээврийн үйлчилгээний дэлгэрэнгүй тохиргоо"
          breadcrumbs={[
            { label: 'Dashboard', href: '/tms' },
            { label: 'Үйлчилгээ', href: '/tms/services' },
            { label: service.name || 'Дэлгэрэнгүй' },
          ]}
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href="/tms/services" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Буцах
              </Link>
            </Button>
          }
        />
      </div>

      <div className="flex-1 p-4 sm:p-6 space-y-6 max-w-4xl">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle>Диспач алхмууд (Урсгал)</CardTitle>
              <CardDescription>
                Энэ үйлчилгээгээр хийгдэх тээвэрлэлтийн явцыг хянах алхмуудыг тодорхойлно. Дарааллыг өөрчлөх боломжтой.
              </CardDescription>
            </div>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Хадгалах
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step.id} className="border rounded-md bg-card/50 overflow-hidden transition-all">
                  <div className="flex items-center gap-3 p-3">
                    <div className="flex flex-col gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon-sm" 
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        disabled={index === 0}
                        onClick={() => handleMoveUp(index)}
                      >
                        <GripVertical className="h-4 w-4 rotate-90" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon-sm" 
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        disabled={index === steps.length - 1}
                        onClick={() => handleMoveDown(index)}
                      >
                        <GripVertical className="h-4 w-4 rotate-90" />
                      </Button>
                    </div>
                    
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                          {index + 1}
                        </div>
                        <Input
                          value={step.name}
                          onChange={(e) => handleStepChange(step.id, 'name', e.target.value)}
                          placeholder="Алхмын нэр (Ж: Ачсан, Хүрсэн...)"
                          className="flex-1"
                        />
                      </div>
                      
                      <div className="flex items-center gap-4 shrink-0 pl-9 sm:pl-0">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`required-${step.id}`}
                            checked={step.isRequired}
                            onCheckedChange={(checked) => handleStepChange(step.id, 'isRequired', checked === true)}
                          />
                          <Label htmlFor={`required-${step.id}`} className="text-sm font-normal cursor-pointer whitespace-nowrap">
                            Заавал шаардах
                          </Label>
                        </div>
                        
                        <div className="flex items-center gap-1 border-l pl-4">
                          <Button
                            variant={expandedStep === step.id ? "secondary" : "ghost"}
                            size="sm"
                            className="gap-2 h-8 text-xs font-medium"
                            onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                          >
                            <Settings className="h-3.5 w-3.5" />
                            Хяналт тохируулах {(step.controlTasks?.length || 0) > 0 && `(${step.controlTasks?.length})`}
                            {expandedStep === step.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                            onClick={() => handleRemoveStep(step.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Сэлгэж харуулах хяналтын тохиргооны хэсэг */}
                  {expandedStep === step.id && (
                    <div className="border-t bg-muted/20 p-4 pl-[3.25rem] space-y-4 animate-in slide-in-from-top-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Алхам дээр хийгдэх хяналтууд (Жишээ нь: Зураг дарах, Чеклист бөглөх)</h4>
                        <Button variant="outline" size="sm" onClick={() => handleAddControlTask(step.id)} className="h-8 gap-1.5 text-xs">
                          <Plus className="h-3.5 w-3.5" /> Хяналт нэмэх
                        </Button>
                      </div>
                      
                      {(!step.controlTasks || step.controlTasks.length === 0) ? (
                        <div className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-md bg-background">
                          Хяналт тохируулагдаагүй байна.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {step.controlTasks.map((task, tIndex) => (
                            <div key={task.id} className="flex flex-col sm:flex-row gap-3 bg-background p-3 rounded border">
                              <div className="flex-1 space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Хяналтын нэр / Асуулт</Label>
                                <Input 
                                  value={task.name} 
                                  onChange={(e) => handleUpdateControlTask(step.id, task.id, 'name', e.target.value)} 
                                  placeholder="Жишээ нь: Ачааны зураг дарах..." 
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="w-full sm:w-40 space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Төрөл</Label>
                                <Select 
                                  value={task.type} 
                                  onValueChange={(val: any) => handleUpdateControlTask(step.id, task.id, 'type', val)}
                                >
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="checklist">Чеклист (Тийм/Үгүй)</SelectItem>
                                    <SelectItem value="image">Зураг оруулах</SelectItem>
                                    <SelectItem value="text">Текст бичих</SelectItem>
                                    <SelectItem value="number">Тоо оруулах</SelectItem>
                                    <SelectItem value="date">Огноо оруулах</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-end gap-3 shrink-0">
                                <div className="flex items-center h-8 gap-2 px-1">
                                  <Checkbox 
                                    id={`task-req-${task.id}`} 
                                    checked={task.isRequired}
                                    onCheckedChange={(c) => handleUpdateControlTask(step.id, task.id, 'isRequired', c === true)}
                                  />
                                  <Label htmlFor={`task-req-${task.id}`} className="text-xs font-normal whitespace-nowrap cursor-pointer">Заавал</Label>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon-sm" 
                                  onClick={() => handleRemoveControlTask(step.id, task.id)}
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              className="w-full gap-2 border-dashed"
              onClick={handleAddStep}
            >
              <Plus className="h-4 w-4" />
              Шинэ алхам нэмэх
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
