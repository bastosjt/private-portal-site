import { escapeHtml } from '../lib/escape-html.js';
import { devWarn } from '../lib/dev-log.js';
import { sanitizeHttpsUrl } from '../lib/safe-url.js';
import { applyPlaceToForm } from '../lib/apply-place-to-form.js';
import { fetchPlaceFromMapsUrl, MapsUrlImportError } from '../lib/google-maps-place-import.js';
import { isGooglePlacesConfigured } from '../lib/google-places-config.js';
import { isGoogleMapsUrl } from '../lib/google-maps-url-parse.js';
import { renderPlaceTypeIconHtml } from '../lib/form-name-field.js';
import { getItemLocationLabel } from '../lib/item-location.js';
import { formatItemPrice, hasItemPrice } from '../lib/price-format.js';

const urlImportResetters = new WeakMap();
const urlImportLastFetched = new WeakMap();

const MAP_PIN_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
`;

function getFieldWrap(input) {
  return input.closest('.url-import-field')?.closest('.form-field') || input.closest('.form-field');
}

function getInputWrap(input) {
  return input.closest('.url-import-field');
}

function getFeedbackEl(fieldWrap) {
  return fieldWrap?.querySelector('[data-url-import-preview]');
}

function setFieldState(fieldWrap, inputWrap, state = '') {
  const states = ['loading', 'success', 'blocked'];
  for (const name of states) {
    fieldWrap?.classList.toggle(`is-url-import-${name}`, state === name);
    inputWrap?.classList.toggle(`is-url-import-${name}`, state === name);
  }
  fieldWrap?.classList.toggle('has-url-import-feedback', Boolean(state));
}

function clearFeedback(fieldWrap, inputWrap) {
  const feedbackEl = getFeedbackEl(fieldWrap);
  if (feedbackEl) {
    feedbackEl.classList.remove('is-visible');
    feedbackEl.innerHTML = '';
    feedbackEl.removeAttribute('data-state');
    clearPreviewMeta(feedbackEl);
    feedbackEl.setAttribute('aria-hidden', 'true');
  }
  setFieldState(fieldWrap, inputWrap, '');
}

function clearPreviewMeta(feedbackEl) {
  delete feedbackEl.dataset.importUrl;
  delete feedbackEl.dataset.importTitle;
  delete feedbackEl.dataset.importAddress;
  delete feedbackEl.dataset.importPrice;
}

function setPreviewMeta(feedbackEl, metadata) {
  feedbackEl.dataset.importUrl = metadata.url || '';
  feedbackEl.dataset.importTitle = metadata.title?.trim() || '';
  feedbackEl.dataset.importAddress = metadata.address?.trim() || '';
  feedbackEl.dataset.importPrice = metadata.price ? String(metadata.price) : '';
}

function notifyFormDraft(form) {
  form?.dispatchEvent(new Event('input', { bubbles: true }));
}

function setInlineStatus(fieldWrap, { message = '', tone = 'info', loading = false } = {}) {
  const statusEl = fieldWrap?.querySelector('[data-url-import-status]');
  if (!statusEl) return;

  statusEl.classList.toggle('hidden', !message && !loading);
  statusEl.classList.toggle('is-loading', loading);
  statusEl.classList.toggle('is-error', tone === 'error');
  statusEl.textContent = message;
}

function showLoadingFeedback(fieldWrap, inputWrap) {
  const feedbackEl = getFeedbackEl(fieldWrap);
  if (!feedbackEl) return;

  setInlineStatus(fieldWrap, { message: '' });
  setFieldState(fieldWrap, inputWrap, 'loading');
  feedbackEl.dataset.state = 'loading';
  feedbackEl.setAttribute('aria-hidden', 'false');
  feedbackEl.innerHTML = `
    <span class="url-import-preview__kicker">Analyse en cours</span>
    <div class="url-import-preview__inner url-import-preview__inner--loading">
      <div class="url-import-preview__image url-import-preview__skeleton" aria-hidden="true"></div>
      <div class="url-import-preview__content">
        <span class="url-import-preview__skeleton-line" aria-hidden="true"></span>
        <span class="url-import-preview__skeleton-line url-import-preview__skeleton-line--short" aria-hidden="true"></span>
      </div>
    </div>
  `;
  feedbackEl.classList.add('is-visible');
}

function renderPreviewTypeIcon(category, typeValue) {
  const iconHtml = renderPlaceTypeIconHtml(category?.id, typeValue, { width: 22, height: 22 });
  return iconHtml || MAP_PIN_ICON;
}

function renderPlacePreview(fieldWrap, inputWrap, metadata, { notifyDraft = true, category, typeValue = null } = {}) {
  const feedbackEl = getFeedbackEl(fieldWrap);
  if (!feedbackEl) return;

  const title = metadata.title?.trim() || 'Lieu détecté';
  const address = metadata.address?.trim() || '';
  const priceLabel = metadata.price?.trim() || '';
  const previewIcon = renderPreviewTypeIcon(category, typeValue);
  const previewIconClass = typeValue
    ? 'url-import-preview__image url-import-preview__image--placeholder url-import-preview__image--type-icon'
    : 'url-import-preview__image url-import-preview__image--placeholder';

  setInlineStatus(fieldWrap, { message: '' });
  setFieldState(fieldWrap, inputWrap, 'success');
  feedbackEl.dataset.state = 'success';
  feedbackEl.setAttribute('aria-hidden', 'false');
  setPreviewMeta(feedbackEl, metadata);

  feedbackEl.innerHTML = `
    <span class="url-import-preview__kicker">Lieu importé</span>
    <div class="url-import-preview__inner url-import-preview__inner--success">
      <div class="${previewIconClass}" aria-hidden="true">${previewIcon}</div>
      <div class="url-import-preview__content">
        <div class="url-import-preview__row url-import-preview__row--meta">
          ${address ? `
            <span class="url-import-preview__site-wrap">
              <span class="url-import-preview__site-label">Adresse</span>
              <span class="url-import-preview__site">${escapeHtml(address)}</span>
            </span>
          ` : '<span></span>'}
          ${priceLabel ? `<span class="url-import-preview__price-badge">${escapeHtml(priceLabel)}</span>` : ''}
        </div>
        <p class="url-import-preview__title" title="${escapeHtml(title)}">${escapeHtml(title)}</p>
      </div>
    </div>
  `;
  feedbackEl.classList.add('is-visible');
  if (notifyDraft) notifyFormDraft(fieldWrap.closest('form'));
}

function hidePreview(fieldWrap, inputWrap) {
  clearFeedback(fieldWrap, inputWrap);
}

export function initPlaceMapsUrlImport(input, { form, category } = {}) {
  if (!isGooglePlacesConfigured()) return () => {};

  const fieldWrap = getFieldWrap(input);
  const inputWrap = getInputWrap(input);
  if (!fieldWrap || !inputWrap || !form) return () => {};

  let debounceTimer = null;
  let abortController = null;
  let lastFetchedUrl = urlImportLastFetched.get(input) || '';
  let suppressImport = false;

  function setSearching(isSearching) {
    inputWrap.classList.toggle('is-searching', isSearching);
  }

  function resetImportState() {
    clearTimeout(debounceTimer);
    abortController?.abort();
    abortController = null;
    setSearching(false);
    setInlineStatus(fieldWrap, { message: '' });
    hidePreview(fieldWrap, inputWrap);
    lastFetchedUrl = '';
    urlImportLastFetched.delete(input);
  }

  async function importUrl(rawUrl) {
    const safeUrl = sanitizeHttpsUrl(rawUrl);
    if (!safeUrl) {
      resetImportState();
      setInlineStatus(fieldWrap, {
        message: 'Lien HTTPS invalide.',
        tone: 'error',
      });
      return;
    }

    if (!isGoogleMapsUrl(safeUrl)) {
      resetImportState();
      setInlineStatus(fieldWrap, {
        message: 'Collez un lien Google Maps.',
        tone: 'error',
      });
      return;
    }

    if (safeUrl === lastFetchedUrl) return;

    clearTimeout(debounceTimer);
    abortController?.abort();
    abortController = new AbortController();

    setSearching(true);
    showLoadingFeedback(fieldWrap, inputWrap);

    try {
      const metadata = await fetchPlaceFromMapsUrl(safeUrl, {
        signal: abortController.signal,
        form,
        category,
      });

      applyPlaceToForm(form, category, metadata.place, {
        sourceUrl: metadata.url,
        onlyEmptyFields: false,
        silentNameUpdate: true,
      });

      lastFetchedUrl = safeUrl;
      urlImportLastFetched.set(input, safeUrl);
      renderPlacePreview(fieldWrap, inputWrap, metadata, {
        category,
        typeValue: form.elements.type?.value || form.elements.categorie?.value || null,
      });
    } catch (err) {
      if (err?.name === 'AbortError') return;

      lastFetchedUrl = '';
      devWarn('place-maps-url-import:', err);

      if (err instanceof MapsUrlImportError) {
        hidePreview(fieldWrap, inputWrap);
        setInlineStatus(fieldWrap, {
          message: err.message,
          tone: 'error',
        });
        return;
      }

      hidePreview(fieldWrap, inputWrap);
      setInlineStatus(fieldWrap, {
        message: err instanceof MapsUrlImportError
          ? err.message
          : (err?.message === 'Failed to fetch'
            ? 'Impossible de contacter Google Maps. Réessayez ou saisissez le lieu manuellement.'
            : err?.message || 'Impossible d’importer ce lien.'),
        tone: 'error',
      });
    } finally {
      setSearching(false);
    }
  }

  function scheduleImport() {
    if (suppressImport) return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      importUrl(input.value.trim());
    }, 700);
  }

  function onInput() {
    const safeUrl = sanitizeHttpsUrl(input.value.trim());
    if (!safeUrl) {
      resetImportState();
      return;
    }
    scheduleImport();
  }

  function onPaste() {
    scheduleImport();
  }

  function onBlur() {
    const safeUrl = sanitizeHttpsUrl(input.value.trim());
    if (!safeUrl || safeUrl === lastFetchedUrl) return;
    clearTimeout(debounceTimer);
    importUrl(safeUrl);
  }

  input.addEventListener('input', onInput);
  input.addEventListener('paste', onPaste);
  input.addEventListener('blur', onBlur);

  urlImportResetters.set(input, resetImportState);

  return () => {
    suppressImport = true;
    urlImportResetters.delete(input);
    resetImportState();
    input.removeEventListener('input', onInput);
    input.removeEventListener('paste', onPaste);
    input.removeEventListener('blur', onBlur);
  };
}

export function resetPlaceMapsUrlImport(form, category) {
  const field = category?.fields?.find((entry) => entry.urlImport?.provider === 'googleMaps');
  if (!field) return;

  const input = form?.elements?.[field.name];
  if (!input) return;

  urlImportResetters.get(input)?.();
}

export function syncPlaceMapsUrlImportFromItem(form, category, item) {
  const field = category?.fields?.find((entry) => entry.urlImport?.provider === 'googleMaps');
  if (!field || !form || !item) return;

  const input = form.elements[field.name];
  if (!input) return;

  const safeUrl = sanitizeHttpsUrl(input.value?.trim());
  if (!safeUrl || !isGoogleMapsUrl(safeUrl)) return;

  const fieldWrap = getFieldWrap(input);
  const inputWrap = getInputWrap(input);
  if (!fieldWrap || !inputWrap) return;

  urlImportLastFetched.set(input, safeUrl);

  renderPlacePreview(fieldWrap, inputWrap, {
    url: safeUrl,
    title: item.nom || item.localisation || '',
    address: getItemLocationLabel(category.id, item),
    price: hasItemPrice(item) ? formatItemPrice(item) : '',
  }, {
    notifyDraft: false,
    category,
    typeValue: form.elements.type?.value || form.elements.categorie?.value || null,
  });
}

export function restorePlaceMapsUrlImportFromDraft(form, category, draftMeta) {
  const field = category?.fields?.find((entry) => entry.urlImport?.provider === 'googleMaps');
  if (!field || !form) return;

  const preview = draftMeta?.urlImportPreview;
  const input = form.elements[field.name];
  if (!input) return;

  const fieldWrap = getFieldWrap(input);
  const inputWrap = getInputWrap(input);
  if (!fieldWrap || !inputWrap) return;

  if (!preview?.state || preview.state !== 'success') {
    hidePreview(fieldWrap, inputWrap);
    return;
  }

  const safeUrl = sanitizeHttpsUrl(preview.url || input.value?.trim());
  if (safeUrl) {
    urlImportLastFetched.set(input, safeUrl);
  }

  renderPlacePreview(fieldWrap, inputWrap, {
    url: safeUrl || '',
    title: preview.title,
    address: preview.address,
    price: preview.price,
  }, {
    notifyDraft: false,
    category,
    typeValue: form.elements.type?.value || form.elements.categorie?.value || null,
  });
}

export function initFormPlaceMapsUrlFields(form, category) {
  const cleanups = [];

  for (const field of category.fields) {
    if (field.urlImport?.provider !== 'googleMaps') continue;

    const input = form.elements[field.name];
    if (!input) continue;

    cleanups.push(initPlaceMapsUrlImport(input, { form, category, field }));
  }

  return () => cleanups.forEach((fn) => fn());
}
