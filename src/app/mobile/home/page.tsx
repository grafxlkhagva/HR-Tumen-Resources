'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCollection, useFirebase, useMemoFirebase, updateDocumentNonBlocking, useDoc } from '@/firebase';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { collection, query, orderBy, doc, getDoc, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MessageSquare, ThumbsUp, ChevronsDown, ChevronsUp, Heart, Clock, Calendar, CheckCircle, ArrowRight, BookOpen, User, Bell, Search, Sparkles } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Employee } from '@/app/dashboard/employees/data';
import { Badge } from '@/components/ui/badge';

// --- Types ---

type ReactionType = 'like' | 'love' | 'care';

type Post = {
    id: string;
    title: string;
    content: string;
    imageUrls?: string[];
    authorName: string;
    authorId?: string; // Optimistically standardizing
    createdAt: string;
    reactions: { [userId: string]: ReactionType };
};

type AttendanceRecord = {
    id: string;
    employeeId: string;
    date: string; // yyyy-MM-dd
    checkInTime: string;
    checkOutTime?: string;
    status: 'PRESENT' | 'LEFT';
}

type AssignedProgram = {
    id: string;
    programId: string;
    programName: string;
    status: 'IN_PROGRESS' | 'COMPLETED';
    progress: number;
    startDate: string;
    employeeId: string;
}

// --- Components ---

function ReactionIcon({ type, className }: { type: ReactionType, className?: string }) {
    if (type === 'like') return <ThumbsUp className={cn("h-5 w-5 text-white bg-blue-500 rounded-full p-1 shadow-sm", className)} />;
    if (type === 'love') return <Heart className={cn("h-5 w-5 text-white bg-red-500 rounded-full p-1 shadow-sm", className)} fill="white" />;
    if (type === 'care') return <div className={cn("h-5 w-5 rounded-full bg-amber-400 flex items-center justify-center text-[10px] shadow-sm", className)}>🤗</div>;
    return null;
}

