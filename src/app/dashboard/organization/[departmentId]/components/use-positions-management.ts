'use client';

import { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase, tenantCollection, tenantDoc, useTenantWrite } from '@/firebase';
import { collection, doc, query, where, getDocs, writeBatch, addDoc, deleteDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { addDepartmentHistoryEvent } from '../../department-history-log';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Department, Position, PositionLevel, EmploymentType, JobCategory, WorkSchedule, DepartmentType } from '../../types';
import * as Sentry from '@sentry/nextjs';
import { generateNextPositionCode } from '@/lib/code-generator';
import { calculatePositionCompletion } from '@/lib/hr/position-completion';

export function usePositionsManagement(department: Department) {
    const { firestore, user } = useFirebase();
    const { tDoc, tCollection, companyPath } = useTenantWrite();
    const { toast } = useToast();
    const router = useRouter();

    // --- Selection & dialog state ---
    const [selectedPositionIds, setSelectedPositionIds] = useState<string[]>([]);
    const [isAddPositionOpen, setIsAddPositionOpen] = useState(false);
    const [editingPosition, setEditingPosition] = useState<Position | null>(null);
    const [pendingParentPositionId, setPendingParentPositionId] = useState<string | undefined>(undefined);

    // --- Approval state ---
    const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [approvalNote, setApprovalNote] = useState('');
    const [approvalDate, setApprovalDate] = useState<Date>(new Date());

    // --- Disapproval state ---
    const [isDisapproveConfirmOpen, setIsDisapproveConfirmOpen] = useState(false);
    const [disapproveNote, setDisapproveNote] = useState('');
    const [disapproveDate, setDisapproveDate] = useState<Date>(new Date());

    // --- Delete state ---
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // --- Department delete/disband state ---
    const [isDeptDeleting, setIsDeptDeleting] = useState(false);
    const [isDeptDeleteConfirmOpen, setIsDeptDeleteConfirmOpen] = useState(false);
    const [isDisbandConfirmOpen, setIsDisbandConfirmOpen] = useState(false);

    // --- Position disband state ---
    const [isPosDisbandConfirmOpen, setIsPosDisbandConfirmOpen] = useState(false);
    const [disbandPosition, setDisbandPosition] = useState<Position | null>(null);
    const [disbandReason, setDisbandReason] = useState('');

    // --- Queries ---
    const positionsQuery = useMemoFirebase(({ firestore, companyPath }) => {
        if (!firestore || !department?.id) return null;
        return query(tenantCollection(firestore, companyPath, 'positions'), where('departmentId', '==', department.id));
    }, [firestore, department?.id]);

    const levelsQuery = useMemoFirebase(({ firestore, companyPath }) => (firestore ? tenantCollection(firestore, companyPath, 'positionLevels') : null), [firestore]);
    const empTypesQuery = useMemoFirebase(({ firestore, companyPath }) => (firestore ? tenantCollection(firestore, companyPath, 'employmentTypes') : null), [firestore]);
    const departmentsQuery = useMemoFirebase(({ firestore, companyPath }) => (firestore ? tenantCollection(firestore, companyPath, 'departments') : null), [firestore]);
    const jobCategoriesQuery = useMemoFirebase(({ firestore, companyPath }) => (firestore ? tenantCollection(firestore, companyPath, 'jobCategories') : null), [firestore]);
    const workSchedulesQuery = useMemoFirebase(({ firestore, companyPath }) => (firestore ? tenantCollection(firestore, companyPath, 'workSchedules') : null), [firestore]);
    const deptTypesQuery = useMemoFirebase(({ firestore, companyPath }) => (firestore ? tenantCollection(firestore, companyPath, 'departmentTypes') : null), [firestore]);

    const employeesQuery = useMemoFirebase(({ firestore, companyPath }) => {
        if (!firestore || !department?.id) return null;
        return query(tenantCollection(firestore, companyPath, 'employees'), where('departmentId', '==', department.id));
    }, [firestore, department?.id]);

    const { data: positions, isLoading: isPositionsLoading } = useCollection<Position>(positionsQuery);
    const { data: employees } = useCollection<any>(employeesQuery);
    const { data: levels } = useCollection<PositionLevel>(levelsQuery);
    const { data: empTypes } = useCollection<EmploymentType>(empTypesQuery);
    const { data: allDepartments } = useCollection<Department>(departmentsQuery);
    const { data: jobCategories } = useCollection<JobCategory>(jobCategoriesQuery);
    const { data: workSchedules } = useCollection<WorkSchedule>(workSchedulesQuery);
    const { data: departmentTypes } = useCollection<DepartmentType>(deptTypesQuery);

    const isLoading = isPositionsLoading || !levels || !empTypes;

    const stats = useMemo(() => {
        if (!positions) return { total: 0, approved: 0, pending: 0 };
        const total = positions.length;
        const approved = positions.filter(p => p.isApproved === true).length;
        const pending = total - approved;
        return { total, approved, pending };
    }, [positions]);

    const lookups = useMemo(() => {
        const departmentMap = allDepartments?.reduce((acc, d) => { acc[d.id] = d.name; return acc; }, {} as Record<string, string>) || { [department.id]: department.name };
        const departmentColorMap = allDepartments?.reduce((acc, d) => {
            if (d.color) acc[d.id] = d.color;
            return acc;
        }, {} as Record<string, string>) || {};
        const levelMap = levels?.reduce((acc, level) => { acc[level.id] = level.name; return acc; }, {} as Record<string, string>) || {};
        const empTypeMap = empTypes?.reduce((acc, type) => { acc[type.id] = type.name; return acc; }, {} as Record<string, string>) || {};
        const jobCategoryMap = jobCategories?.reduce((acc, cat) => { acc[cat.id] = `${cat.code} - ${cat.name}`; return acc; }, {} as Record<string, string>) || {};
        const typeName = departmentTypes?.find(t => t.id === department.typeId)?.name || department.typeName || 'Нэгж';
        return { departmentMap, departmentColorMap, levelMap, empTypeMap, jobCategoryMap, typeName, departmentColor: department.color };
    }, [department, levels, empTypes, allDepartments, jobCategories, departmentTypes]);

    const validationChecklist = useMemo(() => {
        const dept = department;
        const checks = {
            hasName: !!dept.name?.trim(),
            hasCode: !!dept.code?.trim(),
            hasVision: !!dept.vision?.trim(),
            hasDescription: !!dept.description?.trim(),
            hasType: !!dept.typeId,
            hasPositions: (positions?.length || 0) > 0,
            allPositionsApproved: (positions?.length || 0) > 0 && (stats.pending === 0)
        };
        const isComplete = Object.values(checks).every(Boolean);
        return { ...checks, isComplete };
    }, [department, positions, stats]);

    const completionPercentage = useMemo(() => {
        if (!validationChecklist) return 0;
        const keys = Object.keys(validationChecklist).filter(k => k !== 'isComplete');
        const total = keys.length;
        if (total === 0) return 0;
        const completed = keys.filter(k => (validationChecklist as any)[k]).length;
        return Math.round((completed / total) * 100);
    }, [validationChecklist]);

    // --- Position code config ---
    const posCodeConfigRef = useMemoFirebase(
        ({ firestore, companyPath }) => (firestore ? tenantDoc(firestore, companyPath, 'company', 'positionCodeConfig') : null),
        [firestore]
    );

    // --- Handlers ---
    const handleAddChildPosition = (parentId: string) => {
        setPendingParentPositionId(parentId);
        setEditingPosition(null);
        setIsAddPositionOpen(true);
    };

    const handleAddPositionWithReset = () => {
        setPendingParentPositionId(undefined);
        handleAddPosition();
    };

    const handleAddPosition = () => {
        setEditingPosition(null);
        setIsAddPositionOpen(true);
    };

    const handleEditPosition = (pos: Position) => {
        router.push(`/dashboard/organization/positions/${pos.id}`);
    };

    const handleDeletePosition = async (pos: Position) => {
        if (pos.isApproved) {
            toast({
                title: "Устгах боломжгүй",
                description: "Батлагдсан ажлын байрыг устгах боломжгүй. Эхлээд батлагдаагүй болгоно уу.",
                variant: "destructive"
            });
            return;
        }
        try {
            await deleteDoc(tDoc('positions', pos.id));
            toast({ title: "Амжилттай устгалаа", description: "Жагсаалт шинэчлэгдлээ." });
        } catch (error) {
            toast({ title: "Алдаа гарлаа", variant: "destructive", description: error instanceof Error ? error.message : undefined });
        }
    };

    const handleDuplicatePosition = async (pos: any) => {
        if (!firestore || !posCodeConfigRef || !department?.id) return;

        const {
            id,
            filled,
            code: _code,
            onPositionClick,
            onAddChild,
            onDuplicate,
            onAppoint,
            levelName,
            departmentColor,
            assignedEmployee,
            approvalHistory: _history,
            approvedAt: _approvedAt,
            approvedBy: _approvedBy,
            disapprovedAt: _disapprovedAt,
            disapprovedBy: _disapprovedBy,
            ...clonedData
        } = pos;

        const cleanData = Object.entries(clonedData).reduce((acc, [key, value]) => {
            if (value !== undefined && typeof value !== 'function') acc[key] = value;
            return acc;
        }, {} as any);

        delete cleanData.approvalHistory;
        delete cleanData.approvedAt;
        delete cleanData.approvedBy;
        delete cleanData.disapprovedAt;
        delete cleanData.disapprovedBy;

        try {
            const newCode = await generateNextPositionCode(firestore, posCodeConfigRef);
            const newPositionData = {
                ...cleanData,
                departmentId: department.id,
                code: newCode,
                title: `${pos.title || 'Шинэ ажлын байр'} (Хуулбар)`,
                filled: 0,
                isActive: true,
                isApproved: false,
                createdAt: new Date().toISOString(),
            };
            const colRef = tCollection('positions');
            const ref = await addDoc(colRef, newPositionData);
            if (department?.id && user) {
                addDepartmentHistoryEvent({
                    firestore,
                    companyPath,
                    departmentId: department.id,
                    eventType: 'position_added',
                    positionId: ref.id,
                    positionTitle: newPositionData.title,
                    performedBy: user.uid,
                    performedByName: user.displayName || user.email || 'Систем',
                }).catch(() => {});
            }
            toast({ title: "Амжилттай хувиллаа", description: "Шинэ ажлын байр жагсаалтад нэмэгдлээ." });
        } catch (e) {
            Sentry.captureException(e, { tags: { module: 'organization' } });
            toast({ variant: 'destructive', title: 'Хувилах амжилтгүй', description: e instanceof Error ? e.message : 'Дахин оролдоно уу.' });
        }
    };

    const handleApproveSelected = async () => {
        if (!firestore || !positions || !user || selectedPositionIds.length === 0) return;

        const targets = positions.filter(p => selectedPositionIds.includes(p.id));

        // 0) Аль хэдийн батлагдсан байр-ыг хамгийн эхэнд алгаслах
        // (score/field/parent шалгалтыг хийхгүй — production state-д орсон тул)
        const invalidByAlready = targets.filter(pos => pos.isApproved !== false);
        const remainingTargets = targets.filter(pos => !invalidByAlready.includes(pos));

        // 1) Field-level required check (одоогийн 11 талбар)
        const invalidByFields = remainingTargets.filter(pos => {
            const checks = {
                hasTitle: !!pos.title?.trim(),
                hasCode: !!pos.code?.trim(),
                hasDepartment: !!(pos.departmentId && pos.departmentId.trim()),
                hasLevel: !!pos.levelId,
                hasCategory: !!pos.jobCategoryId,
                hasEmpType: !!pos.employmentTypeId,
                hasSchedule: !!pos.workScheduleId,
                hasPurpose: !!pos.purpose?.trim(),
                hasResponsibilities: (pos.responsibilities?.length || 0) > 0,
                hasJDFile: !!pos.jobDescriptionFile?.url,
                hasSalary: !!(pos.salaryRange?.min && pos.salaryRange?.max)
            };
            return !Object.values(checks).every(Boolean);
        });

        // 2) Completion score 100% шалгалт (single approve товчтой ижил түвшин)
        const invalidByScore = remainingTargets.filter(pos =>
            !invalidByFields.includes(pos) && calculatePositionCompletion(pos) < 100
        );

        // 3) Parent gate — эцэг батлагдаагүй бол хүү-г блоклох
        const invalidByParent = remainingTargets.filter(pos => {
            if (invalidByFields.includes(pos) || invalidByScore.includes(pos)) return false;
            if (!pos.reportsToId) return false;
            const parent = positions.find(p => p.id === pos.reportsToId);
            // Эцэг target-д орсон бол энэ batch-д хамт батлагдана — зөвшөөрөгдсөн
            if (parent && remainingTargets.some(t => t.id === parent.id)) return false;
            return parent?.isApproved !== true;
        });

        const invalidPositions = [...invalidByAlready, ...invalidByFields, ...invalidByScore, ...invalidByParent];
        const validPositions = targets.filter(p => !invalidPositions.includes(p));

        if (invalidPositions.length > 0) {
            const reasons: string[] = [];
            if (invalidByAlready.length > 0) {
                reasons.push(`${invalidByAlready.length} байр аль хэдийн батлагдсан`);
            }
            if (invalidByFields.length > 0) {
                reasons.push(`${invalidByFields.length} байрны заавал талбар дутуу`);
            }
            if (invalidByScore.length > 0) {
                reasons.push(`${invalidByScore.length} байрны "Бүрэн гүйцэтгэл" 100% хүрэхгүй`);
            }
            if (invalidByParent.length > 0) {
                const names = invalidByParent.slice(0, 2).map(p => p.title || 'Нэргүй').join(', ');
                reasons.push(`${invalidByParent.length} байрны эцэг ажлын байр батлагдаагүй (${names})`);
            }
            toast({
                title: validPositions.length > 0 ? "Зарим байр алгаслагдлаа" : "Батлах боломжгүй",
                description: reasons.join('; '),
                variant: validPositions.length > 0 ? "default" : "destructive"
            });
            if (validPositions.length === 0) {
                setIsApproveConfirmOpen(false);
                return;
            }
        }

        setIsApproving(true);
        try {
            const effectiveDate = approvalDate.toISOString();
            const performedByName = user.displayName || user.email || 'Систем';
            const logEntry = {
                action: 'approve',
                userId: user.uid,
                userName: performedByName,
                timestamp: new Date().toISOString(),
                effectiveDate,
                note: approvalNote || 'Ажлын байрыг баталлаа'
            };

            const batch = writeBatch(firestore);
            const batchTargets = validPositions;

            batchTargets.forEach(pos => {
                const posRef = tDoc('positions', pos.id);
                batch.update(posRef, {
                    isApproved: true,
                    isActive: true,
                    approvedAt: effectiveDate,
                    approvedBy: user.uid,
                    approvedByName: performedByName,
                    approvalHistory: arrayUnion(logEntry)
                });
            });

            await batch.commit();
            if (department?.id) {
                for (const pos of batchTargets) {
                    addDepartmentHistoryEvent({
                        firestore,
                        companyPath,
                        departmentId: department.id,
                        eventType: 'position_approved',
                        positionId: pos.id,
                        positionTitle: pos.title || '',
                        performedBy: user.uid,
                        performedByName,
                    }).catch(() => {});
                }
            }
            const skipped = targets.length - batchTargets.length;
            toast({
                title: skipped > 0
                    ? `${batchTargets.length}/${targets.length} ажлын байр батлагдлаа`
                    : "Сонгосон ажлын байрнууд батлагдлаа",
                description: skipped > 0 ? `${skipped} байр алгаслагдсан` : undefined
            });
            setIsApproveConfirmOpen(false);
            setApprovalNote('');
            setSelectedPositionIds([]);
        } catch (error) {
            Sentry.captureException(error, { tags: { module: 'organization' } });
            toast({ title: "Алдаа гарлаа", variant: "destructive" });
        } finally {
            setIsApproving(false);
        }
    };

    const handleBulkDisapprove = async () => {
        if (!firestore || !positions || !user) return;

        const targets = positions.filter(p => selectedPositionIds.includes(p.id) && p.isApproved !== false);

        setIsApproving(true);
        try {
            const effectiveDate = disapproveDate.toISOString();
            const performedByName = user.displayName || user.email || 'Систем';
            const logEntry = {
                action: 'disapprove',
                userId: user.uid,
                userName: performedByName,
                timestamp: new Date().toISOString(),
                effectiveDate,
                note: disapproveNote || 'Батламжийг цуцаллаа'
            };

            const batch = writeBatch(firestore);
            targets.forEach(pos => {
                const posRef = tDoc('positions', pos.id);
                batch.update(posRef, {
                    isApproved: false,
                    isActive: false,
                    disapprovedAt: effectiveDate,
                    disapprovedBy: user.uid,
                    disapprovedByName: performedByName,
                    approvalHistory: arrayUnion(logEntry)
                });
            });
            await batch.commit();
            if (department?.id) {
                for (const pos of targets) {
                    addDepartmentHistoryEvent({
                        firestore,
                        companyPath,
                        departmentId: department.id,
                        eventType: 'position_disapproved',
                        positionId: pos.id,
                        positionTitle: pos.title || '',
                        performedBy: user.uid,
                        performedByName,
                    }).catch(() => {});
                }
            }
            toast({ title: "Сонгосон ажлын байрнуудын батламжийг цуцаллаа" });
            setIsDisapproveConfirmOpen(false);
            setDisapproveNote('');
            setSelectedPositionIds([]);
        } catch (error) {
            toast({ title: "Алдаа гарлаа", variant: "destructive" });
        } finally {
            setIsApproving(false);
        }
    };

    const handleBulkDelete = async () => {
        if (!firestore || selectedPositionIds.length === 0 || !department?.id || !user) return;
        const toDelete = (positions || []).filter(p => selectedPositionIds.includes(p.id));
        setIsDeleting(true);
        try {
            const batch = writeBatch(firestore);
            selectedPositionIds.forEach(id => {
                batch.delete(tDoc('positions', id));
            });
            await batch.commit();
            for (const pos of toDelete) {
                addDepartmentHistoryEvent({
                    firestore,
                    companyPath,
                    departmentId: department.id,
                    eventType: 'position_deleted',
                    positionId: pos.id,
                    positionTitle: pos.title || '',
                    performedBy: user.uid,
                    performedByName: user.displayName || user.email || 'Систем',
                }).catch(() => {});
            }
            toast({ title: "Сонгосон ажлын байрнуудыг устгалаа" });
            setIsDeleteConfirmOpen(false);
            setSelectedPositionIds([]);
        } catch (error) {
            toast({ title: "Алдаа гарлаа", variant: "destructive" });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeptDeleteClick = async () => {
        if (!firestore) return;
        setIsDeptDeleting(true);

        try {
            const historyRef = tCollection('departmentHistory');
            const hq = query(historyRef, where('departmentId', '==', department.id));
            const historySnapshot = await getDocs(hq);
            const hasHistory = !historySnapshot.empty;

            const positionsRef = tCollection('positions');
            const q = query(positionsRef, where('departmentId', '==', department.id));
            const snapshot = await getDocs(q);
            const hasPositions = !snapshot.empty;

            if (hasPositions && !hasHistory) {
                toast({
                    variant: "destructive",
                    title: "Устгах боломжгүй",
                    description: `Энэ нэгжид ${snapshot.size} ажлын байр бүртгэлтэй байна. Түүхгүй нэгжийг устгахын тулд эхлээд ажлын байруудыг устгах эсвэл шилжүүлэх шаардлагатай.`
                });
                setIsDeptDeleting(false);
                return;
            }

            if (hasHistory) {
                setIsDisbandConfirmOpen(true);
            } else {
                setIsDeptDeleteConfirmOpen(true);
            }
        } catch (error) {
            Sentry.captureException(error, { tags: { module: 'organization' } });
            toast({ variant: "destructive", title: "Алдаа гарлаа" });
        } finally {
            setIsDeptDeleting(false);
        }
    };

    const handleSimpleDeptDelete = async () => {
        if (!firestore) return;
        setIsDeptDeleting(true);
        try {
            const batch = writeBatch(firestore);
            batch.delete(tDoc('departments', department.id));
            await batch.commit();
            toast({ title: "Нэгж амжилттай устгагдлаа" });
            router.push('/dashboard/organization');
        } catch (error) {
            Sentry.captureException(error, { tags: { module: 'organization' } });
            toast({ variant: "destructive", title: "Алдаа гарлаа" });
            setIsDeptDeleting(false);
        }
    };

    const handleDeptDisband = async () => {
        if (!firestore) return;
        setIsDeptDeleting(true);
        try {
            const timestamp = new Date().toISOString();

            const employeesRef = tCollection('employees');
            const eq = query(employeesRef, where('departmentId', '==', department.id));
            const employeeSnapshot = await getDocs(eq);
            const deptEmployees = employeeSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as any[];

            const batch = writeBatch(firestore);

            const historyRef = tCollection('departmentHistory');
            const newHistoryDoc = doc(historyRef);

            const snapshot = {
                departmentName: department.name,
                disbandReason: disbandReason || 'Нэгжийг татан буулгав',
                disbandedAt: timestamp,
                disbandedBy: user?.uid || null,
                disbandedByName: user?.displayName || user?.email || 'Систем',
                positions: (positions || []).map(pos => ({
                    ...pos,
                    employees: deptEmployees
                        .filter(emp => emp.positionId === pos.id)
                        .map(emp => ({
                            id: emp.id,
                            firstName: emp.firstName,
                            lastName: emp.lastName,
                            employeeCode: emp.employeeCode
                        }))
                }))
            };

            batch.set(newHistoryDoc, {
                departmentId: department.id,
                approvedAt: timestamp,
                validTo: timestamp,
                isDissolution: true,
                snapshot: snapshot
            });

            const oldHistoryQuery = query(historyRef, where('departmentId', '==', department.id));
            const oldHistorySnapshot = await getDocs(oldHistoryQuery);
            oldHistorySnapshot.docs.forEach(hDoc => {
                if (!hDoc.data().validTo) {
                    batch.update(hDoc.ref, { validTo: timestamp });
                }
            });

            batch.delete(tDoc('departments', department.id));

            if (positions) {
                positions.forEach(pos => {
                    batch.delete(tDoc('positions', pos.id));
                });
            }

            await batch.commit();
            toast({ title: "Нэгж амжилттай татан буугдаж, түүх хадгалагдлаа" });
            router.push('/dashboard/organization');
        } catch (error) {
            Sentry.captureException(error, { tags: { module: 'organization' } });
            toast({ variant: "destructive", title: "Алдаа гарлаа" });
            setIsDeptDeleting(false);
        }
    };

    const handleDisbandPosition = async () => {
        if (!firestore || !disbandPosition || !user) return;
        setIsDeleting(true);
        try {
            const timestamp = new Date().toISOString();
            const logEntry = {
                action: 'disapprove',
                userId: user.uid,
                userName: user.displayName || user.email || 'Систем',
                timestamp: timestamp,
                note: disbandReason || 'Албан тушаалыг татан буулгав'
            };

            await updateDoc(tDoc('positions', disbandPosition.id), {
                isActive: false,
                isApproved: false,
                disbandedAt: timestamp,
                disbandedBy: user.uid,
                disbandedByName: user.displayName || user.email || 'Систем',
                approvalHistory: arrayUnion(logEntry)
            });

            toast({ title: "Албан тушаал амжилттай татан буугдлаа", description: "Жагсаалт шинэчлэгдлээ." });
            setIsPosDisbandConfirmOpen(false);
            setDisbandPosition(null);
            setDisbandReason('');
        } catch (error) {
            Sentry.captureException(error, { tags: { module: 'organization' } });
            toast({ title: "Алдаа гарлаа", variant: "destructive" });
        } finally {
            setIsDeleting(false);
        }
    };

    return {
        // Data
        positions,
        employees,
        levels,
        empTypes,
        allDepartments,
        jobCategories,
        workSchedules,
        departmentTypes,
        isLoading,
        stats,
        lookups,
        validationChecklist,
        completionPercentage,

        // Selection
        selectedPositionIds,
        setSelectedPositionIds,

        // Add position dialog
        isAddPositionOpen,
        setIsAddPositionOpen,
        editingPosition,
        setEditingPosition,
        pendingParentPositionId,

        // Handlers
        handleAddChildPosition,
        handleAddPositionWithReset,
        handleAddPosition,
        handleEditPosition,
        handleDeletePosition,
        handleDuplicatePosition,

        // Approve
        isApproveConfirmOpen,
        setIsApproveConfirmOpen,
        isApproving,
        approvalNote,
        setApprovalNote,
        approvalDate,
        setApprovalDate,
        handleApproveSelected,

        // Disapprove
        isDisapproveConfirmOpen,
        setIsDisapproveConfirmOpen,
        disapproveNote,
        setDisapproveNote,
        disapproveDate,
        setDisapproveDate,
        handleBulkDisapprove,

        // Delete
        isDeleteConfirmOpen,
        setIsDeleteConfirmOpen,
        isDeleting,
        handleBulkDelete,

        // Department delete/disband
        isDeptDeleting,
        isDeptDeleteConfirmOpen,
        setIsDeptDeleteConfirmOpen,
        isDisbandConfirmOpen,
        setIsDisbandConfirmOpen,
        handleDeptDeleteClick,
        handleSimpleDeptDelete,
        handleDeptDisband,
        disbandReason,
        setDisbandReason,

        // Position disband
        isPosDisbandConfirmOpen,
        setIsPosDisbandConfirmOpen,
        disbandPosition,
        setDisbandPosition,
        handleDisbandPosition,
    };
}
