'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { differenceInDays, addMonths, parseISO } from 'date-fns';
import { query, where, orderBy } from 'firebase/firestore';
import { useTenant } from '@/contexts/tenant-context';
import { updateDocumentNonBlocking, useTenantWrite, useMemoFirebase, tenantCollection, useFetchCollection } from '@/firebase';
import { Employee } from '@/types';
import { LegalContract } from '@/types/legal';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProbationAlertProps {
  /** Employee object from the profile page */
  employee: Employee;
  /**
   * Optional pre-fetched contracts. If omitted the component fetches
   * the employee's active employment contracts itself.
   */
  contracts?: LegalContract[];
}

type AlertLevel = 'warning' | 'danger';

interface ProbationAlert {
  level: AlertLevel;
  daysLeft: number;
  message: string;
  contract: LegalContract;
}

function detectProbationAlert(
  employee: Employee,
  contracts: LegalContract[]
): ProbationAlert | null {
  if (employee.status !== 'active_probation') return null;

  // Find the active employment contract
  const employmentContract = contracts.find(
    c => c.status === 'ACTIVE' && c.category === 'employment' && c.startDate
  );
  if (!employmentContract || !employmentContract.startDate) return null;

  // Managers get 6-month probation, others 3 months
  const isManager =
    employee.role === 'manager' ||
    employee.role === 'company_super_admin' ||
    employee.role === 'admin';
  const probationMonths = isManager ? 6 : 3;

  const startDate = parseISO(employmentContract.startDate);
  const probationEnd = addMonths(startDate, probationMonths);
  const now = new Date();
  const daysLeft = differenceInDays(probationEnd, now);

  if (daysLeft < 0) {
    // Already expired
    return {
      level: 'danger',
      daysLeft,
      message: `Туршилтын хугацаа ${Math.abs(daysLeft)} өдрийн өмнө дуусчээ`,
      contract: employmentContract,
    };
  }

  if (daysLeft <= 14) {
    return {
      level: 'warning',
      daysLeft,
      message: `Туршилтын хугацаа ${daysLeft} өдрийн дараа дуусна`,
      contract: employmentContract,
    };
  }

  return null;
}

export function ProbationAlert({ employee, contracts: contractsProp }: ProbationAlertProps) {
  const router = useRouter();
  const tenant = useTenant();
  const { tDoc } = useTenantWrite();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Self-fetch contracts when not provided
  const selfFetchQuery = useMemoFirebase(
    ({ firestore, companyPath }) =>
      firestore && employee.status === 'active_probation' && !contractsProp
        ? query(
            tenantCollection(firestore, companyPath, 'legal_contracts'),
            where('employeeId', '==', employee.id),
            where('status', '==', 'ACTIVE'),
            orderBy('createdAt', 'desc')
          )
        : null,
    [employee.id, employee.status, contractsProp]
  );
  const { data: fetchedContracts } = useFetchCollection<LegalContract>(selfFetchQuery);
  const contracts = contractsProp ?? fetchedContracts ?? [];

  // Only visible to HR managers and admins
  if (!tenant.isManager) return null;

  const alert = detectProbationAlert(employee, contracts);
  if (!alert) return null;

  async function handleMakePermanent() {
    setIsProcessing(true);
    try {
      const empRef = tDoc('employees', employee.id);
      await updateDocumentNonBlocking(empRef, { status: 'active_permanent' });
      toast({ title: 'Ажилтан байнгын болгогдлоо' });
      setDialogOpen(false);
    } catch {
      toast({ title: 'Алдаа гарлаа', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  }

  function handleOffboarding() {
    setDialogOpen(false);
    router.push(`/dashboard/offboarding/new?employeeId=${employee.id}`);
  }

  return (
    <>
      <div
        className={cn(
          'rounded-xl border p-4 flex items-start gap-3',
          alert.level === 'danger'
            ? 'bg-red-50 border-red-200'
            : 'bg-amber-50 border-amber-200'
        )}
      >
        <div
          className={cn(
            'mt-0.5 shrink-0',
            alert.level === 'danger' ? 'text-red-500' : 'text-amber-500'
          )}
        >
          {alert.level === 'danger' ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <Clock className="h-5 w-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-sm font-semibold',
              alert.level === 'danger' ? 'text-red-700' : 'text-amber-700'
            )}
          >
            Туршилтын хугацаа дуусч байна
          </p>
          <p
            className={cn(
              'text-xs mt-0.5',
              alert.level === 'danger' ? 'text-red-600' : 'text-amber-600'
            )}
          >
            {alert.message}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className={cn(
            'shrink-0',
            alert.level === 'danger'
              ? 'border-red-200 text-red-700 hover:bg-red-100'
              : 'border-amber-200 text-amber-700 hover:bg-amber-100'
          )}
          onClick={() => setDialogOpen(true)}
        >
          Шийдвэр гаргах
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Туршилтын хугацааны шийдвэр</DialogTitle>
            <DialogDescription>
              {employee.lastName} {employee.firstName} — {alert.message}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Button
              className="w-full justify-start"
              variant="outline"
              disabled={isProcessing}
              onClick={handleMakePermanent}
            >
              ✅ Байнгын ажилтан болгох
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              disabled={isProcessing}
              onClick={handleOffboarding}
            >
              🚪 Ажлаасаа гарах (Offboarding)
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDialogOpen(false)}
              disabled={isProcessing}
            >
              Хаах
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
