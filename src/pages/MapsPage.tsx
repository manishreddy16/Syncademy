import { useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getOnlineStatus, subscribeToOnlineStatus } from '../utils/onlineStatus';

const MapsPage = () => {
  const [position, setPosition] = useState<[number, number]>([6.9271, 79.8612]);
  const [status, setStatus] = useState('Retrieving GPS location...');
  const [isOnline, setIsOnline] = useState(getOnlineStatus());
  const [markerPosition, setMarkerPosition] = useState<[number, number]>([6.9271, 79.8612]);

  useEffect(() => {
    const unsubscribe = subscribeToOnlineStatus((online) => {
      setIsOnline(online);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus('Geolocation not supported.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (loc) => {
        const newPosition: [number, number] = [loc.coords.latitude, loc.coords.longitude];
        setPosition(newPosition);
        setMarkerPosition(newPosition);
        setStatus('GPS location detected.');
      },
      (error) => {
        console.warn('Geolocation error', error);
        setStatus('Unable to retrieve GPS position. Using fallback coordinates.');
      },
      { timeout: 10000 }
    );
  }, []);

  const tileUrl = isOnline
    ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    : '/tiles/{z}/{x}/{y}.png';

  const nearbyMarkers = [
    {
      id: 'resource-1',
      position: [markerPosition[0] + 0.01, markerPosition[1] + 0.01],
      label: 'Local Library',
      description: 'Offline resource center nearby',
    },
    {
      id: 'resource-2',
      position: [markerPosition[0] - 0.01, markerPosition[1] - 0.015],
      label: 'School Resource Hub',
      description: 'Digital learning materials available',
    },
  ];

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] border border-slate-800 bg-slate-900/90 p-8 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Map view</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Current location & nearby resources</h2>
            <p className="mt-3 max-w-2xl text-slate-400">View your current location and nearby learning hubs. The map automatically falls back to cached tiles when you are offline.</p>
          </div>
          <div className={`rounded-3xl px-6 py-4 text-slate-200 shadow-soft ${isOnline ? 'bg-green-950/80' : 'bg-red-950/80'}`}>
            <p className="text-sm text-slate-400">Connectivity</p>
            <p className="mt-2 text-xl font-semibold text-white">{isOnline ? '🟢 Online' : '🔴 Offline'}</p>
          </div>
        </div>
      </div>

      <div className="h-[560px] w-full overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950/80">
        <MapContainer center={position} zoom={12} className="h-full w-full">
          <TileLayer url={tileUrl} attribution="&copy; OpenStreetMap contributors" errorTileUrl="/offline-map-placeholder.svg" />
          <Marker position={markerPosition}>
            <Popup>Current location</Popup>
          </Marker>
          {nearbyMarkers.map((marker) => (
            <Marker key={marker.id} position={marker.position}>
              <Popup>
                <strong>{marker.label}</strong>
                <p>{marker.description}</p>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="rounded-3xl bg-slate-900/90 p-6 text-slate-300">
        <h3 className="text-lg font-semibold text-white">Map offline support</h3>
        <p className="mt-3 text-sm leading-7">
          Syncademy can use local tiles stored in <code>/public/tiles</code> when no internet connection is available. When online, it uses OpenStreetMap to keep the experience updated.
        </p>
        <p className="mt-3 text-sm text-slate-400">GPS status: {status}</p>
      </div>
    </section>
  );
};

export default MapsPage;
