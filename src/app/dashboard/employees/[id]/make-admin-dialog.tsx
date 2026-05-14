'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { Shield, ShieldOff, Loader2, Mail, CheckCircle2, Copy, Check } from 'lucide-react';
import { useTenantWrite } from '@/firebase';
import { updateDoc, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Employee } from '@/types';
import { getJsonAuthHeaders } from '@/lib/api/client-auth';
import { useTenant } from '@/contexts/tenant-context';
import { useUser } from '@/firebase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

interface MakeAdminDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee;
    currentUserId: string;
    onSuccess?: () => void;
}

export function MakeAdminDialog({
    open,
    onOpenChange,
    employee,
    currentUserId,
    onSuccess,
}: MakeAdminDialogProps) {
    const { firestore, tCollection, tDoc } = useTenantWrite();
    const { companyId } = useTenant();
    const { toast } = useToast();
    const { user: firebaseUser } = useUser();
    const [isLoading, setIsLoading] = React.useState(false);
    const [email, setEmail] = React.useState('');
    const [sendInvite, setSendInvite] = React.useState(true);
    const [emailError, setEmailError] = React.useState('');
    const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);
    // Capture admin state at open time to prevent flash when role updates mid-dialog
    const [wasAdminOnOpen, setWasAdminOnOpen] = React.useState(false);

    const isCurrentlyAdmin =
        employee.role === 'admin' || employee.role === 'company_super_admin';
    const isCompanySuperAdmin = employee.role === 'company_super_admin';
    const isSelf = employee.id === currentUserId;

    // Does employee already have a real (non-internal) email?
    const hasRealEmail =
        !!employee.authEmail &&
        !employee.authEmail.endsWith('@internal.nege.app') &&
        !employee.authEmail.endsWith('@example.com');

    const needsEmail = !wasAdminOnOpen && !hasRealEmail;

    React.useEffect(() => {
        if (open) {
            setWasAdminOnOpen(isCurrentlyAdmin);
            setEmail(employee.email ?? '');
            setSendInvite(true);
            setEmailError('');
        }
    }, [open, employee.email]); // eslint-disable-line react-hooks/exhaustive-deps

    const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

    // ── Promote to admin ───────────────────────────────────────────────────────
    const handlePromote = async () => {
        if (!companyId) return;

        if (needsEmail && !validateEmail(email)) {
            setEmailError('Зөв имэйл хаяг оруулна уу.');
            return;
        }
        setEmailError('');
        setIsLoading(true);

        try {
            const headers = await getJsonAuthHeaders();
            const res = await fetch('/api/admin/promote-to-web-access', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    targetUid: employee.id,
                    companyId,
                    email: needsEmail ? email.trim().toLowerCase() : undefined,
                    sendInvite,
                    role: 'admin',
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast({
                    variant: 'destructive',
                    title: 'Алдаа',
                    description: data?.error ?? 'Админ эрх олгоход алдаа гарлаа.',
                });
                return;
            }

            try { await firebaseUser?.getIdToken(true); } catch { /* ignore */ }

            if (sendInvite && !data.emailSent && data.inviteUrl) {
                // Email failed — show invite URL so admin can share manually
                setInviteUrl(data.inviteUrl);
                toast({
                    title: 'Эрх олгогдлоо',
                    description: 'Имэйл сервис тохируулаагүй тул урилга илгээгдсэнгүй. Холбоосыг хуулж явуулна уу.',
                });
                onSuccess?.();
                return;
            }

            toast({
                title: 'Амжилттай',
                description:
                    sendInvite && data.emailSent
                        ? `${employee.firstName} ажилтанд Админ эрх олгож, урилга ${data.authEmail} руу илгээгдлээ.`
                        : `${employee.firstName} ажилтанд Админ эрх олгогдлоо.`,
            });

            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error('[MakeAdminDialog] promote error:', error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Системийн алдаа гарлаа.' });
        } finally {
            setIsLoading(false);
        }
    };

    // ── Revoke admin ───────────────────────────────────────────────────────────
    const handleRevoke = async () => {
        if (!firestore || !companyId) return;
        setIsLoading(true);

        try {
            const adminQuery = query(
                tCollection('employees'),
                where('role', 'in', ['admin', 'company_super_admin']),
            );
            const adminSnap = await getDocs(adminQuery);
            if (adminSnap.size <= 1) {
                toast({
                    variant: 'destructive',
                    title: 'Үйлдэл хийх боломжгүй',
                    description: 'Системд дор хаяж нэг админ байх ёстой.',
                });
                return;
            }

            const headers = await getJsonAuthHeaders();
            const claimsRes = await fetch('/api/admin/set-tenant-claims', {
                method: 'POST',
                headers,
                body: JSON.stringify({ targetUid: employee.id, role: 'employee', companyId }),
            });

            if (!claimsRes.ok) {
                toast({ variant: 'destructive', title: 'Алдаа', description: 'Firebase эрх шинэчлэхэд алдаа гарлаа.' });
                return;
            }

            await updateDoc(tDoc('employees', employee.id), { role: 'employee' });
            try { await firebaseUser?.getIdToken(true); } catch { /* ignore */ }

            toast({ title: 'Амжилттай', description: `${employee.firstName} ажилтны Админ эрхийг цуцаллаа.` });
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error('[MakeAdminDialog] revoke error:', error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Эрх цуцлах үед алдаа гарлаа.' });
        } finally {
            setIsLoading(false);
        }
    };

    // ── Revoke: AlertDialog ────────────────────────────────────────────────────
    if (wasAdminOnOpen) {
        return (
            <AlertDialog open={open} onOpenChange={onOpenChange}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-full bg-orange-100">
                                <ShieldOff className="h-5 w-5 text-orange-600" />
                            </div>
                            <AlertDialogTitle>Админ эрх цуцлах</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="text-left">
                            {isCompanySuperAdmin ? (
                                <span className="text-destructive">
                                    Байгууллагын ерөнхий админы эрхийг өөрчлөх боломжгүй.
                                </span>
                            ) : isSelf ? (
                                <span className="text-destructive">
                                    Та өөрийгөө админаас хасах боломжгүй.
                                </span>
                            ) : (
                                <>
                                    <strong>{employee.lastName} {employee.firstName}</strong>-н Админ эрхийг цуцлах гэж байна.
                                    <br /><br />
                                    Энэ ажилтан вэб системийн удирдлагын хуудсанд нэвтрэх боломжгүй болно.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>Буцах</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRevoke}
                            disabled={isLoading || isSelf || isCompanySuperAdmin}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Эрх цуцлах
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    }

    // ── Promote: Dialog with email + invite options ─────────────────────────────
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 rounded-full bg-blue-100">
                            <Shield className="h-5 w-5 text-blue-600" />
                        </div>
                        <DialogTitle>Вэб эрх олгох</DialogTitle>
                    </div>
                    <DialogDescription>
                        <strong>{employee.lastName} {employee.firstName}</strong>-д вэб системийн
                        Админ эрх олгож, нэвтрэх урилга явуулна.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Email input */}
                    {needsEmail ? (
                        <div className="space-y-1.5">
                            <Label htmlFor="invite-email" className="flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5" />
                                Нэвтрэх имэйл хаяг
                                <span className="text-destructive ml-0.5">*</span>
                            </Label>
                            <Input
                                id="invite-email"
                                type="email"
                                placeholder="user@company.mn"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (emailError) setEmailError('');
                                }}
                                disabled={isLoading}
                                autoComplete="email"
                            />
                            {emailError && (
                                <p className="text-xs text-destructive">{emailError}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                Ажилтан энэ хаягаар вэб системд нэвтэрнэ.
                            </p>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
                            <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                            <div className="text-sm">
                                <span className="text-muted-foreground">Нэвтрэх имэйл: </span>
                                <span className="font-medium">{employee.authEmail}</span>
                            </div>
                        </div>
                    )}

                    {/* Send invite */}
                    <div className="flex items-start gap-3 rounded-lg border p-3">
                        <Checkbox
                            id="send-invite"
                            checked={sendInvite}
                            onCheckedChange={(v) => setSendInvite(!!v)}
                            disabled={isLoading}
                            className="mt-0.5"
                        />
                        <div className="space-y-0.5">
                            <Label htmlFor="send-invite" className="cursor-pointer font-medium text-sm">
                                Нэвтрэх урилга имэйлээр илгээх
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Ажилтан имэйлийнхээ холбоосоор нэвтэрч нууц үгээ тохируулна. 48 цаг хүчинтэй.
                            </p>
                        </div>
                    </div>

                    {/* Permission info */}
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 px-3 py-2.5 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                        <p className="font-medium">Олгогдох эрх:</p>
                        <ul className="space-y-0.5 pl-3 list-disc">
                            <li>Вэб системийн бүх тохиргоонд хандах</li>
                            <li>Ажилтнуудын мэдээлэл удирдах</li>
                            <li>Модулуудын бүрэн удирдлага</li>
                        </ul>
                    </div>
                </div>

                {/* Invite URL fallback (when email not sent) */}
                {inviteUrl && <InviteUrlBox url={inviteUrl} onClose={() => { setInviteUrl(null); onOpenChange(false); }} />}

                {!inviteUrl && (
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Буцах
                        </Button>
                        <Button onClick={handlePromote} disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {sendInvite ? 'Эрх олгож урилга илгээх' : 'Эрх олгох'}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}

function InviteUrlBox({ url, onClose }: { url: string; onClose: () => void }) {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Имэйл илгээгдсэнгүй — холбоосыг хуулж ажилтанд явуулна уу
            </p>
            <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white dark:bg-black/20 border rounded px-2 py-1.5 break-all text-foreground">
                    {url}
                </code>
                <Button size="icon" variant="outline" onClick={handleCopy} className="flex-shrink-0 h-8 w-8">
                    {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300">
                Холбоос 48 цаг хүчинтэй. Ажилтан дарахад нууц үгээ тохируулж нэвтэрнэ.
            </p>
            <Button size="sm" onClick={onClose} className="w-full">
                Ойлголоо, хаах
            </Button>
        </div>
    );
}
