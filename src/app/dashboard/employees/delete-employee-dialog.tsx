// src/app/dashboard/employees/delete-employee-dialog.tsx
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useTenantWrite } from '@/firebase';
import { getDoc, writeBatch, Timestamp } from 'firebase/firestore';
import type { Employee } from './data';
import { useRouter } from 'next/navigation';
import { canTransition } from '@/lib/employee-status-machine';
import {
    checkReleaseEligibility,
    getReleaseDocumentUrl,
} from '@/lib/services/employee-release-service';
import { getAppointmentDocumentUrl } from '@/lib/services/employee-appointment-service';
import { setEmployeeAuthDisabled } from '@/lib/services/employee-auth-service';
import {
    cleanupEmployeeSideEffects,
    formatSideEffectsToast,
} from '@/lib/services/employee-side-effects';
import * as Sentry from '@sentry/nextjs';
import { logAudit } from '@/lib/client/audit-client';
import type { EmployeeStatus } from '@/types';
import Link from 'next/link';

const deleteSchema = z.object({
  reason: z.enum(['Ажлаас чөлөөлөгдсөн', 'Түр чөлөөлсөн', 'Алдаатай бүртгэл']),
});

type DeleteFormValues = z.infer<typeof deleteSchema>;

interface DeleteEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}

