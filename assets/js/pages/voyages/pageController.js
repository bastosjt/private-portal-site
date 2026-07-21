import { CalendarClock } from '../../vendor/lucide.mjs';
import { getCategoryById } from '../../config.js';
import { renderLucideIcon } from '../../lib/lucide-icon.js';
import { renderTravelTypeIcon } from './IconsType.js';
import { initTravelDetail } from '../../ui/travel-detail.js';
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

const TRAVEL_STATUS = getCategoryStatusLabels('travels');
const STATUS_FILTER_OPTIONS = createCategoryStatusFilterOptions('travels');

const SORT_OPTIONS = DEFAULT_SORT_OPTIONS.filter((opt) => opt.id === 'alpha' || opt.id === 'recent');

const PERIOD_ICON = renderLucideIcon(CalendarClock, { strokeWidth: 2, width: 16, height: 16 });

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

function renderTravelPeriodNote(item, { escapeHtml }) {
  const periode = item.periode?.trim();
  if (!periode) return '';

  return `
    <div class="act-schedule-note act-schedule-note--periode" role="note" aria-label="${escapeHtml(periode)}">
      <span class="act-schedule-note-icon" aria-hidden="true">${PERIOD_ICON}</span>
      <span class="act-schedule-note-copy">
        <span class="act-schedule-note-period">${escapeHtml(periode)}</span>
      </span>
    </div>
  `;
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
  pickScope: 'travels',
  theme: getCategoryById('travels')?.theme || 'blue',
  titleKey: 'destination',
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
    pickEmptyText: 'Ajoutez des destinations pour commencer.',
    pickAllDoneText: 'Toutes vos destinations sont réalisées.',
    pickIdleText: 'Lancez le dé pour piocher une destination',
    pickQuotaExhaustedText: 'Vous avez pioché toutes vos destinations disponibles. Revenez demain !',
  }),
  sidebarIconKey: 'travel',
  initDetail: initTravelDetail,
  renderTypeIcon: (item) => renderTravelTypeIcon(item.type),
  renderListMeta: (item, ctx) =>
    `<p class="act-list-meta">${ctx.escapeHtml(getTravelMetaLine(item, ctx))}</p>`,
  renderLocation: renderTravelCountry,
  getItemRowClasses: (item) => (hasTravelPeriod(item) ? ' act-list-item--scheduled' : ''),
  renderItemBodyExtra: renderTravelPeriodNote,
  getPickLocation: (item) => item.localisation?.trim() || item.pays?.trim() || '',
  mapTab: createMapTabOptions({
    prefix: 'voyages',
    countSingular: 'destination',
    countPlural: 'destinations',
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
