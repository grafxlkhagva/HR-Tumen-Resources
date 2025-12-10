'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useCollection, useFirebase, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { collection, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MessageSquare, ThumbsUp, ChevronsDown, ChevronsUp, Heart } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Employee } from '@/app/dashboard/employees/data';

type ReactionType = 'like' | 'love' | 'care';

type Post = {
    id: string;
    title: string;
    content: string;
    imageUrls?: string[];
    authorName: string;
    createdAt: string;
    reactions: { [userId: string]: ReactionType };
};

function ReactionIcon({ type, className }: { type: ReactionType, className?: string }) {
    if (type === 'like') return <ThumbsUp className={cn("h-5 w-5 text-white bg-blue-500 rounded-full p-0.5", className)} />;
    if (type === 'love') return <Heart className={cn("h-5 w-5 text-white bg-red-500 rounded-full p-0.5", className)} fill="white"/>;
    if (type === 'care') return <div className={cn("h-5 w-5 rounded-full bg-yellow-400 flex items-center justify-center text-xs", className)}>🤗</div>;
    return null;
}

function PostSkeleton() {
    return (
        <Card className="overflow-hidden rounded-lg shadow-md">
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
    const [isReactionsOpen, setIsReactionsOpen] = React.useState(false);
    const [reactionDetails, setReactionDetails] = React.useState<{ employee: Employee; reaction: ReactionType }[]>([]);
    const { firestore } = useFirebase();

    const reactions = post.reactions || {};
    const userReaction = userId ? reactions[userId] : null;

    const toggleExpand = () => setIsExpanded(!isExpanded);
    
    const handleReaction = (reaction: ReactionType) => {
        if (!firestore || !userId) return;
        const postRef = doc(firestore, 'posts', post.id);

        const currentReaction = reactions[userId];
        
        let newReactions = { ...reactions };
        if (currentReaction === reaction) {
            // User is removing their reaction
            delete newReactions[userId];
        } else {
            // User is adding or changing their reaction
            newReactions[userId] = reaction;
        }

        updateDocumentNonBlocking(postRef, { reactions: newReactions });
    }
    
    const showReactions = async () => {
        if (!firestore || Object.keys(reactions).length === 0) return;
        const employeeCollection = collection(firestore, 'employees');
        const details: { employee: Employee; reaction: ReactionType }[] = [];
        
        for (const uid in reactions) {
            const userDoc = await getDoc(doc(employeeCollection, uid));
            if (userDoc.exists()) {
                details.push({ employee: userDoc.data() as Employee, reaction: reactions[uid] });
            }
        }
        setReactionDetails(details);
        setIsReactionsOpen(true);
    };

    const reactionCounts = Object.values(reactions).reduce((acc, curr) => {
        acc[curr] = (acc[curr] || 0) + 1;
        return acc;
    }, {} as Record<ReactionType, number>);
    const totalReactions = Object.values(reactionCounts).reduce((a,b) => a+b, 0);

    return (
        <>
        <Dialog open={isReactionsOpen} onOpenChange={setIsReactionsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Реакцууд</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                    {reactionDetails.map(({ employee, reaction }) => (
                        <div key={employee.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={employee.photoURL} />
                                    <AvatarFallback>{employee.firstName?.[0]}</AvatarFallback>
                                </Avatar>
                                <span>{employee.firstName} {employee.lastName}</span>
                            </div>
                            <ReactionIcon type={reaction} />
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
        <Card className="overflow-hidden rounded-lg shadow-md">
             {post.imageUrls && post.imageUrls.length > 0 && (
                 <Carousel className="w-full bg-muted">
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
                <div className={cn("text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none break-words", !isExpanded && "line-clamp-3")} dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />') }} />
                 {totalReactions > 0 && (
                    <button onClick={showReactions} className="flex items-center mt-3">
                        <div className="flex items-center">
                            {(Object.keys(reactionCounts) as ReactionType[]).sort().map(r => <ReactionIcon key={r} type={r} className="-ml-1 first:ml-0 border-2 border-card rounded-full" />)}
                        </div>
                        <span className="ml-2 text-xs text-muted-foreground">{totalReactions}</span>
                    </button>
                )}
            </CardContent>
             <CardFooter className="flex flex-col items-start gap-2">
                 <div className="w-full h-px bg-border" />
                 <div className="flex w-full justify-between items-center">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" className={cn("flex-1", 
                                userReaction === 'like' && "text-blue-500 font-semibold",
                                userReaction === 'love' && "text-red-500 font-semibold",
                                userReaction === 'care' && "text-yellow-500 font-semibold",
                            )} disabled={!userId}>
                                {userReaction ? <ReactionIcon type={userReaction} /> : <ThumbsUp className="h-4 w-4" />}
                                <span className="ml-2">{userReaction ? userReaction.charAt(0).toUpperCase() + userReaction.slice(1) : 'Like'}</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-1 rounded-full">
                            <div className="flex gap-1">
                                <Button onClick={() => handleReaction('like')} variant="ghost" size="icon" className="p-1.5 rounded-full hover:bg-muted h-10 w-10"><ThumbsUp className="h-6 w-6 text-blue-500" /></Button>
                                <Button onClick={() => handleReaction('love')} variant="ghost" size="icon" className="p-1.5 rounded-full hover:bg-muted h-10 w-10"><Heart className="h-6 w-6 text-red-500" fill="currentColor" /></Button>
                                <Button onClick={() => handleReaction('care')} variant="ghost" size="icon" className="p-1.5 rounded-full hover:bg-muted h-10 w-10"><div className="text-xl">🤗</div></Button>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Button variant="ghost" className="flex-1">
                        <MessageSquare className="h-4 w-4" />
                        <span className="ml-2">Comment</span>
                    </Button>
                </div>
                 {post.content.length > 200 && (
                    <Button variant="link" className="p-0 h-auto text-primary text-xs" onClick={toggleExpand}>
                        {isExpanded ? 'Хураангуй' : 'Дэлгэрэнгүй унших'}
                        {isExpanded ? <ChevronsUp className="ml-1 h-4 w-4" /> : <ChevronsDown className="ml-1 h-4 w-4" />}
                    </Button>
                 )}
            </CardFooter>
        </Card>
        </>
    );
}

function EmployeeCarousel() {
    const { firestore } = useFirebase();
    const employeesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'employees') : null, [firestore]);
    const { data: employees, isLoading } = useCollection<Employee>(employeesQuery);

    if (isLoading) {
        return (
            <div className="flex space-x-4">
                {Array.from({length: 4}).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                        <Skeleton className="w-16 h-16 rounded-full" />
                        <Skeleton className="h-4 w-20" />
                    </div>
                ))}
            </div>
        )
    }

    if (!employees || employees.length === 0) {
        return null;
    }

    return (
        <Carousel opts={{ align: "start", loop: false }} className="w-full">
            <CarouselContent className="-ml-2">
                {employees.map((employee) => (
                    <CarouselItem key={employee.id} className="basis-1/4 pl-2">
                        <Link href={`/mobile/employees/${employee.id}`}>
                            <div className="flex flex-col items-center gap-2 text-center">
                                <Avatar className="w-16 h-16 border-2 border-transparent group-hover:border-primary transition-colors">
                                    <AvatarImage src={employee.photoURL} alt={employee.firstName} />
                                    <AvatarFallback>{employee.firstName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <p className="text-xs font-medium leading-tight line-clamp-2">{employee.firstName} {employee.lastName}</p>
                            </div>
                        </Link>
                    </CarouselItem>
                ))}
            </CarouselContent>
        </Carousel>
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
    <div className="space-y-6 animate-in fade-in-50">
       <header className="p-4 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
            <h1 className="text-2xl font-bold">Нүүр хуудас</h1>
            {employeeProfile && <p className="text-muted-foreground">Сайн уу, {employeeProfile.firstName}!</p>}
        </header>

        <div className="px-4 space-y-3">
            <h2 className="text-lg font-semibold">Хамт олон</h2>
            <EmployeeCarousel />
        </div>
        
        <div className="space-y-3">
            <h2 className="text-lg font-semibold px-4">Нийтлэлийн самбар</h2>
            {isLoading && (
                <div className="px-4 space-y-6">
                    <PostSkeleton />
                    <PostSkeleton />
                </div>
            )}

            {error && (
                <Card className="mx-4">
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
                 <Card className="mx-4">
                    <CardContent className="p-10 text-center text-muted-foreground">
                       Одоогоор нийтлэл байхгүй байна.
                    </CardContent>
                </Card>
            )}
        </div>
    </div>
  );
}
