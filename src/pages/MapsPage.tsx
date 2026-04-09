import { useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { getOnlineStatus, subscribeToOnlineStatus } from '../utils/onlineStatus';
import { saveOfflineMapRegion, getOfflineMapRegions, getTileUrl } from '../utils/offlineMaps';

const MapsPage = () => {
  const [position, setPosition] = useState<[number, number]>([6.9271, 79.8612]);
  const [status, setStatus] = useState('Retrieving GPS location...');
  const [isOnline, setIsOnline] = useState(getOnlineStatus());
  const [markerPosition, setMarkerPosition] = useState<[number, number]>([6.9271, 79.8612]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [offlineRegions, setOfflineRegions] = useState<any[]>([]);
  const [downloadProgress, setDownloadProgress] = useState(0);

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

  const handleDownloadOfflineMap = async () => {
    if (!isOnline) {
      alert('You need to be online to download map tiles.');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const region = await saveOfflineMapRegion(markerPosition, 10, 12, (progress) => {
        setDownloadProgress(progress);
      });
      setOfflineRegions(prev => [...prev, region]);
      setDownloadProgress(100); // Ensure it shows 100% on completion
      alert(`Downloaded ${region.tileCount} map tiles for offline use around your location.`);
    } catch (error) {
      console.error('Failed to download offline map:', error);
      alert('Failed to download offline map. Please try again.');
    } finally {
      setIsDownloading(false);
      // Keep progress at 100% if successful, reset to 0 only on error
      if (downloadProgress !== 100) {
        setDownloadProgress(0);
      }
    }
  };

  const loadOfflineRegions = async () => {
    try {
      const regions = await getOfflineMapRegions();
      setOfflineRegions(regions);
    } catch (error) {
      console.error('Failed to load offline regions:', error);
    }
  };

  useEffect(() => {
    loadOfflineRegions();
  }, []);

  const getTileUrl = (x: number, y: number, z: number) => {
    if (isOnline) {
      return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    }
    // For offline, we'll use a placeholder since we can't dynamically serve base64 tiles
    // In a real implementation, you'd need a service worker or local server
    return '/offline-map-placeholder.svg';
  };

  const tileUrl = isOnline
    ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjEyOCIgeT0iMTI4IiBmaWxsPSIjMDAwIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zNWVtIj5PZmZsaW5lIE1hcDwvdGV4dD48L3N2Zz4=';

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
          <div className="flex gap-4">
            <div className={`rounded-3xl px-6 py-4 text-slate-200 shadow-soft ${isOnline ? 'bg-green-950/80' : 'bg-red-950/80'}`}>
              <p className="text-sm text-slate-400">Connectivity</p>
              <p className="mt-2 text-xl font-semibold text-white">{isOnline ? '🟢 Online' : '🔴 Offline'}</p>
            </div>
            <button
              onClick={handleDownloadOfflineMap}
              disabled={isDownloading || !isOnline}
              className="rounded-3xl px-6 py-4 bg-blue-600 text-white shadow-soft hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <p className="text-sm text-slate-200">Save Offline</p>
              <p className="mt-1 text-lg font-semibold">
                {isDownloading ? `Downloading... ${downloadProgress}%` : '📥 10km Radius'}
              </p>
            </button>
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
          Download map tiles for offline use around your current location. When offline, the map will show cached tiles where available.
        </p>
        <div className="mt-4 space-y-2">
          <p className="text-sm text-slate-400">GPS status: {status}</p>
          <p className="text-sm text-slate-400">
            Offline regions: {offlineRegions.length > 0 ? `${offlineRegions.length} saved (${offlineRegions.reduce((sum, r) => sum + r.tileCount, 0)} tiles)` : 'None saved'}
          </p>
          {!isOnline && offlineRegions.length === 0 && (
            <p className="text-sm text-red-400">
              ⚠️ No offline maps available. Download maps while online for offline use.
            </p>
          )}
          {!isOnline && offlineRegions.length > 0 && (
            <p className="text-sm text-green-400">
              ✅ Offline maps available for downloaded regions.
            </p>
          )}
        </div>
        <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
          <p className="text-xs text-slate-500">
            <strong>Note:</strong> Offline map tiles are stored locally. In a production app, a service worker would serve these tiles. Currently, offline maps show a placeholder when no internet is available.
          </p>
        </div>
      </div>
    </section>
  );
};

export default MapsPage;
