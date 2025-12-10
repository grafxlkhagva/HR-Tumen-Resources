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
  Newspaper,
  Image as ImageIcon,
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
    <div className="py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Нийтлэлийн самбар</CardTitle>
            <CardDescription>
              Байгууллагын дотоод мэдээ, мэдээллийг удирдах хэсэг.
            </CardDescription>
          </div>
          <Button asChild size="sm" className="gap-1">
            <Link href="/dashboard/posts/add">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Шинэ нийтлэл
                </span>
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Гарчиг</TableHead>
                <TableHead>Нийтлэгч</TableHead>
                <TableHead className="hidden md:table-cell">
                  Огноо
                </TableHead>
                <TableHead>
                  <span className="sr-only">Үйлдлүүд</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
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
                    <TableCell>
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
                    <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                        <Newspaper className="mx-auto h-12 w-12" />
                        <p className="mt-4">Одоогоор нийтлэл байхгүй байна.</p>
                        <Button asChild variant="link" className="mt-2">
                           <Link href="/dashboard/posts/add">Анхны нийтлэлээ үүсгэх</Link>
                        </Button>
                    </TableCell>
                 </TableRow>
               )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
