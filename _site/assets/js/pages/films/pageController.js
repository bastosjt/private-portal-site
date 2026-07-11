import { getCategoryById } from '../../config.js';
import { renderMovieTypeIcon } from './IconsType.js';
import { initMovieDetail } from '../../ui/movie-detail.js';
import { createListPageController, DEFAULT_SORT_OPTIONS } from '../shared/listPageController.js';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Tout' },
  { value: 'todo', label: 'À voir' },
  { value: 'done', label: 'Terminé' },
];

// Les films/séries n'ont ni prix ni adresse : le tri se limite à alpha/récent.
const SORT_OPTIONS = DEFAULT_SORT_OPTIONS.filter((opt) => opt.id === 'alpha' || opt.id === 'recent');

function renderMovieListMeta(item, { escapeHtml, getFieldLabel }) {
  const type = item.type ? escapeHtml(getFieldLabel('type', item.type)) : 'Film';

  return `
    <div class="act-list-meta act-list-meta--restaurant">
      <span class="act-list-meta-type">${type}</span>
    </div>
  `;
}

const { init, destroy, refresh } = createListPageController({
  categoryId: 'movies',
  collection: 'movies',
  pickScope: 'movies',
  theme: getCategoryById('movies')?.theme || 'violet',
  titleKey: 'titre',
  dom: {
    listId: 'films-list',
    listPanelId: 'films-list-panel',
  },
  itemIdAttr: 'data-movie-id',
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
    filterToolbarAria: 'Filtrer et trier les films et séries',
    countSingular: 'titre',
    countPlural: 'titres',
    statusDone: 'Terminé',
    statusTodo: 'À voir',
    headerEmpty: 'Ajoutez vos premiers films et séries',
    headerAllDone: 'Vous avez tout terminé',
    headerOneTodo: '1 titre à voir',
    headerManyTodo: (n) => `${n} titres à voir`,
    emptyNone: 'Aucun film ou série enregistré',
    emptyFiltered: 'Aucun titre ne correspond à ces filtres',
    addCta: 'Ajouter un film',
    pickEmptyTitle: 'Rien à piocher',
    pickEmptyText: 'Ajoutez des films ou séries pour commencer.',
    pickAllDoneTitle: 'Bravo !',
    pickAllDoneText: 'Vous avez tout terminé.',
    pickIdleText: 'Lancez le dé pour piocher un titre',
    pickQuotaExhaustedText: 'Vous avez pioché tous vos titres disponibles. Revenez demain !',
  },
  sidebarIconKey: 'film',
  initDetail: initMovieDetail,
  renderTypeIcon: (item) => renderMovieTypeIcon(item.type),
  renderListMeta: renderMovieListMeta,
  renderLocation: () => '',
  getPickLocation: () => '',
});

export const initFilmsPage = init;
export const destroyFilmsPage = destroy;
export const refreshFilmsPage = refresh;
