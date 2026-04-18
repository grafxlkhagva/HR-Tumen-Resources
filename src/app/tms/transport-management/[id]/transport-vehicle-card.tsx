'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Pencil, Truck, UserCircle, Container, Phone, ExternalLink, Plus } from 'lucide-react';
import Link from 'next/link';
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogBody } from '@/components/patterns';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/lib/utils';
import { getVehicleTracking } from '@/app/tms/actions/gps';
import type { TmsTransportManagement, TmsTransportSubUnit, TmsContractService } from '@/app/tms/types';
import type { RefItem, VehicleListItem, DriverListItem } from './use-transport-detail';

interface VehicleFormData {
  vehicleId: string | null;
  driverId: string | null;
  vehicleTypeId: string;
  trailerTypeId: string;
}

interface TransportVehicleCardProps {
  transport: TmsTransportManagement;
  item: (TmsTransportManagement & { id: string }) | null;
  normalizedSubTransports: TmsTransportSubUnit[];
  activeSubTransport: TmsTransportSubUnit | null;
  activeSubTransportId: string;
  setActiveSubTransportId: (id: string) => void;
  vehicleTypes: RefItem[];
  trailerTypes: RefItem[];
  vehiclesList: VehicleListItem[];
  driversList: DriverListItem[];
  vehicleSearchOptions: { value: string; label: string }[];
  driverSearchOptions: { value: string; label: string }[];
  /** Эцэг баримтын primary гэрээний үйлчилгээ (хуучин single-service нийцтэй). */
  linkedContractService: TmsContractService | null;
  /** Идэвхтэй sub-тээврийн харьяа гэрээний үйлчилгээ (олон үйлчилгээтэй үед шаардлагатай). */
  activeContractService?: TmsContractService | null;
  onSubTransportChange: (field: 'vehicleId' | 'driverId', value: string | null) => void;
  onTransportChange: (field: keyof TmsTransportManagement, value: unknown) => void;
  getVehicleTypeName: (vid?: string) => string;
  getTrailerTypeName: (trid?: string) => string;
}

