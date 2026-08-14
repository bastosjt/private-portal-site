import { getMapMarkersFromCache } from '../../data/appDataCache.js';
import { getPinTagValue, getTagBadgeImageId } from '../../lib/item-tags.js';
import { getTravelLinkId, isTravelLinkedItem } from '../../lib/travel-link.js';
import { devWarn } from '../../lib/dev-log.js';
import { getLngLatDeltaForRadiusKm } from '../../lib/geo-utils.js';
import {
  ensureMapMarkerImages,
  getMarkerIconImageId,
  bindMapMarkerImageFallback,
  MAP_MARKER_DONE_BADGE_ID,
  MAP_MARKER_LIMITED_BADGE_ID,
} from './map-marker-images.js';
import {
  ensureTravelZoneLayers,
  resetTravelZonesState,
  syncTravelZoneVisibility,
  syncTravelZones,
} from './map-travel-zones.js';

const MAP_FALLBACK_CENTER = [2.3522, 48.8566]; // Paris
const MAP_LOCAL_RADIUS_KM = 3;

export { MAP_FALLBACK_CENTER, MAP_LOCAL_RADIUS_KM };

const MARKER_LAYERS = [
  { id: 'activities', color: '#f97316' },
  { id: 'restaurants', color: '#f43f5e' },
  { id: 'travels', color: '#0ea5e9' },
];

const layerVisibility = {
  activities: true,
  restaurants: true,
  travels: true,
};

const markerFilters = {
  status: 'all',
  activityType: [],
  restaurantType: [],
  restaurantCuisine: [],
  travelType: [],
};

let markersSourceReady = false;
let markerInteractionsBound = false;
let markersLayersPromise = null;
let markerClickHandler = null;
let selectedMarker = null;
let hiddenMarker = null;
let initialFitDone = false;

const MARKERS_SYMBOL_LAYER_ID = 'map-markers-symbols';
const MARKERS_DONE_BADGE_LAYER_ID = 'map-markers-done-badge';
const MARKERS_LIMITED_BADGE_LAYER_ID = 'map-markers-limited-badge';
const MARKERS_TAG_BADGE_LAYER_ID = 'map-markers-tag-badge';
const MARKER_SORT_KEY = ['-', 0, ['get', 'lat']];

const DONE_PIN_OPACITY = 0.6;
const FADE_PROP = ['coalesce', ['to-number', ['get', 'fade']], 1];
const MARKER_ICON_OPACITY = [
  '*',
  ['case', ['==', ['get', 'done'], 1], DONE_PIN_OPACITY, 1],
  FADE_PROP,
];
const BADGE_ICON_OPACITY = FADE_PROP;
/** zoom doit rester l’entrée top-level de interpolate (contrainte MapLibre). */
const MARKER_ICON_SIZE = [
  'interpolate',
  ['linear'],
  ['zoom'],
  9, ['*', 0.7, FADE_PROP],
  12, ['*', 0.88, FADE_PROP],
  15, ['*', 1.05, FADE_PROP],
  18, ['*', 1.25, FADE_PROP],
];
const SELECTED_MARKER_ICON_SIZE = [
  'interpolate',
  ['linear'],
  ['zoom'],
  9, ['*', 0.84, FADE_PROP],
  12, ['*', 1.05, FADE_PROP],
  15, ['*', 1.26, FADE_PROP],
  18, ['*', 1.5, FADE_PROP],
];

/** Pins : fade à l’apparition / disparition (filtres, couches, mode voyage). */
const PIN_FADE_CATEGORIES = new Set(['activities', 'restaurants', 'travels']);
const PIN_FADE_MS = 340;
const PIN_ENTRANCE_STAGGER_MS = 32;
const PIN_ENTRANCE_MAX = 48;
const PIN_FADE_EASE = (t) => 1 - ((1 - t) ** 3);

let renderedPinEntries = new Map();
let pinAnimToken = 0;
let markersEverSynced = false;
let scheduledSyncMap = null;
let scheduledSyncAnimate = false;
let scheduledSyncRaf = 0;

