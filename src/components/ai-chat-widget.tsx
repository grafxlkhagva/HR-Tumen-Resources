'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface EmployeeOption {
  id: string;
  name: string;
}

interface EmployeeSelectorData {
  type: 'employee_selector';
  mode: 'single' | 'multi';
  label: string;
  employees: EmployeeOption[];
}

interface ChatMessage {
  role: 'user' | 'model';
  content: [{ text: string }];
}

interface EmployeeInfo {
  id: string;
  name: string;
  position?: string;
}

function parseEmployeeSelectors(text: string): { cleanText: string; selectors: EmployeeSelectorData[] } {
  const selectors: EmployeeSelectorData[] = [];
  const cleanText = text.replace(/```json\s*\n?([\s\S]*?)```/g, (_match, jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr.trim());
      if (parsed?.type === 'employee_selector') {
        selectors.push(parsed);
        return '';
      }
    } catch {
      // not valid JSON, keep it
    }
    return _match;
  });
  return { cleanText: cleanText.trim(), selectors };
}

function EmployeeSelector({
  data,
  onSelect,
  disabled,
}: {
  data: EmployeeSelectorData;
  onSelect: (selected: EmployeeOption[]) => void;
  disabled: boolean;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<EmployeeOption[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  const filtered = data.employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (emp: EmployeeOption) => {
    if (confirmed || disabled) return;
    if (data.mode === 'single') {
      setSelected([emp]);
    } else {
      setSelected(prev =>
        prev.some(s => s.id === emp.id)
          ? prev.filter(s => s.id !== emp.id)
          : [...prev, emp]
      );
    }
  };

  const confirm = () => {
    if (selected.length === 0) return;
    setConfirmed(true);
    onSelect(selected);
  };

  return (
    <div className="mt-2 rounded-lg border bg-card p-3">
      <p className="text-sm font-medium mb-2">{data.label}</p>
      {!confirmed && (
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Хайх..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
            disabled={disabled}
          />
        </div>
      )}
      <div className="max-h-40 overflow-y-auto space-y-1">
        {confirmed ? (
          selected.map(emp => (
            <div key={emp.id} className="flex items-center gap-2 rounded-md bg-primary/10 px-2 py-1.5 text-sm">
              <Check className="h-3.5 w-3.5 text-primary" />
              <span>{emp.name}</span>
            </div>
          ))
        ) : (
          filtered.map(emp => {
            const isSelected = selected.some(s => s.id === emp.id);
            return (
              <button
                key={emp.id}
                onClick={() => toggle(emp)}
                disabled={disabled}
                className={cn(
                  'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left transition-colors',
                  isSelected
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
              >
                <div className={cn(
                  'h-4 w-4 rounded border flex items-center justify-center shrink-0',
                  data.mode === 'single' ? 'rounded-full' : '',
                  isSelected ? 'bg-primary border-primary' : 'border-input'
                )}>
                  {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <span className="truncate">{emp.name}</span>
              </button>
            );
          })
        )}
        {!confirmed && filtered.length === 0 && (
          <p className="text-xs text-muted-foreground py-2 text-center">Олдсонгүй</p>
        )}
      </div>
      {!confirmed && selected.length > 0 && (
        <Button size="sm" className="w-full mt-2 h-7 text-xs" onClick={confirm} disabled={disabled}>
          Сонгох ({selected.length})
        </Button>
      )}
    </div>
  );
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className="font-semibold text-sm mt-2 mb-1">{line.slice(3)}</h3>);
    } else if (line.startsWith('# ')) {
      elements.push(<h2 key={i} className="font-bold text-sm mt-2 mb-1">{line.slice(2)}</h2>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} className="flex gap-1.5 text-sm">
          <span className="shrink-0">•</span>
          <span>{formatInline(line.slice(2))}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)$/);
      if (match) {
        elements.push(
          <div key={i} className="flex gap-1.5 text-sm">
            <span className="shrink-0 text-muted-foreground">{match[1]}.</span>
            <span>{formatInline(match[2])}</span>
          </div>
        );
      }
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-1" />);
    } else {
      elements.push(<p key={i} className="text-sm">{formatInline(line)}</p>);
    }
  }

  return <>{elements}</>;
}

function formatInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|`(.+?)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      parts.push(<strong key={match.index}>{match[1]}</strong>);
    } else if (match[2]) {
      parts.push(
        <code key={match.index} className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
          {match[2]}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<EmployeeInfo[]>([]);
  const [empLoaded, setEmpLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!open || empLoaded) return;
    fetch('/api/ai-chat')
      .then(r => r.json())
      .then(data => {
        if (data.employees) setEmployees(data.employees);
        setEmpLoaded(true);
      })
      .catch(err => {
        console.error('Failed to load employees:', err);
        setEmpLoaded(true);
      });
  }, [open, empLoaded]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: [{ text: text.trim() }] };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    scrollToBottom();

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, employees }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const aiMsg: ChatMessage = { role: 'model', content: [{ text: data.text }] };
      setMessages([...newMessages, aiMsg]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Алдаа гарлаа';
      const aiMsg: ChatMessage = { role: 'model', content: [{ text: `⚠️ ${errMsg}` }] };
      setMessages([...newMessages, aiMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSelect = (selected: EmployeeOption[]) => {
    const names = selected.map(s => s.name).join(', ');
    const ids = selected.map(s => s.id);
    const text = selected.length === 1
      ? `${names} (ID: ${ids[0]}) сонголоо`
      : `Сонгосон: ${names}`;
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-105',
          open
            ? 'bg-muted text-muted-foreground hover:bg-muted/80'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
        )}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat Panel */}
      <div
        className={cn(
          'fixed bottom-24 right-6 z-50 flex flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl transition-all duration-300',
          open
            ? 'h-[min(600px,calc(100vh-8rem))] w-[min(420px,calc(100vw-3rem))] opacity-100 translate-y-0'
            : 'h-0 w-0 opacity-0 translate-y-4 pointer-events-none'
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b bg-primary px-4 py-3">
          <Avatar className="h-8 w-8 border-2 border-primary-foreground/20">
            <AvatarFallback className="bg-primary-foreground/10 text-primary-foreground text-xs">
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary-foreground">Nege AI Туслах</p>
            <p className="text-xs text-primary-foreground/70">Төсөл үүсгэх, мэдээлэл авах</p>
          </div>
          {empLoaded && (
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {employees.length} ажилтан
            </Badge>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-primary/10 p-3 mb-3">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium">Сайн байна уу!</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
                  Би таны ухаалаг туслах. Шинэ төсөл үүсгэх, ажилчдыг харах зэрэг зүйлд тусална.
                </p>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {['Шинэ төсөл үүсгэх', 'Ажилчдыг харуулна уу'].map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => {
              const text = msg.content[0]?.text || '';
              const isUser = msg.role === 'user';

              if (isUser) {
                return (
                  <div key={idx} className="flex justify-end">
                    <div className="flex items-end gap-2 max-w-[85%]">
                      <div className="rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                        {text}
                      </div>
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="text-[10px] bg-muted">
                          <User className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                );
              }

              const { cleanText, selectors } = parseEmployeeSelectors(text);
              const isLastModel = idx === messages.length - 1 || messages.slice(idx + 1).every(m => m.role === 'user');

              return (
                <div key={idx} className="flex justify-start">
                  <div className="flex items-start gap-2 max-w-[85%]">
                    <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        <Bot className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="rounded-2xl rounded-bl-md bg-muted px-3.5 py-2">
                      {renderMarkdown(cleanText)}
                      {selectors.map((sel, si) => (
                        <EmployeeSelector
                          key={si}
                          data={sel}
                          onSelect={handleEmployeeSelect}
                          disabled={loading || !isLastModel}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      <Bot className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-2.5">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:0ms]" />
                      <span className="h-2 w-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:150ms]" />
                      <span className="h-2 w-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-3">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Мессеж бичих..."
              disabled={loading}
              className="flex-1 rounded-full text-sm h-9"
            />
            <Button
              size="icon"
              className="h-9 w-9 rounded-full shrink-0"
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
