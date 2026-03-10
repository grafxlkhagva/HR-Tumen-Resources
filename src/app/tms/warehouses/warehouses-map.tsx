'use client';

import * as React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { TmsWarehouse } from '@/app/tms/types';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

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

function MapBounds({ warehouses }: { warehouses: TmsWarehouse[] }) {
    const map = useMap();
    React.useEffect(() => {
        if (warehouses.length > 0) {
            const lats = warehouses.map((w) => w.geolocation!.lat);
            const lngs = warehouses.map((w) => w.geolocation!.lng);

            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            const minLng = Math.min(...lngs);
            const maxLng = Math.max(...lngs);

            // If all markers are precisely at the same spot, just zoom to it
            if (minLat === maxLat && minLng === maxLng) {
                map.setView([minLat, minLng], 15);
            } else {
                const bounds = L.latLngBounds(
                    [minLat, minLng],
                    [maxLat, maxLng]
                );
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
            }
        } else {
            map.setView([47.9189, 106.9172], 12);
        }
    }, [warehouses, map]);
    return null;
}

interface WarehousesMapProps {
    warehouses: TmsWarehouse[];
}

const STATUS_LABELS: Record<string, string> = {
    active: 'Идэвхтэй',
    inactive: 'Идэвхгүй',
    full: 'Дүүрэн',
    maintenance: 'Засвар',
};

const TYPE_LABELS: Record<string, string> = {
    General: 'Ерөнхий',
    'Cold Storage': 'Хүйтэн',
    Hazardous: 'Аюултай',
    Bonded: 'Гаалийн',
};

export default function WarehousesMap({ warehouses }: WarehousesMapProps) {
    const defaultCenter: [number, number] = [47.9189, 106.9172];

    const markers = React.useMemo(() => {
        return warehouses.filter(
            (w) =>
                w.geolocation &&
                Number.isFinite(w.geolocation.lat) &&
                Number.isFinite(w.geolocation.lng) &&
                (w.geolocation.lat !== 0 || w.geolocation.lng !== 0) // Basic heuristic to ignore exactly 0,0 items
        );
    }, [warehouses]);

    return (
        <div className="rounded-lg overflow-hidden border">
            <MapContainer
                center={defaultCenter}
                zoom={12}
                style={{ height: '400px', width: '100%' }}
                scrollWheelZoom
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapBounds warehouses={markers} />
                {markers.map((w) => (
                    <Marker
                        key={w.id}
                        position={[w.geolocation!.lat, w.geolocation!.lng]}
                        icon={defaultIcon}
                    >
                        <Popup>
                            <div className="flex flex-col gap-2 min-w-[200px]">
                                <div className="font-semibold text-base">{w.name || '—'}</div>
                                <div className="text-sm text-muted-foreground">{w.location || '—'}</div>
                                <div className="flex flex-wrap gap-2 text-xs mt-1">
                                    <Badge variant="outline">{STATUS_LABELS[w.status] ?? w.status}</Badge>
                                    <Badge variant="outline">{TYPE_LABELS[w.type] ?? w.type}</Badge>
                                </div>
                                {w.customerName && (
                                    <div className="text-sm mt-1">
                                        <span className="text-muted-foreground">Харилцагч: </span>
                                        {w.customerName}
                                    </div>
                                )}
                                <Link
                                    href={`/tms/warehouses/${w.id}`}
                                    className="text-primary hover:underline text-sm font-medium mt-2 inline-block"
                                >
                                    Дэлгэрэнгүй үзэх &rarr;
                                </Link>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
