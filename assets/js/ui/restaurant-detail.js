import { getCategoryById } from '../config.js';
import { devWarn, devError } from '../lib/dev-log.js';
import { updateItem, deleteItem } from '../firebase/firestore.js';
import { syncCachedItemWrite } from '../data/appDataCache.js';
import { formatItemPrice, hasItemPrice } from '../lib/price-format.js';
import { getFieldOptionLabel, initCustomOptions } from '../lib/custom-types.js';
import { waitForTransition, nextFrame } from '../lib/transitions.js';
import { lockScroll, unlockScroll } from '../lib/scroll-lock.js';
import { escapeHtml } from '../lib/escape-html.js';
import { renderGeoCategoryLocation } from '../pages/shared/listLocation.js';
import { getCategoryDoneToggleLabels } from '../lib/category-status-labels.js';
import {
  createDetailModalOverlay,
  DETAIL_MODAL_MS,
  renderDoneToggle,
  updateDoneToggleUI,
  wireModalDragClose,
  renderLinkedTravelChip,
  wrapDetailContentHtml,
  itemHasMapPin,
} from './item-detail-shared.js';
import { paintItemAuthors, renderItemAuthorMarkup } from './item-author.js';

const COLLECTION = 'restaurants';
const DONE_LABELS = getCategoryDoneToggleLabels('restaurants');

function getFieldLabel(category, fieldName, value) {
  return getFieldOptionLabel(category.id, fieldName, value);
}

export function initRestaurantDetail({ onChanged, onEdit, onMovePin, onClose, theme = 'rose' } = {}) {
  const category = getCategoryById('restaurants');
  let currentItem = null;
  let isBusy = false;
  let confirmDelete = false;

  const { overlay, bodyEl, closeBtn } = createDetailModalOverlay({
    overlayId: 'restaurant-detail-overlay',
    title: 'Restaurant',
    theme,
  });
  const abort = new AbortController();
  const { signal } = abort;

  function renderContent(item) {
    const chips = [];
    if (item.type) {
      chips.push(`<span class="act-chip">${escapeHtml(getFieldLabel(category, 'type', item.type))}</span>`);
    }
    if (item.cuisine) {
      chips.push(`<span class="act-chip">${escapeHtml(getFieldLabel(category, 'cuisine', item.cuisine))}</span>`);
    }
    const travelChip = renderLinkedTravelChip(item, { escapeHtml });
    if (travelChip) chips.push(travelChip);
    if (hasItemPrice(item)) {
      chips.push(`<span class="act-chip act-chip--muted">${escapeHtml(formatItemPrice(item))}</span>`);
    }

    bodyEl.innerHTML = wrapDetailContentHtml(`
        <h3 class="act-detail-name">${escapeHtml(item.nom)}</h3>
        ${chips.length ? `<div class="act-chips">${chips.join('')}</div>` : ''}
        ${renderGeoCategoryLocation(item, 'restaurants', { escapeHtml, escapeHref: true })}

        ${renderDoneToggle(Boolean(item.done), isBusy, DONE_LABELS)}

        ${renderItemAuthorMarkup(item)}
    `, { done: item.done, confirmDelete, isBusy, canMovePin: itemHasMapPin(item) && Boolean(onMovePin) });

    bodyEl.querySelector('#act-detail-done')?.addEventListener('click', handleToggleDone);
    bodyEl.querySelector('#act-detail-edit')?.addEventListener('click', handleEdit);
    bodyEl.querySelector('#act-detail-move-pin')?.addEventListener('click', handleMovePin);
    bodyEl.querySelector('#act-detail-delete')?.addEventListener('click', handleDelete);
    paintItemAuthors(bodyEl);
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
      close();
    } catch (err) {
      devError('toggle done:', err);
      updateDoneToggleUI(bodyEl, !done, false, DONE_LABELS);
      content?.classList.toggle('act-detail-content--done', !done);
      isBusy = false;
      updateDoneToggleUI(bodyEl, currentItem.done, false, DONE_LABELS);
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
    overlay.classList.remove('hidden');
    document.body.classList.add('modal-open');
    lockScroll();
    nextFrame().then(() => overlay.classList.add('is-active'));
  }

  async function close() {
    if (overlay.classList.contains('hidden')) return;

    dragClose.reset();
    onClose?.();

    overlay.classList.remove('is-active');
    document.body.classList.remove('modal-open');
    unlockScroll();

    await waitForTransition(overlay.querySelector('.add-modal') || overlay, DETAIL_MODAL_MS);

    overlay.classList.add('hidden');
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
    overlay.classList.remove('is-active');
    overlay.classList.add('hidden');
    document.body.classList.remove('modal-open');
    unlockScroll();
    bodyEl.innerHTML = '';
    overlay.remove();
  }

  return { open, close, destroy };
}