const MARKER_LAYER_IDS = [
  MARKERS_SYMBOL_LAYER_ID,
  MARKERS_DONE_BADGE_LAYER_ID,
  MARKERS_LIMITED_BADGE_LAYER_ID,
  MARKERS_TAG_BADGE_LAYER_ID,
];
const INTERACTIVE_MARKER_LAYER_IDS = [
  ...MARKER_LAYER_IDS,
  'map-marker-selected',
];
const DONE_BADGE_FILTER = [
  'all',
  ['==', ['get', 'kind'], 'point'],
  ['==', ['get', 'done'], 1],
];
const LIMITED_BADGE_FILTER = [
  'all',
  ['==', ['get', 'kind'], 'point'],
  ['==', ['get', 'limitedDuration'], 1],
  ['==', ['get', 'done'], 0],
];
const TAG_BADGE_FILTER = [
  'all',
  ['==', ['get', 'kind'], 'point'],
  ['!=', ['coalesce', ['get', 'tagBadgeImage'], ''], ''],
  ['==', ['get', 'done'], 0],
  ['==', ['get', 'limitedDuration'], 0],
];
const SHOW_UNSELECTED_FILTER = [
  'all',
  ['==', ['get', 'kind'], 'point'],
  ['==', ['get', 'isSelected'], 0],
];

export function setMapMarkerClickHandler(handler) {
  markerClickHandler = handler ?? null;
}

function bindMapMarkerInteractions(map) {
  if (!map || markerInteractionsBound) return;

  const hoverLayers = [
    ...MARKER_LAYER_IDS,
    'map-marker-selected',
  ];

  for (const layerId of hoverLayers) {
    map.on('mouseenter', layerId, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
    });
  }

  map.on('click', (event) => {
    const features = map.queryRenderedFeatures(event.point, {
      layers: INTERACTIVE_MARKER_LAYER_IDS.filter((id) => map.getLayer(id)),
    });
    const feature = features[0];
    if (!feature || !markerClickHandler) return;

    markerClickHandler({
      categoryId: feature.properties.categoryId,
      itemId: feature.properties.itemId,
      coordinates: feature.geometry.coordinates,
    });
  });

  markerInteractionsBound = true;
}

function markerMatchesFilters(marker) {
  if (markerFilters.status === 'todo' && marker.done) return false;
  if (markerFilters.status === 'done' && !marker.done) return false;

  if (marker.categoryId === 'activities' && markerFilters.activityType.length > 0) {
    if (!markerFilters.activityType.includes(marker.activityType)) return false;
  }

  if (marker.categoryId === 'restaurants' && markerFilters.restaurantType.length > 0) {
    if (!markerFilters.restaurantType.includes(marker.restaurantType)) return false;
  }

  if (marker.categoryId === 'restaurants' && markerFilters.restaurantCuisine.length > 0) {
    if (!markerFilters.restaurantCuisine.includes(marker.restaurantCuisine)) return false;
  }

  if (marker.categoryId === 'travels' && markerFilters.travelType.length > 0) {
    if (!markerFilters.travelType.includes(marker.travelType)) return false;
  }

  return true;
}

function isTravelLinkedMarker(marker) {
  return isTravelLinkedItem({ travelId: marker.travelId });
}

let travelMode = false;
let selectedTravelId = '';
/** Aperçu accueil : afficher aussi restos / activités liés à un voyage. */
let includeTravelLinkedMarkers = false;

function isMarkerDisplayed(marker) {
  if (isMarkerHidden(marker)) return false;

  if (travelMode) {
    if (!selectedTravelId) return false;

    // Mode voyage : zone + lieux liés, pas le pin voyage lui-même
    if (marker.categoryId === 'travels') return false;

    if (isTravelLinkedMarker(marker)) {
      if (getTravelLinkId({ travelId: marker.travelId }) !== selectedTravelId) return false;
      if (!layerVisibility[marker.categoryId]) return false;
      return markerMatchesFilters(marker);
    }

    return false;
  }

  // Hors mode voyage : liés masqués, sauf aperçu « Autour de nous »
  if (isTravelLinkedMarker(marker)) {
    if (!includeTravelLinkedMarkers) return false;
    if (!layerVisibility[marker.categoryId]) return false;
    return markerMatchesFilters(marker);
  }

  if (marker.categoryId === 'travels') {
    if (!layerVisibility.travels) return false;
    return markerMatchesFilters(marker);
  }

  if (!layerVisibility[marker.categoryId]) return false;
  return markerMatchesFilters(marker);
}

function isMarkerHidden(marker) {
  if (!hiddenMarker) return false;
  return marker.categoryId === hiddenMarker.categoryId && marker.id === hiddenMarker.itemId;
}

export function getDisplayedMarkers() {
  return getMapMarkersFromCache().filter(isMarkerDisplayed);
}

export function setHiddenMapMarker(map, selection) {
  hiddenMarker = selection
    ? { categoryId: selection.categoryId, itemId: selection.itemId }
    : null;
  syncMarkerSource(map);
}

