import { getCategoryById } from '../../config.js';
import { escapeHtml } from '../../lib/escape-html.js';
import { renderTravelTypeIcon } from './IconsType.js';
import {
  createCategoryStatusFilterOptions,
  getCategoryStatusLabels,
} from '../../lib/category-status-labels.js';
import { createListPageController, DEFAULT_SORT_OPTIONS } from '../shared/listPageController.js';
import {
  createListFilterSections,
  createListPageLabels,
} from '../shared/listPageBoilerplate.js';
import { renderPinLocation, renderGlobeLocation } from '../shared/listLocation.js';
import { createMapTabOptions } from '../shared/listMapSection.js';
import {
  renderTravelListTypeIcon,
} from '../activites/scheduleDisplay.js';
import {
  initTravelHubDetail,
  renderTravelGroupHead,
  renderTravelGroupListItem,
  renderTravelListGroups,
  resolveTravelListItemFromRow,
} from './travel-list-groups.js';

const TRAVEL_STATUS = getCategoryStatusLabels('travels');
const STATUS_FILTER_OPTIONS = createCategoryStatusFilterOptions('travels');

const SORT_OPTIONS = DEFAULT_SORT_OPTIONS.filter((opt) => opt.id === 'alpha' || opt.id === 'recent');

const TRAVEL_THEME = getCategoryById('travels')?.theme || 'blue';

const travelScheduleBadgeOptions = {
  escapeHtml,
  theme: TRAVEL_THEME,
};

function formatBudgetLabel(budget) {
  const value = String(budget || '').trim();
  if (!value) return '';
  return value.includes('€') ? value : `${value} €`;
}

function getTravelMetaLine(item, { getFieldLabel }) {
  const parts = [];
  if (item.type) parts.push(getFieldLabel('type', item.type));
  const budgetLabel = formatBudgetLabel(item.budget);
  if (budgetLabel) parts.push(budgetLabel);
  return parts.join(' · ') || 'Voyage';
}

function hasTravelPeriod(item) {
  return Boolean(item.periode?.trim());
}

function renderTravelCountry(item, ctx) {
  const localisation = item.localisation?.trim();
  if (localisation) {
    return renderPinLocation(localisation, ctx);
  }

  if (!item.pays?.trim()) return '';

  return renderGlobeLocation(item.pays.trim(), ctx);
}

const { init, destroy, refresh } = createListPageController({
  categoryId: 'travels',
  collection: 'travels',
  theme: getCategoryById('travels')?.theme || 'blue',
  titleKey: 'localisation',
  enablePick: false,
  dom: {
    listId: 'voyages-list',
    listPanelId: 'voyages-list-panel',
    mapPanelId: 'voyages-map-panel',
    viewSwitchId: 'voyages-view-switch',
    viewListBtnId: 'voyages-view-list',
    viewMapBtnId: 'voyages-view-map',
  },
  itemIdAttr: 'data-travel-id',
  filterFieldKeys: ['type'],
  sortOptions: SORT_OPTIONS,
  statusFilterOptions: STATUS_FILTER_OPTIONS,
  filterDefaults: { type: [], status: 'all' },
  getFilterSections: createListFilterSections({
    statusOptions: STATUS_FILTER_OPTIONS,
    sortOptions: SORT_OPTIONS,
    fields: [{ id: 'type', label: 'Type' }],
  }),
  labels: createListPageLabels({
    filterToolbarAria: 'Filtrer et trier les voyages',
    countSingular: 'destination',
    countPlural: 'destinations',
    statusDone: TRAVEL_STATUS.done,
    statusTodo: TRAVEL_STATUS.todo,
    headerEmpty: 'Ajoutez vos premières destinations',
    headerAllDone: 'Tous vos voyages sont réalisés',
    headerOneTodo: '1 destination à explorer',
    headerManyTodo: (n) => `${n} destinations à explorer`,
    emptyNone: 'Aucun voyage enregistré',
    emptyFiltered: 'Aucun voyage ne correspond à ces filtres',
    addCta: 'Ajouter un voyage',
  }),
  sidebarIconKey: 'travel',
  initDetail: initTravelHubDetail,
  renderListGroups: renderTravelListGroups,
  renderGroupHead: renderTravelGroupHead,
  renderGroupListItem: renderTravelGroupListItem,
  resolveListItemFromRow: resolveTravelListItemFromRow,
  preloadCollections: ['activities', 'restaurants'],
  watchCollections: ['activities', 'restaurants'],
  renderTypeIcon: (item) => renderTravelListTypeIcon(item, renderTravelTypeIcon, travelScheduleBadgeOptions),
  renderListMeta: (item, ctx) =>
    `<p class="act-list-meta">${ctx.escapeHtml(getTravelMetaLine(item, ctx))}</p>`,
  renderLocation: renderTravelCountry,
  getItemRowClasses: (item) => (hasTravelPeriod(item) ? ' act-list-item--scheduled' : ''),
  getPickLocation: (item) => item.localisation?.trim() || item.pays?.trim() || '',
  mapTab: createMapTabOptions({
    prefix: 'voyages',
    emptyHint: 'Ajoutez une adresse à vos voyages pour les voir ici.',
    mapListFilters: (state) => ({
      status: state.status,
      travelType: state.type || [],
    }),
  }),
});

export const initVoyagesPage = init;
export const destroyVoyagesPage = destroy;
export const refreshVoyagesPage = refresh;
