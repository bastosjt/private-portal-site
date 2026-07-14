import { MAP_ACCENT } from '../../config.js';
import { OUR_SPACE_MAP_STYLE } from './map-style.js';
import { renderNavIcon } from '../../lib/lucide-icon.js';
import {
  getGeolocationUserMessage,
  getUserLocationLngLat,
  isUserLocationEnabled,
  onUserLocationChange,
  requestUserLocationUpdate,
} from '../../lib/user-location.js';
import { bindMapMarkerImageFallback } from './map-marker-images.js';
import {
  fitMapToLocalArea,
  fitMapToVisibleMarkers,
  isMapLayerVisible,
  MAP_FALLBACK_CENTER,
  refreshMapMarkers,
  resetMapMarkersState,
  setMapLayerVisible,
  setMapMarkerClickHandler,
} from './map-markers.js';

export { refreshTravelMapZones } from './map-markers.js';

const DEFAULT_CENTER = MAP_FALLBACK_CENTER;
const DEFAULT_ZOOM = 10;
const ACCENT = MAP_ACCENT;
const WORKER_URL = 'assets/js/vendor/maplibre-gl-csp-worker.js';
/** Plus bas = molette plus douce (défaut MapLibre ≈ 1/450). */
const WHEEL_ZOOM_RATE = 1 / 680;

export const MAP_LAYER_CONTROLS = [
  { id: 'activities', label: 'Activités', icon: 'activity' },
  { id: 'restaurants', label: 'Restaurants', icon: 'restaurant' },
  { id: 'travels', label: 'Voyages', icon: 'travel' },
];

function getLayerAriaLabel(label, visible) {
  return visible
    ? `${label} — affichage activé`
    : `${label} — affichage désactivé`;
}

function formatLayerFeedbackMessage(label, visible) {
  return visible
    ? `${label} - affichage activé`
    : `${label} - affichage désactivé`;
}

function formatCategoryViewPhrase({ id, label }) {
  const lower = label.toLowerCase();
  if (id === 'activities') return `toutes les ${lower}`;
  return `tous les ${lower}`;
}

function formatFitAllFeedbackMessage() {
  const visible = MAP_LAYER_CONTROLS.filter(({ id }) => isMapLayerVisible(id));
  if (visible.length === 0) return 'Vue globale';
  if (visible.length === MAP_LAYER_CONTROLS.length) return 'Vue tous les lieux';

  const phrases = visible.map(formatCategoryViewPhrase);
  if (phrases.length === 1) return `Vue ${phrases[0]}`;
  if (phrases.length === 2) return `Vue ${phrases[0]} et ${phrases[1]}`;
  return `Vue ${phrases.slice(0, -1).join(', ')} et ${phrases.at(-1)}`;
}

function configureScrollZoom(map) {
  map.scrollZoom.setWheelZoomRate(WHEEL_ZOOM_RATE);
}

let mapInstance = null;
let resizeObserver = null;
let userLocationSourceReady = false;
let lastUserLocation = null;
let onLayerToggled = null;
let stopUserLocationListener = null;

function getMapLibre() {
  const maplibregl = window.maplibregl;
  if (!maplibregl) throw new Error('MapLibre GL is not loaded');
  return maplibregl;
}

function ensureUserLocationSource(map) {
  if (userLocationSourceReady && map.getSource('user-location')) return;

  if (!map.getSource('user-location')) {
    map.addSource('user-location', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }

  if (!map.getLayer('user-location-pulse')) {
    map.addLayer({
      id: 'user-location-pulse',
      type: 'circle',
      source: 'user-location',
      paint: {
        'circle-radius': 18,
        'circle-color': ACCENT,
        'circle-opacity': 0.12,
        'circle-stroke-width': 1,
        'circle-stroke-color': ACCENT,
        'circle-stroke-opacity': 0.28,
      },
    });
  }

  if (!map.getLayer('user-location-dot')) {
    map.addLayer({
      id: 'user-location-dot',
      type: 'circle',
      source: 'user-location',
      paint: {
        'circle-radius': 8,
        'circle-color': ACCENT,
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
      },
    });
  }

  userLocationSourceReady = true;
}

function clearUserLocationOnMap(map, root) {
  lastUserLocation = null;
  if (!map?.isStyleLoaded()) return;
  if (map.getSource('user-location')) {
    map.getSource('user-location').setData({ type: 'FeatureCollection', features: [] });
  }
}

function setUserLocation(map, lngLat) {
  if (!map.isStyleLoaded()) {
    map.once('load', () => setUserLocation(map, lngLat));
    return;
  }

  ensureUserLocationSource(map);
  lastUserLocation = lngLat;
  map.getSource('user-location').setData({
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'Point', coordinates: lngLat },
    }],
  });
}

function clearUserLocationSource() {
  userLocationSourceReady = false;
  lastUserLocation = null;
}

