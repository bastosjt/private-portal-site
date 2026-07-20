import { escapeHtml } from '../lib/escape-html.js';
import { SETTINGS_THEME } from '../config.js';
import { APP_TAGLINE } from '../config.js';
import { getSpaceTagline, setSpaceTagline } from '../lib/space-settings.js';
import { renderNavIcon } from '../lib/lucide-icon.js';
import { lockScroll, unlockScroll } from '../lib/scroll-lock.js';

function renderFormHtml(tagline) {
  return `
    <form class="space-tagline-form add-form" id="space-tagline-form" data-theme="${SETTINGS_THEME}" novalidate>
      <p class="add-picker-lead">Choisissez un nom pour votre espace</p>
      <label class="form-field" for="space-tagline-input">
        <span class="form-field-label">Nom de l'espace</span>
        <div class="form-input-wrap">
          <input
            type="text"
            class="form-input"
            id="space-tagline-input"
            maxlength="48"
            autocomplete="off"
            placeholder="Ex. À nous deux"
            value="${escapeHtml(tagline)}"
            required
          >
        </div>
      </label>
      <p class="form-field-hint">Par défaut : « ${escapeHtml(APP_TAGLINE)} ».</p>
      <button type="submit" class="add-form-submit" id="space-tagline-save">Enregistrer</button>
    </form>
  `;
}

export function initSpaceTaglinePicker({ onChange, signal } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'add-modal-overlay hidden';
  overlay.id = 'space-tagline-overlay';
  overlay.innerHTML = `
    <div class="add-modal" role="dialog" aria-modal="true" aria-labelledby="space-tagline-title">
      <div class="add-modal-head">
        <button type="button" class="add-modal-back hidden" tabindex="-1" aria-hidden="true"></button>
        <h2 class="add-modal-title" id="space-tagline-title">Nom de notre espace</h2>
        <button type="button" class="add-modal-close" id="space-tagline-close" aria-label="Fermer">
          ${renderNavIcon('close', { strokeWidth: 2 })}
        </button>
      </div>
      <div class="add-modal-body" id="space-tagline-body"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const bodyEl = overlay.querySelector('#space-tagline-body');
  const closeBtn = overlay.querySelector('#space-tagline-close');

  let isOpen = false;

  const mountForm = () => {
    const tagline = getSpaceTagline();
    bodyEl.innerHTML = `<div class="add-modal-content">${renderFormHtml(tagline)}</div>`;
    const input = bodyEl.querySelector('#space-tagline-input');
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
    const form = event.target.closest('#space-tagline-form');
    if (!form || event.type === 'click') return;
    event.preventDefault();

    const input = form.querySelector('#space-tagline-input');
    const saveBtn = form.querySelector('#space-tagline-save');
    const value = input?.value?.trim() || '';
    if (!value) return;

    const previousLabel = saveBtn?.textContent || 'Enregistrer';
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Enregistrement…';
    }

    const ok = await setSpaceTagline(value);

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

  const destroy = () => {
    close();
    overlay.remove();
  };

  return { open, close, destroy };
}
