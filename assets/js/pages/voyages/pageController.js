import { CalendarClock } from '../../vendor/lucide.mjs';
import { getCategoryById } from '../../config.js';
import { renderLucideIcon } from '../../lib/lucide-icon.js';
import { renderTravelTypeIcon } from './IconsType.js';
import { initTravelDetail } from '../../ui/travel-detail.js';
import { createListPageController, DEFAULT_SORT_OPTIONS } from '../shared/listPageController.js';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Tout' },
  { value: 'todo', label: 'À faire' },
  { value: 'done', label: 'Fait' },
];

const SORT_OPTIONS = DEFAULT_SORT_OPTIONS.filter((opt) => opt.id === 'alpha' || opt.id === 'recent');

const PERIOD_ICON = renderLucideIcon(CalendarClock, { strokeWidth: 2, width: 16, height: 16 });

const GLOBE_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
    <path d="M2 12h20"/>
  </svg>
`;

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

function renderTravelCountry(item, { escapeHtml: esc }) {
  if (!item.pays?.trim()) return '';

  return `
    <p class="act-location act-location--text">
      ${GLOBE_ICON}
      <span>${esc(item.pays.trim())}</span>
    </p>
  `;
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
      options: SORT_OPTIONS.map((opt) => ({ value: opt.id, label: opt.label })),
    },
    {
      id: 'type',
      label: 'Type',
      mode: 'multi',
      getOptions: () => getAvailableFilterOptions('type'),
    },
  ],
  labels: {
    filterToolbarAria: 'Filtrer et trier les voyages',
    countSingular: 'destination',
    countPlural: 'destinations',
    statusDone: 'Fait',
    statusTodo: 'À faire',
    headerEmpty: 'Ajoutez vos premières destinations',
    headerAllDone: 'Tous vos voyages sont faits',
    headerOneTodo: '1 destination à explorer',
    headerManyTodo: (n) => `${n} destinations à explorer`,
    emptyNone: 'Aucun voyage enregistré',
    emptyFiltered: 'Aucun voyage ne correspond à ces filtres',
    addCta: 'Ajouter un voyage',
    pickEmptyTitle: 'Rien à piocher',
    pickEmptyText: 'Ajoutez des destinations pour commencer.',
    pickAllDoneTitle: 'Bravo !',
    pickAllDoneText: 'Toutes vos destinations sont faites.',
    pickIdleText: 'Lancez le dé pour piocher une destination',
    pickQuotaExhaustedText: 'Vous avez pioché toutes vos destinations disponibles. Revenez demain !',
  },
  sidebarIconKey: 'travel',
  initDetail: initTravelDetail,
  renderTypeIcon: (item) => renderTravelTypeIcon(item.type),
  renderListMeta: (item, ctx) =>
    `<p class="act-list-meta">${ctx.escapeHtml(getTravelMetaLine(item, ctx))}</p>`,
  renderLocation: renderTravelCountry,
  getItemRowClasses: (item) => (hasTravelPeriod(item) ? ' act-list-item--scheduled' : ''),
  renderItemBodyExtra: renderTravelPeriodNote,
  getPickLocation: (item) => item.pays?.trim() || '',
});

export const initVoyagesPage = init;
export const destroyVoyagesPage = destroy;
export const refreshVoyagesPage = refresh;
