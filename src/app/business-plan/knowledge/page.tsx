'use client';

/**
 * /dashboard/business-plan/knowledge
 * ────────────────────────────────────
 * Стратегийн баримт бичгийн мэдлэгийн сан.
 * Upload → auto-vectorize → AI chat-д RAG ашиглагдана.
 */

import React, { useState, useRef } from 'react';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeFirebase, useMemoFirebase, useFetchCollection, tenantCollection, useAuth } from '@/firebase';
import { getAuth } from 'firebase/auth';
import { addDoc, deleteDoc, doc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useTenant } from '@/contexts/tenant-context';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Upload, FileText, Trash2, RefreshCw, Loader2,
  BookOpen, CheckCircle2, AlertCircle, Brain, ChevronDown,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BP_DOC_TYPES,
  BP_DOC_TYPE_LABELS,
  BP_DOCS_COLLECTION,
  type BpStrategyDoc,
  type BpDocType,
} from '@/lib/bp-rag/bp-rag-types';

// ─── Auth token helper ────────────────────────────────────────────────────

async function getAuthToken(): Promise<string | null> {
  try {
    const { firebaseApp } = initializeFirebase();
    const auth = getAuth(firebaseApp);
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch { return null; }
}

// ─── Doc type badge color ─────────────────────────────────────────────────

const DOC_TYPE_COLORS: Record<BpDocType, string> = {
  strategy_report:    'bg-violet-100 text-violet-700',
  annual_plan:        'bg-blue-100 text-blue-700',
  board_presentation: 'bg-indigo-100 text-indigo-700',
  market_analysis:    'bg-emerald-100 text-emerald-700',
  financial_report:   'bg-amber-100 text-amber-700',
  meeting_minutes:    'bg-slate-100 text-slate-600',
  other:              'bg-gray-100 text-gray-600',
};

// ─── Component ────────────────────────────────────────────────────────────

export default function BpKnowledgePage() {
  const { firestore, firebaseApp } = useFirebase();
  const { companyId } = useTenant();
  const { employeeProfile } = useEmployeeProfile();
  const { toast } = useToast();

  const [uploading, setUploading] = useState(false);
  const [vectorizingId, setVectorizingId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<BpDocType>('strategy_report');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Firestore collection
  const docsRef = useMemoFirebase(({ firestore, companyPath }) =>
    firestore ? tenantCollection(firestore, companyPath, BP_DOCS_COLLECTION) : null, []);
  const { data: docs, isLoading } = useFetchCollection<BpStrategyDoc>(docsRef);

  // ── Upload handler ────────────────────────────────────────────────────
  const handleUpload = async (file: File) => {
    if (!firebaseApp || !firestore || !companyId) return;
    const allowedExts = ['pdf', 'doc', 'docx'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowedExts.includes(ext)) {
      toast({ title: 'Дэмжихгүй формат', description: 'PDF, DOC, DOCX файл байршуулна уу', variant: 'destructive' });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: 'Файл хэт том', description: '20MB-аас бага файл байршуулна уу', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      // 1. Firebase Storage upload
      const storage = getStorage(firebaseApp);
      const path = `companies/${companyId}/bp_strategy_docs/${Date.now()}_${file.name}`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, file);
      const fileUrl = await getDownloadURL(fileRef);

      // 2. Firestore metadata
      const docRef = await addDoc(tenantCollection(firestore, `companies/${companyId}`, BP_DOCS_COLLECTION), {
        companyId,
        title: file.name.replace(/\.[^/.]+$/, ''),
        docType: selectedType,
        uploadedBy: employeeProfile?.id || '',
        uploadedByName: employeeProfile?.firstName || '',
        fileUrl,
        fileSize: file.size,
        chunkCount: 0,
        vectorized: false,
        createdAt: new Date().toISOString(),
      });

      toast({ title: 'Байршуулагдлаа', description: 'Vectorize хийж байна...' });

      // 3. Auto-vectorize (background)
      const token = await getAuthToken();
      if (token) {
        fetch('/api/bp-rag/vectorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ docId: docRef.id }),
        }).catch(() => {});
      }
    } catch (err: any) {
      toast({ title: 'Алдаа', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  // ── Re-vectorize ──────────────────────────────────────────────────────
  const handleRevectorize = async (docId: string) => {
    setVectorizingId(docId);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Нэвтрэлт шаардлагатай');
      const res = await fetch('/api/bp-rag/vectorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ docId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Алдаа');
      toast({ title: 'Vectorize дууслаа', description: `${data.chunksCreated} chunk боловсруулагдлаа` });
    } catch (err: any) {
      toast({ title: 'Алдаа', description: err.message, variant: 'destructive' });
    } finally {
      setVectorizingId(null);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────
  const handleDelete = async (docId: string, title: string) => {
    if (!confirm(`"${title}" баримтыг устгах уу?`)) return;
    if (!firestore || !companyId) return;
    try {
      await deleteDoc(doc(firestore, `companies/${companyId}/${BP_DOCS_COLLECTION}/${docId}`));
      toast({ title: 'Устгагдлаа' });
    } catch (err: any) {
      toast({ title: 'Алдаа', description: err.message, variant: 'destructive' });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="p-6 md:p-8 space-y-6 pb-32">
      <PageHeader
        title="Мэдлэгийн сан"
        description="Стратегийн баримт бичгүүд — AI зөвлөхийн RAG эх сурвалж"
        showBackButton
        backBehavior="history"
        fallbackBackHref="/dashboard/business-plan"
        hideBreadcrumbs
      />

      {/* Info banner */}
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 flex items-start gap-3">
        <Brain className="h-5 w-5 text-violet-600 mt-0.5 shrink-0" />
        <div className="text-sm text-violet-800">
          <p className="font-medium mb-0.5">AI зөвлөх энэ баримтуудыг унших болно</p>
          <p className="text-violet-600 text-xs">
            Байршуулсан баримтаас AI нь стратегийн асуулт хариулах, өмнөх шийдвэр, бодлогыг лавлах, 
            жилүүдийн хооронд харьцуулалт хийх боломжтой болно.
          </p>
        </div>
      </div>

      {/* Upload area */}
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Select value={selectedType} onValueChange={v => setSelectedType(v as BpDocType)}>
                <SelectTrigger className="w-60">
                  <SelectValue placeholder="Баримтын төрөл" />
                </SelectTrigger>
                <SelectContent>
                  {BP_DOC_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{BP_DOC_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? 'Байршуулж байна...' : 'Баримт байршуулах'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = '';
              }}
            />
          </div>

          {/* Drag drop zone */}
          <div
            className={cn(
              'rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer',
              dragOver ? 'border-violet-400 bg-violet-50' : 'border-gray-200 hover:border-gray-300'
            )}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) handleUpload(f);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">PDF, DOC, DOCX — Энд чирж оруулах</p>
            <p className="text-xs text-gray-400 mt-1">Хамгийн их 20MB</p>
          </div>
        </div>
      </div>

      {/* Document list */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Байршуулагдсан баримтууд</h2>
          </div>
          <span className="text-xs text-muted-foreground">{docs.length} баримт</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : docs.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground">Баримт байхгүй байна</p>
            <p className="text-xs text-muted-foreground mt-1">Стратегийн баримтуудаа байршуулна уу</p>
          </div>
        ) : (
          <div className="divide-y">
            {docs.map(doc => (
              <div key={doc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                {/* Icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50">
                  <FileText className="h-5 w-5 text-violet-600" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <Badge className={cn('text-xs', DOC_TYPE_COLORS[doc.docType] || 'bg-gray-100 text-gray-600')}>
                      {BP_DOC_TYPE_LABELS[doc.docType] || doc.docType}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    {doc.fileSize && <span>{formatFileSize(doc.fileSize)}</span>}
                    {doc.createdAt && (
                      <span>{format(new Date(doc.createdAt), 'yyyy-MM-dd')}</span>
                    )}
                    {doc.vectorized ? (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" />
                        {doc.chunkCount} chunk
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-600">
                        <AlertCircle className="h-3 w-3" />
                        Vectorize хийгдээгүй
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevectorize(doc.id)}
                    disabled={vectorizingId === doc.id}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-violet-600"
                    title="Дахин vectorize хийх"
                  >
                    {vectorizingId === doc.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <RefreshCw className="h-3.5 w-3.5" />
                    }
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc.id, doc.title)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                    title="Устгах"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
