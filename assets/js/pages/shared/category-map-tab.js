import { findCachedItemById, formatPlaceDistanceKm } from '../../data/appDataCache.js';
import { escapeHtml } from '../../lib/escape-html.js';
import { getStraightLineDistanceKm } from '../../lib/geo-utils.js';
import { devWarn } from '../../lib/dev-log.js';
import { loadMapLibre, waitForContainerSize, MAP_BASE_OPTS } from '../../lib/map-bootstrap.js';
import { OUR_SPACE_MAP_RASTER_STYLE } from '../carte/map-raster-style.js';
import { bindMapMarkerImageFallback } from '../carte/map-marker-images.js';
import {
  fitMapToLocalArea,
  fitMapToVisibleMarkers,
  getDisplayedMarkers,
  MAP_FALLBACK_CENTER,
  refreshMapMarkers,
  setMapLayerVisible,
  setMapMarkerClickHandler,
  setMapMarkerFilters,
  setSelectedMapMarker,
} from '../carte/map-markers.js';
import {
  clearMapUserLocationLayer,
  destroyMapUserLocationLayer,
  syncMapUserLocationLayer,
} from '../carte/map-user-location.js';
import {
  getGeolocationUserMessage,
  getUserLocationLngLat,
  isUserLocationEnabled,
  onUserLocationChange,
  requestUserLocationUpdate,
} from '../../lib/user-location.js';

const MAP_PADDING = { top: 48, bottom: 64, left: 40, right: 40 };
const MARKER_FOCUS_ZOOM = 15;

function resetGlobalMapState(categoryId) {
  setMapMarkerFilters({
    status: 'all',
    activityType: [],
    restaurantType: [],
    restaurantCuisine: [],
    travelType: [],
  });
  setMapLayerVisible(null, 'activities', true);
  setMapLayerVisible(null, 'restaurants', true);
  setMapLayerVisible(null, 'travels', true);
  setMapMarkerClickHandler(null);
  void categoryId;
}

