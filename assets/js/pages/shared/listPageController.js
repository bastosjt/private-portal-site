import { getCategoryById, getUserDisplayName, MAP_ACCENT } from '../../config.js';
import { getListPreferences, saveListPreferences } from '../../lib/user-profile.js';
import { formatItemPrice, compareItemsByPrice } from '../../lib/price-format.js';
import { ensureItems, hasCachedItems, getCachedItems, findCachedItemById } from '../../data/appDataCache.js';
import { sidebarIcon } from '../../ui/sidebar.js';
import { initAddItem } from '../../ui/add-item.js';
import { initListFilters } from '../../ui/list-filters.js';
import {
  cleanupPickRollAnimation,
  runPickRollAnimation,
  syncPickInnerLayout,
} from '../../ui/pick-roll-animation.js';
import { renderPickLocationLine, renderPickPeriodLabel } from '../../ui/pick-result-display.js';
import { getCategoryFieldOptions, getFieldOptionLabel, initCustomOptions } from '../../lib/custom-types.js';
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
import { normalizeSearchText } from '../../lib/normalize-search.js';
import { escapeHtml } from '../../lib/escape-html.js';
import { navigate } from '../../navigation/router.js';

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
    <span class="act-list-status ${done ? 'act-list-status--done' : 'act-list-status--todo'}">
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

