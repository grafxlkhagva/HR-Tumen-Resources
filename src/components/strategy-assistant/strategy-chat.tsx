'use client';

import * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Brain, X, Send, Loader2, User,
  Target, TrendingUp, BarChart3, Lightbulb, Users, History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { initializeFirebase } from '@/firebase';
import { useTenant } from '@/contexts/tenant-context';
import { getAuth } from 'firebase/auth';

// ─── Types ────────────────────────────────────────────────────────────────

type MessageRole = 'user' | 'model';

interface Message {
  id: string;
  role: MessageRole;
  content: string;
}

// Quick action chips — байгуулагын контекстэд тулгуурласан
const QUICK_ACTIONS = [
  { icon: Target,     label: 'Явцын дүгнэлт',      prompt: 'Манай байгуулагын Business Plan-ийн одоогийн явцыг бүрэн дүгнэж, анхаарах зүйлс болон дараагийн алхмуудыг хэлээч.' },
  { icon: BarChart3,  label: 'KPI & Trend',         prompt: 'Манай KPI-уудын RAG статус болон сүүлийн trend-ийг шинжилж, ямар KPI анхаарал шаарддагийг хэлээч.' },
  { icon: Users,      label: 'Ажилтны гүйцэтгэл',  prompt: 'Objective хариуцагчдын явц болон хэлтсийн гүйцэтгэлийн дүгнэлтийг харуулаач.' },
  { icon: Lightbulb,  label: 'Стратегийн зөвлөгөө', prompt: 'Манай байгуулагын mission, vision, core values-д нийцсэн стратегийн зөвлөгөө өгөөч.' },
  { icon: TrendingUp, label: 'OKR нэмэх',           prompt: 'Манай байгуулагын одоогийн төлөвлөгөөд тулгуурлан шинэ OKR Objective нэмэхэд туслаач.' },
  { icon: History,    label: 'Баримтаас хайх',       prompt: 'Манай байгуулагын байршуулсан стратегийн баримт бичгүүдээс өнгөрсөн жилийн гол шийдвэр, бодлогуудыг олж тайлбарлаач.' },
];

async function getAuthToken(): Promise<string | null> {
  try {
    const { firebaseApp } = initializeFirebase();
    const auth = getAuth(firebaseApp);
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch { return null; }
}

// ─── Component ────────────────────────────────────────────────────────────

interface StrategyChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StrategyChat({ isOpen, onClose }: StrategyChatProps) {
  const { company } = useTenant();
  const companyName = company?.name || 'байгуулагын';

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: `Сайн байна уу! Би **${companyName}**-ийн стратегийн AI зөвлөх байна. 🎯

Таны байгуулагын **Business Plan, OKR, KPI, ажилтны гүйцэтгэл**-ийг бүрэн ойлгодог. Явцын дүгнэлт, зөвлөгөө, шинэ бүртгэл — бүгдийг шууд хийж чадна.

**Хурдан эхлэх:** Доорх товчнуудаас сонгоно уу 👇`,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => textareaRef.current?.focus(), 100);
  }, [isOpen]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: trimmed };
    const streamId = (Date.now() + 1).toString();

    setMessages(prev => [...prev, userMsg, { id: streamId, role: 'model', content: '' }]);
    setInput('');
    setIsLoading(true);

    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Нэвтрэлт шаардлагатай');

      abortRef.current = new AbortController();

      const history = [...messages, userMsg]
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: [{ text: m.content }] }));

      const res = await fetch('/api/bp-assistant/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: history }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({ error: 'Серверийн алдаа' }));
        throw new Error(errData.error || 'Алдаа гарлаа');
      }

      // SSE stream уншина
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.text) {
              setMessages(prev => prev.map(m =>
                m.id === streamId
                  ? { ...m, content: m.content + parsed.text }
                  : m
              ));
            }
            if (parsed.error) throw new Error(parsed.error);
          } catch (e: any) {
            if (e.message && !e.message.includes('JSON')) throw e;
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setMessages(prev => prev.map(m =>
        m.id === streamId
          ? { ...m, content: m.content || `❌ Алдаа: ${err.message}` }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-lg h-[85vh] max-h-[700px] flex flex-col rounded-2xl border bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
            <Brain className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-none">Стратегийн AI Зөвлөх</p>
            <p className="text-[11px] text-white/70 mt-0.5">OKR · OGSM · BSC · KPI</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-white/80">Идэвхтэй</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex gap-2.5', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {msg.role === 'model' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 mt-0.5">
                    <Brain className="h-3.5 w-3.5 text-violet-600" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm',
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white rounded-br-sm'
                      : 'bg-slate-50 border text-slate-800 rounded-bl-sm'
                  )}
                >
                  {msg.role === 'model' ? (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:my-2 prose-strong:text-violet-700">
                    <ReactMarkdown
                      components={{
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-2">
                            <table className="text-xs border-collapse w-full">{children}</table>
                          </div>
                        ),
                        th: ({ children }) => (
                          <th className="border border-slate-200 bg-slate-100 px-2 py-1 text-left font-semibold">{children}</th>
                        ),
                        td: ({ children }) => (
                          <td className="border border-slate-200 px-2 py-1">{children}</td>
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 mt-0.5">
                    <User className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 mt-0.5">
                  <Brain className="h-3.5 w-3.5 text-violet-600 animate-pulse" />
                </div>
                <div className="bg-slate-50 border rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1 items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick actions — зөвхөн эхний үед харуулна */}
        {messages.length <= 1 && !isLoading && (
          <div className="px-3 pb-2 grid grid-cols-2 gap-1.5">
            {QUICK_ACTIONS.map(({ icon: Icon, label, prompt }) => (
              <button
                key={label}
                onClick={() => sendMessage(prompt)}
                className="flex items-center gap-1.5 rounded-lg border bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-colors text-left"
              >
                <Icon className="h-3 w-3 shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t p-3 shrink-0">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="OKR нэмэх, явц шалгах, зөвлөгөө авах..."
              className="min-h-[44px] max-h-[120px] resize-none text-sm"
              rows={1}
              disabled={isLoading}
            />
            <Button
              size="icon"
              className="h-11 w-11 shrink-0 bg-violet-600 hover:bg-violet-700"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
            >
              {isLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />
              }
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Enter илгээх · Shift+Enter шинэ мөр
          </p>
        </div>
      </div>
    </div>
  );
}