export function createCategoryMapTab({
  categoryId,
  canvasId,
  emptyId,
  summaryId,
  placesListId = null,
  placesScrollId = null,
  controlsId = null,
  accent,
  countSingular = 'élément',
  countPlural = 'éléments',
  emptyHint = 'Ajoutez une adresse géolocalisée pour l\'afficher ici.',
  mapListFilters = (state) => ({ status: state.status }),
  itemIdAttr = 'data-item-id',
  renderPlaceIcon = () => '',
  getPlaceTitle = (item) => item?.nom || 'Sans titre',
  getPlaceLocation = () => '',
  onMarkerClick,
}) {
  let map = null;
  let resizeObserver = null;
  let stopLocationListener = null;
  let controlsAbort = null;
  let placesAbort = null;
  let initToken = 0;
  let mounted = false;
  let shouldAutoFit = true;
  let selectedItemId = null;

  function getVisibleMarkers() {
    return getDisplayedMarkers().filter((marker) => marker.categoryId === categoryId);
  }

  function getDistanceOrigin() {
    return getUserLocationLngLat() || map?.getCenter()?.toArray() || MAP_FALLBACK_CENTER;
  }

  function getSortedPlaces() {
    const origin = getDistanceOrigin();
    return getVisibleMarkers()
      .map((marker) => {
        const item = findCachedItemById(categoryId, marker.id);
        const distanceKm = getStraightLineDistanceKm(origin, marker.coordinates);
        return { marker, item, distanceKm };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  function applyLayerVisibility() {
    setMapLayerVisible(map, 'activities', categoryId === 'activities');
    setMapLayerVisible(map, 'restaurants', categoryId === 'restaurants');
    setMapLayerVisible(map, 'travels', categoryId === 'travels');
  }

  function applyFilters(filterState) {
    const next = mapListFilters(filterState);
    setMapMarkerFilters({
      status: next.status ?? 'all',
      activityType: next.activityType ?? [],
      restaurantType: next.restaurantType ?? [],
      restaurantCuisine: next.restaurantCuisine ?? [],
      travelType: next.travelType ?? [],
    }, map);
    applyLayerVisibility();
  }

  function syncUserLocation() {
    if (!map?.isStyleLoaded()) return;
    const lngLat = isUserLocationEnabled() ? getUserLocationLngLat() : null;
    if (lngLat) syncMapUserLocationLayer(map, lngLat, { accent });
    else clearMapUserLocationLayer(map);
  }

  function fitCategoryMap({ force = false } = {}) {
    if (!map || (!shouldAutoFit && !force)) return;

    const fitted = fitMapToVisibleMarkers(map, {
      padding: MAP_PADDING,
      maxZoom: 14,
      duration: force ? 700 : 0,
      userLocation: getUserLocationLngLat(),
    });

    if (!fitted) {
      fitMapToLocalArea(map, {
        center: getUserLocationLngLat() || MAP_FALLBACK_CENTER,
        padding: MAP_PADDING,
        maxZoom: 13,
        duration: force ? 700 : 0,
      });
    }
  }

  function focusMarker(marker, { animate = true } = {}) {
    if (!map || !marker) return;
    selectedItemId = marker.id;
    setSelectedMapMarker(map, { categoryId, itemId: marker.id });
    map.flyTo({
      center: marker.coordinates,
      zoom: Math.max(map.getZoom(), MARKER_FOCUS_ZOOM),
      duration: animate ? 700 : 0,
      essential: true,
    });
    renderPlacesList();
  }

  function updateUi(filterState) {
    const emptyEl = document.getElementById(emptyId);
    const canvasEl = document.getElementById(canvasId);
    const summaryEl = document.getElementById(summaryId);
    const placesEl = placesListId ? document.getElementById(placesListId) : null;
    const placesScrollEl = placesScrollId ? document.getElementById(placesScrollId) : null;
    const controlsEl = controlsId ? document.getElementById(controlsId) : null;
    const count = getVisibleMarkers().length;
    const hasMarkers = count > 0;
    const filtersActive = filterState?.status !== 'all'
      || Object.entries(filterState || {}).some(([key, value]) => (
        key !== 'sort' && key !== 'status' && Array.isArray(value) && value.length > 0
      ));

    canvasEl?.classList.toggle('hidden', !hasMarkers);
    canvasEl?.toggleAttribute('hidden', !hasMarkers);
    emptyEl?.classList.toggle('hidden', hasMarkers);
    emptyEl?.toggleAttribute('hidden', hasMarkers);
    controlsEl?.classList.toggle('hidden', !hasMarkers);
    controlsEl?.toggleAttribute('hidden', !hasMarkers);
    placesScrollEl?.classList.toggle('hidden', !hasMarkers);
    placesScrollEl?.toggleAttribute('hidden', !hasMarkers);

    if (emptyEl) {
      const titleEl = emptyEl.querySelector('.act-map-placeholder-title');
      const textEl = emptyEl.querySelector('.act-map-placeholder-text');

      if (titleEl) {
        titleEl.textContent = filtersActive
          ? 'Aucun résultat sur la carte'
          : 'Aucune adresse géolocalisée';
      }
      if (textEl) {
        textEl.textContent = filtersActive
          ? 'Essayez d\'autres filtres ou repassez en liste.'
          : emptyHint;
      }
    }

    if (summaryEl) {
      if (count === 0) summaryEl.textContent = `Aucune ${countPlural} sur la carte`;
      else if (count === 1) summaryEl.textContent = `1 ${countSingular} affichée`;
      else summaryEl.textContent = `${count} ${countPlural} affichées`;
    }
  }

  function renderPlacesList() {
    if (!placesListId) return;

    const placesEl = document.getElementById(placesListId);
    if (!placesEl) return;

    const places = getSortedPlaces();
    if (!places.length) {
      placesEl.innerHTML = '';
      return;
    }

    if (selectedItemId && !places.some(({ marker }) => marker.id === selectedItemId)) {
      selectedItemId = null;
      setSelectedMapMarker(map, null);
    }

    placesEl.innerHTML = places.map(({ marker, item, distanceKm }) => {
      const title = escapeHtml(getPlaceTitle(item || { id: marker.id }));
      const location = escapeHtml(getPlaceLocation(item || {}));
      const distanceLabel = formatPlaceDistanceKm(distanceKm);
      const isSelected = selectedItemId === marker.id;

      return `
        <li>
          <button
            type="button"
            class="act-category-map-place${isSelected ? ' is-selected' : ''}"
            ${itemIdAttr}="${escapeHtml(marker.id)}"
            aria-pressed="${isSelected ? 'true' : 'false'}"
          >
            <span class="act-category-map-place-icon" aria-hidden="true">${renderPlaceIcon(item || {})}</span>
            <span class="act-category-map-place-copy">
              <span class="act-category-map-place-title">${title}</span>
              ${location ? `<span class="act-category-map-place-loc">${location}</span>` : ''}
            </span>
            ${distanceLabel ? `<span class="act-category-map-place-distance">${distanceLabel}</span>` : ''}
          </button>
        </li>
      `;
    }).join('');
  }

  function bindPlacesList() {
    if (!placesListId) return;

    placesAbort?.abort();
    const placesEl = document.getElementById(placesListId);
    if (!placesEl) return;

    placesAbort = new AbortController();
    placesEl.addEventListener('click', (event) => {
      const btn = event.target.closest('.act-category-map-place');
      if (!btn || !placesEl.contains(btn)) return;

      const itemId = btn.getAttribute(itemIdAttr);
      const marker = getVisibleMarkers().find((entry) => entry.id === itemId);
      if (!marker) return;

      focusMarker(marker);
      onMarkerClick?.({ categoryId, itemId });
    }, { signal: placesAbort.signal });
  }

  function bindControls() {
    if (!controlsId) return;

    controlsAbort?.abort();
    const controlsEl = document.getElementById(controlsId);
    if (!controlsEl) return;

    controlsAbort = new AbortController();
    const { signal } = controlsAbort;

    controlsEl.querySelector('[data-map-action="fit-all"]')?.addEventListener('click', () => {
      shouldAutoFit = true;
      fitCategoryMap({ force: true });
    }, { signal });

    controlsEl.querySelector('[data-map-action="locate"]')?.addEventListener('click', async () => {
      const locateBtn = controlsEl.querySelector('[data-map-action="locate"]');
      if (!isUserLocationEnabled()) return;

      locateBtn?.classList.add('is-loading');
      locateBtn?.setAttribute('aria-busy', 'true');

      try {
        const lngLat = await requestUserLocationUpdate();
        if (!lngLat) throw Object.assign(new Error('unavailable'), { code: 2 });
        syncUserLocation();
        shouldAutoFit = true;
        fitMapToLocalArea(map, {
          center: lngLat,
          padding: MAP_PADDING,
          maxZoom: 13,
          duration: 700,
        });
      } catch (error) {
        devWarn('category-map-tab locate:', getGeolocationUserMessage(error));
      } finally {
        locateBtn?.classList.remove('is-loading');
        locateBtn?.setAttribute('aria-busy', 'false');
      }
    }, { signal });
  }

  function markUserAdjustedView() {
    shouldAutoFit = false;
  }

  function refreshMapView(filterState, { refit = false } = {}) {
    if (!map) return;
    applyFilters(filterState);
    setMapMarkerClickHandler(({ categoryId: markerCategoryId, itemId }) => {
      if (markerCategoryId !== categoryId) return;
      const marker = getVisibleMarkers().find((entry) => entry.id === itemId);
      if (marker) focusMarker(marker, { animate: true });
      onMarkerClick?.({ categoryId: markerCategoryId, itemId });
    });
    refreshMapMarkers(map, {
      onUpdated: () => {
        syncUserLocation();
        if (refit || shouldAutoFit) fitCategoryMap({ force: refit });
        renderPlacesList();
        updateUi(filterState);
      },
    });
  }

  async function mount(filterState, token) {
    const container = document.getElementById(canvasId);
    if (!container || token !== initToken) return;

    const maplibregl = await loadMapLibre();
    if (!maplibregl) return;

    await waitForContainerSize(container);
    if (token !== initToken || !document.getElementById(canvasId)) return;

    map = new maplibregl.Map({
      container,
      style: OUR_SPACE_MAP_RASTER_STYLE,
      center: getUserLocationLngLat() || MAP_FALLBACK_CENTER,
      zoom: 11,
      minZoom: 3,
      maxZoom: 14,
      pitch: 0,
      bearing: 0,
      ...MAP_BASE_OPTS,
    });

    bindMapMarkerImageFallback(map);
    bindControls();
    bindPlacesList();
    mounted = true;
    shouldAutoFit = true;

    map.on('load', () => {
      if (token !== initToken || !map) return;
      map.resize();
      refreshMapView(filterState, { refit: true });
    });

    map.on('dragstart', markUserAdjustedView);
    map.on('zoomstart', markUserAdjustedView);

    resizeObserver = new ResizeObserver(() => {
      map?.resize();
    });
    resizeObserver.observe(container);

    stopLocationListener = onUserLocationChange(() => {
      if (!map?.isStyleLoaded()) return;
      syncUserLocation();
      renderPlacesList();
      if (shouldAutoFit) fitCategoryMap();
    });
  }

  return {
    init(filterState) {
      if (mounted && map) {
        map.resize();
        refreshMapView(filterState);
        return;
      }

      initToken += 1;
      const token = initToken;
      mount(filterState, token).catch((error) => {
        devWarn('category-map-tab init:', error.message);
      });
    },

    sync(filterState) {
      if (!mounted || !map) return;
      refreshMapView(filterState);
    },

    resize() {
      map?.resize();
    },

    destroy() {
      initToken += 1;
      stopLocationListener?.();
      stopLocationListener = null;
      controlsAbort?.abort();
      controlsAbort = null;
      placesAbort?.abort();
      placesAbort = null;
      resizeObserver?.disconnect();
      resizeObserver = null;
      selectedItemId = null;
      shouldAutoFit = true;
      if (map) {
        destroyMapUserLocationLayer(map);
        map.remove();
      }
      map = null;
      mounted = false;
      resetGlobalMapState(categoryId);
    },
  };
}
