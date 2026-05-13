'use client';

import * as React from 'react';
import { Brain, Sparkles, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StrategyBannerProps {
  onOpen: () => void;
}

const HIGHLIGHT_TEXTS = [
  'OKR зөв тохируулах',
  'KPI дүгнэлт',
  'BSC хэмжигдэхүүн',
  'Стратегийн явц',
];

export function StrategyBanner({ onOpen }: StrategyBannerProps) {
  const [dismissed, setDismissed] = React.useState(false);
  const [currentIdx, setCurrentIdx] = React.useState(0);

  // Highlight text rotation
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % HIGHLIGHT_TEXTS.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  if (dismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-violet-200 dark:border-violet-800/50 bg-gradient-to-r from-violet-50 via-indigo-50 to-purple-50 dark:from-violet-950/30 dark:via-indigo-950/20 dark:to-purple-950/30 p-4 sm:p-5">

      {/* Background decoration */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-200/30 dark:bg-violet-700/10 blur-2xl pointer-events-none" />
      <div className="absolute right-20 bottom-0 h-20 w-20 rounded-full bg-indigo-200/20 dark:bg-indigo-700/10 blur-xl pointer-events-none" />

      <div className="relative flex items-center gap-4">
        {/* Icon */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-200 dark:shadow-violet-900/30">
          <Brain className="h-6 w-6 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-bold text-violet-900 dark:text-violet-100">
              Стратегийн AI Зөвлөхтэй ажиллах
            </h3>
            <span className="flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-900/50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
              <Sparkles className="h-2.5 w-2.5" />
              PhD level
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400">
            <span>OKR · OGSM · BSC · KPI</span>
            <span className="text-violet-300">·</span>
            <span className="flex items-center gap-1">
              <span className="relative overflow-hidden h-4 w-28 inline-block">
                {HIGHLIGHT_TEXTS.map((text, i) => (
                  <span
                    key={text}
                    className={cn(
                      'absolute inset-0 transition-all duration-500 font-medium text-violet-700 dark:text-violet-300',
                      i === currentIdx ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                    )}
                  >
                    {text}
                  </span>
                ))}
              </span>
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={onOpen}
            size="sm"
            className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-200 dark:shadow-violet-900/30 text-xs h-8"
          >
            <Brain className="h-3.5 w-3.5" />
            Зөвлөх нээх
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-violet-400 hover:text-violet-600 hover:bg-violet-100 dark:hover:bg-violet-900/30"
            onClick={() => setDismissed(true)}
            aria-label="Хаах"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
