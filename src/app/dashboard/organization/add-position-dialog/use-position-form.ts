'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import {
  useFirebase,
  useMemoFirebase,
  useDoc,
  tenantDoc,
  tenantCollection,
  useTenantWrite,
} from '@/firebase';
import { addDepartmentHistoryEvent } from '../department-history-log';
import {
  query, where, getDocs,
  updateDoc,
  addDoc,
  deleteDoc,
} from 'firebase/firestore';
import { generateNextPositionCode } from '@/lib/code-generator';
import { positionSchema, PositionFormValues } from './types';
import { Position as JobPosition } from '../types';
import * as Sentry from '@sentry/nextjs';

interface UsePositionFormOptions {
  editingPosition?: JobPosition | null;
  preselectedDepartmentId?: string;
  parentPositionId?: string;
  allPositions: JobPosition[] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function usePositionForm({
  editingPosition,
  preselectedDepartmentId,
  parentPositionId,
  allPositions,
  open,
  onOpenChange,
  onSuccess,
}: UsePositionFormOptions) {
  const { firestore, user } = useFirebase();
  const { tDoc, tCollection, companyPath } = useTenantWrite();
  const { toast } = useToast();
  const performedByName = user?.displayName || user?.email || 'Систем';
  const performedBy = user?.uid ?? '';
  const isEditMode = !!editingPosition;

  const posCodeConfigRef = useMemoFirebase(
    ({ firestore, companyPath }) => (firestore ? tenantDoc(firestore, companyPath, 'company', 'positionCodeConfig') : null),
    []
  );
  const { data: posCodeConfig } = useDoc<any>(posCodeConfigRef as any);

  const form = useForm<PositionFormValues>({
    resolver: zodResolver(positionSchema),
    defaultValues: {
      title: '',
      code: '',
      departmentId: preselectedDepartmentId || '',
      reportsTo: parentPositionId || '(none)',
      levelId: '',
      employmentTypeId: '',
      workScheduleId: '',
      jobCategoryId: '',
      canApproveAttendance: false,
      canApproveVacation: false,
      hasPointBudget: false,
      yearlyPointBudget: 0,
      purpose: '',
      responsibilities: '',
      salaryMin: 0,
      salaryMid: 0,
      salaryMax: 0,
      salaryCurrency: 'MNT',
      salaryPeriod: 'monthly',
      bonusDescription: '',
      commissionDescription: '',
      equityDescription: '',
      isRemoteAllowed: false,
      flexibleHours: false,
      vacationDays: 0,
      otherBenefits: '',
    },
  });

  React.useEffect(() => {
    if (editingPosition) {
      form.reset({
        ...editingPosition,
        code: editingPosition.code || '',
        levelId: editingPosition.levelId || '',
        employmentTypeId: editingPosition.employmentTypeId || '',
        workScheduleId: editingPosition.workScheduleId || '',
        reportsTo: editingPosition.reportsToId || editingPosition.reportsTo || '(none)',
        jobCategoryId: editingPosition.jobCategoryId || '',
        canApproveAttendance: editingPosition.canApproveAttendance || false,
        canApproveVacation: editingPosition.canApproveVacation || false,
        hasPointBudget: editingPosition.hasPointBudget || false,
        yearlyPointBudget: editingPosition.yearlyPointBudget || 0,
        purpose: editingPosition.purpose || '',
        responsibilities: editingPosition.responsibilities?.join('\n') || '',
        salaryMin: editingPosition.compensation?.salaryRange?.min || 0,
        salaryMid: editingPosition.compensation?.salaryRange?.mid || 0,
        salaryMax: editingPosition.compensation?.salaryRange?.max || 0,
        salaryCurrency: editingPosition.compensation?.salaryRange?.currency || 'MNT',
        salaryPeriod: (editingPosition.compensation?.salaryRange?.period as any) || 'monthly',
        bonusDescription: editingPosition.compensation?.variablePay?.bonusDescription || '',
        commissionDescription: editingPosition.compensation?.variablePay?.commissionDescription || '',
        equityDescription: editingPosition.compensation?.variablePay?.equityDescription || '',
        isRemoteAllowed: editingPosition.benefits?.isRemoteAllowed || false,
        flexibleHours: editingPosition.benefits?.flexibleHours || false,
        vacationDays: editingPosition.benefits?.vacationDays || 0,
        otherBenefits: editingPosition.benefits?.otherBenefits?.join('\n') || '',
      });
    } else {
      form.reset({
        title: '',
        departmentId: preselectedDepartmentId || '',
        reportsTo: parentPositionId || '(none)',
        levelId: '',
        employmentTypeId: '',
        workScheduleId: '',
        jobCategoryId: '',
        canApproveAttendance: false,
        canApproveVacation: false,
        hasPointBudget: false,
        yearlyPointBudget: 0,
        purpose: '',
        responsibilities: '',
        salaryMin: 0,
        salaryMid: 0,
        salaryMax: 0,
        salaryCurrency: 'MNT',
        salaryPeriod: 'monthly',
        bonusDescription: '',
        commissionDescription: '',
        equityDescription: '',
        isRemoteAllowed: false,
        flexibleHours: false,
        vacationDays: 0,
        otherBenefits: '',
      });
    }
  }, [editingPosition, open, form, preselectedDepartmentId]);

  const positionsCollection = useMemoFirebase(
    ({ firestore, companyPath }) => (firestore ? tenantCollection(firestore, companyPath, 'positions') : null),
    [firestore]
  );

  const onSubmit = async (data: PositionFormValues) => {
    if (!firestore) return;

    // Determine Department ID
    let finalDepartmentId = data.departmentId || preselectedDepartmentId;

    // If no department selected, try to infer from parent position
    if (!finalDepartmentId && data.reportsTo && data.reportsTo !== '(none)') {
      const parentPos = allPositions?.find(p => p.id === data.reportsTo);
      if (parentPos?.departmentId) {
        finalDepartmentId = parentPos.departmentId;
      }
    }

    if (!isEditMode && !finalDepartmentId) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Хэлтэс тодорхойгүй байна. Шууд харьяалагдах албан тушаал сонгох эсвэл хэлтэс сонгоно уу.',
      });
      return;
    }

    let finalCode = data.code?.trim().toUpperCase() || '';

    if (!isEditMode && !finalCode) {
      if (!posCodeConfigRef) {
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Ажлын байрны код тохиргоо олдсонгүй. Тохиргооноос тохируулна уу.' });
        return;
      }
      try {
        finalCode = await generateNextPositionCode(firestore, posCodeConfigRef);
      } catch (e) {
        Sentry.captureException(e, { tags: { module: 'organization' } });
        toast({ variant: 'destructive', title: 'Код үүсгэхэд алдаа гарлаа' });
        return;
      }
    }

    if (finalCode) {
      const dupQuery = query(tCollection('positions'), where('code', '==', finalCode));
      const dupSnap = await getDocs(dupQuery);
      const existing = dupSnap.docs.find(d => !isEditMode || d.id !== editingPosition?.id);
      if (existing) {
        toast({ variant: 'destructive', title: 'Код давхардаж байна', description: `"${finalCode}" кодтой ажлын байр аль хэдийн бүртгэгдсэн байна.` });
        return;
      }
    }

    try {
      const baseData: any = {
        title: data.title,
        code: finalCode,
        departmentId: finalDepartmentId,
        levelId: data.levelId || '',
        employmentTypeId: data.employmentTypeId || '',
        workScheduleId: data.workScheduleId || '',
        jobCategoryId: data.jobCategoryId || '',
        canApproveAttendance: data.canApproveAttendance,
        canApproveVacation: data.canApproveVacation,
        hasPointBudget: data.hasPointBudget,
        yearlyPointBudget: data.yearlyPointBudget,
        remainingPointBudget: isEditMode ? (editingPosition?.remainingPointBudget ?? data.yearlyPointBudget) : data.yearlyPointBudget,
        purpose: data.purpose || '',
        responsibilities: data.responsibilities ? data.responsibilities.split('\n').filter(r => r.trim() !== '') : [],
        compensation: {
          salaryRange: {
            min: data.salaryMin || 0,
            mid: data.salaryMid || 0,
            max: data.salaryMax || 0,
            currency: data.salaryCurrency || 'MNT',
            period: data.salaryPeriod || 'monthly',
          },
          variablePay: {
            bonusDescription: data.bonusDescription || '',
            commissionDescription: data.commissionDescription || '',
            equityDescription: data.equityDescription || '',
          }
        },
        benefits: {
          isRemoteAllowed: data.isRemoteAllowed,
          flexibleHours: data.flexibleHours,
          vacationDays: data.vacationDays,
          otherBenefits: data.otherBenefits ? data.otherBenefits.split('\n').filter(r => r.trim() !== '') : [],
        },
        updatedAt: new Date().toISOString()
      };

      if (data.reportsTo && data.reportsTo !== '(none)') {
        baseData.reportsToId = data.reportsTo;
        baseData.reportsTo = data.reportsTo;
      } else {
        baseData.reportsToId = null;
        baseData.reportsTo = null;
      }

      // Remove undefined values and functions to prevent Firestore errors
      const cleanBaseData = Object.entries(baseData).reduce((acc, [key, value]) => {
        // Skip undefined values and functions (UI callbacks)
        if (value !== undefined && typeof value !== 'function') {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      if (isEditMode && editingPosition) {
        await updateDoc(tDoc('positions', editingPosition.id), cleanBaseData);
        if (finalDepartmentId && performedBy) {
          addDepartmentHistoryEvent({
            firestore,
            companyPath,
            departmentId: finalDepartmentId,
            eventType: 'position_updated',
            positionId: editingPosition.id,
            positionTitle: data.title?.trim() || editingPosition.title,
            performedBy,
            performedByName,
          }).catch(() => {});
        }
      } else {
        const ref = await addDoc(tCollection('positions'), {
          ...cleanBaseData,
          filled: 0,
          isApproved: false,
          createdAt: new Date().toISOString()
        });
        if (finalDepartmentId && performedBy) {
          addDepartmentHistoryEvent({
            firestore,
            companyPath,
            departmentId: finalDepartmentId,
            eventType: 'position_added',
            positionId: ref.id,
            positionTitle: data.title?.trim() || '',
            performedBy,
            performedByName,
          }).catch(() => {});
        }
      }

      toast({ title: isEditMode ? 'Амжилттай шинэчлэгдлээ' : 'Амжилттай нэмэгдлээ' });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'organization' } });
      toast({
        variant: 'destructive',
        title: 'Алдаа гарлаа',
        description: 'Мэдээллийг хадгалахад алдаа гарлаа. Дахин оролдоно уу.',
      });
    }
  };

  const handleDelete = async () => {
    if (!firestore || !editingPosition) return;

    if (editingPosition.isApproved) {
      toast({
        variant: 'destructive',
        title: 'Устгах боломжгүй',
        description: 'Батлагдсан ажлын байрыг устгах боломжгүй. Эхлээд батламжийг цуцална уу.',
      });
      return;
    }

    const docRef = tDoc('positions', editingPosition.id);
    const deptId = editingPosition.departmentId;
    const title = editingPosition.title || '';

    try {
      await deleteDoc(docRef);
      if (deptId && performedBy) {
        addDepartmentHistoryEvent({
          firestore,
          companyPath,
          departmentId: deptId,
          eventType: 'position_deleted',
          positionId: editingPosition.id,
          positionTitle: title,
          performedBy,
          performedByName,
        }).catch(() => {});
      }
      toast({
        title: 'Амжилттай устгагдлаа',
        description: `"${title}" ажлын байр устгагдлаа.`,
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (e) {
      Sentry.captureException(e, { tags: { module: 'organization' } });
      toast({
        variant: 'destructive',
        title: 'Устгахад алдаа гарлаа',
        description: e instanceof Error ? e.message : 'Дахин оролдоно уу.',
      });
    }
  };

  const generateCode = async () => {
    if (!firestore || !posCodeConfigRef) return;
    try {
      const code = await generateNextPositionCode(firestore, posCodeConfigRef);
      return code;
    } catch (e) {
      Sentry.captureException(e, { tags: { module: 'organization' } });
      toast({ title: 'Код үүсгэхэд алдаа гарлаа', variant: 'destructive' });
      return undefined;
    }
  };

  return {
    form,
    isEditMode,
    isSubmitting: form.formState.isSubmitting,
    onSubmit,
    handleDelete,
    generateCode,
    firestore,
    posCodeConfigRef,
  };
}
