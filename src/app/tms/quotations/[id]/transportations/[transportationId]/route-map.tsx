'use client';

import * as React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { TmsWarehouse } from '@/app/tms/types';
import { getVehicleTracking, getVehicleHistory } from '@/app/tms/actions/gps';
import { Button } from '@/components/ui/button';
import { Loader2, History, X } from 'lucide-react';
import { format } from 'date-fns';

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

const carIcon = L.divIcon({
  html: `<div style="background-color: #3b82f6; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
  className: 'car-marker-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
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
  gpsDeviceId?: string;
}

export function RouteMap({ loadingWarehouse, unloadingWarehouse, gpsDeviceId }: RouteMapProps) {
  const [gpsData, setGpsData] = React.useState<any>(null);
  const [showHistory, setShowHistory] = React.useState(false);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [historyData, setHistoryData] = React.useState<any[]>([]);
  const [historyDate, setHistoryDate] = React.useState(new Date());

  React.useEffect(() => {
    if (!gpsDeviceId) return;

    const fetchGps = async () => {
      try {
        const res = await getVehicleTracking(gpsDeviceId);
        if (res.success && res.data) {
          setGpsData(res.data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchGps();
    const interval = setInterval(fetchGps, 15000); // refresh every 15 seconds
    return () => clearInterval(interval);
  }, [gpsDeviceId]);

  React.useEffect(() => {
    if (!gpsDeviceId || !showHistory) return;

    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const dateStr = format(historyDate, 'yyyy-MM-dd');
        const res = await getVehicleHistory(gpsDeviceId, `${dateStr} 00:00:00`, `${dateStr} 23:59:59`);
        if (res.success && res.data) {
          setHistoryData(res.data);
        } else {
          setHistoryData([]);
        }
      } catch (err) {
        console.error(err);
        setHistoryData([]);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [gpsDeviceId, showHistory, historyDate]);

  const points: [number, number][] = [];
  const routePoints: [number, number][] = [];

  const loadingGeo = loadingWarehouse?.geolocation;
  const unloadingGeo = unloadingWarehouse?.geolocation;

  if (loadingGeo && Number.isFinite(loadingGeo.lat) && Number.isFinite(loadingGeo.lng)) {
    routePoints.push([loadingGeo.lat, loadingGeo.lng]);
    points.push([loadingGeo.lat, loadingGeo.lng]);
  }
  if (unloadingGeo && Number.isFinite(unloadingGeo.lat) && Number.isFinite(unloadingGeo.lng)) {
    routePoints.push([unloadingGeo.lat, unloadingGeo.lng]);
    points.push([unloadingGeo.lat, unloadingGeo.lng]);
  }

  if (gpsData && Number.isFinite(gpsData.lat) && Number.isFinite(gpsData.lng)) {
    points.push([gpsData.lat, gpsData.lng]);
  }

  const historyPoints: [number, number][] = historyData.map(d => [d.lat, d.lng]);
  if (showHistory && historyPoints.length > 0) {
    points.push(...historyPoints);
  }

  // Default to Ulaanbaatar if no points
  const center: [number, number] = points.length > 0 ? points[0] : [47.9189, 106.9172];

  return (
    <div className={`w-full relative z-0 transition-all ${showHistory ? 'h-[400px]' : 'h-[250px]'}`}>
      <div className="absolute top-2 right-2 z-[1000] flex flex-col items-end gap-2">
        {gpsDeviceId && (
          <Button 
            variant={showHistory ? "destructive" : "secondary"} 
            size="sm" 
            className="shadow-md"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? (
              <><X className="w-4 h-4 mr-1" /> Түүх хаах</>
            ) : (
              <><History className="w-4 h-4 mr-1" /> Түүх харах</>
            )}
          </Button>
        )}
        {showHistory && (
          <div className="bg-background rounded-md shadow-md p-2 flex items-center gap-2 border">
            <input 
              type="date" 
              className="text-sm border-none bg-transparent outline-none"
              value={format(historyDate, 'yyyy-MM-dd')}
              max={format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => {
                if (e.target.value) {
                  setHistoryDate(new Date(e.target.value));
                }
              }}
            />
            {historyLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            {!historyLoading && historyData.length > 0 && (
              <span className="text-xs text-muted-foreground ml-1">{historyData.length} цэг</span>
            )}
            {!historyLoading && historyData.length === 0 && (
              <span className="text-xs text-destructive ml-1">Олдсонгүй</span>
            )}
          </div>
        )}
      </div>

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

        {showHistory && historyPoints.length > 0 && (
          <Polyline positions={historyPoints} color="hsl(var(--primary))" weight={3} opacity={0.6} />
        )}

        {gpsData && Number.isFinite(gpsData.lat) && Number.isFinite(gpsData.lng) && (
          <Marker position={[gpsData.lat, gpsData.lng]} icon={carIcon}>
            <Popup>
              <div className="font-semibold text-xs text-blue-600 uppercase">Одоогийн байршил</div>
              <div className="text-sm">Хурд: {gpsData.speed} км/ц</div>
              <div className="text-xs text-muted-foreground">{gpsData.positionTime}</div>
              <div className="text-xs text-muted-foreground">{gpsData.status}</div>
            </Popup>
          </Marker>
        )}

        {routePoints.length >= 2 && !showHistory && (
          <Polyline positions={routePoints} color="hsl(var(--primary))" weight={4} dashArray="5, 10" />
        )}
      </MapContainer>
    </div>
  );
}