export function TransportVehicleCard({
  transport,
  item,
  normalizedSubTransports,
  activeSubTransport,
  activeSubTransportId,
  setActiveSubTransportId,
  vehicleTypes,
  trailerTypes,
  vehiclesList,
  driversList,
  vehicleSearchOptions,
  driverSearchOptions,
  linkedContractService,
  activeContractService,
  onSubTransportChange,
  onTransportChange,
  getVehicleTypeName,
  getTrailerTypeName,
}: TransportVehicleCardProps) {
  const [open, setOpen] = React.useState(false);
  const [local, setLocal] = React.useState<VehicleFormData | null>(null);

  React.useEffect(() => {
    if (open) {
      setLocal({
        vehicleId: activeSubTransport?.vehicleId ?? null,
        driverId: activeSubTransport?.driverId ?? null,
        vehicleTypeId: transport.vehicleTypeId || '',
        trailerTypeId: transport.trailerTypeId || '',
      });
    }
  }, [open, activeSubTransport, transport.vehicleTypeId, transport.trailerTypeId]);

  const handleSave = () => {
    if (!local) return;
    onSubTransportChange('vehicleId', local.vehicleId);
    onSubTransportChange('driverId', local.driverId);
    onTransportChange('vehicleTypeId', local.vehicleTypeId);
    onTransportChange('trailerTypeId', local.trailerTypeId);
    setOpen(false);
  };

  /** Идэвхтэй дэд тээврийн бодит машины объект (label + navigation-д хэрэглэнэ). */
  const activeVehicle = React.useMemo(
    () =>
      activeSubTransport?.vehicleId
        ? vehiclesList.find((v) => v.id === activeSubTransport.vehicleId) ?? null
        : null,
    [activeSubTransport?.vehicleId, vehiclesList],
  );

  /** Идэвхтэй жолоочийн объект (avatar, утас, дэлгэрэнгүй холбоос). */
  const activeDriver = React.useMemo(
    () =>
      activeSubTransport?.driverId
        ? driversList.find((d) => d.id === activeSubTransport.driverId) ?? null
        : null,
    [activeSubTransport?.driverId, driversList],
  );

  const driverFullName = activeDriver
    ? `${activeDriver.lastName || ''} ${activeDriver.firstName || ''}`.trim() || 'Нэргүй'
    : null;

  /** Avatar fallback-д ашиглах initials (овог+нэрний эхний үсэг). */
  const driverInitials = React.useMemo(() => {
    if (!activeDriver) return '';
    const first = activeDriver.firstName?.[0] ?? '';
    const last = activeDriver.lastName?.[0] ?? '';
    return (last + first).toUpperCase() || '?';
  }, [activeDriver]);

  /**
   * ── #3 GPS онлайн статус ─────────────────────────────────────────
   * `gpsDeviceId` байгаа машинд `getVehicleTracking` action-ийг 20 сек
   * тутамд дуудна. Хариулт success биш эсвэл fetch унтсан бол `null`.
   * Идэвхтэй машин өөрчлөгдөх бүрт re-subscribe хийнэ.
   */
  type GpsSnapshot = { lat?: number; lng?: number; speed?: number; positionTime?: string; status?: string };
  const [gpsData, setGpsData] = React.useState<GpsSnapshot | null>(null);
  const gpsDeviceId = activeVehicle?.gpsDeviceId;

  React.useEffect(() => {
    if (!gpsDeviceId) {
      setGpsData(null);
      return;
    }
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const res = await getVehicleTracking(gpsDeviceId);
        if (cancelled) return;
        if (res.success && res.data) setGpsData(res.data as GpsSnapshot);
      } catch {
        /* network error — хэвийн */
      }
    };
    fetchOnce();
    const iv = setInterval(fetchOnce, 20_000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [gpsDeviceId]);

  /**
   * GPS statusHex:
   *   🟢 idevkhtei     — `positionTime` < 5 мин өмнө
   *   🟠 timeout biz   — 5-30 мин
   *   🔴 offline       — > 30 мин
   */
  const gpsStatus = React.useMemo(() => {
    if (!gpsDeviceId) return null;
    if (!gpsData?.positionTime) return { tone: 'offline' as const, label: 'Мэдээлэл алга' };
    const t = new Date(gpsData.positionTime.replace(' ', 'T')).getTime();
    if (isNaN(t)) return { tone: 'offline' as const, label: 'Мэдээлэл алга' };
    const diffMin = (Date.now() - t) / 60_000;
    if (diffMin < 5)
      return {
        tone: 'live' as const,
        label: `Онлайн · ${diffMin < 1 ? 'just now' : `${Math.round(diffMin)} мин`}`,
      };
    if (diffMin < 30)
      return { tone: 'idle' as const, label: `${Math.round(diffMin)} мин өмнө` };
    if (diffMin < 120)
      return { tone: 'offline' as const, label: `${Math.round(diffMin)} мин өмнө` };
    return { tone: 'offline' as const, label: `${Math.round(diffMin / 60)} ц өмнө` };
  }, [gpsDeviceId, gpsData]);

  const gpsSpeed =
    gpsData && typeof gpsData.speed === 'number' && isFinite(gpsData.speed) ? Math.round(gpsData.speed) : null;

  /**
   * Нэг TM дотор хэдэн ялгаатай гэрээний үйлчилгээ байгаа, тус бүрийн
   * дэд тээврүүд хэд байгааг жинхэнэ тооцно. 2-түвшний tab layout (үйлчилгээ
   * → машин) бүтээхэд ашиглана.
   */
  const serviceGroups = React.useMemo(() => {
    const groups: Array<{
      id: string;
      name: string;
      subs: TmsTransportSubUnit[];
    }> = [];
    const map = new Map<string, (typeof groups)[number]>();
    for (const s of normalizedSubTransports) {
      const svcId = s.contractServiceId ?? '__none__';
      const svcName = s.contractServiceName?.trim() || 'Үндсэн үйлчилгээ';
      let g = map.get(svcId);
      if (!g) {
        g = { id: svcId, name: svcName, subs: [] };
        map.set(svcId, g);
        groups.push(g);
      }
      g.subs.push(s);
    }
    return groups;
  }, [normalizedSubTransports]);

  const distinctServiceCount = serviceGroups.length;

  /** Идэвхтэй sub-тэй харьяалагдах үйлчилгээний id (outer tab-ийн утга). */
  const activeServiceId =
    activeSubTransport?.contractServiceId ??
    (activeSubTransport ? '__none__' : serviceGroups[0]?.id ?? '');

  /**
   * Үйлчилгээний outer tab солигдсон үед тухайн үйлчилгээний эхний дэд
   * тээврийг автоматаар идэвхжүүлнэ.
   */
  const handleServiceTabChange = React.useCallback(
    (svcId: string) => {
      const g = serviceGroups.find((x) => x.id === svcId);
      if (g?.subs[0]) setActiveSubTransportId(g.subs[0].id);
    },
    [serviceGroups, setActiveSubTransportId],
  );

  /** Активь үйлчилгээний дэд тээврүүд (inner vehicle pills-д ашиглана). */
  const activeServiceSubs = React.useMemo(() => {
    return serviceGroups.find((g) => g.id === activeServiceId)?.subs ?? [];
  }, [serviceGroups, activeServiceId]);

  /** Идэвхтэй sub-ын үйлчилгээг хамт харуулах нь олон үйлчилгээтэй үед илүү тодорхой. */
  const effectiveContractService = activeContractService ?? linkedContractService;

  const contractServiceForLink = activeSubTransport?.contractServiceId ?? item?.contractServiceId;

  /**
   * Засварын диалогийн доторх машины оноосон жолоочдын id-нуудын багц.
   * `local.vehicleId` сонгогдсон бол зөвхөн тухайн машинд холбогдсон жолооч нарыг
   * driver dropdown-д үзүүлнэ. `null` бол шүүлт хийхгүй (бүх жолоочийг харуулна).
   */
  const vehicleLinkedDriverIds = React.useMemo<Set<string> | null>(() => {
    if (!local?.vehicleId) return null;
    const v = vehiclesList.find((x) => x.id === local.vehicleId);
    if (!v) return null;
    const ids = new Set<string>();
    for (const id of v.driverIds ?? []) if (id) ids.add(id);
    if (v.driverId) ids.add(v.driverId);
    return ids.size > 0 ? ids : new Set<string>();
  }, [local?.vehicleId, vehiclesList]);

  /**
   * Driver dropdown-д үзүүлэх сонголтууд:
   * — Машин сонгоогүй бол бүх жолооч.
   * — Машинд жолооч оноосон бол зөвхөн тэдгээрийг. Одоогийн `local.driverId`-г
   *   холбогдолгүй байсан ч сонголт дотор үлдээнэ (state-г алдалгүй байхын тулд).
   * — Машинд жолооч оноогдоогүй бол fallback-оор бүх жолоочийг харуулна.
   */
  const filteredDriverOptions = React.useMemo(() => {
    if (!vehicleLinkedDriverIds) return driverSearchOptions;
    if (vehicleLinkedDriverIds.size === 0) return driverSearchOptions;
    const allowed = new Set(vehicleLinkedDriverIds);
    if (local?.driverId) allowed.add(local.driverId);
    return driverSearchOptions.filter(
      (opt) => opt.value === 'none' || allowed.has(opt.value),
    );
  }, [driverSearchOptions, vehicleLinkedDriverIds, local?.driverId]);

  const driverFilterHint = React.useMemo(() => {
    if (!vehicleLinkedDriverIds) return null;
    if (vehicleLinkedDriverIds.size === 0) {
      return 'Энэ машинд жолооч бүртгэгдээгүй тул бүх жолоочоос сонгож болно.';
    }
    return `Энэ машинд оноосон ${vehicleLinkedDriverIds.size} жолоочоос сонгоно уу.`;
  }, [vehicleLinkedDriverIds]);

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold">Тээврийн хэрэгсэл</CardTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpen(true)}
            aria-label="Тээврийн хэрэгсэл засах"
            className="text-muted-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {/*
           * 2-түвшинт сонголт:
           *  (1) Outer tabs — гэрээний үйлчилгээнүүд (distinctServiceCount > 1 үед).
           *  (2) Inner pills — тухайн үйлчилгээний доторх машинууд (> 1 үед).
           *  Хоёулаа 1 үед тавьж өгөх юм алга (энэ card зөвхөн идэвхтэй sub-ийн
           *  машин/жолоочийг харуулна).
           */}
          {distinctServiceCount > 1 && (
            <Tabs value={activeServiceId} onValueChange={handleServiceTabChange}>
              <TabsList className="h-auto w-full justify-start flex-wrap">
                {serviceGroups.map((g) => (
                  <TabsTrigger
                    key={g.id}
                    value={g.id}
                    className="text-xs gap-1.5 max-w-[200px]"
                    title={g.name}
                  >
                    <span className="truncate">{g.name}</span>
                    <span className="inline-flex items-center justify-center h-4 min-w-[1.25rem] rounded-full bg-background/50 px-1 text-[10px] font-medium">
                      {g.subs.length}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
          {activeServiceSubs.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {activeServiceSubs.map((s) => {
                const v = s.vehicleId ? vehiclesList.find((x) => x.id === s.vehicleId) : null;
                const plate = v?.licensePlate?.trim();
                const code = `${transport.code || 'TR'}-${s.subCode}`;
                const label = plate || code;
                const isActive = s.id === activeSubTransportId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSubTransportId(s.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card hover:bg-muted/60',
                    )}
                    title={plate ? `${plate} · ${code}` : code}
                  >
                    <Truck className="h-3 w-3 shrink-0" />
                    <span className="truncate max-w-[140px]">{label}</span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* ── #1 Машины мөр — plate + make/model + detail холбоос ──── */}
            {activeVehicle ? (
              <Link
                href={`/tms/vehicles/${activeVehicle.id}`}
                className="group flex items-start gap-3 rounded-lg border bg-card p-2.5 transition-colors hover:bg-muted/40"
                title="Машины дэлгэрэнгүй"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Truck className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-[11px] text-muted-foreground">Машин</div>
                    {gpsStatus && (
                      <div
                        className={cn(
                          'flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                          gpsStatus.tone === 'live' &&
                            'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                          gpsStatus.tone === 'idle' &&
                            'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                          gpsStatus.tone === 'offline' &&
                            'bg-rose-500/10 text-rose-600 dark:text-rose-400',
                        )}
                        title={
                          gpsData?.positionTime
                            ? `Сүүлчийн GPS: ${gpsData.positionTime}${
                                gpsData.status ? ` · ${gpsData.status}` : ''
                              }`
                            : 'GPS мэдээлэл олдсонгүй'
                        }
                      >
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            gpsStatus.tone === 'live' && 'bg-emerald-500 animate-pulse',
                            gpsStatus.tone === 'idle' && 'bg-amber-500',
                            gpsStatus.tone === 'offline' && 'bg-rose-500',
                          )}
                        />
                        {gpsStatus.label}
                        {gpsStatus.tone === 'live' && typeof gpsSpeed === 'number' ? ` · ${gpsSpeed} км/ц` : ''}
                      </div>
                    )}
                  </div>
                  <div className="font-semibold text-sm truncate">
                    {activeVehicle.licensePlate || '—'}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[activeVehicle.makeName, activeVehicle.modelName].filter(Boolean).join(' · ') ||
                      getVehicleTypeName(transport.vehicleTypeId) ||
                      '—'}
                  </div>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 shrink-0 mt-1" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className={cn(
                  'flex items-center gap-3 rounded-lg border border-dashed p-3 text-left transition-colors hover:bg-muted/40',
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Truck className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">Машин оноогоогүй</div>
                  <div className="text-xs text-muted-foreground">
                    {getVehicleTypeName(transport.vehicleTypeId) || 'Шууд энд дарж сонгоно уу'}
                  </div>
                </div>
                <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            )}

            {/* ── #2 Жолоочийн мөр — avatar + нэр + click-to-call + navigation ── */}
            {activeDriver ? (
              <div className="flex items-start gap-3 rounded-lg border bg-card p-2.5">
                <Avatar className="h-10 w-10 shrink-0 rounded-md">
                  <AvatarImage src={activeDriver.photoURL ?? undefined} alt={driverFullName ?? ''} />
                  <AvatarFallback className="rounded-md text-xs">{driverInitials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-muted-foreground">Жолооч</div>
                  <Link
                    href={`/tms/drivers/${activeDriver.id}`}
                    className="font-semibold text-sm truncate hover:underline block"
                    title="Жолоочийн дэлгэрэнгүй"
                  >
                    {driverFullName}
                  </Link>
                  {activeDriver.phone ? (
                    <a
                      href={`tel:${activeDriver.phone.replace(/\s+/g, '')}`}
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                      title="Залгах"
                    >
                      <Phone className="h-3 w-3" />
                      {activeDriver.phone}
                    </a>
                  ) : (
                    <div className="text-xs text-muted-foreground">Утас бүртгэгдээгүй</div>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex items-center gap-3 rounded-lg border border-dashed p-3 text-left transition-colors hover:bg-muted/40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <UserCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">Жолооч оноогоогүй</div>
                  <div className="text-xs text-muted-foreground">Шууд энд дарж сонгоно уу</div>
                </div>
                <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            )}

          </div>
          {/* Тэвш — grid-ийн гаднах footer мэт жижгэвтэр metadata row */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 pt-1">
            <Container className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              Тэвш: <span className="text-foreground">{getTrailerTypeName(transport.trailerTypeId)}</span>
            </span>
          </div>
        </CardContent>
      </Card>

      <AppDialog open={open} onOpenChange={setOpen}>
        <AppDialogContent>
          <AppDialogHeader><AppDialogTitle>Тээврийн хэрэгсэл засах</AppDialogTitle></AppDialogHeader>
          {local && (
            <AppDialogBody className="space-y-4 pt-4">
              {activeSubTransport && (
                <div className="text-xs text-muted-foreground">
                  Засварлаж буй таб: <span className="font-medium text-foreground">{`${transport.code || 'TR'}-${activeSubTransport.subCode}`}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label>Тодорхой машин оноох</Label>
                <SearchableSelect
                  options={vehicleSearchOptions}
                  value={local.vehicleId || 'none'}
                  onValueChange={(val) => {
                    const vid = val === 'none' ? null : val;
                    setLocal((p) => {
                      if (!p) return p;
                      if (!vid) return { ...p, vehicleId: null };
                      // Машин сонгоход тухайн машины жолооч нарын багцыг тодорхойлно.
                      // Ганцхан жолоочтой бол convenience-аар автомат сонгоно.
                      // Олон жолоочтой бол хэрэглэгчид dropdown-оос сонгуулна
                      // (үндсэн ажиглалт — өмнөх сонгосон жолооч нь уг машинд холбогдохгүй
                      // байвал цэвэрлэж, сонгуулахаар болгоно).
                      const vehicle = vehiclesList.find((v) => v.id === vid);
                      const linkedIds = new Set<string>();
                      for (const id of vehicle?.driverIds ?? []) if (id) linkedIds.add(id);
                      if (vehicle?.driverId) linkedIds.add(vehicle.driverId);
                      let nextDriverId: string | null = p.driverId;
                      if (linkedIds.size === 1) {
                        // Ганц жолооч — автомат оноо
                        nextDriverId = Array.from(linkedIds)[0] ?? null;
                      } else if (linkedIds.size > 1) {
                        // Одоогийн жолооч холбогдохгүй бол цэвэрлэнэ
                        if (!p.driverId || !linkedIds.has(p.driverId)) nextDriverId = null;
                      }
                      return { ...p, vehicleId: vid, driverId: nextDriverId };
                    });
                  }}
                  placeholder="Сонгох..."
                  searchPlaceholder="Улсын дугаар, үйлдвэрлэгч, загвар хайх..."
                  emptyText="Тээврийн хэрэгсэл олдсонгүй."
                />
                {effectiveContractService?.allowedVehicleIds && effectiveContractService.allowedVehicleIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {effectiveContractService.name ? (
                      <span className="font-medium text-foreground">{effectiveContractService.name}</span>
                    ) : (
                      'Энэ үйлчилгээ'
                    )}
                    -нд явах боломжтой гэж бүртгэсэн {effectiveContractService.allowedVehicleIds.length} машин л сонгогдоно.
                    Жагсаалтыг{' '}
                    {item?.contractId && contractServiceForLink ? (
                      <Link className="text-primary underline underline-offset-2" href={`/tms/contracts/${item.contractId}/services/${contractServiceForLink}`}>
                        гэрээний үйлчилгээний дэлгэц
                      </Link>
                    ) : (
                      'гэрээний үйлчилгээний дэлгэц'
                    )}
                    -ээс өөрчилнө үү.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Жолооч оноох</Label>
                <SearchableSelect
                  options={filteredDriverOptions}
                  value={local.driverId || 'none'}
                  onValueChange={(val) => {
                    const did = val === 'none' ? null : val;
                    setLocal((p) => {
                      if (!p) return p;
                      // Жолооч сонгоход холбоотой машиныг автомат сонгох
                      if (did && !p.vehicleId) {
                        const linkedVehicle = vehiclesList.find((v) =>
                          v.driverIds?.includes(did) || v.driverId === did
                        );
                        if (linkedVehicle) {
                          return { ...p, driverId: did, vehicleId: linkedVehicle.id };
                        }
                      }
                      return { ...p, driverId: did };
                    });
                  }}
                  placeholder="Сонгох..."
                  searchPlaceholder="Нэр, утасны дугаар хайх..."
                  emptyText="Жолооч олдсонгүй."
                />
                {driverFilterHint && (
                  <p className="text-xs text-muted-foreground">{driverFilterHint}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Машины төрөл</Label>
                <Select value={local.vehicleTypeId} onValueChange={(val) => setLocal((p) => p && { ...p, vehicleTypeId: val })}>
                  <SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger>
                  <SelectContent>
                    {vehicleTypes.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Тэвш</Label>
                <Select value={local.trailerTypeId} onValueChange={(val) => setLocal((p) => p && { ...p, trailerTypeId: val })}>
                  <SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger>
                  <SelectContent>
                    {trailerTypes.map((tr) => <SelectItem key={tr.id} value={tr.id}>{tr.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>Цуцлах</Button>
                <Button onClick={handleSave}>Хадгалах</Button>
              </div>
            </AppDialogBody>
          )}
        </AppDialogContent>
      </AppDialog>
    </>
  );
}
