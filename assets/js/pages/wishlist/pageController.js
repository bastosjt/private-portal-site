import { getCategoryById } from '../../config.js';
import { formatItemPrice, formatPrice } from '../../lib/price-format.js';
import { sanitizeHttpsUrl } from '../../lib/safe-url.js';
import { getPartnerUid, getPartnerBadgeLabel, getDisplayNameForUid, DEFAULT_PARTNER_NICKNAME_LABEL } from '../../lib/user-profile.js';
import { getItemAuthorUid } from '../../ui/item-author.js';
import { renderWishlistPriorityIcon } from './IconsType.js';
import { initWishlistDetail } from '../../ui/wishlist-detail.js';
import { initWishlistControls } from './wishlist-controls.js';
import { getCategoryStatusLabels } from '../../lib/category-status-labels.js';
import { createListPageController, DEFAULT_SORT_OPTIONS } from '../shared/listPageController.js';
import { createListPageLabels, createSortOnlyFilterSections } from '../shared/listPageBoilerplate.js';

const WISHLIST_STATUS = getCategoryStatusLabels('wishlist');

const AUTHOR_FILTER_OPTIONS = [
  { value: 'all', label: 'Tout', ariaLabel: 'Toutes les envies' },
  { value: 'mine', label: 'Moi', ariaLabel: 'Mes envies' },
  { value: 'partner', label: 'Partenaire', ariaLabel: 'Envies du partenaire' },
];

const PRIORITY_ORDER = { haute: 0, moyenne: 1, basse: 2 };

function getPartnerFirstName(viewerUid) {
  const partnerUid = getPartnerUid(viewerUid);
  if (!partnerUid) return 'Partenaire';
  const name = getDisplayNameForUid(partnerUid);
  const firstName = name.split(/\s+/).filter(Boolean)[0];
  return firstName || 'Partenaire';
}

function getPartnerWishesLabel(viewerUid) {
  const nickname = getPartnerBadgeLabel(viewerUid);
  if (nickname === DEFAULT_PARTNER_NICKNAME_LABEL) return 'Envies du partenaire';
  return `Envies de ${nickname}`;
}

function getAuthorFilterOptions(viewerUid) {
  const partnerName = getPartnerFirstName(viewerUid);
  return AUTHOR_FILTER_OPTIONS.map((opt) => {
    if (opt.value === 'partner') {
      return {
        ...opt,
        label: partnerName,
        ariaLabel: getPartnerWishesLabel(viewerUid),
      };
    }
    return opt;
  });
}

function filterWishlistByAuthor(items, author, { viewerUid }) {
  if (author === 'mine') {
    return items.filter((item) => getItemAuthorUid(item) === viewerUid);
  }

  if (author === 'partner') {
    const partnerUid = getPartnerUid(viewerUid);
    if (!partnerUid) return [];
    return items.filter((item) => getItemAuthorUid(item) === partnerUid);
  }

  return items;
}

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

function sortByPriorityThenAlpha(items) {
  return [...items].sort((a, b) => {
    const priorityA = PRIORITY_ORDER[a.priorite] ?? 99;
    const priorityB = PRIORITY_ORDER[b.priorite] ?? 99;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return (a.nom || '').localeCompare(b.nom || '', 'fr', { sensitivity: 'base' });
  });
}

function renderWishlistListGroups(items, { activeFilters, labels, viewerUid }) {
  if (activeFilters.status !== 'all') return null;

  const partnerUid = getPartnerUid(viewerUid);
  const mine = sortByPriorityThenAlpha(items.filter((item) => getItemAuthorUid(item) === viewerUid));
  const partner = sortByPriorityThenAlpha(items.filter((item) => partnerUid && getItemAuthorUid(item) === partnerUid));
  const other = sortByPriorityThenAlpha(items.filter((item) => {
    const uid = getItemAuthorUid(item);
    return uid && uid !== viewerUid && uid !== partnerUid;
  }));

  const groups = [];

  if (mine.length) {
    groups.push({
      id: 'mine',
      label: `${labels.authorMine} (${mine.length})`,
      items: mine,
      collapsible: false,
    });
  }

  if (partner.length) {
    groups.push({
      id: 'partner',
      label: `${labels.authorPartner(viewerUid)} (${partner.length})`,
      items: partner,
      collapsible: true,
    });
  }

  if (other.length) {
    groups.push({
      id: 'other',
      label: `${labels.authorOther} (${other.length})`,
      items: other,
      collapsible: true,
    });
  }

  return groups.length ? groups : null;
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
  useTodoHeaderSubtitle: true,
  searchKeys: ['nom', 'description'],
  renderListGroups: renderWishlistListGroups,
  filterByStatus: filterWishlistByAuthor,
  defaultCollapsedGroups: ['partner'],
  filterBadgeExcludeKeys: ['status'],
  filterFieldKeys: ['priorite'],
  sortOptions: DEFAULT_SORT_OPTIONS,
  statusFilterOptions: AUTHOR_FILTER_OPTIONS,
  filterDefaults: { priorite: [], status: 'all' },
  listControlsMount: (api, signal) => initWishlistControls({
    signal,
    getSegmentOptions: () => getAuthorFilterOptions(api.getViewerUid?.()),
    getFilterState: api.getFilterState,
    setAuthor: api.setStatus,
    setSearchQuery: api.setSearchQuery,
    getSearchQuery: api.getSearchQuery,
    removePriority: api.removePriority,
    getPriorityOptions: api.getPriorityOptions,
  }),
  getFilterSections: createSortOnlyFilterSections(DEFAULT_SORT_OPTIONS, [
    { id: 'priorite', label: 'Priorité' },
  ]),
  labels: createListPageLabels({
    filterToolbarAria: 'Trier et filtrer par priorité',
    countSingular: 'envie',
    countPlural: 'envies',
    statusDone: WISHLIST_STATUS.done,
    statusTodo: WISHLIST_STATUS.todo,
    headerEmpty: 'Ajoutez vos premières envies',
    headerAllDone: 'Tout est dans la poche',
    headerOneTodo: '1 envie en attente',
    headerManyTodo: (n) => `${n} envies en attente`,
    emptyNone: 'Aucun élément dans la wishlist',
    emptyFiltered: 'Aucun élément ne correspond à ces filtres',
    addCta: 'Ajouter à la wishlist',
    pickEmptyText: '',
    pickAllDoneText: '',
    pickIdleText: '',
    pickQuotaExhaustedText: '',
    countFiltered: (count, total) => `${count} affichée${count > 1 ? 's' : ''} sur ${total}`,
    authorMine: 'Mes envies',
    authorPartner: (viewerUid) => getPartnerWishesLabel(viewerUid),
    authorOther: 'Autres envies',
    listEmptySub: 'Aucune envie pour le moment',
  }),
  sidebarIconKey: 'wishlist',
  initDetail: initWishlistDetail,
  renderTypeIcon: (item) => renderWishlistPriorityIcon(item.priorite),
  renderListMeta: renderWishlistListMeta,
  renderLocation: renderWishlistLink,
  getPickLocation: () => '',
});

export const initWishlistPage = init;
export const destroyWishlistPage = destroy;
export const refreshWishlistPage = refresh;
