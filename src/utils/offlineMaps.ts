// Offline Maps utility
// Downloads and caches map tiles for offline use

import { setOfflineItem, getOfflineItem } from './offlineStorage';

export interface OfflineMapRegion {
  id: string;
  center: [number, number];
  zoom: number;
  radius: number; // in km
  downloadedAt: number;
  tileCount: number;
}

// Convert lat/lng to tile coordinates
export const latLngToTile = (lat: number, lng: number, zoom: number): [number, number] => {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);
  return [x, y];
};

// Convert tile coordinates to lat/lng bounds
export const tileToLatLngBounds = (x: number, y: number, zoom: number): [[number, number], [number, number]] => {
  const n = Math.pow(2, zoom);
  const lon1 = x / n * 360 - 180;
  const lat1 = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
  const lon2 = (x + 1) / n * 360 - 180;
  const lat2 = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n))) * 180 / Math.PI;
  return [[lat1, lon1], [lat2, lon2]];
};

// Calculate tile bounds for a region around a center point
export const getTileBoundsForRegion = (
  center: [number, number],
  radiusKm: number,
  zoom: number
): { minX: number; maxX: number; minY: number; maxY: number } => {
  // Approximate conversion: 1 degree ≈ 111 km
  const latRadius = radiusKm / 111;
  const lngRadius = radiusKm / (111 * Math.cos(center[0] * Math.PI / 180));

  const minLat = center[0] - latRadius;
  const maxLat = center[0] + latRadius;
  const minLng = center[1] - lngRadius;
  const maxLng = center[1] + lngRadius;

  const [minX, minY] = latLngToTile(maxLat, minLng, zoom); // Note: lat is inverted
  const [maxX, maxY] = latLngToTile(minLat, maxLng, zoom);

  return { minX, maxX, minY, maxY };
};

// Download a single tile
export const downloadTile = async (x: number, y: number, z: number): Promise<Blob | null> => {
  try {
    const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.blob();
  } catch (error) {
    console.error(`Failed to download tile ${z}/${x}/${y}:`, error);
    return null;
  }
};

// Save offline map region
export const saveOfflineMapRegion = async (
  center: [number, number],
  radiusKm: number = 10,
  zoom: number = 12,
  onProgress?: (progress: number) => void
): Promise<OfflineMapRegion> => {
  const regionId = `map_${center[0]}_${center[1]}_${zoom}_${radiusKm}`;
  const bounds = getTileBoundsForRegion(center, radiusKm, zoom);

  let downloadedCount = 0;
  const totalTiles = (bounds.maxX - bounds.minX + 1) * (bounds.maxY - bounds.minY + 1);

  // Download tiles
  for (let x = bounds.minX; x <= bounds.maxX; x++) {
    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      const tile = await downloadTile(x, y, zoom);
      if (tile) {
        // Store tile as base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(tile);
        });
        const base64 = await base64Promise;

        await setOfflineItem(`tile_${zoom}_${x}_${y}`, {
          x, y, z: zoom,
          data: base64,
          downloadedAt: Date.now()
        });
        downloadedCount++;
      }

      // Update progress
      const progress = Math.round((downloadedCount / totalTiles) * 100);
      onProgress?.(progress);
    }
  }

  const region: OfflineMapRegion = {
    id: regionId,
    center,
    zoom,
    radius: radiusKm,
    downloadedAt: Date.now(),
    tileCount: downloadedCount
  };

  await setOfflineItem(`region_${regionId}`, region);
  return region;
};

// Get saved offline regions
export const getOfflineMapRegions = async (): Promise<OfflineMapRegion[]> => {
  // This would need to be implemented to scan for saved regions
  // For now, return empty array
  return [];
};

// Check if tile is available offline
export const getOfflineTile = async (x: number, y: number, z: number): Promise<string | null> => {
  const tile = await getOfflineItem(`tile_${z}_${x}_${y}`);
  return tile ? tile.data : null;
};

// Get tile URL (online or offline)
export const getTileUrl = async (x: number, y: number, z: number, isOnline: boolean): Promise<string> => {
  if (isOnline) {
    return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  }

  const offlineTile = await getOfflineTile(x, y, z);
  return offlineTile || '/offline-map-placeholder.svg';
};