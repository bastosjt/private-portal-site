import { getCategoryById } from '../../config.js';
import { formatItemPrice, hasItemPrice } from '../../lib/price-format.js';
import { sanitizeHttpsUrl } from '../../lib/safe-url.js';
import { renderRestaurantTypeIcon } from './IconsType.js';
import { initRestaurantDetail } from '../../ui/restaurant-detail.js';
import { createListPageController, DEFAULT_SORT_OPTIONS } from '../shared/listPageController.js';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Tout' },
  { value: 'todo', label: 'À tester' },
  { value: 'done', label: 'Testé' },
];

function getMapsUrl(item) {
  const safeLienMaps = sanitizeHttpsUrl(item.lienMaps);
  if (safeLienMaps) return safeLienMaps;
  if (item.latitude != null && item.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`;
  }
  if (item.adresse) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.adresse)}`;
  }
  return null;
}

function renderRestaurantListMeta(item, { escapeHtml, getFieldLabel }) {
  const type = item.type ? escapeHtml(getFieldLabel('type', item.type)) : 'Restaurant';
  const cuisine = item.cuisine ? escapeHtml(getFieldLabel('cuisine', item.cuisine)) : '';
  const price = hasItemPrice(item) ? escapeHtml(formatItemPrice(item)) : '';
  const hasSub = Boolean(cuisine || price);

  return `
    <div class="act-list-meta act-list-meta--restaurant">
      <span class="act-list-meta-type">${type}</span>
      ${hasSub ? `
        <span class="act-list-meta-sub">
          ${cuisine ? `<span class="act-list-meta-cuisine">${cuisine}</span>` : ''}
          ${price ? `<span class="act-list-meta-price">${price}</span>` : ''}
        </span>
      ` : ''}
    </div>
  `;
}

function renderRestaurantLocation(item, { escapeHtml }) {
  if (!item.adresse) return '';
  const mapsUrl = getMapsUrl(item);
  const pinIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  `;

  if (mapsUrl) {
    return `
      <a href="${escapeHtml(mapsUrl)}" class="act-location" target="_blank" rel="noopener noreferrer">
        ${pinIcon}
        <span>${escapeHtml(item.adresse)}</span>
      </a>
    `;
  }

  return `
    <p class="act-location act-location--text">
      ${pinIcon}
      <span>${escapeHtml(item.adresse)}</span>
    </p>
  `;
}

const { init, destroy, refresh } = createListPageController({
  categoryId: 'restaurants',
  collection: 'restaurants',
  pickScope: 'restaurants',
  theme: getCategoryById('restaurants')?.theme || 'rose',
  dom: {
    listId: 'restaurants-list',
    listPanelId: 'restaurants-list-panel',
    mapPanelId: 'restaurants-map-panel',
    viewSwitchId: 'restaurants-view-switch',
    viewListBtnId: 'restaurants-view-list',
    viewMapBtnId: 'restaurants-view-map',
  },
  itemIdAttr: 'data-restaurant-id',
  filterFieldKeys: ['type', 'cuisine'],
  sortOptions: DEFAULT_SORT_OPTIONS,
  statusFilterOptions: STATUS_FILTER_OPTIONS,
  filterDefaults: { type: [], cuisine: [], status: 'all' },
  getFilterSections: ({ getAvailableFilterOptions }) => [
    {
      id: 'status',
      label: 'Statut',
      mode: 'single',
      collapsible: false,
      options: STATUS_FILTER_OPTIONS,
    },
    {
      id: 'sort',
      label: 'Trier',
      mode: 'single',
      options: DEFAULT_SORT_OPTIONS.map((opt) => ({ value: opt.id, label: opt.label })),
    },
    {
      id: 'type',
      label: 'Type de lieu',
      mode: 'multi',
      getOptions: () => getAvailableFilterOptions('type'),
    },
    {
      id: 'cuisine',
      label: 'Cuisine',
      mode: 'multi',
      getOptions: () => getAvailableFilterOptions('cuisine'),
    },
  ],
  labels: {
    filterToolbarAria: 'Filtrer et trier les restaurants',
    countSingular: 'adresse',
    countPlural: 'adresses',
    statusDone: 'Testé',
    statusTodo: 'À tester',
    headerEmpty: 'Ajoutez vos premières adresses',
    headerAllDone: 'Toutes vos adresses sont testées',
    headerOneTodo: '1 adresse à tester',
    headerManyTodo: (n) => `${n} adresses à tester`,
    emptyNone: 'Aucun restaurant enregistré',
    emptyFiltered: 'Aucun restaurant ne correspond à ces filtres',
    addCta: 'Ajouter un restaurant',
    pickEmptyTitle: 'Rien à piocher',
    pickEmptyText: 'Ajoutez des adresses pour commencer.',
    pickAllDoneTitle: 'Bravo !',
    pickAllDoneText: 'Toutes vos adresses sont testées.',
    pickIdleText: 'Lancez le dé pour piocher une adresse',
    pickQuotaExhaustedText: 'Vous avez pioché toutes vos adresses disponibles. Revenez demain !',
  },
  sidebarIconKey: 'restaurant',
  initDetail: initRestaurantDetail,
  renderTypeIcon: (item) => renderRestaurantTypeIcon(item.type),
  renderListMeta: renderRestaurantListMeta,
  renderLocation: renderRestaurantLocation,
  getPickLocation: (item) => item.adresse || '',
});

export const initRestaurantsPage = init;
export const destroyRestaurantsPage = destroy;
export const refreshRestaurantsPage = refresh;
