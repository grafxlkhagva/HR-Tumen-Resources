'use client';

import * as React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';

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

interface MapWithSearchProps {
    lat: number;
    lng: number;
    onLocationChange: (lat: number, lng: number, label?: string) => void;
}

function SearchField({ onLocationChange }: { onLocationChange: (lat: number, lng: number, label?: string) => void }) {
    const map = useMap();

    React.useEffect(() => {
        const provider = new OpenStreetMapProvider();

        // @ts-ignore - leaflet-geosearch types are sometimes incomplete
        const searchControl = new GeoSearchControl({
            provider: provider,
            style: 'bar',
            showMarker: false,
            showPopup: false,
            autoClose: true,
            retainZoomLevel: false,
            animateZoom: true,
            keepResult: true,
            searchLabel: 'Хаяг хайх...',
        });

        map.addControl(searchControl);

        map.on('geosearch/showlocation', (result: any) => {
            if (result && result.location) {
                onLocationChange(result.location.y, result.location.x, result.location.label);
            }
        });

        return () => {
            map.removeControl(searchControl);
            map.off('geosearch/showlocation');
        };
    }, [map, onLocationChange]);

    return null;
}

function MapEvents({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onLocationChange(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    React.useEffect(() => {
        map.flyTo(center, map.getZoom() || 15);
    }, [center, map]);
    return null;
}

export function MapWithSearch({ lat, lng, onLocationChange }: MapWithSearchProps) {
    const defaultCenter = [47.9189, 106.9172];
    const center: [number, number] = [
        Number.isFinite(lat) && lat !== 0 ? lat : defaultCenter[0],
        Number.isFinite(lng) && lng !== 0 ? lng : defaultCenter[1],
    ];

    return (
        <div className="rounded-lg overflow-hidden border relative z-0 h-[300px] w-full">
            <MapContainer
                center={center}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <SearchField onLocationChange={onLocationChange} />
                <MapEvents onLocationChange={onLocationChange} />
                <MapUpdater center={center} />
                <Marker position={center} icon={defaultIcon} />
            </MapContainer>
        </div>
    );
}
