import { getCategoryById } from '../../config.js';
import { escapeHtml } from '../../lib/escape-html.js';
import { renderRestaurantTypeIcon } from './IconsType.js';
import { renderTaggedListTypeIcon } from '../../lib/item-tags.js';
import { initRestaurantDetail } from '../../ui/restaurant-detail.js';
import { createListPageController, DEFAULT_SORT_OPTIONS } from '../shared/listPageController.js';
import {
  createListFilterSections,
  createListPageLabels,
} from '../shared/listPageBoilerplate.js';
import { createMapTabOptions } from '../shared/listMapSection.js';
import { createGeoListPageDom } from '../shared/listPageDom.js';
import { renderRestaurantListMeta } from '../shared/listMetaRenderers.js';
import { createTodoListPageStatus } from '../shared/todoListPageSetup.js';

const RESTAURANT_THEME = getCategoryById('restaurants')?.theme || 'rose';

const tagBadgeOptions = {
  categoryId: 'restaurants',
  escapeHtml,
  theme: RESTAURANT_THEME,
};

const { statusLabels: RESTAURANT_STATUS, statusFilterOptions: STATUS_FILTER_OPTIONS } =
  createTodoListPageStatus('restaurants');

const { init, destroy, refresh } = createListPageController({
  categoryId: 'restaurants',
  collection: 'restaurants',
  pickScope: 'restaurants',
  theme: getCategoryById('restaurants')?.theme || 'rose',
  dom: createGeoListPageDom('restaurants'),
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
    statusDone: RESTAURANT_STATUS.done,
    statusTodo: RESTAURANT_STATUS.todo,
    headerEmpty: 'Ajoutez vos premières adresses',
    headerAllDone: 'Toutes vos adresses sont visitées',
    headerOneTodo: '1 adresse à essayer',
    headerManyTodo: (n) => `${n} adresses à essayer`,
    emptyNone: 'Aucun restaurant enregistré',
    emptyFiltered: 'Aucun restaurant ne correspond à ces filtres',
    addCta: 'Ajouter un restaurant',
    pickEmptyText: 'Ajoutez des adresses pour commencer.',
    pickAllDoneText: 'Toutes vos adresses sont visitées.',
    pickIdleText: 'Lancez le dé pour piocher une adresse',
    pickQuotaExhaustedText: 'Vous avez pioché toutes vos adresses disponibles. Revenez demain !',
  }),
  sidebarIconKey: 'restaurant',
  excludeTravelLinkedFromList: true,
  initDetail: initRestaurantDetail,
  renderTypeIcon: (item) => renderTaggedListTypeIcon(item, renderRestaurantTypeIcon, tagBadgeOptions),
  renderListMeta: renderRestaurantListMeta,
  renderLocation: () => '',
  getPickLocation: (item) => item.adresse || '',
  mapTab: createMapTabOptions({
    prefix: 'restaurants',
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