export function clearHiddenMapMarker(map) {
  setHiddenMapMarker(map, null);
}

function findSelectedMarker() {
  if (!selectedMarker) return null;
  return getMapMarkersFromCache().find(
    (marker) => marker.categoryId === selectedMarker.categoryId && marker.id === selectedMarker.itemId,
  );
}

function pruneSelectedMarkerIfHidden() {
  const marker = findSelectedMarker();
  if (!selectedMarker) return false;
  if (!marker || !isMarkerDisplayed(marker)) {
    selectedMarker = null;
    return true;
  }
  return false;
}

let onSelectionPruned = null;

export function setMapMarkerSelectionPrunedHandler(handler) {
  onSelectionPruned = handler ?? null;
}

function isMarkerSelected(marker) {
  if (!selectedMarker || !isMarkerDisplayed(marker)) return false;
  return selectedMarker.categoryId === marker.categoryId && selectedMarker.itemId === marker.id;
}

function getMarkersSymbolLayerFilter() {
  return SHOW_UNSELECTED_FILTER;
}

function getMarkerFeatureKey(marker) {
  return `${marker.categoryId}:${marker.id}`;
}

function shouldAnimatePinCategory(categoryId) {
  return PIN_FADE_CATEGORIES.has(categoryId);
}

function prefersReducedPinMotion() {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}

function buildPointFeature(entry) {
  const { marker, fade = 1 } = entry;
  const coords = marker.coordinates;
  const pinTag = getPinTagValue(marker.tags);
  const tagBadgeImage = pinTag ? getTagBadgeImageId(pinTag, marker.categoryId) : '';
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: coords },
    properties: {
      kind: 'point',
      categoryId: marker.categoryId,
      itemId: marker.id,
      title: marker.title,
      iconImage: getMarkerIconImageId(marker),
      done: marker.done ? 1 : 0,
      limitedDuration: marker.limitedDuration ? 1 : 0,
      tagBadgeImage,
      isSelected: isMarkerSelected(marker) ? 1 : 0,
      lat: coords[1],
      fade,
    },
  };
}

function buildFeatureCollectionFromEntries(entries) {
  const features = [];
  for (const entry of entries.values()) {
    features.push(buildPointFeature(entry));
  }
  return { type: 'FeatureCollection', features };
}

function buildFeatureCollection() {
  return buildFeatureCollectionFromEntries(renderedPinEntries);
}

function pushMarkerFeatures(map) {
  const source = map?.getSource('map-markers');
  if (!source) return;
  source.setData(buildFeatureCollectionFromEntries(renderedPinEntries));
}

function cancelPinFadeAnimation() {
  pinAnimToken += 1;
}

function buildNextRenderEntries(markers) {
  const next = new Map();
  for (const marker of markers) {
    next.set(getMarkerFeatureKey(marker), {
      marker,
      fade: 1,
    });
  }
  return next;
}

function commitRenderEntries(nextEntries) {
  renderedPinEntries = new Map(
    [...nextEntries.entries()].map(([key, entry]) => [
      key,
      { marker: entry.marker, fade: 1 },
    ]),
  );
}

function runPinFadeTransition(map, nextEntries, fadeInKeys, fadeOutEntries, { fadeInDelays = null } = {}) {
  cancelPinFadeAnimation();
  const token = pinAnimToken;
  const startedAt = performance.now();

  const working = new Map();
  for (const [key, entry] of nextEntries) {
    working.set(key, {
      marker: entry.marker,
      fade: fadeInKeys.has(key) ? 0 : 1,
    });
  }
  for (const [key, snapshot] of fadeOutEntries) {
    if (working.has(key)) continue;
    working.set(key, {
      marker: snapshot.marker,
      fade: snapshot.fade ?? 1,
    });
  }

  renderedPinEntries = working;
  pushMarkerFeatures(map);
  syncLayerVisibility(map);

  const step = (now) => {
    if (token !== pinAnimToken || !map?.getSource('map-markers')) return;
    const elapsed = now - startedAt;

    for (const [key, entry] of renderedPinEntries) {
      if (fadeInKeys.has(key)) {
        const delay = fadeInDelays?.get(key) ?? 0;
        const localProgress = Math.min(1, Math.max(0, (elapsed - delay) / PIN_FADE_MS));
        entry.fade = PIN_FADE_EASE(localProgress);
      } else if (fadeOutEntries.has(key)) {
        const from = fadeOutEntries.get(key)?.fade ?? 1;
        const localProgress = Math.min(1, Math.max(0, elapsed / PIN_FADE_MS));
        entry.fade = from * (1 - PIN_FADE_EASE(localProgress));
      }
    }

    pushMarkerFeatures(map);

    const maxDelay = fadeInDelays
      ? Math.max(0, ...[...fadeInKeys].map((key) => fadeInDelays.get(key) ?? 0))
      : 0;
    const totalMs = PIN_FADE_MS + maxDelay;

    if (elapsed < totalMs) {
      requestAnimationFrame(step);
      return;
    }

    commitRenderEntries(nextEntries);
    pushMarkerFeatures(map);
    syncLayerVisibility(map);
  };

  requestAnimationFrame(step);
}

