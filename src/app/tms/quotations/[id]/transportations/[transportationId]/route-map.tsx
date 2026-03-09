'use client';

import * as React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { TmsWarehouse } from '@/app/tms/types';

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

// A component to automatically adjust map bounds to fit both points
function MapBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  React.useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [points, map]);
  return null;
}

interface RouteMapProps {
  loadingWarehouse?: any;
  unloadingWarehouse?: any;
}

export function RouteMap({ loadingWarehouse, unloadingWarehouse }: RouteMapProps) {
  const points: [number, number][] = [];

  const loadingGeo = loadingWarehouse?.geolocation;
  const unloadingGeo = unloadingWarehouse?.geolocation;

  if (loadingGeo && Number.isFinite(loadingGeo.lat) && Number.isFinite(loadingGeo.lng)) {
    points.push([loadingGeo.lat, loadingGeo.lng]);
  }
  if (unloadingGeo && Number.isFinite(unloadingGeo.lat) && Number.isFinite(unloadingGeo.lng)) {
    points.push([unloadingGeo.lat, unloadingGeo.lng]);
  }

  // Default to Ulaanbaatar if no points
  const center: [number, number] = points.length > 0 ? points[0] : [47.9189, 106.9172];

  return (
    <div className="h-[200px] w-full relative z-0">
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: '100%', width: '100%', borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {points.length > 0 && <MapBounds points={points} />}

        {loadingGeo && (
          <Marker position={[loadingGeo.lat, loadingGeo.lng]} icon={defaultIcon}>
            <Popup>
              <div className="font-semibold text-xs text-primary uppercase">Ачих цэг</div>
              <div>{loadingWarehouse.name}</div>
            </Popup>
          </Marker>
        )}

        {unloadingGeo && (
          <Marker position={[unloadingGeo.lat, unloadingGeo.lng]} icon={defaultIcon}>
            <Popup>
              <div className="font-semibold text-xs text-primary uppercase">Буулгах цэг</div>
              <div>{unloadingWarehouse.name}</div>
            </Popup>
          </Marker>
        )}

        {points.length === 2 && (
          <Polyline positions={points} color="hsl(var(--primary))" weight={4} dashArray="5, 10" />
        )}
      </MapContainer>
    </div>
  );
}
