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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  MoreHorizontal,
  PlusCircle,
  File,
  Download,
  Trash2,
  Eye,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Document } from './data';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

const categoryIcons = {
  Policy: <File className="h-4 w-4 text-blue-500" />,
  Contract: <File className="h-4 w-4 text-green-500" />,
  Handbook: <File className="h-4 w-4 text-purple-500" />,
  Form: <File className="h-4 w-4 text-orange-500" />,
  'Хөдөлмөрийн гэрээ': <File className="h-4 w-4 text-green-500" />,
  'Дотоод журам': <File className="h-4 w-4 text-blue-500" />,
  'Ажилтны гарын авлага': <File className="h-4 w-4 text-purple-500" />,
  'Маягт': <File className="h-4 w-4 text-orange-500" />,
  'Бусад': <File className="h-4 w-4 text-gray-500" />,
};

function DocumentRow({ doc }: { doc: Document }) {
  const Icon = categoryIcons[doc.documentType] || categoryIcons['Бусад'];
  
  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {Icon}
          <span>{doc.title}</span>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <Badge variant="secondary">{doc.documentType}</Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {format(new Date(doc.uploadDate), 'yyyy.MM.dd')}
      </TableCell>
      <TableCell className="text-right">... KB</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-haspopup="true" size="icon" variant="ghost">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Цэс</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Үйлдлүүд</DropdownMenuLabel>
            <DropdownMenuItem asChild>
                <Link href={`/dashboard/documents/${doc.id}`} className="flex items-center cursor-pointer">
                    <Eye className="mr-2 h-4 w-4" /> Дэлгэрэнгүй
                </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2">
              <Download className="h-4 w-4" /> Татах
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4" /> Устгах
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export default function DocumentsPage() {
  const { firestore } = useFirebase();
  const documentsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'documents') : null),
    [firestore]
  );
  const {
    data: documents,
    isLoading,
    error,
  } = useCollection<Document>(documentsQuery);

  return (
    <div className="py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Баримт бичиг</CardTitle>
            <CardDescription>
              Хүний нөөцийн чухал баримт бичгүүдийг аюулгүй хадгалж, удирдах.
            </CardDescription>
          </div>
          <Button size="sm" className="gap-1">
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Бичиг баримт байршуулах
            </span>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Нэр</TableHead>
                <TableHead className="hidden sm:table-cell">Ангилал</TableHead>
                <TableHead className="hidden md:table-cell">
                  Сүүлд зассан
                </TableHead>
                <TableHead className="text-right">Хэмжээ</TableHead>
                <TableHead>
                  <span className="sr-only">Үйлдлүүд</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Skeleton className="h-6 w-20" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8" />
                    </TableCell>
                  </TableRow>
                ))}
              {error && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-destructive"
                  >
                    Алдаа гарлаа: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                !error &&
                documents &&
                documents.map((doc) => <DocumentRow key={doc.id} doc={doc} />)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
