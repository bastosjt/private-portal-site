import { escapeHtml } from '../lib/escape-html.js';
import { nextFrame, waitForTransition } from '../lib/transitions.js';

const DIALOG_MS = 320;

let activeOverlay = null;

function closeDialog(overlay, result) {
  if (!overlay || overlay.dataset.closing === 'true') return;
  overlay.dataset.closing = 'true';

  const dialog = overlay.querySelector('.confirm-delete-dialog');
  overlay.classList.remove('is-active');
  dialog?.classList.remove('is-active');

  waitForTransition(dialog || overlay, DIALOG_MS).then(() => {
    overlay.remove();
    if (activeOverlay === overlay) activeOverlay = null;
  });

  return result;
}

/**
 * @returns {Promise<boolean>}
 */
export function openConfirmDeleteDialog({
  title = 'Supprimer cet élément ?',
  message = 'Cette action est définitive. L’élément sera retiré de votre espace partagé.',
  itemName = '',
  confirmLabel = 'Supprimer',
  cancelLabel = 'Annuler',
} = {}) {
  if (activeOverlay) {
    activeOverlay.remove();
    activeOverlay = null;
  }

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-delete-overlay';
    overlay.innerHTML = `
      <div class="confirm-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-delete-title" aria-describedby="confirm-delete-message">
        <div class="confirm-delete-dialog-inner">
          <span class="confirm-delete-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </span>
          <h3 class="confirm-delete-title" id="confirm-delete-title">${escapeHtml(title)}</h3>
          <p class="confirm-delete-message" id="confirm-delete-message">${escapeHtml(message)}</p>
          ${itemName ? `<p class="confirm-delete-item">${escapeHtml(itemName)}</p>` : ''}
          <div class="confirm-delete-actions">
            <button type="button" class="confirm-delete-btn confirm-delete-btn--cancel" data-action="cancel">${escapeHtml(cancelLabel)}</button>
            <button type="button" class="confirm-delete-btn confirm-delete-btn--confirm" data-action="confirm">${escapeHtml(confirmLabel)}</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    activeOverlay = overlay;

    const finish = (result) => {
      resolve(closeDialog(overlay, result));
    };

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) finish(false);
    });

    overlay.querySelector('[data-action="cancel"]')?.addEventListener('click', () => finish(false));
    overlay.querySelector('[data-action="confirm"]')?.addEventListener('click', () => finish(true));

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
        document.removeEventListener('keydown', onKeyDown);
      }
    };
    document.addEventListener('keydown', onKeyDown);

    void nextFrame().then(() => {
      overlay.classList.add('is-active');
      overlay.querySelector('.confirm-delete-dialog')?.classList.add('is-active');
      overlay.querySelector('[data-action="cancel"]')?.focus();
    });
  });
}
