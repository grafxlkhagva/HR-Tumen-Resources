'use client';

import { getJsonAuthHeaders } from '@/lib/api/client-auth';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    AppDialog,
    AppDialogContent,
    AppDialogFooter,
    AppDialogHeader,
    AppDialogTitle,
    AppDialogDescription,
} from '@/components/patterns';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    useFirebase,
    useMemoFirebase,
    useFetchDoc,
    useUser,
    tenantDoc,
    useTenantWrite,
} from '@/firebase';
import { getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, Save, Upload, AlertTriangle, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/tenant-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    buildInvitationEmailHtmlFromFields,
    INVITATION_EMAIL_DEFAULT_FIELDS,
    INVITATION_EMAIL_DEFAULT_SUBJECT,
    INVITATION_EMAIL_TEMPLATE_DOC_ID,
} from '@/lib/invitation-email-template';
import { notifyEmployeeAdded } from '@/lib/notify-client';
import * as Sentry from '@sentry/nextjs';
import { logAudit } from '@/lib/client/audit-client';
import { buildInviteUrl } from '@/lib/invite-token';
import { normalizePhoneNumber } from '@/lib/phone-utils';

const employeeSchema = z.object({
    firstName: z.string().min(1, 'Нэр хоосон байж болохгүй.'),
    lastName: z.string().min(1, 'Овог хоосон байж болохгүй.'),
    email: z.string().email('Имэйл хаяг буруу байна.'),
    phoneNumber: z.string().min(6, 'Утасны дугаар дор хаяж 6 оронтой байх ёстой.'),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface AddEmployeeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /**
     * Ажилтан амжилттай үүссэний дараа дуудагдана. `AppointEmployeeDialog` зэрэг
     * оронтой (nested) контекстэд шинээр үүссэн ажилтныг шууд сонгож авахад
     * ашиглагдана.
     */
    onCreated?: (employee: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phoneNumber: string;
        employeeCode: string;
        photoURL?: string;
        status: string;
    }) => void;
}

