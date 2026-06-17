'use client';

import { getJsonAuthHeaders } from '@/lib/api/client-auth';
import { useTenant } from '@/contexts/tenant-context';
import * as React from 'react';
import { getDoc, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useFirebase, useTenantWrite } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Lock, KeyRound, Loader2, LogIn, Mail, ShieldAlert, Eye, EyeOff, Shield, ShieldOff, Crown, Smartphone, RefreshCw, Ban } from 'lucide-react';
import { ChangePasswordDialog } from '@/components/change-password-dialog';
import { MakeAdminDialog } from './make-admin-dialog';
import { TransferSuperAdminDialog } from './transfer-super-admin-dialog';
import { TmsAccessDialog } from './tms-access-dialog';
import { NewsAccessDialog } from './news-access-dialog';
import { CrmAccessDialog } from './crm-access-dialog';
import { BusinessPlanAccessDialog } from './business-plan-access-dialog';
import { ProjectsAccessDialog } from './projects-access-dialog';
import { MeetingsAccessDialog } from './meetings-access-dialog';
import { CompanyAccessDialog } from './company-access-dialog';
import { OfficialLettersAccessDialog } from './official-letters-access-dialog';
import { HseAccessDialog } from './hse-access-dialog';
import { cn } from '@/lib/utils';
import { Truck, Newspaper, HeartHandshake, Target, FolderKanban, DoorOpen, Building2, Stamp, HardHat } from 'lucide-react';
import type { Employee } from '../data';
import {
    buildInvitationEmailHtmlFromFields,
    INVITATION_EMAIL_DEFAULT_FIELDS,
    INVITATION_EMAIL_DEFAULT_SUBJECT,
    INVITATION_EMAIL_TEMPLATE_DOC_ID,
    replacePlaceholders,
} from '@/lib/invitation-email-template';

export interface SystemSettingsTabContentProps {
    employee: Employee;
    currentUserId: string;
    currentUserRole?: 'super_admin' | 'company_super_admin' | 'admin' | 'manager' | 'employee';
    onVerifyEmail?: (target: string) => void;
}

