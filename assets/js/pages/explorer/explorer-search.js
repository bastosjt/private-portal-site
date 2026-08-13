import { HOME_CATEGORIES, getCategoryById } from '../../config.js';
import { findCachedItemById, getCachedItems } from '../../data/appDataCache.js';
import { getFieldOptionLabel } from '../../lib/custom-types.js';
import { escapeHtml } from '../../lib/escape-html.js';
import { renderMapSearchEmptyHtml } from '../../lib/map-search-empty.js';
import {
  closeMapSearchResultsPanel,
  forceCloseMapSearchResultsPanel,
  openMapSearchResultsPanel,
  updateMapSearchResultsPanel,
} from '../../lib/map-search-results-panel.js';
import { getItemLocationLabel } from '../../lib/item-location.js';
import { normalizeItemTags } from '../../lib/item-tags.js';
import { renderNavIcon } from '../../lib/lucide-icon.js';
import { normalizeSearchText } from '../../lib/normalize-search.js';
import { getTravelLinkId, isTravelLinkedItem } from '../../lib/travel-link.js';
import { renderMapMarkerTypeIcon } from '../carte/map-marker-images.js';
import { renderTravelTypeIcon } from '../voyages/IconsType.js';

const MAX_RESULTS = 10;
const SEARCH_DEBOUNCE_MS = 120;

const CATEGORY_ICONS = {
  activities: 'activity',
  restaurants: 'restaurant',
  movies: 'film',
  travels: 'travel',
  wishlist: 'wishlist',
};

function getCategoryShortLabel(categoryId) {
  return getCategoryById(categoryId)?.label?.replace(' & Séries', '') || categoryId;
}

function getItemTitle(categoryId, item) {
  const titleKey = getCategoryById(categoryId)?.titleKey || 'nom';
  return String(item?.[titleKey] || '').trim();
}

function getTravelBadgeMeta(categoryId, item) {
  if (categoryId === 'travels') {
    return { showTravelBadge: false, travelBadgeType: '' };
  }

  if (!isTravelLinkedItem(item)) {
    return { showTravelBadge: false, travelBadgeType: '' };
  }

  const travel = findCachedItemById('travels', getTravelLinkId(item));
  return {
    showTravelBadge: Boolean(travel),
    travelBadgeType: travel?.type || '',
  };
}

function renderTravelBadgeHtml(travelType) {
  return `
    <span class="explorer-search-option-badge">
      <span class="bottom-nav-page-badge" data-theme="blue" aria-hidden="true">
        ${renderTravelTypeIcon(travelType, { strokeWidth: 2.25, width: 14, height: 14 })}
      </span>
    </span>
  `;
}

function buildMarkerForIcon(categoryId, item) {
  if (categoryId === 'activities') {
    return { categoryId, activityType: item.categorie, title: item.nom };
  }
  if (categoryId === 'restaurants') {
    return {
      categoryId,
      restaurantType: item.type,
      restaurantCuisine: item.cuisine,
      title: item.nom,
    };
  }
  if (categoryId === 'travels') {
    return { categoryId, travelType: item.type, title: item.localisation || item.pays };
  }
  return null;
}

function buildEntryMeta(categoryId, item) {
  const parts = [];

  if (categoryId === 'activities' && item.categorie) {
    parts.push(getFieldOptionLabel('activities', 'categorie', item.categorie));
  }
  if (categoryId === 'restaurants') {
    if (item.type) parts.push(getFieldOptionLabel('restaurants', 'type', item.type));
    if (item.cuisine) parts.push(getFieldOptionLabel('restaurants', 'cuisine', item.cuisine));
  }
  if (categoryId === 'movies') {
    if (item.type) parts.push(getFieldOptionLabel('movies', 'type', item.type));
    if (item.genre) parts.push(getFieldOptionLabel('movies', 'genre', item.genre));
  }
  if (categoryId === 'travels' && item.type) {
    parts.push(getFieldOptionLabel('travels', 'type', item.type));
  }
  if (categoryId === 'wishlist' && item.priorite) {
    parts.push(getFieldOptionLabel('wishlist', 'priorite', item.priorite));
  }

  return parts.filter(Boolean).join(' · ') || getCategoryShortLabel(categoryId);
}

