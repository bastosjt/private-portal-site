import { escapeHtml } from '../lib/escape-html.js';
import { SETTINGS_THEME } from '../config.js';
import {
  DEFAULT_PARTNER_NICKNAME_LABEL,
  getDisplayNameForUid,
  getPartnerNickname,
  getPartnerUid,
  setPartnerNickname,
} from '../lib/user-profile.js';
import { renderNavIcon } from '../lib/lucide-icon.js';
import { lockScroll, unlockScroll } from '../lib/scroll-lock.js';

function renderFormHtml({ partnerName, nickname }) {
  return `
    <form class="profile-partner-nickname-form add-form" id="profile-partner-nickname-form" data-theme="${SETTINGS_THEME}" novalidate>
      <p class="add-picker-lead">Choisis un surnom pour ${escapeHtml(partnerName)}</p>
      <label class="form-field" for="profile-partner-nickname-input">
        <span class="form-field-label">Surnom</span>
        <div class="form-input-wrap">
          <input
            type="text"
            class="form-input"
            id="profile-partner-nickname-input"
            maxlength="32"
            autocomplete="off"
            placeholder="Ex. Mon Loulou"
            value="${escapeHtml(nickname)}"
          >
        </div>
      </label>
      <p class="form-field-hint">Sans surnom, « ${escapeHtml(DEFAULT_PARTNER_NICKNAME_LABEL)} » s'affiche par défaut.</p>
      <button type="submit" class="add-form-submit" id="profile-partner-nickname-save">Enregistrer</button>
    </form>
  `;
}

export function initProfilePartnerNicknamePicker({ user, onChange, signal } = {}) {
  if (!user) return () => {};

  const overlay = document.createElement('div');
  overlay.className = 'add-modal-overlay hidden';
  overlay.id = 'profile-partner-nickname-overlay';
  overlay.innerHTML = `
    <div class="add-modal" role="dialog" aria-modal="true" aria-labelledby="profile-partner-nickname-title">
      <div class="add-modal-head">
        <button type="button" class="add-modal-back hidden" tabindex="-1" aria-hidden="true"></button>
        <h2 class="add-modal-title" id="profile-partner-nickname-title">Surnom de votre copain adoré</h2>
        <button type="button" class="add-modal-close" id="profile-partner-nickname-close" aria-label="Fermer">
          ${renderNavIcon('close', { strokeWidth: 2 })}
        </button>
      </div>
      <div class="add-modal-body" id="profile-partner-nickname-body"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const bodyEl = overlay.querySelector('#profile-partner-nickname-body');
  const closeBtn = overlay.querySelector('#profile-partner-nickname-close');

  let isOpen = false;

  const mountForm = () => {
    const partnerUid = getPartnerUid(user.uid);
    const partnerName = getDisplayNameForUid(partnerUid) || 'votre copain';
    const nickname = getPartnerNickname(user.uid);
    bodyEl.innerHTML = `<div class="add-modal-content">${renderFormHtml({ partnerName, nickname })}</div>`;
    const input = bodyEl.querySelector('#profile-partner-nickname-input');
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
    const form = event.target.closest('#profile-partner-nickname-form');
    if (!form || event.type === 'click') return;
    event.preventDefault();

    const input = form.querySelector('#profile-partner-nickname-input');
    const saveBtn = form.querySelector('#profile-partner-nickname-save');
    const value = input?.value?.trim() || '';

    const previousLabel = saveBtn?.textContent || 'Enregistrer';
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Enregistrement…';
    }

    const ok = await setPartnerNickname(user.uid, value);

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
