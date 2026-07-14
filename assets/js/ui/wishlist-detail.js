import { getCategoryById } from '../config.js';
import { updateItem, deleteItem } from '../firebase/firestore.js';
import { syncCachedItemWrite } from '../data/appDataCache.js';
import { formatItemPrice, formatPrice, hasItemPrice } from '../lib/price-format.js';
import { getFieldOptionLabel, initCustomOptions } from '../lib/custom-types.js';
import { waitForTransition, nextFrame } from '../lib/transitions.js';
import { lockScroll, unlockScroll } from '../lib/scroll-lock.js';
import { sanitizeHttpsUrl } from '../lib/safe-url.js';
import { paintItemAuthors, renderItemAuthorMarkup } from './item-author.js';

const MODAL_MS = 420;
const COLLECTION = 'wishlist';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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

function renderDoneToggle(done, busy = false) {
  return `
    <div class="act-done-card${done ? ' is-done' : ''}${busy ? ' is-busy' : ''}" id="act-done-card">
      <button
        type="button"
        class="act-done-toggle"
        id="act-detail-done"
        aria-pressed="${done ? 'true' : 'false'}"
        ${busy ? 'disabled' : ''}
      >
        <span class="act-done-toggle-icon" aria-hidden="true">
          <svg class="act-done-icon act-done-icon--pending" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9"/>
          </svg>
          <svg class="act-done-icon act-done-icon--checked" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
        </span>
        <span class="act-done-toggle-copy">
          <span class="act-done-toggle-label" id="act-done-label">${done ? 'Déjà obtenu' : 'Pas encore obtenu'}</span>
          <span class="act-done-toggle-hint" id="act-done-hint">${done ? 'C\'est dans la poche' : 'Appuyez pour cocher'}</span>
        </span>
        <span class="act-done-switch" aria-hidden="true">
          <span class="act-done-switch-track">
            <span class="act-done-switch-thumb"></span>
          </span>
        </span>
      </button>
    </div>
  `;
}

function updateDoneToggleUI(root, done, busy = false) {
  const card = root.querySelector('#act-done-card');
  const btn = root.querySelector('#act-detail-done');
  const label = root.querySelector('#act-done-label');
  const hint = root.querySelector('#act-done-hint');

  card?.classList.toggle('is-done', done);
  card?.classList.toggle('is-busy', busy);

  if (btn) {
    btn.setAttribute('aria-pressed', done ? 'true' : 'false');
    btn.disabled = busy;
  }
  if (label) label.textContent = done ? 'Déjà obtenu' : 'Pas encore obtenu';
  if (hint) hint.textContent = done ? 'C\'est dans la poche' : 'Appuyez pour cocher';
}

export function initWishlistDetail({ onChanged, onEdit, theme = 'pink' } = {}) {
  const category = getCategoryById('wishlist');
  let currentItem = null;
  let isBusy = false;
  let confirmDelete = false;

  const overlay = document.createElement('div');
  overlay.className = 'add-modal-overlay hidden';
  overlay.id = 'wishlist-detail-overlay';
  overlay.innerHTML = `
    <div class="add-modal act-detail-modal" data-theme="${theme}" role="dialog" aria-modal="true" aria-labelledby="act-detail-title">
      <div class="add-modal-head">
        <button type="button" class="add-modal-back hidden" tabindex="-1" aria-hidden="true"></button>
        <h2 class="add-modal-title" id="act-detail-title">Wishlist</h2>
        <button type="button" class="add-modal-close" id="act-detail-close" aria-label="Fermer">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>
      </div>
      <div class="add-modal-body act-detail-body" id="act-detail-body"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const bodyEl = overlay.querySelector('#act-detail-body');
  const closeBtn = overlay.querySelector('#act-detail-close');
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

        ${renderDoneToggle(Boolean(item.done), isBusy)}

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
    updateDoneToggleUI(bodyEl, done, true);

    const content = bodyEl.querySelector('.act-detail-content');
    content?.classList.toggle('act-detail-content--done', done);

    try {
      await updateItem(COLLECTION, currentItem.id, { done });
      currentItem = { ...currentItem, done };
      syncCachedItemWrite(COLLECTION, currentItem.id, { patch: { done } });
      onChanged?.(COLLECTION, currentItem.id, { patch: true });
      close();
    } catch (err) {
      console.error('toggle done:', err);
      isBusy = false;
      updateDoneToggleUI(bodyEl, currentItem.done, false);
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
      console.error('deleteItem:', err);
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

    overlay.classList.remove('is-active');
    document.body.classList.remove('modal-open');
    unlockScroll();

    await waitForTransition(overlay.querySelector('.add-modal') || overlay, MODAL_MS);

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

  function destroy() {
    abort.abort();
    overlay.classList.remove('is-active');
    overlay.classList.add('hidden');
    document.body.classList.remove('modal-open');
    unlockScroll();
    bodyEl.innerHTML = '';
    overlay.remove();
  }

  return { open, close, destroy };
}
