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
import { AddActionButton } from '@/components/ui/add-action-button';
import {
  MoreHorizontal,
  Trash2,
  Newspaper,
  Image as ImageIcon,
  Pencil,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useCollection, useFirebase, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import Image from 'next/image';
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
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/patterns/page-layout';

type Post = {
  id: string;
  title: string;
  imageUrl?: string;
  authorName: string;
  createdAt: string;
};

function PostRow({ post }: { post: Post }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const handleDelete = () => {
    if (!firestore) return;
    const docRef = doc(firestore, 'posts', post.id);
    deleteDocumentNonBlocking(docRef);
    toast({
      title: 'Амжилттай устгагдлаа',
      description: `"${post.title}" нийтлэл устгагдлаа.`,
    });
  };

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-4">
          {post.imageUrl ? (
            <Image src={post.imageUrl} alt={post.title} width={64} height={64} className="h-16 w-16 rounded-md object-cover" />
          ) : (
            <div className="h-16 w-16 flex items-center justify-center rounded-md bg-muted">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <span className="font-medium">{post.title}</span>
        </div>
      </TableCell>
      <TableCell>{post.authorName}</TableCell>
      <TableCell className="hidden md:table-cell">
        {format(new Date(post.createdAt), 'yyyy.MM.dd, HH:mm')}
      </TableCell>
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
              <Link href={`/dashboard/posts/edit/${post.id}`}>
                <Pencil className="mr-2 h-4 w-4" /> Засварлах
              </Link>
            </DropdownMenuItem>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Устгах
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Энэ үйлдлийг буцаах боломжгүй. Энэ нь "{post.title}" нийтлэлийг бүрмөсөн устгах болно.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Тийм, устга</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export default function PostsPage() {
  const { firestore } = useFirebase();
  const postsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'posts'), orderBy('createdAt', 'desc')) : null),
    [firestore]
  );
  const {
    data: posts,
    isLoading,
    error,
  } = useCollection<Post>(postsQuery);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 pb-32">
        <PageHeader
          title="Нийтлэлийн самбар"
          description="Байгууллагын дотоод мэдээ, мэдээллийг удирдах хэсэг."
          showBackButton={true}
          hideBreadcrumbs={true}
          backButtonPlacement="inline"
          backBehavior="history"
          fallbackBackHref="/dashboard"
          actions={
            <AddActionButton
              label="Шинэ нийтлэл"
              description="Шинэ нийтлэл нэмэх"
              href="/dashboard/posts/add"
            />
          }
        />

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Гарчиг</TableHead>
                  <TableHead>Нийтлэгч</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Огноо
                  </TableHead>
                  <TableHead className="pr-6 text-right">
                    <span className="sr-only">Үйлдлүүд</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-16 w-16 rounded-md" />
                          <Skeleton className="h-5 w-48" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      <TableCell className="pr-6">
                        <Skeleton className="h-8 w-8 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))}
                {error && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-8 text-center text-destructive"
                    >
                      Алдаа гарлаа: {error.message}
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading &&
                  !error &&
                  posts && posts.map((post) => <PostRow key={post.id} post={post} />)}
                {!isLoading && !error && (!posts || posts.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-64 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center h-full">
                        <div className="p-4 bg-muted rounded-full mb-3">
                          <Newspaper className="h-8 w-8 opacity-50" />
                        </div>
                        <p className="font-medium">Одоогоор нийтлэл байхгүй байна.</p>
                        <Button asChild variant="link" className="mt-1">
                          <Link href="/dashboard/posts/add">Анхны нийтлэлээ үүсгэх</Link>
                        </Button>
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
  );
}