function runPinEntranceStagger(map, nextEntries) {
  const fadeInKeys = new Set();
  const fadeInDelays = new Map();
  let index = 0;

  for (const key of nextEntries.keys()) {
    if (index >= PIN_ENTRANCE_MAX) break;
    fadeInKeys.add(key);
    fadeInDelays.set(key, index * PIN_ENTRANCE_STAGGER_MS);
    index += 1;
  }

  if (!fadeInKeys.size) {
    commitRenderEntries(nextEntries);
    pushMarkerFeatures(map);
    syncLayerVisibility(map);
    return;
  }

  runPinFadeTransition(map, nextEntries, fadeInKeys, new Map(), { fadeInDelays });
}

function syncMarkerSourceNow(map, { animate = false } = {}) {
  if (!map?.getSource('map-markers')) return;

  const selectionCleared = pruneSelectedMarkerIfHidden();
  const nextMarkers = getDisplayedMarkers();
  const nextEntries = buildNextRenderEntries(nextMarkers);
  const isFirstSync = !markersEverSynced;

  if (isFirstSync && !prefersReducedPinMotion() && nextEntries.size > 0) {
    cancelPinFadeAnimation();
    runPinEntranceStagger(map, nextEntries);
    markersEverSynced = true;
    syncLayerVisibility(map);
    if (selectionCleared) onSelectionPruned?.();
    return;
  }

  const canAnimate = animate && markersEverSynced && !prefersReducedPinMotion();

  if (!canAnimate) {
    cancelPinFadeAnimation();
    commitRenderEntries(nextEntries);
    markersEverSynced = true;
    pushMarkerFeatures(map);
    syncLayerVisibility(map);
    if (selectionCleared) onSelectionPruned?.();
    return;
  }

  const prevEntries = renderedPinEntries;
  const fadeInKeys = new Set();
  const fadeOutEntries = new Map();

  for (const [key, entry] of nextEntries) {
    if (prevEntries.has(key)) continue;
    if (shouldAnimatePinCategory(entry.marker.categoryId)) {
      fadeInKeys.add(key);
    }
  }

  for (const [key, entry] of prevEntries) {
    if (nextEntries.has(key)) continue;
    if (shouldAnimatePinCategory(entry.marker.categoryId)) {
      fadeOutEntries.set(key, {
        marker: entry.marker,
        fade: entry.fade ?? 1,
      });
    }
  }

  if (!fadeInKeys.size && !fadeOutEntries.size) {
    cancelPinFadeAnimation();
    commitRenderEntries(nextEntries);
    pushMarkerFeatures(map);
    syncLayerVisibility(map);
    if (selectionCleared) onSelectionPruned?.();
    return;
  }

  runPinFadeTransition(map, nextEntries, fadeInKeys, fadeOutEntries);
  if (selectionCleared) onSelectionPruned?.();
}

/** Coalesce les syncs du même frame (filtres + couches). */
function syncMarkerSource(map, { animate = false } = {}) {
  if (!map) return;
  scheduledSyncMap = map;
  scheduledSyncAnimate = scheduledSyncAnimate || animate;
  if (scheduledSyncRaf) return;

  scheduledSyncRaf = requestAnimationFrame(() => {
    scheduledSyncRaf = 0;
    const target = scheduledSyncMap;
    const shouldAnimate = scheduledSyncAnimate;
    scheduledSyncMap = null;
    scheduledSyncAnimate = false;
    if (target) syncMarkerSourceNow(target, { animate: shouldAnimate });
  });
}

