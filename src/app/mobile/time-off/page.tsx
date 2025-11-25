
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Check, X, Clock, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { Skeleton } from '@/components/ui/skeleton';

type TimeOffRequest = {
    id: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    type: 'Vacation' | 'Sick Leave' | 'Personal';
};

const statusConfig = {
    Pending: { icon: Clock, color: 'bg-yellow-500', label: 'Хүлээгдэж буй' },
    Approved: { icon: Check, color: 'bg-green-500', label: 'Зөвшөөрсөн' },
    Rejected: { icon: X, color: 'bg-red-500', label: 'Татгалзсан' },
};

function TimeOffRequestCard({ request }: { request: TimeOffRequest }) {
    const { icon: Icon, color, label } = statusConfig[request.status];
    const startDate = new Date(request.startDate).toLocaleDateString();
    const endDate = new Date(request.endDate).toLocaleDateString();

    return (
        <Card className="overflow-hidden">
            <div className="flex items-center">
                <div className={`w-2 h-full min-h-[90px] ${color}`}></div>
                <div className="p-4 flex-1">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-semibold">{request.type}</h3>
                            <p className="text-sm text-muted-foreground">{startDate} - {endDate}</p>
                        </div>
                        <Badge variant={request.status === 'Approved' ? 'default' : request.status === 'Rejected' ? 'destructive' : 'secondary'}>{label}</Badge>
                    </div>
                     <p className="text-sm text-muted-foreground mt-2">{request.reason}</p>
                </div>
            </div>
        </Card>
    )
}

function TimeOffSkeleton() {
    return (
        <div className="space-y-4 p-4">
            {Array.from({length: 3}).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                    <div className="flex items-center">
                        <Skeleton className="w-2 h-[90px]" />
                        <div className="p-4 flex-1 space-y-2">
                           <div className="flex justify-between">
                             <Skeleton className="h-5 w-24" />
                             <Skeleton className="h-6 w-20" />
                           </div>
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-4 w-full" />
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    )
}


export default function MobileTimeOffPage() {
    const { firestore } = useFirebase();
    const { employeeProfile, isProfileLoading } = useEmployeeProfile();

    const requestsQuery = useMemoFirebase(() => {
        if (!firestore || !employeeProfile) return null;
        return query(
            collection(firestore, `employees/${employeeProfile.id}/timeOffRequests`)
        );
    }, [firestore, employeeProfile]);

    const { data: requests, isLoading } = useCollection<TimeOffRequest>(requestsQuery);

    const filteredRequests = (status: TimeOffRequest['status']) => {
        return requests?.filter(r => r.status === status) || [];
    }
    
    if (isLoading || isProfileLoading) {
        return <TimeOffSkeleton />
    }

  return (
    <div className="h-full">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm p-4 border-b">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold">Миний чөлөө</h1>
                <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Хүсэлт гаргах
                </Button>
            </div>
        </header>

        <div className="p-4">
            <Tabs defaultValue="all">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="all">Бүгд</TabsTrigger>
                    <TabsTrigger value="pending">Хүлээгдэж буй</TabsTrigger>
                    <TabsTrigger value="approved">Зөвшөөрсөн</TabsTrigger>
                    <TabsTrigger value="rejected">Татгалзсан</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="mt-4 space-y-4">
                    {requests && requests.length > 0 ? (
                        requests.map(req => <TimeOffRequestCard key={req.id} request={req} />)
                    ) : (
                        <div className="text-center py-16">
                            <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                            <p className="mt-4 text-muted-foreground">Илгээсэн хүсэлт байхгүй.</p>
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="pending" className="mt-4 space-y-4">
                     {filteredRequests('Pending').map(req => <TimeOffRequestCard key={req.id} request={req} />)}
                </TabsContent>
                 <TabsContent value="approved" className="mt-4 space-y-4">
                     {filteredRequests('Approved').map(req => <TimeOffRequestCard key={req.id} request={req} />)}
                </TabsContent>
                 <TabsContent value="rejected" className="mt-4 space-y-4">
                     {filteredRequests('Rejected').map(req => <TimeOffRequestCard key={req.id} request={req} />)}
                </TabsContent>
            </Tabs>
        </div>
    </div>
  );
}
