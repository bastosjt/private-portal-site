import { escapeHtml } from '../lib/escape-html.js';
import { buildTmdbPosterUrl } from '../lib/tmdb-poster.js';
import { getFieldOptionLabel } from '../lib/custom-types.js';
import { renderMovieTypeIcon } from '../pages/films/IconsType.js';
import { mountUrlImportProgress } from './url-import-progress.js';

const MOVIE_IMPORT_STEPS = ['Recherche…', 'Métadonnées…', 'Import…'];
const importStepControllers = new WeakMap();

const importResetters = new WeakMap();
const lastImportedTitles = new WeakMap();

function getFieldWrap(input) {
  return input.closest('.form-field--movie-import') || input.closest('.form-field');
}

function getInputWrap(input) {
  return input.closest('.movie-title-field');
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

function clearPreviewMeta(feedbackEl) {
  delete feedbackEl.dataset.importTitle;
  delete feedbackEl.dataset.importImageUrl;
  delete feedbackEl.dataset.importPrice;
  delete feedbackEl.dataset.importAddress;
  delete feedbackEl.dataset.importType;
}

function setPreviewMeta(feedbackEl, metadata) {
  feedbackEl.dataset.importTitle = metadata.title?.trim() || '';
  feedbackEl.dataset.importImageUrl = metadata.imageUrl?.trim() || '';
  feedbackEl.dataset.importPrice = metadata.year?.trim() || '';
  feedbackEl.dataset.importAddress = metadata.genreMeta?.trim() || '';
  feedbackEl.dataset.importType = metadata.typeValue?.trim() || '';
}

function notifyFormDraft(form) {
  form?.dispatchEvent(new Event('input', { bubbles: true }));
}

function buildGenreMetaLine(category, genre, genre2) {
  const labels = [genre, genre2]
    .filter(Boolean)
    .map((value) => getFieldOptionLabel(category.id, 'genre', value));
  return labels.join(' · ');
}

export function buildMovieImportPreviewMetadata(form, category, media = {}) {
  const typeValue = media.type
    || (media.mediaType === 'tv' ? 'serie' : media.mediaType === 'movie' ? 'film' : '')
    || form.elements.type?.value
    || 'film';
  const genre = media.genre || form.elements.genre?.value;
  const genre2 = media.genre2 || form.elements.genre2?.value;
  const title = media.title || form.elements.titre?.value?.trim() || '';
  const posterPath = media.posterPath || form.elements.posterPath?.value?.trim() || '';
  const year = media.year || media.annee || form.elements.annee?.value?.trim() || '';
  const imageUrl = buildTmdbPosterUrl(posterPath, { width: 154 }) || '';

  return {
    title,
    posterPath,
    imageUrl,
    typeValue,
    genreMeta: buildGenreMetaLine(category, genre, genre2),
    year: year ? String(year) : '',
  };
}

function getImportKicker(typeValue) {
  return typeValue === 'serie' ? 'Série importée' : 'Film importé';
}

function renderPosterSlot(metadata) {
  if (metadata.imageUrl) {
    return `
      <img
        class="url-import-preview__image"
        src="${escapeHtml(metadata.imageUrl)}"
        alt=""
        loading="lazy"
        decoding="async"
      >
    `;
  }

  const iconHtml = renderMovieTypeIcon(metadata.typeValue || 'film', { width: 22, height: 22 });
  return `
    <div class="url-import-preview__image url-import-preview__image--placeholder url-import-preview__image--type-icon" aria-hidden="true">
      ${iconHtml}
    </div>
  `;
}

function hideMovieImportPreview(fieldWrap, inputWrap) {
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

export function showMovieImportLoading(fieldWrap, inputWrap) {
  const feedbackEl = getFeedbackEl(fieldWrap);
  if (!feedbackEl) return;

  setFieldState(fieldWrap, inputWrap, 'loading');
  feedbackEl.dataset.state = 'loading';
  feedbackEl.setAttribute('aria-hidden', 'false');
  importStepControllers.set(feedbackEl, mountUrlImportProgress(feedbackEl, MOVIE_IMPORT_STEPS, 0));
  feedbackEl.classList.add('is-visible');
}

export function advanceMovieImportStep(fieldWrap, stepIndex) {
  const feedbackEl = getFeedbackEl(fieldWrap);
  const setStep = feedbackEl ? importStepControllers.get(feedbackEl) : null;
  setStep?.(stepIndex);
}

export function renderMovieImportPreview(fieldWrap, inputWrap, metadata, {
  category,
  notifyDraft = true,
} = {}) {
  const feedbackEl = getFeedbackEl(fieldWrap);
  if (!feedbackEl || !metadata?.title) return;

  const title = metadata.title.trim();
  const genreMeta = metadata.genreMeta?.trim() || '';
  const yearLabel = metadata.year?.trim() || '';

  setFieldState(fieldWrap, inputWrap, 'success');
  feedbackEl.dataset.state = 'success';
  feedbackEl.setAttribute('aria-hidden', 'false');
  setPreviewMeta(feedbackEl, metadata);

  feedbackEl.innerHTML = `
    <span class="url-import-preview__kicker">${escapeHtml(getImportKicker(metadata.typeValue))}</span>
    <div class="url-import-preview__inner url-import-preview__inner--success">
      ${renderPosterSlot(metadata)}
      <div class="url-import-preview__content">
        <div class="url-import-preview__row url-import-preview__row--meta">
          ${genreMeta ? `
            <span class="url-import-preview__site-wrap">
              <span class="url-import-preview__site-label">Genres</span>
              <span class="url-import-preview__site">${escapeHtml(genreMeta)}</span>
            </span>
          ` : '<span></span>'}
          ${yearLabel ? `<span class="url-import-preview__price-badge">${escapeHtml(yearLabel)}</span>` : ''}
        </div>
        <p class="url-import-preview__title" title="${escapeHtml(title)}">${escapeHtml(title)}</p>
      </div>
    </div>
  `;
  feedbackEl.classList.add('is-visible');

  if (notifyDraft) {
    notifyFormDraft(fieldWrap.closest('form'));
  }
}

export function refreshMovieImportPreview(form, category) {
  const input = form?.elements?.titre;
  if (!input || !category) return;

  const fieldWrap = getFieldWrap(input);
  const inputWrap = getInputWrap(input);
  const feedbackEl = getFeedbackEl(fieldWrap);
  if (!feedbackEl?.classList.contains('is-visible') || feedbackEl.dataset.state !== 'success') return;

  renderMovieImportPreview(
    fieldWrap,
    inputWrap,
    buildMovieImportPreviewMetadata(form, category),
    { category, notifyDraft: false },
  );
}

export function markMovieTitleImported(input, title) {
  if (!input) return;
  lastImportedTitles.set(input, title?.trim() || '');
}

export function clearMovieTitleImported(input) {
  if (!input) return;
  lastImportedTitles.delete(input);
}

export function isMovieTitleImportStale(input) {
  if (!input) return true;
  const importedTitle = lastImportedTitles.get(input);
  if (!importedTitle) return true;
  return input.value.trim() !== importedTitle;
}

export function showMovieImportPreviewForInput(input, form, category, media, { loading = false } = {}) {
  if (!input || !form || !category) return;

  const fieldWrap = getFieldWrap(input);
  const inputWrap = getInputWrap(input);
  if (!fieldWrap) return;

  if (loading) {
    showMovieImportLoading(fieldWrap, inputWrap);
    return;
  }

  const metadata = buildMovieImportPreviewMetadata(form, category, media);
  if (!metadata.title) {
    hideMovieImportPreview(fieldWrap, inputWrap);
    clearMovieTitleImported(input);
    return;
  }

  markMovieTitleImported(input, metadata.title);
  renderMovieImportPreview(fieldWrap, inputWrap, metadata, { category });
}

export function hideMovieImportPreviewForInput(input) {
  const fieldWrap = getFieldWrap(input);
  const inputWrap = getInputWrap(input);
  hideMovieImportPreview(fieldWrap, inputWrap);
  clearMovieTitleImported(input);
}

export function resetMovieTitleImport(form, category) {
  const field = category?.fields?.find((entry) => entry.movieSearch);
  const input = form?.elements?.[field?.name];
  if (!input) return;

  importResetters.get(input)?.();
}

export function syncMovieTitleImportFromItem(form, category, item) {
  const field = category?.fields?.find((entry) => entry.movieSearch);
  if (!field || !form || !item?.titre) return;

  const input = form.elements[field.name];
  if (!input) return;

  markMovieTitleImported(input, item.titre);
  showMovieImportPreviewForInput(input, form, category, {
    title: item.titre,
    type: item.type,
    genre: item.genre,
    genre2: item.genre2,
    posterPath: item.posterPath,
    year: item.annee,
  });
}

export function restoreMovieTitleImportFromDraft(form, category, draftMeta) {
  const field = category?.fields?.find((entry) => entry.movieSearch);
  if (!field || !form) return;

  const preview = draftMeta?.urlImportPreview;
  const input = form.elements[field.name];
  if (!input) return;

  const fieldWrap = getFieldWrap(input);
  const inputWrap = getInputWrap(input);
  if (!fieldWrap) return;

  if (!preview?.state || preview.state !== 'success') {
    hideMovieImportPreview(fieldWrap, inputWrap);
    clearMovieTitleImported(input);
    return;
  }

  const title = preview.title || input.value?.trim() || '';
  if (title) {
    markMovieTitleImported(input, title);
  }

  renderMovieImportPreview(fieldWrap, inputWrap, {
    title,
    imageUrl: preview.imageUrl,
    genreMeta: preview.address,
    year: preview.price,
    typeValue: preview.typeValue || form.elements.type?.value || 'film',
  }, { category, notifyDraft: false });
}

export function registerMovieTitleImportReset(input, resetFn) {
  if (!input || typeof resetFn !== 'function') return;
  importResetters.set(input, resetFn);
}

export function unregisterMovieTitleImportReset(input) {
  importResetters.delete(input);
}
