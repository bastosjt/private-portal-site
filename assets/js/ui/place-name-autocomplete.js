import { getPlaceAddressFieldName } from '../lib/place-form-fields.js';
import { escapeHtml } from '../lib/escape-html.js';
import { devWarn } from '../lib/dev-log.js';
import { buildGoogleMapsUrl } from '../lib/google-maps-url.js';
import {
  createPlaceSearchSessionToken,
  retrievePlace,
  suggestPlaces,
} from '../lib/google-places-search.js';
import { resolvePlaceSearchContext } from '../lib/place-search-context.js';
import { isGooglePlacesConfigured } from '../lib/google-places-config.js';
import { populatePriceRangeFields } from '../lib/form-price-field.js';
import {
  clearPlaceFieldSuggestions,
  showPlaceFieldSuggestions,
} from './place-field-suggestions.js';
import { supportsPlaceFieldSuggestions } from '../lib/place-google-type-mapping.js';

function getPlaceSearchFills(field) {
  return field.placeSearch?.fills || {};
}

export function initPlaceNameAutocomplete(input, {
  form,
  category,
  field,
  onSelect,
} = {}) {
  if (!isGooglePlacesConfigured()) return () => {};

  const wrap = input.closest('.place-name-field') || input.closest('.address-field');
  if (!wrap) return () => {};

  const addressFieldName = getPlaceAddressFieldName(category);
  const fills = getPlaceSearchFills(field);
  const fieldWrap = wrap.closest('.form-field') || wrap;
  const listId = `${input.id}-place-suggestions`;
  let suggestions = [];
  let activeIndex = -1;
  let debounceTimer = null;
  let abortController = null;
  let isOpen = false;
  let suppressSearch = false;
  let sessionToken = createPlaceSearchSessionToken();

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

  function resetSessionToken() {
    sessionToken = createPlaceSearchSessionToken();
  }

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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </span>
        <span class="address-suggestion-text">
          <span class="address-suggestion-label">${escapeHtml(item.name)}</span>
          ${item.address ? `<span class="address-suggestion-meta">${escapeHtml(item.address)}</span>` : ''}
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

  function applyFills(place) {
    if (!form) return;

    for (const [fieldName, placeKey] of Object.entries(fills)) {
      const target = form.elements[fieldName];
      if (!target || place[placeKey] == null) continue;
      target.value = place[placeKey];
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function fillAddressField(place) {
    if (!form || !addressFieldName) return;

    const addressInput = form.elements[addressFieldName];
    if (!addressInput) return;

    addressInput.dataset.suppressAutocomplete = '1';
    addressInput.value = place.address || '';
    addressInput.dataset.lat = place.lat ?? '';
    addressInput.dataset.lng = place.lng ?? '';
    addressInput.dataset.mapsUrl = place.mapsUrl ?? '';
    delete addressInput.dataset.suppressAutocomplete;

    form.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function fillPriceFields(place) {
    if (!form) return;
    if (!form.elements.prixMin && !form.elements.prixMax) return;

    populatePriceRangeFields(form, {
      prixMin: place.prixMin ?? null,
      prixMax: place.prixMax ?? null,
    });
  }

  function finalizeSelection(place) {
    suppressSearch = true;
    clearTimeout(debounceTimer);
    abortController?.abort();

    const name = place.name?.trim() || input.value.trim();
    const enriched = {
      ...place,
      name,
      mapsUrl: place.mapsUrl || buildGoogleMapsUrl({
        name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
      }),
    };

    input.value = enriched.name;
    closeList();
    fillAddressField(enriched);
    fillPriceFields(enriched);
    applyFills(enriched);
    if (supportsPlaceFieldSuggestions(category?.id)) {
      showPlaceFieldSuggestions(form, category, enriched);
    } else {
      clearPlaceFieldSuggestions(form);
    }
    form?.dispatchEvent(new Event('input', { bubbles: true }));
    onSelect?.(enriched);
    resetSessionToken();
    suppressSearch = false;
  }

  async function selectSuggestion(suggestion) {
    suppressSearch = true;
    clearTimeout(debounceTimer);
    abortController?.abort();
    input.value = suggestion.name;
    closeList();
    wrap.classList.add('is-searching');
    abortController = new AbortController();

    try {
      let place = null;

      if (suggestion.placeId && sessionToken) {
        place = await retrievePlace(suggestion.placeId, {
          sessionToken,
          signal: abortController.signal,
          suggestion,
        });
      }

      if (!place) {
        suppressSearch = false;
        return;
      }

      finalizeSelection(place);
    } catch (err) {
      if (err.name !== 'AbortError') {
        devWarn('place retrieve:', err.message);
      }
      suppressSearch = false;
    } finally {
      wrap.classList.remove('is-searching');
    }
  }

  async function fetchSuggestions(value) {
    abortController?.abort();
    abortController = new AbortController();

    wrap.classList.add('is-searching');

    try {
      const results = await suggestPlaces(value, {
        sessionToken,
        signal: abortController.signal,
        context: resolvePlaceSearchContext(form, category, field),
      });
      if (input.value.trim() !== value.trim()) return;
      renderSuggestions(results);
    } catch (err) {
      if (err.name !== 'AbortError') {
        devWarn('place search:', err.message);
        closeList();
      }
    } finally {
      wrap.classList.remove('is-searching');
    }
  }

  function scheduleSearch() {
    clearTimeout(debounceTimer);
    const value = input.value.trim();

    if (value.length < 2) {
      abortController?.abort();
      closeList();
      return;
    }

    debounceTimer = setTimeout(() => fetchSuggestions(value), 280);
  }

  function onInput() {
    if (suppressSearch) return;
    if (supportsPlaceFieldSuggestions(category?.id) && form) {
      clearPlaceFieldSuggestions(form);
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

  return () => {
    clearTimeout(debounceTimer);
    abortController?.abort();
    input.removeEventListener('input', onInput);
    input.removeEventListener('keydown', onKeyDown);
    input.removeEventListener('blur', onBlur);
    list.remove();
  };
}

export function initFormPlaceNameFields(form, category) {
  const cleanups = [];

  for (const field of category.fields) {
    if (!field.placeSearch) continue;

    const input = form.elements[field.name];
    if (!input) continue;

    const cleanup = initPlaceNameAutocomplete(input, { form, category, field });
    cleanups.push(cleanup);
  }

  return () => cleanups.forEach((fn) => fn());
}
