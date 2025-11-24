'use client';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Check, MoreHorizontal, PlusCircle, X } from 'lucide-react';
import type { TimeOffRequest } from './data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

const statusColors: {
  [key: string]: 'default' | 'secondary' | 'destructive' | 'outline';
} = {
  Approved: 'default',
  Pending: 'secondary',
  Rejected: 'destructive',
};

const TimeOffTable = ({ requests }: { requests: TimeOffRequest[] }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Ажилтан</TableHead>
        <TableHead>Огноо</TableHead>
        <TableHead className="hidden md:table-cell">Төрөл</TableHead>
        <TableHead>Төлөв</TableHead>
        <TableHead>
          <span className="sr-only">Үйлдлүүд</span>
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {requests.map((req) => {
        const avatar = PlaceHolderImages.find(
          (p) => p.id === req.employeeAvatarId
        );
        return (
          <TableRow key={req.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="hidden h-9 w-9 sm:flex">
                  <AvatarImage
                    src={avatar?.imageUrl}
                    alt="Avatar"
                    data-ai-hint={avatar?.imageHint}
                  />
                  <AvatarFallback>{req.employeeName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>{req.employeeName}</div>
              </div>
            </TableCell>
            <TableCell>
              {format(new Date(req.startDate), 'yyyy.MM.dd')} -{' '}
              {format(new Date(req.endDate), 'yyyy.MM.dd')}
            </TableCell>
            <TableCell className="hidden md:table-cell">{req.type}</TableCell>
            <TableCell>
              <Badge variant={statusColors[req.status]}>{req.status}</Badge>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem className="gap-2">
                    <Check className="h-4 w-4" /> Зөвшөөрөх
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2">
                    <X className="h-4 w-4" /> Татгалзах
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        );
      })}
    </TableBody>
  </Table>
);

const TableSkeleton = () => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Ажилтан</TableHead>
        <TableHead>Огноо</TableHead>
        <TableHead className="hidden md:table-cell">Төрөл</TableHead>
        <TableHead>Төлөв</TableHead>
        <TableHead>
          <span className="sr-only">Үйлдлүүд</span>
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-40" />
          </TableCell>
          <TableCell className="hidden md:table-cell">
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-8 w-8" />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

export default function TimeOffPage() {
  const { firestore } = useFirebase();
  const timeOffQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'timeOffRequests') : null),
    [firestore]
  );
  const {
    data: timeOffRequests,
    isLoading,
    error,
  } = useCollection<TimeOffRequest>(timeOffQuery);

  return (
    <div className="py-8">
      <Tabs defaultValue="all">
        <div className="flex items-center">
          <TabsList>
            <TabsTrigger value="all">Бүгд</TabsTrigger>
            <TabsTrigger value="pending">Хүлээгдэж буй</TabsTrigger>
            <TabsTrigger value="approved">Зөвшөөрсөн</TabsTrigger>
            <TabsTrigger value="rejected">Татгалзсан</TabsTrigger>
          </TabsList>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" className="h-8 gap-1">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Чөлөөний хүсэлт
              </span>
            </Button>
          </div>
        </div>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Чөлөөний хүсэлтүүд</CardTitle>
            <CardDescription>
              Ажилтнуудын чөлөөний хүсэлтийг удирдаж, зөвшөөрөх.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && <TableSkeleton />}
            {error && (
              <div className="py-8 text-center text-destructive">
                Алдаа: {error.message}
              </div>
            )}
            {!isLoading && !error && timeOffRequests && (
              <>
                <TabsContent value="all">
                  <TimeOffTable requests={timeOffRequests} />
                </TabsContent>
                <TabsContent value="pending">
                  <TimeOffTable
                    requests={timeOffRequests.filter(
                      (r) => r.status === 'Pending'
                    )}
                  />
                </TabsContent>
                <TabsContent value="approved">
                  <TimeOffTable
                    requests={timeOffRequests.filter(
                      (r) => r.status === 'Approved'
                    )}
                  />
                </TabsContent>
                <TabsContent value="rejected">
                  <TimeOffTable
                    requests={timeOffRequests.filter(
                      (r) => r.status === 'Rejected'
                    )}
                  />
                </TabsContent>
              </>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
