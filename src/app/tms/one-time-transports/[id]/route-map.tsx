'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import type { TmsOneTimeTransport } from '@/app/tms/types';
import { findCoords } from '../mongolia-locations';

const RouteMapLazy = dynamic(
  () => import('./route-map-inner').then((m) => m.RouteMapInner),
  {
    ssr: false,
    loading: () => <div className="h-[220px] rounded-lg bg-muted animate-pulse" />,
  }
);

export function RouteMap({ transport }: { transport: TmsOneTimeTransport }) {
  const originCoords = findCoords(transport.origin);
  const destCoords =
    transport.type === 'avtokran' ? null : findCoords(transport.destination);

  if (!originCoords) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        📍 Газрын зургийн координат олдсонгүй — «{transport.origin ?? 'байршил'}»
        танигдсангүй.
      </div>
    );
  }

  return (
    <RouteMapLazy
      transport={transport}
      originCoords={originCoords}
      destCoords={destCoords}
    />
  );
}
