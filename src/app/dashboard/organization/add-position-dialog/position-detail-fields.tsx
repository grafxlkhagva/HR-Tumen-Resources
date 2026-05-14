'use client';

import * as React from 'react';
import { UseFormReturn } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { PositionFormValues } from './types';
import { ReferenceItem as Reference } from '@/types';

interface DetailFieldsProps {
  form: UseFormReturn<PositionFormValues>;
  positionLevels: Reference[];
  employmentTypes: Reference[];
  jobCategories: any[];
  workSchedules: Reference[];
}

/** Classification card (level, employment type, job category) */
export function ClassificationCard({
  form,
  positionLevels,
  employmentTypes,
  jobCategories,
}: DetailFieldsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Ангилал</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="levelId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Албан тушаалын зэрэглэл</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Зэрэглэл сонгох" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {positionLevels.map((level) => (
                      <SelectItem key={level.id} value={level.id}>
                        {level.name}
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
            name="employmentTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ажил эрхлэлтийн төрөл</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Төрөл сонгох" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {employmentTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="jobCategoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ажил мэргэжлийн ангилал (ҮАМАТ)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="ҮАМАТ сонгох" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {jobCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.code} - {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}

/** Additional settings card (work schedule, approval switches, point budget) */
export function AdditionalSettingsCard({
  form,
  workSchedules,
}: Pick<DetailFieldsProps, 'form' | 'workSchedules'>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Нэмэлт тохиргоо</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="workScheduleId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ажлын цагийн хуваарь</FormLabel>
              <Select onValueChange={(value) => field.onChange(value === "none" ? "" : value)} value={field.value || "none"}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Цагийн хуваарь сонгох" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">(Сонгоогүй)</SelectItem>
                  {workSchedules.map((schedule) => (
                    <SelectItem key={schedule.id} value={schedule.id}>
                      {schedule.name}
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
          name="canApproveAttendance"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Ирцийн хүсэлт батлах эсэх</FormLabel>
                <FormDescription>
                  Энэ ажлын байр нь доод албан тушаалтнуудынхаа ирцийн хүсэлтийг батлах эрхтэй эсэхийг тодорхойлно.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="canApproveVacation"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Амралтын хүсэлт батлах эсэх</FormLabel>
                <FormDescription>
                  Энэ ажлын байр нь ажилчдын ээлжийн амралтын хүсэлтийг батлах эрхтэй эсэхийг тодорхойлно.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Point Budget Section */}
        <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-4">
          <FormField
            control={form.control}
            name="hasPointBudget"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between">
                <div className="space-y-0.5">
                  <FormLabel className="text-base flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    Онооны төсөвтэй эсэх
                  </FormLabel>
                  <FormDescription>
                    Энэ ажлын байр нь ажилчдад өгөх онооны төсөвтэй байх эсэх.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {form.watch('hasPointBudget') && (
            <FormField
              control={form.control}
              name="yearlyPointBudget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Жилийн онооны төсөв</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Жишээ нь: 50000"
                      {...field}
                      value={field.value || 0}
                      onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                      readOnly
                    />
                  </FormControl>
                  <FormDescription>
                    Тухайн ажлын байрны ажилтан жилд бусад руу хуваарилах боломжтой нийт оноо.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** Purpose & responsibilities tab content */
export function PurposeCard({
  form,
}: Pick<DetailFieldsProps, 'form'>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Ажлын байрны мэдээлэл</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ажлын байрны зорилго</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ажлын байрны зорилгыг энд бичнэ үү..."
                  className="min-h-[120px]"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="responsibilities"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ажлын байрны чиг үүрэг (Мөр бүрт нэг)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={"Жишээ нь:\nСистемийн хөгжүүлэлт хариуцах\nКод хянах\nБаг удирдах"}
                  className="min-h-[120px]"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>Чиг үүргүүдийг шинэ мөрөөр (Enter дарж) зааглан оруулна уу.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}

/** Compensation tab content */
export function CompensationCard({
  form,
}: Pick<DetailFieldsProps, 'form'>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Цалингийн мэдээлэл</CardTitle>
        <CardDescription>Албан тушаалын цалингийн хүрээ болон нэмэгдэл хөлс</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border p-4 rounded-lg bg-slate-50/50">
          <FormField
            control={form.control}
            name="salaryMin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Доод (Min)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} value={field.value || 0} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="salaryMid"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Дундаж (Mid)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} value={field.value || 0} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="salaryMax"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Дээд (Max)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} value={field.value || 0} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="salaryCurrency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Валют</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Сонгох" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="MNT">MNT (₮)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="salaryPeriod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Цалингийн мөчлөг</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Сонгох" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="monthly">Сараар</SelectItem>
                    <SelectItem value="yearly">Жилээр</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h4 className="text-sm font-semibold">Хувьсах цалин (Variable Pay)</h4>
          <FormField
            control={form.control}
            name="bonusDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Бонус / Урамшуулал</FormLabel>
                <FormControl>
                  <Input placeholder="Жишээ: Жилийн бүтээмжийн бонус 10-20%" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="commissionDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Комисс / Борлуулалтын шагнал</FormLabel>
                <FormControl>
                  <Input placeholder="Жишээ: Борлуулалтын орлогын 2%" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="equityDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Хувьцаа / ESOP</FormLabel>
                <FormControl>
                  <Input placeholder="Жишээ: 1000 нэгж хувьцаа, 4 жилийн хугацаанд" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/** Benefits tab content */
export function BenefitsCard({
  form,
}: Pick<DetailFieldsProps, 'form'>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Хангамж ба Хөнгөлөлт</CardTitle>
        <CardDescription>Ажилтанд олгох нэмэлт хангамж, ажлын нөхцөл</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="isRemoteAllowed"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <FormLabel className="text-base">Гэрээс ажиллах</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="flexibleHours"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <FormLabel className="text-base">Уян хатан цаг</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="vacationDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Нэмэлт амралтын хоног (Жилд)</FormLabel>
              <FormControl>
                <Input type="number" {...field} value={field.value || 0} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
              </FormControl>
              <FormDescription>Хуулийн дагуух 15 хоногоос гадуурх нэмэлт хоног.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="otherBenefits"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Бусад хөнгөлөлт, хангамж (Мөр бүрт нэг)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={"Жишээ нь:\nҮнэгүй хоол\nФитнес гишүүнчлэл\nМэргэжлийн сургалтын төсөв"}
                  className="min-h-[120px]"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