function buildSearchText(categoryId, item, { title, metaLabel, location, tagLabels }) {
  const parts = [
    title,
    getCategoryShortLabel(categoryId),
    metaLabel,
    location,
    ...tagLabels,
    item.description,
    item.notes,
    item.pays,
    item.periode,
    item.budget,
    item.prix,
  ];

  if (categoryId === 'activities' && item.categorie) {
    parts.push(getFieldOptionLabel('activities', 'categorie', item.categorie));
  }
  if (categoryId === 'restaurants') {
    if (item.type) parts.push(getFieldOptionLabel('restaurants', 'type', item.type));
    if (item.cuisine) parts.push(getFieldOptionLabel('restaurants', 'cuisine', item.cuisine));
  }
  if (categoryId === 'movies') {
    if (item.type) parts.push(getFieldOptionLabel('movies', 'type', item.type));
    if (item.genre) parts.push(getFieldOptionLabel('movies', 'genre', item.genre));
  }
  if (categoryId === 'travels' && item.type) {
    parts.push(getFieldOptionLabel('travels', 'type', item.type));
  }

  return normalizeSearchText(parts.filter(Boolean).join(' '));
}

function buildSearchEntries() {
  const entries = [];

  for (const category of HOME_CATEGORIES) {
    const items = getCachedItems(category.id) ?? [];

    for (const item of items) {
      if (!item?.id) continue;

      const title = getItemTitle(category.id, item);
      if (!title) continue;

      const location = getItemLocationLabel(category.id, item);
      const metaLabel = buildEntryMeta(category.id, item);
      const tagLabels = (category.id === 'activities' || category.id === 'restaurants')
        ? normalizeItemTags(item.tags)
          .map((tag) => getFieldOptionLabel(category.id, 'tags', tag))
          .filter(Boolean)
        : [];
      const { showTravelBadge, travelBadgeType } = getTravelBadgeMeta(category.id, item);

      entries.push({
        categoryId: category.id,
        itemId: item.id,
        title,
        categoryLabel: getCategoryShortLabel(category.id),
        metaLabel,
        location,
        tagLabels,
        marker: buildMarkerForIcon(category.id, item),
        showTravelBadge,
        travelBadgeType,
        searchText: buildSearchText(category.id, item, { title, metaLabel, location, tagLabels }),
      });
    }
  }

  return entries;
}

function scoreFieldMatch(normalizedQuery, tokens, fieldNorm, { exact = 50, partial = 28, token = 6 } = {}) {
  if (!fieldNorm) return 0;

  let score = 0;
  if (fieldNorm === normalizedQuery) score += exact;
  else if (fieldNorm.startsWith(normalizedQuery)) score += partial + 8;
  else if (fieldNorm.includes(normalizedQuery)) score += partial;

  for (const tokenValue of tokens) {
    if (fieldNorm.includes(tokenValue)) score += token;
  }

  return score;
}

