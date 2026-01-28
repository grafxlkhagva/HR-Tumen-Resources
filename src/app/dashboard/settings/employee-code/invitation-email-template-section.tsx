'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Mail, RotateCcw, Eye, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useMemoFirebase, useDoc, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
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

const INVITATION_EMAIL_TEMPLATE_REF_ID = 'invitationEmailTemplate';

export const INVITATION_EMAIL_DEFAULT_SUBJECT = 'Таны нэвтрэх мэдээлэл - {{companyName}}';

export const INVITATION_EMAIL_DEFAULT_HTML = `<!DOCTYPE html>
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
            <h1>{{companyName}}</h1>
            <p>Нэвтрэх мэдээлэл</p>
        </div>
        <div class="content">
            <p>Сайн байна уу, <strong>{{employeeName}}</strong>,</p>
            
            <p>Таныг <strong>{{companyName}}</strong> байгууллагын HR системд бүртгэлээ. Доорх мэдээлэл ашиглан системд нэвтрэх боломжтой.</p>
            
            <div class="credentials-box">
                <div class="credential-item">
                    <div class="label">Ажилтны код:</div>
                    <div class="value">{{employeeCode}}</div>
                </div>
                <div class="credential-item">
                    <div class="label">Нэвтрэх имэйл:</div>
                    <div class="value">{{loginEmail}}</div>
                </div>
                <div class="credential-item">
                    <div class="label">Нууц үг:</div>
                    <div class="value">{{password}}</div>
                </div>
            </div>
            
            <div class="warning">
                <strong>⚠️ Аюулгүй байдал:</strong> Энэ мэдээллийг хадгалж, хэнтэй ч хуваалцахгүй байхыг анхаарна уу. Нэвтрэх мэдээллээ нууц үгээр солихыг зөвлөж байна.
            </div>
            
            <p>Системд нэвтрэх: <a href="{{appUrl}}/login">{{appUrl}}/login</a></p>
            
            <p>Асуулт байвал HR багтай холбогдоно уу.</p>
            
            <div class="footer">
                <p>Энэ мэйл автоматаар илгээгдсэн. Хариу бичих шаардлагагүй.</p>
                <p>Бүртгэсэн: {{adminName}}</p>
            </div>
        </div>
    </div>
</body>
</html>`;

export const INVITATION_EMAIL_PLACEHOLDERS = [
  { key: '{{companyName}}', label: 'Байгууллагын нэр' },
  { key: '{{employeeName}}', label: 'Ажилтны нэр' },
  { key: '{{employeeCode}}', label: 'Ажилтны код' },
  { key: '{{loginEmail}}', label: 'Нэвтрэх имэйл' },
  { key: '{{password}}', label: 'Нууц үг' },
  { key: '{{appUrl}}', label: 'Системийн URL (жишээ: https://app.example.com)' },
  { key: '{{adminName}}', label: 'Бүртгэсэн админы нэр' },
];

/** Жишээ утгууд — урьдчилан харах болон тайлбарт ашиглана */
export const INVITATION_EMAIL_PREVIEW_VARS: Record<string, string> = {
  companyName: 'Жишээ байгууллага',
  employeeName: 'Бат-Эрдэнэ',
  employeeCode: 'EMP0001',
  loginEmail: 'EMP0001@example.com',
  password: '••••••••',
  appUrl: 'https://hr.example.com',
  adminName: 'Системийн админ',
};

function replacePlaceholders(text: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (out, [k, v]) => out.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v),
    text
  );
}

const schema = z.object({
  subject: z.string().min(1, 'Гарчиг хоосон байж болохгүй.'),
  htmlBody: z.string().min(1, 'HTML бие хоосон байж болохгүй.'),
});

type FormValues = z.infer<typeof schema>;

export type InvitationEmailTemplate = {
  subject: string;
  htmlBody: string;
};

