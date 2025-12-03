
'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MessageSquare, ThumbsUp, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

type Post = {
    id: string;
    title: string;
    content: string;
    imageUrl: string;
    authorName: string;
    createdAt: string;
};

function PostSkeleton() {
    return (
        <Card className="overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
            </CardContent>
            <CardFooter>
                 <Skeleton className="h-9 w-28" />
            </CardFooter>
        </Card>
    )
}

function PostCard({ post }: { post: Post }) {
    const postDate = new Date(post.createdAt);

    return (
        <Card className="overflow-hidden">
            {post.imageUrl && (
                <div className="relative aspect-video w-full">
                    <Image src={post.imageUrl} alt={post.title} fill className="object-cover" />
                </div>
            )}
            <CardHeader>
                <CardTitle className="text-lg">{post.title}</CardTitle>
                <CardDescription>
                    {post.authorName} - {format(postDate, 'yyyy.MM.dd')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="line-clamp-3 text-sm text-muted-foreground">{post.content}</p>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
                 <Button variant="link" className="p-0 h-auto text-primary">
                    Дэлгэрэнгүй унших
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <div className="flex items-center gap-4 text-muted-foreground">
                    <button className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors">
                        <ThumbsUp className="h-4 w-4" />
                        <span>0</span>
                    </button>
                    <button className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors">
                        <MessageSquare className="h-4 w-4" />
                        <span>0</span>
                    </button>
                </div>
            </CardFooter>
        </Card>
    );
}

export default function MobileHomePage() {
  const { firestore } = useFirebase();

  const postsQuery = useMemoFirebase(
      () => firestore ? query(collection(firestore, 'posts'), orderBy('createdAt', 'desc')) : null,
      [firestore]
  );
  
  const { data: posts, isLoading, error } = useCollection<Post>(postsQuery);

  return (
    <div className="p-4 space-y-6 animate-in fade-in-50">
       <header className="py-4">
            <h1 className="text-2xl font-bold">Нийтлэлийн самбар</h1>
        </header>

        {isLoading && (
            <div className="space-y-6">
                <PostSkeleton />
                <PostSkeleton />
            </div>
        )}

        {error && (
            <Card>
                <CardContent className="p-6 text-center text-destructive">
                    Нийтлэлүүдийг ачаалахад алдаа гарлаа.
                </CardContent>
            </Card>
        )}

        {!isLoading && !error && posts && posts.length > 0 && (
            <div className="space-y-6">
                {posts.map(post => <PostCard key={post.id} post={post} />)}
            </div>
        )}

        {!isLoading && !error && (!posts || posts.length === 0) && (
             <Card>
                <CardContent className="p-10 text-center text-muted-foreground">
                   Одоогоор нийтлэл байхгүй байна.
                </CardContent>
            </Card>
        )}
    </div>
  );
}
