'use client';

/**
 * TMS-ийн бараг өөрчлөгддөггүй лавлах мэдээлэл (regions, warehouses,
 * vehicleTypes, trailerTypes, packagingTypes)-ыг TMS бүх хуудсанд нэг удаа
 * fetch хийж дахин ашиглах Context.
 *
 * Яагаад?
 *   Өмнө `use-transport-detail.ts` гээд хуудас тус бүрт 5+ real-time
 *   `useCollection` subscription үүсэж, Firebase read quota хэт их
 *   зарцуулагдаж байсан. Эдгээр цуглуулгууд нь ховор өөрчлөгддөг тул
 *   сан-дотор нэг л udaa ачаалаад context-аар provide хийхэд аюулгүй.
 *
 * Хэрэглээ:
 *   layout.tsx:
 *     <TmsReferenceDataProvider>...</TmsReferenceDataProvider>
 *
 *   Ямар ч хэсэгт:
 *     const { regions, warehouses } = useTmsReferenceData();
 *
 * Fallback:
 *   Provider-аас гадна дуудсан үед хоосон массивуудтай default буцаана.
 *   Тэгээд ч ашигласан газруудыг аажмаар эх hook-оосоо салгана.
 */

import * as React from 'react';
import { collection } from 'firebase/firestore';
import { useCollection, useMemoFirebase } from '@/firebase';
import {
  TMS_REGIONS_COLLECTION,
  TMS_WAREHOUSES_COLLECTION,
  TMS_VEHICLE_TYPES_COLLECTION,
  TMS_TRAILER_TYPES_COLLECTION,
  TMS_PACKAGING_TYPES_COLLECTION,
} from './types';

export type TmsRefItem = { id: string; name: string };
export type TmsWarehouseItem = { id: string; name: string; regionId?: string };

interface TmsReferenceData {
  regions: TmsRefItem[];
  warehouses: TmsWarehouseItem[];
  vehicleTypes: TmsRefItem[];
  trailerTypes: TmsRefItem[];
  packagingTypes: TmsRefItem[];
  isLoading: boolean;
}

const EMPTY: TmsReferenceData = {
  regions: [],
  warehouses: [],
  vehicleTypes: [],
  trailerTypes: [],
  packagingTypes: [],
  isLoading: false,
};

const Ctx = React.createContext<TmsReferenceData>(EMPTY);

export function TmsReferenceDataProvider({ children }: { children: React.ReactNode }) {
  const regionsQuery = useMemoFirebase(
    ({ firestore }) => collection(firestore, TMS_REGIONS_COLLECTION),
    [],
  );
  const { data: regions, isLoading: lRegions } = useCollection<TmsRefItem>(regionsQuery);

  const warehousesQuery = useMemoFirebase(
    ({ firestore }) => collection(firestore, TMS_WAREHOUSES_COLLECTION),
    [],
  );
  const { data: warehouses, isLoading: lWh } = useCollection<TmsWarehouseItem>(warehousesQuery);

  const vehicleTypesQuery = useMemoFirebase(
    ({ firestore }) => collection(firestore, TMS_VEHICLE_TYPES_COLLECTION),
    [],
  );
  const { data: vehicleTypes, isLoading: lVt } = useCollection<TmsRefItem>(vehicleTypesQuery);

  const trailerTypesQuery = useMemoFirebase(
    ({ firestore }) => collection(firestore, TMS_TRAILER_TYPES_COLLECTION),
    [],
  );
  const { data: trailerTypes, isLoading: lTt } = useCollection<TmsRefItem>(trailerTypesQuery);

  const packagingTypesQuery = useMemoFirebase(
    ({ firestore }) => collection(firestore, TMS_PACKAGING_TYPES_COLLECTION),
    [],
  );
  const { data: packagingTypes, isLoading: lPt } = useCollection<TmsRefItem>(packagingTypesQuery);

  const value = React.useMemo<TmsReferenceData>(
    () => ({
      regions: regions ?? [],
      warehouses: warehouses ?? [],
      vehicleTypes: vehicleTypes ?? [],
      trailerTypes: trailerTypes ?? [],
      packagingTypes: packagingTypes ?? [],
      isLoading: lRegions || lWh || lVt || lTt || lPt,
    }),
    [regions, warehouses, vehicleTypes, trailerTypes, packagingTypes, lRegions, lWh, lVt, lTt, lPt],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTmsReferenceData(): TmsReferenceData {
  return React.useContext(Ctx);
}
