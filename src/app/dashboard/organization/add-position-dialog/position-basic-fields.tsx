'use client';

import * as React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Wand2 } from 'lucide-react';
import { PositionFormValues } from './types';
import { Position as JobPosition } from '../types';
import { ReferenceItem as Reference } from '@/types';

interface PositionBasicFieldsProps {
  form: UseFormReturn<PositionFormValues>;
  departments: Reference[];
  allPositions: JobPosition[] | null;
  positionLevels: Reference[];
  employmentTypes: Reference[];
  jobCategories: any[];
  workSchedules: Reference[];
  editingPosition?: JobPosition | null;
  preselectedDepartmentId?: string;
  isEditMode: boolean;
  onGenerateCode: () => Promise<string | undefined>;
  firestore: any;
  posCodeConfigRef: any;
}

/** Fields shown in "add" (non-edit) mode */
export function AddModeBasicFields({
  form,
  departments,
  allPositions,
  editingPosition,
  preselectedDepartmentId,
  onGenerateCode,
  firestore,
  posCodeConfigRef,
}: PositionBasicFieldsProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Ажлын байрны нэр <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input placeholder="Жишээ нь: Ахлах нягтлан бодогч" {...field} value={field.value || ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="code"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center justify-between">
              <span>Ажлын байрны код</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] gap-1 text-primary"
                disabled={!firestore || !posCodeConfigRef}
                onClick={async () => {
                  const code = await onGenerateCode();
                  if (code) field.onChange(code);
                }}
              >
                <Wand2 className="w-3 h-3" />
                Автоматаар үүсгэх
              </Button>
            </FormLabel>
            <FormControl>
              <Input placeholder="Жишээ нь: ACC001" {...field} value={field.value || ''} onChange={e => field.onChange(e.target.value.toUpperCase())} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {!preselectedDepartmentId && (
        <FormField
          control={form.control}
          name="departmentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Харьяалагдах хэлтэс <span className="text-red-500">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Хэлтэс сонгох" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="reportsTo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Шууд удирдлага</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Сонгох..." />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="(none)">(Шууд удирдлагагүй)</SelectItem>
                {((allPositions as any[]) || []).filter((p: any) => !editingPosition || p?.id !== (editingPosition as any)?.id).map((pos: any) => (
                  <SelectItem key={pos.id} value={pos.id}>
                    {pos.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

/** Basic info card shown in edit mode's "basic" tab */
export function EditModeBasicCard({
  form,
  departments,
  allPositions,
  editingPosition,
  onGenerateCode,
  firestore,
  posCodeConfigRef,
}: PositionBasicFieldsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Үндсэн мэдээлэл</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Албан тушаалын нэр</FormLabel>
              <FormControl>
                <Input placeholder="Жишээ нь: Програм хангамжийн ахлах инженер" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center justify-between">
                <span>Ажлын байрны код</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] gap-1 text-primary hover:bg-primary/10"
                  disabled={!firestore || !posCodeConfigRef}
                  onClick={async () => {
                    const code = await onGenerateCode();
                    if (code) form.setValue('code', code);
                  }}
                >
                  <Wand2 className="w-3 h-3" />
                  Код үүсгэх
                </Button>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Код үүсгэх товчийг дарна уу"
                  {...field}
                  value={field.value || ''}
                  readOnly
                  className="bg-slate-50 cursor-not-allowed uppercase"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="departmentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Харьяалагдах хэлтэс</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Хэлтэс сонгох" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reportsTo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Шууд удирдлага</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Удирдах албан тушаал сонгох" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="(none)">(Шууд удирдлагагүй)</SelectItem>
                    {(allPositions || []).filter(p => p.id !== editingPosition?.id).map((pos) => (
                      <SelectItem key={pos.id} value={pos.id}>
                        {pos.title} {pos.isApproved === false && '(Батлагдаагүй)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
