'use client';

import * as React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

function MapCenter({ center }: { center: [number, number] }) {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, 15);
  }, [center, map]);
  return null;
}

interface WarehouseLocationMapProps {
  lat: number;
  lng: number;
  warehouseName?: string;
  location?: string;
}

export default function WarehouseLocationMap({
  lat,
  lng,
  warehouseName,
  location,
}: WarehouseLocationMapProps) {
  const center: [number, number] = [
    Number.isFinite(lat) ? lat : 47.9189,
    Number.isFinite(lng) ? lng : 106.9172,
  ];

  return (
    <MapContainer
      center={center}
      zoom={15}
      style={{ height: '280px', width: '100%', borderRadius: '0.5rem' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapCenter center={center} />
      <Marker position={center} icon={defaultIcon}>
        {(warehouseName || location) && (
          <Popup>
            {warehouseName && <div className="font-semibold">{warehouseName}</div>}
            {location && <div className="text-sm text-muted-foreground">{location}</div>}
          </Popup>
        )}
      </Marker>
    </MapContainer>
  );
}
