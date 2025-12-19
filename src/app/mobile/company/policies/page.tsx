'use client';

import * as React from 'react';
import Link from 'next/link';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ChevronRight, FileText } from 'lucide-react';
import type { CompanyPolicy } from '@/app/dashboard/settings/policies/page';

function PageSkeleton() {
    return (
        <div className="p-4 space-y-4">
             <header className="py-4 relative flex items-center justify-center">
                <Skeleton className="h-9 w-9 absolute left-0" />
                <Skeleton className="h-7 w-48" />
            </header>
            <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        </div>
    )
}

function PolicyItem({ policy }: { policy: CompanyPolicy }) {
    return (
        <Link href={`/mobile/company/policies/${policy.id}`} className="block">
            <Card className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <FileText className="h-6 w-6 text-primary flex-shrink-0" />
                        <div>
                            <p className="font-semibold">{policy.title}</p>
                            <p className="text-sm text-muted-foreground">{policy.description}</p>
                        </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
            </Card>
        </Link>
    );
}

export default function MobilePoliciesPage() {
    const { employeeProfile, isProfileLoading } = useEmployeeProfile();

    const policiesQuery = useMemoFirebase(({firestore}) => firestore ? collection(firestore, 'companyPolicies') : null, []);
    const { data: policies, isLoading: isLoadingPolicies } = useCollection<CompanyPolicy>(policiesQuery);

    const applicablePolicies = React.useMemo(() => {
        if (!policies || !employeeProfile) return [];
        return policies.filter(policy => {
            return policy.appliesToAll || (employeeProfile.positionId && policy.applicablePositionIds?.includes(employeeProfile.positionId));
        });
    }, [policies, employeeProfile]);
    
    const isLoading = isProfileLoading || isLoadingPolicies;

    return (
        <div className="p-4">
             <header className="py-4 relative flex items-center justify-center">
                <Button asChild variant="ghost" size="icon" className="absolute left-0">
                    <Link href="/mobile/company">
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Буцах</span>
                    </Link>
                </Button>
                <h1 className="text-xl font-bold">Дүрэм, журам</h1>
            </header>

            {isLoading ? (
                <div className="space-y-3 mt-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
            ) : applicablePolicies.length > 0 ? (
                <div className="space-y-3 mt-4">
                    {applicablePolicies.map(policy => (
                        <PolicyItem key={policy.id} policy={policy} />
                    ))}
                </div>
            ) : (
                <div className="mt-8 text-center text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12" />
                    <p className="mt-4">Танд хамааралтай дүрэм, журам олдсонгүй.</p>
                </div>
            )}
        </div>
    );
}
