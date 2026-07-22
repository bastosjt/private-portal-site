import { MODAL_DRAG_HANDLE_HTML } from '../lib/modal-drag-close.js';

export { wireModalDragClose } from '../lib/modal-drag-close.js';

const MODAL_CLOSE_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
`;

import { getCategoryStatusLabels } from '../lib/category-status-labels.js';
import { findCachedItemById } from '../data/appDataCache.js';

export const DETAIL_MODAL_MS = 420;

const DEFAULT_STATUS = getCategoryStatusLabels('activities');

function resolveDoneLabels(labels = {}) {
  return {
    doneLabel: labels.doneLabel ?? labels.done ?? DEFAULT_STATUS.doneDetail,
    todoLabel: labels.todoLabel ?? labels.todo ?? DEFAULT_STATUS.todoDetail,
    doneHint: labels.doneHint ?? DEFAULT_STATUS.doneHint,
    todoHint: labels.todoHint ?? DEFAULT_STATUS.todoHint,
  };
}

export function renderDetailModalShellHtml({ title, theme }) {
  return `
    <div class="add-modal act-detail-modal" data-theme="${theme}" role="dialog" aria-modal="true" aria-labelledby="act-detail-title">
      ${MODAL_DRAG_HANDLE_HTML}
      <div class="add-modal-head">
        <button type="button" class="add-modal-back hidden" tabindex="-1" aria-hidden="true"></button>
        <h2 class="add-modal-title" id="act-detail-title">${title}</h2>
        <button type="button" class="add-modal-close" id="act-detail-close" aria-label="Fermer">
          ${MODAL_CLOSE_ICON}
        </button>
      </div>
      <div class="add-modal-body act-detail-body" id="act-detail-body"></div>
    </div>
  `;
}

export function createDetailModalOverlay({ overlayId, title, theme }) {
  const overlay = document.createElement('div');
  overlay.className = 'add-modal-overlay hidden';
  overlay.id = overlayId;
  overlay.innerHTML = renderDetailModalShellHtml({ title, theme });
  document.body.appendChild(overlay);

  return {
    overlay,
    bodyEl: overlay.querySelector('#act-detail-body'),
    closeBtn: overlay.querySelector('#act-detail-close'),
  };
}

export function renderDoneToggle(done, busy = false, labels = {}) {
  const { doneLabel, todoLabel, doneHint, todoHint } = resolveDoneLabels(labels);
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
          <span class="act-done-toggle-label" id="act-done-label">${done ? doneLabel : todoLabel}</span>
          <span class="act-done-toggle-hint" id="act-done-hint">${done ? doneHint : todoHint}</span>
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

export function updateDoneToggleUI(root, done, busy = false, labels = {}) {
  const { doneLabel, todoLabel, doneHint, todoHint } = resolveDoneLabels(labels);
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
  if (label) label.textContent = done ? doneLabel : todoLabel;
  if (hint) hint.textContent = done ? doneHint : todoHint;
}

export function renderDetailActionsHtml({ confirmDelete = false, isBusy = false } = {}) {
  return `
    <div class="act-detail-actions">
      <button type="button" class="act-detail-btn act-detail-btn--edit" id="act-detail-edit" ${isBusy ? 'disabled' : ''}>
        Modifier
      </button>
      <button type="button" class="act-detail-btn act-detail-btn--delete" id="act-detail-delete" ${isBusy ? 'disabled' : ''}>
        ${confirmDelete ? 'Confirmer la suppression' : 'Supprimer'}
      </button>
    </div>
  `;
}

export function wrapDetailContentHtml(scrollHtml, { done = false, confirmDelete = false, isBusy = false } = {}) {
  return `
    <div class="act-detail-content${done ? ' act-detail-content--done' : ''}">
      <div class="act-detail-scroll">
        ${scrollHtml}
      </div>
      ${renderDetailActionsHtml({ confirmDelete, isBusy })}
    </div>
  `;
}

export function renderLinkedTravelChip(item, { escapeHtml }) {
  if (!item?.travelId) return '';
  const travel = findCachedItemById('travels', item.travelId);
  if (!travel) return '';
  return `<span class="act-chip act-chip--travel">${escapeHtml(travel.destination || 'Voyage')}</span>`;
}
