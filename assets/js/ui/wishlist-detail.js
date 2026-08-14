import { getCategoryById } from '../config.js';
import { devError } from '../lib/dev-log.js';
import { updateItem, deleteItem } from '../firebase/firestore.js';
import { syncCachedItemWrite } from '../data/appDataCache.js';
import { formatItemPrice, formatPrice, hasItemPrice } from '../lib/price-format.js';
import { getFieldOptionLabel, initCustomOptions } from '../lib/custom-types.js';
import { waitForTransition, nextFrame } from '../lib/transitions.js';
import { lockScroll, unlockScroll } from '../lib/scroll-lock.js';
import { sanitizeHttpsUrl, sanitizeImageUrl } from '../lib/safe-url.js';
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
import { renderWishlistPriorityIcon } from '../pages/wishlist/IconsType.js';
import { createDetailImageMediaLoader } from './place-detail-media-loader.js';
import {
  createDetailListSelection,
  renderDetailMediaBlock,
  renderDetailMetaRow,
  renderDetailPlaceMedia,
  revealDetailPlacePhoto,
} from './category-detail-layout.js';

const COLLECTION = 'wishlist';
const DONE_LABELS = getCategoryDoneToggleLabels('wishlist');

function getFieldLabel(category, fieldName, value) {
  return getFieldOptionLabel(category.id, fieldName, value);
}

function getLinkLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

const LINK_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
`;

function renderWishlistPriorityBadge(category, item) {
  if (!item.priorite) return '';

  const label = escapeHtml(getFieldLabel(category, 'priorite', item.priorite));
  return `
    <span class="url-import-preview__price-badge wishlist-detail-priority-badge wishlist-detail-priority-badge--${item.priorite}">
      <span class="wishlist-detail-priority-label">Priorité</span>
      <span class="wishlist-detail-priority-value">${label}</span>
    </span>
  `;
}

function renderWishlistImageBlock(item, category, {
  photoVisible = false,
  isMediaLoading = false,
  resolvedMedia = null,
} = {}) {
  const iconHtml = renderWishlistPriorityIcon(item.priorite, { width: 48, height: 48 });
  const priorityBadge = renderWishlistPriorityBadge(category, item);
  const media = renderDetailPlaceMedia(resolvedMedia, {
    fallbackIconHtml: iconHtml,
    photoVisible,
    isLoading: isMediaLoading,
  });

  return renderDetailMediaBlock(media, { slotHtml: priorityBadge });
}

function renderWishlistLinkBadge(item) {
  const rawLink = item.lien?.trim();
  if (!rawLink) return '';

  const safeUrl = sanitizeHttpsUrl(rawLink);
  const label = escapeHtml(getLinkLabel(rawLink));
  const content = `${LINK_ICON}<span>${label}</span>`;

  if (safeUrl) {
    return `
      <a
        href="${escapeHtml(safeUrl)}"
        class="url-import-preview__price-badge wishlist-detail-badge-link"
        target="_blank"
        rel="noopener noreferrer"
      >${content}</a>
    `;
  }

  return `<span class="url-import-preview__price-badge wishlist-detail-badge-link">${content}</span>`;
}

function renderWishlistPriceLabel(item) {
  if (hasItemPrice(item)) {
    return escapeHtml(formatItemPrice(item));
  }
  if (item.prix) {
    return escapeHtml(formatPrice(item.prix));
  }
  return '';
}

function renderWishlistLinkPriceRow(item) {
  const linkHtml = renderWishlistLinkBadge(item);
  const priceLabel = renderWishlistPriceLabel(item);
  if (!linkHtml && !priceLabel) return '';

  return renderDetailMetaRow(
    linkHtml,
    priceLabel ? `<span class="url-import-preview__price-badge">${priceLabel}</span>` : '',
  );
}

export function initWishlistDetail({ onChanged, onEdit, theme = 'pink' } = {}) {
  const category = getCategoryById('wishlist');
  let currentItem = null;
  let isBusy = false;
  const mediaLoader = createDetailImageMediaLoader({
    getImageUrl: (item) => sanitizeImageUrl(item.imageUrl),
    logLabel: 'wishlist detail image',
  });
  const { setSelectedItem, getSelectedRow } = createDetailListSelection('data-wishlist-id');

  const { overlay, bodyEl, closeBtn } = createDetailModalOverlay({
    overlayId: 'wishlist-detail-overlay',
    title: 'Wishlist',
    theme,
  });
  const abort = new AbortController();
  const { signal } = abort;

  function renderContent(item) {
    const resolvedMedia = mediaLoader.getActivePlaceMedia();
    const photoVisible = resolvedMedia?.type === 'photo';
    const isMediaLoading = mediaLoader.canLoad(item) && !photoVisible;

    bodyEl.innerHTML = wrapDetailContentHtml(`
        ${renderWishlistImageBlock(item, category, { photoVisible, isMediaLoading, resolvedMedia })}
        <h3 class="act-detail-name">${escapeHtml(item.nom)}</h3>
        ${renderWishlistLinkPriceRow(item)}

        ${renderDoneToggle(Boolean(item.done), isBusy, DONE_LABELS)}
    `, { done: item.done, isBusy });

    bodyEl.querySelector('#act-detail-done')?.addEventListener('click', handleToggleDone);
    bodyEl.querySelector('#act-detail-edit')?.addEventListener('click', handleEdit);
    bodyEl.querySelector('#act-detail-delete')?.addEventListener('click', handleDelete);
  }

  function loadWishlistImage(item) {
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

    async function handleDelete() {
    if (!currentItem || isBusy) return;

    const confirmed = await confirmItemDeletion({
      itemName: currentItem.nom,
      entityLabel: 'Cette envie',
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
    overlay.classList.remove('hidden');
    document.body.classList.add('modal-open');
    lockScroll();
    nextFrame().then(() => {
      overlay.classList.add('is-active');
      loadWishlistImage(item);
    });
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
