import { getCategoryById } from '../config.js';
import { devError } from '../lib/dev-log.js';
import { getMoviePosterUrl } from '../lib/tmdb-poster.js';
import { createDetailImageMediaLoader } from './place-detail-media-loader.js';
import { updateItem, deleteItem } from '../firebase/firestore.js';
import { syncCachedItemWrite } from '../data/appDataCache.js';
import { getFieldOptionLabel, initCustomOptions } from '../lib/custom-types.js';
import { renderMovieTypeIcon } from '../pages/films/IconsType.js';
import { waitForTransition, nextFrame } from '../lib/transitions.js';
import { lockScroll, unlockScroll } from '../lib/scroll-lock.js';
import { escapeHtml } from '../lib/escape-html.js';
import { getCategoryDoneToggleLabels } from '../lib/category-status-labels.js';
import {
  createDetailModalOverlay,
  DETAIL_MODAL_MS,
  renderDoneToggle,
  updateDoneToggleUI,
  wireModalDragClose,
  wrapDetailContentHtml,
  confirmItemDeletion,
} from './item-detail-shared.js';
import {
  createDetailListSelection,
  renderDetailBadge,
  renderDetailMediaBlock,
  renderDetailPlaceMedia,
  renderDetailMetaRow,
  revealDetailPlacePhoto,
} from './category-detail-layout.js';

const COLLECTION = 'movies';
const ITEM_ID_ATTR = 'data-movie-id';
const DONE_LABELS = getCategoryDoneToggleLabels(COLLECTION);

function getFieldLabel(category, fieldName, value) {
  return getFieldOptionLabel(category.id, fieldName, value);
}

function renderMovieSlotBadge(fieldLabel, value) {
  if (!value) return '';
  return `
    <span class="url-import-preview__price-badge wishlist-detail-priority-badge">
      <span class="wishlist-detail-priority-label">${escapeHtml(fieldLabel)}</span>
      <span class="wishlist-detail-priority-value">${escapeHtml(value)}</span>
    </span>
  `;
}

function renderMovieMediaSlotBadges(item, label) {
  if (!item.type) return '';
  return renderMovieSlotBadge('Type', label('type', item.type));
}

function renderMovieTypeCornerIcon(item) {
  if (!item.type) return '';

  return `
    <span class="cat-panel-icon url-import-preview__price-badge act-detail-media-type-icon" aria-hidden="true">
      ${renderMovieTypeIcon(item.type, { width: 24, height: 24 })}
    </span>
  `;
}

function renderMovieGenreMeta(item, category) {
  const badges = [];

  if (item.genre) {
    badges.push(renderDetailBadge(getFieldLabel(category, 'genre', item.genre)));
  }
  if (item.genre2) {
    badges.push(renderDetailBadge(getFieldLabel(category, 'genre', item.genre2)));
  }

  if (!badges.length) return '';

  return `<div class="act-detail-meta-row__genres">${badges.join('')}</div>`;
}

function renderMovieDetailScroll(item, category, {
  placeMedia = null,
  photoVisible = false,
  isMediaLoading = false,
} = {}) {
  const esc = escapeHtml;
  const label = (field, value) => getFieldLabel(category, field, value);
  const genreMeta = renderMovieGenreMeta(item, category);
  const yearBadge = item.annee ? renderDetailBadge(String(item.annee)) : '';
  const iconHtml = renderMovieTypeIcon(item.type, { width: 48, height: 48 });
  const media = renderDetailPlaceMedia(placeMedia, {
    fallbackIconHtml: iconHtml,
    photoVisible,
    isLoading: isMediaLoading,
  });

  return `
    ${renderDetailMediaBlock(media, {
      slotHtml: renderMovieMediaSlotBadges(item, label),
      cornerSlotHtml: renderMovieTypeCornerIcon(item),
    })}
    <h3 class="act-detail-name">${esc(item.titre)}</h3>
    ${renderDetailMetaRow(genreMeta, yearBadge)}
  `;
}

