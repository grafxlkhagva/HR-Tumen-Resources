'use client';

import { useRouter } from 'next/navigation';
import { query, where, orderBy } from 'firebase/firestore';
import { useMemoFirebase, tenantCollection, useFetchCollection } from '@/firebase';
import { LegalContract } from '@/types/legal';
import { ContractCard } from '@/components/legal/contract-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Plus } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import Link from 'next/link';

interface EmployeeContractsTabProps {
  employeeId: string;
}

export function EmployeeContractsTab({ employeeId }: EmployeeContractsTabProps) {
  const router = useRouter();

  const contractsQuery = useMemoFirebase(
    ({ firestore: fs, companyPath }) =>
      fs
        ? query(
            tenantCollection(fs, companyPath, 'legal_contracts'),
            where('employeeId', '==', employeeId),
            orderBy('createdAt', 'desc')
          )
        : null,
    [employeeId]
  );

  const { data: contracts, isLoading } = useFetchCollection<LegalContract>(contractsQuery);

  const now = new Date();

  const activeContracts = contracts?.filter(c => c.status === 'ACTIVE') ?? [];
  const expiringSoonContracts =
    contracts?.filter(c => {
      if (c.status !== 'ACTIVE' || !c.endDate) return false;
      const days = differenceInDays(parseISO(c.endDate), now);
      return days >= 0 && days <= 60;
    }) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {activeContracts.length > 0 && (
            <span className="text-sm text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1">
              {activeContracts.length} идэвхтэй гэрээ
            </span>
          )}
          {expiringSoonContracts.length > 0 && (
            <span className="text-sm text-amber-700 font-medium bg-amber-50 border border-amber-200 rounded-lg px-3 py-1">
              {expiringSoonContracts.length} дуусч байгаа (60 хоног)
            </span>
          )}
        </div>
        <Button size="sm" asChild>
          <Link
            href={`/dashboard/legal/contracts/new?employeeId=${employeeId}&contractType=employment`}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Шинэ гэрээ үүсгэх
          </Link>
        </Button>
      </div>

      {/* Empty state */}
      {(!contracts || contracts.length === 0) && (
        <div className="rounded-xl border bg-white p-10 text-center space-y-4">
          <FileText className="mx-auto h-10 w-10 text-slate-200" />
          <p className="text-sm text-slate-500">Энэ ажилтанд гэрээ байхгүй байна</p>
          <Button variant="outline" size="sm" asChild>
            <Link
              href={`/dashboard/legal/contracts/new?employeeId=${employeeId}&contractType=employment`}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Гэрээ үүсгэх
            </Link>
          </Button>
        </div>
      )}

      {/* Contract list */}
      {contracts && contracts.length > 0 && (
        <div className="space-y-2">
          {contracts.map(contract => (
            <ContractCard
              key={contract.id}
              contract={contract}
              onClick={() => router.push(`/dashboard/legal/contracts/${contract.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
