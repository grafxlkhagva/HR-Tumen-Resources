'use client';

import { LegalContract, CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS, CONTRACT_CATEGORY_LABELS } from '@/types/legal';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, Bot, CheckCircle2, Clock, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContractCardProps {
  contract: LegalContract;
  onClick?: () => void;
}

function AIStatusIcon({ status }: { status: LegalContract['aiReviewStatus'] }) {
  if (status === 'done') {
    return <CheckCircle2 className="h-4 w-4 text-green-500" aria-label="AI дүгнэлт хийгдсэн" />;
  }
  if (status === 'pending') {
    return <Clock className="h-4 w-4 text-amber-500 animate-pulse" aria-label="AI дүгнэлт хийгдэж байна" />;
  }
  return <Bot className="h-4 w-4 text-muted-foreground/50" aria-label="AI дүгнэлт хийгдээгүй" />;
}

export function ContractCard({ contract, onClick }: ContractCardProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}
      className={cn(
        'rounded-xl border bg-white p-4 flex items-center gap-4',
        onClick && 'cursor-pointer hover:shadow-md hover:border-blue-200 transition-all'
      )}
    >
      {/* Category color stripe */}
      <div className="w-1 self-stretch rounded-full bg-blue-200 shrink-0" />

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate">{contract.title}</h3>
            {contract.contractNumber && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Hash className="h-3 w-3" />
                {contract.contractNumber}
              </span>
            )}
          </div>
          <Badge className={cn('text-xs shrink-0', CONTRACT_STATUS_COLORS[contract.status])}>
            {CONTRACT_STATUS_LABELS[contract.status]}
          </Badge>
        </div>

        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <Badge variant="secondary" className="text-xs font-normal">
            {CONTRACT_CATEGORY_LABELS[contract.category]}
          </Badge>

          {contract.parties.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {contract.parties.map(p => p.name).filter(Boolean).join(', ').slice(0, 40)}
              {contract.parties.map(p => p.name).join(', ').length > 40 ? '...' : ''}
            </span>
          )}

          {(contract.startDate || contract.endDate) && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {contract.startDate && contract.endDate
                ? `${contract.startDate} — ${contract.endDate}`
                : contract.startDate || contract.endDate}
            </span>
          )}
        </div>
      </div>

      {/* AI status */}
      <div className="shrink-0 flex items-center gap-1.5">
        <AIStatusIcon status={contract.aiReviewStatus} />
        {contract.aiReviewResult && (
          <span className={cn(
            'text-xs font-medium',
            contract.aiReviewResult.overallRating === 'SAFE' ? 'text-green-600' :
            contract.aiReviewResult.overallRating === 'REVIEW' ? 'text-amber-600' : 'text-red-600'
          )}>
            {contract.aiReviewResult.riskScore}%
          </span>
        )}
      </div>
    </div>
  );
}