export function InvitationEmailTemplateSection() {
  const { toast } = useToast();
  const [resetConfirmOpen, setResetConfirmOpen] = React.useState(false);
  const templateRef = useMemoFirebase(
    ({ firestore }) =>
      firestore ? doc(firestore, 'company', INVITATION_EMAIL_TEMPLATE_REF_ID) : null,
    []
  );

  const { data: template, isLoading } = useDoc<InvitationEmailTemplate>(templateRef as any);

  const defaultValues: FormValues = React.useMemo(
    () => ({
      subject: template?.subject ?? INVITATION_EMAIL_DEFAULT_SUBJECT,
      htmlBody: template?.htmlBody ?? INVITATION_EMAIL_DEFAULT_HTML,
    }),
    [template?.subject, template?.htmlBody]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  React.useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues.subject, defaultValues.htmlBody, form]);

  const { isSubmitting, isDirty } = form.formState;
  const watchSubject = form.watch('subject');
  const watchHtmlBody = form.watch('htmlBody');

  const onSubmit = async (data: FormValues) => {
    if (!templateRef) return;
    try {
      await setDocumentNonBlocking(templateRef, data, { merge: true });
      form.reset(data);
      toast({
        title: 'Амжилттай хадгаллаа',
        description: 'Урилга мэйлын загвар шинэчлэгдлээ.',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Алдаа гарлаа',
        description: 'Загвар хадгалах үед алдаа гарлаа. Дахин оролдож үзнэ үү.',
        variant: 'destructive',
      });
    }
  };

  // Хадгалаагүй өөрчлөлттэй таб/цонх хаах үед анхааруулах
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Ctrl/Cmd+S хадгалах
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        form.handleSubmit(onSubmit)();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [form, onSubmit]);

  const previewSubject = React.useMemo(
    () => replacePlaceholders(watchSubject || INVITATION_EMAIL_DEFAULT_SUBJECT, INVITATION_EMAIL_PREVIEW_VARS),
    [watchSubject]
  );
  const previewHtml = React.useMemo(
    () => replacePlaceholders(watchHtmlBody || INVITATION_EMAIL_DEFAULT_HTML, INVITATION_EMAIL_PREVIEW_VARS),
    [watchHtmlBody]
  );

  const handleReset = () => {
    setResetConfirmOpen(false);
    form.reset({
      subject: INVITATION_EMAIL_DEFAULT_SUBJECT,
      htmlBody: INVITATION_EMAIL_DEFAULT_HTML,
    });
    toast({
      title: 'Үндсэн загвар руу буцаалаа',
      description: 'Өөрчлөлт хадгалахын тулд "Хадгалах" дарна уу.',
    });
  };

  if (isLoading) {
    return (
      <Card className="shadow-premium border-slate-200/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Урилга мэйлын загвар
          </CardTitle>
          <CardDescription>
            Шинэ ажилтан нэмэх үед илгээгдэх нэвтрэх мэйлын загварыг тохируулна.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-10 w-48 bg-muted animate-pulse rounded" />
          <div className="h-64 mt-4 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card className="shadow-premium border-slate-200/60">
      <CardHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Урилга мэйлын загвар
          </CardTitle>
          {isDirty && (
            <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
              Хадгалаагүй өөрчлөлт
            </span>
          )}
        </div>
        <CardDescription>
          Шинэ ажилтан нэмэх үед илгээгдэх нэвтрэх мэйлын загварыг тохируулна. Дараах орлуулагчууд автоматаар
          солигдоно: {INVITATION_EMAIL_PLACEHOLDERS.map((p) => p.key).join(', ')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Мэйлын гарчиг</FormLabel>
                  <FormControl>
                    <Input placeholder={INVITATION_EMAIL_DEFAULT_SUBJECT} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="htmlBody"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>HTML бие</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="HTML форматаар мэйлын бие..."
                      className="min-h-[320px] font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Орлуулагч: {INVITATION_EMAIL_PLACEHOLDERS.map((p) => p.key).join(', ')}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 size-4 shrink-0 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4 shrink-0" />
                )}
                Хадгалах
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetConfirmOpen(true)}
                disabled={isSubmitting}
              >
                <RotateCcw className="mr-2 size-4 shrink-0" />
                Үндсэн загвар
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>

    <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Үндсэн загвар руу буцаах уу?</AlertDialogTitle>
          <AlertDialogDescription>
            Одоогийн өөрчлөлт цуцлагдаж, системийн үндсэн загвар сэргээгдэнэ. Хадгалах товч дарснаар л шинэчлэлт хадгалагдана.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Болих</AlertDialogCancel>
          <AlertDialogAction onClick={handleReset}>Тийм, буцаах</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Бодит харагдах байдал — жишээ өгөгдлөөр урьдчилан харах */}
    <Card className={cn('shadow-premium border-slate-200/60 mt-6')}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4" />
            Бодит харагдах байдал
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const blob = new Blob([previewHtml], { type: 'text/html;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              window.open(url, '_blank', 'noopener,noreferrer');
              setTimeout(() => URL.revokeObjectURL(url), 5000);
            }}
            className="shrink-0"
          >
            <ExternalLink className="h-4 w-4 mr-1.5" />
            Шинэ цонхонд нээх
          </Button>
        </div>
        <CardDescription>
          Одоогийн загвар жишээ өгөгдлөөр хэрхэн харагдахыг доор харуулна. Гарчиг болон HTML биеийг өөрчлөхөд энд шинэчлэгдэнэ.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Мэйлын гарчиг (жишээ)</p>
          <p className="text-sm font-medium text-foreground break-all rounded-md bg-muted/50 px-3 py-2">
            {previewSubject}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Мэйлын бие (жишээ)</p>
          <div className="rounded-lg border bg-white overflow-hidden" style={{ minHeight: 360 }}>
            <iframe
              title="Урилга мэйл урьдчилан харах"
              srcDoc={previewHtml}
              className="w-full border-0"
              style={{ height: 480, display: 'block' }}
              sandbox="allow-same-origin"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Жишээ утгууд: {Object.entries(INVITATION_EMAIL_PREVIEW_VARS).map(([k, v]) => `${k}=${v}`).join(', ')}
          </p>
        </div>
      </CardContent>
    </Card>
  </>
  );
}
