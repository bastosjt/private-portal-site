import { searchAddresses } from '../services/address-search.js';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getSuggestionMeta(suggestion) {
  const parts = [suggestion.postcode, suggestion.city, suggestion.country]
    .filter(Boolean)
    .filter((part, index, arr) => arr.indexOf(part) === index);

  return parts.join(' · ');
}

export function initAddressAutocomplete(input, { form, fills = {}, onSelect } = {}) {
  const wrap = input.closest('.address-field');
  if (!wrap) return () => {};

  const listId = `${input.id}-suggestions`;
  let suggestions = [];
  let activeIndex = -1;
  let debounceTimer = null;
  let abortController = null;
  let isOpen = false;

  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', listId);
  input.setAttribute('autocomplete', 'off');

  const list = document.createElement('ul');
  list.id = listId;
  list.className = 'address-suggestions hidden';
  list.setAttribute('role', 'listbox');
  document.body.appendChild(list);

  function positionList() {
    const rect = input.getBoundingClientRect();
    list.style.position = 'fixed';
    list.style.left = `${Math.max(12, rect.left)}px`;
    list.style.width = `${Math.min(rect.width, window.innerWidth - 24)}px`;
    list.style.top = `${rect.bottom + 8}px`;
    list.style.zIndex = '300';
  }

  function closeList() {
    isOpen = false;
    activeIndex = -1;
    list.classList.add('hidden');
    list.innerHTML = '';
    list.removeAttribute('style');
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

    list.innerHTML = items.map((item, index) => {
      const meta = getSuggestionMeta(item);
      return `
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
            <span class="address-suggestion-label">${escapeHtml(item.label)}</span>
            ${meta ? `<span class="address-suggestion-meta">${escapeHtml(meta)}</span>` : ''}
          </span>
        </li>
      `;
    }).join('');

    list.classList.remove('hidden');
    input.setAttribute('aria-expanded', 'true');
    isOpen = true;
    positionList();
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

  function applyFills(suggestion) {
    if (!form || !fills) return;

    for (const [fieldName, suggestionKey] of Object.entries(fills)) {
      const target = form.elements[fieldName];
      if (!target || suggestion[suggestionKey] == null) continue;
      target.value = suggestion[suggestionKey];
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function selectSuggestion(suggestion) {
    input.value = suggestion.label;
    input.dataset.lat = suggestion.lat ?? '';
    input.dataset.lng = suggestion.lng ?? '';
    input.dataset.mapsUrl = suggestion.mapsUrl ?? '';
    applyFills(suggestion);
    closeList();
    onSelect?.(suggestion);
  }

  async function fetchSuggestions(value) {
    abortController?.abort();
    abortController = new AbortController();

    wrap.classList.add('is-searching');

    try {
      const results = await searchAddresses(value, { signal: abortController.signal });
      if (input.value.trim() !== value.trim()) return;
      renderSuggestions(results);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('address search:', err.message);
        closeList();
      }
    } finally {
      wrap.classList.remove('is-searching');
    }
  }

  function scheduleSearch() {
    clearTimeout(debounceTimer);
    const value = input.value.trim();

    input.dataset.lat = '';
    input.dataset.lng = '';
    input.dataset.mapsUrl = '';

    if (value.length < 3) {
      abortController?.abort();
      closeList();
      return;
    }

    debounceTimer = setTimeout(() => fetchSuggestions(value), 280);
  }

  function onInput() {
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

  function onListClick(event) {
    const option = event.target.closest('.address-suggestion');
    if (!option) return;
    const index = Number(option.dataset.index);
    if (suggestions[index]) selectSuggestion(suggestions[index]);
  }

  function onBlur() {
    setTimeout(() => {
      if (!wrap.contains(document.activeElement)) closeList();
    }, 150);
  }

  function onScrollOrResize() {
    if (isOpen) positionList();
  }

  input.addEventListener('input', onInput);
  input.addEventListener('keydown', onKeyDown);
  input.addEventListener('blur', onBlur);
  list.addEventListener('mousedown', (event) => event.preventDefault());
  list.addEventListener('click', onListClick);
  window.addEventListener('scroll', onScrollOrResize, true);
  window.addEventListener('resize', onScrollOrResize);

  return () => {
    clearTimeout(debounceTimer);
    abortController?.abort();
    input.removeEventListener('input', onInput);
    input.removeEventListener('keydown', onKeyDown);
    input.removeEventListener('blur', onBlur);
    window.removeEventListener('scroll', onScrollOrResize, true);
    window.removeEventListener('resize', onScrollOrResize);
    list.remove();
  };
}

export function initFormAddressFields(form, category) {
  const cleanups = [];

  for (const field of category.fields) {
    if (field.type !== 'address') continue;

    const input = form.elements[field.name];
    if (!input) continue;

    const cleanup = initAddressAutocomplete(input, {
      form,
      fills: field.fills || {},
    });
    cleanups.push(cleanup);
  }

  return () => cleanups.forEach((fn) => fn());
}
