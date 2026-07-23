import { clearMapPlaceHash, getMapPlaceFromHash } from '../../navigation/router.js';
import { devWarn } from '../../lib/dev-log.js';
import { countGeolocatedPlacesFromCache, ensureMapDataReady, findCachedItemById } from '../../data/appDataCache.js';
import { initCustomOptions } from '../../lib/custom-types.js';
import { destroyCategoryDetailModals, initCategoryDetailModals } from '../../ui/category-detail-registry.js';
import { initAddItem } from '../../ui/add-item.js';
import {
  destroyInteractiveMap,
  getInteractiveMap,
  getLastUserLocation,
  initInteractiveMap,
  refreshInteractiveMap,
  syncMapLayerButtons,
} from './interactive-map.js';
import { destroyMapFilters, initMapFilters, onMapLayerToggled, updateMapFilterBadge } from './map-filters.js';
import { destroyMapSearch, initMapSearch } from './map-search.js';
import {
  clearSelectedMapMarker,
  resetMapPageFit,
  setMapMarkerSelectionPrunedHandler,
  setSelectedMapMarker,
  tryInitialMapFit,
} from './map-markers.js';
import { isMapPinMoveActive, startMapPinMove, stopMapPinMove } from './map-pin-move.js';

const MAP_DETAIL_CATEGORIES = ['activities', 'restaurants', 'travels'];

const MARKER_FOCUS_ZOOM = 15;

let pageAbort = null;
let addItemModal = null;
let detailModals = {};
let mapReadyHandled = false;

function updateHeaderSub() {
  const sub = document.getElementById('map-header-sub');
  if (!sub) return;

  const count = countGeolocatedPlacesFromCache();
  sub.textContent = count > 0
    ? `${count} lieu${count > 1 ? 'x' : ''} géolocalisé${count > 1 ? 's' : ''}`
    : 'Activités, restaurants et voyages';
}

function handleMapDataChanged() {
  updateHeaderSub();
  refreshInteractiveMap();
  updateMapFilterBadge();
}

function closeOpenMapDetail() {
  for (const modal of Object.values(detailModals)) {
    modal?.close?.();
  }
}

function openMapItemDetail(categoryId, itemId, { flyTo = true } = {}) {
  if (isMapPinMoveActive()) return false;

  const item = findCachedItemById(categoryId, itemId);
  const modal = detailModals[categoryId];
  const map = getInteractiveMap();

  if (!item || !modal) return false;

  setSelectedMapMarker(map, { categoryId, itemId });

  if (flyTo && map && item.longitude != null && item.latitude != null) {
    map.flyTo({
      center: [item.longitude, item.latitude],
      zoom: Math.max(map.getZoom(), MARKER_FOCUS_ZOOM),
      duration: 900,
      essential: true,
    });
  }

  modal.open(item);
  return true;
}

function createMapPinMoveHandlers(categoryId, itemId) {
  return {
    onCancel: () => {
      const item = findCachedItemById(categoryId, itemId);
      const map = getInteractiveMap();
      if (map && item?.longitude != null && item?.latitude != null) {
        map.easeTo({
          center: [item.longitude, item.latitude],
          zoom: Math.max(map.getZoom(), MARKER_FOCUS_ZOOM),
          duration: 500,
          essential: true,
        });
      }
      openMapItemDetail(categoryId, itemId, { flyTo: false });
    },
    onSaved: ({ categoryId: catId, itemId: id, latitude, longitude }) => {
      handleMapDataChanged();
      const map = getInteractiveMap();
      setSelectedMapMarker(map, { categoryId: catId, itemId: id });
      if (map && longitude != null && latitude != null) {
        map.easeTo({
          center: [longitude, latitude],
          zoom: Math.max(map.getZoom(), MARKER_FOCUS_ZOOM),
          duration: 500,
          essential: true,
        });
      }
    },
  };
}

async function beginMovePin(categoryId, item) {
  const map = getInteractiveMap();
  if (!map || !item) return;

  await detailModals[categoryId]?.close?.();
  clearSelectedMapMarker(map);

  const handlers = createMapPinMoveHandlers(categoryId, item.id);

  await startMapPinMove({
    map,
    categoryId,
    item,
    ...handlers,
  });
}