function PostSkeleton() {
    return (
        <Card className="overflow-hidden rounded-3xl shadow-sm border-0 bg-white mb-6">
            <CardHeader className="flex flex-row items-center gap-3 pb-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                </div>
            </CardHeader>
            <CardContent className="space-y-3 pb-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="aspect-video w-full rounded-2xl" />
            </CardContent>
            <CardFooter className="pt-0">
                <Skeleton className="h-8 w-24 rounded-full" />
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
            delete newReactions[userId];
        } else {
            newReactions[userId] = reaction;
        }

        updateDocumentNonBlocking(postRef, { reactions: newReactions });
    }

    const showReactions = async () => {
        if (!firestore || Object.keys(reactions).length === 0) return;
        const employeeCollection = collection(firestore, 'employees');
        const details: { employee: Employee; reaction: ReactionType }[] = [];

        // In a real app, query by IDs properly or cache users. For now, fetch individually.
        for (const uid in reactions) {
            // Optimization: In a real scenario, we'd batch fetch.
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
    const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);

    return (
        <Card className="overflow-hidden rounded-3xl shadow-sm border border-slate-100 bg-white mb-6 hover:shadow-md transition-shadow">
            <Dialog open={isReactionsOpen} onOpenChange={setIsReactionsOpen}>
                <DialogContent className="rounded-2xl w-[90vw]">
                    <DialogHeader>
                        <DialogTitle>Реакцууд</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                        {reactionDetails.map(({ employee, reaction }) => (
                            <div key={employee.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={employee.photoURL} />
                                        <AvatarFallback>{employee.firstName?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium">{employee.firstName} {employee.lastName}</span>
                                </div>
                                <ReactionIcon type={reaction} />
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            <CardHeader className="flex flex-row items-center gap-3 p-4 pb-3">
                <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                    {/* Placeholder for author image - in a real app would be fetched */}
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold">
                        {post.authorName.charAt(0)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900">{post.authorName}</span>
                    <span className="text-xs text-muted-foreground">{format(postDate, 'yyyy.MM.dd HH:mm')}</span>
                </div>
            </CardHeader>

            <CardContent className="p-4 pt-0 space-y-3">
                <h3 className="text-base font-bold text-slate-800 leading-tight">{post.title}</h3>
                <div
                    className={cn("text-sm text-slate-600 leading-relaxed transition-all", !isExpanded && "line-clamp-3")}
                    dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />') }}
                />
                {post.content.length > 200 && (
                    <button onClick={toggleExpand} className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1">
                        {isExpanded ? <>Хураах <ChevronsUp className="h-3 w-3" /></> : <>Цааш унших <ChevronsDown className="h-3 w-3" /></>}
                    </button>
                )}

                {post.imageUrls && post.imageUrls.length > 0 && (
                    <div className="rounded-2xl overflow-hidden mt-2 shadow-sm border border-slate-100">
                        <Carousel className="w-full">
                            <CarouselContent>
                                {post.imageUrls.map((url, index) => (
                                    <CarouselItem key={index}>
                                        <div className="relative aspect-video w-full bg-slate-50">
                                            <Image src={url} alt={`Post attachment ${index + 1}`} fill className="object-cover" />
                                        </div>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            {post.imageUrls.length > 1 && (
                                <>
                                    <CarouselPrevious className="left-2 bg-white/80 backdrop-blur-sm border-0" />
                                    <CarouselNext className="right-2 bg-white/80 backdrop-blur-sm border-0" />
                                </>
                            )}
                        </Carousel>
                    </div>
                )}
            </CardContent>

            <CardFooter className="p-4 pt-0 flex flex-col items-start gap-4">
                {/* Reaction Counts */}
                {totalReactions > 0 && (
                    <button onClick={showReactions} className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-slate-50 transition-colors">
                        <div className="flex -space-x-2">
                            {(Object.keys(reactionCounts) as ReactionType[]).sort().map(r => (
                                <div key={r} className="ring-2 ring-white rounded-full">
                                    <ReactionIcon type={r} />
                                </div>
                            ))}
                        </div>
                        <span className="text-xs font-medium text-slate-500">{totalReactions}</span>
                    </button>
                )}

                {/* Action Bar */}
                <div className="flex w-full items-center justify-between border-t border-slate-100 pt-3">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className={cn("flex-1 gap-2 rounded-xl transition-all hover:bg-slate-50",
                                userReaction ? "text-primary bg-primary/5" : "text-slate-500"
                            )}>
                                {userReaction ? <ReactionIcon type={userReaction} /> : <ThumbsUp className="h-5 w-5" />}
                                <span className="text-sm font-medium">{userReaction ? 'Таалагдлаа' : 'Таалагдлаа'}</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2 rounded-full shadow-xl border-none bg-white flex gap-2" align="start" sideOffset={-10}>
                            <button onClick={() => handleReaction('like')} className="p-2 hover:bg-blue-50 rounded-full transition-transform hover:scale-125"><ThumbsUp className="h-6 w-6 text-blue-500 fill-blue-500" /></button>
                            <button onClick={() => handleReaction('love')} className="p-2 hover:bg-red-50 rounded-full transition-transform hover:scale-125"><Heart className="h-6 w-6 text-red-500 fill-red-500" /></button>
                            <button onClick={() => handleReaction('care')} className="p-2 hover:bg-amber-50 rounded-full transition-transform hover:scale-125 text-2xl leading-none">🤗</button>
                        </PopoverContent>
                    </Popover>

                    <Button variant="ghost" size="sm" className="flex-1 gap-2 rounded-xl text-slate-500 hover:bg-slate-50">
                        <MessageSquare className="h-5 w-5" />
                        <span className="text-sm font-medium">Сэтгэгдэл</span>
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}

function EmployeeCarousel() {
    const { firestore } = useFirebase();
    const employeesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'employees') : null, [firestore]);
    const { data: employees, isLoading } = useCollection<Employee>(employeesQuery);

    if (isLoading) {
        return (
            <div className="flex gap-4 overflow-hidden px-6 pb-6">
                {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-16 w-16 rounded-2xl shrink-0" />
                ))}
            </div>
        )
    }

    if (!employees || employees.length === 0) return null;

    return (
        <div className="w-full overflow-x-auto pb-6 px-6 -mx-0 scrollbar-hide">
            <div className="flex gap-4 w-max">
                {employees.map((employee) => (
                    <Link href={`/mobile/employees/${employee.id}`} key={employee.id} className="group relative">
                        <div className="flex flex-col items-center gap-2">
                            <div className="relative">
                                <Avatar className="w-16 h-16 rounded-2xl border-2 border-white shadow-sm group-hover:shadow-md transition-all group-hover:scale-105 ring-2 ring-transparent group-hover:ring-primary/20">
                                    <AvatarImage src={employee.photoURL} alt={employee.firstName} className="object-cover" />
                                    <AvatarFallback className="rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 font-bold">
                                        {employee.firstName?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                {/* Online indicator placeholder - can be real later */}
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                            </div>
                            <span className="text-[11px] font-medium text-slate-600 max-w-[64px] truncate text-center group-hover:text-primary transition-colors">
                                {employee.firstName}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

function AttendanceStatusWidget() {
    const { employeeProfile } = useEmployeeProfile();
    const { firestore } = useFirebase();
    const router = useRouter();
    const [currentTime, setCurrentTime] = React.useState(new Date());

    React.useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000 * 60);
        return () => clearInterval(timer);
    }, []);

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const attendanceQuery = useMemoFirebase(() => employeeProfile ? query(
        collection(firestore, 'attendance'),
        where('employeeId', '==', employeeProfile.id),
        where('date', '==', todayStr)
    ) : null, [firestore, employeeProfile, todayStr]);

    const { data: attendanceRecords, isLoading } = useCollection<AttendanceRecord>(attendanceQuery);
    const todayRecord = attendanceRecords?.[0];

    const isCheckedIn = !!todayRecord && !todayRecord.checkOutTime;
    const isCheckedOut = !!todayRecord?.checkOutTime;

    const durationText = React.useMemo(() => {
        if (!todayRecord?.checkInTime) return null;
        const start = new Date(todayRecord.checkInTime);
        const end = todayRecord.checkOutTime ? new Date(todayRecord.checkOutTime) : currentTime;
        const diff = differenceInMinutes(end, start);
        const hours = Math.floor(diff / 60);
        const mins = diff % 60;
        return `${hours}ц ${mins}м`;
    }, [todayRecord, currentTime]);

    if (isLoading) return <Skeleton className="h-32 w-full rounded-3xl" />;

    return (
        <div className="px-6">
            <Card className="rounded-3xl border-0 shadow-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white overflow-hidden relative group cursor-pointer transition-transform active:scale-[0.98]" onClick={() => router.push('/mobile/attendance')}>
                {/* Decorative shapes */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

                <CardContent className="p-5 relative z-10 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1 opacity-90">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs font-semibold tracking-wide uppercase">Өнөөдрийн ирц</span>
                        </div>

                        <div className="flex items-baseline gap-2 mb-2">
                            {todayRecord ? (
                                <span className="text-3xl font-bold tracking-tight">
                                    {todayRecord.checkInTime ? format(new Date(todayRecord.checkInTime), 'HH:mm') : '--:--'}
                                </span>
                            ) : (
                                <span className="text-2xl font-bold opacity-90">Бүртгэлгүй</span>
                            )}
                        </div>

                        {durationText ? (
                            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
                                ⏱ {durationText}
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
                                Та бүртгүүлээгүй байна
                            </Badge>
                        )}
                    </div>

                    <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                        {isCheckedIn ? <CheckCircle className="w-6 h-6 text-white animate-pulse" /> : <ArrowRight className="w-6 h-6 text-white" />}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function OnboardingWidget() {
    const { employeeProfile } = useEmployeeProfile();
    const { firestore } = useFirebase();
    const router = useRouter();

    const assignedProgramsQuery = useMemoFirebase(() => employeeProfile ? query(
        collection(firestore, `employees/${employeeProfile.id}/assignedPrograms`),
        where('status', '==', 'IN_PROGRESS'),
        orderBy('startDate', 'desc')
    ) : null, [firestore, employeeProfile?.id]);

    const { data: programs, isLoading } = useCollection<AssignedProgram>(assignedProgramsQuery);

    if (isLoading || !programs || programs.length === 0) return null;

    const program = programs[0];

    return (
        <div className="px-6">
            <h2 className="text-lg font-bold text-slate-800 mb-3 px-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" /> Таны хөтөлбөр
            </h2>
            <Card className="border-0 shadow-md bg-white rounded-3xl overflow-hidden active:scale-[0.98] transition-transform cursor-pointer" onClick={() => router.push(`/mobile/onboarding/${program.id}`)}>
                <div className="h-2 bg-gradient-to-r from-blue-500 to-cyan-400" />
                <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                            <h3 className="font-bold text-base text-slate-800 line-clamp-1">{program.programName}</h3>
                            <p className="text-xs text-slate-500 font-medium">Эхэлсэн: {format(new Date(program.startDate), 'MM/dd')}</p>
                        </div>
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-600 font-bold text-xs ring-4 ring-blue-50/50">
                            {Math.round(program.progress)}%
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Progress value={program.progress} className="h-2 rounded-full bg-slate-100" />
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-medium">Дуусгах хугацаа: 7 хоногийн дараа</span>
                            <span className="text-blue-600 font-bold flex items-center">Үргэлжлүүлэх <ArrowRight className="w-3 h-3 ml-1" /></span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function QuickActions() {
    const router = useRouter();

    const actions = [
        { label: 'Чөлөө', icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50', onClick: () => router.push('/mobile/attendance?tab=requests') },
        { label: 'Цалин', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', onClick: () => { } },
        { label: 'Дүрэм', icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50', onClick: () => router.push('/mobile/company/policies') },
        { label: 'Тусламж', icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50', onClick: () => { } },
    ];

    return (
        <div className="px-6 grid grid-cols-4 gap-4">
            {actions.map((action, i) => (
                <div key={i} className="flex flex-col items-center gap-2 cursor-pointer group active:scale-95 transition-transform" onClick={action.onClick}>
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm group-hover:shadow-md border border-slate-100 bg-white", action.color)}>
                        <action.icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-600 text-center">{action.label}</span>
                </div>
            ))}
        </div>
    )
}

export default function MobileHomePage() {
    const { firestore } = useFirebase();
    const { employeeProfile } = useEmployeeProfile();

    const postsQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, 'posts'), orderBy('createdAt', 'desc')) : null,
        [firestore]
    );

    const { data: posts, isLoading, error } = useCollection<Post>(postsQuery);
    const { data: companyProfile } = useDoc<{ name: string; logoUrl?: string }>(
        useMemoFirebase(() => (firestore ? doc(firestore, 'company', 'profile') : null), [firestore])
    );

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20 font-sans">
            {/* Sticky Header with Blur */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 rounded-xl overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shadow-md">
                        <div className="h-full w-full bg-white rounded-[10px] flex items-center justify-center overflow-hidden">
                            {companyProfile?.logoUrl ? (
                                <Image src={companyProfile.logoUrl} alt="Logo" fill className="object-contain p-1" />
                            ) : (
                                <span className="font-bold text-indigo-600 text-xs">HR</span>
                            )}
                        </div>
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-slate-900 leading-none mb-1">
                            {companyProfile?.name || 'HR System'}
                        </h1>
                        <p className="text-xs font-medium text-slate-500">
                            {employeeProfile ? `👋 Сайн уу, ${employeeProfile.firstName}` : 'Тавтай морилно уу'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 h-9 w-9">
                        <Search className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 h-9 w-9 relative">
                        <Bell className="h-4 w-4" />
                        <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />
                    </Button>
                </div>
            </header>

            <main className="space-y-8 pt-6 animate-in fade-in-30 slide-in-from-bottom-5">
                {/* Attendance Card */}
                <AttendanceStatusWidget />

                {/* Quick Actions Grid */}
                <QuickActions />

                {/* Onboarding Widget (Conditional) */}
                <OnboardingWidget />

                {/* Team Section */}
                <div className="space-y-3">
                    <div className="px-6 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-800">Хамт олон</h2>
                        <Link href="/mobile/employees" className="text-xs font-semibold text-primary hover:underline">Бүгд &rarr;</Link>
                    </div>
                    <EmployeeCarousel />
                </div>

                {/* News Feed */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-800 px-6">Шинэ мэдээ</h2>

                    {isLoading && (
                        <div className="px-6">
                            <PostSkeleton />
                            <PostSkeleton />
                        </div>
                    )}

                    {error && (
                        <div className="px-6">
                            <Card className="bg-red-50 border-red-100 p-6 text-center rounded-3xl">
                                <p className="text-red-600 text-sm font-medium">Мэдээлэл ачаалахад алдаа гарлаа.</p>
                            </Card>
                        </div>
                    )}

                    {!isLoading && !error && posts && posts.length > 0 && (
                        <div className="px-6 pb-6">
                            {posts.map(post => <PostCard key={post.id} post={post} userId={employeeProfile?.id || null} />)}
                        </div>
                    )}

                    {!isLoading && !error && (!posts || posts.length === 0) && (
                        <div className="px-6">
                            <Card className="bg-slate-50 border-dashed border-2 border-slate-200 p-12 text-center rounded-3xl">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <MessageSquare className="w-8 h-8 text-slate-400" />
                                </div>
                                <h3 className="text-slate-900 font-bold">Одоогоор мэдээ алга</h3>
                                <p className="text-slate-500 text-sm mt-1">Шинэ мэдээлэл орохоор энд харагдах болно.</p>
                            </Card>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
