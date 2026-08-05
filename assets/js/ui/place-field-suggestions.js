import { escapeHtml } from '../lib/escape-html.js';
import { getFieldOptionLabel } from '../lib/custom-types.js';
import {
  getPlaceSuggestionFieldNames,
  resolvePlaceGoogleFieldSuggestions,
  supportsPlaceFieldSuggestions,
} from '../lib/place-google-type-mapping.js';
import { setSelectFieldValue } from './select-custom.js';

function getSelectFieldWrap(form, fieldName) {
  return form.querySelector(`[data-select-field="${fieldName}"]`);
}

function ensureSuggestionEl(fieldWrap, fieldName) {
  let el = fieldWrap.querySelector(`[data-place-suggestion="${fieldName}"]`);
  if (el) return el;

  el = document.createElement('div');
  el.className = 'place-field-suggestion';
  el.dataset.placeSuggestion = fieldName;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-hidden', 'true');
  const selectWrap = fieldWrap.querySelector('.form-select-wrap');
  const anchor = selectWrap?.parentElement || fieldWrap;
  anchor.insertBefore(el, selectWrap?.nextSibling || null);
  return el;
}

function hideSuggestionEl(el) {
  if (!el.classList.contains('is-visible')) {
    el.dataset.suggestedValue = '';
    el.innerHTML = '';
    el.setAttribute('aria-hidden', 'true');
    return;
  }

  el.classList.remove('is-visible');
  el.setAttribute('aria-hidden', 'true');

  const onTransitionEnd = (event) => {
    if (event.target !== el || event.propertyName !== 'max-height') return;
    el.removeEventListener('transitionend', onTransitionEnd);
    if (!el.classList.contains('is-visible')) {
      el.dataset.suggestedValue = '';
      el.innerHTML = '';
    }
  };

  el.addEventListener('transitionend', onTransitionEnd);
}

function renderSuggestionEl(el, categoryId, fieldName, value) {
  const displayLabel = getFieldOptionLabel(categoryId, fieldName, value);
  el.dataset.suggestedValue = value;
  el.innerHTML = `
    <div class="place-field-suggestion__inner">
      <div class="place-field-suggestion__content">
        <span class="place-field-suggestion-main">
          <span class="place-field-suggestion-kicker">Suggéré :</span>
          <span class="place-field-suggestion-value">${escapeHtml(displayLabel)}</span>
        </span>
        <span class="place-field-suggestion-actions">
          <button type="button" class="place-field-suggestion-btn place-field-suggestion-apply" data-place-suggestion-apply>Appliquer</button>
          <button type="button" class="place-field-suggestion-btn place-field-suggestion-dismiss" data-place-suggestion-dismiss>Ignorer</button>
        </span>
      </div>
    </div>
  `;
  el.classList.add('is-visible');
  el.setAttribute('aria-hidden', 'false');
}

function shouldShowSuggestionForField(form, fieldName, value) {
  if (!value) return false;

  const select = form.elements[fieldName];
  const currentValue = select?.value?.trim();
  return !currentValue || currentValue === value;
}

function showSuggestionForField(form, category, fieldName, value) {
  const fieldWrap = getSelectFieldWrap(form, fieldName);
  if (!fieldWrap || !shouldShowSuggestionForField(form, fieldName, value)) {
    const existing = fieldWrap?.querySelector(`[data-place-suggestion="${fieldName}"]`);
    if (existing) hideSuggestionEl(existing);
    return;
  }

  const el = ensureSuggestionEl(fieldWrap, fieldName);
  renderSuggestionEl(el, category.id, fieldName, value);
}

function notifyFormDraft(form) {
  form?.dispatchEvent(new Event('input', { bubbles: true }));
}

export function hasPendingPlaceFieldSuggestions(form) {
  if (!form) return false;
  return form.querySelector('[data-place-suggestion].is-visible') != null;
}

export function getFirstPendingPlaceFieldSuggestion(form) {
  return form?.querySelector('[data-place-suggestion].is-visible') ?? null;
}

export function clearPlaceFieldSuggestions(form) {
  if (!form) return;
  form.querySelectorAll('[data-place-suggestion]').forEach(hideSuggestionEl);
}

export function showPlaceFieldSuggestions(form, category, googlePlace) {
  if (!supportsPlaceFieldSuggestions(category.id)) return;

  const suggestions = resolvePlaceGoogleFieldSuggestions(googlePlace, category.id);

  for (const fieldName of getPlaceSuggestionFieldNames(category.id)) {
    showSuggestionForField(form, category, fieldName, suggestions[fieldName]);
  }

  notifyFormDraft(form);
}

export function restorePlaceFieldSuggestionsFromDraft(form, category, draftMeta) {
  const placeSuggestions = draftMeta?.placeSuggestions;
  if (!supportsPlaceFieldSuggestions(category.id) || !placeSuggestions) return;

  for (const fieldName of getPlaceSuggestionFieldNames(category.id)) {
    showSuggestionForField(form, category, fieldName, placeSuggestions[fieldName]);
  }
}

export function initPlaceFieldSuggestions(form, category) {
  if (!supportsPlaceFieldSuggestions(category.id)) return () => {};

  function onFormClick(event) {
    const applyBtn = event.target.closest('[data-place-suggestion-apply]');
    const dismissBtn = event.target.closest('[data-place-suggestion-dismiss]');
    if (!applyBtn && !dismissBtn) return;

    const suggestionEl = event.target.closest('[data-place-suggestion]');
    if (!suggestionEl) return;

    const fieldName = suggestionEl.dataset.placeSuggestion;
    const field = category.fields.find((item) => item.name === fieldName);
    if (!field) return;

    if (dismissBtn) {
      hideSuggestionEl(suggestionEl);
      notifyFormDraft(form);
      return;
    }

    const value = suggestionEl.dataset.suggestedValue;
    if (!value) return;

    const label = getFieldOptionLabel(category.id, fieldName, value);
    setSelectFieldValue(form, field, value, label, category.id);
    hideSuggestionEl(suggestionEl);
    notifyFormDraft(form);
  }

  form.addEventListener('click', onFormClick);

  return () => {
    form.removeEventListener('click', onFormClick);
    clearPlaceFieldSuggestions(form);
  };
}
