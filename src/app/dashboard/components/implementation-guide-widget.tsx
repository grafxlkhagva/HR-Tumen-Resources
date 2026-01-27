'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { LifeBuoy, ExternalLink, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { IMPLEMENTATION_CHECKLIST_STEPS, type ImplementationStep } from '@/data/implementation-checklist-steps';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'implementation_checklist_progress';

function loadProgress(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function saveProgress(progress: Record<string, boolean>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // ignore
  }
}

export function ImplementationGuideWidget() {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [question, setQuestion] = useState('');
  const [stepId, setStepId] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const handleToggle = useCallback((step: ImplementationStep, checked: boolean) => {
    setProgress((prev) => {
      const next = { ...prev, [step.id]: checked };
      saveProgress(next);
      return next;
    });
  }, []);

  const handleAsk = useCallback(async () => {
    const q = question.trim();
    if (!q) return;
    setLoading(true);
    setAnswer(null);
    try {
      const res = await fetch('/api/implementation-guide-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, stepId: stepId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnswer(`Алдаа: ${data.error || res.statusText}`);
        return;
      }
      setAnswer(data.answer ?? '');
    } catch (e) {
      setAnswer(`Алдаа: ${e instanceof Error ? e.message : 'Холболт амжилтгүй'}`);
    } finally {
      setLoading(false);
    }
  }, [question, stepId]);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed bottom-6 right-[14rem] z-50 h-12 w-12 rounded-full shadow-lg"
            aria-label="Нэвтрүүлэлтийн хөтөч нээх"
          >
            <LifeBuoy className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle>Системийн нэвтрүүлэлтийн хөтөч</SheetTitle>
          </SheetHeader>
          <div className="flex-1 flex flex-col min-h-0 gap-4 mt-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Заавал хийх алхмууд — чеклэгдсэн бол дуусгасан.</p>
              <ScrollArea className="h-[240px] rounded-md border p-3">
                <ul className="space-y-2">
                  {IMPLEMENTATION_CHECKLIST_STEPS.map((step) => (
                    <li key={step.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        id={step.id}
                        checked={!!progress[step.id]}
                        onCheckedChange={(c) => handleToggle(step, !!c)}
                      />
                      <label htmlFor={step.id} className="flex-1 cursor-pointer truncate" title={step.label}>
                        {step.order}. {step.label}
                      </label>
                      <Button variant="ghost" size="sm" className="shrink-0 h-7 px-2 gap-1" asChild>
                        <Link href={step.href} onClick={() => setOpen(false)}>
                          <ExternalLink className="h-3.5 w-3.5" />
                          Очих
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
            <div className="border-t pt-4 space-y-2">
              <p className="text-sm font-medium">Асуулт асуу — AI зөвлөгөө</p>
              <div className="flex gap-2">
                <select
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={stepId ?? ''}
                  onChange={(e) => setStepId(e.target.value || null)}
                  aria-label="Одоогийн алхам"
                >
                  <option value="">Ерөнхий</option>
                  {IMPLEMENTATION_CHECKLIST_STEPS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.order}. {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <Textarea
                placeholder="Жишээ: Байгууллагын мэдээлэл хэрхэн оруулах вэ?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="min-h-[80px] resize-none"
                disabled={loading}
              />
              <Button onClick={handleAsk} disabled={loading || !question.trim()} className="w-full gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Илгээх
              </Button>
              {answer !== null && (
                <div
                  className={cn(
                    'rounded-md border p-3 text-sm whitespace-pre-wrap',
                    answer.startsWith('Алдаа') ? 'border-destructive/50 bg-destructive/5 text-destructive' : 'bg-muted/50'
                  )}
                >
                  {answer}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
