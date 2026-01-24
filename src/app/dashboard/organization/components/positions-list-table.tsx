import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { format } from 'date-fns';
import { mn } from 'date-fns/locale';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    MoreHorizontal,
    Pencil,
    Copy,
    Power,
    PowerOff,
    Sparkles,
    Briefcase,
    Trash2,
    History as HistoryIcon,
    CheckCircle
} from 'lucide-react';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/organization/empty-state';
import { cn } from '@/lib/utils';
import { Position, ApprovalLog } from '../types';

const PositionHistorySheet = ({ position }: { position: Position }) => {
    const history = [...(position.approvalHistory || [])].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-slate-100 p-0">
                    <HistoryIcon className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary transition-colors" />
                </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-[400px] p-0">
                <SheetHeader className="p-6 border-b">
                    <SheetTitle>Үйл ажиллагааны түүх</SheetTitle>
                    <SheetDescription>
                        "{position.title}" ажлын байрны батламжийн түүх
                    </SheetDescription>
                </SheetHeader>
                <div className="p-6">
                    {!history.length ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <HistoryIcon className="h-12 w-12 text-slate-200 mb-4" />
                            <p className="text-sm text-slate-500 font-medium">Түүх олдсонгүй</p>
                        </div>
                    ) : (
                        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                            {history.map((log, idx) => (
                                <div key={idx} className="relative flex items-start gap-4 pl-8 group">
                                    <div className={cn(
                                        "absolute left-0 mt-1.5 h-2 w-2 rounded-full border-2 border-white ring-2",
                                        log.action === 'approve' ? "ring-emerald-500 bg-emerald-500" : "ring-amber-500 bg-amber-500"
                                    )} />
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={cn(
                                                "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
                                                log.action === 'approve' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                            )}>
                                                {log.action === 'approve' ? 'Батлав' : 'Цуцлав'}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                                {format(new Date(log.timestamp), 'yyyy/MM/dd HH:mm', { locale: mn })}
                                            </span>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-900 leading-none mb-1">
                                            {log.userName}
                                        </p>
                                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-slate-100 group-hover:border-slate-200 transition-colors">
                                            <p className="text-xs text-slate-600 leading-relaxed italic">
                                                "{log.note || (log.action === 'approve' ? 'Бүтцийг баталлаа' : 'Батламжийг цуцаллаа')}"
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
};

interface PositionsListTableProps {
    positions: Position[] | null;
    lookups: any;
    isLoading: boolean;
    selectedIds: string[];
    onSelectionChange: (ids: string[]) => void;
    onEdit: (pos: Position) => void;
    onDelete: (pos: Position) => void;
    onDisband?: (pos: Position) => void;
    onDuplicate: (pos: Position) => void;
    onClearFilters?: () => void;
}

export const PositionsListTable = ({
    positions,
    lookups,
    isLoading,
    selectedIds,
    onSelectionChange,
    onEdit,
    onDelete,
    onDisband,
    onDuplicate,
    onClearFilters
}: PositionsListTableProps) => {
    const handleToggleAll = (checked: boolean) => {
        if (checked) {
            onSelectionChange(positions?.map(p => p.id) || []);
        } else {
            onSelectionChange([]);
        }
    };

    const handleToggleOne = (id: string, checked: boolean) => {
        if (checked) {
            onSelectionChange([...selectedIds, id]);
        } else {
            onSelectionChange(selectedIds.filter(i => i !== id));
        }
    };

    return (
        <Table>
            <TableHeader>
                <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 pl-6">
                        <Checkbox
                            checked={positions?.length ? selectedIds.length === positions.length : false}
                            onCheckedChange={handleToggleAll}
                        />
                    </TableHead>
                    <TableHead>Албан тушаалын нэр</TableHead>
                    <TableHead>Хэлтэс</TableHead>
                    <TableHead>Зэрэглэл</TableHead>
                    <TableHead className="w-[100px] text-right pr-6">Үйлдэл</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading &&
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell className="pl-6"><Skeleton className="h-4 w-4" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                            <TableCell className="text-right pr-6"><Skeleton className="ml-auto h-8 w-8" /></TableCell>
                        </TableRow>
                    ))}
                {!isLoading && positions?.map((pos) => {
                    const isSelected = selectedIds.includes(pos.id);
                    const deptColor = lookups.departmentColorMap?.[pos.departmentId] || lookups.departmentColor || undefined;
                    const hasColor = deptColor && deptColor !== '#ffffff' && deptColor.toLowerCase() !== 'white';
                    
                    return (
                        <TableRow 
                            key={pos.id} 
                            className={cn(
                                isSelected && 'bg-primary/5',
                                hasColor && 'hover:opacity-90 transition-opacity'
                            )}
                            style={{
                                borderLeft: hasColor ? `4px solid ${deptColor}` : undefined,
                                backgroundColor: hasColor ? `${deptColor}08` : undefined
                            }}
                        >
                            <TableCell className="pl-6">
                                <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) => handleToggleOne(pos.id, !!checked)}
                                />
                            </TableCell>
                            <TableCell className="font-medium">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 group/title">
                                        <span
                                            className="group-hover:text-primary transition-colors cursor-pointer"
                                            onClick={() => onEdit(pos)}
                                        >
                                            {pos.title}
                                        </span>
                                        {pos.isApproved === true ? (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-200 py-0 h-5 font-semibold cursor-help">
                                                            Батлагдсан
                                                        </Badge>
                                                    </TooltipTrigger>
                                                    {pos.approvedByName && (
                                                        <TooltipContent side="right" className="p-3 space-y-1.5 max-w-[200px]">
                                                            <div className="flex items-center gap-2 pb-1 border-b border-white/20">
                                                                <CheckCircle className="h-3 w-3" />
                                                                <span className="text-[10px] font-semibold uppercase">Батлагдсан мэдээлэл</span>
                                                            </div>
                                                            <p className="text-xs font-semibold">{pos.approvedByName}</p>
                                                            <p className="text-[10px] text-slate-300">
                                                                {pos.approvedAt ? format(new Date(pos.approvedAt), 'yyyy/MM/dd HH:mm', { locale: mn }) : ''}
                                                            </p>
                                                        </TooltipContent>
                                                    )}
                                                </Tooltip>
                                            </TooltipProvider>
                                        ) : (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-600 border-amber-200 py-0 h-5 font-semibold cursor-help">
                                                            Батлагдаагүй
                                                        </Badge>
                                                    </TooltipTrigger>
                                                    {(pos.disapprovedByName || (pos.isApproved === false && pos.approvalHistory?.length)) && (
                                                        <TooltipContent side="right" className="p-3 space-y-1.5 max-w-[200px]">
                                                            <div className="flex items-center gap-2 pb-1 border-b border-white/20">
                                                                <HistoryIcon className="h-3 w-3" />
                                                                <span className="text-[10px] font-semibold uppercase">Цуцалсан мэдээлэл</span>
                                                            </div>
                                                            <p className="text-xs font-semibold">{pos.disapprovedByName || 'Мэдээлэлгүй'}</p>
                                                            <p className="text-[10px] text-slate-300">
                                                                {pos.disapprovedAt ? format(new Date(pos.disapprovedAt), 'yyyy/MM/dd HH:mm', { locale: mn }) : ''}
                                                            </p>
                                                        </TooltipContent>
                                                    )}
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                        <PositionHistorySheet position={pos} />
                                        {pos.hasPointBudget && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>Онооны төсөвтэй</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </div>
                                    {pos.hasPointBudget && (
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <div className="h-1 w-20 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-yellow-400"
                                                    style={{ width: `${Math.min(100, ((pos.remainingPointBudget ?? 0) / (pos.yearlyPointBudget ?? 1)) * 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] text-muted-foreground font-medium">
                                                {(pos.remainingPointBudget ?? 0).toLocaleString()} / {(pos.yearlyPointBudget ?? 0).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <span className="text-xs text-muted-foreground">
                                    {lookups.departmentMap[pos.departmentId] || 'Тодорхойгүй'}
                                </span>
                            </TableCell>
                            <TableCell>
                                {pos.levelId ? <Badge variant="secondary" className="text-[10px]">{lookups.levelMap[pos.levelId] || 'Тодорхойгүй'}</Badge> : '-'}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                                <AlertDialog>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => onEdit(pos)}>
                                                <Pencil className="mr-2 h-4 w-4" /> Засах
                                            </DropdownMenuItem>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                    <Copy className="mr-2 h-4 w-4" /> Хувилах
                                                </DropdownMenuItem>
                                            </AlertDialogTrigger>

                                            {pos.isApproved === true && onDisband && (
                                                <DropdownMenuItem onClick={() => onDisband(pos)} className="text-amber-600 focus:text-amber-600 focus:bg-amber-50">
                                                    <PowerOff className="mr-2 h-4 w-4" /> Татан буулгах
                                                </DropdownMenuItem>
                                            )}

                                            {pos.isApproved === false && (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => onDelete(pos)} className="text-destructive">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Устгах
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Ажлын байр хувилах</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Та "{pos.title}" ажлын байрыг хувилахдаа итгэлтэй байна уу? Шинэ ажлын байр нь ижил мэдээлэлтэй боловч ажилтан томилогдоогүйгээр үүснэ.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                                            <AlertDialogAction variant="default" onClick={() => onDuplicate(pos)}>
                                                Тийм, хувилах
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                        </TableRow>
                    )
                })}
                {!isLoading && !positions?.length && (
                    <TableRow>
                        <TableCell colSpan={5} className="p-0">
                            <EmptyState
                                icon={Briefcase}
                                title="Ажлын байр олдсонгүй"
                                description="Энэ нэгжид бүртгэлтэй ажлын байр байхгүй байна."
                                className="py-12"
                                action={onClearFilters ? {
                                    label: "Шүүлтүүдийг цэвэрлэх",
                                    onClick: onClearFilters
                                } : undefined}
                            />
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
};
