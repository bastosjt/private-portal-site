import { getCategoryById, getUserDisplayName, MAP_ACCENT } from '../../config.js';
import { getListPreferences, saveListPreferences } from '../../lib/user-profile.js';
import { formatItemPrice, formatListItemPrice, compareItemsByPrice } from '../../lib/price-format.js';
import { ensureItems, hasCachedItems, getCachedItems, findCachedItemById } from '../../data/appDataCache.js';
import { sidebarIcon } from '../../ui/sidebar.js';
import { renderEmptyStateHtml, renderEmptyStateCta } from '../../ui/empty-state.js';
import { initAddItem } from '../../ui/add-item.js';
import { initListFilters } from '../../ui/list-filters.js';
import {
  cleanupPickRollAnimation,
  runPickRollAnimation,
  syncPickInnerLayout,
} from '../../ui/pick-roll-animation.js';
import { renderPickLocationLine, renderPickPeriodLabel } from '../../ui/pick-result-display.js';
import { getCategoryFieldOptions, getFieldOptionLabel, initCustomOptions } from '../../lib/custom-types.js';
import { shouldShowInGlobalCategoryList } from '../../lib/travel-link.js';
import {
  addTodayPick,
  canPickToday,
  getDisplayedLatestPick,
  getPickQuotaLabel,
  getRemainingPicks,
  getTodayPickIds,
  loadDailyPicks,
  MAX_DAILY_PICKS,
  resetTodayPicks,
} from '../../firebase/dailyPicks.js';
import { buildFieldFilterOptions } from './filterOptions.js';
import { renderListToolbarHtml } from './listLayoutToolbar.js';
import { normalizeSearchText } from '../../lib/normalize-search.js';
import { escapeHtml } from '../../lib/escape-html.js';
import { navigate, mapPlaceMoveHref } from '../../navigation/router.js';
import { setPageHeaderSub } from '../../ui/page-header.js';
import { nextFrame } from '../../lib/transitions.js';
import { swapViewPanels, resetViewSwap } from '../../ui/view-panel-swap.js';

export const DEFAULT_SORT_OPTIONS = [
  { id: 'alpha', label: 'Ordre alphabétique', shortLabel: 'A → Z' },
  { id: 'recent', label: 'Plus récent', shortLabel: 'Récent' },
  { id: 'price-asc', label: 'Prix croissant', shortLabel: 'Prix ↑' },
  { id: 'price-desc', label: 'Prix décroissant', shortLabel: 'Prix ↓' },
];

function dataAttrToDatasetKey(attr) {
  return attr.replace(/^data-/, '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function renderStatusBadge(done, { doneLabel, todoLabel }) {
  return `
    <span class="act-list-status url-import-preview__price-badge ${done ? 'act-list-status--done' : 'act-list-status--todo'}">
      ${done ? `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5"/>
        </svg>
      ` : `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9"/>
        </svg>
      `}
      ${done ? doneLabel : todoLabel}
    </span>
  `;
}

function revealContentEl(el) {
  if (!el) return;
  el.classList.add('is-revealing');
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      el.classList.remove('is-revealing');
    });
  });
}

function renderPickCenteredMessage(title, text, { ctaHtml = '' } = {}) {
  return renderEmptyStateHtml({
    title,
    description: text,
    ctaHtml,
    extraClass: 'empty-state--pick',
  });
}

/**
 * Factory for activités / restaurants list pages (pioche, filtres, liste, détail).
 */
