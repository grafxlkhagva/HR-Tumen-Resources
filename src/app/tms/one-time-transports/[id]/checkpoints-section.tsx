'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Camera, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { TmsOneTimeTransport } from '@/app/tms/types';
import { getCheckpointStages, type OtCheckpointStageDef } from '../constants';
import { isCheckpointStageActive, formatMoney } from '../lib';
import { CheckpointDialog } from './checkpoint-dialog';

/**
 * 🚚 Тээврийн алхам — 4 шатны checkpoint баталгаажуулалт.
 * Дууссан = emerald, идэвхтэй = amber ring, хүлээгдэж буй = бүдэг.
 */
export function CheckpointsSection({ transport }: { transport: TmsOneTimeTransport }) {
  const stages = getCheckpointStages(transport.type);
  const [openStage, setOpenStage] = React.useState<OtCheckpointStageDef | null>(null);

  const hasAnyData = stages.some((s) => transport.checkpoints?.[s.key]?.completedAt);

  // Цуцлагдсан/нэхэмжлэгдсэн/төлөгдсөн + өгөгдөлгүй бол харуулахгүй (prototype дүрэм)
  if (!hasAnyData && ['cancelled', 'invoiced', 'paid'].includes(transport.status)) {
    return null;
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">🚚 Тээврийн алхам — баталгаажуулалт</h3>
        <p className="text-xs text-muted-foreground">
          Шат бүрийг зурагтай баталгаажуулна — Эхлүүлэх/Дуусгахад шаардагдана.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stages.map((stage) => (
          <StageCard
            key={stage.key}
            stage={stage}
            transport={transport}
            onOpen={() => setOpenStage(stage)}
          />
        ))}
      </div>

      <CheckpointDialog
        open={!!openStage}
        onOpenChange={(o) => !o && setOpenStage(null)}
        transport={transport}
        stage={openStage}
      />
    </Card>
  );
}

function StageCard({
  stage,
  transport,
  onOpen,
}: {
  stage: OtCheckpointStageDef;
  transport: TmsOneTimeTransport;
  onOpen: () => void;
}) {
  const cp = transport.checkpoints?.[stage.key];
  const done = !!cp?.completedAt;
  const active = isCheckpointStageActive(stage.key, transport);

  const completedStr = React.useMemo(() => {
    if (!cp?.completedAt) return null;
    const d = new Date(cp.completedAt);
    return Number.isNaN(d.getTime()) ? null : format(d, 'MM.dd HH:mm');
  }, [cp?.completedAt]);

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border p-3 transition-colors',
        done
          ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/30'
          : active
            ? 'border-amber-300 bg-amber-50/60 ring-2 ring-amber-200 dark:border-amber-800 dark:bg-amber-950/30 dark:ring-amber-900'
            : 'opacity-60'
      )}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-lg">{stage.icon}</span>
        {done ? (
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            ✓ Хийгдсэн
          </span>
        ) : active ? (
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
            🔄 Идэвхтэй
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">⏳ Хүлээгдэж буй</span>
        )}
      </div>
      <p className="text-sm font-medium">{stage.label}</p>
      <p className="mb-2 text-[11px] leading-snug text-muted-foreground">{stage.desc}</p>

      {done && cp ? (
        <div className="mb-2 space-y-0.5 text-[11px] text-muted-foreground">
          {completedStr && <p>🕐 {completedStr}</p>}
          {cp.byEmployeeName && <p>👤 {cp.byEmployeeName}</p>}
          <p>
            <Camera className="mr-1 inline h-3 w-3" />
            {cp.photoUrls?.length ?? 0} зураг
          </p>
          {stage.key === 'transit' && cp.km != null && <p>🛣 {cp.km} км</p>}
          {stage.key === 'transit' && cp.fuelAmount != null && (
            <p>⛽ {formatMoney(cp.fuelAmount)}</p>
          )}
        </div>
      ) : null}

      <div className="mt-auto">
        {done ? (
          <Button type="button" variant="outline" size="sm" className="w-full gap-1.5" onClick={onOpen}>
            <Eye className="h-3.5 w-3.5" />
            Үзэх / Засах
          </Button>
        ) : active ? (
          <Button
            type="button"
            size="sm"
            className="w-full bg-amber-500 text-white hover:bg-amber-600"
            onClick={onOpen}
          >
            Баталгаажуулах
          </Button>
        ) : (
          <p className="text-center text-[10px] text-muted-foreground">
            Өмнөх алхам дуусахыг хүлээж байна
          </p>
        )}
      </div>
    </div>
  );
}