export function getLastUserLocation() {
  if (!isUserLocationEnabled()) return null;
  return lastUserLocation ?? getUserLocationLngLat();
}

const MAP_ICON_OPTS = { strokeWidth: 1.75, width: 15, height: 15 };
let locateFeedbackTimer = null;
let mapViewMode = 'local';

function syncMapViewButtons(root, mode = mapViewMode) {
  const locateBtn = root?.querySelector('[data-map-action="locate"]');
  const fitAllBtn = root?.querySelector('[data-map-action="fit-all"]');
  if (!locateBtn || !fitAllBtn) return;

  mapViewMode = mode;
  const isLocal = mode === 'local';

  locateBtn.classList.toggle('is-active', isLocal);
  locateBtn.setAttribute('aria-pressed', isLocal ? 'true' : 'false');

  fitAllBtn.classList.toggle('is-active', !isLocal);
  fitAllBtn.setAttribute('aria-pressed', !isLocal ? 'true' : 'false');
}

function syncMapUserLocation(map, root, lngLat) {
  if (!isUserLocationEnabled() || !lngLat) {
    clearUserLocationOnMap(map, root);
    return;
  }
  setUserLocation(map, lngLat);
}

function focusMapOnLocalArea(map, lngLat) {
  fitMapToLocalArea(map, { center: lngLat });
}

function showLocateFeedback(root, message, { isError = false, variant } = {}) {
  const feedback = root.querySelector('#map-locate-feedback');
  if (!feedback) return;

  const resolvedVariant = variant ?? (isError ? 'error' : 'default');

  window.clearTimeout(locateFeedbackTimer);
  feedback.textContent = message;
  feedback.classList.remove('is-error', 'is-warning');
  if (resolvedVariant === 'error') feedback.classList.add('is-error');
  if (resolvedVariant === 'warning') feedback.classList.add('is-warning');
  feedback.classList.remove('hidden');

  locateFeedbackTimer = window.setTimeout(() => {
    feedback.classList.add('hidden');
    feedback.textContent = '';
    feedback.classList.remove('is-error', 'is-warning');
  }, resolvedVariant === 'error' ? 5000 : 2500);
}

export function showMapControlFeedback(message, options = {}) {
  const root = document.getElementById('map-controls');
  if (!root) return;
  showLocateFeedback(root, message, options);
}

function clearLocateFeedbackTimer() {
  window.clearTimeout(locateFeedbackTimer);
  locateFeedbackTimer = null;
}

function renderLayerControlButton({ id, label, icon }) {
  return `
    <button
      type="button"
      class="act-view-switch-btn map-control-btn--layer is-active"
      data-map-layer="${id}"
      aria-label="${getLayerAriaLabel(label, true)}"
      aria-pressed="true"
    >
      ${renderNavIcon(icon, MAP_ICON_OPTS)}
    </button>
  `;
}

export function syncMapLayerButtons(root = document.getElementById('map-controls')) {
  if (!root) return;

  MAP_LAYER_CONTROLS.forEach(({ id, label }) => {
    const visible = isMapLayerVisible(id);
    const btn = root.querySelector(`[data-map-layer="${id}"]`);
    if (!btn) return;

    btn.classList.toggle('is-active', visible);
    btn.setAttribute('aria-pressed', visible ? 'true' : 'false');
    btn.setAttribute('aria-label', getLayerAriaLabel(label, visible));
  });
}

function setLayerToggle(map, root, layerId, visible) {
  const control = MAP_LAYER_CONTROLS.find((entry) => entry.id === layerId);
  if (!control) return;

  setMapLayerVisible(map, layerId, visible);
  syncMapLayerButtons(root);
  showLocateFeedback(root, formatLayerFeedbackMessage(control.label, visible));
  onLayerToggled?.();
}

