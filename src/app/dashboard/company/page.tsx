'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
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
import { useFirebase, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2, Save, Pencil, Building, Hash, Info, Users, User, Globe, Briefcase, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatePresence, motion } from 'framer-motion';

const companyProfileSchema = z.object({
  name: z.string().min(2, { message: 'Нэр дор хаяж 2 тэмдэгттэй байх ёстой.' }),
  legalName: z.string().optional(),
  registrationNumber: z.string().optional(),
  taxId: z.string().optional(),
  industry: z.string().optional(),
  employeeCount: z.string().optional(),
  ceo: z.string().optional(),
  website: z.string().url({ message: 'Вэбсайтын хаяг буруу байна.' }).optional().or(z.literal('')),
});

type CompanyProfileFormValues = z.infer<typeof companyProfileSchema>;

const InfoRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}) => (
  <div className="flex items-start gap-4">
    <Icon className="h-5 w-5 text-muted-foreground" />
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value || 'Тодорхойгүй'}</p>
    </div>
  </div>
);


function CompanyProfileView({
  profile,
  onEdit,
}: {
  profile: CompanyProfileFormValues;
  onEdit: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Ерөнхий мэдээлэл</CardTitle>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Засварлах
        </Button>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
        <InfoRow icon={FileText} label="Компанийн нэр" value={profile.name} />
        <InfoRow icon={Info} label="Хуулийн этгээдийн нэр" value={profile.legalName} />
        <InfoRow icon={Hash} label="Улсын бүртгэлийн дугаар" value={profile.registrationNumber} />
        <InfoRow icon={Hash} label="Татвар төлөгчийн дугаар" value={profile.taxId} />
        <InfoRow icon={Briefcase} label="Үйл ажиллагааны чиглэл" value={profile.industry} />
        <InfoRow icon={Users} label="Ажилтны тоо" value={profile.employeeCount} />
        <InfoRow icon={User} label="Гүйцэтгэх захирал" value={profile.ceo} />
        <InfoRow icon={Globe} label="Веб хуудас" value={profile.website} />
      </CardContent>
    </Card>
  );
}


function CompanyProfileForm({
  profile,
  onCancel,
  onSave,
}: {
  profile?: CompanyProfileFormValues;
  onCancel: () => void;
  onSave: (values: CompanyProfileFormValues) => void;
}) {
  const form = useForm<CompanyProfileFormValues>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: profile || {
      name: '',
      legalName: '',
      registrationNumber: '',
      taxId: '',
      industry: '',
      employeeCount: '',
      ceo: '',
      website: '',
    },
  });

  const { isSubmitting } = form.formState;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)}>
        <Card>
          <CardHeader>
            <CardTitle>Ерөнхий мэдээлэл</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
             <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Компанийн нэр</FormLabel>
                    <FormControl>
                      <Input placeholder="Хөхэнэгэ ХХК" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="legalName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Хуулийн этгээдийн нэр</FormLabel>
                    <FormControl>
                      <Input placeholder="Эйч Ар Зен ХХК" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="registrationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Улсын бүртгэлийн дугаар</FormLabel>
                    <FormControl>
                      <Input placeholder="1234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="taxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Татвар төлөгчийн дугаар</FormLabel>
                    <FormControl>
                      <Input placeholder="901234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Үйл ажиллагааны чиглэл</FormLabel>
                    <FormControl>
                      <Input placeholder="Технологи" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                 <FormField
                control={form.control}
                name="employeeCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ажилтны тоо</FormLabel>
                    <FormControl>
                      <Input placeholder="51-100 ажилтан" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                 <FormField
                control={form.control}
                name="ceo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Гүйцэтгэх захирал</FormLabel>
                    <FormControl>
                      <Input placeholder="Ж. Ганбаатар" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                 <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Веб хуудас</FormLabel>
                    <FormControl>
                      <Input placeholder="https://hrzen.example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
          </CardContent>
          <CardFooter className="gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Хадгалах
            </Button>
            <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>Цуцлах</Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

function PageSkeleton() {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-9 w-28" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div className="flex items-start gap-4" key={i}>
                        <Skeleton className="h-5 w-5 rounded-sm" />
                        <div className="space-y-1.5">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-5 w-36" />
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

export default function CompanyPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = React.useState(false);

  const companyProfileRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'company', 'profile') : null),
    [firestore]
  );
  
  const { data: companyProfile, isLoading: isLoadingProfile, error } = useDoc<CompanyProfileFormValues>(companyProfileRef);

  const handleSave = (values: CompanyProfileFormValues) => {
    if (!companyProfileRef) return;
    
    setDocumentNonBlocking(companyProfileRef, values, { merge: true });

    toast({
      title: 'Амжилттай хадгаллаа',
      description: 'Компанийн мэдээлэл шинэчлэгдлээ.',
    });
    setIsEditing(false);
  };
  
  if (error) {
      return (
          <div className="py-8">
              <Card>
                  <CardHeader>
                      <CardTitle>Алдаа гарлаа</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p className="text-destructive">Компанийн мэдээллийг ачаалахад алдаа гарлаа: {error.message}</p>
                  </CardContent>
              </Card>
          </div>
      )
  }

  return (
    <div className="py-8">
       <AnimatePresence mode="wait">
        {isLoadingProfile ? (
             <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
             >
                <PageSkeleton />
             </motion.div>
        ) : isEditing || !companyProfile ? (
            <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CompanyProfileForm 
                    profile={companyProfile || undefined}
                    onSave={handleSave} 
                    onCancel={() => setIsEditing(false)} 
                />
            </motion.div>
        ) : (
             <motion.div
                key="view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CompanyProfileView 
                    profile={companyProfile} 
                    onEdit={() => setIsEditing(true)} 
                />
             </motion.div>
        )}
       </AnimatePresence>
    </div>
  );
}
