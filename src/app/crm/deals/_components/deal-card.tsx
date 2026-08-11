'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Building2, Phone, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatMoney, type Deal, type PipelineStage } from '../../_types';
import {
    DaysChip,
    KamAvatar,
    SourceChip,
    SourceTypeBadge,
    daysInStage,
    quoteOverdueDays,
} from './deal-badges';

interface DealCardProps {
    deal: Deal;
    stage: PipelineStage;
    companyName?: string;
    /** '💰 Үнийн санал илгээсэн' түргэн үйлдэл — зөвхөн lead багана дээр өгнө. */
    onQuoteSend?: (deal: Deal, amount?: number) => Promise<void>;
    isOverlay?: boolean;
}

export function DealCard({
    deal,
    stage,
    companyName,
    onQuoteSend,
    isOverlay,
}: DealCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: deal.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging && !isOverlay ? 0.4 : 1,
    };

    const days = daysInStage(deal);
    const overdue = quoteOverdueDays(deal);
    const isLead = stage.id === 'lead';

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                'group rounded-lg border bg-card p-3 cursor-grab active:cursor-grabbing transition-shadow',
                'hover:shadow-md hover:border-cyan-300',
                overdue !== null &&
                    'border-l-[3px] border-l-rose-600 bg-rose-50/60 dark:bg-rose-950/20',
                isOverlay && 'shadow-xl border-cyan-400 cursor-grabbing',
            )}
        >
            <Link
                href={`/crm/deals/${deal.id}`}
                onClick={(e) => {
                    if (isDragging) e.preventDefault();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="block"
            >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="text-sm font-medium leading-tight line-clamp-2 group-hover:text-cyan-700 dark:group-hover:text-cyan-400">
                        {deal.name}
                    </h4>
                    <KamAvatar kam={deal.kam} />
                </div>

                {/* Lead баганын статус мөр — прототипийн адил */}
                {isLead &&
                    (overdue !== null ? (
                        <div className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400">
                            ⏰ Санал хугацаа {overdue} хоног хэтэрсэн!
                        </div>
                    ) : deal.quoteDue ? (
                        <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                            📅 Санал өгөх: {deal.quoteDue}
                        </div>
                    ) : (
                        <div className="text-[11px] text-muted-foreground/70">
                            📅 Санал өгөх огноо тавиагүй
                        </div>
                    ))}

                {deal.amount !== undefined && deal.amount !== null && (
                    <div
                        className="mt-1 text-base font-semibold tabular-nums"
                        style={{ color: stage.color }}
                    >
                        {formatMoney(deal.amount, deal.currency)}
                    </div>
                )}

                <div className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
                    {companyName && (
                        <div className="inline-flex items-center gap-1.5 truncate w-full">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">{companyName}</span>
                        </div>
                    )}
                    {deal.phone && (
                        <div className="inline-flex items-center gap-1.5 truncate w-full">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span className="truncate">{deal.phone}</span>
                        </div>
                    )}
                    {deal.direction && (
                        <div className="inline-flex items-center gap-1.5 truncate w-full">
                            <ArrowRight className="h-3 w-3 shrink-0" />
                            <span className="truncate">{deal.direction}</span>
                        </div>
                    )}
                    {deal.cargo && <div className="truncate">📦 {deal.cargo}</div>}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1">
                    <SourceTypeBadge deal={deal} />
                    <SourceChip source={deal.source} />
                    <DaysChip days={days} />
                </div>
            </Link>

            {isLead && onQuoteSend && !isOverlay && (
                <QuoteQuickAction deal={deal} onQuoteSend={onQuoteSend} />
            )}
        </div>
    );
}

/** Lead багана дээрх '💰 Үнийн санал илгээсэн' popover — дүн оруулаад илгээнэ. */
function QuoteQuickAction({
    deal,
    onQuoteSend,
}: {
    deal: Deal;
    onQuoteSend: (deal: Deal, amount?: number) => Promise<void>;
}) {
    const [open, setOpen] = React.useState(false);
    const [amount, setAmount] = React.useState('');
    const [isSending, setIsSending] = React.useState(false);

    React.useEffect(() => {
        if (open) setAmount(deal.amount ? String(deal.amount) : '');
    }, [open, deal.amount]);

    const handleSend = async () => {
        const cleaned = amount.replace(/[^\d.]/g, '');
        const num = cleaned ? Number(cleaned) : undefined;
        setIsSending(true);
        try {
            await onQuoteSend(deal, num !== undefined && !isNaN(num) ? num : undefined);
            setOpen(false);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div onPointerDown={(e) => e.stopPropagation()} className="mt-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        size="sm"
                        className="h-7 w-full bg-cyan-600 hover:bg-cyan-600/90 text-xs"
                    >
                        💰 Үнийн санал илгээсэн
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-64 space-y-3"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <div className="space-y-1.5">
                        <Label className="text-xs">Санал болгосон дүн (₮)</Label>
                        <Input
                            autoFocus
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            inputMode="numeric"
                            placeholder="0"
                            disabled={isSending}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                        />
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        className="w-full bg-cyan-600 hover:bg-cyan-600/90"
                        disabled={isSending}
                        onClick={handleSend}
                    >
                        {isSending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                        → Санал илгээсэн + дагах даалгавар
                    </Button>
                </PopoverContent>
            </Popover>
        </div>
    );
}
