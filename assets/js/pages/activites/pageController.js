import { getCategoryById } from '../../config.js';
import { escapeHtml } from '../../lib/escape-html.js';
import { getFieldOptionLabel } from '../../lib/custom-types.js';
import { renderActivityTypeIcon } from './IconsType.js';
import { initActivityDetail } from '../../ui/activity-detail.js';
import {
  getActivityListMetaParts,
  hasActivitySchedule,
  renderActivityListTypeIcon,
} from './scheduleDisplay.js';
import { createListPageController, DEFAULT_SORT_OPTIONS } from '../shared/listPageController.js';
import {
  createListFilterSections,
  createListPageLabels,
} from '../shared/listPageBoilerplate.js';
import { createMapTabOptions } from '../shared/listMapSection.js';
import { createGeoListPageDom } from '../shared/listPageDom.js';
import { createDotJoinedListMetaRenderer } from '../shared/listMetaRenderers.js';
import { createTodoListPageStatus } from '../shared/todoListPageSetup.js';

const { statusLabels: ACTIVITY_STATUS, statusFilterOptions: STATUS_FILTER_OPTIONS } =
  createTodoListPageStatus('activities');

const scheduleBadgeOptions = {
  getDisponibiliteLabel: (value) => getFieldOptionLabel('activities', 'disponibilite', value),
  escapeHtml,
  showPeriod: false,
  theme: getCategoryById('activities')?.theme || 'cyan',
};

const { renderListMeta: renderActivityListMeta } = createDotJoinedListMetaRenderer({
  fallback: 'Activité',
  getParts: (item, { getFieldLabel, formatItemPrice }) =>
    getActivityListMetaParts(item, {
      getCategorieLabel: (value) => getFieldLabel('categorie', value),
      formatItemPrice,
    }),
});

const { init, destroy, refresh } = createListPageController({
  categoryId: 'activities',
  collection: 'activities',
  pickScope: 'activities',
  theme: getCategoryById('activities')?.theme || 'cyan',
  dom: createGeoListPageDom('activities'),
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
  renderTypeIcon: (item) => renderActivityListTypeIcon(item, renderActivityTypeIcon, scheduleBadgeOptions),
  renderListMeta: renderActivityListMeta,
  renderLocation: () => '',
  getItemRowClasses: (item) => (hasActivitySchedule(item) ? ' act-list-item--scheduled' : ''),
  getPickLocation: (item) => item.localisation || '',
  mapTab: createMapTabOptions({
    prefix: 'activities',
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
