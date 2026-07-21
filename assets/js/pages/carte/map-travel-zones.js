import { findCachedItemById } from '../../data/appDataCache.js';
import { getPlaceBoundary, resetPlaceBoundaryCache } from '../../lib/place-boundary.js';

const TRAVEL_ZONE_COLOR = '#0ea5e9';
const TRAVEL_ZONE_FILL_OPACITY = ['case', ['==', ['get', 'done'], 1], 0.1, 0.2];
const TRAVEL_ZONE_LINE_OPACITY = ['case', ['==', ['get', 'done'], 1], 0.28, 0.5];
const EMPTY_COLLECTION = { type: 'FeatureCollection', features: [] };

const travelZonesReadyByMap = new WeakMap();
let syncTravelZonesGeneration = 0;

function getTravelLabel(marker) {
  const item = findCachedItemById('travels', marker.id);
  return item?.localisation?.trim() || item?.destination?.trim() || marker.title;
}

function syncTravelZonePaint(map) {
  if (map.getLayer('map-travel-zones-fill')) {
    map.setPaintProperty('map-travel-zones-fill', 'fill-opacity', TRAVEL_ZONE_FILL_OPACITY);
  }
  if (map.getLayer('map-travel-zones-outline')) {
    map.setPaintProperty('map-travel-zones-outline', 'line-opacity', TRAVEL_ZONE_LINE_OPACITY);
  }
}

export function ensureTravelZoneLayers(map) {
  if (!map) return;

  if (travelZonesReadyByMap.get(map) && map.getSource('map-travel-zones')) {
    syncTravelZonePaint(map);
    return;
  }

  travelZonesReadyByMap.delete(map);

  if (!map.getSource('map-travel-zones')) {
    map.addSource('map-travel-zones', {
      type: 'geojson',
      data: EMPTY_COLLECTION,
    });
  }

  const beforeId = map.getLayer('map-markers-symbols') ? 'map-markers-symbols' : undefined;

  if (!map.getLayer('map-travel-zones-fill')) {
    map.addLayer({
      id: 'map-travel-zones-fill',
      type: 'fill',
      source: 'map-travel-zones',
      paint: {
        'fill-color': TRAVEL_ZONE_COLOR,
        'fill-opacity': TRAVEL_ZONE_FILL_OPACITY,
      },
    }, beforeId);
  } else {
    map.setPaintProperty('map-travel-zones-fill', 'fill-opacity', TRAVEL_ZONE_FILL_OPACITY);
  }

  if (!map.getLayer('map-travel-zones-outline')) {
    map.addLayer({
      id: 'map-travel-zones-outline',
      type: 'line',
      source: 'map-travel-zones',
      paint: {
        'line-color': TRAVEL_ZONE_COLOR,
        'line-opacity': TRAVEL_ZONE_LINE_OPACITY,
        'line-width': 1.5,
      },
    }, beforeId);
  } else {
    map.setPaintProperty('map-travel-zones-outline', 'line-opacity', TRAVEL_ZONE_LINE_OPACITY);
  }

  if (beforeId) {
    for (const layerId of ['map-travel-zones-fill', 'map-travel-zones-outline']) {
      if (map.getLayer(layerId)) {
        try {
          map.moveLayer(layerId, beforeId);
        } catch {
          // déjà au bon emplacement
        }
      }
    }
  }

  travelZonesReadyByMap.set(map, true);
}

export function syncTravelZoneVisibility(map, visible) {
  for (const layerId of ['map-travel-zones-fill', 'map-travel-zones-outline']) {
    if (!map?.getLayer(layerId)) continue;
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
  }
}

export async function syncTravelZones(map, { markers = [], visible = true } = {}) {
  ensureTravelZoneLayers(map);
  if (!map?.getSource('map-travel-zones')) return;

  const generation = ++syncTravelZonesGeneration;

  syncTravelZoneVisibility(map, visible);

  if (!visible || markers.length === 0) {
    map.getSource('map-travel-zones').setData(EMPTY_COLLECTION);
    return;
  }

  const features = await Promise.all(markers.map(async (marker) => {
    const [lng, lat] = marker.coordinates;
    const geometry = await getPlaceBoundary({
      label: getTravelLabel(marker),
      lat,
      lng,
    });

    if (!geometry) return null;

    return {
      type: 'Feature',
      geometry,
      properties: {
        itemId: marker.id,
        title: marker.title,
        done: marker.done ? 1 : 0,
      },
    };
  }));

  if (generation !== syncTravelZonesGeneration) return;

  map.getSource('map-travel-zones').setData({
    type: 'FeatureCollection',
    features: features.filter(Boolean),
  });
  syncTravelZoneVisibility(map, visible);
  map.triggerRepaint?.();
}

export function resetTravelZonesState() {
  syncTravelZonesGeneration = 0;
  resetPlaceBoundaryCache();
}