function bindControlButtons(map, root, signal) {
  root.addEventListener('click', (event) => {
    const btn = event.target.closest('button');
    if (btn && root.contains(btn)) btn.blur();
  }, { signal });

  const locateBtn = root.querySelector('[data-map-action="locate"]');
  const fitAllBtn = root.querySelector('[data-map-action="fit-all"]');

  fitAllBtn?.addEventListener('click', () => {
    const fitted = fitMapToVisibleMarkers(map, { userLocation: getLastUserLocation() });
    if (!fitted) {
      showLocateFeedback(root, 'Cadrage impossible', { variant: 'warning' });
      return;
    }
    syncMapViewButtons(root, 'all');
    showLocateFeedback(root, formatFitAllFeedbackMessage());
  }, { signal });

  locateBtn?.addEventListener('click', async () => {
    if (!isUserLocationEnabled()) {
      showLocateFeedback(root, 'Localisation désactivée dans les paramètres.', { variant: 'warning' });
      return;
    }

    if (!navigator.geolocation) {
      showLocateFeedback(root, 'La géolocalisation n’est pas disponible sur cet appareil.', { isError: true });
      return;
    }

    locateBtn.classList.add('is-loading');
    locateBtn.setAttribute('aria-busy', 'true');
    locateBtn.classList.remove('has-error');

    try {
      const lngLat = await requestUserLocationUpdate();
      if (!lngLat) throw Object.assign(new Error('unavailable'), { code: 2 });
      syncMapUserLocation(map, root, lngLat);
      focusMapOnLocalArea(map, lngLat);
      syncMapViewButtons(root, 'local');
      showLocateFeedback(root, 'Vue rayon 3 km');
    } catch (error) {
      locateBtn.classList.add('has-error');
      showLocateFeedback(root, getGeolocationUserMessage(error), { isError: true });
    } finally {
      locateBtn.classList.remove('is-loading');
      locateBtn.setAttribute('aria-busy', 'false');
    }
  }, { signal });

  root.querySelectorAll('[data-map-layer]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const layerId = btn.dataset.mapLayer;
      const nextVisible = !btn.classList.contains('is-active');
      setLayerToggle(map, root, layerId, nextVisible);
    }, { signal });
  });
}

export function initInteractiveMap({
  signal,
  onLayerToggled: layerToggledHandler,
  onMarkerClick,
  onMarkersReady,
} = {}) {
  destroyInteractiveMap();

  onLayerToggled = layerToggledHandler ?? null;
  setMapMarkerClickHandler(onMarkerClick);

  const container = document.getElementById('interactive-map');
  const controlsRoot = document.getElementById('map-controls');
  if (!container || !controlsRoot) return null;

  const maplibregl = getMapLibre();
  maplibregl.setWorkerUrl(WORKER_URL);

  mapInstance = new maplibregl.Map({
    container,
    style: OUR_SPACE_MAP_STYLE,
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    minZoom: 3,
    maxZoom: 19,
    attributionControl: false,
    pitch: 0,
    bearing: 0,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
  });

  bindMapMarkerImageFallback(mapInstance);

  stopUserLocationListener = onUserLocationChange((lngLat) => {
    if (mapInstance) syncMapUserLocation(mapInstance, controlsRoot, lngLat);
  });

  mapInstance.on('load', () => {
    configureScrollZoom(mapInstance);
    syncMapUserLocation(mapInstance, controlsRoot, getUserLocationLngLat());
    mapInstance?.resize();
    fitMapToLocalArea(mapInstance, {
      center: getUserLocationLngLat() || MAP_FALLBACK_CENTER,
      duration: 0,
    });
    refreshMapMarkers(mapInstance, { onUpdated: () => onMarkersReady?.(mapInstance) });
  });

  controlsRoot.innerHTML = `
    <p class="map-locate-feedback hidden" id="map-locate-feedback" role="status" aria-live="polite"></p>
    <div class="act-view-switch map-control-stack" role="group" aria-label="Contrôles carte">
      <button type="button" class="act-view-switch-btn" data-map-action="fit-all" aria-label="Vue tous les lieux" aria-pressed="false">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
        </svg>
      </button>
      <button type="button" class="act-view-switch-btn is-active" data-map-action="locate" aria-label="Vue rayon 3 km" aria-pressed="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polygon points="3 11 22 2 13 21 11 13 3 11"/>
        </svg>
      </button>
      ${MAP_LAYER_CONTROLS.map(renderLayerControlButton).join('')}
      <button
        type="button"
        class="act-view-switch-btn map-control-btn--filters"
        id="map-filter-btn"
        aria-label="Filtres"
      >
        ${renderNavIcon('filter', MAP_ICON_OPTS)}
        <span class="act-filter-badge hidden" aria-hidden="true">0</span>
      </button>
    </div>
  `;

  bindControlButtons(mapInstance, controlsRoot, signal);
  syncMapViewButtons(controlsRoot, 'local');

  const invalidate = () => {
    if (!mapInstance) return;
    window.requestAnimationFrame(() => mapInstance?.resize());
  };

  resizeObserver = new ResizeObserver(invalidate);
  resizeObserver.observe(container);

  window.addEventListener('resize', invalidate, { signal });
  signal?.addEventListener('abort', destroyInteractiveMap, { once: true });

  invalidate();
  return mapInstance;
}

export function getInteractiveMap() {
  return mapInstance;
}

export function destroyInteractiveMap() {
  resizeObserver?.disconnect();
  resizeObserver = null;
  onLayerToggled = null;
  stopUserLocationListener?.();
  stopUserLocationListener = null;
  clearLocateFeedbackTimer();
  clearUserLocationSource();
  resetMapMarkersState();
  mapViewMode = 'local';

  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
}

export function refreshInteractiveMap(options = {}) {
  mapInstance?.resize();
  refreshMapMarkers(mapInstance, options);
}
