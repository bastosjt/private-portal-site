import { getMapMarkersFromCache } from '../../data/appDataCache.js';
import { devWarn } from '../../lib/dev-log.js';
import { getLngLatDeltaForRadiusKm } from '../../lib/geo-utils.js';
import {
  ensureMapMarkerImages,
  getMarkerIconImageId,
  bindMapMarkerImageFallback,
  MAP_MARKER_DONE_BADGE_ID,
  MAP_MARKER_LIMITED_BADGE_ID,
  MAP_MARKER_TRAVEL_LINKED_BADGE_ID,
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
let initialFitDone = false;

const MARKERS_SYMBOL_LAYER_ID = 'map-markers-symbols';
const MARKERS_DONE_BADGE_LAYER_ID = 'map-markers-done-badge';
const MARKERS_LIMITED_BADGE_LAYER_ID = 'map-markers-limited-badge';
const MARKERS_TRAVEL_LINKED_BADGE_LAYER_ID = 'map-markers-travel-linked-badge';
const MARKER_SORT_KEY = ['-', 0, ['get', 'lat']];
const MARKER_LAYER_IDS = [
  MARKERS_SYMBOL_LAYER_ID,
  MARKERS_DONE_BADGE_LAYER_ID,
  MARKERS_LIMITED_BADGE_LAYER_ID,
  MARKERS_TRAVEL_LINKED_BADGE_LAYER_ID,
];
const INTERACTIVE_MARKER_LAYER_IDS = [...MARKER_LAYER_IDS, 'map-marker-selected'];

const BASE_ICON_SIZE = ['interpolate', ['linear'], ['zoom'], 9, 0.7, 12, 0.88, 15, 1.05, 18, 1.25];
const SELECTED_ICON_SIZE = ['interpolate', ['linear'], ['zoom'], 9, 0.84, 12, 1.05, 15, 1.26, 18, 1.5];
const DONE_PIN_OPACITY = 0.6;
const MARKER_ICON_OPACITY = ['case', ['==', ['get', 'done'], 1], DONE_PIN_OPACITY, 1];
const DONE_BADGE_FILTER = ['==', ['get', 'done'], 1];
const LIMITED_BADGE_FILTER = [
  'all',
  ['==', ['get', 'limitedDuration'], 1],
  ['==', ['get', 'done'], 0],
];
const TRAVEL_LINKED_BADGE_FILTER = ['==', ['get', 'travelLinked'], 1];
const SHOW_UNSELECTED_FILTER = ['==', ['get', 'isSelected'], 0];

export function setMapMarkerClickHandler(handler) {
  markerClickHandler = handler ?? null;
}

function bindMapMarkerInteractions(map) {
  if (!map || markerInteractionsBound || !markerClickHandler) return;

  for (const layerId of INTERACTIVE_MARKER_LAYER_IDS) {
    map.on('mouseenter', layerId, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
    });
  }

  map.on('click', (event) => {
    const features = map.queryRenderedFeatures(event.point, { layers: INTERACTIVE_MARKER_LAYER_IDS });
    const feature = features[0];
    if (!feature) return;

    markerClickHandler?.({
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
  return Boolean(marker.travelId);
}

function isMarkerDisplayed(marker) {
  if (isTravelLinkedMarker(marker)) {
    if (!layerVisibility.travels) return false;
    return markerMatchesFilters(marker);
  }

  if (marker.categoryId === 'travels') {
    if (!layerVisibility.travels) return false;
    return markerMatchesFilters(marker);
  }

  if (!layerVisibility[marker.categoryId]) return false;
  return markerMatchesFilters(marker);
}

export function getDisplayedMarkers() {
  return getMapMarkersFromCache().filter(isMarkerDisplayed);
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

function buildFeatureCollection() {
  const markers = getDisplayedMarkers();

  return {
    type: 'FeatureCollection',
    features: markers.map((marker) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: marker.coordinates },
      properties: {
        categoryId: marker.categoryId,
        itemId: marker.id,
        title: marker.title,
        iconImage: getMarkerIconImageId(marker),
        done: marker.done ? 1 : 0,
        limitedDuration: marker.limitedDuration ? 1 : 0,
        travelLinked: marker.travelId ? 1 : 0,
        isSelected: isMarkerSelected(marker) ? 1 : 0,
        lat: marker.coordinates[1],
      },
    })),
  };
}

function syncLayerVisibility(map) {
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
  return getDisplayedMarkers().filter((marker) => marker.categoryId === 'travels');
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

function syncMarkerSource(map) {
  if (!map?.getSource('map-markers')) return;
  const selectionCleared = pruneSelectedMarkerIfHidden();
  map.getSource('map-markers').setData(buildFeatureCollection());
  syncLayerVisibility(map);
  if (selectionCleared) onSelectionPruned?.();
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

export function fitMapToLocalArea(map, {
  center = MAP_FALLBACK_CENTER,
  radiusKm = MAP_LOCAL_RADIUS_KM,
  padding = { top: 80, bottom: 120, left: 60, right: 60 },
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
    map.flyTo({ center: points[0], zoom: maxZoom, duration, essential: true });
    return;
  }

  const maplibregl = window.maplibregl;
  const bounds = new maplibregl.LngLatBounds(points[0], points[0]);
  for (const point of points.slice(1)) bounds.extend(point);
  map.fitBounds(bounds, { padding, maxZoom, duration, essential: true });
}

export function fitMapToVisibleMarkers(map, {
  padding = { top: 80, bottom: 120, left: 60, right: 60 },
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
    return;
  }

  map.addLayer({
    id: MARKERS_SYMBOL_LAYER_ID,
    type: 'symbol',
    source: 'map-markers',
    filter: getMarkersSymbolLayerFilter(),
    layout: {
      'icon-image': ['get', 'iconImage'],
      'icon-size': BASE_ICON_SIZE,
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
    return;
  }

  map.addLayer({
    id: MARKERS_DONE_BADGE_LAYER_ID,
    type: 'symbol',
    source: 'map-markers',
    filter: DONE_BADGE_FILTER,
    layout: {
      'icon-image': MAP_MARKER_DONE_BADGE_ID,
      'icon-size': BASE_ICON_SIZE,
      'icon-anchor': 'bottom',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'symbol-sort-key': MARKER_SORT_KEY,
      'symbol-z-order': 'auto',
    },
    paint: {
      'icon-opacity': 1,
    },
  });
}

function ensureLimitedBadgeLayer(map) {
  if (map.getLayer(MARKERS_LIMITED_BADGE_LAYER_ID)) {
    map.setFilter(MARKERS_LIMITED_BADGE_LAYER_ID, LIMITED_BADGE_FILTER);
    map.setLayoutProperty(MARKERS_LIMITED_BADGE_LAYER_ID, 'symbol-sort-key', MARKER_SORT_KEY);
    map.setLayoutProperty(MARKERS_LIMITED_BADGE_LAYER_ID, 'symbol-z-order', 'auto');
    return;
  }

  map.addLayer({
    id: MARKERS_LIMITED_BADGE_LAYER_ID,
    type: 'symbol',
    source: 'map-markers',
    filter: LIMITED_BADGE_FILTER,
    layout: {
      'icon-image': MAP_MARKER_LIMITED_BADGE_ID,
      'icon-size': BASE_ICON_SIZE,
      'icon-anchor': 'bottom',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'symbol-sort-key': MARKER_SORT_KEY,
      'symbol-z-order': 'auto',
    },
    paint: {
      'icon-opacity': 1,
    },
  });
}

function ensureTravelLinkedBadgeLayer(map) {
  if (map.getLayer(MARKERS_TRAVEL_LINKED_BADGE_LAYER_ID)) {
    map.setFilter(MARKERS_TRAVEL_LINKED_BADGE_LAYER_ID, TRAVEL_LINKED_BADGE_FILTER);
    map.setLayoutProperty(MARKERS_TRAVEL_LINKED_BADGE_LAYER_ID, 'symbol-sort-key', MARKER_SORT_KEY);
    map.setLayoutProperty(MARKERS_TRAVEL_LINKED_BADGE_LAYER_ID, 'symbol-z-order', 'auto');
    return;
  }

  map.addLayer({
    id: MARKERS_TRAVEL_LINKED_BADGE_LAYER_ID,
    type: 'symbol',
    source: 'map-markers',
    filter: TRAVEL_LINKED_BADGE_FILTER,
    layout: {
      'icon-image': MAP_MARKER_TRAVEL_LINKED_BADGE_ID,
      'icon-size': BASE_ICON_SIZE,
      'icon-anchor': 'bottom',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'symbol-sort-key': MARKER_SORT_KEY,
      'symbol-z-order': 'auto',
    },
    paint: {
      'icon-opacity': 1,
    },
  });
}

function ensureSelectedMarkerLayer(map) {
  if (map.getLayer('map-marker-selected')) {
    map.setLayoutProperty('map-marker-selected', 'symbol-sort-key', MARKER_SORT_KEY);
    map.setLayoutProperty('map-marker-selected', 'symbol-z-order', 'auto');
    return;
  }

  map.addLayer({
    id: 'map-marker-selected',
    type: 'symbol',
    source: 'map-markers',
    filter: ['==', ['get', 'isSelected'], 1],
    layout: {
      'icon-image': ['get', 'iconImage'],
      'icon-size': SELECTED_ICON_SIZE,
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

  if (markersSourceReady && markersAreMounted(map)) return Promise.resolve();

  if (markersAreMounted(map)) {
    markersSourceReady = true;
    ensureMarkersSymbolLayer(map);
    ensureDoneBadgeLayer(map);
    ensureLimitedBadgeLayer(map);
    ensureTravelLinkedBadgeLayer(map);
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

      if (!map.getSource('map-markers')) {
        map.addSource('map-markers', {
          type: 'geojson',
          data: buildFeatureCollection(),
        });
      }

      ensureMarkersSymbolLayer(map);
      ensureDoneBadgeLayer(map);
      ensureLimitedBadgeLayer(map);
      ensureTravelLinkedBadgeLayer(map);
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
        if (!map.getSource('map-markers')) {
          markersSourceReady = false;
          return;
        }
        await ensureMapMarkerImages(map, getMapMarkersFromCache());
        syncMarkerSource(map);
        try {
          await syncTravelMapZones(map);
        } catch (err) {
          devWarn('syncTravelMapZones:', err.message);
        }
        onUpdated?.();
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

export function setMapLayerVisible(map, categoryId, visible) {
  if (!(categoryId in layerVisibility)) return;
  layerVisibility[categoryId] = visible;
  if (map?.isStyleLoaded()) {
    syncMarkerSource(map);
    if (categoryId === 'travels') {
      syncTravelMapZones(map).catch((err) => {
        devWarn('syncTravelMapZones:', err.message);
      });
    }
  }
}

export function setMapMarkerFilters(next = {}, map = null) {
  markerFilters.status = next.status ?? 'all';
  markerFilters.activityType = [...(next.activityType || [])];
  markerFilters.restaurantType = [...(next.restaurantType || [])];
  markerFilters.restaurantCuisine = [...(next.restaurantCuisine || [])];
  markerFilters.travelType = [...(next.travelType || [])];
  if (map?.isStyleLoaded()) syncMarkerSource(map);
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

export function resetMapMarkersState() {
  markersSourceReady = false;
  markerInteractionsBound = false;
  markersLayersPromise = null;
  markerClickHandler = null;
  selectedMarker = null;
  onSelectionPruned = null;
  initialFitDone = false;
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