function syncLayerVisibility(map) {
  if (!map?.getLayer) return;

  if (map.getLayer(MARKERS_SYMBOL_LAYER_ID)) {
    map.setFilter(MARKERS_SYMBOL_LAYER_ID, getMarkersSymbolLayerFilter());
  }

  if (map.getLayer('map-marker-selected')) {
    const selected = findSelectedMarker();
    const showSelected = Boolean(selected && isMarkerDisplayed(selected));
    map.setLayoutProperty('map-marker-selected', 'visibility', showSelected ? 'visible' : 'none');
  }

  syncTravelZoneVisibility(map, layerVisibility.travels);
}

function getTravelMarkersForZones() {
  return getMapMarkersFromCache().filter((marker) => {
    if (marker.categoryId !== 'travels') return false;
    if (!layerVisibility.travels) return false;
    if (!markerMatchesFilters(marker)) return false;
    if (travelMode) {
      return Boolean(selectedTravelId) && marker.id === selectedTravelId;
    }
    return true;
  });
}

async function syncTravelMapZones(map) {
  ensureTravelZoneLayers(map);
  await syncTravelZones(map, {
    markers: getTravelMarkersForZones(),
    visible: isMapLayerVisible('travels'),
  });
}

export async function refreshTravelMapZones(map) {
  if (!map) return;
  await syncTravelMapZones(map);
}

export function setSelectedMapMarker(map, selection) {
  selectedMarker = selection
    ? { categoryId: selection.categoryId, itemId: selection.itemId }
    : null;
  syncMarkerSource(map);
}

export function clearSelectedMapMarker(map) {
  setSelectedMapMarker(map, null);
}

/** Padding fitBounds : laisse la search + dock + tête des pins hors du cadre. */
function getMapFitPadding() {
  const mapEl = document.getElementById('interactive-map');
  const search = document.querySelector('.map-page .map-search');
  const pinHeadroom = 52;
  let top = 80 + pinHeadroom;

  if (mapEl && search) {
    const mapBox = mapEl.getBoundingClientRect();
    const searchBox = search.getBoundingClientRect();
    top = Math.max(top, Math.ceil(searchBox.bottom - mapBox.top) + pinHeadroom);
  }

  return {
    top,
    bottom: 120,
    left: 60,
    right: 60,
  };
}

export function fitMapToLocalArea(map, {
  center = MAP_FALLBACK_CENTER,
  radiusKm = MAP_LOCAL_RADIUS_KM,
  padding = getMapFitPadding(),
  maxZoom = 13,
  duration = 900,
} = {}) {
  const maplibregl = window.maplibregl;
  if (!map || !maplibregl || !center) return false;

  const [lng, lat] = center;
  const { latDelta, lngDelta } = getLngLatDeltaForRadiusKm(lat, radiusKm);
  const bounds = new maplibregl.LngLatBounds(
    [lng - lngDelta, lat - latDelta],
    [lng + lngDelta, lat + latDelta],
  );

  map.fitBounds(bounds, { padding, maxZoom, duration, essential: true });
  return true;
}

function fitMapToPoints(map, points, { padding, maxZoom, duration }) {
  if (points.length === 1) {
    map.flyTo({
      center: points[0],
      zoom: maxZoom,
      duration,
      essential: true,
      padding: padding || getMapFitPadding(),
    });
    return;
  }

  const maplibregl = window.maplibregl;
  const bounds = new maplibregl.LngLatBounds(points[0], points[0]);
  for (const point of points.slice(1)) bounds.extend(point);
  map.fitBounds(bounds, { padding, maxZoom, duration, essential: true });
}

export function fitMapToVisibleMarkers(map, {
  padding = getMapFitPadding(),
  maxZoom = 15,
  duration = 900,
  userLocation = null,
} = {}) {
  if (!map || !window.maplibregl) return false;

  const markerPoints = getDisplayedMarkers().map((marker) => marker.coordinates);
  if (markerPoints.length > 0) {
    fitMapToPoints(map, markerPoints, { padding, maxZoom, duration });
    return 'markers';
  }

  if (userLocation) {
    map.flyTo({ center: userLocation, zoom: maxZoom, duration, essential: true });
    return 'location';
  }

  return false;
}

export function tryInitialMapFit(map, { skip = false, userLocation = null } = {}) {
  if (skip || initialFitDone || !map) return false;

  const canvas = map.getCanvas();
  if (!canvas || canvas.width < 2 || canvas.height < 2) return false;

  const center = userLocation || MAP_FALLBACK_CENTER;
  const fitted = fitMapToLocalArea(map, { center, duration: 900 });
  if (fitted) initialFitDone = true;
  return fitted ? 'local' : false;
}

export function resetMapPageFit() {
  initialFitDone = false;
}

function markersAreMounted(map) {
  return Boolean(map?.getSource('map-markers'));
}

