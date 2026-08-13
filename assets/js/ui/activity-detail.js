import { getCategoryById } from '../config.js';
import { devError } from '../lib/dev-log.js';
import { fetchActivityDetailMedia, canLoadActivityPlacePhoto } from '../lib/google-place-photo.js';
import { createPlaceDetailMediaLoader } from './place-detail-media-loader.js';
import { updateItem, deleteItem } from '../firebase/firestore.js';
import { syncCachedItemWrite } from '../data/appDataCache.js';
import { formatItemPrice, hasItemPrice } from '../lib/price-format.js';
import { normalizeItemTags } from '../lib/item-tags.js';
import { getFieldOptionLabel, initCustomOptions } from '../lib/custom-types.js';
import { renderActivityScheduleNote } from '../pages/activites/scheduleDisplay.js';
import { renderActivityTypeIcon } from '../pages/activites/IconsType.js';
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
  itemHasMapPin,
} from './item-detail-shared.js';
import {
  createDetailListSelection,
  renderDetailBadge,
  renderDetailBadgeRow,
  renderDetailLocationBadge,
  renderDetailMediaBlock,
  renderDetailPlaceMedia,
  renderDetailMetaRow,
  renderDetailTravelBadge,
  revealDetailPlacePhoto,
} from './category-detail-layout.js';

const COLLECTION = 'activities';
const ITEM_ID_ATTR = 'data-activity-id';
const DONE_LABELS = getCategoryDoneToggleLabels(COLLECTION);

function getFieldLabel(category, fieldName, value) {
  return getFieldOptionLabel(category.id, fieldName, value);
}

function renderActivitySlotBadge(fieldLabel, value) {
  if (!value) return '';
  return `
    <span class="url-import-preview__price-badge wishlist-detail-priority-badge">
      <span class="wishlist-detail-priority-label">${escapeHtml(fieldLabel)}</span>
      <span class="wishlist-detail-priority-value">${escapeHtml(value)}</span>
    </span>
  `;
}

function renderActivityMediaSlotBadges(item, label) {
  const badges = [];
  if (item.categorie) badges.push(renderActivitySlotBadge('Type', label('categorie', item.categorie)));
  normalizeItemTags(item.tags).forEach((tagValue) => {
    badges.push(renderActivitySlotBadge('Tag', label('tags', tagValue)));
  });
  return badges.join('');
}

function renderActivityDetailBadges(item) {
  const travelBadge = renderDetailTravelBadge(item);
  return renderDetailBadgeRow(travelBadge);
}

function renderActivityDetailScroll(item, category, {
  placeMedia = null,
  photoVisible = false,
  isMediaLoading = false,
} = {}) {
  const esc = escapeHtml;
  const label = (field, value) => getFieldLabel(category, field, value);
  const locationBadge = renderDetailLocationBadge(item, COLLECTION, { escapeHtml: esc });
  const priceBadge = hasItemPrice(item) ? renderDetailBadge(formatItemPrice(item)) : '';
  const iconHtml = renderActivityTypeIcon(item.categorie, { width: 48, height: 48 });
  const media = renderDetailPlaceMedia(placeMedia, {
    fallbackIconHtml: iconHtml,
    photoVisible,
    isLoading: isMediaLoading,
  });

  return `
    ${renderDetailMediaBlock(media, {
      slotHtml: renderActivityMediaSlotBadges(item, label),
    })}
    <h3 class="act-detail-name">${esc(item.nom)}</h3>
    ${renderDetailMetaRow(locationBadge, priceBadge)}
    ${renderActivityDetailBadges(item)}
    ${renderActivityScheduleNote(item, {
      getDisponibiliteLabel: (value) => label('disponibilite', value),
      escapeHtml: esc,
    })}
  `;
}

export function initActivityDetail({ onChanged, onEdit, onMovePin, onClose, theme = 'cyan' } = {}) {
  const category = getCategoryById(COLLECTION);
  let currentItem = null;
  let isBusy = false;
  let confirmDelete = false;
  const mediaLoader = createPlaceDetailMediaLoader({
    canLoad: canLoadActivityPlacePhoto,
    fetchMedia: fetchActivityDetailMedia,
    logLabel: 'activity place media',
  });
  const { setSelectedItem, getSelectedRow } = createDetailListSelection(ITEM_ID_ATTR);

  const { overlay, bodyEl, closeBtn } = createDetailModalOverlay({
    overlayId: 'activity-detail-overlay',
    title: 'Activité',
    theme,
  });
  const abort = new AbortController();
  const { signal } = abort;

  function renderContent(item, { placeMedia = null } = {}) {
    const resolvedMedia = placeMedia || mediaLoader.getActivePlaceMedia();
    const photoVisible = resolvedMedia?.type === 'photo';
    const isMediaLoading = canLoadActivityPlacePhoto(item) && !photoVisible;

    bodyEl.innerHTML = wrapDetailContentHtml(`
        ${renderActivityDetailScroll(item, category, {
          placeMedia: resolvedMedia,
          photoVisible,
          isMediaLoading,
        })}

        ${renderDoneToggle(Boolean(item.done), isBusy, DONE_LABELS)}
    `, {
      done: item.done,
      confirmDelete,
      isBusy,
      canMovePin: itemHasMapPin(item) && Boolean(onMovePin),
    });

    bodyEl.querySelector('#act-detail-done')?.addEventListener('click', handleToggleDone);
    bodyEl.querySelector('#act-detail-edit')?.addEventListener('click', handleEdit);
    bodyEl.querySelector('#act-detail-move-pin')?.addEventListener('click', handleMovePin);
    bodyEl.querySelector('#act-detail-delete')?.addEventListener('click', handleDelete);
  }

  function loadPlaceMedia(item) {
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
    isBusy = true;
    updateDoneToggleUI(bodyEl, done, true, DONE_LABELS);

    const content = bodyEl.querySelector('.act-detail-content');
    content?.classList.toggle('act-detail-content--done', done);

    try {
      await updateItem(COLLECTION, currentItem.id, { done });
      currentItem = { ...currentItem, done };
      syncCachedItemWrite(COLLECTION, currentItem.id, { patch: { done } });
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

  function handleMovePin() {
    if (!currentItem || isBusy || !itemHasMapPin(currentItem)) return;
    onMovePin?.(currentItem);
  }

  async function handleDelete() {
    if (!currentItem || isBusy) return;

    if (!confirmDelete) {
      confirmDelete = true;
      renderContent(currentItem);
      return;
    }

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
      confirmDelete = false;
    } finally {
      isBusy = false;
      if (currentItem) renderContent(currentItem);
    }
  }

  async function open(item) {
    if (!item) return;
    await initCustomOptions();
    currentItem = item;
    confirmDelete = false;
    isBusy = false;
    renderContent(item);
    setSelectedItem(item.id);
    loadPlaceMedia(item);
    overlay.classList.remove('hidden');
    document.body.classList.add('modal-open');
    lockScroll();
    nextFrame().then(() => overlay.classList.add('is-active'));
  }

  async function close() {
    if (overlay.classList.contains('hidden')) return;

    dragClose.reset();
    onClose?.();
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
    confirmDelete = false;
    isBusy = false;
    bodyEl.innerHTML = '';
  }

  closeBtn.addEventListener('click', close);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !overlay.classList.contains('hidden')) {
      if (confirmDelete) {
        confirmDelete = false;
        renderContent(currentItem);
        return;
      }
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
