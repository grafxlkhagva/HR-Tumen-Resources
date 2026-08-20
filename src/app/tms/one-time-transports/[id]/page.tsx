'use client';

import * as React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/patterns/page-layout';
import {
  AppDialog,
  AppDialogBody,
  AppDialogContent,
  AppDialogDescription,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogTitle,
} from '@/components/patterns';
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
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { OT_PAYMENT_STATUS_MAP, OT_STATUS_MAP, OT_TYPE_META } from '../constants';
import { useOneTimeDetail } from './use-one-time-detail';
import { StatusActions } from './status-actions';
import { StatusTimeline } from './status-timeline';
import { RouteMap } from './route-map';
import { MissingFieldsHint } from './missing-fields-hint';
import { CargoStrip, OpsInfoStrip, PricingPanel, TypeSpecificBlock } from './detail-sections';
import { CheckpointsSection } from './checkpoints-section';
import { CarrierPaymentsSection } from './carrier-payments-section';
import { ExtraChargesSection } from './extra-charges-section';
import { EditOneTimeDialog } from './edit-one-time-dialog';

export default function OneTimeTransportDetailPage() {
  const ctx = useOneTimeDetail();

  if (ctx.isLoading || !ctx.transport) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const t = ctx.transport;
  const statusMeta = OT_STATUS_MAP[t.status];
  const typeMeta = OT_TYPE_META[t.type];
  const paymentMeta = t.paymentStatus ? OT_PAYMENT_STATUS_MAP[t.paymentStatus] : null;
  const createdStr = t.createdAt?.toDate ? format(t.createdAt.toDate(), 'yyyy.MM.dd HH:mm') : null;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm px-4 py-3 sm:px-6">
        <PageHeader
          title={t.code || 'Тээвэр'}
          description={createdStr ? `Үүсгэсэн: ${createdStr}` : undefined}
          breadcrumbs={[
            { label: 'Dashboard', href: '/tms' },
            { label: '1 удаагийн тээвэр', href: '/tms/one-time-transports' },
            { label: t.code || 'Дэлгэрэнгүй' },
          ]}
          showBackButton
          backButtonPlacement="inline"
          backHref="/tms/one-time-transports"
          actions={
            <StatusActions
              transport={t}
              startValidation={ctx.startValidation}
              completeValidation={ctx.completeValidation}
              onStatusChange={ctx.updateStatus}
              onOpenEditWithMissing={ctx.openEditWithMissing}
              onRequestCancel={() => ctx.setCancelOpen(true)}
              onRequestDelete={ctx.requestDelete}
            />
          }
        />
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 space-y-5">
          {/* Status strip */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
            <Badge variant="outline">
              {typeMeta.icon} {typeMeta.title}
            </Badge>
            <span className="font-mono text-xs text-muted-foreground">
              #{t.code || t.id.slice(0, 8)}
            </span>
            {paymentMeta ? <Badge variant={paymentMeta.variant}>{paymentMeta.label}</Badge> : null}
            {t.quoteId ? (
              <Link
                href={'/tms/quotes/' + t.quoteId}
                className="inline-flex items-center rounded-full border border-violet-300 bg-violet-50 px-2.5 py-0.5 text-xs text-violet-700 hover:bg-violet-100 dark:bg-violet-950/30 dark:border-violet-800 dark:text-violet-300"
              >
                💼 {t.quoteCode || 'Үнийн санал'} →
              </Link>
            ) : null}
          </div>

          <MissingFieldsHint
            transport={t}
            startValidation={ctx.startValidation}
            onOpenEdit={ctx.openEditWithMissing}
          />

          <StatusTimeline transport={t} />

          <RouteMap transport={t} />

          <CheckpointsSection transport={t} />

          <OpsInfoStrip transport={t} />
          <CargoStrip transport={t} />
          <TypeSpecificBlock transport={t} />
          <PricingPanel transport={t} />
          <CarrierPaymentsSection transport={t} />
          <ExtraChargesSection transport={t} />

          {t.notes ? (
            <Card className="p-4">
              <p className="text-xs uppercase text-muted-foreground mb-2">📝 Тэмдэглэл</p>
              <p className="text-sm whitespace-pre-wrap">{t.notes}</p>
            </Card>
          ) : null}
        </div>
      </div>

      {/* Edit dialog */}
      <EditOneTimeDialog
        open={ctx.editOpen}
        onOpenChange={ctx.setEditOpen}
        transport={t}
        highlightMissing={ctx.editHighlight}
      />

      {/* Cancel dialog */}
      <AppDialog open={ctx.cancelOpen} onOpenChange={ctx.setCancelOpen}>
        <AppDialogContent size="sm">
          <AppDialogHeader>
            <AppDialogTitle>Тээвэр цуцлах</AppDialogTitle>
            <AppDialogDescription>
              Цуцлах шалтгаанаа заавал бичнэ — жагсаалт болон тайланд харагдана.
            </AppDialogDescription>
          </AppDialogHeader>
          <AppDialogBody className="space-y-2">
            <label htmlFor="ot-cancel-reason" className="text-sm font-medium">
              Цуцлах шалтгаан *
            </label>
            <Textarea
              id="ot-cancel-reason"
              value={ctx.cancelReason}
              onChange={(e) => ctx.setCancelReason(e.target.value)}
              placeholder="жишээ: Захиалагч цуцалсан"
              rows={3}
            />
          </AppDialogBody>
          <AppDialogFooter>
            <Button variant="outline" size="sm" onClick={() => ctx.setCancelOpen(false)}>
              Болих
            </Button>
            <Button variant="destructive" size="sm" onClick={ctx.confirmCancel}>
              Цуцлах
            </Button>
          </AppDialogFooter>
        </AppDialogContent>
      </AppDialog>

      {/* Delete dialog */}
      <AlertDialog open={ctx.deleteOpen} onOpenChange={ctx.setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Тээвэр устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>Энэ үйлдлийг буцаах боломжгүй.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Болих</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                ctx.confirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Устгах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