function initDetailModals() {
  destroyCategoryDetailModals(detailModals);
  detailModals = initCategoryDetailModals(MAP_DETAIL_CATEGORIES, {
    onChanged: () => handleMapDataChanged(),
    onClose: () => {
      if (!isMapPinMoveActive()) {
        clearSelectedMapMarker(getInteractiveMap());
      }
    },
    onEdit: async (categoryId, item) => {
      await detailModals[categoryId]?.close?.();
      addItemModal?.openEdit(categoryId, item);
    },
    onMovePin: (categoryId, item) => {
      void beginMovePin(categoryId, item);
    },
  });
}

function destroyDetailModals() {
  destroyCategoryDetailModals(detailModals);
  detailModals = {};
}

function handleMarkerClick({ categoryId, itemId }) {
  if (isMapPinMoveActive()) return;
  openMapItemDetail(categoryId, itemId, { flyTo: true });
}

function openMapFocusFromHash(map) {
  const focus = getMapPlaceFromHash();
  if (!focus) return;

  clearMapPlaceHash();

  if (focus.move) {
    const item = findCachedItemById(focus.categoryId, focus.itemId);
    if (item) {
      const handlers = createMapPinMoveHandlers(focus.categoryId, focus.itemId);
      void startMapPinMove({
        map,
        categoryId: focus.categoryId,
        item,
        ...handlers,
      });
      return;
    }
    devWarn('move pin: item introuvable', focus);
    return;
  }

  openMapItemDetail(focus.categoryId, focus.itemId);
}

function handleMarkersReady(map) {
  if (!map) return;

  const hasHashFocus = Boolean(getMapPlaceFromHash());
  tryInitialMapFit(map, { skip: hasHashFocus, userLocation: getLastUserLocation() });

  if (hasHashFocus && !mapReadyHandled) {
    openMapFocusFromHash(map);
  }

  mapReadyHandled = true;
}

function scheduleMapPageFinalize() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const map = getInteractiveMap();
      if (!map) return;
      map.resize();
      refreshInteractiveMap({ onUpdated: () => handleMarkersReady(map) });
    });
  });
}

function handleLayerToggled() {
  const map = getInteractiveMap();
  if (!map) return;
  onMapLayerToggled(map);
}

export async function initMapPage(user, { addItemModal: sharedModal } = {}) {
  pageAbort?.abort();
  pageAbort = new AbortController();
  mapReadyHandled = false;
  resetMapPageFit();
  stopMapPinMove({ restore: false });

  await initCustomOptions();
  await ensureMapDataReady();

  addItemModal = sharedModal ?? initAddItem({
    user,
    onAdded: handleMapDataChanged,
    onUpdated: handleMapDataChanged,
  });

  initDetailModals();
  setMapMarkerSelectionPrunedHandler(closeOpenMapDetail);
  updateHeaderSub();

  initInteractiveMap({
    signal: pageAbort.signal,
    onLayerToggled: handleLayerToggled,
    onMarkerClick: handleMarkerClick,
    onMarkersReady: handleMarkersReady,
  });

  const map = getInteractiveMap();
  const controlsRoot = document.getElementById('map-controls');
  if (map && controlsRoot) {
    initMapFilters({
      map,
      signal: pageAbort.signal,
      syncLayerButtons: () => syncMapLayerButtons(controlsRoot),
    });
  }

  initMapSearch({
    signal: pageAbort.signal,
    onSelect: ({ categoryId, itemId }) => {
      if (isMapPinMoveActive()) return;
      openMapItemDetail(categoryId, itemId, { flyTo: true });
    },
  });

  scheduleMapPageFinalize();
}

export function destroyMapPage() {
  pageAbort?.abort();
  pageAbort = null;
  mapReadyHandled = false;
  stopMapPinMove({ restore: false });
  setMapMarkerSelectionPrunedHandler(null);
  destroyMapFilters();
  destroyMapSearch();
  destroyDetailModals();
  destroyInteractiveMap();
}

export function refreshMapPage() {
  handleMapDataChanged();
}