function rankSearchResults(entries, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  return entries
    .map((entry) => {
      const titleNorm = normalizeSearchText(entry.title);
      const metaNorm = normalizeSearchText(entry.metaLabel);
      const categoryNorm = normalizeSearchText(entry.categoryLabel);
      const tagsNorm = normalizeSearchText(entry.tagLabels.join(' '));
      let score = 0;

      if (titleNorm === normalizedQuery) score += 100;
      else if (titleNorm.startsWith(normalizedQuery)) score += 60;
      else if (titleNorm.includes(normalizedQuery)) score += 40;

      if (entry.searchText.includes(normalizedQuery)) score += 20;

      score += scoreFieldMatch(normalizedQuery, tokens, metaNorm);
      score += scoreFieldMatch(normalizedQuery, tokens, categoryNorm, { exact: 40, partial: 22, token: 5 });
      score += scoreFieldMatch(normalizedQuery, tokens, tagsNorm, { exact: 45, partial: 24, token: 7 });

      for (const token of tokens) {
        if (titleNorm.includes(token)) score += 8;
        if (entry.searchText.includes(token)) score += 4;
      }

      return { entry, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, 'fr'))
    .slice(0, MAX_RESULTS)
    .map(({ entry }) => entry);
}

function getEntryMetaLabel(entry) {
  return entry.metaLabel || entry.categoryLabel;
}

function renderSearchOptionIcon(entry) {
  if (entry.marker) return renderMapMarkerTypeIcon(entry.marker);
  const iconName = CATEGORY_ICONS[entry.categoryId] || 'search';
  return renderNavIcon(iconName, { strokeWidth: 2, width: 16, height: 16 });
}

let debounceTimer = null;
let activeIndex = -1;
let currentResults = [];

function syncClearButton(input, clearBtn) {
  if (!clearBtn) return;
  const hasValue = input.value.trim().length > 0;
  clearBtn.classList.toggle('hidden', !hasValue);
}

export function initExplorerSearch({ signal, onSelect } = {}) {
  const root = document.getElementById('explorer-search');
  const input = document.getElementById('explorer-search-input');
  const resultsEl = document.getElementById('explorer-search-results');
  const clearBtn = document.getElementById('explorer-search-clear');

  if (!root || !input || !resultsEl) return;

  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', 'explorer-search-results');

  function syncResultsPanelState(isOpen) {
    root.classList.toggle('is-open', isOpen);
    input.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (!isOpen) input.removeAttribute('aria-activedescendant');
  }

  function showResultsPanel(html) {
    const isOpen = !resultsEl.classList.contains('hidden');
    if (isOpen) {
      updateMapSearchResultsPanel(resultsEl, { html });
    } else {
      openMapSearchResultsPanel(resultsEl, { html });
    }
    syncResultsPanelState(true);
  }

  function closeResults() {
    activeIndex = -1;
    currentResults = [];
    closeMapSearchResultsPanel(resultsEl, {
      onDone: () => syncResultsPanelState(false),
    });
  }

  function renderResults(entries, query = '') {
    currentResults = entries;
    activeIndex = -1;

    if (!entries.length) {
      if (!query.trim()) {
        closeResults();
        return;
      }

      showResultsPanel(renderMapSearchEmptyHtml(query));
      input.removeAttribute('aria-activedescendant');
      return;
    }

    showResultsPanel(entries.map((entry, index) => `
      <li
        id="explorer-search-option-${index}"
        class="map-search-option"
        role="option"
        aria-selected="false"
        data-category-id="${escapeHtml(entry.categoryId)}"
        data-item-id="${escapeHtml(entry.itemId)}"
        data-category="${escapeHtml(entry.categoryId)}"
      >
        <span class="map-search-option-icon${entry.showTravelBadge ? ' has-travel-badge' : ''}" aria-hidden="true">
          ${renderSearchOptionIcon(entry)}
          ${entry.showTravelBadge ? renderTravelBadgeHtml(entry.travelBadgeType) : ''}
        </span>
        <span class="map-search-option-copy">
          <span class="map-search-option-title">${escapeHtml(entry.title)}</span>
          <span class="map-search-option-meta">
            ${escapeHtml(getEntryMetaLabel(entry))}${entry.location ? ` · ${escapeHtml(entry.location)}` : ''}
          </span>
        </span>
      </li>
    `).join(''));
  }

  function setActiveIndex(nextIndex) {
    const options = [...resultsEl.querySelectorAll('.map-search-option')];
    if (!options.length) return;

    activeIndex = ((nextIndex % options.length) + options.length) % options.length;

    options.forEach((option, index) => {
      const isActive = index === activeIndex;
      option.classList.toggle('is-active', isActive);
      option.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    const activeOption = options[activeIndex];
    input.setAttribute('aria-activedescendant', activeOption.id);
    activeOption.scrollIntoView({ block: 'nearest' });
  }

  function runSearch() {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      const query = input.value.trim();
      syncClearButton(input, clearBtn);

      if (!query) {
        closeResults();
        return;
      }

      renderResults(rankSearchResults(buildSearchEntries(), query), query);
    }, SEARCH_DEBOUNCE_MS);
  }

  function selectEntry(entry) {
    if (!entry) return;
    onSelect?.({ categoryId: entry.categoryId, itemId: entry.itemId });
  }

  function selectActiveOrFirst() {
    if (!currentResults.length) return;
    const entry = currentResults[activeIndex >= 0 ? activeIndex : 0];
    selectEntry(entry);
  }

  input.addEventListener('input', runSearch, { signal });
  input.addEventListener('focus', () => {
    if (input.value.trim()) runSearch();
  }, { signal });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (resultsEl.classList.contains('hidden')) return;
      event.preventDefault();
      closeResults();
      return;
    }

    if (event.key === 'ArrowDown') {
      if (resultsEl.classList.contains('hidden')) {
        if (input.value.trim()) runSearch();
        return;
      }
      event.preventDefault();
      setActiveIndex(activeIndex + 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      if (resultsEl.classList.contains('hidden')) return;
      event.preventDefault();
      setActiveIndex(activeIndex - 1);
      return;
    }

    if (event.key === 'Enter') {
      if (resultsEl.classList.contains('hidden')) return;
      event.preventDefault();
      selectActiveOrFirst();
    }
  }, { signal });

  clearBtn?.addEventListener('click', () => {
    input.value = '';
    syncClearButton(input, clearBtn);
    closeResults();
    input.focus();
  }, { signal });

  resultsEl.addEventListener('click', (event) => {
    const option = event.target.closest('.map-search-option');
    if (!option) return;

    selectEntry({
      categoryId: option.dataset.categoryId,
      itemId: option.dataset.itemId,
    });
  }, { signal });

  document.addEventListener('click', (event) => {
    if (root.contains(event.target)) return;
    if (event.target.closest('.add-modal-overlay')) return;
    closeResults();
  }, { signal });

  signal?.addEventListener('abort', () => {
    window.clearTimeout(debounceTimer);
    forceCloseMapSearchResultsPanel(resultsEl);
    syncResultsPanelState(false);
  }, { once: true });
}

export function destroyExplorerSearch() {
  window.clearTimeout(debounceTimer);
}
