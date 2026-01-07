'use client';

import * as React from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Pencil, Trash2, FileText, ExternalLink, Search, ArrowUpDown, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useCollection, useFirebase, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AddPolicyDialog, POLICY_TYPES } from './add-policy-dialog';
import { PageHeader } from '@/components/page-header';

import { CompanyPolicy, Position } from './types';

export default function CompanyPoliciesPage() {
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingPolicy, setEditingPolicy] = React.useState<CompanyPolicy | null>(null);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [filterType, setFilterType] = React.useState('all');
    const [sortBy, setSortBy] = React.useState('newest');

    const { firestore } = useFirebase();
    const { toast } = useToast();

    const policiesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'companyPolicies'), orderBy('uploadDate', 'desc')) : null), [firestore]);
    const positionsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'positions') : null), [firestore]);

    const { data: policies, isLoading: isLoadingPolicies } = useCollection<CompanyPolicy>(policiesQuery);
    const { data: positions, isLoading: isLoadingPositions } = useCollection<Position>(positionsQuery);

    const positionMap = React.useMemo(() => {
        if (!positions) return new Map();
        return new Map(positions.map(p => [p.id, p.title]));
    }, [positions]);

    const handleAddNew = () => {
        setEditingPolicy(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (policy: CompanyPolicy) => {
        setEditingPolicy(policy);
        setIsDialogOpen(true);
    };

    const handleDelete = (policy: CompanyPolicy) => {
        if (!firestore) return;
        deleteDocumentNonBlocking(doc(firestore, 'companyPolicies', policy.id));
        toast({
            title: 'Амжилттай устгагдлаа',
            description: `"${policy.title}" дүрэм устгагдлаа.`,
            variant: 'destructive',
        })
    };

    const isLoading = isLoadingPolicies || isLoadingPositions;

    const filteredPolicies = React.useMemo(() => {
        if (!policies) return [];
        let result = policies.filter(policy => {
            const matchesSearch = policy.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                policy.description?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = filterType === 'all' || policy.type === filterType;
            return matchesSearch && matchesType;
        });

        // Sorting
        result.sort((a, b) => {
            if (sortBy === 'newest') {
                return new Date(b.effectiveDate || b.uploadDate).getTime() - new Date(a.effectiveDate || a.uploadDate).getTime();
            }
            if (sortBy === 'oldest') {
                return new Date(a.effectiveDate || a.uploadDate).getTime() - new Date(b.effectiveDate || b.uploadDate).getTime();
            }
            if (sortBy === 'title_asc') {
                return a.title.localeCompare(b.title);
            }
            if (sortBy === 'title_desc') {
                return b.title.localeCompare(a.title);
            }
            return 0;
        });

        return result;
    }, [policies, searchQuery, filterType, sortBy]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <AddPolicyDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                editingPolicy={editingPolicy}
                positions={positions || []}
            />
            <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-0 md:pt-0 space-y-8 pb-32">
                <PageHeader
                    title="Мөрдөгдөж буй баримт бичиг"
                    showBackButton={true}
                    hideBreadcrumbs={true}
                    backHref="/dashboard/company"
                    actions={
                        <Button size="icon" onClick={handleAddNew}>
                            <PlusCircle className="h-4 w-4" />
                        </Button>
                    }
                />

                <div className="space-y-4">
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-[200px] md:max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Журмын нэрээр хайх..."
                                className="pl-9 h-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <Select value={filterType} onValueChange={setFilterType}>
                                <SelectTrigger className="w-[160px] h-10">
                                    <SelectValue placeholder="Төрлөөр шүүх" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Бүх төрөл</SelectItem>
                                    {POLICY_TYPES.map(type => (
                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="w-[160px] h-10">
                                    <SelectValue placeholder="Эрэмбэлэх" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Шинэ нь эхэндээ</SelectItem>
                                    <SelectItem value="oldest">Хуучин нь эхэндээ</SelectItem>
                                    <SelectItem value="title_asc">Нэр (А-Я)</SelectItem>
                                    <SelectItem value="title_desc">Нэр (Я-А)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Card className="shadow-sm overflow-hidden">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent bg-muted/30 border-b">
                                        <TableHead className="pl-6 h-12">Баримт бичгийн нэр</TableHead>
                                        <TableHead className="h-12">Төрөл</TableHead>
                                        <TableHead className="h-12">Хэнд хамааралтай</TableHead>
                                        <TableHead className="hidden md:table-cell text-center h-12">Батлагдсан огноо</TableHead>
                                        <TableHead className="h-12 text-center">Файл хавсралт</TableHead>
                                        <TableHead className="text-right pr-6 h-12">Үйлдэл</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading && Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="pl-6"><Skeleton className="h-5 w-48" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                            <TableCell className="hidden md:table-cell text-center"><Skeleton className="h-5 w-24 mx-auto" /></TableCell>
                                            <TableCell className="text-center"><Skeleton className="h-5 w-20 mx-auto" /></TableCell>
                                            <TableCell className="text-right pr-6"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))}
                                    {!isLoading && filteredPolicies.map((policy) => (
                                        <TableRow key={policy.id}>
                                            <TableCell className="font-medium pl-6">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-primary" />
                                                    {policy.title}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-normal">{policy.type || 'Тодорхойгүй'}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {policy.appliesToAll ? <Badge variant="secondary">Бүх ажилтан</Badge> : (
                                                    <div className="flex flex-wrap gap-1">
                                                        {(policy.applicablePositionIds || []).map(id => (
                                                            <Badge key={id} variant="outline" className="text-[10px]">{positionMap.get(id) || 'Тодорхойгүй'}</Badge>
                                                        ))}
                                                        {(policy.applicablePositionIds || []).length === 0 && <Badge variant="outline">Тохируулаагүй</Badge>}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-muted-foreground text-center">
                                                {policy.effectiveDate ? format(new Date(policy.effectiveDate), 'yyyy.MM.dd') : '---'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {policy.documentUrl ? (
                                                    <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200 font-normal">
                                                        Хавсралттай
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs italic">Байхгүй</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="flex justify-end gap-1">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {policy.documentUrl && (
                                                                <DropdownMenuItem asChild>
                                                                    <a href={policy.documentUrl} target="_blank" rel="noopener noreferrer">
                                                                        <ExternalLink className="mr-2 h-4 w-4" /> Харах
                                                                    </a>
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem onClick={() => handleEdit(policy)}>
                                                                <Pencil className="mr-2 h-4 w-4" /> Засах
                                                            </DropdownMenuItem>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive">
                                                                        <Trash2 className="mr-2 h-4 w-4" /> Устгах
                                                                    </DropdownMenuItem>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Энэ үйлдлийг буцаах боломжгүй. Та "{policy.title}" журмыг устгах гэж байна.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => handleDelete(policy)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Тийм, устгах</AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {!isLoading && !filteredPolicies.length && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <FileText className="h-8 w-8 opacity-20" />
                                                    <p className="italic">Журам олдсонгүй.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