export function SystemSettingsTabContent({
    employee,
    currentUserId,
    currentUserRole,
    onVerifyEmail,
}: SystemSettingsTabContentProps) {
    const { auth } = useFirebase();
    const { firestore, tDoc } = useTenantWrite();
    const { companyId } = useTenant();
    const { toast } = useToast();
    const [disableConfirmOpen, setDisableConfirmOpen] = React.useState(false);
    const [enableConfirmOpen, setEnableConfirmOpen] = React.useState(false);
    const [isTogglingAccess, setIsTogglingAccess] = React.useState(false);
    const [isResettingPassword, setIsResettingPassword] = React.useState(false);
    const [isResendingAccessEmail, setIsResendingAccessEmail] = React.useState(false);
    const [changePasswordOpen, setChangePasswordOpen] = React.useState(false);
    const [adminSetPasswordOpen, setAdminSetPasswordOpen] = React.useState(false);
    const [adminPassword, setAdminPassword] = React.useState('');
    const [adminPasswordConfirm, setAdminPasswordConfirm] = React.useState('');
    const [adminPasswordShow, setAdminPasswordShow] = React.useState(false);
    const [isAdminSettingPassword, setIsAdminSettingPassword] = React.useState(false);
    const [makeAdminOpen, setMakeAdminOpen] = React.useState(false);
    const [transferSuperAdminOpen, setTransferSuperAdminOpen] = React.useState(false);
    const [showTmsAccessDialog, setShowTmsAccessDialog] = React.useState(false);
    const [showNewsAccessDialog, setShowNewsAccessDialog] = React.useState(false);
    const [showCrmAccessDialog, setShowCrmAccessDialog] = React.useState(false);
    const [showBusinessPlanAccessDialog, setShowBusinessPlanAccessDialog] = React.useState(false);
    const [showProjectsAccessDialog, setShowProjectsAccessDialog] = React.useState(false);
    const [showMeetingsAccessDialog, setShowMeetingsAccessDialog] = React.useState(false);
    const [showCompanyAccessDialog, setShowCompanyAccessDialog] = React.useState(false);
    const [showOfficialLettersAccessDialog, setShowOfficialLettersAccessDialog] = React.useState(false);
    const [showHseAccessDialog, setShowHseAccessDialog] = React.useState(false);
    const [isResettingDevice, setIsResettingDevice] = React.useState(false);
    const [deviceResetConfirmOpen, setDeviceResetConfirmOpen] = React.useState(false);
    const [isResendingInvite, setIsResendingInvite] = React.useState(false);

    const isAdmin = currentUserRole === 'super_admin' || currentUserRole === 'company_super_admin' || currentUserRole === 'admin';
    const isSelf = employee.id === currentUserId;
    const loginDisabled = !!employee.loginDisabled;
    const authEmail = employee.authEmail || '';

    const handleDisableAccess = async () => {
        if (!firestore) return;
        setIsTogglingAccess(true);
        try {
            const ref = tDoc('employees', employee.id);
            await updateDoc(ref, { loginDisabled: true });
            toast({
                title: 'Амжилттай',
                description: `${employee.firstName} ${employee.lastName}-н нэвтрэх эрх идэвхгүй боллоо.`,
            });
            setDisableConfirmOpen(false);
        } catch (e) {
            console.error('Disable access error:', e);
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: 'Нэвтрэх эрх хаах үед алдаа гарлаа.',
            });
        } finally {
            setIsTogglingAccess(false);
        }
    };

    const handleEnableAccess = async () => {
        if (!firestore) return;
        setIsTogglingAccess(true);
        try {
            const ref = tDoc('employees', employee.id);
            await updateDoc(ref, { loginDisabled: false });
            toast({
                title: 'Амжилттай',
                description: `${employee.firstName} ${employee.lastName}-н нэвтрэх эрх дахин идэвхжлээ.`,
            });
            setEnableConfirmOpen(false);
        } catch (e) {
            console.error('Enable access error:', e);
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: 'Нэвтрэх эрх нээх үед алдаа гарлаа.',
            });
        } finally {
            setIsTogglingAccess(false);
        }
    };

    const handleResetPassword = async () => {
        if (!auth) return;
        setIsResettingPassword(true);
        try {
            await sendPasswordResetEmail(auth, authEmail);
            toast({
                title: 'Имэйл илгээгдлээ',
                description: 'Нууц үг сэргээх холбоос нэвтрэх имэйл рүү илгээгдлээ.',
            });
        } catch (e: unknown) {
            const err = e as { code?: string; message?: string };
            console.error('Password reset error:', err);
            let msg = 'Нууц үг сэргээх имэйл илгээхэд алдаа гарлаа.';
            if (err?.code === 'auth/user-not-found') {
                msg = 'Энэ нэвтрэх имэйлтэй хэрэглэгч олдсонгүй.';
            } else if (err?.message) {
                msg = err.message;
            }
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: msg,
            });
        } finally {
            setIsResettingPassword(false);
        }
    };

    // Device ID reset — deviceId-г Firestore-оос арилгана (ажилтан шинэ утас авбал)
    const handleResetDevice = async () => {
        if (!firestore) return;
        setIsResettingDevice(true);
        try {
            await updateDoc(tDoc('employees', employee.id), { deviceId: null });
            toast({
                title: 'Төхөөрөмж дахин тохируулагдлаа',
                description: 'Ажилтан дараагийн нэвтрэлтдээ шинэ төхөөрөмж бүртгүүлж болно.',
            });
            setDeviceResetConfirmOpen(false);
        } catch {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Дахин тохируулахад алдаа гарлаа.' });
        } finally {
            setIsResettingDevice(false);
        }
    };

    const handleResendInvite = async () => {
        if (!authEmail) return;
        setIsResendingInvite(true);
        try {
            const headers = await getJsonAuthHeaders();
            const res = await fetch('/api/admin/promote-to-web-access', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    targetUid: employee.id,
                    companyId,
                    sendInvite: true,
                    role: employee.role,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error ?? 'Алдаа');
            if (data.emailSent) {
                toast({ title: 'Урилга илгээгдлээ', description: `${authEmail} руу нэвтрэх урилга илгээгдлээ.` });
            } else if (data.inviteUrl) {
                // Copy to clipboard automatically
                try { await navigator.clipboard.writeText(data.inviteUrl); } catch { /* ignore */ }
                toast({
                    title: 'Холбоос үүслээ',
                    description: 'Имэйл сервис тохируулаагүй. Холбоос clipboard-д хуулагдлаа — ажилтанд явуулна уу.',
                });
            }
        } catch (e: unknown) {
            toast({ variant: 'destructive', title: 'Алдаа', description: (e as Error)?.message ?? 'Урилга илгээхэд алдаа гарлаа.' });
        } finally {
            setIsResendingInvite(false);
        }
    };

    const showDisableEnable = isAdmin && !isSelf;
    const showResetForOther = isAdmin && !isSelf;
    const showChangePassword = isSelf;
    const showResendAccessEmail = (isAdmin || isSelf) && !!employee.email;
    const showAdminSetPassword = isAdmin && !isSelf;

    const resetAdminPasswordForm = React.useCallback(() => {
        setAdminPassword('');
        setAdminPasswordConfirm('');
        setAdminPasswordShow(false);
        setIsAdminSettingPassword(false);
    }, []);

    const handleAdminSetPassword = async () => {
        if (!auth?.currentUser) {
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: 'Админ хэрэглэгч нэвтрээгүй байна.',
            });
            return;
        }

        const pw = adminPassword.trim();
        const confirm = adminPasswordConfirm.trim();

        if (!pw || pw.length < 6) {
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: 'Шинэ нууц үг дор хаяж 6 тэмдэгттэй байх ёстой.',
            });
            return;
        }
        if (pw !== confirm) {
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: 'Нууц үгүүд таарахгүй байна.',
            });
            return;
        }

        setIsAdminSettingPassword(true);
        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch('/api/admin/set-user-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    uid: employee.id,
                    newPassword: pw,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(err?.error || 'Нууц үг солиж чадсангүй');
            }

            toast({
                title: 'Амжилттай',
                description: 'Нууц үг амжилттай шинэчлэгдлээ.',
            });
            setAdminSetPasswordOpen(false);
            resetAdminPasswordForm();
        } catch (e: any) {
            console.error('Admin set password error:', e);
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: e?.message || 'Нууц үг солих үед алдаа гарлаа.',
            });
        } finally {
            setIsAdminSettingPassword(false);
        }
    };

    const handleResendAccessEmail = async () => {
        if (!firestore) return;
        if (!employee.email) return;
        setIsResendingAccessEmail(true);
        try {
            // Admin name (best-effort)
            let adminName = 'Системийн админ';
            try {
                const adminSnap = await getDoc(tDoc('employees', currentUserId));
                if (adminSnap.exists()) {
                    const d = adminSnap.data() as any;
                    const n = `${d?.firstName || ''} ${d?.lastName || ''}`.trim();
                    if (n) adminName = n;
                }
            } catch {}

            // Company profile (best-effort)
            let companyName = 'Байгууллага';
            try {
                const companySnap = await getDoc(tDoc('company', 'profile'));
                if (companySnap.exists()) {
                    const d = companySnap.data() as any;
                    if (typeof d?.name === 'string' && d.name.trim()) companyName = d.name.trim();
                }
            } catch {}

            // Template (best-effort)
            let subjectTemplate = INVITATION_EMAIL_DEFAULT_SUBJECT;
            let htmlTemplate = buildInvitationEmailHtmlFromFields(INVITATION_EMAIL_DEFAULT_FIELDS);
            try {
                const templateSnap = await getDoc(tDoc('company', INVITATION_EMAIL_TEMPLATE_DOC_ID));
                if (templateSnap.exists()) {
                    const t = templateSnap.data() as any;
                    if (typeof t?.subject === 'string' && t.subject.trim()) subjectTemplate = t.subject;
                    if (typeof t?.htmlBody === 'string' && t.htmlBody.trim()) {
                        htmlTemplate = t.htmlBody;
                    } else if (t?.fields) {
                        htmlTemplate = buildInvitationEmailHtmlFromFields(t.fields);
                    }
                }
            } catch {}

            const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
            const vars: Record<string, string> = {
                companyName,
                employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
                employeeCode: employee.employeeCode || '',
                loginEmail: employee.employeeCode || '',
                password: employee.phoneNumber || '',
                appUrl,
                adminName,
            };

            const subject = replacePlaceholders(subjectTemplate, vars);
            const html = replacePlaceholders(htmlTemplate, vars);
            const text = [
                `${companyName} - Нэвтрэх мэдээлэл`,
                `Сайн байна уу, ${vars.employeeName},`,
                `Ажилтны код: ${vars.employeeCode}`,
                `Нэвтрэх нэр: ${vars.employeeCode}`,
                `Нууц үг: ${vars.password}`,
                appUrl ? `Системд нэвтрэх: ${appUrl}/login` : '',
            ]
                .filter(Boolean)
                .join('\n\n');

            const res = await fetch('/api/email', {
                method: 'POST',
                headers: await getJsonAuthHeaders(),
                body: JSON.stringify({
                    to: employee.email,
                    subject,
                    html,
                    text,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(err?.details || err?.error || 'Имэйл илгээж чадсангүй');
            }

            const result = await res.json().catch(() => ({ status: 'unknown' }));
            toast({
                title: 'Имэйл илгээгдлээ',
                description:
                    result?.status === 'simulated_success'
                        ? 'Email service тохируулаагүй тул simulation горимд амжилттай гэж бүртгэгдлээ.'
                        : 'Нэвтрэх эрхийн мэйл амжилттай дахин илгээгдлээ.',
            });
        } catch (e: any) {
            console.error('Resend access email error:', e);
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: e?.message || 'Имэйл дахин илгээхэд алдаа гарлаа.',
            });
        } finally {
            setIsResendingAccessEmail(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Нэвтрэх мэдээлэл */}
            <Card className="rounded-2xl border bg-card shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <LogIn className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-semibold">Нэвтрэх мэдээлэл</CardTitle>
                            <CardDescription className="text-xs">Нэвтрэх нэр болон одоогийн төлөв</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-caption text-muted-foreground">Нэвтрэх нэр:</span>
                        <code className="text-body font-mono bg-muted px-2 py-0.5 rounded">
                            {employee.employeeCode}
                        </code>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-caption text-muted-foreground">Нэвтрэх эрх:</span>
                        {loginDisabled ? (
                            <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/30">
                                Идэвхгүй
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="bg-success/10 text-success border-success/30">
                                Идэвхтэй
                            </Badge>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Админ эрх */}
            {isAdmin && !isSelf && (
                <Card className="rounded-2xl border bg-card shadow-sm">
                    <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Shield className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-semibold">Админ эрх</CardTitle>
                            <CardDescription className="text-xs">Энэ ажилтанд системийн админ эрх олгох эсвэл цуцлах</CardDescription>
                        </div>
                    </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {/* Role badge */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <Badge
                                variant="secondary"
                                className={
                                    employee.role === 'admin' || employee.role === 'company_super_admin'
                                        ? 'bg-info/10 text-info border-info/30'
                                        : 'bg-muted/50 text-muted-foreground border-border'
                                }
                            >
                                {employee.role === 'company_super_admin'
                                    ? 'Ерөнхий Админ'
                                    : employee.role === 'admin'
                                      ? 'Админ'
                                      : 'Ажилтан'}
                            </Badge>
                            {employee.role !== 'company_super_admin' && (
                                employee.role === 'admin' ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 text-warning border-warning/30 hover:bg-warning/10"
                                        onClick={() => setMakeAdminOpen(true)}
                                    >
                                        <ShieldOff className="h-4 w-4" />Админ эрх цуцлах
                                    </Button>
                                ) : (
                                    // Promote path — requires a verified email
                                    (() => {
                                        const profileEmail = (employee.email || '').trim();
                                        const isEmailVerified = !!employee.emailVerified;
                                        if (!profileEmail) {
                                            return (
                                                <div className="text-caption text-muted-foreground">
                                                    Админ болгохын өмнө <strong>Профайл</strong> таб-т имэйл хаяг нэмнэ үү.
                                                </div>
                                            );
                                        }
                                        if (!isEmailVerified) {
                                            return (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-2 text-warning border-warning/30 hover:bg-warning/10"
                                                    onClick={() => onVerifyEmail?.(profileEmail)}
                                                    disabled={!onVerifyEmail}
                                                >
                                                    <Mail className="h-4 w-4" />
                                                    Имэйл баталгаажуулах
                                                </Button>
                                            );
                                        }
                                        return (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2"
                                                onClick={() => setMakeAdminOpen(true)}
                                            >
                                                <Shield className="h-4 w-4" />
                                                Админ болгох
                                            </Button>
                                        );
                                    })()
                                )
                            )}
                        </div>

                        {/* Email verification status */}
                        {employee.role !== 'admin' && employee.role !== 'company_super_admin' && employee.email && (
                            <div className="flex items-center gap-2 text-caption flex-wrap">
                                <Mail className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                                <span className="text-muted-foreground">Профайл имэйл:</span>
                                <code className="text-body font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
                                    {employee.email}
                                </code>
                                {employee.emailVerified ? (
                                    <Badge variant="secondary" className="bg-success/10 text-success border-success/30">
                                        Баталгаажсан
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/30">
                                        Баталгаажаагүй
                                    </Badge>
                                )}
                            </div>
                        )}

                        {/* Auth email display */}
                        {authEmail && (
                            <div className="flex items-center gap-2 text-caption text-muted-foreground flex-wrap">
                                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>Нэвтрэх имэйл:</span>
                                <code className="text-body font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
                                    {authEmail}
                                </code>
                            </div>
                        )}

                        {/* Resend invite — only if admin and has auth email */}
                        {(employee.role === 'admin' || employee.role === 'company_super_admin') && authEmail && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 w-fit"
                                disabled={isResendingInvite}
                                onClick={handleResendInvite}
                            >
                                {isResendingInvite
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <Mail className="h-4 w-4" />}
                                Нэвтрэх урилга дахин илгээх
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Нэвтрэх эрхийн мэйл — энгийн ажилтанд code+phone нууц үгтэй мэйл дахин илгээх */}
            {showResendAccessEmail && (
                <Card className="rounded-2xl border bg-card shadow-sm">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Mail className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-semibold">Нэвтрэх эрхийн мэйл</CardTitle>
                                <CardDescription className="text-xs">Нэвтрэх мэдээллийг ажилтны имэйл рүү дахин илгээх (олон удаа боломжтой)</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={handleResendAccessEmail}
                            disabled={isResendingAccessEmail}
                        >
                            {isResendingAccessEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                            Дахин илгээх
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Гар утасны төхөөрөмж */}
            {isAdmin && !isSelf && (
                <Card className="rounded-2xl border bg-card shadow-sm">
                    <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Smartphone className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-semibold">Гар утасны төхөөрөмж</CardTitle>
                            <CardDescription className="text-xs">Flutter апп-аас ирц бүртгэхэд ашиглаж байгаа төхөөрөмжийн мэдээлэл</CardDescription>
                        </div>
                    </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-caption text-muted-foreground">Device ID:</span>
                            {employee.deviceId ? (
                                <code className="text-caption font-mono bg-muted px-2 py-0.5 rounded break-all">
                                    {employee.deviceId}
                                </code>
                            ) : (
                                <span className="text-caption text-muted-foreground italic">Бүртгэгдээгүй</span>
                            )}
                        </div>
                        {employee.deviceId && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="h-2 w-2 rounded-full bg-success" />
                                <span className="text-caption text-success font-medium">Бүртгэгдсэн</span>
                                <span className="text-caption text-muted-foreground">— зөвхөн энэ төхөөрөмжөөс ирц бүртгэнэ</span>
                            </div>
                        )}
                        {employee.deviceId && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 text-warning border-warning/30 hover:bg-warning/10"
                                onClick={() => setDeviceResetConfirmOpen(true)}
                                disabled={isResettingDevice}
                            >
                                {isResettingDevice ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" />
                                )}
                                Дахин тохируулах
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Ерөнхий админ шилжүүлэх */}
            {(currentUserRole === 'company_super_admin' || currentUserRole === 'super_admin') && !isSelf && employee.role !== 'company_super_admin' && (
                <Card className="rounded-2xl border bg-card shadow-sm border-l-4 border-l-warning">
                    <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center">
                            <Crown className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-semibold">Ерөнхий админ шилжүүлэх</CardTitle>
                            <CardDescription className="text-xs">Байгуулагын ерөнхий админ эрхийг энэ ажилтанд шилжүүлэх</CardDescription>
                        </div>
                    </div>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 text-warning border-warning/30 hover:bg-warning/10"
                            onClick={() => setTransferSuperAdminOpen(true)}
                        >
                            <Crown className="h-4 w-4" />
                            Шилжүүлэх
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Админ: Нууц үг шууд солих */}
            {showAdminSetPassword ? (
                <>
                    <Card className="rounded-2xl border bg-card shadow-sm">
                        <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                <ShieldAlert className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-semibold">Нууц үг (Админ)</CardTitle>
                                <CardDescription className="text-xs">Тухайн ажилтны нууц үгийг админ шууд шинэчилж өгнө</CardDescription>
                            </div>
                        </div>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => setAdminSetPasswordOpen(true)}
                            >
                                <KeyRound className="h-4 w-4" />
                                Нууц үг солих
                            </Button>
                            {employee.phoneNumber ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => {
                                        const v = String(employee.phoneNumber || '').trim();
                                        setAdminPassword(v);
                                        setAdminPasswordConfirm(v);
                                        setAdminSetPasswordOpen(true);
                                    }}
                                >
                                    <Lock className="h-4 w-4" />
                                    Утсаар тохируулах
                                </Button>
                            ) : null}
                        </CardContent>
                    </Card>

                    <Dialog
                        open={adminSetPasswordOpen}
                        onOpenChange={(open) => {
                            setAdminSetPasswordOpen(open);
                            if (!open) resetAdminPasswordForm();
                        }}
                    >
                        <DialogContent className="sm:max-w-[460px]">
                            <DialogHeader>
                                <DialogTitle>Нууц үг шинэчлэх (Админ)</DialogTitle>
                                <DialogDescription>
                                    <span className="font-medium">
                                        {employee.firstName} {employee.lastName}
                                    </span>
                                    -н нууц үгийг шинэчилнэ.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Шинэ нууц үг</Label>
                                    <div className="relative">
                                        <Input
                                            type={adminPasswordShow ? 'text' : 'password'}
                                            value={adminPassword}
                                            onChange={(e) => setAdminPassword(e.target.value)}
                                            placeholder="••••••••"
                                            disabled={isAdminSettingPassword}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setAdminPasswordShow(!adminPasswordShow)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            aria-label={adminPasswordShow ? 'Нууцлах' : 'Харах'}
                                        >
                                            {adminPasswordShow ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    <p className="text-micro text-muted-foreground">Дор хаяж 6 тэмдэгт.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Давтаж оруулах</Label>
                                    <Input
                                        type={adminPasswordShow ? 'text' : 'password'}
                                        value={adminPasswordConfirm}
                                        onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                                        placeholder="••••••••"
                                        disabled={isAdminSettingPassword}
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setAdminSetPasswordOpen(false)}
                                    disabled={isAdminSettingPassword}
                                >
                                    Цуцлах
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleAdminSetPassword}
                                    disabled={isAdminSettingPassword}
                                >
                                    {isAdminSettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Шинэчлэх
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </>
            ) : null}

            {/* Нэвтрэх эрх хаах/нээх */}
            {showDisableEnable && (
                <Card className="rounded-2xl border bg-card shadow-sm">
                    <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center">
                            <KeyRound className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-semibold">Нэвтрэх эрх</CardTitle>
                            <CardDescription className="text-xs">Энэ ажилтны системд нэвтрэх эрхийг идэвхгүй болгох эсвэл дахин идэвхжүүлэх</CardDescription>
                        </div>
                    </div>
                    </CardHeader>
                    <CardContent>
                        {loginDisabled ? (
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => setEnableConfirmOpen(true)}
                                disabled={isTogglingAccess}
                            >
                                {isTogglingAccess ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <LogIn className="h-4 w-4" />
                                )}
                                Нэвтрэх эрх нээх
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 text-warning border-warning/30 hover:bg-warning/10"
                                onClick={() => setDisableConfirmOpen(true)}
                                disabled={isTogglingAccess}
                            >
                                {isTogglingAccess ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Lock className="h-4 w-4" />
                                )}
                                Нэвтрэх эрх хаах
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Нууц үг */}
            <Card className="rounded-2xl border bg-card shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Lock className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-semibold">Нууц үг</CardTitle>
                            <CardDescription className="text-xs">
                                {showChangePassword
                                    ? 'Өөрийн нууц үгээ солих'
                                    : showResetForOther
                                      ? 'Нууц сэргээх холбоос нэвтрэх имэйл рүү илгээх'
                                      : 'Нууц үгтэй холбоотой үйлдэл хийх эрх байхгүй'}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                    {showChangePassword && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => setChangePasswordOpen(true)}
                        >
                            <Lock className="h-4 w-4" />
                            Нууц үг солих
                        </Button>
                    )}
                    {showResetForOther && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={handleResetPassword}
                            disabled={isResettingPassword}
                        >
                            {isResettingPassword ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <KeyRound className="h-4 w-4" />
                            )}
                            Нууц үг сэргээх
                        </Button>
                    )}
                    {!showChangePassword && !showResetForOther && (
                        <p className="text-caption text-muted-foreground">
                            Өөр хэрэглэгчийн нууц үг сэргээх эрх зөвхөн админд байна.
                        </p>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={disableConfirmOpen} onOpenChange={setDisableConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Нэвтрэх эрх хаах</AlertDialogTitle>
                        <AlertDialogDescription>
                            Та <strong>{employee.lastName} {employee.firstName}</strong> ажилтны нэвтрэх эрхийг идэвхгүй болгох гэж байна.
                            Дахин нэвтрэх бол эрх нээгдэх хүртэл боломжгүй болно.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isTogglingAccess}>Буцах</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleDisableAccess();
                            }}
                            disabled={isTogglingAccess}
                            className="bg-warning hover:bg-warning/90"
                        >
                            {isTogglingAccess && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Хаах
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={enableConfirmOpen} onOpenChange={setEnableConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Нэвтрэх эрх нээх</AlertDialogTitle>
                        <AlertDialogDescription>
                            Та <strong>{employee.lastName} {employee.firstName}</strong> ажилтны нэвтрэх эрхийг дахин идэвхжүүлэх гэж байна.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isTogglingAccess}>Буцах</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleEnableAccess();
                            }}
                            disabled={isTogglingAccess}
                        >
                            {isTogglingAccess && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Нээх
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />

            {/* Device reset confirmation */}
            <AlertDialog open={deviceResetConfirmOpen} onOpenChange={setDeviceResetConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Төхөөрөмж дахин тохируулах</AlertDialogTitle>
                        <AlertDialogDescription>
                            <strong>{employee.lastName} {employee.firstName}</strong>-ийн бүртгэлтэй төхөөрөмжийг арилгах гэж байна.
                            <br /><br />
                            Ажилтан дараагийн нэвтрэлтдээ шинэ төхөөрөмж бүртгүүлэх боломжтой болно.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isResettingDevice}>Болих</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleResetDevice(); }}
                            disabled={isResettingDevice}
                            className="bg-warning hover:bg-warning/90"
                        >
                            {isResettingDevice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Дахин тохируулах
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <MakeAdminDialog
                open={makeAdminOpen}
                onOpenChange={setMakeAdminOpen}
                employee={employee as any}
                currentUserId={currentUserId}
            />

            <TransferSuperAdminDialog
                open={transferSuperAdminOpen}
                onOpenChange={setTransferSuperAdminOpen}
                targetEmployee={employee as any}
            />

            {/* Portal access controls — manai production-only feature (top-level portals тус бүрд хандах эрх) */}
            {isAdmin && (
                <Card className="rounded-2xl border bg-card shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Портал хандах эрх</CardTitle>
                        <CardDescription>
                            Энэ ажилтанд аль порталыг үзэх эрхтэйг тогтооно. Админ нэвтрэх үед бүх портал автомат харагдана.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Button variant="outline" size="sm" className={cn("h-8 justify-start", employee.tmsAccess && "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100")} onClick={() => setShowTmsAccessDialog(true)}>
                                <Truck className="h-3.5 w-3.5 mr-1.5" />
                                {employee.tmsAccess ? 'TMS эрхтэй' : 'TMS эрх олгох'}
                            </Button>
                            <Button variant="outline" size="sm" className={cn("h-8 justify-start", employee.newsAccess && "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100")} onClick={() => setShowNewsAccessDialog(true)}>
                                <Newspaper className="h-3.5 w-3.5 mr-1.5" />
                                {employee.newsAccess ? 'Мэдээлэл эрхтэй' : 'Мэдээлэл эрх олгох'}
                            </Button>
                            <Button variant="outline" size="sm" className={cn("h-8 justify-start", employee.crmAccess && "border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100")} onClick={() => setShowCrmAccessDialog(true)}>
                                <HeartHandshake className="h-3.5 w-3.5 mr-1.5" />
                                {employee.crmAccess ? 'CRM эрхтэй' : 'CRM эрх олгох'}
                            </Button>
                            <Button variant="outline" size="sm" className={cn("h-8 justify-start", employee.businessPlanAccess && "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100")} onClick={() => setShowBusinessPlanAccessDialog(true)}>
                                <Target className="h-3.5 w-3.5 mr-1.5" />
                                {employee.businessPlanAccess ? 'Бизнес төлөвлөгөө эрхтэй' : 'Бизнес төлөвлөгөө эрх олгох'}
                            </Button>
                            <Button variant="outline" size="sm" className={cn("h-8 justify-start", employee.projectsAccess && "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100")} onClick={() => setShowProjectsAccessDialog(true)}>
                                <FolderKanban className="h-3.5 w-3.5 mr-1.5" />
                                {employee.projectsAccess ? 'Төслүүд эрхтэй' : 'Төслүүд эрх олгох'}
                            </Button>
                            <Button variant="outline" size="sm" className={cn("h-8 justify-start", employee.meetingsAccess && "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100")} onClick={() => setShowMeetingsAccessDialog(true)}>
                                <DoorOpen className="h-3.5 w-3.5 mr-1.5" />
                                {employee.meetingsAccess ? 'Хурлын өрөө эрхтэй' : 'Хурлын өрөө эрх олгох'}
                            </Button>
                            <Button variant="outline" size="sm" className={cn("h-8 justify-start", employee.companyAccess && "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100")} onClick={() => setShowCompanyAccessDialog(true)}>
                                <Building2 className="h-3.5 w-3.5 mr-1.5" />
                                {employee.companyAccess ? 'Компани эрхтэй' : 'Компани эрх олгох'}
                            </Button>
                            <Button variant="outline" size="sm" className={cn("h-8 justify-start", employee.officialLettersAccess && "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100")} onClick={() => setShowOfficialLettersAccessDialog(true)}>
                                <Stamp className="h-3.5 w-3.5 mr-1.5" />
                                {employee.officialLettersAccess ? 'Албан бичиг эрхтэй' : 'Албан бичиг эрх олгох'}
                            </Button>
                            <Button variant="outline" size="sm" className={cn("h-8 justify-start", employee.hseAccess && "border-green-200 bg-green-50 text-green-700 hover:bg-green-100")} onClick={() => setShowHseAccessDialog(true)}>
                                <HardHat className="h-3.5 w-3.5 mr-1.5" />
                                {employee.hseAccess ? 'ХАБЭА эрхтэй' : 'ХАБЭА эрх олгох'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <TmsAccessDialog open={showTmsAccessDialog} onOpenChange={setShowTmsAccessDialog} employee={employee} />
            <NewsAccessDialog open={showNewsAccessDialog} onOpenChange={setShowNewsAccessDialog} employee={employee} />
            <CrmAccessDialog open={showCrmAccessDialog} onOpenChange={setShowCrmAccessDialog} employee={employee} />
            <BusinessPlanAccessDialog open={showBusinessPlanAccessDialog} onOpenChange={setShowBusinessPlanAccessDialog} employee={employee} />
            <ProjectsAccessDialog open={showProjectsAccessDialog} onOpenChange={setShowProjectsAccessDialog} employee={employee} />
            <MeetingsAccessDialog open={showMeetingsAccessDialog} onOpenChange={setShowMeetingsAccessDialog} employee={employee} />
            <CompanyAccessDialog open={showCompanyAccessDialog} onOpenChange={setShowCompanyAccessDialog} employee={employee} />
            <OfficialLettersAccessDialog open={showOfficialLettersAccessDialog} onOpenChange={setShowOfficialLettersAccessDialog} employee={employee} />
            <HseAccessDialog open={showHseAccessDialog} onOpenChange={setShowHseAccessDialog} employee={employee} />
        </div>
    );
}
