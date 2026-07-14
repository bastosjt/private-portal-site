const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'OurSpacePrivatePortal/1.0';

const boundaryCache = new Map();

function cacheKey({ lat, lng, label }) {
  return `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}:${String(label || '').trim().toLowerCase()}`;
}

function normalizeGeometry(geometry) {
  if (!geometry?.type) return null;
  if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') return geometry;
  return null;
}

function bboxToPolygon([south, north, west, east]) {
  const s = Number(south);
  const n = Number(north);
  const w = Number(west);
  const e = Number(east);
  if (![s, n, w, e].every(Number.isFinite)) return null;

  return {
    type: 'Polygon',
    coordinates: [[
      [w, s],
      [e, s],
      [e, n],
      [w, n],
      [w, s],
    ]],
  };
}

export function createCirclePolygon(centerLngLat, radiusKm = 8, steps = 64) {
  const [lng, lat] = centerLngLat;
  const coords = [];
  const latRad = (lat * Math.PI) / 180;
  const lngScale = Math.cos(latRad) || 1;

  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2;
    const dx = radiusKm * Math.cos(angle);
    const dy = radiusKm * Math.sin(angle);
    coords.push([
      lng + (dx / (111.32 * lngScale)),
      lat + (dy / 111.32),
    ]);
  }

  return { type: 'Polygon', coordinates: [coords] };
}

async function fetchNominatimJson(url, signal) {
  const response = await fetch(url, {
    signal,
    headers: {
      'Accept-Language': 'fr',
      'User-Agent': USER_AGENT,
    },
  });
  if (!response.ok) throw new Error(`Nominatim ${response.status}`);
  return response.json();
}

function geometryFromNominatimResult(result) {
  const geometry = normalizeGeometry(result?.geojson);
  if (geometry) return geometry;
  if (Array.isArray(result?.boundingbox)) return bboxToPolygon(result.boundingbox);
  return null;
}

async function fetchBoundaryFromSearch(label, signal) {
  const query = String(label || '').split(',')[0].trim();
  if (!query) return null;

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('polygon_geojson', '1');
  url.searchParams.set('limit', '1');
  url.searchParams.set('featureType', 'city,settlement');

  const results = await fetchNominatimJson(url, signal);
  return geometryFromNominatimResult(Array.isArray(results) ? results[0] : null);
}

async function fetchBoundaryFromReverse(lat, lng, signal) {
  const url = new URL(NOMINATIM_REVERSE_URL);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('format', 'json');
  url.searchParams.set('polygon_geojson', '1');
  url.searchParams.set('zoom', '10');

  const result = await fetchNominatimJson(url, signal);
  return geometryFromNominatimResult(result);
}

export async function getPlaceBoundary({ label, lat, lng, signal } = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const key = cacheKey({ lat, lng, label });
  if (boundaryCache.has(key)) return boundaryCache.get(key);

  let geometry = null;

  try {
    geometry = await fetchBoundaryFromSearch(label, signal);
    if (!geometry) geometry = await fetchBoundaryFromReverse(lat, lng, signal);
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.warn('getPlaceBoundary:', err.message);
    }
  }

  if (!geometry) {
    geometry = createCirclePolygon([lng, lat], 8);
  }

  boundaryCache.set(key, geometry);
  return geometry;
}

export function resetPlaceBoundaryCache() {
  boundaryCache.clear();
}
