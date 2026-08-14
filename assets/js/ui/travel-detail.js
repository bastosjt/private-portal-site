import { getCategoryById } from '../config.js';
import { devError } from '../lib/dev-log.js';
import { fetchTravelDetailMedia, canLoadTravelPlacePhoto, getPlacePhotoMediaFromItem } from '../lib/google-place-photo.js';
import { createPlaceDetailMediaLoader } from './place-detail-media-loader.js';
import { updateItem, deleteItem } from '../firebase/firestore.js';
import { syncCachedItemWrite } from '../data/appDataCache.js';
import { getFieldOptionLabel, initCustomOptions } from '../lib/custom-types.js';
import { renderTravelTypeIcon } from '../pages/voyages/IconsType.js';
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
  confirmItemDeletion,
} from './item-detail-shared.js';
import {
  createDetailListSelection,
  renderDetailBadge,
  renderDetailLocationBadge,
  renderDetailMediaBlock,
  renderDetailPlaceMedia,
  renderDetailMetaRow,
  revealDetailPlacePhoto,
} from './category-detail-layout.js';

const COLLECTION = 'travels';
const ITEM_ID_ATTR = 'data-travel-id';
const DONE_LABELS = getCategoryDoneToggleLabels(COLLECTION);

function getFieldLabel(category, fieldName, value) {
  return getFieldOptionLabel(category.id, fieldName, value);
}

function formatBudgetLabel(budget) {
  const value = String(budget || '').trim();
  if (!value) return '';
  return value.includes('€') ? value : `${value} €`;
}

function renderTravelSlotBadge(fieldLabel, value) {
  if (!value) return '';
  return `
    <span class="url-import-preview__price-badge wishlist-detail-priority-badge">
      <span class="wishlist-detail-priority-label">${escapeHtml(fieldLabel)}</span>
      <span class="wishlist-detail-priority-value">${escapeHtml(value)}</span>
    </span>
  `;
}

function renderTravelMediaSlotBadges(item, label) {
  const badges = [];
  if (item.type) badges.push(renderTravelSlotBadge('Type', label('type', item.type)));
  if (item.periode?.trim()) badges.push(renderTravelSlotBadge('Période', item.periode.trim()));
  return badges.join('');
}

function renderTravelTypeCornerIcon(item) {
  if (!item.type) return '';

  return `
    <span class="cat-panel-icon url-import-preview__price-badge act-detail-media-type-icon" aria-hidden="true">
      ${renderTravelTypeIcon(item.type, { width: 24, height: 24 })}
    </span>
  `;
}

function renderTravelDetailScroll(item, category, {
  placeMedia = null,
  photoVisible = false,
  isMediaLoading = false,
} = {}) {
  const esc = escapeHtml;
  const label = (field, value) => getFieldLabel(category, field, value);
  const locationBadge = item.localisation?.trim()
    ? renderDetailLocationBadge(item, COLLECTION, { escapeHtml: esc, escapeHref: true })
    : '';
  const budgetBadge = formatBudgetLabel(item.budget)
    ? renderDetailBadge(formatBudgetLabel(item.budget))
    : '';
  const iconHtml = renderTravelTypeIcon(item.type, { width: 48, height: 48 });
  const media = renderDetailPlaceMedia(placeMedia, {
    fallbackIconHtml: iconHtml,
    photoVisible,
    isLoading: isMediaLoading,
  });

  return `
    ${renderDetailMediaBlock(media, {
      slotHtml: renderTravelMediaSlotBadges(item, label),
      cornerSlotHtml: renderTravelTypeCornerIcon(item),
    })}
    ${renderDetailMetaRow(locationBadge, budgetBadge)}
    ${item.notes?.trim() ? `<p class="act-detail-description">${esc(item.notes.trim())}</p>` : ''}
  `;
}

export function initTravelDetail({ onChanged, onEdit, onMovePin, onClose, theme = 'blue' } = {}) {
  const category = getCategoryById(COLLECTION);
  let currentItem = null;
  let isBusy = false;
  const mediaLoader = createPlaceDetailMediaLoader({
    canLoad: canLoadTravelPlacePhoto,
    fetchMedia: fetchTravelDetailMedia,
    getInstantMedia: getPlacePhotoMediaFromItem,
    logLabel: 'travel place media',
  });
  const { setSelectedItem, getSelectedRow } = createDetailListSelection(ITEM_ID_ATTR);

  const { overlay, bodyEl, closeBtn } = createDetailModalOverlay({
    overlayId: 'travel-detail-overlay',
    title: 'Voyage',
    theme,
  });
  const abort = new AbortController();
  const { signal } = abort;

  function renderContent(item, { placeMedia = null } = {}) {
    const resolvedMedia = placeMedia || mediaLoader.getActivePlaceMedia();
    const photoVisible = resolvedMedia?.type === 'photo';
    const isMediaLoading = canLoadTravelPlacePhoto(item) && !photoVisible;

    bodyEl.innerHTML = wrapDetailContentHtml(`
        ${renderTravelDetailScroll(item, category, {
          placeMedia: resolvedMedia,
          photoVisible,
          isMediaLoading,
        })}

        ${renderDoneToggle(Boolean(item.done), isBusy, DONE_LABELS)}
    `, {
      done: item.done,
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

    const confirmed = await confirmItemDeletion({
      itemName: (currentItem.localisation || currentItem.pays || currentItem.nom),
      entityLabel: 'Ce voyage',
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
    renderContent(item, { placeMedia: getPlacePhotoMediaFromItem(item) });
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
