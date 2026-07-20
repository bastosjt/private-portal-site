import { MAP_ACCENT } from '../../config.js';

const SOURCE_ID = 'user-location';
const PULSE_LAYER_ID = 'user-location-pulse';
const DOT_LAYER_ID = 'user-location-dot';

export const USER_LOCATION_PULSE_DURATION_MS = 2400;
export const USER_LOCATION_PULSE_RADIUS = { min: 10, max: 34 };

const pulseState = new WeakMap();

function stopPulse(map) {
  const state = pulseState.get(map);
  if (!state) return;
  if (state.frame != null) cancelAnimationFrame(state.frame);
  pulseState.delete(map);
}

function tickPulse(map) {
  if (!map?.getLayer(PULSE_LAYER_ID)) {
    stopPulse(map);
    return;
  }

  let state = pulseState.get(map);
  if (!state) {
    state = { startedAt: performance.now(), frame: null };
    pulseState.set(map, state);
  }

  const elapsed = (performance.now() - state.startedAt) % USER_LOCATION_PULSE_DURATION_MS;
  const progress = elapsed / USER_LOCATION_PULSE_DURATION_MS;
  const fade = Math.sin(Math.PI * progress);
  const { min, max } = USER_LOCATION_PULSE_RADIUS;
  const radius = min + (max - min) * ((1 - Math.cos(Math.PI * progress)) / 2);

  map.setPaintProperty(PULSE_LAYER_ID, 'circle-radius', radius);
  map.setPaintProperty(PULSE_LAYER_ID, 'circle-opacity', fade * 0.26);
  map.setPaintProperty(PULSE_LAYER_ID, 'circle-stroke-opacity', fade * 0.42);

  state.frame = requestAnimationFrame(() => tickPulse(map));
}

function startPulse(map) {
  const state = pulseState.get(map);
  if (state?.frame != null) return;

  if (!pulseState.has(map)) {
    pulseState.set(map, { startedAt: performance.now(), frame: null });
  } else {
    pulseState.get(map).startedAt = performance.now();
  }

  tickPulse(map);
}

function ensureUserLocationLayers(map, accent) {
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }

  if (!map.getLayer(PULSE_LAYER_ID)) {
    map.addLayer({
      id: PULSE_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': USER_LOCATION_PULSE_RADIUS.min,
        'circle-color': accent,
        'circle-opacity': 0.28,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': accent,
        'circle-stroke-opacity': 0.46,
      },
    });
  }

  if (!map.getLayer(DOT_LAYER_ID)) {
    map.addLayer({
      id: DOT_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': 8,
        'circle-color': accent,
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
      },
    });
  }
}

function applyUserLocation(map, lngLat, accent) {
  ensureUserLocationLayers(map, accent);
  map.getSource(SOURCE_ID).setData({
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'Point', coordinates: lngLat },
    }],
  });
  startPulse(map);
}

export function syncMapUserLocationLayer(map, lngLat, { accent = MAP_ACCENT } = {}) {
  if (!map) return;

  if (!lngLat) {
    clearMapUserLocationLayer(map);
    return;
  }

  if (!map.isStyleLoaded()) {
    map.once('load', () => applyUserLocation(map, lngLat, accent));
    return;
  }

  applyUserLocation(map, lngLat, accent);
}

export function clearMapUserLocationLayer(map) {
  stopPulse(map);
  if (!map?.isStyleLoaded()) return;
  if (map.getSource(SOURCE_ID)) {
    map.getSource(SOURCE_ID).setData({ type: 'FeatureCollection', features: [] });
  }
}

export function destroyMapUserLocationLayer(map) {
  stopPulse(map);
}
