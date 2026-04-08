import { useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const MapsPage = () => {
  const [position, setPosition] = useState<[number, number]>([6.9271, 79.8612]);
  const [status, setStatus] = useState('Retrieving GPS location...');

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus('Geolocation not supported.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (loc) => {
        setPosition([loc.coords.latitude, loc.coords.longitude]);
        setStatus('GPS location detected.');
      },
      () => {
        setStatus('Unable to retrieve GPS position. Using fallback coordinates.');
      },
      { timeout: 8000 }
    );
  }, []);

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] border border-slate-800 bg-slate-900/90 p-8 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Map view</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Offline location awareness</h2>
            <p className="mt-3 max-w-2xl text-slate-400">Pre-downloaded tiles allow schools and students to use maps even when connectivity is limited.</p>
          </div>
          <div className="rounded-3xl bg-slate-950/80 px-6 py-4 text-slate-200 shadow-soft">
            <p className="text-sm text-slate-400">GPS status</p>
            <p className="mt-2 text-white">{status}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="h-[560px] w-full overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950/80">
          <MapContainer center={position} zoom={5} className="h-full w-full">
            <TileLayer
              url="/tiles/{z}/{x}/{y}.png"
              attribution="&copy; Syncademy offline tiles"
              errorTileUrl="/offline-map-placeholder.svg"
            />
            <Marker position={position}>
              <Popup>You are here</Popup>
            </Marker>
          </MapContainer>
        </div>
      </div>

      <div className="rounded-3xl bg-slate-900/90 p-6 text-slate-300">
        <h3 className="text-lg font-semibold text-white">Offline tile notes</h3>
        <p className="mt-3 text-sm leading-7">
          Syncademy supports local tile rendering from the <code>/public/tiles</code> folder. Add downloaded tiles to support maps without connectivity. The current experience falls back to a placeholder if offline tiles are missing.
        </p>
      </div>
    </section>
  );
};

export default MapsPage;
