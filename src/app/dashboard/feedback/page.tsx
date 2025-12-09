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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirebase, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { mn } from 'date-fns/locale';
import { ChevronDown, MessageSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';


type Feedback = {
  id: string;
  employeeId?: string;
  employeeName?: string;
  employeePhotoURL?: string;
  subject: string;
  message: string;
  category: 'Санал' | 'Гомдол' | 'Асуулт';
  status: 'Шинэ' | 'Хянаж буй' | 'Шийдвэрлэсэн';
  createdAt: string;
  isAnonymous: boolean;
};

const statusConfig: Record<Feedback['status'], { label: string; className: string }> = {
  'Шинэ': { label: 'Шинэ', className: 'bg-blue-500 hover:bg-blue-600' },
  'Хянаж буй': { label: 'Хянаж буй', className: 'bg-yellow-500 hover:bg-yellow-600' },
  'Шийдвэрлэсэн': { label: 'Шийдвэрлэсэн', className: 'bg-green-500 hover:bg-green-600' },
};

function StatusDropdown({ currentStatus, onStatusChange }: { currentStatus: Feedback['status'], onStatusChange: (newStatus: Feedback['status']) => void }) {
  const currentConfig = statusConfig[currentStatus];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="w-36 justify-between">
          <span>{currentConfig.label}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={currentStatus} onValueChange={(value) => onStatusChange(value as Feedback['status'])}>
          {Object.keys(statusConfig).map((status) => (
            <DropdownMenuRadioItem key={status} value={status}>
              {statusConfig[status as Feedback['status']].label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


function FeedbackRow({ feedback }: { feedback: Feedback }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const handleStatusChange = (newStatus: Feedback['status']) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'feedback', feedback.id);
    updateDocumentNonBlocking(docRef, { status: newStatus });
    toast({ title: "Төлөв амжилттай шинэчлэгдлээ" });
  };

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={feedback.isAnonymous ? undefined : feedback.employeePhotoURL} />
            <AvatarFallback>
                {feedback.isAnonymous ? <User className="h-5 w-5" /> : feedback.employeeName?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{feedback.isAnonymous ? 'Нэр нууцалсан' : feedback.employeeName}</div>
            <div className="text-sm text-muted-foreground">{feedback.subject}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell max-w-sm">
        <p className="line-clamp-2">{feedback.message}</p>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <Badge variant="outline">{feedback.category}</Badge>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true, locale: mn })}
      </TableCell>
      <TableCell className="text-right">
        <StatusDropdown currentStatus={feedback.status} onStatusChange={handleStatusChange} />
      </TableCell>
    </TableRow>
  );
}

function FeedbackTable() {
    const { firestore } = useFirebase();
    const feedbackQuery = useMemoFirebase(
      () => query(collection(firestore, 'feedback'), orderBy('createdAt', 'desc')),
      [firestore]
    );

    const { data: feedbacks, isLoading, error } = useCollection<Feedback>(feedbackQuery);

    if (isLoading) {
        return (
            <TableBody>
                {Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell>
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-9 w-9 rounded-full" />
                            <div className="space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-32" />
                            </div>
                        </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-20" /></TableCell>
                        <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-36 ml-auto" /></TableCell>
                    </TableRow>
                ))}
            </TableBody>
        );
    }
    
    if (error) {
        return (
            <TableBody>
                <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-destructive">
                    Алдаа гарлаа: {error.message}
                </TableCell>
                </TableRow>
            </TableBody>
        )
    }

    if (feedbacks?.length === 0) {
        return (
            <TableBody>
                <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                        <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-4 text-muted-foreground">Санал хүсэлт одоогоор байхгүй.</p>
                    </TableCell>
                </TableRow>
            </TableBody>
        )
    }

    return (
        <TableBody>
            {feedbacks?.map((feedback) => (
                <FeedbackRow key={feedback.id} feedback={feedback} />
            ))}
        </TableBody>
    );
}

export default function FeedbackPage() {
  const { employeeProfile, isProfileLoading } = useEmployeeProfile();
  
  if (isProfileLoading) {
    return (
        <div className="py-8">
            <Card>
                <CardHeader>
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-4 w-64 mt-2" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
  }

  if (employeeProfile?.role !== 'admin') {
      return (
          <div className="py-8">
              <Card>
                  <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">Энэ хуудсыг зөвхөн админ эрхтэй хэрэглэгч харна.</p>
                  </CardContent>
              </Card>
          </div>
      )
  }

  return (
    <div className="py-8">
      <Card>
        <CardHeader>
          <CardTitle>Санал хүсэлт</CardTitle>
          <CardDescription>
            Ажилтнуудаас ирсэн санал хүсэлтийг удирдах хэсэг.
          </CardDescription>
        </CardHeader>
        <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Илгээгч</TableHead>
                        <TableHead className="hidden md:table-cell">Агуулга</TableHead>
                        <TableHead className="hidden sm:table-cell">Ангилал</TableHead>
                        <TableHead className="hidden lg:table-cell">Огноо</TableHead>
                        <TableHead className="text-right">Төлөв</TableHead>
                    </TableRow>
                    </TableHeader>
                    {!isProfileLoading && employeeProfile?.role === 'admin' && <FeedbackTable />}
                </Table>
        </CardContent>
      </Card>
    </div>
  );
}