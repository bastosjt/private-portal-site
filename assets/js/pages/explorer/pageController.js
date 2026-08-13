import { ensurePrefetch, findCachedItemById } from '../../data/appDataCache.js';
import { mapPlaceMoveHref } from '../../navigation/router.js';
import { destroyCategoryDetailModals, initCategoryDetailModals } from '../../ui/category-detail-registry.js';
import { renderExplorerSection } from '../../ui/explorer-section.js';
import { destroyExplorerSearch, initExplorerSearch } from './explorer-search.js';

const EXPLORER_DETAIL_CATEGORIES = ['activities', 'restaurants', 'movies', 'travels', 'wishlist'];

let pageAbort = null;
let detailModals = {};

async function loadExplorerData() {
  await ensurePrefetch();
  renderExplorerSection(document.getElementById('home-explorer'), { enriched: true });
}

function initDetailModals() {
  destroyCategoryDetailModals(detailModals);
  detailModals = initCategoryDetailModals(EXPLORER_DETAIL_CATEGORIES, {
    onChanged: () => loadExplorerData(),
    onMovePin: async (categoryId, item) => {
      await detailModals[categoryId]?.close?.();
      window.location.hash = mapPlaceMoveHref(categoryId, item.id).slice(1);
    },
  });
}

function openExplorerItemDetail(categoryId, itemId) {
  const item = findCachedItemById(categoryId, itemId);
  const modal = detailModals[categoryId];
  if (!item || !modal) return;
  modal.open(item);
}

export async function initExplorerPage() {
  pageAbort?.abort();
  pageAbort = new AbortController();

  initDetailModals();
  await loadExplorerData();

  initExplorerSearch({
    signal: pageAbort.signal,
    onSelect: ({ categoryId, itemId }) => openExplorerItemDetail(categoryId, itemId),
  });
}

export function refreshExplorerPage() {
  return loadExplorerData();
}

export function destroyExplorerPage() {
  pageAbort?.abort();
  pageAbort = null;
  destroyExplorerSearch();
  destroyCategoryDetailModals(detailModals);
  detailModals = {};
}
