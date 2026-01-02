'use client';

import * as React from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Next.js
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
    iconUrl: iconUrl,
    iconRetinaUrl: iconRetinaUrl,
    shadowUrl: shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

interface AttendanceMapProps {
    latitude: number;
    longitude: number;
    radius: number;
    onLocationChange: (lat: number, lng: number) => void;
}

function MapController({ center }: { center: [number, number] }) {
    const map = useMap();
    React.useEffect(() => {
        map.setView(center);
    }, [center, map]);
    return null;
}

function LocationMarker({ position, onChange }: { position: [number, number], onChange: (lat: number, lng: number) => void }) {
    const markerRef = React.useRef<L.Marker>(null);

    const eventHandlers = React.useMemo(
        () => ({
            dragend() {
                const marker = markerRef.current;
                if (marker != null) {
                    const latLng = marker.getLatLng();
                    onChange(latLng.lat, latLng.lng);
                }
            },
        }),
        [onChange],
    );

    // Also handle map clicks to move marker
    useMapEvents({
        click(e) {
            onChange(e.latlng.lat, e.latlng.lng);
        },
    });

    return (
        <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={position}
            ref={markerRef}
        />
    )
}

export default function AttendanceMap({ latitude, longitude, radius, onLocationChange }: AttendanceMapProps) {
    // Ensure valid coordinates or default to Ulaanbaatar
    const center: [number, number] = [
        Number.isFinite(latitude) ? latitude : 47.9179,
        Number.isFinite(longitude) ? longitude : 106.9175
    ];

    return (
        <MapContainer // @ts-ignore
            center={center}
            zoom={15}
            style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController center={center} />
            <LocationMarker position={center} onChange={onLocationChange} />
            <Circle
                center={center}
                radius={radius}
                pathOptions={{
                    color: '#FF0000',
                    fillColor: '#FF0000',
                    fillOpacity: 0.35,
                    weight: 2
                }}
            />
        </MapContainer>
    );
}
