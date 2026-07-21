import { escapeHtml } from '../lib/escape-html.js';
import { SETTINGS_THEME, getUserDisplayName } from '../config.js';
import { setUserDisplayName } from '../lib/user-profile.js';
import { renderNavIcon } from '../lib/lucide-icon.js';
import { lockScroll, unlockScroll } from '../lib/scroll-lock.js';
import { MODAL_DRAG_HANDLE_HTML, wireModalDragClose } from '../lib/modal-drag-close.js';

function getInitialsFromName(name) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function renderFormHtml(displayName) {
  return `
    <form class="profile-display-name-form add-form" id="profile-display-name-form" data-theme="${SETTINGS_THEME}" novalidate>
      <p class="add-picker-lead">Choisis ton pseudo</p>
      <label class="form-field" for="profile-display-name-input">
        <span class="form-field-label">Pseudo</span>
        <div class="form-input-wrap">
          <input
            type="text"
            class="form-input"
            id="profile-display-name-input"
            maxlength="32"
            autocomplete="nickname"
            placeholder="Ex. MonPseudo"
            value="${escapeHtml(displayName)}"
            required
          >
        </div>
      </label>
      <button type="submit" class="add-form-submit" id="profile-display-name-save">Enregistrer</button>
    </form>
  `;
}

export function initProfileDisplayNamePicker({ user, onChange, signal } = {}) {
  if (!user) return () => {};

  const overlay = document.createElement('div');
  overlay.className = 'add-modal-overlay hidden';
  overlay.id = 'profile-display-name-overlay';
  overlay.innerHTML = `
    <div class="add-modal" role="dialog" aria-modal="true" aria-labelledby="profile-display-name-title">
      ${MODAL_DRAG_HANDLE_HTML}
      <div class="add-modal-head">
        <button type="button" class="add-modal-back hidden" tabindex="-1" aria-hidden="true"></button>
        <h2 class="add-modal-title" id="profile-display-name-title">Pseudo</h2>
        <button type="button" class="add-modal-close" id="profile-display-name-close" aria-label="Fermer">
          ${renderNavIcon('close', { strokeWidth: 2 })}
        </button>
      </div>
      <div class="add-modal-body" id="profile-display-name-body"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const bodyEl = overlay.querySelector('#profile-display-name-body');
  const closeBtn = overlay.querySelector('#profile-display-name-close');

  let isOpen = false;

  const mountForm = () => {
    const displayName = getUserDisplayName(user) || '';
    bodyEl.innerHTML = `<div class="add-modal-content">${renderFormHtml(displayName)}</div>`;
    const input = bodyEl.querySelector('#profile-display-name-input');
    input?.focus();
    input?.select();
  };

  const open = () => {
    if (isOpen) return;
    mountForm();
    overlay.classList.remove('hidden');
    lockScroll();
    requestAnimationFrame(() => {
      overlay.classList.add('is-active');
      isOpen = true;
    });
  };

  const close = () => {
    if (!isOpen) return;
    dragClose.reset();
    overlay.classList.remove('is-active');
    isOpen = false;
    window.setTimeout(() => {
      if (!isOpen) {
        overlay.classList.add('hidden');
        bodyEl.innerHTML = '';
        unlockScroll();
      }
    }, 360);
  };

  const onOverlayClick = (event) => {
    if (event.target === overlay) close();
  };

  const onSubmit = async (event) => {
    const form = event.target.closest('#profile-display-name-form');
    if (!form || event.type === 'click') return;
    event.preventDefault();

    const input = form.querySelector('#profile-display-name-input');
    const saveBtn = form.querySelector('#profile-display-name-save');
    const value = input?.value?.trim() || '';
    if (!value) return;

    const previousLabel = saveBtn?.textContent || 'Enregistrer';
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Enregistrement…';
    }

    const ok = await setUserDisplayName(user.uid, value);

    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = previousLabel;
    }

    if (!ok) {
      if (saveBtn) saveBtn.textContent = 'Échec — réessayer';
      window.setTimeout(() => {
        if (saveBtn) saveBtn.textContent = previousLabel;
      }, 2000);
      return;
    }

    onChange?.(value);
    close();
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape' && isOpen) close();
  };

  closeBtn.addEventListener('click', close, { signal });
  overlay.addEventListener('click', onOverlayClick, { signal });
  bodyEl.addEventListener('submit', onSubmit, { signal });
  document.addEventListener('keydown', onKeyDown, { signal });

  const dragClose = wireModalDragClose(overlay, close);

  const destroy = () => {
    dragClose.destroy();
    close();
    overlay.remove();
  };

  return { open, close, destroy, getInitialsFromName };
}
