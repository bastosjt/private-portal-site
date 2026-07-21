import { getCategoryById } from '../../config.js';
import { renderMovieTypeIcon } from './IconsType.js';
import { initMovieDetail } from '../../ui/movie-detail.js';
import {
  createCategoryStatusFilterOptions,
  getCategoryStatusLabels,
} from '../../lib/category-status-labels.js';
import { createListPageController, DEFAULT_SORT_OPTIONS } from '../shared/listPageController.js';
import {
  createListFilterSections,
  createListPageLabels,
} from '../shared/listPageBoilerplate.js';

const MOVIE_STATUS = getCategoryStatusLabels('movies');
const STATUS_FILTER_OPTIONS = createCategoryStatusFilterOptions('movies');

// Les films/séries n'ont ni prix ni adresse : le tri se limite à alpha/récent.
const SORT_OPTIONS = DEFAULT_SORT_OPTIONS.filter((opt) => opt.id === 'alpha' || opt.id === 'recent');

function getMovieMetaLine(item, { getFieldLabel }) {
  const parts = [];
  if (item.type) parts.push(getFieldLabel('type', item.type));
  if (item.genre) parts.push(getFieldLabel('genre', item.genre));
  return parts.join(' · ') || 'Film';
}

function renderMovieListMeta(item, ctx) {
  return `<p class="act-list-meta">${ctx.escapeHtml(getMovieMetaLine(item, ctx))}</p>`;
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
  filterFieldKeys: ['type', 'genre'],
  sortOptions: SORT_OPTIONS,
  statusFilterOptions: STATUS_FILTER_OPTIONS,
  filterDefaults: { type: [], genre: [], status: 'all' },
  getFilterSections: createListFilterSections({
    statusOptions: STATUS_FILTER_OPTIONS,
    sortOptions: SORT_OPTIONS,
    fields: [
      { id: 'type', label: 'Type' },
      { id: 'genre', label: 'Genre' },
    ],
  }),
  labels: createListPageLabels({
    filterToolbarAria: 'Filtrer et trier les films et séries',
    countSingular: 'titre',
    countPlural: 'titres',
    statusDone: MOVIE_STATUS.done,
    statusTodo: MOVIE_STATUS.todo,
    headerEmpty: 'Ajoutez vos premiers films et séries',
    headerAllDone: 'Tous vos titres sont vus',
    headerOneTodo: '1 titre à voir',
    headerManyTodo: (n) => `${n} titres à voir`,
    emptyNone: 'Aucun film ou série enregistré',
    emptyFiltered: 'Aucun titre ne correspond à ces filtres',
    addCta: 'Ajouter un film ou une série',
    pickEmptyText: 'Ajoutez des films ou séries pour commencer.',
    pickAllDoneText: 'Tous vos titres sont vus.',
    pickIdleText: 'Lancez le dé pour piocher un film ou une série',
    pickQuotaExhaustedText: 'Vous avez pioché tous vos titres disponibles. Revenez demain !',
  }),
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
