import { getCategoryById } from '../../config.js';
import { formatItemPrice, formatPrice } from '../../lib/price-format.js';
import { sanitizeHttpsUrl } from '../../lib/safe-url.js';
import { renderWishlistPriorityIcon } from './IconsType.js';
import { initWishlistDetail } from '../../ui/wishlist-detail.js';
import { createListPageController, DEFAULT_SORT_OPTIONS } from '../shared/listPageController.js';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Tout' },
  { value: 'todo', label: 'À obtenir' },
  { value: 'done', label: 'Obtenu' },
];

function getLinkLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function getWishlistPriceLabel(item, formatItemPriceFn) {
  const structured = formatItemPriceFn(item);
  if (structured) return structured;
  const raw = item.prix;
  if (raw == null || String(raw).trim() === '') return '';
  return formatPrice(raw);
}

function getWishlistMetaLine(item, { getFieldLabel, formatItemPrice: formatItemPriceFn }) {
  const parts = [];
  if (item.priorite) parts.push(getFieldLabel('priorite', item.priorite));
  const priceLabel = getWishlistPriceLabel(item, formatItemPriceFn);
  if (priceLabel) parts.push(priceLabel);
  return parts.join(' · ');
}

const LINK_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
`;

function renderWishlistListMeta(item, ctx) {
  const line = getWishlistMetaLine(item, ctx);
  if (!line) return '';
  return `<p class="act-list-meta">${ctx.escapeHtml(line)}</p>`;
}

function renderWishlistLink(item, { escapeHtml: esc }) {
  if (!item.lien?.trim()) return '';

  const url = sanitizeHttpsUrl(item.lien);
  const label = esc(getLinkLabel(item.lien.trim()));

  if (url) {
    return `
      <a href="${esc(url)}" class="act-location" target="_blank" rel="noopener noreferrer">
        ${LINK_ICON}
        <span>${label}</span>
      </a>
    `;
  }

  return `
    <p class="act-location act-location--text">
      ${LINK_ICON}
      <span>${label}</span>
    </p>
  `;
}

const { init, destroy, refresh } = createListPageController({
  categoryId: 'wishlist',
  collection: 'wishlist',
  theme: getCategoryById('wishlist')?.theme || 'pink',
  dom: {
    listId: 'wishlist-list',
    listPanelId: 'wishlist-list-panel',
  },
  itemIdAttr: 'data-wishlist-id',
  subTitleElId: 'page-header-sub',
  useTodoHeaderSubtitle: false,
  filterFieldKeys: ['priorite'],
  sortOptions: DEFAULT_SORT_OPTIONS,
  statusFilterOptions: STATUS_FILTER_OPTIONS,
  filterDefaults: { priorite: [], status: 'all' },
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
      id: 'priorite',
      label: 'Priorité',
      mode: 'multi',
      getOptions: () => getAvailableFilterOptions('priorite'),
    },
  ],
  labels: {
    filterToolbarAria: 'Filtrer et trier la wishlist',
    countSingular: 'envie',
    countPlural: 'envies',
    statusDone: 'Obtenu',
    statusTodo: 'À obtenir',
    headerEmpty: 'Ajoutez vos premières envies',
    headerAllDone: 'Tout est dans la poche',
    headerOneTodo: '1 envie en attente',
    headerManyTodo: (n) => `${n} envies en attente`,
    emptyNone: 'Aucun élément dans la wishlist',
    emptyFiltered: 'Aucun élément ne correspond à ces filtres',
    addCta: 'Ajouter à la wishlist',
    pickEmptyTitle: 'Rien à piocher',
    pickEmptyText: 'Ajoutez des envies pour commencer.',
    pickAllDoneTitle: 'Bravo !',
    pickAllDoneText: 'Tout est dans la poche.',
    pickIdleText: 'Lancez le dé pour piocher une envie',
    pickQuotaExhaustedText: 'Vous avez tout pioché pour aujourd\'hui. Revenez demain !',
  },
  sidebarIconKey: 'wishlist',
  initDetail: initWishlistDetail,
  renderTypeIcon: (item) => renderWishlistPriorityIcon(item.priorite),
  renderListMeta: renderWishlistListMeta,
  renderLocation: renderWishlistLink,
  getPickLocation: (item) => item.lien || '',
});

export const initWishlistPage = init;
export const destroyWishlistPage = destroy;
export const refreshWishlistPage = refresh;
