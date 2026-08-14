import { ensureMapDataReady, getMapMarkersFromCache } from '../../data/appDataCache.js';
import { getMapLibre } from '../../lib/map-bootstrap.js';
import { getUserLocationLngLat, hydrateUserLocationFromCache } from '../../lib/user-location.js';
import { getOurSpaceMapStyle } from './map-style.js';
import { MAP_FALLBACK_CENTER } from './map-markers.js';
import { preloadMapMarkerImages, resetMapMarkerImages } from './map-marker-images.js';

const PREWARM_ZOOM = 14;
const PREWARM_IDLE_TIMEOUT_MS = 5000;
const PREWARM_HOST_ID = 'map-tile-prewarm';

let warmupPromise = null;
let mapWarmReady = false;
let prewarmPromise = null;
let tilesPrewarmed = false;
let prewarmMap = null;
let backgroundWarmupStarted = false;

export function isMapWarmReady() {
  return mapWarmReady;
}

export function isMapTilesPrewarmed() {
  return tilesPrewarmed;
}

/** Données + icônes pins prêtes pour la page Carte. */
export function warmMapForApp() {
  if (mapWarmReady) return Promise.resolve();
  if (warmupPromise) return warmupPromise;

  warmupPromise = (async () => {
    await ensureMapDataReady();
    await preloadMapMarkerImages(getMapMarkersFromCache());
    mapWarmReady = true;
  })().catch((err) => {
    console.warn('warmMapForApp:', err.message);
    warmupPromise = null;
  });

  return warmupPromise;
}

function destroyPrewarmMap() {
  prewarmMap?.remove();
  prewarmMap = null;
  document.getElementById(PREWARM_HOST_ID)?.remove();
}

function waitForMapIdle(map, timeoutMs = PREWARM_IDLE_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    if (typeof map.areTilesLoaded === 'function' && map.areTilesLoaded() && !map.isMoving()) {
      finish();
      return;
    }

    map.once('idle', finish);
    window.setTimeout(finish, timeoutMs);
  });
}

/** Carte cachée : style + tuiles en cache navigateur (libère le WebGL après succès). */
export function prewarmMapTiles() {
  if (tilesPrewarmed) return Promise.resolve();
  if (prewarmPromise) return prewarmPromise;

  prewarmPromise = (async () => {
    await warmMapForApp();

    const maplibregl = getMapLibre();
    if (!maplibregl) return;

    destroyPrewarmMap();

    const host = document.createElement('div');
    host.id = PREWARM_HOST_ID;
    host.className = 'map-tile-prewarm-host';
    host.setAttribute('aria-hidden', 'true');
    document.body.appendChild(host);

    hydrateUserLocationFromCache();
    const center = getUserLocationLngLat() || MAP_FALLBACK_CENTER;

    prewarmMap = new maplibregl.Map({
      container: host,
      style: getOurSpaceMapStyle(),
      center,
      zoom: PREWARM_ZOOM,
      minZoom: 3,
      maxZoom: 16,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      pitch: 0,
      bearing: 0,
      dragRotate: false,
      touchZoomRotate: false,
    });

    await new Promise((resolve) => {
      if (prewarmMap.isStyleLoaded()) {
        resolve();
        return;
      }
      prewarmMap.once('load', resolve);
      window.setTimeout(resolve, PREWARM_IDLE_TIMEOUT_MS);
    });

    await waitForMapIdle(prewarmMap);
    tilesPrewarmed = true;
    destroyPrewarmMap();
  })().catch((err) => {
    console.warn('prewarmMapTiles:', err.message);
    prewarmPromise = null;
    destroyPrewarmMap();
  });

  return prewarmPromise;
}

/** Préchauffe tuiles en arrière-plan (hors chemin splash). */
export function startMapWarmupBackground() {
  if (backgroundWarmupStarted || tilesPrewarmed) return;
  backgroundWarmupStarted = true;

  const run = () => {
    void prewarmMapTiles();
  };

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 8000 });
    return;
  }

  window.setTimeout(run, 1500);
}

/** Attend le préchargement tuiles (no-op si déjà fait). */
export function ensureMapTilesPrewarmed() {
  if (tilesPrewarmed) return Promise.resolve();
  return warmMapForApp();
}

/** Données, icônes pins et tuiles basemap. */
export async function loadAppMapAssets() {
  await warmMapForApp();
  await prewarmMapTiles();
}

export function resetMapWarmup() {
  warmupPromise = null;
  mapWarmReady = false;
  prewarmPromise = null;
  tilesPrewarmed = false;
  backgroundWarmupStarted = false;
  destroyPrewarmMap();
  resetMapMarkerImages();
}