export function createListPageController(config) {
  const {
    categoryId,
    collection,
    pickScope = categoryId,
    theme,
    dom,
    itemIdAttr,
    filterFieldKeys,
    sortOptions = DEFAULT_SORT_OPTIONS,
    statusFilterOptions,
    filterDefaults,
    getFilterSections,
    labels,
    sidebarIconKey,
    initDetail,
    renderTypeIcon,
    renderListMeta,
    renderLocation,
    getItemRowClasses = () => '',
    renderItemBodyExtra = () => '',
    getPickLocation = () => '',
    titleKey = 'nom',
    subTitleElId = 'list-sub',
    useTodoHeaderSubtitle = true,
    mapTab: mapTabOptions = null,
    pageRootClass = 'activities-page',
    searchKeys = null,
    renderListGroups = null,
    renderGroupListItem = null,
    renderGroupHead = null,
    resolveListItemFromRow = null,
    preloadCollections = [],
    watchCollections = [],
    listControlsMount = null,
    filterBadgeExcludeKeys = [],
    filterByStatus = null,
    excludeTravelLinkedFromList = false,
    defaultCollapsedGroups = ['done'],
    enablePick = true,
    authorPanels = null,
  } = config;

  let allItems = [];
  let currentSort = 'alpha';
  let activeFilters = { ...filterDefaults };
  let searchQuery = '';
  let listHasAnimated = false;
  let addItemModal = null;
  let detailModal = null;
  let filterModal = null;
  let listControls = null;
  let collapsedListGroups = new Set(defaultCollapsedGroups);
  let seededCollapsedGroups = new Set();
  let isRolling = false;
  let pageAbort = null;
  let currentUserUid = null;
  let listViewMode = 'list';
  let listLayoutMode = 'list';
  let categoryMapTab = null;
  let viewSwapToken = 0;
  let layoutSwapToken = 0;

  function normalizeListItems(items) {
    if (!excludeTravelLinkedFromList) return items;
    return items.filter((item) => shouldShowInGlobalCategoryList(item, collection));
  }

  function getFieldLabel(fieldName, value) {
    return getFieldOptionLabel(categoryId, fieldName, value);
  }

  function getFieldOptions(fieldName) {
    return getCategoryFieldOptions(categoryId, fieldName);
  }

  function getAvailableFilterOptions(fieldName, items = allItems) {
    return buildFieldFilterOptions({
      items,
      fieldName,
      getFieldLabel,
      categoryId,
    });
  }

  function pruneActiveFilters() {
    const patch = {};
    let changed = false;

    for (const key of filterFieldKeys) {
      const available = new Set(getAvailableFilterOptions(key).map((opt) => opt.value));
      const values = (activeFilters[key] || []).filter((value) => available.has(value));
      if (values.length !== (activeFilters[key]?.length || 0)) {
        patch[key] = values;
        changed = true;
      }
    }

    if (changed) {
      activeFilters = { ...activeFilters, ...patch };
    }
  }

  function filtersAreActive() {
    if (searchQuery.trim()) return true;
    if (activeFilters.status !== 'all' && !filterBadgeExcludeKeys.includes('status')) return true;
    return filterFieldKeys.some((key) => (activeFilters[key]?.length || 0) > 0);
  }

  function matchesSearchQuery(item) {
    if (!searchKeys?.length || !searchQuery.trim()) return true;

    const query = normalizeSearchText(searchQuery);
    const haystack = searchKeys
      .map((key) => normalizeSearchText(item[key]))
      .filter(Boolean)
      .join(' ');

    return haystack.includes(query);
  }

  function getFilterState() {
    const state = {
      status: activeFilters.status || 'all',
      sort: currentSort,
      layout: listLayoutMode,
    };
    for (const key of filterFieldKeys) {
      state[key] = activeFilters[key] || [];
    }
    return state;
  }

  function applyFilters(items, { statusOverride = null } = {}) {
    let result = items;

    const status = statusOverride ?? activeFilters.status ?? 'all';

    if (filterByStatus) {
      result = filterByStatus(result, status, { viewerUid: currentUserUid });
    } else if (status === 'todo') {
      result = result.filter((item) => !item.done);
    } else if (status === 'done') {
      result = result.filter((item) => item.done);
    }

    return result.filter((item) => {
      if (!matchesSearchQuery(item)) return false;

      for (const key of filterFieldKeys) {
        const values = activeFilters[key] || [];
        if (values.length && (!item[key] || !values.includes(item[key]))) {
          return false;
        }
      }
      return true;
    });
  }

  function getFilteredItems() {
    return applyFilters(allItems);
  }

  function getItemsForAuthorStatus(status) {
    return applyFilters(allItems, { statusOverride: status });
  }

  function getListViewportEl() {
    if (dom.viewportId) {
      return document.getElementById(dom.viewportId);
    }
    return document.getElementById(dom.listPanelId)?.closest('.act-map-viewport') || null;
  }

  function collectLayoutListIds(panelConfig) {
    if (!panelConfig?.layoutPanels) return panelConfig?.listId ? [panelConfig.listId] : [];
    return Object.values(panelConfig.layoutPanels).map((entry) => entry.listId);
  }

  function getListElements() {
    if (authorPanels) {
      return Object.values(authorPanels)
        .flatMap((panel) => collectLayoutListIds(panel).map((listId) => document.getElementById(listId)))
        .filter(Boolean);
    }
    if (dom.layoutPanels) {
      return Object.values(dom.layoutPanels)
        .map((panel) => document.getElementById(panel.listId))
        .filter(Boolean);
    }
    const listEl = document.getElementById(dom.listId);
    return listEl ? [listEl] : [];
  }

  function getActiveLayoutContext() {
    if (authorPanels) {
      const panel = authorPanels[activeFilters.status];
      if (!panel?.layoutPanels) return null;
      return {
        viewport: document.getElementById(panel.layoutViewportId),
        panels: panel.layoutPanels,
      };
    }
    if (dom.layoutPanels) {
      return {
        viewport: document.getElementById(dom.layoutViewportId),
        panels: dom.layoutPanels,
      };
    }
    return null;
  }

  function renderListForLayoutConfig(items, panelConfig, { animate = false, authorStatus = null } = {}) {
    if (panelConfig.layoutPanels) {
      for (const layoutPanel of Object.values(panelConfig.layoutPanels)) {
        renderList(items, {
          animate,
          listId: layoutPanel.listId,
          authorStatus,
          layout: layoutPanel.layout,
        });
      }
      return;
    }

    renderList(items, {
      animate,
      listId: panelConfig.listId,
      authorStatus,
    });
  }

  function clearLayoutLists(panelConfig) {
    for (const listId of collectLayoutListIds(panelConfig)) {
      const listEl = document.getElementById(listId);
      if (listEl) listEl.innerHTML = '';
    }
  }

  function refreshActiveLayoutLists({ animate = false } = {}) {
    if (authorPanels) {
      const panel = authorPanels[activeFilters.status];
      if (!panel) return;
      renderListForLayoutConfig(getItemsForAuthorStatus(activeFilters.status), panel, {
        animate,
        authorStatus: activeFilters.status,
      });
      return;
    }

    if (dom.layoutPanels) {
      renderListForLayoutConfig(sortItems(getFilteredItems()), dom, { animate });
    }
  }

  function getAuthorPanelEl(status) {
    const panel = authorPanels?.[status];
    return panel ? document.getElementById(panel.panelId) : null;
  }

  function sortItems(items, sortId = currentSort) {
    const copy = [...items];

    if (sortId === 'alpha') {
      return copy.sort((a, b) => (a[titleKey] || '').localeCompare(b[titleKey] || '', 'fr', { sensitivity: 'base' }));
    }

    if (sortId === 'price-asc' || sortId === 'price-desc') {
      const dir = sortId === 'price-asc' ? 1 : -1;
      return copy.sort((a, b) => compareItemsByPrice(a, b, dir));
    }

    return copy;
  }

  function mountListToolbar() {
    const toolbar = document.getElementById('act-list-toolbar');
    if (!toolbar) return;

    toolbar.innerHTML = renderListToolbarHtml({
      filterAriaLabel: labels.filterToolbarAria,
      escapeHtml,
    });
    syncListLayoutUi();
  }

  function syncListLayoutButtons() {
    const listBtn = document.getElementById('act-layout-list-btn');
    const gridBtn = document.getElementById('act-layout-grid-btn');
    listBtn?.classList.toggle('is-active', listLayoutMode === 'list');
    gridBtn?.classList.toggle('is-active', listLayoutMode === 'grid');
    listBtn?.setAttribute('aria-pressed', listLayoutMode === 'list' ? 'true' : 'false');
    gridBtn?.setAttribute('aria-pressed', listLayoutMode === 'grid' ? 'true' : 'false');
  }

  function syncListLayoutPanelState() {
    const layoutCtx = getActiveLayoutContext();
    if (!layoutCtx?.viewport || !layoutCtx.panels) return;

    const inactiveMode = listLayoutMode === 'list' ? 'grid' : 'list';
    const activePanel = document.getElementById(layoutCtx.panels[listLayoutMode].panelId);
    const inactivePanel = document.getElementById(layoutCtx.panels[inactiveMode].panelId);

    resetViewSwap(layoutCtx.viewport);
    activePanel?.classList.add('is-active');
    activePanel?.removeAttribute('hidden');
    activePanel?.setAttribute('aria-hidden', 'false');
    inactivePanel?.classList.remove('is-active');
    inactivePanel?.setAttribute('hidden', '');
    inactivePanel?.setAttribute('aria-hidden', 'true');
  }

  function syncListLayoutUi() {
    syncListLayoutButtons();
    syncListLayoutPanelState();
  }

  async function setListLayoutMode(mode) {
    if (mode !== 'list' && mode !== 'grid') return;
    if (listLayoutMode === mode) return;

    const previousMode = listLayoutMode;
    listLayoutMode = mode;
    syncListLayoutButtons();

    const layoutCtx = getActiveLayoutContext();
    if (!layoutCtx?.viewport || !layoutCtx.panels) {
      persistListSettings();
      return;
    }

    const outgoing = document.getElementById(layoutCtx.panels[previousMode].panelId);
    const incoming = document.getElementById(layoutCtx.panels[mode].panelId);
    const token = ++layoutSwapToken;
    const shouldAnimate = listViewMode === 'list' && outgoing && incoming;

    refreshActiveLayoutLists();

    if (!shouldAnimate) {
      await swapViewPanels({
        viewport: layoutCtx.viewport,
        outgoing,
        incoming,
        mode: 'expand-incoming',
        animate: false,
      });
      persistListSettings();
      return;
    }

    await swapViewPanels({
      viewport: layoutCtx.viewport,
      outgoing,
      incoming,
      mode: 'expand-incoming',
      animate: true,
      isStale: () => token !== layoutSwapToken,
    });

    if (token !== layoutSwapToken) return;
    persistListSettings();
  }

  function syncMapPanelLayout() {
    if (listViewMode !== 'map' || !mapTabOptions) return;
    categoryMapTab?.resize?.();
  }

  /** Réinitialise la hauteur du viewport après un re-render (filtres, tri…) pour éviter un scroll fantôme. */
  function syncViewportLayoutAfterListChange() {
    resetViewSwap(getListViewportEl());
    resetViewSwap(getActiveLayoutContext()?.viewport);
  }

  function applyViewModeDomState({
    isList,
    listPanel,
    mapPanel,
    listBtn,
    mapBtn,
    pageRoot,
    nextMode,
  }) {
    listBtn.classList.toggle('is-active', isList);
    listBtn.setAttribute('aria-selected', isList ? 'true' : 'false');
    mapBtn.classList.toggle('is-active', !isList);
    mapBtn.setAttribute('aria-selected', !isList ? 'true' : 'false');
    pageRoot?.classList.toggle('is-map-view', nextMode === 'map' && !!mapTabOptions);
    listPanel.classList.toggle('is-active', isList);
    mapPanel.classList.toggle('is-active', !isList);
    listPanel.toggleAttribute('hidden', !isList);
    mapPanel.toggleAttribute('hidden', isList);
    listPanel.setAttribute('aria-hidden', isList ? 'false' : 'true');
    mapPanel.setAttribute('aria-hidden', !isList ? 'false' : 'true');
  }

  function resetViewSwapClasses(viewport) {
    resetViewSwap(viewport);
  }

  async function finishMapViewEnter() {
    categoryMapTab?.init(getFilterState());
    await nextFrame();
    syncMapPanelLayout();
  }

  async function setViewMode(mode, { animate = true } = {}) {
    const nextMode = mode === 'map' ? 'map' : 'list';

    const listPanel = document.getElementById(dom.listPanelId);
    const mapPanel = document.getElementById(dom.mapPanelId);
    const listBtn = document.getElementById(dom.viewListBtnId);
    const mapBtn = document.getElementById(dom.viewMapBtnId);
    if (!listPanel || !mapPanel || !listBtn || !mapBtn) return;
    if (listViewMode === nextMode) return;

    const isList = nextMode === 'list';
    const viewport = getListViewportEl();
    const pageRoot = document.querySelector(`.${pageRootClass}`);
    const token = ++viewSwapToken;

    listViewMode = nextMode;

    if (!animate) {
      resetViewSwapClasses(viewport);
      applyViewModeDomState({
        isList,
        listPanel,
        mapPanel,
        listBtn,
        mapBtn,
        pageRoot,
        nextMode,
      });
      if (nextMode === 'map') {
        await finishMapViewEnter();
      }
      return;
    }

    const outgoing = isList ? mapPanel : listPanel;
    const incoming = isList ? listPanel : mapPanel;

    listBtn.classList.toggle('is-active', isList);
    listBtn.setAttribute('aria-selected', isList ? 'true' : 'false');
    mapBtn.classList.toggle('is-active', !isList);
    mapBtn.setAttribute('aria-selected', !isList ? 'true' : 'false');

    if (!isList && mapTabOptions) {
      pageRoot?.classList.add('is-map-view');
    }

    await swapViewPanels({
      viewport,
      outgoing,
      incoming,
      mode: isList ? 'expand-incoming' : 'lock-outgoing',
      animate: true,
      isStale: () => token !== viewSwapToken,
    });
    if (token !== viewSwapToken) return;

    if (isList) {
      pageRoot?.classList.remove('is-map-view');
    }

    if (nextMode === 'map') {
      await finishMapViewEnter();
    }
  }

  function updateListSub(count, total = allItems.length) {
    const subEl = document.getElementById(subTitleElId);
    if (!subEl) return;

    const filtersActive = filtersAreActive();

    if (!count) {
      if (!filtersActive && !useTodoHeaderSubtitle && labels.headerEmpty) {
        subEl.textContent = labels.headerEmpty;
      } else {
        subEl.textContent = filtersActive
          ? 'Aucun résultat pour ces filtres'
          : (labels.listEmptySub || 'Votre liste complète');
      }
      return;
    }

    if (filtersActive && count !== total) {
      subEl.textContent = labels.countFiltered
        ? labels.countFiltered(count, total)
        : `${count} ${count > 1 ? labels.countPlural : labels.countSingular} sur ${total}`;
      return;
    }

    const word = count > 1 ? labels.countPlural : labels.countSingular;
    subEl.textContent = `${count} ${word} enregistrée${count > 1 ? 's' : ''}`;
  }

  function applyListSettings(settings) {
    if (settings.sort && sortOptions.some((opt) => opt.id === settings.sort)) {
      currentSort = settings.sort;
    }

    const nextFilters = { status: 'all' };
    for (const key of filterFieldKeys) {
      nextFilters[key] = settings[key] || [];
    }
    nextFilters.status = statusFilterOptions.some((opt) => opt.value === settings.status)
      ? settings.status
      : (filterDefaults.status ?? 'all');

    activeFilters = nextFilters;

    if (typeof settings.search === 'string') {
      searchQuery = settings.search;
    }

    if (settings.layout === 'grid' || settings.layout === 'list') {
      listLayoutMode = settings.layout;
    }

    refreshListView();
    persistListSettings();
  }

  function resetListSettings() {
    currentSort = 'alpha';
    activeFilters = { ...filterDefaults };
    searchQuery = '';
    refreshListView();
    persistListSettings();
  }

  function setSearchQuery(nextQuery) {
    searchQuery = String(nextQuery || '');
    refreshListView();
    persistListSettings();
  }

  function setStatusFilter(nextStatus) {
    if (!statusFilterOptions.some((opt) => opt.value === nextStatus)) return;

    const prevStatus = activeFilters.status;
    if (prevStatus === nextStatus) return;

    activeFilters = { ...activeFilters, status: nextStatus };

    if (authorPanels) {
      const viewport = getListViewportEl();
      const outgoing = getAuthorPanelEl(prevStatus);
      const incoming = getAuthorPanelEl(nextStatus);
      const token = ++viewSwapToken;

      refreshListView({ skipControlsSync: true, renderAllAuthorPanels: true });
      listControls?.sync?.();

      void (async () => {
        if (viewport && outgoing && incoming) {
          await swapViewPanels({
            viewport,
            outgoing,
            incoming,
            mode: 'expand-incoming',
            animate: true,
            isStale: () => token !== viewSwapToken,
          });
        }
        if (token !== viewSwapToken) return;
        updateListSub(getFilteredItems().length);
        persistListSettings();
      })();
      return;
    }

    refreshListView();
    persistListSettings();
  }

  function removePriorityFilter(value) {
    const values = (activeFilters.priorite || []).filter((entry) => entry !== value);
    if (values.length === (activeFilters.priorite?.length || 0)) return;
    activeFilters = { ...activeFilters, priorite: values };
    refreshListView();
    persistListSettings();
  }

  function getListControlsApi() {
    return {
      getFilterState,
      getSearchQuery: () => searchQuery,
      getViewerUid: () => currentUserUid,
      setSearchQuery,
      setStatus: setStatusFilter,
      removePriority: removePriorityFilter,
      getPriorityOptions: () => getAvailableFilterOptions('priorite'),
    };
  }

  function persistListSettings() {
    if (!currentUserUid) return;
    saveListPreferences(currentUserUid, categoryId, {
      ...getFilterState(),
      search: searchQuery,
    });
  }

  function loadSavedListSettings(uid) {
    const saved = getListPreferences(uid, categoryId);
    if (!saved) return;

    if (saved.sort && sortOptions.some((opt) => opt.id === saved.sort)) {
      currentSort = saved.sort;
    }

    const nextFilters = { status: 'all' };
    for (const key of filterFieldKeys) {
      nextFilters[key] = Array.isArray(saved[key]) ? saved[key] : [];
    }
    nextFilters.status = statusFilterOptions.some((opt) => opt.value === saved.status)
      ? saved.status
      : (filterDefaults.status ?? 'all');

    activeFilters = nextFilters;

    if (typeof saved.search === 'string') {
      searchQuery = saved.search;
    }

    if (saved.layout === 'grid' || saved.layout === 'list') {
      listLayoutMode = saved.layout;
    }
  }

  function refreshListView({ skipControlsSync = false, renderAllAuthorPanels = false } = {}) {
    filterModal?.updateTriggerBadge();
    if (!skipControlsSync) listControls?.sync?.();

    if (authorPanels) {
      const animate = !listHasAnimated;
      const activeStatus = activeFilters.status;
      for (const [status, panel] of Object.entries(authorPanels)) {
        if (renderAllAuthorPanels || status === activeStatus) {
          renderListForLayoutConfig(getItemsForAuthorStatus(status), panel, {
            animate,
            authorStatus: status,
          });
        } else {
          clearLayoutLists(panel);
        }
      }
      listHasAnimated = true;
      syncListLayoutUi();
      syncViewportLayoutAfterListChange();
      updateListSub(getFilteredItems().length);
      return;
    }

    const items = sortItems(getFilteredItems());
    const animate = !listHasAnimated;
    if (dom.layoutPanels) {
      renderListForLayoutConfig(items, dom, { animate });
    } else {
      renderList(items, { animate });
    }
    listHasAnimated = true;
    syncListLayoutUi();
    syncViewportLayoutAfterListChange();
    if (listViewMode === 'map') {
      categoryMapTab?.sync(getFilterState());
      syncMapPanelLayout();
    }
  }

  function findItemById(id) {
    return allItems.find((item) => item.id === id) || null;
  }

  function getPickableItems(items = allItems) {
    const pickedToday = new Set(getTodayPickIds(pickScope));
    return items.filter((item) => !item.done && !pickedToday.has(item.id));
  }

  const renderCtx = {
    escapeHtml,
    getFieldLabel,
    formatItemPrice: formatListItemPrice,
  };

  function renderPickResultItem(item, { period = 'today' } = {}) {
    const location = getPickLocation(item);
    return `
      <div class="act-pick-result${period !== 'today' ? ' act-pick-result--yesterday' : ''}" role="button" tabindex="0" ${itemIdAttr}="${escapeHtml(item.id)}" aria-label="Voir ${escapeHtml(item[titleKey])}">
        ${renderPickPeriodLabel(period)}
        <div class="act-list-item-head">
          <span class="cat-panel-icon url-import-preview__price-badge">${renderTypeIcon(item)}</span>
          <div class="act-list-item-body">
            <h3>${escapeHtml(item[titleKey])}</h3>
            ${renderListMeta(item, renderCtx)}
          </div>
        </div>
        ${location ? renderPickLocationLine(escapeHtml(location)) : ''}
      </div>
    `;
  }

  function renderPickIdle() {
    return renderPickCenteredMessage('Toujours pas d\'idée ?', labels.pickIdleText);
  }

  function setPickFooterState({ canRoll, label = 'Au pif !' } = {}) {
    const foot = document.getElementById('act-pick-foot');
    const btn = document.getElementById('dice-roll-btn');
    const btnLabel = document.getElementById('act-pick-btn-label');

    foot?.classList.remove('hidden');
    if (btnLabel) btnLabel.textContent = label;
    if (btn) btn.disabled = !canRoll;
  }

  function renderPickChances() {
    const el = document.getElementById('act-pick-chances');
    if (!el) return;

    const remaining = getRemainingPicks(pickScope);
    el.innerHTML = Array.from({ length: MAX_DAILY_PICKS }, (_, index) => {
      const isAvailable = index < remaining;
      return `<span class="act-pick-chance${isAvailable ? ' is-available' : ''}"></span>`;
    }).join('');
  }

  function updatePickCard() {
    if (!enablePick) return;
    const wrap = document.getElementById('act-pick-wrap');
    const inner = document.getElementById('act-pick-inner');
    const body = document.getElementById('act-pick-body');
    const quotaEl = document.getElementById('act-pick-quota');
    if (!wrap || !body) return;

    if (isRolling) return;

    const wasLoading = inner?.classList.contains('is-loading');
    inner?.classList.remove('is-loading');
    if (wasLoading) revealContentEl(inner);
    body.classList.remove('is-rolling');
    delete body.dataset.rollingPhase;
    renderPickChances();

    if (quotaEl) quotaEl.textContent = getPickQuotaLabel(pickScope);

    const pickable = getPickableItems();
    const remaining = getRemainingPicks(pickScope);
    const displayed = getDisplayedLatestPick(pickScope);
    const latest = displayed ? findItemById(displayed.id) : null;
    const pickPeriod = displayed?.period || 'today';
    const isNonTodayPick = pickPeriod !== 'today';
    const hasPending = allItems.some((item) => !item.done);

    if (!allItems.length) {
      wrap.classList.remove('hidden');
      body.innerHTML = renderPickCenteredMessage(labels.pickEmptyTitle, labels.pickEmptyText);
      setPickFooterState({ canRoll: false });
      syncPickInnerLayout();
      return;
    }

    wrap.classList.remove('hidden');

    if (!hasPending) {
      body.innerHTML = renderPickCenteredMessage(labels.pickAllDoneTitle, labels.pickAllDoneText);
      setPickFooterState({ canRoll: false });
      syncPickInnerLayout();
      return;
    }

    if (!pickable.length && canPickToday(pickScope) && hasPending) {
      body.innerHTML = latest
        ? `
          <div class="act-pick-result-wrap">
            ${renderPickResultItem(latest, { period: pickPeriod })}
            <p class="act-pick-hint">Envie d'autre chose ? C'est tout pour aujourd'hui.</p>
          </div>
        `
        : renderPickCenteredMessage('C\'est tout pour aujourd\'hui', labels.pickQuotaExhaustedText);
      setPickFooterState({ canRoll: false });
      syncPickInnerLayout();
      return;
    }

    if (latest) {
      const canRollAgain = remaining > 0 && pickable.length > 0;
      const hint = canRollAgain
        ? (isNonTodayPick ? 'Envie d\'autre chose ? Lancez le dé.' : 'Envie d\'autre chose ? Relancez le dé.')
        : 'Envie d\'autre chose ? C\'est tout pour aujourd\'hui.';
      body.innerHTML = `
        <div class="act-pick-result-wrap">
          ${renderPickResultItem(latest, { period: pickPeriod })}
          <p class="act-pick-hint">${hint}</p>
        </div>
      `;
      setPickFooterState({
        canRoll: canRollAgain,
        label: isNonTodayPick && canRollAgain ? 'Au pif !' : 'Relancer',
      });
      syncPickInnerLayout();
      return;
    }

    body.innerHTML = renderPickIdle();
    setPickFooterState({
      canRoll: pickable.length > 0 && remaining > 0,
    });
    syncPickInnerLayout();
  }

  async function rollDice() {
    const pool = getPickableItems();

    if (isRolling || !pool.length || !canPickToday(pickScope)) {
      updatePickCard();
      return;
    }

    const btn = document.getElementById('dice-roll-btn');
    const pickedItem = pool[Math.floor(Math.random() * pool.length)];
    isRolling = true;
    if (btn) btn.disabled = true;

    runPickRollAnimation({
      onComplete: async () => {
        await addTodayPick(pickedItem.id, pickScope);
        isRolling = false;
        updatePickCard();
      },
    });
  }

  function renderListItemMarkup(item, index, { animate = false } = {}) {
    const extraClasses = getItemRowClasses(item);
    const locationHtml = renderLocation(item, renderCtx);
    return `
      <li class="act-list-item${item.done ? ' act-list-item--done' : ''}${extraClasses}"${animate ? ` style="animation-delay: ${index * 40}ms"` : ''}>
        <div class="act-list-item-inner" ${itemIdAttr}="${item.id}" role="button" tabindex="0" aria-label="Voir ${escapeHtml(item[titleKey])}">
          <span class="cat-panel-accent" aria-hidden="true"></span>
          <div class="act-list-item-head">
            <span class="cat-panel-icon url-import-preview__price-badge">${renderTypeIcon(item)}</span>
            <div class="act-list-item-body">
              <h3>${escapeHtml(item[titleKey])}</h3>
              ${renderListMeta(item, renderCtx)}
            </div>
            ${renderStatusBadge(item.done, { doneLabel: labels.statusDone, todoLabel: labels.statusTodo })}
          </div>
          ${renderItemBodyExtra(item, renderCtx)}
          ${locationHtml}
        </div>
      </li>
    `;
  }

  function renderList(items, { animate = false, listId = dom.listId, authorStatus = null, layout = null } = {}) {
    const listEl = document.getElementById(listId);
    if (!listEl) return;

    const wasLoading = listEl.classList.contains('is-loading');
    listEl.classList.remove('is-loading');
    if (wasLoading) revealContentEl(listEl);

    listEl.classList.toggle('act-list--instant', !animate);
    listEl.classList.toggle('act-list--grouped', Boolean(renderListGroups));
    listEl.classList.toggle('act-list--grid', layout === 'grid' || (layout == null && listLayoutMode === 'grid'));

    if (!authorPanels || listId === dom.listId) {
      updateListSub(items.length);
    }

    if (!items.length) {
      const filtersActive = authorStatus
        ? (Boolean(searchQuery.trim()) || filterFieldKeys.some((key) => (activeFilters[key]?.length || 0) > 0))
        : filtersAreActive();

      let hasAnyForPanel = allItems.length > 0;
      if (authorStatus && filterByStatus) {
        hasAnyForPanel = filterByStatus(allItems, authorStatus, { viewerUid: currentUserUid }).length > 0;
      }

      const ctaHtml = filtersActive && hasAnyForPanel
        ? renderEmptyStateCta('Réinitialiser les filtres', 'id="act-filter-reset-inline"')
        : renderEmptyStateCta(labels.addCta, `data-add-category="${categoryId}"`);

      listEl.innerHTML = `
        <li class="act-list-empty">
          ${renderEmptyStateHtml({
            iconHtml: sidebarIcon(sidebarIconKey),
            description: filtersActive && hasAny ? labels.emptyFiltered : labels.emptyNone,
            ctaHtml,
          })}
        </li>
      `;
      return;
    }

    const groups = renderListGroups?.(items, {
      activeFilters,
      labels,
      escapeHtml,
      viewerUid: currentUserUid,
    });

    if (groups?.length) {
      let itemIndex = 0;
      listEl.innerHTML = groups.map((group) => {
        if (group.defaultCollapsed && !seededCollapsedGroups.has(group.id)) {
          collapsedListGroups.add(group.id);
          seededCollapsedGroups.add(group.id);
        }

        const collapsed = group.collapsible && collapsedListGroups.has(group.id);
        const groupItems = group.items.map((item) => {
          const renderItem = renderGroupListItem || renderListItemMarkup;
          const markup = renderItem(item, itemIndex, { animate, escapeHtml });
          itemIndex += 1;
          return markup;
        }).join('');

        if (!groupItems && !renderGroupHead) return '';

        const headMarkup = renderGroupHead
          ? renderGroupHead(group, { collapsed, escapeHtml })
          : group.collapsible
            ? `
            <button
              type="button"
              class="act-list-group-toggle"
              data-group-toggle="${escapeHtml(group.id)}"
              aria-expanded="${collapsed ? 'false' : 'true'}"
            >
              <span class="act-list-group-label">${escapeHtml(group.label)}</span>
              <svg class="act-list-group-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
          `
            : `<div class="act-list-group-head"><span class="act-list-group-label">${escapeHtml(group.label)}</span></div>`;

        const groupClass = group.groupClass ? ` ${group.groupClass}` : '';

        return `
          <li class="act-list-group${groupClass}${collapsed ? ' is-collapsed' : ''}" data-group-id="${escapeHtml(group.id)}">
            ${headMarkup}
            <ul class="act-list-group-items"${collapsed ? ' hidden' : ''}>
              ${groupItems}
            </ul>
          </li>
        `;
      }).join('');
      return;
    }

    listEl.innerHTML = items.map((item, index) => renderListItemMarkup(item, index, { animate })).join('');
  }

  function patchListRow(item) {
    let patched = false;

    for (const listEl of getListElements()) {
      const inner = listEl.querySelector(`[${itemIdAttr}="${item.id}"]`);
      const row = inner?.closest('.act-list-item');
      if (!row) continue;

      patched = true;
      row.classList.toggle('act-list-item--done', Boolean(item.done));

      const badge = row.querySelector('.act-list-status');
      if (badge) {
        badge.outerHTML = renderStatusBadge(item.done, {
          doneLabel: labels.statusDone,
          todoLabel: labels.statusTodo,
        });
      }
    }

    return patched;
  }

  function syncAllItemsFromCache() {
    const cached = getCachedItems(collection);
    if (cached) allItems = normalizeListItems(cached);
  }

  function handleItemChange(changedCollection, itemId, meta = {}) {
    if (changedCollection !== collection) {
      if (watchCollections.includes(changedCollection)) {
        refreshListView();
        updatePickCard();
        return;
      }
      loadPageData();
      return;
    }

    syncAllItemsFromCache();

    if (meta.deleted) {
      pruneActiveFilters();
      updateHeader(allItems);
      updatePickCard();

      const rows = getListElements()
        .map((listEl) => listEl.querySelector(`[${itemIdAttr}="${itemId}"]`)?.closest('.act-list-item'))
        .filter(Boolean);

      if (rows.length && !filtersAreActive()) {
        rows.forEach((row) => row.remove());
        updateListSub(getFilteredItems().length);
        if (!getFilteredItems().length) refreshListView();
      } else {
        refreshListView();
      }
      return;
    }

    if (meta.patch) {
      const item = findItemById(itemId);
      if (!item) {
        loadPageData();
        return;
      }

      updateHeader(allItems);

      if (renderListGroups && activeFilters.status === 'all') {
        refreshListView();
        updatePickCard();
        return;
      }

      if (activeFilters.status !== 'all') {
        refreshListView();
        updatePickCard();
        return;
      }

      const rows = getListElements()
        .map((listEl) => listEl.querySelector(`[${itemIdAttr}="${itemId}"]`)?.closest('.act-list-item'))
        .filter(Boolean);
      const row = rows[0];
      const stillVisible = applyFilters([item]).length > 0;

      if (stillVisible && row) {
        patchListRow(item);
        updateListSub(getFilteredItems().length);
      } else {
        refreshListView();
      }

      updatePickCard();
      return;
    }

    loadPageData();
  }

  function updateHeader(items) {
    if (!useTodoHeaderSubtitle) return;

    const total = items.length;
    const todo = items.filter((item) => !item.done).length;

    let text = labels.headerEmpty;
    if (total === 0) text = labels.headerEmpty;
    else if (todo === 0) text = labels.headerAllDone;
    else if (todo === 1) text = labels.headerOneTodo;
    else text = labels.headerManyTodo(todo);

    void setPageHeaderSub(text, { animate: false });
  }

  const itemIdDatasetKey = dataAttrToDatasetKey(itemIdAttr);

  function bindEvents(signal) {
    document.getElementById('dice-roll-btn')?.addEventListener('click', rollDice, { signal });

    document.getElementById('act-pick-wrap')?.addEventListener('click', (event) => {
      const pick = event.target.closest(`.act-pick-result[${itemIdAttr}]`);
      if (!pick || !detailModal) return;
      const item = findItemById(pick.dataset[itemIdDatasetKey]);
      if (item) detailModal.open(item);
    }, { signal });

    document.getElementById(dom.viewSwitchId)?.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-view]');
      if (!btn) return;
      setViewMode(btn.dataset.view);
    }, { signal });

    document.getElementById('act-filter-btn')?.addEventListener('click', async () => {
      await initCustomOptions();
      filterModal?.open();
    }, { signal });

    document.getElementById('act-layout-list-btn')?.addEventListener('click', () => {
      setListLayoutMode('list');
    }, { signal });

    document.getElementById('act-layout-grid-btn')?.addEventListener('click', () => {
      setListLayoutMode('grid');
    }, { signal });

    const listViewport = getListViewportEl();

    listViewport?.addEventListener('click', (event) => {
      const groupToggle = event.target.closest('[data-group-toggle]');
      if (groupToggle) {
        const groupId = groupToggle.dataset.groupToggle;
        const groupEl = groupToggle.closest('.act-list-group');
        const panel = groupEl?.querySelector('.act-list-group-items');
        if (!groupId || !groupEl || !panel) return;

        const willCollapse = !collapsedListGroups.has(groupId);
        if (willCollapse) collapsedListGroups.add(groupId);
        else collapsedListGroups.delete(groupId);

        groupEl.classList.toggle('is-collapsed', willCollapse);
        groupToggle.setAttribute('aria-expanded', willCollapse ? 'false' : 'true');
        panel.toggleAttribute('hidden', willCollapse);
        groupEl.querySelectorAll('[data-group-toggle]').forEach((btn) => {
          btn.setAttribute('aria-expanded', willCollapse ? 'false' : 'true');
        });
        return;
      }

      const travelEmbed = event.target.closest('.travel-group-body');
      if (travelEmbed) {
        const item = resolveListItemFromRow?.(travelEmbed);
        if (item) detailModal.open(item);
        return;
      }

      if (event.target.closest('#act-filter-reset-inline')) {
        resetListSettings();
        return;
      }
      if (event.target.closest('.act-location')) return;
      const row = event.target.closest(`[${itemIdAttr}], [data-activity-id], [data-restaurant-id]`);
      if (!row || !detailModal) return;
      const item = resolveListItemFromRow?.(row) ?? findItemById(row.dataset[itemIdDatasetKey]);
      if (item) detailModal.open(item);
    }, { signal });

    listViewport?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const row = event.target.closest(`[${itemIdAttr}], [data-activity-id], [data-restaurant-id]`);
      if (!row || !detailModal) return;
      event.preventDefault();
      const item = resolveListItemFromRow?.(row) ?? findItemById(row.dataset[itemIdDatasetKey]);
      if (item) detailModal.open(item);
    }, { signal });

    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-add-category]');
      if (!trigger || !addItemModal) return;
      event.preventDefault();
      addItemModal.open(trigger.dataset.addCategory);
    }, { signal });
  }

  async function loadPageData({ force = false } = {}) {
    await initCustomOptions();

    const listElements = getListElements();
    const useCache = !force && hasCachedItems(collection);

    if (listElements.length && !useCache) {
      listElements.forEach((listEl) => {
        listEl.classList.add('is-loading');
        listEl.innerHTML = `
        <li class="skel-block skel-block--line skel-shimmer" aria-hidden="true"></li>
        <li class="skel-block skel-block--line skel-shimmer" aria-hidden="true"></li>
        <li class="skel-block skel-block--line skel-shimmer" aria-hidden="true"></li>
      `;
      });
    }

    const listEl = document.getElementById(dom.listId);
    const pickWrap = document.getElementById('act-pick-wrap');
    const pickInner = document.getElementById('act-pick-inner');

    if (pickWrap && pickInner && !useCache) {
      pickWrap.classList.remove('hidden');
      pickInner.classList.add('is-loading');
    } else if (pickWrap) {
      pickWrap.classList.remove('hidden');
    }

    const [items] = await Promise.all([
      ensureItems(collection, { force }),
      ...preloadCollections.map((name) => ensureItems(name, { force: false })),
      ...(enablePick ? [loadDailyPicks(pickScope)] : []),
    ]);

    allItems = normalizeListItems(items);
    pruneActiveFilters();
    updateHeader(allItems);
    if (enablePick) updatePickCard();
    refreshListView();
  }

  function destroy() {
    viewSwapToken += 1;
    layoutSwapToken += 1;
    isRolling = false;
    cleanupPickRollAnimation();
    listHasAnimated = false;
    listViewMode = 'list';
    listLayoutMode = 'list';
    categoryMapTab?.destroy();
    categoryMapTab = null;
    document.querySelector(`.${pageRootClass}`)?.classList.remove('is-map-view');
    currentSort = 'alpha';
    activeFilters = { ...filterDefaults };
    searchQuery = '';
    collapsedListGroups = new Set(defaultCollapsedGroups);
    seededCollapsedGroups = new Set();
    listControls = null;
    pageAbort?.abort();
    pageAbort = null;
    currentUserUid = null;
    filterModal?.destroy();
    filterModal = null;
    detailModal?.destroy?.();
    addItemModal?.close();
    detailModal = null;
  }

  async function init(user, { addItemModal: sharedModal } = {}) {
    destroy();
    await initCustomOptions();
    pageAbort = new AbortController();
    const { signal } = pageAbort;
    currentUserUid = user?.uid ?? null;

    getUserDisplayName(user);

    if (enablePick && new URLSearchParams(window.location.search).get('reset-pioche') === '1') {
      await resetTodayPicks(pickScope);
      const url = new URL(window.location.href);
      url.searchParams.delete('reset-pioche');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }

    addItemModal = sharedModal ?? initAddItem({
      user,
      onAdded: () => loadPageData(),
      onUpdated: () => loadPageData(),
    });

    const pageTheme = theme || getCategoryById(categoryId)?.theme || 'cyan';

    detailModal = initDetail({
      theme: pageTheme,
      onChanged: (changedCollection, itemId, meta) => handleItemChange(changedCollection, itemId, meta),
      onEdit: async (item) => {
        await detailModal.close();
        addItemModal.openEdit(item._editCategory || categoryId, item);
      },
      onMovePin: async (item) => {
        const moveCategoryId = item._editCategory || categoryId;
        await detailModal.close();
        window.location.hash = mapPlaceMoveHref(moveCategoryId, item.id).slice(1);
      },
    });

    if (mapTabOptions) {
      const { createCategoryMapTab } = await import('./category-map-tab.js');
      categoryMapTab = createCategoryMapTab({
        ...mapTabOptions,
        categoryId,
        accent: MAP_ACCENT,
        itemIdAttr,
        renderPlaceIcon: renderTypeIcon,
        getPlaceTitle: (item) => item?.[titleKey] || 'Sans titre',
        getPlaceLocation: getPickLocation,
        onMarkerClick: ({ itemId }) => {
          const item = findCachedItemById(categoryId, itemId);
          if (item) detailModal.open(item);
        },
      });
    }

    mountListToolbar();
    setViewMode('list', { animate: false });

    if (mapTabOptions) {
      const syncMapLayout = () => syncMapPanelLayout();
      window.addEventListener('resize', syncMapLayout);
      pageAbort.signal.addEventListener('abort', () => {
        window.removeEventListener('resize', syncMapLayout);
      }, { once: true });
    }

    const filterHelpers = { getAvailableFilterOptions };

    filterModal = initListFilters({
      theme: pageTheme,
      title: 'Filtres',
      beforeOpen: initCustomOptions,
      defaults: { status: 'all', sort: 'alpha', ...filterDefaults },
      sections: getFilterSections(filterHelpers),
      getState: getFilterState,
      onApply: applyListSettings,
      badgeExcludeSectionIds: filterBadgeExcludeKeys,
    });

    if (listControlsMount) {
      listControls = listControlsMount(getListControlsApi(), signal) || null;
    }

    bindEvents(signal);
    loadSavedListSettings(user?.uid);
    filterModal.updateTriggerBadge();
    loadPageData();
  }

  return {
    init,
    destroy,
    refresh: loadPageData,
  };
}
