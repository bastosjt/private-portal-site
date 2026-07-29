import { getCategoryById } from '../../config.js';
import { findCachedItemById } from '../../data/appDataCache.js';
import { getFieldOptionLabel } from '../../lib/custom-types.js';
import { escapeHtml } from '../../lib/escape-html.js';
import { getItemLocationLabel } from '../../lib/item-location.js';
import { normalizeItemTags } from '../../lib/item-tags.js';
import { normalizeSearchText } from '../../lib/normalize-search.js';
import { getDisplayedMarkers } from './map-markers.js';
import { renderMapMarkerTypeIcon } from './map-marker-images.js';

const MAX_RESULTS = 8;
const SEARCH_DEBOUNCE_MS = 120;

function getCategoryShortLabel(categoryId) {
  return getCategoryById(categoryId)?.label?.replace(' & Séries', '') || categoryId;
}

function getPlaceTypeLabel(categoryId, item, marker) {
  if (categoryId === 'activities') {
    const value = item?.categorie || marker.activityType;
    return value ? getFieldOptionLabel('activities', 'categorie', value) : '';
  }
  if (categoryId === 'restaurants') {
    const value = item?.type || marker.restaurantType;
    return value ? getFieldOptionLabel('restaurants', 'type', value) : '';
  }
  if (categoryId === 'travels') {
    const value = item?.type || marker.travelType;
    return value ? getFieldOptionLabel('travels', 'type', value) : '';
  }
  return '';
}

function getPlaceCuisineLabel(item, marker) {
  const value = item?.cuisine || marker.restaurantCuisine;
  return value ? getFieldOptionLabel('restaurants', 'cuisine', value) : '';
}

function getPlaceTagLabels(categoryId, item, marker) {
  if (categoryId !== 'activities' && categoryId !== 'restaurants') return [];
  return normalizeItemTags(item?.tags ?? marker.tags)
    .map((value) => getFieldOptionLabel(categoryId, 'tags', value))
    .filter(Boolean);
}

function getEntryMetaLabel(entry) {
  return entry.placeTypeLabel || entry.categoryLabel;
}

function getSearchEntriesSignature(markers) {
  return markers.map((marker) => [
    marker.categoryId,
    marker.id,
    marker.title,
    marker.activityType,
    marker.restaurantType,
    marker.restaurantCuisine,
    ...(marker.tags || []),
  ].join(':')).join('|');
}

let cachedSearchEntries = null;
let cachedSearchEntriesSignature = '';

function buildSearchEntries() {
  const markers = getDisplayedMarkers();
  const signature = getSearchEntriesSignature(markers);
  if (cachedSearchEntries && cachedSearchEntriesSignature === signature) {
    return cachedSearchEntries;
  }

  cachedSearchEntriesSignature = signature;
  cachedSearchEntries = markers.map((marker) => {
    const item = findCachedItemById(marker.categoryId, marker.id);
    const categoryLabel = getCategoryShortLabel(marker.categoryId);
    const location = getItemLocationLabel(marker.categoryId, item);
    const placeTypeLabel = getPlaceTypeLabel(marker.categoryId, item, marker);
    const cuisineLabel = marker.categoryId === 'restaurants'
      ? getPlaceCuisineLabel(item, marker)
      : '';
    const tagLabels = getPlaceTagLabels(marker.categoryId, item, marker);

    return {
      categoryId: marker.categoryId,
      itemId: marker.id,
      title: marker.title,
      categoryLabel,
      placeTypeLabel,
      cuisineLabel,
      tagLabels,
      location,
      activityType: marker.activityType,
      restaurantType: marker.restaurantType,
      travelType: marker.travelType,
      searchText: normalizeSearchText([
        marker.title,
        location,
        categoryLabel,
        placeTypeLabel,
        cuisineLabel,
        ...tagLabels,
      ].filter(Boolean).join(' ')),
    };
  });
  return cachedSearchEntries;
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
      const typeNorm = normalizeSearchText(entry.placeTypeLabel);
      const cuisineNorm = normalizeSearchText(entry.cuisineLabel);
      const tagsNorm = normalizeSearchText(entry.tagLabels.join(' '));
      let score = 0;

      if (titleNorm === normalizedQuery) score += 100;
      else if (titleNorm.startsWith(normalizedQuery)) score += 60;
      else if (titleNorm.includes(normalizedQuery)) score += 40;

      if (entry.searchText.includes(normalizedQuery)) score += 20;

      score += scoreFieldMatch(normalizedQuery, tokens, typeNorm);
      score += scoreFieldMatch(normalizedQuery, tokens, cuisineNorm);
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

let debounceTimer = null;
let activeIndex = -1;
let currentResults = [];

function syncClearButton(input, clearBtn) {
  if (!clearBtn) return;
  const hasValue = input.value.trim().length > 0;
  clearBtn.classList.toggle('hidden', !hasValue);
}

export function initMapSearch({ signal, onSelect } = {}) {
  const root = document.getElementById('map-search');
  const input = document.getElementById('map-search-input');
  const resultsEl = document.getElementById('map-search-results');
  const clearBtn = document.getElementById('map-search-clear');

  if (!root || !input || !resultsEl) return;

  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', 'map-search-results');

  function closeResults() {
    activeIndex = -1;
    currentResults = [];
    resultsEl.classList.add('hidden');
    resultsEl.innerHTML = '';
    root.classList.remove('is-open');
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }

  function renderResults(entries) {
    currentResults = entries;
    activeIndex = -1;

    if (!entries.length) {
      closeResults();
      return;
    }

    resultsEl.innerHTML = entries.map((entry, index) => `
      <li
        id="map-search-option-${index}"
        class="map-search-option"
        role="option"
        aria-selected="false"
        data-category-id="${escapeHtml(entry.categoryId)}"
        data-item-id="${escapeHtml(entry.itemId)}"
        data-category="${escapeHtml(entry.categoryId)}"
      >
        <span class="map-search-option-icon" aria-hidden="true">${renderMapMarkerTypeIcon(entry)}</span>
        <span class="map-search-option-copy">
          <span class="map-search-option-title">${escapeHtml(entry.title)}</span>
          <span class="map-search-option-meta">
            ${escapeHtml(getEntryMetaLabel(entry))}${entry.location ? ` · ${escapeHtml(entry.location)}` : ''}
          </span>
        </span>
      </li>
    `).join('');

    resultsEl.classList.remove('hidden');
    root.classList.add('is-open');
    input.setAttribute('aria-expanded', 'true');
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

      renderResults(rankSearchResults(buildSearchEntries(), query));
    }, SEARCH_DEBOUNCE_MS);
  }

  function selectEntry(entry) {
    if (!entry) return;
    input.value = '';
    syncClearButton(input, clearBtn);
    closeResults();
    input.blur();
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
    closeResults();
  }, { signal });

  signal?.addEventListener('abort', () => {
    window.clearTimeout(debounceTimer);
    closeResults();
  }, { once: true });
}

export function destroyMapSearch() {
  window.clearTimeout(debounceTimer);
}
