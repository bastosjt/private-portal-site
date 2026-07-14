import { MAP_THEME } from '../../config.js';
import { initListFilters } from '../../ui/list-filters.js';
import { initCustomOptions, getFieldOptionLabel } from '../../lib/custom-types.js';
import { getCachedItems } from '../../data/appDataCache.js';
import {
  isMapLayerVisible,
  refreshMapMarkers,
  setMapLayerVisible,
  setMapMarkerFilters,
} from './map-markers.js';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Tout' },
  { value: 'todo', label: 'Non fait' },
  { value: 'done', label: 'Fait' },
];

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

function getAvailableMapFilterOptions(categoryId, fieldName) {
  const values = new Map();

  for (const item of getGeolocatedItems(categoryId)) {
    const value = item[fieldName];
    if (!value) continue;
    if (!values.has(value)) {
      values.set(value, getFieldOptionLabel(categoryId, fieldName, value) || value);
    }
  }

  return [...values.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'fr'))
    .map(([value, label]) => ({ value, label }));
}

function getFilterSections() {
  return [
    {
      id: 'status',
      label: 'Statut',
      mode: 'single',
      collapsible: false,
      options: STATUS_FILTER_OPTIONS,
    },
    {
      id: 'categories',
      label: 'Catégories',
      mode: 'multi',
      collapsible: false,
      options: CATEGORY_OPTIONS,
    },
    {
      id: 'activityType',
      label: "Type d'activité",
      mode: 'multi',
      getOptions: () => getAvailableMapFilterOptions('activities', 'categorie'),
    },
    {
      id: 'restaurantType',
      label: 'Type de restaurant',
      mode: 'multi',
      getOptions: () => getAvailableMapFilterOptions('restaurants', 'type'),
    },
    {
      id: 'restaurantCuisine',
      label: 'Type de cuisine',
      mode: 'multi',
      getOptions: () => getAvailableMapFilterOptions('restaurants', 'cuisine'),
    },
    {
      id: 'travelType',
      label: 'Type de voyage',
      mode: 'multi',
      getOptions: () => getAvailableMapFilterOptions('travels', 'type'),
    },
  ];
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
  if (filterState.categories.length > 0) count += filterState.categories.length;
  return count;
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
  } else {
    LAYER_IDS.forEach((id) => setMapLayerVisible(map, id, categories.includes(id)));
  }

  filterState.categories = [...categories];
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
  refreshMapMarkers(map);
}
