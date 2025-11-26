'use client';

import * as React from 'react';
import Link from 'next/link';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Briefcase,
  Calendar,
  FileText,
  PlusCircle,
  Award,
  UserCheck,
  UserPlus,
  UserX,
  Archive,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { AddHistoryEventDialog } from './AddHistoryEventDialog';
import { Badge } from '@/components/ui/badge';
import { format }from 'date-fns';

type EmploymentHistoryEvent = {
  id: string;
  eventType: string;
  eventDate: string;
  notes?: string;
  documentUrl?: string;
  documentId?: string;
};

const eventTypeIcons: { [key: string]: React.ElementType } = {
  'Ажилд авсан': UserPlus,
  'Туршилтын хугацаа эхэлсэн': Calendar,
  'Үндсэн ажилтан болгосон': UserCheck,
  'Албан тушаал дэвшсэн': Award,
  'Шилжүүлэн томилсон': ArrowRight,
  'Урт хугацааны чөлөө': Archive,
  'Сахилгын шийтгэл': AlertTriangle,
  'Ажлаас чөлөөлсөн': UserX,
  'Эд хөрөнгө хариуцуулсан': Briefcase,
  Бусад: FileText,
};

function TimelineItem({
  event,
  isLast,
}: {
  event: EmploymentHistoryEvent;
  isLast: boolean;
}) {
  const Icon = eventTypeIcons[event.eventType] || FileText;
  const eventDate = format(new Date(event.eventDate), 'yyyy-MM-dd');

  return (
    <li className="relative flex items-start pb-8">
      {!isLast && (
        <div className="absolute left-4 top-5 h-full w-0.5 bg-border" />
      )}
      <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="ml-4 flex-grow">
        <div className="flex items-center justify-between">
            <h4 className="font-semibold">{event.eventType}</h4>
            <span className="text-xs text-muted-foreground">{eventDate}</span>
        </div>
        
        {event.notes && <p className="mt-1 text-sm text-muted-foreground">{event.notes}</p>}
        {event.documentId ? (
             <Button asChild variant="link" className="mt-2 h-auto p-0 text-sm">
                <Link href={`/dashboard/documents/${event.documentId}`}>
                    <FileText className="mr-2 h-4 w-4" />
                    Баримт бичиг харах
                </Link>
             </Button>
        ) : event.documentUrl && (
          <a
            href={event.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center text-sm text-primary hover:underline"
          >
            <FileText className="mr-2 h-4 w-4" />
            Баримт бичиг татах
          </a>
        )}
      </div>
    </li>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-start">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="ml-4 flex-grow space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmploymentHistoryTimeline({ employeeId }: { employeeId: string }) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const { firestore } = useFirebase();

  const historyQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, `employees/${employeeId}/employmentHistory`),
            orderBy('eventDate', 'desc')
          )
        : null,
    [firestore, employeeId]
  );

  const {
    data: history,
    isLoading,
    error,
  } = useCollection<EmploymentHistoryEvent>(historyQuery);

  return (
    <div>
      <div className="mb-4 flex items-center justify-end">
        <Button size="sm" onClick={() => setIsDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Шинэ үйл явдал нэмэх
        </Button>
      </div>

      <AddHistoryEventDialog
        employeeId={employeeId}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />

      <div className="relative">
        {isLoading && <TimelineSkeleton />}
        {error && (
          <div className="text-center text-destructive">
            Түүхийг ачаалахад алдаа гарлаа.
          </div>
        )}
        {!isLoading && !error && history && history.length > 0 && (
          <ul>
            {history.map((event, index) => (
              <TimelineItem
                key={event.id}
                event={event}
                isLast={index === history.length - 1}
              />
            ))}
          </ul>
        )}
        {!isLoading && !error && (!history || history.length === 0) && (
          <div className="py-10 text-center text-muted-foreground">
            <Briefcase className="mx-auto h-12 w-12" />
            <p className="mt-4">Хөдөлмөрийн харилцааны түүх одоогоор хоосон байна.</p>
          </div>
        )}
      </div>
    </div>
  );
}
