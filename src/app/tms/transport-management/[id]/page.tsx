'use client';

import * as React from 'react';
import { PageHeader } from '@/components/patterns/page-layout';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Loader2, Save, Trash, Banknote, FileX, User2, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
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
import { useTransportDetail } from './use-transport-detail';
import { TransportRouteCard } from './transport-route-card';
import { TransportVehicleCard } from './transport-vehicle-card';
import { TransportFinanceCard } from './transport-finance-card';
import { TransportCargoCard } from './transport-cargo-card';
import { DispatchStepsSection } from './dispatch-steps-section';

export default function TransportManagementDetailPage() {
  const ctx = useTransportDetail();

  if (ctx.isLoading) {
    return (
      <div className="flex flex-col h-full w-full overflow-auto">
        <div className="border-b bg-background px-4 py-4 sm:px-6">
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="flex-1 p-4 sm:p-6 space-y-4 max-w-6xl mx-auto w-full">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!ctx.item) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
          <FileX className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-lg font-semibold">Тээврийн удирдлага олдсонгүй</h2>
          <p className="text-sm text-muted-foreground">Энэ ID-д тохирох бүртгэл устсан эсвэл буруу холбоос байж болно.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => ctx.router.push('/tms/transport-management')}>
          Жагсаалт руу буцах
        </Button>
      </div>
    );
  }

  if (!ctx.transport) {
    return (
      <div className="flex flex-col h-full w-full overflow-auto">
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const t = ctx.transport;
  const statusInfo = ctx.STATUS_MAP[t.status] || { label: t.status, variant: 'secondary' as const };
  const dateStr = t.createdAt?.toDate ? format(t.createdAt.toDate(), 'yyyy.MM.dd HH:mm') : '—';

  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm px-4 py-3 sm:px-6">
        <PageHeader
          title={t.code || t.id.slice(0, 8)}
          description={dateStr}
          breadcrumbs={[
            { label: 'Тээврийн удирдлага', href: '/tms/transport-management' },
            { label: t.code || 'Дэлгэрэнгүй' },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => ctx.router.push(`/tms/transport-management/${ctx.id}/finance`)}
                className="gap-1.5 text-muted-foreground"
              >
                <Banknote className="h-4 w-4" />
                <span className="hidden sm:inline">Санхүү</span>
              </Button>
              <div className="w-px h-5 bg-border" />
              <Button
                size="sm"
                onClick={ctx.handleSave}
                disabled={ctx.isSaving}
                variant={ctx.isDirty ? 'default' : 'outline'}
                className="gap-1.5 relative"
              >
                {ctx.isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {ctx.isDirty ? 'Хадгалах' : 'Хадгалсан'}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => ctx.setDeleteDialogOpen(true)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash className="h-3.5 w-3.5" />
              </Button>
            </div>
          }
        />
      </div>

      <div className="flex-1 p-4 sm:p-6 space-y-5 max-w-6xl mx-auto w-full">
        {/* Summary strip */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-1">
          <Select value={t.status} onValueChange={(val) => ctx.handleChange('status', val)}>
            <SelectTrigger className="h-7 w-auto border-none shadow-none p-0 gap-1.5 focus:ring-0">
              <Badge variant={statusInfo.variant as any} className="text-xs">{statusInfo.label}</Badge>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ctx.STATUS_MAP).map(([key, info]) => (
                <SelectItem key={key} value={key}>
                  <Badge variant={info.variant as any} className="pointer-events-none text-xs">{info.label}</Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {t.isContracted ? (
              <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200 text-xs font-normal">Гэрээт</Badge>
            ) : (
              <Badge variant="outline" className="text-xs font-normal">Нэг удаагийн</Badge>
            )}
          </div>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-1.5 text-sm">
            <User2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground truncate max-w-[200px]" title={ctx.customer?.name}>
              {ctx.customer?.name || '—'}
            </span>
          </div>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-1.5 text-sm">
            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground truncate max-w-[200px]" title={ctx.service?.name}>
              {ctx.service?.name || '—'}
            </span>
          </div>
        </div>

        {/* Route */}
        <TransportRouteCard
          transport={t}
          regions={ctx.regions}
          warehouses={ctx.warehouses}
          vehiclesList={ctx.vehiclesList}
          activeVehicleId={ctx.activeSubTransport?.vehicleId}
          getRegionName={ctx.getRegionName}
          getWarehouseName={ctx.getWarehouseName}
          onRouteChange={(changes) => {
            for (const [key, value] of Object.entries(changes)) {
              ctx.handleChange(key as keyof typeof t, value);
            }
          }}
        />

        {/* 3-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <TransportVehicleCard
            transport={t}
            item={ctx.item}
            normalizedSubTransports={ctx.normalizedSubTransports}
            activeSubTransport={ctx.activeSubTransport}
            activeSubTransportId={ctx.activeSubTransportId}
            setActiveSubTransportId={ctx.setActiveSubTransportId}
            vehicleTypes={ctx.vehicleTypes}
            trailerTypes={ctx.trailerTypes}
            vehiclesList={ctx.vehiclesList}
            driversList={ctx.driversList}
            vehicleSearchOptions={ctx.vehicleSearchOptions}
            driverSearchOptions={ctx.driverSearchOptions}
            linkedContractService={ctx.linkedContractService}
            onSubTransportChange={ctx.handleSubTransportChange}
            onTransportChange={ctx.handleChange}
            getVehicleTypeName={ctx.getVehicleTypeName}
            getTrailerTypeName={ctx.getTrailerTypeName}
          />
          <TransportFinanceCard
            transport={t}
            onFinanceChange={(changes) => {
              for (const [key, value] of Object.entries(changes)) {
                ctx.handleChange(key as keyof typeof t, value);
              }
            }}
          />
          <TransportCargoCard
            cargos={t.cargos || []}
            packagingTypes={ctx.packagingTypes}
            onAddCargo={ctx.handleAddCargo}
            onRemoveCargo={ctx.handleRemoveCargo}
            cargoToDelete={ctx.cargoToDelete}
            setCargoToDelete={ctx.setCargoToDelete}
          />
        </div>

        {/* Dispatch steps */}
        <DispatchStepsSection
          steps={ctx.activeDispatchSteps}
          expandedSteps={ctx.expandedSteps}
          toggleExpandedStep={ctx.toggleExpandedStep}
          confirmStepId={ctx.confirmStepId}
          setConfirmStepId={ctx.setConfirmStepId}
          uploadingTaskId={ctx.uploadingTaskId}
          onTaskResultChange={ctx.handleTaskResultChange}
          onToggleStepClick={ctx.handleToggleStepClick}
          onExecuteStepToggle={ctx.executeStepToggle}
          onImageUpload={ctx.handleDispatchTaskImageUpload}
        />
      </div>

      {/* Delete dialog */}
      <AlertDialog open={ctx.deleteDialogOpen} onOpenChange={ctx.setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Устгахдаа итгэлтэй байна уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ үйлдэл буцаагдах боломжгүй. Бүх холбоотой мэдээлэл устана.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ctx.isDeleting}>Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); ctx.handleDelete(); }}
              disabled={ctx.isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {ctx.isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Устгах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
