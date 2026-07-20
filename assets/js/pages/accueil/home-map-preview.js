import { MAP_ACCENT } from '../../config.js';
import { devWarn } from '../../lib/dev-log.js';
import { getLngLatDeltaForRadiusKm } from '../../lib/geo-utils.js';
import { loadMapLibre, waitForContainerSize, MAP_BASE_OPTS } from '../../lib/map-bootstrap.js';
import { OUR_SPACE_MAP_RASTER_STYLE } from '../carte/map-raster-style.js';
import { bindMapMarkerImageFallback } from '../carte/map-marker-images.js';
import {
  clearMapUserLocationLayer,
  destroyMapUserLocationLayer,
  syncMapUserLocationLayer,
} from '../carte/map-user-location.js';
import {
  MAP_FALLBACK_CENTER,
  MAP_LOCAL_RADIUS_KM,
  refreshMapMarkers,
} from '../carte/map-markers.js';
import {
  getUserLocationLngLat,
  isUserLocationEnabled,
  onUserLocationChange,
} from '../../lib/user-location.js';

/** Zoom fixe — évite le chargement de tuiles sur plusieurs niveaux. */
const PREVIEW_ZOOM = 12;
const PREVIEW_PADDING = { top: 14, bottom: 42, left: 14, right: 14 };

let previewMap = null;
let resizeObserver = null;
let stopLocationListener = null;
let lazyLoadObserver = null;
let initToken = 0;

function getPreviewCenter() {
  return getUserLocationLngLat() || MAP_FALLBACK_CENTER;
}

function fitPreviewMap(map, { duration = 0 } = {}) {
  const maplibregl = window.maplibregl;
  if (!map || !maplibregl) return;

  const center = getPreviewCenter();
  const [lng, lat] = center;
  const { latDelta, lngDelta } = getLngLatDeltaForRadiusKm(lat, MAP_LOCAL_RADIUS_KM);
  const bounds = new maplibregl.LngLatBounds(
    [lng - lngDelta, lat - latDelta],
    [lng + lngDelta, lat + latDelta],
  );

  map.fitBounds(bounds, {
    padding: PREVIEW_PADDING,
    maxZoom: PREVIEW_ZOOM,
    minZoom: PREVIEW_ZOOM,
    duration,
    essential: true,
  });
}

function syncPreviewUserLocation(map) {
  const lngLat = isUserLocationEnabled() ? getUserLocationLngLat() : null;
  if (lngLat) {
    syncMapUserLocationLayer(map, lngLat, { accent: MAP_ACCENT });
    return;
  }
  clearMapUserLocationLayer(map);
}

function markPreviewReady(previewRoot) {
  previewRoot?.classList.add('is-ready');
}

export function destroyHomeMapPreview() {
  initToken += 1;
  lazyLoadObserver?.disconnect();
  lazyLoadObserver = null;
  stopLocationListener?.();
  stopLocationListener = null;
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (previewMap) {
    destroyMapUserLocationLayer(previewMap);
    previewMap.remove();
  }
  previewMap = null;
}

async function mountHomeMapPreview(token) {
  const container = document.getElementById('home-nearby-map-canvas');
  if (!container || token !== initToken) return;

  const maplibregl = await loadMapLibre();
  if (!maplibregl) return;

  const previewRoot = container.closest('.home-nearby-map-preview');
  await waitForContainerSize(container);
  if (token !== initToken || !document.getElementById('home-nearby-map-canvas')) return;

  previewMap = new maplibregl.Map({
    container,
    style: OUR_SPACE_MAP_RASTER_STYLE,
    center: getPreviewCenter(),
    zoom: PREVIEW_ZOOM,
    minZoom: PREVIEW_ZOOM,
    maxZoom: PREVIEW_ZOOM,
    interactive: false,
    pitch: 0,
    bearing: 0,
    dragRotate: false,
    touchZoomRotate: false,
    ...MAP_BASE_OPTS,
  });

  bindMapMarkerImageFallback(previewMap);

  previewMap.on('error', (event) => {
    devWarn('home-map-preview:', event.error?.message || event.error);
  });

  previewMap.on('load', () => {
    if (token !== initToken || !previewMap) return;

    markPreviewReady(previewRoot);
    previewMap.resize();
    fitPreviewMap(previewMap);
    syncPreviewUserLocation(previewMap);
    refreshMapMarkers(previewMap, {
      onUpdated: () => syncPreviewUserLocation(previewMap),
    });
  });

  resizeObserver = new ResizeObserver(() => {
    previewMap?.resize();
  });
  resizeObserver.observe(container);

  stopLocationListener = onUserLocationChange(() => {
    if (!previewMap?.isStyleLoaded()) return;
    fitPreviewMap(previewMap, { duration: 600 });
    syncPreviewUserLocation(previewMap);
  });
}

export function initHomeMapPreview() {
  const container = document.getElementById('home-nearby-map-canvas');
  if (!container) return;

  destroyHomeMapPreview();
  const token = initToken;

  lazyLoadObserver = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    lazyLoadObserver?.disconnect();
    lazyLoadObserver = null;

    requestAnimationFrame(() => {
      mountHomeMapPreview(token).catch((error) => {
        devWarn('home-map-preview init:', error.message);
      });
    });
  }, { rootMargin: '120px' });

  lazyLoadObserver.observe(container);
}