function removeLegacyMarkerLayers(map) {
  for (const layer of MARKER_LAYERS) {
    const legacyLayerId = `map-markers-${layer.id}`;
    if (map.getLayer(legacyLayerId)) map.removeLayer(legacyLayerId);
  }
}

function ensureMarkersSymbolLayer(map) {
  removeLegacyMarkerLayers(map);

  if (map.getLayer(MARKERS_SYMBOL_LAYER_ID)) {
    map.setFilter(MARKERS_SYMBOL_LAYER_ID, getMarkersSymbolLayerFilter());
    map.setLayoutProperty(MARKERS_SYMBOL_LAYER_ID, 'symbol-sort-key', MARKER_SORT_KEY);
    map.setLayoutProperty(MARKERS_SYMBOL_LAYER_ID, 'symbol-z-order', 'auto');
    map.setLayoutProperty(MARKERS_SYMBOL_LAYER_ID, 'icon-size', MARKER_ICON_SIZE);
    map.setPaintProperty(MARKERS_SYMBOL_LAYER_ID, 'icon-opacity', MARKER_ICON_OPACITY);
    return;
  }

  map.addLayer({
    id: MARKERS_SYMBOL_LAYER_ID,
    type: 'symbol',
    source: 'map-markers',
    filter: getMarkersSymbolLayerFilter(),
    layout: {
      'icon-image': ['get', 'iconImage'],
      'icon-size': MARKER_ICON_SIZE,
      'icon-anchor': 'bottom',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'symbol-sort-key': MARKER_SORT_KEY,
      'symbol-z-order': 'auto',
    },
    paint: {
      'icon-opacity': MARKER_ICON_OPACITY,
    },
  });
}

function ensureDoneBadgeLayer(map) {
  if (map.getLayer(MARKERS_DONE_BADGE_LAYER_ID)) {
    map.setFilter(MARKERS_DONE_BADGE_LAYER_ID, DONE_BADGE_FILTER);
    map.setLayoutProperty(MARKERS_DONE_BADGE_LAYER_ID, 'symbol-sort-key', MARKER_SORT_KEY);
    map.setLayoutProperty(MARKERS_DONE_BADGE_LAYER_ID, 'symbol-z-order', 'auto');
    map.setLayoutProperty(MARKERS_DONE_BADGE_LAYER_ID, 'icon-size', MARKER_ICON_SIZE);
    map.setPaintProperty(MARKERS_DONE_BADGE_LAYER_ID, 'icon-opacity', BADGE_ICON_OPACITY);
    return;
  }

  map.addLayer({
    id: MARKERS_DONE_BADGE_LAYER_ID,
    type: 'symbol',
    source: 'map-markers',
    filter: DONE_BADGE_FILTER,
    layout: {
      'icon-image': MAP_MARKER_DONE_BADGE_ID,
      'icon-size': MARKER_ICON_SIZE,
      'icon-anchor': 'bottom',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'symbol-sort-key': MARKER_SORT_KEY,
      'symbol-z-order': 'auto',
    },
    paint: {
      'icon-opacity': BADGE_ICON_OPACITY,
    },
  });
}

function ensureLimitedBadgeLayer(map) {
  if (map.getLayer(MARKERS_LIMITED_BADGE_LAYER_ID)) {
    map.setFilter(MARKERS_LIMITED_BADGE_LAYER_ID, LIMITED_BADGE_FILTER);
    map.setLayoutProperty(MARKERS_LIMITED_BADGE_LAYER_ID, 'symbol-sort-key', MARKER_SORT_KEY);
    map.setLayoutProperty(MARKERS_LIMITED_BADGE_LAYER_ID, 'symbol-z-order', 'auto');
    map.setLayoutProperty(MARKERS_LIMITED_BADGE_LAYER_ID, 'icon-size', MARKER_ICON_SIZE);
    map.setPaintProperty(MARKERS_LIMITED_BADGE_LAYER_ID, 'icon-opacity', BADGE_ICON_OPACITY);
    return;
  }

  map.addLayer({
    id: MARKERS_LIMITED_BADGE_LAYER_ID,
    type: 'symbol',
    source: 'map-markers',
    filter: LIMITED_BADGE_FILTER,
    layout: {
      'icon-image': MAP_MARKER_LIMITED_BADGE_ID,
      'icon-size': MARKER_ICON_SIZE,
      'icon-anchor': 'bottom',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'symbol-sort-key': MARKER_SORT_KEY,
      'symbol-z-order': 'auto',
    },
    paint: {
      'icon-opacity': BADGE_ICON_OPACITY,
    },
  });
}