function buildDefaultInvitationHtml(v: Record<string, string>): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .credentials-box { background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .credential-item { margin: 15px 0; }
        .label { font-weight: bold; color: #6b7280; font-size: 14px; }
        .value { font-size: 18px; color: #111827; font-family: monospace; background: #f3f4f6; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 5px; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${v.companyName}</h1>
            <p>Нэвтрэх мэдээлэл</p>
        </div>
        <div class="content">
            <p>Сайн байна уу, <strong>${v.employeeName}</strong>,</p>
            <p>Таныг <strong>${v.companyName}</strong> байгууллагын HR системд бүртгэлээ. Доорх мэдээлэл ашиглан системд нэвтрэх боломжтой.</p>
            <div class="credentials-box">
                <div class="credential-item"><div class="label">Ажилтны код:</div><div class="value">${v.employeeCode}</div></div>
                <div class="credential-item"><div class="label">Нэвтрэх нэр:</div><div class="value">${v.employeeCode}</div></div>
                <div class="credential-item"><div class="label">Нууц үг:</div><div class="value">${v.password}</div></div>
            </div>
            <div class="warning"><strong>⚠️ Аюулгүй байдал:</strong> Энэ мэдээллийг хадгалж, хэнтэй ч хуваалцахгүй байхыг анхаарна уу.</div>
            <p>Системд нэвтрэх: <a href="${v.appUrl}/login">${v.appUrl}/login</a></p>
            <p>Асуулт байвал HR багтай холбогдоно уу.</p>
            <div class="footer"><p>Энэ мэйл автоматаар илгээгдсэн.</p><p>Бүртгэсэн: ${v.adminName}</p></div>
        </div>
    </div>
</body>
</html>
    `.trim();
}

function buildDefaultInvitationText(v: Record<string, string>): string {
    return [
        `${v.companyName} - Нэвтрэх мэдээлэл`,
        `Сайн байна уу, ${v.employeeName},`,
        `Таныг ${v.companyName} байгууллагын HR системд бүртгэлээ.`,
        `Ажилтны код: ${v.employeeCode}`,
        `Нэвтрэх нэр: ${v.employeeCode}`,
        `Нууц үг тохируулах линк: ${v.inviteUrl}`,
        `Линк 48 цагийн дотор хүчинтэй бөгөөд зөвхөн нэг удаа ашиглагдана.`,
        `Бүртгэсэн: ${v.adminName}`,
    ].join('\n\n');
}

export function AddEmployeeDialog({
    open,
    onOpenChange,
    onCreated,
}: AddEmployeeDialogProps) {
    const { firebaseApp } = useFirebase();
    const { firestore, tDoc } = useTenantWrite();
    const { user: currentUser } = useUser();
    const { toast } = useToast();
    const { company, companyId, isWithinLimit } = useTenant();
    const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
    const [photoFile, setPhotoFile] = React.useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const employeeCount = company?.employeeCount ?? 0;
    const limitReached = !isWithinLimit('maxEmployees', employeeCount);
    const maxEmployees = company?.limits?.maxEmployees ?? 0;

    const companyProfileRef = useMemoFirebase(({ firestore, companyPath }) => (firestore ? tenantDoc(firestore, companyPath, 'company', 'profile') : null), []);
    const { data: companyProfile } = useFetchDoc<any>(companyProfileRef);

    const form = useForm<EmployeeFormValues>({
        resolver: zodResolver(employeeSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            phoneNumber: '',
        }
    });

    const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast({ variant: 'destructive', title: 'Зураг хэт том байна', description: 'Дээд хэмжээ 5MB байна.' });
            if (event.target) event.target.value = '';
            return;
        }

        // Хуучин URL-г чөлөөлөх (memory leak запобіганню)
        setPhotoPreview(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(file);
        });
        setPhotoFile(file);
    };

    // Component unmount-д object URL чөлөөлөх
    React.useEffect(() => {
        return () => {
            if (photoPreview) URL.revokeObjectURL(photoPreview);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Email илгээх функц
    const sendEmployeeCredentialsEmail = async (
        employeeEmail: string,
        employeeName: string,
        loginEmail: string,
        inviteUrl: string,
        employeeCode: string
    ) => {
        try {
            // Админы мэдээлэл авах
            let adminName = 'Админ';
            if (currentUser) {
                if (currentUser.displayName) {
                    adminName = currentUser.displayName;
                } else if (currentUser.email) {
                    adminName = currentUser.email;
                }
                // Админы бүрэн мэдээлэл авах (employees collection-оос)
                if (firestore && currentUser.uid) {
                    try {
                        const adminDocRef = tDoc('employees', currentUser.uid);
                        const adminDoc = await getDoc(adminDocRef);
                        if (adminDoc.exists()) {
                            const adminData = adminDoc.data();
                            adminName = `${adminData.firstName || ''} ${adminData.lastName || ''}`.trim() || adminName;
                        }
                    } catch (e) {
                        console.warn('Админы мэдээлэл авах алдаа:', e);
                    }
                }
            }

            const companyName = companyProfile?.name || 'Байгууллага';
            const appUrl = typeof window !== 'undefined' 
                ? window.location.origin 
                : (process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com');

            // NOTE: системд нэвтрэх нэр = ажилтны код
            const vars: Record<string, string> = {
                companyName,
                employeeName,
                employeeCode,
                loginEmail: employeeCode,
                inviteUrl,
                appUrl,
                adminName,
            };
            const replacePlaceholders = (s: string) =>
                Object.entries(vars).reduce((t, [k, v]) => t.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v), s);

            let emailSubject: string;
            let emailHtml: string;
            let emailText: string;

            if (firestore) {
                const templateRef = tDoc('company', INVITATION_EMAIL_TEMPLATE_DOC_ID);
                const templateSnap = await getDoc(templateRef);
                if (templateSnap.exists()) {
                    const t = templateSnap.data() as any;
                    const subjectTemplate = (t?.subject as string | undefined) || INVITATION_EMAIL_DEFAULT_SUBJECT;

                    // Priority:
                    // 1) htmlBody (legacy/advanced)
                    // 2) fields -> generate htmlBody
                    // 3) fallback default
                    const htmlTemplate: string =
                        (typeof t?.htmlBody === 'string' && t.htmlBody.trim())
                            ? (t.htmlBody as string)
                            : (t?.fields
                                ? buildInvitationEmailHtmlFromFields(t.fields)
                                : buildInvitationEmailHtmlFromFields(INVITATION_EMAIL_DEFAULT_FIELDS));

                    emailSubject = replacePlaceholders(subjectTemplate);
                    emailHtml = replacePlaceholders(htmlTemplate);
                    emailText = buildDefaultInvitationText(vars);
                } else {
                    emailSubject = replacePlaceholders(INVITATION_EMAIL_DEFAULT_SUBJECT);
                    emailHtml = replacePlaceholders(buildInvitationEmailHtmlFromFields(INVITATION_EMAIL_DEFAULT_FIELDS));
                    emailText = buildDefaultInvitationText(vars);
                }
            } else {
                emailSubject = replacePlaceholders(INVITATION_EMAIL_DEFAULT_SUBJECT);
                emailHtml = replacePlaceholders(buildInvitationEmailHtmlFromFields(INVITATION_EMAIL_DEFAULT_FIELDS));
                emailText = buildDefaultInvitationText(vars);
            }

            // Layer E8: Retry x3 with exponential backoff. Final failure-ийг
            // audit log-д тэмдэглэж админ-руу мэдэгдэх боломж олгоно. Email
            // илгээхгүй болсон ч ажилтан нэмэх процессыг блоклохгүй.
            const MAX_ATTEMPTS = 3;
            let lastError: unknown = null;
            let succeeded = false;
            for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
                try {
                    const response = await fetch('/api/email', {
                        method: 'POST',
                        headers: await getJsonAuthHeaders(),
                        body: JSON.stringify({
                            to: employeeEmail,
                            subject: emailSubject,
                            html: emailHtml,
                            text: emailText,
                        }),
                    });

                    if (!response.ok) {
                        const errorData = await response
                            .json()
                            .catch(() => ({ error: 'Unknown error' }));
                        lastError = errorData?.details || errorData?.error || errorData;
                        console.warn(
                            `[Email] Илгээхэд алдаа (attempt ${attempt}/${MAX_ATTEMPTS}):`,
                            lastError,
                        );
                    } else {
                        const result = await response
                            .json()
                            .catch(() => ({ status: 'unknown' }));
                        if (result.status === 'sent') {
                            console.log('[Email] Амжилттай илгээгдлээ:', employeeEmail);
                            succeeded = true;
                            break;
                        } else if (result.status === 'simulated_success') {
                            console.warn(
                                '[Email] Simulation mode - бодит email илгээгдээгүй',
                            );
                            succeeded = true;
                            break;
                        } else {
                            lastError = `Unexpected status: ${result.status}`;
                        }
                    }
                } catch (err: unknown) {
                    lastError = err instanceof Error ? err.message : String(err);
                    console.warn(
                        `[Email] Fetch failed (attempt ${attempt}/${MAX_ATTEMPTS}):`,
                        lastError,
                    );
                }

                if (attempt < MAX_ATTEMPTS) {
                    const delay = 500 * Math.pow(2, attempt - 1);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
            }

            if (!succeeded) {
                // Audit final failure — admin Slack/notification руу зөөвөрлөж болно.
                void logAudit({
                    action: 'update',
                    resource: 'employee',
                    resourceName: employeeName,
                    description: 'Ажилтны нэвтрэх мэдээлэл имэйлээр илгээгдсэнгүй',
                    metadata: {
                        kind: 'invitation_email_failed',
                        employeeEmail,
                        employeeCode,
                        attempts: MAX_ATTEMPTS,
                        lastError:
                            lastError instanceof Error
                                ? lastError.message
                                : String(lastError),
                    },
                });
            }
        } catch (err: unknown) {
            // Email алдаа гарвал ажилтан нэмэх үйлдлийг зогсоохгүй
            console.warn('[Email] Илгээхэд алдаа гарлаа:', err instanceof Error ? err.message : err);
        }
    };

    const handleSave = async (values: EmployeeFormValues) => {
        if (!firestore || !firebaseApp || !companyId) return;

        setIsSubmitting(true);

        try {
            const normalizedPhone = (() => {
                try { return normalizePhoneNumber(values.phoneNumber); }
                catch { return values.phoneNumber; }
            })();

            // Server endpoint-оор email lookup + (reuse | create) + employee doc +
            // membership + claims бүгдийг атомоор гүйцэтгэнэ.
            const res = await fetch('/api/admin/employees/create', {
                method: 'POST',
                headers: await getJsonAuthHeaders(),
                body: JSON.stringify({
                    companyId,
                    firstName: values.firstName,
                    lastName: values.lastName,
                    email: values.email,
                    phoneNumber: normalizedPhone,
                }),
            });

            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                const code = errBody?.code as string | undefined;
                let errorMessage = errBody?.error || 'Ажилтан үүсгэхэд алдаа гарлаа.';
                if (code === 'ALREADY_MEMBER') {
                    errorMessage = errBody.error;
                } else if (code === 'EMPLOYEE_LIMIT_EXCEEDED') {
                    errorMessage = errBody.error;
                }
                toast({ variant: 'destructive', title: 'Алдаа гарлаа', description: errorMessage });
                return;
            }

            const data = (await res.json()) as {
                uid: string;
                employeeCode: string;
                existed: boolean;
                authEmail: string;
                inviteToken?: string;
            };

            // Зургийг одоо upload хийж, employee doc-ын photoURL-ийг шинэчилнэ
            let photoURL = '';
            if (photoFile) {
                try {
                    const storage = getStorage(firebaseApp);
                    const sanitizedPhotoName = photoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                    const storageRef = ref(storage, `employee-photos/${companyId}/${data.uid}/${sanitizedPhotoName}`);
                    await uploadBytes(storageRef, photoFile);
                    photoURL = await getDownloadURL(storageRef);
                    await updateDoc(tDoc('employees', data.uid), { photoURL });
                } catch (photoError: unknown) {
                    console.warn('[Photo] Зураг хадгалахад алдаа:', photoError instanceof Error ? photoError.message : photoError);
                }
            }

            // Invite email (зөвхөн шинэ Auth хэрэглэгч үүссэн тохиолдолд)
            if (!data.existed && data.inviteToken) {
                try {
                    const appUrl = typeof window !== 'undefined'
                        ? window.location.origin
                        : (process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com');
                    const inviteUrl = buildInviteUrl(appUrl, data.inviteToken);

                    await sendEmployeeCredentialsEmail(
                        values.email,
                        `${values.firstName} ${values.lastName}`,
                        data.authEmail,
                        inviteUrl,
                        data.employeeCode,
                    );
                } catch (emailError: unknown) {
                    console.warn('[Email/Invite] Илгээхэд алдаа:', emailError instanceof Error ? emailError.message : emailError);
                }
            }

            toast({
                title: 'Амжилттай хадгаллаа',
                description: data.existed
                    ? `${values.lastName} ${values.firstName} нь системд өмнө бүртгэлтэй байсан тул зөвхөн энэ байгууллагад нэмэгдлээ. Тэд одоогийн нууц үгээрээ нэвтэрнэ. Код: ${data.employeeCode}.`
                    : `${values.lastName} ${values.firstName} нэртэй ажилтан системд нэмэгдлээ. Код: ${data.employeeCode}.`,
            });

            // Admin-уудад notification (fire-and-forget)
            notifyEmployeeAdded({
                employeeName: `${values.lastName} ${values.firstName}`,
                employeeUid: data.uid,
                employeeCode: data.employeeCode,
                employeeEmail: values.email,
                hireDate: new Date().toLocaleDateString('mn-MN'),
                actorName: currentUser?.displayName || currentUser?.email || undefined,
            });

            // Form-ийг цэвэрлэх
            form.reset();
            if (photoPreview) URL.revokeObjectURL(photoPreview);
            setPhotoPreview(null);
            setPhotoFile(null);
            onOpenChange(false);

            // Nested контекстэд auto-select хийхэд ашиглагдана
            onCreated?.({
                id: data.uid,
                firstName: values.firstName,
                lastName: values.lastName,
                email: values.email,
                phoneNumber: normalizedPhone,
                employeeCode: data.employeeCode,
                photoURL,
                status: 'active_recruitment',
            });
        } catch (error: any) {
            Sentry.captureException(error, { tags: { module: 'employees', action: 'add-employee' } });
            console.warn('[handleSave] Ажилтан нэмэхэд алдаа гарлаа:', error?.message || error);
            toast({
                variant: 'destructive',
                title: 'Алдаа гарлаа',
                description: error?.message || 'Ажилтан үүсгэхэд алдаа гарлаа.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AppDialog open={open} onOpenChange={onOpenChange}>
            <AppDialogContent size="sm" className="p-0 overflow-hidden">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSave)}>
                        <AppDialogHeader className="px-6 pt-6">
                            <AppDialogTitle>Шинэ ажилтан нэмэх</AppDialogTitle>
                            <AppDialogDescription>
                                Ажилтны үндсэн мэдээллийг бүртгэнэ үү.
                            </AppDialogDescription>
                        </AppDialogHeader>
                        <div className="px-6 py-4 space-y-4">
                            {limitReached && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Ажилтны хязгаар хэтэрсэн</AlertTitle>
                                    <AlertDescription>
                                        Таны багцад хамгийн ихдээ {maxEmployees} ажилтан бүртгэх боломжтой (одоо: {employeeCount}).
                                        Илүү олон ажилтан нэмэхийн тулд багцаа шинэчилнэ үү.
                                        <a href="/dashboard/billing" className="ml-1 inline-flex items-center gap-1 font-medium underline underline-offset-2">
                                            <Sparkles className="h-3 w-3" />Багц сунгах
                                        </a>
                                    </AlertDescription>
                                </Alert>
                            )}
                            <div className="flex flex-col items-center gap-3">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage src={photoPreview || undefined} />
                                    <AvatarFallback className="text-lg">
                                        {form.watch('firstName')?.charAt(0) || ''}
                                        {form.watch('lastName')?.charAt(0) || ''}
                                    </AvatarFallback>
                                </Avatar>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={fileInputRef}
                                    onChange={handlePhotoSelect}
                                    className="hidden"
                                />
                                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                    Зураг
                                </Button>
                            </div>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField control={form.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Овог</FormLabel><FormControl><Input placeholder="Бат" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>Нэр</FormLabel><FormControl><Input placeholder="Дорж" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Имэйл</FormLabel><FormControl><Input type="email" placeholder="dorj@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="phoneNumber" render={({ field }) => (<FormItem><FormLabel>Утасны дугаар</FormLabel><FormControl><Input placeholder="88001234" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                        </div>
                        <AppDialogFooter>
                            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                                Цуцлах
                            </Button>
                            <Button type="submit" disabled={isSubmitting || limitReached}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Нэмэх
                            </Button>
                        </AppDialogFooter>
                    </form>
                </Form>
            </AppDialogContent>
        </AppDialog>
    )
}