export function DeleteEmployeeDialog({
  open,
  onOpenChange,
  employee,
}: DeleteEmployeeDialogProps) {
  const { firestore, tDoc, companyPath } = useTenantWrite();
  const auth = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const router = useRouter();

  // Idempotency / eligibility guard — release dialog-тэй ижил pattern.
  // Delete нь "terminated" эцсийн төлөв рүү шилжүүлдэг тул release-тай ижил
  // дүрмийн дагуу шалгах ёстой (хэрэв releasing процесс явагдаж байгаа бол блоклох).
  const [eligibility, setEligibility] = React.useState<
    | null
    | { allowed: true }
    | {
        allowed: false;
        reason: string;
        activeReleaseDocId?: string;
        activeAppointmentDocId?: string;
      }
  >(null);

  const form = useForm<DeleteFormValues>({
    resolver: zodResolver(deleteSchema),
    defaultValues: {
      reason: undefined,
    },
  });

  // Dialog хаагдахад form-ийг цэвэрлэх
  React.useEffect(() => {
    if (!open) {
      form.reset();
      setEligibility(null);
    }
  }, [open, form]);

  // Dialog нээгдэх үеийн eligibility шалгалт.
  React.useEffect(() => {
    if (!open || !firestore || !employee?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await checkReleaseEligibility({
          firestore,
          companyPath: companyPath ?? null,
          employeeId: employee.id,
          employeeStatus: employee.status as EmployeeStatus | undefined,
        });
        if (cancelled) return;
        if (result.allowed) {
          setEligibility({ allowed: true });
        } else {
          setEligibility({
            allowed: false,
            reason: result.reason,
            activeReleaseDocId: result.activeReleaseDoc?.id,
            activeAppointmentDocId: result.activeAppointmentDoc?.id,
          });
        }
      } catch (e) {
        console.error('[DeleteDialog] Eligibility check failed:', e);
        if (!cancelled) setEligibility({ allowed: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, firestore, companyPath, employee?.id, employee?.status]);

  const onSubmit = async (data: DeleteFormValues) => {
    if (!employee || !firestore) return;

    // Idempotency guard — release dialog-той ижил. Dialog нээгдсэнээс хойш
    // өөр session release эхлүүлсэн байж болзошгүй тул submit үед дахин шалгана.
    if (eligibility && eligibility.allowed === false) {
      toast({
        variant: 'destructive',
        title: 'Үйлдэл боломжгүй',
        description: eligibility.reason,
      });
      return;
    }

    setIsSubmitting(true);

    let newStatus: EmployeeStatus;
    switch (data.reason) {
      case 'Ажлаас чөлөөлөгдсөн':
      case 'Алдаатай бүртгэл':
        newStatus = 'terminated';
        break;
      case 'Түр чөлөөлсөн':
        newStatus = 'suspended';
        break;
    }

    try {
      // State transition guard — employee-status-machine ашиглан хүчинтэй шилжилтийг
      // шалгах. Жишээ нь terminated → terminated нь ok гэж тооцогдох ч terminated
      // төлвөөс бусад руу шилжих оролдлого блоклогдоно.
      const currentStatus = employee.status as EmployeeStatus | undefined;
      if (!currentStatus) {
        throw new Error('Ажилтны одоогийн төлөв тодорхойгүй байна.');
      }
      if (!canTransition(currentStatus, newStatus)) {
        throw new Error(
          `Төлвийн шилжилт буруу байна: "${currentStatus}" → "${newStatus}".`,
        );
      }

      // Step 2: Update Firestore document status and position counts
      const batch = writeBatch(firestore);
      const employeeDocRef = tDoc('employees', employee.id);

      // terminationDate нь зөвхөн terminated төлөвт орох үед тавигдана.
      // suspended (Түр чөлөөлсөн) үед тавигдахгүй — өмнө нь хоёуланд тавигдаж
      // байсан нь буруу байсан.
      batch.update(employeeDocRef, {
        status: newStatus,
        ...(newStatus === 'terminated'
          ? { terminationDate: new Date().toISOString(), loginDisabled: true }
          : {}),
        updatedAt: Timestamp.now(),
      });

      // 3. Decrement position filled count if employee was assigned
      if (employee.positionId && newStatus === 'terminated') {
        const posRef = tDoc('positions', employee.positionId);
        const posSnap = await getDoc(posRef);
        if (posSnap.exists()) {
          const currentFilled = posSnap.data().filled || 0;
          batch.update(posRef, { filled: Math.max(0, currentFilled - 1) });
        }
      }

      await batch.commit();

      // Firebase Auth account-ыг disable хийх (Admin SDK API).
      // terminated төлвөөр л блоклоно — suspended нь нэвтэрч болох төлөв.
      // Алдаа гарвал batch аль хэдийн commit хийсэн тул user-д warning toast-ыг
      // харуулаад үргэлжлүүлнэ (Firestore флаг тавигдсан тул UI зөв харагдана).
      if (newStatus === 'terminated') {
        const terminateCompanyId = companyPath ? companyPath.split('/')[1] : undefined;
        try {
          await setEmployeeAuthDisabled(auth, employee.id, true, terminateCompanyId);
        } catch (authErr: any) {
          console.error('[DeleteDialog] Auth disable failed:', authErr);
          toast({
            variant: 'destructive',
            title: 'Анхааруулга: Нэвтрэх эрхийг хаах амжилтгүй',
            description:
              authErr?.message ||
              'Ажилтны төлөв шинэчлэгдсэн ч Firebase Auth account-ыг хааж чадсангүй. Админд хандана уу.',
          });
        }

        // Side effects cleanup — department head, pending vacation, onboarding projects.
        // Best-effort: алдаа гарвал warning toast харуулаад continue.
        try {
          const sideEffects = await cleanupEmployeeSideEffects({
            firestore,
            companyPath,
            employeeId: employee.id,
          });
          const summary = formatSideEffectsToast(sideEffects);
          if (summary) {
            toast({ title: 'Холбоотой бичлэг шинэчлэгдлээ', description: summary });
          }
          if (sideEffects.errors.length > 0) {
            console.warn('[DeleteDialog] Side effects errors:', sideEffects.errors);
          }
        } catch (sideErr) {
          console.error('[DeleteDialog] Side effects cleanup failed:', sideErr);
        }
      }

      // Audit log — direct termination/suspension via delete dialog.
      // ER doc-гүй шууд чөлөөлөх — admin-ий хууль ёсны үйлдэл, тэмдэглэх ёстой.
      const employeeFullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Ажилтан';
      logAudit({
        action: 'delete',
        resource: 'employee',
        resourceId: employee.id,
        resourceName: employeeFullName,
        description: `Ажилтныг шууд идэвхгүй болгов: ${employeeFullName} (${data.reason})`,
        metadata: {
          kind: newStatus === 'terminated' ? 'direct_termination' : 'direct_suspension',
          reason: data.reason,
          fromStatus: currentStatus,
          toStatus: newStatus,
          positionId: employee.positionId || null,
        },
      });

      toast({
        title: 'Ажилтан идэвхгүйжлээ',
        description: `${employee.firstName} ${employee.lastName}-н төлөв шинэчлэгдлээ.`,
      });
      onOpenChange(false);
      form.reset();
      // Force a refresh of the current route to reflect changes
      router.refresh();


    } catch (error: any) {
      Sentry.captureException(error, { tags: { module: 'employees', action: 'deactivate' } });
      console.error("Error deactivating employee:", error);
      toast({
        variant: 'destructive',
        title: 'Алдаа гарлаа',
        description: error.message || 'Ажилтныг идэвхгүй болгоход алдаа гарлаа.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Ажилтныг идэвхгүй болгох</DialogTitle>
              <DialogDescription>
                {employee?.firstName} {employee?.lastName}-г идэвхгүй болгох гэж байна. Шалтгаанаа сонгоно уу. Энэ үйлдэл нь ажилтны нэвтрэх эрхийг хаах болно.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {/* Idempotency / cross-workflow guard banner — Layer C5.
                  Дуусаагүй release ЭСВЭЛ appointment ER doc байгаа тохиолдолд
                  ажилтныг шууд устгахыг блокнэ. */}
              {eligibility && eligibility.allowed === false && (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-amber-900">
                        Шууд идэвхгүй болгох боломжгүй
                      </div>
                      <div className="text-xs text-amber-800 mt-1">{eligibility.reason}</div>
                    </div>
                  </div>
                  {(eligibility.activeReleaseDocId || eligibility.activeAppointmentDocId) && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full bg-white border-amber-300 text-amber-800 hover:bg-amber-100 h-8"
                    >
                      <Link
                        href={
                          eligibility.activeReleaseDocId
                            ? getReleaseDocumentUrl(eligibility.activeReleaseDocId)
                            : getAppointmentDocumentUrl(eligibility.activeAppointmentDocId!)
                        }
                      >
                        Одоо явагдаж буй баримт руу очих
                      </Link>
                    </Button>
                  )}
                </div>
              )}

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Шалтгаан</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!!(eligibility && eligibility.allowed === false)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Шалтгаан сонгоно уу..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Ажлаас чөлөөлөгдсөн">Ажлаас чөлөөлөгдсөн</SelectItem>
                        <SelectItem value="Түр чөлөөлсөн">Түр чөлөөлсөн</SelectItem>
                        <SelectItem value="Алдаатай бүртгэл">Алдаатай бүртгэл</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Цуцлах
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isSubmitting || !!(eligibility && eligibility.allowed === false)}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Идэвхгүй болгох
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
