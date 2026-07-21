import { getCategoryById } from '../config.js';
import { devWarn, devError } from '../lib/dev-log.js';
import { updateItem, deleteItem } from '../firebase/firestore.js';
import { syncCachedItemWrite } from '../data/appDataCache.js';
import { formatItemPrice, formatPrice, hasItemPrice } from '../lib/price-format.js';
import { getFieldOptionLabel, initCustomOptions } from '../lib/custom-types.js';
import { waitForTransition, nextFrame } from '../lib/transitions.js';
import { lockScroll, unlockScroll } from '../lib/scroll-lock.js';
import { sanitizeHttpsUrl } from '../lib/safe-url.js';
import { escapeHtml } from '../lib/escape-html.js';
import { getCategoryDoneToggleLabels } from '../lib/category-status-labels.js';
import {
  createDetailModalOverlay,
  DETAIL_MODAL_MS,
  renderDoneToggle,
  updateDoneToggleUI,
  wireModalDragClose,
} from './item-detail-shared.js';
import { paintItemAuthors, renderItemAuthorMarkup } from './item-author.js';

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

function renderWishlistLinkBlock(item) {
  const rawLink = item.lien?.trim();
  if (!rawLink) return '';

  const safeUrl = sanitizeHttpsUrl(rawLink);
  const label = escapeHtml(getLinkLabel(rawLink));

  if (safeUrl) {
    return `
      <a href="${escapeHtml(safeUrl)}" class="act-location" target="_blank" rel="noopener noreferrer">
        ${LINK_ICON}
        <span>${label}</span>
      </a>
    `;
  }

  return `
    <p class="act-location act-location--text">
      ${LINK_ICON}
      <span>${label}</span>
    </p>
  `;
}

export function initWishlistDetail({ onChanged, onEdit, theme = 'pink' } = {}) {
  const category = getCategoryById('wishlist');
  let currentItem = null;
  let isBusy = false;
  let confirmDelete = false;
  let selectedRow = null;

  function setSelectedItem(itemId) {
    selectedRow?.classList.remove('is-selected');
    selectedRow = null;
    if (!itemId) return;

    const inner = document.querySelector(`[data-wishlist-id="${CSS.escape(itemId)}"]`);
    selectedRow = inner?.closest('.act-list-item') || null;
    selectedRow?.classList.add('is-selected');
  }

  const { overlay, bodyEl, closeBtn } = createDetailModalOverlay({
    overlayId: 'wishlist-detail-overlay',
    title: 'Wishlist',
    theme,
  });
  const abort = new AbortController();
  const { signal } = abort;

  function renderContent(item) {
    const chips = [];

    if (item.priorite) {
      chips.push(`<span class="act-chip wishlist-chip-priority wishlist-chip-priority--${item.priorite}">${escapeHtml(getFieldLabel(category, 'priorite', item.priorite))}</span>`);
    }
    if (hasItemPrice(item)) {
      chips.push(`<span class="act-chip act-chip--muted">${escapeHtml(formatItemPrice(item))}</span>`);
    } else if (item.prix) {
      chips.push(`<span class="act-chip act-chip--muted">${escapeHtml(formatPrice(item.prix))}</span>`);
    }

    bodyEl.innerHTML = `
      <div class="act-detail-content${item.done ? ' act-detail-content--done' : ''}">
        <h3 class="act-detail-name">${escapeHtml(item.nom)}</h3>
        ${chips.length ? `<div class="act-chips">${chips.join('')}</div>` : ''}
        ${item.description ? `<p class="act-detail-description">${escapeHtml(item.description)}</p>` : ''}
        ${renderWishlistLinkBlock(item)}

        ${renderDoneToggle(Boolean(item.done), isBusy, DONE_LABELS)}

        ${renderItemAuthorMarkup(item)}

        <div class="act-detail-actions">
          <button type="button" class="act-detail-btn act-detail-btn--edit" id="act-detail-edit" ${isBusy ? 'disabled' : ''}>
            Modifier
          </button>
          <button type="button" class="act-detail-btn act-detail-btn--delete" id="act-detail-delete" ${isBusy ? 'disabled' : ''}>
            ${confirmDelete ? 'Confirmer la suppression' : 'Supprimer'}
          </button>
        </div>
      </div>
    `;

    bodyEl.querySelector('#act-detail-done')?.addEventListener('click', handleToggleDone);
    bodyEl.querySelector('#act-detail-edit')?.addEventListener('click', handleEdit);
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
    overlay.classList.remove('hidden');
    document.body.classList.add('modal-open');
    lockScroll();
    nextFrame().then(() => overlay.classList.add('is-active'));
  }

  async function close() {
    if (overlay.classList.contains('hidden')) return;

    dragClose.reset();

    const rowToReveal = selectedRow;

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
    overlay.classList.remove('is-active');
    overlay.classList.add('hidden');
    document.body.classList.remove('modal-open');
    unlockScroll();
    bodyEl.innerHTML = '';
    overlay.remove();
  }

  return { open, close, destroy };
}
