'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/tenant-context';
import { getJsonAuthHeaders } from '@/lib/api/client-auth';
import { normalizePhoneNumber } from '@/lib/phone-utils';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  FileUp,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

type RowStatus = 'idle' | 'pending' | 'success' | 'error';

interface Row {
  id: string;
  lastName: string;
  firstName: string;
  email: string;
  phoneNumber: string;
  status: RowStatus;
  errorMsg?: string;
  employeeCode?: string;
}

const rowSchema = z.object({
  lastName: z.string().trim().min(1, 'Овог'),
  firstName: z.string().trim().min(1, 'Нэр'),
  email: z.string().trim().email('Имэйл буруу'),
  phoneNumber: z.string().trim().min(6, 'Утас богино'),
});

// ── Header synonyms ────────────────────────────────────────────────────────
const HEADER_MAP: Record<keyof Omit<Row, 'id' | 'status' | 'errorMsg' | 'employeeCode'>, string[]> = {
  lastName: ['овог', 'lastname', 'last name', 'surname', 'овгийн нэр'],
  firstName: ['нэр', 'firstname', 'first name', 'given name', "өөрийн нэр"],
  email: ['имэйл', 'email', 'e-mail', 'mail', 'цахим шуудан'],
  phoneNumber: ['утас', 'phone', 'phonenumber', 'phone number', 'tel', 'mobile', 'утасны дугаар'],
};

function normalizeHeader(s: string): string {
  return s.trim().toLowerCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ');
}

function detectFieldIndex(headers: string[]): Partial<Record<keyof typeof HEADER_MAP, number>> {
  const out: Partial<Record<keyof typeof HEADER_MAP, number>> = {};
  headers.forEach((h, i) => {
    const norm = normalizeHeader(h);
    (Object.keys(HEADER_MAP) as (keyof typeof HEADER_MAP)[]).forEach(field => {
      if (out[field] !== undefined) return;
      if (HEADER_MAP[field].some(alias => norm === alias || norm.includes(alias))) {
        out[field] = i;
      }
    });
  });
  return out;
}

function newRow(partial?: Partial<Row>): Row {
  return {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    lastName: '',
    firstName: '',
    email: '',
    phoneNumber: '',
    status: 'idle',
    ...partial,
  };
}

function rowsFromMatrix(matrix: string[][], withHeader = true): Row[] {
  if (matrix.length === 0) return [];
  let fieldIdx: Partial<Record<keyof typeof HEADER_MAP, number>> = {};
  let dataRows = matrix;
  if (withHeader) {
    fieldIdx = detectFieldIndex(matrix[0]);
    const anyDetected = Object.keys(fieldIdx).length > 0;
    if (anyDetected) {
      dataRows = matrix.slice(1);
    }
  }
  const hasMapping = Object.keys(fieldIdx).length > 0;
  return dataRows
    .filter(r => r.some(cell => (cell ?? '').toString().trim()))
    .map(r => {
      const pick = (i?: number, fallback = 0) => {
        const idx = i ?? fallback;
        return (r[idx] ?? '').toString().trim();
      };
      if (hasMapping) {
        return newRow({
          lastName: pick(fieldIdx.lastName, 0),
          firstName: pick(fieldIdx.firstName, 1),
          email: pick(fieldIdx.email, 2),
          phoneNumber: pick(fieldIdx.phoneNumber, 3),
        });
      }
      // Header not detected → assume positional order: Овог, Нэр, Имэйл, Утас
      return newRow({
        lastName: pick(undefined, 0),
        firstName: pick(undefined, 1),
        email: pick(undefined, 2),
        phoneNumber: pick(undefined, 3),
      });
    });
}

