'use client';

import * as React from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card } from '@/components/ui/card';
import type { TmsOneTimeTransport } from '@/app/tms/types';
import { haversineKm } from '../mongolia-locations';

const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface RouteMapInnerProps {
  transport: TmsOneTimeTransport;
  originCoords: [number, number];
  destCoords: [number, number] | null;
}

export function RouteMapInner({ transport: t, originCoords, destCoords }: RouteMapInnerProps) {
  const pickupAddress = t.details?.pickupAddress;
  const dropoffAddress = t.details?.dropoffAddress;
  const serviceAddress = t.details?.serviceAddress;

  return (
    <Card className="p-0 overflow-hidden">
      <div className="relative z-0 h-[220px] w-full">
        {destCoords ? (
          <MapContainer
            bounds={L.latLngBounds([originCoords, destCoords]).pad(0.25)}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={originCoords} icon={defaultIcon}>
              <Popup>📍 Ачих: {t.origin}</Popup>
            </Marker>
            <Marker position={destCoords} icon={defaultIcon}>
              <Popup>📍 Буух: {t.destination}</Popup>
            </Marker>
            <Polyline
              positions={[originCoords, destCoords]}
              pathOptions={{ color: '#1e3a5f', weight: 3, dashArray: '8 8' }}
            />
          </MapContainer>
        ) : (
          <MapContainer
            center={originCoords}
            zoom={11}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={originCoords} icon={defaultIcon}>
              <Popup>📍 Ачих: {t.origin}</Popup>
            </Marker>
          </MapContainer>
        )}
      </div>

      <div className="px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs border-t">
        {t.type === 'avtokran' ? (
          <span>
            📍 Байршил: {t.origin}
            {serviceAddress ? ` · ${serviceAddress}` : ''}
          </span>
        ) : (
          <>
            <span>
              📍 Ачих: {t.origin}
              {pickupAddress ? ` · ${pickupAddress}` : ''}
            </span>
            <span className="text-muted-foreground">━▶</span>
            <span>
              📍 Буух: {t.destination}
              {dropoffAddress ? ` · ${dropoffAddress}` : ''}
            </span>
          </>
        )}
        {t.totalDistanceKm ? (
          <span className="text-muted-foreground">🛣 {t.totalDistanceKm} км</span>
        ) : destCoords ? (
          <span className="text-muted-foreground">
            ≈{Math.round(haversineKm(originCoords, destCoords))} км (шулуун)
          </span>
        ) : null}
      </div>
    </Card>
  );
}