function ensureTagBadgeLayer(map) {
  if (map.getLayer(MARKERS_TAG_BADGE_LAYER_ID)) {
    map.setFilter(MARKERS_TAG_BADGE_LAYER_ID, TAG_BADGE_FILTER);
    map.setLayoutProperty(MARKERS_TAG_BADGE_LAYER_ID, 'symbol-sort-key', MARKER_SORT_KEY);
    map.setLayoutProperty(MARKERS_TAG_BADGE_LAYER_ID, 'symbol-z-order', 'auto');
    map.setLayoutProperty(MARKERS_TAG_BADGE_LAYER_ID, 'icon-size', MARKER_ICON_SIZE);
    map.setPaintProperty(MARKERS_TAG_BADGE_LAYER_ID, 'icon-opacity', BADGE_ICON_OPACITY);
    return;
  }

  map.addLayer({
    id: MARKERS_TAG_BADGE_LAYER_ID,
    type: 'symbol',
    source: 'map-markers',
    filter: TAG_BADGE_FILTER,
    layout: {
      'icon-image': ['get', 'tagBadgeImage'],
      'icon-size': MARKER_ICON_SIZE,
      'icon-anchor': 'bottom',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'symbol-sort-key': MARKER_SORT_KEY,
      'symbol-z-order': 'auto',
    },
    paint: {
      'icon-opacity': BADGE_ICON_OPACITY,
    },
  });
}

function removeLegacyClusterLayers(map) {
  for (const layerId of ['map-marker-clusters', 'map-marker-cluster-count']) {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
  }
}

function ensureSelectedMarkerLayer(map) {
  if (map.getLayer('map-marker-selected')) {
    map.setFilter('map-marker-selected', [
      'all',
      ['==', ['get', 'kind'], 'point'],
      ['==', ['get', 'isSelected'], 1],
    ]);
    map.setLayoutProperty('map-marker-selected', 'symbol-sort-key', MARKER_SORT_KEY);
    map.setLayoutProperty('map-marker-selected', 'symbol-z-order', 'auto');
    map.setLayoutProperty('map-marker-selected', 'icon-size', SELECTED_MARKER_ICON_SIZE);
    map.setPaintProperty('map-marker-selected', 'icon-opacity', MARKER_ICON_OPACITY);
    return;
  }

  map.addLayer({
    id: 'map-marker-selected',
    type: 'symbol',
    source: 'map-markers',
    filter: [
      'all',
      ['==', ['get', 'kind'], 'point'],
      ['==', ['get', 'isSelected'], 1],
    ],
    layout: {
      'icon-image': ['get', 'iconImage'],
      'icon-size': SELECTED_MARKER_ICON_SIZE,
      'icon-anchor': 'bottom',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'symbol-sort-key': MARKER_SORT_KEY,
      'symbol-z-order': 'auto',
    },
    paint: {
      'icon-opacity': MARKER_ICON_OPACITY,
    },
  });
}

export async function ensureMapMarkerLayers(map) {
  if (!map) return;

  if (markersSourceReady && !markersAreMounted(map)) {
    markersSourceReady = false;
    markerInteractionsBound = false;
  }

  if (markersSourceReady && markersAreMounted(map)) {
    removeLegacyClusterLayers(map);
    ensureTagBadgeLayer(map);
    return Promise.resolve();
  }

  if (markersAreMounted(map)) {
    markersSourceReady = true;
    removeLegacyClusterLayers(map);
    ensureMarkersSymbolLayer(map);
    ensureDoneBadgeLayer(map);
    ensureLimitedBadgeLayer(map);
    ensureTagBadgeLayer(map);
    ensureSelectedMarkerLayer(map);
    syncLayerVisibility(map);
    bindMapMarkerInteractions(map);
    ensureTravelZoneLayers(map);
    return Promise.resolve();
  }

  if (markersLayersPromise) return markersLayersPromise;

  markersLayersPromise = (async () => {
    try {
      const allMarkers = getMapMarkersFromCache();
      bindMapMarkerImageFallback(map);
      await ensureMapMarkerImages(map, allMarkers);

      if (!map) return;

      if (!map.getSource('map-markers')) {
        map.addSource('map-markers', {
          type: 'geojson',
          data: buildFeatureCollection(),
        });
      }

      removeLegacyClusterLayers(map);
      ensureMarkersSymbolLayer(map);
      ensureDoneBadgeLayer(map);
      ensureLimitedBadgeLayer(map);
      ensureTagBadgeLayer(map);
      ensureSelectedMarkerLayer(map);

      markersSourceReady = true;
      ensureTravelZoneLayers(map);
      syncLayerVisibility(map);
      bindMapMarkerInteractions(map);
    } finally {
      markersLayersPromise = null;
    }
  })();

  return markersLayersPromise;
}

