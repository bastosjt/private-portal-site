import { getCategoryById } from '../../config.js';
import { formatItemPrice } from '../../lib/price-format.js';
import { getFieldOptionLabel } from '../../lib/custom-types.js';
import { renderActivityTypeIcon } from './IconsType.js';
import { initActivityDetail } from '../../ui/activity-detail.js';
import {
  getActivityListMetaParts,
  hasActivitySchedule,
  renderActivityScheduleNote,
} from './scheduleDisplay.js';
import { createListPageController, DEFAULT_SORT_OPTIONS } from '../shared/listPageController.js';
import { createMapTabOptions } from '../shared/listMapSection.js';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Tout' },
  { value: 'todo', label: 'Non fait' },
  { value: 'done', label: 'Fait' },
];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getMapsUrl(item) {
  if (item.latitude != null && item.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`;
  }
  if (item.localisation) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.localisation)}`;
  }
  return null;
}

function renderActivityLocation(item, { escapeHtml: esc }) {
  if (!item.localisation) return '';
  const mapsUrl = getMapsUrl(item);
  const pinIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  `;

  if (mapsUrl) {
    return `
      <a href="${mapsUrl}" class="act-location" target="_blank" rel="noopener noreferrer">
        ${pinIcon}
        <span>${esc(item.localisation)}</span>
      </a>
    `;
  }

  return `
    <p class="act-location act-location--text">
      ${pinIcon}
      <span>${esc(item.localisation)}</span>
    </p>
  `;
}

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
      id: 'categorie',
      label: 'Type',
      mode: 'multi',
      getOptions: () => getAvailableFilterOptions('categorie'),
    },
  ],
  labels: {
    filterToolbarAria: 'Filtrer et trier les activités',
    countSingular: 'activité',
    countPlural: 'activités',
    statusDone: 'Fait',
    statusTodo: 'Non fait',
    headerEmpty: 'Ajoutez vos premières sorties',
    headerAllDone: 'Toutes vos idées sont faites',
    headerOneTodo: '1 idée à explorer',
    headerManyTodo: (n) => `${n} idées à explorer`,
    emptyNone: 'Aucune activité enregistrée',
    emptyFiltered: 'Aucune activité ne correspond à ces filtres',
    addCta: 'Ajouter une activité',
    pickEmptyTitle: 'Rien à piocher',
    pickEmptyText: 'Ajoutez des activités pour commencer.',
    pickAllDoneTitle: 'Bravo !',
    pickAllDoneText: 'Toutes vos idées sont faites.',
    pickIdleText: 'Lancez le dé pour piocher une activité',
    pickQuotaExhaustedText: 'Vous avez pioché toutes vos idées disponibles. Revenez demain !',
  },
  sidebarIconKey: 'activity',
  initDetail: initActivityDetail,
  renderTypeIcon: (item) => renderActivityTypeIcon(item.categorie),
  renderListMeta: (item, ctx) =>
    `<p class="act-list-meta">${ctx.escapeHtml(getActivityMetaLine(item, ctx))}</p>`,
  renderLocation: renderActivityLocation,
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