export function initMovieDetail({ onChanged, onEdit, theme = 'violet' } = {}) {
  const category = getCategoryById(COLLECTION);
  let currentItem = null;
  let isBusy = false;
  const mediaLoader = createDetailImageMediaLoader({
    getImageUrl: getMoviePosterUrl,
    logLabel: 'movie poster',
  });
  const { setSelectedItem, getSelectedRow } = createDetailListSelection(ITEM_ID_ATTR);

  const { overlay, bodyEl, closeBtn } = createDetailModalOverlay({
    overlayId: 'movie-detail-overlay',
    title: 'Film & série',
    theme,
  });
  const abort = new AbortController();
  const { signal } = abort;

  function renderContent(item, { placeMedia = null } = {}) {
    const resolvedMedia = placeMedia || mediaLoader.getActivePlaceMedia();
    const photoVisible = resolvedMedia?.type === 'photo';
    const isMediaLoading = mediaLoader.canLoad(item) && !photoVisible;

    bodyEl.innerHTML = wrapDetailContentHtml(`
        ${renderMovieDetailScroll(item, category, {
          placeMedia: resolvedMedia,
          photoVisible,
          isMediaLoading,
        })}

        ${renderDoneToggle(Boolean(item.done), isBusy, DONE_LABELS)}
    `, { done: item.done, isBusy });

    bodyEl.querySelector('#act-detail-done')?.addEventListener('click', handleToggleDone);
    bodyEl.querySelector('#act-detail-edit')?.addEventListener('click', handleEdit);
    bodyEl.querySelector('#act-detail-delete')?.addEventListener('click', handleDelete);
  }

  function loadMoviePoster(item) {
    return mediaLoader.loadPlaceMedia(item, {
      isCurrentItem: (entry) => currentItem?.id === entry.id,
      onLoaded: (_entry, placeMedia) => {
        revealDetailPlacePhoto(bodyEl.querySelector('.act-detail-media-wrap'), placeMedia.url);
      },
      onSettled: () => {
        bodyEl.querySelector('.act-detail-media-stage')?.classList.remove('act-detail-media-stage--loading');
      },
    });
  }

  async function handleToggleDone() {
    if (!currentItem || isBusy) return;

    const done = !currentItem.done;
    const statut = done ? 'termine' : 'a_voir';
    isBusy = true;
    updateDoneToggleUI(bodyEl, done, true, DONE_LABELS);

    const content = bodyEl.querySelector('.act-detail-content');
    content?.classList.toggle('act-detail-content--done', done);

    try {
      await updateItem(COLLECTION, currentItem.id, { done, statut });
      currentItem = { ...currentItem, done, statut };
      syncCachedItemWrite(COLLECTION, currentItem.id, { patch: { done, statut } });
      onChanged?.(COLLECTION, currentItem.id, { patch: true });
      await close();
    } catch (err) {
      devError('toggle done:', err);
      isBusy = false;
      updateDoneToggleUI(bodyEl, currentItem.done, false, DONE_LABELS);
      content?.classList.toggle('act-detail-content--done', currentItem.done);
    }
  }

  function handleEdit() {
    if (!currentItem || isBusy) return;
    onEdit?.(currentItem);
  }

    async function handleDelete() {
    if (!currentItem || isBusy) return;

    const confirmed = await confirmItemDeletion({
      itemName: currentItem.titre,
      entityLabel: 'Ce film',
    });
    if (!confirmed) return;

    isBusy = true;
    renderContent(currentItem);

    try {
      const itemId = currentItem.id;
      await deleteItem(COLLECTION, itemId);
      syncCachedItemWrite(COLLECTION, itemId, { deleted: true });
      close();
      onChanged?.(COLLECTION, itemId, { deleted: true });
    } catch (err) {
      devError('deleteItem:', err);
    } finally {
      isBusy = false;
      if (currentItem) renderContent(currentItem);
    }
  }

  async function open(item) {
    if (!item) return;
    await initCustomOptions();
    currentItem = item;
    isBusy = false;
    renderContent(item);
    setSelectedItem(item.id);
    loadMoviePoster(item);
    overlay.classList.remove('hidden');
    document.body.classList.add('modal-open');
    lockScroll();
    nextFrame().then(() => overlay.classList.add('is-active'));
  }

  async function close() {
    if (overlay.classList.contains('hidden')) return;

    dragClose.reset();
    mediaLoader.cleanupPlaceMedia();

    const rowToReveal = getSelectedRow();

    overlay.classList.remove('is-active');
    document.body.classList.remove('modal-open');
    unlockScroll();

    await waitForTransition(overlay.querySelector('.add-modal') || overlay, DETAIL_MODAL_MS);

    overlay.classList.add('hidden');
    setSelectedItem(null);
    rowToReveal?.scrollIntoView({ block: 'nearest' });
    currentItem = null;
    isBusy = false;
    bodyEl.innerHTML = '';
  }

  closeBtn.addEventListener('click', close);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !overlay.classList.contains('hidden')) {
      close();
    }
  }, { signal });

  const dragClose = wireModalDragClose(overlay, close);

  function destroy() {
    abort.abort();
    dragClose.destroy();
    mediaLoader.cleanupPlaceMedia();
    overlay.classList.remove('is-active');
    overlay.classList.add('hidden');
    document.body.classList.remove('modal-open');
    unlockScroll();
    bodyEl.innerHTML = '';
    overlay.remove();
  }

  return { open, close, destroy };
}
