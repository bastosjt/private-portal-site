import { escapeHtml } from '../lib/escape-html.js';
import { devWarn } from '../lib/dev-log.js';
import { isTmdbConfigured } from '../lib/tmdb-config.js';
import { peekMovieSearchCache, searchMoviesAndSeries, retrieveMediaDetails } from '../lib/tmdb-search.js';
import { applyMovieToForm } from '../lib/apply-movie-to-form.js';
import { renderMovieTypeIcon } from '../pages/films/IconsType.js';
import {
  clearMovieTitleImported,
  hideMovieImportPreviewForInput,
  isMovieTitleImportStale,
  refreshMovieImportPreview,
  registerMovieTitleImportReset,
  showMovieImportPreviewForInput,
  unregisterMovieTitleImportReset,
} from './movie-title-import.js';

const SEARCH_DEBOUNCE_MS = 120;
const MIN_QUERY_LENGTH = 2;
const MAX_SUGGESTIONS = 8;

function renderSuggestionIcon(mediaType) {
  const typeValue = mediaType === 'tv' ? 'serie' : 'film';
  return renderMovieTypeIcon(typeValue, { width: 18, height: 18 });
}

function formatSuggestionMeta(item) {
  const kind = item.mediaType === 'tv' ? 'Série' : 'Film';
  return item.year ? `${kind} · ${item.year}` : kind;
}