export function refreshMapMarkers(map, { onUpdated } = {}) {
  if (!map) return;

  const runRefresh = () => {
    ensureMapMarkerLayers(map)
      .then(async () => {
        if (!map?.getSource('map-markers')) {
          markersSourceReady = false;
          return;
        }
        await ensureMapMarkerImages(map, getMapMarkersFromCache());
        syncMarkerSource(map);
        onUpdated?.();
        void syncTravelMapZones(map).catch((err) => {
          devWarn('syncTravelMapZones:', err.message);
        });
      })
      .catch((err) => {
        devWarn('refreshMapMarkers:', err.message);
      });
  };

  if (!map.isStyleLoaded()) {
    map.once('load', runRefresh);
    return;
  }

  runRefresh();
}

export function isMapLayerVisible(categoryId) {
  return layerVisibility[categoryId] ?? true;
}

export function setMapLayerVisible(map, categoryId, visible, { animate = false } = {}) {
  if (!(categoryId in layerVisibility)) return;
  layerVisibility[categoryId] = visible;
  if (map?.isStyleLoaded()) {
    syncMarkerSource(map, { animate });
    if (categoryId === 'travels') {
      syncTravelMapZones(map).catch((err) => {
        devWarn('syncTravelMapZones:', err.message);
      });
    }
  }
}

export function setMapMarkerFilters(next = {}, map = null, { animate = false } = {}) {
  markerFilters.status = next.status ?? 'all';
  markerFilters.activityType = [...(next.activityType || [])];
  markerFilters.restaurantType = [...(next.restaurantType || [])];
  markerFilters.restaurantCuisine = [...(next.restaurantCuisine || [])];
  markerFilters.travelType = [...(next.travelType || [])];
  if (map?.isStyleLoaded()) syncMarkerSource(map, { animate });
}

export function getMapMarkerFilters() {
  return {
    status: markerFilters.status,
    activityType: [...markerFilters.activityType],
    restaurantType: [...markerFilters.restaurantType],
    restaurantCuisine: [...markerFilters.restaurantCuisine],
    travelType: [...markerFilters.travelType],
  };
}

export function isTravelModeActive() {
  return travelMode;
}

export function getSelectedTravelId() {
  return selectedTravelId;
}

/** Affiche les lieux liés aux voyages hors mode voyage (aperçu accueil). */
export function setIncludeTravelLinkedMarkers(map, enabled = false) {
  includeTravelLinkedMarkers = Boolean(enabled);
  if (map?.isStyleLoaded()) syncMarkerSource(map);
}

export function setTravelModeState(map, { active = false, travelId = '' } = {}) {
  travelMode = Boolean(active);
  selectedTravelId = travelMode ? String(travelId || '') : '';

  if (travelMode) {
    layerVisibility.travels = true;
    layerVisibility.activities = true;
    layerVisibility.restaurants = true;
  }

  if (map?.isStyleLoaded()) {
    syncMarkerSource(map, { animate: true });
    syncTravelMapZones(map).catch((err) => {
      devWarn('syncTravelMapZones:', err.message);
    });
  }
}

export function resetMapMarkersState() {
  cancelPinFadeAnimation();
  if (scheduledSyncRaf) {
    cancelAnimationFrame(scheduledSyncRaf);
    scheduledSyncRaf = 0;
  }
  scheduledSyncMap = null;
  scheduledSyncAnimate = false;
  renderedPinEntries = new Map();
  markersEverSynced = false;
  markersSourceReady = false;
  markerInteractionsBound = false;
  markersLayersPromise = null;
  markerClickHandler = null;
  selectedMarker = null;
  hiddenMarker = null;
  onSelectionPruned = null;
  initialFitDone = false;
  travelMode = false;
  selectedTravelId = '';
  includeTravelLinkedMarkers = false;
  resetTravelZonesState();
  layerVisibility.activities = true;
  layerVisibility.restaurants = true;
  layerVisibility.travels = true;
  markerFilters.status = 'all';
  markerFilters.activityType = [];
  markerFilters.restaurantType = [];
  markerFilters.restaurantCuisine = [];
  markerFilters.travelType = [];
}
