import { getCategoryById } from '../config.js';
import { updateItem, deleteItem } from '../firebase/firestore.js';
import { syncCachedItemWrite } from '../data/appDataCache.js';
import { getFieldOptionLabel, initCustomOptions } from '../lib/custom-types.js';
import { waitForTransition, nextFrame } from '../lib/transitions.js';
import { lockScroll, unlockScroll } from '../lib/scroll-lock.js';
import { escapeHtml } from '../lib/escape-html.js';
import {
  createDetailModalOverlay,
  DETAIL_MODAL_MS,
  renderDoneToggle,
  updateDoneToggleUI,
} from './item-detail-shared.js';
import { paintItemAuthors, renderItemAuthorMarkup } from './item-author.js';

const COLLECTION = 'movies';
const DONE_LABELS = { done: 'Déjà vu', todo: 'Pas encore vu' };

function getFieldLabel(category, fieldName, value) {
  return getFieldOptionLabel(category.id, fieldName, value);
}

export function initMovieDetail({ onChanged, onEdit, theme = 'violet' } = {}) {
  const category = getCategoryById('movies');
  let currentItem = null;
  let isBusy = false;
  let confirmDelete = false;

  const { overlay, bodyEl, closeBtn } = createDetailModalOverlay({
    overlayId: 'movie-detail-overlay',
    title: 'Film',
    theme,
  });
  const abort = new AbortController();
  const { signal } = abort;

  function renderContent(item) {
    const chips = [];
    if (item.type) {
      chips.push(`<span class="act-chip">${escapeHtml(getFieldLabel(category, 'type', item.type))}</span>`);
    }
    if (item.genre) {
      chips.push(`<span class="act-chip">${escapeHtml(getFieldLabel(category, 'genre', item.genre))}</span>`);
    }

    bodyEl.innerHTML = `
      <div class="act-detail-content${item.done ? ' act-detail-content--done' : ''}">
        <h3 class="act-detail-name">${escapeHtml(item.titre)}</h3>
        ${chips.length ? `<div class="act-chips">${chips.join('')}</div>` : ''}

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
      close();
    } catch (err) {
      console.error('toggle done:', err);
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
