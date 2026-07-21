import { getCategoryById } from '../../config.js';
import { formatItemPrice } from '../../lib/price-format.js';
import { escapeHtml } from '../../lib/escape-html.js';
import { getFieldOptionLabel } from '../../lib/custom-types.js';
import { renderActivityTypeIcon } from './IconsType.js';
import { initActivityDetail } from '../../ui/activity-detail.js';
import {
  getActivityListMetaParts,
  hasActivitySchedule,
  renderActivityScheduleNote,
} from './scheduleDisplay.js';
import {
  createCategoryStatusFilterOptions,
  getCategoryDoneToggleLabels,
  getCategoryStatusLabels,
} from '../../lib/category-status-labels.js';
import { createListPageController, DEFAULT_SORT_OPTIONS } from '../shared/listPageController.js';
import {
  createListFilterSections,
  createListPageLabels,
} from '../shared/listPageBoilerplate.js';
import { renderGeoCategoryLocation } from '../shared/listLocation.js';
import { createMapTabOptions } from '../shared/listMapSection.js';

const ACTIVITY_STATUS = getCategoryStatusLabels('activities');
const STATUS_FILTER_OPTIONS = createCategoryStatusFilterOptions('activities');

const scheduleNoteOptions = {
  getDisponibiliteLabel: (value) => getFieldOptionLabel('activities', 'disponibilite', value),
  escapeHtml,
  showPeriod: false,
};

function getActivityMetaLine(item, { getFieldLabel, formatItemPrice: formatPrice }) {
  const parts = getActivityListMetaParts(item, {
    getCategorieLabel: (value) => getFieldLabel('categorie', value),
    formatItemPrice: formatPrice,
  });
  return parts.join(' · ') || 'Activité';
}

const { init, destroy, refresh } = createListPageController({
  categoryId: 'activities',
  collection: 'activities',
  pickScope: 'activities',
  theme: getCategoryById('activities')?.theme || 'cyan',
  dom: {
    listId: 'activities-list',
    listPanelId: 'activities-list-panel',
    mapPanelId: 'activities-map-panel',
    viewSwitchId: 'activities-view-switch',
    viewListBtnId: 'activities-view-list',
    viewMapBtnId: 'activities-view-map',
  },
  itemIdAttr: 'data-activity-id',
  filterFieldKeys: ['categorie'],
  sortOptions: DEFAULT_SORT_OPTIONS,
  statusFilterOptions: STATUS_FILTER_OPTIONS,
  filterDefaults: { categorie: [], status: 'all' },
  getFilterSections: createListFilterSections({
    statusOptions: STATUS_FILTER_OPTIONS,
    sortOptions: DEFAULT_SORT_OPTIONS,
    fields: [{ id: 'categorie', label: 'Type' }],
  }),
  labels: createListPageLabels({
    filterToolbarAria: 'Filtrer et trier les activités',
    countSingular: 'activité',
    countPlural: 'activités',
    statusDone: ACTIVITY_STATUS.done,
    statusTodo: ACTIVITY_STATUS.todo,
    headerEmpty: 'Ajoutez vos premières sorties',
    headerAllDone: 'Toutes vos idées sont réalisées',
    headerOneTodo: '1 idée à explorer',
    headerManyTodo: (n) => `${n} idées à explorer`,
    emptyNone: 'Aucune activité enregistrée',
    emptyFiltered: 'Aucune activité ne correspond à ces filtres',
    addCta: 'Ajouter une activité',
    pickEmptyText: 'Ajoutez des activités pour commencer.',
    pickAllDoneText: 'Toutes vos idées sont réalisées.',
    pickIdleText: 'Lancez le dé pour piocher une activité',
    pickQuotaExhaustedText: 'Vous avez pioché toutes vos idées disponibles. Revenez demain !',
  }),
  sidebarIconKey: 'activity',
  excludeTravelLinkedFromList: true,
  initDetail: initActivityDetail,
  renderTypeIcon: (item) => renderActivityTypeIcon(item.categorie),
  renderListMeta: (item, ctx) =>
    `<p class="act-list-meta">${ctx.escapeHtml(getActivityMetaLine(item, ctx))}</p>`,
  renderLocation: (item, ctx) => renderGeoCategoryLocation(item, 'activities', ctx),
  getItemRowClasses: (item) => (hasActivitySchedule(item) ? ' act-list-item--scheduled' : ''),
  renderItemBodyExtra: (item) => renderActivityScheduleNote(item, scheduleNoteOptions),
  getPickLocation: (item) => item.localisation || '',
  mapTab: createMapTabOptions({
    prefix: 'activities',
    countSingular: 'activité',
    countPlural: 'activités',
    emptyHint: 'Ajoutez une adresse à vos activités pour les voir ici.',
    mapListFilters: (state) => ({
      status: state.status,
      activityType: state.categorie || [],
    }),
  }),
});

export const initActivitiesPage = init;
export const destroyActivitiesPage = destroy;
export const refreshActivitiesPage = refresh;
