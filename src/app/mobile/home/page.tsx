'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useCollection, useFirebase, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { collection, query, orderBy, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MessageSquare, ThumbsUp, ArrowRight, ChevronsDown, ChevronsUp } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';


type Post = {
    id: string;
    title: string;
    content: string;
    imageUrls?: string[];
    authorName: string;
    createdAt: string;
    likes: string[];
};

function PostSkeleton() {
    return (
        <Card className="overflow-hidden">
            <Skeleton className="aspect-video w-full" />
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

function PostCard({ post, userId }: { post: Post, userId: string | null }) {
    const postDate = new Date(post.createdAt);
    const [isExpanded, setIsExpanded] = React.useState(false);
    const { firestore } = useFirebase();

    const isLiked = userId ? (post.likes || []).includes(userId) : false;

    const toggleExpand = () => setIsExpanded(!isExpanded);
    
    const handleLike = () => {
        if (!firestore || !userId) return;
        const postRef = doc(firestore, 'posts', post.id);
        updateDocumentNonBlocking(postRef, {
            likes: isLiked ? arrayRemove(userId) : arrayUnion(userId)
        });
    }

    return (
        <Card className="overflow-hidden">
             {post.imageUrls && post.imageUrls.length > 0 && (
                 <Carousel className="w-full">
                    <CarouselContent>
                    {post.imageUrls.map((url, index) => (
                        <CarouselItem key={index}>
                            <div className="relative aspect-video w-full">
                                <Image src={url} alt={`${post.title} image ${index + 1}`} fill className="object-cover" />
                            </div>
                        </CarouselItem>
                    ))}
                    </CarouselContent>
                    {post.imageUrls.length > 1 && (
                        <>
                            <CarouselPrevious className="left-2" />
                            <CarouselNext className="right-2" />
                        </>
                    )}
                </Carousel>
            )}
            <CardHeader>
                <CardTitle className="text-lg">{post.title}</CardTitle>
                <CardDescription>
                    {post.authorName} - {format(postDate, 'yyyy.MM.dd')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className={cn("text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none", !isExpanded && "line-clamp-3")} dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />') }} />
            </CardContent>
            <CardFooter className="flex justify-between items-center">
                 <Button variant="link" className="p-0 h-auto text-primary" onClick={toggleExpand}>
                    {isExpanded ? 'Хураангуй' : 'Дэлгэрэнгүй унших'}
                    {isExpanded ? <ChevronsUp className="ml-2 h-4 w-4" /> : <ChevronsDown className="ml-2 h-4 w-4" />}
                </Button>
                <div className="flex items-center gap-4 text-muted-foreground">
                    <button 
                        className={cn("flex items-center gap-1.5 text-sm transition-colors", isLiked ? "text-primary hover:text-primary/80" : "hover:text-primary")}
                        onClick={handleLike}
                        disabled={!userId}
                        >
                        <ThumbsUp className={cn("h-4 w-4", isLiked && "fill-current")} />
                        <span>{post.likes?.length || 0}</span>
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
  const { employeeProfile } = useEmployeeProfile();

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
                {posts.map(post => <PostCard key={post.id} post={post} userId={employeeProfile?.id || null} />)}
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
