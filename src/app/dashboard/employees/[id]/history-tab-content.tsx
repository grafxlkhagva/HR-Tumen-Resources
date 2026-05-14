'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, ChevronRight, ClipboardCheck, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ERDocument, DOCUMENT_STATUSES, ERDocumentType } from '../../employment-relations/types';
import { AddHistoricalRecordDialog } from './AddHistoricalRecordDialog';
import { EditHistoricalRecordDialog } from './EditHistoricalRecordDialog';
import { useFetchCollection, useMemoFirebase, tenantCollection } from '@/firebase';

export const HistoryTabContent = ({
  employeeId,
  employeeName,
  erDocuments,
  isLoading,
}: {
  employeeId: string;
  employeeName?: string;
  erDocuments?: ERDocument[];
  isLoading: boolean;
}) => {
  const [showHistoricalDialog, setShowHistoricalDialog] = React.useState(false);
  const [showArchive, setShowArchive] = React.useState(false);
  const [editingDoc, setEditingDoc] = React.useState<ERDocument | null>(null);
  const [typeFilter, setTypeFilter] = React.useState<string>('ALL');

  // ER баримтын төрлүүдийг татаж шүүлтүүрт харуулна.
  const docTypesQuery = useMemoFirebase(
    ({ firestore, companyPath }) =>
      firestore ? tenantCollection(firestore, companyPath, 'er_process_document_types') : null,
    []
  );
  const { data: docTypes } = useFetchCollection<ERDocumentType>(docTypesQuery);

  const docTypeMap = React.useMemo(() => {
    const map = new Map<string, string>();
    (docTypes || []).forEach((t) => {
      if (t.id) map.set(t.id, t.name || t.id);
    });
    return map;
  }, [docTypes]);

  // Зөвхөн ERDocument-д ашиглагдсан type-уудыг шүүлтүүрт харуулна.
  const activeTypeOptions = React.useMemo(() => {
    const ids = new Set<string>();
    (erDocuments || []).forEach((d) => {
      if (d.documentTypeId) ids.add(d.documentTypeId);
    });
    return Array.from(ids)
      .map((id) => ({ id, name: docTypeMap.get(id) || 'Тодорхойгүй' }))
      .sort((a, b) => a.name.localeCompare(b.name, 'mn'));
  }, [erDocuments, docTypeMap]);

  const filterDocs = React.useCallback(
    (docs: ERDocument[]) =>
      typeFilter === 'ALL' ? docs : docs.filter((d) => d.documentTypeId === typeFilter),
    [typeFilter]
  );

  const { activeDocs, historicalDocs } = React.useMemo(() => {
    if (!erDocuments) return { activeDocs: [], historicalDocs: [] };
    const sorted = [...erDocuments].sort((a, b) => {
      const getTs = (d: ERDocument) => {
        const dateInput = d.customInputs?.['Огноо'];
        if (typeof dateInput === 'string' || typeof dateInput === 'number') {
          const t = new Date(dateInput).getTime();
          if (!isNaN(t)) return t / 1000;
        }
        if (d.createdAt && typeof d.createdAt === 'object' && 'seconds' in d.createdAt) {
          return (d.createdAt as { seconds: number }).seconds;
        }
        return 0;
      };
      return getTs(b) - getTs(a);
    });
    return {
      activeDocs: filterDocs(sorted.filter(d => d.status !== 'HISTORICAL')),
      historicalDocs: filterDocs(sorted.filter(d => d.status === 'HISTORICAL')),
    };
  }, [erDocuments, filterDocs]);

  const getDateFields = (customInputs: Record<string, unknown> | undefined) => {
    if (!customInputs) return [];
    return Object.entries(customInputs)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry[1]))
      .map(([key, value]) => ({
        label: key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^\w/, c => c.toUpperCase()),
        value,
      }));
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>
    );
  }

  const DocRow = ({ doc, idx }: { doc: ERDocument; idx: number }) => {
    const dateFields = getDateFields(doc.customInputs);
    const isHistorical = doc.status === 'HISTORICAL';
    const statusCfg = DOCUMENT_STATUSES[doc.status] || { label: doc.status, color: 'bg-muted text-muted-foreground' };

    const inner = (
      <>
        <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', isHistorical ? 'bg-muted' : 'bg-primary/10')}>
          <FileText className={cn('h-5 w-5', isHistorical ? 'text-muted-foreground' : 'text-primary')} />
        </div>
        <div className="flex-1 min-w-0">
          {doc.documentNumber && <div className={cn('text-base font-bold mb-0.5', isHistorical ? 'text-muted-foreground' : 'text-foreground')}>{doc.documentNumber}</div>}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="text-sm font-medium text-muted-foreground truncate">{(typeof doc.metadata?.templateName === 'string' ? doc.metadata.templateName : '') || 'Баримт'}</h4>
            <Badge className={cn('text-[10px] shrink-0', statusCfg.color)}>{statusCfg.label}</Badge>
          </div>
          {dateFields.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
              {dateFields.map(({ label, value }, i) => (
                <span key={i}><span className="text-muted-foreground/60">{label}:</span> <span className="font-medium">{value}</span></span>
              ))}
            </div>
          )}
          {isHistorical && doc.historicalNote && (
            <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">{doc.historicalNote}</p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
      </>
    );

    if (isHistorical) {
      return (
        <button
          key={`${doc.id}-${idx}`}
          type="button"
          onClick={() => setEditingDoc(doc)}
          className="w-full flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary/20 hover:shadow-sm transition-all group text-left"
        >
          {inner}
        </button>
      );
    }

    return (
      <Link
        key={`${doc.id}-${idx}`}
        href={`/dashboard/employment-relations/${doc.id}`}
        className="flex items-center gap-4 p-4 bg-card rounded-xl border hover:border-primary/20 hover:shadow-sm transition-all group"
      >
        {inner}
      </Link>
    );
  };

  const totalDocsCount = (erDocuments || []).length;

  return (
    <div className="space-y-4">
      {/* §2 section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Хөдөлмөрийн харилцаа</h3>
            <p className="text-xs text-muted-foreground">Баримт бичиг, гэрээ болон хөдөлмөрийн түүх</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-muted-foreground border-border"
            onClick={() => setShowHistoricalDialog(true)}
          >
            <ClipboardCheck className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            Түүх нөхөх
          </Button>
          <Button size="sm" className="h-8" asChild>
            <Link href={`/dashboard/employment-relations/create?employeeId=${employeeId}`}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Шинэ баримт
            </Link>
          </Button>
        </div>
      </div>

      {/* Төрлийн шүүлтүүр — зөвхөн ашиглагдсан төрлүүд + "Бүгд" */}
      {activeTypeOptions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTypeFilter('ALL')}
            className={cn(
              'h-7 px-3 rounded-full text-xs font-medium transition-colors border',
              typeFilter === 'ALL'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
            )}
          >
            Бүгд
            <span className="ml-1.5 text-[10px] opacity-70">{totalDocsCount}</span>
          </button>
          {activeTypeOptions.map((opt) => {
            const count = (erDocuments || []).filter((d) => d.documentTypeId === opt.id).length;
            const isActive = typeFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTypeFilter(opt.id)}
                className={cn(
                  'h-7 px-3 rounded-full text-xs font-medium transition-colors border',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                )}
              >
                {opt.name}
                <span className="ml-1.5 text-[10px] opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Active docs */}
      {activeDocs.length > 0 ? (
        <div className="space-y-2">
          {activeDocs.map((doc, idx) => <DocRow key={doc.id} doc={doc} idx={idx} />)}
        </div>
      ) : (
        <div className="flex flex-col items-center py-12 gap-3">
          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Хөдөлмөрийн харилцааны баримт байхгүй</p>
          <p className="text-xs text-muted-foreground">Шинэ баримт үүсгэх эсвэл түүхийн бичлэг нэмнэ үү</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href={`/dashboard/employment-relations/create?employeeId=${employeeId}`}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Шинэ баримт
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowHistoricalDialog(true)}>
              <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />
              Түүх нөхөх
            </Button>
          </div>
        </div>
      )}

      {/* Historical section — collapsible */}
      {historicalDocs.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowArchive(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-muted hover:bg-muted/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Архивын бичлэгүүд</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-card">{historicalDocs.length}</Badge>
            </div>
            <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', showArchive && 'rotate-90')} />
          </button>
          {showArchive && (
            <div className="p-3 space-y-2 bg-card">
              {historicalDocs.map((doc, idx) => <DocRow key={doc.id} doc={doc} idx={idx} />)}
            </div>
          )}
        </div>
      )}

      <AddHistoricalRecordDialog
        open={showHistoricalDialog}
        onOpenChange={setShowHistoricalDialog}
        employeeId={employeeId}
        employeeName={employeeName}
      />

      {editingDoc && (
        <EditHistoricalRecordDialog
          open={!!editingDoc}
          onOpenChange={v => { if (!v) setEditingDoc(null); }}
          doc={editingDoc}
          employeeId={employeeId}
        />
      )}
    </div>
  );
};
