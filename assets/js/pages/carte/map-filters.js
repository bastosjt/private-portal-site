import { MAP_THEME } from '../../config.js';
import { initListFilters } from '../../ui/list-filters.js';
import { initCustomOptions } from '../../lib/custom-types.js';
import { getCachedItems } from '../../data/appDataCache.js';
import { getMapStatusFilterOptions } from '../../lib/category-status-labels.js';
import {
  createMapFilterSections,
} from '../shared/listPageBoilerplate.js';
import { buildMapFieldFilterOptions } from '../shared/filterOptions.js';
import {
  isMapLayerVisible,
  refreshMapMarkers,
  setMapLayerVisible,
  setMapMarkerFilters,
} from './map-markers.js';

const STATUS_FILTER_OPTIONS = getMapStatusFilterOptions();

const CATEGORY_OPTIONS = [
  { value: 'activities', label: 'Activités' },
  { value: 'restaurants', label: 'Restaurants' },
  { value: 'travels', label: 'Voyages' },
];

const LAYER_IDS = CATEGORY_OPTIONS.map((entry) => entry.value);

const FILTER_DEFAULTS = {
  status: 'all',
  categories: [],
  activityType: [],
  restaurantType: [],
  restaurantCuisine: [],
  travelType: [],
};

let filterState = {
  status: FILTER_DEFAULTS.status,
  categories: [...FILTER_DEFAULTS.categories],
  activityType: [...FILTER_DEFAULTS.activityType],
  restaurantType: [...FILTER_DEFAULTS.restaurantType],
  restaurantCuisine: [...FILTER_DEFAULTS.restaurantCuisine],
  travelType: [...FILTER_DEFAULTS.travelType],
};

let filterModal = null;

function getGeolocatedItems(collection) {
  return (getCachedItems(collection) ?? []).filter(
    (item) => item.latitude != null && item.longitude != null,
  );
}

function getMapFieldOptions(categoryId, fieldName) {
  return buildMapFieldFilterOptions(categoryId, fieldName, getGeolocatedItems(categoryId));
}

function getFilterSections() {
  return createMapFilterSections({
    statusOptions: STATUS_FILTER_OPTIONS,
    statusLabel: 'Avancement',
    categoryOptions: CATEGORY_OPTIONS,
    getMapFieldOptions,
    typeFields: [
      { id: 'activityType', label: "Type d'activité", categoryId: 'activities', fieldName: 'categorie' },
      { id: 'restaurantType', label: 'Type de restaurant', categoryId: 'restaurants', fieldName: 'type' },
      { id: 'restaurantCuisine', label: 'Type de cuisine', categoryId: 'restaurants', fieldName: 'cuisine' },
      { id: 'travelType', label: 'Type de voyage', categoryId: 'travels', fieldName: 'type' },
    ],
  });
}

function categoriesFromLayerVisibility() {
  const visible = LAYER_IDS.filter((id) => isMapLayerVisible(id));
  return visible.length === LAYER_IDS.length ? [] : visible;
}

function getFilterStateForModal() {
  const categories = filterState.categories.length > 0
    ? filterState.categories
    : categoriesFromLayerVisibility();

  return {
    status: filterState.status,
    categories: new Set(categories),
    activityType: new Set(filterState.activityType),
    restaurantType: new Set(filterState.restaurantType),
    restaurantCuisine: new Set(filterState.restaurantCuisine),
    travelType: new Set(filterState.travelType),
  };
}

function countMapActiveFilters() {
  let count = 0;
  if (filterState.status !== FILTER_DEFAULTS.status) count += 1;
  count += filterState.activityType.length;
  count += filterState.restaurantType.length;
  count += filterState.restaurantCuisine.length;
  count += filterState.travelType.length;
  if (!LAYER_IDS.every((id) => isMapLayerVisible(id))) count += 1;
  return count;
}

function syncFilterCategoriesFromLayers() {
  filterState.categories = categoriesFromLayerVisibility();
}

export function syncMapFiltersFromLayerVisibility() {
  syncFilterCategoriesFromLayers();
  updateMapFilterBadge();
}

function updateMapFilterBadge() {
  const btn = document.getElementById('map-filter-btn');
  const badge = btn?.querySelector('.act-filter-badge');
  if (!btn || !badge) return;

  const count = countMapActiveFilters();
  badge.textContent = String(count);
  badge.classList.toggle('hidden', count === 0);
  btn.classList.toggle('is-active', count > 0);
}

function applyCategoryVisibility(map, categories, syncLayerButtons) {
  if (categories.length === 0) {
    LAYER_IDS.forEach((id) => setMapLayerVisible(map, id, true));
    filterState.categories = [];
  } else {
    LAYER_IDS.forEach((id) => setMapLayerVisible(map, id, categories.includes(id)));
    const allVisible = LAYER_IDS.every((id) => categories.includes(id));
    filterState.categories = allVisible ? [] : [...categories];
  }

  syncLayerButtons?.();
}

function applyMapFilters(map, applied, syncLayerButtons) {
  filterState.status = applied.status;
  filterState.categories = [...applied.categories];
  filterState.activityType = [...applied.activityType];
  filterState.restaurantType = [...applied.restaurantType];
  filterState.restaurantCuisine = [...applied.restaurantCuisine];
  filterState.travelType = [...applied.travelType];

  setMapMarkerFilters({
    status: filterState.status,
    activityType: filterState.activityType,
    restaurantType: filterState.restaurantType,
    restaurantCuisine: filterState.restaurantCuisine,
    travelType: filterState.travelType,
  }, map);

  applyCategoryVisibility(map, filterState.categories, syncLayerButtons);
  refreshMapMarkers(map);
  updateMapFilterBadge();
}

export function initMapFilters({ map, signal, syncLayerButtons } = {}) {
  filterModal?.destroy();

  filterState = {
    status: FILTER_DEFAULTS.status,
    categories: [...FILTER_DEFAULTS.categories],
    activityType: [...FILTER_DEFAULTS.activityType],
    restaurantType: [...FILTER_DEFAULTS.restaurantType],
    restaurantCuisine: [...FILTER_DEFAULTS.restaurantCuisine],
    travelType: [...FILTER_DEFAULTS.travelType],
  };

  filterModal = initListFilters({
    theme: MAP_THEME,
    title: 'Filtres',
    triggerButtonId: 'map-filter-btn',
    beforeOpen: initCustomOptions,
    defaults: FILTER_DEFAULTS,
    sections: getFilterSections(),
    getState: getFilterStateForModal,
    onApply: (applied) => applyMapFilters(map, applied, syncLayerButtons),
  });

  const filterBtn = document.getElementById('map-filter-btn');
  filterBtn?.addEventListener('click', () => {
    filterModal.open();
  }, { signal });

  filterModal.updateTriggerBadge = updateMapFilterBadge;
  updateMapFilterBadge();
  return filterModal;
}

export function destroyMapFilters() {
  filterModal?.destroy();
  filterModal = null;
}

export { updateMapFilterBadge };

export function onMapLayerToggled(map) {
  syncMapFiltersFromLayerVisibility();
  refreshMapMarkers(map);
}
