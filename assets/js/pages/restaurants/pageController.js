import { getCategoryById } from '../../config.js';
import { formatItemPrice, hasItemPrice } from '../../lib/price-format.js';
import { renderRestaurantTypeIcon } from './IconsType.js';
import { initRestaurantDetail } from '../../ui/restaurant-detail.js';
import { createListPageController, DEFAULT_SORT_OPTIONS } from '../shared/listPageController.js';
import {
  createListFilterSections,
  createListPageLabels,
  createTodoStatusFilterOptions,
} from '../shared/listPageBoilerplate.js';
import { renderGeoCategoryLocation } from '../shared/listLocation.js';
import { createMapTabOptions } from '../shared/listMapSection.js';

const STATUS_FILTER_OPTIONS = createTodoStatusFilterOptions('À tester', 'Testé');

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
  getFilterSections: createListFilterSections({
    statusOptions: STATUS_FILTER_OPTIONS,
    sortOptions: DEFAULT_SORT_OPTIONS,
    fields: [
      { id: 'type', label: 'Type de lieu' },
      { id: 'cuisine', label: 'Cuisine' },
    ],
  }),
  labels: createListPageLabels({
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
    pickEmptyText: 'Ajoutez des adresses pour commencer.',
    pickAllDoneText: 'Toutes vos adresses sont testées.',
    pickIdleText: 'Lancez le dé pour piocher une adresse',
    pickQuotaExhaustedText: 'Vous avez pioché toutes vos adresses disponibles. Revenez demain !',
  }),
  sidebarIconKey: 'restaurant',
  initDetail: initRestaurantDetail,
  renderTypeIcon: (item) => renderRestaurantTypeIcon(item.type),
  renderListMeta: renderRestaurantListMeta,
  renderLocation: (item, ctx) => renderGeoCategoryLocation(item, 'restaurants', { ...ctx, escapeHref: true }),
  getPickLocation: (item) => item.adresse || '',
  mapTab: createMapTabOptions({
    prefix: 'restaurants',
    countSingular: 'adresse',
    countPlural: 'adresses',
    emptyHint: 'Ajoutez une adresse à vos restaurants pour les voir ici.',
    mapListFilters: (state) => ({
      status: state.status,
      restaurantType: state.type || [],
      restaurantCuisine: state.cuisine || [],
    }),
  }),
});

export const initRestaurantsPage = init;
export const destroyRestaurantsPage = destroy;
export const refreshRestaurantsPage = refresh;
