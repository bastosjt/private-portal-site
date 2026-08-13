import { getCategoryById } from '../../config.js';
import { formatListItemPrice, formatPrice } from '../../lib/price-format.js';
import { renderWishlistListIcon } from './IconsType.js';
import { initWishlistDetail } from '../../ui/wishlist-detail.js';
import { initWishlistControls } from './wishlist-controls.js';
import { getCategoryStatusLabels } from '../../lib/category-status-labels.js';
import { createListPageController, DEFAULT_SORT_OPTIONS } from '../shared/listPageController.js';
import { createListPageLabels, createSortOnlyFilterSections } from '../shared/listPageBoilerplate.js';
import { createListOnlyPageDom } from '../shared/listPageDom.js';
import { createDotJoinedListMetaRenderer } from '../shared/listMetaRenderers.js';
import {
  AUTHOR_FILTER_OPTIONS,
  filterWishlistByAuthor,
  getAuthorFilterOptions,
} from './wishlistAuthorFilters.js';

const WISHLIST_STATUS = getCategoryStatusLabels('wishlist');

function getWishlistPriceLabel(item, formatItemPriceFn) {
  const structured = formatItemPriceFn(item);
  if (structured) return structured;
  const raw = item.prix;
  if (raw == null || String(raw).trim() === '') return '';
  const legacy = formatPrice(raw);
  if (/^gratuit$/i.test(legacy.trim())) return '';
  return legacy;
}

const { renderListMeta: renderWishlistListMeta } = createDotJoinedListMetaRenderer({
  getParts: (item, { getFieldLabel, formatItemPrice: formatItemPriceFn }) => {
    const parts = [];
    if (item.priorite) parts.push(getFieldLabel('priorite', item.priorite));
    const priceLabel = getWishlistPriceLabel(item, formatItemPriceFn);
    if (priceLabel) parts.push(priceLabel);
    return parts;
  },
});

const { init, destroy, refresh } = createListPageController({
  categoryId: 'wishlist',
  collection: 'wishlist',
  theme: getCategoryById('wishlist')?.theme || 'pink',
  dom: createListOnlyPageDom('wishlist'),
  itemIdAttr: 'data-wishlist-id',
  enablePick: false,
  useTodoHeaderSubtitle: true,
  filterByStatus: filterWishlistByAuthor,
  filterBadgeExcludeKeys: ['status'],
  filterFieldKeys: ['priorite'],
  sortOptions: DEFAULT_SORT_OPTIONS,
  statusFilterOptions: AUTHOR_FILTER_OPTIONS,
  filterDefaults: { priorite: [], status: 'mine' },
  listControlsMount: (api, signal) => initWishlistControls({
    signal,
    getSegmentOptions: () => getAuthorFilterOptions(api.getViewerUid?.()),
    getFilterState: api.getFilterState,
    setAuthor: api.setStatus,
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
    listEmptySub: 'Aucune envie pour le moment',
  }),
  sidebarIconKey: 'wishlist',
  initDetail: initWishlistDetail,
  renderTypeIcon: (item) => renderWishlistListIcon(item),
  renderListMeta: renderWishlistListMeta,
  renderLocation: () => '',
  getPickLocation: () => '',
});

export const initWishlistPage = init;
export const destroyWishlistPage = destroy;
export const refreshWishlistPage = refresh;