export function initMovieTitleAutocomplete(input, {
  form,
  category,
  onSelect,
} = {}) {
  if (!isTmdbConfigured()) return () => {};

  const wrap = input.closest('.movie-title-field') || input.closest('.address-field');
  if (!wrap) return () => {};

  const fieldWrap = wrap.closest('.form-field') || wrap;
  const listId = `${input.id}-movie-suggestions`;
  let suggestions = [];
  let activeIndex = -1;
  let debounceTimer = null;
  let abortController = null;
  let isOpen = false;
  let suppressSearch = false;

  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', listId);
  input.setAttribute('autocomplete', 'off');

  const list = document.createElement('ul');
  list.id = listId;
  list.className = 'address-suggestions hidden';
  list.setAttribute('role', 'listbox');
  wrap.appendChild(list);

  function openListContainer() {
    fieldWrap.classList.add('has-address-suggestions');
    wrap.classList.add('is-open');
  }

  function closeListContainer() {
    fieldWrap.classList.remove('has-address-suggestions');
    wrap.classList.remove('is-open');
  }

  function ensureInputVisible() {
    input.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function closeList() {
    isOpen = false;
    activeIndex = -1;
    list.classList.add('hidden');
    list.innerHTML = '';
    closeListContainer();
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }

  function renderSuggestions(items) {
    suggestions = items;
    activeIndex = -1;

    if (!items.length) {
      closeList();
      return;
    }

    list.innerHTML = items.map((item, index) => `
      <li
        id="${input.id}-option-${index}"
        class="address-suggestion"
        role="option"
        aria-selected="false"
        data-index="${index}"
      >
        <span class="address-suggestion-icon" aria-hidden="true">
          ${renderSuggestionIcon(item.mediaType)}
        </span>
        <span class="address-suggestion-text">
          <span class="address-suggestion-label">${escapeHtml(item.title)}</span>
          <span class="address-suggestion-meta">${escapeHtml(formatSuggestionMeta(item))}</span>
        </span>
      </li>
    `).join('');

    list.classList.remove('hidden');
    input.setAttribute('aria-expanded', 'true');
    isOpen = true;
    openListContainer();
    ensureInputVisible();
  }

  function setActiveOption(index) {
    const options = list.querySelectorAll('.address-suggestion');
    options.forEach((option, i) => {
      const isActive = i === index;
      option.classList.toggle('is-active', isActive);
      option.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    activeIndex = index;
    if (index >= 0 && options[index]) {
      input.setAttribute('aria-activedescendant', options[index].id);
      options[index].scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function dismissMobileKeyboard() {
    input.blur();
    if (document.activeElement === input) {
      input.blur();
    }
  }

  function finalizeSelection(media) {
    suppressSearch = true;
    clearTimeout(debounceTimer);
    abortController?.abort();

    showMovieImportPreviewForInput(input, form, category, media, { loading: true });

    const enriched = applyMovieToForm(form, category, media) || media;
    showMovieImportPreviewForInput(input, form, category, enriched);

    closeList();
    onSelect?.(enriched);
    suppressSearch = false;
    dismissMobileKeyboard();
  }

  function selectSuggestion(suggestion) {
    suppressSearch = true;
    clearTimeout(debounceTimer);
    abortController?.abort();
    input.value = suggestion.title;
    closeList();
    dismissMobileKeyboard();

    finalizeSelection(suggestion);

    if (suggestion.genreIds?.length) return;

    retrieveMediaDetails(suggestion)
      .then((details) => {
        if (!details?.genreIds?.length) return;
        applyMovieToForm(form, category, details, { onlyEmptyFields: true });
        refreshMovieImportPreview(form, category);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') devWarn('tmdb media retrieve:', err.message);
      });
  }

  async function fetchSuggestions(value, { fromCache = false } = {}) {
    if (!fromCache) {
      abortController?.abort();
      abortController = new AbortController();
    }

    const signal = abortController?.signal;

    try {
      const results = await searchMoviesAndSeries(value, { signal });
      if (input.value.trim() !== value.trim()) return;
      renderSuggestions(results.slice(0, MAX_SUGGESTIONS));
    } catch (err) {
      if (err.name !== 'AbortError') {
        devWarn('tmdb search:', err.message);
        if (!fromCache) closeList();
      }
    }
  }

  function scheduleSearch() {
    clearTimeout(debounceTimer);
    const value = input.value.trim();

    if (value.length < MIN_QUERY_LENGTH) {
      abortController?.abort();
      closeList();
      return;
    }

    const cached = peekMovieSearchCache(value);
    if (cached?.length) {
      renderSuggestions(cached.slice(0, MAX_SUGGESTIONS));
    }

    debounceTimer = setTimeout(() => fetchSuggestions(value), SEARCH_DEBOUNCE_MS);
  }

  function onInput() {
    if (suppressSearch) return;

    const value = input.value.trim();
    if (!value.length) {
      hideMovieImportPreviewForInput(input);
    } else if (isMovieTitleImportStale(input)) {
      hideMovieImportPreviewForInput(input);
    }

    scheduleSearch();
  }

  function onKeyDown(event) {
    if (!isOpen) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveOption(Math.min(activeIndex + 1, suggestions.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveOption(Math.max(activeIndex - 1, 0));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      closeList();
    }
  }

  function onListMouseDown(event) {
    const option = event.target.closest('.address-suggestion');
    if (!option) return;
    event.preventDefault();
    const index = Number(option.dataset.index);
    if (suggestions[index]) selectSuggestion(suggestions[index]);
  }

  function onBlur() {
    setTimeout(() => {
      if (!wrap.contains(document.activeElement)) closeList();
    }, 150);
  }

  input.addEventListener('input', onInput);
  input.addEventListener('keydown', onKeyDown);
  input.addEventListener('blur', onBlur);
  list.addEventListener('mousedown', onListMouseDown);

  registerMovieTitleImportReset(input, () => {
    hideMovieImportPreviewForInput(input);
  });

  return () => {
    clearTimeout(debounceTimer);
    abortController?.abort();
    unregisterMovieTitleImportReset(input);
    clearMovieTitleImported(input);
    input.removeEventListener('input', onInput);
    input.removeEventListener('keydown', onKeyDown);
    input.removeEventListener('blur', onBlur);
    list.remove();
  };
}

export function initFormMovieTitleFields(form, category) {
  const cleanups = [];

  for (const field of category.fields) {
    if (!field.movieSearch) continue;

    const input = form.elements[field.name];
    if (!input) continue;

    const cleanup = initMovieTitleAutocomplete(input, { form, category });
    cleanups.push(cleanup);
  }

  return () => cleanups.forEach((fn) => fn());
}
