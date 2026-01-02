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
import { MoreHorizontal, PlusCircle, Pencil, Trash2, FileText, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useCollection, useFirebase, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AddPolicyDialog } from './add-policy-dialog';
import { PageHeader } from '@/components/page-header';

import { CompanyPolicy, Position } from './types';

export default function CompanyPoliciesPage() {
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingPolicy, setEditingPolicy] = React.useState<CompanyPolicy | null>(null);

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

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <AddPolicyDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                editingPolicy={editingPolicy}
                positions={positions || []}
            />
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 pb-32">
                <PageHeader
                    title="Компанийн дүрэм, журам"
                    description="Байгууллагын дотоод дүрэм, журмыг удирдах, хандалтыг тохируулах."
                    showBackButton={true}
                    backHref="/dashboard/company"
                    actions={
                        <Button size="sm" onClick={handleAddNew}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Шинэ журам нэмэх
                        </Button>
                    }
                />

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>Бүртгэлтэй журмууд</CardTitle>
                        <CardDescription>
                            Байгууллагын хэмжээнд мөрдөгдөх бүх дүрэм, журмын жагсаалт.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="pl-6">Журмын нэр</TableHead>
                                    <TableHead>Хамааралтай</TableHead>
                                    <TableHead className="hidden md:table-cell">Огноо</TableHead>
                                    <TableHead className="text-right pr-6">Үйлдэл</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading && Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="pl-6"><Skeleton className="h-5 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell className="text-right pr-6"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))}
                                {!isLoading && policies?.map((policy) => (
                                    <TableRow key={policy.id}>
                                        <TableCell className="font-medium pl-6">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-primary" />
                                                {policy.title}
                                            </div>
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
                                        <TableCell className="hidden md:table-cell text-muted-foreground">{format(new Date(policy.uploadDate), 'yyyy.MM.dd')}</TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                    <a href={policy.documentUrl} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
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
                                {!isLoading && !policies?.length && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">
                                            Бүртгэлтэй дүрэм, журам байхгүй байна.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