export default function BulkAddEmployeesPage() {
  const { toast } = useToast();
  const { companyId } = useTenant();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>(() =>
    Array.from({ length: 3 }, () => newRow())
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const updateRow = useCallback((id: string, patch: Partial<Row>) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const addRows = useCallback((n = 1) => {
    setRows(prev => [...prev, ...Array.from({ length: n }, () => newRow())]);
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows(prev => (prev.length > 1 ? prev.filter(r => r.id !== id) : prev));
  }, []);

  const duplicateRow = useCallback((id: string) => {
    setRows(prev => {
      const idx = prev.findIndex(r => r.id === id);
      if (idx < 0) return prev;
      const clone = newRow({ ...prev[idx], status: 'idle', errorMsg: undefined, employeeCode: undefined });
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setRows([newRow()]);
    setProgress({ done: 0, total: 0 });
  }, []);

  // ── Paste handler: TSV/CSV content pasted into any input expands into rows ──
  const handleRowPaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>, rowId: string, field: keyof Row) => {
      const text = e.clipboardData.getData('text');
      if (!text || (!text.includes('\n') && !text.includes('\t'))) return; // single cell paste — default behavior
      e.preventDefault();
      const matrix = text
        .split(/\r?\n/)
        .filter(l => l.trim())
        .map(l => l.split(/\t|,|;/));
      const newRows = rowsFromMatrix(matrix, /* withHeader */ true);
      if (newRows.length === 0) return;
      setRows(prev => {
        const idx = prev.findIndex(r => r.id === rowId);
        if (idx < 0) return [...prev, ...newRows];
        // Replace current row onwards with pasted rows (keep leading rows)
        const head = prev.slice(0, idx);
        const current = prev[idx];
        const currentIsEmpty = !current.lastName && !current.firstName && !current.email && !current.phoneNumber;
        const tail = prev.slice(idx + 1);
        return [...head, ...(currentIsEmpty ? [] : [current]), ...newRows, ...tail];
      });
      void field;
    },
    []
  );

  // ── File import ────────────────────────────────────────────────────────
  async function handleFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    try {
      if (ext === 'csv' || ext === 'txt') {
        const text = await file.text();
        const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
        const matrix = (parsed.data as string[][]) ?? [];
        const imported = rowsFromMatrix(matrix, true);
        if (imported.length === 0) {
          toast({ title: 'Өгөгдөл олдсонгүй', variant: 'destructive' });
          return;
        }
        setRows(imported);
        toast({ title: `${imported.length} мөр импортлогдлоо` });
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buf = await file.arrayBuffer();
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buf);
        const ws = wb.worksheets[0];
        if (!ws) {
          toast({ title: 'Sheet олдсонгүй', variant: 'destructive' });
          return;
        }
        const matrix: string[][] = [];
        ws.eachRow({ includeEmpty: false }, row => {
          const cells: string[] = [];
          row.eachCell({ includeEmpty: true }, cell => {
            cells.push(cell.value == null ? '' : String(cell.value));
          });
          matrix.push(cells);
        });
        const imported = rowsFromMatrix(matrix, true);
        if (imported.length === 0) {
          toast({ title: 'Өгөгдөл олдсонгүй', variant: 'destructive' });
          return;
        }
        setRows(imported);
        toast({ title: `${imported.length} мөр импортлогдлоо` });
      } else {
        toast({ title: 'Зөвхөн .csv / .xlsx дэмжинэ', variant: 'destructive' });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: 'Файл уншихад алдаа',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // ── Template download ─────────────────────────────────────────────────
  function downloadTemplate() {
    const csv = 'Овог,Нэр,Имэйл,Утас\nДоржсүрэн,Болормаа,b.dorj@example.mn,88000000\n';
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees-template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ── Validation ────────────────────────────────────────────────────────
  const validation = useMemo(() => {
    const validRows: Row[] = [];
    const invalidRows: { row: Row; msg: string }[] = [];
    const seenEmails = new Set<string>();
    for (const r of rows) {
      const isEmpty = !r.lastName && !r.firstName && !r.email && !r.phoneNumber;
      if (isEmpty) continue;
      const parsed = rowSchema.safeParse(r);
      if (!parsed.success) {
        invalidRows.push({
          row: r,
          msg: parsed.error.issues.map(i => i.message).join(', '),
        });
        continue;
      }
      const emailLower = parsed.data.email.toLowerCase();
      if (seenEmails.has(emailLower)) {
        invalidRows.push({ row: r, msg: 'Имэйл давхардсан' });
        continue;
      }
      seenEmails.add(emailLower);
      validRows.push(r);
    }
    return { validRows, invalidRows };
  }, [rows]);

  // ── Submit (sequential) ────────────────────────────────────────────────
  async function submitAll(onlyFailed = false) {
    if (!companyId) {
      toast({ title: 'Компани танигдсангүй', variant: 'destructive' });
      return;
    }
    let targets = validation.validRows;
    if (onlyFailed) targets = targets.filter(r => r.status === 'error');
    if (targets.length === 0) {
      toast({ title: 'Илгээх мөр алга' });
      return;
    }
    setIsSubmitting(true);
    setProgress({ done: 0, total: targets.length });

    // Reset statuses for targets to pending
    setRows(prev =>
      prev.map(r => (targets.find(t => t.id === r.id) ? { ...r, status: 'pending', errorMsg: undefined } : r))
    );

    let done = 0;
    for (const r of targets) {
      try {
        const phone = (() => {
          try { return normalizePhoneNumber(r.phoneNumber); }
          catch { return r.phoneNumber.trim(); }
        })();
        const res = await fetch('/api/admin/employees/create', {
          method: 'POST',
          headers: await getJsonAuthHeaders(),
          body: JSON.stringify({
            companyId,
            firstName: r.firstName.trim(),
            lastName: r.lastName.trim(),
            email: r.email.trim(),
            phoneNumber: phone,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const msg = body?.error || `HTTP ${res.status}`;
          updateRow(r.id, { status: 'error', errorMsg: msg });
        } else {
          const body = await res.json().catch(() => ({}));
          updateRow(r.id, { status: 'success', employeeCode: body?.employee?.employeeCode || body?.employeeCode });
        }
      } catch (err) {
        updateRow(r.id, {
          status: 'error',
          errorMsg: err instanceof Error ? err.message : 'Сүлжээний алдаа',
        });
      } finally {
        done += 1;
        setProgress({ done, total: targets.length });
      }
    }

    setIsSubmitting(false);
    const successCount = targets.filter(t => {
      // Re-read latest (closure captured earlier state). Use setRows functional read.
      return false;
    }).length; // placeholder — actual count via state below

    // Toast summary (re-read rows snapshot)
    setRows(prev => {
      const succ = prev.filter(p => p.status === 'success').length;
      const err = prev.filter(p => p.status === 'error').length;
      toast({
        title: `Багц дуусав: ${succ} амжилт, ${err} алдаа`,
        variant: err > 0 ? 'destructive' : 'default',
      });
      return prev;
    });
    void successCount;
  }

  const stats = useMemo(() => {
    let success = 0, error = 0, pending = 0, idle = 0;
    for (const r of rows) {
      if (r.status === 'success') success++;
      else if (r.status === 'error') error++;
      else if (r.status === 'pending') pending++;
      else idle++;
    }
    return { success, error, pending, idle };
  }, [rows]);

  const anyCreated = stats.success > 0;

  return (
    <div className="h-full flex flex-col px-6 py-6 gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/employees">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Багцаар ажилтан нэмэх
            </h1>
            <p className="text-sm text-muted-foreground">
              Олон ажилтныг нэг удаагийн үйлдлээр нэмэх. CSV/Excel оруулах, эсвэл шууд бөглөх
              боломжтой.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
            <FileUp className="h-4 w-4 mr-2" />
            CSV / Excel оруулах
          </Button>
          <Button variant="outline" size="sm" onClick={downloadTemplate} disabled={isSubmitting}>
            <Download className="h-4 w-4 mr-2" />
            Жишээ татах
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/40 p-3 text-xs text-slate-700 leading-relaxed shrink-0">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-medium">Зөвлөгөө:</span> Excel/Google Sheets-ээс мөрүүдийг
            хуулаад аль нэг нүдэнд <kbd className="px-1 py-0.5 bg-white border rounded">Ctrl/Cmd+V</kbd>{' '}
            дарахад мөрүүд автоматаар тархаж бөглөгдөнө. Толгойн эгнээг таниж "Овог | Нэр | Имэйл |
            Утас" талбаруудад тохируулна.
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b sticky top-0 z-10">
              <tr className="text-left">
                <th className="px-3 py-2 w-10 text-xs font-medium text-slate-500">#</th>
                <th className="px-3 py-2 text-xs font-medium text-slate-500">Овог *</th>
                <th className="px-3 py-2 text-xs font-medium text-slate-500">Нэр *</th>
                <th className="px-3 py-2 text-xs font-medium text-slate-500">Имэйл *</th>
                <th className="px-3 py-2 text-xs font-medium text-slate-500">Утас *</th>
                <th className="px-3 py-2 w-40 text-xs font-medium text-slate-500">Статус</th>
                <th className="px-2 py-2 w-20 text-xs font-medium text-slate-500 text-right">Үйлдэл</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const isEmpty = !r.lastName && !r.firstName && !r.email && !r.phoneNumber;
                const invalid = !isEmpty && !rowSchema.safeParse(r).success;
                const disabled = isSubmitting || r.status === 'success';
                return (
                  <tr
                    key={r.id}
                    className={cn(
                      'border-b last:border-b-0 hover:bg-slate-50/40',
                      r.status === 'success' && 'bg-emerald-50/40',
                      r.status === 'error' && 'bg-red-50/30'
                    )}
                  >
                    <td className="px-3 py-1.5 text-xs text-slate-400 tabular-nums">{idx + 1}</td>
                    <td className="px-2 py-1">
                      <Input
                        value={r.lastName}
                        disabled={disabled}
                        onChange={e => updateRow(r.id, { lastName: e.target.value, status: 'idle', errorMsg: undefined })}
                        onPaste={e => handleRowPaste(e, r.id, 'lastName')}
                        placeholder="Доржсүрэн"
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        value={r.firstName}
                        disabled={disabled}
                        onChange={e => updateRow(r.id, { firstName: e.target.value, status: 'idle', errorMsg: undefined })}
                        onPaste={e => handleRowPaste(e, r.id, 'firstName')}
                        placeholder="Болормаа"
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        type="email"
                        value={r.email}
                        disabled={disabled}
                        onChange={e => updateRow(r.id, { email: e.target.value, status: 'idle', errorMsg: undefined })}
                        onPaste={e => handleRowPaste(e, r.id, 'email')}
                        placeholder="name@example.mn"
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        value={r.phoneNumber}
                        disabled={disabled}
                        onChange={e => updateRow(r.id, { phoneNumber: e.target.value, status: 'idle', errorMsg: undefined })}
                        onPaste={e => handleRowPaste(e, r.id, 'phoneNumber')}
                        placeholder="88000000"
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      {r.status === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                          <Loader2 className="h-3 w-3 animate-spin" /> Үүсгэж байна
                        </span>
                      )}
                      {r.status === 'success' && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Үүсгэв
                          {r.employeeCode && (
                            <Badge variant="secondary" className="text-[10px] font-mono">
                              {r.employeeCode}
                            </Badge>
                          )}
                        </span>
                      )}
                      {r.status === 'error' && (
                        <span className="inline-flex items-start gap-1.5 text-xs text-red-700">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{r.errorMsg || 'Алдаа'}</span>
                        </span>
                      )}
                      {r.status === 'idle' && invalid && (
                        <span className="text-xs text-amber-600">Талбар дутуу</span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Хувилах"
                          onClick={() => duplicateRow(r.id)}
                          disabled={isSubmitting}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          title="Устгах"
                          onClick={() => removeRow(r.id)}
                          disabled={isSubmitting || rows.length === 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t bg-slate-50/50 px-3 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => addRows(1)} disabled={isSubmitting}>
              <Plus className="h-4 w-4 mr-1" /> Мөр нэмэх
            </Button>
            <Button variant="ghost" size="sm" onClick={() => addRows(10)} disabled={isSubmitting}>
              +10
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAll} disabled={isSubmitting}>
              Цэвэрлэх
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            {validation.validRows.length} хүчинтэй · {validation.invalidRows.length} алдаатай
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="rounded-xl border bg-white p-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 flex-wrap text-sm">
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            Нийт: {rows.filter(r => r.lastName || r.firstName || r.email || r.phoneNumber).length}
          </Badge>
          {stats.success > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
              <CheckCircle2 className="h-3 w-3" /> {stats.success} үүсэв
            </Badge>
          )}
          {stats.error > 0 && (
            <Badge className="bg-red-100 text-red-700 border-red-200 gap-1">
              <AlertCircle className="h-3 w-3" /> {stats.error} алдаа
            </Badge>
          )}
          {isSubmitting && (
            <span className="text-xs text-muted-foreground">
              {progress.done}/{progress.total} боловсруулж байна...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {anyCreated && (
            <Button variant="outline" asChild>
              <Link href="/dashboard/employees">Жагсаалт руу буцах</Link>
            </Button>
          )}
          {stats.error > 0 && !isSubmitting && (
            <Button
              variant="outline"
              onClick={() => submitAll(true)}
              disabled={isSubmitting}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Алдаатайг дахин
            </Button>
          )}
          <Button
            onClick={() => submitAll(false)}
            disabled={isSubmitting || validation.validRows.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Үүсгэж байна...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Бүгдийг үүсгэх ({validation.validRows.length})
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
