import { getCategoryById } from '../config.js';
import { updateItem, deleteItem } from '../firebase/firestore.js';
import { syncCachedItemWrite } from '../data/appDataCache.js';
import { getFieldOptionLabel, initCustomOptions } from '../lib/custom-types.js';
import { waitForTransition, nextFrame } from '../lib/transitions.js';
import { lockScroll, unlockScroll } from '../lib/scroll-lock.js';
import { escapeHtml } from '../lib/escape-html.js';
import { renderGeoCategoryLocation, renderGlobeLocation } from '../pages/shared/listLocation.js';
import {
  createDetailModalOverlay,
  DETAIL_MODAL_MS,
  renderDoneToggle,
  updateDoneToggleUI,
} from './item-detail-shared.js';
import { paintItemAuthors, renderItemAuthorMarkup } from './item-author.js';

const COLLECTION = 'travels';
const DONE_LABELS = { done: 'Voyage réalisé', todo: 'Pas encore fait' };

function getFieldLabel(category, fieldName, value) {
  return getFieldOptionLabel(category.id, fieldName, value);
}

function formatBudgetLabel(budget) {
  const value = String(budget || '').trim();
  if (!value) return '';
  return value.includes('€') ? value : `${value} €`;
}

export function initTravelDetail({ onChanged, onEdit, onClose, theme = 'blue' } = {}) {
  const category = getCategoryById('travels');
  let currentItem = null;
  let isBusy = false;
  let confirmDelete = false;

  const { overlay, bodyEl, closeBtn } = createDetailModalOverlay({
    overlayId: 'travel-detail-overlay',
    title: 'Voyage',
    theme,
  });
  const abort = new AbortController();
  const { signal } = abort;

  function renderContent(item) {
    const chips = [];
    if (item.type) {
      chips.push(`<span class="act-chip">${escapeHtml(getFieldLabel(category, 'type', item.type))}</span>`);
    }
    const budgetLabel = formatBudgetLabel(item.budget);
    if (budgetLabel) {
      chips.push(`<span class="act-chip act-chip--muted">${escapeHtml(budgetLabel)}</span>`);
    }

    bodyEl.innerHTML = `
      <div class="act-detail-content${item.done ? ' act-detail-content--done' : ''}">
        <h3 class="act-detail-name">${escapeHtml(item.destination)}</h3>
        ${chips.length ? `<div class="act-chips">${chips.join('')}</div>` : ''}
        ${renderGeoCategoryLocation(item, 'travels', { escapeHtml })}
        ${!item.localisation && item.pays?.trim() ? renderGlobeLocation(item.pays.trim(), { escapeHtml }) : ''}
        ${item.periode?.trim() ? `<p class="act-detail-description"><strong>Période :</strong> ${escapeHtml(item.periode.trim())}</p>` : ''}
        ${item.notes?.trim() ? `<p class="act-detail-description">${escapeHtml(item.notes.trim())}</p>` : ''}

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