function renderPickCenteredMessage(title, text) {
  return `
    <div class="act-pick-message act-pick-message--centered">
      <p class="act-pick-message-title">${escapeHtml(title)}</p>
      <p class="act-pick-message-text">${escapeHtml(text)}</p>
    </div>
  `;
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
  let categoryMapTab = null;

  function normalizeListItems(items) {
    if (!excludeTravelLinkedFromList) return items;
    return items.filter((item) => !item.travelId);
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
    if (activeFilters.status !== 'all') return true;
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
    };
    for (const key of filterFieldKeys) {
      state[key] = activeFilters[key] || [];
    }
    return state;
  }

  function applyFilters(items) {
    let result = items;

    if (filterByStatus) {
      result = filterByStatus(result, activeFilters.status || 'all', { viewerUid: currentUserUid });
    } else if (activeFilters.status === 'todo') {
      result = result.filter((item) => !item.done);
    } else if (activeFilters.status === 'done') {
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

    toolbar.innerHTML = `
      <button type="button" class="act-filter-btn" id="act-filter-btn" aria-label="${escapeHtml(labels.filterToolbarAria)}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
        </svg>
        <span>Filtres</span>
        <span class="act-filter-badge hidden" aria-hidden="true">0</span>
      </button>
    `;
  }

  function syncMapPanelLayout() {
    if (listViewMode !== 'map' || !mapTabOptions) return;
    categoryMapTab?.resize?.();
  }

  function setViewMode(mode) {
    listViewMode = mode === 'map' ? 'map' : 'list';

    const listPanel = document.getElementById(dom.listPanelId);
    const mapPanel = document.getElementById(dom.mapPanelId);
    const listBtn = document.getElementById(dom.viewListBtnId);
    const mapBtn = document.getElementById(dom.viewMapBtnId);
    if (!listPanel || !mapPanel || !listBtn || !mapBtn) return;

    const isList = listViewMode === 'list';
    listPanel.classList.toggle('hidden', !isList);
    listPanel.toggleAttribute('hidden', !isList);
    mapPanel.classList.toggle('hidden', isList);
    mapPanel.toggleAttribute('hidden', isList);

    listBtn.classList.toggle('is-active', isList);
    listBtn.setAttribute('aria-selected', isList ? 'true' : 'false');
    mapBtn.classList.toggle('is-active', !isList);
    mapBtn.setAttribute('aria-selected', !isList ? 'true' : 'false');

    const pageRoot = document.querySelector(`.${pageRootClass}`);
    pageRoot?.classList.toggle('is-map-view', listViewMode === 'map' && !!mapTabOptions);

    if (listViewMode === 'map') {
      categoryMapTab?.init(getFilterState());
      requestAnimationFrame(() => {
        syncMapPanelLayout();
      });
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
    activeFilters = { ...activeFilters, status: nextStatus };
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
  }

  function refreshListView() {
    filterModal?.updateTriggerBadge();
    listControls?.sync?.();
    renderList(sortItems(getFilteredItems()), { animate: !listHasAnimated });
    listHasAnimated = true;
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
    formatItemPrice,
  };

  function renderPickResultItem(item, { period = 'today' } = {}) {
    const location = getPickLocation(item);
    return `
      <div class="act-pick-result${period !== 'today' ? ' act-pick-result--yesterday' : ''}" role="button" tabindex="0" ${itemIdAttr}="${escapeHtml(item.id)}" aria-label="Voir ${escapeHtml(item[titleKey])}">
        ${renderPickPeriodLabel(period)}
        <div class="act-list-item-head">
          <span class="cat-panel-icon">${renderTypeIcon(item)}</span>
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

    inner?.classList.remove('is-loading');
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
            <span class="cat-panel-icon">${renderTypeIcon(item)}</span>
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

  function renderList(items, { animate = false } = {}) {
    const listEl = document.getElementById(dom.listId);
    if (!listEl) return;

    listEl.classList.remove('is-loading');
    listEl.classList.toggle('act-list--instant', !animate);
    listEl.classList.toggle('act-list--grouped', Boolean(renderListGroups));
    updateListSub(items.length);

    if (!items.length) {
      const filtersActive = filtersAreActive();
      const hasAny = allItems.length > 0;
      listEl.innerHTML = `
        <li class="act-list-empty">
          <div class="cat-recent-empty">
            <span class="cat-recent-empty-icon">${sidebarIcon(sidebarIconKey)}</span>
            <p>${filtersActive && hasAny ? labels.emptyFiltered : labels.emptyNone}</p>
            ${filtersActive && hasAny ? `
              <button type="button" class="cat-empty-cta" id="act-filter-reset-inline">Réinitialiser les filtres</button>
            ` : `
              <button type="button" class="cat-empty-cta" data-add-category="${categoryId}">${labels.addCta}</button>
            `}
          </div>
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
    const listEl = document.getElementById(dom.listId);
    if (!listEl) return false;

    const inner = listEl.querySelector(`[${itemIdAttr}="${item.id}"]`);
    const row = inner?.closest('.act-list-item');
    if (!row) return false;

    row.classList.toggle('act-list-item--done', Boolean(item.done));

    const badge = row.querySelector('.act-list-status');
    if (badge) {
      badge.outerHTML = renderStatusBadge(item.done, {
        doneLabel: labels.statusDone,
        todoLabel: labels.statusTodo,
      });
    }

    return true;
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

      const listEl = document.getElementById(dom.listId);
      const inner = listEl?.querySelector(`[${itemIdAttr}="${itemId}"]`);
      const row = inner?.closest('.act-list-item');

      if (row && !filtersAreActive()) {
        row.remove();
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

      const listEl = document.getElementById(dom.listId);
      const inner = listEl?.querySelector(`[${itemIdAttr}="${itemId}"]`);
      const row = inner?.closest('.act-list-item');
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

    const subEl = document.getElementById('page-header-sub');
    if (!subEl) return;

    const total = items.length;
    const todo = items.filter((item) => !item.done).length;

    if (total === 0) subEl.textContent = labels.headerEmpty;
    else if (todo === 0) subEl.textContent = labels.headerAllDone;
    else if (todo === 1) subEl.textContent = labels.headerOneTodo;
    else subEl.textContent = labels.headerManyTodo(todo);
  }

  const itemIdDatasetKey = dataAttrToDatasetKey(itemIdAttr);

  function bindEvents(signal) {
    document.getElementById('page-header-back')?.addEventListener('click', () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        navigate('explorer');
      }
    }, { signal });

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

    document.getElementById(dom.listId)?.addEventListener('click', (event) => {
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

    document.getElementById(dom.listId)?.addEventListener('keydown', (event) => {
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

    const listEl = document.getElementById(dom.listId);
    const pickWrap = document.getElementById('act-pick-wrap');
    const pickInner = document.getElementById('act-pick-inner');
    const useCache = !force && hasCachedItems(collection);

    if (listEl && !useCache) {
      listEl.classList.add('is-loading');
      listEl.innerHTML = `
        <li class="skel-block skel-block--line skel-shimmer" aria-hidden="true"></li>
        <li class="skel-block skel-block--line skel-shimmer" aria-hidden="true"></li>
        <li class="skel-block skel-block--line skel-shimmer" aria-hidden="true"></li>
      `;
    }

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
    isRolling = false;
    cleanupPickRollAnimation();
    listHasAnimated = false;
    listViewMode = 'list';
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
    setViewMode('list');

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
